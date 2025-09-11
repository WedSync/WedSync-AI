-- WS-145: Performance Optimization Targets Implementation
-- Performance Metrics Collection System
-- Created: 2025-08-25

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Performance metrics table for Core Web Vitals tracking
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Page information
  page_path TEXT NOT NULL,
  url TEXT NOT NULL,
  
  -- Core Web Vitals metrics
  lcp_score NUMERIC, -- Largest Contentful Paint (ms)
  fid_score NUMERIC, -- First Input Delay (ms) 
  cls_score NUMERIC, -- Cumulative Layout Shift (unitless)
  ttfb_score NUMERIC, -- Time to First Byte (ms)
  inp_score NUMERIC, -- Interaction to Next Paint (ms)
  
  -- Additional performance metrics
  load_time_ms INTEGER,
  bundle_size INTEGER,
  
  -- Device and connection context
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile')),
  connection_type TEXT,
  user_agent TEXT,
  
  -- Performance rating
  overall_rating TEXT CHECK (overall_rating IN ('good', 'needs-improvement', 'poor')),
  
  -- Metadata
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT,
  metric_id TEXT, -- Web vitals metric ID
  
  -- Indexing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bundle statistics table for tracking JavaScript bundle sizes
CREATE TABLE IF NOT EXISTS bundle_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Bundle sizes (in bytes)
  main_bundle_size INTEGER NOT NULL DEFAULT 0,
  vendor_bundle_size INTEGER NOT NULL DEFAULT 0,
  forms_bundle_size INTEGER NOT NULL DEFAULT 0,
  dashboard_bundle_size INTEGER NOT NULL DEFAULT 0,
  total_bundle_size INTEGER NOT NULL DEFAULT 0,
  
  -- Performance context
  page_path TEXT NOT NULL,
  load_time_ms INTEGER,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile')),
  
  -- Bundle targets compliance
  exceeds_main_target BOOLEAN DEFAULT FALSE,
  exceeds_vendor_target BOOLEAN DEFAULT FALSE,
  exceeds_total_target BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance alerts table for threshold violations
CREATE TABLE IF NOT EXISTS performance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Alert details
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  severity TEXT CHECK (severity IN ('warning', 'critical')) NOT NULL,
  
  -- Context
  page_path TEXT NOT NULL,
  url TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile')),
  
  -- Alert status
  status TEXT CHECK (status IN ('open', 'acknowledged', 'resolved')) DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance sessions table for tracking user sessions
