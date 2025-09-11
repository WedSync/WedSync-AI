# WS-300: Database Implementation - Suppliers Tables - Technical Specification

## Feature Overview
**Feature ID:** WS-300  
**Feature Name:** Database Implementation - Suppliers Tables  
**Feature Type:** Technical Architecture  
**Priority:** P0 - Critical (Platform Foundation)  
**Estimated Effort:** 3 person-weeks  

## User Stories

### Primary User Stories

#### US-300-001: Wedding Photography Business Account Creation
**As a** professional wedding photographer signing up for WedSync  
**I want my** business information stored securely with proper subscription limits  
**So that I can** start managing clients within my plan's capabilities

**Acceptance Criteria:**
- My business profile is created with all essential details (name, type, contact info)
- Subscription tier determines my client, form, and team member limits
- Trial period starts automatically with 30-day expiration
- All business data is isolated from other suppliers
- My account settings can be updated independently

**Example Scenario:**
Sarah's Photography registers for WedSync Professional tier, entering business name, photography category, phone, website, and Instagram handle. Her account is configured with 50 client limit, 10 forms limit, and 3 team members. She gets 30-day trial access to all Professional features while subscription billing is set up.

#### US-300-002: Multi-Team Wedding Venue Management
**As a** wedding venue owner with multiple staff members  
**I want to** add team members with different permission levels  
**So that** my coordinators and managers can help without accessing sensitive billing data

**Acceptance Criteria:**
- I can invite team members via email with specific roles (admin, manager, member, viewer)
- Each role has predefined permissions for clients, forms, journeys, and analytics
- Team members receive invitation emails and must accept to join
- I can suspend or remove team members at any time
- Team member activities are tracked for accountability

**Example Scenario:**
Grand Ballroom venue owner invites 3 coordinators as "managers" who can create/edit client records and forms, 1 admin who can access analytics, and 2 part-time staff as "viewers" who can only see client information. Each receives role-appropriate dashboard access without billing permissions.

#### US-300-003: Wedding Planner Business Settings Management
**As a** wedding planning business with seasonal operations  
**I want to** configure my business hours, communication preferences, and integrations  
**So that** clients receive appropriate service based on my availability and workflows

**Acceptance Criteria:**
- Business hours can be set for each day of the week with closed days
- Auto-responder messages can be scheduled for out-of-office periods
- Communication preferences control email, SMS, and in-app notifications
- API integrations can be configured for OpenAI, Twilio, and calendar services
- Client portal can be customized with my branding and available sections

**Example Scenario:**
Elite Wedding Planners sets business hours as Mon-Fri 9AM-6PM, Saturday 10AM-4PM, and closed Sundays. They configure auto-responder for December holidays, enable SMS alerts for urgent matters only, integrate Google Calendar for scheduling, and customize client portal with their logo and brand colors.

#### US-300-004: Wedding Vendor Subscription Compliance
**As a** wedding supplier with varying business needs throughout the year  
**I want my** subscription plan to enforce proper limits while allowing upgrades  
**So that I can** scale my usage appropriately without unexpected service interruptions

**Acceptance Criteria:**
- System prevents exceeding client, form, and team member limits based on tier
- Clear warnings appear when approaching limits with upgrade options
- Billing information is securely stored with proper validation
- Usage tracking shows current consumption against limits
- Downgrade/upgrade changes take effect at next billing cycle

**Example Scenario:**
DJ Mike starts on Starter plan (10 clients max) but books 12 weddings for summer season. System prevents adding 11th client and shows upgrade prompt to Professional (50 clients). After upgrade, all features unlock immediately while billing adjusts at next cycle. Usage dashboard shows 12/50 clients used.

## Database Schema Implementation

### Core Suppliers Table

