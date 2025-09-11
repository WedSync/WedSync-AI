# 02-suppliers-tables

`## File 2: 02-suppliers-tables.md

```markdown
# Supplier Tables Schema Definition

## Purpose
This document provides the complete SQL schema for all supplier-related tables in the WedSync platform. Claude Code should use these exact definitions to create the database tables, indexes, and RLS policies.

## Table: suppliers

### Description
The main supplier account table storing wedding vendor business information.

### SQL Definition
```sql
CREATE TABLE suppliers (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    
    -- Business Information
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL CHECK (business_type IN (
        'photographer', 'videographer', 'venue', 'caterer', 'florist',
        'dj', 'band', 'planner', 'coordinator', 'hair_makeup',
        'cake', 'stationery', 'transport', 'other'
    )),
    business_description TEXT,
    business_phone TEXT,
    business_website TEXT,
    business_instagram TEXT,
    business_facebook TEXT,
    
    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    address_city TEXT,
    address_state TEXT,
    address_postcode TEXT,
    address_country TEXT DEFAULT 'GB',
    
    -- Subscription
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN (
        'free', 'starter', 'professional', 'scale', 'enterprise'
    )),
    subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN (
        'trialing', 'active', 'past_due', 'canceled', 'paused'
    )),
    trial_ends_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,
    
    -- Features & Limits
    max_clients INTEGER DEFAULT 10,
    max_forms INTEGER DEFAULT 1,
    max_team_members INTEGER DEFAULT 1,
    max_journeys INTEGER DEFAULT 0,
    features JSONB DEFAULT '{
        "forms": true,
        "core_fields": false,
        "email_automation": false,
        "sms_whatsapp": false,
        "ai_features": false,
        "analytics": false,
        "white_label": false,
        "api_access": false
    }'::jsonb,
    
    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step TEXT,
    signup_source TEXT, -- 'organic', 'couple_invite', 'referral', 'ad'
    referrer_id UUID REFERENCES suppliers(id),
    
    -- Settings
    timezone TEXT DEFAULT 'Europe/London',
    currency TEXT DEFAULT 'GBP',
    language TEXT DEFAULT 'en',
    notification_preferences JSONB DEFAULT '{
        "email": {
            "new_client": true,
            "form_response": true,
            "payment": true,
            "weekly_summary": true
        },
        "sms": {
            "urgent_only": true
        },
        "in_app": {
            "all": true
        }
    }'::jsonb,
    
    -- Branding
    logo_url TEXT,
    brand_color_primary TEXT,
    brand_color_secondary TEXT,
    
    -- Analytics
    total_clients INTEGER DEFAULT 0,
    total_forms_created INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (business_phone IS NULL OR business_phone ~ '^\+?[1-9]\d{1,14}$')
);

-- Indexes
CREATE INDEX idx_suppliers_auth_user_id ON suppliers(auth_user_id);
CREATE INDEX idx_suppliers_email ON suppliers(email);
CREATE INDEX idx_suppliers_business_type ON suppliers(business_type);
CREATE INDEX idx_suppliers_subscription_tier ON suppliers(subscription_tier);
CREATE INDEX idx_suppliers_subscription_status ON suppliers(subscription_status);
CREATE INDEX idx_suppliers_created_at ON suppliers(created_at);
CREATE INDEX idx_suppliers_deleted_at ON suppliers(deleted_at) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Suppliers can read their own record
CREATE POLICY suppliers_select_own ON suppliers
    FOR SELECT USING (auth.uid() = auth_user_id);

-- Suppliers can update their own record
CREATE POLICY suppliers_update_own ON suppliers
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- System can insert new suppliers (for signup)
CREATE POLICY suppliers_insert_system ON suppliers
    FOR INSERT WITH CHECK (true);`

## Table: team_members

### Description

Additional team members under a supplier account with role-based permissions.

### SQL Definition

sql

