-- WS-130 Round 3: Photography AI Performance Monitoring Database Schema
-- Creates tables for storing performance metrics, alerts, and monitoring data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Photography performance metrics aggregated data
CREATE TABLE photography_performance_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    total_requests INTEGER NOT NULL DEFAULT 0,
    successful_requests INTEGER NOT NULL DEFAULT 0,
    avg_response_time_ms INTEGER NOT NULL DEFAULT 0,
    error_rate_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    cache_hit_rate_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    memory_usage_mb DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_api_calls INTEGER NOT NULL DEFAULT 0,
    total_data_processed_bytes BIGINT NOT NULL DEFAULT 0,
    team_integration_stats JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient time-series queries
CREATE INDEX idx_photography_performance_metrics_timestamp ON photography_performance_metrics(timestamp DESC);

-- Photography performance alerts
CREATE TABLE photography_performance_alerts (
    id TEXT PRIMARY KEY, -- Custom alert IDs from monitoring system
    timestamp TIMESTAMPTZ NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
    metric TEXT NOT NULL,
    current_value DECIMAL(15,4) NOT NULL,
    threshold_value DECIMAL(15,4) NOT NULL,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ NULL,
    resolution_notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for alert queries
CREATE INDEX idx_photography_alerts_timestamp ON photography_performance_alerts(timestamp DESC);
CREATE INDEX idx_photography_alerts_resolved ON photography_performance_alerts(resolved, timestamp DESC);
CREATE INDEX idx_photography_alerts_severity ON photography_performance_alerts(severity, resolved);

-- Detailed request metrics for debugging (kept for shorter periods)
CREATE TABLE photography_request_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_id TEXT NOT NULL,
    user_id UUID NULL,
    client_id UUID NULL,
    operation TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_ms INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
    error_code TEXT NULL,
    memory_usage_mb DECIMAL(10,2) NULL,
    team_integrations TEXT[] DEFAULT '{}',
    integration_timings JSONB DEFAULT '{}',
    cache_hit_rate DECIMAL(5,4) DEFAULT 0,
    rate_limit_status TEXT CHECK (rate_limit_status IN ('allowed', 'limited', 'queued')),
    api_calls_made INTEGER DEFAULT 0,
    data_processed_bytes BIGINT DEFAULT 0,
    user_plan TEXT DEFAULT 'unknown',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for request metrics
CREATE INDEX idx_photography_request_metrics_timestamp ON photography_request_metrics(start_time DESC);
CREATE INDEX idx_photography_request_metrics_user ON photography_request_metrics(user_id, start_time DESC);
CREATE INDEX idx_photography_request_metrics_client ON photography_request_metrics(client_id, start_time DESC);
CREATE INDEX idx_photography_request_metrics_status ON photography_request_metrics(status, start_time DESC);
CREATE INDEX idx_photography_request_metrics_operation ON photography_request_metrics(operation, start_time DESC);

-- Performance monitoring configuration
CREATE TABLE photography_monitoring_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default monitoring configuration
INSERT INTO photography_monitoring_config (config_key, config_value, description) VALUES 
(
    'alert_thresholds',
    '{
        "response_time_ms": {"warning": 3000, "critical": 8000},
        "error_rate_percent": {"warning": 5, "critical": 15},
        "memory_usage_mb": {"warning": 400, "critical": 700},
        "cache_hit_rate_percent": {"warning": 70, "critical": 50},
        "queue_length": {"warning": 50, "critical": 150},
        "integration_timeout_ms": {"warning": 10000, "critical": 20000}
    }',
    'Default alert thresholds for photography AI monitoring'
),
(
    'notification_config',
    '{
        "slack_webhook_url": null,
        "email_recipients": [],
        "sms_recipients": [],
        "critical_alert_cooldown_minutes": 15,
        "warning_alert_cooldown_minutes": 60
    }',
    'Notification settings for performance alerts'
),
(
    'retention_policy',
    '{
        "detailed_metrics_days": 7,
        "aggregated_metrics_months": 12,
        "alert_history_months": 6,
        "auto_cleanup_enabled": true
    }',
    'Data retention policy for performance monitoring data'
);

-- Team integration health tracking
CREATE TABLE photography_team_health (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    error_rate_percent DECIMAL(5,2) DEFAULT 0,
    timeout_count INTEGER DEFAULT 0,
    health_score DECIMAL(5,2) DEFAULT 100, -- 0-100 health score
    status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'offline')),
    last_error TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for team health queries