```sql
-- Migration: 20250120000001_create_suppliers_tables.sql

-- Core suppliers table with comprehensive business information
CREATE TABLE IF NOT EXISTS suppliers (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication Link
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
    
    -- Business Address
    address_line1 TEXT,
    address_line2 TEXT,
    address_city TEXT,
    address_state TEXT,
    address_postcode TEXT,
    address_country TEXT DEFAULT 'GB',
    
    -- Subscription Management
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN (
        'free', 'starter', 'professional', 'scale', 'enterprise'
    )),
    subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN (
        'trialing', 'active', 'past_due', 'canceled', 'paused'
    )),
    trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    subscription_ends_at TIMESTAMPTZ,
    
    -- Plan Limits (based on subscription tier)
    max_clients INTEGER DEFAULT 10,
    max_forms INTEGER DEFAULT 1,
    max_team_members INTEGER DEFAULT 1,
    max_journeys INTEGER DEFAULT 0,
    
    -- Feature Flags (JSONB for flexibility)
    features JSONB DEFAULT '{
        "forms": true,
        "core_fields": false,
        "email_automation": false,
        "sms_whatsapp": false,
        "ai_features": false,
        "analytics": false,
        "white_label": false,
        "api_access": false,
        "real_time": true,
        "custom_branding": false,
        "priority_support": false
    }'::jsonb,
    
    -- Onboarding & Growth Tracking
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step TEXT DEFAULT 'business_info',
    signup_source TEXT, -- 'organic', 'couple_invite', 'referral', 'ad_campaign'
    referrer_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    referral_code TEXT UNIQUE,
    
    -- Localization & Preferences  
    timezone TEXT DEFAULT 'Europe/London',
    currency TEXT DEFAULT 'GBP',
    language TEXT DEFAULT 'en',
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    time_format TEXT DEFAULT '24h',
    
    -- Communication Preferences
    notification_preferences JSONB DEFAULT '{
        "email": {
            "new_client": true,
            "form_response": true,
            "payment_received": true,
            "weekly_summary": true,
            "marketing_updates": false,
            "feature_announcements": true
        },
        "sms": {
            "urgent_only": true,
            "wedding_day_alerts": true,
            "payment_failures": true
        },
        "in_app": {
            "all_notifications": true,
            "push_notifications": true,
            "desktop_notifications": false
        }
    }'::jsonb,
    
    -- Branding & Customization
    logo_url TEXT,
    brand_color_primary TEXT DEFAULT '#6366f1',
    brand_color_secondary TEXT DEFAULT '#e5e7eb',
    custom_domain TEXT,
    
    -- Analytics & Performance Tracking
    total_clients INTEGER DEFAULT 0,
    total_forms_created INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    total_revenue_processed DECIMAL(10,2) DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Account Status & Security
    account_locked BOOLEAN DEFAULT false,
    account_locked_reason TEXT,
    account_locked_until TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    last_password_change_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    
    -- Data Integrity Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (business_phone IS NULL OR business_phone ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_postcode CHECK (address_postcode IS NULL OR length(address_postcode) BETWEEN 3 AND 10),
    CONSTRAINT valid_trial_period CHECK (trial_ends_at > created_at),
    CONSTRAINT positive_limits CHECK (
        max_clients >= 0 AND 
        max_forms >= 0 AND 
        max_team_members >= 0 AND 
        max_journeys >= 0
    ),
    CONSTRAINT valid_brand_colors CHECK (
        brand_color_primary IS NULL OR brand_color_primary ~ '^#[0-9a-fA-F]{6}$'
    )
);

-- Comprehensive indexing strategy for suppliers table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_auth_user_id ON suppliers(auth_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_business_type ON suppliers(business_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_subscription_tier ON suppliers(subscription_tier);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_subscription_status ON suppliers(subscription_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_trial_ends_at ON suppliers(trial_ends_at) WHERE trial_ends_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_last_login ON suppliers(last_login_at) WHERE last_login_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_referrer_id ON suppliers(referrer_id) WHERE referrer_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_active ON suppliers(id) WHERE deleted_at IS NULL;

-- JSONB indexes for efficient feature queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_features_gin ON suppliers USING GIN(features);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_notifications_gin ON suppliers USING GIN(notification_preferences);

-- Partial indexes for specific business needs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_locked ON suppliers(id) WHERE account_locked = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_trial_expiring ON suppliers(id) 
    WHERE subscription_status = 'trialing' AND trial_ends_at < (NOW() + INTERVAL '7 days');
```

### Team Members Table

```sql
-- Team members with role-based access control
CREATE TABLE IF NOT EXISTS team_members (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Member Information
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    job_title TEXT,
    department TEXT,
    
    -- Access Control
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN (
        'owner', 'admin', 'manager', 'member', 'viewer'
    )),
    
    -- Detailed permissions matrix
    permissions JSONB DEFAULT '{
        "clients": {
            "view": true,
            "create": false,
            "edit": false,
            "delete": false,
            "export": false
        },
        "forms": {
            "view": true,
            "create": false,
            "edit": false,
            "delete": false,
            "publish": false
        },
        "journeys": {
            "view": true,
            "create": false,
            "edit": false,
            "delete": false,
            "execute": false
        },
        "analytics": {
            "view": false,
            "export": false
        },
        "billing": {
            "view": false,
            "manage": false
        },
        "team": {
            "view": true,
            "invite": false,
            "manage": false,
            "remove": false
        },
        "settings": {
            "view": false,
            "edit": false
        },
        "integrations": {
            "view": false,
            "manage": false
        }
    }'::jsonb,
    
    -- Status & Invitation Flow
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'active', 'suspended', 'removed'
    )),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    invitation_code TEXT UNIQUE,
    invitation_expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    accepted_at TIMESTAMPTZ,
    first_login_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    
    -- Access Tracking
    login_count INTEGER DEFAULT 0,
    last_login_ip INET,
    session_count INTEGER DEFAULT 0,
    
    -- Notification Preferences
    notification_preferences JSONB DEFAULT '{
        "email": {
            "client_updates": true,
            "form_responses": true,
            "team_activity": false,
            "weekly_summary": true
        },
        "in_app": {
            "all_notifications": true,
            "mentions": true,
            "assignments": true
        }
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_team_member_email UNIQUE (supplier_id, email),
    CONSTRAINT valid_team_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_invitation_expiry CHECK (invitation_expires_at > invited_at),
    CONSTRAINT accepted_before_expiry CHECK (
        accepted_at IS NULL OR accepted_at <= invitation_expires_at
    )
);

-- Team members indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_supplier_id ON team_members(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_auth_user_id ON team_members(auth_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_invitation_code ON team_members(invitation_code);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_active ON team_members(supplier_id, status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_pending ON team_members(id) WHERE status = 'pending';

-- JSONB indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_permissions_gin ON team_members USING GIN(permissions);
```

### Supplier Settings Table

