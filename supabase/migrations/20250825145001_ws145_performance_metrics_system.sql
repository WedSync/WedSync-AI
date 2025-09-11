-- WS-145: Performance Optimization Targets Implementation
-- Performance metrics collection tables for Core Web Vitals and bundle statistics

-- Drop existing tables if they exist
DROP TABLE IF EXISTS performance_alerts CASCADE;
DROP TABLE IF EXISTS performance_sessions CASCADE;
DROP TABLE IF EXISTS bundle_statistics CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;

-- Performance metrics table for Core Web Vitals
CREATE TABLE performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  page_path TEXT NOT NULL,
  url TEXT,
  
  -- Core Web Vitals scores
  lcp_score NUMERIC,      -- Largest Contentful Paint
  fid_score NUMERIC,      -- First Input Delay
  cls_score NUMERIC,      -- Cumulative Layout Shift
  ttfb_score NUMERIC,     -- Time to First Byte
  inp_score NUMERIC,      -- Interaction to Next Paint
  fcp_score NUMERIC,      -- First Contentful Paint
  
  -- Additional metrics
  load_time_ms INTEGER,
  bundle_size INTEGER,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  connection_type TEXT,
  user_agent TEXT,
  overall_rating TEXT CHECK (overall_rating IN ('good', 'needs-improvement', 'poor')),
  
  -- Tracking fields
  session_id TEXT,
  metric_id TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  INDEX idx_performance_metrics_user_id (user_id),
  INDEX idx_performance_metrics_page_path (page_path),
  INDEX idx_performance_metrics_recorded_at (recorded_at DESC),
  INDEX idx_performance_metrics_device_type (device_type),
  INDEX idx_performance_metrics_session_id (session_id)
);

-- Bundle statistics table
CREATE TABLE bundle_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  page_path TEXT NOT NULL,
  
  -- Bundle sizes in bytes
  main_bundle_size INTEGER,
  vendor_bundle_size INTEGER,
  forms_bundle_size INTEGER,
  dashboard_bundle_size INTEGER,
  total_bundle_size INTEGER NOT NULL,
  
  -- Analysis data
  violations TEXT[],
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  build_id TEXT,
  
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_bundle_statistics_user_id (user_id),
  INDEX idx_bundle_statistics_page_path (page_path),
  INDEX idx_bundle_statistics_recorded_at (recorded_at DESC)
);

-- Performance alerts table
CREATE TABLE performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Alert details
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  severity TEXT CHECK (severity IN ('warning', 'critical')) NOT NULL,
  
  -- Context
  page_path TEXT,
  url TEXT,
  device_type TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'ignored')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_performance_alerts_user_id (user_id),
  INDEX idx_performance_alerts_status (status),
  INDEX idx_performance_alerts_severity (severity),
  INDEX idx_performance_alerts_triggered_at (triggered_at DESC)
);

-- Performance sessions table for aggregated session data
CREATE TABLE performance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  
  -- Session metrics summary
  metrics_summary JSONB,
  bundle_stats JSONB,
  alerts JSONB,
  
  -- Session info
  session_duration INTEGER,
  url TEXT,
  pages_visited INTEGER DEFAULT 1,
  
  -- Performance scores
  avg_lcp_score NUMERIC,
  avg_fid_score NUMERIC,
  avg_cls_score NUMERIC,
  overall_session_rating TEXT CHECK (overall_session_rating IN ('good', 'needs-improvement', 'poor')),
  
  session_start TIMESTAMPTZ,
  session_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_performance_sessions_user_id (user_id),
  INDEX idx_performance_sessions_session_id (session_id),
  INDEX idx_performance_sessions_created_at (created_at DESC)
);

-- Create function to calculate performance rating
CREATE OR REPLACE FUNCTION calculate_performance_rating(
  lcp_score NUMERIC,
  fid_score NUMERIC,
  cls_score NUMERIC,
  device_type TEXT
) RETURNS TEXT AS $$
DECLARE
  rating TEXT := 'good';
  lcp_threshold NUMERIC;
  fid_threshold NUMERIC;
  cls_threshold NUMERIC;