CREATE INDEX idx_photography_team_health_timestamp ON photography_team_health(timestamp DESC);
CREATE INDEX idx_photography_team_health_team ON photography_team_health(team_name, timestamp DESC);
CREATE INDEX idx_photography_team_health_status ON photography_team_health(status, timestamp DESC);

-- System resource monitoring
CREATE TABLE photography_system_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    cpu_usage_percent DECIMAL(5,2) DEFAULT 0,
    memory_usage_mb DECIMAL(10,2) DEFAULT 0,
    memory_limit_mb DECIMAL(10,2) DEFAULT 0,
    heap_usage_mb DECIMAL(10,2) DEFAULT 0,
    external_memory_mb DECIMAL(10,2) DEFAULT 0,
    active_handles INTEGER DEFAULT 0,
    active_requests INTEGER DEFAULT 0,
    event_loop_delay_ms DECIMAL(8,2) DEFAULT 0,
    gc_collections_count INTEGER DEFAULT 0,
    gc_duration_ms INTEGER DEFAULT 0,
    uptime_seconds BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for system metrics
CREATE INDEX idx_photography_system_metrics_timestamp ON photography_system_metrics(timestamp DESC);

-- Performance insights and recommendations
CREATE TABLE photography_performance_insights (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    insight_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    metric_source TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    potential_impact TEXT,
    implementation_effort TEXT CHECK (implementation_effort IN ('low', 'medium', 'high')),
    confidence_score DECIMAL(5,2) DEFAULT 0, -- 0-100 confidence in the insight
    detected_at TIMESTAMPTZ NOT NULL,
    dismissed_at TIMESTAMPTZ NULL,
    dismissed_by UUID NULL,
    dismissal_reason TEXT NULL,
    implemented_at TIMESTAMPTZ NULL,
    implementation_notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance insights
CREATE INDEX idx_photography_insights_detected ON photography_performance_insights(detected_at DESC);
CREATE INDEX idx_photography_insights_severity ON photography_performance_insights(severity, detected_at DESC);
CREATE INDEX idx_photography_insights_dismissed ON photography_performance_insights(dismissed_at) WHERE dismissed_at IS NOT NULL;

-- RLS (Row Level Security) policies
ALTER TABLE photography_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE photography_performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE photography_request_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE photography_monitoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE photography_team_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE photography_system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE photography_performance_insights ENABLE ROW LEVEL SECURITY;

-- Service role can access all monitoring data
CREATE POLICY "Service role full access - performance metrics" ON photography_performance_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - performance alerts" ON photography_performance_alerts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - request metrics" ON photography_request_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - monitoring config" ON photography_monitoring_config
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - team health" ON photography_team_health
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - system metrics" ON photography_system_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - performance insights" ON photography_performance_insights
    FOR ALL USING (auth.role() = 'service_role');

-- Admin users can view monitoring data
CREATE POLICY "Admins can view performance metrics" ON photography_performance_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Admins can view performance alerts" ON photography_performance_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Admins can view performance insights" ON photography_performance_insights
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
        )
    );

-- Functions for automatic cleanup of old data
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    retention_config JSONB;
    cutoff_detailed TIMESTAMPTZ;
    cutoff_aggregated TIMESTAMPTZ;
    cutoff_alerts TIMESTAMPTZ;
BEGIN
    -- Get retention configuration
    SELECT config_value INTO retention_config
    FROM photography_monitoring_config
    WHERE config_key = 'retention_policy';

    -- Calculate cutoff dates
    cutoff_detailed := NOW() - INTERVAL '1 day' * (retention_config->>'detailed_metrics_days')::integer;
    cutoff_aggregated := NOW() - INTERVAL '1 month' * (retention_config->>'aggregated_metrics_months')::integer;
    cutoff_alerts := NOW() - INTERVAL '1 month' * (retention_config->>'alert_history_months')::integer;

    -- Cleanup detailed request metrics
    DELETE FROM photography_request_metrics
    WHERE created_at < cutoff_detailed;

    -- Cleanup old aggregated metrics
    DELETE FROM photography_performance_metrics
    WHERE created_at < cutoff_aggregated;

    -- Cleanup old resolved alerts
    DELETE FROM photography_performance_alerts
    WHERE resolved = true AND created_at < cutoff_alerts;

    -- Cleanup old team health records
    DELETE FROM photography_team_health
    WHERE created_at < cutoff_detailed;

    -- Cleanup old system metrics
    DELETE FROM photography_system_metrics
    WHERE created_at < cutoff_detailed;

    RAISE NOTICE 'Monitoring data cleanup completed';
