-- GDPR/CCPA Comprehensive Compliance Framework
-- Migration: 019_comprehensive_gdpr_ccpa_compliance.sql
-- Purpose: Implements full GDPR/CCPA compliance database schema

-- Privacy Requests Table (Enhanced)
CREATE TABLE IF NOT EXISTS privacy_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'expired')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    verification_token UUID DEFAULT gen_random_uuid(),
    verification_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    is_verified BOOLEAN DEFAULT FALSE,
    response_data JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consent Records Table (Enhanced)
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    purpose TEXT NOT NULL,
    is_granted BOOLEAN NOT NULL DEFAULT FALSE,
    granted_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    legal_basis VARCHAR(50) NOT NULL CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
    processing_purpose TEXT NOT NULL,
    data_categories TEXT[] DEFAULT '{}',
    retention_period INTERVAL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, consent_type)
);

-- Enhanced Audit Trail (Tamper-Proof)
CREATE TABLE IF NOT EXISTS audit_trail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    actor_id VARCHAR(255) NOT NULL, -- Can be UUID or 'system'/'anonymized'
    actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('user', 'system', 'admin', 'vendor')),
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    metadata JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}', -- IP, user agent, session info
    hash VARCHAR(64) NOT NULL,
    previous_hash VARCHAR(64),
    signature VARCHAR(128), -- Cryptographic signature
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Processing Records (GDPR Article 30)
CREATE TABLE IF NOT EXISTS data_processing_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    processing_activity VARCHAR(200) NOT NULL,
    controller_name VARCHAR(200) NOT NULL DEFAULT 'WedSync',
    controller_contact TEXT,
    purpose TEXT NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,
    data_categories TEXT[] NOT NULL,
    data_subjects TEXT[] NOT NULL,
    recipients TEXT[],
    retention_period INTERVAL,
    retention_criteria TEXT,
    cross_border_transfers BOOLEAN DEFAULT FALSE,
    transfer_safeguards TEXT[],
    security_measures TEXT[],
    dpia_required BOOLEAN DEFAULT FALSE,
    dpia_reference UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Privacy Impact Assessments (GDPR Article 35)
CREATE TABLE IF NOT EXISTS privacy_impact_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    processing_operations TEXT[] NOT NULL,
    data_types TEXT[] NOT NULL,
    necessity_assessment TEXT NOT NULL,
    proportionality_assessment TEXT NOT NULL,
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    assessment_date DATE NOT NULL,
    assessor_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected')),
    identified_risks JSONB DEFAULT '[]',
    mitigation_measures JSONB DEFAULT '[]',
    residual_risks JSONB DEFAULT '[]',
    consultation_required BOOLEAN DEFAULT FALSE,
    dpo_consultation_date DATE,
    supervisory_authority_consultation_date DATE,
    approval_date DATE,
    next_review_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Breach Incidents (GDPR Article 33-34)
CREATE TABLE IF NOT EXISTS data_breach_incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_reference VARCHAR(100) UNIQUE NOT NULL,
    incident_title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    breach_type VARCHAR(50) NOT NULL, -- confidentiality, integrity, availability
    discovered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discovery_method VARCHAR(100),
    affected_users INTEGER DEFAULT 0,
    affected_records INTEGER DEFAULT 0,
    data_types_affected TEXT[],
    potential_consequences TEXT,
    immediate_actions TEXT,
    containment_measures TEXT,
    notification_required BOOLEAN DEFAULT TRUE,
    notification_72h_met BOOLEAN DEFAULT FALSE,
    authorities_notified_at TIMESTAMP WITH TIME ZONE,
    users_notified_at TIMESTAMP WITH TIME ZONE,
    notification_method VARCHAR(50),
    resolution_status VARCHAR(20) DEFAULT 'investigating' CHECK (resolution_status IN ('investigating', 'contained', 'resolved', 'closed')),
    root_cause TEXT,
    lessons_learned TEXT,
    follow_up_actions TEXT[],
    estimated_cost DECIMAL(10,2),
    regulatory_fines DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Exports (for portability requests)
CREATE TABLE IF NOT EXISTS data_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    request_id UUID REFERENCES privacy_requests(id),
    export_format VARCHAR(20) DEFAULT 'json' CHECK (export_format IN ('json', 'csv', 'xml')),
    data JSONB NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    checksum VARCHAR(64),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    downloaded_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Legal Holds (for data retention requirements)
CREATE TABLE IF NOT EXISTS legal_holds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    wedding_id UUID REFERENCES weddings(id),
    hold_type VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    legal_basis TEXT NOT NULL,
    issuing_authority VARCHAR(200),
    hold_start_date DATE NOT NULL,
    hold_end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    data_categories TEXT[],
    retention_period INTERVAL,
    review_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cross-Border Transfer Records
