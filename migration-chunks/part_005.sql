ity', ac.communication_activity,
      'meeting_activity', ac.meeting_activity,
      'recency_factor', v_recency_factor,
      'days_since_activity', v_days_since_activity
    )
  INTO v_score, v_factors
  FROM activity_counts ac;
  
  -- Apply recency decay
  v_score := ROUND(v_score * v_recency_factor);
  
  -- Cap at 100
  v_score := LEAST(v_score, 100);
  
  -- Determine segment
  IF v_score >= 80 THEN
    v_segment := 'champion';
  ELSIF v_score >= 60 THEN
    v_segment := 'highly_engaged';
  ELSIF v_score >= 30 THEN
    v_segment := 'normal';
  ELSIF v_score >= 10 THEN
    v_segment := 'at_risk';
  ELSE
    v_segment := 'ghost';
  END IF;
  
  -- Update engagement scores table
  INSERT INTO client_engagement_scores (
    client_id, supplier_id, score, segment, factors, last_activity
  ) VALUES (
    p_client_id, p_supplier_id, v_score, v_segment, v_factors, v_last_activity
  )
  ON CONFLICT (client_id, supplier_id) 
  DO UPDATE SET
    score = EXCLUDED.score,
    segment = EXCLUDED.segment,
    factors = EXCLUDED.factors,
    last_activity = EXCLUDED.last_activity,
    calculated_at = NOW();
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to detect and create at-risk alerts
CREATE OR REPLACE FUNCTION detect_at_risk_clients()
RETURNS INTEGER AS $$
DECLARE
  v_alert_count INTEGER := 0;
  v_client_record RECORD;
BEGIN
  -- Find clients who haven't engaged in 14+ days
  FOR v_client_record IN
    SELECT DISTINCT
      c.id as client_id,
      c.supplier_id,
      c.name,
      c.wedding_date,
      ces.last_activity,
      ces.score,
      ces.segment,
      EXTRACT(days FROM NOW() - ces.last_activity) as days_since_activity
    FROM clients c
    JOIN client_engagement_scores ces ON c.id = ces.client_id
    WHERE ces.last_activity < NOW() - INTERVAL '14 days'
      AND c.status = 'active'
      AND c.wedding_date > NOW() -- Only active weddings
      AND NOT EXISTS (
        SELECT 1 FROM at_risk_alerts ara
        WHERE ara.client_id = c.id
          AND ara.alert_type = 'going_silent'
          AND ara.resolved_at IS NULL
      )
  LOOP
    -- Create alert based on severity
    INSERT INTO at_risk_alerts (
      client_id, supplier_id, alert_type, severity, message, recommended_actions
    ) VALUES (
      v_client_record.client_id,
      v_client_record.supplier_id,
      'going_silent',
      CASE 
        WHEN v_client_record.days_since_activity > 21 THEN 'critical'
        WHEN v_client_record.days_since_activity > 14 THEN 'high'
        ELSE 'medium'
      END,
      FORMAT('%s hasn''t engaged in %s days (%s before wedding)',
        v_client_record.name,
        v_client_record.days_since_activity,
        v_client_record.wedding_date - CURRENT_DATE
      ),
      CASE 
        WHEN v_client_record.days_since_activity > 21 THEN 
          '["Call immediately", "Send personal email", "Schedule meeting"]'
        WHEN v_client_record.days_since_activity > 14 THEN
          '["Send check-in email", "Offer help", "Schedule call"]'
        ELSE
          '["Send friendly reminder", "Share useful content"]'
      END::JSONB
    );
    
    v_alert_count := v_alert_count + 1;
  END LOOP;
  
  RETURN v_alert_count;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh analytics dashboard
CREATE OR REPLACE FUNCTION refresh_client_analytics()
RETURNS void AS $$
BEGIN
  -- Refresh materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY client_analytics_dashboard;
  
  -- Update all engagement scores
  INSERT INTO client_engagement_scores (client_id, supplier_id, score, segment, factors, last_activity)
  SELECT 
    c.id,
    c.supplier_id,
    calculate_engagement_score(c.id, c.supplier_id),
    CASE 
      WHEN calculate_engagement_score(c.id, c.supplier_id) >= 80 THEN 'champion'
      WHEN calculate_engagement_score(c.id, c.supplier_id) >= 60 THEN 'highly_engaged'
      WHEN calculate_engagement_score(c.id, c.supplier_id) >= 30 THEN 'normal'
      WHEN calculate_engagement_score(c.id, c.supplier_id) >= 10 THEN 'at_risk'
      ELSE 'ghost'
    END,
    '{}'::JSONB,
    COALESCE((
      SELECT MAX(created_at)
      FROM client_engagement_events
      WHERE client_id = c.id AND supplier_id = c.supplier_id
    ), c.created_at)
  FROM clients c
  WHERE c.status = 'active'
  ON CONFLICT (client_id, supplier_id) DO NOTHING;
  
  -- Detect new at-risk clients
  PERFORM detect_at_risk_clients();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update engagement when events are added
CREATE OR REPLACE FUNCTION update_engagement_on_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate engagement score for this client
  PERFORM calculate_engagement_score(NEW.client_id, NEW.supplier_id);
  
  -- Check if they were at-risk and can be resolved
  UPDATE at_risk_alerts
  SET resolved_at = NOW()
  WHERE client_id = NEW.client_id
    AND resolved_at IS NULL
    AND alert_type = 'going_silent'
    AND NEW.created_at > created_at; -- Only if new activity
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_engagement_trigger ON client_engagement_events;
CREATE TRIGGER update_engagement_trigger
AFTER INSERT ON client_engagement_events
FOR EACH ROW
EXECUTE FUNCTION update_engagement_on_event();

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_engagement_events_client_time ON client_engagement_events(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_events_supplier_time ON client_engagement_events(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_events_type_time ON client_engagement_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_scores_segment ON client_engagement_scores(segment, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_at_risk_alerts_unresolved ON at_risk_alerts(supplier_id, resolved_at) WHERE resolved_at IS NULL;

-- Grant permissions
GRANT SELECT, INSERT ON client_engagement_events TO authenticated;
GRANT SELECT ON client_engagement_scores TO authenticated;
GRANT SELECT ON at_risk_alerts TO authenticated;
GRANT SELECT ON client_analytics_dashboard TO authenticated;

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE client_engagement_events;
ALTER PUBLICATION supabase_realtime ADD TABLE client_engagement_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE at_risk_alerts;

-- Comments for documentation
COMMENT ON TABLE client_engagement_events IS 'Tracks all client engagement activities for scoring';
COMMENT ON TABLE client_engagement_scores IS 'Real-time engagement scores (0-100) and client segments';
COMMENT ON TABLE at_risk_alerts IS 'Automated alerts for clients going silent or at-risk';
COMMENT ON MATERIALIZED VIEW client_analytics_dashboard IS 'Real-time analytics dashboard for client engagement';


-- ========================================
-- Migration: 20250101000026_query_performance_validation.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

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
DROP VIEW IF EXISTS performance_test_scenarios CASCADE;
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
DROP VIEW IF EXISTS performance_test_results CASCADE;
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
DROP VIEW IF EXISTS performance_benchmarks CASCADE;
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

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000027_gdpr_ccpa_compliance.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- GDPR/CCPA Comprehensive Compliance Framework
-- Migration: 019_comprehensive_gdpr_ccpa_compliance.sql
-- Purpose: Implements full GDPR/CCPA compliance database schema

-- Privacy Requests Table (Enhanced)
DROP VIEW IF EXISTS privacy_requests CASCADE;
CREATE TABLE IF NOT EXISTS privacy_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'expired')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    verification_token UUID DEFAULT gen_random_uuid(),
    verification_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    is_verified BOOLEAN DEFAULT FALSE,
    response_data JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consent Records Table (Enhanced)
DROP VIEW IF EXISTS consent_records CASCADE;
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    purpose TEXT NOT NULL,
    is_granted BOOLEAN NOT NULL DEFAULT FALSE,
    granted_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    legal_basis VARCHAR(50) NOT NULL CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
    processing_purpose TEXT NOT NULL,
    data_categories TEXT[] DEFAULT '{}',
    retention_period INTERVAL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, consent_type)
);

