-- Core Security Incident Response System Migration
-- File: 20250120000001_security_incidents.sql
-- WS-190 Team B - Incident Response Procedures

-- Main security incidents table
CREATE TABLE security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    incident_reference VARCHAR(50) UNIQUE NOT NULL, -- Format: INC-YYYY-MMDD-XXXX
    
    -- Incident Classification
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN (
        'security_breach', 'data_leak', 'system_failure', 'unauthorized_access',
        'malware_detected', 'phishing_attempt', 'insider_threat', 'ddos_attack',
        'api_abuse', 'authentication_bypass', 'privilege_escalation',
        'data_corruption', 'service_disruption'
    )),
    
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('P1', 'P2', 'P3', 'P4')),
    status VARCHAR(30) NOT NULL DEFAULT 'detected' CHECK (status IN (
        'detected', 'triaged', 'investigating', 'contained', 
        'mitigating', 'resolved', 'closed'
    )),
    
    -- Incident Details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    affected_systems TEXT[] NOT NULL DEFAULT '{}',
    
    -- Wedding Context
    wedding_ids UUID[] DEFAULT '{}',
    venue_ids UUID[] DEFAULT '{}',
    vendor_ids UUID[] DEFAULT '{}',
    guest_data_affected BOOLEAN DEFAULT false,
    photos_affected BOOLEAN DEFAULT false,
    payment_data_affected BOOLEAN DEFAULT false,
    
    -- Timeline
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reported_at TIMESTAMPTZ DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    contained_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- P1 Emergency Response Requirements
    p1_containment_deadline TIMESTAMPTZ GENERATED ALWAYS AS (
        CASE 
            WHEN severity = 'P1' THEN detected_at + INTERVAL '5 minutes'
            WHEN severity = 'P2' THEN detected_at + INTERVAL '30 minutes'
            WHEN severity = 'P3' THEN detected_at + INTERVAL '2 hours'
            ELSE detected_at + INTERVAL '24 hours'
        END
    ) STORED,
    
    -- Automated Response
    auto_containment_enabled BOOLEAN DEFAULT true,
    auto_containment_executed BOOLEAN DEFAULT false,
    auto_containment_success BOOLEAN,
    
    -- Evidence and Audit
    evidence_data JSONB DEFAULT '{}',
    evidence_hash SHA256,
    forensics_required BOOLEAN DEFAULT false,
    
    -- Communication
    stakeholders_notified BOOLEAN DEFAULT false,
    public_disclosure_required BOOLEAN DEFAULT false,
    media_attention BOOLEAN DEFAULT false,
    
    -- Resolution
    root_cause TEXT,
    lessons_learned TEXT[],
    preventive_measures TEXT[],
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id)
);

-- Incident timeline tracking
CREATE TABLE incident_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
    
    -- Timeline Entry
    phase VARCHAR(50) NOT NULL CHECK (phase IN (
        'detection', 'triage', 'investigation', 'containment',
        'mitigation', 'recovery', 'post_incident', 'closure'
    )),
    
    action_taken TEXT NOT NULL,
    automated_action BOOLEAN DEFAULT false,
    success BOOLEAN NOT NULL DEFAULT true,
    
    -- Evidence Preservation
    evidence_preserved JSONB DEFAULT '{}',
    screenshot_taken BOOLEAN DEFAULT false,
    logs_captured BOOLEAN DEFAULT false,
    
    -- Wedding Impact Assessment
    wedding_impact VARCHAR(20) CHECK (wedding_impact IN (
        'none', 'minimal', 'moderate', 'significant', 'critical'
    )),
    guest_communication_sent BOOLEAN DEFAULT false,
    vendor_coordination_needed BOOLEAN DEFAULT false,
    
    -- Execution Details
    executed_by_user UUID REFERENCES auth.users(id),
    executed_by_system VARCHAR(100), -- For automated actions
    duration_seconds INTEGER,
    error_message TEXT,
    
    -- Chain of Custody
    chain_of_custody_hash SHA256 GENERATED ALWAYS AS (
        encode(sha256(
            COALESCE(action_taken, '') || 
            COALESCE(evidence_preserved::text, '') ||
            COALESCE(created_at::text, '')
        ), 'hex')
    ) STORED,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automated containment actions
