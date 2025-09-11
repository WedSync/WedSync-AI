====================================

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_analytics_org_journey_time_perf 
    ON journey_execution_analytics(organization_id, journey_id, execution_start_time DESC)
    INCLUDE (total_execution_duration_ms, journey_completion_rate, error_rate);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_analytics_time_status_perf
    ON journey_execution_analytics(execution_start_time DESC, journey_completion_rate)
    INCLUDE (journey_id, participant_id, total_execution_duration_ms)
    WHERE journey_completion_rate < 1.0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_analytics_wedding_urgent
    ON journey_execution_analytics(days_to_wedding, execution_start_time DESC)
    INCLUDE (journey_id, participant_id, journey_completion_rate)
    WHERE days_to_wedding <= 30;

-- Node performance specialized indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_node_perf_type_time_status
    ON node_performance_analytics(node_type, execution_start_time DESC, status)
    INCLUDE (execution_duration_ms, error_type, business_impact);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_node_perf_slow_executions
    ON node_performance_analytics(execution_duration_ms DESC, execution_start_time DESC)
    INCLUDE (journey_id, node_id, node_type, status)
    WHERE execution_duration_ms > 1000;

-- Error analytics indexes for fast lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_analytics_type_severity_time
    ON journey_error_analytics(error_type, error_severity, last_occurrence DESC)
    INCLUDE (journey_id, occurrence_count, resolved);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_analytics_high_frequency
    ON journey_error_analytics(occurrence_count DESC, last_occurrence DESC)
    INCLUDE (error_type, error_severity, journey_id)
    WHERE occurrence_count >= 5;

-- Trends table partitioning preparation indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trends_date_journey_hour
    ON journey_performance_trends(trend_date, journey_id, hour_of_day)
    INCLUDE (total_executions, avg_execution_time_ms, error_rate);

-- Business intelligence reporting indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bi_org_date_revenue
    ON journey_business_intelligence(organization_id, date_dimension DESC)
    INCLUDE (revenue_generated_usd, weddings_processed, automation_rate)
    WHERE revenue_generated_usd > 0;

-- ============================================================================
-- MATERIALIZED VIEWS FOR HIGH-PERFORMANCE REPORTING
-- ============================================================================

-- Materialized view for real-time journey performance (refreshed every 5 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_journey_performance_realtime AS
SELECT 
    j.id as journey_id,
    j.name as journey_name,
    j.organization_id,
    j.is_active,
    -- Current execution metrics (last 24 hours)
    COUNT(jea.id) as executions_24h,
    COUNT(jea.id) FILTER (WHERE jea.execution_start_time >= NOW() - INTERVAL '1 hour') as executions_1h,
    COUNT(jea.id) FILTER (WHERE jea.journey_completion_rate = 1.0) as successful_executions_24h,
    COUNT(jea.id) FILTER (WHERE jea.journey_completion_rate < 1.0) as failed_executions_24h,
    -- Performance metrics
    ROUND(AVG(jea.total_execution_duration_ms), 2) as avg_execution_time_ms_24h,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY jea.total_execution_duration_ms), 2) as p95_execution_time_ms_24h,
    ROUND(AVG(jea.error_rate), 4) as avg_error_rate_24h,
    ROUND(AVG(jea.queue_wait_time_ms), 2) as avg_queue_wait_ms_24h,
    -- Recent performance (last hour for alerting)
    ROUND(AVG(jea.total_execution_duration_ms) FILTER (WHERE jea.execution_start_time >= NOW() - INTERVAL '1 hour'), 2) as avg_execution_time_ms_1h,
    ROUND(AVG(jea.error_rate) FILTER (WHERE jea.execution_start_time >= NOW() - INTERVAL '1 hour'), 4) as error_rate_1h,
    -- Business context
    COUNT(jea.id) FILTER (WHERE jea.wedding_date IS NOT NULL) as wedding_executions_24h,
    COUNT(jea.id) FILTER (WHERE jea.days_to_wedding <= 7) as urgent_executions_24h,
    COUNT(jea.id) FILTER (WHERE jea.participant_tier IN ('VIP', 'PREMIUM')) as vip_executions_24h,
    -- Health indicators
    CASE 
        WHEN AVG(jea.journey_completion_rate) > 0.95 AND AVG(jea.error_rate) < 0.05 THEN 'healthy'
        WHEN AVG(jea.journey_completion_rate) > 0.85 AND AVG(jea.error_rate) < 0.15 THEN 'warning'
        ELSE 'critical'
    END as health_status,
    -- Last execution info
    MAX(jea.execution_start_time) as last_execution_time,
    -- Resource utilization
    ROUND(AVG(jea.memory_usage_bytes) / 1024.0 / 1024.0, 2) as avg_memory_mb_24h,
    ROUND(AVG(jea.cpu_usage_percent), 2) as avg_cpu_percent_24h,
    -- Update timestamp
    NOW() as refreshed_at
FROM journeys j
LEFT JOIN journey_execution_analytics jea ON j.id = jea.journey_id 
    AND jea.execution_start_time >= NOW() - INTERVAL '24 hours'
WHERE j.is_active = true
GROUP BY j.id, j.name, j.organization_id, j.is_active;

CREATE UNIQUE INDEX ON mv_journey_performance_realtime (journey_id);
CREATE INDEX ON mv_journey_performance_realtime (organization_id, health_status);
CREATE INDEX ON mv_journey_performance_realtime (error_rate_1h DESC) WHERE error_rate_1h > 0.1;

-- Materialized view for node performance insights (refreshed every 15 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_node_performance_insights AS
SELECT 
    node_type,
    node_id,
    -- Execution volume
    COUNT(*) as total_executions_7d,
    COUNT(*) FILTER (WHERE execution_start_time >= NOW() - INTERVAL '24 hours') as executions_24h,
    COUNT(*) FILTER (WHERE status = 'success') as successful_executions,
    COUNT(*) FILTER (WHERE status = 'failure') as failed_executions,
    COUNT(*) FILTER (WHERE status = 'timeout') as timeout_executions,
    -- Performance percentiles
    ROUND(AVG(execution_duration_ms), 2) as avg_duration_ms,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_duration_ms), 2) as p50_duration_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_duration_ms), 2) as p95_duration_ms,
    ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_duration_ms), 2) as p99_duration_ms,
    -- Error analysis
    ROUND(COUNT(*) FILTER (WHERE status = 'failure')::numeric / NULLIF(COUNT(*), 0), 4) as error_rate,
    ROUND(COUNT(*) FILTER (WHERE status = 'timeout')::numeric / NULLIF(COUNT(*), 0), 4) as timeout_rate,
    -- Top error types with counts
    (SELECT jsonb_object_agg(error_type, error_count) FROM (
        SELECT error_type, COUNT(*) as error_count 
        FROM node_performance_analytics npa2 
        WHERE npa2.node_type = npa.node_type AND npa2.node_id = npa.node_id 
              AND npa2.status = 'failure' AND npa2.error_type IS NOT NULL
              AND npa2.execution_start_time >= NOW() - INTERVAL '7 days'
        GROUP BY error_type 
        ORDER BY error_count DESC 
        LIMIT 5
    ) error_stats) as top_errors,
    -- Resource metrics
    ROUND(AVG(memory_delta_bytes) / 1024.0 / 1024.0, 2) as avg_memory_delta_mb,
    ROUND(AVG(cpu_time_ms), 2) as avg_cpu_time_ms,
    -- Business impact
    COUNT(*) FILTER (WHERE business_impact = 'critical') as critical_impact_count,
    COUNT(*) FILTER (WHERE user_visible = true) as user_visible_count,
    -- Performance trend (last 24h vs previous 24h)
    CASE 
        WHEN AVG(execution_duration_ms) FILTER (WHERE execution_start_time >= NOW() - INTERVAL '24 hours') >
             AVG(execution_duration_ms) FILTER (WHERE execution_start_time >= NOW() - INTERVAL '48 hours' 
                                               AND execution_start_time < NOW() - INTERVAL '24 hours') * 1.2 
        THEN 'degrading'
        WHEN AVG(execution_duration_ms) FILTER (WHERE execution_start_time >= NOW() - INTERVAL '24 hours') <
             AVG(execution_duration_ms) FILTER (WHERE execution_start_time >= NOW() - INTERVAL '48 hours' 
                                               AND execution_start_time < NOW() - INTERVAL '24 hours') * 0.8 
        THEN 'improving'
        ELSE 'stable'
    END as performance_trend,
    -- Update timestamp
    NOW() as refreshed_at
FROM node_performance_analytics npa
WHERE execution_start_time >= NOW() - INTERVAL '7 days'
GROUP BY node_type, node_id;

CREATE UNIQUE INDEX ON mv_node_performance_insights (node_type, node_id);
CREATE INDEX ON mv_node_performance_insights (error_rate DESC) WHERE error_rate > 0.05;
CREATE INDEX ON mv_node_performance_insights (p95_duration_ms DESC) WHERE p95_duration_ms > 2000;

-- Materialized view for error analytics dashboard (refreshed every 10 minutes)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_error_analytics_dashboard AS
SELECT 
    error_type,
    error_category,
    error_severity,
    -- Occurrence statistics
    COUNT(*) as total_occurrences,
    SUM(occurrence_count) as total_error_instances,
    COUNT(*) FILTER (WHERE last_occurrence >= NOW() - INTERVAL '24 hours') as recent_occurrences_24h,
    SUM(occurrence_count) FILTER (WHERE last_occurrence >= NOW() - INTERVAL '24 hours') as recent_instances_24h,
    -- Error details
    COUNT(DISTINCT journey_id) as affected_journeys,
    COUNT(DISTINCT participant_id) as affected_participants,
    COUNT(*) FILTER (WHERE user_impact = true) as user_impacting_errors,
    -- Resolution metrics
    COUNT(*) FILTER (WHERE resolved = true) as resolved_count,
    ROUND(COUNT(*) FILTER (WHERE resolved = true)::numeric / COUNT(*), 4) as resolution_rate,
    ROUND(AVG(EXTRACT(EPOCH FROM (resolution_time - first_occurrence)) / 3600) 
          FILTER (WHERE resolved = true), 2) as avg_resolution_time_hours,
    -- Business impact
    SUM(COALESCE(revenue_impact_usd, 0)) as total_revenue_impact,
    COUNT(*) FILTER (WHERE business_impact IN ('high', 'critical')) as high_impact_count,
    -- Time analysis
    MIN(first_occurrence) as first_seen,
    MAX(last_occurrence) as last_seen,
    -- Frequency analysis
    ROUND(AVG(occurrence_count), 2) as avg_frequency,
    MAX(occurrence_count) as max_frequency,
    -- Top affected journeys
    (SELECT jsonb_object_agg(journey_name, error_count) FROM (
        SELECT 
            COALESCE(j.name, jea.journey_id::text) as journey_name,
            COUNT(*) as error_count 
        FROM journey_error_analytics jea2
        LEFT JOIN journeys j ON j.id = jea2.journey_id
        WHERE jea2.error_type = jea.error_type 
              AND jea2.error_category = jea.error_category
              AND jea2.last_occurrence >= NOW() - INTERVAL '7 days'
        GROUP BY j.name, jea2.journey_id
        ORDER BY error_count DESC 
        LIMIT 3
    ) journey_stats) as top_affected_journeys,
    -- Update timestamp
    NOW() as refreshed_at
