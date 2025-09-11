-- =====================================================
-- QUERY PERFORMANCE VALIDATION SYSTEM
-- =====================================================
-- Team D - Round 1: Database Indexes Optimization
-- Performance validation, testing, and continuous monitoring
-- Target: Validate <25ms query performance with comprehensive testing
-- Created: 2025-01-21
-- =====================================================

-- =====================================================
-- PERFORMANCE TEST DEFINITIONS
-- =====================================================

-- Performance test scenarios table
CREATE TABLE IF NOT EXISTS performance_test_scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name VARCHAR(255) NOT NULL UNIQUE,
  test_category VARCHAR(100) NOT NULL, -- 'journey', 'forms', 'analytics', 'system'
  description TEXT,
  target_performance_ms DECIMAL(10,3) DEFAULT 25,
  test_sql TEXT NOT NULL,
  test_parameters JSONB DEFAULT '{}'::jsonb,
  expected_result_pattern TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance test results table
CREATE TABLE IF NOT EXISTS performance_test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_scenario_id UUID REFERENCES performance_test_scenarios(id) ON DELETE CASCADE,
  test_name VARCHAR(255) NOT NULL,
  execution_time_ms DECIMAL(10,3) NOT NULL,
  rows_returned INTEGER,
  query_plan TEXT,
  index_usage TEXT[],
  passed BOOLEAN NOT NULL,
  performance_score INTEGER, -- 0-100 based on target performance
  memory_usage_kb INTEGER,
  cpu_usage_percent DECIMAL(5,2),
  concurrent_users INTEGER DEFAULT 1,
  test_environment VARCHAR(50) DEFAULT 'development',
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  executed_by VARCHAR(100) DEFAULT 'system'
);

-- Performance benchmarks table
CREATE TABLE IF NOT EXISTS performance_benchmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  benchmark_name VARCHAR(255) NOT NULL,
  operation_type VARCHAR(100) NOT NULL, -- 'select', 'insert', 'update', 'delete', 'complex'
  table_name VARCHAR(255),
  baseline_performance_ms DECIMAL(10,3) NOT NULL,
  target_performance_ms DECIMAL(10,3) NOT NULL,
  current_performance_ms DECIMAL(10,3),
  performance_trend VARCHAR(50), -- 'improving', 'stable', 'degrading'
  last_measured_at TIMESTAMPTZ,
  measurement_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PERFORMANCE TEST SCENARIOS DATA
-- =====================================================

-- Insert comprehensive test scenarios
INSERT INTO performance_test_scenarios (test_name, test_category, description, target_performance_ms, test_sql, test_parameters) VALUES

-- Journey Performance Tests
('journey_instances_by_vendor', 'journey', 'Retrieve active journey instances for a vendor', 15, 
 'SELECT ji.*, j.name as journey_name FROM journey_instances ji INNER JOIN journeys j ON ji.journey_id = j.id WHERE ji.vendor_id = $1 AND ji.state = ''active'' ORDER BY ji.started_at DESC LIMIT 20;',
 '{"vendor_id": "uuid_placeholder"}'),

('journey_execution_analytics', 'journey', 'Complex journey analytics query', 25,
 'SELECT j.name, COUNT(ji.id) as executions, AVG(ji.total_duration_ms) as avg_duration FROM journeys j LEFT JOIN journey_instances ji ON j.id = ji.journey_id WHERE j.organization_id = $1 GROUP BY j.id, j.name ORDER BY executions DESC;',
 '{"organization_id": "uuid_placeholder"}'),

('journey_node_performance', 'journey', 'Node execution performance analysis', 20,
 'SELECT jn.name, COUNT(jne.id) as executions, AVG(jne.duration_ms) as avg_duration FROM journey_nodes jn LEFT JOIN journey_node_executions jne ON jn.journey_id = jne.journey_id AND jn.node_id = jne.node_id WHERE jn.journey_id = $1 GROUP BY jn.id, jn.name ORDER BY avg_duration DESC;',
 '{"journey_id": "uuid_placeholder"}'),

('journey_events_processing', 'journey', 'Unprocessed journey events lookup', 10,
 'SELECT * FROM journey_events WHERE processed = false AND occurred_at >= $1 ORDER BY occurred_at LIMIT 100;',
 '{"since_date": "timestamp_placeholder"}'),

-- Forms Performance Tests
('form_submissions_recent', 'forms', 'Recent form submissions with user data', 15,
 'SELECT fs.*, f.name as form_name, up.name as user_name FROM form_submissions fs INNER JOIN forms f ON fs.form_id = f.id LEFT JOIN user_profiles up ON fs.submitted_by = up.id WHERE fs.submitted_at >= $1 ORDER BY fs.submitted_at DESC LIMIT 50;',
 '{"since_date": "timestamp_placeholder"}'),