CREATE TABLE containment_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
    
    -- Action Definition
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'isolate_system', 'block_ip', 'disable_user', 'rotate_credentials',
        'activate_waf_rules', 'enable_rate_limiting', 'backup_data',
        'notify_stakeholders', 'escalate_to_soc', 'emergency_shutdown',
        'redirect_traffic', 'activate_dr_site'
    )),
    
    action_name VARCHAR(255) NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}',
    
    -- Execution Status
    execution_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (execution_status IN (
        'pending', 'executing', 'completed', 'failed', 'rolled_back'
    )),
    
    -- Timing
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Results
    success BOOLEAN,
    error_message TEXT,
    rollback_possible BOOLEAN DEFAULT true,
    rollback_executed BOOLEAN DEFAULT false,
    
    -- Wedding Safety Considerations
    wedding_day_safe BOOLEAN DEFAULT true,
    guest_impact_minimal BOOLEAN DEFAULT true,
    vendor_coordination_complete BOOLEAN DEFAULT false,
    
    -- Evidence
    execution_log JSONB DEFAULT '{}',
    before_state JSONB DEFAULT '{}',
    after_state JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Automated threat detection rules
CREATE TABLE threat_detection_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Rule Definition
    rule_name VARCHAR(255) NOT NULL,
    rule_description TEXT,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
        'anomaly_detection', 'signature_based', 'behavioral_analysis',
        'threshold_monitoring', 'pattern_matching', 'ml_prediction'
    )),
    
    -- Detection Criteria
    detection_criteria JSONB NOT NULL,
    severity_mapping JSONB NOT NULL DEFAULT '{
        "low": "P4",
        "medium": "P3", 
        "high": "P2",
        "critical": "P1"
    }',
    
    -- Wedding-Specific Rules
    wedding_context_aware BOOLEAN DEFAULT false,
    saturday_sensitivity BOOLEAN DEFAULT true, -- Extra sensitive on wedding days
    guest_data_focus BOOLEAN DEFAULT false,
    payment_data_focus BOOLEAN DEFAULT false,
    photo_access_monitoring BOOLEAN DEFAULT false,
    
    -- Response Configuration
    auto_create_incident BOOLEAN DEFAULT true,
    auto_execute_containment BOOLEAN DEFAULT false,
    notification_required BOOLEAN DEFAULT true,
    escalation_required BOOLEAN DEFAULT false,
    
    -- Rule Status
    enabled BOOLEAN DEFAULT true,
    last_triggered TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    false_positive_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Alert queue for automated processing
CREATE TABLE security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Alert Source
    source_system VARCHAR(100) NOT NULL, -- 'waf', 'ids', 'application', 'database', etc.
    source_rule_id UUID REFERENCES threat_detection_rules(id),
    external_alert_id VARCHAR(255),
    
    -- Alert Content
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    raw_data JSONB DEFAULT '{}',
    
    -- Processing Status
    processing_status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (processing_status IN (
        'queued', 'processing', 'incident_created', 'false_positive', 'ignored'
    )),
    
    incident_created_id UUID REFERENCES security_incidents(id),
    processed_at TIMESTAMPTZ,
    processing_duration_ms INTEGER,
    
    -- Wedding Context Detection
    potential_wedding_impact BOOLEAN DEFAULT false,
    saturday_alert BOOLEAN GENERATED ALWAYS AS (
        EXTRACT(DOW FROM created_at) = 6 -- Saturday = 6
    ) STORED,
    
    -- Evidence Collection
    evidence_collected JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Incident response workflows
CREATE TABLE incident_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Workflow Definition
    workflow_name VARCHAR(255) NOT NULL,
    workflow_type VARCHAR(50) NOT NULL CHECK (workflow_type IN (
        'p1_emergency', 'p2_urgent', 'p3_standard', 'p4_low_priority',
        'wedding_day_special', 'data_breach_gdpr', 'payment_security'
    )),
    
    -- Workflow Steps
    workflow_steps JSONB NOT NULL, -- Array of step definitions
    
    -- Triggers
    trigger_conditions JSONB NOT NULL,
    auto_trigger_enabled BOOLEAN DEFAULT true,
    
    -- Wedding-Specific Configuration
    wedding_safe_mode BOOLEAN DEFAULT false, -- Extra precautions for wedding days
    guest_communication_template TEXT,
    vendor_notification_template TEXT,
    
    -- Status
    active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Incident metrics and KPIs
