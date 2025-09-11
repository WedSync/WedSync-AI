rch_performance sp ON s.id = sp.supplier_id;

-- Create indexes for materialized view
CREATE UNIQUE INDEX idx_faq_dashboard_supplier ON faq_dashboard_overview(supplier_id);
CREATE INDEX idx_faq_dashboard_performance ON faq_dashboard_overview(helpfulness_percentage DESC, search_success_rate DESC);

-- ============================================
-- FAQ SEARCH FUNCTIONS
-- ============================================

-- Function to search FAQs with fuzzy matching and relevance scoring
CREATE OR REPLACE FUNCTION search_faqs(
  p_supplier_id UUID,
  p_query TEXT,
  p_category_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  question TEXT,
  answer TEXT,
  summary TEXT,
  category_name TEXT,
  tags TEXT[],
  view_count INTEGER,
  help_score INTEGER,
  is_featured BOOLEAN,
  relevance_score REAL
) AS $$
DECLARE
  v_search_query TSQUERY;
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_duration_ms INTEGER;
BEGIN
  -- Record search start time
  v_start_time := clock_timestamp();
  
  -- Parse search query
  v_search_query := websearch_to_tsquery('english', p_query);
  
  -- Log the search query
  INSERT INTO faq_search_queries (supplier_id, query_text, normalized_query, search_duration_ms)
  VALUES (
    p_supplier_id, 
    p_query, 
    lower(trim(p_query)),
    0  -- Will be updated after search completes
  );
  
  -- Return search results with relevance scoring
  RETURN QUERY
  SELECT 
    fi.id,
    fi.question,
    fi.answer,
    fi.summary,
    fc.name as category_name,
    fi.tags,
    fi.view_count,
    fi.help_score,
    fi.is_featured,
    -- Relevance score calculation
    (
      ts_rank_cd(fi.search_vector, v_search_query) +
      CASE WHEN fi.is_featured THEN 0.5 ELSE 0 END +
      CASE WHEN fi.help_score > 0 THEN (fi.help_score * 0.1) ELSE 0 END +
      CASE WHEN similarity(fi.question, p_query) > 0.3 THEN similarity(fi.question, p_query) ELSE 0 END
    )::REAL as relevance_score
  FROM faq_items fi
  LEFT JOIN faq_categories fc ON fi.category_id = fc.id
  WHERE fi.supplier_id = p_supplier_id
    AND fi.is_published = true
    AND (p_category_id IS NULL OR fi.category_id = p_category_id)
    AND (
      fi.search_vector @@ v_search_query OR
      similarity(fi.question, p_query) > 0.3 OR
      similarity(fi.answer, p_query) > 0.2
    )
  ORDER BY relevance_score DESC, fi.is_featured DESC, fi.view_count DESC
  LIMIT p_limit
  OFFSET p_offset;
  
  -- Record search completion time and update duration
  v_end_time := clock_timestamp();
  v_duration_ms := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
  
  UPDATE faq_search_queries 
  SET 
    search_duration_ms = v_duration_ms,
    result_count = (SELECT count(*) FROM faq_items fi WHERE fi.supplier_id = p_supplier_id AND fi.is_published = true AND fi.search_vector @@ v_search_query),
    has_results = (SELECT count(*) FROM faq_items fi WHERE fi.supplier_id = p_supplier_id AND fi.is_published = true AND fi.search_vector @@ v_search_query) > 0
  WHERE supplier_id = p_supplier_id 
    AND query_text = p_query 
    AND created_at = (SELECT MAX(created_at) FROM faq_search_queries WHERE supplier_id = p_supplier_id AND query_text = p_query);
    
END;
$$ LANGUAGE plpgsql;

-- Function to track FAQ analytics events
CREATE OR REPLACE FUNCTION track_faq_analytics(
  p_supplier_id UUID,
  p_faq_item_id UUID,
  p_event_type TEXT,
  p_search_query TEXT DEFAULT NULL,
  p_user_session_id TEXT DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert analytics event
  INSERT INTO faq_analytics (
    supplier_id, faq_item_id, event_type, search_query, 
    user_session_id, client_id, metadata
  ) VALUES (
    p_supplier_id, p_faq_item_id, p_event_type, p_search_query,
    p_user_session_id, p_client_id, p_metadata
  );
  
  -- Update FAQ item stats based on event type
  IF p_event_type = 'view' THEN
    UPDATE faq_items 
    SET 
      view_count = view_count + 1,
      last_viewed_at = NOW()
    WHERE id = p_faq_item_id;
  ELSIF p_event_type = 'helpful' THEN
    UPDATE faq_items 
    SET help_score = help_score + 1
    WHERE id = p_faq_item_id;
  ELSIF p_event_type = 'not_helpful' THEN
    UPDATE faq_items 
    SET help_score = help_score - 1
    WHERE id = p_faq_item_id;
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Trigger function to update timestamps
CREATE OR REPLACE FUNCTION update_faq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
CREATE TRIGGER update_faq_categories_timestamp
  BEFORE UPDATE ON faq_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_updated_at();

CREATE TRIGGER update_faq_items_timestamp
  BEFORE UPDATE ON faq_items
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_updated_at();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all FAQ tables
ALTER TABLE faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for suppliers to manage their own FAQs
CREATE POLICY faq_categories_supplier_policy ON faq_categories
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY faq_items_supplier_policy ON faq_items
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY faq_analytics_supplier_policy ON faq_analytics
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY faq_search_queries_supplier_policy ON faq_search_queries
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

CREATE POLICY faq_feedback_supplier_policy ON faq_feedback
  FOR ALL USING (supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = ( SELECT auth.uid() )
  ));

-- Additional policies for clients to read published FAQs
CREATE POLICY faq_items_client_read_policy ON faq_items
  FOR SELECT USING (
    is_published = true AND
    supplier_id IN (
      SELECT supplier_id FROM clients WHERE id = auth.jwt() ->> 'client_id' OR
      SELECT supplier_id FROM client_bookings WHERE client_id = auth.jwt() ->> 'client_id'
    )
  );

CREATE POLICY faq_categories_client_read_policy ON faq_categories
  FOR SELECT USING (
    is_active = true AND
    supplier_id IN (
      SELECT supplier_id FROM clients WHERE id = auth.jwt() ->> 'client_id' OR
      SELECT supplier_id FROM client_bookings WHERE client_id = auth.jwt() ->> 'client_id'
    )
  );

-- ============================================
-- REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- ============================================

-- Function to refresh FAQ dashboard materialized view
CREATE OR REPLACE FUNCTION refresh_faq_dashboard()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY faq_dashboard_overview;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA FOR COMMON FAQ CATEGORIES
-- ============================================

-- Note: This will be populated by the application, but here are common wedding FAQ categories:
-- 1. Booking & Pricing
-- 2. Timeline & Delivery  
-- 3. Photography Process
-- 4. Wedding Day Logistics
-- 5. Packages & Add-ons
-- 6. Weather & Backup Plans
-- 7. Image Rights & Usage
-- 8. Payment & Contracts

COMMENT ON TABLE faq_categories IS 'Hierarchical FAQ categories for organizing client support content';
COMMENT ON TABLE faq_items IS 'Core FAQ items with full-text search optimization for client support';
COMMENT ON TABLE faq_analytics IS 'Usage tracking for FAQ optimization and business insights';
COMMENT ON TABLE faq_search_queries IS 'Search query tracking for gap analysis and content optimization';
COMMENT ON TABLE faq_feedback IS 'Client feedback on FAQ helpfulness for continuous improvement';

-- Migration complete: FAQ Management System ready for wedding client support automation

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250122000003_subscription_billing_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- WS-071 SaaS Subscription Billing System
-- Migration for comprehensive subscription tiers, usage tracking, and billing

-- Subscription Plans Table
DROP VIEW IF EXISTS subscription_plans CASCADE;
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
DROP VIEW IF EXISTS user_subscriptions CASCADE;
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
DROP VIEW IF EXISTS usage_metrics CASCADE;
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
DROP VIEW IF EXISTS usage_history CASCADE;
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
DROP VIEW IF EXISTS payment_records CASCADE;
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
DROP VIEW IF EXISTS subscription_events CASCADE;
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
DROP VIEW IF EXISTS feature_gates CASCADE;
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
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role full access user subscriptions" ON user_subscriptions
  FOR ALL TO service_role USING (true);

