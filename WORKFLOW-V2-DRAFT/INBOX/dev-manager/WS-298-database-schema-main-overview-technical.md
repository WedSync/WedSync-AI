# WS-298: Database Schema - Main Overview - Technical Specification

## Feature Overview
**Feature ID:** WS-298  
**Feature Name:** Database Schema - Main Overview  
**Feature Type:** Technical Architecture  
**Priority:** P0 - Critical (Platform Foundation)  
**Estimated Effort:** 6 person-weeks  

## User Stories

### Primary User Stories

#### US-298-001: Wedding Photographer Data Isolation
**As a** wedding photographer using WedSync  
**I want my** client data to be completely isolated from other suppliers  
**So that I can** trust that my competitive wedding information remains private and secure

**Acceptance Criteria:**
- My client data can only be accessed by my team members and authorized couples
- Database queries automatically filter results to my supplier ID
- Row Level Security prevents accidental data exposure
- I can safely delete my account knowing all data is properly cascaded
- Database performance remains excellent even with thousands of suppliers

**Example Scenario:**
Lisa Photography works with 50 couples this year. When she views her dashboard, she only sees HER 50 couples, never data from competitor photographers. When couple Emma connects to both Lisa Photography and Mike's Videography, Emma's core wedding details are shared with both, but Lisa never sees Mike's internal notes or pricing.

#### US-298-002: Engaged Couple Multi-Supplier Coordination
**As an** engaged couple using WedMe  
**I want to** share my wedding details with multiple suppliers while controlling privacy  
**So that I can** coordinate seamlessly without re-entering data everywhere

**Acceptance Criteria:**
- My wedding date, venue, guest count populate automatically in all supplier forms
- I control which suppliers can see my guest list vs budget information
- Both partners can access and update our shared account
- Our data syncs in real-time across all connected suppliers
- We maintain one source of truth for core wedding details

**Example Scenario:**
Jake and Emma set their wedding date as June 15th in the WedMe portal. This date automatically appears in forms from their photographer, venue, and caterer. They allow the photographer to see guest count (120) for planning but keep budget details ($25,000) private from vendors.

#### US-298-003: Real-time Core Fields Synchronization
**As any** user updating wedding information  
**I want** changes to instantly sync across all connected systems  
**So that** everyone stays updated without manual coordination

**Acceptance Criteria:**
- Guest count changes immediately reflect in all supplier dashboards
- Timeline updates trigger notifications to relevant team members
- Core field status tracking shows completion across all stakeholders  
- Audit logs capture who changed what and when
- Version conflicts are handled gracefully with user prompts

**Example Scenario:**
Couple Sarah updates guest count from 100 to 120 in their photographer's form. This triggers: 1) Real-time update to caterer's headcount planning, 2) Notification to venue about capacity, 3) Automatic recalculation of photo group logistics, 4) Timeline adjustment suggestions from the wedding planner.

#### US-298-004: Wedding Industry Compliance & Auditing
**As a** wedding supplier handling sensitive personal data  
**I need** comprehensive audit trails and compliance features  
**So that I can** meet GDPR requirements and handle disputes professionally

**Acceptance Criteria:**
- All data modifications are logged with user, timestamp, and changes
- Soft delete allows data recovery for 90 days before permanent removal
- Export functionality provides complete data packages for couples
- Retention policies automatically archive old wedding data
- Security policies prevent unauthorized access at database level

**Example Scenario:**
Wedding planner David needs to provide a complete data export when couple Lisa requests all their information under GDPR. The system generates a comprehensive report showing all interactions, form responses, timeline changes, and communication history with full audit trails.

## Database Schema

### Core Architecture Tables

```sql
-- PostgreSQL with Supabase Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Core Enums
CREATE TYPE user_type_enum AS ENUM ('supplier', 'couple', 'admin');

CREATE TYPE supplier_business_type_enum AS ENUM (
    'photographer', 'videographer', 'venue', 'caterer', 'florist',
    'dj', 'band', 'planner', 'coordinator', 'hair_makeup',
    'cake', 'stationery', 'transport', 'other'
);

CREATE TYPE core_field_status_enum AS ENUM ('completed', 'partial', 'pending', 'not_applicable');

CREATE TYPE connection_status_enum AS ENUM ('invited', 'connected', 'disconnected', 'blocked');
```

### 1. Suppliers Tables