CREATE TABLE incident_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES security_incidents(id) ON DELETE CASCADE,
    
    -- Response Time Metrics
    detection_to_acknowledgment_seconds INTEGER,
    acknowledgment_to_containment_seconds INTEGER,
    containment_to_resolution_seconds INTEGER,
    total_response_time_seconds INTEGER,
    
    -- P1 Emergency Metrics
    met_p1_containment_sla BOOLEAN, -- Must be contained within 5 minutes
    containment_time_seconds INTEGER,
    
    -- Wedding Impact Metrics
    weddings_affected INTEGER DEFAULT 0,
    guests_impacted INTEGER DEFAULT 0,
    vendors_involved INTEGER DEFAULT 0,
    saturday_incident BOOLEAN DEFAULT false,
    
    -- Business Impact
    estimated_cost_gbp DECIMAL(10,2),
    reputation_impact VARCHAR(20) CHECK (reputation_impact IN (
        'none', 'minimal', 'moderate', 'significant', 'severe'
    )),
    
    -- Technical Metrics
    systems_affected INTEGER DEFAULT 0,
    data_volume_affected_gb DECIMAL(10,2),
    availability_impact_minutes INTEGER DEFAULT 0,
    
    -- Quality Metrics
    false_positive BOOLEAN DEFAULT false,
    customer_satisfaction_score INTEGER CHECK (customer_satisfaction_score BETWEEN 1 AND 10),
    lessons_learned_documented BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for optimal performance
CREATE INDEX idx_security_incidents_org_severity ON security_incidents(organization_id, severity);
CREATE INDEX idx_security_incidents_status ON security_incidents(status);
CREATE INDEX idx_security_incidents_detected_at ON security_incidents(detected_at);
CREATE INDEX idx_security_incidents_p1_deadline ON security_incidents(p1_containment_deadline) WHERE severity = 'P1';
CREATE INDEX idx_security_incidents_wedding_data ON security_incidents(organization_id) WHERE guest_data_affected = true OR photos_affected = true;

CREATE INDEX idx_incident_timeline_incident ON incident_timeline(incident_id);
CREATE INDEX idx_incident_timeline_phase ON incident_timeline(phase);
CREATE INDEX idx_incident_timeline_created ON incident_timeline(created_at);

CREATE INDEX idx_containment_actions_incident ON containment_actions(incident_id);
CREATE INDEX idx_containment_actions_status ON containment_actions(execution_status);
CREATE INDEX idx_containment_actions_scheduled ON containment_actions(scheduled_at);

CREATE INDEX idx_threat_detection_rules_org ON threat_detection_rules(organization_id);
CREATE INDEX idx_threat_detection_rules_enabled ON threat_detection_rules(enabled) WHERE enabled = true;
CREATE INDEX idx_threat_detection_rules_wedding ON threat_detection_rules(organization_id) WHERE wedding_context_aware = true;

CREATE INDEX idx_security_alerts_org_status ON security_alerts(organization_id, processing_status);
CREATE INDEX idx_security_alerts_created ON security_alerts(created_at);
CREATE INDEX idx_security_alerts_saturday ON security_alerts(organization_id) WHERE saturday_alert = true;

CREATE INDEX idx_incident_workflows_org_type ON incident_workflows(organization_id, workflow_type);
CREATE INDEX idx_incident_workflows_active ON incident_workflows(organization_id) WHERE active = true;

CREATE INDEX idx_incident_metrics_incident ON incident_metrics(incident_id);
CREATE INDEX idx_incident_metrics_p1_sla ON incident_metrics(organization_id, met_p1_containment_sla);