-- Usage metrics: users can only see their own
CREATE POLICY "Users can view own usage metrics" ON usage_metrics
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role full access usage metrics" ON usage_metrics
  FOR ALL TO service_role USING (true);

-- Usage history: users can view their own
CREATE POLICY "Users can view own usage history" ON usage_history
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role full access usage history" ON usage_history
  FOR ALL TO service_role USING (true);

-- Payment records: users can view their own
CREATE POLICY "Users can view own payment records" ON payment_records
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role full access payment records" ON payment_records
  FOR ALL TO service_role USING (true);

-- Subscription events: users can view their own
CREATE POLICY "Users can view own subscription events" ON subscription_events
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

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

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250122000003_whatsapp_integration_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- =============================================
-- WhatsApp Business API Integration System
-- Migration: 20250122000003_whatsapp_integration_system.sql
-- Description: Complete WhatsApp integration with Business API support
-- =============================================

-- Create WhatsApp configurations table
DROP VIEW IF EXISTS whatsapp_configurations CASCADE;
CREATE TABLE IF NOT EXISTS whatsapp_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  business_account_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  display_name TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  webhook_verify_token TEXT NOT NULL,
  webhook_url TEXT,
  status_callback_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  cost_per_message DECIMAL(10,6) DEFAULT 0.005,
  daily_limit INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, phone_number_id),
  UNIQUE(phone_number)
);

-- Create WhatsApp templates table
DROP VIEW IF EXISTS whatsapp_templates CASCADE;
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
  language_code TEXT NOT NULL DEFAULT 'en',
  header_type TEXT CHECK (header_type IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT')),
  header_text TEXT,
  header_variables TEXT[] DEFAULT '{}',
  body_text TEXT NOT NULL,
  body_variables TEXT[] DEFAULT '{}',
  footer_text TEXT,
  buttons JSONB DEFAULT '[]',
  is_approved_template BOOLEAN DEFAULT false,
  approval_status TEXT DEFAULT 'PENDING' CHECK (approval_status IN ('APPROVED', 'PENDING', 'REJECTED')),
  rejection_reason TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, template_name, language_code)
);

-- Create WhatsApp messages table
DROP VIEW IF EXISTS whatsapp_messages CASCADE;
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  message_id TEXT NOT NULL,
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'template', 'image', 'video', 'document', 'audio')),
  text_body TEXT,
  template_name TEXT,
  language TEXT,
  media_id TEXT,
  media_url TEXT,
  media_caption TEXT,
  media_type TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'received')),
  error_code TEXT,
  error_message TEXT,
  is_inbound BOOLEAN DEFAULT false,
  within_session_window BOOLEAN DEFAULT false,
  cost_charged DECIMAL(10,6),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(message_id)
);

-- Create WhatsApp sessions table (for 24-hour messaging window)
DROP VIEW IF EXISTS whatsapp_sessions CASCADE;
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  display_name TEXT,
  last_inbound_at TIMESTAMPTZ NOT NULL,
  last_outbound_at TIMESTAMPTZ,
  session_expires_at TIMESTAMPTZ GENERATED ALWAYS AS (last_inbound_at + INTERVAL '24 hours') STORED,
  message_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(phone_number)
);

-- Create unified templates table (for multi-channel messaging)
DROP VIEW IF EXISTS unified_templates CASCADE;
CREATE TABLE IF NOT EXISTS unified_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channels JSONB NOT NULL DEFAULT '{}',
  variables TEXT[] DEFAULT '{}',
  category TEXT NOT NULL CHECK (category IN ('marketing', 'transactional', 'notification')),
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, name)
);

-- Create unified messages table (for tracking multi-channel sends)
DROP VIEW IF EXISTS unified_messages CASCADE;
CREATE TABLE IF NOT EXISTS unified_messages (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channels_used TEXT[] NOT NULL,
  recipient JSONB NOT NULL,
  content JSONB NOT NULL,
  results JSONB NOT NULL DEFAULT '[]',
  total_cost DECIMAL(10,6) DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_configurations_org_id ON whatsapp_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configurations_user_id ON whatsapp_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configurations_active ON whatsapp_configurations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_org_id ON whatsapp_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_user_id ON whatsapp_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category ON whatsapp_templates(category);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_active ON whatsapp_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_approved ON whatsapp_templates(is_approved_template) WHERE is_approved_template = true;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_org_id ON whatsapp_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_message_id ON whatsapp_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from_phone ON whatsapp_messages(from_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to_phone ON whatsapp_messages(to_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_inbound ON whatsapp_messages(is_inbound);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_active ON whatsapp_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expires ON whatsapp_sessions(session_expires_at);

CREATE INDEX IF NOT EXISTS idx_unified_templates_org_id ON unified_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_unified_templates_user_id ON unified_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_templates_category ON unified_templates(category);
CREATE INDEX IF NOT EXISTS idx_unified_templates_active ON unified_templates(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_unified_messages_org_id ON unified_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_unified_messages_user_id ON unified_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_messages_sent_at ON unified_messages(sent_at);

-- Create RLS policies
ALTER TABLE whatsapp_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_messages ENABLE ROW LEVEL SECURITY;

-- WhatsApp configurations policies
CREATE POLICY "Users can view their organization's WhatsApp configurations"
  ON whatsapp_configurations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Organization admins can manage WhatsApp configurations"
  ON whatsapp_configurations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role IN ('OWNER', 'ADMIN')
    )
  );

-- WhatsApp templates policies
CREATE POLICY "Users can view their organization's WhatsApp templates"
  ON whatsapp_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage their own WhatsApp templates"
  ON whatsapp_templates FOR ALL
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Organization admins can manage all WhatsApp templates"
  ON whatsapp_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role IN ('OWNER', 'ADMIN')
    )
  );

-- WhatsApp messages policies
CREATE POLICY "Users can view their organization's WhatsApp messages"
  ON whatsapp_messages FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create WhatsApp messages for their organization"
  ON whatsapp_messages FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update their own WhatsApp messages"
  ON whatsapp_messages FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- WhatsApp sessions policies (read-only for users)
CREATE POLICY "Users can view WhatsApp sessions for their organization"
  ON whatsapp_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM whatsapp_configurations wc
      JOIN user_profiles up ON up.organization_id = wc.organization_id
      WHERE up.user_id = (SELECT auth.uid())
      AND wc.phone_number = whatsapp_sessions.phone_number
    )
  );

-- Unified templates policies
CREATE POLICY "Users can view their organization's unified templates"
  ON unified_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can manage their own unified templates"
  ON unified_templates FOR ALL
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Organization admins can manage all unified templates"
  ON unified_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role IN ('OWNER', 'ADMIN')
    )
  );

-- Unified messages policies
CREATE POLICY "Users can view their organization's unified messages"
  ON unified_messages FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create unified messages for their organization"
  ON unified_messages FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Create functions for template usage tracking