('form_analytics_dashboard', 'forms', 'Form analytics for dashboard', 20,
 'SELECT f.name, COUNT(fs.id) as submissions, COUNT(DISTINCT fs.submitted_by) as unique_users FROM forms f LEFT JOIN form_submissions fs ON f.id = fs.form_id WHERE f.organization_id = $1 GROUP BY f.id, f.name ORDER BY submissions DESC;',
 '{"organization_id": "uuid_placeholder"}'),

-- PDF Import Performance Tests
('pdf_import_status', 'forms', 'PDF import processing status', 10,
 'SELECT * FROM pdf_imports WHERE user_id = $1 AND upload_status IN (''processing'', ''completed'') ORDER BY created_at DESC LIMIT 20;',
 '{"user_id": "uuid_placeholder"}'),

-- Analytics Performance Tests
('organization_dashboard_metrics', 'analytics', 'Complete organization dashboard data', 30,
 'SELECT * FROM mv_dashboard_metrics WHERE organization_id = $1;',
 '{"organization_id": "uuid_placeholder"}'),

('vendor_performance_analytics', 'analytics', 'Vendor performance metrics', 25,
 'SELECT * FROM mv_vendor_performance WHERE organization_id IN (SELECT id FROM organizations WHERE pricing_tier = ''pro'') ORDER BY total_revenue DESC LIMIT 20;',
 '{}'),

('wedding_season_analytics', 'analytics', 'Wedding season performance data', 20,
 'SELECT * FROM mv_wedding_season_analytics WHERE wedding_month >= $1 ORDER BY wedding_month;',
 '{"start_date": "date_placeholder"}'),

-- System Performance Tests
('user_authentication', 'system', 'User profile lookup with organization', 8,
 'SELECT up.*, o.name as org_name FROM user_profiles up INNER JOIN organizations o ON up.organization_id = o.id WHERE up.id = $1;',
 '{"user_id": "uuid_placeholder"}'),

('organization_users', 'system', 'Organization users with roles', 12,
 'SELECT up.*, r.name as role_name FROM user_profiles up LEFT JOIN user_roles ur ON up.id = ur.user_id LEFT JOIN roles r ON ur.role_id = r.id WHERE up.organization_id = $1 ORDER BY up.created_at;',
 '{"organization_id": "uuid_placeholder"}'),

('system_health_check', 'system', 'System-wide health metrics', 15,
 'SELECT COUNT(*) as total_orgs, COUNT(*) FILTER (WHERE subscription_status = ''active'') as active_orgs, COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL ''30 days'') as new_orgs FROM organizations;',
 '{}');

-- =====================================================
-- PERFORMANCE VALIDATION FUNCTIONS
-- =====================================================

-- Function to execute a single performance test
CREATE OR REPLACE FUNCTION execute_performance_test(
  p_test_id UUID,
  p_concurrent_users INTEGER DEFAULT 1
) RETURNS UUID AS $$
DECLARE
  test_scenario RECORD;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  execution_time DECIMAL;
  query_plan TEXT;
  rows_count INTEGER;
  test_passed BOOLEAN;
  performance_score INTEGER;
  result_id UUID;
  actual_sql TEXT;
  error_msg TEXT;
