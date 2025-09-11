-- Database Health Monitoring System Migration
-- WS-234: Real-time database health monitoring with wedding season optimizations
-- Created: 2025-09-02

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Database health monitoring tables
CREATE TABLE IF NOT EXISTS database_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL, -- 'connection_pool', 'storage', 'query_performance', 'locks'
  metric_name TEXT NOT NULL,
  current_value DECIMAL NOT NULL,
  threshold_warning DECIMAL,
  threshold_critical DECIMAL,
  status TEXT NOT NULL DEFAULT 'healthy', -- 'healthy', 'warning', 'critical'
  details JSONB,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query performance tracking
CREATE TABLE IF NOT EXISTS database_query_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  execution_count INTEGER DEFAULT 0,
  total_time_ms DECIMAL NOT NULL,
  avg_time_ms DECIMAL NOT NULL,
  max_time_ms DECIMAL NOT NULL,
  min_time_ms DECIMAL NOT NULL,
  last_execution TIMESTAMPTZ DEFAULT NOW(),
  optimization_suggestions JSONB,
  status TEXT DEFAULT 'active', -- 'active', 'optimized', 'flagged'
  is_wedding_related BOOLEAN DEFAULT FALSE, -- Tracks queries related to forms, journeys, emails
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Database maintenance log
CREATE TABLE IF NOT EXISTS database_maintenance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_type TEXT NOT NULL, -- 'vacuum', 'reindex', 'analyze', 'cleanup'
  target_table TEXT,
  target_index TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  before_stats JSONB,
  after_stats JSONB,
  space_reclaimed_bytes BIGINT DEFAULT 0,
  error_message TEXT,
  initiated_by TEXT, -- 'auto', 'admin', 'alert_system'
  wedding_season_context BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index health tracking
CREATE TABLE IF NOT EXISTS database_index_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  index_name TEXT NOT NULL,
  index_size_bytes BIGINT NOT NULL,
  usage_count BIGINT DEFAULT 0,
  last_used TIMESTAMPTZ,
  bloat_percentage DECIMAL,
  recommendation TEXT, -- 'drop_unused', 'rebuild_bloated', 'optimize', 'keep'
  is_primary_key BOOLEAN DEFAULT FALSE,
  is_unique BOOLEAN DEFAULT FALSE,
  wedding_table_context BOOLEAN DEFAULT FALSE, -- Tracks indexes on wedding-critical tables
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connection pool monitoring
CREATE TABLE IF NOT EXISTS database_connection_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_connections INTEGER NOT NULL,
  idle_connections INTEGER NOT NULL,
  idle_in_transaction INTEGER DEFAULT 0,
  waiting_connections INTEGER DEFAULT 0,
  total_connections INTEGER NOT NULL,
  max_connections INTEGER NOT NULL,
  utilization_percentage DECIMAL NOT NULL,
  wedding_season_adjusted BOOLEAN DEFAULT FALSE,
  peak_detected BOOLEAN DEFAULT FALSE,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage usage tracking