BEGIN
  -- Set thresholds based on device type
  IF device_type = 'mobile' THEN
    lcp_threshold := 3000;  -- 3 seconds for mobile
  ELSE
    lcp_threshold := 2500;  -- 2.5 seconds for desktop
  END IF;
  
  fid_threshold := 100;  -- 100ms for all devices
  cls_threshold := 0.1;  -- 0.1 for all devices
  
  -- Check LCP
  IF lcp_score IS NOT NULL THEN
    IF lcp_score > 4000 THEN
      rating := 'poor';
    ELSIF lcp_score > lcp_threshold AND rating != 'poor' THEN
      rating := 'needs-improvement';
    END IF;
  END IF;
  
  -- Check FID
  IF fid_score IS NOT NULL THEN
    IF fid_score > 300 THEN
      rating := 'poor';
    ELSIF fid_score > fid_threshold AND rating != 'poor' THEN
      rating := 'needs-improvement';
    END IF;
  END IF;
  
  -- Check CLS
  IF cls_score IS NOT NULL THEN
    IF cls_score > 0.25 THEN
      rating := 'poor';
    ELSIF cls_score > cls_threshold AND rating != 'poor' THEN
      rating := 'needs-improvement';
    END IF;
  END IF;
  
  RETURN rating;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate rating
CREATE OR REPLACE FUNCTION auto_calculate_performance_rating() RETURNS TRIGGER AS $$
BEGIN
  NEW.overall_rating := calculate_performance_rating(
    NEW.lcp_score,
    NEW.fid_score,
    NEW.cls_score,
    NEW.device_type
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_rating_before_insert
  BEFORE INSERT ON performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_performance_rating();

-- Create function to aggregate session metrics
CREATE OR REPLACE FUNCTION aggregate_session_metrics(p_session_id TEXT)
RETURNS TABLE (
  avg_lcp NUMERIC,
  avg_fid NUMERIC,
  avg_cls NUMERIC,
  pages_count INTEGER,
  overall_rating TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    AVG(lcp_score) AS avg_lcp,
    AVG(fid_score) AS avg_fid,
    AVG(cls_score) AS avg_cls,
    COUNT(DISTINCT page_path)::INTEGER AS pages_count,
    CASE
      WHEN AVG(lcp_score) > 4000 OR AVG(fid_score) > 300 OR AVG(cls_score) > 0.25 THEN 'poor'
      WHEN AVG(lcp_score) > 2500 OR AVG(fid_score) > 100 OR AVG(cls_score) > 0.1 THEN 'needs-improvement'
      ELSE 'good'
    END AS overall_rating
  FROM performance_metrics
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for performance dashboard
CREATE OR REPLACE VIEW performance_dashboard_view AS
SELECT
  pm.page_path,
  pm.device_type,
  COUNT(*) AS metric_count,
  AVG(pm.lcp_score) AS avg_lcp,
  AVG(pm.fid_score) AS avg_fid,
  AVG(pm.cls_score) AS avg_cls,
  AVG(pm.ttfb_score) AS avg_ttfb,
  AVG(pm.inp_score) AS avg_inp,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY pm.lcp_score) AS p75_lcp,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY pm.fid_score) AS p75_fid,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY pm.cls_score) AS p75_cls,
  COUNT(CASE WHEN pm.overall_rating = 'good' THEN 1 END)::FLOAT / COUNT(*) * 100 AS good_percentage,
  COUNT(CASE WHEN pm.overall_rating = 'poor' THEN 1 END)::FLOAT / COUNT(*) * 100 AS poor_percentage,
  MAX(pm.recorded_at) AS last_recorded
FROM performance_metrics pm
WHERE pm.recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY pm.page_path, pm.device_type;

