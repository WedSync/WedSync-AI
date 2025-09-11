-- Multi-jurisdiction Compliance Handling System
-- For international weddings and cross-border data processing

-- Jurisdictions and data protection authorities
CREATE TABLE IF NOT EXISTS public.compliance_jurisdictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(2) NOT NULL UNIQUE, -- ISO 3166-1 alpha-2
    country_name VARCHAR(100) NOT NULL,
    region VARCHAR(50), -- EU, APAC, Americas, etc.
    data_protection_framework VARCHAR(50), -- GDPR, CCPA, PIPEDA, etc.
    
    -- Authority details
    authority_name VARCHAR(200),
    authority_website VARCHAR(500),
    breach_notification_deadline_hours INTEGER DEFAULT 72,
    authority_email VARCHAR(200),
    authority_phone VARCHAR(50),
    
    -- Wedding industry specifics
    guest_data_requirements JSONB DEFAULT '{}',
    photo_consent_requirements JSONB DEFAULT '{}',
    international_transfer_rules JSONB DEFAULT '{}',
    vendor_data_sharing_rules JSONB DEFAULT '{}',
    
    -- Language and localization
    primary_language VARCHAR(10), -- ISO 639-1
    notification_templates JSONB DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wedding jurisdiction mappings
CREATE TABLE IF NOT EXISTS public.wedding_jurisdiction_compliance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    wedding_id UUID, -- Reference to wedding when available
    
    -- Location details
    ceremony_country_code VARCHAR(2),
    reception_country_code VARCHAR(2),
    couple_residence_countries VARCHAR(2)[] DEFAULT '{}',
    guest_countries VARCHAR(2)[] DEFAULT '{}',
    vendor_countries VARCHAR(2)[] DEFAULT '{}',
    
    -- Data processing locations
    data_processing_countries VARCHAR(2)[] DEFAULT '{}',
    data_storage_locations VARCHAR(2)[] DEFAULT '{}',
    
    -- Compliance requirements
    applicable_jurisdictions UUID[] DEFAULT '{}', -- References compliance_jurisdictions
    primary_jurisdiction UUID REFERENCES public.compliance_jurisdictions(id),
    
    -- Risk assessment
    cross_border_processing_risk VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
    compliance_complexity_score INTEGER DEFAULT 1, -- 1-10
    
    -- Documentation
    legal_basis_documentation JSONB DEFAULT '{}',
    transfer_mechanism_documentation JSONB DEFAULT '{}',
    consent_documentation JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-jurisdiction breach notifications
CREATE TABLE IF NOT EXISTS public.multi_jurisdiction_breach_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    security_incident_id UUID REFERENCES public.security_incidents(id) ON DELETE CASCADE,
    wedding_jurisdiction_id UUID REFERENCES public.wedding_jurisdiction_compliance(id),
    
    -- Notification requirements per jurisdiction
    jurisdiction_id UUID REFERENCES public.compliance_jurisdictions(id),
    notification_required BOOLEAN DEFAULT true,
    notification_deadline_hours INTEGER,
    
    -- Notification status
    notification_status VARCHAR(20) DEFAULT 'pending', -- pending, sent, acknowledged, failed
    notification_sent_at TIMESTAMPTZ,
    acknowledgment_received_at TIMESTAMPTZ,
    
    -- Jurisdiction-specific content
    localized_content JSONB DEFAULT '{}',
    authority_reference_number VARCHAR(100),
    
    -- Follow-up requirements
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_deadline TIMESTAMPTZ,
    follow_up_completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-border data transfer tracking
CREATE TABLE IF NOT EXISTS public.cross_border_data_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    wedding_jurisdiction_id UUID REFERENCES public.wedding_jurisdiction_compliance(id),
    
    -- Transfer details
    data_category VARCHAR(50), -- guest_data, photos, payment_data, vendor_data
    source_country VARCHAR(2),
    destination_country VARCHAR(2),
    transfer_mechanism VARCHAR(50), -- adequacy_decision, sccs, bcrs, consent
    
    -- Legal basis
    legal_basis VARCHAR(100),
    transfer_documentation TEXT,
    
    -- Data subjects
    affected_data_subjects_count INTEGER DEFAULT 0,
    data_subject_categories VARCHAR(100)[], -- guests, vendors, couples, staff
    
    -- Risk assessment
    transfer_risk_level VARCHAR(20) DEFAULT 'low',
    risk_mitigation_measures TEXT,
    
    -- Monitoring
    transfer_date TIMESTAMPTZ DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ DEFAULT NOW(),
    next_review_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance audit trail
CREATE TABLE IF NOT EXISTS public.multi_jurisdiction_compliance_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    wedding_jurisdiction_id UUID REFERENCES public.wedding_jurisdiction_compliance(id),
    
    -- Audit details
    audit_type VARCHAR(50), -- assessment, notification, transfer, review
    action_taken VARCHAR(100),
    jurisdiction_id UUID REFERENCES public.compliance_jurisdictions(id),
    
    -- Context
    user_id UUID,
    action_context JSONB DEFAULT '{}',
    compliance_requirements_checked TEXT[],
    
    -- Results
    compliance_status VARCHAR(20), -- compliant, non_compliant, under_review
    issues_identified TEXT[],
    recommendations TEXT[],
    
    audit_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default jurisdictions and compliance frameworks
