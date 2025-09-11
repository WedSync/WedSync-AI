-- WS-107: Marketplace Tier Access Control Database Schema
-- Migration for subscription tier access control system
-- Created: 2025-01-23 (Team E, Batch 8, Round 1)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================================
-- TIER BENEFITS CONFIGURATION TABLE
-- Defines what each subscription tier can access in the marketplace
-- =====================================================================================

CREATE TABLE IF NOT EXISTS marketplace_tier_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(20) UNIQUE NOT NULL,
  
  -- Access permissions
  can_browse BOOLEAN DEFAULT true,
  can_purchase BOOLEAN DEFAULT false,
  can_sell BOOLEAN DEFAULT false,
  can_preview BOOLEAN DEFAULT false,
  
  -- Limits
  monthly_purchase_limit INTEGER,
  daily_preview_limit INTEGER,
  listing_limit INTEGER,
  
  -- Creator benefits
  commission_rate DECIMAL(4,3), -- e.g., 0.700 for 70%
  analytics_level VARCHAR(20) CHECK (analytics_level IN ('none', 'basic', 'advanced', 'premium')),
  promotion_level VARCHAR(20) CHECK (promotion_level IN ('none', 'standard', 'featured', 'spotlight')),
  creator_badge VARCHAR(50),
  
  -- Special features
  featured_creator BOOLEAN DEFAULT false,
  custom_storefront BOOLEAN DEFAULT false,
  priority_support BOOLEAN DEFAULT false,
  
  -- Wedding-specific benefits
  access_categories TEXT[] DEFAULT '{}',
  premium_templates BOOLEAN DEFAULT false,
  exclusive_content BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================================
-- USAGE TRACKING TABLE
-- Tracks all marketplace actions for analytics and enforcement
-- =====================================================================================

CREATE TABLE IF NOT EXISTS marketplace_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('browse', 'preview', 'purchase', 'install', 'sell_attempt')),
  template_id UUID, -- References marketplace_templates(id) when available
  blocked_by_tier BOOLEAN DEFAULT false,
  required_tier VARCHAR(20),
  current_tier VARCHAR(20),
  
  -- Monthly limit tracking
  monthly_count INTEGER DEFAULT 1,
  monthly_limit INTEGER,
  limit_exceeded BOOLEAN DEFAULT false,
  
  -- Wedding business context
  template_category VARCHAR(50),
  template_price_cents INTEGER,
  wedding_context JSONB DEFAULT '{}',
  
  -- Session and tracking
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================================
-- MONTHLY USAGE SUMMARIES TABLE
-- Aggregated monthly usage data for performance
-- =====================================================================================

CREATE TABLE IF NOT EXISTS marketplace_monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  month_year DATE NOT NULL, -- First day of month
  tier VARCHAR(20) NOT NULL,
  
  -- Action counts
  browse_count INTEGER DEFAULT 0,
  preview_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  install_count INTEGER DEFAULT 0,
  
  -- Blocked action counts
  blocked_purchase_count INTEGER DEFAULT 0,
  blocked_sell_count INTEGER DEFAULT 0,
  
  -- Limits and usage
  purchase_limit INTEGER,
  purchase_limit_reached BOOLEAN DEFAULT false,
  preview_limit INTEGER,
  preview_limit_reached BOOLEAN DEFAULT false,
  
  -- Revenue tracking for creators
  total_sales_cents INTEGER DEFAULT 0,
  commission_earned_cents INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(supplier_id, month_year)
);

-- =====================================================================================
-- UPGRADE PROMPTS TABLE
-- Tracks tier upgrade prompts and conversions
-- =====================================================================================

