-- WS-131 Pricing Strategy System Enhancement
-- Team D Round 1: Update subscription plans to match new pricing structure
-- Created: 2025-01-24

-- First, add new columns to subscription_plans for enhanced pricing features
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS yearly_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS yearly_stripe_price_id VARCHAR(100);
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS badge_text VARCHAR(50);
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS badge_variant VARCHAR(20);
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS tier VARCHAR(20);

-- Add index for tier-based queries
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_popular ON subscription_plans(is_popular) WHERE is_popular = true;

-- Update existing plans to match new WS-131 pricing structure
UPDATE subscription_plans SET
  display_name = 'Starter',
  price = 0.00,
  yearly_price = 0.00,
  stripe_price_id = 'price_starter_free',
  yearly_stripe_price_id = 'price_starter_free_yearly',
  tagline = 'Perfect for intimate weddings',
  tier = 'starter',
  is_popular = false,
  is_featured = false,
  limits = '{
    "guests": 100,
    "events": 1,
    "storage_gb": 1,
    "team_members": 2,
    "templates": 3,
    "api_requests": 100,
    "email_sends": 50,
    "sms_sends": 0,
    "customBranding": false,
    "prioritySupport": false,
    "analytics": false,
    "apiAccess": false
  }',
  features = '{
    "Guest list management",
    "RSVP tracking",
    "Basic invitation templates",
    "Mobile app access",
    "Email support"
  }',
  updated_at = NOW()
WHERE name = 'free';

-- Update starter to professional
UPDATE subscription_plans SET
  name = 'professional',
  display_name = 'Professional',
  price = 29.00,
  yearly_price = 290.00,
  stripe_price_id = 'price_professional_monthly',
  yearly_stripe_price_id = 'price_professional_yearly',
  tagline = 'Most popular for medium weddings',
  tier = 'professional',
  is_popular = true,
  is_featured = false,
  badge_text = 'Most Popular',
  badge_variant = 'success',
  limits = '{
    "guests": 300,
    "events": 3,
    "storage_gb": 10,
    "team_members": 5,
    "templates": 25,
    "api_requests": 1000,
    "email_sends": 500,
    "sms_sends": 100,
    "customBranding": false,
    "prioritySupport": true,
    "analytics": true,
    "apiAccess": false
  }',
  features = '{
    "Advanced guest management",
    "RSVP tracking & reminders",
    "Premium templates",
    "Seating chart tools",
    "Photo sharing gallery",
    "Guest analytics & insights",
    "Third-party integrations",
    "Priority email support"
  }',
  updated_at = NOW()
WHERE name = 'starter';

-- Update professional to premium
UPDATE subscription_plans SET
  name = 'premium',
  display_name = 'Premium',
  price = 79.00,
  yearly_price = 790.00,
  stripe_price_id = 'price_premium_monthly',
  yearly_stripe_price_id = 'price_premium_yearly',
  tagline = 'For large weddings & professionals',
  tier = 'premium',
  is_popular = false,
  is_featured = true,
  limits = '{
    "guests": -1,
    "events": 10,
    "storage_gb": 100,
    "team_members": 15,
    "templates": -1,
    "api_requests": 10000,
    "email_sends": 5000,
    "sms_sends": 1000,
    "customBranding": true,
    "prioritySupport": true,
    "analytics": true,
    "apiAccess": true
  }',
  features = '{
    "Unlimited guest management",
    "Advanced RSVP system",
    "All premium templates",
    "Advanced seating tools",
    "Unlimited photo storage",
    "Advanced analytics & reporting",
    "Full custom branding",
    "API access",
    "White-label options",
    "24/7 phone support"
  }',
  updated_at = NOW()
WHERE name = 'professional';

