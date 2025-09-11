-- GDPR Compliance System Database Schema
-- WS-149: Comprehensive privacy framework for global data protection compliance

-- Create GDPR schema
CREATE SCHEMA IF NOT EXISTS gdpr;

-- Consent management system
CREATE TABLE gdpr.consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_subject_id UUID NOT NULL,
    data_subject_type TEXT NOT NULL CHECK (data_subject_type IN ('couple', 'guest', 'vendor', 'contact')),
    purpose TEXT NOT NULL,
    legal_basis TEXT NOT NULL CHECK (legal_basis IN (
        'consent', 'contract', 'legal_obligation', 
        'vital_interests', 'public_task', 'legitimate_interests'
    )),
    consent_given BOOLEAN NOT NULL,
    consent_method TEXT NOT NULL CHECK (consent_method IN ('explicit', 'opt_in', 'implied')),
    consent_evidence JSONB NOT NULL,
    purpose_description TEXT NOT NULL,
    data_categories TEXT[] NOT NULL,
    retention_period INTERVAL,
    can_withdraw BOOLEAN DEFAULT true,
    processing_location TEXT,
    third_party_sharing BOOLEAN DEFAULT false,
    third_parties JSONB,
    marketing_consent BOOLEAN DEFAULT false,
    profiling_consent BOOLEAN DEFAULT false,
    automated_decision_making BOOLEAN DEFAULT false,
    consent_given_at TIMESTAMPTZ NOT NULL,
    consent_expires_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    withdrawal_method TEXT,
    last_confirmed_at TIMESTAMPTZ,
    consent_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data subject rights management
CREATE TABLE gdpr.data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT UNIQUE NOT NULL,
    data_subject_id UUID NOT NULL,
    data_subject_email TEXT NOT NULL,
    data_subject_name TEXT NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN (
        'access', 'rectification', 'erasure', 'portability',
        'restrict_processing', 'object_to_processing', 'withdraw_consent'
    )),
    request_details JSONB NOT NULL,
    identity_verification_status TEXT DEFAULT 'pending' CHECK (
        identity_verification_status IN ('pending', 'verified', 'failed', 'not_required')
    ),
    identity_verification_method TEXT,
    identity_verified_at TIMESTAMPTZ,
    identity_verified_by UUID REFERENCES user_profiles(id),
    
    status TEXT DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'identity_pending', 'in_progress', 
        'completed', 'rejected', 'partially_completed'
    )),
    
    -- Response timing
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    
    -- Processing details
    assigned_to UUID REFERENCES user_profiles(id),
    processing_notes TEXT,
    rejection_reason TEXT,
    completion_details JSONB,
    
    -- Data export/deletion details
    export_format TEXT CHECK (export_format IN ('json', 'csv', 'pdf')),
    export_file_path TEXT,
    export_file_size_bytes INTEGER,
    deletion_method TEXT CHECK (deletion_method IN ('logical', 'physical', 'crypto_shred')),
    deletion_scope JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data breach incident management
CREATE TABLE gdpr.data_breaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_id TEXT UNIQUE NOT NULL,
    
    -- Breach details
    breach_type TEXT NOT NULL CHECK (breach_type IN (
        'confidentiality', 'integrity', 'availability', 'combined'
    )),
    breach_cause TEXT NOT NULL CHECK (breach_cause IN (
        'cyber_attack', 'human_error', 'system_failure', 'physical_breach',
        'third_party', 'malicious_insider', 'accidental_disclosure'
    )),
    severity_level TEXT NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Timeline
    occurred_at TIMESTAMPTZ NOT NULL,
    discovered_at TIMESTAMPTZ NOT NULL,
    contained_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Impact assessment
    data_subjects_affected INTEGER DEFAULT 0,
    data_categories_affected TEXT[] NOT NULL,
    potential_consequences TEXT NOT NULL,
    risk_assessment JSONB NOT NULL,
    
    -- Notification requirements
    supervisory_authority_notification_required BOOLEAN DEFAULT false,
    supervisory_authority_notified_at TIMESTAMPTZ,
    data_subject_notification_required BOOLEAN DEFAULT false,
    data_subject_notifications_sent_at TIMESTAMPTZ,
    
    -- Response details
    containment_measures JSONB NOT NULL,
    remedial_actions JSONB NOT NULL,
    lessons_learned TEXT,
    
    -- Legal and compliance
    dpo_notified_at TIMESTAMPTZ,
    legal_team_notified_at TIMESTAMPTZ,
    external_counsel_engaged BOOLEAN DEFAULT false,
    regulatory_fines_amount DECIMAL(15,2) DEFAULT 0,
    
    status TEXT DEFAULT 'investigating' CHECK (status IN (
        'investigating', 'contained', 'resolved', 'closed'
    )),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data retention policies
