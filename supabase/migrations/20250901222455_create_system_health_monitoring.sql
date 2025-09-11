-- WS-227 System Health Monitoring
-- Migration: Create health monitoring tables and functions
-- Team B Backend Implementation
-- Created: 2025-09-01

-- Health check logs for service monitoring
CREATE TABLE IF NOT EXISTS health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  latency INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_health_checks_service ON health_checks(service, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_service_status ON health_checks(service, status, checked_at DESC);

-- System metrics for performance tracking
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  value DECIMAL NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for metrics queries
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type_recorded ON system_metrics(metric_type, recorded_at);

-- Alert thresholds configuration table
CREATE TABLE IF NOT EXISTS health_alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  threshold_type TEXT NOT NULL CHECK (threshold_type IN ('min', 'max', 'eq', 'ne')),
  threshold_value DECIMAL NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for threshold lookups
CREATE INDEX IF NOT EXISTS idx_health_thresholds_service ON health_alert_thresholds(service, is_enabled);

-- Alert history for tracking notifications
CREATE TABLE IF NOT EXISTS health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  alert_message TEXT NOT NULL,
  current_value DECIMAL,
  threshold_value DECIMAL,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Index for alert queries
CREATE INDEX IF NOT EXISTS idx_health_alerts_service ON health_alerts(service, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_alerts_unresolved ON health_alerts(is_resolved, created_at DESC) WHERE is_resolved = FALSE;

-- Row Level Security (RLS) policies
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated admin users can access health monitoring data
CREATE POLICY "Health monitoring admin access" ON health_checks
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

CREATE POLICY "System metrics admin access" ON system_metrics
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

CREATE POLICY "Alert thresholds admin access" ON health_alert_thresholds
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

CREATE POLICY "Health alerts admin access" ON health_alerts
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'admin'
  );

-- Function to get error count for a service in the last 24 hours
CREATE OR REPLACE FUNCTION get_service_error_count_24h(service_name TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM health_checks
    WHERE service = service_name
    AND status IN ('degraded', 'down')
    AND checked_at >= NOW() - INTERVAL '24 hours'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest health status for a service
CREATE OR REPLACE FUNCTION get_latest_service_status(service_name TEXT)
RETURNS TABLE (
  status TEXT,
  latency INTEGER,
  last_check TIMESTAMPTZ,
  error_count_24h INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hc.status,
    hc.latency,
    hc.checked_at as last_check,
    get_service_error_count_24h(service_name) as error_count_24h
  FROM health_checks hc
  WHERE hc.service = service_name
  ORDER BY hc.checked_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old health check data (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_health_data()
RETURNS void AS $$
BEGIN
  -- Clean health checks older than 7 days
  DELETE FROM health_checks 
  WHERE checked_at < NOW() - INTERVAL '7 days';
  
  -- Clean system metrics older than 30 days
  DELETE FROM system_metrics 
  WHERE recorded_at < NOW() - INTERVAL '30 days';
  
  -- Clean resolved alerts older than 30 days
  DELETE FROM health_alerts 
  WHERE is_resolved = TRUE 
  AND resolved_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default alert thresholds for critical services
INSERT INTO health_alert_thresholds (service, metric_type, threshold_type, threshold_value, severity, is_enabled) VALUES
-- Database response time thresholds
('database', 'latency', 'max', 1000, 'medium', true),
('database', 'latency', 'max', 5000, 'high', true),
('database', 'latency', 'max', 10000, 'critical', true),

-- Redis response time thresholds
('redis', 'latency', 'max', 100, 'medium', true),
('redis', 'latency', 'max', 500, 'high', true),
('redis', 'latency', 'max', 1000, 'critical', true),

-- Supabase service thresholds
('supabase', 'latency', 'max', 2000, 'medium', true),
('supabase', 'latency', 'max', 5000, 'high', true),

-- Email service thresholds
('email', 'latency', 'max', 5000, 'medium', true),
('email', 'latency', 'max', 10000, 'high', true),

-- SMS service thresholds
('sms', 'latency', 'max', 3000, 'medium', true),
('sms', 'latency', 'max', 8000, 'high', true),

-- API performance thresholds
('api', 'error_rate', 'max', 5, 'medium', true),
('api', 'error_rate', 'max', 10, 'high', true),
('api', 'error_rate', 'max', 20, 'critical', true),
('api', 'p95_response_time', 'max', 500, 'medium', true),
('api', 'p95_response_time', 'max', 1000, 'high', true),

-- Infrastructure thresholds
('infrastructure', 'cpu_usage', 'max', 80, 'medium', true),
('infrastructure', 'cpu_usage', 'max', 90, 'high', true),
('infrastructure', 'cpu_usage', 'max', 95, 'critical', true),
('infrastructure', 'memory_usage', 'max', 85, 'medium', true),
('infrastructure', 'memory_usage', 'max', 90, 'high', true),
('infrastructure', 'memory_usage', 'max', 95, 'critical', true),
('infrastructure', 'disk_space', 'max', 80, 'medium', true),
('infrastructure', 'disk_space', 'max', 90, 'high', true),
('infrastructure', 'disk_space', 'max', 95, 'critical', true)
ON CONFLICT DO NOTHING;

-- Grant permissions for health monitoring functions
GRANT EXECUTE ON FUNCTION get_service_error_count_24h(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_service_status(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_health_data() TO authenticated;

-- Comment on tables for documentation
COMMENT ON TABLE health_checks IS 'WS-227: Stores health check results for all system services';
COMMENT ON TABLE system_metrics IS 'WS-227: Stores performance metrics for system monitoring';
COMMENT ON TABLE health_alert_thresholds IS 'WS-227: Configuration for alert thresholds';
COMMENT ON TABLE health_alerts IS 'WS-227: History of triggered health alerts';

-- Create view for current service status
CREATE OR REPLACE VIEW current_service_status AS
SELECT DISTINCT ON (service)
  service,
  status,
  latency,
  checked_at as last_check,
  get_service_error_count_24h(service) as error_count_24h
FROM health_checks
ORDER BY service, checked_at DESC;

-- Grant access to the view
GRANT SELECT ON current_service_status TO authenticated;

COMMENT ON VIEW current_service_status IS 'WS-227: Latest status for all monitored services';