-- PWA Tracking Tables Migration
-- Created for WS-171 PWA service worker backend development
-- Team B Round 2 - 2025-01-28

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PWA Installation Events Table
-- Tracks install prompts, completions, and failures
CREATE TABLE IF NOT EXISTS pwa_installation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'prompt_shown', 
        'prompt_dismissed', 
        'prompt_accepted',
        'installation_started',
        'installation_completed', 
        'installation_failed'
    )),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(100) NOT NULL,
    
    -- Installation method for completed installs
    installation_method VARCHAR(50) CHECK (installation_method IN (
        'browser_prompt', 
        'manual_menu', 
        'share_menu', 
        'other'
    )),
    
    -- Device information (sanitized for privacy)
    device_info JSONB DEFAULT '{}',
    
    -- Context for install prompts
    prompt_context JSONB DEFAULT '{}',
    
    -- Context for installations
    installation_context JSONB DEFAULT '{}',
    
    -- Wedding-specific context
    wedding_context JSONB DEFAULT '{}',
    
    -- Performance metrics for installations
    performance_metrics JSONB DEFAULT '{}',
    
    -- Client information (IP hash, user agent sanitized)
    client_info JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for common queries
    CONSTRAINT valid_event_data CHECK (
        (event_type IN ('prompt_shown', 'prompt_dismissed', 'prompt_accepted') AND installation_method IS NULL) OR
        (event_type IN ('installation_started', 'installation_completed', 'installation_failed') AND installation_method IS NOT NULL)
    )
);

-- PWA Usage Metrics Table
-- Tracks usage patterns, performance, and interactions
CREATE TABLE IF NOT EXISTS pwa_usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(100) NOT NULL,
    
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN (
        'session_start',
        'session_end', 
        'session_pause',
        'session_resume',
        'page_view',
        'service_worker_update',
        'service_worker_event',
        'cache_hit',
        'cache_miss',
        'offline_usage',
        'connection_lost',
        'connection_restored',
        'background_sync_complete',
        'performance_timing',
        'wedding_activity',
        'error'
    )),
    
    -- General metric data
    metric_data JSONB DEFAULT '{}',
    
    -- Wedding-specific activity tracking
    wedding_activity JSONB DEFAULT '{}',
    
    -- Performance metrics (Core Web Vitals, etc.)
    performance_metrics JSONB DEFAULT '{}',
    
    -- Error information
    error_info JSONB DEFAULT '{}',
    
    -- Client information (sanitized)
    client_info JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PWA Sync Events Table
-- Tracks offline sync operations
CREATE TABLE IF NOT EXISTS pwa_sync_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(100) NOT NULL,
    
    sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN (
        'guest_data',
        'rsvp_update',
        'task_update',
        'photo_upload',
        'form_submission',
        'timeline_update',
        'vendor_communication',
        'other'
    )),
    
    sync_status VARCHAR(20) NOT NULL CHECK (sync_status IN (
        'queued',
        'in_progress', 
        'completed',
        'failed',
        'retry'
    )),
    
    -- Sync operation details
    sync_data JSONB DEFAULT '{}',
    
    -- Priority of sync operation
    priority VARCHAR(10) CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
    
    -- Retry information
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Performance metrics
    sync_duration_ms INTEGER,
    queue_time_ms INTEGER,
    
    -- Error information for failed syncs
    error_info JSONB DEFAULT '{}',
    
    -- Wedding context
    wedding_context JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PWA Analytics Summary Table
