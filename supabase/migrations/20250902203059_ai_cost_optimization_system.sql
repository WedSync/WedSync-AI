-- WS-240: AI Cost Optimization System
-- Creates tables for intelligent cost tracking, budget management, and optimization algorithms
-- Target: 75% cost reduction for wedding suppliers during peak season

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core cost optimization configuration table
CREATE TABLE ai_cost_optimization (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  feature_type VARCHAR(50) NOT NULL CHECK (feature_type IN ('photo_ai', 'content_generation', 'chatbot', 'venue_descriptions', 'menu_optimization', 'timeline_assistance')),
  optimization_level VARCHAR(20) DEFAULT 'balanced' CHECK (optimization_level IN ('aggressive', 'balanced', 'quality_first')),
  monthly_budget_pounds DECIMAL(10,2) DEFAULT 50.00 CHECK (monthly_budget_pounds >= 0),
  daily_budget_pounds DECIMAL(8,2) DEFAULT 5.00 CHECK (daily_budget_pounds >= 0),
  alert_threshold_percent INTEGER DEFAULT 80 CHECK (alert_threshold_percent BETWEEN 1 AND 100),
  auto_disable_at_limit BOOLEAN DEFAULT true,
  cache_strategy JSONB DEFAULT '{"semantic": true, "exact": true, "ttl_hours": 24, "similarity_threshold": 0.85}',
  batch_processing_enabled BOOLEAN DEFAULT true,
  seasonal_multiplier_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_supplier_feature UNIQUE(supplier_id, feature_type)
);

-- Real-time cost tracking table for granular monitoring
CREATE TABLE ai_cost_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  feature_type VARCHAR(50) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hour INTEGER NOT NULL DEFAULT EXTRACT(hour FROM NOW()) CHECK (hour BETWEEN 0 AND 23),
  api_calls INTEGER DEFAULT 0 CHECK (api_calls >= 0),
  tokens_input INTEGER DEFAULT 0 CHECK (tokens_input >= 0),
  tokens_output INTEGER DEFAULT 0 CHECK (tokens_output >= 0),
  cost_pounds DECIMAL(8,4) DEFAULT 0.0000 CHECK (cost_pounds >= 0),
  model_used VARCHAR(50),
  cache_hits INTEGER DEFAULT 0 CHECK (cache_hits >= 0),
  cache_misses INTEGER DEFAULT 0 CHECK (cache_misses >= 0),
  batch_processed BOOLEAN DEFAULT false,
  optimization_savings DECIMAL(8,4) DEFAULT 0.0000 CHECK (optimization_savings >= 0),
  wedding_season_multiplier DECIMAL(3,2) DEFAULT 1.00 CHECK (wedding_season_multiplier >= 1.00),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smart cache analytics for performance optimization
CREATE TABLE ai_cache_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  cache_key_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of request for privacy
  feature_type VARCHAR(50) NOT NULL,
  cache_type VARCHAR(20) NOT NULL CHECK (cache_type IN ('exact', 'semantic', 'fuzzy')),
  hit_count INTEGER DEFAULT 0 CHECK (hit_count >= 0),
  cost_savings DECIMAL(8,4) DEFAULT 0.0000 CHECK (cost_savings >= 0),
  similarity_score DECIMAL(4,3), -- For semantic caching (0.000-1.000)
  last_hit TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget alerts and notifications
CREATE TABLE ai_budget_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  feature_type VARCHAR(50) NOT NULL,
  alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('threshold_warning', 'limit_reached', 'auto_disabled', 'seasonal_spike')),
  current_spend DECIMAL(8,4) NOT NULL CHECK (current_spend >= 0),
  budget_limit DECIMAL(8,4) NOT NULL CHECK (budget_limit >= 0),
  percentage_used INTEGER NOT NULL CHECK (percentage_used BETWEEN 0 AND 200), -- Can exceed 100% before disable
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  action_taken VARCHAR(50), -- 'disabled', 'budget_increased', 'optimization_enabled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ
);

-- Wedding season cost projections
CREATE TABLE ai_seasonal_projections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  projection_month INTEGER NOT NULL CHECK (projection_month BETWEEN 1 AND 12),
  projection_year INTEGER NOT NULL CHECK (projection_year >= 2025),
  feature_type VARCHAR(50) NOT NULL,
  baseline_cost DECIMAL(8,4) NOT NULL CHECK (baseline_cost >= 0),
  seasonal_multiplier DECIMAL(3,2) NOT NULL CHECK (seasonal_multiplier >= 1.00),
  projected_cost DECIMAL(8,4) NOT NULL CHECK (projected_cost >= 0),
  optimization_potential DECIMAL(8,4) NOT NULL CHECK (optimization_potential >= 0),
  recommended_budget DECIMAL(8,4) NOT NULL CHECK (recommended_budget >= 0),
  confidence_score DECIMAL(4,3) NOT NULL CHECK (confidence_score BETWEEN 0.000 AND 1.000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_supplier_month_feature UNIQUE(supplier_id, projection_month, projection_year, feature_type)
);

