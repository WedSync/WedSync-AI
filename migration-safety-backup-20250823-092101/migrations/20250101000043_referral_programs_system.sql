-- Migration: 026_referral_programs_system.sql
-- Feature: WS-046 - Referral Programs System  
-- Description: Complete referral system with programs, codes, conversions and analytics

-- Referral Programs table
CREATE TABLE IF NOT EXISTS referral_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  name VARCHAR(100) NOT NULL,
  reward_type VARCHAR(20) CHECK (reward_type IN ('monetary', 'percentage', 'upgrade', 'custom')),
  referrer_reward_amount DECIMAL(10,2),
  referee_reward_amount DECIMAL(10,2),
  milestone_rewards JSONB, -- {3: 50.00, 5: 100.00, 10: 250.00}
  attribution_window_days INTEGER DEFAULT 90,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral Codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  program_id UUID NOT NULL REFERENCES referral_programs(id),
  couple_id UUID NOT NULL REFERENCES couples(id),
  landing_page_url TEXT,
  qr_code_url TEXT,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disabled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral Conversions table
CREATE TABLE IF NOT EXISTS referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
  referred_couple_id UUID REFERENCES couples(id),
  referred_email VARCHAR(255) NOT NULL,
  click_timestamp TIMESTAMP WITH TIME ZONE,
  conversion_timestamp TIMESTAMP WITH TIME ZONE,
  reward_fulfilled BOOLEAN DEFAULT FALSE,
  reward_amount DECIMAL(10,2),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral Analytics table
CREATE TABLE IF NOT EXISTS referral_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES referral_programs(id),
  date DATE NOT NULL,
  invitations_sent INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue_generated DECIMAL(10,2) DEFAULT 0,
  rewards_paid DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(program_id, date)
);

-- Performance indexes
CREATE INDEX idx_referral_programs_supplier ON referral_programs(supplier_id);
CREATE INDEX idx_referral_programs_active ON referral_programs(is_active, expires_at);
CREATE INDEX idx_referral_codes_program ON referral_codes(program_id);
CREATE INDEX idx_referral_codes_couple ON referral_codes(couple_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_conversions_code ON referral_conversions(referral_code_id);
CREATE INDEX idx_referral_conversions_email ON referral_conversions(referred_email);
CREATE INDEX idx_referral_conversions_timestamp ON referral_conversions(conversion_timestamp);
CREATE INDEX idx_referral_analytics_program_date ON referral_analytics(program_id, date);

-- Row Level Security Policies
ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_programs
CREATE POLICY "Suppliers can view their own referral programs"
ON referral_programs FOR SELECT
TO authenticated
USING (supplier_id = ( SELECT auth.uid() ));

CREATE POLICY "Suppliers can create their own referral programs"
ON referral_programs FOR INSERT
TO authenticated
WITH CHECK (supplier_id = ( SELECT auth.uid() ));

CREATE POLICY "Suppliers can update their own referral programs"
ON referral_programs FOR UPDATE
TO authenticated
USING (supplier_id = ( SELECT auth.uid() ));

-- RLS Policies for referral_codes
CREATE POLICY "Suppliers can view their referral codes"
ON referral_codes FOR SELECT
TO authenticated
USING (
  program_id IN (
    SELECT id FROM referral_programs WHERE supplier_id = ( SELECT auth.uid() )
  )
);

CREATE POLICY "Suppliers can create referral codes"
ON referral_codes FOR INSERT
TO authenticated
WITH CHECK (
  program_id IN (
    SELECT id FROM referral_programs WHERE supplier_id = ( SELECT auth.uid() )
  )
);

-- RLS Policies for referral_conversions
CREATE POLICY "Suppliers can view their conversions"
ON referral_conversions FOR SELECT
TO authenticated
USING (
  referral_code_id IN (
    SELECT rc.id FROM referral_codes rc
    JOIN referral_programs rp ON rc.program_id = rp.id
    WHERE rp.supplier_id = ( SELECT auth.uid() )
  )
);

CREATE POLICY "System can create conversions"
ON referral_conversions FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for referral_analytics
CREATE POLICY "Suppliers can view their analytics"
ON referral_analytics FOR SELECT
TO authenticated
USING (
  program_id IN (
    SELECT id FROM referral_programs WHERE supplier_id = ( SELECT auth.uid() )
  )
);

-- Functions for automated code generation and analytics
CREATE OR REPLACE FUNCTION update_referral_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO referral_analytics (program_id, date, clicks, conversions)
  VALUES (
    (SELECT program_id FROM referral_codes WHERE id = NEW.referral_code_id),
    CURRENT_DATE,
    CASE WHEN NEW.click_timestamp IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.conversion_timestamp IS NOT NULL THEN 1 ELSE 0 END
  )
  ON CONFLICT (program_id, date)
  DO UPDATE SET
    clicks = referral_analytics.clicks + CASE WHEN NEW.click_timestamp IS NOT NULL THEN 1 ELSE 0 END,
    conversions = referral_analytics.conversions + CASE WHEN NEW.conversion_timestamp IS NOT NULL THEN 1 ELSE 0 END,
    revenue_generated = referral_analytics.revenue_generated + COALESCE(NEW.reward_amount, 0);
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_analytics
  AFTER INSERT ON referral_conversions
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_analytics();

-- Function to update click counts
CREATE OR REPLACE FUNCTION increment_click_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE referral_codes 
  SET total_clicks = total_clicks + 1
  WHERE id = NEW.referral_code_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_clicks
  AFTER INSERT ON referral_conversions
  FOR EACH ROW
  WHEN (NEW.click_timestamp IS NOT NULL)
  EXECUTE FUNCTION increment_click_count();