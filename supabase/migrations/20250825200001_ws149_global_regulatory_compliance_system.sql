-- WS-149 GDPR Compliance System - Global Regulatory Framework Tracking
-- Team E Batch 12 Round 3 Implementation
-- Migration for comprehensive regulatory excellence and future-proofing

-- Global regulatory framework tracking
CREATE TABLE IF NOT EXISTS gdpr.global_regulatory_frameworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework_name TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    framework_type TEXT NOT NULL CHECK (framework_type IN ('comprehensive', 'sectoral', 'self_regulatory')),
    effective_date DATE NOT NULL,
    last_updated DATE NOT NULL,
    extraterritorial_scope BOOLEAN DEFAULT false,
    enforcement_authority TEXT NOT NULL,
    penalty_structure JSONB NOT NULL,
    key_requirements JSONB NOT NULL,
    compatibility_matrix JSONB, -- Compatibility with other frameworks
    monitoring_url TEXT,
    regulatory_guidance_urls TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certification tracking and management
CREATE TABLE IF NOT EXISTS gdpr.privacy_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    certification_type TEXT NOT NULL,
    certification_body TEXT NOT NULL,
    certification_scope TEXT NOT NULL,
    certification_level TEXT,
    audit_date DATE NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    certificate_number TEXT UNIQUE NOT NULL,
    audit_findings JSONB NOT NULL,
    corrective_actions JSONB,
    surveillance_schedule JSONB,
    certification_status TEXT DEFAULT 'active' CHECK (
        certification_status IN ('active', 'suspended', 'withdrawn', 'expired')
    ),
    annual_review_due DATE,
    next_surveillance_due DATE,
    recertification_due DATE,
    certificate_file_path TEXT,
    auditor_name TEXT,
    auditor_qualifications JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regulatory change impact tracking
CREATE TABLE IF NOT EXISTS gdpr.regulatory_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_id TEXT UNIQUE NOT NULL,
    regulatory_framework_id UUID REFERENCES gdpr.global_regulatory_frameworks(id),
    change_type TEXT NOT NULL CHECK (change_type IN (
        'new_regulation', 'amendment', 'guidance_update', 'enforcement_change',
        'court_ruling', 'supervisory_decision', 'standard_update'
    )),
    change_title TEXT NOT NULL,
    change_description TEXT NOT NULL,
    change_summary TEXT NOT NULL,
    effective_date DATE,
    implementation_deadline DATE,
    impact_assessment JSONB NOT NULL,
    affected_organizations TEXT[] DEFAULT '{}',
    required_actions JSONB NOT NULL,
    implementation_guidance TEXT,
    compliance_cost_estimate DECIMAL(15,2),
    change_source TEXT NOT NULL,
    source_url TEXT,
    monitoring_status TEXT DEFAULT 'identified' CHECK (
        monitoring_status IN ('identified', 'assessed', 'planning', 'implementing', 'completed')
    ),
    impact_level TEXT NOT NULL CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    urgency_level TEXT NOT NULL CHECK (urgency_level IN ('low', 'medium', 'high', 'immediate')),
    stakeholder_notifications_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Litigation and regulatory defense preparation
CREATE TABLE IF NOT EXISTS gdpr.litigation_preparation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id TEXT UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    case_type TEXT NOT NULL CHECK (case_type IN (
        'regulatory_investigation', 'data_protection_violation', 'class_action',
        'individual_claim', 'cross_border_dispute', 'regulatory_enforcement'
    )),
    case_status TEXT DEFAULT 'preparation' CHECK (
        case_status IN ('preparation', 'active', 'settlement', 'resolved', 'appealed')
    ),
    case_description TEXT NOT NULL,
    legal_basis_alleged TEXT,
    potential_penalties DECIMAL(15,2),
    evidence_preservation_order JSONB NOT NULL,
    compliance_defense_strategy JSONB NOT NULL,
    expert_witnesses JSONB,
    mitigating_factors JSONB NOT NULL,
    defense_documentation JSONB NOT NULL,
    legal_counsel JSONB,
    case_timeline JSONB NOT NULL,
    settlement_options JSONB,
    regulatory_communications JSONB,
    case_initiated_date DATE,
    expected_resolution_date DATE,
    actual_resolution_date DATE,
    case_outcome TEXT,
    lessons_learned TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emerging privacy technology tracking
