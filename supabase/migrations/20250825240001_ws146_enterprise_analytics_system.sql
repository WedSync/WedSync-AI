-- WS-146: Enterprise Analytics and App Store Optimization System
-- Team B - Batch 12 - Round 3
-- Enterprise deployment tracking, ASO experiments, and growth metrics

-- Enterprise app analytics and reporting
CREATE TABLE IF NOT EXISTS enterprise_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  deployment_type TEXT NOT NULL, -- 'apple_business_manager', 'google_workspace', 'microsoft_intune'
  
  -- Deployment details
  app_version TEXT NOT NULL,
  deployment_date DATE NOT NULL,
  total_licenses INTEGER,
  active_installations INTEGER,
  
  -- Configuration
  custom_branding BOOLEAN DEFAULT false,
  mdm_policies JSONB,
  feature_configuration JSONB,
  
  -- Usage metrics
  daily_active_users INTEGER DEFAULT 0,
  feature_adoption_rates JSONB,
  performance_metrics JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for enterprise deployments
CREATE INDEX idx_enterprise_deployments_org_id ON enterprise_deployments(organization_id);
CREATE INDEX idx_enterprise_deployments_deployment_type ON enterprise_deployments(deployment_type);
CREATE INDEX idx_enterprise_deployments_date ON enterprise_deployments(deployment_date);

-- App Store optimization tracking
CREATE TABLE IF NOT EXISTS aso_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_platform TEXT NOT NULL, -- 'apple', 'google', 'microsoft'
  experiment_name TEXT NOT NULL,
  experiment_type TEXT NOT NULL, -- 'title_test', 'icon_test', 'screenshot_test'
  
  -- Test configuration
  variants JSONB NOT NULL,
  traffic_allocation JSONB,
  
  -- Results tracking
  impressions_by_variant JSONB,
  conversions_by_variant JSONB,
  statistical_significance NUMERIC,
  winning_variant TEXT,
  
  -- Timeline
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_days INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for ASO experiments
CREATE INDEX idx_aso_experiments_platform ON aso_experiments(store_platform);
CREATE INDEX idx_aso_experiments_type ON aso_experiments(experiment_type);
CREATE INDEX idx_aso_experiments_status ON aso_experiments(started_at, ended_at);

-- Growth metrics tracking
CREATE TABLE IF NOT EXISTS growth_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  
  -- Download metrics
  total_downloads INTEGER,
  organic_downloads INTEGER,
  paid_downloads INTEGER,
  referral_downloads INTEGER,
  
  -- Conversion metrics
  app_store_conversion_rate NUMERIC,
  onboarding_completion_rate NUMERIC,
  activation_rate NUMERIC,
  retention_rate_day_1 NUMERIC,
  retention_rate_day_7 NUMERIC,
  retention_rate_day_30 NUMERIC,
  
  -- Revenue metrics
  total_revenue NUMERIC,
  average_revenue_per_user NUMERIC,
  lifetime_value NUMERIC,
  
  -- Viral metrics
  referral_rate NUMERIC,
  viral_coefficient NUMERIC,
  k_factor NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_date)
);

-- Add indexes for growth metrics
CREATE INDEX idx_growth_metrics_date ON growth_metrics(metric_date);

-- Referral tracking system
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  
  -- Configuration
  max_uses INTEGER,
  expires_at TIMESTAMPTZ,
  
  -- Tracking
  current_uses INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for referral codes
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_active ON referral_codes(expires_at) WHERE expires_at > NOW();

-- Referral conversions tracking
CREATE TABLE IF NOT EXISTS referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT NOT NULL,
  referrer_id UUID NOT NULL,
  referee_id UUID NOT NULL,
  
  -- Conversion details
  conversion_type TEXT NOT NULL, -- 'signup', 'subscription', 'purchase'
  conversion_value NUMERIC DEFAULT 0,
  
  -- Rewards
  referrer_reward JSONB,
  referee_reward JSONB,
  rewards_processed BOOLEAN DEFAULT false,
  
  converted_at TIMESTAMPTZ DEFAULT NOW(),
  rewards_processed_at TIMESTAMPTZ
);

-- Add indexes for referral conversions
CREATE INDEX idx_referral_conversions_referrer ON referral_conversions(referrer_id);
CREATE INDEX idx_referral_conversions_referee ON referral_conversions(referee_id);
CREATE INDEX idx_referral_conversions_code ON referral_conversions(referral_code);
CREATE INDEX idx_referral_conversions_date ON referral_conversions(converted_at);

-- Influencer partnerships tracking
CREATE TABLE IF NOT EXISTS influencer_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'instagram', 'tiktok', 'youtube', 'linkedin'
  
  -- Profile metrics
  follower_count INTEGER,
  engagement_rate NUMERIC,
  
  -- Contract details
  contract_start DATE,
  contract_end DATE,
  compensation NUMERIC,
  deliverables JSONB,
  exclusivity BOOLEAN DEFAULT false,
  
  -- Performance tracking
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  roi NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for influencer partnerships
CREATE INDEX idx_influencer_partnerships_platform ON influencer_partnerships(platform);
CREATE INDEX idx_influencer_partnerships_active ON influencer_partnerships(contract_start, contract_end);
CREATE INDEX idx_influencer_partnerships_roi ON influencer_partnerships(roi);

