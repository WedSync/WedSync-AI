-- WS-075: Couple Signup System with OAuth and Invitation Linking
-- Date: 2025-08-22
-- Purpose: Complete couple onboarding system with OAuth integration and supplier linking

-- Create couples table for complete couple profiles
CREATE TABLE IF NOT EXISTS public.couples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    wedding_date DATE,
    venue_name TEXT,
    venue_address TEXT,
    guest_count INTEGER,
    budget DECIMAL(10,2),
    invitation_token UUID UNIQUE,
    supplier_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_progress JSONB DEFAULT '{"steps_completed": 0, "total_steps": 5, "current_step": "account_creation"}'::JSONB,
    wedding_style TEXT,
    wedding_theme TEXT,
    partner_first_name TEXT,
    partner_last_name TEXT,
    partner_email TEXT,
    partner_phone TEXT,
    primary_contact_preference TEXT DEFAULT 'email',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create OAuth accounts tracking table
CREATE TABLE IF NOT EXISTS public.oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'facebook')),
    provider_user_id TEXT NOT NULL,
    provider_email TEXT,
    provider_name TEXT,
    provider_picture TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- Create invitation links table for tracking supplier invitations
CREATE TABLE IF NOT EXISTS public.invitation_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token UUID UNIQUE DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    couple_email TEXT NOT NULL,
    couple_name TEXT,
    wedding_date DATE,
    venue_name TEXT,
    prefilled_data JSONB DEFAULT '{}'::JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    accepted_at TIMESTAMPTZ,
    accepted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create onboarding steps tracking table
CREATE TABLE IF NOT EXISTS public.onboarding_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    data JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(couple_id, step_name)
);

-- Create couple preferences table
CREATE TABLE IF NOT EXISTS public.couple_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE UNIQUE,
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'America/New_York',
    currency TEXT DEFAULT 'USD',
    date_format TEXT DEFAULT 'MM/DD/YYYY',
    communication_preferences JSONB DEFAULT '{
        "email_frequency": "weekly",
        "sms_enabled": false,
        "push_enabled": true,
        "marketing_emails": true,
        "reminder_emails": true
    }'::JSONB,
    dashboard_settings JSONB DEFAULT '{
        "default_view": "timeline",
        "show_budget_widget": true,
        "show_guest_widget": true,
        "show_tasks_widget": true
    }'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create couple-vendor relationships table
CREATE TABLE IF NOT EXISTS public.couple_vendor_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
    relationship_type TEXT DEFAULT 'client' CHECK (relationship_type IN ('client', 'lead', 'inquiry', 'past_client')),
    connected_via TEXT CHECK (connected_via IN ('invitation', 'direct_signup', 'referral', 'marketplace')),
    invitation_link_id UUID REFERENCES public.invitation_links(id) ON DELETE SET NULL,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(couple_id, vendor_id)
);

-- Create signup analytics table
CREATE TABLE IF NOT EXISTS public.signup_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    signup_method TEXT CHECK (signup_method IN ('email', 'google', 'apple', 'facebook', 'invitation')),
    referral_source TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    device_type TEXT,
    browser TEXT,
    ip_address INET,
    country TEXT,
    time_to_complete_seconds INTEGER,
    abandoned_at_step TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_couples_user_id ON public.couples(user_id);
