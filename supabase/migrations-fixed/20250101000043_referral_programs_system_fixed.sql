-- Referral Programs System (Fixed)
-- Feature: WS-065 - Comprehensive referral tracking and reward system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Referral Programs Configuration
CREATE TABLE IF NOT EXISTS referral_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    program_name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('percentage', 'fixed_amount', 'points', 'service_credit')),
    reward_value DECIMAL(10,2) NOT NULL,
    reward_currency VARCHAR(3) DEFAULT 'USD',
    min_purchase_amount DECIMAL(10,2) DEFAULT 0,
    max_reward_amount DECIMAL(10,2),
    referral_limit INTEGER, -- Max referrals per user
    expiry_days INTEGER DEFAULT 365,
    terms_conditions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral Links/Codes
CREATE TABLE IF NOT EXISTS referral_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES referral_programs(id) ON DELETE CASCADE,
    referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    custom_link TEXT,
    clicks_count INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    total_rewards_earned DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral Events/Conversions
CREATE TABLE IF NOT EXISTS referral_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_link_id UUID NOT NULL REFERENCES referral_links(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    conversion_type VARCHAR(50) NOT NULL CHECK (conversion_type IN ('signup', 'purchase', 'booking', 'subscription')),
    conversion_value DECIMAL(10,2) DEFAULT 0,
    reward_amount DECIMAL(10,2) DEFAULT 0,
    reward_status VARCHAR(20) DEFAULT 'pending' CHECK (reward_status IN ('pending', 'approved', 'paid', 'cancelled')),
    metadata JSONB DEFAULT '{}',
    converted_at TIMESTAMPTZ DEFAULT NOW(),
    rewarded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral Tracking (clicks, visits)
CREATE TABLE IF NOT EXISTS referral_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_link_id UUID NOT NULL REFERENCES referral_links(id) ON DELETE CASCADE,
    visitor_ip INET,
    user_agent TEXT,
    referrer_url TEXT,
    landing_page TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    session_id TEXT,
    converted BOOLEAN DEFAULT false,
    conversion_id UUID REFERENCES referral_conversions(id) ON DELETE SET NULL,
    visited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral Rewards/Payouts
CREATE TABLE IF NOT EXISTS referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversion_id UUID NOT NULL REFERENCES referral_conversions(id) ON DELETE CASCADE,
    referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_type VARCHAR(50) NOT NULL,
    reward_amount DECIMAL(10,2) NOT NULL,
    reward_currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    payout_method VARCHAR(50), -- 'paypal', 'bank_transfer', 'service_credit', etc.
    payout_details JSONB DEFAULT '{}',
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_programs_organization_id ON referral_programs(organization_id);
CREATE INDEX IF NOT EXISTS idx_referral_programs_is_active ON referral_programs(is_active);

CREATE INDEX IF NOT EXISTS idx_referral_links_program_id ON referral_links(program_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_referrer_user_id ON referral_links(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_referral_code ON referral_links(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_links_is_active ON referral_links(is_active);

CREATE INDEX IF NOT EXISTS idx_referral_conversions_referral_link_id ON referral_conversions(referral_link_id);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_referred_user_id ON referral_conversions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_conversion_type ON referral_conversions(conversion_type);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_reward_status ON referral_conversions(reward_status);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_converted_at ON referral_conversions(converted_at);

CREATE INDEX IF NOT EXISTS idx_referral_tracking_referral_link_id ON referral_tracking(referral_link_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_visitor_ip ON referral_tracking(visitor_ip);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_visited_at ON referral_tracking(visited_at);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_converted ON referral_tracking(converted);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_conversion_id ON referral_rewards(conversion_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_user_id ON referral_rewards(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON referral_rewards(status);

-- Enable RLS
ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organizations can manage their referral programs" ON referral_programs
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their referral links" ON referral_links
    FOR ALL USING (
        referrer_user_id = auth.uid() OR
        program_id IN (
            SELECT rp.id FROM referral_programs rp
            JOIN user_profiles up ON up.organization_id = rp.organization_id
            WHERE up.id = auth.uid()
        )
    );

CREATE POLICY "Users can view conversions for their links" ON referral_conversions
    FOR SELECT USING (
        referral_link_id IN (
            SELECT id FROM referral_links WHERE referrer_user_id = auth.uid()
        ) OR
        referral_link_id IN (
            SELECT rl.id FROM referral_links rl
            JOIN referral_programs rp ON rp.id = rl.program_id
            JOIN user_profiles up ON up.organization_id = rp.organization_id
            WHERE up.id = auth.uid()
        )
    );

-- Public can create conversions (for tracking)
CREATE POLICY "Public can create conversions" ON referral_conversions
    FOR INSERT WITH CHECK (true);

-- Public can create tracking events
CREATE POLICY "Public can create tracking events" ON referral_tracking
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their rewards" ON referral_rewards
    FOR SELECT USING (
        referrer_user_id = auth.uid() OR
        conversion_id IN (
            SELECT rc.id FROM referral_conversions rc
            JOIN referral_links rl ON rl.id = rc.referral_link_id
            JOIN referral_programs rp ON rp.id = rl.program_id
            JOIN user_profiles up ON up.organization_id = rp.organization_id
            WHERE up.id = auth.uid()
        )
    );

-- Functions for referral system (Fixed syntax)

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists BOOLEAN := TRUE;
BEGIN
    WHILE exists LOOP
        code := upper(substring(gen_random_uuid()::text, 1, 8));
        SELECT EXISTS(SELECT 1 FROM referral_links WHERE referral_code = code) INTO exists;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to track referral click
CREATE OR REPLACE FUNCTION track_referral_click(
    p_referral_code TEXT,
    p_visitor_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_referrer_url TEXT DEFAULT NULL,
    p_landing_page TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_referral_link_id UUID;
    v_tracking_id UUID;
BEGIN
    -- Get referral link ID
    SELECT id INTO v_referral_link_id
    FROM referral_links
    WHERE referral_code = p_referral_code AND is_active = true;
    
    IF v_referral_link_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive referral code: %', p_referral_code;
    END IF;
    
    -- Update clicks count
    UPDATE referral_links
    SET clicks_count = clicks_count + 1,
        updated_at = NOW()
    WHERE id = v_referral_link_id;
    
    -- Create tracking record
    INSERT INTO referral_tracking (
        referral_link_id,
        visitor_ip,
        user_agent,
        referrer_url,
        landing_page
    ) VALUES (
        v_referral_link_id,
        p_visitor_ip,
        p_user_agent,
        p_referrer_url,
        p_landing_page
    ) RETURNING id INTO v_tracking_id;
    
    RETURN v_tracking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process referral conversion (Fixed syntax)
CREATE OR REPLACE FUNCTION process_referral_conversion(
    p_referral_code TEXT,
    p_referred_user_id UUID,
    p_conversion_type TEXT,
    p_conversion_value DECIMAL DEFAULT 0
) RETURNS UUID AS $$
DECLARE
    v_referral_link_id UUID;
    v_program_id UUID;
    v_program_reward_type TEXT;
    v_program_reward_value DECIMAL;
    v_program_max_reward DECIMAL;
    v_program_min_purchase DECIMAL;
    v_program_currency TEXT;
    v_referrer_user_id UUID;
    v_conversion_id UUID;
    v_reward_amount DECIMAL;
BEGIN
    -- Get referral link and program details (separate queries to avoid RECORD issues)
    SELECT rl.id, rl.program_id, rl.referrer_user_id 
    INTO v_referral_link_id, v_program_id, v_referrer_user_id
    FROM referral_links rl
    WHERE rl.referral_code = p_referral_code
    AND rl.is_active = true;
    
    IF v_referral_link_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive referral code';
    END IF;
    
    SELECT reward_type, reward_value, max_reward_amount, min_purchase_amount, reward_currency
    INTO v_program_reward_type, v_program_reward_value, v_program_max_reward, v_program_min_purchase, v_program_currency
    FROM referral_programs
    WHERE id = v_program_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inactive referral program';
    END IF;
    
    -- Check if conversion value meets minimum
    IF p_conversion_value < v_program_min_purchase THEN
        RAISE EXCEPTION 'Conversion value below minimum required amount';
    END IF;
    
    -- Calculate reward amount
    IF v_program_reward_type = 'percentage' THEN
        v_reward_amount := p_conversion_value * (v_program_reward_value / 100);
    ELSE
        v_reward_amount := v_program_reward_value;
    END IF;
    
    -- Apply maximum reward limit
    IF v_program_max_reward IS NOT NULL AND v_reward_amount > v_program_max_reward THEN
        v_reward_amount := v_program_max_reward;
    END IF;
    
    -- Create conversion record
    INSERT INTO referral_conversions (
        referral_link_id,
        referred_user_id,
        conversion_type,
        conversion_value,
        reward_amount
    ) VALUES (
        v_referral_link_id,
        p_referred_user_id,
        p_conversion_type,
        p_conversion_value,
        v_reward_amount
    ) RETURNING id INTO v_conversion_id;
    
    -- Update referral link stats
    UPDATE referral_links
    SET successful_referrals = successful_referrals + 1,
        total_rewards_earned = total_rewards_earned + v_reward_amount,
        updated_at = NOW()
    WHERE id = v_referral_link_id;
    
    -- Create reward record
    INSERT INTO referral_rewards (
        conversion_id,
        referrer_user_id,
        reward_type,
        reward_amount,
        reward_currency
    ) VALUES (
        v_conversion_id,
        v_referrer_user_id,
        v_program_reward_type,
        v_reward_amount,
        v_program_currency
    );
    
    RETURN v_conversion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get referral stats
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID, p_program_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_links', COUNT(DISTINCT rl.id),
        'total_clicks', COALESCE(SUM(rl.clicks_count), 0),
        'total_conversions', COALESCE(SUM(rl.successful_referrals), 0),
        'total_rewards_earned', COALESCE(SUM(rl.total_rewards_earned), 0),
        'conversion_rate', CASE 
            WHEN SUM(rl.clicks_count) > 0 THEN
                ROUND((SUM(rl.successful_referrals)::DECIMAL / SUM(rl.clicks_count) * 100), 2)
            ELSE 0
        END
    ) INTO stats
    FROM referral_links rl
    WHERE rl.referrer_user_id = p_user_id
    AND (p_program_id IS NULL OR rl.program_id = p_program_id);
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_referral_programs_updated_at BEFORE UPDATE ON referral_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_links_updated_at BEFORE UPDATE ON referral_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referral_rewards_updated_at BEFORE UPDATE ON referral_rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON referral_programs TO authenticated;
GRANT ALL ON referral_links TO authenticated;
GRANT ALL ON referral_conversions TO authenticated;
GRANT ALL ON referral_tracking TO authenticated;
GRANT ALL ON referral_rewards TO authenticated;

GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION track_referral_click(TEXT, INET, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral_conversion(TEXT, UUID, TEXT, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_stats(UUID, UUID) TO authenticated;

-- Comments
COMMENT ON TABLE referral_programs IS 'Referral program configurations and rules';
COMMENT ON TABLE referral_links IS 'Individual referral links with tracking codes';
COMMENT ON TABLE referral_conversions IS 'Successful referral conversions and rewards';
COMMENT ON TABLE referral_tracking IS 'Click tracking and analytics for referral links';
COMMENT ON TABLE referral_rewards IS 'Reward payouts and status tracking';