-- GDPR Round 2: Intelligence & Automation Features
-- WS-149 Team E Batch 12 Round 2: AI-powered data discovery, multi-language privacy management
-- Enhanced enterprise features for intelligent GDPR compliance

-- Document analysis and personal data discovery
CREATE TABLE gdpr.document_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    analysis_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Document metadata
    document_type TEXT NOT NULL,
    document_size_bytes INTEGER,
    language_detected TEXT NOT NULL,
    
    -- Personal data discovery results
    personal_data_found BOOLEAN DEFAULT false,
    data_categories TEXT[] NOT NULL DEFAULT '{}',
    sensitivity_levels JSONB NOT NULL DEFAULT '{}',
    estimated_data_subjects INTEGER DEFAULT 0,
    
    -- AI analysis results
    confidence_scores JSONB NOT NULL DEFAULT '{}',
    extracted_entities JSONB NOT NULL DEFAULT '{}',
    risk_assessment JSONB NOT NULL DEFAULT '{}',
    
    -- Legal basis and retention recommendations
    legal_basis_suggestions JSONB NOT NULL DEFAULT '{}',
    retention_recommendations JSONB NOT NULL DEFAULT '{}',
    
    -- Privacy risk scoring
    privacy_risk_score INTEGER CHECK (privacy_risk_score >= 0 AND privacy_risk_score <= 10),
    compliance_actions_required TEXT[] DEFAULT '{}',
    
    -- Processing record linkage
    processing_record_id UUID REFERENCES gdpr.processing_activities(id),
    automated_policies_applied TEXT[] DEFAULT '{}',
    
    -- Analysis metadata
    analysis_model_version TEXT DEFAULT 'v1.0',
    analysis_duration_ms INTEGER,
    manual_review_required BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES user_profiles(id),
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance risk predictions
CREATE TABLE gdpr.compliance_risk_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    prediction_id TEXT UNIQUE NOT NULL,
    
    -- Prediction parameters
    time_horizon TEXT CHECK (time_horizon IN ('30_days', '90_days', '1_year')) DEFAULT '90_days',
    prediction_generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Risk scoring
    overall_risk_score INTEGER CHECK (overall_risk_score >= 0 AND overall_risk_score <= 10),
    risk_categories JSONB NOT NULL DEFAULT '{}',
    
    -- Predicted issues
    predicted_issues JSONB NOT NULL DEFAULT '[]',
    issue_probabilities JSONB NOT NULL DEFAULT '{}',
    
    -- Mitigation and monitoring
    mitigation_plan JSONB NOT NULL DEFAULT '{}',
    monitoring_rules_created INTEGER DEFAULT 0,
    automated_alerts_configured INTEGER DEFAULT 0,
    
    -- Historical data references
    historical_data_analyzed INTEGER DEFAULT 0,
    regulatory_changes_considered JSONB DEFAULT '[]',
    
    -- Review scheduling
    next_review_recommended TIMESTAMPTZ,
    confidence_level DECIMAL(3,2) CHECK (confidence_level >= 0 AND confidence_level <= 1),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Localized privacy notices
CREATE TABLE gdpr.localized_privacy_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_notice_id TEXT NOT NULL,
    notice_version INTEGER DEFAULT 1,
    
    -- Localization details
    target_locale TEXT NOT NULL,
    target_language TEXT NOT NULL,
    target_country TEXT NOT NULL,
    cultural_context TEXT,
    
    -- Legal framework
    applicable_framework TEXT NOT NULL,
    framework_version TEXT,
    legal_validation_status BOOLEAN DEFAULT false,
    compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 10),
    
    -- Localized content
    localized_content JSONB NOT NULL,
    cultural_adaptations TEXT[] DEFAULT '{}',
    consent_mechanisms JSONB NOT NULL DEFAULT '[]',
    
    -- Quality metrics
    readability_score DECIMAL(3,1) CHECK (readability_score >= 0 AND readability_score <= 10),
    translation_quality_score DECIMAL(3,1),
    legal_accuracy_verified BOOLEAN DEFAULT false,
    
    -- Validation and approval
    validated_by UUID REFERENCES user_profiles(id),
    validated_at TIMESTAMPTZ,
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    
    -- Lifecycle management
    status TEXT CHECK (status IN ('draft', 'translated', 'validated', 'approved', 'published', 'expired')) DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(base_notice_id, target_locale, notice_version)
);