```sql
-- Extended settings and configuration for suppliers
CREATE TABLE IF NOT EXISTS supplier_settings (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationship (one-to-one with suppliers)
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- API Keys & Integrations (encrypted values)
    openai_api_key TEXT, -- Encrypted using pgcrypto
    openai_api_key_added_at TIMESTAMPTZ,
    openai_monthly_budget DECIMAL(10,2) DEFAULT 50.00,
    openai_current_usage DECIMAL(10,2) DEFAULT 0.00,
    openai_usage_reset_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
    
    -- Communication Services
    twilio_account_sid TEXT,
    twilio_auth_token TEXT, -- Encrypted
    twilio_phone_number TEXT,
    twilio_whatsapp_number TEXT,
    twilio_webhook_url TEXT,
    
    resend_api_key TEXT, -- Encrypted
    resend_domain_verified BOOLEAN DEFAULT false,
    
    -- Calendar Integrations
    google_calendar_connected BOOLEAN DEFAULT false,
    google_calendar_id TEXT,
    google_refresh_token TEXT, -- Encrypted
    google_calendar_sync_enabled BOOLEAN DEFAULT false,
    google_last_sync_at TIMESTAMPTZ,
    
    outlook_calendar_connected BOOLEAN DEFAULT false,
    outlook_calendar_id TEXT,
    outlook_refresh_token TEXT, -- Encrypted
    outlook_calendar_sync_enabled BOOLEAN DEFAULT false,
    outlook_last_sync_at TIMESTAMPTZ,
    
    -- Business Operations
    business_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "17:00", "closed": false},
        "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
        "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
        "thursday": {"open": "09:00", "close": "17:00", "closed": false},
        "friday": {"open": "09:00", "close": "17:00", "closed": false},
        "saturday": {"open": "10:00", "close": "16:00", "closed": false},
        "sunday": {"closed": true}
    }'::jsonb,
    
    -- Auto-responder Configuration
    auto_responder_enabled BOOLEAN DEFAULT false,
    auto_responder_message TEXT DEFAULT 'Thank you for your inquiry. We''ll respond within 24 hours.',
    auto_responder_trigger_hours INTEGER DEFAULT 2, -- Send if no response after N hours
    
    out_of_office_enabled BOOLEAN DEFAULT false,
    out_of_office_start DATE,
    out_of_office_end DATE,
    out_of_office_message TEXT DEFAULT 'We are currently out of office and will respond when we return.',
    
    -- Client Portal Customization
    client_portal_enabled BOOLEAN DEFAULT true,
    client_portal_custom_domain TEXT,
    client_portal_template_id UUID, -- References to template system
    client_portal_welcome_message TEXT,
    client_portal_sections JSONB DEFAULT '{
        "welcome": true,
        "forms": true,
        "timeline": true,
        "documents": true,
        "faqs": true,
        "progress": false,
        "gallery": false,
        "messaging": true,
        "payments": false
    }'::jsonb,
    
    -- Email Configuration
    email_signature TEXT,
    email_footer TEXT,
    reply_to_email TEXT,
    bcc_all_emails BOOLEAN DEFAULT false,
    email_tracking_enabled BOOLEAN DEFAULT true,
    
    -- Security Settings
    two_factor_enabled BOOLEAN DEFAULT false,
    login_ip_whitelist TEXT[], -- Array of allowed IP addresses
    session_timeout_minutes INTEGER DEFAULT 480, -- 8 hours
    
    -- Data & Privacy
    data_retention_months INTEGER DEFAULT 84, -- 7 years
    gdpr_compliance_enabled BOOLEAN DEFAULT true,
    cookie_consent_required BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Supplier settings indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_settings_supplier_id ON supplier_settings(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_settings_portal_domain ON supplier_settings(client_portal_custom_domain) 
    WHERE client_portal_custom_domain IS NOT NULL;

-- JSONB indexes for complex queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_settings_hours_gin ON supplier_settings USING GIN(business_hours);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_settings_portal_gin ON supplier_settings USING GIN(client_portal_sections);
```

### Supplier Billing Table