-- Create view for bundle size trends
CREATE OR REPLACE VIEW bundle_size_trends_view AS
SELECT
  DATE_TRUNC('hour', recorded_at) AS hour,
  AVG(total_bundle_size) AS avg_total_size,
  AVG(main_bundle_size) AS avg_main_size,
  AVG(vendor_bundle_size) AS avg_vendor_size,
  MAX(total_bundle_size) AS max_total_size,
  COUNT(*) AS sample_count
FROM bundle_statistics
WHERE recorded_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', recorded_at)
ORDER BY hour DESC;

-- Create function for performance alerting
CREATE OR REPLACE FUNCTION check_performance_threshold()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if metric exceeds critical thresholds
  IF NEW.lcp_score > 4000 OR NEW.fid_score > 300 OR NEW.cls_score > 0.25 THEN
    INSERT INTO performance_alerts (
      user_id,
      metric_name,
      metric_value,
      threshold_value,
      severity,
      page_path,
      url,
      device_type
    )
    SELECT
      NEW.user_id,
      metric_name,
      metric_value,
      threshold_value,
      'critical',
      NEW.page_path,
      NEW.url,
      NEW.device_type
    FROM (
      SELECT 'LCP' AS metric_name, NEW.lcp_score AS metric_value, 4000 AS threshold_value
      WHERE NEW.lcp_score > 4000
      UNION ALL
      SELECT 'FID', NEW.fid_score, 300
      WHERE NEW.fid_score > 300
      UNION ALL
      SELECT 'CLS', NEW.cls_score, 0.25
      WHERE NEW.cls_score > 0.25
    ) AS violations;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_performance_threshold_trigger
  AFTER INSERT ON performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION check_performance_threshold();

-- Row Level Security policies
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for performance_metrics
CREATE POLICY "Users can view their own performance metrics"
  ON performance_metrics FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can insert performance metrics"
  ON performance_metrics FOR INSERT
  WITH CHECK (true);

-- Policies for bundle_statistics
CREATE POLICY "Users can view their own bundle statistics"
  ON bundle_statistics FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can insert bundle statistics"
  ON bundle_statistics FOR INSERT
  WITH CHECK (true);

-- Policies for performance_alerts
CREATE POLICY "Users can view their own performance alerts"
  ON performance_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance alerts"
  ON performance_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert performance alerts"
  ON performance_alerts FOR INSERT
  WITH CHECK (true);

-- Policies for performance_sessions
CREATE POLICY "Users can view their own performance sessions"
  ON performance_sessions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can insert performance sessions"
  ON performance_sessions FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance optimization
CREATE INDEX CONCURRENTLY idx_performance_metrics_composite 
  ON performance_metrics(user_id, page_path, recorded_at DESC);

CREATE INDEX CONCURRENTLY idx_bundle_statistics_composite 
  ON bundle_statistics(user_id, page_path, recorded_at DESC);

CREATE INDEX CONCURRENTLY idx_performance_alerts_composite 
  ON performance_alerts(user_id, status, severity, triggered_at DESC);

-- Add comments for documentation
COMMENT ON TABLE performance_metrics IS 'WS-145: Core Web Vitals and performance metrics tracking';
COMMENT ON TABLE bundle_statistics IS 'WS-145: JavaScript bundle size tracking and analysis';
COMMENT ON TABLE performance_alerts IS 'WS-145: Performance threshold violation alerts';
COMMENT ON TABLE performance_sessions IS 'WS-145: Aggregated performance data by user session';

COMMENT ON COLUMN performance_metrics.lcp_score IS 'Largest Contentful Paint in milliseconds';
COMMENT ON COLUMN performance_metrics.fid_score IS 'First Input Delay in milliseconds';
COMMENT ON COLUMN performance_metrics.cls_score IS 'Cumulative Layout Shift score';
COMMENT ON COLUMN performance_metrics.ttfb_score IS 'Time to First Byte in milliseconds';
COMMENT ON COLUMN performance_metrics.inp_score IS 'Interaction to Next Paint in milliseconds';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;