CREATE TABLE gdpr.retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name TEXT NOT NULL,
    data_category TEXT NOT NULL,
    purpose TEXT NOT NULL,
    retention_period INTERVAL NOT NULL,
    legal_basis TEXT NOT NULL,
    retention_criteria TEXT NOT NULL,
    deletion_method TEXT NOT NULL DEFAULT 'logical',
    review_frequency INTERVAL DEFAULT INTERVAL '12 months',
    last_reviewed_at TIMESTAMPTZ,
    next_review_due TIMESTAMPTZ,
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES user_profiles(id),
    approved_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Privacy impact assessments
CREATE TABLE gdpr.privacy_impact_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pia_id TEXT UNIQUE NOT NULL,
    project_name TEXT NOT NULL,
    data_controller UUID REFERENCES organizations(id),
    dpo_id UUID REFERENCES user_profiles(id),
    
    -- Assessment scope
    processing_purpose TEXT NOT NULL,
    data_categories TEXT[] NOT NULL,
    data_subjects_categories TEXT[] NOT NULL,
    processing_activities JSONB NOT NULL,
    
    -- Risk assessment
    privacy_risks JSONB NOT NULL,
    risk_mitigation_measures JSONB NOT NULL,
    residual_risk_level TEXT CHECK (residual_risk_level IN ('low', 'medium', 'high')),
    
    -- Consultation and review
    stakeholders_consulted JSONB,
    data_subjects_consulted BOOLEAN DEFAULT false,
    consultation_details TEXT,
    
    -- Approval and monitoring
    status TEXT DEFAULT 'draft' CHECK (status IN (
        'draft', 'under_review', 'approved', 'rejected', 'requires_updates'
    )),
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    review_due_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs for GDPR compliance
CREATE TABLE gdpr.compliance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    data_subject_id UUID,
    user_id UUID REFERENCES user_profiles(id),
    organization_id UUID REFERENCES organizations(id),
    event_details JSONB NOT NULL,
    legal_basis TEXT,
    purpose TEXT,
    data_categories TEXT[],
    processing_location TEXT,
    retention_applied BOOLEAN DEFAULT false,
    consent_required BOOLEAN DEFAULT false,
    consent_status TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled deletions for retention policy enforcement
CREATE TABLE gdpr.scheduled_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    deletion_reason TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    deletion_method TEXT DEFAULT 'logical',
    deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(table_name, record_id)
);

-- Cookie consent records
CREATE TABLE gdpr.cookie_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    essential_cookies BOOLEAN DEFAULT true,
    analytics_cookies BOOLEAN DEFAULT false,
    marketing_cookies BOOLEAN DEFAULT false,
    personalization_cookies BOOLEAN DEFAULT false,
    consent_timestamp TIMESTAMPTZ NOT NULL,
    consent_version TEXT NOT NULL,
    consent_method TEXT NOT NULL CHECK (consent_method IN ('banner', 'settings', 'api')),
    consent_country TEXT,
    consent_region TEXT,
    withdrawal_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data processing activities register
