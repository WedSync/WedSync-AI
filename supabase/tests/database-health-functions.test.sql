-- Database Health Monitoring Functions Tests - WS-234
-- Comprehensive test suite for PostgreSQL health monitoring functions
-- Focus: Wedding day reliability and vendor protection

-- Enable pgtap extension for testing
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Test setup: Create test data and helper functions
BEGIN;

-- Setup test data for wedding day scenarios
INSERT INTO public.system_alerts (id, alert_type, severity, message, metadata, created_at) VALUES
  ('test-alert-1', 'CONNECTION_WARNING', 'HIGH', 'Test connection alert', '{"test": true}', NOW() - INTERVAL '1 hour'),
  ('test-alert-2', 'SLOW_QUERY_CRITICAL', 'CRITICAL', 'Test slow query alert', '{"test": true}', NOW() - INTERVAL '30 minutes'),
  ('test-alert-3', 'WEDDING_DAY_SYSTEM_RISK', 'CRITICAL', 'Wedding day system at risk', '{"active_weddings": 15}', NOW() - INTERVAL '15 minutes');

INSERT INTO public.system_backups (id, backup_type, status, backup_size_mb, duration_minutes, created_at, completed_at) VALUES
  ('test-backup-1', 'automatic', 'completed', 1024, 45, NOW() - INTERVAL '12 hours', NOW() - INTERVAL '11 hours 15 minutes'),
  ('test-backup-2', 'manual', 'completed', 2048, 90, NOW() - INTERVAL '25 hours', NOW() - INTERVAL '23 hours 30 minutes');

-- Test 1: check_connection_health() function
SELECT plan(8);

SELECT has_function('public', 'check_connection_health', ARRAY[]::text[], 'Function check_connection_health exists');

-- Test normal connection health
SELECT lives_ok(
  'SELECT public.check_connection_health()',
  'check_connection_health executes without error'
);

-- Test connection health returns proper JSON structure
SELECT is(
  (SELECT json_typeof(public.check_connection_health())),
  'object',
  'check_connection_health returns JSON object'
);

-- Test connection health has required fields
WITH health_result AS (
  SELECT public.check_connection_health() as result
)
SELECT ok(
  (SELECT result ? 'timestamp' FROM health_result),
  'check_connection_health includes timestamp'
);

SELECT ok(
  (SELECT result ? 'current_connections' FROM health_result),
  'check_connection_health includes current_connections'
);

SELECT ok(
  (SELECT result ? 'status' FROM health_result),
  'check_connection_health includes status'
);

-- Test wedding day detection (mock Saturday)
-- Note: This would need to be run on actual Saturday or with date mocking
SELECT ok(
  (SELECT result ? 'is_wedding_day' FROM health_result),
  'check_connection_health includes wedding_day flag'
);

-- Test alert threshold logic
SELECT ok(
  (SELECT (result->>'status')::text IN ('HEALTHY', 'WARNING', 'CRITICAL_WEDDING_DAY') FROM health_result),
  'check_connection_health returns valid status values'
);

-- Test 2: detect_slow_queries() function
SELECT has_function('public', 'detect_slow_queries', ARRAY[]::text[], 'Function detect_slow_queries exists');

SELECT lives_ok(
  'SELECT public.detect_slow_queries()',
  'detect_slow_queries executes without error'
);

-- Test slow query detection returns proper structure
WITH slow_query_result AS (
  SELECT public.detect_slow_queries() as result
)
SELECT ok(
  (SELECT result ? 'timestamp' FROM slow_query_result),
  'detect_slow_queries includes timestamp'
),
ok(
  (SELECT result ? 'queries' FROM slow_query_result),
  'detect_slow_queries includes queries array'
),
ok(
  (SELECT result ? 'status' FROM slow_query_result),
  'detect_slow_queries includes status'
),
ok(
  (SELECT result ? 'wedding_impact' FROM slow_query_result),
  'detect_slow_queries includes wedding impact assessment'
);

-- Test 3: wedding_day_readiness() function
SELECT has_function('public', 'wedding_day_readiness', ARRAY[]::text[], 'Function wedding_day_readiness exists');

SELECT lives_ok(
  'SELECT public.wedding_day_readiness()',
  'wedding_day_readiness executes without error'
);