END;
$$;

-- Schedule cleanup job (to be run daily)
-- Note: This would typically be scheduled externally or via pg_cron if available

-- Function to update monitoring config
CREATE OR REPLACE FUNCTION update_monitoring_config(
    p_config_key TEXT,
    p_config_value JSONB,
    p_updated_by UUID DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE photography_monitoring_config
    SET 
        config_value = p_config_value,
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE config_key = p_config_key;

    IF NOT FOUND THEN
        INSERT INTO photography_monitoring_config (config_key, config_value, updated_by)
        VALUES (p_config_key, p_config_value, p_updated_by);
    END IF;
END;
$$;

-- Function to get current system health
CREATE OR REPLACE FUNCTION get_photography_system_health()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    active_alerts INTEGER;
    recent_errors INTEGER;
    avg_response_time INTEGER;
    cache_hit_rate DECIMAL;
    team_health JSONB;
BEGIN
    -- Get active alerts count
    SELECT COUNT(*) INTO active_alerts
    FROM photography_performance_alerts
    WHERE resolved = false;

    -- Get recent error count (last hour)
    SELECT COUNT(*) INTO recent_errors
    FROM photography_request_metrics
    WHERE status = 'error'
    AND start_time >= NOW() - INTERVAL '1 hour';

    -- Get average response time (last hour)
    SELECT AVG(duration_ms)::INTEGER INTO avg_response_time
    FROM photography_request_metrics
    WHERE status = 'success'
    AND start_time >= NOW() - INTERVAL '1 hour';

    -- Get cache hit rate (last hour)
    SELECT AVG(cache_hit_rate) * 100 INTO cache_hit_rate
    FROM photography_request_metrics
    WHERE start_time >= NOW() - INTERVAL '1 hour';

    -- Get team health status
    SELECT jsonb_object_agg(team_name, 
        jsonb_build_object(
            'status', status,
            'health_score', health_score,
            'error_rate', error_rate_percent,
            'avg_response_time', avg_response_time_ms
        )
    ) INTO team_health
    FROM (
        SELECT DISTINCT ON (team_name)
            team_name, status, health_score, error_rate_percent, avg_response_time_ms
        FROM photography_team_health
        ORDER BY team_name, timestamp DESC
    ) latest_team_health;

    -- Build result
    result := jsonb_build_object(
        'timestamp', NOW(),
        'overall_health', CASE
            WHEN active_alerts = 0 AND recent_errors < 5 THEN 'healthy'
            WHEN active_alerts < 3 AND recent_errors < 20 THEN 'warning'
            ELSE 'critical'
        END,
        'active_alerts', active_alerts,
        'recent_errors', recent_errors,
        'avg_response_time_ms', COALESCE(avg_response_time, 0),
        'cache_hit_rate_percent', ROUND(COALESCE(cache_hit_rate, 0), 2),
        'team_health', COALESCE(team_health, '{}'::jsonb)
    );

    RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Comments for documentation
COMMENT ON TABLE photography_performance_metrics IS 'Aggregated performance metrics for Photography AI system';
COMMENT ON TABLE photography_performance_alerts IS 'Performance alerts and notifications for monitoring';
COMMENT ON TABLE photography_request_metrics IS 'Detailed metrics for individual requests (short retention)';
COMMENT ON TABLE photography_monitoring_config IS 'Configuration settings for performance monitoring';
COMMENT ON TABLE photography_team_health IS 'Health tracking for individual team integrations';
COMMENT ON TABLE photography_system_metrics IS 'System resource metrics and health indicators';
COMMENT ON TABLE photography_performance_insights IS 'AI-generated performance insights and recommendations';

COMMENT ON FUNCTION cleanup_old_monitoring_data() IS 'Automatic cleanup of old monitoring data based on retention policy';
COMMENT ON FUNCTION update_monitoring_config(TEXT, JSONB, UUID) IS 'Update monitoring configuration with audit trail';
COMMENT ON FUNCTION get_photography_system_health() IS 'Get current overall system health status';