CREATE TABLE IF NOT EXISTS marketplace_upgrade_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  prompt_type VARCHAR(50) NOT NULL, -- 'purchase_blocked', 'sell_blocked', 'limit_reached'
  current_tier VARCHAR(20) NOT NULL,
  recommended_tier VARCHAR(20) NOT NULL,
  
  -- Context for personalization
  blocked_template_id UUID, -- References marketplace_templates(id) when available
  blocked_action VARCHAR(20),
  template_category VARCHAR(50),
  estimated_monthly_value_cents INTEGER, -- Potential earnings/savings
  
  -- Response tracking
  prompt_shown BOOLEAN DEFAULT false,
  shown_at TIMESTAMP WITH TIME ZONE,
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMP WITH TIME ZONE,
  upgraded BOOLEAN DEFAULT false,
  upgraded_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================================
-- SELLER ELIGIBILITY TABLE
-- Tracks seller verification and eligibility status
-- =====================================================================================

CREATE TABLE IF NOT EXISTS marketplace_seller_eligibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE UNIQUE,
  
  -- Eligibility criteria
  tier_qualified BOOLEAN DEFAULT false,
  minimum_tier_required VARCHAR(20) DEFAULT 'professional',
  account_age_days INTEGER DEFAULT 0,
  account_age_qualified BOOLEAN DEFAULT false,
  completed_client_journeys INTEGER DEFAULT 0,
  journey_count_qualified BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  
  -- Manual review status
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'suspended')),
  verified_by UUID REFERENCES suppliers(id),
  verification_notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Performance requirements
  average_client_rating DECIMAL(3,2) DEFAULT 0.00,
  rating_qualified BOOLEAN DEFAULT false,
  has_portfolio BOOLEAN DEFAULT false,
  portfolio_qualified BOOLEAN DEFAULT false,
  
  -- Disqualification tracking
  rejection_reason TEXT,
  suspension_reason TEXT,
  can_reapply_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================================
-- TIER ACCESS AUDIT LOG
-- Immutable audit trail for all tier access decisions
-- =====================================================================================

CREATE TABLE IF NOT EXISTS tier_access_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  action_attempted VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50), -- 'template', 'feature', 'api_endpoint'
  resource_id VARCHAR(100),
  
  -- Decision details
  access_granted BOOLEAN NOT NULL,
  decision_reason TEXT NOT NULL,
  current_tier VARCHAR(20) NOT NULL,
  required_tier VARCHAR(20),
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  request_metadata JSONB DEFAULT '{}',
  
  -- Timestamps (immutable)
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =====================================================================================
-- TIER CHANGE HISTORY
-- Track tier upgrades/downgrades for analytics
-- =====================================================================================

CREATE TABLE IF NOT EXISTS tier_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Tier change details
  previous_tier VARCHAR(20),
  new_tier VARCHAR(20) NOT NULL,
  change_type VARCHAR(20) CHECK (change_type IN ('upgrade', 'downgrade', 'initial')),
  change_reason VARCHAR(100), -- 'subscription_change', 'admin_override', 'trial_ended'
  
  -- Financial impact
  previous_monthly_value_cents INTEGER,
  new_monthly_value_cents INTEGER,
  annual_revenue_impact_cents INTEGER,
  
  -- Context
  triggered_by VARCHAR(50), -- 'stripe_webhook', 'admin_action', 'trial_expiration'
  external_reference VARCHAR(100), -- stripe subscription id, admin user id
  change_metadata JSONB DEFAULT '{}',
  
  effective_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================================
-- PERFORMANCE INDEXES
-- Optimized for frequent permission checking queries
-- =====================================================================================