CREATE TABLE IF NOT EXISTS cross_border_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transfer_reference VARCHAR(100) UNIQUE NOT NULL,
    data_exporter VARCHAR(200) NOT NULL,
    data_importer VARCHAR(200) NOT NULL,
    source_country VARCHAR(2) NOT NULL, -- ISO country code
    destination_country VARCHAR(2) NOT NULL,
    transfer_mechanism VARCHAR(50) NOT NULL, -- adequacy_decision, scc, bcr, etc.
    data_categories TEXT[] NOT NULL,
    purpose TEXT NOT NULL,
    retention_period INTERVAL,
    security_measures TEXT[],
    adequacy_decision_reference TEXT,
    scc_version VARCHAR(50),
    transfer_date DATE NOT NULL,
    approval_authority VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Monitoring
CREATE TABLE IF NOT EXISTS compliance_monitoring (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_type VARCHAR(50) NOT NULL,
    check_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('passed', 'failed', 'warning')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    next_check_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_privacy_requests_user_id ON privacy_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON privacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_type ON privacy_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_requested_at ON privacy_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_privacy_requests_verification ON privacy_requests(verification_token) WHERE verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_type ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_granted ON consent_records(is_granted);
CREATE INDEX IF NOT EXISTS idx_consent_records_expiry ON consent_records(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp ON audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_trail_actor ON audit_trail(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_event_type ON audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource ON audit_trail(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_risk_level ON audit_trail(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_trail_hash ON audit_trail(hash);

CREATE INDEX IF NOT EXISTS idx_data_processing_legal_basis ON data_processing_records(legal_basis);
CREATE INDEX IF NOT EXISTS idx_data_processing_cross_border ON data_processing_records(cross_border_transfers);

CREATE INDEX IF NOT EXISTS idx_pia_status ON privacy_impact_assessments(status);
CREATE INDEX IF NOT EXISTS idx_pia_risk_level ON privacy_impact_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_pia_assessment_date ON privacy_impact_assessments(assessment_date);

CREATE INDEX IF NOT EXISTS idx_breach_severity ON data_breach_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_breach_status ON data_breach_incidents(resolution_status);
CREATE INDEX IF NOT EXISTS idx_breach_discovered_at ON data_breach_incidents(discovered_at);
CREATE INDEX IF NOT EXISTS idx_breach_notification ON data_breach_incidents(notification_required, authorities_notified_at);

CREATE INDEX IF NOT EXISTS idx_data_exports_user_id ON data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_expires_at ON data_exports(expires_at);

CREATE INDEX IF NOT EXISTS idx_legal_holds_user_id ON legal_holds(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_active ON legal_holds(is_active);

-- Enable Row Level Security
ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_impact_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_breach_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_border_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_monitoring ENABLE ROW LEVEL SECURITY;

-- Privacy Requests Policies
CREATE POLICY "Users can view own privacy requests" ON privacy_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own privacy requests" ON privacy_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Privacy officers can view all requests" ON privacy_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND (role = 'admin' OR role = 'privacy_officer')
        )
    );

-- Consent Records Policies
CREATE POLICY "Users can view own consent records" ON consent_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own consent" ON consent_records
    FOR ALL USING (auth.uid() = user_id);

-- Audit Trail Policies (Restricted access)
CREATE POLICY "Privacy officers can view audit trail" ON audit_trail
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'privacy_officer', 'auditor')
        )
    );

-- Data Exports Policies
CREATE POLICY "Users can view own data exports" ON data_exports
    FOR SELECT USING (auth.uid() = user_id);

-- Admin-only policies for sensitive tables
CREATE POLICY "Admin access only" ON data_processing_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admin access only" ON privacy_impact_assessments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'privacy_officer')
        )
    );

CREATE POLICY "Admin access only" ON data_breach_incidents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'privacy_officer', 'security_officer')
        )
    );

-- Automated Functions and Triggers

-- Function to update consent timestamps
CREATE OR REPLACE FUNCTION update_consent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_granted = TRUE AND (OLD.is_granted IS NULL OR OLD.is_granted = FALSE) THEN
        NEW.granted_at = NOW();
        NEW.withdrawn_at = NULL;
    ELSIF NEW.is_granted = FALSE AND OLD.is_granted = TRUE THEN
        NEW.withdrawn_at = NOW();
    END IF;
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_timestamp_trigger
    BEFORE UPDATE ON consent_records
    FOR EACH ROW
    EXECUTE FUNCTION update_consent_timestamp();

-- Function to automatically expire consents
CREATE OR REPLACE FUNCTION expire_consents()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE consent_records
    SET is_granted = FALSE,
        withdrawn_at = NOW(),
        updated_at = NOW(),
        metadata = metadata || '{"auto_expired": true}'::jsonb
    WHERE is_granted = TRUE
    AND expiry_date IS NOT NULL
    AND expiry_date < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log expired consents
    INSERT INTO audit_trail (
        event_type, actor_id, actor_type, resource_type, resource_id,
        action, risk_level, metadata
    )
    SELECT 
        'consent_change', 'system', 'system', 'consent', id::text,
        'AUTO_EXPIRE', 'low', 
        jsonb_build_object('reason', 'automatic_expiry', 'expired_count', expired_count)
    FROM consent_records 
    WHERE withdrawn_at = NOW() AND metadata ? 'auto_expired';
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check for overdue privacy requests
CREATE OR REPLACE FUNCTION check_overdue_privacy_requests()
RETURNS INTEGER AS $$
DECLARE
    overdue_count INTEGER;