CREATE TABLE IF NOT EXISTS performance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session summary
  total_page_views INTEGER DEFAULT 0,
  avg_lcp_score NUMERIC,
  avg_fid_score NUMERIC,
  avg_cls_score NUMERIC,
  overall_session_rating TEXT CHECK (overall_session_rating IN ('good', 'needs-improvement', 'poor')),
  
  -- Session timing
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  session_duration_ms INTEGER,
  
  -- Device context
  primary_device_type TEXT,
  primary_connection_type TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_page_path ON performance_metrics(page_path);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at ON performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_device_type ON performance_metrics(device_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_rating ON performance_metrics(overall_rating);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session ON performance_metrics(session_id);

CREATE INDEX IF NOT EXISTS idx_bundle_statistics_user_id ON bundle_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_bundle_statistics_recorded_at ON bundle_statistics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_bundle_statistics_page_path ON bundle_statistics(page_path);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_user_id ON performance_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_severity ON performance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_status ON performance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_performance_alerts_triggered_at ON performance_alerts(triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_sessions_user_id ON performance_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_sessions_session_id ON performance_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_sessions_start ON performance_sessions(session_start DESC);

-- Row Level Security (RLS) policies
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for performance_metrics
CREATE POLICY "Users can insert their own performance metrics" 
ON performance_metrics FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own performance metrics" 
ON performance_metrics FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all performance metrics" 
ON performance_metrics FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- RLS Policies for bundle_statistics
CREATE POLICY "Users can insert their own bundle statistics" 
ON bundle_statistics FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own bundle statistics" 
ON bundle_statistics FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all bundle statistics" 
ON bundle_statistics FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- RLS Policies for performance_alerts
CREATE POLICY "Users can insert their own performance alerts" 
ON performance_alerts FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own performance alerts" 
ON performance_alerts FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own performance alerts" 
ON performance_alerts FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all performance alerts" 
ON performance_alerts FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- RLS Policies for performance_sessions
CREATE POLICY "Users can insert their own performance sessions" 
ON performance_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own performance sessions" 
ON performance_sessions FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own performance sessions" 
ON performance_sessions FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all performance sessions" 
ON performance_sessions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Functions for performance analytics

-- Function to calculate performance score
CREATE OR REPLACE FUNCTION calculate_performance_score(
  lcp NUMERIC,
  fid NUMERIC,
  cls NUMERIC,
  device_type TEXT DEFAULT 'desktop'
)
RETURNS TEXT AS $$
BEGIN
  -- Performance thresholds based on Core Web Vitals
  DECLARE
    lcp_good NUMERIC := CASE WHEN device_type = 'mobile' THEN 3000 ELSE 2500 END;
    lcp_poor NUMERIC := 4000;
    fid_good NUMERIC := 100;
    fid_poor NUMERIC := 300;
    cls_good NUMERIC := 0.1;
    cls_poor NUMERIC := 0.25;
    poor_count INTEGER := 0;
    needs_improvement_count INTEGER := 0;
  BEGIN
    -- Check LCP
    IF lcp > lcp_poor THEN poor_count := poor_count + 1;
    ELSIF lcp > lcp_good THEN needs_improvement_count := needs_improvement_count + 1;
    END IF;
    
    -- Check FID
    IF fid > fid_poor THEN poor_count := poor_count + 1;
    ELSIF fid > fid_good THEN needs_improvement_count := needs_improvement_count + 1;
    END IF;
    
    -- Check CLS
    IF cls > cls_poor THEN poor_count := poor_count + 1;
    ELSIF cls > cls_good THEN needs_improvement_count := needs_improvement_count + 1;
    END IF;
    
    -- Return overall rating
    IF poor_count > 0 THEN
      RETURN 'poor';
    ELSIF needs_improvement_count > 0 THEN
      RETURN 'needs-improvement';
    ELSE
      RETURN 'good';
    END IF;
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to update bundle compliance flags
CREATE OR REPLACE FUNCTION update_bundle_compliance()
RETURNS TRIGGER AS $$
BEGIN
  -- Bundle size targets (in bytes)
  NEW.exceeds_main_target := NEW.main_bundle_size > 200000; -- 200KB
  NEW.exceeds_vendor_target := NEW.vendor_bundle_size > 300000; -- 300KB
  NEW.exceeds_total_target := NEW.total_bundle_size > 800000; -- 800KB
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update bundle compliance
CREATE TRIGGER trigger_update_bundle_compliance
  BEFORE INSERT OR UPDATE ON bundle_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_bundle_compliance();

-- Function to automatically calculate performance rating
CREATE OR REPLACE FUNCTION update_performance_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lcp_score IS NOT NULL AND NEW.fid_score IS NOT NULL AND NEW.cls_score IS NOT NULL THEN
    NEW.overall_rating := calculate_performance_score(
      NEW.lcp_score,
      NEW.fid_score,
      NEW.cls_score,
      NEW.device_type
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update performance rating
CREATE TRIGGER trigger_update_performance_rating
  BEFORE INSERT OR UPDATE ON performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_performance_rating();

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
CREATE TRIGGER trigger_performance_metrics_updated_at
  BEFORE UPDATE ON performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_bundle_statistics_updated_at
  BEFORE UPDATE ON bundle_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_performance_alerts_updated_at
  BEFORE UPDATE ON performance_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_performance_sessions_updated_at
  BEFORE UPDATE ON performance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Views for performance analytics

-- Performance summary view
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
  user_id,
  page_path,
  COUNT(*) as total_measurements,
  AVG(lcp_score) as avg_lcp,
  AVG(fid_score) as avg_fid,
  AVG(cls_score) as avg_cls,
  AVG(ttfb_score) as avg_ttfb,
  AVG(inp_score) as avg_inp,
  AVG(load_time_ms) as avg_load_time,
  COUNT(*) FILTER (WHERE overall_rating = 'good') as good_count,
  COUNT(*) FILTER (WHERE overall_rating = 'needs-improvement') as needs_improvement_count,
  COUNT(*) FILTER (WHERE overall_rating = 'poor') as poor_count,
  COUNT(*) FILTER (WHERE device_type = 'mobile') as mobile_count,
  COUNT(*) FILTER (WHERE device_type = 'desktop') as desktop_count,
  MAX(recorded_at) as latest_measurement
FROM performance_metrics
GROUP BY user_id, page_path;

-- Performance trends view
CREATE OR REPLACE VIEW performance_trends AS
SELECT 
  user_id,
  DATE_TRUNC('hour', recorded_at) as hour_bucket,
  COUNT(*) as measurements_count,
  AVG(lcp_score) as avg_lcp,
  AVG(fid_score) as avg_fid,
  AVG(cls_score) as avg_cls,
  COUNT(*) FILTER (WHERE overall_rating = 'poor') as poor_performance_count
FROM performance_metrics
WHERE recorded_at >= NOW() - INTERVAL '24 hours'
GROUP BY user_id, DATE_TRUNC('hour', recorded_at)
ORDER BY hour_bucket DESC;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON performance_metrics TO anon, authenticated;
GRANT SELECT, INSERT ON bundle_statistics TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON performance_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON performance_sessions TO authenticated;
GRANT SELECT ON performance_summary TO authenticated;
GRANT SELECT ON performance_trends TO authenticated;

-- Create performance targets constants table
CREATE TABLE IF NOT EXISTS performance_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT UNIQUE NOT NULL,
  good_threshold_desktop NUMERIC NOT NULL,
  good_threshold_mobile NUMERIC,
  poor_threshold NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default performance targets
INSERT INTO performance_targets (metric_name, good_threshold_desktop, good_threshold_mobile, poor_threshold, unit, description) 
VALUES 
  ('LCP', 2500, 3000, 4000, 'ms', 'Largest Contentful Paint'),
  ('FID', 100, 100, 300, 'ms', 'First Input Delay'),
  ('CLS', 0.1, 0.1, 0.25, 'unitless', 'Cumulative Layout Shift'),
  ('TTFB', 800, 800, 1800, 'ms', 'Time to First Byte'),
  ('INP', 200, 200, 500, 'ms', 'Interaction to Next Paint')
ON CONFLICT (metric_name) DO NOTHING;

-- Performance targets RLS
ALTER TABLE performance_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read performance targets" 
ON performance_targets FOR SELECT 
USING (true);

CREATE POLICY "Only admins can modify performance targets" 
ON performance_targets FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

GRANT SELECT ON performance_targets TO anon, authenticated;
GRANT ALL ON performance_targets TO authenticated;

COMMENT ON TABLE performance_metrics IS 'WS-145: Core Web Vitals and performance metrics tracking';
COMMENT ON TABLE bundle_statistics IS 'WS-145: JavaScript bundle size monitoring';
COMMENT ON TABLE performance_alerts IS 'WS-145: Performance threshold violation alerts';
COMMENT ON TABLE performance_sessions IS 'WS-145: User session performance summaries';
COMMENT ON TABLE performance_targets IS 'WS-145: Configurable performance thresholds';

-- End of WS-145 Performance Metrics System Migration