-- SUPPLIER REFERRAL & GAMIFICATION SYSTEM
-- WS-344 Team B Round 1 - Database Schema
-- Created: 2025-01-22

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- SUPPLIER REFERRALS TABLE
-- Core referral tracking with comprehensive fraud prevention
-- =============================================================================

CREATE TABLE supplier_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES organizations(id) NOT NULL,
  referred_email TEXT NOT NULL,
  referred_id UUID REFERENCES organizations(id),
  
  -- Tracking Information
  referral_code TEXT UNIQUE NOT NULL,
  custom_link TEXT NOT NULL,
  qr_code_url TEXT,
  source TEXT CHECK (source IN ('link', 'qr', 'email', 'social', 'direct_entry')) DEFAULT 'link',
  source_details TEXT,
  
  -- Status Tracking (6-stage funnel)
  stage TEXT CHECK (stage IN (
    'link_created', 
    'link_clicked', 
    'signup_started', 
    'trial_active', 
    'first_payment', 
    'reward_issued'
  )) DEFAULT 'link_created',
  
  -- Stage Timestamps for Analytics
  clicked_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  reward_issued_at TIMESTAMPTZ,
  
  -- Rewards Configuration
  referrer_reward TEXT CHECK (referrer_reward IN ('1_month_free', 'pending', 'not_eligible')) DEFAULT 'pending',
  referee_bonus TEXT DEFAULT '1_month_free_on_subscription',
  
  -- Attribution & Fraud Prevention
  primary_referrer BOOLEAN DEFAULT true,
  attribution_window INTEGER DEFAULT 30, -- days
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  
  -- Campaign Tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  custom_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_email CHECK (referred_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT no_self_referral CHECK (referrer_id != referred_id),
  CONSTRAINT valid_attribution_window CHECK (attribution_window > 0 AND attribution_window <= 365)
);

-- =============================================================================
-- REFERRAL LEADERBOARD TABLE
-- Pre-calculated rankings for performance optimization
-- =============================================================================

CREATE TABLE referral_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES organizations(id) NOT NULL,
  
  -- Core Metrics (Conversions Only - No Gaming)
  paid_conversions INTEGER DEFAULT 0,
  total_referrals_sent INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  months_earned INTEGER DEFAULT 0,
  
  -- Funnel Analytics
  links_created INTEGER DEFAULT 0,
  links_clicked INTEGER DEFAULT 0,
  signups_generated INTEGER DEFAULT 0,
  trials_activated INTEGER DEFAULT 0,
  
  -- Category & Geographic Rankings
  category_rank INTEGER,
  geographic_rank INTEGER,
  overall_rank INTEGER,
  rank_change INTEGER DEFAULT 0,
  trend TEXT CHECK (trend IN ('rising', 'falling', 'stable')) DEFAULT 'stable',
  
  -- Time Period Tracking
  period_type TEXT CHECK (period_type IN (
    'all_time', 
    'this_year', 
    'this_quarter', 
    'this_month', 
    'this_week'
  )) DEFAULT 'all_time',
  
  -- Performance Metrics
  avg_conversion_time_days DECIMAL(5,1),
  best_performing_source TEXT,
  
  -- Milestone Achievements
  milestones_achieved TEXT[] DEFAULT '{}',
  badges_earned TEXT[] DEFAULT '{}',
  
  -- Metadata
  last_conversion_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint per supplier per period
  UNIQUE(supplier_id, period_type)
);

-- =============================================================================
-- REFERRAL REWARDS TABLE
-- Track reward issuance and redemption
-- =============================================================================

CREATE TABLE referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID REFERENCES supplier_referrals(id) NOT NULL,
  supplier_id UUID REFERENCES organizations(id) NOT NULL,
  
  -- Reward Details
  reward_type TEXT CHECK (reward_type IN ('1_month_free', '3_months_free', 'custom_credit')) NOT NULL,
  reward_value_months INTEGER DEFAULT 1,
  reward_description TEXT,
  
  -- Status Tracking
  status TEXT CHECK (status IN ('pending', 'issued', 'redeemed', 'expired')) DEFAULT 'pending',
  issued_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Billing Integration
  stripe_credit_id TEXT,
  billing_adjustment_amount INTEGER, -- in cents
  billing_period_affected TEXT,
  
  -- Fraud Prevention
  validation_checks TEXT[] DEFAULT '{}',
  manual_review_required BOOLEAN DEFAULT false,
  approved_by UUID, -- admin user who approved
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- REFERRAL MILESTONES TABLE
-- Define and track achievement milestones
-- =============================================================================