-- Create indexes for optimal performance
CREATE INDEX idx_cost_optimization_supplier ON ai_cost_optimization(supplier_id);
CREATE INDEX idx_cost_optimization_feature ON ai_cost_optimization(feature_type);

CREATE INDEX idx_cost_tracking_supplier_date ON ai_cost_tracking(supplier_id, date, hour);
CREATE INDEX idx_cost_tracking_realtime ON ai_cost_tracking(supplier_id, created_at);
CREATE INDEX idx_cost_tracking_feature_date ON ai_cost_tracking(feature_type, date);

CREATE INDEX idx_cache_analytics_supplier ON ai_cache_analytics(supplier_id, feature_type, created_at);
CREATE INDEX idx_cache_analytics_performance ON ai_cache_analytics(cache_type, hit_count DESC);
CREATE INDEX idx_cache_analytics_hash ON ai_cache_analytics(cache_key_hash);

CREATE INDEX idx_budget_alerts_supplier ON ai_budget_alerts(supplier_id, acknowledged, created_at);
CREATE INDEX idx_budget_alerts_urgent ON ai_budget_alerts(alert_type, acknowledged, created_at);

CREATE INDEX idx_seasonal_projections_supplier ON ai_seasonal_projections(supplier_id, projection_year, projection_month);

-- Row Level Security (RLS) policies for multi-tenant security
ALTER TABLE ai_cost_optimization ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_seasonal_projections ENABLE ROW LEVEL SECURITY;

-- Suppliers can only access their own cost optimization data
CREATE POLICY supplier_cost_optimization_policy ON ai_cost_optimization
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers 
    WHERE organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  ));

CREATE POLICY supplier_cost_tracking_policy ON ai_cost_tracking
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers 
    WHERE organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  ));

CREATE POLICY supplier_cache_analytics_policy ON ai_cache_analytics
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers 
    WHERE organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  ));

CREATE POLICY supplier_budget_alerts_policy ON ai_budget_alerts
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers 
    WHERE organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  ));