```sql
-- Billing and payment information for suppliers
CREATE TABLE IF NOT EXISTS supplier_billing (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationship (one-to-one with suppliers)
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Payment Provider Integration
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    stripe_payment_method_id TEXT,
    stripe_setup_intent_id TEXT,
    
    -- Billing Contact Information
    billing_email TEXT,
    billing_name TEXT,
    billing_company_name TEXT,
    billing_address_line1 TEXT,
    billing_address_line2 TEXT,
    billing_city TEXT,
    billing_state TEXT,
    billing_postcode TEXT,
    billing_country TEXT DEFAULT 'GB',
    vat_number TEXT,
    vat_rate DECIMAL(5,2) DEFAULT 20.00, -- UK VAT rate
    
    -- Payment History & Status
    last_payment_date TIMESTAMPTZ,
    last_payment_amount DECIMAL(10,2),
    last_payment_status TEXT CHECK (last_payment_status IN (
        'succeeded', 'failed', 'pending', 'canceled', 'requires_action'
    )),
    next_payment_date TIMESTAMPTZ,
    next_payment_amount DECIMAL(10,2),
    failed_payment_attempts INTEGER DEFAULT 0,
    
    -- Billing Cycle & Usage
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    
    -- Current Usage Tracking
    current_clients_count INTEGER DEFAULT 0,
    current_forms_count INTEGER DEFAULT 0,
    current_team_members_count INTEGER DEFAULT 0,
    current_api_calls INTEGER DEFAULT 0,
    current_storage_mb DECIMAL(10,2) DEFAULT 0,
    current_email_sends INTEGER DEFAULT 0,
    current_sms_sends INTEGER DEFAULT 0,
    
    -- Credits & Discounts
    account_credit DECIMAL(10,2) DEFAULT 0,
    lifetime_value DECIMAL(10,2) DEFAULT 0,
    
    -- Discount Management
    discount_code TEXT,
    discount_percentage INTEGER DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_valid_until TIMESTAMPTZ,
    
    -- Referral Program
    referral_code TEXT UNIQUE,
    referred_customers_count INTEGER DEFAULT 0,
    referral_commission_earned DECIMAL(10,2) DEFAULT 0,
    referral_commission_paid DECIMAL(10,2) DEFAULT 0,
    
    -- Invoice Management
    next_invoice_number INTEGER DEFAULT 1,
    invoice_prefix TEXT DEFAULT 'INV',
    invoice_notes TEXT,
    
    -- Tax Configuration
    tax_exempt BOOLEAN DEFAULT false,
    tax_exempt_reason TEXT,
    tax_id TEXT, -- Business tax ID
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_billing_email CHECK (
        billing_email IS NULL OR 
        billing_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT valid_vat_rate CHECK (vat_rate >= 0 AND vat_rate <= 100),
    CONSTRAINT positive_amounts CHECK (
        (last_payment_amount IS NULL OR last_payment_amount >= 0) AND
        (next_payment_amount IS NULL OR next_payment_amount >= 0) AND
        account_credit >= 0 AND
        lifetime_value >= 0
    ),
    CONSTRAINT valid_discount CHECK (
        discount_percentage BETWEEN 0 AND 100 AND
        (discount_amount IS NULL OR discount_amount >= 0)
    )
);

-- Supplier billing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_billing_supplier_id ON supplier_billing(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_billing_stripe_customer ON supplier_billing(stripe_customer_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_billing_stripe_subscription ON supplier_billing(stripe_subscription_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_billing_next_payment ON supplier_billing(next_payment_date) 
    WHERE next_payment_date IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_billing_referral_code ON supplier_billing(referral_code) 
    WHERE referral_code IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_billing_failed_payments ON supplier_billing(id) 
    WHERE failed_payment_attempts > 0;
```

## Row Level Security (RLS) Policies

### Comprehensive Security Implementation

```sql
-- Enable RLS on all supplier-related tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_billing ENABLE ROW LEVEL SECURITY;

-- Suppliers table policies
CREATE POLICY "Suppliers can view own record" ON suppliers
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Suppliers can update own record" ON suppliers
    FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "System can insert new suppliers" ON suppliers
    FOR INSERT WITH CHECK (true);

-- Team members can view their supplier's record
CREATE POLICY "Team members can view supplier" ON suppliers
    FOR SELECT USING (
        id IN (
            SELECT supplier_id 
            FROM team_members 
            WHERE auth_user_id = auth.uid() 
            AND status = 'active'
        )
    );

-- Team members table policies
CREATE POLICY "Team members can view their team" ON team_members
    FOR SELECT USING (
        supplier_id IN (
            SELECT COALESCE(
                -- If user is supplier owner
                (SELECT id FROM suppliers WHERE auth_user_id = auth.uid()),
                -- If user is team member
                (SELECT supplier_id FROM team_members WHERE auth_user_id = auth.uid() AND status = 'active')
            )
        )
    );

CREATE POLICY "Owners and admins can manage team" ON team_members
    FOR ALL USING (
        supplier_id IN (
            SELECT supplier_id 
            FROM team_members 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND status = 'active'
        ) OR
        supplier_id IN (
            SELECT id 
            FROM suppliers 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Individual team members can update their own record
CREATE POLICY "Team members can update own record" ON team_members
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Supplier settings policies
CREATE POLICY "Owners can manage settings" ON supplier_settings
    FOR ALL USING (
        supplier_id IN (
            SELECT id 
            FROM suppliers 
            WHERE auth_user_id = auth.uid()
        ) OR
        supplier_id IN (
            SELECT supplier_id 
            FROM team_members 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND status = 'active'
        )
    );

-- Supplier billing policies (most restrictive - owners and admins only)
CREATE POLICY "Billing access restricted to owners and financial admins" ON supplier_billing
    FOR SELECT USING (
        supplier_id IN (
            SELECT id 
            FROM suppliers 
            WHERE auth_user_id = auth.uid()
        ) OR
        supplier_id IN (
            SELECT supplier_id 
            FROM team_members 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND status = 'active'
            AND (permissions->>'billing'->>'view')::boolean = true
        )
    );

CREATE POLICY "Billing updates restricted to owners" ON supplier_billing
    FOR UPDATE USING (
        supplier_id IN (
            SELECT id 
            FROM suppliers 
            WHERE auth_user_id = auth.uid()
        ) OR
        supplier_id IN (
            SELECT supplier_id 
            FROM team_members 
            WHERE auth_user_id = auth.uid() 
            AND role = 'owner' 
            AND status = 'active'
            AND (permissions->>'billing'->>'manage')::boolean = true
        )
    );
```

## Helper Functions

### Business Logic Functions