CREATE TABLE referral_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Milestone Definition
  milestone_type TEXT CHECK (milestone_type IN (
    'first_conversion', 
    'milestone_5', 
    'milestone_10', 
    'milestone_25', 
    'milestone_50',
    'milestone_100',
    'top_10_monthly',
    'conversion_streak'
  )) NOT NULL,
  
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements JSONB NOT NULL, -- flexible milestone criteria
  
  -- Rewards for Achievement
  reward_type TEXT CHECK (reward_type IN ('badge', 'bonus_credit', 'recognition', 'feature_unlock')),
  reward_details JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- REFERRAL MILESTONE ACHIEVEMENTS TABLE
-- Track individual supplier milestone achievements
-- =============================================================================

CREATE TABLE referral_milestone_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES organizations(id) NOT NULL,
  milestone_id UUID REFERENCES referral_milestones(id) NOT NULL,
  
  -- Achievement Details
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  achievement_data JSONB, -- context like conversion count at time of achievement
  
  -- Reward Status
  reward_issued BOOLEAN DEFAULT false,
  reward_issued_at TIMESTAMPTZ,
  
  UNIQUE(supplier_id, milestone_id)
);

-- =============================================================================
-- REFERRAL AUDIT LOG TABLE
-- Comprehensive fraud detection and suspicious activity tracking
-- =============================================================================

CREATE TABLE referral_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event Details
  event_type TEXT CHECK (event_type IN (
    'referral_created',
    'referral_clicked',
    'conversion_tracked',
    'reward_issued',
    'fraud_attempt',
    'suspicious_activity',
    'manual_review'
  )) NOT NULL,
  
  -- Associated Records
  referral_id UUID REFERENCES supplier_referrals(id),
  supplier_id UUID REFERENCES organizations(id),
  
  -- Event Data
  event_data JSONB,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
  
  -- Request Context
  ip_address INET,
  user_agent TEXT,
  request_headers JSONB,
  
  -- Review Status
  requires_review BOOLEAN DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  resolution TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- Optimized for high-performance queries at scale
-- =============================================================================

-- Primary Performance Indexes
CREATE INDEX idx_supplier_referrals_referrer ON supplier_referrals(referrer_id);
CREATE INDEX idx_supplier_referrals_code ON supplier_referrals(referral_code);
CREATE INDEX idx_supplier_referrals_stage ON supplier_referrals(stage);
CREATE INDEX idx_supplier_referrals_converted ON supplier_referrals(converted_at) WHERE converted_at IS NOT NULL;
CREATE INDEX idx_supplier_referrals_primary ON supplier_referrals(primary_referrer) WHERE primary_referrer = true;

-- Leaderboard Performance Indexes
CREATE INDEX idx_leaderboard_conversions ON referral_leaderboard(paid_conversions DESC);
CREATE INDEX idx_leaderboard_period ON referral_leaderboard(period_type, overall_rank);
CREATE INDEX idx_leaderboard_supplier ON referral_leaderboard(supplier_id);

-- Fraud Prevention Indexes
CREATE INDEX idx_referrals_ip_created ON supplier_referrals(ip_address, created_at);
CREATE INDEX idx_referrals_fraud_check ON supplier_referrals(referrer_id, referred_email, created_at);

-- Analytics Indexes
CREATE INDEX idx_referrals_analytics ON supplier_referrals(stage, created_at, source);
CREATE INDEX idx_audit_log_events ON referral_audit_log(event_type, created_at);
CREATE INDEX idx_audit_log_review ON referral_audit_log(requires_review, severity) WHERE requires_review = true;

-- =============================================================================
-- AUTOMATED TRIGGERS
-- Maintain data consistency and performance
-- =============================================================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_supplier_referrals_updated_at 
  BEFORE UPDATE ON supplier_referrals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_leaderboard_updated_at 
  BEFORE UPDATE ON referral_leaderboard 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_rewards_updated_at 
  BEFORE UPDATE ON referral_rewards 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- LEADERBOARD CALCULATION FUNCTION
