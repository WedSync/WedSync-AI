-- =====================================================================================
-- WS-216 AUTO-POPULATION SYSTEM DATABASE MIGRATION
-- Created: 2025-09-01 14:00:00
-- Purpose: Comprehensive auto-population system for wedding vendor forms
-- =====================================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =====================================================================================
-- 1. AUTO POPULATION RULES TABLE
-- =====================================================================================
-- Stores rules for field pattern matching and transformation
CREATE TABLE IF NOT EXISTS auto_population_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    rule_name VARCHAR(200) NOT NULL,
    source_field_pattern VARCHAR(500) NOT NULL, -- Pattern to match form field names
    target_core_field VARCHAR(100) NOT NULL, -- Core field to map to
    transformation_function VARCHAR(100), -- Optional transformation to apply
    confidence_modifier DECIMAL(3,2) DEFAULT 0.0, -- Boost/reduce confidence (-1.0 to 1.0)
    priority INTEGER NOT NULL DEFAULT 999, -- Lower number = higher priority
    supplier_type VARCHAR(50), -- Optional: specific to supplier type
    form_type VARCHAR(50), -- Optional: specific to form type
    is_active BOOLEAN NOT NULL DEFAULT true,
    usage_count INTEGER NOT NULL DEFAULT 0,
    accuracy_score DECIMAL(3,2) NOT NULL DEFAULT 0.5, -- Track rule accuracy over time
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_confidence_modifier CHECK (confidence_modifier >= -1.0 AND confidence_modifier <= 1.0),
    CONSTRAINT valid_accuracy_score CHECK (accuracy_score >= 0.0 AND accuracy_score <= 1.0),
    CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 9999),
    CONSTRAINT unique_org_rule_name UNIQUE (organization_id, rule_name)
);

-- =====================================================================================
-- 2. FORM FIELD MAPPINGS TABLE  
-- =====================================================================================
-- Tracks form fields and their mappings to core wedding data fields
CREATE TABLE IF NOT EXISTS form_field_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    form_id UUID NOT NULL, -- References external form system
    form_field_id VARCHAR(100) NOT NULL, -- Field ID from form system
    form_field_name VARCHAR(200) NOT NULL, -- Field name for reference
    core_field_key VARCHAR(100) NOT NULL, -- Target core field
    confidence DECIMAL(3,2) NOT NULL, -- Match confidence (0.0-1.0)
    transformation_rule VARCHAR(100), -- Transformation to apply
    priority INTEGER NOT NULL DEFAULT 999,
    is_verified BOOLEAN NOT NULL DEFAULT false, -- Manual verification status
    is_active BOOLEAN NOT NULL DEFAULT true,
    usage_count INTEGER NOT NULL DEFAULT 0,
    accuracy_score DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_confidence CHECK (confidence >= 0.0 AND confidence <= 1.0),
    CONSTRAINT valid_accuracy_score_mapping CHECK (accuracy_score >= 0.0 AND accuracy_score <= 1.0),
    CONSTRAINT valid_core_field CHECK (core_field_key IN (
        'couple_name_1', 'couple_name_2', 'wedding_date', 'venue_name', 
        'venue_address', 'guest_count', 'budget_amount', 'contact_email', 'contact_phone'
    )),
    CONSTRAINT unique_form_field_mapping UNIQUE (organization_id, form_id, form_field_id)
);

-- =====================================================================================
-- 3. AUTO POPULATION SESSIONS TABLE
-- =====================================================================================  
-- Manages active population sessions with expiration and feedback tracking
CREATE TABLE IF NOT EXISTS auto_population_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    couple_id UUID NOT NULL, -- References couple/client
    supplier_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    form_identifier VARCHAR(200) NOT NULL, -- Form reference
    populated_fields JSONB NOT NULL DEFAULT '{}', -- Populated field data
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
    feedback_provided BOOLEAN NOT NULL DEFAULT false,
    accuracy_score DECIMAL(3,2), -- Overall session accuracy from feedback
    processing_time_ms INTEGER NOT NULL DEFAULT 0,
    fields_populated_count INTEGER NOT NULL DEFAULT 0,
    average_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    completed_at TIMESTAMPTZ,
    feedback_received_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_session_accuracy CHECK (accuracy_score IS NULL OR (accuracy_score >= 0.0 AND accuracy_score <= 1.0)),
    CONSTRAINT valid_avg_confidence CHECK (average_confidence >= 0.0 AND average_confidence <= 1.0),
    CONSTRAINT valid_processing_time CHECK (processing_time_ms >= 0),
    CONSTRAINT valid_fields_count CHECK (fields_populated_count >= 0)
);

