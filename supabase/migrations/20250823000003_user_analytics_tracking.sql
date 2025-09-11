-- =============================================
-- USER ANALYTICS TRACKING SYSTEM
-- Feature ID: WS-105 - User Analytics Tracking
-- Migration: 20250823000002_user_analytics_tracking.sql
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USER ANALYTICS EVENTS AND SESSIONS
-- =============================================

-- Main analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255) NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  event_properties JSONB DEFAULT '{}',
  page_url TEXT,
  page_title VARCHAR(500),
  referrer TEXT,
  user_agent TEXT,
  platform VARCHAR(50) DEFAULT 'wedsync', -- 'wedsync' or 'wedme'
  user_type VARCHAR(20), -- 'supplier' or 'couple'
  wedding_context JSONB DEFAULT '{}', -- Wedding-specific context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_time ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_platform ON analytics_events(platform, user_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties ON analytics_events USING GIN(event_properties);
CREATE INDEX IF NOT EXISTS idx_analytics_events_wedding_context ON analytics_events USING GIN(wedding_context);

-- =============================================
-- FEATURE ADOPTION TRACKING
-- =============================================

-- Feature adoption tracking table
CREATE TABLE IF NOT EXISTS feature_adoption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name VARCHAR(255) NOT NULL,
  first_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_count INTEGER DEFAULT 1,
  platform VARCHAR(50) NOT NULL DEFAULT 'wedsync',
  user_type VARCHAR(20) NOT NULL,
  vendor_type VARCHAR(50), -- For suppliers only
  subscription_tier VARCHAR(50) DEFAULT 'free',
  feature_context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_name, platform)
);

-- Indexes for feature_adoption
CREATE INDEX IF NOT EXISTS idx_feature_adoption_user ON feature_adoption(user_id, last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_adoption_feature ON feature_adoption(feature_name, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_feature_adoption_tier ON feature_adoption(subscription_tier, vendor_type);
CREATE INDEX IF NOT EXISTS idx_feature_adoption_platform ON feature_adoption(platform, user_type);

-- =============================================
-- USER COHORTS FOR RETENTION ANALYSIS
-- =============================================

-- User cohorts table
CREATE TABLE IF NOT EXISTS user_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_date DATE NOT NULL, -- Week of signup (Monday)
  signup_date DATE NOT NULL,
  platform VARCHAR(50) NOT NULL DEFAULT 'wedsync',
  user_type VARCHAR(20) NOT NULL,
  vendor_type VARCHAR(50),
  subscription_tier VARCHAR(50) DEFAULT 'free',
  first_wedding_date DATE, -- For couples
  signup_source VARCHAR(100),
  referral_code VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Indexes for user_cohorts
CREATE INDEX IF NOT EXISTS idx_user_cohorts_date ON user_cohorts(cohort_date, platform);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_type ON user_cohorts(user_type, vendor_type);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_signup ON user_cohorts(signup_date);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_source ON user_cohorts(signup_source);

-- =============================================
-- USER ACTIVITY TRACKING FOR RETENTION
-- =============================================

-- Weekly user activity summary
CREATE TABLE IF NOT EXISTS user_activity_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_date DATE NOT NULL, -- Monday of the week
  activity_count INTEGER DEFAULT 0,
  unique_features_used INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  pages_visited INTEGER DEFAULT 0,
  events_triggered INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_date)
);