INSERT INTO public.compliance_jurisdictions (
    country_code, country_name, region, data_protection_framework,
    authority_name, authority_website, breach_notification_deadline_hours,
    primary_language, guest_data_requirements, photo_consent_requirements
) VALUES
    ('GB', 'United Kingdom', 'Europe', 'UK GDPR', 
     'Information Commissioner''s Office (ICO)', 'https://ico.org.uk', 72,
     'en', 
     '{"explicit_consent_required": true, "lawful_basis_documentation": true}',
     '{"written_consent_required": true, "commercial_use_separate_consent": true}'),
    
    ('DE', 'Germany', 'EU', 'GDPR',
     'Bundesbeauftragte für den Datenschutz und die Informationsfreiheit', 'https://www.bfdi.bund.de', 72,
     'de',
     '{"strict_consent_requirements": true, "data_minimization_mandatory": true}',
     '{"personality_rights_protection": true, "commercial_use_restrictions": true}'),
    
    ('FR', 'France', 'EU', 'GDPR',
     'Commission Nationale de l''Informatique et des Libertés (CNIL)', 'https://www.cnil.fr', 72,
     'fr',
     '{"consent_age_minimum": 15, "parental_consent_required": true}',
     '{"image_rights_strong_protection": true, "wedding_photo_special_category": true}'),
    
    ('IT', 'Italy', 'EU', 'GDPR',
     'Garante per la protezione dei dati personali', 'https://www.gpdp.it', 72,
     'it',
     '{"guest_list_restrictions": true, "religious_ceremony_exemptions": true}',
     '{"portrait_rights_protection": true, "venue_permission_required": true}'),
    
    ('US', 'United States', 'Americas', 'State Laws',
     'Various State Attorneys General', 'https://www.ftc.gov', 72,
     'en',
     '{"state_specific_requirements": true, "california_ccpa_applicable": true}',
     '{"state_law_variations": true, "commercial_photography_licenses": true}'),
    
    ('CA', 'Canada', 'Americas', 'PIPEDA',
     'Office of the Privacy Commissioner of Canada', 'https://www.priv.gc.ca', 72,
     'en',
     '{"consent_must_be_meaningful": true, "breach_notification_mandatory": true}',
     '{"personality_rights_provincial": true, "commercial_use_consent_written": true}'),
    
    ('AU', 'Australia', 'APAC', 'Privacy Act',
     'Office of the Australian Information Commissioner', 'https://www.oaic.gov.au', 72,
     'en',
     '{"notifiable_data_breach_scheme": true, "serious_harm_threshold": true}',
     '{"privacy_act_exemptions": true, "commercial_use_consent_required": true}')
    
ON CONFLICT (country_code) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wedding_jurisdiction_org ON wedding_jurisdiction_compliance(organization_id);
CREATE INDEX IF NOT EXISTS idx_wedding_jurisdiction_ceremony ON wedding_jurisdiction_compliance(ceremony_country_code);
CREATE INDEX IF NOT EXISTS idx_wedding_jurisdiction_applicable ON wedding_jurisdiction_compliance USING GIN(applicable_jurisdictions);
CREATE INDEX IF NOT EXISTS idx_multi_breach_incident ON multi_jurisdiction_breach_notifications(security_incident_id);
CREATE INDEX IF NOT EXISTS idx_multi_breach_jurisdiction ON multi_jurisdiction_breach_notifications(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_cross_border_org ON cross_border_data_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_cross_border_countries ON cross_border_data_transfers(source_country, destination_country);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_org ON multi_jurisdiction_compliance_audit(organization_id);

-- Row Level Security policies
ALTER TABLE public.compliance_jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_jurisdiction_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multi_jurisdiction_breach_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_border_data_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multi_jurisdiction_compliance_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for compliance_jurisdictions (read-only for all authenticated users)
CREATE POLICY "compliance_jurisdictions_read" ON public.compliance_jurisdictions
    FOR SELECT TO authenticated USING (true);

-- RLS policies for wedding_jurisdiction_compliance
CREATE POLICY "wedding_jurisdiction_compliance_org_access" ON public.wedding_jurisdiction_compliance
    FOR ALL TO authenticated USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles 
            WHERE id = auth.uid()
        )
    );

-- RLS policies for multi_jurisdiction_breach_notifications
CREATE POLICY "multi_jurisdiction_breach_notifications_org_access" ON public.multi_jurisdiction_breach_notifications
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.wedding_jurisdiction_compliance wjc
            JOIN public.user_profiles up ON up.organization_id = wjc.organization_id
            WHERE wjc.id = multi_jurisdiction_breach_notifications.wedding_jurisdiction_id
            AND up.id = auth.uid()
        )
    );

-- RLS policies for cross_border_data_transfers
CREATE POLICY "cross_border_data_transfers_org_access" ON public.cross_border_data_transfers
    FOR ALL TO authenticated USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles 
            WHERE id = auth.uid()
        )
    );

-- RLS policies for multi_jurisdiction_compliance_audit
CREATE POLICY "multi_jurisdiction_compliance_audit_org_access" ON public.multi_jurisdiction_compliance_audit
    FOR ALL TO authenticated USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_compliance_jurisdictions_updated_at
    BEFORE UPDATE ON public.compliance_jurisdictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wedding_jurisdiction_compliance_updated_at
    BEFORE UPDATE ON public.wedding_jurisdiction_compliance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_multi_jurisdiction_breach_notifications_updated_at
    BEFORE UPDATE ON public.multi_jurisdiction_breach_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cross_border_data_transfers_updated_at
    BEFORE UPDATE ON public.cross_border_data_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();