`CREATE TABLE team_members (
    *-- Primary Key*
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    *-- Relationships*
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    *-- Member Information*
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    
    *-- Access Control*
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN (
        'owner', 'admin', 'manager', 'member', 'viewer'
    )),
    permissions JSONB DEFAULT '{
        "clients": {
            "view": true,
            "create": false,
            "edit": false,
            "delete": false
        },
        "forms": {
            "view": true,
            "create": false,
            "edit": false,
            "delete": false
        },
        "journeys": {
            "view": true,
            "create": false,
            "edit": false,
            "delete": false
        },
        "analytics": {
            "view": false
        },
        "billing": {
            "view": false,
            "manage": false
        },
        "team": {
            "view": true,
            "manage": false
        }
    }'::jsonb,
    
    *-- Status*
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'active', 'suspended', 'removed'
    )),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    
    *-- Timestamps*
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    
    *-- Constraints*
    CONSTRAINT unique_team_member UNIQUE (supplier_id, email),
    CONSTRAINT valid_team_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

*-- Indexes*
CREATE INDEX idx_team_members_supplier_id ON team_members(supplier_id);
CREATE INDEX idx_team_members_auth_user_id ON team_members(auth_user_id);
CREATE INDEX idx_team_members_email ON team_members(email);
CREATE INDEX idx_team_members_role ON team_members(role);
CREATE INDEX idx_team_members_status ON team_members(status);

*-- RLS Policies*
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

*-- Team members can view their team*
CREATE POLICY team_members_select ON team_members
    FOR SELECT USING (
        supplier_id IN (
            SELECT supplier_id FROM team_members 
            WHERE auth_user_id = auth.uid() AND status = 'active'
        )
    );

*-- Admins can manage team*
CREATE POLICY team_members_manage ON team_members
    FOR ALL USING (
        supplier_id IN (
            SELECT supplier_id FROM team_members 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND status = 'active'
        )
    );`

## Table: supplier_settings

### Description

Extended settings and preferences for supplier accounts.

### SQL Definition

sql

`CREATE TABLE supplier_settings (
    *-- Primary Key*
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    *-- Relationship*
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    *-- API Keys (encrypted)*
    openai_api_key TEXT, *-- Encrypted using pgcrypto*
    openai_api_key_added_at TIMESTAMPTZ,
    openai_monthly_budget DECIMAL(10,2) DEFAULT 50.00,
    openai_current_usage DECIMAL(10,2) DEFAULT 0.00,
    
    twilio_account_sid TEXT,
    twilio_auth_token TEXT, *-- Encrypted*
    twilio_phone_number TEXT,
    twilio_whatsapp_number TEXT,
    
    *-- Calendar Integration*
    google_calendar_connected BOOLEAN DEFAULT false,
    google_calendar_id TEXT,
    google_refresh_token TEXT, *-- Encrypted*
    
    outlook_calendar_connected BOOLEAN DEFAULT false,
    outlook_calendar_id TEXT,
    outlook_refresh_token TEXT, *-- Encrypted*
    
    *-- Business Hours*
    business_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "17:00", "closed": false},
        "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
        "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
        "thursday": {"open": "09:00", "close": "17:00", "closed": false},
        "friday": {"open": "09:00", "close": "17:00", "closed": false},
        "saturday": {"open": "10:00", "close": "16:00", "closed": false},
        "sunday": {"closed": true}
    }'::jsonb,
    
    *-- Auto-responder*
    auto_responder_enabled BOOLEAN DEFAULT false,
    auto_responder_message TEXT,
    out_of_office_enabled BOOLEAN DEFAULT false,
    out_of_office_start DATE,
    out_of_office_end DATE,
    out_of_office_message TEXT,
    
    *-- Client Portal Settings*
    client_portal_enabled BOOLEAN DEFAULT true,
    client_portal_custom_domain TEXT,
    client_portal_template_id UUID,
    client_portal_sections JSONB DEFAULT '{
        "welcome": true,
        "forms": true,
        "timeline": true,
        "documents": true,
        "faqs": true,
        "progress": false
    }'::jsonb,
    
    *-- Email Settings*
    email_signature TEXT,
    email_footer TEXT,
    reply_to_email TEXT,
    
    *-- Timestamps*
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

*-- Indexes*
CREATE INDEX idx_supplier_settings_supplier_id ON supplier_settings(supplier_id);

*-- RLS Policies*
ALTER TABLE supplier_settings ENABLE ROW LEVEL SECURITY;

*-- Only supplier owner can view/edit settings*
CREATE POLICY supplier_settings_owner ON supplier_settings
    FOR ALL USING (
        supplier_id IN (
            SELECT id FROM suppliers WHERE auth_user_id = auth.uid()
        )
    );`