-- Cultural consent optimization
CREATE TABLE gdpr.cultural_consent_optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    consent_request_id TEXT NOT NULL,
    
    -- Cultural profiling
    cultural_profile JSONB NOT NULL,
    cultural_region TEXT,
    privacy_expectations TEXT,
    communication_preferences JSONB,
    
    -- Optimization results
    optimized_presentation JSONB NOT NULL,
    expected_success_rate DECIMAL(3,2) CHECK (expected_success_rate >= 0 AND expected_success_rate <= 1),
    consent_fatigue_risk DECIMAL(3,2) CHECK (consent_fatigue_risk >= 0 AND consent_fatigue_risk <= 1),
    
    -- A/B testing
    ab_test_variant_id TEXT,
    ab_test_group TEXT,
    control_group BOOLEAN DEFAULT false,
    
    -- Results tracking
    consent_given BOOLEAN,
    consent_given_at TIMESTAMPTZ,
    time_to_consent_seconds INTEGER,
    interactions_before_consent INTEGER DEFAULT 0,
    
    -- Compliance notes
    compliance_justification TEXT,
    cultural_risk_factors TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated Privacy Impact Assessments
CREATE TABLE gdpr.automated_pia_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pia_reference_id TEXT UNIQUE NOT NULL,
    processing_activity_id UUID REFERENCES gdpr.processing_activities(id),
    organization_id UUID REFERENCES organizations(id),
    
    -- PIA trigger information
    pia_triggered_reason TEXT[] NOT NULL,
    automation_level TEXT CHECK (automation_level IN ('fully_automated', 'semi_automated', 'manual_review_required')) DEFAULT 'fully_automated',
    
    -- Risk assessment
    automated_risk_assessment JSONB NOT NULL,
    identified_risks JSONB NOT NULL DEFAULT '[]',
    risk_categories JSONB NOT NULL DEFAULT '{}',
    overall_risk_level INTEGER CHECK (overall_risk_level >= 0 AND overall_risk_level <= 10),
    
    -- Mitigation planning
    mitigation_plan JSONB NOT NULL DEFAULT '{}',
    technical_measures TEXT[] DEFAULT '{}',
    organizational_measures TEXT[] DEFAULT '{}',
    implementation_timeline TEXT,
    
    -- Residual risk assessment
    residual_risk_assessment JSONB NOT NULL DEFAULT '{}',
    residual_risk_level INTEGER CHECK (residual_risk_level >= 0 AND residual_risk_level <= 10),
    risk_acceptability TEXT CHECK (risk_acceptability IN ('acceptable', 'requires_additional_measures', 'unacceptable')),
    
    -- Consultation requirements
    consultation_requirements JSONB DEFAULT '{}',
    stakeholder_consultation_required BOOLEAN DEFAULT false,
    data_subject_consultation_required BOOLEAN DEFAULT false,
    
    -- Monitoring and review
    monitoring_schedule JSONB NOT NULL DEFAULT '{}',
    next_review_due TIMESTAMPTZ,
    monitoring_frequency TEXT,
    
    -- Approval workflow
    dpo_review_required BOOLEAN DEFAULT false,
    dpo_reviewed_by UUID REFERENCES user_profiles(id),
    dpo_reviewed_at TIMESTAMPTZ,
    supervisory_authority_consultation BOOLEAN DEFAULT false,
    
    -- Status and lifecycle
    status TEXT CHECK (status IN ('generated', 'under_review', 'approved', 'requires_updates', 'rejected')) DEFAULT 'generated',
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-border compliance management
CREATE TABLE gdpr.cross_border_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id TEXT UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    
    -- Transfer details
    source_country TEXT NOT NULL,
    destination_country TEXT NOT NULL,
    data_categories TEXT[] NOT NULL,
    transfer_purpose TEXT NOT NULL,
    estimated_data_volume BIGINT DEFAULT 0,
    transfer_frequency TEXT,
    
    -- Adequacy assessment
    adequacy_decision_status TEXT CHECK (adequacy_decision_status IN ('adequate', 'not_adequate', 'under_review', 'withdrawn')),
    adequacy_valid_until TIMESTAMPTZ,
    adequacy_restrictions TEXT[] DEFAULT '{}',
    
    -- Transfer mechanisms
    transfer_mechanism TEXT NOT NULL,
    safeguards_implemented TEXT[] DEFAULT '{}',
    transfer_documentation JSONB DEFAULT '{}',
    
    -- Risk assessment
    transfer_risk_assessment JSONB NOT NULL DEFAULT '{}',
    overall_risk_score INTEGER CHECK (overall_risk_score >= 0 AND overall_risk_score <= 10),
    specific_risks TEXT[] DEFAULT '{}',
    mitigation_status TEXT CHECK (mitigation_status IN ('adequate', 'requires_improvement', 'insufficient')),
    
    -- Compliance monitoring
    monitoring_rules JSONB DEFAULT '{}',
    compliance_monitoring_frequency TEXT DEFAULT 'monthly',
    last_monitored_at TIMESTAMPTZ,
    monitoring_alerts_configured BOOLEAN DEFAULT false,
    
    -- Approvals and costs
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    estimated_compliance_cost DECIMAL(10,2),
    actual_compliance_cost DECIMAL(10,2),
    
    -- Review scheduling
    next_review_date TIMESTAMPTZ,
    review_frequency TEXT DEFAULT 'annual',
    
    -- Status tracking
    status TEXT CHECK (status IN ('active', 'suspended', 'terminated', 'under_review')) DEFAULT 'active',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-jurisdiction compliance monitoring
