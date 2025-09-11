-- WS-342 Real-Time Wedding Collaboration - Events Table
-- Team B Backend Development - Event streaming and processing

-- Collaboration events table for real-time event streaming
CREATE TABLE IF NOT EXISTS collaboration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    vector_clock JSONB NOT NULL DEFAULT '{}',
    causality JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    sequence_number BIGSERIAL,
    
    -- Event validation constraints
    CONSTRAINT valid_event_type CHECK (
        event_type IN (
            'timeline_update',
            'budget_change', 
            'vendor_assignment',
            'guest_update',
            'document_edit',
            'photo_upload',
            'task_completion',
            'message_sent',
            'presence_change',
            'permission_update',
            'wedding_day_milestone',
            'emergency_alert'
        )
    ),
    CONSTRAINT valid_event_data CHECK (event_data IS NOT NULL),
    CONSTRAINT valid_vector_clock CHECK (vector_clock IS NOT NULL)
);

-- High-performance indexes for event streaming
CREATE INDEX idx_collaboration_events_wedding_time ON collaboration_events (wedding_id, created_at DESC);
CREATE INDEX idx_collaboration_events_user_time ON collaboration_events (user_id, created_at DESC);
CREATE INDEX idx_collaboration_events_type_time ON collaboration_events (event_type, created_at DESC);
CREATE INDEX idx_collaboration_events_sequence ON collaboration_events (sequence_number);
CREATE INDEX idx_collaboration_events_processing ON collaboration_events (processed_at) WHERE processed_at IS NULL;

-- Specialized indexes for wedding-specific queries
CREATE INDEX idx_collaboration_events_timeline ON collaboration_events (wedding_id, created_at) 
    WHERE event_type = 'timeline_update';
CREATE INDEX idx_collaboration_events_budget ON collaboration_events (wedding_id, created_at) 
    WHERE event_type = 'budget_change';
CREATE INDEX idx_collaboration_events_vendors ON collaboration_events (wedding_id, created_at) 
    WHERE event_type = 'vendor_assignment';

-- Partitioning for performance (optional, for high-volume deployments)
-- CREATE TABLE collaboration_events_y2024m01 PARTITION OF collaboration_events
--     FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Event history table for archival
CREATE TABLE IF NOT EXISTS collaboration_events_archive (
    LIKE collaboration_events INCLUDING ALL
);

-- Row Level Security
ALTER TABLE collaboration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_events_archive ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Users can view events for their weddings" ON collaboration_events
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM wedding_participants wp 
            WHERE wp.wedding_id = collaboration_events.wedding_id 
            AND wp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create events for their weddings" ON collaboration_events
    FOR INSERT 
    WITH CHECK (
        user_id = auth.uid()
        AND
        EXISTS (
            SELECT 1 FROM wedding_participants wp 
            WHERE wp.wedding_id = collaboration_events.wedding_id 
            AND wp.user_id = auth.uid()
            AND wp.permissions->>'canEdit' = 'true'
        )
    );

CREATE POLICY "System can update event processing" ON collaboration_events
    FOR UPDATE 
    USING (true)
    WITH CHECK (true);

-- Event processing functions
CREATE OR REPLACE FUNCTION process_collaboration_event()
RETURNS trigger AS $$
DECLARE
    event_priority text;
    notification_required boolean := false;
BEGIN
    -- Mark as processed
    NEW.processed_at = NOW();
    
    -- Determine event priority based on type and wedding context
    SELECT 
        CASE 
            WHEN NEW.event_type IN ('emergency_alert', 'wedding_day_milestone') THEN 'critical'
            WHEN NEW.event_type IN ('timeline_update', 'budget_change', 'vendor_assignment') THEN 'high'
            WHEN NEW.event_type IN ('guest_update', 'task_completion') THEN 'medium'
            ELSE 'low'
        END INTO event_priority;
    
    -- Update metadata with priority
    NEW.metadata = NEW.metadata || jsonb_build_object('priority', event_priority);
    
    -- Check if notifications are required
    SELECT 
        CASE 
            WHEN event_priority IN ('critical', 'high') THEN true
            WHEN NEW.event_type = 'timeline_update' AND 
                 (SELECT wedding_date FROM weddings WHERE id = NEW.wedding_id) - NOW() <= INTERVAL '7 days' 
                 THEN true
            ELSE false
        END INTO notification_required;
    
    -- Queue notifications if required
    IF notification_required THEN
        INSERT INTO notification_queue (
            wedding_id, 
            event_id, 
            event_type, 
            priority, 
            recipients
        )
        SELECT 
            NEW.wedding_id,
            NEW.id,
            NEW.event_type,
            event_priority,
            array_agg(wp.user_id)
        FROM wedding_participants wp 
        WHERE wp.wedding_id = NEW.wedding_id
        AND wp.notification_preferences->>'realtime_events' = 'true';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_process_collaboration_event
    BEFORE INSERT ON collaboration_events
    FOR EACH ROW
    EXECUTE FUNCTION process_collaboration_event();