CREATE TABLE IF NOT EXISTS database_storage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_size_bytes BIGINT NOT NULL,
  used_size_bytes BIGINT NOT NULL,
  available_size_bytes BIGINT NOT NULL,
  percentage_used DECIMAL NOT NULL,
  largest_tables JSONB, -- Array of {table_name, size_bytes, percentage}
  growth_rate_mb_per_day DECIMAL,
  projected_full_date DATE,
  wedding_data_percentage DECIMAL, -- Percentage used by wedding-related tables
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lock contention monitoring
CREATE TABLE IF NOT EXISTS database_lock_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocking_queries INTEGER DEFAULT 0,
  blocked_queries INTEGER DEFAULT 0,
  total_locks INTEGER DEFAULT 0,
  lock_types JSONB, -- Breakdown of lock types
  longest_wait_ms DECIMAL,
  blocking_query_details JSONB,
  wedding_critical_locks INTEGER DEFAULT 0, -- Locks affecting wedding-critical operations
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_health_metrics_type_status ON database_health_metrics(metric_type, status, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_metrics_status_time ON database_health_metrics(status, measured_at DESC) WHERE status != 'healthy';
CREATE INDEX IF NOT EXISTS idx_query_stats_performance ON database_query_stats(avg_time_ms DESC, execution_count DESC);
CREATE INDEX IF NOT EXISTS idx_query_stats_wedding ON database_query_stats(is_wedding_related, avg_time_ms DESC) WHERE is_wedding_related = TRUE;
CREATE INDEX IF NOT EXISTS idx_maintenance_log_status ON database_maintenance_log(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_log_type ON database_maintenance_log(maintenance_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_index_health_recommendation ON database_index_health(recommendation, bloat_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_index_health_wedding ON database_index_health(wedding_table_context, bloat_percentage DESC) WHERE wedding_table_context = TRUE;
CREATE INDEX IF NOT EXISTS idx_connection_stats_time ON database_connection_stats(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_stats_time ON database_storage_stats(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_lock_stats_time ON database_lock_stats(measured_at DESC);

-- Create updated_at triggers for timestamp management
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_database_health_metrics_updated_at BEFORE UPDATE ON database_health_metrics FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_database_query_stats_updated_at BEFORE UPDATE ON database_query_stats FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_database_maintenance_log_updated_at BEFORE UPDATE ON database_maintenance_log FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_database_index_health_updated_at BEFORE UPDATE ON database_index_health FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create RLS policies for admin access only
ALTER TABLE database_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_query_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_maintenance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_index_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_connection_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_storage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_lock_stats ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY database_health_admin_policy ON database_health_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY database_query_admin_policy ON database_query_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY database_maintenance_admin_policy ON database_maintenance_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY database_index_admin_policy ON database_index_health
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY database_connection_admin_policy ON database_connection_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY database_storage_admin_policy ON database_storage_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY database_lock_admin_policy ON database_lock_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Create helper functions for health monitoring

-- Function to detect wedding season
CREATE OR REPLACE FUNCTION is_wedding_season()
RETURNS BOOLEAN AS $$
BEGIN
  -- Peak wedding months: May, June, July, September, October
  RETURN EXTRACT(MONTH FROM CURRENT_DATE) IN (5, 6, 7, 9, 10);
END;
$$ LANGUAGE plpgsql;

-- Function to get wedding season multiplier for thresholds
CREATE OR REPLACE FUNCTION get_wedding_season_multiplier()
RETURNS DECIMAL AS $$
DECLARE
  current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
BEGIN
  -- Wedding season multipliers for threshold adjustments
  CASE current_month
    WHEN 5 THEN RETURN 1.4;  -- May
    WHEN 6 THEN RETURN 1.6;  -- June (peak)
    WHEN 7 THEN RETURN 1.5;  -- July
    WHEN 9 THEN RETURN 1.3;  -- September
    WHEN 10 THEN RETURN 1.4; -- October
    ELSE RETURN 1.0;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to identify wedding-critical tables
CREATE OR REPLACE FUNCTION is_wedding_critical_table(table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN table_name IN (
    'form_responses', 'form_fields', 'forms',
    'journey_events', 'journey_instances', 'journeys',
    'email_logs', 'email_templates', 'email_campaigns',
    'clients', 'organizations', 'user_profiles',
    'payment_history', 'invoices', 'webhook_events'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to clean old health metrics (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_health_metrics()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Keep detailed metrics for 7 days, summary for 30 days
  DELETE FROM database_health_metrics 
  WHERE measured_at < NOW() - INTERVAL '7 days'
    AND status = 'healthy';
    
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  DELETE FROM database_query_stats
  WHERE last_execution < NOW() - INTERVAL '30 days'
    AND status = 'active';
    
  DELETE FROM database_connection_stats
  WHERE measured_at < NOW() - INTERVAL '7 days';
    
  DELETE FROM database_storage_stats
  WHERE measured_at < NOW() - INTERVAL '30 days';
    
  DELETE FROM database_lock_stats
  WHERE measured_at < NOW() - INTERVAL '7 days';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup function to run daily
SELECT cron.schedule('cleanup-health-metrics', '0 2 * * *', 'SELECT cleanup_old_health_metrics();');

-- Create views for easy monitoring

-- Overall health status view
CREATE OR REPLACE VIEW v_database_health_overview AS
SELECT 
  'overall' as component,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = 'critical') > 0 THEN 'critical'
    WHEN COUNT(*) FILTER (WHERE status = 'warning') > 0 THEN 'warning'
    ELSE 'healthy'
  END as status,
  COUNT(*) FILTER (WHERE status = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE status = 'warning') as warning_count,
  COUNT(*) FILTER (WHERE status = 'healthy') as healthy_count,
  MAX(measured_at) as last_check,
  is_wedding_season() as wedding_season_active,
  get_wedding_season_multiplier() as season_multiplier
FROM database_health_metrics
WHERE measured_at > NOW() - INTERVAL '5 minutes';

-- Wedding-specific performance view
CREATE OR REPLACE VIEW v_wedding_performance_impact AS
SELECT 
  COUNT(*) FILTER (WHERE is_wedding_related = TRUE) as wedding_queries,
  AVG(avg_time_ms) FILTER (WHERE is_wedding_related = TRUE) as avg_wedding_query_time,
  MAX(max_time_ms) FILTER (WHERE is_wedding_related = TRUE) as max_wedding_query_time,
  COUNT(*) FILTER (WHERE is_wedding_related = TRUE AND avg_time_ms > 1000) as slow_wedding_queries,
  ROUND(
    (COUNT(*) FILTER (WHERE is_wedding_related = TRUE AND avg_time_ms > 1000)::DECIMAL / 
     NULLIF(COUNT(*) FILTER (WHERE is_wedding_related = TRUE), 0)) * 100, 2
  ) as wedding_query_slowness_percentage
FROM database_query_stats
WHERE status = 'active';

-- Comment for documentation
COMMENT ON TABLE database_health_metrics IS 'Real-time database health monitoring with wedding season adjustments';
COMMENT ON TABLE database_query_stats IS 'Query performance tracking with wedding-specific optimizations';
COMMENT ON TABLE database_maintenance_log IS 'Automated and manual database maintenance operations';
COMMENT ON TABLE database_index_health IS 'Index usage and optimization recommendations';
COMMENT ON FUNCTION is_wedding_season() IS 'Determines if current date is in peak wedding season';
COMMENT ON FUNCTION get_wedding_season_multiplier() IS 'Returns threshold multiplier for wedding season';
COMMENT ON VIEW v_database_health_overview IS 'Overall database health status with wedding context';
COMMENT ON VIEW v_wedding_performance_impact IS 'Wedding-specific query performance metrics';