CREATE TABLE IF NOT EXISTS gdpr.emerging_privacy_technologies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technology_name TEXT NOT NULL,
    technology_category TEXT NOT NULL,
    maturity_level TEXT NOT NULL CHECK (
        maturity_level IN ('research', 'prototype', 'early_adoption', 'mainstream', 'deprecated')
    ),
    privacy_benefits TEXT[] NOT NULL,
    implementation_complexity TEXT NOT NULL CHECK (
        implementation_complexity IN ('low', 'medium', 'high', 'very_high')
    ),
    regulatory_acceptance TEXT NOT NULL CHECK (
        regulatory_acceptance IN ('unknown', 'emerging', 'accepted', 'mandated', 'deprecated')
    ),
    use_cases JSONB NOT NULL,
    implementation_cost_estimate DECIMAL(15,2),
    roi_estimate DECIMAL(5,2),
    vendor_ecosystem JSONB,
    standards_compliance JSONB,
    pilot_opportunities JSONB,
    risk_assessment JSONB NOT NULL,
    adoption_timeline JSONB,
    competitive_advantage_score INTEGER CHECK (competitive_advantage_score BETWEEN 0 AND 100),
    technology_readiness_level INTEGER CHECK (technology_readiness_level BETWEEN 1 AND 9),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global privacy orchestration scenarios and results