FROM journey_error_analytics jea
GROUP BY error_type, error_category, error_severity;

CREATE UNIQUE INDEX ON mv_error_analytics_dashboard (error_type, error_category, error_severity);
CREATE INDEX ON mv_error_analytics_dashboard (recent_instances_24h DESC) WHERE recent_instances_24h > 0;
CREATE INDEX ON mv_error_analytics_dashboard (total_revenue_impact DESC) WHERE total_revenue_impact > 0;

-- ============================================================================
-- HIGH-PERFORMANCE QUERY FUNCTIONS
-- ============================================================================

-- Function for ultra-fast journey performance lookup
CREATE OR REPLACE FUNCTION get_journey_performance_fast(
    p_organization_id UUID,
    p_journey_id UUID DEFAULT NULL,
    p_hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    journey_id UUID,
    journey_name TEXT,
    executions_count BIGINT,
    success_rate NUMERIC,
    avg_execution_time_ms NUMERIC,
    p95_execution_time_ms NUMERIC,
    error_rate NUMERIC,
    health_status TEXT,
    last_execution TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mvjpr.journey_id,
        mvjpr.journey_name,
        CASE WHEN p_hours_back <= 24 THEN mvjpr.executions_24h ELSE mvjpr.executions_24h END::BIGINT,
        CASE WHEN mvjpr.executions_24h > 0 THEN mvjpr.successful_executions_24h::numeric / mvjpr.executions_24h ELSE 0 END,
        mvjpr.avg_execution_time_ms_24h,
        mvjpr.p95_execution_time_ms_24h,
        mvjpr.avg_error_rate_24h,
        mvjpr.health_status,
        mvjpr.last_execution_time
    FROM mv_journey_performance_realtime mvjpr
    WHERE mvjpr.organization_id = p_organization_id
      AND (p_journey_id IS NULL OR mvjpr.journey_id = p_journey_id)
    ORDER BY mvjpr.executions_24h DESC, mvjpr.journey_name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function for fast node performance analysis
CREATE OR REPLACE FUNCTION get_node_performance_analysis(
    p_node_type TEXT DEFAULT NULL,
    p_node_id TEXT DEFAULT NULL,
    p_performance_threshold_ms INTEGER DEFAULT 1000
)
RETURNS TABLE (
    node_type TEXT,
    node_id TEXT,
    executions_24h BIGINT,
    avg_duration_ms NUMERIC,
    p95_duration_ms NUMERIC,
    error_rate NUMERIC,
    performance_trend TEXT,
    top_errors JSONB,
    performance_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mvnpi.node_type,
        mvnpi.node_id,
        mvnpi.executions_24h,
        mvnpi.avg_duration_ms,
        mvnpi.p95_duration_ms,
        mvnpi.error_rate,
        mvnpi.performance_trend,
        mvnpi.top_errors,
        -- Performance score calculation (0-100)
        GREATEST(0, LEAST(100, 
            100 - (mvnpi.error_rate * 200) - 
            (CASE WHEN mvnpi.p95_duration_ms > p_performance_threshold_ms 
                  THEN (mvnpi.p95_duration_ms - p_performance_threshold_ms) / 100.0 
                  ELSE 0 END) -
            (CASE WHEN mvnpi.performance_trend = 'degrading' THEN 20 ELSE 0 END)
        )) as performance_score
    FROM mv_node_performance_insights mvnpi
    WHERE (p_node_type IS NULL OR mvnpi.node_type = p_node_type)
      AND (p_node_id IS NULL OR mvnpi.node_id = p_node_id)
    ORDER BY performance_score ASC, mvnpi.executions_24h DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function for real-time error monitoring
CREATE OR REPLACE FUNCTION get_error_monitoring_dashboard(
    p_severity TEXT DEFAULT NULL,
    p_hours_back INTEGER DEFAULT 24,
    p_min_occurrences INTEGER DEFAULT 1
)
RETURNS TABLE (
    error_type TEXT,
    error_severity TEXT,
    recent_instances BIGINT,
    affected_journeys BIGINT,
    resolution_rate NUMERIC,
    avg_resolution_hours NUMERIC,
    revenue_impact NUMERIC,
    priority_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mvead.error_type,
        mvead.error_severity,
        mvead.recent_instances_24h,
        mvead.affected_journeys::BIGINT,
        mvead.resolution_rate,
        mvead.avg_resolution_time_hours,
        mvead.total_revenue_impact,
        -- Priority score for error triage
        CASE mvead.error_severity
            WHEN 'critical' THEN 100
            WHEN 'high' THEN 75
            WHEN 'medium' THEN 50
            ELSE 25
        END +
        (mvead.recent_instances_24h * 0.1)::NUMERIC +
        (mvead.total_revenue_impact * 0.001)::NUMERIC as priority_score
    FROM mv_error_analytics_dashboard mvead
    WHERE (p_severity IS NULL OR mvead.error_severity = p_severity)
      AND mvead.recent_instances_24h >= p_min_occurrences
    ORDER BY priority_score DESC, mvead.recent_instances_24h DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function for business performance metrics
CREATE OR REPLACE FUNCTION get_business_performance_metrics(
    p_organization_id UUID,
    p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    metric_name TEXT,
    current_value NUMERIC,
    previous_value NUMERIC,
    change_percent NUMERIC,
    trend TEXT,
    target_value NUMERIC,
    achievement_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH current_metrics AS (
        SELECT 
            SUM(total_executions) as total_executions,
            AVG(automation_rate) as automation_rate,
            AVG(sla_compliance_rate) as sla_compliance_rate,
            SUM(revenue_generated_usd) as revenue_generated,
            SUM(weddings_processed) as weddings_processed,
            AVG(customer_satisfaction_score) as satisfaction_score
        FROM journey_business_intelligence 
        WHERE organization_id = p_organization_id 
          AND date_dimension >= CURRENT_DATE - p_days_back
    ),
    previous_metrics AS (
        SELECT 
            SUM(total_executions) as total_executions,
            AVG(automation_rate) as automation_rate,
            AVG(sla_compliance_rate) as sla_compliance_rate,
            SUM(revenue_generated_usd) as revenue_generated,
            SUM(weddings_processed) as weddings_processed,
            AVG(customer_satisfaction_score) as satisfaction_score
        FROM journey_business_intelligence 
        WHERE organization_id = p_organization_id 
          AND date_dimension >= CURRENT_DATE - (p_days_back * 2)
          AND date_dimension < CURRENT_DATE - p_days_back
    )
    SELECT * FROM (VALUES
        ('Total Executions', (SELECT total_executions FROM current_metrics), 
         (SELECT total_executions FROM previous_metrics), 
         CASE WHEN (SELECT total_executions FROM previous_metrics) > 0 
              THEN ((SELECT total_executions FROM current_metrics) - (SELECT total_executions FROM previous_metrics)) * 100.0 / (SELECT total_executions FROM previous_metrics)
              ELSE 0 END,
         CASE WHEN (SELECT total_executions FROM current_metrics) > (SELECT total_executions FROM previous_metrics) THEN 'up' ELSE 'down' END,
         1000.0, -- Target
         CASE WHEN 1000 > 0 THEN (SELECT total_executions FROM current_metrics) / 1000.0 * 100 ELSE 0 END),
        
        ('Automation Rate %', (SELECT automation_rate * 100 FROM current_metrics), 
         (SELECT automation_rate * 100 FROM previous_metrics),
         ((SELECT automation_rate FROM current_metrics) - (SELECT automation_rate FROM previous_metrics)) * 100,
         CASE WHEN (SELECT automation_rate FROM current_metrics) > (SELECT automation_rate FROM previous_metrics) THEN 'up' ELSE 'down' END,
         95.0, -- Target 95%
         (SELECT automation_rate FROM current_metrics) / 0.95 * 100),
         
        ('SLA Compliance %', (SELECT sla_compliance_rate * 100 FROM current_metrics), 
         (SELECT sla_compliance_rate * 100 FROM previous_metrics),
         ((SELECT sla_compliance_rate FROM current_metrics) - (SELECT sla_compliance_rate FROM previous_metrics)) * 100,
         CASE WHEN (SELECT sla_compliance_rate FROM current_metrics) > (SELECT sla_compliance_rate FROM previous_metrics) THEN 'up' ELSE 'down' END,
         98.0, -- Target 98%
         (SELECT sla_compliance_rate FROM current_metrics) / 0.98 * 100),
         
        ('Revenue Generated', (SELECT revenue_generated FROM current_metrics), 
         (SELECT revenue_generated FROM previous_metrics),
         CASE WHEN (SELECT revenue_generated FROM previous_metrics) > 0 
              THEN ((SELECT revenue_generated FROM current_metrics) - (SELECT revenue_generated FROM previous_metrics)) * 100.0 / (SELECT revenue_generated FROM previous_metrics)
              ELSE 0 END,
         CASE WHEN (SELECT revenue_generated FROM current_metrics) > (SELECT revenue_generated FROM previous_metrics) THEN 'up' ELSE 'down' END,
         10000.0, -- Target
         (SELECT revenue_generated FROM current_metrics) / 10000.0 * 100),
         
        ('Weddings Processed', (SELECT weddings_processed FROM current_metrics), 
         (SELECT weddings_processed FROM previous_metrics),
         CASE WHEN (SELECT weddings_processed FROM previous_metrics) > 0 
              THEN ((SELECT weddings_processed FROM current_metrics) - (SELECT weddings_processed FROM previous_metrics)) * 100.0 / (SELECT weddings_processed FROM previous_metrics)
              ELSE 0 END,
         CASE WHEN (SELECT weddings_processed FROM current_metrics) > (SELECT weddings_processed FROM previous_metrics) THEN 'up' ELSE 'down' END,
         50.0, -- Target
         (SELECT weddings_processed FROM current_metrics) / 50.0 * 100)
    ) AS metrics(metric_name, current_value, previous_value, change_percent, trend, target_value, achievement_rate);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- AUTOMATED REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- ============================================================================

-- Function to refresh real-time performance view
CREATE OR REPLACE FUNCTION refresh_journey_performance_realtime()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_journey_performance_realtime;
    
    -- Log refresh
    INSERT INTO journey_performance_metrics (
        timestamp, metric_type, value, labels
    ) VALUES (
        NOW(), 'materialized_view_refresh', 1, '{"view": "mv_journey_performance_realtime"}'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to refresh node performance insights
CREATE OR REPLACE FUNCTION refresh_node_performance_insights()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_node_performance_insights;
    
    INSERT INTO journey_performance_metrics (
        timestamp, metric_type, value, labels
    ) VALUES (
        NOW(), 'materialized_view_refresh', 1, '{"view": "mv_node_performance_insights"}'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to refresh error analytics dashboard
CREATE OR REPLACE FUNCTION refresh_error_analytics_dashboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_error_analytics_dashboard;
    
    INSERT INTO journey_performance_metrics (
        timestamp, metric_type, value, labels
    ) VALUES (
        NOW(), 'materialized_view_refresh', 1, '{"view": "mv_error_analytics_dashboard"}'
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- QUERY PERFORMANCE MONITORING
-- ============================================================================

-- Function to analyze slow queries
CREATE OR REPLACE FUNCTION analyze_slow_queries()
RETURNS TABLE (
    query_hash TEXT,
    avg_execution_time_ms NUMERIC,
    total_calls BIGINT,
    total_time_ms NUMERIC,
    query_text TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        queryid::TEXT as query_hash,
        ROUND(mean_exec_time, 2) as avg_execution_time_ms,
        calls as total_calls,
        ROUND(total_exec_time, 2) as total_time_ms,
        LEFT(query, 200) as query_text
    FROM pg_stat_statements 
    WHERE query LIKE '%journey%' OR query LIKE '%analytics%'
    ORDER BY mean_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    index_scans BIGINT,
    tuples_read BIGINT,
    tuples_fetched BIGINT,
    usage_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        indexname as index_name,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        CASE WHEN idx_tup_read > 0 THEN 
            ROUND(idx_tup_fetch::numeric / idx_tup_read, 4) 
        ELSE 0 END as usage_ratio
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public' 
      AND (tablename LIKE '%journey%' OR tablename LIKE '%analytics%')
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTITION MANAGEMENT (Future Enhancement)
-- ============================================================================

-- Function to create monthly partitions for large tables
CREATE OR REPLACE FUNCTION create_monthly_partitions(
    p_table_name TEXT,
    p_months_ahead INTEGER DEFAULT 3
)
RETURNS void AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    FOR i IN 0..p_months_ahead LOOP
        partition_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' * i;
        partition_name := p_table_name || '_' || TO_CHAR(partition_date, 'YYYY_MM');
        start_date := partition_date;
        end_date := partition_date + INTERVAL '1 month';
        
        -- Create partition if it doesn't exist
        EXECUTE format('
            CREATE TABLE IF NOT EXISTS %I 
            PARTITION OF %I 
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, p_table_name, start_date, end_date
        );
        
        -- Create indexes on partition
        EXECUTE format('
            CREATE INDEX IF NOT EXISTS %I 
            ON %I (execution_start_time, organization_id)',
            'idx_' || partition_name || '_time_org', partition_name
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- View for monitoring analytics table sizes and performance
CREATE OR REPLACE VIEW analytics_table_stats AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_tup_hot_upd as hot_updates,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 2) as dead_tuple_ratio,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE tablename LIKE '%journey%' OR tablename LIKE '%analytics%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- View for monitoring query performance
CREATE OR REPLACE VIEW analytics_query_performance AS
SELECT 
    calls,
    ROUND(total_exec_time, 2) as total_time_ms,
    ROUND(mean_exec_time, 2) as avg_time_ms,
    ROUND(stddev_exec_time, 2) as stddev_time_ms,
    rows as avg_rows,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) as hit_percent,
    LEFT(query, 100) as query_sample
FROM pg_stat_statements 
WHERE query ~* 'journey|analytics'
  AND calls > 10
ORDER BY mean_exec_time DESC
LIMIT 50;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON MATERIALIZED VIEW mv_journey_performance_realtime IS 'High-performance real-time journey metrics for dashboards (5min refresh)';
COMMENT ON MATERIALIZED VIEW mv_node_performance_insights IS 'Node performance analytics with trend analysis (15min refresh)';
COMMENT ON MATERIALIZED VIEW mv_error_analytics_dashboard IS 'Error monitoring dashboard with impact analysis (10min refresh)';

COMMENT ON FUNCTION get_journey_performance_fast IS 'Ultra-fast journey performance lookup using materialized views';
COMMENT ON FUNCTION get_node_performance_analysis IS 'Comprehensive node performance analysis with scoring';
COMMENT ON FUNCTION get_error_monitoring_dashboard IS 'Real-time error monitoring with priority scoring';
COMMENT ON FUNCTION get_business_performance_metrics IS 'Business KPI metrics with trend analysis and targets';

COMMENT ON VIEW analytics_table_stats IS 'Monitor analytics table sizes and maintenance statistics';
COMMENT ON VIEW analytics_query_performance IS 'Monitor query performance for analytics tables';


-- ========================================
-- Migration: 20250121000003_analytics_automation_setup.sql
-- ========================================

-- Analytics Automation Setup - Team D Round 2
-- Automated triggers, scheduled functions, and data processing for analytics
-- Final integration layer for Team B execution engine analytics

-- ============================================================================
-- AUTOMATED DATA PROCESSING FUNCTIONS
-- ============================================================================

-- Function to process new journey execution data for analytics
CREATE OR REPLACE FUNCTION process_journey_execution_for_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert initial analytics record when execution starts
    IF TG_OP = 'INSERT' THEN
        INSERT INTO journey_execution_analytics (
            journey_id,
            execution_id,
            participant_id,
            execution_start_time,
            queue_wait_time_ms,
            total_nodes,
            completed_nodes,
            failed_nodes,
            skipped_nodes,
            retry_count,
            journey_priority,
            participant_tier,
            wedding_date,
            days_to_wedding,
            organization_id
        )
        SELECT 
            NEW.journey_id,
            NEW.id,
            NEW.participant_id,
            NEW.started_at,
            COALESCE((NEW.performance_metrics->>'queueWaitTime')::integer, 0),
            COALESCE((NEW.performance_metrics->>'totalNodes')::integer, 0),
            COALESCE((NEW.performance_metrics->>'completedNodes')::integer, 0),
            COALESCE((NEW.performance_metrics->>'failedNodes')::integer, 0),
            0, -- skipped_nodes, will be calculated
            COALESCE((NEW.metadata->>'retryCount')::integer, 0),
            COALESCE((NEW.metadata->>'priority')::integer, 5),
            NEW.participant_data->>'tier',
            CASE 
                WHEN NEW.participant_data->>'weddingDate' IS NOT NULL 
                THEN (NEW.participant_data->>'weddingDate')::timestamptz
                ELSE NULL 
            END,
            CASE 
                WHEN NEW.participant_data->>'weddingDate' IS NOT NULL 
                THEN CEIL(EXTRACT(EPOCH FROM (
                    (NEW.participant_data->>'weddingDate')::timestamptz - NOW()
                )) / 86400)::integer
                ELSE NULL 
            END,
            (NEW.metadata->>'organizationId')::uuid
        ON CONFLICT (execution_id) DO NOTHING;
        
        RETURN NEW;
    END IF;

    -- Update analytics record when execution completes or fails
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        UPDATE journey_execution_analytics SET
            execution_end_time = NEW.completed_at,
            total_execution_duration_ms = CASE 
                WHEN NEW.completed_at IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000
                ELSE NULL 
            END,
            completed_nodes = COALESCE((NEW.performance_metrics->>'completedNodes')::integer, 0),
            failed_nodes = COALESCE((NEW.performance_metrics->>'failedNodes')::integer, 0),
            avg_node_execution_time_ms = COALESCE((NEW.performance_metrics->>'averageNodeExecutionTime')::numeric, 0),
            journey_completion_rate = CASE 
                WHEN NEW.status = 'completed' THEN 1.0
                WHEN NEW.status = 'failed' THEN 0.0
                ELSE COALESCE((NEW.performance_metrics->>'completedNodes')::numeric, 0) / 
                     NULLIF(COALESCE((NEW.performance_metrics->>'totalNodes')::numeric, 1), 0)
            END,
            error_rate = COALESCE((NEW.performance_metrics->>'failedNodes')::numeric, 0) / 
                        NULLIF(COALESCE((NEW.performance_metrics->>'totalNodes')::numeric, 1), 0),
            retry_count = COALESCE((NEW.metadata->>'retryCount')::integer, 0),
            memory_usage_bytes = pg_column_size(NEW),
            updated_at = NOW()
        WHERE execution_id = NEW.id;
        
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for journey execution analytics
CREATE TRIGGER journey_execution_analytics_trigger
    AFTER INSERT OR UPDATE ON journey_executions
    FOR EACH ROW
    EXECUTE FUNCTION process_journey_execution_for_analytics();

-- Function to process execution log entries for node analytics
CREATE OR REPLACE FUNCTION process_execution_log_for_node_analytics()
RETURNS TRIGGER AS $$
DECLARE
    execution_record journey_executions%ROWTYPE;
BEGIN
    -- Get execution details
    SELECT * INTO execution_record 
    FROM journey_executions 
    WHERE id = NEW.instance_id;
    
    IF FOUND THEN
        -- Insert node performance analytics
        INSERT INTO node_performance_analytics (
            journey_id,
            execution_id,
            node_id,
            node_type,
            node_name,
            execution_order,
            execution_start_time,
            execution_end_time,
            execution_duration_ms,
            status,
            retry_attempt,
            error_message,
            error_type,
            business_impact,
            user_visible
        )
        SELECT 
            NEW.journey_id,
            NEW.instance_id,
            NEW.step_id,
            NEW.step_type,
            NEW.step_name,
            (SELECT COUNT(*) FROM journey_execution_logs 
             WHERE instance_id = NEW.instance_id AND timestamp <= NEW.timestamp),
            NEW.timestamp,
            NEW.timestamp, -- Same for logs, actual duration would come from execution events
            COALESCE((NEW.details->>'duration')::integer, 0),
            CASE 
                WHEN NEW.status = 'success' THEN 'success'
                WHEN NEW.status = 'error' THEN 'failure'
                WHEN NEW.status = 'timeout' THEN 'timeout'
                ELSE 'success'
            END,
            COALESCE((NEW.details->>'retryCount')::integer, 0),
            NEW.details->>'error',
            CASE 
                WHEN NEW.details->>'error' IS NOT NULL 
                THEN SPLIT_PART(NEW.details->>'error', ':', 1)
                ELSE NULL 
            END,
            CASE 
                WHEN NEW.step_type IN ('email', 'sms', 'form') THEN 'medium'
                WHEN NEW.step_type IN ('webhook', 'review') THEN 'high'
                ELSE 'low'
            END,
            NEW.step_type IN ('email', 'sms', 'form', 'review')
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for node performance analytics
CREATE TRIGGER execution_log_node_analytics_trigger
    AFTER INSERT ON journey_execution_logs
    FOR EACH ROW
    EXECUTE FUNCTION process_execution_log_for_node_analytics();

-- ============================================================================
-- AUTOMATED AGGREGATION FUNCTIONS
-- ============================================================================

-- Function to update performance trends (runs every hour)
CREATE OR REPLACE FUNCTION update_performance_trends_hourly()
RETURNS void AS $$
BEGIN
    -- Update trends for the previous hour
    WITH hourly_stats AS (
        SELECT 
            jea.journey_id,
            DATE(jea.execution_start_time) as trend_date,
            EXTRACT(HOUR FROM jea.execution_start_time) as hour_of_day,
            COUNT(*) as total_executions,
            COUNT(*) FILTER (WHERE jea.journey_completion_rate = 1.0) as successful_executions,
            COUNT(*) FILTER (WHERE jea.journey_completion_rate < 1.0) as failed_executions,
            ROUND(AVG(jea.total_execution_duration_ms), 2) as avg_execution_time_ms,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY jea.total_execution_duration_ms), 2) as p50_execution_time_ms,
            ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY jea.total_execution_duration_ms), 2) as p95_execution_time_ms,
            ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY jea.total_execution_duration_ms), 2) as p99_execution_time_ms,
            ROUND(AVG(jea.error_rate), 4) as error_rate,
            ROUND(AVG(jea.queue_wait_time_ms), 2) as avg_queue_wait_time_ms,
            ROUND(AVG(jea.memory_usage_bytes) / 1024.0 / 1024.0, 2) as avg_memory_usage_mb,
            ROUND(AVG(jea.cpu_usage_percent), 2) as avg_cpu_usage_percent,
            COUNT(*) FILTER (WHERE jea.wedding_date IS NOT NULL) as wedding_execution_count,
            COUNT(*) FILTER (WHERE jea.days_to_wedding <= 7) as urgent_execution_count,
            COUNT(*) FILTER (WHERE jea.participant_tier IN ('VIP', 'PREMIUM')) as vip_execution_count
        FROM journey_execution_analytics jea
        WHERE jea.execution_start_time >= NOW() - INTERVAL '1 hour'
          AND jea.execution_start_time < NOW() - INTERVAL '5 minutes' -- Allow for completion buffer
        GROUP BY jea.journey_id, DATE(jea.execution_start_time), EXTRACT(HOUR FROM jea.execution_start_time)
    )
    INSERT INTO journey_performance_trends (
        journey_id, trend_date, hour_of_day,
        total_executions, successful_executions, failed_executions,
        avg_execution_time_ms, p50_execution_time_ms, p95_execution_time_ms, p99_execution_time_ms,
        error_rate, timeout_rate, retry_rate,
        avg_queue_wait_time_ms, avg_memory_usage_mb, avg_cpu_usage_percent,
        wedding_execution_count, urgent_execution_count, vip_execution_count
    )
    SELECT 
        journey_id, trend_date, hour_of_day,
        total_executions, successful_executions, failed_executions,
        avg_execution_time_ms, p50_execution_time_ms, p95_execution_time_ms, p99_execution_time_ms,
        error_rate, 
        0 as timeout_rate, -- Would need timeout data from node analytics
        0 as retry_rate,    -- Would calculate from retry counts
        avg_queue_wait_time_ms, avg_memory_usage_mb, avg_cpu_usage_percent,
        wedding_execution_count, urgent_execution_count, vip_execution_count
    FROM hourly_stats
    ON CONFLICT (journey_id, trend_date, hour_of_day) 
    DO UPDATE SET
        total_executions = EXCLUDED.total_executions,
        successful_executions = EXCLUDED.successful_executions,
        failed_executions = EXCLUDED.failed_executions,
        avg_execution_time_ms = EXCLUDED.avg_execution_time_ms,
        p50_execution_time_ms = EXCLUDED.p50_execution_time_ms,
        p95_execution_time_ms = EXCLUDED.p95_execution_time_ms,
        p99_execution_time_ms = EXCLUDED.p99_execution_time_ms,
        error_rate = EXCLUDED.error_rate,
        avg_queue_wait_time_ms = EXCLUDED.avg_queue_wait_time_ms,
        avg_memory_usage_mb = EXCLUDED.avg_memory_usage_mb,
        avg_cpu_usage_percent = EXCLUDED.avg_cpu_usage_percent,
        wedding_execution_count = EXCLUDED.wedding_execution_count,
        urgent_execution_count = EXCLUDED.urgent_execution_count,
        vip_execution_count = EXCLUDED.vip_execution_count,
        updated_at = NOW();
        
    -- Update business intelligence aggregations
    PERFORM update_business_intelligence();
    
    -- Log aggregation completion
    INSERT INTO journey_performance_metrics (
        timestamp, metric_type, value, labels
    ) VALUES (
        NOW(), 'hourly_aggregation_completed', 1, 
        jsonb_build_object('function', 'update_performance_trends_hourly')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to consolidate error occurrences (runs every 15 minutes)
CREATE OR REPLACE FUNCTION consolidate_error_analytics()
RETURNS void AS $$
BEGIN
    -- Update error occurrence counts and latest occurrences
    WITH error_stats AS (
        SELECT 
            error_type,
            error_category,
            error_severity,
            journey_id,
            COUNT(*) as new_occurrences,
            MAX(created_at) as latest_occurrence
        FROM journey_error_analytics
        WHERE last_occurrence >= NOW() - INTERVAL '15 minutes'
          AND occurrence_count = 1 -- Only process new errors
        GROUP BY error_type, error_category, error_severity, journey_id
    )
    UPDATE journey_error_analytics jea SET
        occurrence_count = jea.occurrence_count + es.new_occurrences - 1,
        last_occurrence = es.latest_occurrence,
        updated_at = NOW()
    FROM error_stats es
    WHERE jea.error_type = es.error_type
      AND jea.error_category = es.error_category
      AND jea.error_severity = es.error_severity
      AND jea.journey_id = es.journey_id
      AND jea.id = (
          SELECT id FROM journey_error_analytics jea2
          WHERE jea2.error_type = es.error_type
            AND jea2.error_category = es.error_category
            AND jea2.error_severity = es.error_severity
            AND jea2.journey_id = es.journey_id
          ORDER BY first_occurrence ASC
          LIMIT 1
      );
      
    -- Remove duplicate error entries (keep oldest)
    WITH duplicate_errors AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY error_type, error_category, error_severity, journey_id 
                ORDER BY first_occurrence ASC
            ) as rn
        FROM journey_error_analytics
        WHERE last_occurrence >= NOW() - INTERVAL '15 minutes'
    )
    DELETE FROM journey_error_analytics 
    WHERE id IN (
        SELECT id FROM duplicate_errors WHERE rn > 1
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE MONITORING AUTOMATION
-- ============================================================================

-- Function to monitor system performance and create alerts
CREATE OR REPLACE FUNCTION monitor_system_performance()
RETURNS void AS $$
DECLARE
    current_metrics RECORD;
    alert_threshold RECORD;
    should_alert BOOLEAN;
BEGIN
    -- Get current system metrics from the most recent real-time entry
    SELECT 
        active_executions,
        queue_depth,
        processing_rate,
        avg_execution_time_last_5min,
        error_rate_last_5min,
        system_health_score,
        memory_usage_mb,
        cpu_usage_percent
    INTO current_metrics
    FROM journey_realtime_metrics
    ORDER BY timestamp DESC
    LIMIT 1;
    
    -- Check against alert rules and create alerts if needed
    FOR alert_threshold IN 
        SELECT * FROM journey_alert_rules WHERE enabled = true
    LOOP
        should_alert := false;
        
        -- Check specific metric thresholds
        CASE alert_threshold.metric_type
            WHEN 'execution_time' THEN
                should_alert := current_metrics.avg_execution_time_last_5min > alert_threshold.threshold;
            WHEN 'queue_depth' THEN
                should_alert := current_metrics.queue_depth > alert_threshold.threshold;
            WHEN 'error_rate' THEN
                should_alert := current_metrics.error_rate_last_5min > (alert_threshold.threshold / 100.0);
            WHEN 'memory_heap_used' THEN
                should_alert := current_metrics.memory_usage_mb > alert_threshold.threshold;
            WHEN 'system_health' THEN
                should_alert := current_metrics.system_health_score < (alert_threshold.threshold / 100.0);
            WHEN 'processing_rate' THEN
                should_alert := current_metrics.processing_rate < alert_threshold.threshold;
        END CASE;
        
        -- Create alert if threshold exceeded
        IF should_alert THEN
            INSERT INTO journey_alerts (
                rule_id,
                rule_name,
                metric_type,
                threshold,
                actual_value,
                severity,
                timestamp
            ) VALUES (
                alert_threshold.id,
                alert_threshold.name,
                alert_threshold.metric_type,
                alert_threshold.threshold,
                CASE alert_threshold.metric_type
                    WHEN 'execution_time' THEN current_metrics.avg_execution_time_last_5min
                    WHEN 'queue_depth' THEN current_metrics.queue_depth
                    WHEN 'error_rate' THEN current_metrics.error_rate_last_5min * 100
                    WHEN 'memory_heap_used' THEN current_metrics.memory_usage_mb
                    WHEN 'system_health' THEN current_metrics.system_health_score * 100
                    WHEN 'processing_rate' THEN current_metrics.processing_rate
                END,
                alert_threshold.severity,
                NOW()
            );
            
            -- Log the alert creation
            INSERT INTO journey_performance_metrics (
                timestamp, metric_type, value, labels
            ) VALUES (
                NOW(), 'alert_created', 1, 
                jsonb_build_object(
                    'rule_name', alert_threshold.name,
                    'severity', alert_threshold.severity,
                    'metric_type', alert_threshold.metric_type,
                    'threshold', alert_threshold.threshold,
                    'actual_value', CASE alert_threshold.metric_type
                        WHEN 'execution_time' THEN current_metrics.avg_execution_time_last_5min
                        WHEN 'queue_depth' THEN current_metrics.queue_depth
                        WHEN 'error_rate' THEN current_metrics.error_rate_last_5min * 100
                        WHEN 'memory_heap_used' THEN current_metrics.memory_usage_mb
                        WHEN 'system_health' THEN current_metrics.system_health_score * 100
                        WHEN 'processing_rate' THEN current_metrics.processing_rate
                    END
                )
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUTOMATED CLEANUP FUNCTIONS
-- ============================================================================

-- Function to clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_analytics_data()
RETURNS void AS $$
BEGIN
    -- Clean up old real-time metrics (keep only 48 hours)
    DELETE FROM journey_realtime_metrics 
    WHERE timestamp < NOW() - INTERVAL '48 hours';
    
    -- Clean up old node performance analytics (keep 90 days)
    DELETE FROM node_performance_analytics 
    WHERE execution_start_time < NOW() - INTERVAL '90 days';
    
    -- Clean up resolved error analytics (keep resolved errors for 30 days)
    DELETE FROM journey_error_analytics 
    WHERE resolved = true 
      AND resolution_time < NOW() - INTERVAL '30 days';
    
    -- Clean up old performance trends (keep 1 year)
    DELETE FROM journey_performance_trends 
    WHERE trend_date < CURRENT_DATE - INTERVAL '1 year';
    
    -- Clean up old alerts (keep 90 days)
    DELETE FROM journey_alerts 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Clean up old execution analytics (keep 1 year)
    DELETE FROM journey_execution_analytics 
    WHERE execution_start_time < NOW() - INTERVAL '1 year';
    
    -- Vacuum analyze analytics tables for performance
    ANALYZE journey_execution_analytics;
    ANALYZE node_performance_analytics;
    ANALYZE journey_performance_trends;
    ANALYZE journey_error_analytics;
    
    -- Log cleanup completion
    INSERT INTO journey_performance_metrics (
        timestamp, metric_type, value, labels
    ) VALUES (
        NOW(), 'analytics_cleanup_completed', 1, 
        jsonb_build_object('function', 'cleanup_analytics_data')
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MATERIALIZED VIEW REFRESH AUTOMATION
-- ============================================================================

-- Function to refresh all materialized views in optimal order
CREATE OR REPLACE FUNCTION refresh_analytics_materialized_views()
RETURNS void AS $$
BEGIN
    -- Refresh in dependency order
    PERFORM refresh_journey_performance_realtime();
    PERFORM refresh_node_performance_insights();  
    PERFORM refresh_error_analytics_dashboard();
    
    -- Update last refresh timestamp
    INSERT INTO journey_performance_metrics (
        timestamp, metric_type, value, labels
    ) VALUES (
        NOW(), 'materialized_views_refreshed', 3, 
        jsonb_build_object('views', ARRAY['journey_performance_realtime', 'node_performance_insights', 'error_analytics_dashboard'])
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CRON SCHEDULE SETUP (Using pg_cron extension)
-- ============================================================================

-- Schedule performance trends aggregation (every hour)
SELECT cron.schedule(
    'journey-performance-trends-hourly',
    '0 * * * *',  -- Every hour at minute 0
    'SELECT update_performance_trends_hourly();'
);

-- Schedule error consolidation (every 15 minutes)
SELECT cron.schedule(
    'journey-error-consolidation',
    '*/15 * * * *',  -- Every 15 minutes
    'SELECT consolidate_error_analytics();'
);

-- Schedule system performance monitoring (every 5 minutes)
SELECT cron.schedule(
    'journey-system-monitoring',
    '*/5 * * * *',  -- Every 5 minutes
    'SELECT monitor_system_performance();'
);

-- Schedule materialized view refresh (every 10 minutes for real-time views)
SELECT cron.schedule(
    'journey-realtime-view-refresh',
    '*/10 * * * *',  -- Every 10 minutes
    'SELECT refresh_journey_performance_realtime();'
);

SELECT cron.schedule(
    'journey-node-insights-refresh',
    '*/20 * * * *',  -- Every 20 minutes
    'SELECT refresh_node_performance_insights();'
);

SELECT cron.schedule(
    'journey-error-dashboard-refresh',
    '*/15 * * * *',  -- Every 15 minutes  
    'SELECT refresh_error_analytics_dashboard();'
);

-- Schedule daily cleanup (every day at 2 AM)
SELECT cron.schedule(
    'journey-analytics-cleanup',
    '0 2 * * *',  -- Every day at 2 AM
    'SELECT cleanup_analytics_data();'
);

-- Schedule business intelligence updates (every 4 hours)
SELECT cron.schedule(
    'journey-business-intelligence-update',
    '0 */4 * * *',  -- Every 4 hours
    'SELECT update_business_intelligence();'
);

-- ============================================================================
-- MONITORING AND HEALTH CHECK FUNCTIONS
-- ============================================================================

-- Function to check analytics system health
CREATE OR REPLACE FUNCTION check_analytics_health()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    last_update TIMESTAMPTZ,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH health_checks AS (
        -- Check materialized view freshness
        SELECT 
            'mv_journey_performance_realtime' as component,
            CASE 
                WHEN refreshed_at > NOW() - INTERVAL '15 minutes' THEN 'healthy'
                WHEN refreshed_at > NOW() - INTERVAL '1 hour' THEN 'warning'
                ELSE 'critical'
            END as status,
            refreshed_at as last_update,
            jsonb_build_object('refresh_lag_minutes', 
                EXTRACT(EPOCH FROM (NOW() - refreshed_at)) / 60) as details
        FROM mv_journey_performance_realtime
        LIMIT 1
        
        UNION ALL
        
        -- Check real-time metrics freshness
        SELECT 
            'journey_realtime_metrics' as component,
            CASE 
                WHEN MAX(timestamp) > NOW() - INTERVAL '10 minutes' THEN 'healthy'
                WHEN MAX(timestamp) > NOW() - INTERVAL '30 minutes' THEN 'warning'  
                ELSE 'critical'
            END as status,
            MAX(timestamp) as last_update,
            jsonb_build_object(
                'data_lag_minutes', EXTRACT(EPOCH FROM (NOW() - MAX(timestamp))) / 60,
                'record_count', COUNT(*)
            ) as details
        FROM journey_realtime_metrics
        WHERE timestamp > NOW() - INTERVAL '1 hour'
        
        UNION ALL
        
        -- Check execution analytics data flow
        SELECT 
            'journey_execution_analytics' as component,
            CASE 
                WHEN COUNT(*) FILTER (WHERE execution_start_time > NOW() - INTERVAL '1 hour') > 0 THEN 'healthy'
                WHEN COUNT(*) FILTER (WHERE execution_start_time > NOW() - INTERVAL '4 hours') > 0 THEN 'warning'
                ELSE 'critical'
            END as status,
            MAX(execution_start_time) as last_update,
            jsonb_build_object(
                'executions_last_hour', COUNT(*) FILTER (WHERE execution_start_time > NOW() - INTERVAL '1 hour'),
                'executions_last_4_hours', COUNT(*) FILTER (WHERE execution_start_time > NOW() - INTERVAL '4 hours')
            ) as details
        FROM journey_execution_analytics
        WHERE execution_start_time > NOW() - INTERVAL '4 hours'
        
        UNION ALL
        
        -- Check scheduled jobs status
        SELECT 
            'scheduled_jobs' as component,
            CASE 
                WHEN COUNT(*) FILTER (WHERE last_run > NOW() - INTERVAL '1 hour') >= 3 THEN 'healthy'
                WHEN COUNT(*) FILTER (WHERE last_run > NOW() - INTERVAL '2 hours') >= 2 THEN 'warning'
                ELSE 'critical'
            END as status,
            MAX(last_run) as last_update,
            jsonb_build_object(
                'active_jobs', COUNT(*),
                'recent_runs', COUNT(*) FILTER (WHERE last_run > NOW() - INTERVAL '1 hour')
            ) as details
        FROM cron.job
        WHERE jobname LIKE 'journey-%'
    )
    SELECT * FROM health_checks;
END;
$$ LANGUAGE plpgsql;

-- Function to get analytics performance metrics
CREATE OR REPLACE FUNCTION get_analytics_performance_metrics()
RETURNS TABLE (
    metric_name TEXT,
    current_value NUMERIC,
    avg_value_24h NUMERIC,
    trend TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH metrics_24h AS (
        SELECT 
            'execution_analytics_records' as metric,
            COUNT(*)::NUMERIC as current_val,
            COUNT(*) FILTER (WHERE execution_start_time >= NOW() - INTERVAL '24 hours')::NUMERIC as val_24h
        FROM journey_execution_analytics
        
        UNION ALL
        
        SELECT 
            'node_analytics_records' as metric,
            COUNT(*)::NUMERIC as current_val,
            COUNT(*) FILTER (WHERE execution_start_time >= NOW() - INTERVAL '24 hours')::NUMERIC as val_24h
        FROM node_performance_analytics
        
        UNION ALL
        
        SELECT 
            'error_analytics_records' as metric,
            COUNT(*)::NUMERIC as current_val,
            COUNT(*) FILTER (WHERE last_occurrence >= NOW() - INTERVAL '24 hours')::NUMERIC as val_24h
        FROM journey_error_analytics
        
        UNION ALL
        
        SELECT 
            'avg_processing_time_ms' as metric,
            AVG(total_execution_duration_ms) as current_val,
            AVG(total_execution_duration_ms) FILTER (WHERE execution_start_time >= NOW() - INTERVAL '24 hours') as val_24h
        FROM journey_execution_analytics
        WHERE total_execution_duration_ms IS NOT NULL
        
        UNION ALL
        
        SELECT 
            'system_health_score' as metric,
            AVG(system_health_score * 100) as current_val,
            AVG(system_health_score * 100) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as val_24h
        FROM journey_realtime_metrics
    )
    SELECT 
        metric as metric_name,
        COALESCE(current_val, 0) as current_value,
        COALESCE(val_24h, 0) as avg_value_24h,
        CASE 
            WHEN current_val > val_24h * 1.1 THEN 'increasing'
            WHEN current_val < val_24h * 0.9 THEN 'decreasing' 
            ELSE 'stable'
        END as trend
    FROM metrics_24h;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INTEGRATION ACTIVATION FUNCTION
-- ============================================================================

-- Function to activate analytics integration with Team B execution engine
CREATE OR REPLACE FUNCTION activate_analytics_integration()
RETURNS void AS $$
BEGIN
    -- Ensure all triggers are enabled
    ALTER TABLE journey_executions ENABLE TRIGGER journey_execution_analytics_trigger;
    ALTER TABLE journey_execution_logs ENABLE TRIGGER execution_log_node_analytics_trigger;
    
    -- Refresh all materialized views
    PERFORM refresh_analytics_materialized_views();
    
    -- Validate integration is working
    INSERT INTO journey_performance_metrics (
        timestamp, metric_type, value, labels
    ) VALUES (
        NOW(), 'analytics_integration_activated', 1, 
        jsonb_build_object(
            'team', 'Team D',
            'round', 'Round 2',
            'integration_status', 'active'
        )
    );
    
    -- Log activation
    RAISE NOTICE 'Analytics integration with Team B execution engine activated successfully';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS AND FINAL SETUP
-- ============================================================================

COMMENT ON FUNCTION process_journey_execution_for_analytics() IS 'Processes journey execution changes for analytics data capture';
COMMENT ON FUNCTION process_execution_log_for_node_analytics() IS 'Processes execution log entries for node performance analytics';
COMMENT ON FUNCTION update_performance_trends_hourly() IS 'Updates hourly performance trends for capacity planning';
COMMENT ON FUNCTION consolidate_error_analytics() IS 'Consolidates error occurrences to prevent duplicate entries';
COMMENT ON FUNCTION monitor_system_performance() IS 'Monitors system performance and creates alerts when thresholds are exceeded';
COMMENT ON FUNCTION cleanup_analytics_data() IS 'Cleans up old analytics data according to retention policies';
COMMENT ON FUNCTION check_analytics_health() IS 'Checks the health status of all analytics components';
COMMENT ON FUNCTION activate_analytics_integration() IS 'Activates the complete analytics integration with Team B execution engine';

-- Grant necessary permissions for automation
GRANT EXECUTE ON FUNCTION process_journey_execution_for_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION process_execution_log_for_node_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION update_performance_trends_hourly() TO authenticated;
GRANT EXECUTE ON FUNCTION consolidate_error_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION monitor_system_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION check_analytics_health() TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_performance_metrics() TO authenticated;

-- Final activation
SELECT activate_analytics_integration();


-- ========================================
-- Migration: 20250122000001_rsvp_round2_extensions.sql
-- ========================================

-- RSVP Round 2 Extensions
-- Feature: WS-057 Round 2 - Advanced Features & Analytics
-- Building on Round 1 foundation with escalation, analytics, and waitlist

-- Enable additional extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- RSVP Reminder Escalation Tracking
-- Extends the existing reminder system with escalation logic
DROP VIEW IF EXISTS rsvp_reminder_escalation CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_reminder_escalation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    invitation_id UUID NOT NULL REFERENCES rsvp_invitations(id) ON DELETE CASCADE,
    escalation_level INTEGER DEFAULT 1, -- 1=email, 2=sms, 3=both, 4=personal
    last_escalation_at TIMESTAMPTZ,
    total_reminders_sent INTEGER DEFAULT 0,
    response_deadline TIMESTAMPTZ,
    is_escalation_active BOOLEAN DEFAULT true,
    escalation_settings JSONB DEFAULT '{"max_escalations": 4, "escalation_delay_hours": 48}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Analytics Predictions
-- Advanced analytics with ML-style pattern recognition
DROP VIEW IF EXISTS rsvp_analytics_predictions CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_analytics_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    predicted_final_attendance INTEGER,
    prediction_confidence DECIMAL(5,2), -- 0-100 confidence percentage
    factors_json JSONB, -- Factors affecting prediction
    historical_patterns JSONB, -- Similar event patterns
    response_velocity DECIMAL(8,4), -- Responses per day
    time_to_event_days INTEGER,
    weather_factor DECIMAL(3,2), -- If available
    holiday_factor DECIMAL(3,2), -- Event on/near holiday
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, prediction_date)
);

-- RSVP Plus-One Relationships
-- Track plus-ones and household relationships
DROP VIEW IF EXISTS rsvp_plus_one_relationships CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_plus_one_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_invitation_id UUID NOT NULL REFERENCES rsvp_invitations(id) ON DELETE CASCADE,
    plus_one_name TEXT NOT NULL,
    plus_one_email TEXT,
    plus_one_phone VARCHAR(20),
    relationship_type VARCHAR(50) DEFAULT 'partner', -- partner, spouse, date, friend, family
    dietary_restrictions TEXT[],
    meal_preference VARCHAR(100),
    age_group VARCHAR(20) CHECK (age_group IN ('adult', 'teen', 'child', 'infant')),
    special_needs TEXT,
    is_confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Household Management
-- Group related invitations for family tracking
DROP VIEW IF EXISTS rsvp_households CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    household_name TEXT NOT NULL,
    primary_contact_invitation_id UUID REFERENCES rsvp_invitations(id),
    total_expected_guests INTEGER DEFAULT 1,
    household_notes TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state VARCHAR(10),
    zip_code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link invitations to households
DROP VIEW IF EXISTS rsvp_invitation_households CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_invitation_households (
    invitation_id UUID REFERENCES rsvp_invitations(id) ON DELETE CASCADE,
    household_id UUID REFERENCES rsvp_households(id) ON DELETE CASCADE,
    role_in_household VARCHAR(50) DEFAULT 'member', -- primary, member, child, guest
    PRIMARY KEY (invitation_id, household_id)
);

-- Enhanced Analytics Materialized View
-- High-performance analytics for dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS rsvp_analytics_summary AS
SELECT 
    e.id as event_id,
    e.event_name,
    e.event_date,
    e.max_guests,
    e.vendor_id,
    COUNT(DISTINCT i.id) as total_invited,
    COUNT(DISTINCT r.id) as total_responded,
    COUNT(DISTINCT CASE WHEN r.response_status = 'attending' THEN r.id END) as total_attending,
    COUNT(DISTINCT CASE WHEN r.response_status = 'not_attending' THEN r.id END) as total_not_attending,
    COUNT(DISTINCT CASE WHEN r.response_status = 'maybe' THEN r.id END) as total_maybe,
    COALESCE(SUM(CASE WHEN r.response_status = 'attending' THEN r.party_size ELSE 0 END), 0) as total_guests_confirmed,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT i.id) > 0 
            THEN (COUNT(DISTINCT r.id)::DECIMAL / COUNT(DISTINCT i.id)::DECIMAL * 100)
            ELSE 0 
        END, 2
    ) as response_rate_percentage,
    ROUND(
        CASE 
            WHEN COUNT(DISTINCT CASE WHEN r.response_status = 'attending' THEN r.id END) > 0
            THEN AVG(CASE WHEN r.response_status = 'attending' THEN r.party_size END)
            ELSE 0
        END, 2
    ) as avg_party_size,
    COUNT(DISTINCT w.id) as waitlist_count,
    COUNT(DISTINCT plus.id) as plus_ones_count,
    CURRENT_TIMESTAMP as last_updated
FROM rsvp_events e
LEFT JOIN rsvp_invitations i ON e.id = i.event_id
LEFT JOIN rsvp_responses r ON i.id = r.invitation_id
LEFT JOIN rsvp_waitlist w ON e.id = w.event_id AND w.status = 'waiting'
LEFT JOIN rsvp_plus_one_relationships plus ON i.id = plus.primary_invitation_id
GROUP BY e.id, e.event_name, e.event_date, e.max_guests, e.vendor_id;

-- RSVP Vendor Export Templates
-- Pre-configured export formats for vendors
DROP VIEW IF EXISTS rsvp_vendor_export_templates CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_vendor_export_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    export_format VARCHAR(20) NOT NULL CHECK (export_format IN ('csv', 'excel', 'json', 'pdf')),
    column_mapping JSONB NOT NULL, -- Maps internal fields to vendor requirements
    filter_settings JSONB, -- What data to include/exclude
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP Export History
-- Track generated exports for audit
DROP VIEW IF EXISTS rsvp_export_history CASCADE;
CREATE TABLE IF NOT EXISTS rsvp_export_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES rsvp_events(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL,
    file_format VARCHAR(20) NOT NULL,
    file_path TEXT,
    file_size_bytes INTEGER,
    records_exported INTEGER,
    export_settings JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Performance Indexes for Round 2
CREATE INDEX IF NOT EXISTS idx_rsvp_escalation_event_id ON rsvp_reminder_escalation(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_escalation_deadline ON rsvp_reminder_escalation(response_deadline) WHERE is_escalation_active = true;
CREATE INDEX IF NOT EXISTS idx_rsvp_predictions_event_date ON rsvp_analytics_predictions(event_id, prediction_date);
CREATE INDEX IF NOT EXISTS idx_rsvp_plus_ones_invitation ON rsvp_plus_one_relationships(primary_invitation_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_households_event ON rsvp_households(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_export_history_vendor ON rsvp_export_history(vendor_id, generated_at);

-- Refresh the materialized view automatically
CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvp_analytics_summary_event ON rsvp_analytics_summary(event_id);

-- RLS Policies for Round 2 Tables
ALTER TABLE rsvp_reminder_escalation ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_analytics_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_plus_one_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_households ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_invitation_households ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_vendor_export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_export_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Vendors can manage escalation tracking" ON rsvp_reminder_escalation
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rsvp_events 
            WHERE rsvp_events.id = rsvp_reminder_escalation.event_id 
            AND rsvp_events.vendor_id = ( SELECT auth.uid() )
        )
    );

CREATE POLICY "Vendors can view analytics predictions" ON rsvp_analytics_predictions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rsvp_events 
            WHERE rsvp_events.id = rsvp_analytics_predictions.event_id 
            AND rsvp_events.vendor_id = ( SELECT auth.uid() )
        )
    );

CREATE POLICY "Vendors can manage plus-one relationships" ON rsvp_plus_one_relationships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rsvp_invitations i
            JOIN rsvp_events e ON i.event_id = e.id
            WHERE i.id = rsvp_plus_one_relationships.primary_invitation_id 
            AND e.vendor_id = ( SELECT auth.uid() )
        )
    );

