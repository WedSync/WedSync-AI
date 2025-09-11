-- WS-131 Round 2: Advanced Billing System
-- Team D: Pricing Strategy System - Advanced Features & Optimization

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    stripe_product_id TEXT UNIQUE,
    stripe_price_id TEXT UNIQUE,
    price_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    interval TEXT CHECK (interval IN ('month', 'year')) NOT NULL,
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    status TEXT CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid')) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancel_at TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'
);

-- Usage alerts configuration
CREATE TABLE IF NOT EXISTS usage_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    threshold_percentage INTEGER CHECK (threshold_percentage BETWEEN 0 AND 100),
    alert_email BOOLEAN DEFAULT true,
    alert_webhook BOOLEAN DEFAULT false,
    alert_in_app BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(subscription_id, metric_name, threshold_percentage)
);

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT UNIQUE,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT CHECK (status IN ('succeeded', 'pending', 'failed', 'canceled', 'refunded')) NOT NULL,
    payment_method TEXT,
    invoice_url TEXT,
    receipt_url TEXT,
    failure_reason TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coupons and discounts table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    stripe_coupon_id TEXT UNIQUE,
    name TEXT,
    percent_off INTEGER CHECK (percent_off BETWEEN 0 AND 100),
    amount_off_cents INTEGER,
    currency TEXT,
    duration TEXT CHECK (duration IN ('forever', 'once', 'repeating')),
    duration_in_months INTEGER,
    max_redemptions INTEGER,
    times_redeemed INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coupon redemptions tracking
CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/B testing experiments table
CREATE TABLE IF NOT EXISTS billing_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    variant_a JSONB NOT NULL,
    variant_b JSONB NOT NULL,
    traffic_split DECIMAL DEFAULT 0.5 CHECK (traffic_split BETWEEN 0 AND 1),
    is_active BOOLEAN DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    winning_variant TEXT CHECK (winning_variant IN ('A', 'B')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Experiment assignments table
CREATE TABLE IF NOT EXISTS experiment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES billing_experiments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variant TEXT CHECK (variant IN ('A', 'B')) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    converted BOOLEAN DEFAULT false,
    conversion_value DECIMAL,
    UNIQUE(experiment_id, user_id)
);

-- Dunning campaigns table
CREATE TABLE IF NOT EXISTS dunning_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    campaign_type TEXT CHECK (campaign_type IN ('payment_failed', 'subscription_past_due', 'trial_ending')) NOT NULL,
    status TEXT CHECK (status IN ('active', 'paused', 'completed', 'failed')) DEFAULT 'active',
    attempts_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_attempt_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    recovered BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue analytics materialized view for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS revenue_analytics AS
SELECT 
    DATE_TRUNC('month', s.created_at) as month,
    COUNT(DISTINCT s.user_id) as active_customers,
    SUM(CASE 
        WHEN p.interval = 'month' THEN p.price_cents 
        ELSE p.price_cents / 12 
    END) / 100.0 as mrr,
    SUM(CASE 
        WHEN p.interval = 'month' THEN p.price_cents * 12
        ELSE p.price_cents 
    END) / 100.0 as arr,
    COUNT(CASE WHEN s.status = 'canceled' THEN 1 END) as churned_customers,
    AVG(p.price_cents) / 100.0 as average_revenue_per_user
FROM user_subscriptions s
JOIN subscription_plans p ON s.plan_id = p.id
WHERE s.status IN ('active', 'canceled')
GROUP BY DATE_TRUNC('month', s.created_at);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_organization_id ON user_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_records_subscription_id ON usage_records(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_recorded_at ON usage_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_usage_records_metric_name ON usage_records(metric_name);
CREATE INDEX IF NOT EXISTS idx_payment_records_subscription_id ON payment_records(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_billing_experiments_active ON billing_experiments(is_active);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user ON experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_dunning_campaigns_status ON dunning_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_dunning_campaigns_next_attempt ON dunning_campaigns(next_attempt_at);

-- Enable Row Level Security
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dunning_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Subscription plans are publicly readable
CREATE POLICY "Subscription plans are viewable by everyone" 
    ON subscription_plans FOR SELECT 
    USING (is_active = true);

-- Users can only see their own subscription data
CREATE POLICY "Users can view own subscriptions" 
    ON user_subscriptions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" 
    ON user_subscriptions FOR UPDATE 
    USING (auth.uid() = user_id);

-- Users can view their own usage records
CREATE POLICY "Users can view own usage records" 
    ON usage_records FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.id = usage_records.subscription_id 
            AND us.user_id = auth.uid()
        )
    );

