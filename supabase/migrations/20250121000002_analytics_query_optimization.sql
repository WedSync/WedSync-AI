-- Analytics Query Optimization - Team D Round 2
-- Advanced query optimization for Journey Builder analytics reporting
-- High-performance indexes and materialized views for real-time dashboards

-- ============================================================================
-- ADVANCED PERFORMANCE INDEXES
-- ============================================================================

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