CREATE OR REPLACE FUNCTION increment_whatsapp_template_usage(template_id UUID, user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_templates 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = template_id AND whatsapp_templates.user_id = increment_whatsapp_template_usage.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_unified_template_usage(template_id UUID, user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE unified_templates 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = template_id AND unified_templates.user_id = increment_unified_template_usage.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old sessions (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_whatsapp_sessions()
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_sessions 
  SET is_active = false
  WHERE session_expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to get messaging window status
CREATE OR REPLACE FUNCTION check_whatsapp_messaging_window(phone_number TEXT)
RETURNS boolean AS $$
DECLARE
  session_record whatsapp_sessions%ROWTYPE;
BEGIN
  SELECT * INTO session_record
  FROM whatsapp_sessions
  WHERE whatsapp_sessions.phone_number = check_whatsapp_messaging_window.phone_number
    AND is_active = true;
  
  IF session_record.id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN session_record.session_expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_configurations_updated_at
  BEFORE UPDATE ON whatsapp_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_unified_templates_updated_at
  BEFORE UPDATE ON unified_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add communication preferences to clients table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'communication_preferences'
  ) THEN
    ALTER TABLE clients ADD COLUMN communication_preferences JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE clients ADD COLUMN whatsapp_number TEXT;
  END IF;
END $$;

-- Create view for WhatsApp analytics
CREATE OR REPLACE VIEW whatsapp_analytics AS
SELECT 
  wm.organization_id,
  wm.user_id,
  DATE(wm.created_at) as date,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE wm.status = 'delivered') as delivered_messages,
  COUNT(*) FILTER (WHERE wm.status = 'read') as read_messages,
  COUNT(*) FILTER (WHERE wm.status = 'failed') as failed_messages,
  COUNT(*) FILTER (WHERE wm.message_type = 'template') as template_messages,
  COUNT(*) FILTER (WHERE wm.media_type IS NOT NULL) as media_messages,
  SUM(wm.cost_charged) as total_cost,
  AVG(wm.cost_charged) as average_cost,
  CASE 
    WHEN COUNT(*) > 0 THEN COUNT(*) FILTER (WHERE wm.status = 'delivered') * 100.0 / COUNT(*)
    ELSE 0
  END as delivery_rate,
  CASE 
    WHEN COUNT(*) FILTER (WHERE wm.status = 'delivered') > 0 
    THEN COUNT(*) FILTER (WHERE wm.status = 'read') * 100.0 / COUNT(*) FILTER (WHERE wm.status = 'delivered')
    ELSE 0
  END as read_rate
FROM whatsapp_messages wm
WHERE wm.is_inbound = false
GROUP BY wm.organization_id, wm.user_id, DATE(wm.created_at);

-- Grant necessary permissions
GRANT SELECT ON whatsapp_analytics TO authenticated;

-- Insert default unified template categories
INSERT INTO unified_templates (
  id,
  user_id,
  organization_id,
  name,
  channels,
  variables,
  category,
  is_active
) VALUES 
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM organizations LIMIT 1),
    'Wedding Reminder',
    '{
      "email": {
        "subject": "Wedding Reminder - {{wedding_date}}",
        "htmlTemplate": "<p>Hi {{couple_names}},</p><p>Just a friendly reminder about your upcoming wedding on {{wedding_date}}. We''re so excited to be part of your special day!</p><p>Best regards,<br>{{photographer_name}}</p>"
      },
      "sms": {
        "template": "Hi {{couple_names}}! Reminder: Your wedding is on {{wedding_date}}. Can''t wait to capture your special day! - {{photographer_name}}"
      },
      "whatsapp": {
        "templateName": "wedding_reminder",
        "language": "en"
      }
    }',
    '["couple_names", "wedding_date", "photographer_name"]',
    'notification',
    true
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM organizations LIMIT 1),
    'Photo Gallery Ready',
    '{
      "email": {
        "subject": "Your Wedding Photos are Ready! 📸",
        "htmlTemplate": "<p>Dear {{couple_names}},</p><p>We''re thrilled to let you know that your wedding photos are now ready for viewing!</p><p><a href=\"{{gallery_link}}\">View Your Gallery</a></p><p>These memories will last a lifetime. Enjoy!</p><p>With love,<br>{{photographer_name}}</p>"
      },
      "sms": {
        "template": "{{couple_names}}, your wedding photos are ready! View them here: {{gallery_link}} - {{photographer_name}} 📸"
      },
      "whatsapp": {
        "templateName": "photo_gallery_ready",
        "language": "en"
      }
    }',
    '["couple_names", "gallery_link", "photographer_name"]',
    'notification',
    true
  )
ON CONFLICT (organization_id, name) DO NOTHING;

-- Create performance optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_messages_analytics 
  ON whatsapp_messages(organization_id, user_id, created_at, status, message_type) 
  WHERE is_inbound = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_whatsapp_sessions_lookup 
  ON whatsapp_sessions(phone_number, is_active, session_expires_at) 
  WHERE is_active = true;

-- Create materialized view for daily analytics (refresh nightly)
CREATE MATERIALIZED VIEW IF NOT EXISTS whatsapp_daily_stats AS
SELECT 
  organization_id,
  user_id,
  DATE(created_at) as date,
  COUNT(*) as messages_sent,
  COUNT(*) FILTER (WHERE status = 'delivered') as messages_delivered,
  COUNT(*) FILTER (WHERE status = 'read') as messages_read,
  SUM(cost_charged) as total_cost,
  COUNT(*) FILTER (WHERE message_type = 'template') as template_usage,
  COUNT(*) FILTER (WHERE media_type IS NOT NULL) as media_messages
FROM whatsapp_messages
WHERE is_inbound = false
GROUP BY organization_id, user_id, DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_daily_stats_unique 
  ON whatsapp_daily_stats(organization_id, user_id, date);

-- Grant permissions on materialized view
GRANT SELECT ON whatsapp_daily_stats TO authenticated;

COMMENT ON TABLE whatsapp_configurations IS 'WhatsApp Business API configuration settings per organization';
COMMENT ON TABLE whatsapp_templates IS 'WhatsApp message templates with approval status tracking';
COMMENT ON TABLE whatsapp_messages IS 'All WhatsApp messages sent and received with delivery tracking';
COMMENT ON TABLE whatsapp_sessions IS 'Active WhatsApp sessions for 24-hour messaging window compliance';
COMMENT ON TABLE unified_templates IS 'Multi-channel message templates for Email, SMS, and WhatsApp';
COMMENT ON TABLE unified_messages IS 'Multi-channel message delivery tracking and results';

-- Migration completed successfully
SELECT 'WhatsApp Business API integration system created successfully' as status;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250122000004_invitation_landing_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- Migration: 20250122000004_invitation_landing_system.sql
-- Feature: WS-074 - Invitation Landing - Couple Onboarding Interface
-- Description: Invitation landing page system with supplier branding and conversion tracking

-- Invitation Codes table - Core invitation system
DROP VIEW IF EXISTS invitation_codes CASCADE;
CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  supplier_type VARCHAR(50) NOT NULL, -- photographer, planner, venue, etc
  
  -- Branding and customization
  supplier_name VARCHAR(255) NOT NULL,
  supplier_logo_url TEXT,
  supplier_brand_color VARCHAR(7) DEFAULT '#000000', -- hex color
  
  -- Personalization 
  couple_names VARCHAR(255), -- "John & Jane" or null for generic
  wedding_date DATE,
  personalized_message TEXT,
  
  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER, -- null for unlimited
  current_uses INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitation Visits table - Track every click/visit
DROP VIEW IF EXISTS invitation_visits CASCADE;
CREATE TABLE IF NOT EXISTS invitation_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_code_id UUID NOT NULL REFERENCES invitation_codes(id),
  
  -- Visit tracking
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  -- Geographic data
  country VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Device info
  device_type VARCHAR(20), -- mobile, desktop, tablet
  browser VARCHAR(50),
  os VARCHAR(50),
  
  -- Session info
  session_id VARCHAR(255),
  visit_duration INTEGER, -- seconds spent on page
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitation Conversions table - Track successful signups
DROP VIEW IF EXISTS invitation_conversions CASCADE;
CREATE TABLE IF NOT EXISTS invitation_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_code_id UUID NOT NULL REFERENCES invitation_codes(id),
  visit_id UUID REFERENCES invitation_visits(id),
  
  -- User information
  converted_user_id UUID, -- will be set after user created
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  
  -- OAuth provider used
  oauth_provider VARCHAR(20), -- google, apple, email
  
  -- Conversion tracking
  time_to_convert INTEGER, -- seconds from visit to conversion
  funnel_step VARCHAR(50) DEFAULT 'signup_completed',
  
  -- Marketing attribution
  attributed_utm_source VARCHAR(100),
  attributed_utm_medium VARCHAR(100),
  attributed_utm_campaign VARCHAR(100),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supplier Invitation Settings table - Per-supplier customization