CREATE POLICY "Vendors can manage households" ON rsvp_households
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rsvp_events 
            WHERE rsvp_events.id = rsvp_households.event_id 
            AND rsvp_events.vendor_id = ( SELECT auth.uid() )
        )
    );

CREATE POLICY "Vendors can manage export templates" ON rsvp_vendor_export_templates
    FOR ALL USING (( SELECT auth.uid() ) = vendor_id);

CREATE POLICY "Vendors can view export history" ON rsvp_export_history
    FOR ALL USING (( SELECT auth.uid() ) = vendor_id);

-- Advanced Functions for Round 2

-- Function to calculate attendance prediction with confidence
CREATE OR REPLACE FUNCTION calculate_attendance_prediction(p_event_id UUID)
RETURNS TABLE(
    predicted_attendance INTEGER,
    confidence_percentage DECIMAL(5,2),
    factors JSONB
) AS $$
DECLARE
    v_event RECORD;
    v_total_invited INTEGER;
    v_total_responded INTEGER;
    v_total_attending INTEGER;
    v_days_to_event INTEGER;
    v_response_velocity DECIMAL;
    v_prediction INTEGER;
    v_confidence DECIMAL;
    v_factors JSONB;
BEGIN
    -- Get event details
    SELECT * INTO v_event FROM rsvp_events WHERE id = p_event_id;
    
    -- Get current statistics
    SELECT 
        COUNT(DISTINCT i.id),
        COUNT(DISTINCT r.id),
        COUNT(DISTINCT CASE WHEN r.response_status = 'attending' THEN r.id END)
    INTO v_total_invited, v_total_responded, v_total_attending
    FROM rsvp_invitations i
    LEFT JOIN rsvp_responses r ON i.id = r.invitation_id
    WHERE i.event_id = p_event_id;
    
    -- Calculate days to event
    v_days_to_event := EXTRACT(days FROM (v_event.event_date - CURRENT_DATE));
    
    -- Calculate response velocity (responses per day)
    v_response_velocity := CASE 
        WHEN v_total_responded > 0 AND EXTRACT(days FROM (CURRENT_DATE - v_event.created_at::DATE)) > 0
        THEN v_total_responded::DECIMAL / EXTRACT(days FROM (CURRENT_DATE - v_event.created_at::DATE))
        ELSE 0
    END;
    
    -- Prediction algorithm
    IF v_days_to_event > 30 THEN
        -- Early prediction based on typical patterns
        v_prediction := ROUND(v_total_invited * 0.72); -- 72% typical attendance
        v_confidence := 45.0;
    ELSIF v_days_to_event > 14 THEN
        -- Mid-range prediction with some responses
        v_prediction := v_total_attending + ROUND((v_total_invited - v_total_responded) * 0.65);
        v_confidence := 65.0 + (v_total_responded::DECIMAL / v_total_invited * 20);
    ELSIF v_days_to_event > 7 THEN
        -- Late prediction with most responses
        v_prediction := v_total_attending + ROUND((v_total_invited - v_total_responded) * 0.45);
        v_confidence := 75.0 + (v_total_responded::DECIMAL / v_total_invited * 20);
    ELSE
        -- Final week - high confidence
        v_prediction := v_total_attending + ROUND((v_total_invited - v_total_responded) * 0.25);
        v_confidence := 85.0 + (v_total_responded::DECIMAL / v_total_invited * 15);
    END IF;
    
    -- Build factors JSON
    v_factors := jsonb_build_object(
        'total_invited', v_total_invited,
        'total_responded', v_total_responded,
        'total_attending', v_total_attending,
        'response_rate', ROUND(v_total_responded::DECIMAL / v_total_invited * 100, 2),
        'days_to_event', v_days_to_event,
        'response_velocity', v_response_velocity,
        'prediction_method', CASE 
            WHEN v_days_to_event > 30 THEN 'early_statistical'
            WHEN v_days_to_event > 14 THEN 'mid_range_hybrid'
            WHEN v_days_to_event > 7 THEN 'late_response_based'
            ELSE 'final_week_conservative'
        END
    );
    
    RETURN QUERY SELECT v_prediction, v_confidence, v_factors;
