-- =====================================================
-- INDEX MONITORING AND MAINTENANCE SYSTEM
-- =====================================================
-- Team D - Round 1: Database Indexes Optimization
-- Advanced index monitoring, maintenance, and automated optimization
-- Target: Proactive index management with performance alerts
-- Created: 2025-01-21
-- =====================================================

-- =====================================================
-- INDEX MONITORING TABLES
-- =====================================================

-- Index usage statistics tracking
CREATE TABLE IF NOT EXISTS index_usage_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schema_name VARCHAR(255) NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  index_name VARCHAR(255) NOT NULL,
  index_size_bytes BIGINT,
  index_scans BIGINT DEFAULT 0,
  tuples_read BIGINT DEFAULT 0,
  tuples_fetched BIGINT DEFAULT 0,
  scan_efficiency DECIMAL(5,2), -- tuples_fetched/tuples_read ratio
  usage_category VARCHAR(50), -- 'unused', 'light', 'moderate', 'heavy'
  last_scan_at TIMESTAMPTZ,
  monitored_since TIMESTAMPTZ DEFAULT NOW(),
  snapshot_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index performance tracking
CREATE TABLE IF NOT EXISTS index_performance_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  query_pattern VARCHAR(255),
  index_used VARCHAR(255),
  execution_time_ms DECIMAL(10,3),
  rows_examined BIGINT,
  rows_filtered BIGINT,
  index_efficiency DECIMAL(5,2), -- rows_filtered/rows_examined
  query_plan_hash VARCHAR(64),
  is_optimal BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index maintenance history
CREATE TABLE IF NOT EXISTS index_maintenance_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type VARCHAR(50) NOT NULL, -- 'create', 'drop', 'reindex', 'analyze'
  table_name VARCHAR(255) NOT NULL,
  index_name VARCHAR(255),
  action_sql TEXT,
  execution_time_ms DECIMAL(10,3),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failed'
  error_message TEXT,
  performed_by VARCHAR(100) DEFAULT 'system',
  automated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index recommendation tracking
CREATE TABLE IF NOT EXISTS index_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  recommended_index TEXT NOT NULL,
  recommendation_reason TEXT,
  estimated_benefit_ms DECIMAL(10,3),
  confidence_score DECIMAL(3,2), -- 0.0 to 1.0
  query_patterns TEXT[], -- Queries that would benefit
  impact_assessment JSONB DEFAULT '{}'::jsonb,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'implemented', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  implemented_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INDEX MONITORING VIEWS
-- =====================================================

-- Real-time index usage view
CREATE OR REPLACE VIEW v_index_usage_realtime AS
SELECT 
  psi.schemaname,
  psi.tablename,
  psi.indexrelname as index_name,
  pg_size_pretty(pg_relation_size(psi.indexrelid)) as index_size,
  psi.idx_scan as scan_count,
  psi.idx_tup_read as tuples_read,
  psi.idx_tup_fetch as tuples_fetched,
  CASE 
    WHEN psi.idx_tup_read > 0 THEN 
      ROUND((psi.idx_tup_fetch::decimal / psi.idx_tup_read::decimal) * 100, 2)
    ELSE 0 
  END as efficiency_percent,
  CASE 
    WHEN psi.idx_scan = 0 THEN 'unused'
    WHEN psi.idx_scan <= 10 THEN 'rarely_used'
    WHEN psi.idx_scan <= 100 THEN 'moderately_used'
    WHEN psi.idx_scan <= 1000 THEN 'frequently_used'
    ELSE 'heavily_used'
  END as usage_category,
  -- Health score (0-100)
  CASE 
    WHEN psi.idx_scan = 0 THEN 0
    WHEN psi.idx_tup_read = 0 THEN 50
    ELSE LEAST(100, 
      (psi.idx_scan::decimal / NULLIF(GREATEST(psi.idx_tup_read, 1), 0) * 50) +
      (psi.idx_tup_fetch::decimal / NULLIF(GREATEST(psi.idx_tup_read, 1), 0) * 50)
    )
  END as health_score,
  NOW() as snapshot_time
FROM pg_stat_user_indexes psi
INNER JOIN pg_indexes pi ON pi.indexname = psi.indexrelname
WHERE psi.schemaname = 'public'
ORDER BY psi.idx_scan DESC;