BEGIN
  -- Get test scenario
  SELECT * INTO test_scenario 
  FROM performance_test_scenarios 
  WHERE id = p_test_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test scenario not found or inactive: %', p_test_id;
  END IF;
  
  -- Prepare SQL with placeholder replacements (simplified)
  actual_sql := test_scenario.test_sql;
  actual_sql := replace(actual_sql, '$1', '''00000000-0000-0000-0000-000000000001''');
  actual_sql := replace(actual_sql, 'timestamp_placeholder', '''2024-01-01 00:00:00''');
  actual_sql := replace(actual_sql, 'date_placeholder', '''2024-01-01''');
  actual_sql := replace(actual_sql, 'uuid_placeholder', '''00000000-0000-0000-0000-000000000001''');
  
  BEGIN
    -- Record start time
    start_time := clock_timestamp();
    
    -- Execute the query and get row count
    EXECUTE 'EXPLAIN (ANALYZE, BUFFERS) ' || actual_sql INTO query_plan;
    EXECUTE 'SELECT COUNT(*) FROM (' || actual_sql || ') as test_query' INTO rows_count;
    
    -- Record end time
    end_time := clock_timestamp();
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    -- Determine if test passed
    test_passed := execution_time <= test_scenario.target_performance_ms;
    
    -- Calculate performance score (0-100)
    performance_score := LEAST(100, GREATEST(0, 
      ROUND(100 - ((execution_time - test_scenario.target_performance_ms) / test_scenario.target_performance_ms * 50))
    ));
    
  EXCEPTION WHEN OTHERS THEN
    end_time := clock_timestamp();
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    test_passed := false;
    performance_score := 0;
    error_msg := SQLERRM;
    rows_count := 0;
    query_plan := 'ERROR: ' || error_msg;
  END;
  
  -- Insert test result
  INSERT INTO performance_test_results (
    test_scenario_id,
    test_name,
    execution_time_ms,
    rows_returned,
    query_plan,
    passed,
    performance_score,
    concurrent_users,
    error_message
  ) VALUES (
    p_test_id,
    test_scenario.test_name,
    execution_time,
    rows_count,
    query_plan,
    test_passed,
    performance_score,
    p_concurrent_users,
    error_msg
  ) RETURNING id INTO result_id;
  
  -- Update benchmark if this is a new record
  UPDATE performance_benchmarks 
  SET 
    current_performance_ms = execution_time,
    last_measured_at = NOW(),
    measurement_count = measurement_count + 1,
    performance_trend = CASE 
      WHEN current_performance_ms IS NULL THEN 'stable'
      WHEN execution_time < current_performance_ms * 0.9 THEN 'improving'
      WHEN execution_time > current_performance_ms * 1.1 THEN 'degrading'
      ELSE 'stable'
    END
  WHERE benchmark_name = test_scenario.test_name;
  
  -- Insert benchmark if it doesn't exist
  INSERT INTO performance_benchmarks (
    benchmark_name,
    operation_type,
    table_name,
    baseline_performance_ms,
    target_performance_ms,
    current_performance_ms
  )
  SELECT 
    test_scenario.test_name,
    test_scenario.test_category,
    split_part(test_scenario.test_name, '_', 1),
    execution_time,
    test_scenario.target_performance_ms,
    execution_time
  WHERE NOT EXISTS (
    SELECT 1 FROM performance_benchmarks 
    WHERE benchmark_name = test_scenario.test_name
  );
  
  RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to run all performance tests