-- Aggregated daily metrics for analytics dashboard
CREATE TABLE IF NOT EXISTS pwa_analytics_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    
    -- Aggregated counts
    total_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    
    -- Statistical measures
    average_value DECIMAL(10,2),
    min_value DECIMAL(10,2),
    max_value DECIMAL(10,2),
    
    -- Success rates
    success_rate DECIMAL(5,4), -- 0.0000 to 1.0000
    
    -- Breakdowns by category
    breakdown_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one summary per date/metric combination
    UNIQUE(date, metric_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pwa_install_events_user_id ON pwa_installation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pwa_install_events_session_id ON pwa_installation_events(session_id);
CREATE INDEX IF NOT EXISTS idx_pwa_install_events_event_type ON pwa_installation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pwa_install_events_created_at ON pwa_installation_events(created_at);

CREATE INDEX IF NOT EXISTS idx_pwa_usage_metrics_user_id ON pwa_usage_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_pwa_usage_metrics_session_id ON pwa_usage_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_pwa_usage_metrics_metric_type ON pwa_usage_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_pwa_usage_metrics_created_at ON pwa_usage_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_pwa_sync_events_user_id ON pwa_sync_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pwa_sync_events_session_id ON pwa_sync_events(session_id);
CREATE INDEX IF NOT EXISTS idx_pwa_sync_events_sync_type ON pwa_sync_events(sync_type);
CREATE INDEX IF NOT EXISTS idx_pwa_sync_events_sync_status ON pwa_sync_events(sync_status);
CREATE INDEX IF NOT EXISTS idx_pwa_sync_events_priority ON pwa_sync_events(priority);
CREATE INDEX IF NOT EXISTS idx_pwa_sync_events_created_at ON pwa_sync_events(created_at);

CREATE INDEX IF NOT EXISTS idx_pwa_analytics_summary_date ON pwa_analytics_summary(date);
CREATE INDEX IF NOT EXISTS idx_pwa_analytics_summary_metric_type ON pwa_analytics_summary(metric_type);

-- JSONB indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pwa_install_events_device_info_gin ON pwa_installation_events USING gin(device_info);
CREATE INDEX IF NOT EXISTS idx_pwa_install_events_wedding_context_gin ON pwa_installation_events USING gin(wedding_context);

CREATE INDEX IF NOT EXISTS idx_pwa_usage_metrics_metric_data_gin ON pwa_usage_metrics USING gin(metric_data);
CREATE INDEX IF NOT EXISTS idx_pwa_usage_metrics_wedding_activity_gin ON pwa_usage_metrics USING gin(wedding_activity);

-- Row Level Security (RLS) Policies
ALTER TABLE pwa_installation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pwa_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pwa_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pwa_analytics_summary ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own events (authenticated or anonymous)
CREATE POLICY pwa_install_events_insert ON pwa_installation_events 
    FOR INSERT 
    WITH CHECK (
        user_id IS NULL OR 
        user_id = auth.uid()
    );

CREATE POLICY pwa_usage_metrics_insert ON pwa_usage_metrics 
    FOR INSERT 
    WITH CHECK (
        user_id IS NULL OR 
        user_id = auth.uid()
    );

CREATE POLICY pwa_sync_events_insert ON pwa_sync_events 
    FOR INSERT 
    WITH CHECK (
        user_id IS NULL OR 
        user_id = auth.uid()
    );

-- Policy: Users can read their own data
CREATE POLICY pwa_install_events_select ON pwa_installation_events 
    FOR SELECT 
    USING (
        user_id IS NULL OR 
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'support')
        )
    );

CREATE POLICY pwa_usage_metrics_select ON pwa_usage_metrics 
    FOR SELECT 
    USING (
        user_id IS NULL OR 
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'support')
        )
    );

CREATE POLICY pwa_sync_events_select ON pwa_sync_events 
    FOR SELECT 
    USING (
        user_id IS NULL OR 
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'support')
        )
    );

-- Policy: Only admins can read analytics summaries
CREATE POLICY pwa_analytics_summary_select ON pwa_analytics_summary 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('admin', 'support')
        )
    );

-- Policy: Service worker can update sync events
CREATE POLICY pwa_sync_events_update ON pwa_sync_events 
    FOR UPDATE 
    USING (
        user_id IS NULL OR 
        user_id = auth.uid()
    )
    WITH CHECK (
        user_id IS NULL OR 
        user_id = auth.uid()
    );

-- Functions for analytics aggregation
CREATE OR REPLACE FUNCTION update_pwa_analytics_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily summary for installation events
    IF TG_TABLE_NAME = 'pwa_installation_events' THEN
        INSERT INTO pwa_analytics_summary (
            date, 
            metric_type, 
            total_count,
            unique_sessions
        )
        VALUES (
            DATE(NEW.created_at),
            CONCAT('install_', NEW.event_type),
            1,
            1
        )
        ON CONFLICT (date, metric_type) 
        DO UPDATE SET 
            total_count = pwa_analytics_summary.total_count + 1,
            unique_sessions = pwa_analytics_summary.unique_sessions + 1,
            updated_at = NOW();
            
    -- Update daily summary for usage metrics
    ELSIF TG_TABLE_NAME = 'pwa_usage_metrics' THEN
        INSERT INTO pwa_analytics_summary (
            date, 
            metric_type, 
            total_count,
            unique_sessions
        )
        VALUES (
            DATE(NEW.created_at),
            NEW.metric_type,
            1,
            1
        )
        ON CONFLICT (date, metric_type) 
        DO UPDATE SET 
            total_count = pwa_analytics_summary.total_count + 1,
            unique_sessions = pwa_analytics_summary.unique_sessions + 1,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic aggregation