-- Viral features tracking
CREATE TABLE IF NOT EXISTS viral_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  feature_type TEXT NOT NULL, -- 'sharing', 'referral', 'social_proof', 'gamification'
  
  -- Configuration
  shareability_score NUMERIC DEFAULT 0,
  target_viral_coefficient NUMERIC DEFAULT 1.0,
  
  -- Performance metrics
  total_shares INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  current_viral_coefficient NUMERIC DEFAULT 0,
  retention_impact NUMERIC DEFAULT 0,
  
  -- Timeline
  implementation_date DATE NOT NULL,
  last_optimized DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for viral features
CREATE INDEX idx_viral_features_type ON viral_features(feature_type);
CREATE INDEX idx_viral_features_performance ON viral_features(current_viral_coefficient);
CREATE INDEX idx_viral_features_implementation ON viral_features(implementation_date);

-- Growth campaigns tracking
CREATE TABLE IF NOT EXISTS growth_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL, -- 'referral', 'influencer', 'viral_feature', 'content_marketing'
  status TEXT NOT NULL DEFAULT 'planning', -- 'planning', 'active', 'paused', 'completed'
  
  -- Budget and timeline
  budget NUMERIC,
  start_date DATE,
  end_date DATE,
  
  -- Performance metrics
  reach INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  roi NUMERIC DEFAULT 0,
  
  -- Configuration
  target_audience JSONB,
  channels JSONB,
  assets JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for growth campaigns
CREATE INDEX idx_growth_campaigns_type ON growth_campaigns(campaign_type);
CREATE INDEX idx_growth_campaigns_status ON growth_campaigns(status);
CREATE INDEX idx_growth_campaigns_dates ON growth_campaigns(start_date, end_date);
CREATE INDEX idx_growth_campaigns_roi ON growth_campaigns(roi);

-- MDM compliance tracking
CREATE TABLE IF NOT EXISTS mdm_compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  user_id UUID,
  organization_id UUID,
  
  -- Device information
  platform TEXT NOT NULL,
  os_version TEXT,
  app_version TEXT,
  device_model TEXT,
  
  -- Compliance status
  device_compliant BOOLEAN DEFAULT false,
  app_compliant BOOLEAN DEFAULT false,
  security_compliant BOOLEAN DEFAULT false,
  overall_compliant BOOLEAN DEFAULT false,
  
  -- Violations and recommendations
  violations JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  
  -- Audit trail
  last_check_at TIMESTAMPTZ DEFAULT NOW(),
  remediation_completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for MDM compliance
CREATE INDEX idx_mdm_compliance_device_id ON mdm_compliance_reports(device_id);
CREATE INDEX idx_mdm_compliance_user_id ON mdm_compliance_reports(user_id);
CREATE INDEX idx_mdm_compliance_org_id ON mdm_compliance_reports(organization_id);
CREATE INDEX idx_mdm_compliance_status ON mdm_compliance_reports(overall_compliant);
CREATE INDEX idx_mdm_compliance_last_check ON mdm_compliance_reports(last_check_at);

-- App store feature requests tracking
CREATE TABLE IF NOT EXISTS app_store_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_platform TEXT NOT NULL, -- 'apple', 'google', 'microsoft'
  feature_type TEXT NOT NULL, -- 'editors_choice', 'app_of_the_day', 'category_feature'
  
  -- Submission details
  submission_date DATE NOT NULL,
  pitch_title TEXT,
  pitch_description TEXT,
  supporting_metrics JSONB,
  screenshots JSONB,
  
  -- Status tracking
  status TEXT DEFAULT 'submitted', -- 'submitted', 'under_review', 'approved', 'featured', 'declined'
  reviewed_at TIMESTAMPTZ,
  featured_at TIMESTAMPTZ,
  featured_duration INTEGER, -- days
  
  -- Impact metrics
  feature_impressions INTEGER DEFAULT 0,
  feature_downloads INTEGER DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  revenue_impact NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for app store features
CREATE INDEX idx_app_store_features_platform ON app_store_features(store_platform);
CREATE INDEX idx_app_store_features_status ON app_store_features(status);
CREATE INDEX idx_app_store_features_featured ON app_store_features(featured_at);
CREATE INDEX idx_app_store_features_impact ON app_store_features(revenue_impact);

-- Create views for analytics dashboards

-- Enterprise deployment summary view
CREATE VIEW enterprise_deployment_summary AS
SELECT 
  deployment_type,
  COUNT(*) as total_deployments,
  SUM(total_licenses) as total_licenses,
  SUM(active_installations) as total_active_installations,
  AVG(daily_active_users) as avg_daily_active_users,
  AVG(CAST(performance_metrics->>'app_launch_time' AS NUMERIC)) as avg_app_launch_time
FROM enterprise_deployments
GROUP BY deployment_type;