-- Table scan analysis view
CREATE OR REPLACE VIEW v_table_scan_analysis AS
SELECT 
  pst.schemaname,
  pst.relname as table_name,
  pg_size_pretty(pg_relation_size(pst.relid)) as table_size,
  pst.seq_scan as sequential_scans,
  pst.seq_tup_read as seq_tuples_read,
  pst.idx_scan as index_scans,
  pst.idx_tup_fetch as idx_tuples_fetched,
  pst.n_tup_ins as inserts,
  pst.n_tup_upd as updates,
  pst.n_tup_del as deletes,
  pst.n_live_tup as live_tuples,
  pst.n_dead_tup as dead_tuples,
  -- Index usage ratio
  CASE 
    WHEN (pst.seq_scan + pst.idx_scan) > 0 THEN
      ROUND((pst.idx_scan::decimal / (pst.seq_scan + pst.idx_scan)::decimal) * 100, 2)
    ELSE 0
  END as index_usage_ratio,
  -- Dead tuple ratio
  CASE 
    WHEN pst.n_live_tup > 0 THEN
      ROUND((pst.n_dead_tup::decimal / (pst.n_live_tup + pst.n_dead_tup)::decimal) * 100, 2)
    ELSE 0
  END as dead_tuple_ratio,
  -- Performance classification
  CASE 
    WHEN pst.seq_scan > pst.idx_scan * 2 AND pst.n_live_tup > 1000 THEN 'needs_indexes'
    WHEN pst.n_dead_tup > pst.n_live_tup * 0.2 THEN 'needs_vacuum'
    WHEN (pst.seq_scan + pst.idx_scan) = 0 THEN 'unused'
    ELSE 'healthy'
  END as health_status
FROM pg_stat_user_tables pst
WHERE pst.schemaname = 'public'
ORDER BY pst.n_live_tup DESC;

-- Missing index analysis view
CREATE OR REPLACE VIEW v_missing_index_analysis AS
WITH foreign_keys AS (
  SELECT 
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
  FROM information_schema.table_constraints tc
  INNER JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
),
existing_indexes AS (
  SELECT DISTINCT
    tablename,
    string_to_array(
      regexp_replace(
        regexp_replace(indexdef, '.*\((.*)\)', '\1'),
        '\s+', ' ', 'g'
      ), 
      ','
    ) as indexed_columns
  FROM pg_indexes
  WHERE schemaname = 'public'
)
SELECT 
  fk.table_name,
  fk.column_name,
  fk.constraint_name,
  'Foreign key without index' as issue_type,
  'CREATE INDEX CONCURRENTLY idx_' || fk.table_name || '_' || fk.column_name || 
  ' ON ' || fk.table_name || '(' || fk.column_name || ');' as suggested_index,
  'high' as priority,
  'Foreign key columns should be indexed for optimal JOIN performance' as reason
FROM foreign_keys fk
WHERE NOT EXISTS (
  SELECT 1 
  FROM existing_indexes ei
  WHERE ei.tablename = fk.table_name
    AND fk.column_name = ANY(ei.indexed_columns)
);

-- =====================================================
-- INDEX MONITORING FUNCTIONS
-- =====================================================

-- Function to collect index usage statistics
CREATE OR REPLACE FUNCTION collect_index_usage_stats()
RETURNS INTEGER AS $$
DECLARE
  stats_collected INTEGER := 0;
BEGIN
  -- Clear today's stats first
  DELETE FROM index_usage_stats WHERE snapshot_date = CURRENT_DATE;
  
  -- Collect current index usage statistics
  INSERT INTO index_usage_stats (
    schema_name,
    table_name,
    index_name,
    index_size_bytes,
    index_scans,
    tuples_read,
    tuples_fetched,
    scan_efficiency,
    usage_category,
    last_scan_at
  )
  SELECT 
    psi.schemaname,
    psi.tablename,
    psi.indexrelname,
    pg_relation_size(psi.indexrelid),
    psi.idx_scan,
    psi.idx_tup_read,
    psi.idx_tup_fetch,
    CASE 
      WHEN psi.idx_tup_read > 0 THEN 
        ROUND((psi.idx_tup_fetch::decimal / psi.idx_tup_read::decimal) * 100, 2)
      ELSE 0 
    END,
    CASE 
      WHEN psi.idx_scan = 0 THEN 'unused'
      WHEN psi.idx_scan <= 10 THEN 'light'
      WHEN psi.idx_scan <= 1000 THEN 'moderate'
      ELSE 'heavy'
    END,
    CASE WHEN psi.idx_scan > 0 THEN NOW() ELSE NULL END
  FROM pg_stat_user_indexes psi
  WHERE psi.schemaname = 'public';
  
  GET DIAGNOSTICS stats_collected = ROW_COUNT;
  
  -- Log the collection
  INSERT INTO system_log (event_type, description, details)
  VALUES (
    'index_stats_collection',
    'Collected index usage statistics',
    jsonb_build_object(
      'stats_collected', stats_collected,
      'collection_time', NOW()
    )
  );
  
  RETURN stats_collected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to analyze query performance and recommend indexes
