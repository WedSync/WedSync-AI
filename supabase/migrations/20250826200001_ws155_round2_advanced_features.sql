-- WS-155 Round 2: Advanced Communication Features Migration

-- A/B Testing Tables
CREATE TABLE IF NOT EXISTS ab_test_campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')) DEFAULT 'draft',
  variants JSONB NOT NULL,
  testing_config JSONB NOT NULL,
  schedule JSONB,
  total_recipients INTEGER DEFAULT 0,
  winner_variant_id TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_test_variant_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ab_test_id UUID NOT NULL REFERENCES ab_test_campaigns(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  recipients JSONB NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_test_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ab_test_id UUID NOT NULL REFERENCES ab_test_campaigns(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL,
  recipient_id UUID NOT NULL,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  conversion_value DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_test_winner_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ab_test_id UUID NOT NULL REFERENCES ab_test_campaigns(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Enhanced Analytics Tables
CREATE TABLE IF NOT EXISTS email_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  campaign_id TEXT,
  message_id TEXT,
  recipient_id UUID,
  status TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  campaign_id TEXT,
  message_id TEXT,
  recipient_id UUID,
  status TEXT,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,2),
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  bounce_rate DECIMAL(5,2),
  unsubscribe_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipient_engagement (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  recipient_id UUID NOT NULL,
  engagement_score DECIMAL(5,2),
  first_open_time INTERVAL,
  total_opens INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  device_type TEXT,
  email_client TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_issues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  recipient_id UUID,
  issue_type TEXT,
  issue_description TEXT,
  provider TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- ML Optimization Tables
CREATE TABLE IF NOT EXISTS engagement_patterns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  channel TEXT,
  engagement_count INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),
  average_response_time INTERVAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipient_engagement_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  day_of_week INTEGER,
  hour_of_day INTEGER,
  action TEXT CHECK (action IN ('opened', 'clicked', 'converted', 'ignored')),
  channel TEXT CHECK (channel IN ('email', 'sms', 'push')),
  response_time INTEGER, -- in minutes
  campaign_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ml_models (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_name TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  weights JSONB,
  performance_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_performance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  engagement_rate DECIMAL(5,2),
  day_of_week INTEGER,
  hour_of_day INTEGER,
  channel TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Queue Tables
CREATE TABLE IF NOT EXISTS message_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id TEXT NOT NULL,
  campaign_id TEXT,
  recipient_id UUID,
  channel TEXT,
  status TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  result_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_failures (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id TEXT NOT NULL,
  campaign_id TEXT,
  recipient_id UUID,
  channel TEXT,
  retry_count INTEGER DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  status TEXT CHECK (status IN ('scheduled', 'processing', 'completed', 'cancelled')) DEFAULT 'scheduled',
  send_at TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  batch_size INTEGER DEFAULT 100,
  total_recipients INTEGER DEFAULT 0,
  message_data JSONB NOT NULL,
  options JSONB,
  channels TEXT[] DEFAULT ARRAY['email'],
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_message_recipients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scheduled_message_id UUID NOT NULL REFERENCES scheduled_messages(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL,
  email TEXT,
  phone TEXT,
  metadata JSONB,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_retries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id TEXT NOT NULL,
  channel TEXT,
  attempt_number INTEGER,
  scheduled_for TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Delivery Enhancement Tables
CREATE TABLE IF NOT EXISTS bounced_recipients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_id UUID NOT NULL,
  message_id TEXT,
  bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft')),
  error_code TEXT,
  error_message TEXT,
  bounced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS failed_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id TEXT NOT NULL,
  campaign_id TEXT,
  recipient_id UUID,
  final_attempt INTEGER,
  error_code TEXT,
  error_message TEXT,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider TEXT NOT NULL,
  attempt_number INTEGER,
  status TEXT,
  error_code TEXT,
  response_time INTEGER, -- in milliseconds
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider Load Balancing Tables
CREATE TABLE IF NOT EXISTS sticky_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_id UUID NOT NULL,
  message_type TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS provider_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_id TEXT NOT NULL,
  success BOOLEAN,
  latency INTEGER, -- in milliseconds
  cost DECIMAL(10,4),
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache Metrics Table
CREATE TABLE IF NOT EXISTS cache_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hits INTEGER DEFAULT 0,
  misses INTEGER DEFAULT 0,
  hit_rate DECIMAL(5,2),
  evictions INTEGER DEFAULT 0,
  memory_usage BIGINT,
  key_count INTEGER,
  avg_access_time DECIMAL(10,2), -- in milliseconds
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Stats Table
CREATE TABLE IF NOT EXISTS template_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_id UUID REFERENCES communication_templates(id),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  avg_open_rate DECIMAL(5,2),
  avg_click_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_ab_test_campaigns_org ON ab_test_campaigns(organization_id);
CREATE INDEX idx_ab_test_results_test ON ab_test_results(ab_test_id);
CREATE INDEX idx_email_analytics_campaign ON email_analytics(campaign_id);
CREATE INDEX idx_email_analytics_recipient ON email_analytics(recipient_id);
CREATE INDEX idx_sms_analytics_campaign ON sms_analytics(campaign_id);
CREATE INDEX idx_campaign_metrics_campaign ON campaign_metrics(campaign_id);
CREATE INDEX idx_engagement_patterns_org ON engagement_patterns(organization_id);
CREATE INDEX idx_engagement_patterns_time ON engagement_patterns(day_of_week, hour_of_day);
CREATE INDEX idx_recipient_engagement_history_recipient ON recipient_engagement_history(recipient_id);
CREATE INDEX idx_recipient_engagement_history_time ON recipient_engagement_history(day_of_week, hour_of_day);
CREATE INDEX idx_message_tracking_campaign ON message_tracking(campaign_id);
CREATE INDEX idx_message_tracking_status ON message_tracking(status);
CREATE INDEX idx_scheduled_messages_org ON scheduled_messages(organization_id);
CREATE INDEX idx_scheduled_messages_send_at ON scheduled_messages(send_at);
CREATE INDEX idx_scheduled_message_recipients_scheduled ON scheduled_message_recipients(scheduled_message_id);
CREATE INDEX idx_message_retries_scheduled ON message_retries(scheduled_for);
CREATE INDEX idx_bounced_recipients_recipient ON bounced_recipients(recipient_id);
CREATE INDEX idx_sticky_sessions_recipient ON sticky_sessions(recipient_id, message_type);
CREATE INDEX idx_provider_metrics_provider ON provider_metrics(provider_id);
CREATE INDEX idx_provider_metrics_timestamp ON provider_metrics(timestamp);

-- Row Level Security
ALTER TABLE ab_test_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization's A/B tests" ON ab_test_campaigns
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create A/B tests for their organization" ON ab_test_campaigns
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their organization's A/B tests" ON ab_test_campaigns
  FOR UPDATE USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their organization's email analytics" ON email_analytics
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their organization's SMS analytics" ON sms_analytics
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their organization's scheduled messages" ON scheduled_messages
  FOR ALL USING (organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  ));

-- Functions and Triggers
CREATE OR REPLACE FUNCTION update_campaign_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campaign metrics when analytics change
  INSERT INTO campaign_metrics (
    campaign_id,
    total_sent,
    total_delivered,
    total_opened,
    total_clicked,
    total_bounced,
    delivery_rate,
    open_rate,
    click_rate
  )
  SELECT
    NEW.campaign_id,
    COUNT(*),
    COUNT(CASE WHEN status = 'delivered' THEN 1 END),
    COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END),
    COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END),
    COUNT(CASE WHEN bounced_at IS NOT NULL THEN 1 END),
    CASE WHEN COUNT(*) > 0 THEN
      (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::DECIMAL / COUNT(*)) * 100
    ELSE 0 END,
    CASE WHEN COUNT(CASE WHEN status = 'delivered' THEN 1 END) > 0 THEN
      (COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END)::DECIMAL / 
       COUNT(CASE WHEN status = 'delivered' THEN 1 END)) * 100
    ELSE 0 END,
    CASE WHEN COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) > 0 THEN
      (COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END)::DECIMAL / 
       COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END)) * 100
    ELSE 0 END
  FROM email_analytics
  WHERE campaign_id = NEW.campaign_id
  GROUP BY campaign_id
  ON CONFLICT (campaign_id)
  DO UPDATE SET
    total_sent = EXCLUDED.total_sent,
    total_delivered = EXCLUDED.total_delivered,
    total_opened = EXCLUDED.total_opened,
    total_clicked = EXCLUDED.total_clicked,
    total_bounced = EXCLUDED.total_bounced,
    delivery_rate = EXCLUDED.delivery_rate,
    open_rate = EXCLUDED.open_rate,
    click_rate = EXCLUDED.click_rate,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_metrics_on_email_change
  AFTER INSERT OR UPDATE ON email_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_metrics();

-- Add unique constraint for campaign metrics
ALTER TABLE campaign_metrics ADD CONSTRAINT unique_campaign_metrics UNIQUE (campaign_id);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;