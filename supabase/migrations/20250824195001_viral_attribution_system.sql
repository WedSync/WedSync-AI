-- Viral Attribution System Extension
-- WS-143: Viral Marketing Attribution and Chain Tracking
-- Extends the marketing automation system with viral attribution capabilities

BEGIN;

-- Viral Attributions Table
-- Tracks viral invitations sent and their status
CREATE TABLE IF NOT EXISTS viral_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    message_id TEXT, -- External email service message ID
    
    -- Wedding context for personalization
    wedding_context JSONB NOT NULL DEFAULT '{}',
    
    -- Invitation status tracking
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'clicked', 'converted', 'expired')),
    
    -- Conversion tracking
    converted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    converted_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now() + interval '30 days') NOT NULL
);

-- User Attributions Table
-- Tracks the full attribution chain for each user
CREATE TABLE IF NOT EXISTS user_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Attribution details
    event_type TEXT NOT NULL CHECK (event_type IN ('signup', 'conversion', 'payment', 'referral')),
    attribution_source TEXT NOT NULL CHECK (attribution_source IN ('viral_invitation', 'campaign', 'organic', 'paid')),
    conversion_value_cents INTEGER NOT NULL DEFAULT 0,
    
    -- Additional metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one attribution per user per source
    UNIQUE(user_id, attribution_source)
);

-- Attribution Funnel Events Table
-- Tracks conversion funnel progression
CREATE TABLE IF NOT EXISTS attribution_funnel_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK (stage IN ('email_received', 'email_opened', 'link_clicked', 'signup_started', 'signup_completed', 'first_payment')),
    converted BOOLEAN NOT NULL DEFAULT true,
    
    -- Funnel metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Rate Limit Requests Table
-- For rate limiting functionality
CREATE TABLE IF NOT EXISTS rate_limit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Email Interactions Table
-- For personalization engine email tracking
CREATE TABLE IF NOT EXISTS email_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Email details
    template_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    
    -- Engagement tracking
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for viral attribution performance
CREATE INDEX IF NOT EXISTS idx_viral_attributions_referrer ON viral_attributions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_viral_attributions_recipient ON viral_attributions(recipient_email);
CREATE INDEX IF NOT EXISTS idx_viral_attributions_invite_code ON viral_attributions(invite_code);
CREATE INDEX IF NOT EXISTS idx_viral_attributions_status ON viral_attributions(status);
CREATE INDEX IF NOT EXISTS idx_viral_attributions_created_at ON viral_attributions(created_at);

CREATE INDEX IF NOT EXISTS idx_user_attributions_user ON user_attributions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_attributions_referrer ON user_attributions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_attributions_source ON user_attributions(attribution_source);
CREATE INDEX IF NOT EXISTS idx_user_attributions_created_at ON user_attributions(created_at);