END;
$$ LANGUAGE plpgsql;

-- Function to process reminder escalation
CREATE OR REPLACE FUNCTION process_reminder_escalation(p_event_id UUID)
RETURNS TABLE(
    escalated_count INTEGER,
    notifications_sent INTEGER
) AS $$
DECLARE
    v_escalation RECORD;
    v_escalated_count INTEGER := 0;
    v_notifications_sent INTEGER := 0;
BEGIN
    -- Find escalations that need processing
    FOR v_escalation IN
        SELECT 
            re.*,
            i.guest_name,
            i.guest_email,
            i.guest_phone,
            e.event_name,
            e.event_date
        FROM rsvp_reminder_escalation re
        JOIN rsvp_invitations i ON re.invitation_id = i.id
        JOIN rsvp_events e ON re.event_id = e.id
        LEFT JOIN rsvp_responses r ON i.id = r.invitation_id
        WHERE re.event_id = p_event_id
        AND re.is_escalation_active = true
        AND r.id IS NULL -- No response yet
        AND (
            re.last_escalation_at IS NULL OR 
            re.last_escalation_at < NOW() - INTERVAL '48 hours'
        )
        AND re.total_reminders_sent < (re.escalation_settings->>'max_escalations')::INTEGER
    LOOP
        -- Update escalation level and tracking
        UPDATE rsvp_reminder_escalation 
        SET 
            escalation_level = LEAST(escalation_level + 1, 4),
            last_escalation_at = NOW(),
            total_reminders_sent = total_reminders_sent + 1,
            updated_at = NOW()
        WHERE id = v_escalation.id;
        
        -- Create appropriate reminder based on escalation level
        INSERT INTO rsvp_reminders (
            event_id,
            invitation_id,
            reminder_type,
            scheduled_for,
            delivery_method,
            status
        ) VALUES (
            v_escalation.event_id,
            v_escalation.invitation_id,
            CASE 
                WHEN v_escalation.escalation_level = 1 THEN 'followup'
                WHEN v_escalation.escalation_level = 2 THEN 'followup'
                WHEN v_escalation.escalation_level = 3 THEN 'final'
                ELSE 'custom'
            END,
            NOW(),
            CASE 
                WHEN v_escalation.escalation_level = 1 THEN 'email'
                WHEN v_escalation.escalation_level = 2 THEN 'sms'
                ELSE 'both'
            END,
            'pending'
        );
        
        v_escalated_count := v_escalated_count + 1;
        v_notifications_sent := v_notifications_sent + 1;
    END LOOP;
    
    RETURN QUERY SELECT v_escalated_count, v_notifications_sent;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh analytics summary