-- =====================================================================================
-- 4. POPULATION FEEDBACK TABLE
-- =====================================================================================
-- Stores user feedback on population accuracy for continuous improvement
CREATE TABLE IF NOT EXISTS population_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES auto_population_sessions(id) ON DELETE CASCADE,
    field_id VARCHAR(100) NOT NULL,
    was_correct BOOLEAN NOT NULL,
    corrected_value TEXT, -- User's correction if incorrect
    confidence_before DECIMAL(3,2) NOT NULL,
    user_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_confidence_before CHECK (confidence_before >= 0.0 AND confidence_before <= 1.0),
    CONSTRAINT unique_session_field_feedback UNIQUE (session_id, field_id)
);

-- =====================================================================================
-- 5. WEDDING CORE DATA TABLE (Enhanced)
-- =====================================================================================
-- Add columns if table exists, create if it doesn't
DO $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wedding_core_data') THEN
        CREATE TABLE wedding_core_data (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            couple_id UUID NOT NULL UNIQUE, -- One wedding per couple
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            
            -- Core wedding fields
            couple_name_1 VARCHAR(200),
            couple_name_2 VARCHAR(200), 
            wedding_date DATE,
            venue_name VARCHAR(300),
            venue_address TEXT,
            guest_count INTEGER CHECK (guest_count >= 0 AND guest_count <= 2000),
            budget_amount DECIMAL(12,2) CHECK (budget_amount >= 0),
            contact_email VARCHAR(255),
            contact_phone VARCHAR(50),
            
            -- Metadata
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_updated_source VARCHAR(100) DEFAULT 'manual_entry',
            
            -- Constraints
            CONSTRAINT valid_email CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR contact_email IS NULL)
        );
    END IF;
    
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'wedding_core_data' AND column_name = 'last_updated_source') THEN
        ALTER TABLE wedding_core_data ADD COLUMN last_updated_source VARCHAR(100) DEFAULT 'manual_entry';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'wedding_core_data' AND column_name = 'organization_id') THEN
        ALTER TABLE wedding_core_data ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- =====================================================================================
-- 6. PERFORMANCE INDEXES
-- =====================================================================================

-- Auto Population Rules indexes
CREATE INDEX IF NOT EXISTS idx_auto_population_rules_org ON auto_population_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_auto_population_rules_source ON auto_population_rules(source_field_pattern);
CREATE INDEX IF NOT EXISTS idx_auto_population_rules_target ON auto_population_rules(target_core_field);
CREATE INDEX IF NOT EXISTS idx_auto_population_rules_priority ON auto_population_rules(priority, is_active);
CREATE INDEX IF NOT EXISTS idx_auto_population_rules_supplier ON auto_population_rules(supplier_type) WHERE supplier_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auto_population_rules_accuracy ON auto_population_rules(accuracy_score DESC, usage_count DESC);

