-- WS-146: App Store Preparation System
-- App store metrics and installation tracking

-- Create app store metrics tracking table
CREATE TABLE IF NOT EXISTS app_store_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  install_source TEXT NOT NULL CHECK (install_source IN ('pwa_prompt', 'app_store', 'play_store', 'microsoft_store', 'browser_install')),
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  browser_info JSONB DEFAULT '{}',
  referrer TEXT,
  install_completed BOOLEAN DEFAULT false,
  install_timestamp TIMESTAMPTZ,
  first_launch_timestamp TIMESTAMPTZ,
  user_engagement_score INTEGER CHECK (user_engagement_score >= 0 AND user_engagement_score <= 10),
  platform TEXT,
  app_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_app_store_metrics_user_id ON app_store_metrics(user_id);
CREATE INDEX idx_app_store_metrics_install_source ON app_store_metrics(install_source);
CREATE INDEX idx_app_store_metrics_created_at ON app_store_metrics(created_at DESC);
CREATE INDEX idx_app_store_metrics_device_type ON app_store_metrics(device_type);

-- Track install prompt effectiveness
CREATE TABLE IF NOT EXISTS install_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('banner', 'modal', 'contextual', 'ios_instructions', 'returning_visitor', 'high_engagement')),
  page_url TEXT NOT NULL,
  user_engagement_score INTEGER CHECK (user_engagement_score >= 0 AND user_engagement_score <= 10),
  prompt_shown_at TIMESTAMPTZ DEFAULT NOW(),
  user_response TEXT CHECK (user_response IN ('accepted', 'dismissed', 'ignored', 'shown', 'error', 'ios_shown')),
  response_timestamp TIMESTAMPTZ,
  install_completed BOOLEAN DEFAULT false,
  device_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for install prompts
CREATE INDEX idx_install_prompts_session_id ON install_prompts(session_id);
CREATE INDEX idx_install_prompts_prompt_type ON install_prompts(prompt_type);
CREATE INDEX idx_install_prompts_user_response ON install_prompts(user_response);
CREATE INDEX idx_install_prompts_created_at ON install_prompts(created_at DESC);

-- App store listing metadata
CREATE TABLE IF NOT EXISTS app_store_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_type TEXT NOT NULL CHECK (store_type IN ('apple_app_store', 'google_play', 'microsoft_store', 'samsung_galaxy_store', 'amazon_appstore')),
  app_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'published', 'rejected', 'removed')),
  listing_url TEXT,
  submission_date TIMESTAMPTZ,
  approval_date TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}',
  screenshots JSONB DEFAULT '[]',
  keywords TEXT[],
  category TEXT,
  rating DECIMAL(2,1),
  review_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_type, app_id)
);

-- Create indexes for app store listings
CREATE INDEX idx_app_store_listings_store_type ON app_store_listings(store_type);
CREATE INDEX idx_app_store_listings_status ON app_store_listings(status);
CREATE INDEX idx_app_store_listings_created_at ON app_store_listings(created_at DESC);

-- PWA update tracking
CREATE TABLE IF NOT EXISTS pwa_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_from TEXT,
  version_to TEXT NOT NULL,
  update_type TEXT CHECK (update_type IN ('automatic', 'manual', 'forced', 'background')),
  update_status TEXT CHECK (update_status IN ('pending', 'downloading', 'ready', 'installed', 'failed')),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  update_size_bytes INTEGER,
  download_duration_ms INTEGER,
  installation_duration_ms INTEGER,
  error_message TEXT,
  device_info JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for PWA updates
CREATE INDEX idx_pwa_updates_user_id ON pwa_updates(user_id);
CREATE INDEX idx_pwa_updates_update_status ON pwa_updates(update_status);
CREATE INDEX idx_pwa_updates_created_at ON pwa_updates(created_at DESC);

-- Installation conversion funnel
CREATE TABLE IF NOT EXISTS installation_funnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  funnel_stage TEXT NOT NULL CHECK (funnel_stage IN ('page_visit', 'engagement_threshold', 'prompt_eligible', 'prompt_shown', 'prompt_accepted', 'installation_started', 'installation_completed', 'first_launch')),
  stage_timestamp TIMESTAMPTZ DEFAULT NOW(),
  stage_metadata JSONB DEFAULT '{}',
  conversion_path TEXT[],
  drop_off_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for installation funnel
CREATE INDEX idx_installation_funnel_session_id ON installation_funnel(session_id);
CREATE INDEX idx_installation_funnel_user_id ON installation_funnel(user_id);
CREATE INDEX idx_installation_funnel_stage ON installation_funnel(funnel_stage);
CREATE INDEX idx_installation_funnel_created_at ON installation_funnel(created_at DESC);

-- App performance metrics
CREATE TABLE IF NOT EXISTS app_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('launch_time', 'page_load', 'cache_hit_rate', 'offline_usage', 'crash_rate', 'memory_usage', 'battery_impact')),
  metric_value DECIMAL,
  metric_unit TEXT,
  platform TEXT,
  app_version TEXT,
  device_info JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for app performance metrics
CREATE INDEX idx_app_performance_metrics_type ON app_performance_metrics(metric_type);
CREATE INDEX idx_app_performance_metrics_measured_at ON app_performance_metrics(measured_at DESC);
CREATE INDEX idx_app_performance_metrics_platform ON app_performance_metrics(platform);

-- Create views for analytics