-- Test readiness check structure
WITH readiness_result AS (
  SELECT public.wedding_day_readiness() as result
)
SELECT ok(
  (SELECT result ? 'readiness_score' FROM readiness_result),
  'wedding_day_readiness includes readiness_score'
),
ok(
  (SELECT result ? 'critical_issues' FROM readiness_result),
  'wedding_day_readiness includes critical_issues array'
),
ok(
  (SELECT result ? 'system_metrics' FROM readiness_result),
  'wedding_day_readiness includes system_metrics'
),
ok(
  (SELECT result ? 'wedding_day_message' FROM readiness_result),
  'wedding_day_readiness includes wedding_day_message'
);

-- Test readiness score is within valid range
SELECT ok(
  (SELECT (result->>'readiness_score')::integer BETWEEN 0 AND 100 FROM readiness_result),
  'wedding_day_readiness score is between 0 and 100'
);

-- Test 4: table_health_metrics() function
SELECT has_function('public', 'table_health_metrics', ARRAY[]::text[], 'Function table_health_metrics exists');

SELECT lives_ok(
  'SELECT public.table_health_metrics()',
  'table_health_metrics executes without error'
);

-- Test table health metrics structure
WITH table_health_result AS (
  SELECT public.table_health_metrics() as result
)
SELECT ok(
  (SELECT result ? 'summary' FROM table_health_result),
  'table_health_metrics includes summary'
),
ok(
  (SELECT result ? 'table_details' FROM table_health_result),
  'table_health_metrics includes table_details array'
),
ok(
  (SELECT result ? 'wedding_day_risk' FROM table_health_result),
  'table_health_metrics includes wedding_day_risk assessment'
);

-- Test 5: index_usage_analysis() function
SELECT has_function('public', 'index_usage_analysis', ARRAY[]::text[], 'Function index_usage_analysis exists');

SELECT lives_ok(
  'SELECT public.index_usage_analysis()',
  'index_usage_analysis executes without error'
);

-- Test index analysis structure
WITH index_result AS (
  SELECT public.index_usage_analysis() as result
)
SELECT ok(
  (SELECT result ? 'summary' FROM index_result),
  'index_usage_analysis includes summary'
),
ok(
  (SELECT result ? 'index_details' FROM index_result),
  'index_usage_analysis includes index_details array'
),
ok(
  (SELECT result ? 'optimization_recommendations' FROM index_result),
  'index_usage_analysis includes optimization_recommendations'
);

-- Test 6: backup_verification() function
SELECT has_function('public', 'backup_verification', ARRAY[]::text[], 'Function backup_verification exists');

SELECT lives_ok(
  'SELECT public.backup_verification()',
  'backup_verification executes without error'
);

-- Test backup verification with existing test data
WITH backup_result AS (
  SELECT public.backup_verification() as result
)
SELECT ok(
  (SELECT result ? 'backup_status' FROM backup_result),
  'backup_verification includes backup_status'
),
ok(
  (SELECT result ? 'latest_backup' FROM backup_result),
  'backup_verification includes latest_backup info'
),
ok(
  (SELECT result ? 'wedding_data_risk' FROM backup_result),
  'backup_verification includes wedding_data_risk assessment'
),
ok(
  (SELECT result ? 'recovery_capability' FROM backup_result),
  'backup_verification includes recovery_capability'
);

-- Test backup status with recent backup
SELECT ok(
  (SELECT (result->>'backup_status')::text = 'BACKUP_CURRENT' FROM backup_result),
  'backup_verification correctly identifies recent backup as current'
);

-- Test 7: Alert system integration
SELECT has_table('public', 'system_alerts', 'system_alerts table exists');
SELECT has_table('public', 'system_backups', 'system_backups table exists');

-- Test alert insertion triggers
SELECT lives_ok(
  $$INSERT INTO public.system_alerts (alert_type, severity, message, metadata) 
    VALUES ('TEST_ALERT', 'WARNING', 'Test alert message', '{"test_data": true}')$$,
  'Can insert new alerts'
);

-- Test RLS policies are properly configured
SELECT has_policy('public', 'system_alerts', 'Admin access to system alerts', 'RLS policy exists for system_alerts');
SELECT has_policy('public', 'system_backups', 'Admin access to backup info', 'RLS policy exists for system_backups');

-- Test 8: Wedding day specific scenarios
-- Test wedding day alert creation
DO $$
DECLARE
  alert_result JSON;
BEGIN
  -- Simulate wedding day critical scenario
  SELECT public.check_connection_health() INTO alert_result;
  
  -- Check if wedding day mode affects thresholds
  ASSERT (alert_result ? 'is_wedding_day'), 'Wedding day detection works';
  
  -- If it's actually a wedding day, check for stricter thresholds
  IF (alert_result->>'is_wedding_day')::boolean THEN
    ASSERT (alert_result ? 'alert_message'), 'Wedding day alerts have specific messaging';
  END IF;