DROP VIEW IF EXISTS supplier_invitation_settings CASCADE;
CREATE TABLE IF NOT EXISTS supplier_invitation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) UNIQUE,
  
  -- Default branding
  default_brand_color VARCHAR(7) DEFAULT '#000000',
  default_logo_url TEXT,
  
  -- Messaging templates
  welcome_message_template TEXT DEFAULT 'Welcome! Your wedding planner has set up your dashboard.',
  value_proposition TEXT DEFAULT 'Never fill the same form twice. Everything in one place.',
  call_to_action TEXT DEFAULT 'Start Planning Your Wedding',
  
  -- Features to highlight
  featured_benefits JSONB DEFAULT '[]', -- ["Guest Management", "Timeline Builder", etc.]
  
  -- Conversion tracking settings  
  google_analytics_id VARCHAR(50),
  facebook_pixel_id VARCHAR(50),
  conversion_webhook_url TEXT,
  
  -- A/B testing
  enable_ab_testing BOOLEAN DEFAULT FALSE,
  variant_weights JSONB DEFAULT '{"A": 50, "B": 50}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_supplier ON invitation_codes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_active ON invitation_codes(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_invitation_visits_code ON invitation_visits(invitation_code_id);
CREATE INDEX IF NOT EXISTS idx_invitation_visits_created ON invitation_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_invitation_visits_session ON invitation_visits(session_id);

CREATE INDEX IF NOT EXISTS idx_invitation_conversions_code ON invitation_conversions(invitation_code_id);
CREATE INDEX IF NOT EXISTS idx_invitation_conversions_email ON invitation_conversions(email);
CREATE INDEX IF NOT EXISTS idx_invitation_conversions_created ON invitation_conversions(created_at);

-- Row Level Security (RLS) policies

-- Invitation Codes - suppliers can only see their own
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can manage their invitation codes" 
ON invitation_codes FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM suppliers WHERE id = invitation_codes.supplier_id
  )
);

-- Public read access for active invitation codes (needed for landing page)
CREATE POLICY "Public can view active invitation codes"
ON invitation_codes FOR SELECT
USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

-- Invitation Visits - suppliers can see visits to their codes
ALTER TABLE invitation_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can view visits to their codes"
ON invitation_visits FOR SELECT
USING (
  invitation_code_id IN (
    SELECT id FROM invitation_codes 
    WHERE supplier_id IN (
      SELECT id FROM suppliers WHERE user_id = (SELECT auth.uid())
    )
  )
);

-- Public insert for tracking visits
CREATE POLICY "Anyone can record visits"
ON invitation_visits FOR INSERT
WITH CHECK (TRUE);

-- Invitation Conversions - suppliers can see conversions from their codes
ALTER TABLE invitation_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can view their conversions"
ON invitation_conversions FOR SELECT
USING (
  invitation_code_id IN (
    SELECT id FROM invitation_codes 
    WHERE supplier_id IN (
      SELECT id FROM suppliers WHERE user_id = (SELECT auth.uid())
    )
  )
);

-- Public insert for tracking conversions
CREATE POLICY "Anyone can record conversions"
ON invitation_conversions FOR INSERT
WITH CHECK (TRUE);

-- Supplier Settings - suppliers can manage their own settings
ALTER TABLE supplier_invitation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can manage their invitation settings"
ON supplier_invitation_settings FOR ALL
USING (
  supplier_id IN (
    SELECT id FROM suppliers WHERE user_id = (SELECT auth.uid())
  )
);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_invitation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invitation_codes_updated_at
  BEFORE UPDATE ON invitation_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_updated_at();

CREATE TRIGGER supplier_invitation_settings_updated_at  
  BEFORE UPDATE ON supplier_invitation_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_updated_at();

-- Create analytics view for easy reporting
CREATE OR REPLACE VIEW invitation_analytics AS
SELECT 
  ic.id as invitation_code_id,
  ic.code,
  ic.supplier_id,
  ic.supplier_name,
  ic.supplier_type,
  ic.couple_names,
  ic.wedding_date,
  ic.created_at as code_created_at,
  
  -- Visit metrics
  COUNT(DISTINCT iv.id) as total_visits,
  COUNT(DISTINCT iv.session_id) as unique_sessions,
  COUNT(DISTINCT CASE WHEN iv.device_type = 'mobile' THEN iv.id END) as mobile_visits,
  COUNT(DISTINCT CASE WHEN iv.device_type = 'desktop' THEN iv.id END) as desktop_visits,
  
  -- Conversion metrics
  COUNT(DISTINCT ico.id) as total_conversions,
  ROUND(
    CASE 
      WHEN COUNT(DISTINCT iv.id) > 0 
      THEN COUNT(DISTINCT ico.id)::decimal / COUNT(DISTINCT iv.id) * 100 
      ELSE 0 
    END, 2
  ) as conversion_rate,
  
  -- Recent activity
  MAX(iv.created_at) as last_visit,
  MAX(ico.created_at) as last_conversion

FROM invitation_codes ic
LEFT JOIN invitation_visits iv ON ic.id = iv.invitation_code_id
LEFT JOIN invitation_conversions ico ON ic.id = ico.invitation_code_id
GROUP BY ic.id, ic.code, ic.supplier_id, ic.supplier_name, ic.supplier_type, 
         ic.couple_names, ic.wedding_date, ic.created_at;

-- Sample data for testing (optional - only in development)
-- This will be removed in production deployments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM suppliers LIMIT 1) THEN
    -- Insert sample invitation code if suppliers exist
    INSERT INTO invitation_codes (
      code, supplier_id, supplier_type, supplier_name, 
      couple_names, wedding_date, personalized_message
    ) 
    SELECT 
      'DEMO' || EXTRACT(EPOCH FROM NOW())::integer,
      id,
      'photographer',
      'Demo Photography Studio',
      'John & Jane',
      CURRENT_DATE + INTERVAL '6 months',
      'Welcome to your wedding dashboard! Everything you need in one place.'
    FROM suppliers 
    LIMIT 1
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250122000005_automated_reminders_system.sql
-- ========================================

-- Automated Reminders System for Wedding Milestones
-- WS-084: Wedding milestone notification system
-- Handles automated reminder scheduling, processing, and delivery

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.reminder_history CASCADE;
DROP TABLE IF EXISTS public.reminder_queue CASCADE;
DROP TABLE IF EXISTS public.reminder_templates CASCADE;
DROP TABLE IF EXISTS public.reminder_schedules CASCADE;

-- Reminder Templates (reusable content templates)
CREATE TABLE public.reminder_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL CHECK (category IN ('payment', 'milestone', 'vendor_task', 'couple_task', 'deadline', 'general')),
    subject_template TEXT NOT NULL,
    email_template TEXT,
    sms_template TEXT,
    variables JSONB DEFAULT '[]', -- Array of template variables like {firstName}, {dueDate}, etc.
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_system BOOLEAN NOT NULL DEFAULT FALSE, -- System templates vs custom templates
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminder Schedules (defines when reminders should be sent)
CREATE TABLE public.reminder_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.reminder_templates(id) ON DELETE CASCADE,
    
    -- What this reminder is about
    entity_type VARCHAR(100) NOT NULL, -- 'payment', 'contract', 'milestone', 'task', etc.
    entity_id UUID NOT NULL, -- ID of the related entity
    entity_name VARCHAR(255), -- Human readable name for the entity
    
    -- Recipient information
    recipient_id UUID, -- Can be client_id, vendor_id, or team member
    recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('client', 'vendor', 'team', 'couple')),
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    
    -- Timing configuration
    trigger_date TIMESTAMPTZ NOT NULL, -- When the reminder should be sent
    advance_days INTEGER DEFAULT 0, -- Days before trigger_date to send (e.g., 7 for "7 days before")
    
    -- Recurrence settings
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly', null for one-time
    recurrence_end TIMESTAMPTZ,
    
    -- Channel preferences
    send_email BOOLEAN NOT NULL DEFAULT TRUE,
    send_sms BOOLEAN NOT NULL DEFAULT FALSE,
    send_in_app BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Status and processing
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled', 'snoozed')),
    next_send_at TIMESTAMPTZ, -- Calculated field for when this should next be processed
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_attempted_at TIMESTAMPTZ,
    
    -- Snooze functionality
    snoozed_until TIMESTAMPTZ,
    snooze_count INTEGER NOT NULL DEFAULT 0,
    
    -- Escalation
    escalation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    escalation_days INTEGER DEFAULT 3, -- Days after missed deadline to escalate
    escalation_recipient_ids UUID[], -- Array of user IDs to escalate to
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminder Queue (for processing reminders)
CREATE TABLE public.reminder_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES public.reminder_schedules(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Processing information
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest priority
    
    -- Content (resolved from template)
    resolved_subject TEXT,
    resolved_email_content TEXT,
    resolved_sms_content TEXT,
    
    -- Recipients
    recipients JSONB NOT NULL, -- Array of recipient objects with email/phone/etc
    
    -- Processing tracking
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminder History (track all sent reminders)
CREATE TABLE public.reminder_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES public.reminder_schedules(id) ON DELETE CASCADE,
    queue_id UUID REFERENCES public.reminder_queue(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Content that was sent
    subject TEXT NOT NULL,
    content TEXT,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'in_app', 'push')),
    
    -- Recipient information
    recipient_id UUID,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    recipient_name VARCHAR(255),
    
    -- Delivery tracking
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    
    -- Provider information
    provider VARCHAR(50), -- 'resend', 'twilio', etc.
    provider_id VARCHAR(255), -- External provider's message ID
    
    -- Status tracking
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'bounced', 'failed', 'opened', 'clicked')),
    error_message TEXT,
    
    -- Response tracking
    acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_at TIMESTAMPTZ,
    snoozed BOOLEAN NOT NULL DEFAULT FALSE,
    snoozed_until TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for optimal performance