-- Installation conversion rate by source
CREATE OR REPLACE VIEW installation_conversion_rates AS
SELECT 
  install_source,
  COUNT(*) FILTER (WHERE install_completed = true) AS successful_installs,
  COUNT(*) AS total_attempts,
  ROUND((COUNT(*) FILTER (WHERE install_completed = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) AS conversion_rate
FROM app_store_metrics
GROUP BY install_source;

-- Prompt effectiveness analysis
CREATE OR REPLACE VIEW prompt_effectiveness AS
SELECT 
  prompt_type,
  COUNT(*) AS prompts_shown,
  COUNT(*) FILTER (WHERE user_response = 'accepted') AS accepted,
  COUNT(*) FILTER (WHERE user_response = 'dismissed') AS dismissed,
  COUNT(*) FILTER (WHERE install_completed = true) AS installations,
  ROUND((COUNT(*) FILTER (WHERE user_response = 'accepted')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) AS acceptance_rate,
  ROUND(AVG(user_engagement_score), 2) AS avg_engagement_score
FROM install_prompts
GROUP BY prompt_type;

-- Funnel conversion analysis
CREATE OR REPLACE VIEW installation_funnel_analysis AS
WITH funnel_counts AS (
  SELECT 
    funnel_stage,
    COUNT(DISTINCT session_id) AS sessions,
    LAG(COUNT(DISTINCT session_id)) OVER (ORDER BY 
      CASE funnel_stage
        WHEN 'page_visit' THEN 1
        WHEN 'engagement_threshold' THEN 2
        WHEN 'prompt_eligible' THEN 3
        WHEN 'prompt_shown' THEN 4
        WHEN 'prompt_accepted' THEN 5
        WHEN 'installation_started' THEN 6
        WHEN 'installation_completed' THEN 7
        WHEN 'first_launch' THEN 8
      END
    ) AS previous_stage_sessions
  FROM installation_funnel
  GROUP BY funnel_stage
)
SELECT 
  funnel_stage,
  sessions,
  previous_stage_sessions,
  ROUND((sessions::DECIMAL / NULLIF(previous_stage_sessions, 0)) * 100, 2) AS conversion_rate
FROM funnel_counts
ORDER BY 
  CASE funnel_stage
    WHEN 'page_visit' THEN 1
    WHEN 'engagement_threshold' THEN 2
    WHEN 'prompt_eligible' THEN 3
    WHEN 'prompt_shown' THEN 4
    WHEN 'prompt_accepted' THEN 5
    WHEN 'installation_started' THEN 6
    WHEN 'installation_completed' THEN 7
    WHEN 'first_launch' THEN 8
  END;

-- Device and platform distribution
CREATE OR REPLACE VIEW device_platform_distribution AS
SELECT 
  device_type,
  browser_info->>'browser' AS browser,
  COUNT(*) AS install_count,
  ROUND((COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER ()) * 100, 2) AS percentage
FROM app_store_metrics
WHERE install_completed = true
GROUP BY device_type, browser_info->>'browser'
ORDER BY install_count DESC;

-- App performance by platform
CREATE OR REPLACE VIEW app_performance_by_platform AS
SELECT 
  platform,
  metric_type,
  AVG(metric_value) AS avg_value,
  MIN(metric_value) AS min_value,
  MAX(metric_value) AS max_value,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) AS median_value,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) AS p95_value,
  metric_unit
FROM app_performance_metrics
WHERE measured_at >= NOW() - INTERVAL '7 days'
GROUP BY platform, metric_type, metric_unit
ORDER BY platform, metric_type;

-- Create functions for analytics

-- Function to calculate installation velocity
CREATE OR REPLACE FUNCTION calculate_installation_velocity(
  p_interval INTERVAL DEFAULT INTERVAL '1 day'
) RETURNS TABLE (
  time_bucket TIMESTAMPTZ,
  installations INTEGER,
  velocity DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH time_series AS (
    SELECT 
      date_trunc('hour', created_at) AS time_bucket,
      COUNT(*) AS installations
    FROM app_store_metrics
    WHERE install_completed = true
      AND created_at >= NOW() - p_interval
    GROUP BY date_trunc('hour', created_at)
  )
  SELECT 
    ts.time_bucket,
    ts.installations,
    ts.installations::DECIMAL / EXTRACT(EPOCH FROM '1 hour'::INTERVAL) AS velocity
  FROM time_series ts
  ORDER BY ts.time_bucket DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user engagement before installation
CREATE OR REPLACE FUNCTION get_pre_install_engagement(
  p_session_id TEXT
) RETURNS TABLE (
  engagement_score INTEGER,
  page_views INTEGER,
  session_duration INTERVAL,
  interaction_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    MAX(ip.user_engagement_score) AS engagement_score,
    COUNT(DISTINCT if.id) FILTER (WHERE if.funnel_stage = 'page_visit') AS page_views,
    MAX(if.stage_timestamp) - MIN(if.stage_timestamp) AS session_duration,
    COUNT(DISTINCT if.id) AS interaction_count
  FROM installation_funnel if
  LEFT JOIN install_prompts ip ON ip.session_id = if.session_id
  WHERE if.session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE app_store_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE install_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_store_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pwa_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE installation_funnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view their own app metrics" ON app_store_metrics
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own app metrics" ON app_store_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Service role can do everything
CREATE POLICY "Service role has full access" ON app_store_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON install_prompts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON app_store_listings
  FOR ALL USING (auth.role() = 'service_role');

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_store_metrics_updated_at
  BEFORE UPDATE ON app_store_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_store_listings_updated_at
  BEFORE UPDATE ON app_store_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();