CREATE TABLE gdpr.processing_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_name TEXT NOT NULL,
    controller_id UUID REFERENCES organizations(id),
    processor_id UUID REFERENCES organizations(id),
    purpose TEXT NOT NULL,
    legal_basis TEXT NOT NULL,
    data_categories TEXT[] NOT NULL,
    data_subjects TEXT[] NOT NULL,
    recipients TEXT[],
    third_countries TEXT[],
    safeguards TEXT,
    retention_period INTERVAL,
    security_measures JSONB NOT NULL,
    dpia_required BOOLEAN DEFAULT false,
    dpia_id UUID REFERENCES gdpr.privacy_impact_assessments(id),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_consent_records_data_subject ON gdpr.consent_records(data_subject_id);
CREATE INDEX idx_consent_records_purpose ON gdpr.consent_records(purpose);
CREATE INDEX idx_consent_records_given_at ON gdpr.consent_records(consent_given_at);
CREATE INDEX idx_consent_records_withdrawn ON gdpr.consent_records(withdrawn_at) WHERE withdrawn_at IS NOT NULL;

CREATE INDEX idx_data_subject_requests_subject ON gdpr.data_subject_requests(data_subject_id);
CREATE INDEX idx_data_subject_requests_status ON gdpr.data_subject_requests(status);
CREATE INDEX idx_data_subject_requests_due_date ON gdpr.data_subject_requests(due_date);
CREATE INDEX idx_data_subject_requests_type ON gdpr.data_subject_requests(request_type);

CREATE INDEX idx_data_breaches_status ON gdpr.data_breaches(status);
CREATE INDEX idx_data_breaches_severity ON gdpr.data_breaches(severity_level);
CREATE INDEX idx_data_breaches_occurred ON gdpr.data_breaches(occurred_at);

CREATE INDEX idx_retention_policies_category ON gdpr.retention_policies(data_category);
CREATE INDEX idx_retention_policies_active ON gdpr.retention_policies(active);

CREATE INDEX idx_audit_log_subject ON gdpr.compliance_audit_log(data_subject_id);
CREATE INDEX idx_audit_log_event ON gdpr.compliance_audit_log(event_type);
CREATE INDEX idx_audit_log_created ON gdpr.compliance_audit_log(created_at);

CREATE INDEX idx_scheduled_deletions_scheduled ON gdpr.scheduled_deletions(scheduled_for) WHERE deleted = false;
CREATE INDEX idx_scheduled_deletions_table ON gdpr.scheduled_deletions(table_name);

CREATE INDEX idx_cookie_consent_session ON gdpr.cookie_consent_records(session_id);
CREATE INDEX idx_cookie_consent_user ON gdpr.cookie_consent_records(user_id);
CREATE INDEX idx_cookie_consent_timestamp ON gdpr.cookie_consent_records(consent_timestamp);

-- Enable Row Level Security
ALTER TABLE gdpr.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.data_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.privacy_impact_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.compliance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.scheduled_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.cookie_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.processing_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for consent records
CREATE POLICY "Users can view own consent records" ON gdpr.consent_records
    FOR SELECT USING (
        data_subject_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'dpo', 'privacy_officer')
        )
    );

CREATE POLICY "Users can update own consent" ON gdpr.consent_records
    FOR UPDATE USING (data_subject_id = auth.uid())
    WITH CHECK (data_subject_id = auth.uid());

CREATE POLICY "Admins can manage all consent records" ON gdpr.consent_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.role IN ('admin', 'dpo', 'privacy_officer')
        )
    );

-- RLS Policies for data subject requests
CREATE POLICY "Users can view own requests" ON gdpr.data_subject_requests
    FOR SELECT USING (
        data_subject_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.role IN ('admin', 'dpo', 'privacy_officer')
        )
    );

CREATE POLICY "Users can create own requests" ON gdpr.data_subject_requests
    FOR INSERT WITH CHECK (data_subject_id = auth.uid());