CREATE TABLE gdpr.multi_jurisdiction_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    monitoring_date TIMESTAMPTZ DEFAULT NOW(),
    
    -- Monitoring scope
    jurisdictions_monitored TEXT[] NOT NULL,
    frameworks_assessed TEXT[] NOT NULL,
    
    -- Overall compliance status
    overall_compliance_score DECIMAL(3,1) CHECK (overall_compliance_score >= 0 AND overall_compliance_score <= 10),
    compliance_trend TEXT CHECK (compliance_trend IN ('improving', 'stable', 'declining')),
    
    -- Detailed status information
    status_data JSONB NOT NULL DEFAULT '{}',
    
    -- Conflicts and harmonization
    conflicts_identified INTEGER DEFAULT 0,
    conflict_severity_breakdown JSONB DEFAULT '{}',
    harmonization_strategy JSONB DEFAULT '{}',
    
    -- Priority actions
    priority_actions TEXT[] DEFAULT '{}',
    high_risk_jurisdictions TEXT[] DEFAULT '{}',
    remediation_timeline TEXT,
    
    -- Review scheduling
    next_review_date TIMESTAMPTZ,
    monitoring_frequency TEXT DEFAULT 'quarterly',
    
    -- Alerts and notifications
    alerts_generated INTEGER DEFAULT 0,
    notifications_sent INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated monitoring rules and alerts
CREATE TABLE gdpr.automated_monitoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id TEXT UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    
    -- Rule definition
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('consent_expiry', 'retention_policy', 'transfer_monitoring', 'breach_detection', 'compliance_gap')),
    
    -- Conditions and triggers
    trigger_conditions JSONB NOT NULL,
    monitoring_frequency TEXT DEFAULT 'daily',
    threshold_values JSONB DEFAULT '{}',
    
    -- Actions
    alert_actions JSONB NOT NULL DEFAULT '[]',
    automated_remediation JSONB DEFAULT '{}',
    notification_recipients UUID[] DEFAULT '{}',
    
    -- Status and performance
    active BOOLEAN DEFAULT true,
    last_executed TIMESTAMPTZ,
    execution_count INTEGER DEFAULT 0,
    alerts_generated INTEGER DEFAULT 0,
    false_positive_count INTEGER DEFAULT 0,
    
    -- Machine learning optimization
    ml_model_version TEXT,
    confidence_threshold DECIMAL(3,2) DEFAULT 0.80,
    learning_enabled BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Privacy notice templates for different cultures/languages