-- Enhanced Audit Trail (Tamper-Proof)
DROP VIEW IF EXISTS audit_trail CASCADE;
CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    actor_id VARCHAR(255) NOT NULL, -- Can be UUID or 'system'/'anonymized'
    actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('user', 'system', 'admin', 'vendor')),
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    metadata JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}', -- IP, user agent, session info
    hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64),
    signature VARCHAR(128), -- Cryptographic signature
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Processing Records (GDPR Article 30)
DROP VIEW IF EXISTS data_processing_records CASCADE;
CREATE TABLE IF NOT EXISTS data_processing_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    processing_activity VARCHAR(200) NOT NULL,
    controller_name VARCHAR(200) NOT NULL DEFAULT 'WedSync',
    controller_contact TEXT,
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,
    data_categories TEXT[] NOT NULL,
    data_subjects TEXT[] NOT NULL,
    recipients TEXT[],
    retention_period INTERVAL,
    retention_criteria TEXT,
    cross_border_transfers BOOLEAN DEFAULT FALSE,
    transfer_safeguards TEXT[],
    security_measures TEXT[],
    dpia_required BOOLEAN DEFAULT FALSE,
    dpia_reference UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Privacy Impact Assessments (GDPR Article 35)
DROP VIEW IF EXISTS privacy_impact_assessments CASCADE;
CREATE TABLE IF NOT EXISTS privacy_impact_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    processing_operations TEXT[] NOT NULL,
    data_types TEXT[] NOT NULL,
    necessity_assessment TEXT NOT NULL,
    proportionality_assessment TEXT NOT NULL,
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    assessment_date DATE NOT NULL,
    assessor_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected')),
    identified_risks JSONB DEFAULT '[]',
    mitigation_measures JSONB DEFAULT '[]',
    residual_risks JSONB DEFAULT '[]',
    consultation_required BOOLEAN DEFAULT FALSE,
    dpo_consultation_date DATE,
    supervisory_authority_consultation_date DATE,
    approval_date DATE,
    next_review_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Breach Incidents (GDPR Article 33-34)
DROP VIEW IF EXISTS data_breach_incidents CASCADE;
CREATE TABLE IF NOT EXISTS data_breach_incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_reference VARCHAR(100) UNIQUE NOT NULL,
    incident_title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    breach_type VARCHAR(50) NOT NULL, -- confidentiality, integrity, availability
    discovered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discovery_method VARCHAR(100),
    affected_users INTEGER DEFAULT 0,
    affected_records INTEGER DEFAULT 0,
    data_types_affected TEXT[],
    potential_consequences TEXT,
    immediate_actions TEXT,
    containment_measures TEXT,
    notification_required BOOLEAN DEFAULT TRUE,
    notification_72h_met BOOLEAN DEFAULT FALSE,
    authorities_notified_at TIMESTAMP WITH TIME ZONE,
    users_notified_at TIMESTAMP WITH TIME ZONE,
    notification_method VARCHAR(50),
    resolution_status VARCHAR(20) DEFAULT 'investigating' CHECK (resolution_status IN ('investigating', 'contained', 'resolved', 'closed')),
    root_cause TEXT,
    lessons_learned TEXT,
    follow_up_actions TEXT[],
    estimated_cost DECIMAL(10,2),
    regulatory_fines DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Exports (for portability requests)
DROP VIEW IF EXISTS data_exports CASCADE;
CREATE TABLE IF NOT EXISTS data_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    request_id UUID REFERENCES privacy_requests(id),
    export_format VARCHAR(20) DEFAULT 'json' CHECK (export_format IN ('json', 'csv', 'xml')),
    data JSONB NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    checksum VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    downloaded_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Legal Holds (for data retention requirements)
DROP VIEW IF EXISTS legal_holds CASCADE;
CREATE TABLE IF NOT EXISTS legal_holds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    wedding_id UUID REFERENCES weddings(id),
    hold_type VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    legal_basis TEXT NOT NULL,
    issuing_authority VARCHAR(200),
    hold_start_date DATE NOT NULL,
    hold_end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    data_categories TEXT[],
    retention_period INTERVAL,
    review_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cross-Border Transfer Records
DROP VIEW IF EXISTS cross_border_transfers CASCADE;
CREATE TABLE IF NOT EXISTS cross_border_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transfer_reference VARCHAR(100) UNIQUE NOT NULL,
    data_exporter VARCHAR(200) NOT NULL,
    data_importer VARCHAR(200) NOT NULL,
    source_country VARCHAR(2) NOT NULL, -- ISO country code
    destination_country VARCHAR(2) NOT NULL,
    transfer_mechanism VARCHAR(50) NOT NULL, -- adequacy_decision, scc, bcr, etc.
    data_categories TEXT[] NOT NULL,
    purpose TEXT NOT NULL,
    retention_period INTERVAL,
    security_measures TEXT[],
    adequacy_decision_reference TEXT,
    scc_version VARCHAR(50),
    transfer_date DATE NOT NULL,
    approval_authority VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Monitoring