```sql
-- Main supplier account table
CREATE TABLE IF NOT EXISTS suppliers (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    
    -- Business Information
    business_name TEXT NOT NULL,
    business_type supplier_business_type_enum NOT NULL,
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
    
    -- Subscription & Limits
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN (
        'free', 'starter', 'professional', 'scale', 'enterprise'
    )),
    subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN (
        'trialing', 'active', 'past_due', 'canceled', 'paused'
    )),
    trial_ends_at TIMESTAMPTZ,
    subscription_ends_at TIMESTAMPTZ,
    
    -- Resource Limits
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
        "sms": { "urgent_only": true },
        "in_app": { "all": true }
    }'::jsonb,
    
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

-- Team members under supplier accounts
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN (
        'owner', 'admin', 'manager', 'member', 'viewer'
    )),
    permissions JSONB DEFAULT '{
        "clients": {"view": true, "create": false, "edit": false, "delete": false},
        "forms": {"view": true, "create": false, "edit": false, "delete": false},
        "journeys": {"view": true, "create": false, "edit": false, "delete": false},
        "analytics": {"view": false},
        "billing": {"view": false, "manage": false},
        "team": {"view": true, "manage": false}
    }'::jsonb,
    
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'active', 'suspended', 'removed'
    )),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT unique_team_member UNIQUE (supplier_id, email)
);

-- Supplier settings and API keys
CREATE TABLE IF NOT EXISTS supplier_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Encrypted API Keys
    openai_api_key TEXT, -- Encrypted using pgcrypto
    openai_api_key_added_at TIMESTAMPTZ,
    openai_monthly_budget DECIMAL(10,2) DEFAULT 50.00,
    openai_current_usage DECIMAL(10,2) DEFAULT 0.00,
    
    -- Communication
    twilio_account_sid TEXT,
    twilio_auth_token TEXT, -- Encrypted
    twilio_phone_number TEXT,
    twilio_whatsapp_number TEXT,
    
    -- Calendar Integration
    google_calendar_connected BOOLEAN DEFAULT false,
    google_calendar_id TEXT,
    google_refresh_token TEXT, -- Encrypted
    outlook_calendar_connected BOOLEAN DEFAULT false,
    outlook_calendar_id TEXT,
    outlook_refresh_token TEXT, -- Encrypted
    
    -- Business Hours
    business_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "17:00", "closed": false},
        "tuesday": {"open": "09:00", "close": "17:00", "closed": false},
        "wednesday": {"open": "09:00", "close": "17:00", "closed": false},
        "thursday": {"open": "09:00", "close": "17:00", "closed": false},
        "friday": {"open": "09:00", "close": "17:00", "closed": false},
        "saturday": {"open": "10:00", "close": "16:00", "closed": false},
        "sunday": {"closed": true}
    }'::jsonb,
    
    -- Auto-responder
    auto_responder_enabled BOOLEAN DEFAULT false,
    auto_responder_message TEXT,
    out_of_office_enabled BOOLEAN DEFAULT false,
    out_of_office_start DATE,
    out_of_office_end DATE,
    out_of_office_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### 2. Couples Tables

```sql
-- Main couple account table
CREATE TABLE IF NOT EXISTS couples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication (supports both partners)
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Couple Information
    partner1_name TEXT NOT NULL,
    partner1_email TEXT NOT NULL,
    partner1_phone TEXT,
    partner2_name TEXT,
    partner2_email TEXT,
    partner2_phone TEXT,
    
    -- Wedding Details (Core Fields)
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
    wedding_style TEXT CHECK (wedding_style IN (
        'traditional', 'modern', 'rustic', 'bohemian', 'formal', 'casual'
    )),
    wedding_theme TEXT,
    wedding_colors JSONB, -- Array of color codes
    
    -- Location & Settings
    wedding_city TEXT,
    wedding_state TEXT,
    wedding_country TEXT DEFAULT 'GB',
    timezone TEXT DEFAULT 'Europe/London',
    
    -- Budget
    estimated_budget DECIMAL(10,2),
    currency TEXT DEFAULT 'GBP',
    
    -- Privacy Controls
    share_core_fields BOOLEAN DEFAULT true,
    share_guest_list BOOLEAN DEFAULT false,
    share_budget BOOLEAN DEFAULT false,
    
    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step TEXT,
    signup_source TEXT,
    inviting_supplier_id UUID REFERENCES suppliers(id),
    
    -- Analytics
    connected_suppliers_count INTEGER DEFAULT 0,
    completed_forms_count INTEGER DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    dashboard_visits INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT valid_partner1_email CHECK (partner1_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_partner2_email CHECK (partner2_email IS NULL OR partner2_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_guest_count CHECK (
        (guest_count_adults IS NULL OR guest_count_adults >= 0) AND
        (guest_count_children IS NULL OR guest_count_children >= 0)
    )
);

-- Junction table for supplier-couple relationships
CREATE TABLE IF NOT EXISTS supplier_couple_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
    
    -- Connection Details
    status connection_status_enum DEFAULT 'invited',
    connection_type TEXT CHECK (connection_type IN (
        'primary', 'secondary', 'consultation', 'referral'
    )),
    service_category TEXT,
    
    -- Invitation Flow
    invited_by TEXT CHECK (invited_by IN ('supplier', 'couple')),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    connected_at TIMESTAMPTZ,
    invitation_message TEXT,
    invitation_code TEXT UNIQUE,
    
    -- Permission Controls (couple controls what supplier can see)
    permissions JSONB DEFAULT '{
        "view_core_fields": true,
        "view_guest_list": false,
        "view_budget": false,
        "view_other_suppliers": false,
        "send_messages": true
    }'::jsonb,
    
    -- Service Details
    service_date DATE,
    service_confirmed BOOLEAN DEFAULT false,
    service_notes TEXT,
    
    -- Analytics
    last_interaction_at TIMESTAMPTZ,
    forms_completed INTEGER DEFAULT 0,
    messages_exchanged INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ,
    
    CONSTRAINT unique_supplier_couple UNIQUE (supplier_id, couple_id)
);