CREATE POLICY "Admins can manage all requests" ON gdpr.data_subject_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.role IN ('admin', 'dpo', 'privacy_officer')
        )
    );

-- RLS Policies for breach management (admin only)
CREATE POLICY "Only admins can manage breaches" ON gdpr.data_breaches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.role IN ('admin', 'dpo', 'privacy_officer', 'security_admin')
        )
    );

-- Function to generate request IDs
CREATE OR REPLACE FUNCTION gdpr.generate_request_id(request_type TEXT)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    year TEXT;
    sequence_num INTEGER;
    request_id TEXT;
BEGIN
    -- Determine prefix based on request type
    prefix := CASE request_type
        WHEN 'access' THEN 'DSR-A'
        WHEN 'erasure' THEN 'DSR-E'
        WHEN 'portability' THEN 'DSR-P'
        WHEN 'rectification' THEN 'DSR-R'
        ELSE 'DSR'
    END;
    
    year := TO_CHAR(NOW(), 'YYYY');
    
    -- Get next sequence number for this year
    SELECT COUNT(*) + 1 INTO sequence_num
    FROM gdpr.data_subject_requests
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    
    request_id := prefix || '-' || year || '-' || LPAD(sequence_num::TEXT, 3, '0');
    
    RETURN request_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate breach IDs
