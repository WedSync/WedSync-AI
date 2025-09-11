-- Enhanced app analytics for native features
-- WS-146: Native App Analytics Migration

BEGIN;

-- Native app usage tracking
CREATE TABLE IF NOT EXISTS native_app_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  app_version TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'pwa', 'web')),
  device_info JSONB DEFAULT '{}',
  
  -- Feature usage tracking
  camera_usage_count INTEGER DEFAULT 0,
  push_notifications_enabled BOOLEAN DEFAULT false,
  deep_links_used INTEGER DEFAULT 0,
  native_shares_count INTEGER DEFAULT 0,
  
  -- Session data
  session_duration INTEGER, -- seconds
  offline_usage_time INTEGER DEFAULT 0, -- seconds spent offline
  background_sync_events INTEGER DEFAULT 0,
  
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT valid_session_duration CHECK (session_duration >= 0),
  CONSTRAINT valid_offline_time CHECK (offline_usage_time >= 0)
);

-- Push notification tracking
CREATE TABLE IF NOT EXISTS push_notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  target_audience TEXT DEFAULT 'all_users' CHECK (target_audience IN ('all_users', 'active_users', 'at_risk_users', 'new_users', 'returning_users')),
  notification_title TEXT NOT NULL,
  notification_body TEXT NOT NULL,
  deep_link_url TEXT,
  
  -- Targeting
  platform_targeting TEXT[] DEFAULT ARRAY['ios', 'android', 'pwa'],
  user_segment_targeting JSONB DEFAULT '{}',
  
  -- Performance metrics
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0, -- users who completed desired action
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Status
  campaign_status TEXT DEFAULT 'draft' CHECK (campaign_status IN ('draft', 'scheduled', 'sending', 'completed', 'failed')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_counts CHECK (
    sent_count >= 0 AND 
    delivered_count >= 0 AND 
    opened_count >= 0 AND 
    clicked_count >= 0 AND
    delivered_count <= sent_count AND 
    opened_count <= delivered_count AND 
    clicked_count <= opened_count
  )
);

-- Push notification delivery tracking
CREATE TABLE IF NOT EXISTS push_notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES push_notification_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT,
  platform TEXT NOT NULL,
  
  -- Delivery status
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  action_taken_at TIMESTAMPTZ,
  
  -- Status tracking
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'expired')),
  failure_reason TEXT,
  
  -- Interaction data
  interaction_data JSONB DEFAULT '{}',
  
  -- Indexes
  UNIQUE(campaign_id, user_id)
);