CREATE POLICY supplier_seasonal_projections_policy ON ai_seasonal_projections
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers 
    WHERE organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  ));

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to optimization config
CREATE TRIGGER update_ai_cost_optimization_updated_at
  BEFORE UPDATE ON ai_cost_optimization
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Wedding season detection function
CREATE OR REPLACE FUNCTION get_wedding_season_multiplier(check_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  month_num INTEGER;
  multiplier DECIMAL(3,2);
BEGIN
  month_num := EXTRACT(month FROM check_date);
  
  -- Peak wedding season (March-October) gets 1.6x multiplier
  -- Off-season (November-February) stays at 1.0x
  IF month_num >= 3 AND month_num <= 10 THEN
    multiplier := 1.60;
  ELSE
    multiplier := 1.00;
  END IF;
  
  RETURN multiplier;
END;
$$ LANGUAGE plpgsql;

-- Cost calculation helper function
CREATE OR REPLACE FUNCTION calculate_optimization_savings(
  p_supplier_id UUID,
  p_feature_type VARCHAR(50),
  p_date_start DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_date_end DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_cost DECIMAL(10,4),
  optimization_savings DECIMAL(10,4),
  cache_hit_rate DECIMAL(5,2),
  total_requests INTEGER,
  savings_percentage DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(act.cost_pounds), 0.0000)::DECIMAL(10,4) as total_cost,
    COALESCE(SUM(act.optimization_savings), 0.0000)::DECIMAL(10,4) as optimization_savings,
    CASE 
      WHEN SUM(act.cache_hits + act.cache_misses) > 0 
      THEN (SUM(act.cache_hits)::DECIMAL / SUM(act.cache_hits + act.cache_misses) * 100)::DECIMAL(5,2)
      ELSE 0.00::DECIMAL(5,2)
    END as cache_hit_rate,
    COALESCE(SUM(act.api_calls), 0)::INTEGER as total_requests,
    CASE 
      WHEN SUM(act.cost_pounds) > 0
      THEN (SUM(act.optimization_savings) / SUM(act.cost_pounds) * 100)::DECIMAL(5,2)
      ELSE 0.00::DECIMAL(5,2)
    END as savings_percentage
  FROM ai_cost_tracking act
  WHERE act.supplier_id = p_supplier_id
    AND act.feature_type = p_feature_type
    AND act.date BETWEEN p_date_start AND p_date_end;
END;
$$ LANGUAGE plpgsql;

-- Audit logging for cost optimization changes
CREATE TABLE ai_optimization_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  feature_type VARCHAR(50),
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_supplier ON ai_optimization_audit_log(supplier_id, created_at);

-- Insert default optimization configurations for existing suppliers
INSERT INTO ai_cost_optimization (supplier_id, feature_type, optimization_level, monthly_budget_pounds, daily_budget_pounds)
SELECT 
  s.id as supplier_id,
  unnest(ARRAY['photo_ai', 'content_generation', 'chatbot']) as feature_type,
  'balanced' as optimization_level,
  50.00 as monthly_budget_pounds,
  5.00 as daily_budget_pounds
FROM suppliers s
ON CONFLICT (supplier_id, feature_type) DO NOTHING;

-- Create materialized view for real-time dashboard
CREATE MATERIALIZED VIEW ai_cost_optimization_dashboard AS
SELECT 
  aco.supplier_id,
  aco.feature_type,
  aco.optimization_level,
  aco.monthly_budget_pounds,
  aco.daily_budget_pounds,
  aco.alert_threshold_percent,
  COALESCE(daily_stats.today_cost, 0.0000) as today_cost,
  COALESCE(daily_stats.today_savings, 0.0000) as today_savings,
  COALESCE(monthly_stats.month_cost, 0.0000) as month_cost,
  COALESCE(monthly_stats.month_savings, 0.0000) as month_savings,
  COALESCE(cache_stats.cache_hit_rate, 0.00) as cache_hit_rate,
  COALESCE(alert_count.pending_alerts, 0) as pending_alerts,
  get_wedding_season_multiplier() as current_season_multiplier,
  CASE 
    WHEN COALESCE(daily_stats.today_cost, 0) >= aco.daily_budget_pounds THEN 'over_budget'
    WHEN COALESCE(daily_stats.today_cost, 0) >= (aco.daily_budget_pounds * aco.alert_threshold_percent / 100.0) THEN 'approaching_limit'
    ELSE 'healthy'
  END as budget_status
FROM ai_cost_optimization aco
LEFT JOIN (
  -- Today's cost and savings
  SELECT 
    supplier_id,
    feature_type,
    SUM(cost_pounds) as today_cost,
    SUM(optimization_savings) as today_savings
  FROM ai_cost_tracking
  WHERE date = CURRENT_DATE
  GROUP BY supplier_id, feature_type
) daily_stats ON aco.supplier_id = daily_stats.supplier_id AND aco.feature_type = daily_stats.feature_type
LEFT JOIN (
  -- This month's cost and savings
  SELECT 
    supplier_id,
    feature_type,
    SUM(cost_pounds) as month_cost,
    SUM(optimization_savings) as month_savings
  FROM ai_cost_tracking
  WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY supplier_id, feature_type
) monthly_stats ON aco.supplier_id = monthly_stats.supplier_id AND aco.feature_type = monthly_stats.feature_type
LEFT JOIN (
  -- Cache hit rate
  SELECT 
    supplier_id,
    feature_type,
    CASE 
      WHEN SUM(cache_hits + cache_misses) > 0 
      THEN (SUM(cache_hits)::DECIMAL / SUM(cache_hits + cache_misses) * 100)::DECIMAL(5,2)
      ELSE 0.00
    END as cache_hit_rate
  FROM ai_cost_tracking
  WHERE date >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY supplier_id, feature_type
) cache_stats ON aco.supplier_id = cache_stats.supplier_id AND aco.feature_type = cache_stats.feature_type
LEFT JOIN (
  -- Pending alerts
  SELECT 
    supplier_id,
    feature_type,
    COUNT(*) as pending_alerts
  FROM ai_budget_alerts
  WHERE acknowledged = false
  GROUP BY supplier_id, feature_type
) alert_count ON aco.supplier_id = alert_count.supplier_id AND aco.feature_type = alert_count.feature_type;

-- Index for materialized view
CREATE UNIQUE INDEX idx_dashboard_supplier_feature ON ai_cost_optimization_dashboard(supplier_id, feature_type);

-- Function to refresh dashboard
CREATE OR REPLACE FUNCTION refresh_ai_cost_dashboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ai_cost_optimization_dashboard;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE ai_cost_optimization IS 'Configuration settings for AI cost optimization per supplier and feature type';
COMMENT ON TABLE ai_cost_tracking IS 'Real-time tracking of AI costs, usage, and optimization metrics';
COMMENT ON TABLE ai_cache_analytics IS 'Analytics for AI response caching performance and cost savings';
COMMENT ON TABLE ai_budget_alerts IS 'Budget threshold alerts and notifications for suppliers';
COMMENT ON TABLE ai_seasonal_projections IS 'Wedding season cost projections and budget recommendations';
COMMENT ON FUNCTION get_wedding_season_multiplier IS 'Returns cost multiplier for wedding season (1.6x March-October, 1.0x off-season)';
COMMENT ON FUNCTION calculate_optimization_savings IS 'Calculates total savings and efficiency metrics for a supplier feature';
COMMENT ON MATERIALIZED VIEW ai_cost_optimization_dashboard IS 'Real-time dashboard data for AI cost optimization monitoring';