CREATE OR REPLACE FUNCTION gdpr.generate_breach_id()
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    sequence_num INTEGER;
BEGIN
    year := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COUNT(*) + 1 INTO sequence_num
    FROM gdpr.data_breaches
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    
    RETURN 'BR-' || year || '-' || LPAD(sequence_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Function for automated data retention
CREATE OR REPLACE FUNCTION gdpr.execute_retention_policy()
RETURNS void AS $$
BEGIN
    -- Mark records for deletion based on retention policies
    INSERT INTO gdpr.scheduled_deletions (
        table_name, record_id, deletion_reason, scheduled_for
    )
    SELECT 
        'user_profiles', 
        up.id::TEXT,
        'retention_policy_' || rp.id,
        NOW() + INTERVAL '7 days'
    FROM user_profiles up
    JOIN gdpr.retention_policies rp ON rp.data_category = 'profile_data'
    WHERE up.created_at < (NOW() - rp.retention_period)
    AND rp.active = true
    AND NOT EXISTS (
        SELECT 1 FROM gdpr.scheduled_deletions sd
        WHERE sd.table_name = 'user_profiles' 
        AND sd.record_id = up.id::TEXT
    )
    ON CONFLICT (table_name, record_id) DO NOTHING;
    
    -- Add more tables as needed
END;
$$ LANGUAGE plpgsql;

-- Function to check breach notification requirements
CREATE OR REPLACE FUNCTION gdpr.assess_breach_notification(breach_id UUID)
RETURNS JSONB AS $$
DECLARE
    breach_record gdpr.data_breaches%ROWTYPE;
    notification_assessment JSONB;
    high_risk BOOLEAN;
    authority_required BOOLEAN;
    subject_required BOOLEAN;
BEGIN
    SELECT * INTO breach_record FROM gdpr.data_breaches WHERE id = breach_id;
    
    IF breach_record IS NULL THEN
        RETURN jsonb_build_object('error', 'Breach not found');
    END IF;
    
    -- Assess if high risk to rights and freedoms
    high_risk := breach_record.severity_level IN ('high', 'critical') OR
                 breach_record.data_subjects_affected > 100 OR
                 'financial_data' = ANY(breach_record.data_categories_affected) OR
                 'health_data' = ANY(breach_record.data_categories_affected) OR
                 'sensitive_personal_data' = ANY(breach_record.data_categories_affected);
    
    -- Supervisory authority notification required if risk exists
    authority_required := breach_record.breach_type != 'availability' OR high_risk;
    
    -- Data subject notification required if high risk
    subject_required := high_risk AND breach_record.breach_type IN ('confidentiality', 'combined');
    
    notification_assessment := jsonb_build_object(
        'breach_id', breach_record.breach_id,
        'high_risk', high_risk,
        'supervisory_authority_required', authority_required,
        'data_subject_notification_required', subject_required,
        'deadline_hours', 72,
        'assessment_timestamp', NOW(),
        'severity_level', breach_record.severity_level,
        'data_subjects_affected', breach_record.data_subjects_affected
    );
    
    RETURN notification_assessment;
END;
$$ LANGUAGE plpgsql;

-- Function to export user data for data subject requests
CREATE OR REPLACE FUNCTION gdpr.export_user_data(subject_id UUID)
RETURNS JSONB AS $$
DECLARE
    export_data JSONB;
    profile_data JSONB;
    consent_data JSONB;
    communication_data JSONB;
    file_data JSONB;
BEGIN
    -- Get profile data
    SELECT jsonb_build_object(
        'id', id,
        'email', email,
        'name', name,
        'phone', phone,
        'created_at', created_at,
        'updated_at', updated_at
    ) INTO profile_data
    FROM user_profiles
    WHERE id = subject_id;
    
    -- Get consent history
    SELECT jsonb_agg(jsonb_build_object(
        'purpose', purpose,
        'legal_basis', legal_basis,
        'consent_given', consent_given,
        'consent_given_at', consent_given_at,
        'withdrawn_at', withdrawn_at,
        'data_categories', data_categories
    )) INTO consent_data
    FROM gdpr.consent_records
    WHERE data_subject_id = subject_id;
    
    -- Build complete export
    export_data := jsonb_build_object(
        'export_timestamp', NOW(),
        'data_subject_id', subject_id,
        'personal_data', jsonb_build_object(
            'profile_information', profile_data,
            'consent_history', consent_data
        ),
        'metadata', jsonb_build_object(
            'export_format', 'json',
            'export_date', NOW(),
            'verification_hash', encode(sha256((profile_data || consent_data)::TEXT::BYTEA), 'hex')
        )
    );
    
    RETURN export_data;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamps
CREATE OR REPLACE FUNCTION gdpr.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_consent_records_updated_at
    BEFORE UPDATE ON gdpr.consent_records
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.update_updated_at();

CREATE TRIGGER update_data_subject_requests_updated_at
    BEFORE UPDATE ON gdpr.data_subject_requests
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.update_updated_at();

CREATE TRIGGER update_data_breaches_updated_at
    BEFORE UPDATE ON gdpr.data_breaches
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.update_updated_at();

CREATE TRIGGER update_cookie_consent_updated_at
    BEFORE UPDATE ON gdpr.cookie_consent_records
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.update_updated_at();

-- Auto-generate request IDs
CREATE OR REPLACE FUNCTION gdpr.auto_generate_request_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_id IS NULL THEN
        NEW.request_id := gdpr.generate_request_id(NEW.request_type);
    END IF;
    
    -- Set due date based on request type
    IF NEW.due_date IS NULL THEN
        NEW.due_date := CASE NEW.request_type
            WHEN 'access' THEN NOW() + INTERVAL '30 days'
            WHEN 'erasure' THEN NOW() + INTERVAL '30 days'
            WHEN 'portability' THEN NOW() + INTERVAL '30 days'
            WHEN 'rectification' THEN NOW() + INTERVAL '30 days'
            ELSE NOW() + INTERVAL '30 days'
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_request_id_trigger
    BEFORE INSERT ON gdpr.data_subject_requests
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.auto_generate_request_id();

-- Auto-generate breach IDs
CREATE OR REPLACE FUNCTION gdpr.auto_generate_breach_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.breach_id IS NULL THEN
        NEW.breach_id := gdpr.generate_breach_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_breach_id_trigger
    BEFORE INSERT ON gdpr.data_breaches
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.auto_generate_breach_id();