## Table: supplier_billing

### Description

Billing and subscription information for suppliers.

### SQL Definition

sql

`CREATE TABLE supplier_billing (
    *-- Primary Key*
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    *-- Relationship*
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    *-- Stripe Information*
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    stripe_payment_method_id TEXT,
    
    *-- Billing Details*
    billing_email TEXT,
    billing_name TEXT,
    billing_address_line1 TEXT,
    billing_address_line2 TEXT,
    billing_city TEXT,
    billing_state TEXT,
    billing_postcode TEXT,
    billing_country TEXT,
    vat_number TEXT,
    
    *-- Payment History*
    last_payment_date TIMESTAMPTZ,
    last_payment_amount DECIMAL(10,2),
    next_payment_date TIMESTAMPTZ,
    next_payment_amount DECIMAL(10,2),
    
    *-- Usage Tracking*
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    current_clients_count INTEGER DEFAULT 0,
    current_forms_count INTEGER DEFAULT 0,
    current_api_calls INTEGER DEFAULT 0,
    current_storage_mb DECIMAL(10,2) DEFAULT 0,
    
    *-- Credits & Discounts*
    account_credit DECIMAL(10,2) DEFAULT 0,
    discount_percentage INTEGER DEFAULT 0,
    discount_valid_until TIMESTAMPTZ,
    referral_code TEXT UNIQUE,
    
    *-- Timestamps*
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

*-- Indexes*
CREATE INDEX idx_supplier_billing_supplier_id ON supplier_billing(supplier_id);
CREATE INDEX idx_supplier_billing_stripe_customer_id ON supplier_billing(stripe_customer_id);
CREATE INDEX idx_supplier_billing_stripe_subscription_id ON supplier_billing(stripe_subscription_id);

*-- RLS Policies*
ALTER TABLE supplier_billing ENABLE ROW LEVEL SECURITY;

*-- Only supplier owner and admins can view billing*
CREATE POLICY supplier_billing_access ON supplier_billing
    FOR SELECT USING (
        supplier_id IN (
            SELECT supplier_id FROM team_members 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );`

## Helper Functions

### Function: get_supplier_id_for_user

sql

`CREATE OR REPLACE FUNCTION get_supplier_id_for_user(user_id UUID)
RETURNS UUID AS $$
DECLARE
    supplier_id UUID;
BEGIN
    *-- Check if user is a supplier owner*
    SELECT id INTO supplier_id FROM suppliers WHERE auth_user_id = user_id;
    
    IF supplier_id IS NOT NULL THEN
        RETURN supplier_id;
    END IF;
    
    *-- Check if user is a team member*
    SELECT tm.supplier_id INTO supplier_id 
    FROM team_members tm 
    WHERE tm.auth_user_id = user_id AND tm.status = 'active'
    LIMIT 1;
    
    RETURN supplier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`

### Function: check_supplier_limit

sql

`CREATE OR REPLACE FUNCTION check_supplier_limit(
    p_supplier_id UUID,
    p_resource_type TEXT,
    p_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INTEGER;
    v_current INTEGER;
BEGIN
    *-- Get limit based on resource type*
    CASE p_resource_type
        WHEN 'clients' THEN
            SELECT max_clients INTO v_limit FROM suppliers WHERE id = p_supplier_id;
            SELECT COUNT(*) INTO v_current FROM clients WHERE supplier_id = p_supplier_id AND deleted_at IS NULL;
        WHEN 'forms' THEN
            SELECT max_forms INTO v_limit FROM suppliers WHERE id = p_supplier_id;
            SELECT COUNT(*) INTO v_current FROM forms WHERE supplier_id = p_supplier_id AND deleted_at IS NULL;
        WHEN 'team_members' THEN
            SELECT max_team_members INTO v_limit FROM suppliers WHERE id = p_supplier_id;
            SELECT COUNT(*) INTO v_current FROM team_members WHERE supplier_id = p_supplier_id AND status = 'active';
        WHEN 'journeys' THEN
            SELECT max_journeys INTO v_limit FROM suppliers WHERE id = p_supplier_id;
            SELECT COUNT(*) INTO v_current FROM customer_journeys WHERE supplier_id = p_supplier_id AND deleted_at IS NULL;
        ELSE
            RETURN false;
    END CASE;
    
    *-- Check if adding p_count items would exceed limit*
    RETURN (v_current + p_count) <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`