BEGIN
    -- Mark requests as overdue after 30 days (GDPR requirement)
    UPDATE privacy_requests
    SET status = 'expired',
        updated_at = NOW(),
        metadata = metadata || '{"reason": "30_day_limit_exceeded"}'::jsonb
    WHERE status IN ('pending', 'processing')
    AND requested_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS overdue_count = ROW_COUNT;
    
    -- Log overdue requests
    IF overdue_count > 0 THEN
        INSERT INTO audit_trail (
            event_type, actor_id, actor_type, resource_type, resource_id,
            action, risk_level, metadata
        )
        VALUES (
            'privacy_request', 'system', 'system', 'privacy_request', 'multiple',
            'AUTO_EXPIRE', 'medium',
            jsonb_build_object('overdue_count', overdue_count, 'reason', 'gdpr_30_day_limit')
        );
    END IF;
    
    RETURN overdue_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired data exports
CREATE OR REPLACE FUNCTION cleanup_expired_exports()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    DELETE FROM data_exports
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    IF cleanup_count > 0 THEN
        INSERT INTO audit_trail (
            event_type, actor_id, actor_type, resource_type, resource_id,
            action, risk_level, metadata
        )
        VALUES (
            'data_export', 'system', 'system', 'data_export', 'multiple',
            'AUTO_CLEANUP', 'low',
            jsonb_build_object('cleaned_count', cleanup_count)
        );
    END IF;
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Breach notification trigger (must notify within 72 hours)
CREATE OR REPLACE FUNCTION check_breach_notification_deadline()
RETURNS TRIGGER AS $$
BEGIN
    -- If breach was discovered more than 72 hours ago and not yet reported to authorities
    IF NEW.discovered_at < NOW() - INTERVAL '72 hours' 
       AND NEW.authorities_notified_at IS NULL 
       AND NEW.notification_required = TRUE THEN
        
        NEW.notification_72h_met = FALSE;
        
        -- Log compliance violation
        INSERT INTO audit_trail (
            event_type, actor_id, actor_type, resource_type, resource_id,
            action, risk_level, metadata
        )
        VALUES (
            'data_breach', 'system', 'system', 'data_breach', NEW.id::text,
            'COMPLIANCE_VIOLATION', 'critical',
            jsonb_build_object(
                'violation_type', '72_hour_notification_missed',
                'discovery_time', NEW.discovered_at,
                'current_time', NOW()
            )
        );
    ELSE
        NEW.notification_72h_met = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER breach_notification_deadline_check
    BEFORE INSERT OR UPDATE ON data_breach_incidents
    FOR EACH ROW
    EXECUTE FUNCTION check_breach_notification_deadline();

-- Create scheduled jobs for compliance automation
-- Note: These would typically be set up as cron jobs or scheduled functions

COMMENT ON TABLE privacy_requests IS 'GDPR/CCPA data subject requests with 30-day processing requirement';
COMMENT ON TABLE consent_records IS 'Granular consent management with automatic expiry';
COMMENT ON TABLE audit_trail IS 'Tamper-proof audit trail with hash chain integrity';
COMMENT ON TABLE data_processing_records IS 'GDPR Article 30 records of processing activities';
COMMENT ON TABLE privacy_impact_assessments IS 'GDPR Article 35 privacy impact assessments';
COMMENT ON TABLE data_breach_incidents IS 'GDPR Article 33-34 breach incident management';
COMMENT ON TABLE data_exports IS 'Temporary storage for data portability exports';
COMMENT ON TABLE legal_holds IS 'Legal data retention requirements';
COMMENT ON TABLE cross_border_transfers IS 'International data transfer compliance';
COMMENT ON TABLE compliance_monitoring IS 'Automated compliance health checks';

-- Insert initial compliance configuration
INSERT INTO data_processing_records (
    processing_activity, purpose, legal_basis, data_categories, data_subjects,
    retention_period, security_measures
) VALUES 
(
    'Wedding Planning Platform Operation',
    'Providing wedding planning and vendor coordination services',
    'contract',
    ARRAY['personal_identification', 'contact_information', 'wedding_preferences', 'communication_data'],
    ARRAY['wedding_couples', 'wedding_planners', 'vendors'],
    INTERVAL '7 years',
    ARRAY['encryption_at_rest', 'encryption_in_transit', 'access_controls', 'audit_logging']
),
(
    'Customer Support and Communication',
    'Providing customer support and service communications',
    'legitimate_interests',
    ARRAY['contact_information', 'support_interactions', 'communication_preferences'],
    ARRAY['all_users'],
    INTERVAL '3 years',
    ARRAY['access_controls', 'data_minimization', 'purpose_limitation']
),
(
    'Security and Fraud Prevention',
    'Protecting platform security and preventing fraudulent activities',
    'legitimate_interests',
    ARRAY['technical_data', 'usage_patterns', 'security_events'],
    ARRAY['all_users'],
    INTERVAL '1 year',
    ARRAY['pseudonymization', 'access_controls', 'automated_deletion']
);