```sql
-- Get supplier ID for current authenticated user
CREATE OR REPLACE FUNCTION get_supplier_id_for_user(user_id UUID)
RETURNS UUID AS $$
DECLARE
    supplier_id UUID;
BEGIN
    -- Check if user is a supplier owner
    SELECT id INTO supplier_id 
    FROM suppliers 
    WHERE auth_user_id = user_id 
    AND deleted_at IS NULL;
    
    IF supplier_id IS NOT NULL THEN
        RETURN supplier_id;
    END IF;
    
    -- Check if user is a team member
    SELECT tm.supplier_id INTO supplier_id 
    FROM team_members tm 
    WHERE tm.auth_user_id = user_id 
    AND tm.status = 'active'
    LIMIT 1;
    
    RETURN supplier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_resource TEXT,
    p_action TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    supplier_id UUID;
    user_permissions JSONB;
    is_owner BOOLEAN := false;
BEGIN
    -- Get supplier context
    supplier_id := get_supplier_id_for_user(p_user_id);
    
    IF supplier_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user is supplier owner
    SELECT EXISTS(
        SELECT 1 FROM suppliers 
        WHERE id = supplier_id AND auth_user_id = p_user_id
    ) INTO is_owner;
    
    -- Owners have all permissions
    IF is_owner THEN
        RETURN true;
    END IF;
    
    -- Check team member permissions
    SELECT permissions INTO user_permissions
    FROM team_members
    WHERE auth_user_id = p_user_id
    AND supplier_id = supplier_id
    AND status = 'active';
    
    IF user_permissions IS NULL THEN
        RETURN false;
    END IF;
    
    -- Extract specific permission
    RETURN COALESCE(
        (user_permissions -> p_resource ->> p_action)::boolean,
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check supplier subscription limits
CREATE OR REPLACE FUNCTION check_supplier_limit(
    p_supplier_id UUID,
    p_resource_type TEXT,
    p_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INTEGER;
    v_current INTEGER;
    v_subscription_status TEXT;
BEGIN
    -- Get subscription status and limits
    SELECT subscription_status INTO v_subscription_status
    FROM suppliers 
    WHERE id = p_supplier_id;
    
    -- Always allow for active/trialing subscriptions
    IF v_subscription_status NOT IN ('active', 'trialing') THEN
        RETURN false;
    END IF;
    
    -- Get limit and current usage based on resource type
    CASE p_resource_type
        WHEN 'clients' THEN
            SELECT max_clients, total_clients 
            INTO v_limit, v_current 
            FROM suppliers 
            WHERE id = p_supplier_id;
            
        WHEN 'forms' THEN
            SELECT max_forms INTO v_limit 
            FROM suppliers 
            WHERE id = p_supplier_id;
            
            SELECT COUNT(*) INTO v_current 
            FROM forms 
            WHERE supplier_id = p_supplier_id 
            AND deleted_at IS NULL;
            
        WHEN 'team_members' THEN
            SELECT max_team_members INTO v_limit 
            FROM suppliers 
            WHERE id = p_supplier_id;
            
            SELECT COUNT(*) INTO v_current 
            FROM team_members 
            WHERE supplier_id = p_supplier_id 
            AND status = 'active';
            
        WHEN 'journeys' THEN
            SELECT max_journeys INTO v_limit 
            FROM suppliers 
            WHERE id = p_supplier_id;
            
            SELECT COUNT(*) INTO v_current 
            FROM customer_journeys 
            WHERE supplier_id = p_supplier_id 
            AND deleted_at IS NULL;
            
        ELSE
            RETURN false;
    END CASE;
    
    -- Check if adding p_count items would exceed limit
    RETURN (v_current + p_count) <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update supplier usage statistics
CREATE OR REPLACE FUNCTION update_supplier_stats(
    p_supplier_id UUID,
    p_stat_type TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    CASE p_stat_type
        WHEN 'total_clients' THEN
            UPDATE suppliers 
            SET total_clients = total_clients + p_increment,
                updated_at = NOW()
            WHERE id = p_supplier_id;
            
        WHEN 'total_forms_created' THEN
            UPDATE suppliers 
            SET total_forms_created = total_forms_created + p_increment,
                updated_at = NOW()
            WHERE id = p_supplier_id;
            
        WHEN 'total_responses' THEN
            UPDATE suppliers 
            SET total_responses = total_responses + p_increment,
                updated_at = NOW()
            WHERE id = p_supplier_id;
            
        WHEN 'last_login' THEN
            UPDATE suppliers 
            SET last_login_at = NOW(),
                last_activity_at = NOW(),
                updated_at = NOW()
            WHERE id = p_supplier_id;
            
        ELSE
            -- Invalid stat type, do nothing
            NULL;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(p_supplier_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_business_name TEXT;
    v_exists BOOLEAN;
    v_counter INTEGER := 1;
BEGIN
    -- Get business name for code base
    SELECT business_name INTO v_business_name
    FROM suppliers
    WHERE id = p_supplier_id;
    
    -- Create base code from business name
    v_code := UPPER(
        REGEXP_REPLACE(
            LEFT(v_business_name, 8), 
            '[^A-Z0-9]', 
            '', 
            'g'
        )
    );
    
    -- Ensure minimum length
    IF LENGTH(v_code) < 4 THEN
        v_code := v_code || SUBSTR(MD5(p_supplier_id::TEXT), 1, 4);
    END IF;
    
    -- Check for uniqueness and append counter if needed
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM suppliers 
            WHERE referral_code = v_code
        ) INTO v_exists;
        
        EXIT WHEN NOT v_exists;
        
        v_code := LEFT(v_code, 6) || v_counter::TEXT;
        v_counter := v_counter + 1;
    END LOOP;
    
    -- Update supplier with new referral code
    UPDATE suppliers 
    SET referral_code = v_code
    WHERE id = p_supplier_id;
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Database Triggers

### Automated Business Logic

```sql
-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp trigger to all tables
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
    EXECUTE FUNCTION update_updated_at();

