-- WS-154: Database & Performance Monitoring Views
-- Creates comprehensive database monitoring infrastructure for proactive performance tracking
-- Team D - Round 1 - Database monitoring implementation

-- Enable necessary extensions for monitoring
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Monitoring events table for centralized event storage
CREATE TABLE monitoring_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type TEXT NOT NULL CHECK (event_type IN ('slow_query', 'connection_issue', 'table_health', 'rls_violation', 'performance_alert')),
    event_data JSONB NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- SECURITY: Associate with user for audit trail
    user_id UUID REFERENCES auth.users(id),
    -- SECURITY: Track source for security auditing
    source_ip INET,
    user_agent TEXT,
    resolved_at TIMESTAMPTZ NULL,
    resolution_notes TEXT NULL
);

-- Index for efficient monitoring event queries
CREATE INDEX idx_monitoring_events_type_time ON monitoring_events(event_type, created_at DESC);
CREATE INDEX idx_monitoring_events_severity ON monitoring_events(severity, created_at DESC);
CREATE INDEX idx_monitoring_events_resolved ON monitoring_events(resolved_at) WHERE resolved_at IS NOT NULL;

-- 1. Slow Queries Monitoring View (Queries > 100ms)
CREATE VIEW monitoring_slow_queries AS
SELECT 
    query_start,
    state,
    -- SECURITY: Sanitize queries to prevent sensitive data exposure
    CASE 
        WHEN query LIKE '%auth.users%' OR query LIKE '%password%' OR query LIKE '%token%'
        THEN '[REDACTED - SENSITIVE QUERY]'
        ELSE LEFT(query, 100)
    END as query_preview,
    -- Performance metrics
    (EXTRACT(EPOCH FROM (now() - query_start)) * 1000)::INTEGER as duration_ms,
    pid,
    usename as username,
    application_name,
    client_addr,
    -- SECURITY: Only expose non-sensitive wait events
    CASE 
        WHEN wait_event_type = 'Lock' THEN 'Lock'
        WHEN wait_event_type = 'IO' THEN 'IO'
        ELSE 'Other'
    END as wait_event_category
FROM pg_stat_activity 
WHERE 
    -- CRITICAL: Security filters to prevent exposure of system queries
    datname = current_database()
    AND state = 'active'
    AND query NOT LIKE '%pg_stat%'
    AND query NOT LIKE '%information_schema%'
    AND query NOT LIKE '%monitoring_%'
    -- Only show queries longer than 100ms (per requirements)
    AND (now() - query_start) > INTERVAL '100 milliseconds'
    -- Exclude this monitoring view from itself
    AND query NOT LIKE '%monitoring_slow_queries%';

