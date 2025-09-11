-- WS-071 SaaS Subscription Billing System
-- Migration for comprehensive subscription tiers, usage tracking, and billing

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  stripe_price_id VARCHAR(100) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  billing_interval VARCHAR(10) NOT NULL CHECK (billing_interval IN ('month', 'year')),
  trial_days INTEGER DEFAULT 14,
  limits JSONB NOT NULL DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(100) NOT NULL,
  stripe_subscription_id VARCHAR(100) NOT NULL UNIQUE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete', 'paused')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  pause_collection JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage Metrics Table for real-time tracking
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  clients_count INTEGER NOT NULL DEFAULT 0,
  vendors_count INTEGER NOT NULL DEFAULT 0,
  journeys_count INTEGER NOT NULL DEFAULT 0,
  storage_used_gb DECIMAL(10,3) NOT NULL DEFAULT 0,
  team_members_count INTEGER NOT NULL DEFAULT 1,
  api_requests_count INTEGER NOT NULL DEFAULT 0,
  monthly_api_requests INTEGER NOT NULL DEFAULT 0,
  email_sends_count INTEGER NOT NULL DEFAULT 0,
  sms_sends_count INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage History for analytics
CREATE TABLE IF NOT EXISTS usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_name VARCHAR(50) NOT NULL,
  metric_value INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL
);

