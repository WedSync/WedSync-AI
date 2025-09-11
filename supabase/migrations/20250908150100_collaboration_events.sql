-- WS-342: Real-Time Wedding Collaboration - Collaboration Events Table
-- Team B Backend Development - Batch 1 Round 1
-- Description: Create collaboration events table for real-time event streaming

-- Create collaboration_events table
CREATE TABLE collaboration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'timeline_update', 'budget_change', 'vendor_assignment', 'guest_update',
        'document_edit', 'photo_upload', 'task_completion', 'message_sent',
        'presence_change', 'permission_update', 'conflict_detected', 'conflict_resolved'
    )),
    event_data JSONB NOT NULL DEFAULT '{}',
    vector_clock JSONB NOT NULL DEFAULT '{}',
    causality JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    is_processed BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 10),
    
    -- Performance indexes
    INDEX idx_collaboration_events_wedding (wedding_id, created_at DESC),
    INDEX idx_collaboration_events_type (event_type, created_at DESC),
    INDEX idx_collaboration_events_user (user_id, created_at DESC),
    INDEX idx_collaboration_events_processed (is_processed, priority DESC, created_at DESC),
    INDEX idx_collaboration_events_timeline (wedding_id, event_type, created_at DESC) WHERE event_type IN ('timeline_update', 'vendor_assignment')
);

-- Add row level security
ALTER TABLE collaboration_events ENABLE ROW LEVEL SECURITY;

-- Create policies for collaboration events
CREATE POLICY "Users can view events for weddings they have access to" ON collaboration_events
    FOR SELECT USING (
        wedding_id IN (
            SELECT w.id FROM weddings w
            LEFT JOIN wedding_team wt ON w.id = wt.wedding_id
            WHERE w.couple_user_id = auth.uid() 
               OR w.partner_user_id = auth.uid()
               OR wt.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create events for weddings they have access to" ON collaboration_events
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        wedding_id IN (
            SELECT w.id FROM weddings w
            LEFT JOIN wedding_team wt ON w.id = wt.wedding_id
            WHERE w.couple_user_id = auth.uid() 
               OR w.partner_user_id = auth.uid()
               OR wt.user_id = auth.uid()
        )
    );

-- Create function to automatically mark events as processed
CREATE OR REPLACE FUNCTION process_collaboration_event()
RETURNS TRIGGER AS $$
BEGIN
    NEW.processed_at = NOW();
    NEW.is_processed = true;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to get recent events for a wedding
CREATE OR REPLACE FUNCTION get_wedding_collaboration_events(
    p_wedding_id UUID,
    p_since TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '1 hour',
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    event_id UUID,
    event_type TEXT,
    event_data JSONB,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    vector_clock JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.event_type,
        ce.event_data,
        ce.user_id,
        ce.created_at,
        ce.vector_clock
    FROM collaboration_events ce
    WHERE ce.wedding_id = p_wedding_id
      AND ce.created_at >= p_since
    ORDER BY ce.created_at DESC, ce.priority DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get event statistics
CREATE OR REPLACE FUNCTION get_collaboration_event_stats(
    p_wedding_id UUID,
    p_time_range INTERVAL DEFAULT INTERVAL '24 hours'
)
RETURNS TABLE (
    event_type TEXT,
    event_count BIGINT,
    last_event TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.event_type,
        COUNT(*) as event_count,
        MAX(ce.created_at) as last_event
    FROM collaboration_events ce
    WHERE ce.wedding_id = p_wedding_id
      AND ce.created_at >= NOW() - p_time_range
    GROUP BY ce.event_type
    ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old events (keeping last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_collaboration_events()
RETURNS void AS $$
BEGIN
    DELETE FROM collaboration_events
    WHERE created_at < NOW() - INTERVAL '30 days'
      AND is_processed = true;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE collaboration_events IS 'Stores real-time collaboration events for wedding planning';
COMMENT ON COLUMN collaboration_events.event_type IS 'Type of collaboration event that occurred';
COMMENT ON COLUMN collaboration_events.event_data IS 'JSON payload containing event-specific data';
COMMENT ON COLUMN collaboration_events.vector_clock IS 'Vector clock for conflict resolution and ordering';
COMMENT ON COLUMN collaboration_events.causality IS 'Causality information for event ordering';
COMMENT ON COLUMN collaboration_events.priority IS 'Event priority level (0=lowest, 10=highest)';
COMMENT ON FUNCTION get_wedding_collaboration_events IS 'Retrieves recent collaboration events for a wedding';
COMMENT ON FUNCTION get_collaboration_event_stats IS 'Returns event statistics for a wedding';
COMMENT ON FUNCTION cleanup_old_collaboration_events IS 'Removes old processed events to maintain performance';