DROP VIEW IF EXISTS compliance_monitoring CASCADE;
CREATE TABLE IF NOT EXISTS compliance_monitoring (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_type VARCHAR(50) NOT NULL,
    check_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('passed', 'failed', 'warning')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    next_check_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_privacy_requests_user_id ON privacy_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON privacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_type ON privacy_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_requested_at ON privacy_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_verification ON privacy_requests(verification_token) WHERE verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_type ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_granted ON consent_records(is_granted);
CREATE INDEX IF NOT EXISTS idx_consent_records_expiry ON consent_records(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_trail_actor ON audit_trail(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_event_type ON audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource ON audit_trail(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_risk_level ON audit_trail(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_trail_hash ON audit_trail(hash);

CREATE INDEX IF NOT EXISTS idx_data_processing_legal_basis ON data_processing_records(legal_basis);
CREATE INDEX IF NOT EXISTS idx_data_processing_cross_border ON data_processing_records(cross_border_transfers);

CREATE INDEX IF NOT EXISTS idx_pia_status ON privacy_impact_assessments(status);
CREATE INDEX IF NOT EXISTS idx_pia_risk_level ON privacy_impact_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_pia_assessment_date ON privacy_impact_assessments(assessment_date);

CREATE INDEX IF NOT EXISTS idx_breach_severity ON data_breach_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_breach_status ON data_breach_incidents(resolution_status);
CREATE INDEX IF NOT EXISTS idx_breach_discovered_at ON data_breach_incidents(discovered_at);
CREATE INDEX IF NOT EXISTS idx_breach_notification ON data_breach_incidents(notification_required, authorities_notified_at);

CREATE INDEX IF NOT EXISTS idx_data_exports_user_id ON data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_expires_at ON data_exports(expires_at);

CREATE INDEX IF NOT EXISTS idx_legal_holds_user_id ON legal_holds(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_active ON legal_holds(is_active);

-- Enable Row Level Security
ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_impact_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_breach_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_border_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_monitoring ENABLE ROW LEVEL SECURITY;

-- Privacy Requests Policies
CREATE POLICY "Users can view own privacy requests" ON privacy_requests
    FOR SELECT USING (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can create own privacy requests" ON privacy_requests
    FOR INSERT WITH CHECK (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Privacy officers can view all requests" ON privacy_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = ( SELECT auth.uid() ) 
            AND (role = 'admin' OR role = 'privacy_officer')
        )
    );

-- Consent Records Policies
CREATE POLICY "Users can view own consent records" ON consent_records
    FOR SELECT USING (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can manage own consent" ON consent_records
    FOR ALL USING (( SELECT auth.uid() ) = user_id);

-- Audit Trail Policies (Restricted access)
CREATE POLICY "Privacy officers can view audit trail" ON audit_trail
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = ( SELECT auth.uid() ) 
            AND role IN ('admin', 'privacy_officer', 'auditor')
        )
    );

-- Data Exports Policies
CREATE POLICY "Users can view own data exports" ON data_exports
    FOR SELECT USING (( SELECT auth.uid() ) = user_id);

-- Admin-only policies for sensitive tables
CREATE POLICY "Admin access only" ON data_processing_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = ( SELECT auth.uid() ) 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admin access only" ON privacy_impact_assessments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = ( SELECT auth.uid() ) 
            AND role IN ('admin', 'privacy_officer')
        )
    );

CREATE POLICY "Admin access only" ON data_breach_incidents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = ( SELECT auth.uid() ) 
            AND role IN ('admin', 'privacy_officer', 'security_officer')
        )
    );

-- Automated Functions and Triggers

-- Function to update consent timestamps
CREATE OR REPLACE FUNCTION update_consent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_granted = TRUE AND (OLD.is_granted IS NULL OR OLD.is_granted = FALSE) THEN
        NEW.granted_at = NOW();
        NEW.withdrawn_at = NULL;
    ELSIF NEW.is_granted = FALSE AND OLD.is_granted = TRUE THEN
        NEW.withdrawn_at = NOW();
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_timestamp_trigger
    BEFORE UPDATE ON consent_records
    FOR EACH ROW
    EXECUTE FUNCTION update_consent_timestamp();

-- Function to automatically expire consents
CREATE OR REPLACE FUNCTION expire_consents()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE consent_records
    SET is_granted = FALSE,
        withdrawn_at = NOW(),
        updated_at = NOW(),
        metadata = metadata || '{"auto_expired": true}'::jsonb
    WHERE is_granted = TRUE
    AND expiry_date IS NOT NULL
    AND expiry_date < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log expired consents
    INSERT INTO audit_trail (
        event_type, actor_id, actor_type, resource_type, resource_id,
        action, risk_level, metadata
    )
    SELECT 
        'consent_change', 'system', 'system', 'consent', id::text,
        'AUTO_EXPIRE', 'low', 
        jsonb_build_object('reason', 'automatic_expiry', 'expired_count', expired_count)
    FROM consent_records 
    WHERE withdrawn_at = NOW() AND metadata ? 'auto_expired';
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check for overdue privacy requests
CREATE OR REPLACE FUNCTION check_overdue_privacy_requests()
RETURNS INTEGER AS $$
DECLARE
    overdue_count INTEGER;
BEGIN
    -- Mark requests as overdue after 30 days (GDPR requirement)
    UPDATE privacy_requests
    SET status = 'expired',
        updated_at = NOW(),
        metadata = metadata || '{"reason": "30_day_limit_exceeded"}'::jsonb
    WHERE status IN ('pending', 'processing')
    AND requested_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS overdue_count = ROW_COUNT;
    
    -- Log overdue requests
    IF overdue_count > 0 THEN
        INSERT INTO audit_trail (
            event_type, actor_id, actor_type, resource_type, resource_id,
            action, risk_level, metadata
        )
        VALUES (
            'privacy_request', 'system', 'system', 'privacy_request', 'multiple',
            'AUTO_EXPIRE', 'medium',
            jsonb_build_object('overdue_count', overdue_count, 'reason', 'gdpr_30_day_limit')
        );
    END IF;
    
    RETURN overdue_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired data exports
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    DELETE FROM data_exports
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    IF cleanup_count > 0 THEN
        INSERT INTO audit_trail (
            event_type, actor_id, actor_type, resource_type, resource_id,
            action, risk_level, metadata
        )
        VALUES (
            'data_export', 'system', 'system', 'data_export', 'multiple',
            'AUTO_CLEANUP', 'low',
            jsonb_build_object('cleaned_count', cleanup_count)
        );
    END IF;
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Breach notification trigger (must notify within 72 hours)
CREATE OR REPLACE FUNCTION check_breach_notification_deadline()
RETURNS TRIGGER AS $$
BEGIN
    -- If breach was discovered more than 72 hours ago and not yet reported to authorities
    IF NEW.discovered_at < NOW() - INTERVAL '72 hours' 
       AND NEW.authorities_notified_at IS NULL 
       AND NEW.notification_required = TRUE THEN
        
        NEW.notification_72h_met = FALSE;
        
        -- Log compliance violation
        INSERT INTO audit_trail (
            event_type, actor_id, actor_type, resource_type, resource_id,
            action, risk_level, metadata
        )
        VALUES (
            'data_breach', 'system', 'system', 'data_breach', NEW.id::text,
            'COMPLIANCE_VIOLATION', 'critical',
            jsonb_build_object(
                'violation_type', '72_hour_notification_missed',
                'discovery_time', NEW.discovered_at,
                'current_time', NOW()
            )
        );
    ELSE
        NEW.notification_72h_met = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER breach_notification_deadline_check
    BEFORE INSERT OR UPDATE ON data_breach_incidents
    FOR EACH ROW
    EXECUTE FUNCTION check_breach_notification_deadline();

-- Create scheduled jobs for compliance automation
-- Note: These would typically be set up as cron jobs or scheduled functions

COMMENT ON TABLE privacy_requests IS 'GDPR/CCPA data subject requests with 30-day processing requirement';
COMMENT ON TABLE consent_records IS 'Granular consent management with automatic expiry';
COMMENT ON TABLE audit_trail IS 'Tamper-proof audit trail with hash chain integrity';
COMMENT ON TABLE data_processing_records IS 'GDPR Article 30 records of processing activities';
COMMENT ON TABLE privacy_impact_assessments IS 'GDPR Article 35 privacy impact assessments';
COMMENT ON TABLE data_breach_incidents IS 'GDPR Article 33-34 breach incident management';
COMMENT ON TABLE data_exports IS 'Temporary storage for data portability exports';
COMMENT ON TABLE legal_holds IS 'Legal data retention requirements';
COMMENT ON TABLE cross_border_transfers IS 'International data transfer compliance';
COMMENT ON TABLE compliance_monitoring IS 'Automated compliance health checks';

-- Insert initial compliance configuration
INSERT INTO data_processing_records (
    processing_activity, purpose, legal_basis, data_categories, data_subjects,
    retention_period, security_measures
) VALUES 
(
    'Wedding Planning Platform Operation',
    'Providing wedding planning and vendor coordination services',
    'contract',
    ARRAY['personal_identification', 'contact_information', 'wedding_preferences', 'communication_data'],
    ARRAY['wedding_couples', 'wedding_planners', 'vendors'],
    INTERVAL '7 years',
    ARRAY['encryption_at_rest', 'encryption_in_transit', 'access_controls', 'audit_logging']
),
(
    'Customer Support and Communication',
    'Providing customer support and service communications',
    'legitimate_interests',
    ARRAY['contact_information', 'support_interactions', 'communication_preferences'],
    ARRAY['all_users'],
    INTERVAL '3 years',
    ARRAY['access_controls', 'data_minimization', 'purpose_limitation']
),
(
    'Security and Fraud Prevention',
    'Protecting platform security and preventing fraudulent activities',
    'legitimate_interests',
    ARRAY['technical_data', 'usage_patterns', 'security_events'],
    ARRAY['all_users'],
    INTERVAL '1 year',
    ARRAY['pseudonymization', 'access_controls', 'automated_deletion']
);

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000028_tagging_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Migration: WS-005 Tagging System
-- Team E Round 3: Complete tagging system with client associations
-- Date: 2025-01-21

-- Create tags table for organizing clients
DROP VIEW IF EXISTS tags CASCADE;
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(50) NOT NULL,
  description text,
  color varchar(20) NOT NULL DEFAULT 'blue',
  category varchar(20) NOT NULL DEFAULT 'custom',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Constraints
  CONSTRAINT tags_name_length CHECK (length(name) >= 1 AND length(name) <= 50),
  CONSTRAINT tags_description_length CHECK (description IS NULL OR length(description) <= 200),
  CONSTRAINT tags_color_valid CHECK (color IN (
    'gray', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 
    'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 
    'pink', 'rose'
  )),
  CONSTRAINT tags_category_valid CHECK (category IN (
    'relationship', 'venue', 'season', 'style', 'service', 'priority', 'custom'
  )),
  
  -- Unique constraint for tag names within organization
  UNIQUE(organization_id, name)
);