-- Users can manage their own usage alerts
CREATE POLICY "Users can manage own usage alerts" 
    ON usage_alerts FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.id = usage_alerts.subscription_id 
            AND us.user_id = auth.uid()
        )
    );

-- Users can view their own payment records
CREATE POLICY "Users can view own payment records" 
    ON payment_records FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.id = payment_records.subscription_id 
            AND us.user_id = auth.uid()
        )
    );

-- Active coupons are publicly viewable
CREATE POLICY "Active coupons are viewable by everyone" 
    ON coupons FOR SELECT 
    USING (is_active = true);

-- Users can view their own coupon redemptions
CREATE POLICY "Users can view own coupon redemptions" 
    ON coupon_redemptions FOR SELECT 
    USING (auth.uid() = user_id);

-- Active experiments are viewable
CREATE POLICY "Active experiments are viewable" 
    ON billing_experiments FOR SELECT 
    USING (is_active = true);

-- Users can view their own experiment assignments
CREATE POLICY "Users can view own experiment assignments" 
    ON experiment_assignments FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can view their own dunning campaigns
CREATE POLICY "Users can view own dunning campaigns" 
    ON dunning_campaigns FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_subscriptions us 
            WHERE us.id = dunning_campaigns.subscription_id 
            AND us.user_id = auth.uid()
        )
    );

-- Create functions for complex calculations

-- Function to calculate MRR for a specific date
CREATE OR REPLACE FUNCTION calculate_mrr(target_date DATE)
RETURNS NUMERIC AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(
            CASE 
                WHEN p.interval = 'month' THEN p.price_cents 
                ELSE p.price_cents / 12 
            END
        ) / 100.0, 0)
        FROM user_subscriptions s
        JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.status = 'active'
        AND s.current_period_start <= target_date
        AND s.current_period_end >= target_date
    );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate churn rate
CREATE OR REPLACE FUNCTION calculate_churn_rate(start_date DATE, end_date DATE)
RETURNS NUMERIC AS $$
DECLARE
    churned_count INTEGER;
    total_at_start INTEGER;
BEGIN
    SELECT COUNT(*) INTO churned_count
    FROM user_subscriptions
    WHERE status = 'canceled'
    AND canceled_at BETWEEN start_date AND end_date;
    
    SELECT COUNT(*) INTO total_at_start
    FROM user_subscriptions
    WHERE created_at < start_date
    AND (canceled_at IS NULL OR canceled_at > start_date);
    
    IF total_at_start = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN (churned_count::NUMERIC / total_at_start) * 100;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscription plans
INSERT INTO subscription_plans (name, stripe_product_id, stripe_price_id, price_cents, interval, features, limits) VALUES
('Free', NULL, NULL, 0, 'month', 
    '{"basic_features": true, "email_support": true}'::jsonb,
    '{"clients": 3, "team_members": 1, "ai_usage": 10}'::jsonb),
('Starter', 'prod_starter', 'price_starter_monthly', 2900, 'month',
    '{"all_free_features": true, "priority_support": true, "advanced_analytics": true}'::jsonb,
    '{"clients": 10, "team_members": 3, "ai_usage": 100}'::jsonb),
('Professional', 'prod_professional', 'price_professional_monthly', 4900, 'month',
    '{"all_starter_features": true, "api_access": true, "custom_branding": true}'::jsonb,
    '{"clients": -1, "team_members": 10, "ai_usage": 500}'::jsonb),
('Premium', 'prod_premium', 'price_premium_monthly', 14900, 'month',
    '{"all_professional_features": true, "dedicated_support": true, "white_label": true}'::jsonb,
    '{"clients": -1, "team_members": -1, "ai_usage": -1}'::jsonb)
ON CONFLICT (stripe_price_id) DO NOTHING;