CREATE OR REPLACE FUNCTION run_all_performance_tests(
  p_test_category TEXT DEFAULT NULL,
  p_concurrent_users INTEGER DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
  test_scenario RECORD;
  result_summary JSONB;
  total_tests INTEGER := 0;
  passed_tests INTEGER := 0;
  failed_tests INTEGER := 0;
  avg_performance DECIMAL := 0;
  test_results UUID[];
BEGIN
  -- Run tests for specified category or all
  FOR test_scenario IN 
    SELECT id, test_name, test_category 
    FROM performance_test_scenarios 
    WHERE is_active = true 
      AND (p_test_category IS NULL OR test_category = p_test_category)
    ORDER BY priority DESC, test_name
  LOOP
    BEGIN
      -- Execute the test
      test_results := array_append(
        test_results, 
        execute_performance_test(test_scenario.id, p_concurrent_users)
      );
      total_tests := total_tests + 1;
      
    EXCEPTION WHEN OTHERS THEN
      total_tests := total_tests + 1;
      failed_tests := failed_tests + 1;
      -- Log the error but continue with other tests
      INSERT INTO system_log (event_type, description, details)
      VALUES (
        'performance_test_error',
        'Performance test failed: ' || test_scenario.test_name,
        jsonb_build_object('error', SQLERRM, 'test_id', test_scenario.id)
      );
    END;
  END LOOP;
  
  -- Calculate summary statistics
  SELECT 
    COUNT(*) FILTER (WHERE passed = true),
    COUNT(*) FILTER (WHERE passed = false),
    AVG(execution_time_ms)
  INTO passed_tests, failed_tests, avg_performance
  FROM performance_test_results ptr
  INNER JOIN unnest(test_results) AS tr(id) ON ptr.id = tr.id;
  
  -- Compile results
  result_summary := jsonb_build_object(
    'test_run_id', gen_random_uuid(),
    'completed_at', NOW(),
    'test_category', COALESCE(p_test_category, 'all'),
    'concurrent_users', p_concurrent_users,
    'total_tests', total_tests,
    'passed_tests', passed_tests,
    'failed_tests', failed_tests,
    'success_rate_percent', ROUND((passed_tests::decimal / NULLIF(total_tests, 0)) * 100, 2),
    'average_performance_ms', ROUND(avg_performance, 2),
    'test_result_ids', array_to_json(test_results)
  );
  
  -- Log the test run
  INSERT INTO system_log (event_type, description, details)
  VALUES (
    'performance_test_suite',
    'Performance test suite completed',
    result_summary
  );
  
  RETURN result_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate performance report
CREATE OR REPLACE FUNCTION generate_performance_report(
  p_days_back INTEGER DEFAULT 7
) RETURNS TABLE(
  category TEXT,
  test_name TEXT,
  avg_performance_ms DECIMAL,
  success_rate_percent DECIMAL,
  performance_trend TEXT,
  last_run TIMESTAMPTZ,
  status TEXT,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH test_stats AS (
    SELECT 
      pts.test_category,
      pts.test_name,
      pts.target_performance_ms,
      AVG(ptr.execution_time_ms) as avg_time,
      COUNT(*) as total_runs,
      COUNT(*) FILTER (WHERE ptr.passed = true) as passed_runs,
      MAX(ptr.executed_at) as last_execution,
      pb.performance_trend
    FROM performance_test_scenarios pts
    LEFT JOIN performance_test_results ptr ON pts.id = ptr.test_scenario_id
      AND ptr.executed_at >= NOW() - INTERVAL '1 day' * p_days_back
    LEFT JOIN performance_benchmarks pb ON pts.test_name = pb.benchmark_name
    WHERE pts.is_active = true
    GROUP BY pts.id, pts.test_category, pts.test_name, pts.target_performance_ms, pb.performance_trend
  )
  SELECT 
    ts.test_category::TEXT,
    ts.test_name::TEXT,
    ROUND(ts.avg_time, 2) as avg_performance_ms,
    ROUND((ts.passed_runs::decimal / NULLIF(ts.total_runs, 0)) * 100, 2) as success_rate_percent,
    COALESCE(ts.performance_trend, 'unknown')::TEXT,
    ts.last_execution,
    CASE 
      WHEN ts.total_runs = 0 THEN 'not_tested'
      WHEN ts.avg_time <= ts.target_performance_ms THEN 'passing'
      WHEN ts.avg_time <= ts.target_performance_ms * 1.5 THEN 'warning'
      ELSE 'failing'
    END::TEXT as status,
    CASE 
      WHEN ts.total_runs = 0 THEN 'Run initial performance test'
      WHEN ts.avg_time > ts.target_performance_ms * 2 THEN 'Critical performance issue - immediate optimization required'
      WHEN ts.avg_time > ts.target_performance_ms THEN 'Performance below target - review and optimize'
      WHEN ts.performance_trend = 'degrading' THEN 'Performance degrading - monitor closely'
      ELSE 'Performance within acceptable limits'
    END::TEXT as recommendation
  FROM test_stats ts
  ORDER BY 
    CASE ts.test_category 
      WHEN 'system' THEN 1 
      WHEN 'journey' THEN 2 
      WHEN 'forms' THEN 3 
      ELSE 4 
    END,
    ts.avg_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate index effectiveness
CREATE OR REPLACE FUNCTION validate_index_effectiveness() RETURNS TABLE(
  table_name TEXT,
  index_name TEXT,
  queries_using_index BIGINT,
  avg_query_time_ms DECIMAL,
  effectiveness_score INTEGER,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH index_query_stats AS (
    SELECT 
      ipl.table_name,
      unnest(ipl.index_used) as index_name,
      COUNT(*) as query_count,
      AVG(ipl.execution_time_ms) as avg_time,
      AVG(ipl.index_efficiency) as avg_efficiency
    FROM index_performance_log ipl
    WHERE ipl.created_at >= NOW() - INTERVAL '24 hours'
      AND ipl.index_used IS NOT NULL
    GROUP BY ipl.table_name, unnest(ipl.index_used)
  )
  SELECT 
    iqs.table_name::TEXT,
    iqs.index_name::TEXT,
    iqs.query_count,
    ROUND(iqs.avg_time, 2),
    LEAST(100, GREATEST(0, 
      ROUND(iqs.avg_efficiency * 0.6 + (100 - iqs.avg_time) * 0.4)
    )) as effectiveness_score,
    CASE 
      WHEN iqs.avg_time <= 25 AND iqs.avg_efficiency >= 80 THEN 'Index highly effective'
      WHEN iqs.avg_time <= 50 THEN 'Index moderately effective'
      WHEN iqs.query_count < 10 THEN 'Low query volume - monitor usage'
      ELSE 'Index needs optimization or replacement'
    END::TEXT
  FROM index_query_stats iqs
  ORDER BY iqs.query_count DESC, iqs.avg_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PERFORMANCE MONITORING VIEWS
-- =====================================================

-- Real-time performance dashboard
CREATE OR REPLACE VIEW v_performance_monitoring_dashboard AS
WITH current_performance AS (
  SELECT 
    COUNT(*) as total_tests_today,
    COUNT(*) FILTER (WHERE passed = true) as passed_tests_today,
    AVG(execution_time_ms) as avg_performance_today,
    MAX(executed_at) as last_test_time
  FROM performance_test_results 
  WHERE executed_at >= CURRENT_DATE
),
benchmark_status AS (
  SELECT 
    COUNT(*) as total_benchmarks,
    COUNT(*) FILTER (WHERE performance_trend = 'improving') as improving_benchmarks,
    COUNT(*) FILTER (WHERE performance_trend = 'degrading') as degrading_benchmarks,
    AVG(current_performance_ms) as avg_current_performance
  FROM performance_benchmarks
),
critical_issues AS (
  SELECT 
    COUNT(*) as critical_slow_queries
  FROM performance_test_results ptr
  INNER JOIN performance_test_scenarios pts ON ptr.test_scenario_id = pts.id
  WHERE ptr.executed_at >= NOW() - INTERVAL '1 hour'
    AND ptr.execution_time_ms > pts.target_performance_ms * 2
)
SELECT 
  cp.total_tests_today,
  cp.passed_tests_today,
  ROUND(cp.avg_performance_today, 2) as avg_performance_ms_today,
  cp.last_test_time,
  bs.total_benchmarks,
  bs.improving_benchmarks,
  bs.degrading_benchmarks,
  ROUND(bs.avg_current_performance, 2) as avg_benchmark_performance_ms,
  ci.critical_slow_queries,
  -- Overall health score (0-100)
  LEAST(100, GREATEST(0,
    100 - ci.critical_slow_queries * 10 -- Deduct 10 points per critical issue
    - bs.degrading_benchmarks * 5     -- Deduct 5 points per degrading benchmark
    + bs.improving_benchmarks * 2     -- Add 2 points per improving benchmark
  )) as system_performance_health_score,
  NOW() as dashboard_updated_at
FROM current_performance cp
CROSS JOIN benchmark_status bs
CROSS JOIN critical_issues ci;

-- =====================================================
-- INDEXES FOR PERFORMANCE TABLES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_performance_test_results_scenario ON performance_test_results(test_scenario_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_performance_test_results_performance ON performance_test_results(execution_time_ms, passed);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_name ON performance_benchmarks(benchmark_name, last_measured_at);

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant permissions for performance functions
GRANT EXECUTE ON FUNCTION execute_performance_test(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION run_all_performance_tests(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_performance_report(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_index_effectiveness() TO authenticated;

-- Grant access to performance tables and views
GRANT SELECT ON performance_test_scenarios TO authenticated;
GRANT SELECT ON performance_test_results TO authenticated;
GRANT SELECT ON performance_benchmarks TO authenticated;
GRANT SELECT ON v_performance_monitoring_dashboard TO authenticated;

-- =====================================================
-- INITIAL SETUP
-- =====================================================

-- Run initial performance test suite
SELECT run_all_performance_tests();

-- =====================================================
-- MIGRATION COMPLETION
-- =====================================================

-- Log migration completion
INSERT INTO migration_log (version, name, applied_at, description)
VALUES (
  '018',
  'Query Performance Validation',
  NOW(),
  'Comprehensive query performance validation and testing system with benchmarking'
);

-- Final notification
DO $$
DECLARE
  test_summary JSONB;
BEGIN
  -- Get initial test results
  SELECT run_all_performance_tests() INTO test_summary;
  
  RAISE NOTICE '=== QUERY PERFORMANCE VALIDATION SYSTEM DEPLOYED ===';
  RAISE NOTICE 'Performance test scenarios: % active tests configured', (SELECT COUNT(*) FROM performance_test_scenarios WHERE is_active = true);
  RAISE NOTICE 'Initial test run completed: %', test_summary->>'total_tests';
  RAISE NOTICE 'Success rate: %', test_summary->>'success_rate_percent';
  RAISE NOTICE 'Average performance: % ms', test_summary->>'average_performance_ms';
  RAISE NOTICE 'Key functions: run_all_performance_tests(), generate_performance_report()';
  RAISE NOTICE 'Monitoring dashboard: v_performance_monitoring_dashboard';
  RAISE NOTICE 'Performance validation system is now active and monitoring';
END $$;