-- Function to get event stream for wedding
CREATE OR REPLACE FUNCTION get_event_stream(
    p_wedding_id UUID,
    p_since TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_limit INTEGER DEFAULT 1000,
    p_event_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    event_type TEXT,
    event_data JSONB,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.event_type,
        ce.event_data,
        ce.user_id,
        ce.created_at,
        ce.metadata
    FROM collaboration_events ce
    WHERE ce.wedding_id = p_wedding_id
    AND (p_since IS NULL OR ce.created_at >= p_since)
    AND (p_event_types IS NULL OR ce.event_type = ANY(p_event_types))
    ORDER BY ce.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old events
CREATE OR REPLACE FUNCTION archive_old_events(p_days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move old events to archive
    WITH archived_events AS (
        DELETE FROM collaboration_events 
        WHERE created_at < NOW() - (p_days_old || ' days')::INTERVAL
        RETURNING *
    )
    INSERT INTO collaboration_events_archive 
    SELECT * FROM archived_events;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get event statistics
CREATE OR REPLACE FUNCTION get_event_statistics(
    p_wedding_id UUID,
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    event_type TEXT,
    event_count BIGINT,
    unique_users BIGINT,
    avg_events_per_hour NUMERIC,
    last_event_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.event_type,
        COUNT(*) as event_count,
        COUNT(DISTINCT ce.user_id) as unique_users,
        ROUND(COUNT(*)::NUMERIC / p_hours, 2) as avg_events_per_hour,
        MAX(ce.created_at) as last_event_time
    FROM collaboration_events ce
    WHERE ce.wedding_id = p_wedding_id
    AND ce.created_at >= NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY ce.event_type
    ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for conflict detection
CREATE OR REPLACE FUNCTION detect_event_conflicts(
    p_wedding_id UUID,
    p_event_type TEXT,
    p_event_data JSONB,
    p_time_window INTEGER DEFAULT 5 -- minutes
)
RETURNS TABLE (
    conflicting_event_id UUID,
    conflict_type TEXT,
    severity TEXT
) AS $$
BEGIN
    -- Detect concurrent editing conflicts
    IF p_event_type IN ('timeline_update', 'budget_change', 'guest_update') THEN
        RETURN QUERY
        SELECT 
            ce.id,
            'concurrent_edit'::TEXT,
            CASE 
                WHEN COUNT(*) OVER (PARTITION BY ce.event_data->>'target') > 1 THEN 'high'
                ELSE 'medium'
            END::TEXT
        FROM collaboration_events ce
        WHERE ce.wedding_id = p_wedding_id
        AND ce.event_type = p_event_type
        AND ce.created_at >= NOW() - (p_time_window || ' minutes')::INTERVAL
        AND ce.event_data->>'target' = p_event_data->>'target'
        AND ce.user_id != (p_event_data->>'userId')::UUID;
    END IF;
    
    -- Add more conflict detection logic as needed
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notification queue table
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES collaboration_events(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    recipients UUID[] NOT NULL,
    delivery_method TEXT DEFAULT 'websocket',
    status TEXT DEFAULT 'pending',
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical', 'emergency')),
    CONSTRAINT valid_delivery_method CHECK (delivery_method IN ('websocket', 'email', 'sms', 'push', 'webhook')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'cancelled'))
);

-- Indexes for notification queue
CREATE INDEX idx_notification_queue_status ON notification_queue (status, scheduled_for);
CREATE INDEX idx_notification_queue_wedding ON notification_queue (wedding_id, created_at);
CREATE INDEX idx_notification_queue_priority ON notification_queue (priority, scheduled_for);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON collaboration_events TO authenticated;
GRANT SELECT ON collaboration_events_archive TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_queue TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_stream(UUID, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_statistics(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_event_conflicts(UUID, TEXT, JSONB, INTEGER) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE collaboration_events IS 'Stores all real-time collaboration events for wedding planning with high-performance indexing';
COMMENT ON COLUMN collaboration_events.vector_clock IS 'Vector clock for distributed event ordering and conflict resolution';
COMMENT ON COLUMN collaboration_events.causality IS 'Causal relationships between events for conflict resolution';
COMMENT ON COLUMN collaboration_events.sequence_number IS 'Auto-incrementing sequence number for total ordering';
COMMENT ON TABLE notification_queue IS 'Queue for processing and delivering real-time notifications';
COMMENT ON FUNCTION get_event_stream(UUID, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT[]) IS 'Retrieves event stream for a wedding with filtering options';
COMMENT ON FUNCTION archive_old_events(INTEGER) IS 'Archives old events to maintain database performance';
COMMENT ON FUNCTION detect_event_conflicts(UUID, TEXT, JSONB, INTEGER) IS 'Detects potential conflicts between concurrent events';

-- Performance monitoring view
CREATE OR REPLACE VIEW collaboration_events_performance AS
SELECT 
    wedding_id,
    DATE_TRUNC('hour', created_at) as event_hour,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_seconds
FROM collaboration_events 
WHERE created_at >= NOW() - INTERVAL '24 hours'
AND processed_at IS NOT NULL
GROUP BY wedding_id, DATE_TRUNC('hour', created_at), event_type
ORDER BY event_hour DESC, event_count DESC;

GRANT SELECT ON collaboration_events_performance TO authenticated;

-- Cleanup function for notification queue
CREATE OR REPLACE FUNCTION cleanup_notification_queue()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    DELETE FROM notification_queue 
    WHERE created_at < NOW() - INTERVAL '7 days' 
    AND status IN ('delivered', 'failed', 'cancelled');
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;