## Triggers

### Trigger: update_supplier_updated_at

sql

`CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_supplier_settings_updated_at
    BEFORE UPDATE ON supplier_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_supplier_billing_updated_at
    BEFORE UPDATE ON supplier_billing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();`

## Migration Notes

### Migration Order

1. Create suppliers table first
2. Create team_members table (depends on suppliers)
3. Create supplier_settings table (depends on suppliers)
4. Create supplier_billing table (depends on suppliers)
5. Create helper functions
6. Create triggers
7. Apply RLS policies

### Rollback Script

sql

- `*- Drop in reverse order*
DROP TRIGGER IF EXISTS update_supplier_billing_updated_at ON supplier_billing;
DROP TRIGGER IF EXISTS update_supplier_settings_updated_at ON supplier_settings;
DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS check_supplier_limit(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_supplier_id_for_user(UUID);
DROP TABLE IF EXISTS supplier_billing CASCADE;
DROP TABLE IF EXISTS supplier_settings CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;`

`## File 3: 03-couples-tables.md

```markdown
# Couples Tables Schema Definition

## Purpose
This document provides the complete SQL schema for all couple-related tables in the WedMe platform. These tables store information about couples planning their weddings and their interactions with suppliers.

## Table: couples

### Description
The main couple account table storing wedding planning information.

### SQL Definition
```sql
CREATE TABLE couples (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Couple Information
    partner1_name TEXT NOT NULL,
    partner1_email TEXT NOT NULL,
    partner1_phone TEXT,
    partner2_name TEXT,
    partner2_email TEXT,
    partner2_phone TEXT,
    
    -- Wedding Details
    wedding_date DATE,
    wedding_time TIME,
    ceremony_venue_name TEXT,
    ceremony_venue_address TEXT,
    ceremony_venue_postcode TEXT,
    reception_venue_name TEXT,
    reception_venue_address TEXT,
    reception_venue_postcode TEXT,
    guest_count_adults INTEGER,
    guest_count_children INTEGER,
    wedding_style TEXT, -- 'traditional', 'modern', 'rustic', 'bohemian', 'formal', 'casual'
    wedding_theme TEXT,
    wedding_colors JSONB, -- Array of color codes
    
    -- Location
    wedding_city TEXT,
    wedding_state TEXT,
    wedding_country TEXT DEFAULT 'GB',
    timezone TEXT DEFAULT 'Europe/London',
    
    -- Budget
    estimated_budget DECIMAL(10,2),
    currency TEXT DEFAULT 'GBP',
    
    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step TEXT,
    signup_source TEXT, -- 'organic', 'supplier_invite', 'referral'
    inviting_supplier_id UUID REFERENCES suppliers(id),
    
    -- Settings
    notification_preferences JSONB DEFAULT '{
        "email": {
            "supplier_updates": true,
            "task_reminders": true,
            "weekly_summary": true
        },
        "sms": {
            "day_before_reminders": true,
            "urgent_only": true
        }
    }'::jsonb,
    
    -- Privacy
    share_core_fields BOOLEAN DEFAULT true,
    share_guest_list BOOLEAN DEFAULT false,
    share_budget BOOLEAN DEFAULT false,
    
    -- Analytics
    connected_suppliers_count INTEGER DEFAULT 0,
    completed_forms_count INTEGER DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    dashboard_visits INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_partner1_email CHECK (partner1_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_partner2_email CHECK (partner2_email IS NULL OR partner2_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_guest_count CHECK (
        (guest_count_adults IS NULL OR guest_count_adults >= 0) AND
        (guest_count_children IS NULL OR guest_count_children >= 0)
    )
);

-- Indexes
CREATE INDEX idx_couples_auth_user_id ON couples(auth_user_id);
CREATE INDEX idx_couples_partner_auth_user_id ON couples(partner_auth_user_id);
CREATE INDEX idx_couples_wedding_date ON couples(wedding_date);
CREATE INDEX idx_couples_inviting_supplier_id ON couples(inviting_supplier_id);
CREATE INDEX idx_couples_created_at ON couples(created_at);
CREATE INDEX idx_couples_deleted_at ON couples(deleted_at) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;

-- Couples can read their own record
CREATE POLICY couples_select_own ON couples
    FOR SELECT USING (
        auth.uid() = auth_user_id OR 
        auth.uid() = partner_auth_user_id
    );

-- Couples can update their own record
CREATE POLICY couples_update_own ON couples
    FOR UPDATE USING (
        auth.uid() = auth_user_id OR 
        auth.uid() = partner_auth_user_id
    );

-- Connected suppliers can view couple data (with privacy settings)
CREATE POLICY couples_select_connected_suppliers ON couples
    FOR SELECT USING (
        id IN (
            SELECT couple_id FROM supplier_couple_connections
            WHERE supplier_id = get_supplier_id_for_user(auth.uid())
            AND status = 'connected'
        )
    );`