CREATE TABLE IF NOT EXISTS gdpr.global_processing_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_name TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    scenario_description TEXT NOT NULL,
    data_subjects JSONB NOT NULL, -- primary_locations, data_categories, estimated_count, vulnerable_groups
    processing_activities JSONB NOT NULL, -- purposes, legal_bases, processing_locations, etc.
    technology_stack JSONB NOT NULL, -- data_storage_locations, processing_technologies, ai_ml_components
    business_context JSONB NOT NULL, -- industry_sector, service_types, revenue_model
    scenario_status TEXT DEFAULT 'active' CHECK (
        scenario_status IN ('active', 'inactive', 'archived')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global privacy compliance results
CREATE TABLE IF NOT EXISTS gdpr.global_compliance_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID REFERENCES gdpr.global_processing_scenarios(id),
    applicable_frameworks JSONB NOT NULL,
    harmonized_strategy JSONB NOT NULL,
    jurisdiction_implementations JSONB NOT NULL,
    conflict_resolutions_applied JSONB NOT NULL,
    compliance_documentation JSONB NOT NULL,
    global_monitoring JSONB NOT NULL,
    certification_readiness JSONB NOT NULL,
    implementation_timeline JSONB NOT NULL,
    ongoing_monitoring_requirements JSONB NOT NULL,
    estimated_compliance_cost DECIMAL(15,2) NOT NULL,
    risk_mitigation_plan JSONB NOT NULL,
    result_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forensic privacy logging for litigation readiness
CREATE TABLE IF NOT EXISTS gdpr.forensic_privacy_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    event_type TEXT NOT NULL,
    user_id UUID,
    data_subject_id UUID,
    action_performed TEXT NOT NULL,
    data_categories_affected TEXT[] NOT NULL,
    legal_basis TEXT,
    processing_purpose TEXT,
    system_context TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    event_hash TEXT NOT NULL,
    chain_of_custody JSONB NOT NULL,
    retention_until DATE NOT NULL,
    tamper_evident BOOLEAN DEFAULT true,
    forensic_metadata JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence preservation tracking
CREATE TABLE IF NOT EXISTS gdpr.evidence_preservation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preservation_id TEXT UNIQUE NOT NULL,
    case_id TEXT REFERENCES gdpr.litigation_preparation(case_id),
    preservation_scope TEXT NOT NULL,
    legal_hold_active BOOLEAN DEFAULT true,
    forensic_copies_created BOOLEAN DEFAULT false,
    chain_of_custody_established BOOLEAN DEFAULT false,
    evidence_categories_preserved TEXT[] NOT NULL,
    preservation_start_date TIMESTAMPTZ NOT NULL,
    retention_period TEXT NOT NULL,
    custodial_procedures TEXT[] NOT NULL,
    tamper_evidence BOOLEAN DEFAULT true,
    cryptographic_verification BOOLEAN DEFAULT true,
    preservation_status TEXT DEFAULT 'active' CHECK (
        preservation_status IN ('active', 'completed', 'terminated')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expert witness network and recommendations
CREATE TABLE IF NOT EXISTS gdpr.expert_witnesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_name TEXT NOT NULL,
    expertise_areas TEXT[] NOT NULL,
    litigation_experience INTEGER NOT NULL, -- years
    regulatory_experience INTEGER NOT NULL, -- years
    industry_experience INTEGER NOT NULL, -- years
    jurisdictional_experience TEXT[] NOT NULL,
    notable_cases TEXT[],
    daily_rate DECIMAL(10,2) NOT NULL,
    estimated_days_required INTEGER,
    availability TEXT NOT NULL,
    credibility_score INTEGER CHECK (credibility_score BETWEEN 0 AND 100),
    contact_information JSONB,
    qualifications JSONB NOT NULL,
    case_assignments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regulatory relationship management
CREATE TABLE IF NOT EXISTS gdpr.regulatory_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    regulatory_authority TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    relationship_type TEXT NOT NULL CHECK (
        relationship_type IN ('formal', 'informal', 'cooperative', 'adversarial')
    ),
    primary_contact_person TEXT,
    engagement_history JSONB DEFAULT '[]',
    communication_protocols JSONB NOT NULL,
    last_interaction_date DATE,
    next_scheduled_interaction DATE,
    relationship_status TEXT DEFAULT 'active' CHECK (
        relationship_status IN ('active', 'inactive', 'under_review')
    ),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance monitoring and alerting
CREATE TABLE IF NOT EXISTS gdpr.compliance_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    monitoring_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    threshold_value DECIMAL(10,2) NOT NULL,
    threshold_type TEXT NOT NULL CHECK (threshold_type IN ('minimum', 'maximum', 'target')),
    measurement_timestamp TIMESTAMPTZ NOT NULL,
    compliance_status TEXT NOT NULL CHECK (
        compliance_status IN ('compliant', 'non_compliant', 'warning', 'unknown')
    ),
    alert_generated BOOLEAN DEFAULT false,
    alert_severity TEXT CHECK (alert_severity IN ('low', 'medium', 'high', 'critical')),
    remediation_required BOOLEAN DEFAULT false,
    remediation_actions JSONB,
    monitoring_frequency TEXT NOT NULL,
    data_source TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certification readiness assessments
CREATE TABLE IF NOT EXISTS gdpr.certification_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    certification_type TEXT NOT NULL,
    assessment_date DATE NOT NULL,
    overall_readiness_score INTEGER CHECK (overall_readiness_score BETWEEN 0 AND 100),
    control_areas_assessed JSONB NOT NULL,
    gaps_identified JSONB NOT NULL,
    remediation_plan JSONB NOT NULL,
    estimated_certification_timeline_months INTEGER,
    assessor_name TEXT,
    assessment_methodology TEXT,
    evidence_collected JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    next_assessment_due DATE,
    assessment_status TEXT DEFAULT 'completed' CHECK (
        assessment_status IN ('in_progress', 'completed', 'pending_review')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_regulatory_frameworks_jurisdiction ON gdpr.global_regulatory_frameworks(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_regulatory_frameworks_type ON gdpr.global_regulatory_frameworks(framework_type);
CREATE INDEX IF NOT EXISTS idx_privacy_certifications_org ON gdpr.privacy_certifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_privacy_certifications_status ON gdpr.privacy_certifications(certification_status);
CREATE INDEX IF NOT EXISTS idx_privacy_certifications_expiry ON gdpr.privacy_certifications(expiry_date);
CREATE INDEX IF NOT EXISTS idx_regulatory_changes_impact ON gdpr.regulatory_changes(impact_level);
CREATE INDEX IF NOT EXISTS idx_regulatory_changes_urgency ON gdpr.regulatory_changes(urgency_level);
CREATE INDEX IF NOT EXISTS idx_regulatory_changes_status ON gdpr.regulatory_changes(monitoring_status);
CREATE INDEX IF NOT EXISTS idx_litigation_prep_org ON gdpr.litigation_preparation(organization_id);
CREATE INDEX IF NOT EXISTS idx_litigation_prep_status ON gdpr.litigation_preparation(case_status);
CREATE INDEX IF NOT EXISTS idx_forensic_logs_timestamp ON gdpr.forensic_privacy_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_forensic_logs_event_type ON gdpr.forensic_privacy_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_forensic_logs_user ON gdpr.forensic_privacy_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_evidence_preservation_case ON gdpr.evidence_preservation(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_preservation_status ON gdpr.evidence_preservation(preservation_status);
CREATE INDEX IF NOT EXISTS idx_expert_witnesses_expertise ON gdpr.expert_witnesses USING gin(expertise_areas);
CREATE INDEX IF NOT EXISTS idx_expert_witnesses_jurisdiction ON gdpr.expert_witnesses USING gin(jurisdictional_experience);
CREATE INDEX IF NOT EXISTS idx_regulatory_relationships_org ON gdpr.regulatory_relationships(organization_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_relationships_authority ON gdpr.regulatory_relationships(regulatory_authority);
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_org ON gdpr.compliance_monitoring(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_status ON gdpr.compliance_monitoring(compliance_status);
CREATE INDEX IF NOT EXISTS idx_compliance_monitoring_timestamp ON gdpr.compliance_monitoring(measurement_timestamp);
CREATE INDEX IF NOT EXISTS idx_certification_assessments_org ON gdpr.certification_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_certification_assessments_type ON gdpr.certification_assessments(certification_type);

-- Create updated_at triggers for tables that need them
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_global_regulatory_frameworks_updated_at BEFORE UPDATE ON gdpr.global_regulatory_frameworks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_privacy_certifications_updated_at BEFORE UPDATE ON gdpr.privacy_certifications FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_regulatory_changes_updated_at BEFORE UPDATE ON gdpr.regulatory_changes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_litigation_preparation_updated_at BEFORE UPDATE ON gdpr.litigation_preparation FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_emerging_privacy_technologies_updated_at BEFORE UPDATE ON gdpr.emerging_privacy_technologies FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_global_processing_scenarios_updated_at BEFORE UPDATE ON gdpr.global_processing_scenarios FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_evidence_preservation_updated_at BEFORE UPDATE ON gdpr.evidence_preservation FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_expert_witnesses_updated_at BEFORE UPDATE ON gdpr.expert_witnesses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_regulatory_relationships_updated_at BEFORE UPDATE ON gdpr.regulatory_relationships FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_certification_assessments_updated_at BEFORE UPDATE ON gdpr.certification_assessments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert sample regulatory frameworks
INSERT INTO gdpr.global_regulatory_frameworks (
    framework_name,
    jurisdiction,
    framework_type,
    effective_date,
    last_updated,
    extraterritorial_scope,
    enforcement_authority,
    penalty_structure,
    key_requirements
) VALUES 
(
    'GDPR',
    'european_union',
    'comprehensive',
    '2018-05-25',
    '2024-01-01',
    true,
    'Data Protection Authorities',
    '{"max_fine_percentage": 4, "max_fine_amount": 20000000, "currency": "EUR", "administrative_fines": true, "criminal_penalties": false}',
    '{"consent_requirements": true, "data_subject_rights": true, "data_protection_by_design": true, "dpo_requirements": true, "breach_notification": true}'
),
(
    'CPRA',
    'california',
    'comprehensive',
    '2023-01-01',
    '2024-01-01',
    false,
    'California Privacy Protection Agency',
    '{"max_fine_amount": 7500, "currency": "USD", "administrative_fines": true, "criminal_penalties": false}',
    '{"consumer_rights": true, "opt_out_requirements": true, "sensitive_data_protections": true, "risk_assessments": true}'
),
(
    'LGPD',
    'brazil',
    'comprehensive',
    '2020-09-18',
    '2023-08-01',
    false,
    'ANPD',
    '{"max_fine_percentage": 2, "currency": "BRL", "administrative_fines": true, "criminal_penalties": false}',
    '{"consent_requirements": true, "data_subject_rights": true, "impact_assessments": true, "dpo_requirements": true}'
);

-- Insert sample emerging privacy technologies
INSERT INTO gdpr.emerging_privacy_technologies (
    technology_name,
    technology_category,
    maturity_level,
    privacy_benefits,
    implementation_complexity,
    regulatory_acceptance,
    use_cases,
    implementation_cost_estimate,
    roi_estimate,
    risk_assessment,
    competitive_advantage_score,
    technology_readiness_level
) VALUES 
(
    'Differential Privacy',
    'differential_privacy',
    'early_adoption',
    ARRAY['data_utility_preservation', 'privacy_guarantees', 'regulatory_compliance'],
    'high',
    'emerging',
    '{"analytics": "privacy_preserving_analytics", "ml": "federated_learning", "research": "data_sharing"}',
    500000,
    15.5,
    '{"implementation_risk": "medium", "regulatory_risk": "low", "technical_risk": "medium"}',
    85,
    7
),
(
    'Homomorphic Encryption',
    'homomorphic_encryption',
    'prototype',
    ARRAY['computation_on_encrypted_data', 'zero_knowledge_processing', 'secure_multiparty_computation'],
    'very_high',
    'unknown',
    '{"secure_analytics": "encrypted_computation", "cloud_processing": "secure_outsourcing"}',
    1200000,
    25.0,
    '{"implementation_risk": "high", "regulatory_risk": "low", "technical_risk": "high"}',
    95,
    6
),
(
    'Zero Knowledge Proofs',
    'zero_knowledge_proofs',
    'early_adoption',
    ARRAY['identity_verification_without_disclosure', 'selective_disclosure', 'privacy_preserving_authentication'],
    'high',
    'emerging',
    '{"identity": "privacy_preserving_kyc", "credentials": "selective_attribute_disclosure"}',
    350000,
    20.0,
    '{"implementation_risk": "medium", "regulatory_risk": "low", "technical_risk": "medium"}',
    80,
    7
);

-- Insert sample expert witnesses
INSERT INTO gdpr.expert_witnesses (
    expert_name,
    expertise_areas,
    litigation_experience,
    regulatory_experience,
    industry_experience,
    jurisdictional_experience,
    notable_cases,
    daily_rate,
    estimated_days_required,
    availability,
    credibility_score,
    qualifications
) VALUES 
(
    'Dr. Privacy Expert',
    ARRAY['privacy_law', 'gdpr_compliance', 'data_protection'],
    15,
    20,
    12,
    ARRAY['european_union', 'california', 'united_kingdom'],
    ARRAY['Major GDPR Case v. Tech Giant', 'Privacy Class Action Settlement'],
    3000.00,
    10,
    'available',
    95,
    '{"education": ["JD Privacy Law", "PhD Computer Science"], "certifications": ["CIPP/E", "CIPM"], "publications": 25}'
),
(
    'Prof. Technical Security Expert',
    ARRAY['technical_security', 'cybersecurity', 'data_encryption'],
    12,
    8,
    20,
    ARRAY['united_states', 'european_union', 'canada'],
    ARRAY['Encryption Standards Litigation', 'Data Breach Investigation'],
    2500.00,
    8,
    'available',
    90,
    '{"education": ["PhD Computer Science", "MS Cybersecurity"], "certifications": ["CISSP", "CISA"], "patents": 12}'
);

-- Create RLS policies for all tables
ALTER TABLE gdpr.global_regulatory_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.privacy_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.regulatory_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.litigation_preparation ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.emerging_privacy_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.global_processing_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.global_compliance_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.forensic_privacy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.evidence_preservation ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.expert_witnesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.regulatory_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.compliance_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.certification_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies for regulatory frameworks (public read, admin write)
CREATE POLICY "Global regulatory frameworks are viewable by authenticated users" ON gdpr.global_regulatory_frameworks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Global regulatory frameworks are manageable by admins" ON gdpr.global_regulatory_frameworks
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Create organization-specific policies
CREATE POLICY "Privacy certifications are viewable by organization members" ON gdpr.privacy_certifications
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Privacy certifications are manageable by organization admins" ON gdpr.privacy_certifications
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'privacy_officer')
        )
    );

-- Apply similar patterns to other tables
CREATE POLICY "Litigation preparation is viewable by organization legal team" ON gdpr.litigation_preparation
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'privacy_officer', 'legal_counsel')
        )
    );

CREATE POLICY "Compliance monitoring is viewable by organization members" ON gdpr.compliance_monitoring
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Compliance monitoring is manageable by privacy officers" ON gdpr.compliance_monitoring
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'privacy_officer')
        )
    );