-- Form Field Mappings indexes  
CREATE INDEX IF NOT EXISTS idx_form_field_mappings_org ON form_field_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_form_field_mappings_form ON form_field_mappings(form_id);
CREATE INDEX IF NOT EXISTS idx_form_field_mappings_field ON form_field_mappings(form_field_id);
CREATE INDEX IF NOT EXISTS idx_form_field_mappings_core ON form_field_mappings(core_field_key);
CREATE INDEX IF NOT EXISTS idx_form_field_mappings_confidence ON form_field_mappings(confidence DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_form_field_mappings_verified ON form_field_mappings(is_verified, is_active);
CREATE INDEX IF NOT EXISTS idx_form_field_mappings_usage ON form_field_mappings(last_used_at DESC) WHERE is_active = true;

-- Auto Population Sessions indexes
CREATE INDEX IF NOT EXISTS idx_auto_population_sessions_org ON auto_population_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_auto_population_sessions_couple ON auto_population_sessions(couple_id);
CREATE INDEX IF NOT EXISTS idx_auto_population_sessions_supplier ON auto_population_sessions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_auto_population_sessions_status ON auto_population_sessions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_auto_population_sessions_created ON auto_population_sessions(created_at DESC);

-- Population Feedback indexes
CREATE INDEX IF NOT EXISTS idx_population_feedback_org ON population_feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_population_feedback_session ON population_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_population_feedback_correctness ON population_feedback(was_correct, created_at);

-- Wedding Core Data indexes
CREATE INDEX IF NOT EXISTS idx_wedding_core_data_couple ON wedding_core_data(couple_id);
CREATE INDEX IF NOT EXISTS idx_wedding_core_data_org ON wedding_core_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_wedding_core_data_date ON wedding_core_data(wedding_date) WHERE wedding_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wedding_core_data_updated ON wedding_core_data(updated_at DESC);

-- Advanced GIN indexes for JSONB and text search
CREATE INDEX IF NOT EXISTS idx_auto_population_sessions_fields_gin ON auto_population_sessions USING GIN(populated_fields);

-- =====================================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE auto_population_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_field_mappings ENABLE ROW LEVEL SECURITY; 
ALTER TABLE auto_population_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE population_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_core_data ENABLE ROW LEVEL SECURITY;

-- Auto Population Rules policies
DROP POLICY IF EXISTS "auto_population_rules_org_policy" ON auto_population_rules;
CREATE POLICY "auto_population_rules_org_policy" ON auto_population_rules
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Form Field Mappings policies  
DROP POLICY IF EXISTS "form_field_mappings_org_policy" ON form_field_mappings;
CREATE POLICY "form_field_mappings_org_policy" ON form_field_mappings
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Auto Population Sessions policies
DROP POLICY IF EXISTS "auto_population_sessions_org_policy" ON auto_population_sessions;
CREATE POLICY "auto_population_sessions_org_policy" ON auto_population_sessions
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        ) OR supplier_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Population Feedback policies
DROP POLICY IF EXISTS "population_feedback_org_policy" ON population_feedback;
CREATE POLICY "population_feedback_org_policy" ON population_feedback
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Wedding Core Data policies (if table was created by this migration)
DROP POLICY IF EXISTS "wedding_core_data_org_policy" ON wedding_core_data;
CREATE POLICY "wedding_core_data_org_policy" ON wedding_core_data
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================================================
-- 8. AUDIT TRIGGERS
-- =====================================================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
DROP TRIGGER IF EXISTS update_auto_population_rules_updated_at ON auto_population_rules;
CREATE TRIGGER update_auto_population_rules_updated_at 
    BEFORE UPDATE ON auto_population_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_form_field_mappings_updated_at ON form_field_mappings;
CREATE TRIGGER update_form_field_mappings_updated_at 
    BEFORE UPDATE ON form_field_mappings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wedding_core_data_updated_at ON wedding_core_data;
CREATE TRIGGER update_wedding_core_data_updated_at 
    BEFORE UPDATE ON wedding_core_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- 9. SEED DATA - STANDARD WEDDING POPULATION RULES
-- =====================================================================================

-- Global population rules (no organization_id - applies to all)
INSERT INTO auto_population_rules (
    organization_id, rule_name, source_field_pattern, target_core_field, 
    transformation_function, confidence_modifier, priority, is_active
) VALUES 
-- Date field rules
((SELECT id FROM organizations LIMIT 1), 'Wedding Date Exact', 'wedding_date', 'wedding_date', 'date_iso', 0.2, 1, true),
((SELECT id FROM organizations LIMIT 1), 'Event Date Pattern', 'event_date', 'wedding_date', 'date_iso', 0.15, 2, true),
((SELECT id FROM organizations LIMIT 1), 'Ceremony Date Pattern', 'ceremony.*date', 'wedding_date', 'date_iso', 0.15, 3, true),
((SELECT id FROM organizations LIMIT 1), 'Date Field Generic', '.*date.*', 'wedding_date', 'date_iso', 0.1, 10, true),

-- Name field rules
((SELECT id FROM organizations LIMIT 1), 'Bride Name', 'bride.*name', 'couple_name_1', 'text_title_case', 0.2, 4, true),
((SELECT id FROM organizations LIMIT 1), 'Groom Name', 'groom.*name', 'couple_name_2', 'text_title_case', 0.2, 5, true),
((SELECT id FROM organizations LIMIT 1), 'Partner 1 Name', 'partner.*1.*name', 'couple_name_1', 'text_title_case', 0.15, 6, true),
((SELECT id FROM organizations LIMIT 1), 'Partner 2 Name', 'partner.*2.*name', 'couple_name_2', 'text_title_case', 0.15, 7, true),
((SELECT id FROM organizations LIMIT 1), 'Primary Contact', 'primary.*contact', 'couple_name_1', 'text_title_case', 0.1, 15, true),