-- 2. Connection Pool Health Monitoring View
CREATE VIEW monitoring_connections AS
SELECT 
    -- Connection pool metrics
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
    (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction') as idle_in_transaction,
    (SELECT count(*) FROM pg_stat_activity) as total_connections,
    -- Connection utilization percentage
    ROUND(
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')::NUMERIC / 
        GREATEST((SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections'), 1) * 100, 
        2
    ) as utilization_percent,
    -- Database-specific connection counts
    datname as database_name,
    count(*) as database_connections
FROM pg_stat_activity 
WHERE datname IS NOT NULL
GROUP BY datname;

-- 3. Table Health Monitoring View (sizes, dead rows, bloat)
CREATE VIEW monitoring_table_health AS
SELECT 
    schemaname,
    tablename,
    -- Size metrics
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_total_relation_size(schemaname||'.'||tablename) as total_size_bytes,
    -- Row statistics
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    -- Health indicators
    CASE 
        WHEN n_live_tup = 0 THEN 0
        ELSE ROUND((n_dead_tup::NUMERIC / (n_live_tup + n_dead_tup)) * 100, 2)
    END as dead_tuple_percent,
    -- Vacuum and analyze stats
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    -- Performance indicators
    seq_scan as sequential_scans,
    idx_scan as index_scans,
    CASE 
        WHEN seq_scan + idx_scan = 0 THEN 0
        ELSE ROUND((idx_scan::NUMERIC / (seq_scan + idx_scan)) * 100, 2)
    END as index_usage_percent
FROM pg_stat_user_tables
WHERE schemaname IN ('public', 'auth')  -- Focus on application schemas
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 4. RLS Policy Status Monitoring View
CREATE VIEW monitoring_rls_status AS
SELECT 
    schemaname,
    tablename,
    -- RLS enablement status
    rowsecurity as rls_enabled,
    -- Policy information
    CASE 
        WHEN rowsecurity = true THEN 'ENABLED'
        ELSE 'DISABLED'
    END as rls_status,
    -- Policy count from pg_policies
    (
        SELECT count(*) 
        FROM pg_policies p 
        WHERE p.schemaname = t.schemaname 
        AND p.tablename = t.tablename
    ) as policy_count,
    -- Security assessment
    CASE 
        WHEN rowsecurity = false AND schemaname = 'public' THEN 'HIGH_RISK'
        WHEN rowsecurity = true AND (
            SELECT count(*) 
            FROM pg_policies p 
            WHERE p.schemaname = t.schemaname 
            AND p.tablename = t.tablename
        ) = 0 THEN 'MEDIUM_RISK'
        WHEN rowsecurity = true AND (
            SELECT count(*) 
            FROM pg_policies p 
            WHERE p.schemaname = t.schemaname 
            AND p.tablename = t.tablename
        ) > 0 THEN 'LOW_RISK'
        ELSE 'UNKNOWN'
    END as security_risk_level
FROM pg_tables t
WHERE t.schemaname IN ('public', 'auth')  -- Application schemas only
ORDER BY 
    CASE 
        WHEN rowsecurity = false AND schemaname = 'public' THEN 1
        WHEN rowsecurity = true AND (
            SELECT count(*) 
            FROM pg_policies p 
            WHERE p.schemaname = t.schemaname 
            AND p.tablename = t.tablename
        ) = 0 THEN 2
        ELSE 3
    END,
    schemaname,
    tablename;

-- MANDATORY: Enable RLS on monitoring_events table
ALTER TABLE monitoring_events ENABLE ROW LEVEL SECURITY;

-- SECURITY: Service role can access all monitoring data
CREATE POLICY "Service role full access - monitoring events" ON monitoring_events
    FOR ALL USING (auth.role() = 'service_role');

-- SECURITY: Admin users can view and manage monitoring events
CREATE POLICY "Admins can view monitoring events" ON monitoring_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
        )
    );

-- SECURITY: Admin users can update monitoring events (for resolution)
CREATE POLICY "Admins can update monitoring events" ON monitoring_events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
        )
    );