-- Efficiently calculate and update leaderboard rankings
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_referral_leaderboard(period_filter TEXT DEFAULT 'all_time')
RETURNS VOID AS $$
DECLARE
  cutoff_date TIMESTAMPTZ;
BEGIN
  -- Determine date filter based on period
  CASE period_filter
    WHEN 'this_week' THEN cutoff_date := date_trunc('week', NOW());
    WHEN 'this_month' THEN cutoff_date := date_trunc('month', NOW());
    WHEN 'this_quarter' THEN cutoff_date := date_trunc('quarter', NOW());
    WHEN 'this_year' THEN cutoff_date := date_trunc('year', NOW());
    ELSE cutoff_date := '1900-01-01'::TIMESTAMPTZ; -- all_time
  END CASE;

  -- Upsert leaderboard data with calculated metrics
  INSERT INTO referral_leaderboard (
    supplier_id,
    period_type,
    paid_conversions,
    total_referrals_sent,
    conversion_rate,
    months_earned,
    links_created,
    links_clicked,
    signups_generated,
    trials_activated,
    avg_conversion_time_days,
    last_conversion_at,
    updated_at
  )
  SELECT 
    r.referrer_id,
    period_filter,
    COUNT(*) FILTER (WHERE r.stage = 'first_payment') as paid_conversions,
    COUNT(*) as total_referrals_sent,
    ROUND(
      CASE 
        WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE r.stage = 'first_payment')::DECIMAL / COUNT(*)) * 100
        ELSE 0
      END, 2
    ) as conversion_rate,
    COUNT(*) FILTER (WHERE r.stage = 'first_payment') as months_earned,
    COUNT(*) FILTER (WHERE r.stage IN ('link_created', 'link_clicked', 'signup_started', 'trial_active', 'first_payment')) as links_created,
    COUNT(*) FILTER (WHERE r.stage IN ('link_clicked', 'signup_started', 'trial_active', 'first_payment')) as links_clicked,
    COUNT(*) FILTER (WHERE r.stage IN ('signup_started', 'trial_active', 'first_payment')) as signups_generated,
    COUNT(*) FILTER (WHERE r.stage IN ('trial_active', 'first_payment')) as trials_activated,
    AVG(EXTRACT(days FROM (r.converted_at - r.created_at))) FILTER (WHERE r.converted_at IS NOT NULL) as avg_conversion_time_days,
    MAX(r.converted_at) as last_conversion_at,
    NOW() as updated_at
  FROM supplier_referrals r
  WHERE r.created_at >= cutoff_date
  GROUP BY r.referrer_id

  ON CONFLICT (supplier_id, period_type) DO UPDATE SET
    paid_conversions = EXCLUDED.paid_conversions,
    total_referrals_sent = EXCLUDED.total_referrals_sent,
    conversion_rate = EXCLUDED.conversion_rate,
    months_earned = EXCLUDED.months_earned,
    links_created = EXCLUDED.links_created,
    links_clicked = EXCLUDED.links_clicked,
    signups_generated = EXCLUDED.signups_generated,
    trials_activated = EXCLUDED.trials_activated,
    avg_conversion_time_days = EXCLUDED.avg_conversion_time_days,
    last_conversion_at = EXCLUDED.last_conversion_at,
    updated_at = NOW();

  -- Calculate rankings
  UPDATE referral_leaderboard SET 
    overall_rank = subquery.new_rank,
    rank_change = COALESCE(subquery.new_rank - referral_leaderboard.overall_rank, 0),
    trend = CASE 
      WHEN subquery.new_rank < COALESCE(referral_leaderboard.overall_rank, 999999) THEN 'rising'
      WHEN subquery.new_rank > COALESCE(referral_leaderboard.overall_rank, 0) THEN 'falling'
      ELSE 'stable'
    END
  FROM (
    SELECT supplier_id, 
           RANK() OVER (ORDER BY paid_conversions DESC, conversion_rate DESC) as new_rank
    FROM referral_leaderboard 
    WHERE period_type = period_filter
  ) as subquery
  WHERE referral_leaderboard.supplier_id = subquery.supplier_id 
    AND referral_leaderboard.period_type = period_filter;