-- Indexes for user_activity_weeks
CREATE INDEX IF NOT EXISTS idx_user_activity_weeks_user_time ON user_activity_weeks(user_id, week_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_weeks_date ON user_activity_weeks(week_date, activity_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_weeks_last_activity ON user_activity_weeks(last_activity_at DESC);

-- =============================================
-- A/B TEST EXPERIMENTS AND ASSIGNMENTS
-- =============================================

-- A/B test experiments
CREATE TABLE IF NOT EXISTS ab_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  variants JSONB NOT NULL, -- Array of variant configurations
  traffic_allocation DECIMAL(3,2) DEFAULT 1.0 CHECK (traffic_allocation >= 0.0 AND traffic_allocation <= 1.0),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
  target_audience JSONB DEFAULT '{}', -- Targeting criteria
  success_metrics JSONB DEFAULT '[]', -- Success metric definitions
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B test user assignments
CREATE TABLE IF NOT EXISTS ab_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES ab_experiments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_name VARCHAR(100) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_exposure_at TIMESTAMP WITH TIME ZONE,
  conversion_events JSONB DEFAULT '[]',
  UNIQUE(experiment_id, user_id)
);

-- Indexes for A/B testing
CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON ab_experiments(status, start_date);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_user ON ab_assignments(user_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_experiment ON ab_assignments(experiment_id, variant_name);

-- =============================================
-- WEDDING-SPECIFIC ANALYTICS CONTEXT
-- =============================================

-- Wedding analytics context
CREATE TABLE IF NOT EXISTS wedding_analytics_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES analytics_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wedding_date DATE,
  days_until_wedding INTEGER,
  client_id UUID, -- References clients table
  vendor_type VARCHAR(50),
  business_impact VARCHAR(20) CHECK (business_impact IN ('low', 'medium', 'high', 'critical')),
  season_type VARCHAR(20) CHECK (season_type IN ('peak', 'off_peak', 'shoulder')),
  planning_stage VARCHAR(50), -- early, middle, late, post-wedding
  budget_range VARCHAR(20), -- under_10k, 10k_25k, 25k_50k, 50k_plus
  guest_count_range VARCHAR(20), -- under_50, 50_100, 100_200, 200_plus
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for wedding_analytics_context
CREATE INDEX IF NOT EXISTS idx_wedding_analytics_context_user ON wedding_analytics_context(user_id, wedding_date);
CREATE INDEX IF NOT EXISTS idx_wedding_analytics_context_impact ON wedding_analytics_context(business_impact, season_type);
CREATE INDEX IF NOT EXISTS idx_wedding_analytics_context_stage ON wedding_analytics_context(planning_stage, days_until_wedding);

-- =============================================
-- PERFORMANCE TRACKING
-- =============================================

-- Page load performance tracking
CREATE TABLE IF NOT EXISTS page_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  page_url TEXT NOT NULL,
  load_time_ms INTEGER,
  dom_content_loaded_ms INTEGER,
  first_contentful_paint_ms INTEGER,
  largest_contentful_paint_ms INTEGER,
  cumulative_layout_shift DECIMAL(5,4),
  connection_type VARCHAR(50),
  device_type VARCHAR(20),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for page_performance
CREATE INDEX IF NOT EXISTS idx_page_performance_url ON page_performance(page_url, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_performance_user ON page_performance(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_performance_load_time ON page_performance(load_time_ms);

-- =============================================
-- CONVERSION FUNNELS
-- =============================================

-- Funnel definitions
CREATE TABLE IF NOT EXISTS conversion_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  steps JSONB NOT NULL, -- Array of funnel step definitions
  platform VARCHAR(50) DEFAULT 'wedsync',
  user_type VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Funnel step completions
CREATE TABLE IF NOT EXISTS funnel_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES conversion_funnels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  step_name VARCHAR(255) NOT NULL,
  step_number INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_to_complete INTEGER, -- milliseconds from funnel start
  properties JSONB DEFAULT '{}'
);

-- Indexes for conversion funnels
CREATE INDEX IF NOT EXISTS idx_funnel_completions_user ON funnel_completions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_completions_funnel ON funnel_completions(funnel_id, step_number, completed_at);
CREATE INDEX IF NOT EXISTS idx_funnel_completions_session ON funnel_completions(session_id, step_number);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_adoption ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_analytics_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_completions ENABLE ROW LEVEL SECURITY;

-- Analytics events policies
CREATE POLICY "Users can insert their own analytics events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own analytics events" ON analytics_events
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('admin', 'analytics')
    )
  );

-- Feature adoption policies
CREATE POLICY "Users can manage their own feature adoption" ON feature_adoption
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feature adoption" ON feature_adoption
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('admin', 'analytics')
    )
  );