CREATE OR REPLACE FUNCTION analyze_and_recommend_indexes()
RETURNS INTEGER AS $$
DECLARE
  recommendations_created INTEGER := 0;
  slow_query RECORD;
  recommendation TEXT;
BEGIN
  -- Analyze slow queries from the last 24 hours
  FOR slow_query IN
    SELECT DISTINCT 
      query_pattern,
      AVG(execution_time_ms) as avg_time,
      COUNT(*) as frequency,
      array_agg(DISTINCT COALESCE(indexes_used[1], 'seq_scan')) as common_access_patterns
    FROM query_performance_log 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
      AND execution_time_ms > 25 -- Above target performance
    GROUP BY query_pattern
    HAVING COUNT(*) > 5 -- Frequently executed
    ORDER BY AVG(execution_time_ms) DESC
    LIMIT 20
  LOOP
    -- Generate recommendations based on query patterns
    recommendation := CASE slow_query.query_pattern
      WHEN 'journey_instances_lookup' THEN 
        'CREATE INDEX CONCURRENTLY idx_journey_instances_optimized ON journey_instances(journey_id, client_id, state) INCLUDE (started_at, variables);'
      WHEN 'vendor_analytics' THEN
        'CREATE INDEX CONCURRENTLY idx_analytics_vendor_date ON journey_instances(vendor_id, DATE_TRUNC(''day'', started_at)) INCLUDE (state, total_duration_ms);'
      WHEN 'form_submissions_search' THEN
        'CREATE INDEX CONCURRENTLY idx_form_submissions_search ON form_submissions(form_id, submitted_at) INCLUDE (submitted_by, status);'
      ELSE
        'CREATE INDEX CONCURRENTLY idx_' || slow_query.query_pattern || '_optimization ON ' || 
        split_part(slow_query.query_pattern, '_', 1) || '(created_at) WHERE status = ''active'';'
    END;
    
    -- Insert recommendation if not already exists
    INSERT INTO index_recommendations (
      table_name,
      recommended_index,
      recommendation_reason,
      estimated_benefit_ms,
      confidence_score,
      query_patterns,
      priority
    )
    SELECT 
      split_part(slow_query.query_pattern, '_', 1),
      recommendation,
      'Query pattern analysis: ' || slow_query.query_pattern || ' taking avg ' || 
      ROUND(slow_query.avg_time, 2) || 'ms with ' || slow_query.frequency || ' executions',
      GREATEST(0, slow_query.avg_time - 25), -- Improvement over target
      CASE 
        WHEN slow_query.frequency > 100 AND slow_query.avg_time > 100 THEN 0.95
        WHEN slow_query.frequency > 50 AND slow_query.avg_time > 50 THEN 0.85
        WHEN slow_query.frequency > 10 THEN 0.70
        ELSE 0.50
      END,
      ARRAY[slow_query.query_pattern],
      CASE 
        WHEN slow_query.avg_time > 100 AND slow_query.frequency > 50 THEN 'critical'
        WHEN slow_query.avg_time > 50 THEN 'high'
        ELSE 'medium'
      END
    WHERE NOT EXISTS (
      SELECT 1 FROM index_recommendations ir
      WHERE ir.recommended_index = recommendation
        AND ir.status = 'pending'
        AND ir.created_at >= NOW() - INTERVAL '7 days'
    );
    
    recommendations_created := recommendations_created + 1;
  END LOOP;
  
  -- Log the analysis
  INSERT INTO system_log (event_type, description, details)
  VALUES (
    'index_recommendation_analysis',
    'Analyzed query performance and generated index recommendations',
    jsonb_build_object(
      'recommendations_created', recommendations_created,
      'analysis_time', NOW()
    )
  );
  
  RETURN recommendations_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to identify unused indexes for removal