-- Auto-create referral code for new suppliers
CREATE OR REPLACE FUNCTION auto_create_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate referral code if not provided
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER suppliers_auto_referral_code
    BEFORE INSERT ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_referral_code();

-- Auto-create supplier settings record
CREATE OR REPLACE FUNCTION auto_create_supplier_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO supplier_settings (supplier_id)
    VALUES (NEW.id);
    
    INSERT INTO supplier_billing (supplier_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER suppliers_auto_create_settings
    AFTER INSERT ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_supplier_settings();

-- Update team member invitation expiry
CREATE OR REPLACE FUNCTION set_invitation_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invitation_expires_at IS NULL THEN
        NEW.invitation_expires_at := NEW.invited_at + INTERVAL '7 days';
    END IF;
    
    -- Generate invitation code if not provided
    IF NEW.invitation_code IS NULL THEN
        NEW.invitation_code := ENCODE(GEN_RANDOM_BYTES(16), 'hex');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_members_set_invitation_expiry
    BEFORE INSERT ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION set_invitation_expiry();
```

## API Endpoints

### Suppliers Management API

```typescript
// GET /api/suppliers/profile
interface SupplierProfileResponse {
  supplier: {
    id: string;
    business_name: string;
    business_type: string;
    email: string;
    phone: string;
    website?: string;
    instagram?: string;
    subscription_tier: string;
    subscription_status: string;
    trial_ends_at?: string;
    features: Record<string, boolean>;
    limits: {
      max_clients: number;
      max_forms: number;
      max_team_members: number;
      max_journeys: number;
    };
    usage: {
      total_clients: number;
      total_forms_created: number;
      total_responses: number;
    };
    branding: {
      logo_url?: string;
      brand_color_primary: string;
      brand_color_secondary: string;
    };
  };
}

// PUT /api/suppliers/profile
interface UpdateSupplierRequest {
  business_name?: string;
  business_description?: string;
  business_phone?: string;
  business_website?: string;
  business_instagram?: string;
  business_facebook?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  timezone?: string;
  currency?: string;
  notification_preferences?: Record<string, any>;
  branding?: {
    logo_url?: string;
    brand_color_primary?: string;
    brand_color_secondary?: string;
  };
}

// GET /api/suppliers/team
interface TeamMembersResponse {
  team_members: Array<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    status: string;
    permissions: Record<string, any>;
    last_active_at?: string;
    invited_at: string;
    accepted_at?: string;
  }>;
  total_count: number;
  active_count: number;
}

// POST /api/suppliers/team/invite
interface InviteTeamMemberRequest {
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  permissions?: Record<string, any>;
  job_title?: string;
  department?: string;
}

interface InviteTeamMemberResponse {
  success: boolean;
  team_member: {
    id: string;
    email: string;
    role: string;
    status: 'pending';
    invitation_code: string;
    invitation_expires_at: string;
  };
  invitation_sent: boolean;
}

// GET /api/suppliers/settings
interface SupplierSettingsResponse {
  settings: {
    business_hours: Record<string, any>;
    auto_responder_enabled: boolean;
    auto_responder_message?: string;
    out_of_office_enabled: boolean;
    out_of_office_start?: string;
    out_of_office_end?: string;
    out_of_office_message?: string;
    client_portal_enabled: boolean;
    client_portal_sections: Record<string, boolean>;
    email_signature?: string;
    integrations: {
      openai_connected: boolean;
      google_calendar_connected: boolean;
      outlook_calendar_connected: boolean;
      twilio_connected: boolean;
    };
  };
}

// PUT /api/suppliers/settings
interface UpdateSettingsRequest {
  business_hours?: Record<string, any>;
  auto_responder_enabled?: boolean;
  auto_responder_message?: string;
  out_of_office_enabled?: boolean;
  out_of_office_start?: string;
  out_of_office_end?: string;
  client_portal_enabled?: boolean;
  client_portal_sections?: Record<string, boolean>;
  email_signature?: string;
}

// GET /api/suppliers/billing
interface SupplierBillingResponse {
  billing: {
    subscription_tier: string;
    subscription_status: string;
    billing_cycle: string;
    next_payment_date?: string;
    next_payment_amount?: number;
    current_period_end?: string;
    usage: {
      clients: { current: number; limit: number };
      forms: { current: number; limit: number };
      team_members: { current: number; limit: number };
      storage_mb: number;
    };
    payment_method: {
      type: string;
      last4?: string;
      expires?: string;
    };
    billing_address: {
      name?: string;
      line1?: string;
      city?: string;
      country?: string;
    };
  };
}