CREATE TRIGGER pwa_install_events_summary_trigger
    AFTER INSERT ON pwa_installation_events
    FOR EACH ROW EXECUTE FUNCTION update_pwa_analytics_summary();

CREATE TRIGGER pwa_usage_metrics_summary_trigger
    AFTER INSERT ON pwa_usage_metrics
    FOR EACH ROW EXECUTE FUNCTION update_pwa_analytics_summary();

-- Function to clean up old PWA data (GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_old_pwa_data()
RETURNS INTEGER AS $$
DECLARE
    rows_deleted INTEGER := 0;
    cutoff_date TIMESTAMPTZ;
BEGIN
    -- Delete data older than 90 days
    cutoff_date := NOW() - INTERVAL '90 days';
    
    -- Clean up installation events
    DELETE FROM pwa_installation_events 
    WHERE created_at < cutoff_date;
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    
    -- Clean up usage metrics
    DELETE FROM pwa_usage_metrics 
    WHERE created_at < cutoff_date;
    GET DIAGNOSTICS rows_deleted = rows_deleted + ROW_COUNT;
    
    -- Clean up sync events (keep completed ones for 30 days, failed ones for 7 days)
    DELETE FROM pwa_sync_events 
    WHERE (
        sync_status = 'completed' AND created_at < NOW() - INTERVAL '30 days'
    ) OR (
        sync_status = 'failed' AND created_at < NOW() - INTERVAL '7 days'
    );
    GET DIAGNOSTICS rows_deleted = rows_deleted + ROW_COUNT;
    
    -- Clean up analytics summaries older than 1 year
    DELETE FROM pwa_analytics_summary 
    WHERE date < CURRENT_DATE - INTERVAL '1 year';
    GET DIAGNOSTICS rows_deleted = rows_deleted + ROW_COUNT;
    
    RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- Create a view for common PWA analytics queries
CREATE OR REPLACE VIEW pwa_analytics_dashboard AS
SELECT 
    date,
    SUM(CASE WHEN metric_type LIKE 'install_%' THEN total_count ELSE 0 END) as total_install_events,
    SUM(CASE WHEN metric_type = 'install_installation_completed' THEN total_count ELSE 0 END) as successful_installs,
    SUM(CASE WHEN metric_type = 'session_start' THEN total_count ELSE 0 END) as total_sessions,
    SUM(CASE WHEN metric_type = 'offline_usage' THEN total_count ELSE 0 END) as offline_sessions,
    SUM(CASE WHEN metric_type = 'background_sync_complete' THEN total_count ELSE 0 END) as successful_syncs,
    SUM(CASE WHEN metric_type = 'error' THEN total_count ELSE 0 END) as total_errors,
    MAX(updated_at) as last_updated
FROM pwa_analytics_summary 
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- Grant necessary permissions
GRANT SELECT, INSERT ON pwa_installation_events TO authenticated, anon;
GRANT SELECT, INSERT ON pwa_usage_metrics TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON pwa_sync_events TO authenticated, anon;
GRANT SELECT ON pwa_analytics_summary TO authenticated;
GRANT SELECT ON pwa_analytics_dashboard TO authenticated;

-- Comment on tables for documentation
COMMENT ON TABLE pwa_installation_events IS 'Tracks PWA installation prompts and completions with privacy-compliant device information';
COMMENT ON TABLE pwa_usage_metrics IS 'Tracks PWA usage patterns, performance metrics, and user interactions';
COMMENT ON TABLE pwa_sync_events IS 'Tracks offline sync operations for wedding data with retry logic';
COMMENT ON TABLE pwa_analytics_summary IS 'Daily aggregated analytics for PWA performance monitoring';

-- Migration completed successfully
-- Tables created: pwa_installation_events, pwa_usage_metrics, pwa_sync_events, pwa_analytics_summary
-- Indexes created for optimal query performance
-- RLS policies implemented for data security
-- Triggers created for automatic analytics aggregation
-- Cleanup function created for GDPR compliance