CREATE TABLE gdpr.privacy_notice_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id TEXT UNIQUE NOT NULL,
    template_name TEXT NOT NULL,
    
    -- Template scope
    applicable_languages TEXT[] NOT NULL,
    cultural_contexts TEXT[] DEFAULT '{}',
    industry_focus TEXT[] DEFAULT '{}',
    
    -- Template content
    template_structure JSONB NOT NULL,
    required_sections TEXT[] NOT NULL,
    optional_sections TEXT[] DEFAULT '{}',
    cultural_adaptations JSONB DEFAULT '{}',
    
    -- Compliance metadata
    legal_frameworks TEXT[] NOT NULL,
    compliance_validated BOOLEAN DEFAULT false,
    last_legal_review TIMESTAMPTZ,
    review_frequency INTERVAL DEFAULT INTERVAL '12 months',
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    organizations_using UUID[] DEFAULT '{}',
    average_compliance_score DECIMAL(3,1),
    
    -- Version control
    template_version INTEGER DEFAULT 1,
    parent_template_id UUID REFERENCES gdpr.privacy_notice_templates(id),
    
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_document_analysis_org ON gdpr.document_analysis_results(organization_id);
CREATE INDEX idx_document_analysis_timestamp ON gdpr.document_analysis_results(analysis_timestamp);
CREATE INDEX idx_document_analysis_risk_score ON gdpr.document_analysis_results(privacy_risk_score);
CREATE INDEX idx_document_analysis_data_found ON gdpr.document_analysis_results(personal_data_found);

CREATE INDEX idx_risk_predictions_org ON gdpr.compliance_risk_predictions(organization_id);
CREATE INDEX idx_risk_predictions_horizon ON gdpr.compliance_risk_predictions(time_horizon);
CREATE INDEX idx_risk_predictions_score ON gdpr.compliance_risk_predictions(overall_risk_score);
CREATE INDEX idx_risk_predictions_next_review ON gdpr.compliance_risk_predictions(next_review_recommended);

CREATE INDEX idx_localized_notices_base ON gdpr.localized_privacy_notices(base_notice_id);
CREATE INDEX idx_localized_notices_language ON gdpr.localized_privacy_notices(target_language);
CREATE INDEX idx_localized_notices_status ON gdpr.localized_privacy_notices(status);
CREATE INDEX idx_localized_notices_expires ON gdpr.localized_privacy_notices(expires_at);

CREATE INDEX idx_cultural_consent_user ON gdpr.cultural_consent_optimizations(user_id);
CREATE INDEX idx_cultural_consent_request ON gdpr.cultural_consent_optimizations(consent_request_id);
CREATE INDEX idx_cultural_consent_success ON gdpr.cultural_consent_optimizations(expected_success_rate);

CREATE INDEX idx_automated_pia_org ON gdpr.automated_pia_results(organization_id);
CREATE INDEX idx_automated_pia_activity ON gdpr.automated_pia_results(processing_activity_id);
CREATE INDEX idx_automated_pia_risk ON gdpr.automated_pia_results(overall_risk_level);
CREATE INDEX idx_automated_pia_status ON gdpr.automated_pia_results(status);
CREATE INDEX idx_automated_pia_review_due ON gdpr.automated_pia_results(next_review_due);

CREATE INDEX idx_cross_border_org ON gdpr.cross_border_compliance(organization_id);
CREATE INDEX idx_cross_border_countries ON gdpr.cross_border_compliance(source_country, destination_country);
CREATE INDEX idx_cross_border_mechanism ON gdpr.cross_border_compliance(transfer_mechanism);
CREATE INDEX idx_cross_border_status ON gdpr.cross_border_compliance(status);
CREATE INDEX idx_cross_border_review ON gdpr.cross_border_compliance(next_review_date);

CREATE INDEX idx_multi_jurisdiction_org ON gdpr.multi_jurisdiction_compliance(organization_id);
CREATE INDEX idx_multi_jurisdiction_date ON gdpr.multi_jurisdiction_compliance(monitoring_date);
CREATE INDEX idx_multi_jurisdiction_score ON gdpr.multi_jurisdiction_compliance(overall_compliance_score);