## Table: supplier_couple_connections

### Description

Junction table managing the many-to-many relationship between suppliers and couples.

### SQL Definition

sql

`CREATE TABLE supplier_couple_connections (
    *-- Primary Key*
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    *-- Relationships*
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
    
    *-- Connection Details*
    status TEXT DEFAULT 'invited' CHECK (status IN (
        'invited', 'connected', 'disconnected', 'blocked'
    )),
    connection_type TEXT CHECK (connection_type IN (
        'primary', 'secondary', 'consultation', 'referral'
    )),
    service_category TEXT, *-- 'photography', 'venue', etc.*
    
    *-- Invitation Flow*
    invited_by TEXT CHECK (invited_by IN ('supplier', 'couple')),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    connected_at TIMESTAMPTZ,
    invitation_message TEXT,
    invitation_code TEXT UNIQUE,
    
    *-- Permissions (couple controls what supplier can see)*
    permissions JSONB DEFAULT '{
        "view_core_fields": true,
        "view_guest_list": false,
        "view_budget": false,
        "view_other_suppliers": false,
        "send_messages": true
    }'::jsonb,
    
    *-- Service Details*
    service_date DATE, *-- Could differ from wedding date for some services*
    service_confirmed BOOLEAN DEFAULT false,
    service_notes TEXT,
    
    *-- Analytics*
    last_interaction_at TIMESTAMPTZ,
    forms_completed INTEGER DEFAULT 0,
    messages_exchanged INTEGER DEFAULT 0,
    
    *-- Timestamps*
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    
    *-- Constraints*
    CONSTRAINT unique_supplier_couple UNIQUE (supplier_id, couple_id)
);

*-- Indexes*
CREATE INDEX idx_scc_supplier_id ON supplier_couple_connections(supplier_id);
CREATE INDEX idx_scc_couple_id ON supplier_couple_connections(couple_id);
CREATE INDEX idx_scc_status ON supplier_couple_connections(status);
CREATE INDEX idx_scc_invitation_code ON supplier_couple_connections(invitation_code);
CREATE INDEX idx_scc_service_date ON supplier_couple_connections(service_date);

*-- RLS Policies*
ALTER TABLE supplier_couple_connections ENABLE ROW LEVEL SECURITY;

*-- Suppliers can view their connections*
CREATE POLICY scc_supplier_select ON supplier_couple_connections
    FOR SELECT USING (
        supplier_id = get_supplier_id_for_user(auth.uid())
    );

*-- Couples can view their connections*
CREATE POLICY scc_couple_select ON supplier_couple_connections
    FOR SELECT USING (
        couple_id IN (
            SELECT id FROM couples 
            WHERE auth_user_id = auth.uid() 
            OR partner_auth_user_id = auth.uid()
        )
    );

*-- Both can update connection*
CREATE POLICY scc_update ON supplier_couple_connections
    FOR UPDATE USING (
        supplier_id = get_supplier_id_for_user(auth.uid()) OR
        couple_id IN (
            SELECT id FROM couples 
            WHERE auth_user_id = auth.uid() 
            OR partner_auth_user_id = auth.uid()
        )
    );`