-- Usage tracking indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_usage_supplier_month ON marketplace_usage_tracking(supplier_id, date_trunc('month', created_at));
CREATE INDEX IF NOT EXISTS idx_marketplace_usage_action_tier ON marketplace_usage_tracking(action_type, blocked_by_tier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_usage_template ON marketplace_usage_tracking(template_id, action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_usage_ip_time ON marketplace_usage_tracking(ip_address, created_at DESC);

-- Monthly usage indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_monthly_usage_supplier ON marketplace_monthly_usage(supplier_id, month_year DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_monthly_usage_tier ON marketplace_monthly_usage(tier, month_year DESC);

-- Upgrade prompts indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_upgrade_prompts_supplier ON marketplace_upgrade_prompts(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_upgrade_prompts_type ON marketplace_upgrade_prompts(prompt_type, shown_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_upgrade_prompts_conversion ON marketplace_upgrade_prompts(prompt_type, clicked, upgraded);

-- Seller eligibility indexes
CREATE INDEX IF NOT EXISTS idx_seller_eligibility_status ON marketplace_seller_eligibility(verification_status, tier_qualified);
CREATE INDEX IF NOT EXISTS idx_seller_eligibility_supplier ON marketplace_seller_eligibility(supplier_id);

-- Audit log indexes (no updates allowed - append only)
CREATE INDEX IF NOT EXISTS idx_tier_access_audit_supplier_time ON tier_access_audit_log(supplier_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_tier_access_audit_action ON tier_access_audit_log(action_attempted, access_granted);
CREATE INDEX IF NOT EXISTS idx_tier_access_audit_resource ON tier_access_audit_log(resource_type, resource_id);

-- Tier change history indexes
CREATE INDEX IF NOT EXISTS idx_tier_change_supplier_time ON tier_change_history(supplier_id, effective_at DESC);
CREATE INDEX IF NOT EXISTS idx_tier_change_type_time ON tier_change_history(change_type, effective_at DESC);

-- =====================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Secure access to tier access control data
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE marketplace_tier_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_upgrade_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_seller_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_access_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_change_history ENABLE ROW LEVEL SECURITY;

-- Tier benefits: readable by all authenticated users
CREATE POLICY "Tier benefits readable by authenticated users" ON marketplace_tier_benefits
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role full access tier benefits" ON marketplace_tier_benefits
  FOR ALL TO service_role USING (true);

-- Usage tracking: users can only see their own data
CREATE POLICY "Users can view own usage tracking" ON marketplace_usage_tracking
  FOR SELECT TO authenticated USING (supplier_id = auth.uid());

CREATE POLICY "Users can insert own usage tracking" ON marketplace_usage_tracking
  FOR INSERT TO authenticated WITH CHECK (supplier_id = auth.uid());

CREATE POLICY "Service role full access usage tracking" ON marketplace_usage_tracking
  FOR ALL TO service_role USING (true);

-- Monthly usage: users can only see their own data
CREATE POLICY "Users can view own monthly usage" ON marketplace_monthly_usage
  FOR SELECT TO authenticated USING (supplier_id = auth.uid());

CREATE POLICY "Service role full access monthly usage" ON marketplace_monthly_usage
  FOR ALL TO service_role USING (true);

-- Upgrade prompts: users can see their own data
CREATE POLICY "Users can view own upgrade prompts" ON marketplace_upgrade_prompts
  FOR SELECT TO authenticated USING (supplier_id = auth.uid());

CREATE POLICY "Users can update own upgrade prompts" ON marketplace_upgrade_prompts
  FOR UPDATE TO authenticated USING (supplier_id = auth.uid());

CREATE POLICY "Service role full access upgrade prompts" ON marketplace_upgrade_prompts
  FOR ALL TO service_role USING (true);

-- Seller eligibility: users can view their own data
CREATE POLICY "Users can view own seller eligibility" ON marketplace_seller_eligibility
  FOR SELECT TO authenticated USING (supplier_id = auth.uid());

CREATE POLICY "Service role full access seller eligibility" ON marketplace_seller_eligibility
  FOR ALL TO service_role USING (true);

-- Audit log: read-only for users (their own data), full access for service
CREATE POLICY "Users can view own audit log" ON tier_access_audit_log
  FOR SELECT TO authenticated USING (supplier_id = auth.uid());

CREATE POLICY "Service role full access audit log" ON tier_access_audit_log
  FOR ALL TO service_role USING (true);

-- Tier change history: users can view their own data
CREATE POLICY "Users can view own tier change history" ON tier_change_history
  FOR SELECT TO authenticated USING (supplier_id = auth.uid());

CREATE POLICY "Service role full access tier change history" ON tier_change_history
  FOR ALL TO service_role USING (true);

-- =====================================================================================
-- DEFAULT TIER BENEFITS DATA
-- Populate tier benefits based on existing subscription plans
-- =====================================================================================

INSERT INTO marketplace_tier_benefits (
  tier, can_browse, can_purchase, can_sell, can_preview,
  monthly_purchase_limit, daily_preview_limit, listing_limit,
  commission_rate, analytics_level, promotion_level,
  access_categories, premium_templates, featured_creator, custom_storefront
) VALUES 
-- Free Tier - Browse only
('free', true, false, false, true, 0, 3, 0, 
 null, 'none', 'none', 
 ARRAY['basic_forms'], false, false, false),

-- Starter Tier - Limited purchase access
('starter', true, true, false, true, 5, 10, 0, 
 null, 'none', 'none', 
 ARRAY['basic_forms', 'email_templates'], false, false, false),

-- Professional Tier - Full marketplace access including selling
('professional', true, true, true, true, null, null, 10, 
 0.700, 'basic', 'standard', 
 ARRAY['all'], true, false, false),

-- Scale Tier - Enhanced benefits and promotion
('scale', true, true, true, true, null, null, 50, 
 0.750, 'advanced', 'featured', 
 ARRAY['all'], true, true, false),

-- Enterprise Tier - Maximum benefits and white-label options
('enterprise', true, true, true, true, null, null, null, 
 0.800, 'premium', 'spotlight', 
 ARRAY['all'], true, true, true)

ON CONFLICT (tier) DO UPDATE SET
  can_browse = EXCLUDED.can_browse,
  can_purchase = EXCLUDED.can_purchase,
  can_sell = EXCLUDED.can_sell,
  can_preview = EXCLUDED.can_preview,
  monthly_purchase_limit = EXCLUDED.monthly_purchase_limit,
  daily_preview_limit = EXCLUDED.daily_preview_limit,
  listing_limit = EXCLUDED.listing_limit,
  commission_rate = EXCLUDED.commission_rate,
  analytics_level = EXCLUDED.analytics_level,
  promotion_level = EXCLUDED.promotion_level,
  access_categories = EXCLUDED.access_categories,
  premium_templates = EXCLUDED.premium_templates,
  featured_creator = EXCLUDED.featured_creator,
  custom_storefront = EXCLUDED.custom_storefront,
  updated_at = NOW();

-- =====================================================================================
-- STORED FUNCTIONS FOR TIER ACCESS CONTROL
-- High-performance functions for permission checking
-- =====================================================================================

-- Function: Check if user has permission for marketplace action
CREATE OR REPLACE FUNCTION check_marketplace_tier_access(
  p_supplier_id UUID,
  p_action VARCHAR(20),
  p_template_id UUID DEFAULT NULL
)
RETURNS TABLE (
  access_granted BOOLEAN,
  reason TEXT,
  required_tier VARCHAR(20),
  current_tier VARCHAR(20),
  usage_limit_exceeded BOOLEAN,
  current_usage INTEGER,
  usage_limit INTEGER
) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_current_tier VARCHAR(20);
  v_tier_benefits RECORD;
  v_current_usage INTEGER := 0;
  v_usage_limit INTEGER;
  v_limit_period_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get supplier's current tier from subscription data
  SELECT 
    CASE 
      WHEN us.status = 'active' THEN sp.name
      ELSE 'free'
    END INTO v_current_tier
  FROM suppliers s
  LEFT JOIN user_subscriptions us ON s.id = us.user_id AND us.status = 'active'
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE s.id = p_supplier_id;

  -- If no tier found, default to free
  IF v_current_tier IS NULL THEN
    v_current_tier := 'free';
  END IF;

  -- Get tier benefits
  SELECT * INTO v_tier_benefits
  FROM marketplace_tier_benefits
  WHERE tier = v_current_tier;

  -- If tier benefits not configured, deny access
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Tier configuration not found', 'starter'::VARCHAR(20), v_current_tier, false, 0, 0;
    RETURN;
  END IF;

  -- Check basic permission for action
  CASE p_action
    WHEN 'browse' THEN
      IF NOT v_tier_benefits.can_browse THEN
        RETURN QUERY SELECT false, 'Browsing marketplace requires subscription', 'free'::VARCHAR(20), v_current_tier, false, 0, 0;
        RETURN;
      END IF;
    
    WHEN 'purchase' THEN
      IF NOT v_tier_benefits.can_purchase THEN
        RETURN QUERY SELECT false, 'Purchasing templates requires subscription', 'starter'::VARCHAR(20), v_current_tier, false, 0, 0;
        RETURN;
      END IF;
      
      -- Check monthly purchase limit
      IF v_tier_benefits.monthly_purchase_limit IS NOT NULL THEN
        v_limit_period_start := date_trunc('month', NOW());
        
        SELECT COALESCE(purchase_count, 0) INTO v_current_usage
        FROM marketplace_monthly_usage
        WHERE supplier_id = p_supplier_id 
          AND month_year = v_limit_period_start::DATE;
          
        IF v_current_usage >= v_tier_benefits.monthly_purchase_limit THEN
          RETURN QUERY SELECT false, 'Monthly purchase limit exceeded', 'professional'::VARCHAR(20), v_current_tier, 
                       true, v_current_usage, v_tier_benefits.monthly_purchase_limit;
          RETURN;
        END IF;
        
        v_usage_limit := v_tier_benefits.monthly_purchase_limit;
      END IF;
    
    WHEN 'sell' THEN
      IF NOT v_tier_benefits.can_sell THEN
        RETURN QUERY SELECT false, 'Selling templates requires professional subscription', 'professional'::VARCHAR(20), v_current_tier, false, 0, 0;
        RETURN;
      END IF;
      
      -- Check seller eligibility
      IF NOT EXISTS (
        SELECT 1 FROM marketplace_seller_eligibility 
        WHERE supplier_id = p_supplier_id 
          AND verification_status = 'approved'
      ) THEN
        RETURN QUERY SELECT false, 'Seller verification required', 'professional'::VARCHAR(20), v_current_tier, false, 0, 0;
        RETURN;
      END IF;
    
    WHEN 'preview' THEN
      IF NOT v_tier_benefits.can_preview THEN
        RETURN QUERY SELECT false, 'Template previews require subscription', 'starter'::VARCHAR(20), v_current_tier, false, 0, 0;
        RETURN;
      END IF;
      
      -- Check daily preview limit
      IF v_tier_benefits.daily_preview_limit IS NOT NULL THEN
        v_limit_period_start := date_trunc('day', NOW());
        
        SELECT COUNT(*) INTO v_current_usage
        FROM marketplace_usage_tracking
        WHERE supplier_id = p_supplier_id 
          AND action_type = 'preview'
          AND created_at >= v_limit_period_start;
          
        IF v_current_usage >= v_tier_benefits.daily_preview_limit THEN
          RETURN QUERY SELECT false, 'Daily preview limit exceeded', 'professional'::VARCHAR(20), v_current_tier, 
                       true, v_current_usage, v_tier_benefits.daily_preview_limit;
          RETURN;
        END IF;
        
        v_usage_limit := v_tier_benefits.daily_preview_limit;
      END IF;
  END CASE;

  -- Access granted
  RETURN QUERY SELECT true, 'Access granted'::TEXT, null::VARCHAR(20), v_current_tier, false, v_current_usage, v_usage_limit;
END;
$$;

-- Function: Track marketplace usage with automatic monthly aggregation
CREATE OR REPLACE FUNCTION track_marketplace_usage(
  p_supplier_id UUID,
  p_action_type VARCHAR(20),
  p_template_id UUID DEFAULT NULL,
  p_blocked_by_tier BOOLEAN DEFAULT false,
  p_template_category VARCHAR(50) DEFAULT NULL,
  p_template_price_cents INTEGER DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id VARCHAR(255) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_usage_id UUID;
  v_current_month DATE;
  v_current_tier VARCHAR(20);
BEGIN
  -- Get current month
  v_current_month := date_trunc('month', NOW())::DATE;
  
  -- Get supplier's current tier
  SELECT 
    CASE 
      WHEN us.status = 'active' THEN sp.name
      ELSE 'free'
    END INTO v_current_tier
  FROM suppliers s
  LEFT JOIN user_subscriptions us ON s.id = us.user_id AND us.status = 'active'
  LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
  WHERE s.id = p_supplier_id;

  -- Default to free if no tier found
  IF v_current_tier IS NULL THEN
    v_current_tier := 'free';
  END IF;

  -- Insert usage tracking record
  INSERT INTO marketplace_usage_tracking (
    supplier_id, action_type, template_id, blocked_by_tier,
    current_tier, template_category, template_price_cents,
    ip_address, user_agent, session_id
  ) VALUES (
    p_supplier_id, p_action_type, p_template_id, p_blocked_by_tier,
    v_current_tier, p_template_category, p_template_price_cents,
    p_ip_address, p_user_agent, p_session_id
  ) RETURNING id INTO v_usage_id;

  -- Update monthly usage aggregation
  INSERT INTO marketplace_monthly_usage (
    supplier_id, month_year, tier,
    browse_count, preview_count, purchase_count, install_count,
    blocked_purchase_count, blocked_sell_count
  ) VALUES (
    p_supplier_id, v_current_month, v_current_tier,
    CASE WHEN p_action_type = 'browse' AND NOT p_blocked_by_tier THEN 1 ELSE 0 END,
    CASE WHEN p_action_type = 'preview' AND NOT p_blocked_by_tier THEN 1 ELSE 0 END,
    CASE WHEN p_action_type = 'purchase' AND NOT p_blocked_by_tier THEN 1 ELSE 0 END,
    CASE WHEN p_action_type = 'install' AND NOT p_blocked_by_tier THEN 1 ELSE 0 END,
    CASE WHEN p_action_type = 'purchase' AND p_blocked_by_tier THEN 1 ELSE 0 END,
    CASE WHEN p_action_type = 'sell_attempt' AND p_blocked_by_tier THEN 1 ELSE 0 END
  )
  ON CONFLICT (supplier_id, month_year) DO UPDATE SET
    browse_count = marketplace_monthly_usage.browse_count + 
      CASE WHEN p_action_type = 'browse' AND NOT p_blocked_by_tier THEN 1 ELSE 0 END,
    preview_count = marketplace_monthly_usage.preview_count + 
      CASE WHEN p_action_type = 'preview' AND NOT p_blocked_by_tier THEN 1 ELSE 0 END,
    purchase_count = marketplace_monthly_usage.purchase_count + 
      CASE WHEN p_action_type = 'purchase' AND NOT p_blocked_by_tier THEN 1 ELSE 0 END,
    install_count = marketplace_monthly_usage.install_count + 
      CASE WHEN p_action_type = 'install' AND NOT p_blocked_by_tier THEN 1 ELSE 0 END,
    blocked_purchase_count = marketplace_monthly_usage.blocked_purchase_count + 
      CASE WHEN p_action_type = 'purchase' AND p_blocked_by_tier THEN 1 ELSE 0 END,
    blocked_sell_count = marketplace_monthly_usage.blocked_sell_count + 
      CASE WHEN p_action_type = 'sell_attempt' AND p_blocked_by_tier THEN 1 ELSE 0 END,
    updated_at = NOW();

  RETURN v_usage_id;
END;
$$;

-- Function: Create upgrade prompt
CREATE OR REPLACE FUNCTION create_upgrade_prompt(
  p_supplier_id UUID,
  p_prompt_type VARCHAR(50),
  p_current_tier VARCHAR(20),
  p_recommended_tier VARCHAR(20),
  p_blocked_template_id UUID DEFAULT NULL,
  p_blocked_action VARCHAR(20) DEFAULT NULL,
  p_template_category VARCHAR(50) DEFAULT NULL,
  p_estimated_monthly_value_cents INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_prompt_id UUID;
BEGIN
  -- Insert upgrade prompt record
  INSERT INTO marketplace_upgrade_prompts (
    supplier_id, prompt_type, current_tier, recommended_tier,
    blocked_template_id, blocked_action, template_category,
    estimated_monthly_value_cents
  ) VALUES (
    p_supplier_id, p_prompt_type, p_current_tier, p_recommended_tier,
    p_blocked_template_id, p_blocked_action, p_template_category,
    p_estimated_monthly_value_cents
  ) RETURNING id INTO v_prompt_id;

  RETURN v_prompt_id;
END;
$$;

-- Function: Log tier access audit entry (immutable)
CREATE OR REPLACE FUNCTION log_tier_access_audit(
  p_supplier_id UUID,
  p_action_attempted VARCHAR(50),
  p_resource_type VARCHAR(50) DEFAULT NULL,
  p_resource_id VARCHAR(100) DEFAULT NULL,
  p_access_granted BOOLEAN DEFAULT false,
  p_decision_reason TEXT DEFAULT 'No reason provided',
  p_current_tier VARCHAR(20) DEFAULT 'unknown',
  p_required_tier VARCHAR(20) DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id VARCHAR(255) DEFAULT NULL,
  p_request_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  -- Insert immutable audit log entry
  INSERT INTO tier_access_audit_log (
    supplier_id, action_attempted, resource_type, resource_id,
    access_granted, decision_reason, current_tier, required_tier,
    ip_address, user_agent, session_id, request_metadata,
    occurred_at
  ) VALUES (
    p_supplier_id, p_action_attempted, p_resource_type, p_resource_id,
    p_access_granted, p_decision_reason, p_current_tier, p_required_tier,
    p_ip_address, p_user_agent, p_session_id, p_request_metadata,
    NOW()
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- =====================================================================================
-- TRIGGERS FOR UPDATED_AT COLUMNS
-- Automatically update timestamps on record changes
-- =====================================================================================

-- Update triggers for tables with updated_at columns
CREATE TRIGGER update_marketplace_tier_benefits_updated_at 
  BEFORE UPDATE ON marketplace_tier_benefits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_monthly_usage_updated_at 
  BEFORE UPDATE ON marketplace_monthly_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_seller_eligibility_updated_at 
  BEFORE UPDATE ON marketplace_seller_eligibility
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- COMMENTS FOR DOCUMENTATION
-- Describe tables and key fields for maintainability
-- =====================================================================================

COMMENT ON TABLE marketplace_tier_benefits IS 'Configuration of what each subscription tier can access in marketplace';
COMMENT ON TABLE marketplace_usage_tracking IS 'Detailed tracking of all marketplace actions for analytics and limit enforcement';
COMMENT ON TABLE marketplace_monthly_usage IS 'Aggregated monthly usage summaries for performance and reporting';
COMMENT ON TABLE marketplace_upgrade_prompts IS 'Tracks tier upgrade prompts shown to users and their effectiveness';
COMMENT ON TABLE marketplace_seller_eligibility IS 'Seller verification status and eligibility criteria tracking';
COMMENT ON TABLE tier_access_audit_log IS 'Immutable audit trail of all tier access control decisions';
COMMENT ON TABLE tier_change_history IS 'Historical record of subscription tier changes for analytics';

COMMENT ON FUNCTION check_marketplace_tier_access IS 'High-performance function to validate tier access for marketplace actions';
COMMENT ON FUNCTION track_marketplace_usage IS 'Records marketplace usage and automatically updates monthly aggregations';
COMMENT ON FUNCTION create_upgrade_prompt IS 'Creates tier upgrade prompt records for user engagement tracking';
COMMENT ON FUNCTION log_tier_access_audit IS 'Creates immutable audit log entries for compliance and security';

-- Migration completed successfully
-- Next steps: Apply this migration and create corresponding service layer code