-- Update enterprise pricing
UPDATE subscription_plans SET
  price = 199.00,
  yearly_price = 1990.00,
  stripe_price_id = 'price_enterprise_monthly',
  yearly_stripe_price_id = 'price_enterprise_yearly',
  tagline = 'For wedding planning businesses',
  tier = 'enterprise',
  is_popular = false,
  is_featured = false,
  limits = '{
    "guests": -1,
    "events": -1,
    "storage_gb": -1,
    "team_members": -1,
    "templates": -1,
    "api_requests": -1,
    "email_sends": -1,
    "sms_sends": -1,
    "customBranding": true,
    "prioritySupport": true,
    "analytics": true,
    "apiAccess": true
  }',
  features = '{
    "Unlimited everything",
    "Multi-tenant architecture",
    "Advanced role permissions",
    "Single sign-on (SSO)",
    "Custom integrations",
    "Dedicated account manager",
    "Training & onboarding",
    "99.9% uptime SLA",
    "Advanced backup & recovery",
    "Enterprise compliance"
  }',
  updated_at = NOW()
WHERE name = 'enterprise';

-- Add new usage tracking columns for AI services (Teams A, B, C integration)
ALTER TABLE usage_metrics ADD COLUMN IF NOT EXISTS ai_photo_processing_count INTEGER DEFAULT 0;
ALTER TABLE usage_metrics ADD COLUMN IF NOT EXISTS ai_music_recommendations_count INTEGER DEFAULT 0;
ALTER TABLE usage_metrics ADD COLUMN IF NOT EXISTS ai_floral_suggestions_count INTEGER DEFAULT 0;
ALTER TABLE usage_metrics ADD COLUMN IF NOT EXISTS ai_faq_extractions_count INTEGER DEFAULT 0;
ALTER TABLE usage_metrics ADD COLUMN IF NOT EXISTS chatbot_interactions_count INTEGER DEFAULT 0;

-- Update track_usage_metric function to handle AI services
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
    -- New AI service tracking
    WHEN 'ai_photo_processing' THEN
      UPDATE usage_metrics 
      SET ai_photo_processing_count = ai_photo_processing_count + p_increment,
          last_updated = NOW()
      WHERE user_id = p_user_id;
    WHEN 'ai_music_recommendations' THEN
      UPDATE usage_metrics 
      SET ai_music_recommendations_count = ai_music_recommendations_count + p_increment,
          last_updated = NOW()
      WHERE user_id = p_user_id;
    WHEN 'ai_floral_suggestions' THEN
      UPDATE usage_metrics 
      SET ai_floral_suggestions_count = ai_floral_suggestions_count + p_increment,
          last_updated = NOW()
      WHERE user_id = p_user_id;
    WHEN 'ai_faq_extractions' THEN
      UPDATE usage_metrics 
      SET ai_faq_extractions_count = ai_faq_extractions_count + p_increment,
          last_updated = NOW()
      WHERE user_id = p_user_id;
    WHEN 'chatbot_interactions' THEN
      UPDATE usage_metrics 
      SET chatbot_interactions_count = chatbot_interactions_count + p_increment,
          last_updated = NOW()
      WHERE user_id = p_user_id;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can access a feature based on their subscription tier