END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- INITIAL DATA - MILESTONE DEFINITIONS
-- =============================================================================

INSERT INTO referral_milestones (milestone_type, title, description, requirements, reward_type, reward_details) VALUES
('first_conversion', 'First Success', 'Congratulations on your first successful referral!', 
 '{"conversions": 1}', 'badge', '{"badge": "first_referral", "description": "Welcome to the referral program!"}'),

('milestone_5', 'Rising Star', 'You''ve successfully referred 5 new suppliers!', 
 '{"conversions": 5}', 'bonus_credit', '{"months": 1, "description": "Bonus month of service"}'),

('milestone_10', 'Referral Champion', '10 successful referrals - you''re making an impact!', 
 '{"conversions": 10}', 'bonus_credit', '{"months": 2, "description": "Two bonus months + Champion badge"}'),

('milestone_25', 'Community Builder', '25 referrals! You''re building the WedSync community.', 
 '{"conversions": 25}', 'feature_unlock', '{"feature": "priority_support", "months": 3}'),

('milestone_50', 'Referral Master', 'Incredible! 50 successful referrals and counting.', 
 '{"conversions": 50}', 'bonus_credit', '{"months": 6, "recognition": "Master Referrer status"}'),

('milestone_100', 'Referral Legend', 'You''ve achieved legendary status with 100+ referrals!', 
 '{"conversions": 100}', 'feature_unlock', '{"features": ["lifetime_priority_support", "exclusive_beta_access"], "months": 12}');

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Ensure suppliers can only access their own referral data
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE supplier_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_milestone_achievements ENABLE ROW LEVEL SECURITY;

-- Supplier referrals policies
CREATE POLICY "Suppliers can view their own referrals" ON supplier_referrals
  FOR SELECT USING (
    referrer_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can create their own referrals" ON supplier_referrals
  FOR INSERT WITH CHECK (
    referrer_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers can update their own referrals" ON supplier_referrals
  FOR UPDATE USING (
    referrer_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Leaderboard policies (public read for gamification)
CREATE POLICY "Public leaderboard read access" ON referral_leaderboard
  FOR SELECT USING (true);

-- Rewards policies
CREATE POLICY "Suppliers can view their own rewards" ON referral_rewards
  FOR SELECT USING (
    supplier_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Milestone achievements policies
CREATE POLICY "Suppliers can view their own achievements" ON referral_milestone_achievements
  FOR SELECT USING (
    supplier_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- INITIAL LEADERBOARD CALCULATION
-- Calculate initial rankings for all time periods
-- =============================================================================

SELECT calculate_referral_leaderboard('all_time');
SELECT calculate_referral_leaderboard('this_year');
SELECT calculate_referral_leaderboard('this_quarter');
SELECT calculate_referral_leaderboard('this_month');
SELECT calculate_referral_leaderboard('this_week');

-- =============================================================================
-- COMPLETION
-- =============================================================================

-- Verify all tables were created successfully
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_name IN (
    'supplier_referrals',
    'referral_leaderboard', 
    'referral_rewards',
    'referral_milestones',
    'referral_milestone_achievements',
    'referral_audit_log'
  );
  
  IF table_count = 6 THEN
    RAISE NOTICE 'SUCCESS: All 6 referral system tables created successfully';
    RAISE NOTICE 'Tables: supplier_referrals, referral_leaderboard, referral_rewards, referral_milestones, referral_milestone_achievements, referral_audit_log';
  ELSE
    RAISE EXCEPTION 'ERROR: Only % out of 6 expected tables were created', table_count;
  END IF;
END $$;

-- Migration completed successfully
COMMENT ON TABLE supplier_referrals IS 'WS-344 Team B - Core referral tracking with fraud prevention';
COMMENT ON TABLE referral_leaderboard IS 'WS-344 Team B - Pre-calculated leaderboard rankings for performance';
COMMENT ON TABLE referral_rewards IS 'WS-344 Team B - Reward tracking and billing integration';
COMMENT ON TABLE referral_milestones IS 'WS-344 Team B - Achievement milestone definitions';
COMMENT ON TABLE referral_milestone_achievements IS 'WS-344 Team B - Supplier milestone achievements';
COMMENT ON TABLE referral_audit_log IS 'WS-344 Team B - Comprehensive fraud detection and audit trail';