-- Grant necessary permissions
GRANT SELECT ON gdpr.global_regulatory_frameworks TO authenticated;
GRANT ALL ON gdpr.privacy_certifications TO authenticated;
GRANT ALL ON gdpr.regulatory_changes TO authenticated;
GRANT ALL ON gdpr.litigation_preparation TO authenticated;
GRANT SELECT ON gdpr.emerging_privacy_technologies TO authenticated;
GRANT ALL ON gdpr.global_processing_scenarios TO authenticated;
GRANT ALL ON gdpr.global_compliance_results TO authenticated;
GRANT ALL ON gdpr.forensic_privacy_logs TO authenticated;
GRANT ALL ON gdpr.evidence_preservation TO authenticated;
GRANT SELECT ON gdpr.expert_witnesses TO authenticated;
GRANT ALL ON gdpr.regulatory_relationships TO authenticated;
GRANT ALL ON gdpr.compliance_monitoring TO authenticated;
GRANT ALL ON gdpr.certification_assessments TO authenticated;

-- Add helpful comments
COMMENT ON TABLE gdpr.global_regulatory_frameworks IS 'Tracks global privacy regulatory frameworks and their requirements';
COMMENT ON TABLE gdpr.privacy_certifications IS 'Manages privacy certifications like ISO 27701, SOC 2, etc.';
COMMENT ON TABLE gdpr.regulatory_changes IS 'Monitors and tracks changes in privacy regulations';
COMMENT ON TABLE gdpr.litigation_preparation IS 'Manages litigation defense preparation and documentation';
COMMENT ON TABLE gdpr.emerging_privacy_technologies IS 'Tracks emerging privacy-enhancing technologies';
COMMENT ON TABLE gdpr.forensic_privacy_logs IS 'Forensic-grade logging for litigation readiness';
COMMENT ON TABLE gdpr.expert_witnesses IS 'Network of privacy and technical expert witnesses';
COMMENT ON TABLE gdpr.compliance_monitoring IS 'Real-time compliance monitoring and alerting';
COMMENT ON TABLE gdpr.certification_assessments IS 'Tracks certification readiness assessments';