CREATE OR REPLACE FUNCTION refresh_rsvp_analytics_summary()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY rsvp_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION trigger_refresh_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh in background to avoid blocking
    PERFORM pg_notify('refresh_analytics', NEW.event_id::TEXT);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for response changes
CREATE TRIGGER refresh_analytics_on_response_change
AFTER INSERT OR UPDATE OR DELETE ON rsvp_responses
FOR EACH ROW EXECUTE FUNCTION trigger_refresh_analytics();

-- Updated timestamp triggers for Round 2 tables
CREATE TRIGGER update_escalation_updated_at BEFORE UPDATE ON rsvp_reminder_escalation
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plus_one_updated_at BEFORE UPDATE ON rsvp_plus_one_relationships
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_templates_updated_at BEFORE UPDATE ON rsvp_vendor_export_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ========================================
-- Migration: 20250122000002_team_management_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Team Management System Migration
-- Created for WS-073: Team Management - Wedding Business Collaboration
-- Migration: 20250122000002

BEGIN;

-- ==============================================
-- TEAM ROLES ENUM
-- ==============================================

CREATE TYPE team_role AS ENUM (
    'owner',           -- Full access, billing, team management
    'senior_photographer', -- Full client management, forms, analytics
    'photographer',    -- Assigned client management only
    'coordinator',     -- Analytics and reporting only
    'viewer'           -- Read-only access
);