-- Growth metrics summary view
CREATE VIEW growth_metrics_summary AS
SELECT 
  DATE_TRUNC('month', metric_date) as month,
  AVG(total_downloads) as avg_downloads,
  AVG(app_store_conversion_rate) as avg_conversion_rate,
  AVG(viral_coefficient) as avg_viral_coefficient,
  AVG(lifetime_value) as avg_lifetime_value,
  AVG(retention_rate_day_30) as avg_retention_30d
FROM growth_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', metric_date)
ORDER BY month DESC;

-- Referral performance view
CREATE VIEW referral_performance AS
SELECT 
  rc.user_id as referrer_id,
  rc.code,
  rc.current_uses,
  rc.total_conversions,
  rc.total_revenue,
  COUNT(conv.id) as conversion_count,
  SUM(conv.conversion_value) as total_conversion_value,
  AVG(conv.conversion_value) as avg_conversion_value
FROM referral_codes rc
LEFT JOIN referral_conversions conv ON rc.code = conv.referral_code
GROUP BY rc.user_id, rc.code, rc.current_uses, rc.total_conversions, rc.total_revenue;

-- Influencer ROI view
CREATE VIEW influencer_roi_summary AS
SELECT 
  platform,
  COUNT(*) as partnership_count,
  AVG(follower_count) as avg_followers,
  AVG(engagement_rate) as avg_engagement,
  SUM(impressions) as total_impressions,
  SUM(conversions) as total_conversions,
  SUM(revenue) as total_revenue,
  AVG(roi) as avg_roi,
  SUM(compensation) as total_cost
FROM influencer_partnerships
WHERE contract_end >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY platform
ORDER BY avg_roi DESC;

-- Create functions for analytics

-- Function to calculate viral coefficient
CREATE OR REPLACE FUNCTION calculate_viral_coefficient(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC AS $$
DECLARE
  total_users INTEGER;
  referral_conversions INTEGER;
  avg_referrals NUMERIC;
  conversion_rate NUMERIC;
BEGIN
  -- Get total users in period
  SELECT COUNT(*) INTO total_users
  FROM referral_conversions
  WHERE converted_at::DATE BETWEEN p_start_date AND p_end_date;
  
  -- Get referral conversions
  SELECT COUNT(*) INTO referral_conversions
  FROM referral_conversions
  WHERE converted_at::DATE BETWEEN p_start_date AND p_end_date
  AND conversion_type = 'signup';
  
  -- Calculate average referrals per user
  SELECT AVG(current_uses) INTO avg_referrals
  FROM referral_codes
  WHERE created_at::DATE BETWEEN p_start_date AND p_end_date;
  
  -- Calculate conversion rate
  IF total_users > 0 THEN
    conversion_rate := referral_conversions::NUMERIC / total_users::NUMERIC;
  ELSE
    conversion_rate := 0;
  END IF;
  
  -- Return viral coefficient
  RETURN COALESCE(avg_referrals * conversion_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get enterprise compliance summary
CREATE OR REPLACE FUNCTION get_enterprise_compliance_summary(
  p_organization_id UUID DEFAULT NULL
) RETURNS TABLE (
  total_devices INTEGER,
  compliant_devices INTEGER,
  non_compliant_devices INTEGER,
  compliance_rate NUMERIC,
  critical_violations INTEGER,
  pending_remediation INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_devices,
    COUNT(*) FILTER (WHERE overall_compliant = true)::INTEGER as compliant_devices,
    COUNT(*) FILTER (WHERE overall_compliant = false)::INTEGER as non_compliant_devices,
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE overall_compliant = true)::NUMERIC / COUNT(*)::NUMERIC) * 100
      ELSE 0
    END as compliance_rate,
    SUM(jsonb_array_length(violations) FILTER (WHERE violations @> '[{"severity": "critical"}]'))::INTEGER as critical_violations,
    COUNT(*) FILTER (WHERE overall_compliant = false AND remediation_completed_at IS NULL)::INTEGER as pending_remediation
  FROM mdm_compliance_reports
  WHERE (p_organization_id IS NULL OR organization_id = p_organization_id)
  AND last_check_at >= CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for enterprise security
ALTER TABLE enterprise_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mdm_compliance_reports ENABLE ROW LEVEL SECURITY;

-- Enterprise deployments can only be accessed by organization members
CREATE POLICY enterprise_deployments_access ON enterprise_deployments
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- MDM compliance reports access policy
CREATE POLICY mdm_compliance_access ON mdm_compliance_reports
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON enterprise_deployments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON aso_experiments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON growth_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON referral_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON referral_conversions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON influencer_partnerships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON viral_features TO authenticated;
GRANT SELECT, INSERT, UPDATE ON growth_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON mdm_compliance_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON app_store_features TO authenticated;

-- Grant access to views
GRANT SELECT ON enterprise_deployment_summary TO authenticated;
GRANT SELECT ON growth_metrics_summary TO authenticated;
GRANT SELECT ON referral_performance TO authenticated;
GRANT SELECT ON influencer_roi_summary TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_viral_coefficient TO authenticated;
GRANT EXECUTE ON FUNCTION get_enterprise_compliance_summary TO authenticated;