-- Function to record monitoring events
CREATE OR REPLACE FUNCTION record_monitoring_event(
    p_event_type TEXT,
    p_event_data JSONB,
    p_severity TEXT DEFAULT 'medium',
    p_source_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO monitoring_events (
        event_type, 
        event_data, 
        severity, 
        user_id, 
        source_ip, 
        user_agent
    )
    VALUES (
        p_event_type,
        p_event_data,
        p_severity,
        auth.uid(),
        p_source_ip,
        p_user_agent
    )
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$;

-- Function to get database monitoring summary
CREATE OR REPLACE FUNCTION get_database_monitoring_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    slow_query_count INTEGER;
    connection_util NUMERIC;
    high_risk_tables INTEGER;
    recent_events INTEGER;
    health_score INTEGER;
BEGIN
    -- Get slow query count
    SELECT COUNT(*) INTO slow_query_count
    FROM monitoring_slow_queries;
    
    -- Get connection utilization
    SELECT MAX(utilization_percent) INTO connection_util
    FROM monitoring_connections;
    
    -- Get high-risk tables count
    SELECT COUNT(*) INTO high_risk_tables
    FROM monitoring_rls_status
    WHERE security_risk_level = 'HIGH_RISK';
    
    -- Get recent monitoring events (last hour)
    SELECT COUNT(*) INTO recent_events
    FROM monitoring_events
    WHERE created_at >= NOW() - INTERVAL '1 hour'
    AND resolved_at IS NULL;
    
    -- Calculate overall health score
    health_score := 100;
    
    -- Deduct for slow queries
    IF slow_query_count > 5 THEN
        health_score := health_score - (slow_query_count * 2);
    END IF;
    
    -- Deduct for high connection utilization
    IF connection_util > 80 THEN
        health_score := health_score - 15;
    ELSIF connection_util > 60 THEN
        health_score := health_score - 5;
    END IF;
    
    -- Deduct for security risks
    IF high_risk_tables > 0 THEN
        health_score := health_score - (high_risk_tables * 10);
    END IF;
    
    -- Deduct for unresolved events
    IF recent_events > 3 THEN
        health_score := health_score - 10;
    END IF;
    
    -- Ensure health score doesn't go below 0
    health_score := GREATEST(health_score, 0);
    
    -- Build result JSON
    result := jsonb_build_object(
        'timestamp', NOW(),
        'health_score', health_score,
        'status', CASE
            WHEN health_score >= 90 THEN 'excellent'
            WHEN health_score >= 75 THEN 'good'
            WHEN health_score >= 50 THEN 'fair'
            ELSE 'poor'
        END,
        'metrics', jsonb_build_object(
            'slow_queries', slow_query_count,
            'connection_utilization_percent', COALESCE(connection_util, 0),
            'high_risk_tables', high_risk_tables,
            'unresolved_events', recent_events
        ),
        'recommendations', CASE
            WHEN slow_query_count > 5 THEN jsonb_build_array('Review and optimize slow queries')
            ELSE jsonb_build_array()
        END ||
        CASE
            WHEN connection_util > 80 THEN jsonb_build_array('Consider scaling database connections')
            ELSE jsonb_build_array()
        END ||
        CASE
            WHEN high_risk_tables > 0 THEN jsonb_build_array('Enable RLS on public tables')
            ELSE jsonb_build_array()
        END
    );
    
    RETURN result;
END;
$$;

-- Function for automated monitoring data cleanup
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Cleanup resolved monitoring events older than 30 days
    DELETE FROM monitoring_events
    WHERE resolved_at IS NOT NULL 
    AND resolved_at < NOW() - INTERVAL '30 days';
    
    -- Cleanup unresolved events older than 7 days (they should have been addressed)
    DELETE FROM monitoring_events
    WHERE resolved_at IS NULL 
    AND created_at < NOW() - INTERVAL '7 days';
    
    RAISE NOTICE 'Monitoring data cleanup completed';
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant SELECT permissions on monitoring views to authenticated users with admin role
-- Note: Access is controlled through RLS policies and API layer

-- Comments for documentation
COMMENT ON TABLE monitoring_events IS 'Central table for storing database monitoring events and alerts';
COMMENT ON VIEW monitoring_slow_queries IS 'Real-time view of database queries running longer than 100ms';
COMMENT ON VIEW monitoring_connections IS 'Database connection pool health and utilization metrics';
COMMENT ON VIEW monitoring_table_health IS 'Table maintenance statistics including dead tuples and vacuum status';
COMMENT ON VIEW monitoring_rls_status IS 'Row Level Security policy compliance monitoring for security auditing';

COMMENT ON FUNCTION record_monitoring_event(TEXT, JSONB, TEXT, INET, TEXT) IS 'Records monitoring events with proper security context';
COMMENT ON FUNCTION get_database_monitoring_summary() IS 'Provides comprehensive database health summary with actionable insights';
COMMENT ON FUNCTION cleanup_old_monitoring_data() IS 'Automated cleanup of old monitoring data based on retention policies';

-- Performance monitoring indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monitoring_events_performance ON monitoring_events(event_type, created_at DESC) WHERE resolved_at IS NULL;