-- ==============================================
-- TEAMS TABLE
-- ==============================================

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Business metadata
    business_type TEXT DEFAULT 'photography',
    subscription_plan TEXT DEFAULT 'professional',
    max_team_members INTEGER DEFAULT 10,
    
    -- Settings
    settings JSONB DEFAULT '{
        "allow_invitations": true,
        "require_approval": true,
        "default_role": "viewer"
    }'::jsonb,
    
    CONSTRAINT teams_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100)
);

-- ==============================================
-- TEAM MEMBERS TABLE
-- ==============================================

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL, -- For invitations before user signup
    role team_role NOT NULL DEFAULT 'viewer',
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
    
    -- Invitation details
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    
    -- Access permissions
    permissions JSONB DEFAULT '{
        "clients": {"read": true, "write": false, "delete": false},
        "analytics": {"read": false, "write": false},
        "forms": {"read": false, "write": false, "delete": false},
        "billing": {"read": false, "write": false},
        "team": {"read": false, "write": false, "invite": false}
    }'::jsonb,
    
    -- Client assignments (for photographers)
    assigned_clients UUID[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(team_id, user_id),
    UNIQUE(team_id, email)
);

-- ==============================================
-- TEAM INVITATIONS TABLE
-- ==============================================

CREATE TABLE team_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role team_role NOT NULL DEFAULT 'viewer',
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Invitation tokens
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id),
    
    -- Metadata
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(team_id, email)
);