// POST /api/suppliers/subscription/upgrade
interface UpgradeSubscriptionRequest {
  new_tier: 'starter' | 'professional' | 'scale' | 'enterprise';
  billing_cycle: 'monthly' | 'annual';
  payment_method_id?: string;
}
```

## MCP Server Usage

### Required MCP Servers

1. **PostgreSQL MCP** - Database operations
   - Table creation and schema management
   - Complex queries with joins across supplier tables
   - Performance monitoring for supplier-specific queries
   - Index optimization for supplier business types and subscription tiers

2. **Supabase MCP** - Platform integration
   - Row Level Security policy implementation
   - Real-time subscriptions for team member updates
   - Authentication integration with supplier accounts
   - Migration management for supplier schema changes

### Implementation Priority

**Phase 1 (Week 1): Core Tables & Security**
- Create suppliers, team_members, and settings tables
- Implement Row Level Security policies
- Set up authentication integration
- Basic CRUD operations and validation

**Phase 2 (Week 2): Business Logic & Permissions**
- Implement subscription limit checking
- Team member invitation system
- Permission matrix and role-based access
- Usage tracking and statistics

**Phase 3 (Week 3): Advanced Features & Integration**
- Billing system integration
- Settings management and customization
- API key encryption and management
- Performance optimization and monitoring

## Test Requirements

### Unit Tests

```typescript
// __tests__/database/suppliers-table.test.ts
describe('Suppliers Table', () => {
  test('creates supplier with proper defaults', async () => {
    const supplierData = {
      email: 'test@photography.com',
      business_name: 'Test Photography',
      business_type: 'photographer'
    };

    const supplier = await createSupplier(supplierData);

    expect(supplier.subscription_tier).toBe('free');
    expect(supplier.max_clients).toBe(10);
    expect(supplier.features.forms).toBe(true);
    expect(supplier.referral_code).toBeTruthy();
    expect(supplier.trial_ends_at).toBeTruthy();
  });

  test('enforces subscription limits', async () => {
    const supplier = await createTestSupplier({ max_clients: 2 });
    
    // Should allow within limit
    expect(await checkSupplierLimit(supplier.id, 'clients', 1)).toBe(true);
    expect(await checkSupplierLimit(supplier.id, 'clients', 2)).toBe(true);
    
    // Should deny over limit
    expect(await checkSupplierLimit(supplier.id, 'clients', 3)).toBe(false);
  });

  test('validates business data constraints', async () => {
    // Invalid email should fail
    await expect(createSupplier({
      email: 'invalid-email',
      business_name: 'Test',
      business_type: 'photographer'
    })).rejects.toThrow();

    // Invalid business type should fail
    await expect(createSupplier({
      email: 'test@example.com',
      business_name: 'Test',
      business_type: 'invalid_type'
    })).rejects.toThrow();
  });
});