## Table: guests

### Description

Guest list management for couples.

### SQL Definition

sql

`CREATE TABLE guests (
    *-- Primary Key*
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    *-- Relationship*
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
    
    *-- Guest Information*
    first_name TEXT NOT NULL,
    last_name TEXT,
    full_name_computed TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN last_name IS NOT NULL THEN first_name || ' ' || last_name
            ELSE first_name
        END
    ) STORED,
    email TEXT,
    phone TEXT,
    
    *-- Grouping*
    household_id UUID, *-- Groups guests by household*
    relationship TEXT, *-- 'family', 'friend', 'work', 'other'*
    side TEXT CHECK (side IN ('partner1', 'partner2', 'both')),
    
    *-- Guest Details*
    guest_type TEXT DEFAULT 'adult' CHECK (guest_type IN ('adult', 'child', 'infant')),
    plus_one_allowed BOOLEAN DEFAULT false,
    plus_one_name TEXT,
    
    *-- RSVP*
    invitation_sent BOOLEAN DEFAULT false,
    invitation_sent_at TIMESTAMPTZ,
    rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN (
        'pending', 'yes', 'no', 'maybe'
    )),
    rsvp_responded_at TIMESTAMPTZ,
    attending_ceremony BOOLEAN,
    attending_reception BOOLEAN,
    
    *-- Dietary & Accessibility*
    dietary_requirements TEXT[],
    dietary_notes TEXT,
    accessibility_needs TEXT,
    
    *-- Meal Selection*
    meal_choice TEXT,
    
    *-- Photo Groups*
    photo_groups TEXT[], *-- Array of group names*
    
    *-- Seating*
    table_number TEXT,
    seat_number TEXT,
    
    *-- Tasks*
    is_helper BOOLEAN DEFAULT false,
    helper_role TEXT, *-- 'usher', 'reader', 'witness', etc.*
    assigned_tasks JSONB,
    
    *-- Notes*
    notes TEXT,
    
    *-- Timestamps*
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

*-- Indexes*
CREATE INDEX idx_guests_couple_id ON guests(couple_id);
CREATE INDEX idx_guests_household_id ON guests(household_id);
CREATE INDEX idx_guests_rsvp_status ON guests(rsvp_status);
CREATE INDEX idx_guests_side ON guests(side);
CREATE INDEX idx_guests_photo_groups ON guests USING GIN(photo_groups);
CREATE INDEX idx_guests_dietary_requirements ON guests USING GIN(dietary_requirements);

*-- RLS Policies*
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

*-- Couples can manage their guests*
CREATE POLICY guests_couple_all ON guests
    FOR ALL USING (
        couple_id IN (
            SELECT id FROM couples 
            WHERE auth_user_id = auth.uid() 
            OR partner_auth_user_id = auth.uid()
        )
    );

*-- Connected suppliers can view guests (if permitted)*
CREATE POLICY guests_supplier_view ON guests
    FOR SELECT USING (
        couple_id IN (
            SELECT couple_id FROM supplier_couple_connections
            WHERE supplier_id = get_supplier_id_for_user(auth.uid())
            AND status = 'connected'
            AND (permissions->>'view_guest_list')::boolean = true
        )
    );`

## Table: wedding_tasks

### Description

Task delegation system for wedding day coordination.

### SQL Definition

sql

