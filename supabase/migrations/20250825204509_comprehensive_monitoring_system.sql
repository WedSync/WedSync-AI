-- ===============================================
-- Comprehensive Monitoring System Migration
-- Team D: Database & Performance Monitoring
-- ===============================================

-- Performance Monitoring Tables
CREATE TABLE IF NOT EXISTS monitoring_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monitoring_events_type ON monitoring_events(event_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_severity ON monitoring_events(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_created ON monitoring_events(created_at DESC);

-- RLS Policies for monitoring_events
ALTER TABLE monitoring_events ENABLE ROW LEVEL SECURITY;

-- Only admins can access monitoring events
CREATE POLICY "Admin access to monitoring events" ON monitoring_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Query Performance View (requires pg_stat_statements extension)
CREATE OR REPLACE VIEW monitoring_slow_queries AS
SELECT 
  query,
  calls,
  mean_exec_time as avg_ms,
  max_exec_time as max_ms,
  total_exec_time as total_ms,
  CASE 
    WHEN sum(total_exec_time) OVER () > 0 THEN
      ROUND((100.0 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2)
    ELSE 0
  END as percentage
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Connection Pool Monitoring
CREATE OR REPLACE VIEW monitoring_connections AS
SELECT 
  state,
  application_name,
  count(*) as count,
  max(EXTRACT(EPOCH FROM (now() - state_change))::integer) as max_duration_seconds
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid != pg_backend_pid() -- Exclude current connection
GROUP BY state, application_name
ORDER BY count DESC;

-- Table Health Monitoring
CREATE OR REPLACE VIEW monitoring_table_health AS
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserted_rows,
  n_tup_upd as updated_rows,
  n_tup_del as deleted_rows,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  CASE 
    WHEN (n_live_tup + n_dead_tup) > 0 THEN
      ROUND((100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0))::numeric, 2)
    ELSE 0
  END as dead_percentage,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

-- RLS Policy Check
CREATE OR REPLACE VIEW monitoring_rls_status AS
SELECT 
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status,
  (SELECT count(*) FROM pg_policies p WHERE p.tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

-- Database Size and Growth Monitoring
CREATE OR REPLACE VIEW monitoring_database_stats AS
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as database_size,
  (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
  (SELECT setting::integer FROM pg_settings WHERE name = 'max_connections') as max_connections,
  now() as last_updated;

-- Wedding-Specific Performance Monitoring
CREATE OR REPLACE VIEW monitoring_wedding_performance AS
SELECT 
  'Active Weddings' as metric,
  count(*) as value,
  'weddings' as unit
FROM clients c
JOIN user_profiles up ON c.user_id = up.id
WHERE c.wedding_date >= CURRENT_DATE
  AND c.wedding_date <= CURRENT_DATE + INTERVAL '12 months'

UNION ALL

SELECT 
  'Critical Weddings (Next 7 Days)' as metric,
  count(*) as value,
  'weddings' as unit
FROM clients c
JOIN user_profiles up ON c.user_id = up.id
WHERE c.wedding_date >= CURRENT_DATE
  AND c.wedding_date <= CURRENT_DATE + INTERVAL '7 days'

UNION ALL

SELECT 
  'Wedding Day Today' as metric,
  count(*) as value,
  'weddings' as unit
FROM clients c
JOIN user_profiles up ON c.user_id = up.id
WHERE c.wedding_date = CURRENT_DATE;

-- Function to log monitoring events
CREATE OR REPLACE FUNCTION log_monitoring_event(
  p_event_type VARCHAR,
  p_severity VARCHAR,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO monitoring_events (event_type, severity, message, metadata)
  VALUES (p_event_type, p_severity, p_message, p_metadata)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get wedding criticality level
CREATE OR REPLACE FUNCTION get_wedding_criticality(wedding_date DATE)
RETURNS VARCHAR AS $$
BEGIN
  CASE 
    WHEN wedding_date = CURRENT_DATE THEN
      RETURN 'CRITICAL_TODAY';
    WHEN wedding_date <= CURRENT_DATE + INTERVAL '1 day' THEN
      RETURN 'CRITICAL_24H';
    WHEN wedding_date <= CURRENT_DATE + INTERVAL '7 days' THEN
      RETURN 'HIGH_PRIORITY';
    WHEN wedding_date <= CURRENT_DATE + INTERVAL '30 days' THEN
      RETURN 'MEDIUM_PRIORITY';
    ELSE
      RETURN 'LOW_PRIORITY';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Performance monitoring function for API endpoints
CREATE OR REPLACE FUNCTION track_api_performance(
  p_endpoint VARCHAR,
  p_method VARCHAR,
  p_response_time_ms INTEGER,
  p_status_code INTEGER,
  p_user_id UUID DEFAULT NULL,
  p_wedding_date DATE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
  v_metadata JSONB;
  v_severity VARCHAR;
  v_criticality VARCHAR;
BEGIN
  -- Determine severity based on response time and status
  IF p_status_code >= 500 THEN
    v_severity := 'error';
  ELSIF p_status_code >= 400 THEN
    v_severity := 'warning';
  ELSIF p_response_time_ms > 2000 THEN
    v_severity := 'warning';
  ELSE
    v_severity := 'info';
  END IF;

  -- Build metadata
  v_metadata := jsonb_build_object(
    'endpoint', p_endpoint,
    'method', p_method,
    'response_time_ms', p_response_time_ms,
    'status_code', p_status_code,
    'user_id', p_user_id
  );

  -- Add wedding criticality if wedding date provided
  IF p_wedding_date IS NOT NULL THEN
    v_criticality := get_wedding_criticality(p_wedding_date);
    v_metadata := v_metadata || jsonb_build_object('wedding_criticality', v_criticality);
    
    -- Escalate severity for critical weddings
    IF v_criticality IN ('CRITICAL_TODAY', 'CRITICAL_24H') AND v_severity = 'warning' THEN
      v_severity := 'error';
    END IF;
  END IF;

  -- Log the event
  v_event_id := log_monitoring_event(
    'api_performance',
    v_severity,
    format('API %s %s responded in %sms with status %s', p_method, p_endpoint, p_response_time_ms, p_status_code),
    v_metadata
  );

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log slow queries
CREATE OR REPLACE FUNCTION log_slow_query_trigger()
RETURNS event_trigger AS $$
BEGIN
  -- This is a placeholder for query monitoring
  -- In production, this would integrate with pg_stat_statements
  PERFORM log_monitoring_event(
    'slow_query',
    'warning',
    'Slow query detected',
    jsonb_build_object('trigger_event', tg_tag)
  );
END;
$$ LANGUAGE plpgsql;

-- Enable necessary extensions for monitoring
-- Note: These may need to be enabled by superuser
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create a view for recent monitoring events (last 24 hours)
CREATE OR REPLACE VIEW monitoring_recent_events AS
SELECT 
  id,
  event_type,
  severity,
  message,
  metadata,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds
FROM monitoring_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- Wedding Day Emergency Monitoring View
CREATE OR REPLACE VIEW monitoring_wedding_day_critical AS
SELECT 
  c.id as client_id,
  c.wedding_date,
  up.email as client_email,
  up.full_name as client_name,
  get_wedding_criticality(c.wedding_date) as criticality_level,
  EXTRACT(EPOCH FROM (c.wedding_date - CURRENT_DATE)) / 86400 as days_until_wedding,
  -- Check for recent errors related to this client
  (SELECT count(*) FROM monitoring_events me 
   WHERE me.metadata->>'user_id' = c.user_id::text 
   AND me.severity IN ('error', 'warning')
   AND me.created_at >= NOW() - INTERVAL '1 hour') as recent_errors
FROM clients c
JOIN user_profiles up ON c.user_id = up.id
WHERE c.wedding_date >= CURRENT_DATE
  AND c.wedding_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY c.wedding_date ASC;

-- Grant permissions to service role (for API access)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL VIEWS IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Grant permissions to authenticated users (limited)
GRANT SELECT ON monitoring_recent_events TO authenticated;
GRANT SELECT ON monitoring_wedding_performance TO authenticated;

-- Insert initial monitoring event
INSERT INTO monitoring_events (event_type, severity, message, metadata)
VALUES (
  'system_initialization',
  'info',
  'Comprehensive monitoring system initialized',
  jsonb_build_object(
    'migration_version', '20250825204509',
    'initialized_at', NOW(),
    'features', jsonb_build_array(
      'database_monitoring',
      'performance_tracking', 
      'wedding_criticality',
      'slow_query_detection',
      'connection_monitoring'
    )
  )
);