// __tests__/database/team-members.test.ts
describe('Team Members Table', () => {
  test('creates team member with invitation', async () => {
    const supplier = await createTestSupplier();
    
    const teamMember = await inviteTeamMember(supplier.id, {
      email: 'member@example.com',
      full_name: 'John Doe',
      role: 'manager'
    });

    expect(teamMember.status).toBe('pending');
    expect(teamMember.invitation_code).toBeTruthy();
    expect(teamMember.invitation_expires_at).toBeTruthy();
    expect(teamMember.permissions.clients.view).toBe(true);
  });

  test('enforces unique email per supplier', async () => {
    const supplier = await createTestSupplier();
    
    await inviteTeamMember(supplier.id, {
      email: 'same@example.com',
      full_name: 'First User',
      role: 'member'
    });

    // Second invite with same email should fail
    await expect(inviteTeamMember(supplier.id, {
      email: 'same@example.com',
      full_name: 'Second User',
      role: 'admin'
    })).rejects.toThrow();
  });

  test('permission checking works correctly', async () => {
    const supplier = await createTestSupplier();
    const member = await createTeamMember(supplier.id, {
      role: 'viewer',
      permissions: {
        clients: { view: true, create: false }
      }
    });

    expect(await userHasPermission(member.auth_user_id, 'clients', 'view')).toBe(true);
    expect(await userHasPermission(member.auth_user_id, 'clients', 'create')).toBe(false);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/supplier-lifecycle.test.ts
describe('Supplier Lifecycle', () => {
  test('complete supplier registration flow', async () => {
    // 1. Create supplier account
    const supplier = await registerSupplier({
      email: 'newbusiness@example.com',
      business_name: 'New Photography Business',
      business_type: 'photographer'
    });

    expect(supplier.subscription_status).toBe('trialing');
    
    // 2. Verify supporting records created
    const settings = await getSupplierSettings(supplier.id);
    const billing = await getSupplierBilling(supplier.id);
    
    expect(settings).toBeTruthy();
    expect(billing).toBeTruthy();
    
    // 3. Complete onboarding
    await updateSupplier(supplier.id, {
      onboarding_completed: true,
      onboarding_step: null
    });
    
    // 4. Add team member
    const teamMember = await inviteTeamMember(supplier.id, {
      email: 'assistant@example.com',
      full_name: 'Assistant',
      role: 'member'
    });
    
    // 5. Accept invitation
    await acceptInvitation(teamMember.invitation_code);
    
    // 6. Verify team member has access
    const hasAccess = await userHasPermission(
      teamMember.auth_user_id, 
      'clients', 
      'view'
    );
    expect(hasAccess).toBe(true);
  });

  test('subscription upgrade flow', async () => {
    const supplier = await createTestSupplier({
      subscription_tier: 'free',
      max_clients: 10
    });

    // Add clients up to limit
    await createTestClients(supplier.id, 10);
    
    // Should be at limit
    expect(await checkSupplierLimit(supplier.id, 'clients', 1)).toBe(false);
    
    // Upgrade subscription
    await upgradeSubscription(supplier.id, 'professional');
    
    // Should now have higher limit
    const updatedSupplier = await getSupplier(supplier.id);
    expect(updatedSupplier.max_clients).toBe(50);
    expect(await checkSupplierLimit(supplier.id, 'clients', 10)).toBe(true);
  });
});

// __tests__/integration/rls-policies.test.ts
describe('Row Level Security', () => {
  test('suppliers can only see their own data', async () => {
    const supplier1 = await createTestSupplier();
    const supplier2 = await createTestSupplier();
    
    // Login as supplier1
    const client1 = await getAuthenticatedClient(supplier1.auth_user_id);
    
    // Can see own record
    const ownRecord = await client1.from('suppliers').select('*').eq('id', supplier1.id);
    expect(ownRecord.data).toHaveLength(1);
    
    // Cannot see other supplier
    const otherRecord = await client1.from('suppliers').select('*').eq('id', supplier2.id);
    expect(otherRecord.data).toHaveLength(0);
  });

  test('team members can see supplier data based on permissions', async () => {
    const supplier = await createTestSupplier();
    const manager = await createTeamMember(supplier.id, {
      role: 'manager',
      status: 'active'
    });
    
    // Login as team member
    const managerClient = await getAuthenticatedClient(manager.auth_user_id);
    
    // Can see supplier record
    const supplierRecord = await managerClient
      .from('suppliers')
      .select('*')
      .eq('id', supplier.id);
    expect(supplierRecord.data).toHaveLength(1);
    
    // Can see team members
    const teamMembers = await managerClient
      .from('team_members')
      .select('*')
      .eq('supplier_id', supplier.id);
    expect(teamMembers.data.length).toBeGreaterThan(0);
  });

  test('billing data is restricted to owners and financial admins', async () => {
    const supplier = await createTestSupplier();
    const viewer = await createTeamMember(supplier.id, {
      role: 'viewer',
      status: 'active',
      permissions: { billing: { view: false } }
    });
    
    // Login as viewer
    const viewerClient = await getAuthenticatedClient(viewer.auth_user_id);
    
    // Cannot see billing data
    const billingRecord = await viewerClient
      .from('supplier_billing')
      .select('*')
      .eq('supplier_id', supplier.id);
    expect(billingRecord.data).toHaveLength(0);
  });
});
```

## Acceptance Criteria

### Functional Requirements
- ✅ Suppliers can register with complete business information
- ✅ Subscription tiers enforce appropriate limits on resources
- ✅ Team members can be invited with role-based permissions
- ✅ Settings can be configured for business operations
- ✅ Billing information is securely managed
- ✅ Referral codes are automatically generated
- ✅ Trial periods are properly tracked

### Security Requirements
- ✅ Row Level Security isolates supplier data completely
- ✅ Team member permissions are granularly controlled
- ✅ Billing data access is restricted to authorized users
- ✅ API keys and sensitive data are encrypted
- ✅ Email validation prevents invalid registrations

### Performance Requirements
- ✅ Supplier dashboard queries complete in <200ms
- ✅ Team member permission checks execute in <50ms
- ✅ Complex business logic functions perform efficiently
- ✅ Indexes support fast queries across all common patterns
- ✅ Subscription limit checks execute in <10ms

### Business Requirements
- ✅ Subscription limits prevent overage without authorization
- ✅ Trial periods automatically expire after 30 days
- ✅ Referral tracking supports growth initiatives
- ✅ Usage statistics support billing and analytics
- ✅ Business hours and settings support operational needs

### Technical Requirements
- ✅ Tables use UUID primary keys for security
- ✅ JSONB fields provide flexibility for features and permissions
- ✅ Comprehensive constraints ensure data integrity
- ✅ Triggers automate business logic consistently
- ✅ Helper functions encapsulate complex operations

## Effort Estimation

**Team B (Backend): 2.5 weeks**
- Table creation and constraints implementation (0.5 weeks)
- Row Level Security policies and helper functions (0.5 weeks)
- Business logic functions and triggers (0.5 weeks)
- API endpoints and validation (0.5 weeks)
- Testing and optimization (0.5 weeks)

**Team C (DevOps): 0.5 weeks**
- Migration scripts and deployment procedures (0.25 weeks)
- Index optimization and performance monitoring (0.25 weeks)

**Total Effort: 3 person-weeks** (with parallel development)

## Dependencies

**Critical Dependencies:**
- Core database infrastructure (WS-299)
- Authentication system integration (WS-297)
- Supabase project configuration and extensions
- Encryption key management for sensitive fields

**Integration Dependencies:**
- Stripe integration for billing management
- Email service for team member invitations
- Real-time subscriptions for team member updates
- Analytics system for usage tracking

## Risk Assessment

**High Risk:**
- Complex RLS policies may impact query performance
- Team member permission matrix complexity
- Subscription limit enforcement edge cases

**Medium Risk:**
- Billing data security and encryption
- Migration complexity with existing data
- Performance with large team structures

**Mitigation:**
- Comprehensive testing of RLS policies under load
- Performance benchmarking for permission checks
- Staged migration with rollback capabilities
- Security audit of encryption implementation
- Load testing with realistic supplier data volumes

---

**Specification Completed:** 2025-01-20  
**Next Review:** 2025-01-27  
**Version:** 1.0