-- User cohorts policies (admin/analytics only)
CREATE POLICY "Only admins can manage user cohorts" ON user_cohorts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('admin', 'analytics')
    )
  );

-- User activity policies
CREATE POLICY "Users can view their own activity" ON user_activity_weeks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can update user activity" ON user_activity_weeks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all activity" ON user_activity_weeks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('admin', 'analytics')
    )
  );

-- A/B testing policies
CREATE POLICY "Users can view active experiments" ON ab_experiments
  FOR SELECT USING (status = 'running');

CREATE POLICY "Admins can manage experiments" ON ab_experiments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('admin', 'analytics')
    )
  );

CREATE POLICY "Users can view their assignments" ON ab_assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create assignments" ON ab_assignments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Wedding context policies
CREATE POLICY "Users can manage their wedding context" ON wedding_analytics_context
  FOR ALL USING (auth.uid() = user_id);

-- Performance tracking policies
CREATE POLICY "Users can insert performance data" ON page_performance
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their performance data" ON page_performance
  FOR SELECT USING (auth.uid() = user_id);

-- Funnel policies
CREATE POLICY "Everyone can view active funnels" ON conversion_funnels
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage funnels" ON conversion_funnels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role IN ('admin', 'analytics')
    )
  );

CREATE POLICY "Users can insert funnel completions" ON funnel_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their funnel completions" ON funnel_completions
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update feature adoption usage
CREATE OR REPLACE FUNCTION update_feature_adoption()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract feature name from event properties
  IF NEW.event_name LIKE 'feature_%' AND NEW.event_properties ? 'feature' THEN
    INSERT INTO feature_adoption (
      user_id,
      feature_name,
      platform,
      user_type,
      vendor_type,
      subscription_tier
    )
    VALUES (
      NEW.user_id,
      NEW.event_properties->>'feature',
      NEW.platform,
      NEW.user_type,
      NEW.event_properties->>'vendor_type',
      NEW.event_properties->>'subscription_tier'
    )
    ON CONFLICT (user_id, feature_name, platform) 
    DO UPDATE SET
      usage_count = feature_adoption.usage_count + 1,
      last_used_at = NOW(),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update feature adoption
CREATE TRIGGER trigger_update_feature_adoption
  AFTER INSERT ON analytics_events
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_adoption();

-- Function to update weekly activity summary
CREATE OR REPLACE FUNCTION update_weekly_activity()
RETURNS TRIGGER AS $$
DECLARE
  week_start DATE;
BEGIN
  -- Get the Monday of the week for the event
  week_start := DATE_TRUNC('week', NEW.created_at::date);
  
  -- Update or insert weekly activity record
  INSERT INTO user_activity_weeks (
    user_id,
    week_date,
    activity_count,
    events_triggered,
    last_activity_at
  )
  VALUES (
    NEW.user_id,
    week_start,
    1,
    1,
    NEW.created_at
  )
  ON CONFLICT (user_id, week_date)
  DO UPDATE SET
    activity_count = user_activity_weeks.activity_count + 1,
    events_triggered = user_activity_weeks.events_triggered + 1,
    last_activity_at = GREATEST(user_activity_weeks.last_activity_at, NEW.created_at),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update weekly activity
CREATE TRIGGER trigger_update_weekly_activity
  AFTER INSERT ON analytics_events
  FOR EACH ROW
  WHERE NEW.user_id IS NOT NULL
  EXECUTE FUNCTION update_weekly_activity();

-- Function to automatically assign users to cohorts on signup
CREATE OR REPLACE FUNCTION assign_user_cohort()
RETURNS TRIGGER AS $$
DECLARE
  week_start DATE;