-- ==============================================
-- TEAM PERMISSIONS TABLE
-- ==============================================

CREATE TABLE team_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role team_role NOT NULL,
    resource TEXT NOT NULL, -- 'clients', 'analytics', 'forms', 'billing', 'team'
    action TEXT NOT NULL,   -- 'read', 'write', 'delete', 'invite', 'manage'
    allowed BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(role, resource, action)
);

-- ==============================================
-- TEAM ACTIVITY LOG
-- ==============================================

CREATE TABLE team_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource TEXT,
    resource_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Teams
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_created_at ON teams(created_at);

-- Team Members
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_email ON team_members(email);
CREATE INDEX idx_team_members_status ON team_members(status);
CREATE INDEX idx_team_members_role ON team_members(role);
CREATE INDEX idx_team_members_last_active ON team_members(last_active_at);

-- Team Invitations
CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
CREATE INDEX idx_team_invitations_expires_at ON team_invitations(expires_at);

-- Team Permissions
CREATE INDEX idx_team_permissions_role ON team_permissions(role);
CREATE INDEX idx_team_permissions_resource ON team_permissions(resource);

-- Team Activity Log
CREATE INDEX idx_team_activity_team_id ON team_activity_log(team_id);
CREATE INDEX idx_team_activity_user_id ON team_activity_log(user_id);
CREATE INDEX idx_team_activity_created_at ON team_activity_log(created_at);
CREATE INDEX idx_team_activity_action ON team_activity_log(action);

-- ==============================================
-- DEFAULT TEAM PERMISSIONS
-- ==============================================

INSERT INTO team_permissions (role, resource, action, allowed) VALUES
-- Owner permissions (full access)
('owner', 'clients', 'read', true),
('owner', 'clients', 'write', true),
('owner', 'clients', 'delete', true),
('owner', 'analytics', 'read', true),
('owner', 'analytics', 'write', true),
('owner', 'forms', 'read', true),
('owner', 'forms', 'write', true),
('owner', 'forms', 'delete', true),
('owner', 'billing', 'read', true),
('owner', 'billing', 'write', true),
('owner', 'team', 'read', true),
('owner', 'team', 'write', true),
('owner', 'team', 'invite', true),
('owner', 'team', 'manage', true),

-- Senior Photographer permissions
('senior_photographer', 'clients', 'read', true),
('senior_photographer', 'clients', 'write', true),
('senior_photographer', 'clients', 'delete', false),
('senior_photographer', 'analytics', 'read', true),
('senior_photographer', 'analytics', 'write', false),
('senior_photographer', 'forms', 'read', true),
('senior_photographer', 'forms', 'write', true),
('senior_photographer', 'forms', 'delete', false),
('senior_photographer', 'billing', 'read', false),
('senior_photographer', 'billing', 'write', false),
('senior_photographer', 'team', 'read', true),
('senior_photographer', 'team', 'write', false),
('senior_photographer', 'team', 'invite', false),
('senior_photographer', 'team', 'manage', false),

-- Photographer permissions (limited to assigned clients)
('photographer', 'clients', 'read', true),
('photographer', 'clients', 'write', true),
('photographer', 'clients', 'delete', false),
('photographer', 'analytics', 'read', false),
('photographer', 'analytics', 'write', false),
('photographer', 'forms', 'read', true),
('photographer', 'forms', 'write', true),
('photographer', 'forms', 'delete', false),
('photographer', 'billing', 'read', false),
('photographer', 'billing', 'write', false),
('photographer', 'team', 'read', true),
('photographer', 'team', 'write', false),
('photographer', 'team', 'invite', false),
('photographer', 'team', 'manage', false),

-- Coordinator permissions (analytics focus)
('coordinator', 'clients', 'read', true),
('coordinator', 'clients', 'write', false),
('coordinator', 'clients', 'delete', false),
('coordinator', 'analytics', 'read', true),
('coordinator', 'analytics', 'write', false),
('coordinator', 'forms', 'read', true),
('coordinator', 'forms', 'write', false),
('coordinator', 'forms', 'delete', false),
('coordinator', 'billing', 'read', false),
('coordinator', 'billing', 'write', false),
('coordinator', 'team', 'read', true),
('coordinator', 'team', 'write', false),
('coordinator', 'team', 'invite', false),
('coordinator', 'team', 'manage', false),

-- Viewer permissions (read-only)
('viewer', 'clients', 'read', true),
('viewer', 'clients', 'write', false),
('viewer', 'clients', 'delete', false),
('viewer', 'analytics', 'read', false),
('viewer', 'analytics', 'write', false),
('viewer', 'forms', 'read', true),
('viewer', 'forms', 'write', false),
('viewer', 'forms', 'delete', false),
('viewer', 'billing', 'read', false),
('viewer', 'billing', 'write', false),
('viewer', 'team', 'read', true),
('viewer', 'team', 'write', false),
('viewer', 'team', 'invite', false),
('viewer', 'team', 'manage', false);

-- ==============================================
-- ROW LEVEL SECURITY POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity_log ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view teams they own or are members of" ON teams
    FOR SELECT USING (
        owner_id = ( SELECT auth.uid() ) OR
        id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = ( SELECT auth.uid() ) AND status = 'active'
        )
    );

CREATE POLICY "Only team owners can create teams" ON teams
    FOR INSERT WITH CHECK (owner_id = ( SELECT auth.uid() ));

CREATE POLICY "Only team owners can update their teams" ON teams
    FOR UPDATE USING (owner_id = ( SELECT auth.uid() ));

CREATE POLICY "Only team owners can delete their teams" ON teams
    FOR DELETE USING (owner_id = ( SELECT auth.uid() ));

-- Team members policies
CREATE POLICY "Users can view team members of their teams" ON team_members
    FOR SELECT USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = ( SELECT auth.uid() )
            UNION
            SELECT team_id FROM team_members WHERE user_id = ( SELECT auth.uid() ) AND status = 'active'
        )
    );

CREATE POLICY "Only team owners and admins can manage team members" ON team_members
    FOR ALL USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = ( SELECT auth.uid() )
        )
    );

-- Team invitations policies
CREATE POLICY "Users can view invitations for their teams" ON team_invitations
    FOR SELECT USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = ( SELECT auth.uid() )
        ) OR
        email = auth.email()
    );

CREATE POLICY "Only team owners can create invitations" ON team_invitations
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = ( SELECT auth.uid() )
        )
    );

CREATE POLICY "Only team owners can update invitations" ON team_invitations
    FOR UPDATE USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = ( SELECT auth.uid() )
        )
    );

-- Team permissions are public (read-only reference data)
CREATE POLICY "Team permissions are readable by all authenticated users" ON team_permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Team activity log policies
CREATE POLICY "Users can view activity logs for their teams" ON team_activity_log
    FOR SELECT USING (
        team_id IN (
            SELECT id FROM teams WHERE owner_id = ( SELECT auth.uid() )
            UNION
            SELECT team_id FROM team_members WHERE user_id = ( SELECT auth.uid() ) AND status = 'active'
        )
    );