-- Payment Records from Stripe webhooks
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(100) NOT NULL UNIQUE,
  stripe_subscription_id VARCHAR(100) NOT NULL,
  stripe_payment_intent_id VARCHAR(100),
  amount_paid INTEGER NOT NULL, -- in cents
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'canceled')),
  billing_reason VARCHAR(50),
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  payment_method_types TEXT[],
  paid_at TIMESTAMPTZ,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription Events for audit trail
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  stripe_event_id VARCHAR(100),
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature Gates Configuration
CREATE TABLE IF NOT EXISTS feature_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key VARCHAR(100) NOT NULL UNIQUE,
  feature_name VARCHAR(200) NOT NULL,
  description TEXT,
  required_plan VARCHAR(50) NOT NULL,
  usage_limit INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add stripe_customer_id to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_customer_id VARCHAR(100);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_id ON usage_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_stripe_invoice ON payment_records(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_subscription ON payment_records(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_history_user_period ON usage_history(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Enable RLS on all tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_gates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Subscription plans: readable by everyone, manageable by service role
CREATE POLICY "Subscription plans viewable by authenticated users" ON subscription_plans
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Service role full access subscription plans" ON subscription_plans
  FOR ALL TO service_role USING (true);

-- User subscriptions: users can only see their own
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access user subscriptions" ON user_subscriptions
  FOR ALL TO service_role USING (true);

-- Usage metrics: users can only see their own
CREATE POLICY "Users can view own usage metrics" ON usage_metrics
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access usage metrics" ON usage_metrics
  FOR ALL TO service_role USING (true);

-- Usage history: users can view their own
CREATE POLICY "Users can view own usage history" ON usage_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access usage history" ON usage_history
  FOR ALL TO service_role USING (true);

-- Payment records: users can view their own
CREATE POLICY "Users can view own payment records" ON payment_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access payment records" ON payment_records
  FOR ALL TO service_role USING (true);

-- Subscription events: users can view their own
CREATE POLICY "Users can view own subscription events" ON subscription_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role full access subscription events" ON subscription_events
  FOR ALL TO service_role USING (true);

-- Feature gates: readable by authenticated users
CREATE POLICY "Feature gates viewable by authenticated users" ON feature_gates
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Service role full access feature gates" ON feature_gates
  FOR ALL TO service_role USING (true);

-- Triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at 
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_gates_updated_at 
  BEFORE UPDATE ON feature_gates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically track usage metrics
CREATE OR REPLACE FUNCTION track_usage_metric(
  p_user_id UUID,
  p_metric_name TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_metrics (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  CASE p_metric_name
    WHEN 'clients' THEN
      UPDATE usage_metrics 
      SET clients_count = clients_count + p_increment,
          last_updated = NOW()
      WHERE user_id = p_user_id;
    WHEN 'vendors' THEN
      UPDATE usage_metrics 
      SET vendors_count = vendors_count + p_increment,
          last_updated = NOW()
      WHERE user_id = p_user_id;
    WHEN 'journeys' THEN
      UPDATE usage_metrics 
      SET journeys_count = journeys_count + p_increment,
          last_updated = NOW()
      WHERE user_id = p_user_id;
    WHEN 'team_members' THEN
      UPDATE usage_metrics 
      SET team_members_count = team_members_count + p_increment,
          last_updated = NOW()
      WHERE user_id = p_user_id;
    WHEN 'storage' THEN
      UPDATE usage_metrics 
      SET storage_used_gb = storage_used_gb + (p_increment::DECIMAL / 1000), -- Convert MB to GB
          last_updated = NOW()
      WHERE user_id = p_user_id;
    WHEN 'api_requests' THEN
      UPDATE usage_metrics 
      SET api_requests_count = api_requests_count + p_increment,
          monthly_api_requests = monthly_api_requests + p_increment,
          last_updated = NOW()
      WHERE user_id = p_user_id;
    WHEN 'email_sends' THEN
      UPDATE usage_metrics 
      SET email_sends_count = email_sends_count + p_increment,
          last_updated = NOW()
      WHERE user_id = p_user_id;
    WHEN 'sms_sends' THEN
      UPDATE usage_metrics 
      SET sms_sends_count = sms_sends_count + p_increment,
          last_updated = NOW()
      WHERE user_id = p_user_id;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly counters
CREATE OR REPLACE FUNCTION reset_monthly_usage_counters()
RETURNS VOID AS $$
BEGIN
  UPDATE usage_metrics 
  SET monthly_api_requests = 0,
      last_reset_at = NOW()
  WHERE last_reset_at <= NOW() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's active subscription
CREATE OR REPLACE FUNCTION get_user_active_subscription(p_user_id UUID)
RETURNS user_subscriptions AS $$
DECLARE
  result user_subscriptions;
BEGIN
  SELECT * INTO result
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default subscription plans
INSERT INTO subscription_plans (name, display_name, description, stripe_price_id, price, currency, billing_interval, trial_days, limits, features, sort_order) VALUES

-- Free Plan
('free', 'Free Tier', 'Perfect for getting started with wedding planning', 'price_free_tier', 0.00, 'USD', 'month', 0, 
 '{
   "clients": 3,
   "vendors": 0,
   "journeys": 1,
   "storage_gb": 1,
   "team_members": 1,
   "api_requests": 100,
   "email_sends": 50,
   "sms_sends": 0
 }',
 '{
   "Basic client management",
   "1 journey template",
   "1GB file storage",
   "Email support",
   "Mobile app access"
 }', 1),

-- Starter Plan ($19/month)
('starter', 'Starter', 'For growing wedding planning businesses', 'price_starter_monthly', 19.00, 'USD', 'month', 14,
 '{
   "clients": 50,
   "vendors": 25,
   "journeys": 10,
   "storage_gb": 10,
   "team_members": 3,
   "api_requests": 1000,
   "email_sends": 500,
   "sms_sends": 100
 }',
 '{
   "Up to 50 clients",
   "Vendor management",
   "10 journey templates",
   "10GB file storage",
   "Email automation",
   "Basic analytics",
   "Priority email support",
   "Team collaboration (3 members)"
 }', 2),

-- Professional Plan ($49/month)
('professional', 'Professional', 'For established wedding planning businesses', 'price_professional_monthly', 49.00, 'USD', 'month', 14,
 '{
   "clients": -1,
   "vendors": -1,
   "journeys": -1,
   "storage_gb": 100,
   "team_members": 10,
   "api_requests": 10000,
   "email_sends": 5000,
   "sms_sends": 1000
 }',
 '{
   "Unlimited clients & vendors",
   "Unlimited journey templates",
   "Advanced journey builder with conditions",
   "100GB file storage",
   "Advanced analytics & reporting",
   "Custom branding",
   "API access",
   "Integrations",
   "Phone & email support",
   "Team collaboration (10 members)"
 }', 3),

-- Enterprise Plan ($149/month)
('enterprise', 'Enterprise', 'For large wedding planning organizations', 'price_enterprise_monthly', 149.00, 'USD', 'month', 14,
 '{
   "clients": -1,
   "vendors": -1,
   "journeys": -1,
   "storage_gb": -1,
   "team_members": -1,
   "api_requests": -1,
   "email_sends": -1,
   "sms_sends": -1
 }',
 '{
   "Everything in Professional",
   "Unlimited storage",
   "Unlimited team members",
   "White-label platform",
   "Custom integrations",
   "Dedicated account manager",
   "Priority phone support",
   "Advanced security features",
   "Custom onboarding",
   "SLA guarantee"
 }', 4)

ON CONFLICT (name) DO NOTHING;

-- Insert default feature gates
INSERT INTO feature_gates (feature_key, feature_name, description, required_plan, usage_limit, is_active) VALUES

-- Client Management Features
('clients:unlimited', 'Unlimited Clients', 'Add unlimited clients to your platform', 'professional', NULL, true),
('clients:advanced', 'Advanced Client Management', 'Up to 50 clients with advanced features', 'starter', 50, true),
('clients:basic', 'Basic Client Management', 'Up to 3 clients for free tier', 'free', 3, true),

-- Vendor Management Features
('vendors:unlimited', 'Unlimited Vendors', 'Manage unlimited vendor relationships', 'professional', NULL, true),
('vendors:basic', 'Basic Vendor Management', 'Manage up to 25 vendors', 'starter', 25, true),

-- Journey Builder Features
('journeys:advanced', 'Advanced Journey Builder', 'Unlimited journey templates with conditions', 'professional', NULL, true),
('journeys:standard', 'Standard Journey Templates', 'Up to 10 journey templates', 'starter', 10, true),
('journeys:basic', 'Basic Journey Template', 'Single journey template for free users', 'free', 1, true),

-- Team Collaboration Features
('team:enterprise', 'Enterprise Team Management', 'Unlimited team members with advanced permissions', 'enterprise', NULL, true),
('team:professional', 'Professional Team Collaboration', 'Up to 10 team members', 'professional', 10, true),
('team:starter', 'Starter Team Features', 'Up to 3 team members', 'starter', 3, true),
('team:basic', 'Basic Individual Account', 'Single user account', 'free', 1, true),

-- Analytics & Reporting Features
('analytics:enterprise', 'Enterprise Analytics', 'Advanced analytics with custom reports', 'enterprise', NULL, true),
('analytics:professional', 'Professional Analytics', 'Advanced analytics and reporting dashboard', 'professional', NULL, true),
('analytics:basic', 'Basic Analytics', 'Basic analytics and insights', 'starter', NULL, true),

-- API & Integration Features
('api:unlimited', 'Unlimited API Access', 'Unlimited API requests per month', 'enterprise', NULL, true),
('api:professional', 'Professional API Access', 'Up to 10,000 API requests per month', 'professional', 10000, true),
('api:starter', 'Starter API Access', 'Up to 1,000 API requests per month', 'starter', 1000, true),
('api:basic', 'Basic API Access', 'Up to 100 API requests per month', 'free', 100, true),

-- Storage Features
('storage:unlimited', 'Unlimited Storage', 'Unlimited file storage', 'enterprise', NULL, true),
('storage:professional', 'Professional Storage', 'Up to 100GB storage', 'professional', 100, true),
('storage:starter', 'Starter Storage', 'Up to 10GB storage', 'starter', 10, true),
('storage:basic', 'Basic Storage', 'Up to 1GB storage', 'free', 1, true),

-- Communication Features
('communications:unlimited', 'Unlimited Communications', 'Unlimited email and SMS sends', 'enterprise', NULL, true),
('communications:professional', 'Professional Communications', 'Enhanced email and SMS limits', 'professional', NULL, true),
('communications:starter', 'Starter Communications', 'Email automation with SMS support', 'starter', NULL, true),
('communications:basic', 'Basic Communications', 'Limited email sends only', 'free', 50, true),

-- Branding Features
('branding:white_label', 'White Label Platform', 'Complete white-label customization', 'enterprise', NULL, true),
('branding:custom', 'Custom Branding', 'Custom logos and colors', 'professional', NULL, true),

-- Support Features
('support:dedicated', 'Dedicated Support', 'Dedicated account manager and priority support', 'enterprise', NULL, true),
('support:priority', 'Priority Support', 'Priority phone and email support', 'professional', NULL, true),
('support:standard', 'Standard Support', 'Email support with faster response times', 'starter', NULL, true),
('support:basic', 'Basic Support', 'Email support only', 'free', NULL, true)

ON CONFLICT (feature_key) DO NOTHING;

-- Create monthly usage reset job (requires pg_cron extension)
-- This would typically be set up separately: SELECT cron.schedule('reset-monthly-usage', '0 0 1 * *', 'SELECT reset_monthly_usage_counters();');

COMMENT ON TABLE subscription_plans IS 'Available subscription plans with pricing, limits, and features';
COMMENT ON TABLE user_subscriptions IS 'User subscription records synchronized with Stripe';
COMMENT ON TABLE usage_metrics IS 'Real-time usage tracking for enforcement of plan limits';
COMMENT ON TABLE usage_history IS 'Historical usage data for analytics and reporting';
COMMENT ON TABLE payment_records IS 'Payment transaction records from Stripe webhooks';
COMMENT ON TABLE subscription_events IS 'Audit trail of all subscription-related events';
COMMENT ON TABLE feature_gates IS 'Feature access control configuration based on subscription plans';