CREATE INDEX idx_reminder_templates_org ON public.reminder_templates(organization_id);
CREATE INDEX idx_reminder_templates_category ON public.reminder_templates(category);
CREATE INDEX idx_reminder_templates_active ON public.reminder_templates(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_reminder_schedules_org ON public.reminder_schedules(organization_id);
CREATE INDEX idx_reminder_schedules_client ON public.reminder_schedules(client_id);
CREATE INDEX idx_reminder_schedules_template ON public.reminder_schedules(template_id);
CREATE INDEX idx_reminder_schedules_entity ON public.reminder_schedules(entity_type, entity_id);
CREATE INDEX idx_reminder_schedules_status ON public.reminder_schedules(status);
CREATE INDEX idx_reminder_schedules_next_send ON public.reminder_schedules(next_send_at) WHERE status = 'scheduled';
CREATE INDEX idx_reminder_schedules_trigger_date ON public.reminder_schedules(trigger_date);

CREATE INDEX idx_reminder_queue_scheduled_for ON public.reminder_queue(scheduled_for);
CREATE INDEX idx_reminder_queue_status ON public.reminder_queue(status);
CREATE INDEX idx_reminder_queue_priority ON public.reminder_queue(priority, scheduled_for);
CREATE INDEX idx_reminder_queue_processing ON public.reminder_queue(status, scheduled_for) WHERE status IN ('pending', 'retrying');

CREATE INDEX idx_reminder_history_org ON public.reminder_history(organization_id);
CREATE INDEX idx_reminder_history_schedule ON public.reminder_history(schedule_id);
CREATE INDEX idx_reminder_history_sent_at ON public.reminder_history(sent_at DESC);
CREATE INDEX idx_reminder_history_recipient ON public.reminder_history(recipient_id);
CREATE INDEX idx_reminder_history_delivery_status ON public.reminder_history(delivery_status);

-- Create update triggers
CREATE TRIGGER update_reminder_templates_updated_at BEFORE UPDATE ON public.reminder_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_schedules_updated_at BEFORE UPDATE ON public.reminder_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_queue_updated_at BEFORE UPDATE ON public.reminder_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next_send_at for reminder schedules
CREATE OR REPLACE FUNCTION calculate_next_send_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate when this reminder should be sent
    IF NEW.advance_days > 0 THEN
        NEW.next_send_at = NEW.trigger_date - INTERVAL '1 day' * NEW.advance_days;
    ELSE
        NEW.next_send_at = NEW.trigger_date;
    END IF;
    
    -- If snoozed, use snooze time instead
    IF NEW.snoozed_until IS NOT NULL AND NEW.snoozed_until > NOW() THEN
        NEW.next_send_at = NEW.snoozed_until;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_next_send_at_trigger
    BEFORE INSERT OR UPDATE ON public.reminder_schedules
    FOR EACH ROW EXECUTE FUNCTION calculate_next_send_at();

-- Function to add reminders to processing queue
CREATE OR REPLACE FUNCTION queue_reminder_for_processing()
RETURNS TRIGGER AS $$
BEGIN
    -- Only queue if status is scheduled and next_send_at is in the future but within processing window
    IF NEW.status = 'scheduled' AND NEW.next_send_at IS NOT NULL 
       AND NEW.next_send_at <= NOW() + INTERVAL '15 minutes' 
       AND NEW.next_send_at >= NOW() - INTERVAL '1 hour' THEN
        
        INSERT INTO public.reminder_queue (
            schedule_id,
            organization_id,
            scheduled_for,
            priority,
            recipients
        ) VALUES (
            NEW.id,
            NEW.organization_id,
            NEW.next_send_at,
            CASE 
                WHEN NEW.entity_type = 'payment' THEN 1  -- Highest priority for payments
                WHEN NEW.entity_type = 'deadline' THEN 2
                WHEN NEW.entity_type = 'milestone' THEN 3
                ELSE 5
            END,
            jsonb_build_array(
                jsonb_build_object(
                    'id', NEW.recipient_id,
                    'type', NEW.recipient_type,
                    'email', NEW.recipient_email,
                    'phone', NEW.recipient_phone
                )
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER queue_reminder_for_processing_trigger
    AFTER UPDATE ON public.reminder_schedules
    FOR EACH ROW EXECUTE FUNCTION queue_reminder_for_processing();

-- Insert default reminder templates
INSERT INTO public.reminder_templates (organization_id, name, description, category, subject_template, email_template, sms_template, variables, is_system) VALUES
(uuid_nil(), 'Payment Due Reminder', 'Standard payment due reminder', 'payment', 
'Payment Due: {amount} for {serviceName}', 
'<p>Dear {clientName},</p><p>This is a friendly reminder that your payment of <strong>{amount}</strong> for {serviceName} is due on {dueDate}.</p><p>Please make your payment at your earliest convenience.</p><p>Best regards,<br>Your Wedding Team</p>',
'Hi {clientName}, your payment of {amount} for {serviceName} is due on {dueDate}. Please pay at your earliest convenience.',
'["clientName", "amount", "serviceName", "dueDate"]', true),

(uuid_nil(), 'Vendor Task Reminder', 'Reminder for vendor deliverables', 'vendor_task',
'Task Reminder: {taskName} due {dueDate}',
'<p>Dear {vendorName},</p><p>This is a reminder that <strong>{taskName}</strong> is due on {dueDate}.</p><p>Task details: {taskDescription}</p><p>Please confirm completion or contact us if you need assistance.</p><p>Best regards,<br>Your Wedding Coordination Team</p>',
'Reminder: {taskName} is due {dueDate}. Please confirm completion.',
'["vendorName", "taskName", "taskDescription", "dueDate"]', true),

(uuid_nil(), 'Wedding Milestone Reminder', 'General wedding milestone reminder', 'milestone',
'Upcoming: {milestoneName} - {daysRemaining} days to go!',
'<p>Dear {clientName},</p><p>Your wedding milestone <strong>{milestoneName}</strong> is coming up in {daysRemaining} days!</p><p>{milestoneDescription}</p><p>Items to complete:</p><ul>{todoItems}</ul><p>We''re here to help make your special day perfect!</p>',
'Hi {clientName}! {milestoneName} is in {daysRemaining} days. {milestoneDescription}',
'["clientName", "milestoneName", "milestoneDescription", "daysRemaining", "todoItems"]', true),

(uuid_nil(), 'Couple Task Reminder', 'Reminder for couple to complete tasks', 'couple_task',
'Action Required: {taskName}',
'<p>Dear {coupleName},</p><p>You have an outstanding task: <strong>{taskName}</strong></p><p>Due date: {dueDate}</p><p>Description: {taskDescription}</p><p>Please complete this task to keep your wedding planning on track!</p>',
'Hi {coupleName}, reminder to complete: {taskName} by {dueDate}',
'["coupleName", "taskName", "taskDescription", "dueDate"]', true);

-- Create cron job for processing reminder queue
SELECT cron.schedule(
    'process-reminder-queue',
    '*/5 * * * *', -- Every 5 minutes
    $$
    UPDATE public.reminder_queue 
    SET status = 'processing', processing_started_at = NOW() 
    WHERE status IN ('pending', 'retrying') 
    AND scheduled_for <= NOW() 
    ORDER BY priority ASC, scheduled_for ASC 
    LIMIT 100;
    $$
);

-- Grant permissions
GRANT ALL ON public.reminder_templates TO postgres;
GRANT ALL ON public.reminder_schedules TO postgres;
GRANT ALL ON public.reminder_queue TO postgres;
GRANT ALL ON public.reminder_history TO postgres;

-- RLS policies will be added in a separate migration for security
COMMENT ON TABLE public.reminder_templates IS 'Reusable templates for automated reminders';
COMMENT ON TABLE public.reminder_schedules IS 'Scheduled reminders for wedding milestones and deadlines';
COMMENT ON TABLE public.reminder_queue IS 'Processing queue for pending reminders';
COMMENT ON TABLE public.reminder_history IS 'Historical record of all sent reminders';


-- ========================================
-- Migration: 20250122000005_contract_management_system.sql
-- ========================================

-- Defer foreign key checks for initial data
SET CONSTRAINTS ALL DEFERRED;

-- =====================================================
-- Contract Management System Migration
-- WS-082: Contract Tracking & Payment Milestones
-- Team D - Batch 6 Round 1
-- =====================================================

-- Contract Categories Table
CREATE TABLE public.contract_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#8B5CF6',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wedding Contracts Table
CREATE TABLE public.wedding_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES public.contract_categories(id) ON DELETE RESTRICT,
    
    -- Contract Basic Information
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN ('vendor_service', 'venue_rental', 'supplier_agreement', 'other')),
    
    -- Financial Details
    total_amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    deposit_amount DECIMAL(12, 2),
    deposit_percentage DECIMAL(5, 2),
    balance_amount DECIMAL(12, 2),
    
    -- Contract Dates
    contract_date DATE NOT NULL,
    service_start_date DATE,
    service_end_date DATE,
    contract_expiry_date DATE,
    signed_date DATE,
    
    -- Status Management
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'reviewed', 'signed', 'active', 'completed', 'cancelled', 'expired')),
    signing_status VARCHAR(30) DEFAULT 'unsigned' CHECK (signing_status IN ('unsigned', 'partially_signed', 'fully_signed')),
    
    -- Document Management
    original_document_id UUID REFERENCES public.business_documents(id),
    signed_document_id UUID REFERENCES public.business_documents(id),
    
    -- Legal & Compliance
    terms_conditions TEXT,
    cancellation_policy TEXT,
    force_majeure_clause TEXT,
    privacy_policy_accepted BOOLEAN DEFAULT false,
    gdpr_consent BOOLEAN DEFAULT false,
    
    -- Metadata
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    
    -- Audit Fields
    created_by UUID REFERENCES user_profiles(id),
    last_modified_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_service_dates CHECK (service_end_date IS NULL OR service_end_date >= service_start_date),
    CONSTRAINT valid_contract_expiry CHECK (contract_expiry_date IS NULL OR contract_expiry_date >= contract_date),
    CONSTRAINT valid_deposit CHECK (deposit_amount IS NULL OR deposit_amount <= total_amount)
);