-- App store review tracking
CREATE TABLE IF NOT EXISTS app_store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  
  -- Review prompt tracking
  prompt_shown_at TIMESTAMPTZ,
  prompt_response TEXT CHECK (prompt_response IN ('positive', 'negative', 'dismissed')),
  
  -- App store interaction
  redirected_to_store_at TIMESTAMPTZ,
  review_left BOOLEAN DEFAULT false,
  review_rating INTEGER CHECK (review_rating >= 1 AND review_rating <= 5),
  
  -- Feedback data
  feedback_text TEXT,
  feedback_category TEXT,
  feedback_sentiment TEXT CHECK (feedback_sentiment IN ('positive', 'neutral', 'negative')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deep link analytics
CREATE TABLE IF NOT EXISTS deep_link_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Link details
  deep_link_url TEXT NOT NULL,
  source_path TEXT NOT NULL,
  destination_path TEXT,
  link_type TEXT DEFAULT 'custom' CHECK (link_type IN ('custom', 'universal', 'app_link', 'share')),
  
  -- Context
  referrer TEXT,
  user_agent TEXT,
  platform TEXT,
  
  -- Interaction tracking
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  app_opened BOOLEAN DEFAULT false,
  fallback_used BOOLEAN DEFAULT false,
  conversion_completed BOOLEAN DEFAULT false,
  
  -- Session data
  session_id TEXT,
  time_to_conversion INTEGER, -- seconds from click to conversion
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Native feature usage events
CREATE TABLE IF NOT EXISTS native_feature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN ('camera_used', 'location_accessed', 'share_invoked', 'background_sync', 'offline_mode', 'push_received', 'deep_link_opened')),
  feature_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  app_version TEXT,
  
  -- Context
  context_data JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Performance
  execution_time_ms INTEGER,
  battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
  network_type TEXT,
  
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- App performance metrics
CREATE TABLE IF NOT EXISTS app_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- App details
  app_version TEXT NOT NULL,
  platform TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  
  -- Performance metrics
  app_launch_time_ms INTEGER,
  time_to_interactive_ms INTEGER,
  memory_usage_mb DECIMAL,
  battery_drain_rate DECIMAL,
  
  -- Stability metrics
  crash_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  anr_count INTEGER DEFAULT 0, -- Android Not Responding
  
  -- Usage metrics
  screen_time_seconds INTEGER DEFAULT 0,
  background_time_seconds INTEGER DEFAULT 0,
  network_requests_count INTEGER DEFAULT 0,
  storage_used_mb DECIMAL DEFAULT 0,
  
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- App store optimization metrics
CREATE TABLE IF NOT EXISTS app_store_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Store details
  store_type TEXT NOT NULL CHECK (store_type IN ('ios_app_store', 'google_play', 'microsoft_store')),
  app_version TEXT NOT NULL,
  
  -- Visibility metrics
  impressions INTEGER DEFAULT 0,
  store_listing_views INTEGER DEFAULT 0,
  conversion_rate DECIMAL DEFAULT 0,
  
  -- Rating metrics
  average_rating DECIMAL CHECK (average_rating >= 0 AND average_rating <= 5),
  total_ratings INTEGER DEFAULT 0,
  five_star_ratings INTEGER DEFAULT 0,
  four_star_ratings INTEGER DEFAULT 0,
  three_star_ratings INTEGER DEFAULT 0,
  two_star_ratings INTEGER DEFAULT 0,
  one_star_ratings INTEGER DEFAULT 0,
  
  -- Download metrics
  downloads INTEGER DEFAULT 0,
  installs INTEGER DEFAULT 0,
  uninstalls INTEGER DEFAULT 0,
  
  -- Engagement metrics
  day_1_retention DECIMAL DEFAULT 0,
  day_7_retention DECIMAL DEFAULT 0,
  day_30_retention DECIMAL DEFAULT 0,
  
  -- Keywords and ASO
  keyword_rankings JSONB DEFAULT '{}',
  competitor_analysis JSONB DEFAULT '{}',
  
  recorded_date DATE DEFAULT CURRENT_DATE,
  
  -- Ensure one record per store per app version per day
  UNIQUE(store_type, app_version, recorded_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_native_app_usage_user_platform ON native_app_usage(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_native_app_usage_recorded_at ON native_app_usage(recorded_at);
CREATE INDEX IF NOT EXISTS idx_push_campaigns_status ON push_notification_campaigns(campaign_status);
CREATE INDEX IF NOT EXISTS idx_push_campaigns_scheduled ON push_notification_campaigns(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_push_deliveries_campaign_user ON push_notification_deliveries(campaign_id, user_id);
CREATE INDEX IF NOT EXISTS idx_push_deliveries_status ON push_notification_deliveries(delivery_status);
CREATE INDEX IF NOT EXISTS idx_review_tracking_user ON app_store_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_review_tracking_platform ON app_store_reviews(platform);
CREATE INDEX IF NOT EXISTS idx_deep_link_analytics_user ON deep_link_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_deep_link_analytics_clicked ON deep_link_analytics(clicked_at);
CREATE INDEX IF NOT EXISTS idx_feature_events_user_type ON native_feature_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_feature_events_occurred ON native_feature_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user ON app_performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_platform ON app_performance_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_store_metrics_date ON app_store_metrics(recorded_date);

-- Create views for analytics
CREATE OR REPLACE VIEW native_app_analytics_summary AS
SELECT 
  platform,
  DATE_TRUNC('day', recorded_at) as date,
  COUNT(DISTINCT user_id) as active_users,
  AVG(session_duration) as avg_session_duration,
  SUM(camera_usage_count) as total_camera_usage,
  COUNT(CASE WHEN push_notifications_enabled THEN 1 END) as push_enabled_users,
  SUM(deep_links_used) as total_deep_links,
  SUM(native_shares_count) as total_shares,
  AVG(offline_usage_time) as avg_offline_time
FROM native_app_usage
WHERE recorded_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY platform, DATE_TRUNC('day', recorded_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW push_campaign_performance AS
SELECT 
  campaign_name,
  target_audience,
  platform_targeting,
  sent_count,
  delivered_count,
  opened_count,
  clicked_count,
  conversion_count,
  CASE WHEN sent_count > 0 THEN ROUND((delivered_count::DECIMAL / sent_count) * 100, 2) ELSE 0 END as delivery_rate,
  CASE WHEN delivered_count > 0 THEN ROUND((opened_count::DECIMAL / delivered_count) * 100, 2) ELSE 0 END as open_rate,
  CASE WHEN opened_count > 0 THEN ROUND((clicked_count::DECIMAL / opened_count) * 100, 2) ELSE 0 END as click_rate,
  CASE WHEN clicked_count > 0 THEN ROUND((conversion_count::DECIMAL / clicked_count) * 100, 2) ELSE 0 END as conversion_rate,
  campaign_status,
  created_at,
  sent_at
FROM push_notification_campaigns
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW deep_link_performance AS
SELECT 
  link_type,
  DATE_TRUNC('day', clicked_at) as date,
  COUNT(*) as total_clicks,
  COUNT(CASE WHEN app_opened THEN 1 END) as successful_opens,
  COUNT(CASE WHEN fallback_used THEN 1 END) as fallback_usage,
  COUNT(CASE WHEN conversion_completed THEN 1 END) as conversions,
  ROUND(AVG(time_to_conversion), 2) as avg_time_to_conversion,
  platform,
  CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(CASE WHEN app_opened THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2) ELSE 0 END as success_rate
FROM deep_link_analytics
WHERE clicked_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY link_type, DATE_TRUNC('day', clicked_at), platform
ORDER BY date DESC;

-- RLS Policies
ALTER TABLE native_app_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_link_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE native_feature_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_store_metrics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own native app usage" ON native_app_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own native app usage" ON native_app_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own push deliveries" ON push_notification_deliveries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own app reviews" ON app_store_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own app reviews" ON app_store_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own deep link analytics" ON deep_link_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deep link analytics" ON deep_link_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feature events" ON native_feature_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feature events" ON native_feature_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own performance metrics" ON app_performance_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own performance metrics" ON app_performance_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin access for campaigns and store metrics
CREATE POLICY "Admins can manage push campaigns" ON push_notification_campaigns FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can manage store metrics" ON app_store_metrics FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- Functions for analytics
CREATE OR REPLACE FUNCTION track_native_feature_usage(
  p_event_type TEXT,
  p_feature_name TEXT,
  p_platform TEXT,
  p_context_data JSONB DEFAULT '{}',
  p_success BOOLEAN DEFAULT true,
  p_execution_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO native_feature_events (
    user_id,
    event_type,
    feature_name,
    platform,
    context_data,
    success,
    execution_time_ms
  ) VALUES (
    auth.uid(),
    p_event_type,
    p_feature_name,
    p_platform,
    p_context_data,
    p_success,
    p_execution_time_ms
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_app_usage_stats(
  p_platform TEXT,
  p_app_version TEXT,
  p_session_duration INTEGER DEFAULT NULL,
  p_camera_used BOOLEAN DEFAULT FALSE,
  p_push_enabled BOOLEAN DEFAULT FALSE,
  p_deep_links_used INTEGER DEFAULT 0,
  p_shares_count INTEGER DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usage_id UUID;
BEGIN
  INSERT INTO native_app_usage (
    user_id,
    platform,
    app_version,
    session_duration,
    camera_usage_count,
    push_notifications_enabled,
    deep_links_used,
    native_shares_count
  ) VALUES (
    auth.uid(),
    p_platform,
    p_app_version,
    p_session_duration,
    CASE WHEN p_camera_used THEN 1 ELSE 0 END,
    p_push_enabled,
    p_deep_links_used,
    p_shares_count
  ) RETURNING id INTO usage_id;
  
  RETURN usage_id;
END;
$$;

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_push_campaigns_updated_at 
  BEFORE UPDATE ON push_notification_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;