CREATE INDEX IF NOT EXISTS idx_couples_partner_user_id ON public.couples(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_couples_supplier_id ON public.couples(supplier_id);
CREATE INDEX IF NOT EXISTS idx_couples_invitation_token ON public.couples(invitation_token);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON public.oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON public.oauth_accounts(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_invitation_links_token ON public.invitation_links(token);
CREATE INDEX IF NOT EXISTS idx_invitation_links_supplier_id ON public.invitation_links(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invitation_links_status ON public.invitation_links(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_couple_id ON public.onboarding_steps(couple_id);
CREATE INDEX IF NOT EXISTS idx_couple_vendor_relationships_couple_id ON public.couple_vendor_relationships(couple_id);
CREATE INDEX IF NOT EXISTS idx_couple_vendor_relationships_vendor_id ON public.couple_vendor_relationships(vendor_id);
CREATE INDEX IF NOT EXISTS idx_signup_analytics_user_id ON public.signup_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_signup_analytics_signup_method ON public.signup_analytics(signup_method);

-- Enable RLS
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_vendor_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for couples
CREATE POLICY "Users can view their own couple profile" ON public.couples
    FOR SELECT USING (auth.uid() IN (user_id, partner_user_id));

CREATE POLICY "Users can update their own couple profile" ON public.couples
    FOR UPDATE USING (auth.uid() IN (user_id, partner_user_id));

CREATE POLICY "Users can create couple profile" ON public.couples
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for oauth_accounts
CREATE POLICY "Users can view their own OAuth accounts" ON public.oauth_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own OAuth accounts" ON public.oauth_accounts
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for invitation_links
CREATE POLICY "Suppliers can view their invitation links" ON public.invitation_links
    FOR SELECT USING (
        supplier_id IN (
            SELECT id FROM public.vendors WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Public can view invitation by token" ON public.invitation_links
    FOR SELECT USING (true);

CREATE POLICY "Suppliers can create invitation links" ON public.invitation_links
    FOR INSERT WITH CHECK (
        supplier_id IN (
            SELECT id FROM public.vendors WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for onboarding_steps
CREATE POLICY "Users can view their onboarding steps" ON public.onboarding_steps
    FOR SELECT USING (
        couple_id IN (
            SELECT id FROM public.couples WHERE auth.uid() IN (user_id, partner_user_id)
        )
    );

CREATE POLICY "Users can update their onboarding steps" ON public.onboarding_steps
    FOR UPDATE USING (
        couple_id IN (
            SELECT id FROM public.couples WHERE auth.uid() IN (user_id, partner_user_id)
        )
    );

-- RLS Policies for couple_preferences
CREATE POLICY "Users can manage their preferences" ON public.couple_preferences
    FOR ALL USING (
        couple_id IN (
            SELECT id FROM public.couples WHERE auth.uid() IN (user_id, partner_user_id)
        )
    );

-- RLS Policies for couple_vendor_relationships
CREATE POLICY "Couples can view their vendor relationships" ON public.couple_vendor_relationships
    FOR SELECT USING (
        couple_id IN (
            SELECT id FROM public.couples WHERE auth.uid() IN (user_id, partner_user_id)
        ) OR
        vendor_id IN (
            SELECT id FROM public.vendors WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Couples and vendors can create relationships" ON public.couple_vendor_relationships
    FOR INSERT WITH CHECK (
        couple_id IN (
            SELECT id FROM public.couples WHERE auth.uid() IN (user_id, partner_user_id)
        ) OR
        vendor_id IN (
            SELECT id FROM public.vendors WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for signup_analytics
CREATE POLICY "System can write signup analytics" ON public.signup_analytics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view signup analytics" ON public.signup_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Helper functions for signup flow
CREATE OR REPLACE FUNCTION public.create_couple_from_invitation(
    p_user_id UUID,
    p_invitation_token UUID
) RETURNS UUID AS $$
DECLARE
    v_couple_id UUID;
    v_invitation RECORD;
BEGIN
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM public.invitation_links
    WHERE token = p_invitation_token AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;
    
    -- Create couple profile with prefilled data
    INSERT INTO public.couples (
        user_id,
        invitation_token,
        supplier_id,
        wedding_date,
        venue_name,
        onboarding_progress
    ) VALUES (
        p_user_id,
        p_invitation_token,
        v_invitation.supplier_id,
        v_invitation.wedding_date,
        v_invitation.venue_name,
        jsonb_build_object(
            'steps_completed', 1,
            'total_steps', 5,
            'current_step', 'basic_info'
        )
    ) RETURNING id INTO v_couple_id;
    
    -- Create vendor relationship
    INSERT INTO public.couple_vendor_relationships (
        couple_id,
        vendor_id,
        relationship_type,
        connected_via,
        invitation_link_id
    ) VALUES (
        v_couple_id,
        v_invitation.supplier_id,
        'client',
        'invitation',
        v_invitation.id
    );
    
    -- Update invitation status
    UPDATE public.invitation_links
    SET status = 'accepted',
        accepted_at = NOW(),
        accepted_by_user_id = p_user_id
    WHERE id = v_invitation.id;
    
    -- Create default preferences
    INSERT INTO public.couple_preferences (couple_id)
    VALUES (v_couple_id);
    
    -- Track initial onboarding step
    INSERT INTO public.onboarding_steps (
        couple_id,
        step_name,
        step_order,
        completed,
        completed_at
    ) VALUES (
        v_couple_id,
        'account_creation',
        1,
        true,
        NOW()
    );
    
    RETURN v_couple_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track onboarding progress
CREATE OR REPLACE FUNCTION public.update_onboarding_progress(
    p_couple_id UUID,
    p_step_name TEXT,
    p_step_data JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB AS $$
DECLARE
    v_progress JSONB;
    v_completed_steps INTEGER;
    v_total_steps INTEGER := 5;
BEGIN
    -- Mark step as completed
    INSERT INTO public.onboarding_steps (
        couple_id,
        step_name,
        step_order,
        completed,
        completed_at,
        data
    ) VALUES (
        p_couple_id,
        p_step_name,
        CASE p_step_name
            WHEN 'account_creation' THEN 1
            WHEN 'basic_info' THEN 2
            WHEN 'partner_info' THEN 3
            WHEN 'vendor_connection' THEN 4
            WHEN 'preferences' THEN 5
            ELSE 6
        END,
        true,
        NOW(),
        p_step_data
    ) ON CONFLICT (couple_id, step_name) DO UPDATE
    SET completed = true,
        completed_at = NOW(),
        data = p_step_data;
    
    -- Count completed steps
    SELECT COUNT(*) INTO v_completed_steps
    FROM public.onboarding_steps
    WHERE couple_id = p_couple_id AND completed = true;
    
    -- Update progress
    v_progress := jsonb_build_object(
        'steps_completed', v_completed_steps,
        'total_steps', v_total_steps,
        'current_step', p_step_name,
        'percentage', (v_completed_steps::FLOAT / v_total_steps * 100)::INTEGER
    );
    
    -- Update couple record
    UPDATE public.couples
    SET onboarding_progress = v_progress,
        onboarding_completed = (v_completed_steps >= v_total_steps)
    WHERE id = p_couple_id;
    
    RETURN v_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_couples_updated_at
    BEFORE UPDATE ON public.couples
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_oauth_accounts_updated_at
    BEFORE UPDATE ON public.oauth_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_invitation_links_updated_at
    BEFORE UPDATE ON public.invitation_links
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_couple_preferences_updated_at
    BEFORE UPDATE ON public.couple_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Grant permissions
GRANT ALL ON public.couples TO authenticated;
GRANT ALL ON public.oauth_accounts TO authenticated;
GRANT ALL ON public.invitation_links TO authenticated;
GRANT ALL ON public.onboarding_steps TO authenticated;
GRANT ALL ON public.couple_preferences TO authenticated;
GRANT ALL ON public.couple_vendor_relationships TO authenticated;
GRANT INSERT ON public.signup_analytics TO authenticated;
GRANT SELECT ON public.signup_analytics TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.couples IS 'WS-075: Complete couple profiles with wedding details and onboarding tracking';
COMMENT ON TABLE public.oauth_accounts IS 'WS-075: OAuth provider accounts linked to users';
COMMENT ON TABLE public.invitation_links IS 'WS-075: Supplier invitation links for couple onboarding';
COMMENT ON TABLE public.onboarding_steps IS 'WS-075: Tracking individual onboarding steps completion';
COMMENT ON TABLE public.couple_preferences IS 'WS-075: Couple preferences and settings';
COMMENT ON TABLE public.couple_vendor_relationships IS 'WS-075: Relationships between couples and vendors';
COMMENT ON TABLE public.signup_analytics IS 'WS-075: Analytics tracking for signup funnel';