-- Contract Payment Milestones Table
CREATE TABLE public.contract_payment_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.wedding_contracts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Milestone Details
    milestone_name VARCHAR(255) NOT NULL,
    description TEXT,
    milestone_type VARCHAR(30) NOT NULL CHECK (milestone_type IN ('deposit', 'progress_payment', 'final_payment', 'penalty', 'refund')),
    sequence_order INTEGER NOT NULL,
    
    -- Financial Information
    amount DECIMAL(12, 2) NOT NULL,
    percentage_of_total DECIMAL(5, 2),
    currency VARCHAR(3) DEFAULT 'GBP',
    
    -- Timing
    due_date DATE NOT NULL,
    grace_period_days INTEGER DEFAULT 0,
    reminder_days_before INTEGER DEFAULT 7,
    
    -- Status & Payment Tracking
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'overdue', 'partially_paid', 'paid', 'waived', 'cancelled')),
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    paid_date DATE,
    payment_reference VARCHAR(100),
    payment_method VARCHAR(50),
    
    -- Late Fees & Penalties
    late_fee_amount DECIMAL(12, 2) DEFAULT 0,
    late_fee_percentage DECIMAL(5, 2) DEFAULT 0,
    penalty_applied BOOLEAN DEFAULT false,
    
    -- Automation & Alerts
    auto_reminder_enabled BOOLEAN DEFAULT true,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_paid_amount CHECK (paid_amount >= 0 AND paid_amount <= amount),
    CONSTRAINT valid_percentage CHECK (percentage_of_total IS NULL OR (percentage_of_total >= 0 AND percentage_of_total <= 100)),
    UNIQUE(contract_id, sequence_order)
);

-- Vendor Deliverables Table
CREATE TABLE public.contract_deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.wedding_contracts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Deliverable Information
    deliverable_name VARCHAR(255) NOT NULL,
    description TEXT,
    deliverable_type VARCHAR(50) NOT NULL CHECK (deliverable_type IN ('document', 'service', 'product', 'milestone', 'approval')),
    category VARCHAR(100),
    
    -- Timing & Dependencies
    due_date DATE NOT NULL,
    estimated_hours DECIMAL(6, 2),
    dependency_ids UUID[],  -- Array of other deliverable IDs this depends on
    
    -- Status Management
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review_required', 'completed', 'overdue', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Progress Tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    started_date DATE,
    completed_date DATE,
    approved_date DATE,
    approved_by UUID REFERENCES user_profiles(id),
    
    -- Requirements & Specifications
    requirements TEXT,
    acceptance_criteria TEXT,
    specifications JSONB DEFAULT '{}'::jsonb,
    
    -- File & Document Links
    related_document_ids UUID[],
    deliverable_file_ids UUID[],
    
    -- Assignment & Responsibility
    assigned_to UUID REFERENCES user_profiles(id),
    assigned_team VARCHAR(100),
    
    -- Quality & Review
    quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
    review_notes TEXT,
    revision_count INTEGER DEFAULT 0,
    
    -- Alerts & Notifications
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_days_before INTEGER DEFAULT 3,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,
    escalation_enabled BOOLEAN DEFAULT false,
    escalation_days INTEGER DEFAULT 1,
    
    -- Metadata
    tags TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_completion_dates CHECK (completed_date IS NULL OR started_date IS NULL OR completed_date >= started_date),
    CONSTRAINT valid_approval_dates CHECK (approved_date IS NULL OR completed_date IS NULL OR approved_date >= completed_date)
);