-- Row Level Security
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE containment_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_detection_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access their organization's incidents"
ON security_incidents FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can access incident timeline for their organization's incidents"
ON incident_timeline FOR ALL USING (
    incident_id IN (
        SELECT id FROM security_incidents 
        WHERE organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can access containment actions for their organization's incidents"
ON containment_actions FOR ALL USING (
    incident_id IN (
        SELECT id FROM security_incidents 
        WHERE organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can access their organization's threat detection rules"
ON threat_detection_rules FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can access their organization's security alerts"
ON security_alerts FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can access their organization's incident workflows"
ON incident_workflows FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can access metrics for their organization's incidents"
ON incident_metrics FOR ALL USING (
    organization_id IN (
        SELECT organization_id FROM user_profiles 
        WHERE id = auth.uid()
    )
);

-- Automated functions and triggers

-- Generate incident reference
CREATE OR REPLACE FUNCTION generate_incident_reference()
RETURNS TRIGGER AS $$
DECLARE
    current_year TEXT;
    current_date TEXT;
    sequence_num INTEGER;
    new_reference TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM now())::TEXT;
    current_date := TO_CHAR(now(), 'MMDD');
    
    -- Get next sequence number for today
    SELECT COALESCE(MAX(
        SUBSTRING(incident_reference FROM 'INC-\d{4}-\d{4}-(\d+)')::INTEGER
    ), 0) + 1
    INTO sequence_num
    FROM security_incidents
    WHERE incident_reference LIKE 'INC-' || current_year || '-' || current_date || '-%';
    
    new_reference := 'INC-' || current_year || '-' || current_date || '-' || LPAD(sequence_num::TEXT, 4, '0');
    NEW.incident_reference := new_reference;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_incident_reference
    BEFORE INSERT ON security_incidents
    FOR EACH ROW
    WHEN (NEW.incident_reference IS NULL OR NEW.incident_reference = '')
    EXECUTE FUNCTION generate_incident_reference();

-- Update incident timestamps
CREATE OR REPLACE FUNCTION update_incident_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Set acknowledged_at when status changes from detected
    IF OLD.status = 'detected' AND NEW.status != 'detected' AND NEW.acknowledged_at IS NULL THEN
        NEW.acknowledged_at = now();
    END IF;
    
    -- Set contained_at when status changes to contained
    IF OLD.status != 'contained' AND NEW.status = 'contained' AND NEW.contained_at IS NULL THEN
        NEW.contained_at = now();
    END IF;
    
    -- Set resolved_at when status changes to resolved
    IF OLD.status != 'resolved' AND NEW.status = 'resolved' AND NEW.resolved_at IS NULL THEN
        NEW.resolved_at = now();
    END IF;
    
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_incident_timestamps
    BEFORE UPDATE ON security_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_incident_timestamps();

-- Auto-create incident metrics
CREATE OR REPLACE FUNCTION create_incident_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Create metrics record when incident is resolved
    IF OLD.status != 'resolved' AND NEW.status = 'resolved' THEN
        INSERT INTO incident_metrics (
            organization_id,
            incident_id,
            detection_to_acknowledgment_seconds,
            acknowledgment_to_containment_seconds,
            containment_to_resolution_seconds,
            total_response_time_seconds,
            met_p1_containment_sla,
            containment_time_seconds,
            saturday_incident
        ) VALUES (
            NEW.organization_id,
            NEW.id,
            EXTRACT(EPOCH FROM (COALESCE(NEW.acknowledged_at, NEW.detected_at) - NEW.detected_at))::INTEGER,
            EXTRACT(EPOCH FROM (COALESCE(NEW.contained_at, NEW.acknowledged_at, NEW.detected_at) - COALESCE(NEW.acknowledged_at, NEW.detected_at)))::INTEGER,
            EXTRACT(EPOCH FROM (NEW.resolved_at - COALESCE(NEW.contained_at, NEW.acknowledged_at, NEW.detected_at)))::INTEGER,
            EXTRACT(EPOCH FROM (NEW.resolved_at - NEW.detected_at))::INTEGER,
            CASE 
                WHEN NEW.severity = 'P1' AND NEW.contained_at IS NOT NULL 
                THEN NEW.contained_at <= NEW.p1_containment_deadline
                ELSE NULL
            END,
            CASE 
                WHEN NEW.contained_at IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (NEW.contained_at - NEW.detected_at))::INTEGER
                ELSE NULL
            END,
            EXTRACT(DOW FROM NEW.detected_at) = 6 -- Saturday
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_incident_metrics
    AFTER UPDATE ON security_incidents
    FOR EACH ROW
    EXECUTE FUNCTION create_incident_metrics();

-- Wedding day protection function
CREATE OR REPLACE FUNCTION is_wedding_day_safe(action_config JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Always safe if not Saturday
    IF EXTRACT(DOW FROM now()) != 6 THEN
        RETURN true;
    END IF;
    
    -- Check if action is marked as wedding-day-safe
    RETURN COALESCE((action_config->>'wedding_day_safe')::BOOLEAN, false);
END;
$$ LANGUAGE plpgsql;

-- Initial threat detection rules for wedding industry
INSERT INTO threat_detection_rules (
    organization_id, rule_name, rule_description, rule_type, detection_criteria,
    wedding_context_aware, saturday_sensitivity, guest_data_focus, created_by
) 
SELECT 
    o.id,
    'Guest Data Unauthorized Access',
    'Detects unusual access patterns to guest personal information',
    'behavioral_analysis',
    '{"table_patterns": ["guest_*", "*wedding*"], "access_threshold": 10, "time_window_minutes": 5}',
    true,
    true,
    true,
    (SELECT id FROM auth.users LIMIT 1)
FROM organizations o
WHERE EXISTS (SELECT 1 FROM auth.users);

INSERT INTO threat_detection_rules (
    organization_id, rule_name, rule_description, rule_type, detection_criteria,
    wedding_context_aware, saturday_sensitivity, payment_data_focus, created_by
)
SELECT 
    o.id,
    'Payment Data Breach Attempt',
    'Monitors for unauthorized access to wedding payment information',
    'signature_based',
    '{"table_patterns": ["payment_*", "*transaction*"], "failed_auth_threshold": 5}',
    true,
    true,
    true,
    (SELECT id FROM auth.users LIMIT 1)
FROM organizations o
WHERE EXISTS (SELECT 1 FROM auth.users);

INSERT INTO threat_detection_rules (
    organization_id, rule_name, rule_description, rule_type, detection_criteria,
    wedding_context_aware, photo_access_monitoring, created_by
)
SELECT 
    o.id,
    'Wedding Photo Unauthorized Download',
    'Alerts on suspicious bulk photo downloads or access',
    'threshold_monitoring',
    '{"file_type": "image/*", "download_threshold": 50, "time_window_minutes": 10}',
    true,
    true,
    (SELECT id FROM auth.users LIMIT 1)
FROM organizations o
WHERE EXISTS (SELECT 1 FROM auth.users);

-- Wedding-specific incident workflows
INSERT INTO incident_workflows (
    organization_id, workflow_name, workflow_type, workflow_steps, 
    trigger_conditions, wedding_safe_mode, created_by
)
SELECT 
    o.id,
    'P1 Wedding Day Emergency Response',
    'p1_emergency',
    '[
        {"step": "immediate_containment", "timeout_minutes": 5, "required": true},
        {"step": "stakeholder_notification", "timeout_minutes": 10, "required": true},
        {"step": "guest_communication", "timeout_minutes": 30, "required": false},
        {"step": "vendor_coordination", "timeout_minutes": 60, "required": false},
        {"step": "escalate_to_executive", "timeout_minutes": 15, "required": true}
    ]',
    '{"severity": ["P1"], "saturday_incident": true, "guest_data_affected": true}',
    true,
    (SELECT id FROM auth.users LIMIT 1)
FROM organizations o
WHERE EXISTS (SELECT 1 FROM auth.users);

-- Performance monitoring view
CREATE OR REPLACE VIEW incident_response_performance AS
SELECT 
    DATE_TRUNC('day', si.detected_at) as incident_date,
    si.organization_id,
    si.severity,
    COUNT(*) as total_incidents,
    AVG(im.total_response_time_seconds) as avg_response_time_seconds,
    AVG(im.containment_time_seconds) as avg_containment_time_seconds,
    SUM(CASE WHEN im.met_p1_containment_sla = true THEN 1 ELSE 0 END)::DECIMAL / NULLIF(SUM(CASE WHEN si.severity = 'P1' THEN 1 ELSE 0 END), 0) * 100 as p1_sla_percentage,
    SUM(CASE WHEN im.saturday_incident = true THEN 1 ELSE 0 END) as saturday_incidents,
    AVG(im.weddings_affected) as avg_weddings_affected
FROM security_incidents si
LEFT JOIN incident_metrics im ON si.id = im.incident_id
WHERE si.status = 'resolved'
GROUP BY DATE_TRUNC('day', si.detected_at), si.organization_id, si.severity
ORDER BY incident_date DESC, si.severity;

-- Alert to incident conversion view
CREATE OR REPLACE VIEW alert_processing_metrics AS
SELECT 
    DATE_TRUNC('hour', sa.created_at) as alert_hour,
    sa.organization_id,
    sa.alert_type,
    COUNT(*) as total_alerts,
    SUM(CASE WHEN sa.processing_status = 'incident_created' THEN 1 ELSE 0 END) as incidents_created,
    SUM(CASE WHEN sa.processing_status = 'false_positive' THEN 1 ELSE 0 END) as false_positives,
    AVG(sa.processing_duration_ms) as avg_processing_time_ms,
    SUM(CASE WHEN sa.saturday_alert = true THEN 1 ELSE 0 END) as saturday_alerts
FROM security_alerts sa
GROUP BY DATE_TRUNC('hour', sa.created_at), sa.organization_id, sa.alert_type
ORDER BY alert_hour DESC;

COMMENT ON TABLE security_incidents IS 'Core incident tracking with automated P1 emergency response and wedding-specific context';
COMMENT ON TABLE incident_timeline IS 'Immutable audit trail of all incident response actions with chain of custody';
COMMENT ON TABLE containment_actions IS 'Automated and manual containment actions with wedding-day safety considerations';
COMMENT ON TABLE threat_detection_rules IS 'Configurable threat detection with wedding industry context awareness';
COMMENT ON TABLE security_alerts IS 'Alert processing queue with automated incident creation';
COMMENT ON TABLE incident_workflows IS 'Predefined response workflows optimized for wedding industry operations';
COMMENT ON TABLE incident_metrics IS 'Performance metrics and KPIs for incident response effectiveness';