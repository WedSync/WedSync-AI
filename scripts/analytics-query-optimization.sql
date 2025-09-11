-- WS-225 Analytics Query Optimization and Indexing Strategy
-- Team D - Round 1
-- Created: 2025-01-30
-- 
-- Comprehensive database optimization for high-performance analytics
-- Includes advanced indexing, materialized views, and query optimization

-- ============================================================================
-- PART 1: ADVANCED INDEXING STRATEGY
-- ============================================================================

-- Drop existing indexes if they exist (recreate with better strategy)
DROP INDEX CONCURRENTLY IF EXISTS idx_clients_organization_activity;
DROP INDEX CONCURRENTLY IF EXISTS idx_clients_wedding_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_clients_engagement_lookup;

-- Composite index for most common analytics queries (organization + activity patterns)
CREATE INDEX CONCURRENTLY idx_clients_analytics_primary 
ON clients (organization_id, status, last_activity_date DESC, wedding_date ASC) 
WHERE status = 'active';

-- Partial index for upcoming weddings (frequently queried)
CREATE INDEX CONCURRENTLY idx_clients_upcoming_weddings 
ON clients (organization_id, wedding_date, last_activity_date DESC) 
WHERE status = 'active' 
  AND wedding_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '90 days');

-- Partial index for at-risk clients (inactive clients)
CREATE INDEX CONCURRENTLY idx_clients_at_risk 
ON clients (organization_id, last_activity_date, wedding_date) 
WHERE status = 'active' 
  AND last_activity_date < (CURRENT_TIMESTAMP - INTERVAL '30 days');

-- Index for client engagement scoring calculations
CREATE INDEX CONCURRENTLY idx_clients_engagement_scoring 
ON clients (organization_id, last_activity_date, created_at, status) 
WHERE status = 'active';

-- Index for time-based analytics queries
CREATE INDEX CONCURRENTLY idx_clients_time_based_analytics 
ON clients (organization_id, created_at, last_activity_date) 
WHERE status = 'active';

-- ============================================================================
-- PART 2: MATERIALIZED VIEWS FOR PRECOMPUTED ANALYTICS
-- ============================================================================

-- Materialized view for client engagement summary (refreshed every hour)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_client_engagement_summary AS
WITH engagement_calculations AS (
  SELECT 
    c.organization_id,
    c.id as client_id,
    c.client_name,
    c.email,
    c.wedding_date,
    c.last_activity_date,
    c.created_at,
    -- Engagement score calculation
    CASE 
      WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '7 days') THEN 100
      WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '14 days') THEN 80
      WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 60
      WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '60 days') THEN 40
      WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '90 days') THEN 20
      ELSE 10
    END as engagement_score,
    -- Client segment
    CASE 
      WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '7 days') THEN 'champion'
      WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '14 days') THEN 'highly_engaged'
      WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 'normal'
      WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '60 days') THEN 'at_risk'
      ELSE 'ghost'
    END as segment,
    -- Activity status
    CASE 
      WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '1 day') THEN 'very_active'
      WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '7 days') THEN 'active'
      WHEN c.last_activity_date >= (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 'moderate'
      ELSE 'inactive'
    END as activity_status,
    -- Days since last activity
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - c.last_activity_date))::INTEGER as days_since_activity,
    -- Days until wedding
    EXTRACT(DAY FROM (c.wedding_date - CURRENT_DATE))::INTEGER as days_until_wedding,
    -- Risk flags
    CASE WHEN c.last_activity_date < (CURRENT_TIMESTAMP - INTERVAL '30 days') THEN 1 ELSE 0 END as is_at_risk,
    CASE WHEN c.wedding_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 1 ELSE 0 END as wedding_approaching
  FROM clients c
  WHERE c.status = 'active'
)
SELECT 
  *,
  CURRENT_TIMESTAMP as last_refreshed
FROM engagement_calculations;

-- Create unique index on materialized view
CREATE UNIQUE INDEX idx_mv_client_engagement_summary_pk 
ON mv_client_engagement_summary (organization_id, client_id);

-- Additional indexes on materialized view for fast analytics queries
CREATE INDEX idx_mv_client_engagement_by_segment 
ON mv_client_engagement_summary (organization_id, segment, engagement_score DESC);

CREATE INDEX idx_mv_client_engagement_by_activity 
ON mv_client_engagement_summary (organization_id, activity_status, last_activity_date DESC);

CREATE INDEX idx_mv_client_engagement_at_risk 
ON mv_client_engagement_summary (organization_id, is_at_risk, wedding_approaching) 
WHERE is_at_risk = 1 OR wedding_approaching = 1;

-- ============================================================================
-- PART 3: OPTIMIZED ANALYTICS FUNCTIONS (USING MATERIALIZED VIEWS)
-- ============================================================================