CREATE INDEX idx_monitoring_rules_org ON gdpr.automated_monitoring_rules(organization_id);
CREATE INDEX idx_monitoring_rules_type ON gdpr.automated_monitoring_rules(rule_type);
CREATE INDEX idx_monitoring_rules_active ON gdpr.automated_monitoring_rules(active);
CREATE INDEX idx_monitoring_rules_last_executed ON gdpr.automated_monitoring_rules(last_executed);

CREATE INDEX idx_notice_templates_languages ON gdpr.privacy_notice_templates USING GIN(applicable_languages);
CREATE INDEX idx_notice_templates_frameworks ON gdpr.privacy_notice_templates USING GIN(legal_frameworks);
CREATE INDEX idx_notice_templates_active ON gdpr.privacy_notice_templates(active);

-- Enable Row Level Security
ALTER TABLE gdpr.document_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.compliance_risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.localized_privacy_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.cultural_consent_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.automated_pia_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.cross_border_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.multi_jurisdiction_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.automated_monitoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.privacy_notice_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization-scoped data
CREATE POLICY "Organizations can access own document analysis" ON gdpr.document_analysis_results
    FOR ALL USING (
        organization_id = (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'dpo', 'privacy_officer')
        )
    );

CREATE POLICY "Organizations can access own risk predictions" ON gdpr.compliance_risk_predictions
    FOR ALL USING (
        organization_id = (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'dpo', 'privacy_officer')
        )
    );

CREATE POLICY "Privacy officers can manage localized notices" ON gdpr.localized_privacy_notices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'dpo', 'privacy_officer', 'content_manager')
        )
    );

CREATE POLICY "Users can view own consent optimizations" ON gdpr.cultural_consent_optimizations
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'dpo', 'privacy_officer')
        )
    );

CREATE POLICY "Organizations can access own PIA results" ON gdpr.automated_pia_results
    FOR ALL USING (
        organization_id = (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid() 
            AND up.role IN ('admin', 'dpo', 'privacy_officer')
        )
    );

-- Functions for automated compliance monitoring

-- Function to generate prediction IDs
CREATE OR REPLACE FUNCTION gdpr.generate_prediction_id(org_id UUID, time_horizon TEXT)
RETURNS TEXT AS $$
DECLARE
    year TEXT;
    month TEXT;
    sequence_num INTEGER;
BEGIN
    year := TO_CHAR(NOW(), 'YYYY');
    month := TO_CHAR(NOW(), 'MM');
    
    SELECT COUNT(*) + 1 INTO sequence_num
    FROM gdpr.compliance_risk_predictions
    WHERE organization_id = org_id 
    AND EXTRACT(YEAR FROM prediction_generated_at) = EXTRACT(YEAR FROM NOW())
    AND EXTRACT(MONTH FROM prediction_generated_at) = EXTRACT(MONTH FROM NOW());
    
    RETURN 'PRED-' || year || month || '-' || LPAD(sequence_num::TEXT, 3, '0') || '-' || UPPER(SUBSTRING(time_horizon FROM 1 FOR 2));
END;
$$ LANGUAGE plpgsql;

-- Function to assess document risk level
CREATE OR REPLACE FUNCTION gdpr.assess_document_risk(
    data_categories TEXT[],
    sensitivity_levels JSONB,
    data_subject_count INTEGER
) RETURNS INTEGER AS $$
DECLARE
    risk_score INTEGER := 0;
    max_sensitivity INTEGER := 0;
    category TEXT;
BEGIN
    -- Base risk from data categories
    FOREACH category IN ARRAY data_categories
    LOOP
        CASE category
            WHEN 'financial_data', 'health_data', 'biometric_data' THEN risk_score := risk_score + 3;
            WHEN 'identity_data', 'location_data' THEN risk_score := risk_score + 2;
            WHEN 'contact_data', 'demographic_data' THEN risk_score := risk_score + 1;
            ELSE risk_score := risk_score + 0;
        END CASE;
    END LOOP;
    
    -- Add sensitivity multiplier
    SELECT COALESCE(MAX((value->>'sensitivity')::INTEGER), 0) INTO max_sensitivity
    FROM jsonb_each(sensitivity_levels);
    
    risk_score := risk_score + (max_sensitivity / 2);
    
    -- Volume multiplier
    IF data_subject_count > 1000 THEN
        risk_score := risk_score + 2;
    ELSIF data_subject_count > 100 THEN
        risk_score := risk_score + 1;
    END IF;
    
    RETURN LEAST(10, GREATEST(0, risk_score));