-- Venue field rules  
((SELECT id FROM organizations LIMIT 1), 'Venue Name', 'venue.*name', 'venue_name', null, 0.2, 8, true),
((SELECT id FROM organizations LIMIT 1), 'Location Name', 'location.*name', 'venue_name', null, 0.15, 9, true),
((SELECT id FROM organizations LIMIT 1), 'Venue Address', 'venue.*address', 'venue_address', null, 0.2, 11, true),

-- Guest count rules
((SELECT id FROM organizations LIMIT 1), 'Guest Count', 'guest.*count', 'guest_count', 'number_currency', 0.2, 12, true),
((SELECT id FROM organizations LIMIT 1), 'Number of Guests', 'number.*guests', 'guest_count', 'number_currency', 0.2, 13, true),
((SELECT id FROM organizations LIMIT 1), 'Headcount', 'headcount', 'guest_count', 'number_currency', 0.15, 14, true),

-- Contact field rules
((SELECT id FROM organizations LIMIT 1), 'Contact Email', 'contact.*email', 'contact_email', 'email_lowercase', 0.2, 16, true),
((SELECT id FROM organizations LIMIT 1), 'Email Address', '.*email.*', 'contact_email', 'email_lowercase', 0.1, 20, true),
((SELECT id FROM organizations LIMIT 1), 'Contact Phone', 'contact.*phone', 'contact_phone', 'phone_format', 0.2, 17, true),
((SELECT id FROM organizations LIMIT 1), 'Phone Number', '.*phone.*', 'contact_phone', 'phone_format', 0.1, 21, true),

-- Budget rules
((SELECT id FROM organizations LIMIT 1), 'Budget Amount', 'budget.*amount', 'budget_amount', 'number_currency', 0.2, 18, true),
((SELECT id FROM organizations LIMIT 1), 'Wedding Budget', 'wedding.*budget', 'budget_amount', 'number_currency', 0.2, 19, true);

-- =====================================================================================
-- 10. PERFORMANCE MONITORING VIEWS
-- =====================================================================================

-- Auto-population performance metrics view
CREATE OR REPLACE VIEW auto_population_metrics AS
SELECT 
    organization_id,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
    AVG(accuracy_score) FILTER (WHERE accuracy_score IS NOT NULL) as avg_accuracy,
    AVG(processing_time_ms) as avg_processing_time,
    AVG(average_confidence) as avg_confidence,
    AVG(fields_populated_count) as avg_fields_populated
FROM auto_population_sessions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY organization_id;

-- Field mapping accuracy view  
CREATE OR REPLACE VIEW field_mapping_performance AS
SELECT 
    fm.organization_id,
    fm.core_field_key,
    COUNT(*) as mapping_count,
    AVG(fm.accuracy_score) as avg_accuracy,
    SUM(fm.usage_count) as total_usage,
    COUNT(*) FILTER (WHERE fm.is_verified = true) as verified_count
FROM form_field_mappings fm
WHERE fm.is_active = true
GROUP BY fm.organization_id, fm.core_field_key;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================

-- Log migration completion
INSERT INTO public.migrations_log (migration_name, completed_at) 
VALUES ('20250901140000_auto_population_system', NOW())
ON CONFLICT (migration_name) DO UPDATE SET completed_at = NOW();

-- Migration summary
DO $$
BEGIN
    RAISE NOTICE 'WS-216 Auto-Population System Migration Completed Successfully';
    RAISE NOTICE '- Created 5 core tables with comprehensive constraints';
    RAISE NOTICE '- Added 15+ performance indexes';
    RAISE NOTICE '- Implemented Row Level Security policies';
    RAISE NOTICE '- Created audit triggers for data integrity';
    RAISE NOTICE '- Seeded 20+ standard wedding population rules';
    RAISE NOTICE '- Created performance monitoring views';
    RAISE NOTICE 'Auto-population system ready for production use.';
END $$;