-- Create client_tags junction table for many-to-many relationship
DROP VIEW IF EXISTS client_tags CASCADE;
CREATE TABLE IF NOT EXISTS client_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamp with time zone DEFAULT now(),
  
  -- Prevent duplicate assignments
  UNIQUE(client_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_organization_id ON tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_created_at ON tags(created_at);

CREATE INDEX IF NOT EXISTS idx_client_tags_client_id ON client_tags(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tags_tag_id ON client_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_client_tags_assigned_at ON client_tags(assigned_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tags_org_category ON tags(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_client_tags_client_assigned ON client_tags(client_id, assigned_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags table
CREATE POLICY "Users can view tags in their organization" ON tags
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can create tags in their organization" ON tags
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can update tags in their organization" ON tags
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() )
    )
  );

CREATE POLICY "Users can delete tags in their organization" ON tags
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = ( SELECT auth.uid() )
    )
  );

-- RLS Policies for client_tags table
CREATE POLICY "Users can view client tags in their organization" ON client_tags
  FOR SELECT USING (
    client_id IN (
      SELECT id 
      FROM clients 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can assign tags to clients in their organization" ON client_tags
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT id 
      FROM clients 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
    AND tag_id IN (
      SELECT id 
      FROM tags 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

CREATE POLICY "Users can remove tags from clients in their organization" ON client_tags
  FOR DELETE USING (
    client_id IN (
      SELECT id 
      FROM clients 
      WHERE organization_id IN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE user_id = ( SELECT auth.uid() )
      )
    )
  );

-- Create function to update tag updated_at timestamp
CREATE OR REPLACE FUNCTION update_tag_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tag timestamp updates
CREATE TRIGGER trigger_update_tag_timestamp
  BEFORE UPDATE ON tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_timestamp();

-- Create function to get tag usage count
CREATE OR REPLACE FUNCTION get_tag_usage_count(tag_uuid uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM client_tags
    WHERE tag_id = tag_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for tag statistics
CREATE OR REPLACE VIEW tag_statistics AS
SELECT 
  t.id,
  t.organization_id,
  t.name,
  t.description,
  t.color,
  t.category,
  t.created_at,
  t.updated_at,
  COALESCE(ct.usage_count, 0) as usage_count
FROM tags t
LEFT JOIN (
  SELECT 
    tag_id, 
    COUNT(*) as usage_count
  FROM client_tags
  GROUP BY tag_id
) ct ON t.id = ct.tag_id;

-- Grant permissions on the view
GRANT SELECT ON tag_statistics TO authenticated;

-- Create function to get clients by tags
CREATE OR REPLACE FUNCTION get_clients_by_tags(
  org_id uuid,
  tag_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  tag_count bigint
) AS $$
BEGIN
  IF tag_ids IS NULL OR array_length(tag_ids, 1) = 0 THEN
    -- Return all clients if no tags specified
    RETURN QUERY
    SELECT 
      c.id as client_id,
      COALESCE(c.first_name || ' ' || c.last_name, 'Unnamed Client') as client_name,
      0::bigint as tag_count
    FROM clients c
    WHERE c.organization_id = org_id;
  ELSE
    -- Return clients that have ALL specified tags
    RETURN QUERY
    SELECT 
      c.id as client_id,
      COALESCE(c.first_name || ' ' || c.last_name, 'Unnamed Client') as client_name,
      COUNT(ct.tag_id) as tag_count
    FROM clients c
    INNER JOIN client_tags ct ON c.id = ct.client_id
    WHERE c.organization_id = org_id
      AND ct.tag_id = ANY(tag_ids)
    GROUP BY c.id, c.first_name, c.last_name
    HAVING COUNT(ct.tag_id) = array_length(tag_ids, 1);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_clients_by_tags TO authenticated;

-- Insert default tag categories (optional sample data)
-- Organizations can customize these or create their own
INSERT INTO tags (organization_id, name, description, color, category, created_by)
SELECT 
  o.id as organization_id,
  sample_tags.name,
  sample_tags.description,
  sample_tags.color,
  sample_tags.category,
  NULL as created_by
FROM organizations o
CROSS JOIN (
  VALUES 
    ('VIP Client', 'High-value client requiring premium service', 'blue', 'relationship'),
    ('Referral', 'Client referred by existing customer', 'green', 'relationship'),
    ('Outdoor Wedding', 'Wedding ceremony and/or reception outdoors', 'emerald', 'venue'),
    ('Indoor Wedding', 'Wedding ceremony and/or reception indoors', 'cyan', 'venue'),
    ('Destination', 'Wedding at a destination location', 'purple', 'venue'),
    ('Spring', 'Wedding scheduled for spring season', 'lime', 'season'),
    ('Summer', 'Wedding scheduled for summer season', 'amber', 'season'),
    ('Fall', 'Wedding scheduled for fall season', 'orange', 'season'),
    ('Winter', 'Wedding scheduled for winter season', 'sky', 'season'),
    ('Modern', 'Contemporary wedding style', 'indigo', 'style'),
    ('Traditional', 'Classic wedding style', 'rose', 'style'),
    ('Rustic', 'Rustic/country wedding style', 'yellow', 'style'),
    ('Elegant', 'Upscale elegant wedding style', 'violet', 'style'),
    ('Full Day', 'Complete wedding day coverage', 'teal', 'service'),
    ('Half Day', 'Partial wedding day coverage', 'pink', 'service'),
    ('Elopement', 'Small intimate wedding ceremony', 'fuchsia', 'service')
) AS sample_tags(name, description, color, category)
ON CONFLICT (organization_id, name) DO NOTHING;

-- Create notification triggers for tag operations
CREATE OR REPLACE FUNCTION notify_tag_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify when tags are assigned or removed
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_notify(
      'tag_assigned',
      json_build_object(
        'client_id', NEW.client_id,
        'tag_id', NEW.tag_id,
        'assigned_by', NEW.assigned_by,
        'assigned_at', NEW.assigned_at
      )::text
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM pg_notify(
      'tag_removed',
      json_build_object(
        'client_id', OLD.client_id,
        'tag_id', OLD.tag_id
      )::text
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tag change notifications
CREATE TRIGGER trigger_notify_tag_changes
  AFTER INSERT OR DELETE ON client_tags
  FOR EACH ROW
  EXECUTE FUNCTION notify_tag_changes();

-- Add comments for documentation
COMMENT ON TABLE tags IS 'Tags for organizing and categorizing clients';
COMMENT ON TABLE client_tags IS 'Junction table linking clients to their assigned tags';
COMMENT ON COLUMN tags.color IS 'UI color for tag display (must be one of predefined colors)';
COMMENT ON COLUMN tags.category IS 'Tag category for organization (relationship, venue, season, etc.)';
COMMENT ON FUNCTION get_tag_usage_count IS 'Returns the number of clients using a specific tag';
COMMENT ON VIEW tag_statistics IS 'Comprehensive tag statistics including usage counts';
COMMENT ON FUNCTION get_clients_by_tags IS 'Filters clients by one or more tags (AND logic)';

-- Performance optimization: Analyze tables after migration
ANALYZE tags;
ANALYZE client_tags;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000029_tutorial_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Tutorial System Database Schema
-- Migration: 019_tutorial_system

-- Tutorial progress tracking table
DROP VIEW IF EXISTS tutorial_progress CASCADE;
CREATE TABLE IF NOT EXISTS tutorial_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tutorial_type TEXT NOT NULL CHECK (tutorial_type IN ('onboarding', 'feature-discovery', 'advanced')),
    user_type TEXT DEFAULT 'couple' CHECK (user_type IN ('couple', 'planner', 'vendor')),
    device_type TEXT DEFAULT 'desktop' CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
    
    -- Tutorial structure
    steps JSONB NOT NULL DEFAULT '[]',
    current_step INTEGER DEFAULT 1,
    completed_steps TEXT[] DEFAULT '{}',
    skipped_steps TEXT[] DEFAULT '{}',
    
    -- Status tracking
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Preferences
    preferences JSONB DEFAULT '{"showHints": true, "autoAdvance": false, "speed": "normal"}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, tutorial_type)
);

-- Tutorial analytics table for tracking interactions
DROP VIEW IF EXISTS tutorial_analytics CASCADE;
CREATE TABLE IF NOT EXISTS tutorial_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tutorial_type TEXT NOT NULL,
    
    -- Event tracking
    event_type TEXT NOT NULL CHECK (event_type IN ('start', 'complete', 'skip', 'pause', 'resume', 'exit')),
    step_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional data
    data JSONB DEFAULT '{}',
    time_spent INTEGER, -- milliseconds
    device_type TEXT,
    user_type TEXT,
    
    -- Session tracking
    session_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tutorial feedback table for collecting user feedback
DROP VIEW IF EXISTS tutorial_feedback CASCADE;
CREATE TABLE IF NOT EXISTS tutorial_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tutorial_type TEXT NOT NULL,
    
    -- Feedback data
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    helpful_steps TEXT[],
    confusing_steps TEXT[],
    suggestions TEXT,
    
    -- Completion data
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_time INTEGER, -- total time in milliseconds
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_user_id ON tutorial_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_status ON tutorial_progress(status);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_type ON tutorial_progress(tutorial_type);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_last_activity ON tutorial_progress(last_activity);

CREATE INDEX IF NOT EXISTS idx_tutorial_analytics_user_id ON tutorial_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_analytics_event_type ON tutorial_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_tutorial_analytics_timestamp ON tutorial_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_tutorial_analytics_step_id ON tutorial_analytics(step_id);

CREATE INDEX IF NOT EXISTS idx_tutorial_feedback_user_id ON tutorial_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_feedback_rating ON tutorial_feedback(rating);

-- RLS (Row Level Security) policies
ALTER TABLE tutorial_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutorial_feedback ENABLE ROW LEVEL SECURITY;

-- Tutorial progress policies
CREATE POLICY "Users can view their own tutorial progress"
    ON tutorial_progress FOR SELECT
    USING (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can insert their own tutorial progress"
    ON tutorial_progress FOR INSERT
    WITH CHECK (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can update their own tutorial progress"
    ON tutorial_progress FOR UPDATE
    USING (( SELECT auth.uid() ) = user_id)
    WITH CHECK (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can delete their own tutorial progress"
    ON tutorial_progress FOR DELETE
    USING (( SELECT auth.uid() ) = user_id);

-- Tutorial analytics policies
CREATE POLICY "Users can view their own tutorial analytics"
    ON tutorial_analytics FOR SELECT
    USING (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can insert their own tutorial analytics"
    ON tutorial_analytics FOR INSERT
    WITH CHECK (( SELECT auth.uid() ) = user_id);

-- Tutorial feedback policies
CREATE POLICY "Users can view their own tutorial feedback"
    ON tutorial_feedback FOR SELECT
    USING (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can insert their own tutorial feedback"
    ON tutorial_feedback FOR INSERT
    WITH CHECK (( SELECT auth.uid() ) = user_id);

CREATE POLICY "Users can update their own tutorial feedback"
    ON tutorial_feedback FOR UPDATE
    USING (( SELECT auth.uid() ) = user_id)
    WITH CHECK (( SELECT auth.uid() ) = user_id);

-- Functions for tutorial management

-- Function to get tutorial completion stats
CREATE OR REPLACE FUNCTION get_tutorial_completion_stats(
    tutorial_type_param TEXT DEFAULT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    tutorial_type TEXT,
    total_started INTEGER,
    total_completed INTEGER,
    completion_rate DECIMAL,
    avg_completion_time INTERVAL,
    most_skipped_step TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            tp.tutorial_type,
            COUNT(*) as started,
            COUNT(*) FILTER (WHERE tp.status = 'completed') as completed,
            AVG(EXTRACT(EPOCH FROM (tp.completed_at - tp.started_at))) as avg_time_seconds
        FROM tutorial_progress tp
        WHERE tp.started_at >= start_date 
            AND tp.started_at <= end_date
            AND (tutorial_type_param IS NULL OR tp.tutorial_type = tutorial_type_param)
        GROUP BY tp.tutorial_type
    ),
    skipped_steps AS (
        SELECT 
            ta.tutorial_type,
            ta.step_id,
            COUNT(*) as skip_count,
            ROW_NUMBER() OVER (PARTITION BY ta.tutorial_type ORDER BY COUNT(*) DESC) as rn
        FROM tutorial_analytics ta
        WHERE ta.event_type = 'skip'
            AND ta.timestamp >= start_date
            AND ta.timestamp <= end_date
            AND (tutorial_type_param IS NULL OR ta.tutorial_type = tutorial_type_param)
        GROUP BY ta.tutorial_type, ta.step_id
    )
    SELECT 
        s.tutorial_type,
        s.started::INTEGER,
        s.completed::INTEGER,
        CASE WHEN s.started > 0 THEN ROUND((s.completed::DECIMAL / s.started) * 100, 2) ELSE 0 END,
        MAKE_INTERVAL(secs => s.avg_time_seconds)::INTERVAL,
        ss.step_id
    FROM stats s
    LEFT JOIN skipped_steps ss ON s.tutorial_type = ss.tutorial_type AND ss.rn = 1;
END;
$$;

-- Function to clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_tutorial_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Keep analytics data for 1 year
    DELETE FROM tutorial_analytics 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Log cleanup
    RAISE NOTICE 'Cleaned up old tutorial analytics data';
END;
$$;

-- Trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_tutorial_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for tutorial_progress
DROP TRIGGER IF EXISTS trigger_tutorial_progress_updated_at ON tutorial_progress;
CREATE TRIGGER trigger_tutorial_progress_updated_at
    BEFORE UPDATE ON tutorial_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_tutorial_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tutorial_progress TO authenticated;
GRANT SELECT, INSERT ON tutorial_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tutorial_feedback TO authenticated;

-- Grant permissions on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE tutorial_progress IS 'Tracks user progress through interactive tutorials';
COMMENT ON TABLE tutorial_analytics IS 'Analytics data for tutorial interactions and performance metrics';
COMMENT ON TABLE tutorial_feedback IS 'User feedback and ratings for tutorial experiences';

COMMENT ON COLUMN tutorial_progress.steps IS 'JSONB array containing tutorial step definitions';
COMMENT ON COLUMN tutorial_progress.completed_steps IS 'Array of step IDs that have been completed';
COMMENT ON COLUMN tutorial_progress.skipped_steps IS 'Array of step IDs that have been skipped';
COMMENT ON COLUMN tutorial_progress.preferences IS 'User preferences for tutorial behavior (hints, auto-advance, speed)';

COMMENT ON COLUMN tutorial_analytics.time_spent IS 'Time spent on step in milliseconds';
COMMENT ON COLUMN tutorial_analytics.data IS 'Additional event data (form submissions, interactions, etc.)';

COMMENT ON FUNCTION get_tutorial_completion_stats IS 'Returns tutorial completion statistics for analytics';
COMMENT ON FUNCTION cleanup_old_tutorial_analytics IS 'Removes analytics data older than 1 year';

-- Create a view for tutorial dashboard analytics
CREATE OR REPLACE VIEW tutorial_dashboard_stats AS
SELECT 
    tp.tutorial_type,
    tp.user_type,
    tp.device_type,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE tp.status = 'completed') as completed_sessions,
    COUNT(*) FILTER (WHERE tp.status = 'active') as active_sessions,
    COUNT(*) FILTER (WHERE tp.status = 'paused') as paused_sessions,
    ROUND(AVG(array_length(tp.completed_steps, 1))::DECIMAL, 2) as avg_completed_steps,
    ROUND(AVG(array_length(tp.skipped_steps, 1))::DECIMAL, 2) as avg_skipped_steps,
    AVG(EXTRACT(EPOCH FROM (COALESCE(tp.completed_at, tp.last_activity) - tp.started_at))) as avg_session_time_seconds
FROM tutorial_progress tp
WHERE tp.started_at >= NOW() - INTERVAL '30 days'
GROUP BY tp.tutorial_type, tp.user_type, tp.device_type
ORDER BY tp.tutorial_type, total_sessions DESC;

COMMENT ON VIEW tutorial_dashboard_stats IS 'Aggregated tutorial statistics for dashboard display';

-- Initialize with default tutorial step templates (can be customized per user type)
INSERT INTO tutorial_progress (user_id, tutorial_type, steps) VALUES
-- This would typically be done via the API, but here's the structure
-- The steps will be populated by the API based on user type and preferences

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000030_vendor_portal_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Vendor Portal System Migration
-- WS-006: Vendor Management - Coordination Portal & Performance Scoring

-- Vendor Performance Logs Table
DROP VIEW IF EXISTS vendor_performance_logs CASCADE;
CREATE TABLE IF NOT EXISTS vendor_performance_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Performance Metrics
  metric_type VARCHAR(100) NOT NULL, -- delivery_time, response_time, quality_rating, etc.
  metric_value DECIMAL(10, 2) NOT NULL,
  metric_unit VARCHAR(50), -- hours, rating, percentage, etc.
  
  -- Context
  wedding_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  measurement_date TIMESTAMP WITH TIME ZONE NOT NULL,
  measurement_period VARCHAR(50), -- daily, weekly, wedding_specific
  
  -- Metadata
  notes TEXT,
  recorded_by UUID REFERENCES user_profiles(id),
  source VARCHAR(100) DEFAULT 'manual', -- manual, automated, system
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Performance Scores Table (Aggregated)
DROP VIEW IF EXISTS vendor_performance_scores CASCADE;
CREATE TABLE IF NOT EXISTS vendor_performance_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Performance Scores (0-100)
  overall_score DECIMAL(5, 2) DEFAULT 0,
  delivery_score DECIMAL(5, 2) DEFAULT 0,
  communication_score DECIMAL(5, 2) DEFAULT 0,
  quality_score DECIMAL(5, 2) DEFAULT 0,
  reliability_score DECIMAL(5, 2) DEFAULT 0,
  
  -- Key Metrics
  on_time_delivery_rate DECIMAL(5, 2) DEFAULT 0, -- percentage
  average_response_time DECIMAL(10, 2) DEFAULT 0, -- hours
  customer_satisfaction DECIMAL(3, 2) DEFAULT 0, -- 0-5 scale
  repeat_customer_rate DECIMAL(5, 2) DEFAULT 0, -- percentage
  recommendation_rate DECIMAL(5, 2) DEFAULT 0, -- percentage
  
  -- Business Metrics
  completed_weddings INTEGER DEFAULT 0,
  active_weddings INTEGER DEFAULT 0,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  average_project_value DECIMAL(10, 2) DEFAULT 0,
  
  -- Performance Trend
  performance_trend VARCHAR(20) DEFAULT 'stable', -- up, down, stable
  trend_percentage DECIMAL(5, 2) DEFAULT 0,
  
  -- Calculation Metadata
  calculation_period VARCHAR(50) NOT NULL, -- 1month, 3months, 6months, 1year, all_time
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- for caching
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(vendor_id, calculation_period)
);

-- Vendor Achievements Table
DROP VIEW IF EXISTS vendor_achievements CASCADE;
CREATE TABLE IF NOT EXISTS vendor_achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Achievement Details
  achievement_type VARCHAR(100) NOT NULL, -- top_rated, reliable_partner, customer_champion
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- star, clock, trophy, etc.
  
  -- Requirements
  requirement_met JSONB NOT NULL, -- criteria that was met
  threshold_value DECIMAL(10, 2),
  actual_value DECIMAL(10, 2),
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, revoked, expired
  earned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_date TIMESTAMP WITH TIME ZONE,
  
  -- Display
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  badge_color VARCHAR(7) DEFAULT '#10B981',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Communications Table
DROP VIEW IF EXISTS vendor_communications CASCADE;
CREATE TABLE IF NOT EXISTS vendor_communications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Communication Type
  communication_type VARCHAR(50) NOT NULL, -- direct_message, group_chat, notification, announcement
  
  -- Participants
  from_vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  to_vendor_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  to_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  group_id UUID, -- for group communications
  
  -- Message Content
  subject VARCHAR(500),
  message TEXT NOT NULL,
  message_format VARCHAR(20) DEFAULT 'text', -- text, html, markdown
  
  -- Priority and Status
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent, emergency
  status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, read, replied, failed
  
  -- Wedding Context
  wedding_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  wedding_milestone VARCHAR(100),
  
  -- Attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  sent_by UUID REFERENCES user_profiles(id),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  
  -- Threading
  parent_id UUID REFERENCES vendor_communications(id) ON DELETE CASCADE,
  thread_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Communication Groups Table
DROP VIEW IF EXISTS vendor_communication_groups CASCADE;
CREATE TABLE IF NOT EXISTS vendor_communication_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Group Details
  group_name VARCHAR(255) NOT NULL,
  group_type VARCHAR(50) DEFAULT 'wedding', -- wedding, category, custom
  description TEXT,
  
  -- Wedding Context
  wedding_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  allow_vendor_invite BOOLEAN DEFAULT false,
  auto_add_new_vendors BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Communication Group Members Table
DROP VIEW IF EXISTS vendor_communication_group_members CASCADE;
CREATE TABLE IF NOT EXISTS vendor_communication_group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES vendor_communication_groups(id) ON DELETE CASCADE,
  
  -- Member Details
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  member_role VARCHAR(50) DEFAULT 'member', -- admin, moderator, member
  
  -- Permissions
  can_send_messages BOOLEAN DEFAULT true,
  can_invite_members BOOLEAN DEFAULT false,
  can_remove_members BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, muted, removed
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(group_id, vendor_id)
);

-- Vendor Timeline Access Table
DROP VIEW IF EXISTS vendor_timeline_access CASCADE;
CREATE TABLE IF NOT EXISTS vendor_timeline_access (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Access Permissions
  can_view_timeline BOOLEAN DEFAULT true,
  can_edit_timeline BOOLEAN DEFAULT false,
  can_add_milestones BOOLEAN DEFAULT false,
  can_complete_tasks BOOLEAN DEFAULT true,
  
  -- Scope of Access
  access_scope VARCHAR(50) DEFAULT 'assigned_tasks', -- full, assigned_tasks, view_only
  visible_milestone_types TEXT[], -- array of milestone types they can see
  
  -- Timeline Sections
  can_view_ceremony BOOLEAN DEFAULT true,
  can_view_reception BOOLEAN DEFAULT true,
  can_view_vendor_coordination BOOLEAN DEFAULT true,
  can_view_setup_breakdown BOOLEAN DEFAULT false,
  
  -- Restrictions
  restricted_fields TEXT[], -- fields they cannot see
  time_restrictions JSONB, -- when they can access (e.g., only during business hours)
  
  -- Audit
  granted_by UUID REFERENCES user_profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(vendor_id, client_id)
);

-- Vendor Delivery Tracking Table
DROP VIEW IF EXISTS vendor_delivery_tracking CASCADE;
CREATE TABLE IF NOT EXISTS vendor_delivery_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Service Details
  service_type VARCHAR(100) NOT NULL, -- photography, catering, flowers, etc.
  service_description TEXT,
  deliverable_name VARCHAR(255) NOT NULL,
  
  -- Timeline
  scheduled_date TIMESTAMP WITH TIME ZONE,
  promised_delivery_date TIMESTAMP WITH TIME ZONE,
  actual_delivery_date TIMESTAMP WITH TIME ZONE,
  
  -- Status Tracking
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, delivered, completed, delayed, cancelled
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- Quality Metrics
  quality_score DECIMAL(3, 2), -- 0-5 rating
  on_time_delivery BOOLEAN,
  meets_specifications BOOLEAN,
  
  -- Client Feedback
  client_satisfaction DECIMAL(3, 2), -- 0-5 rating
  client_feedback TEXT,
  client_approved BOOLEAN DEFAULT false,
  client_approval_date TIMESTAMP WITH TIME ZONE,
  
  -- Vendor Updates
  vendor_notes TEXT,
  last_vendor_update TIMESTAMP WITH TIME ZONE,
  next_milestone VARCHAR(255),
  next_milestone_date TIMESTAMP WITH TIME ZONE,
  
  -- Issues and Resolution
  issues_reported TEXT,
  resolution_notes TEXT,
  escalated BOOLEAN DEFAULT false,
  escalated_at TIMESTAMP WITH TIME ZONE,
  escalated_to UUID REFERENCES user_profiles(id),
  
  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendor Feedback Collection Table
DROP VIEW IF EXISTS vendor_feedback CASCADE;
CREATE TABLE IF NOT EXISTS vendor_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vendor_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Feedback Context
  wedding_date DATE,
  service_category VARCHAR(100),
  feedback_type VARCHAR(50) DEFAULT 'post_wedding', -- pre_wedding, mid_service, post_wedding, follow_up
  
  -- Ratings (1-5 scale)
  overall_rating DECIMAL(3, 2) NOT NULL,
  communication_rating DECIMAL(3, 2),
  professionalism_rating DECIMAL(3, 2),
  quality_rating DECIMAL(3, 2),
  timeliness_rating DECIMAL(3, 2),
  value_rating DECIMAL(3, 2),
  
  -- Detailed Feedback
  what_went_well TEXT,
  areas_for_improvement TEXT,
  specific_comments TEXT,
  
  -- Recommendation
  would_recommend BOOLEAN,
  would_rebook BOOLEAN,
  likely_to_refer INTEGER CHECK (likely_to_refer >= 0 AND likely_to_refer <= 10), -- NPS score
  
  -- Response and Follow-up
  vendor_response TEXT,
  vendor_responded_at TIMESTAMP WITH TIME ZONE,
  follow_up_requested BOOLEAN DEFAULT false,
  follow_up_completed BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  
  -- Publication Permissions
  can_use_as_testimonial BOOLEAN DEFAULT false,
  can_use_on_website BOOLEAN DEFAULT false,
  can_share_publicly BOOLEAN DEFAULT false,
  
  -- Metadata
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  collection_method VARCHAR(50) DEFAULT 'form', -- form, email, phone, in_person
  collected_by UUID REFERENCES user_profiles(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_vendor_performance_logs_vendor ON vendor_performance_logs(vendor_id);
CREATE INDEX idx_vendor_performance_logs_metric ON vendor_performance_logs(metric_type);
CREATE INDEX idx_vendor_performance_logs_date ON vendor_performance_logs(measurement_date);
CREATE INDEX idx_vendor_performance_logs_wedding ON vendor_performance_logs(wedding_id);

CREATE INDEX idx_vendor_performance_scores_vendor ON vendor_performance_scores(vendor_id);
CREATE INDEX idx_vendor_performance_scores_period ON vendor_performance_scores(calculation_period);
CREATE INDEX idx_vendor_performance_scores_overall ON vendor_performance_scores(overall_score);

CREATE INDEX idx_vendor_achievements_vendor ON vendor_achievements(vendor_id);
CREATE INDEX idx_vendor_achievements_type ON vendor_achievements(achievement_type);
CREATE INDEX idx_vendor_achievements_status ON vendor_achievements(status);

CREATE INDEX idx_vendor_communications_from ON vendor_communications(from_vendor_id);
CREATE INDEX idx_vendor_communications_to_vendor ON vendor_communications(to_vendor_id);
CREATE INDEX idx_vendor_communications_to_client ON vendor_communications(to_client_id);
CREATE INDEX idx_vendor_communications_wedding ON vendor_communications(wedding_id);
CREATE INDEX idx_vendor_communications_type ON vendor_communications(communication_type);
CREATE INDEX idx_vendor_communications_status ON vendor_communications(status);
CREATE INDEX idx_vendor_communications_sent_at ON vendor_communications(sent_at);
CREATE INDEX idx_vendor_communications_thread ON vendor_communications(thread_id);

CREATE INDEX idx_vendor_communication_groups_wedding ON vendor_communication_groups(wedding_id);
CREATE INDEX idx_vendor_communication_groups_type ON vendor_communication_groups(group_type);

CREATE INDEX idx_vendor_timeline_access_vendor ON vendor_timeline_access(vendor_id);
CREATE INDEX idx_vendor_timeline_access_client ON vendor_timeline_access(client_id);

CREATE INDEX idx_vendor_delivery_tracking_vendor ON vendor_delivery_tracking(vendor_id);
CREATE INDEX idx_vendor_delivery_tracking_client ON vendor_delivery_tracking(client_id);
CREATE INDEX idx_vendor_delivery_tracking_status ON vendor_delivery_tracking(status);
CREATE INDEX idx_vendor_delivery_tracking_scheduled ON vendor_delivery_tracking(scheduled_date);
CREATE INDEX idx_vendor_delivery_tracking_delivery ON vendor_delivery_tracking(actual_delivery_date);

CREATE INDEX idx_vendor_feedback_vendor ON vendor_feedback(vendor_id);
CREATE INDEX idx_vendor_feedback_client ON vendor_feedback(client_id);
CREATE INDEX idx_vendor_feedback_rating ON vendor_feedback(overall_rating);
CREATE INDEX idx_vendor_feedback_submitted ON vendor_feedback(submitted_at);

-- Row Level Security Policies

-- Enable RLS on new tables
ALTER TABLE vendor_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_performance_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_communication_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_communication_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_timeline_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Vendor Performance Logs
CREATE POLICY "Users can view their organization's vendor performance logs"
  ON vendor_performance_logs FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can insert performance logs for their organization"
  ON vendor_performance_logs FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- RLS Policies for Vendor Performance Scores
CREATE POLICY "Users can view their organization's vendor performance scores"
  ON vendor_performance_scores FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- RLS Policies for Vendor Communications
CREATE POLICY "Users can view vendor communications for their organization"
  ON vendor_communications FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can send vendor communications for their organization"
  ON vendor_communications FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- RLS Policies for Vendor Timeline Access
CREATE POLICY "Users can view vendor timeline access for their organization"
  ON vendor_timeline_access FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- RLS Policies for Vendor Delivery Tracking
CREATE POLICY "Users can view vendor delivery tracking for their organization"
  ON vendor_delivery_tracking FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can update vendor delivery tracking for their organization"
  ON vendor_delivery_tracking FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- RLS Policies for Vendor Feedback
CREATE POLICY "Users can view vendor feedback for their organization"
  ON vendor_feedback FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY "Users can manage vendor feedback for their organization"
  ON vendor_feedback FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = ( SELECT auth.uid() )
  ));

-- Insert default performance score calculation periods
INSERT INTO vendor_performance_scores (vendor_id, organization_id, calculation_period, expires_at)
SELECT 
  s.id,
  s.organization_id,
  period,
  NOW() + INTERVAL '1 day'
FROM suppliers s
CROSS JOIN (VALUES ('1month'), ('3months'), ('6months'), ('1year'), ('all_time')) AS periods(period)
WHERE s.is_published = true
ON CONFLICT (vendor_id, calculation_period) DO NOTHING;

-- Function to update vendor performance scores
CREATE OR REPLACE FUNCTION update_vendor_performance_scores()
RETURNS void AS $$
BEGIN
  -- This function would contain logic to calculate and update performance scores
  -- Implementation would involve complex calculations based on various metrics
  RAISE NOTICE 'Vendor performance scores update triggered';
END;
$$ LANGUAGE plpgsql;

-- Trigger to update performance scores when new logs are added
CREATE OR REPLACE FUNCTION trigger_update_performance_scores()
RETURNS TRIGGER AS $$
BEGIN
  -- Schedule performance score recalculation
  PERFORM pg_notify('update_performance_scores', NEW.vendor_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendor_performance_log_trigger
  AFTER INSERT ON vendor_performance_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_performance_scores();

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250101000031_dashboard_system.sql
-- ========================================

-- Dashboard System Tables and Views
-- Feature: WS-037 - Main Dashboard Layout - Backend Services & API
-- Author: Team B - Round 2
-- Date: 2025-08-21

-- Enable RLS by default
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA PUBLIC REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Dashboard widgets configuration table
DROP VIEW IF EXISTS dashboard_widgets CASCADE;
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL CHECK (widget_type IN ('summary', 'upcoming_weddings', 'recent_activity', 'tasks', 'messages', 'revenue')),
    widget_config JSONB NOT NULL DEFAULT '{}',
    position_x INTEGER NOT NULL DEFAULT 0,
    position_y INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 1,
    height INTEGER NOT NULL DEFAULT 1,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dashboard data cache table for performance
DROP VIEW IF EXISTS dashboard_cache CASCADE;
CREATE TABLE IF NOT EXISTS dashboard_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    cache_key VARCHAR(100) NOT NULL,
    widget_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dashboard activity log for real-time updates
DROP VIEW IF EXISTS dashboard_activity CASCADE;
CREATE TABLE IF NOT EXISTS dashboard_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_supplier_id ON dashboard_widgets(supplier_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON dashboard_widgets(widget_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_enabled ON dashboard_widgets(supplier_id, is_enabled);

CREATE INDEX IF NOT EXISTS idx_dashboard_cache_supplier_key ON dashboard_cache(supplier_id, cache_key);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_expires ON dashboard_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_widget_type ON dashboard_cache(widget_type);

CREATE INDEX IF NOT EXISTS idx_dashboard_activity_supplier_id ON dashboard_activity(supplier_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_activity_created_at ON dashboard_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_activity_type ON dashboard_activity(activity_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_composite ON dashboard_widgets(supplier_id, is_enabled, widget_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_composite ON dashboard_cache(supplier_id, widget_type, expires_at);

-- Row Level Security (RLS) policies
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dashboard_widgets
CREATE POLICY "Users can view their own dashboard widgets" ON dashboard_widgets
    FOR SELECT USING (supplier_id = ( SELECT auth.uid() ));

CREATE POLICY "Users can insert their own dashboard widgets" ON dashboard_widgets
    FOR INSERT WITH CHECK (supplier_id = ( SELECT auth.uid() ));

CREATE POLICY "Users can update their own dashboard widgets" ON dashboard_widgets
    FOR UPDATE USING (supplier_id = ( SELECT auth.uid() ));

CREATE POLICY "Users can delete their own dashboard widgets" ON dashboard_widgets
    FOR DELETE USING (supplier_id = ( SELECT auth.uid() ));

-- RLS Policies for dashboard_cache
CREATE POLICY "Users can view their own dashboard cache" ON dashboard_cache
    FOR SELECT USING (supplier_id = ( SELECT auth.uid() ));

CREATE POLICY "Service role can manage dashboard cache" ON dashboard_cache
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for dashboard_activity
CREATE POLICY "Users can view their own dashboard activity" ON dashboard_activity
    FOR SELECT USING (supplier_id = ( SELECT auth.uid() ));

CREATE POLICY "Users can insert their own dashboard activity" ON dashboard_activity
    FOR INSERT WITH CHECK (supplier_id = ( SELECT auth.uid() ));

-- Updated_at trigger for dashboard_widgets
CREATE OR REPLACE FUNCTION update_dashboard_widgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER dashboard_widgets_updated_at
    BEFORE UPDATE ON dashboard_widgets
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_widgets_updated_at();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_dashboard_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM dashboard_cache WHERE expires_at < now();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dashboard summary view for performance
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT 
    w.id,
    w.supplier_id,
    w.company_name,
    w.contact_name,
    w.email,
    w.phone,
    w.status,
    w.created_at as wedding_date,
    w.budget,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as overdue_tasks,
    COUNT(m.id) as unread_messages,
    COALESCE(SUM(p.amount), 0) as total_revenue
FROM weddings w
LEFT JOIN tasks t ON w.id = t.wedding_id
LEFT JOIN messages m ON w.id = m.wedding_id AND m.is_read = false
LEFT JOIN payments p ON w.id = p.wedding_id AND p.status = 'completed'
GROUP BY w.id, w.supplier_id, w.company_name, w.contact_name, w.email, w.phone, w.status, w.created_at, w.budget;

-- Dashboard widgets default configuration
CREATE OR REPLACE FUNCTION setup_default_dashboard_widgets(p_supplier_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert default widget configuration if none exists
    IF NOT EXISTS (SELECT 1 FROM dashboard_widgets WHERE supplier_id = p_supplier_id) THEN
        INSERT INTO dashboard_widgets (supplier_id, widget_type, position_x, position_y, width, height, widget_config) VALUES
        (p_supplier_id, 'summary', 0, 0, 2, 1, '{"title": "Summary", "showMetrics": ["total_weddings", "active_weddings", "total_revenue"]}'),
        (p_supplier_id, 'upcoming_weddings', 2, 0, 2, 2, '{"title": "Upcoming Weddings", "limit": 5, "daysAhead": 30}'),
        (p_supplier_id, 'recent_activity', 0, 1, 2, 2, '{"title": "Recent Activity", "limit": 10}'),
        (p_supplier_id, 'tasks', 4, 0, 2, 1, '{"title": "Tasks Overview", "showTypes": ["overdue", "due_today", "upcoming"]}'),
        (p_supplier_id, 'messages', 4, 1, 2, 1, '{"title": "Recent Messages", "limit": 5, "unreadOnly": true}'),
        (p_supplier_id, 'revenue', 0, 3, 4, 1, '{"title": "Revenue Chart", "period": "month", "showComparison": true}');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Real-time functions for dashboard updates
CREATE OR REPLACE FUNCTION notify_dashboard_update()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'dashboard_update',
        json_build_object(
            'supplier_id', COALESCE(NEW.supplier_id, OLD.supplier_id),
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'timestamp', extract(epoch from now())
        )::text
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for real-time dashboard updates
CREATE OR REPLACE TRIGGER dashboard_realtime_weddings
    AFTER INSERT OR UPDATE OR DELETE ON weddings
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_update();

CREATE OR REPLACE TRIGGER dashboard_realtime_tasks
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_update();

CREATE OR REPLACE TRIGGER dashboard_realtime_messages
    AFTER INSERT OR UPDATE OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION notify_dashboard_update();

-- Performance optimization: Materialized view for dashboard metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics AS
SELECT 
    supplier_id,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_weddings,
    COUNT(*) as total_weddings,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_weddings_30d,
    AVG(budget) as avg_budget,
    SUM(CASE WHEN status = 'completed' THEN budget ELSE 0 END) as completed_revenue,
    MAX(created_at) as last_wedding_date,
    current_timestamp as last_updated
FROM weddings
GROUP BY supplier_id;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_metrics_supplier ON dashboard_metrics(supplier_id);

-- Function to refresh dashboard metrics
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permi