CREATE OR REPLACE FUNCTION check_feature_access(
  p_user_id UUID,
  p_feature_key TEXT,
  p_current_usage INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  user_plan TEXT;
  feature_record feature_gates%ROWTYPE;
  plan_limits JSONB;
  result JSONB;
BEGIN
  -- Get user's current plan
  SELECT sp.tier INTO user_plan
  FROM user_subscriptions us
  JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- If no active subscription, default to starter (free)
  IF user_plan IS NULL THEN
    user_plan := 'starter';
  END IF;
  
  -- Get feature gate configuration
  SELECT * INTO feature_record
  FROM feature_gates
  WHERE feature_key = p_feature_key
    AND is_active = true;
  
  -- If feature gate doesn't exist, deny access
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'hasAccess', false,
      'reason', 'Feature not configured',
      'userPlan', user_plan
    );
  END IF;
  
  -- Get user's plan limits
  SELECT limits INTO plan_limits
  FROM subscription_plans
  WHERE tier = user_plan
    AND is_active = true;
  
  -- Check if user's plan meets the required plan level
  CASE user_plan
    WHEN 'starter' THEN
      IF feature_record.required_plan NOT IN ('starter') THEN
        RETURN jsonb_build_object(
          'hasAccess', false,
          'reason', 'Upgrade required',
          'requiredPlan', feature_record.required_plan,
          'userPlan', user_plan
        );
      END IF;
    WHEN 'professional' THEN
      IF feature_record.required_plan NOT IN ('starter', 'professional') THEN
        RETURN jsonb_build_object(
          'hasAccess', false,
          'reason', 'Upgrade required',
          'requiredPlan', feature_record.required_plan,
          'userPlan', user_plan
        );
      END IF;
    WHEN 'premium' THEN
      IF feature_record.required_plan NOT IN ('starter', 'professional', 'premium') THEN
        RETURN jsonb_build_object(
          'hasAccess', false,
          'reason', 'Upgrade required',
          'requiredPlan', feature_record.required_plan,
          'userPlan', user_plan
        );
      END IF;
    WHEN 'enterprise' THEN
      -- Enterprise has access to all features
      NULL;
  END CASE;
  
  -- Check usage limits if applicable
  IF feature_record.usage_limit IS NOT NULL AND p_current_usage >= feature_record.usage_limit THEN
    RETURN jsonb_build_object(
      'hasAccess', false,
      'reason', 'Usage limit exceeded',
      'usageLimit', feature_record.usage_limit,
      'currentUsage', p_current_usage,
      'userPlan', user_plan
    );
  END IF;
  
  -- Access granted
  RETURN jsonb_build_object(
    'hasAccess', true,
    'userPlan', user_plan,
    'usageLimit', feature_record.usage_limit,
    'currentUsage', p_current_usage
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's subscription details with plan information
CREATE OR REPLACE FUNCTION get_user_subscription_details(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'subscription', jsonb_build_object(
      'id', us.id,
      'status', us.status,
      'current_period_start', us.current_period_start,
      'current_period_end', us.current_period_end,
      'cancel_at_period_end', us.cancel_at_period_end,
      'trial_start', us.trial_start,
      'trial_end', us.trial_end,
      'stripe_subscription_id', us.stripe_subscription_id,
      'created_at', us.created_at
    ),
    'plan', jsonb_build_object(
      'id', sp.id,
      'name', sp.name,
      'display_name', sp.display_name,
      'tier', sp.tier,
      'price', sp.price,
      'yearly_price', sp.yearly_price,
      'currency', sp.currency,
      'billing_interval', sp.billing_interval,
      'tagline', sp.tagline,
      'is_popular', sp.is_popular,
      'is_featured', sp.is_featured,
      'limits', sp.limits,
      'features', sp.features,
      'badge_text', sp.badge_text,
      'badge_variant', sp.badge_variant
    ),
    'usage', jsonb_build_object(
      'clients_count', um.clients_count,
      'vendors_count', um.vendors_count,
      'journeys_count', um.journeys_count,
      'storage_used_gb', um.storage_used_gb,
      'team_members_count', um.team_members_count,
      'api_requests_count', um.api_requests_count,
      'monthly_api_requests', um.monthly_api_requests,
      'email_sends_count', um.email_sends_count,
      'sms_sends_count', um.sms_sends_count,
      'ai_photo_processing_count', um.ai_photo_processing_count,
      'ai_music_recommendations_count', um.ai_music_recommendations_count,
      'ai_floral_suggestions_count', um.ai_floral_suggestions_count,
      'ai_faq_extractions_count', um.ai_faq_extractions_count,
      'chatbot_interactions_count', um.chatbot_interactions_count,
      'last_updated', um.last_updated
    )
  ) INTO result
  FROM user_subscriptions us
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  LEFT JOIN usage_metrics um ON us.user_id = um.user_id
  WHERE us.user_id = p_user_id
    AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;
  
  -- If no active subscription, return starter plan details
  IF result IS NULL THEN
    SELECT jsonb_build_object(
      'subscription', null,
      'plan', jsonb_build_object(
        'id', sp.id,
        'name', sp.name,
        'display_name', sp.display_name,
        'tier', sp.tier,
        'price', sp.price,
        'yearly_price', sp.yearly_price,
        'currency', sp.currency,
        'billing_interval', sp.billing_interval,
        'tagline', sp.tagline,
        'is_popular', sp.is_popular,
        'is_featured', sp.is_featured,
        'limits', sp.limits,
        'features', sp.features,
        'badge_text', sp.badge_text,
        'badge_variant', sp.badge_variant
      ),
      'usage', COALESCE(
        jsonb_build_object(
          'clients_count', um.clients_count,
          'vendors_count', um.vendors_count,
          'journeys_count', um.journeys_count,
          'storage_used_gb', um.storage_used_gb,
          'team_members_count', um.team_members_count,
          'api_requests_count', um.api_requests_count,
          'monthly_api_requests', um.monthly_api_requests,
          'email_sends_count', um.email_sends_count,
          'sms_sends_count', um.sms_sends_count,
          'ai_photo_processing_count', um.ai_photo_processing_count,
          'ai_music_recommendations_count', um.ai_music_recommendations_count,
          'ai_floral_suggestions_count', um.ai_floral_suggestions_count,
          'ai_faq_extractions_count', um.ai_faq_extractions_count,
          'chatbot_interactions_count', um.chatbot_interactions_count,
          'last_updated', um.last_updated
        ),
        jsonb_build_object(
          'clients_count', 0,
          'vendors_count', 0,
          'journeys_count', 0,
          'storage_used_gb', 0,
          'team_members_count', 1,
          'api_requests_count', 0,
          'monthly_api_requests', 0,
          'email_sends_count', 0,
          'sms_sends_count', 0,
          'ai_photo_processing_count', 0,
          'ai_music_recommendations_count', 0,
          'ai_floral_suggestions_count', 0,
          'ai_faq_extractions_count', 0,
          'chatbot_interactions_count', 0
        )
      )
    ) INTO result
    FROM subscription_plans sp
    LEFT JOIN usage_metrics um ON um.user_id = p_user_id
    WHERE sp.tier = 'starter'
      AND sp.is_active = true
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update feature gates to match new tier system
DELETE FROM feature_gates; -- Clear existing gates

INSERT INTO feature_gates (feature_key, feature_name, description, required_plan, usage_limit, is_active) VALUES

-- Guest Management Features
('guests:basic', 'Basic Guest Management', 'Up to 100 guests for starter plan', 'starter', 100, true),
('guests:professional', 'Professional Guest Management', 'Up to 300 guests with advanced features', 'professional', 300, true),
('guests:unlimited', 'Unlimited Guests', 'Unlimited guest management', 'premium', NULL, true),

-- Event Management Features
('events:single', 'Single Event', 'Manage one event at a time', 'starter', 1, true),
('events:multiple', 'Multiple Events', 'Manage up to 3 events', 'professional', 3, true),
('events:premium', 'Premium Events', 'Manage up to 10 events', 'premium', 10, true),
('events:unlimited', 'Unlimited Events', 'Manage unlimited events', 'enterprise', NULL, true),

-- Template Features
('templates:basic', 'Basic Templates', 'Access to 3 basic templates', 'starter', 3, true),
('templates:premium', 'Premium Templates', 'Access to 25 premium templates', 'professional', 25, true),
('templates:unlimited', 'Unlimited Templates', 'Access to all templates', 'premium', NULL, true),

-- Team Features
('team:duo', 'Team Duo', 'Up to 2 team members', 'starter', 2, true),
('team:professional', 'Professional Team', 'Up to 5 team members', 'professional', 5, true),
('team:premium', 'Premium Team', 'Up to 15 team members', 'premium', 15, true),
('team:unlimited', 'Unlimited Team', 'Unlimited team members', 'enterprise', NULL, true),

-- Storage Features
('storage:basic', 'Basic Storage', 'Up to 1GB storage', 'starter', 1, true),
('storage:professional', 'Professional Storage', 'Up to 10GB storage', 'professional', 10, true),
('storage:premium', 'Premium Storage', 'Up to 100GB storage', 'premium', 100, true),
('storage:unlimited', 'Unlimited Storage', 'Unlimited file storage', 'enterprise', NULL, true),

-- Analytics Features
('analytics:basic', 'Basic Analytics', 'Basic guest analytics', 'professional', NULL, true),
('analytics:advanced', 'Advanced Analytics', 'Advanced analytics & reporting', 'premium', NULL, true),
('analytics:enterprise', 'Enterprise Analytics', 'Enterprise-grade analytics', 'enterprise', NULL, true),

-- Branding Features
('branding:custom', 'Custom Branding', 'Custom logos and colors', 'premium', NULL, true),
('branding:white_label', 'White Label', 'Complete white-label solution', 'enterprise', NULL, true),

-- Support Features
('support:email', 'Email Support', 'Standard email support', 'starter', NULL, true),
('support:priority', 'Priority Support', 'Priority email support', 'professional', NULL, true),
('support:phone', 'Phone Support', '24/7 phone support', 'premium', NULL, true),
('support:dedicated', 'Dedicated Support', 'Dedicated account manager', 'enterprise', NULL, true),

-- API Features
('api:basic', 'Basic API', 'Limited API access', 'professional', 1000, true),
('api:premium', 'Premium API', 'Enhanced API access', 'premium', 10000, true),
('api:unlimited', 'Unlimited API', 'Unlimited API access', 'enterprise', NULL, true),

-- AI Features (Integration with Teams A, B, C)
('ai:photo_processing', 'AI Photo Processing', 'AI-powered photo enhancement and management', 'professional', 100, true),
('ai:photo_unlimited', 'Unlimited AI Photo Processing', 'Unlimited AI photo processing', 'premium', NULL, true),
('ai:music_recommendations', 'AI Music Recommendations', 'AI-powered music suggestions', 'professional', 50, true),
('ai:music_unlimited', 'Unlimited Music AI', 'Unlimited AI music recommendations', 'premium', NULL, true),
('ai:floral_suggestions', 'AI Floral Suggestions', 'AI-powered floral design recommendations', 'professional', 50, true),
('ai:floral_unlimited', 'Unlimited Floral AI', 'Unlimited AI floral suggestions', 'premium', NULL, true),
('ai:faq_extraction', 'AI FAQ Extraction', 'Automated FAQ extraction and categorization', 'premium', 20, true),
('ai:chatbot', 'AI Chatbot', 'AI-powered customer support chatbot', 'premium', 500, true),
('ai:chatbot_unlimited', 'Unlimited AI Chatbot', 'Unlimited AI chatbot interactions', 'enterprise', NULL, true)

ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  required_plan = EXCLUDED.required_plan,
  usage_limit = EXCLUDED.usage_limit,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Create view for easy subscription analytics
CREATE OR REPLACE VIEW subscription_analytics AS
SELECT 
  sp.tier,
  sp.display_name,
  sp.price,
  sp.yearly_price,
  COUNT(us.id) as active_subscriptions,
  SUM(sp.price) as monthly_revenue,
  SUM(sp.yearly_price) as yearly_revenue,
  AVG(EXTRACT(DAYS FROM (us.current_period_end - us.current_period_start))) as avg_billing_cycle_days
FROM subscription_plans sp
LEFT JOIN user_subscriptions us ON sp.id = us.plan_id AND us.status = 'active'
WHERE sp.is_active = true
GROUP BY sp.id, sp.tier, sp.display_name, sp.price, sp.yearly_price
ORDER BY sp.sort_order;

-- Grant access to the view
GRANT SELECT ON subscription_analytics TO authenticated, service_role;

COMMENT ON TABLE subscription_plans IS 'Enhanced subscription plans with WS-131 pricing structure and yearly billing support';
COMMENT ON FUNCTION check_feature_access(UUID, TEXT, INTEGER) IS 'Check if user has access to a specific feature based on subscription tier and usage limits';
COMMENT ON FUNCTION get_user_subscription_details(UUID) IS 'Get comprehensive subscription, plan, and usage details for a user';
COMMENT ON VIEW subscription_analytics IS 'Analytics view for subscription metrics and revenue tracking';