-- Contract Revisions & Amendments Table
CREATE TABLE public.contract_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.wedding_contracts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Revision Information
    revision_number INTEGER NOT NULL,
    revision_type VARCHAR(30) NOT NULL CHECK (revision_type IN ('amendment', 'addendum', 'cancellation', 'renewal', 'correction')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reason TEXT,
    
    -- Document Management
    original_document_id UUID REFERENCES public.business_documents(id),
    revised_document_id UUID REFERENCES public.business_documents(id),
    comparison_document_id UUID REFERENCES public.business_documents(id),  -- PDF showing changes
    
    -- Change Tracking
    changes_summary TEXT,
    fields_changed JSONB DEFAULT '{}'::jsonb,  -- JSON of field changes {"field_name": {"old": "value", "new": "value"}}
    financial_impact DECIMAL(12, 2) DEFAULT 0,
    
    -- Approval Process
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'implemented')),
    requires_client_approval BOOLEAN DEFAULT true,
    requires_supplier_approval BOOLEAN DEFAULT false,
    
    -- Client Approval
    client_approved BOOLEAN DEFAULT false,
    client_approved_date TIMESTAMP WITH TIME ZONE,
    client_approved_by VARCHAR(255),
    client_signature_required BOOLEAN DEFAULT false,
    client_signed BOOLEAN DEFAULT false,
    client_signed_date TIMESTAMP WITH TIME ZONE,
    
    -- Supplier Approval (if applicable)
    supplier_approved BOOLEAN DEFAULT false,
    supplier_approved_date TIMESTAMP WITH TIME ZONE,
    supplier_approved_by VARCHAR(255),
    
    -- Internal Approval
    internal_approved BOOLEAN DEFAULT false,
    internal_approved_by UUID REFERENCES user_profiles(id),
    internal_approved_date TIMESTAMP WITH TIME ZONE,
    
    -- Implementation
    implemented_date TIMESTAMP WITH TIME ZONE,
    implemented_by UUID REFERENCES user_profiles(id),
    
    -- Legal & Compliance
    legal_review_required BOOLEAN DEFAULT false,
    legal_reviewed BOOLEAN DEFAULT false,
    legal_reviewed_by VARCHAR(255),
    legal_reviewed_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_revision_number UNIQUE(contract_id, revision_number)
);

-- Contract Alerts & Notifications Table
CREATE TABLE public.contract_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.wedding_contracts(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES public.contract_payment_milestones(id) ON DELETE CASCADE,
    deliverable_id UUID REFERENCES public.contract_deliverables(id) ON DELETE CASCADE,
    
    -- Alert Configuration
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('payment_due', 'payment_overdue', 'deliverable_due', 'deliverable_overdue', 'contract_expiring', 'contract_expired', 'milestone_approaching', 'revision_pending')),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Timing
    trigger_date DATE NOT NULL,
    days_before_due INTEGER,
    
    -- Status & Processing
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'acknowledged', 'dismissed', 'expired')),
    sent_date TIMESTAMP WITH TIME ZONE,
    acknowledged_date TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES user_profiles(id),
    
    -- Recipients
    recipient_user_ids UUID[],
    recipient_emails TEXT[],
    send_to_client BOOLEAN DEFAULT false,
    send_to_supplier BOOLEAN DEFAULT false,
    
    -- Notification Channels
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT false,
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT at_least_one_reference CHECK (
        contract_id IS NOT NULL OR 
        milestone_id IS NOT NULL OR 
        deliverable_id IS NOT NULL
    )
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Contract lookup indexes
CREATE INDEX idx_wedding_contracts_organization ON public.wedding_contracts(organization_id);
CREATE INDEX idx_wedding_contracts_client ON public.wedding_contracts(client_id);
CREATE INDEX idx_wedding_contracts_supplier ON public.wedding_contracts(supplier_id);
CREATE INDEX idx_wedding_contracts_status ON public.wedding_contracts(status);
CREATE INDEX idx_wedding_contracts_contract_number ON public.wedding_contracts(contract_number);
CREATE INDEX idx_wedding_contracts_service_dates ON public.wedding_contracts(service_start_date, service_end_date);
CREATE INDEX idx_wedding_contracts_expiry ON public.wedding_contracts(contract_expiry_date) WHERE contract_expiry_date IS NOT NULL;

-- Payment milestones indexes
CREATE INDEX idx_payment_milestones_contract ON public.contract_payment_milestones(contract_id);
CREATE INDEX idx_payment_milestones_due_date ON public.contract_payment_milestones(due_date);
CREATE INDEX idx_payment_milestones_status ON public.contract_payment_milestones(status);
CREATE INDEX idx_payment_milestones_overdue ON public.contract_payment_milestones(due_date, status) WHERE status IN ('pending', 'overdue');
CREATE INDEX idx_payment_milestones_organization ON public.contract_payment_milestones(organization_id);

-- Deliverables indexes
CREATE INDEX idx_contract_deliverables_contract ON public.contract_deliverables(contract_id);
CREATE INDEX idx_contract_deliverables_due_date ON public.contract_deliverables(due_date);
CREATE INDEX idx_contract_deliverables_status ON public.contract_deliverables(status);
CREATE INDEX idx_contract_deliverables_assigned ON public.contract_deliverables(assigned_to);
CREATE INDEX idx_contract_deliverables_organization ON public.contract_deliverables(organization_id);

-- Revisions indexes
CREATE INDEX idx_contract_revisions_contract ON public.contract_revisions(contract_id);
CREATE INDEX idx_contract_revisions_status ON public.contract_revisions(status);
CREATE INDEX idx_contract_revisions_created ON public.contract_revisions(created_at);

-- Alerts indexes
CREATE INDEX idx_contract_alerts_trigger_date ON public.contract_alerts(trigger_date, status) WHERE status = 'scheduled';
CREATE INDEX idx_contract_alerts_contract ON public.contract_alerts(contract_id);
CREATE INDEX idx_contract_alerts_organization ON public.contract_alerts(organization_id);

-- Full text search indexes
CREATE INDEX idx_contracts_search ON public.wedding_contracts USING gin(
    to_tsvector('english', 
        COALESCE(title, '') || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(contract_number, '') || ' ' ||
        array_to_string(tags, ' ')
    )
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.contract_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_payment_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_alerts ENABLE ROW LEVEL SECURITY;

-- Contract Categories: Read-only for authenticated users
CREATE POLICY "Contract categories are viewable by authenticated users" ON public.contract_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Wedding Contracts: Organization-based access
CREATE POLICY "Users can view their organization's contracts" ON public.wedding_contracts
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = (SELECT auth.uid())
    ));

CREATE POLICY "Users can insert contracts for their organization" ON public.wedding_contracts
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = (SELECT auth.uid())
    ));

CREATE POLICY "Users can update their organization's contracts" ON public.wedding_contracts
    FOR UPDATE USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = (SELECT auth.uid())
    ));

CREATE POLICY "Users can delete their organization's contracts" ON public.wedding_contracts
    FOR DELETE USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = (SELECT auth.uid())
    ));

-- Payment Milestones: Organization-based access
CREATE POLICY "Users can manage milestones for their organization's contracts" ON public.contract_payment_milestones
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = (SELECT auth.uid())
    ));

-- Deliverables: Organization-based access
CREATE POLICY "Users can manage deliverables for their organization's contracts" ON public.contract_deliverables
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = (SELECT auth.uid())
    ));

-- Revisions: Organization-based access
CREATE POLICY "Users can manage revisions for their organization's contracts" ON public.contract_revisions
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = (SELECT auth.uid())
    ));

-- Alerts: Organization-based access
CREATE POLICY "Users can manage alerts for their organization" ON public.contract_alerts
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM user_profiles WHERE user_id = (SELECT auth.uid())
    ));

-- =====================================================
-- TRIGGERS FOR AUTOMATION
-- =====================================================

-- Update updated_at timestamps
CREATE TRIGGER update_wedding_contracts_updated_at
    BEFORE UPDATE ON public.wedding_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_milestones_updated_at
    BEFORE UPDATE ON public.contract_payment_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at
    BEFORE UPDATE ON public.contract_deliverables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_revisions_updated_at
    BEFORE UPDATE ON public.contract_revisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contract_alerts_updated_at
    BEFORE UPDATE ON public.contract_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update payment milestone status based on due dates
CREATE OR REPLACE FUNCTION update_milestone_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-mark as overdue if past due date
    IF NEW.due_date < CURRENT_DATE AND NEW.status = 'pending' THEN
        NEW.status = 'overdue';
    END IF;
    
    -- Auto-calculate remaining balance
    IF NEW.paid_amount >= NEW.amount THEN
        NEW.status = 'paid';
        NEW.paid_date = COALESCE(NEW.paid_date, CURRENT_DATE);
    ELSIF NEW.paid_amount > 0 THEN
        NEW.status = 'partially_paid';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_milestone_status
    BEFORE INSERT OR UPDATE ON public.contract_payment_milestones
    FOR EACH ROW EXECUTE FUNCTION update_milestone_status();