-- Optimized client analytics summary using materialized view
CREATE OR REPLACE FUNCTION get_client_analytics_summary_optimized(
  supplier_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_clients BIGINT,
  average_engagement_score NUMERIC,
  total_open_alerts BIGINT,
  at_risk_clients BIGINT,
  ghost_clients BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get organization ID for supplier
  SELECT organization_id INTO org_id
  FROM user_profiles 
  WHERE id = supplier_id;
  
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid supplier ID or organization not found';
  END IF;

  -- Use materialized view for much faster queries
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_clients,
    ROUND(AVG(mv.engagement_score), 1) as average_engagement_score,
    COUNT(*) FILTER (WHERE mv.is_at_risk = 1 OR mv.wedding_approaching = 1)::BIGINT as total_open_alerts,
    COUNT(*) FILTER (WHERE mv.segment = 'at_risk')::BIGINT as at_risk_clients,
    COUNT(*) FILTER (WHERE mv.segment = 'ghost')::BIGINT as ghost_clients
  FROM mv_client_engagement_summary mv
  WHERE mv.organization_id = org_id
    AND mv.created_at <= end_date;
END;
$$;

-- Optimized client segments distribution using materialized view
CREATE OR REPLACE FUNCTION get_client_segments_distribution_optimized(
  supplier_id UUID
)
RETURNS TABLE (
  segment TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM user_profiles 
  WHERE id = supplier_id;
  
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid supplier ID or organization not found';
  END IF;

  RETURN QUERY
  SELECT 
    mv.segment::TEXT,
    COUNT(*)::BIGINT
  FROM mv_client_engagement_summary mv
  WHERE mv.organization_id = org_id
  GROUP BY mv.segment
  ORDER BY COUNT(*) DESC;
END;
$$;

-- ============================================================================
-- PART 4: AUTOMATIC MATERIALIZED VIEW REFRESH
-- ============================================================================

-- Function to refresh analytics materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_materialized_views()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh client engagement summary
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_engagement_summary;
  
  -- Log refresh
  INSERT INTO system_logs (log_type, message, created_at)
  VALUES ('materialized_view_refresh', 'Analytics materialized views refreshed', CURRENT_TIMESTAMP)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Create system_logs table if it doesn't exist (for tracking refreshes)
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_type VARCHAR(50) NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_logs_type_created 
ON system_logs (log_type, created_at DESC);

-- ============================================================================
-- PART 5: QUERY PERFORMANCE MONITORING
-- ============================================================================

-- Table to track slow analytics queries
CREATE TABLE IF NOT EXISTS analytics_query_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL,
  query_type VARCHAR(100) NOT NULL,
  execution_time_ms NUMERIC NOT NULL,
  query_params JSONB DEFAULT '{}',
  cache_hit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_query_performance_supplier_time 
ON analytics_query_performance (supplier_id, created_at DESC);

CREATE INDEX idx_analytics_query_performance_slow_queries 
ON analytics_query_performance (query_type, execution_time_ms DESC) 
WHERE execution_time_ms > 1000; -- Track queries slower than 1 second

-- Function to log query performance
CREATE OR REPLACE FUNCTION log_analytics_query_performance(
  p_supplier_id UUID,
  p_query_type VARCHAR(100),
  p_execution_time_ms NUMERIC,
  p_query_params JSONB DEFAULT '{}',
  p_cache_hit BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO analytics_query_performance (
    supplier_id, query_type, execution_time_ms, query_params, cache_hit
  ) VALUES (
    p_supplier_id, p_query_type, p_execution_time_ms, p_query_params, p_cache_hit
  );
  
  -- Alert if query is very slow (>5 seconds)
  IF p_execution_time_ms > 5000 THEN
    INSERT INTO system_logs (log_type, message, metadata)
    VALUES (
      'slow_query_alert',
      'Very slow analytics query detected',
      jsonb_build_object(
        'supplier_id', p_supplier_id,
        'query_type', p_query_type,
        'execution_time_ms', p_execution_time_ms,
        'query_params', p_query_params
      )
    );
  END IF;
END;
$$;

-- ============================================================================
-- PART 6: DATABASE CONFIGURATION OPTIMIZATIONS
-- ============================================================================

-- Optimize PostgreSQL settings for analytics workload
-- Note: These should be applied to postgresql.conf and require restart

-- Increase work memory for complex analytics queries
-- work_mem = 256MB (for analytics queries)
-- maintenance_work_mem = 1GB (for index maintenance)

-- Increase shared buffers for better cache performance
-- shared_buffers = 25% of RAM

-- Optimize for analytics workload
-- random_page_cost = 1.1 (for SSD storage)
-- effective_cache_size = 75% of RAM

-- Enable parallel query execution
-- max_parallel_workers_per_gather = 4
-- max_parallel_workers = 8

-- ============================================================================
-- PART 7: AUTOMATED QUERY ANALYSIS AND OPTIMIZATION
-- ============================================================================

-- Function to analyze and suggest query optimizations
CREATE OR REPLACE FUNCTION analyze_analytics_query_performance()
RETURNS TABLE (
  query_type VARCHAR(100),
  avg_execution_time_ms NUMERIC,
  total_calls BIGINT,
  slow_query_count BIGINT,
  cache_hit_rate NUMERIC,
  optimization_suggestion TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH query_stats AS (
    SELECT 
      aqp.query_type,
      AVG(aqp.execution_time_ms) as avg_execution_time,
      COUNT(*) as total_calls,
      COUNT(*) FILTER (WHERE aqp.execution_time_ms > 1000) as slow_calls,
      AVG(CASE WHEN aqp.cache_hit THEN 1.0 ELSE 0.0 END) * 100 as cache_hit_rate
    FROM analytics_query_performance aqp
    WHERE aqp.created_at >= (CURRENT_TIMESTAMP - INTERVAL '24 hours')
    GROUP BY aqp.query_type
  )
  SELECT 
    qs.query_type::VARCHAR(100),
    ROUND(qs.avg_execution_time, 2) as avg_execution_time_ms,
    qs.total_calls as total_calls,
    qs.slow_calls as slow_query_count,
    ROUND(qs.cache_hit_rate, 2) as cache_hit_rate,
    CASE 
      WHEN qs.avg_execution_time > 2000 THEN 'Consider adding more specific indexes or using materialized views'
      WHEN qs.cache_hit_rate < 50 THEN 'Improve caching strategy - increase TTL or add more cache layers'
      WHEN qs.slow_calls > (qs.total_calls * 0.1) THEN 'Optimize query logic or add query-specific indexes'
      ELSE 'Performance is acceptable'
    END::TEXT as optimization_suggestion
  FROM query_stats qs
  ORDER BY qs.avg_execution_time DESC;
END;
$$;

-- ============================================================================
-- PART 8: AUTOMATED MAINTENANCE TASKS
-- ============================================================================

-- Function to maintain analytics performance
CREATE OR REPLACE FUNCTION maintain_analytics_performance()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  maintenance_log TEXT := '';
BEGIN
  -- Refresh materialized views
  PERFORM refresh_analytics_materialized_views();
  maintenance_log := maintenance_log || 'Materialized views refreshed. ';
  
  -- Update table statistics for query planner
  ANALYZE clients;
  ANALYZE mv_client_engagement_summary;
  maintenance_log := maintenance_log || 'Table statistics updated. ';
  
  -- Clean old performance logs (keep 30 days)
  DELETE FROM analytics_query_performance 
  WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '30 days');
  
  GET DIAGNOSTICS maintenance_log = ROW_COUNT;
  maintenance_log := maintenance_log || FORMAT(' performance logs cleaned (%s rows). ', maintenance_log);
  
  -- Reindex if fragmentation is high
  -- Note: This should be done during maintenance windows
  
  RETURN maintenance_log;
END;
$$;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION get_client_analytics_summary_optimized(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_segments_distribution_optimized(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_analytics_materialized_views() TO authenticated;
GRANT EXECUTE ON FUNCTION log_analytics_query_performance(UUID, VARCHAR(100), NUMERIC, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_analytics_query_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION maintain_analytics_performance() TO authenticated;

-- Grant access to materialized view
GRANT SELECT ON mv_client_engagement_summary TO authenticated;

-- Add documentation comments
COMMENT ON MATERIALIZED VIEW mv_client_engagement_summary IS 'WS-225: Precomputed client engagement metrics for high-performance analytics';
COMMENT ON FUNCTION get_client_analytics_summary_optimized IS 'WS-225: Optimized analytics summary using materialized views';
COMMENT ON FUNCTION refresh_analytics_materialized_views IS 'WS-225: Refresh all analytics materialized views';
COMMENT ON FUNCTION log_analytics_query_performance IS 'WS-225: Log analytics query performance for monitoring';
COMMENT ON FUNCTION analyze_analytics_query_performance IS 'WS-225: Analyze query performance and suggest optimizations';
COMMENT ON FUNCTION maintain_analytics_performance IS 'WS-225: Automated analytics performance maintenance';

-- Final optimization: Create a scheduled job to refresh materialized views
-- Note: This would typically be done with pg_cron extension or external scheduler
-- 
-- Example with pg_cron (if available):
-- SELECT cron.schedule('refresh-analytics-views', '0 */1 * * *', 'SELECT refresh_analytics_materialized_views();');

-- Performance validation queries
-- Use these to validate the optimization improvements:

-- Query 1: Test client analytics summary performance
-- SELECT * FROM get_client_analytics_summary_optimized(
--   'your-supplier-id'::UUID, 
--   CURRENT_TIMESTAMP - INTERVAL '30 days', 
--   CURRENT_TIMESTAMP
-- );

-- Query 2: Test segments distribution performance  
-- SELECT * FROM get_client_segments_distribution_optimized('your-supplier-id'::UUID);

-- Query 3: Check query performance analytics
-- SELECT * FROM analyze_analytics_query_performance();

-- Query 4: Verify materialized view freshness
-- SELECT COUNT(*), MAX(last_refreshed) FROM mv_client_engagement_summary;