BEGIN
  -- Get the Monday of the signup week
  week_start := DATE_TRUNC('week', NEW.created_at::date);
  
  -- Insert into user cohorts
  INSERT INTO user_cohorts (
    user_id,
    cohort_date,
    signup_date,
    platform,
    user_type,
    vendor_type,
    subscription_tier,
    first_wedding_date,
    signup_source,
    referral_code
  )
  VALUES (
    NEW.user_id,
    week_start,
    NEW.created_at::date,
    COALESCE(NEW.raw_user_meta_data->>'platform', 'wedsync'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'is_couple' = 'true' THEN 'couple'
      ELSE 'supplier'
    END,
    NEW.raw_user_meta_data->>'vendor_type',
    COALESCE(NEW.raw_user_meta_data->>'tier', 'free'),
    (NEW.raw_user_meta_data->>'wedding_date')::date,
    NEW.raw_user_meta_data->>'signup_source',
    NEW.raw_user_meta_data->>'referral_code'
  )
  ON CONFLICT (user_id, platform) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to assign new users to cohorts
CREATE TRIGGER trigger_assign_user_cohort
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_cohort();

-- =============================================
-- ANALYTICS HELPER VIEWS
-- =============================================

-- View for daily active users
CREATE OR REPLACE VIEW daily_active_users AS
SELECT 
  DATE(created_at) as date,
  platform,
  user_type,
  COUNT(DISTINCT user_id) as dau
FROM analytics_events 
WHERE user_id IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), platform, user_type
ORDER BY date DESC;

-- View for feature adoption summary
CREATE OR REPLACE VIEW feature_adoption_summary AS
SELECT 
  feature_name,
  platform,
  user_type,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE usage_count >= 10) as power_users,
  AVG(usage_count) as avg_usage,
  MAX(usage_count) as max_usage,
  MIN(first_used_at) as first_adoption,
  MAX(last_used_at) as last_usage
FROM feature_adoption
GROUP BY feature_name, platform, user_type
ORDER BY total_users DESC;

-- View for cohort retention analysis
CREATE OR REPLACE VIEW cohort_retention AS
WITH cohort_users AS (
  SELECT 
    cohort_date,
    platform,
    user_type,
    COUNT(*) as cohort_size
  FROM user_cohorts
  GROUP BY cohort_date, platform, user_type
),
cohort_activity AS (
  SELECT 
    uc.cohort_date,
    uc.platform,
    uc.user_type,
    uaw.week_date,
    DATE_PART('week', uaw.week_date) - DATE_PART('week', uc.cohort_date) as week_number,
    COUNT(DISTINCT uaw.user_id) as active_users
  FROM user_cohorts uc
  JOIN user_activity_weeks uaw ON uc.user_id = uaw.user_id
  WHERE uaw.week_date >= uc.cohort_date
  GROUP BY uc.cohort_date, uc.platform, uc.user_type, uaw.week_date
)
SELECT 
  cu.cohort_date,
  cu.platform,
  cu.user_type,
  cu.cohort_size,
  ca.week_number,
  ca.active_users,
  ROUND(ca.active_users::decimal / cu.cohort_size * 100, 2) as retention_rate
FROM cohort_users cu
LEFT JOIN cohort_activity ca ON cu.cohort_date = ca.cohort_date 
  AND cu.platform = ca.platform 
  AND cu.user_type = ca.user_type
ORDER BY cu.cohort_date DESC, ca.week_number;

-- =============================================
-- ANALYTICS SUMMARY MATERIALIZED VIEW
-- =============================================