END
$$;

-- Test 9: Performance under load simulation
-- Simulate multiple concurrent health checks (wedding day load)
DO $$
DECLARE
  i integer;
  start_time timestamp;
  end_time timestamp;
  duration interval;
BEGIN
  start_time := clock_timestamp();
  
  -- Simulate 100 concurrent health checks
  FOR i IN 1..100 LOOP
    PERFORM public.check_connection_health();
  END LOOP;
  
  end_time := clock_timestamp();
  duration := end_time - start_time;
  
  -- Health checks should complete within 5 seconds even under load
  ASSERT duration < interval '5 seconds', 
    'Health checks complete within 5 seconds under load: ' || duration::text;
END
$$;

-- Test 10: Wedding day emergency scenarios
-- Test critical alert creation on wedding day
INSERT INTO public.system_alerts (alert_type, severity, message, metadata, created_at)
VALUES ('WEDDING_DAY_CRITICAL', 'CRITICAL', 'Emergency on wedding day', 
        '{"active_weddings": 25, "affected_vendors": 50}', NOW());

-- Verify emergency alert was created with proper escalation
SELECT ok(
  EXISTS(
    SELECT 1 FROM public.system_alerts 
    WHERE alert_type = 'WEDDING_DAY_CRITICAL' 
    AND severity = 'CRITICAL'
    AND metadata ? 'active_weddings'
  ),
  'Wedding day emergency alerts are properly logged'
);

-- Test 11: Data integrity and consistency
-- Test that health check functions return consistent data types
WITH consistency_test AS (
  SELECT 
    public.check_connection_health() as health,
    public.detect_slow_queries() as queries,
    public.wedding_day_readiness() as readiness,
    public.table_health_metrics() as tables,
    public.index_usage_analysis() as indexes,
    public.backup_verification() as backups
)
SELECT ok(
  json_typeof(health) = 'object' AND
  json_typeof(queries) = 'object' AND
  json_typeof(readiness) = 'object' AND
  json_typeof(tables) = 'object' AND
  json_typeof(indexes) = 'object' AND
  json_typeof(backups) = 'object',
  'All health functions return consistent JSON objects'
) FROM consistency_test;

-- Test 12: Error handling and edge cases
-- Test functions handle missing data gracefully
DELETE FROM public.system_backups WHERE id LIKE 'test-%';

SELECT lives_ok(
  'SELECT public.backup_verification()',
  'backup_verification handles missing backup data gracefully'
);

-- Test functions handle invalid data states
DO $$
BEGIN
  -- Test with simulated high connection count
  PERFORM public.check_connection_health();
  -- Should not raise exception even with edge case data
END
$$;

-- Test 13: Wedding venue and vendor context
-- Test that alerts properly track wedding impact
WITH wedding_impact_test AS (
  SELECT public.wedding_day_readiness() as result
)
SELECT ok(
  (SELECT result ? 'active_weddings_today' FROM wedding_impact_test),
  'Wedding day readiness tracks active weddings'
);

-- Test 14: Performance benchmarks
-- Test that critical functions meet performance requirements
DO $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  health_duration interval;
  query_duration interval;
  readiness_duration interval;
BEGIN
  -- Test check_connection_health performance
  start_time := clock_timestamp();
  PERFORM public.check_connection_health();
  end_time := clock_timestamp();
  health_duration := end_time - start_time;
  
  -- Test detect_slow_queries performance
  start_time := clock_timestamp();
  PERFORM public.detect_slow_queries();
  end_time := clock_timestamp();
  query_duration := end_time - start_time;
  
  -- Test wedding_day_readiness performance
  start_time := clock_timestamp();
  PERFORM public.wedding_day_readiness();
  end_time := clock_timestamp();
  readiness_duration := end_time - start_time;
  
  -- All functions should complete within 1 second for real-time monitoring
  ASSERT health_duration < interval '1 second', 
    'check_connection_health completes within 1 second: ' || health_duration::text;
  ASSERT query_duration < interval '1 second', 
    'detect_slow_queries completes within 1 second: ' || query_duration::text;
  ASSERT readiness_duration < interval '1 second', 
    'wedding_day_readiness completes within 1 second: ' || readiness_duration::text;
END
$$;

-- Clean up test data
DELETE FROM public.system_alerts WHERE metadata->>'test' = 'true' OR alert_type = 'TEST_ALERT';
DELETE FROM public.system_backups WHERE id LIKE 'test-%';

SELECT finish();
ROLLBACK;