-- Guest list management
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
    
    -- Guest Information
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
    
    -- Grouping
    household_id UUID,
    relationship TEXT,
    side TEXT CHECK (side IN ('partner1', 'partner2', 'both')),
    
    -- Guest Details
    guest_type TEXT DEFAULT 'adult' CHECK (guest_type IN ('adult', 'child', 'infant')),
    plus_one_allowed BOOLEAN DEFAULT false,
    plus_one_name TEXT,
    
    -- RSVP
    invitation_sent BOOLEAN DEFAULT false,
    invitation_sent_at TIMESTAMPTZ,
    rsvp_status TEXT DEFAULT 'pending' CHECK (rsvp_status IN (
        'pending', 'yes', 'no', 'maybe'
    )),
    rsvp_responded_at TIMESTAMPTZ,
    attending_ceremony BOOLEAN,
    attending_reception BOOLEAN,
    
    -- Dietary & Accessibility
    dietary_requirements TEXT[],
    dietary_notes TEXT,
    accessibility_needs TEXT,
    meal_choice TEXT,
    
    -- Photo Groups & Seating
    photo_groups TEXT[],
    table_number TEXT,
    seat_number TEXT,
    
    -- Tasks & Notes
    is_helper BOOLEAN DEFAULT false,
    helper_role TEXT,
    assigned_tasks JSONB,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMPTZ
);
```

### 3. Core Fields System Tables

```sql
-- Master list of standard wedding fields
CREATE TABLE IF NOT EXISTS core_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Field Definition
    field_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN (
        'text', 'number', 'date', 'time', 'boolean', 'select', 'multiselect', 'textarea'
    )),
    field_category TEXT CHECK (field_category IN (
        'basic_details', 'ceremony', 'reception', 'guests', 'budget', 'preferences'
    )),
    
    -- Validation Rules
    is_required BOOLEAN DEFAULT false,
    validation_rules JSONB, -- {min: 1, max: 500, pattern: "regex"}
    options JSONB, -- For select/multiselect fields
    
    -- Display Properties
    placeholder TEXT,
    help_text TEXT,
    display_order INTEGER DEFAULT 0,
    
    -- System Properties
    is_active BOOLEAN DEFAULT true,
    is_system_field BOOLEAN DEFAULT false, -- Cannot be deleted
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Couple's values for core fields
CREATE TABLE IF NOT EXISTS core_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
    core_field_id UUID REFERENCES core_fields(id) ON DELETE CASCADE NOT NULL,
    
    -- Value Storage (JSONB for flexibility)
    field_value JSONB NOT NULL,
    
    -- Completion Tracking
    status core_field_status_enum DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    last_updated_by UUID, -- Can be couple or supplier
    
    -- Version Control
    version INTEGER DEFAULT 1,
    previous_value JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT unique_couple_core_field UNIQUE (couple_id, core_field_id)
);

-- Maps form fields to core fields for auto-population
CREATE TABLE IF NOT EXISTS field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    form_id UUID NOT NULL, -- References forms(id) - table created later
    form_field_name TEXT NOT NULL,
    core_field_id UUID REFERENCES core_fields(id) ON DELETE CASCADE NOT NULL,
    
    -- Mapping Configuration
    auto_populate BOOLEAN DEFAULT true,
    allow_override BOOLEAN DEFAULT true,
    transformation_rules JSONB, -- For data format conversion
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT unique_form_field_mapping UNIQUE (form_id, form_field_name)
);

-- Tracks completion status across suppliers
CREATE TABLE IF NOT EXISTS field_completion_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
    core_field_id UUID REFERENCES core_fields(id) ON DELETE CASCADE NOT NULL,
    
    -- State Tracking
    status core_field_status_enum DEFAULT 'pending',
    completed_by_couple BOOLEAN DEFAULT false,
    verified_by_supplier BOOLEAN DEFAULT false,
    
    -- Notes
    supplier_notes TEXT,
    couple_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT unique_field_completion UNIQUE (couple_id, supplier_id, core_field_id)
);
```

### 4. Activity Tracking & Audit Tables

```sql
-- User activity tracking
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Context
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_type user_type_enum,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    couple_id UUID REFERENCES couples(id) ON DELETE SET NULL,
    
    -- Activity Details
    activity_type TEXT NOT NULL, -- 'form_response', 'core_field_update', 'connection', etc.
    activity_category TEXT, -- 'user_action', 'system_event', 'integration'
    
    -- Context
    entity_type TEXT, -- 'form', 'core_field', 'connection'
    entity_id UUID,
    
    -- Activity Data
    activity_data JSONB NOT NULL,
    metadata JSONB,
    
    -- Request Context
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    -- Performance
    duration_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Indexes for performance
    INDEX CONCURRENTLY idx_activities_user_id (user_id),
    INDEX CONCURRENTLY idx_activities_supplier_id (supplier_id),
    INDEX CONCURRENTLY idx_activities_couple_id (couple_id),
    INDEX CONCURRENTLY idx_activities_type (activity_type),
    INDEX CONCURRENTLY idx_activities_created_at (created_at)
);