-- Materialized view for analytics dashboard (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_dashboard_summary AS
WITH user_metrics AS (
  SELECT 
    COUNT(DISTINCT user_id) FILTER (WHERE created_at >= CURRENT_DATE) as dau,
    COUNT(DISTINCT user_id) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as wau,
    COUNT(DISTINCT user_id) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as mau,
    platform,
    user_type
  FROM analytics_events 
  WHERE user_id IS NOT NULL
  GROUP BY platform, user_type
),
event_metrics AS (
  SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as events_today,
    COUNT(DISTINCT event_name) as unique_events,
    platform,
    user_type
  FROM analytics_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY platform, user_type
),
feature_metrics AS (
  SELECT 
    COUNT(DISTINCT feature_name) as total_features,
    COUNT(*) as total_adoptions,
    AVG(usage_count) as avg_usage,
    platform,
    user_type
  FROM feature_adoption
  GROUP BY platform, user_type
)
SELECT 
  COALESCE(um.platform, em.platform, fm.platform) as platform,
  COALESCE(um.user_type, em.user_type, fm.user_type) as user_type,
  COALESCE(um.dau, 0) as dau,
  COALESCE(um.wau, 0) as wau,
  COALESCE(um.mau, 0) as mau,
  CASE WHEN um.mau > 0 THEN ROUND(um.dau::decimal / um.mau * 100, 2) ELSE 0 END as stickiness,
  COALESCE(em.total_events, 0) as total_events,
  COALESCE(em.events_today, 0) as events_today,
  COALESCE(em.unique_events, 0) as unique_events,
  COALESCE(fm.total_features, 0) as total_features,
  COALESCE(fm.total_adoptions, 0) as total_adoptions,
  COALESCE(fm.avg_usage, 0) as avg_feature_usage,
  NOW() as last_updated
FROM user_metrics um
FULL OUTER JOIN event_metrics em ON um.platform = em.platform AND um.user_type = em.user_type
FULL OUTER JOIN feature_metrics fm ON COALESCE(um.platform, em.platform) = fm.platform 
  AND COALESCE(um.user_type, em.user_type) = fm.user_type;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_dashboard_summary_unique 
ON analytics_dashboard_summary(platform, user_type);

-- Function to refresh analytics dashboard
CREATE OR REPLACE FUNCTION refresh_analytics_dashboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_dashboard_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CLEANUP AND MAINTENANCE
-- =============================================

-- Function to cleanup old analytics data (runs monthly)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data()
RETURNS void AS $$
BEGIN
  -- Delete analytics events older than 2 years
  DELETE FROM analytics_events 
  WHERE created_at < CURRENT_DATE - INTERVAL '2 years';
  
  -- Delete page performance data older than 6 months
  DELETE FROM page_performance 
  WHERE created_at < CURRENT_DATE - INTERVAL '6 months';
  
  -- Delete old weekly activity summaries older than 2 years
  DELETE FROM user_activity_weeks 
  WHERE week_date < CURRENT_DATE - INTERVAL '2 years';
  
  -- Archive completed A/B experiments older than 1 year
  UPDATE ab_experiments 
  SET status = 'archived'
  WHERE status = 'completed' 
    AND end_date < CURRENT_DATE - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_analytics_dashboard() TO authenticated;

-- Add helpful comments
COMMENT ON TABLE analytics_events IS 'Stores all user analytics events with wedding business context';
COMMENT ON TABLE feature_adoption IS 'Tracks feature usage and adoption patterns by users';
COMMENT ON TABLE user_cohorts IS 'User signup cohorts for retention analysis';
COMMENT ON TABLE user_activity_weeks IS 'Weekly user activity summaries for retention calculations';
COMMENT ON TABLE ab_experiments IS 'A/B test experiment definitions and configurations';
COMMENT ON TABLE ab_assignments IS 'User assignments to A/B test variants';
COMMENT ON TABLE wedding_analytics_context IS 'Wedding-specific context for analytics events';
COMMENT ON TABLE page_performance IS 'Page load performance metrics';
COMMENT ON TABLE conversion_funnels IS 'Funnel definitions for conversion tracking';
COMMENT ON TABLE funnel_completions IS 'User progress through conversion funnels';

-- Migration complete
SELECT 'User Analytics Tracking System migration completed successfully' as status;