CREATE POLICY "System can insert activity logs" ON team_activity_log
    FOR INSERT WITH CHECK (true);

-- ==============================================
-- TRIGGERS FOR UPDATED_AT
-- ==============================================

-- Teams
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_invitations_updated_at BEFORE UPDATE ON team_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- FUNCTIONS FOR TEAM MANAGEMENT
-- ==============================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_team_permission(
    p_team_id UUID,
    p_user_id UUID,
    p_resource TEXT,
    p_action TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    user_role team_role;
    permission_granted BOOLEAN := false;
BEGIN
    -- Get user's role in the team
    SELECT role INTO user_role
    FROM team_members
    WHERE team_id = p_team_id 
    AND user_id = p_user_id 
    AND status = 'active';
    
    -- If user is not a team member, check if they're the team owner
    IF user_role IS NULL THEN
        SELECT 'owner' INTO user_role
        FROM teams
        WHERE id = p_team_id AND owner_id = p_user_id;
    END IF;
    
    -- If still no role found, return false
    IF user_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check permission
    SELECT allowed INTO permission_granted
    FROM team_permissions
    WHERE role = user_role
    AND resource = p_resource
    AND action = p_action;
    
    RETURN COALESCE(permission_granted, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log team activity
CREATE OR REPLACE FUNCTION log_team_activity(
    p_team_id UUID,
    p_user_id UUID,
    p_action TEXT,
    p_resource TEXT DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO team_activity_log (
        team_id, user_id, action, resource, resource_id, details
    ) VALUES (
        p_team_id, p_user_id, p_action, p_resource, p_resource_id, p_details
    ) RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(
    p_token TEXT,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    invitation RECORD;
    member_id UUID;
    result JSONB;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation
    FROM team_invitations
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid or expired invitation'
        );
    END IF;
    
    -- Check if user email matches invitation
    IF invitation.email != (SELECT email FROM auth.users WHERE id = p_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Email mismatch'
        );
    END IF;
    
    -- Create team member record
    INSERT INTO team_members (
        team_id, user_id, email, role, status, invited_by, accepted_at
    ) VALUES (
        invitation.team_id, p_user_id, invitation.email, 
        invitation.role, 'active', invitation.invited_by, NOW()
    ) RETURNING id INTO member_id;
    
    -- Update invitation status
    UPDATE team_invitations 
    SET status = 'accepted', accepted_at = NOW(), accepted_by = p_user_id
    WHERE id = invitation.id;
    
    -- Log activity
    PERFORM log_team_activity(
        invitation.team_id, p_user_id, 'invitation_accepted',
        'team_member', member_id,
        jsonb_build_object('role', invitation.role)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'team_id', invitation.team_id,
        'member_id', member_id,
        'role', invitation.role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250122000003_faq_management_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- FAQ Management System for Wedding Client Support Automation
-- Purpose: Build comprehensive FAQ system to reduce client support workload by 80%
-- Feature ID: WS-070 - FAQ Management - Client Support Automation
-- Created: 2025-08-22
-- Team: Team D - Round 1

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search optimization

-- ============================================
-- FAQ CORE TABLES
-- ============================================

-- FAQ Categories Table - Hierarchical organization
DROP VIEW IF EXISTS faq_categories CASCADE;
CREATE TABLE IF NOT EXISTS faq_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  parent_id UUID REFERENCES faq_categories(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  icon TEXT, -- For UI display (lucide icon name)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT faq_categories_slug_check CHECK (slug ~ '^[a-z0-9-]+$'),
  UNIQUE(supplier_id, slug),
  INDEX(supplier_id, sort_order),
  INDEX(parent_id, sort_order)
);

-- FAQ Items Table - Core FAQ content with full-text search
DROP VIEW IF EXISTS faq_items CASCADE;
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES faq_categories(id) ON DELETE CASCADE,
  
  -- Content
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  answer_html TEXT, -- Rich text formatted answer
  summary TEXT, -- Brief summary for search results
  
  -- Organization
  sort_order INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}', -- Searchable tags
  
  -- Search optimization
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', 
      question || ' ' || 
      COALESCE(answer, '') || ' ' || 
      COALESCE(summary, '') || ' ' ||
      COALESCE(array_to_string(tags, ' '), '')
    )
  ) STORED,
  
  -- Status and metadata
  is_published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false, -- For highlighting important FAQs
  help_score INTEGER DEFAULT 0, -- Calculated helpfulness score
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX(supplier_id, category_id, sort_order),
  INDEX(supplier_id, is_published, is_featured),
  INDEX(supplier_id, view_count DESC),
  INDEX(help_score DESC)
);

-- FAQ Analytics Table - Usage tracking and optimization
DROP VIEW IF EXISTS faq_analytics CASCADE;
CREATE TABLE IF NOT EXISTS faq_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  faq_item_id UUID REFERENCES faq_items(id) ON DELETE CASCADE,
  
  -- Event tracking
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'helpful', 'not_helpful', 'search_result')),
  
  -- Context
  search_query TEXT, -- Original search query that led to this FAQ
  user_session_id TEXT, -- For tracking user journey
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL, -- If logged in client
  user_agent TEXT,
  ip_address INET,
  referrer_url TEXT,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for analytics queries
  INDEX(supplier_id, event_type, created_at DESC),
  INDEX(faq_item_id, event_type, created_at DESC),
  INDEX(search_query, created_at DESC) WHERE search_query IS NOT NULL
);

-- FAQ Search Queries Table - Track search terms for gap analysis
DROP VIEW IF EXISTS faq_search_queries CASCADE;
CREATE TABLE IF NOT EXISTS faq_search_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Search details
  query_text TEXT NOT NULL,
  normalized_query TEXT NOT NULL, -- Cleaned and normalized for analysis
  result_count INTEGER DEFAULT 0,
  has_results BOOLEAN DEFAULT false,
  
  -- User context
  user_session_id TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Performance tracking
  search_duration_ms INTEGER, -- Search performance tracking
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX(supplier_id, created_at DESC),
  INDEX(supplier_id, has_results, created_at DESC),
  INDEX(normalized_query, supplier_id)
);

-- FAQ Feedback Table - Client feedback on FAQ helpfulness
DROP VIEW IF EXISTS faq_feedback CASCADE;
CREATE TABLE IF NOT EXISTS faq_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  faq_item_id UUID REFERENCES faq_items(id) ON DELETE CASCADE,
  
  -- Feedback details
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT, -- Optional detailed feedback
  suggested_improvement TEXT,
  
  -- User context
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  user_session_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(faq_item_id, client_id, user_session_id), -- Prevent duplicate feedback
  
  -- Indexes
  INDEX(supplier_id, faq_item_id, is_helpful),
  INDEX(faq_item_id, created_at DESC)
);

-- ============================================
-- ADVANCED SEARCH INDEXES
-- ============================================

-- GIN index for full-text search performance
CREATE INDEX idx_faq_items_search_vector ON faq_items USING gin(search_vector);

-- Trigram indexes for fuzzy search
CREATE INDEX idx_faq_items_question_trgm ON faq_items USING gin(question gin_trgm_ops);
CREATE INDEX idx_faq_items_answer_trgm ON faq_items USING gin(answer gin_trgm_ops);
CREATE INDEX idx_faq_items_tags_trgm ON faq_items USING gin(array_to_string(tags, ' ') gin_trgm_ops);

-- Composite indexes for common query patterns
CREATE INDEX idx_faq_items_published_category ON faq_items(supplier_id, category_id, is_published, sort_order) WHERE is_published = true;
CREATE INDEX idx_faq_categories_active_hierarchy ON faq_categories(supplier_id, parent_id, sort_order) WHERE is_active = true;

-- ============================================
-- MATERIALIZED VIEWS FOR DASHBOARDS
-- ============================================

-- FAQ Dashboard Overview
CREATE MATERIALIZED VIEW faq_dashboard_overview AS
WITH faq_stats AS (
  SELECT 
    supplier_id,
    COUNT(*) as total_faqs,
    COUNT(CASE WHEN is_published = true THEN 1 END) as published_faqs,
    COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_faqs,
    AVG(help_score) as avg_help_score,
    SUM(view_count) as total_views
  FROM faq_items
  GROUP BY supplier_id
),
category_stats AS (
  SELECT
    supplier_id,
    COUNT(*) as total_categories,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_categories
  FROM faq_categories
  GROUP BY supplier_id
),
recent_analytics AS (
  SELECT
    supplier_id,
    COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views_30d,
    COUNT(CASE WHEN event_type = 'helpful' THEN 1 END) as helpful_votes_30d,
    COUNT(CASE WHEN event_type = 'not_helpful' THEN 1 END) as not_helpful_votes_30d,
    COUNT(DISTINCT search_query) as unique_searches_30d
  FROM faq_analytics
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY supplier_id
),
search_performance AS (
  SELECT
    supplier_id,
    COUNT(*) as total_searches_30d,
    COUNT(CASE WHEN has_results = false THEN 1 END) as no_result_searches_30d,
    AVG(search_duration_ms) as avg_search_duration_ms
  FROM faq_search_queries
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY supplier_id
)
SELECT
  s.id as supplier_id,
  s.business_name,
  
  -- Content stats
  COALESCE(fs.total_faqs, 0) as total_faqs,
  COALESCE(fs.published_faqs, 0) as published_faqs,
  COALESCE(fs.featured_faqs, 0) as featured_faqs,
  COALESCE(cs.total_categories, 0) as total_categories,
  COALESCE(cs.active_categories, 0) as active_categories,
  
  -- Performance stats
  COALESCE(fs.avg_help_score, 0) as avg_help_score,
  COALESCE(fs.total_views, 0) as total_views,
  COALESCE(ra.views_30d, 0) as views_30d,
  COALESCE(ra.helpful_votes_30d, 0) as helpful_votes_30d,
  COALESCE(ra.not_helpful_votes_30d, 0) as not_helpful_votes_30d,
  
  -- Search stats
  COALESCE(sp.total_searches_30d, 0) as searches_30d,
  COALESCE(sp.no_result_searches_30d, 0) as no_result_searches_30d,
  COALESCE(sp.avg_search_duration_ms, 0) as avg_search_duration_ms,
  COALESCE(ra.unique_searches_30d, 0) as unique_search_terms_30d,
  
  -- Calculated metrics
  CASE 
    WHEN COALESCE(ra.helpful_votes_30d, 0) + COALESCE(ra.not_helpful_votes_30d, 0) = 0 THEN 0
    ELSE (COALESCE(ra.helpful_votes_30d, 0) * 100.0 / (COALESCE(ra.helpful_votes_30d, 0) + COALESCE(ra.not_helpful_votes_30d, 0)))
  END as helpfulness_percentage,
  
  CASE
    WHEN COALESCE(sp.total_searches_30d, 0) = 0 THEN 100
    ELSE ((COALESCE(sp.total_searches_30d, 0) - COALESCE(sp.no_result_searches_30d, 0)) * 100.0 / COALESCE(sp.total_searches_30d, 1))
  END as search_success_rate,
  
  NOW() as last_refreshed
FROM suppliers s
LEFT JOIN faq_stats fs ON s.id = fs.supplier_id
LEFT JOIN category_stats cs ON s.id = cs.supplier_id  
LEFT JOIN recent_analytics ra ON s.id = ra.supplier_id
LEFT JOIN sea