-- Comprehensive audit log
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User Context
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    impersonated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Operation Details
    operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    table_name TEXT NOT NULL,
    record_id UUID,
    
    -- Change Data
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    reason TEXT,
    source TEXT, -- 'web_app', 'api', 'system', 'migration'
    
    -- Request Context
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Indexes
    INDEX CONCURRENTLY idx_audit_logs_user_id (user_id),
    INDEX CONCURRENTLY idx_audit_logs_table_record (table_name, record_id),
    INDEX CONCURRENTLY idx_audit_logs_created_at (created_at)
);
```

## Database Indexes & Performance

### Strategic Index Creation

```sql
-- Core Performance Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_auth_user_id ON suppliers(auth_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_business_type ON suppliers(business_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_subscription_tier ON suppliers(subscription_tier);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_deleted_at ON suppliers(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_couples_auth_user_id ON couples(auth_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_couples_partner_auth_user_id ON couples(partner_auth_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_couples_wedding_date ON couples(wedding_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_couples_inviting_supplier_id ON couples(inviting_supplier_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scc_supplier_id ON supplier_couple_connections(supplier_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scc_couple_id ON supplier_couple_connections(couple_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scc_status ON supplier_couple_connections(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scc_invitation_code ON supplier_couple_connections(invitation_code);

-- JSONB Indexes for flexible querying
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_features_gin ON suppliers USING GIN(features);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_couples_colors_gin ON couples USING GIN(wedding_colors);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_dietary_gin ON guests USING GIN(dietary_requirements);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_core_field_values_value_gin ON core_field_values USING GIN(field_value);

-- Composite Indexes for Common Queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_supplier_status ON team_members(supplier_id, status) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_user_type_created ON activities(user_id, activity_type, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_table_created ON audit_logs(table_name, created_at);

-- Partial Indexes for Efficiency
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_couples_active ON couples(id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_suppliers_active ON suppliers(id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_attending ON guests(couple_id) WHERE rsvp_status IN ('yes', 'maybe');
```

## Row Level Security (RLS) Policies

### Comprehensive Security Implementation

```sql
-- Enable RLS on all tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_couple_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Suppliers RLS Policies
CREATE POLICY "Suppliers can view own record" ON suppliers
    FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Suppliers can update own record" ON suppliers
    FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "System can insert suppliers" ON suppliers
    FOR INSERT WITH CHECK (true);

-- Team Members RLS Policies  
CREATE POLICY "Team members can view their team" ON team_members
    FOR SELECT USING (
        supplier_id IN (
            SELECT supplier_id FROM team_members 
            WHERE auth_user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Admins can manage team" ON team_members
    FOR ALL USING (
        supplier_id IN (
            SELECT supplier_id FROM team_members 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND status = 'active'
        )
    );

-- Couples RLS Policies
CREATE POLICY "Couples can view own record" ON couples
    FOR SELECT USING (
        auth.uid() = auth_user_id OR 
        auth.uid() = partner_auth_user_id
    );

CREATE POLICY "Couples can update own record" ON couples
    FOR UPDATE USING (
        auth.uid() = auth_user_id OR 
        auth.uid() = partner_auth_user_id
    );

CREATE POLICY "Connected suppliers can view couple data" ON couples
    FOR SELECT USING (
        id IN (
            SELECT couple_id FROM supplier_couple_connections
            WHERE supplier_id = get_supplier_id_for_user(auth.uid())
            AND status = 'connected'
        )
    );

-- Supplier-Couple Connections RLS
CREATE POLICY "Suppliers can view their connections" ON supplier_couple_connections
    FOR SELECT USING (
        supplier_id = get_supplier_id_for_user(auth.uid())
    );

CREATE POLICY "Couples can view their connections" ON supplier_couple_connections
    FOR SELECT USING (
        couple_id IN (
            SELECT id FROM couples 
            WHERE auth_user_id = auth.uid() 
            OR partner_auth_user_id = auth.uid()
        )
    );

-- Core Field Values RLS
CREATE POLICY "Couples can manage their core field values" ON core_field_values
    FOR ALL USING (
        couple_id IN (
            SELECT id FROM couples 
            WHERE auth_user_id = auth.uid() 
            OR partner_auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Connected suppliers can view core field values" ON core_field_values
    FOR SELECT USING (
        couple_id IN (
            SELECT couple_id FROM supplier_couple_connections
            WHERE supplier_id = get_supplier_id_for_user(auth.uid())
            AND status = 'connected'
            AND (permissions->>'view_core_fields')::boolean = true
        )
    );

-- Guests RLS Policies
CREATE POLICY "Couples can manage their guests" ON guests
    FOR ALL USING (
        couple_id IN (
            SELECT id FROM couples 
            WHERE auth_user_id = auth.uid() 
            OR partner_auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Suppliers can view guest list if permitted" ON guests
    FOR SELECT USING (
        couple_id IN (
            SELECT couple_id FROM supplier_couple_connections
            WHERE supplier_id = get_supplier_id_for_user(auth.uid())
            AND status = 'connected'
            AND (permissions->>'view_guest_list')::boolean = true
        )
    );
```

## Helper Functions

### Core Database Functions

```sql
-- Get supplier ID for current user
CREATE OR REPLACE FUNCTION get_supplier_id_for_user(user_id UUID)
RETURNS UUID AS $$
DECLARE
    supplier_id UUID;
BEGIN
    -- Check if user is a supplier owner
    SELECT id INTO supplier_id FROM suppliers WHERE auth_user_id = user_id;
    
    IF supplier_id IS NOT NULL THEN
        RETURN supplier_id;
    END IF;
    
    -- Check if user is a team member
    SELECT tm.supplier_id INTO supplier_id 
    FROM team_members tm 
    WHERE tm.auth_user_id = user_id AND tm.status = 'active'
    LIMIT 1;
    
    RETURN supplier_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get couple ID for current user
CREATE OR REPLACE FUNCTION get_couple_id_for_user(user_id UUID)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check supplier resource limits
CREATE OR REPLACE FUNCTION check_supplier_limit(
    p_supplier_id UUID,
    p_resource_type TEXT,
    p_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    v_limit INTEGER;
    v_current INTEGER;
BEGIN
    CASE p_resource_type
        WHEN 'clients' THEN
            SELECT max_clients INTO v_limit FROM suppliers WHERE id = p_supplier_id;
            SELECT COUNT(*) INTO v_current FROM supplier_couple_connections 
            WHERE supplier_id = p_supplier_id AND status = 'connected';
        WHEN 'forms' THEN
            SELECT max_forms INTO v_limit FROM suppliers WHERE id = p_supplier_id;
            SELECT COUNT(*) INTO v_current FROM forms -- table created later
            WHERE supplier_id = p_supplier_id AND deleted_at IS NULL;
        WHEN 'team_members' THEN
            SELECT max_team_members INTO v_limit FROM suppliers WHERE id = p_supplier_id;
            SELECT COUNT(*) INTO v_current FROM team_members 
            WHERE supplier_id = p_supplier_id AND status = 'active';
        ELSE
            RETURN false;
    END CASE;
    
    RETURN (v_current + p_count) <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate wedding countdown
CREATE OR REPLACE FUNCTION calculate_wedding_countdown(p_couple_id UUID)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Core field synchronization function
CREATE OR REPLACE FUNCTION sync_core_field_value(
    p_couple_id UUID,
    p_core_field_id UUID,
    p_new_value JSONB,
    p_updated_by UUID
)
RETURNS VOID AS $$
DECLARE
    v_old_value JSONB;
BEGIN
    -- Get existing value
    SELECT field_value INTO v_old_value
    FROM core_field_values
    WHERE couple_id = p_couple_id AND core_field_id = p_core_field_id;
    
    -- Insert or update core field value
    INSERT INTO core_field_values (
        couple_id, core_field_id, field_value, status, 
        completed_at, last_updated_by, previous_value, version
    )
    VALUES (
        p_couple_id, p_core_field_id, p_new_value, 'completed',
        NOW(), p_updated_by, v_old_value, 
        COALESCE((SELECT version + 1 FROM core_field_values 
                 WHERE couple_id = p_couple_id AND core_field_id = p_core_field_id), 1)
    )
    ON CONFLICT (couple_id, core_field_id) 
    DO UPDATE SET
        field_value = EXCLUDED.field_value,
        status = EXCLUDED.status,
        completed_at = EXCLUDED.completed_at,
        last_updated_by = EXCLUDED.last_updated_by,
        previous_value = core_field_values.field_value,
        version = core_field_values.version + 1,
        updated_at = NOW();
        
    -- Log the activity
    INSERT INTO activities (
        user_id, user_type, couple_id, activity_type, activity_category,
        entity_type, entity_id, activity_data, created_at
    )
    VALUES (
        p_updated_by, 
        CASE WHEN get_supplier_id_for_user(p_updated_by) IS NOT NULL THEN 'supplier' ELSE 'couple' END,
        p_couple_id, 'core_field_update', 'user_action',
        'core_field', p_core_field_id,
        jsonb_build_object(
            'field_id', p_core_field_id,
            'old_value', v_old_value,
            'new_value', p_new_value
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Database Triggers

### Automated Data Maintenance

```sql
-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_couples_updated_at
    BEFORE UPDATE ON couples
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Auto-create household IDs for guests
CREATE OR REPLACE FUNCTION auto_create_household_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.household_id IS NULL THEN
        NEW.household_id := gen_random_uuid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guests_auto_household
    BEFORE INSERT ON guests
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_household_id();

-- Update connection counts
CREATE OR REPLACE FUNCTION update_connection_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'connected' AND NEW.status = 'connected') THEN
        -- Increase counts
        UPDATE couples 
        SET connected_suppliers_count = connected_suppliers_count + 1
        WHERE id = NEW.couple_id;
        
        UPDATE suppliers
        SET total_clients = total_clients + 1
        WHERE id = NEW.supplier_id;
        
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'connected' AND NEW.status != 'connected' THEN
        -- Decrease counts
        UPDATE couples 
        SET connected_suppliers_count = GREATEST(connected_suppliers_count - 1, 0)
        WHERE id = NEW.couple_id;
        
        UPDATE suppliers
        SET total_clients = GREATEST(total_clients - 1, 0)
        WHERE id = NEW.supplier_id;
        
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'connected' THEN
        -- Decrease counts on deletion
        UPDATE couples 
        SET connected_suppliers_count = GREATEST(connected_suppliers_count - 1, 0)
        WHERE id = OLD.couple_id;
        
        UPDATE suppliers
        SET total_clients = GREATEST(total_clients - 1, 0)
        WHERE id = OLD.supplier_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_connection_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON supplier_couple_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_connection_counts();

-- Audit trail trigger
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    audit_data JSONB;
BEGIN
    -- Build audit data
    audit_data := jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'operation', TG_OP,
        'user_id', auth.uid(),
        'timestamp', NOW()
    );
    
    IF TG_OP = 'INSERT' THEN
        audit_data := audit_data || jsonb_build_object('new_record', row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        audit_data := audit_data || jsonb_build_object(
            'old_record', row_to_json(OLD),
            'new_record', row_to_json(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        audit_data := audit_data || jsonb_build_object('old_record', row_to_json(OLD));
    END IF;
    
    -- Insert into audit log
    INSERT INTO audit_logs (
        user_id, operation, table_name, record_id,
        old_values, new_values, source, created_at
    )
    VALUES (
        auth.uid(), TG_OP, TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END,
        'web_app', NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_suppliers AFTER INSERT OR UPDATE OR DELETE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_couples AFTER INSERT OR UPDATE OR DELETE ON couples
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_connections AFTER INSERT OR UPDATE OR DELETE ON supplier_couple_connections
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

## API Endpoints

### Database Management API

```typescript
// GET /api/database/health
interface DatabaseHealthResponse {
  status: 'healthy' | 'degraded' | 'down';
  connections: {
    active: number;
    idle: number;
    max: number;
  };
  performance: {
    avg_query_time_ms: number;
    slow_queries_count: number;
    cache_hit_ratio: number;
  };
  storage: {
    size_mb: number;
    growth_rate_mb_per_day: number;
  };
}

// GET /api/database/schema/version
interface SchemaVersionResponse {
  current_version: string;
  applied_migrations: string[];
  pending_migrations: string[];
  last_migration_at: string;
}

// POST /api/database/migrate
interface MigrationRequest {
  target_version?: string;
  dry_run?: boolean;
}

interface MigrationResponse {
  success: boolean;
  applied_migrations: string[];
  errors: string[];
  rollback_available: boolean;
}

// GET /api/database/stats
interface DatabaseStatsResponse {
  tables: Array<{
    table_name: string;
    row_count: number;
    size_mb: number;
    last_analyze: string;
  }>;
  indexes: Array<{
    index_name: string;
    table_name: string;
    size_mb: number;
    usage_count: number;
  }>;
  performance_metrics: {
    queries_per_second: number;
    cache_hit_ratio: number;
    avg_connection_time_ms: number;
  };
}
```

### Core Fields API

```typescript
// GET /api/core-fields
interface CoreFieldsResponse {
  fields: Array<{
    id: string;
    field_name: string;
    display_name: string;
    field_type: string;
    field_category: string;
    is_required: boolean;
    validation_rules: any;
    options?: any;
    placeholder?: string;
    help_text?: string;
  }>;
}

// GET /api/couples/:coupleId/core-fields
interface CoupleFieldValuesResponse {
  values: Array<{
    core_field_id: string;
    field_name: string;
    display_name: string;
    field_value: any;
    status: 'completed' | 'partial' | 'pending' | 'not_applicable';
    completed_at?: string;
    last_updated_by?: string;
    version: number;
  }>;
  completion_percentage: number;
}

// PUT /api/couples/:coupleId/core-fields/:fieldId
interface UpdateCoreFieldRequest {
  field_value: any;
  status?: 'completed' | 'partial' | 'pending' | 'not_applicable';
}

interface UpdateCoreFieldResponse {
  success: boolean;
  updated_value: {
    field_value: any;
    status: string;
    completed_at: string;
    version: number;
  };
  synced_forms: string[]; // Form IDs that were auto-updated
}

// GET /api/suppliers/:supplierId/field-mappings
interface FieldMappingsResponse {
  mappings: Array<{
    form_id: string;
    form_field_name: string;
    core_field_id: string;
    core_field_name: string;
    auto_populate: boolean;
    allow_override: boolean;
  }>;
}
```

## MCP Server Usage

### Required MCP Servers

1. **PostgreSQL MCP** - Primary database operations
   - Schema creation and migration management
   - Complex query execution and optimization
   - Performance monitoring and index management
   - Backup and restore operations

2. **Supabase MCP** - Platform-specific features
   - Real-time subscriptions setup
   - Row Level Security policy management
   - Edge Functions for database triggers
   - Authentication integration

### Implementation Priority

**Phase 1 (Week 1-2): Core Tables & Security**
- Create suppliers, couples, and connection tables
- Implement Row Level Security policies
- Set up authentication integration
- Basic CRUD operations and validation

**Phase 2 (Week 3-4): Core Fields System**
- Implement core fields infrastructure
- Build synchronization mechanisms
- Create field mapping system
- Real-time update triggers

**Phase 3 (Week 5-6): Performance & Monitoring**
- Optimize indexes and query performance
- Implement comprehensive audit logging
- Set up monitoring and alerting
- Load testing and optimization

## Test Requirements

### Unit Tests

```typescript
// __tests__/database/rls-policies.test.ts
describe('Row Level Security Policies', () => {
  test('suppliers can only access their own data', async () => {
    const supplier1 = await createTestSupplier();
    const supplier2 = await createTestSupplier();
    
    // Login as supplier1
    const { data: ownData } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplier1.id);
    
    expect(ownData).toHaveLength(1);
    
    // Should not see supplier2's data
    const { data: otherData } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplier2.id);
    
    expect(otherData).toHaveLength(0);
  });

  test('couples can share data with connected suppliers', async () => {
    const couple = await createTestCouple();
    const supplier = await createTestSupplier();
    
    // Create connection
    await createSupplierCoupleConnection(supplier.id, couple.id, {
      status: 'connected',
      permissions: { view_core_fields: true }
    });
    
    // Supplier should see couple data
    const { data: coupleData } = await supabase
      .from('couples')
      .select('*')
      .eq('id', couple.id);
    
    expect(coupleData).toHaveLength(1);
  });
});

// __tests__/database/core-fields.test.ts
describe('Core Fields System', () => {
  test('core field updates sync across forms', async () => {
    const couple = await createTestCouple();
    const coreField = await createTestCoreField('wedding_date');
    
    // Update core field value
    await updateCoreFieldValue(couple.id, coreField.id, '2024-06-15');
    
    // Verify all mapped forms receive the update
    const mappedForms = await getMappedForms(coreField.id);
    for (const form of mappedForms) {
      const formData = await getFormData(form.id, couple.id);
      expect(formData.wedding_date).toBe('2024-06-15');
    }
  });

  test('field completion states track correctly', async () => {
    const couple = await createTestCouple();
    const supplier = await createTestSupplier();
    const coreField = await createTestCoreField('guest_count');
    
    // Update completion state
    await updateFieldCompletionState(
      couple.id, supplier.id, coreField.id, 
      { status: 'completed', verified_by_supplier: true }
    );
    
    const state = await getFieldCompletionState(couple.id, supplier.id, coreField.id);
    expect(state.status).toBe('completed');
    expect(state.verified_by_supplier).toBe(true);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/database-performance.test.ts
describe('Database Performance', () => {
  test('supplier dashboard loads within performance target', async () => {
    const supplier = await createSupplierWithClients(50); // 50 couples
    
    const startTime = Date.now();
    const dashboard = await loadSupplierDashboard(supplier.id);
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000); // 2 second target
    expect(dashboard.clients).toHaveLength(50);
  });

  test('core fields sync performance with multiple suppliers', async () => {
    const couple = await createTestCouple();
    const suppliers = await createMultipleSuppliers(10);
    
    // Connect couple to all suppliers
    for (const supplier of suppliers) {
      await createSupplierCoupleConnection(supplier.id, couple.id);
    }
    
    const startTime = Date.now();
    await updateCoreFieldValue(couple.id, 'wedding_date', '2024-07-20');
    const syncTime = Date.now() - startTime;
    
    expect(syncTime).toBeLessThan(1000); // 1 second for 10 suppliers
    
    // Verify all suppliers received the update
    for (const supplier of suppliers) {
      const fieldValue = await getCoreFieldValueForSupplier(
        couple.id, supplier.id, 'wedding_date'
      );
      expect(fieldValue.field_value).toBe('2024-07-20');
    }
  });
});

// __tests__/integration/audit-compliance.test.ts
describe('Audit & Compliance', () => {
  test('all data modifications are audited', async () => {
    const supplier = await createTestSupplier();
    
    // Clear existing audit logs
    await clearAuditLogs();
    
    // Make several changes
    await updateSupplier(supplier.id, { business_name: 'New Name' });
    await createTestCouple();
    await deleteSupplier(supplier.id);
    
    const auditLogs = await getAuditLogs();
    expect(auditLogs).toHaveLength(3);
    expect(auditLogs[0].operation).toBe('UPDATE');
    expect(auditLogs[1].operation).toBe('INSERT');
    expect(auditLogs[2].operation).toBe('DELETE');
  });

  test('GDPR export includes all user data', async () => {
    const couple = await createTestCouple();
    await createTestGuestList(couple.id, 50);
    await createMultipleFormResponses(couple.id, 5);
    
    const exportData = await generateGDPRExport(couple.id);
    
    expect(exportData.couples).toBeDefined();
    expect(exportData.guests).toHaveLength(50);
    expect(exportData.form_responses).toHaveLength(5);
    expect(exportData.core_field_values).toBeDefined();
    expect(exportData.audit_logs).toBeDefined();
  });
});
```

### Security Tests

```typescript
// __tests__/security/rls-bypass.test.ts
describe('Security - RLS Bypass Prevention', () => {
  test('cannot bypass RLS with SQL injection', async () => {
    const supplier1 = await createTestSupplier();
    const supplier2 = await createTestSupplier();
    
    // Attempt SQL injection to bypass RLS
    const maliciousQuery = `'; DROP TABLE suppliers; --`;
    
    const { error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('business_name', maliciousQuery);
    
    // Should not succeed and suppliers table should still exist
    const { data } = await supabase.from('suppliers').select('count');
    expect(data).toBeDefined(); // Table still exists
  });

  test('unauthorized users cannot access any data', async () => {
    // Clear authentication
    await supabase.auth.signOut();
    
    const { data: suppliers } = await supabase.from('suppliers').select('*');
    const { data: couples } = await supabase.from('couples').select('*');
    const { data: guests } = await supabase.from('guests').select('*');
    
    expect(suppliers).toHaveLength(0);
    expect(couples).toHaveLength(0);
    expect(guests).toHaveLength(0);
  });
});
```

### Performance Tests

```typescript
// __tests__/performance/load-testing.test.ts
describe('Database Load Testing', () => {
  test('handles concurrent core field updates', async () => {
    const couple = await createTestCouple();
    const coreFieldId = await createTestCoreField('guest_count').id;
    
    // Simulate 10 concurrent updates
    const updates = Array.from({ length: 10 }, (_, i) => 
      updateCoreFieldValue(couple.id, coreFieldId, 100 + i)
    );
    
    const results = await Promise.allSettled(updates);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    expect(successful).toBeGreaterThan(0); // At least one should succeed
    
    // Final value should be from one of the updates
    const finalValue = await getCoreFieldValue(couple.id, coreFieldId);
    expect(finalValue.field_value).toBeGreaterThanOrEqual(100);
    expect(finalValue.field_value).toBeLessThanOrEqual(109);
  });

  test('large guest lists perform acceptably', async () => {
    const couple = await createTestCouple();
    
    // Create 500 guests
    const startTime = Date.now();
    await createBulkGuests(couple.id, 500);
    const createTime = Date.now() - startTime;
    
    expect(createTime).toBeLessThan(10000); // 10 seconds
    
    // Query all guests with filters
    const queryStart = Date.now();
    const { data: attendingGuests } = await supabase
      .from('guests')
      .select('*')
      .eq('couple_id', couple.id)
      .eq('rsvp_status', 'yes');
    const queryTime = Date.now() - queryStart;
    
    expect(queryTime).toBeLessThan(500); // 500ms
  });
});
```

## Acceptance Criteria

### Functional Requirements
- ✅ Complete data isolation between suppliers using RLS policies
- ✅ Couples can control privacy settings for different types of data
- ✅ Core fields automatically sync across all connected supplier forms
- ✅ Real-time updates propagate instantly to all authorized users
- ✅ Audit logs capture all data modifications with full context
- ✅ Soft delete enables data recovery for 90 days
- ✅ GDPR export provides complete user data packages

### Performance Requirements
- ✅ Supplier dashboard loads in <2 seconds with 100+ clients
- ✅ Core field updates sync in <1 second across 10 suppliers
- ✅ Database queries maintain <100ms p95 latency
- ✅ Large guest lists (500+) load in <500ms
- ✅ Concurrent updates handled without data corruption

### Security Requirements
- ✅ Row Level Security prevents cross-tenant data access
- ✅ All sensitive data encrypted at rest and in transit
- ✅ SQL injection attacks cannot bypass security policies
- ✅ Unauthorized users cannot access any data
- ✅ API keys and tokens encrypted using pgcrypto

### Compliance Requirements
- ✅ GDPR-compliant data handling and export functionality
- ✅ 7-year audit log retention for financial records
- ✅ Data minimization and purpose limitation implemented
- ✅ Right to be forgotten (data deletion) supported
- ✅ Consent tracking for data processing activities

### Technical Requirements
- ✅ PostgreSQL 15+ with Supabase extensions
- ✅ UUID v4 primary keys for all tables
- ✅ JSONB for flexible schema requirements
- ✅ Comprehensive indexing strategy for performance
- ✅ Automated migration system with rollback capability

## Effort Estimation

**Team B (Backend): 4 weeks**
- Database schema design and creation (1.5 weeks)
- RLS policies and security implementation (1 week)
- Core fields synchronization system (1 week)
- Performance optimization and monitoring (0.5 weeks)

**Team C (DevOps): 2 weeks**
- Supabase project setup and configuration (0.5 weeks)
- Database migration system setup (0.5 weeks)
- Monitoring and backup strategies (0.5 weeks)
- Performance testing and optimization (0.5 weeks)

**Team A (Frontend): 1 week**
- Database connection and client setup (0.5 weeks)
- Real-time subscription configuration (0.5 weeks)

**Total Effort: 6 person-weeks** (with parallel development)

## Dependencies

**Critical Dependencies:**
- Supabase project provisioning and configuration
- PostgreSQL extensions installation and setup
- Authentication system integration (WS-297)
- Environment variables and connection strings

**Integration Dependencies:**
- Real-time system configuration
- API endpoint implementations
- Frontend client libraries and SDKs
- Monitoring and logging infrastructure

## Risk Assessment

**High Risk:**
- Complex RLS policies may impact performance
- Core fields synchronization race conditions
- Large-scale data migration challenges

**Medium Risk:**
- Index optimization for complex queries
- Audit log storage and performance impact
- Migration rollback complexity

**Mitigation:**
- Comprehensive performance testing at scale
- Load testing with realistic data volumes
- Staging environment for migration validation
- Database monitoring and alerting setup

---

**Specification Completed:** 2025-01-20  
**Next Review:** 2025-01-27  
**Version:** 1.0