END;
$$ LANGUAGE plpgsql;

-- Function to calculate compliance trend
CREATE OR REPLACE FUNCTION gdpr.calculate_compliance_trend(org_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_score DECIMAL;
    previous_score DECIMAL;
    trend TEXT;
BEGIN
    -- Get current score
    SELECT overall_compliance_score INTO current_score
    FROM gdpr.multi_jurisdiction_compliance
    WHERE organization_id = org_id
    ORDER BY monitoring_date DESC
    LIMIT 1;
    
    -- Get previous score
    SELECT overall_compliance_score INTO previous_score
    FROM gdpr.multi_jurisdiction_compliance
    WHERE organization_id = org_id
    ORDER BY monitoring_date DESC
    OFFSET 1 LIMIT 1;
    
    IF previous_score IS NULL THEN
        RETURN 'stable';
    END IF;
    
    IF current_score > previous_score + 0.5 THEN
        trend := 'improving';
    ELSIF current_score < previous_score - 0.5 THEN
        trend := 'declining';
    ELSE
        trend := 'stable';
    END IF;
    
    RETURN trend;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic ID generation and updates
CREATE OR REPLACE FUNCTION gdpr.auto_generate_prediction_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.prediction_id IS NULL THEN
        NEW.prediction_id := gdpr.generate_prediction_id(NEW.organization_id, NEW.time_horizon);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_prediction_id_trigger
    BEFORE INSERT ON gdpr.compliance_risk_predictions
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.auto_generate_prediction_id();

-- Trigger to calculate document risk automatically
CREATE OR REPLACE FUNCTION gdpr.auto_calculate_document_risk()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.privacy_risk_score IS NULL THEN
        NEW.privacy_risk_score := gdpr.assess_document_risk(
            NEW.data_categories,
            NEW.sensitivity_levels,
            NEW.estimated_data_subjects
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_document_risk_trigger
    BEFORE INSERT OR UPDATE ON gdpr.document_analysis_results
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.auto_calculate_document_risk();

-- Trigger to update compliance trend
CREATE OR REPLACE FUNCTION gdpr.auto_update_compliance_trend()
RETURNS TRIGGER AS $$
BEGIN
    NEW.compliance_trend := gdpr.calculate_compliance_trend(NEW.organization_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_compliance_trend_trigger
    BEFORE INSERT OR UPDATE ON gdpr.multi_jurisdiction_compliance
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.auto_update_compliance_trend();

-- Create updated_at triggers for new tables
CREATE TRIGGER update_document_analysis_updated_at
    BEFORE UPDATE ON gdpr.document_analysis_results
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.update_updated_at();

CREATE TRIGGER update_risk_predictions_updated_at
    BEFORE UPDATE ON gdpr.compliance_risk_predictions
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.update_updated_at();

CREATE TRIGGER update_localized_notices_updated_at
    BEFORE UPDATE ON gdpr.localized_privacy_notices
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.update_updated_at();

CREATE TRIGGER update_cultural_consent_updated_at
    BEFORE UPDATE ON gdpr.cultural_consent_optimizations
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.update_updated_at();

CREATE TRIGGER update_automated_pia_updated_at
    BEFORE UPDATE ON gdpr.automated_pia_results
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.update_updated_at();

CREATE TRIGGER update_cross_border_updated_at
    BEFORE UPDATE ON gdpr.cross_border_compliance
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.update_updated_at();

CREATE TRIGGER update_multi_jurisdiction_updated_at
    BEFORE UPDATE ON gdpr.multi_jurisdiction_compliance
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.update_updated_at();

CREATE TRIGGER update_monitoring_rules_updated_at
    BEFORE UPDATE ON gdpr.automated_monitoring_rules
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.update_updated_at();

CREATE TRIGGER update_notice_templates_updated_at
    BEFORE UPDATE ON gdpr.privacy_notice_templates
    FOR EACH ROW
    EXECUTE FUNCTION gdpr.update_updated_at();