-- Auto-update deliverable status based on progress and dates
CREATE OR REPLACE FUNCTION update_deliverable_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-mark as overdue if past due date and not completed
    IF NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('completed', 'cancelled') THEN
        NEW.status = 'overdue';
    END IF;
    
    -- Auto-update based on progress percentage
    IF NEW.progress_percentage = 100 AND NEW.status != 'completed' THEN
        NEW.status = 'completed';
        NEW.completed_date = COALESCE(NEW.completed_date, CURRENT_DATE);
    ELSIF NEW.progress_percentage > 0 AND NEW.status = 'pending' THEN
        NEW.status = 'in_progress';
        NEW.started_date = COALESCE(NEW.started_date, CURRENT_DATE);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deliverable_status_trigger
    BEFORE INSERT OR UPDATE ON public.contract_deliverables
    FOR EACH ROW EXECUTE FUNCTION update_deliverable_status();

-- Generate contract number if not provided
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contract_number IS NULL THEN
        NEW.contract_number = 'CON-' || 
            EXTRACT(YEAR FROM CURRENT_DATE) || '-' ||
            LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::text, 2, '0') || '-' ||
            LPAD(nextval('contract_number_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1000;

CREATE TRIGGER generate_contract_number_trigger
    BEFORE INSERT ON public.wedding_contracts
    FOR EACH ROW EXECUTE FUNCTION generate_contract_number();

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Default Contract Categories
INSERT INTO public.contract_categories (name, display_name, description, icon, color, sort_order) VALUES
    ('venue', 'Venue Contracts', 'Wedding venue rental agreements and service contracts', 'Building', '#8B5CF6', 1),
    ('photography', 'Photography Contracts', 'Wedding photography service agreements', 'Camera', '#3B82F6', 2),
    ('videography', 'Videography Contracts', 'Wedding videography and cinematography contracts', 'Video', '#06B6D4', 3),
    ('catering', 'Catering Contracts', 'Food and beverage service agreements', 'UtensilsCrossed', '#10B981', 4),
    ('music_entertainment', 'Music & Entertainment', 'DJ, band, and entertainment service contracts', 'Music', '#F59E0B', 5),
    ('florals', 'Floral Contracts', 'Florist and floral design service agreements', 'Flower', '#EC4899', 6),
    ('beauty', 'Beauty Services', 'Hair, makeup, and beauty service contracts', 'Sparkles', '#8B5CF6', 7),
    ('transport', 'Transportation', 'Wedding car and transportation service contracts', 'Car', '#6B7280', 8),
    ('planning', 'Planning Services', 'Wedding planner and coordinator contracts', 'Calendar', '#EF4444', 9),
    ('other', 'Other Services', 'Miscellaneous vendor and service contracts', 'FileText', '#6B7280', 10);

-- =====================================================
-- HELPFUL VIEWS FOR DEVELOPMENT
-- =====================================================

-- Contracts with payment status summary
CREATE VIEW public.contracts_with_payment_status AS
SELECT 
    c.*,
    cat.display_name as category_name,
    cat.icon as category_icon,
    COUNT(pm.id) as total_milestones,
    COUNT(CASE WHEN pm.status = 'paid' THEN 1 END) as paid_milestones,
    COUNT(CASE WHEN pm.status = 'overdue' THEN 1 END) as overdue_milestones,
    COALESCE(SUM(pm.paid_amount), 0) as total_paid,
    COALESCE(SUM(CASE WHEN pm.status != 'paid' THEN pm.amount ELSE 0 END), 0) as amount_outstanding
FROM public.wedding_contracts c
LEFT JOIN public.contract_categories cat ON c.category_id = cat.id
LEFT JOIN public.contract_payment_milestones pm ON c.id = pm.contract_id
WHERE c.status != 'cancelled'
GROUP BY c.id, cat.display_name, cat.icon;

-- Upcoming deliverables view
CREATE VIEW public.upcoming_deliverables AS
SELECT 
    d.*,
    c.title as contract_title,
    c.contract_number,
    cl.first_name || ' ' || cl.last_name as client_name
FROM public.contract_deliverables d
JOIN public.wedding_contracts c ON d.contract_id = c.id
JOIN public.clients cl ON c.client_id = cl.id
WHERE d.status NOT IN ('completed', 'cancelled')
    AND d.due_date <= CURRENT_DATE + INTERVAL '14 days'
ORDER BY d.due_date ASC;

-- Overdue payments view
CREATE VIEW public.overdue_payments AS
SELECT 
    pm.*,
    c.title as contract_title,
    c.contract_number,
    cl.first_name || ' ' || cl.last_name as client_name,
    (CURRENT_DATE - pm.due_date) as days_overdue
FROM public.contract_payment_milestones pm
JOIN public.wedding_contracts c ON pm.contract_id = c.id
JOIN public.clients cl ON c.client_id = cl.id
WHERE pm.status IN ('pending', 'overdue', 'partially_paid')
    AND pm.due_date < CURRENT_DATE
ORDER BY pm.due_date ASC;

-- Contract analytics view
CREATE VIEW public.contract_analytics AS
SELECT 
    organization_id,
    COUNT(*) as total_contracts,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_contracts,
    COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed_contracts,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_contracts,
    SUM(total_amount) as total_contract_value,
    AVG(total_amount) as avg_contract_value,
    COUNT(CASE WHEN contract_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_soon
FROM public.wedding_contracts
WHERE status != 'cancelled'
GROUP BY organization_id;

-- =====================================================
-- GRANTS FOR PROPER PERMISSIONS
-- =====================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant permissions on tables
GRANT ALL ON public.contract_categories TO authenticated;
GRANT ALL ON public.wedding_contracts TO authenticated;
GRANT ALL ON public.contract_payment_milestones TO authenticated;
GRANT ALL ON public.contract_deliverables TO authenticated;
GRANT ALL ON public.contract_revisions TO authenticated;
GRANT ALL ON public.contract_alerts TO authenticated;

-- Grant permissions on views
GRANT SELECT ON public.contracts_with_payment_status TO authenticated;
GRANT SELECT ON public.upcoming_deliverables TO authenticated;
GRANT SELECT ON public.overdue_payments TO authenticated;
GRANT SELECT ON public.contract_analytics TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.contract_categories IS 'Categories for organizing different types of wedding contracts';
COMMENT ON TABLE public.wedding_contracts IS 'Main contracts table linking clients and suppliers with payment tracking';
COMMENT ON TABLE public.contract_payment_milestones IS 'Payment schedule and milestone tracking for contracts';
COMMENT ON TABLE public.contract_deliverables IS 'Vendor deliverables and deadline management for contracts';
COMMENT ON TABLE public.contract_revisions IS 'Contract amendment and revision tracking with approval workflow';
COMMENT ON TABLE public.contract_alerts IS 'Automated alerts and notifications for contract management';

COMMENT ON COLUMN public.wedding_contracts.contract_number IS 'Auto-generated unique identifier for each contract';
COMMENT ON COLUMN public.contract_payment_milestones.sequence_order IS 'Order of payment in the milestone sequence';
COMMENT ON COLUMN public.contract_deliverables.dependency_ids IS 'Array of deliverable IDs that must be completed first';
COMMENT ON COLUMN public.contract_revisions.fields_changed IS 'JSON tracking specific field changes in revision';

-- Re-enable constraints
SET CONSTRAINTS ALL IMMEDIATE;



-- ========================================
-- Migration: 20250822000001_advanced_section_configuration.sql
-- ========================================

-- Advanced Section Configuration System
-- WS-066: Team B Round 3 - Timeline-based visibility and intelligent content rules

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Section visibility rules table
CREATE TABLE section_visibility_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    section_id UUID NOT NULL, -- References dashboard_template_sections
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('timeline', 'package', 'form_state', 'custom', 'milestone_completed', 'client_metadata')),
    condition_field VARCHAR(100) NOT NULL,
    operator VARCHAR(20) NOT NULL CHECK (operator IN ('equals', 'not_equals', 'greater_than', 'less_than', 'between', 'in', 'not_in', 'contains', 'exists')),
    condition_value JSONB,
    logic_operator VARCHAR(3) CHECK (logic_operator IN ('and', 'or')),
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    cache_duration_minutes INTEGER DEFAULT 6