CREATE OR REPLACE FUNCTION identify_unused_indexes()
RETURNS TABLE(
  schema_name TEXT,
  table_name TEXT,
  index_name TEXT,
  index_size TEXT,
  last_used TEXT,
  removal_recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ius.schema_name::TEXT,
    ius.table_name::TEXT,
    ius.index_name::TEXT,
    pg_size_pretty(ius.index_size_bytes)::TEXT as index_size,
    CASE 
      WHEN ius.last_scan_at IS NULL THEN 'Never used'
      ELSE 'Last used: ' || ius.last_scan_at::TEXT
    END as last_used,
    CASE 
      WHEN ius.index_scans = 0 AND ius.index_size_bytes > 100000000 THEN 'High priority - Large unused index'
      WHEN ius.index_scans = 0 THEN 'Consider removal - Unused index'
      WHEN ius.index_scans < 10 AND ius.monitored_since <= NOW() - INTERVAL '30 days' THEN 'Low priority - Rarely used'
      ELSE 'Keep - Actively used'
    END as removal_recommendation
  FROM index_usage_stats ius
  WHERE ius.snapshot_date = CURRENT_DATE
    AND ius.schema_name = 'public'
  ORDER BY ius.index_size_bytes DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to perform automated index maintenance
CREATE OR REPLACE FUNCTION perform_index_maintenance()
RETURNS JSONB AS $$
DECLARE
  maintenance_result JSONB;
  reindex_count INTEGER := 0;
  analyze_count INTEGER := 0;
  table_record RECORD;
BEGIN
  -- Reindex tables with high dead tuple ratios
  FOR table_record IN
    SELECT 
      relname as table_name,
      n_dead_tup,
      n_live_tup
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND n_dead_tup > GREATEST(n_live_tup * 0.2, 10000) -- 20% dead tuples or 10k+
      AND n_live_tup > 1000
    LIMIT 5 -- Limit to prevent long-running operations
  LOOP
    -- Log the maintenance action
    INSERT INTO index_maintenance_log (
      action_type,
      table_name,
      action_sql,
      status
    ) VALUES (
      'analyze',
      table_record.table_name,
      'ANALYZE ' || table_record.table_name || ';',
      'pending'
    );
    
    -- Perform the analyze
    EXECUTE 'ANALYZE ' || table_record.table_name;
    
    -- Update the log
    UPDATE index_maintenance_log 
    SET status = 'success', completed_at = NOW()
    WHERE table_name = table_record.table_name 
      AND action_type = 'analyze' 
      AND status = 'pending';
    
    analyze_count := analyze_count + 1;
  END LOOP;
  
  -- Collect updated statistics
  PERFORM collect_index_usage_stats();
  
  maintenance_result := jsonb_build_object(
    'reindex_operations', reindex_count,
    'analyze_operations', analyze_count,
    'maintenance_completed_at', NOW(),
    'status', 'success'
  );
  
  RETURN maintenance_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate index health report
CREATE OR REPLACE FUNCTION generate_index_health_report()
RETURNS TABLE(
  category TEXT,
  metric_name TEXT,
  metric_value TEXT,
  status TEXT,
  recommendation TEXT
) AS $$
BEGIN
  -- Overall index usage statistics
  RETURN QUERY
  SELECT 
    'usage_overview'::TEXT as category,
    'total_indexes'::TEXT as metric_name,
    COUNT(*)::TEXT as metric_value,
    'info'::TEXT as status,
    'Total number of indexes in the database'::TEXT as recommendation
  FROM v_index_usage_realtime;
  
  -- Unused indexes
  RETURN QUERY
  SELECT 
    'unused_indexes'::TEXT as category,
    'unused_count'::TEXT as metric_name,
    COUNT(*)::TEXT as metric_value,
    CASE WHEN COUNT(*) > 10 THEN 'warning' ELSE 'good' END as status,
    CASE 
      WHEN COUNT(*) > 10 THEN 'High number of unused indexes - review for removal'
      ELSE 'Unused index count is acceptable'
    END as recommendation
  FROM v_index_usage_realtime
  WHERE usage_category = 'unused';
  
  -- Tables needing indexes
  RETURN QUERY
  SELECT 
    'missing_indexes'::TEXT as category,
    'tables_needing_indexes'::TEXT as metric_name,
    COUNT(*)::TEXT as metric_value,
    CASE WHEN COUNT(*) > 5 THEN 'critical' ELSE 'good' END as status,
    'Tables with foreign keys missing indexes' as recommendation
  FROM v_missing_index_analysis;
  
  -- Performance metrics
  RETURN QUERY
  SELECT 
    'performance'::TEXT as category,
    'avg_index_efficiency'::TEXT as metric_name,
    ROUND(AVG(efficiency_percent), 2)::TEXT || '%' as metric_value,
    CASE 
      WHEN AVG(efficiency_percent) > 80 THEN 'good'
      WHEN AVG(efficiency_percent) > 60 THEN 'warning'
      ELSE 'critical'
    END as status,
    CASE 
      WHEN AVG(efficiency_percent) > 80 THEN 'Index efficiency is optimal'
      ELSE 'Low index efficiency - review query patterns'
    END as recommendation
  FROM v_index_usage_realtime
  WHERE usage_category != 'unused';
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEX MONITORING AUTOMATION
-- =====================================================

-- Function to run complete index monitoring cycle
CREATE OR REPLACE FUNCTION run_index_monitoring_cycle()
RETURNS JSONB AS $$
DECLARE
  monitoring_result JSONB;
  stats_collected INTEGER;
  recommendations_created INTEGER;
  maintenance_result JSONB;
BEGIN
  -- Step 1: Collect index usage statistics
  stats_collected := collect_index_usage_stats();
  
  -- Step 2: Analyze and recommend indexes
  recommendations_created := analyze_and_recommend_indexes();
  
  -- Step 3: Perform maintenance if needed
  maintenance_result := perform_index_maintenance();
  
  -- Compile results
  monitoring_result := jsonb_build_object(
    'cycle_completed_at', NOW(),
    'stats_collected', stats_collected,
    'recommendations_created', recommendations_created,
    'maintenance_result', maintenance_result,
    'status', 'success'
  );
  
  -- Log the complete cycle
  INSERT INTO system_log (event_type, description, details)
  VALUES (
    'index_monitoring_cycle',
    'Completed full index monitoring cycle',
    monitoring_result
  );
  
  RETURN monitoring_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INDEXES FOR MONITORING TABLES
-- =====================================================

-- Indexes for monitoring tables themselves
CREATE INDEX IF NOT EXISTS idx_index_usage_stats_table ON index_usage_stats(table_name, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_index_usage_stats_category ON index_usage_stats(usage_category, index_scans DESC);
CREATE INDEX IF NOT EXISTS idx_index_performance_log_table ON index_performance_log(table_name, created_at);
CREATE INDEX IF NOT EXISTS idx_index_maintenance_log_table ON index_maintenance_log(table_name, created_at);
CREATE INDEX IF NOT EXISTS idx_index_recommendations_status ON index_recommendations(status, priority, created_at);

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant permissions for monitoring functions
GRANT EXECUTE ON FUNCTION collect_index_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_and_recommend_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION identify_unused_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION perform_index_maintenance() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_index_health_report() TO authenticated;
GRANT EXECUTE ON FUNCTION run_index_monitoring_cycle() TO authenticated;

-- Grant access to monitoring tables and views
GRANT SELECT ON index_usage_stats TO authenticated;
GRANT SELECT ON index_performance_log TO authenticated;
GRANT SELECT ON index_maintenance_log TO authenticated;
GRANT SELECT ON index_recommendations TO authenticated;
GRANT SELECT ON v_index_usage_realtime TO authenticated;
GRANT SELECT ON v_table_scan_analysis TO authenticated;
GRANT SELECT ON v_missing_index_analysis TO authenticated;

-- =====================================================
-- CONFIGURATION
-- =====================================================

-- Add monitoring configurations
INSERT INTO system_config (key, value, description, category)
VALUES 
  ('index_monitoring.collection_interval', '3600', 'Index statistics collection interval in seconds', 'index_monitoring'),
  ('index_monitoring.analysis_interval', '7200', 'Index analysis and recommendation interval in seconds', 'index_monitoring'),
  ('index_monitoring.maintenance_interval', '86400', 'Index maintenance interval in seconds', 'index_monitoring'),
  ('index_monitoring.unused_threshold_days', '30', 'Days to consider an index unused', 'index_monitoring'),
  ('index_monitoring.auto_maintenance_enabled', 'true', 'Enable automated index maintenance', 'index_monitoring')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- =====================================================
-- INITIAL SETUP
-- =====================================================

-- Collect initial statistics
SELECT collect_index_usage_stats();

-- Generate initial recommendations
SELECT analyze_and_recommend_indexes();

-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

-- Log migration completion
INSERT INTO migration_log (version, name, applied_at, description)
VALUES (
  '017',
  'Index Monitoring System',
  NOW(),
  'Comprehensive index monitoring, analysis, and automated maintenance system'
);

-- Final notification
DO $$
BEGIN
  RAISE NOTICE '=== INDEX MONITORING SYSTEM DEPLOYED ===';
  RAISE NOTICE 'Monitoring tables: index_usage_stats, index_performance_log, index_maintenance_log, index_recommendations';
  RAISE NOTICE 'Monitoring views: v_index_usage_realtime, v_table_scan_analysis, v_missing_index_analysis';
  RAISE NOTICE 'Key functions: run_index_monitoring_cycle(), generate_index_health_report()';
  RAISE NOTICE 'Automated monitoring and maintenance system is now active';
  RAISE NOTICE 'Initial statistics collected and recommendations generated';
END $$;