`CREATE TABLE wedding_tasks (
    *-- Primary Key*
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    *-- Relationships*
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
    assigned_to_guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    created_by_id UUID, *-- Could be couple or supplier*
    
    *-- Task Details*
    title TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN (
        'setup', 'ceremony', 'reception', 'photos', 'guest_management',
        'supplier_liaison', 'personal_support', 'emergency', 'cleanup'
    )),
    priority TEXT DEFAULT 'normal' CHECK (priority IN (
        'low', 'normal', 'high', 'critical'
    )),
    
    *-- Timing*
    timing_type TEXT CHECK (timing_type IN (
        'specific_time', 'relative_time', 'time_range', 'all_day'
    )),
    specific_time TIME,
    relative_time_reference TEXT, *-- 'ceremony_start', 'reception_start', etc.*
    relative_time_offset INTERVAL, *-- '-30 minutes', '+1 hour'*
    time_range_start TIME,
    time_range_end TIME,
    
    *-- Location*
    location TEXT,
    location_notes TEXT,
    
    *-- Instructions*
    instructions TEXT,
    attachments JSONB, *-- Array of {url, name, type}*
    
    *-- Assignment*
    assigned_at TIMESTAMPTZ,
    assignment_method TEXT CHECK (assignment_method IN (
        'email', 'sms', 'print', 'in_app'
    )),
    assignment_sent_at TIMESTAMPTZ,
    assignment_confirmed_at TIMESTAMPTZ,
    
    *-- Completion*
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'assigned', 'in_progress', 'completed', 'cancelled'
    )),
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    
    *-- Timestamps*
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

*-- Indexes*
CREATE INDEX idx_wedding_tasks_couple_id ON wedding_tasks(couple_id);
CREATE INDEX idx_wedding_tasks_assigned_to ON wedding_tasks(assigned_to_guest_id);
CREATE INDEX idx_wedding_tasks_category ON wedding_tasks(category);
CREATE INDEX idx_wedding_tasks_status ON wedding_tasks(status);
CREATE INDEX idx_wedding_tasks_priority ON wedding_tasks(priority);

*-- RLS Policies*
ALTER TABLE wedding_tasks ENABLE ROW LEVEL SECURITY;

*-- Couples can manage their tasks*
CREATE POLICY wedding_tasks_couple_all ON wedding_tasks
    FOR ALL USING (
        couple_id IN (
            SELECT id FROM couples 
            WHERE auth_user_id = auth.uid() 
            OR partner_auth_user_id = auth.uid()
        )
    );`

## Table: couple_timeline

### Description

Master wedding timeline combining all supplier schedules.

### SQL Definition

sql

`CREATE TABLE couple_timeline (
    *-- Primary Key*
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    *-- Relationships*
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    
    *-- Event Details*
    event_name TEXT NOT NULL,
    event_type TEXT CHECK (event_type IN (
        'preparation', 'ceremony', 'photos', 'cocktail', 'reception',
        'entertainment', 'supplier_arrival', 'supplier_setup', 'transition'
    )),
    
    *-- Timing*
    start_time TIME NOT NULL,
    end_time TIME,
    duration INTERVAL GENERATED ALWAYS AS (
        CASE 
            WHEN end_time IS NOT NULL THEN end_time - start_time
            ELSE NULL
        END
    ) STORED,
    
    *-- Location*
    location TEXT,
    
    *-- Details*
    description TEXT,
    notes_for_couple TEXT,
    notes_for_suppliers TEXT,
    
    *-- Visibility*
    visible_to_guests BOOLEAN DEFAULT false,
    visible_to_suppliers BOOLEAN DEFAULT true,
    visible_to_helpers BOOLEAN DEFAULT true,
    
    *-- Status*
    confirmed BOOLEAN DEFAULT false,
    
    *-- Timestamps*
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);

*-- Indexes*
CREATE INDEX idx_couple_timeline_couple_id ON couple_timeline(couple_id);
CREATE INDEX idx_couple_timeline_supplier_id ON couple_timeline(supplier_id);
CREATE INDEX idx_couple_timeline_start_time ON couple_timeline(start_time);
CREATE INDEX idx_couple_timeline_event_type ON couple_timeline(event_type);

*-- RLS Policies*
ALTER TABLE couple_timeline ENABLE ROW LEVEL SECURITY;

*-- Couples can manage their timeline*
CREATE POLICY couple_timeline_couple_all ON couple_timeline
    FOR ALL USING (
        couple_id IN (
            SELECT id FROM couples 
            WHERE auth_user_id = auth.uid() 
            OR partner_auth_user_id = auth.uid()
        )
    );

*-- Connected suppliers can view/edit their timeline items*
CREATE POLICY couple_timeline_supplier ON couple_timeline
    FOR ALL USING (
        supplier_id = get_supplier_id_for_user(auth.uid()) OR
        couple_id IN (
            SELECT couple_id FROM supplier_couple_connections
            WHERE supplier_id = get_supplier_id_for_user(auth.uid())
            AND status = 'connected'
        )
    );`