CREATE INDEX IF NOT EXISTS idx_attribution_funnel_user ON attribution_funnel_events(user_id);
CREATE INDEX IF NOT EXISTS idx_attribution_funnel_stage ON attribution_funnel_events(stage);
CREATE INDEX IF NOT EXISTS idx_attribution_funnel_timestamp ON attribution_funnel_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_requests(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_timestamp ON rate_limit_requests(timestamp);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start ON rate_limit_requests(window_start);

CREATE INDEX IF NOT EXISTS idx_email_interactions_client ON email_interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_email_interactions_vendor ON email_interactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_email_interactions_sent_at ON email_interactions(sent_at);

-- Enable Row Level Security
ALTER TABLE viral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribution_funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for viral_attributions
CREATE POLICY "Users can view their own viral attributions" ON viral_attributions
    FOR SELECT USING (
        referrer_id = auth.uid() OR 
        converted_user_id = auth.uid()
    );

CREATE POLICY "Users can insert their own viral attributions" ON viral_attributions
    FOR INSERT WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "Users can update their own viral attributions" ON viral_attributions
    FOR UPDATE USING (referrer_id = auth.uid());

-- RLS Policies for user_attributions
CREATE POLICY "Users can view their own attributions" ON user_attributions
    FOR SELECT USING (
        user_id = auth.uid() OR 
        referrer_id = auth.uid()
    );

CREATE POLICY "System can insert attributions" ON user_attributions
    FOR INSERT WITH CHECK (true); -- System-level inserts

-- RLS Policies for attribution_funnel_events
CREATE POLICY "Users can view their own funnel events" ON attribution_funnel_events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert funnel events" ON attribution_funnel_events
    FOR INSERT WITH CHECK (true); -- System-level inserts

-- RLS Policies for rate_limit_requests (system-only)
CREATE POLICY "System manages rate limits" ON rate_limit_requests
    FOR ALL USING (true); -- System-level only

-- RLS Policies for email_interactions
CREATE POLICY "Users can view email interactions for their clients" ON email_interactions
    FOR SELECT USING (
        vendor_id = auth.uid() OR
        client_id IN (
            SELECT id FROM clients WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "System can insert email interactions" ON email_interactions
    FOR INSERT WITH CHECK (true); -- System-level inserts

-- Viral Attribution Chain Analysis Function (Recursive CTE)
CREATE OR REPLACE FUNCTION get_viral_attribution_chain(root_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    generation INTEGER,
    direct_referrals INTEGER,
    conversions INTEGER,
    invitations_sent INTEGER,
    attributed_revenue_cents BIGINT,
    conversion_rate DECIMAL
) SECURITY DEFINER
LANGUAGE SQL
AS $$
WITH RECURSIVE attribution_chain AS (
    -- Base case: root user (no referrer)
    SELECT 
        ua.user_id,
        1 as generation,
        ua.referrer_id,
        ARRAY[ua.user_id] as chain_path
    FROM user_attributions ua
    WHERE ua.user_id = root_user_id
    
    UNION ALL
    
    -- Recursive case: users referred by chain members
    SELECT 
        ua.user_id,
        ac.generation + 1,
        ua.referrer_id,
        ac.chain_path || ua.user_id
    FROM user_attributions ua
    INNER JOIN attribution_chain ac ON ua.referrer_id = ac.user_id
    WHERE ac.generation < 10 -- Prevent infinite recursion
        AND NOT (ua.user_id = ANY(ac.chain_path)) -- Prevent cycles
),
chain_stats AS (
    SELECT 
        ac.user_id,
        ac.generation,
        -- Count direct referrals
        (SELECT COUNT(*) FROM user_attributions ua2 
         WHERE ua2.referrer_id = ac.user_id) as direct_referrals,
        -- Count conversions
        (SELECT COUNT(*) FROM user_attributions ua3 
         WHERE ua3.referrer_id = ac.user_id 
         AND ua3.event_type IN ('conversion', 'payment')) as conversions,
        -- Count invitations sent
        (SELECT COUNT(*) FROM viral_attributions va 
         WHERE va.referrer_id = ac.user_id) as invitations_sent,
        -- Calculate attributed revenue
        (SELECT COALESCE(SUM(ua4.conversion_value_cents), 0) 
         FROM user_attributions ua4 
         WHERE ua4.referrer_id = ac.user_id) as attributed_revenue_cents
    FROM attribution_chain ac
)
SELECT 
    cs.user_id,
    cs.generation,
    cs.direct_referrals,
    cs.conversions,
    cs.invitations_sent,
    cs.attributed_revenue_cents,
    CASE 
        WHEN cs.invitations_sent > 0 THEN cs.conversions::decimal / cs.invitations_sent
        ELSE 0
    END as conversion_rate
FROM chain_stats cs
ORDER BY cs.generation, cs.attributed_revenue_cents DESC;
$$;

-- User Attribution Stats Function
CREATE OR REPLACE FUNCTION get_user_attribution_stats(target_user_id UUID)
RETURNS TABLE(
    total_invitations INTEGER,
    successful_conversions INTEGER,
    conversion_rate DECIMAL,
    attributed_revenue_cents BIGINT
) SECURITY DEFINER
LANGUAGE SQL
AS $$
SELECT 
    (SELECT COUNT(*) FROM viral_attributions WHERE referrer_id = target_user_id)::INTEGER as total_invitations,
    (SELECT COUNT(*) FROM user_attributions WHERE referrer_id = target_user_id)::INTEGER as successful_conversions,
    CASE 
        WHEN (SELECT COUNT(*) FROM viral_attributions WHERE referrer_id = target_user_id) > 0 
        THEN (SELECT COUNT(*) FROM user_attributions WHERE referrer_id = target_user_id)::DECIMAL / 
             (SELECT COUNT(*) FROM viral_attributions WHERE referrer_id = target_user_id)
        ELSE 0
    END as conversion_rate,
    (SELECT COALESCE(SUM(conversion_value_cents), 0) FROM user_attributions WHERE referrer_id = target_user_id) as attributed_revenue_cents;
$$;

-- Update real-time viral metrics function
CREATE OR REPLACE FUNCTION update_realtime_viral_metrics(target_user_id UUID)
RETURNS VOID SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    -- This function would update cached metrics in a real-time metrics table
    -- For now, it's a placeholder that could be expanded
    
    -- Could update a viral_metrics table with cached calculations
    -- to avoid expensive recursive queries on every request
    
    PERFORM pg_notify('viral_metrics_updated', target_user_id::text);
END;
$$;

-- Campaign performance update triggers
CREATE OR REPLACE FUNCTION update_campaign_performance()
RETURNS TRIGGER SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update campaign performance metrics when executions complete
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE marketing_campaigns 
        SET total_sent = total_sent + 1
        WHERE id = NEW.campaign_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for campaign performance updates
CREATE TRIGGER update_campaign_performance_trigger
    AFTER UPDATE ON marketing_campaign_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_performance();

-- Create updated_at triggers for all tables
CREATE TRIGGER set_timestamp_viral_attributions
    BEFORE UPDATE ON viral_attributions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_user_attributions
    BEFORE UPDATE ON user_attributions  
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions for service role
GRANT ALL ON viral_attributions TO service_role;
GRANT ALL ON user_attributions TO service_role;
GRANT ALL ON attribution_funnel_events TO service_role;
GRANT ALL ON rate_limit_requests TO service_role;
GRANT ALL ON email_interactions TO service_role;

GRANT EXECUTE ON FUNCTION get_viral_attribution_chain(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_attribution_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION update_realtime_viral_metrics(UUID) TO service_role;

COMMIT;