## Helper Functions

### Function: get_couple_id_for_user

sql

`CREATE OR REPLACE FUNCTION get_couple_id_for_user(user_id UUID)
RETURNS UUID AS $$
DECLARE
    couple_id UUID;
BEGIN
    SELECT id INTO couple_id 
    FROM couples 
    WHERE auth_user_id = user_id OR partner_auth_user_id = user_id
    LIMIT 1;
    
    RETURN couple_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`

### Function: calculate_wedding_countdown

sql

`CREATE OR REPLACE FUNCTION calculate_wedding_countdown(p_couple_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_wedding_date DATE;
    v_days_until INTEGER;
BEGIN
    SELECT wedding_date INTO v_wedding_date
    FROM couples
    WHERE id = p_couple_id;
    
    IF v_wedding_date IS NULL THEN
        RETURN NULL;
    END IF;
    
    v_days_until := v_wedding_date - CURRENT_DATE;
    RETURN v_days_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`

## Triggers

### Trigger: auto_create_household_id

sql

`CREATE OR REPLACE FUNCTION auto_create_household_id()
RETURNS TRIGGER AS $$
BEGIN
    *-- If no household_id provided, create one*
    IF NEW.household_id IS NULL THEN
        NEW.household_id := gen_random_uuid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guests_auto_household
    BEFORE INSERT ON guests
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_household_id();`

### Trigger: update_connection_counts

sql

`CREATE OR REPLACE FUNCTION update_connection_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'connected' AND NEW.status = 'connected') THEN
        *-- Update couple's connected supplier count*
        UPDATE couples 
        SET connected_suppliers_count = connected_suppliers_count + 1
        WHERE id = NEW.couple_id;
        
        *-- Update supplier's client count*
        UPDATE suppliers
        SET total_clients = total_clients + 1
        WHERE id = NEW.supplier_id;
        
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'connected' AND NEW.status != 'connected' THEN
        *-- Decrease counts*
        UPDATE couples 
        SET connected_suppliers_count = GREATEST(connected_suppliers_count - 1, 0)
        WHERE id = NEW.couple_id;
        
        UPDATE suppliers
        SET total_clients = GREATEST(total_clients - 1, 0)
        WHERE id = NEW.supplier_id;
        
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'connected' THEN
        *-- Decrease counts*
        UPDATE couples 
        SET connected_suppliers_count = GREATEST(connected_suppliers_count - 1, 0)
        WHERE id = OLD.couple_id;
        
        UPDATE suppliers
        SET total_clients = GREATEST(total_clients - 1, 0)
        WHERE id = OLD.supplier_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connection_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON supplier_couple_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_connection_counts();`

## Migration Notes

### Migration Order

1. Create couples table first
2. Create supplier_couple_connections (depends on couples and suppliers)
3. Create guests table (depends on couples)
4. Create wedding_tasks (depends on couples and guests)
5. Create couple_timeline (depends on couples and suppliers)
6. Create helper functions
7. Create triggers
8. Apply RLS policies

### Rollback Script

sql

- `*- Drop in reverse order*
DROP TRIGGER IF EXISTS update_connection_counts_trigger ON supplier_couple_connections;
DROP TRIGGER IF EXISTS guests_auto_household ON guests;
DROP FUNCTION IF EXISTS update_connection_counts();
DROP FUNCTION IF EXISTS auto_create_household_id();
DROP FUNCTION IF EXISTS calculate_wedding_countdown(UUID);
DROP FUNCTION IF EXISTS get_couple_id_for_user(UUID);
DROP TABLE IF EXISTS couple_timeline CASCADE;
DROP TABLE IF EXISTS wedding_tasks CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS supplier_couple_connections CASCADE;
DROP TABLE IF EXISTS couples CASCADE;`

`These three comprehensive documentation files provide Claude Code with all the detailed information needed to:

1. Understand the complete database architecture
2. Create all supplier-related tables with proper schemas, indexes, and RLS policies
3. Create all couple-related tables with their relationships and business logic

Each file is atomic and contains everything needed for that specific section, including SQL definitions, helper functions, triggers, and migration instructions. The documentation is written for a non-developer audience but contains all the technical details Claude Code needs to implement the system correctly.`