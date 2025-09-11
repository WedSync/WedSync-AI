# WS-149: GDPR Compliance System - Technical Specification

## User Story

**As a wedding planner based in London serving international clients, I need comprehensive GDPR compliance so that I can legally process personal data of EU residents while maintaining their trust and avoiding regulatory penalties.**

### Business Context

Emma, a wedding planner in London, handles sensitive personal data for couples across Europe, including names, contact information, guest lists, dietary requirements, and payment details. With GDPR fines reaching up to €20 million or 4% of annual turnover, she needs:

- **Lawful basis management** for different types of data processing
- **Consent tracking** with clear audit trails for marketing communications
- **Data subject rights** implementation (access, rectification, erasure, portability)
- **Breach notification** procedures to meet 72-hour reporting requirements
- **Privacy by design** embedded in all wedding planning workflows
- **International transfer** safeguards for vendors in non-EU countries

Her clients increasingly request data transparency, and she needs to demonstrate compliance to maintain her reputation and avoid legal risks.

**Success Metrics:**
- 100% compliance with all 7 GDPR principles
- Sub-30 day response time for data subject requests
- Zero reportable compliance violations
- Automated consent and retention management
- Complete audit trail for all data processing activities

## Database Schema

```sql
-- GDPR compliance system schema
CREATE SCHEMA IF NOT EXISTS gdpr;

-- Lawful basis and processing activities registry
CREATE TABLE gdpr.processing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL,
  lawful_basis lawful_basis_enum NOT NULL,
  legitimate_interest_reason TEXT, -- Required for legitimate interests
  data_categories TEXT[] NOT NULL,
  data_subjects TEXT[] NOT NULL,
  recipients TEXT[] NOT NULL,
  international_transfers JSONB DEFAULT '{}',
  retention_period INTERVAL NOT NULL,
  automated_decision_making BOOLEAN DEFAULT false,
  profiling_details TEXT,
  security_measures TEXT[] NOT NULL,
  controller_name TEXT DEFAULT 'WedSync Ltd',
  controller_contact JSONB NOT NULL,
  processor_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  next_review_due TIMESTAMPTZ GENERATED ALWAYS AS (created_at + INTERVAL '1 year') STORED
);

-- Consent management system
CREATE TABLE gdpr.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  processing_activity_id UUID REFERENCES gdpr.processing_activities(id),
  consent_type consent_type_enum NOT NULL,
  granted BOOLEAN NOT NULL,
  consent_version TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  collection_method consent_method_enum NOT NULL,
  granular_consents JSONB DEFAULT '{}', -- Specific purposes within activity
  ip_address INET,
  user_agent TEXT,
  location_data JSONB,
  granted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  last_confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- For time-limited consents
  withdrawal_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, processing_activity_id, consent_type)
);

-- Consent history for complete audit trail
CREATE TABLE gdpr.consent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_record_id UUID REFERENCES gdpr.consent_records(id) ON DELETE CASCADE,
  action consent_action_enum NOT NULL,
  previous_state JSONB,
  new_state JSONB NOT NULL,
  reason TEXT,
  initiated_by UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  legal_basis_change BOOLEAN DEFAULT false,
  compliance_notes TEXT
);

-- Data subject requests management
CREATE TABLE gdpr.data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_reference TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  request_type subject_request_type_enum NOT NULL,
  status request_status_enum DEFAULT 'submitted',
  identity_verified BOOLEAN DEFAULT false,
  identity_verification_method TEXT,
  request_details JSONB NOT NULL,
  justification TEXT, -- For rejection cases
  assignee_id UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ GENERATED ALWAYS AS (submitted_at + INTERVAL '30 days') STORED,
  extension_granted BOOLEAN DEFAULT false,
  extension_reason TEXT,
  extended_due_date TIMESTAMPTZ,
  completion_data JSONB,
  communication_log JSONB DEFAULT '[]',
  compliance_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Data retention policy management
CREATE TABLE gdpr.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_category TEXT NOT NULL,
  table_name TEXT NOT NULL,
  retention_period INTERVAL NOT NULL,
  legal_basis TEXT NOT NULL,
  retention_rationale TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  automatic_deletion BOOLEAN DEFAULT true,
  deletion_method deletion_method_enum DEFAULT 'soft_delete',
  notification_required BOOLEAN DEFAULT false,
  notification_recipients TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  next_review_due TIMESTAMPTZ GENERATED ALWAYS AS (created_at + INTERVAL '1 year') STORED
);

-- Data retention schedule and execution log
CREATE TABLE gdpr.retention_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES gdpr.data_retention_policies(id),
  execution_date TIMESTAMPTZ DEFAULT NOW(),
  records_evaluated BIGINT DEFAULT 0,
  records_deleted BIGINT DEFAULT 0,
  records_anonymized BIGINT DEFAULT 0,
  execution_status execution_status_enum DEFAULT 'started',
  error_count INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '{}',
  performance_stats JSONB DEFAULT '{}',
  executed_by UUID REFERENCES auth.users(id),
  completion_verified BOOLEAN DEFAULT false,
  compliance_notes TEXT
);

-- Data breach incident management
CREATE TABLE gdpr.data_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_reference TEXT NOT NULL UNIQUE,
  discovered_at TIMESTAMPTZ NOT NULL,
  occurred_at TIMESTAMPTZ,
  breach_type breach_type_enum NOT NULL,
  severity_level severity_level_enum NOT NULL,
  affected_user_count INTEGER DEFAULT 0,
  data_categories TEXT[] NOT NULL,
  breach_description TEXT NOT NULL,
  cause_analysis TEXT,
  potential_consequences TEXT,
  containment_measures TEXT[],
  remediation_actions TEXT[],
  notification_required BOOLEAN,
  authority_notified BOOLEAN DEFAULT false,
  authority_notification_sent_at TIMESTAMPTZ,
  users_notified BOOLEAN DEFAULT false,
  user_notification_sent_at TIMESTAMPTZ,
  risk_assessment JSONB,
  discovered_by UUID REFERENCES auth.users(id),
  incident_manager UUID REFERENCES auth.users(id),
  dpo_involved BOOLEAN DEFAULT false,
  legal_review_required BOOLEAN DEFAULT false,
  status breach_status_enum DEFAULT 'reported',
  closed_at TIMESTAMPTZ,
  compliance_verified BOOLEAN DEFAULT false,
  lessons_learned TEXT,
  metadata JSONB DEFAULT '{}'
);

-- International data transfer tracking
CREATE TABLE gdpr.international_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_reference TEXT NOT NULL UNIQUE,
  data_category TEXT NOT NULL,
  source_country TEXT DEFAULT 'GB',
  destination_country TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_type recipient_type_enum NOT NULL,
  legal_basis transfer_legal_basis_enum NOT NULL,
  adequacy_decision BOOLEAN DEFAULT false,
  standard_contractual_clauses BOOLEAN DEFAULT false,
  scc_version TEXT,
  binding_corporate_rules BOOLEAN DEFAULT false,
  safeguards_implemented TEXT[],
  risk_assessment JSONB,
  user_consent_required BOOLEAN DEFAULT false,
  data_volume_estimate TEXT,
  transfer_frequency TEXT,
  authorized_by UUID REFERENCES auth.users(id),
  authorized_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  annual_review_due TIMESTAMPTZ GENERATED ALWAYS AS (authorized_at + INTERVAL '1 year') STORED,
  compliance_verified BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'
);

-- Privacy impact assessment tracking
CREATE TABLE gdpr.privacy_impact_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pia_reference TEXT NOT NULL UNIQUE,
  project_name TEXT NOT NULL,
  processing_activity_id UUID REFERENCES gdpr.processing_activities(id),
  high_risk_processing BOOLEAN NOT NULL,
  systematic_monitoring BOOLEAN DEFAULT false,
  large_scale_processing BOOLEAN DEFAULT false,
  sensitive_data_processing BOOLEAN DEFAULT false,
  risk_assessment JSONB NOT NULL,
  mitigation_measures TEXT[],
  dpo_consultation BOOLEAN DEFAULT false,
  dpo_opinion TEXT,
  authority_consultation_required BOOLEAN DEFAULT false,
  authority_consulted BOOLEAN DEFAULT false,
  authority_opinion TEXT,
  conducted_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  conducted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  review_due TIMESTAMPTZ GENERATED ALWAYS AS (conducted_at + INTERVAL '2 years') STORED,
  status pia_status_enum DEFAULT 'draft',
  metadata JSONB DEFAULT '{}'
);

-- Cookie and tracking consent
CREATE TABLE gdpr.cookie_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  consent_version TEXT NOT NULL,
  necessary_cookies BOOLEAN DEFAULT true, -- Always true
  functional_cookies BOOLEAN DEFAULT false,
  analytics_cookies BOOLEAN DEFAULT false,
  marketing_cookies BOOLEAN DEFAULT false,
  granular_consents JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  consent_method consent_method_enum DEFAULT 'banner',
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year'),
  withdrawn_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Audit log for all GDPR-related activities
CREATE TABLE gdpr.compliance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type gdpr_event_type_enum NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  user_id UUID REFERENCES auth.users(id),
  admin_id UUID REFERENCES auth.users(id),
  event_data JSONB NOT NULL,
  legal_basis TEXT,
  compliance_notes TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  retention_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 years') -- GDPR requires 6-year retention for audit logs
);

-- Create enums
CREATE TYPE lawful_basis_enum AS ENUM (
  'consent', 'contract', 'legal_obligation', 
  'vital_interests', 'public_task', 'legitimate_interests'
);

CREATE TYPE consent_type_enum AS ENUM (
  'marketing', 'cookies', 'data_sharing', 'profiling', 'automated_decisions', 'research'
);

CREATE TYPE consent_method_enum AS ENUM (
  'explicit_form', 'checkbox', 'banner', 'email_confirmation', 'oral', 'implied'
);

CREATE TYPE consent_action_enum AS ENUM (
  'granted', 'withdrawn', 'updated', 'confirmed', 'expired', 'migrated'
);

CREATE TYPE subject_request_type_enum AS ENUM (
  'access', 'rectification', 'erasure', 'restriction', 'portability', 'objection'
);

CREATE TYPE request_status_enum AS ENUM (
  'submitted', 'acknowledged', 'in_progress', 'completed', 'rejected', 'extended'
);

CREATE TYPE deletion_method_enum AS ENUM (
  'soft_delete', 'hard_delete', 'anonymization', 'crypto_shredding'
);

CREATE TYPE execution_status_enum AS ENUM (
  'started', 'in_progress', 'completed', 'failed', 'partially_completed'
);

CREATE TYPE breach_type_enum AS ENUM (
  'confidentiality', 'integrity', 'availability', 'combined'
);

CREATE TYPE severity_level_enum AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TYPE breach_status_enum AS ENUM (
  'reported', 'investigating', 'contained', 'resolved', 'closed'
);

CREATE TYPE recipient_type_enum AS ENUM (
  'processor', 'joint_controller', 'third_party', 'government', 'international_org'
);

CREATE TYPE transfer_legal_basis_enum AS ENUM (
  'adequacy_decision', 'standard_contractual_clauses', 'binding_corporate_rules', 
  'approved_code_of_conduct', 'approved_certification', 'ad_hoc_contractual_clauses',
  'consent', 'contract_performance', 'legal_claims', 'public_interest', 'vital_interests'
);

CREATE TYPE pia_status_enum AS ENUM (
  'draft', 'in_review', 'dpo_review', 'authority_consultation', 'approved', 'rejected'
);

CREATE TYPE gdpr_event_type_enum AS ENUM (
  'consent_granted', 'consent_withdrawn', 'data_access', 'data_rectification', 
  'data_erasure', 'data_portability', 'breach_detected', 'breach_notified',
  'retention_executed', 'transfer_authorized', 'pia_conducted'
);

-- Indexes for performance
CREATE INDEX idx_consent_records_user_type ON gdpr.consent_records(user_id, consent_type);
CREATE INDEX idx_consent_records_activity ON gdpr.consent_records(processing_activity_id);
CREATE INDEX idx_consent_history_record_timestamp ON gdpr.consent_history(consent_record_id, timestamp DESC);
CREATE INDEX idx_data_subject_requests_status ON gdpr.data_subject_requests(status, due_date);
CREATE INDEX idx_data_subject_requests_user ON gdpr.data_subject_requests(user_id, request_type);
CREATE INDEX idx_retention_policies_category ON gdpr.data_retention_policies(data_category) WHERE active = true;
CREATE INDEX idx_data_breaches_severity_status ON gdpr.data_breaches(severity_level, status);
CREATE INDEX idx_international_transfers_country ON gdpr.international_transfers(destination_country, valid_until);
CREATE INDEX idx_compliance_audit_log_event_time ON gdpr.compliance_audit_log(event_type, created_at DESC);
CREATE INDEX idx_cookie_consents_session ON gdpr.cookie_consents(user_session_id, expires_at DESC);

-- Row Level Security
ALTER TABLE gdpr.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.data_subject_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr.cookie_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access their own consent records" ON gdpr.consent_records
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own data requests" ON gdpr.data_subject_requests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "GDPR admin can access all compliance data" ON gdpr.consent_records
  FOR ALL USING (auth.jwt()->'app_metadata'->>'role' = 'gdpr_admin');

CREATE POLICY "DPO can access all compliance data" ON gdpr.data_subject_requests
  FOR ALL USING (auth.jwt()->'app_metadata'->>'role' = 'dpo');

-- Consent management functions
CREATE OR REPLACE FUNCTION gdpr.record_consent(
  p_user_id UUID,
  p_processing_activity_id UUID,
  p_consent_type consent_type_enum,
  p_granted BOOLEAN,
  p_consent_version TEXT,
  p_consent_text TEXT,
  p_collection_method consent_method_enum DEFAULT 'explicit_form',
  p_granular_consents JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_consent_id UUID;
  v_old_state JSONB;
  v_new_state JSONB;
  v_action consent_action_enum;
BEGIN
  -- Get existing consent state
  SELECT jsonb_build_object(
    'granted', granted,
    'consent_version', consent_version,
    'granular_consents', granular_consents
  ) INTO v_old_state
  FROM gdpr.consent_records
  WHERE user_id = p_user_id 
    AND processing_activity_id = p_processing_activity_id 
    AND consent_type = p_consent_type;

  -- Build new state
  v_new_state := jsonb_build_object(
    'granted', p_granted,
    'consent_version', p_consent_version,
    'granular_consents', p_granular_consents,
    'collection_method', p_collection_method
  );

  -- Determine action
  v_action := CASE 
    WHEN v_old_state IS NULL THEN 
      CASE WHEN p_granted THEN 'granted' ELSE 'withdrawn' END
    WHEN (v_old_state->>'granted')::BOOLEAN != p_granted THEN
      CASE WHEN p_granted THEN 'granted' ELSE 'withdrawn' END
    ELSE 'updated'
  END;

  -- Insert or update consent record
  INSERT INTO gdpr.consent_records (
    user_id, processing_activity_id, consent_type, granted, consent_version,
    consent_text, collection_method, granular_consents, ip_address, user_agent,
    granted_at, withdrawn_at, last_confirmed_at
  ) VALUES (
    p_user_id, p_processing_activity_id, p_consent_type, p_granted, p_consent_version,
    p_consent_text, p_collection_method, p_granular_consents, p_ip_address, p_user_agent,
    CASE WHEN p_granted THEN NOW() ELSE NULL END,
    CASE WHEN NOT p_granted THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (user_id, processing_activity_id, consent_type) DO UPDATE
  SET
    granted = EXCLUDED.granted,
    consent_version = EXCLUDED.consent_version,
    consent_text = EXCLUDED.consent_text,
    collection_method = EXCLUDED.collection_method,
    granular_consents = EXCLUDED.granular_consents,
    ip_address = EXCLUDED.ip_address,
    user_agent = EXCLUDED.user_agent,
    granted_at = CASE WHEN EXCLUDED.granted AND NOT gdpr.consent_records.granted THEN NOW() ELSE gdpr.consent_records.granted_at END,
    withdrawn_at = CASE WHEN NOT EXCLUDED.granted AND gdpr.consent_records.granted THEN NOW() ELSE NULL END,
    last_confirmed_at = NOW()
  RETURNING id INTO v_consent_id;

  -- Log to history
  INSERT INTO gdpr.consent_history (
    consent_record_id, action, previous_state, new_state, 
    ip_address, user_agent
  ) VALUES (
    v_consent_id, v_action, v_old_state, v_new_state,
    p_ip_address, p_user_agent
  );

  -- Log to compliance audit
  INSERT INTO gdpr.compliance_audit_log (
    event_type, entity_type, entity_id, user_id, event_data, ip_address, user_agent
  ) VALUES (
    CASE WHEN p_granted THEN 'consent_granted' ELSE 'consent_withdrawn' END,
    'consent_record', v_consent_id, p_user_id,
    jsonb_build_object(
      'consent_type', p_consent_type,
      'processing_activity_id', p_processing_activity_id,
      'action', v_action,
      'consent_version', p_consent_version
    ),
    p_ip_address, p_user_agent
  );

  RETURN v_consent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Data retention execution function
CREATE OR REPLACE FUNCTION gdpr.execute_data_retention()
RETURNS JSONB AS $$
DECLARE
  policy RECORD;
  execution_result JSONB := '{}';
  records_deleted BIGINT;
  policy_result JSONB;
BEGIN
  -- Process each active retention policy
  FOR policy IN 
    SELECT * FROM gdpr.data_retention_policies 
    WHERE active = true AND automatic_deletion = true
  LOOP
    -- Execute deletion for this policy
    EXECUTE format('
      DELETE FROM %I 
      WHERE created_at < NOW() - %L AND deleted_at IS NULL',
      policy.table_name, 
      policy.retention_period
    );
    
    GET DIAGNOSTICS records_deleted = ROW_COUNT;
    
    -- Log execution
    INSERT INTO gdpr.retention_execution_log (
      policy_id, records_evaluated, records_deleted, execution_status
    ) VALUES (
      policy.id, records_deleted, records_deleted, 'completed'
    );
    
    -- Add to result
    policy_result := jsonb_build_object(
      'policy_id', policy.id,
      'table_name', policy.table_name,
      'records_deleted', records_deleted
    );
    
    execution_result := execution_result || jsonb_build_object(policy.table_name, policy_result);
  END LOOP;
  
  RETURN execution_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## API Endpoints

### Consent Management Endpoints

```typescript
// /api/gdpr/consent - Consent management system

// POST /api/gdpr/consent/record
interface RecordConsentRequest {
  processingActivityId: string;
  consentType: 'marketing' | 'cookies' | 'data_sharing' | 'profiling' | 'automated_decisions' | 'research';
  granted: boolean;
  consentVersion: string;
  consentText: string;
  collectionMethod: 'explicit_form' | 'checkbox' | 'banner' | 'email_confirmation';
  granularConsents?: Record<string, boolean>;
}

interface RecordConsentResponse {
  consentId: string;
  recorded: boolean;
  previousState?: ConsentState;
  auditTrail: string;
}

// GET /api/gdpr/consent/user/:userId
interface UserConsentsResponse {
  consents: ConsentRecord[];
  processingActivities: ProcessingActivity[];
  consentVersions: ConsentVersion[];
}

interface ConsentRecord {
  id: string;
  processingActivity: string;
  consentType: string;
  granted: boolean;
  consentVersion: string;
  grantedAt?: string;
  withdrawnAt?: string;
  lastConfirmedAt: string;
  granularConsents: Record<string, boolean>;
  collectionMethod: string;
}

// POST /api/gdpr/consent/withdraw
interface WithdrawConsentRequest {
  consentIds: string[];
  reason?: string;
  withdrawalMethod: 'user_request' | 'automatic' | 'admin';
}

interface WithdrawConsentResponse {
  withdrawnConsents: string[];
  affectedProcessing: string[];
  dataRetentionImpact: string[];
}

// GET /api/gdpr/consent/history/:consentId
interface ConsentHistoryResponse {
  consentId: string;
  history: ConsentHistoryEntry[];
  auditTrail: AuditEntry[];
}

interface ConsentHistoryEntry {
  timestamp: string;
  action: string;
  previousState: any;
  newState: any;
  reason?: string;
  ipAddress: string;
  userAgent: string;
}
```

### Data Subject Rights Endpoints

```typescript
// /api/gdpr/requests - Data subject rights management

// POST /api/gdpr/requests/submit
interface SubmitDataRequestRequest {
  requestType: 'access' | 'rectification' | 'erasure' | 'restriction' | 'portability' | 'objection';
  requestDetails: {
    description: string;
    specificData?: string[];
    rectificationData?: Record<string, any>;
    erasureReason?: string;
    objectionReason?: string;
  };
  identityVerification: {
    method: 'email' | 'phone' | 'document' | 'in_person';
    verificationData: string;
  };
}

interface SubmitDataRequestResponse {
  requestReference: string;
  requestId: string;
  estimatedCompletionDate: string;
  nextSteps: string[];
  identityVerificationRequired: boolean;
}

// GET /api/gdpr/requests/:requestId/status
interface DataRequestStatusResponse {
  requestReference: string;
  status: 'submitted' | 'acknowledged' | 'in_progress' | 'completed' | 'rejected' | 'extended';
  progress: {
    steps: RequestStep[];
    currentStep: string;
    completionPercentage: number;
  };
  timeline: {
    submitted: string;
    acknowledged?: string;
    dueDate: string;
    extensionGranted?: boolean;
    extendedDueDate?: string;
    completed?: string;
  };
  communicationLog: CommunicationEntry[];
}

// POST /api/gdpr/requests/:requestId/fulfill
interface FulfillDataRequestRequest {
  requestId: string;
  fulfillmentData: any;
  verificationRequired: boolean;
  completionNotes: string;
}

interface FulfillDataRequestResponse {
  fulfilled: boolean;
  deliveryMethod: 'secure_download' | 'encrypted_email' | 'portal_access';
  downloadUrl?: string;
  expiresAt?: string;
  verificationCode?: string;
}

// Data access request fulfillment
// GET /api/gdpr/requests/:requestId/data-package
interface DataPackageResponse {
  packageId: string;
  dataCategories: {
    personalData: any;
    processingActivities: ProcessingActivity[];
    consentHistory: ConsentRecord[];
    communicationHistory: any[];
    retentionPolicies: RetentionPolicy[];
    internationalTransfers: Transfer[];
  };
  metadata: {
    exportedAt: string;
    dataVersion: string;
    completeness: number;
    verificationHash: string;
  };
  rights: {
    canRectify: boolean;
    canErase: boolean;
    canRestrict: boolean;
    canPortable: boolean;
    canObject: boolean;
  };
}

// Data portability export
// POST /api/gdpr/requests/portability/export
interface DataPortabilityRequest {
  format: 'json' | 'csv' | 'xml';
  dataCategories: string[];
  includeMetadata: boolean;
}

interface DataPortabilityResponse {
  exportId: string;
  format: string;
  downloadUrl: string;
  fileSize: number;
  recordCount: number;
  dataSchema: any;
  expiresAt: string;
}
```

### Compliance Management Endpoints

```typescript
// /api/gdpr/compliance - Compliance management system

// GET /api/gdpr/compliance/status
interface ComplianceStatusResponse {
  overallStatus: 'compliant' | 'non_compliant' | 'at_risk';
  score: number; // 0-100
  lastAssessment: string;
  nextAssessment: string;
  categories: {
    lawfulness: ComplianceCategory;
    transparency: ComplianceCategory;
    purposeLimitation: ComplianceCategory;
    dataMinimization: ComplianceCategory;
    accuracy: ComplianceCategory;
    storageLimitation: ComplianceCategory;
    security: ComplianceCategory;
    accountability: ComplianceCategory;
  };
  pendingActions: ComplianceAction[];
  recentChanges: ComplianceChange[];
}

interface ComplianceCategory {
  status: 'compliant' | 'non_compliant' | 'partially_compliant';
  score: number;
  requirements: Requirement[];
  recommendations: string[];
  lastReviewed: string;
}

// GET /api/gdpr/compliance/processing-activities
interface ProcessingActivitiesResponse {
  activities: ProcessingActivity[];
  totalActivities: number;
  reviewsDue: number;
  complianceGaps: Gap[];
}

interface ProcessingActivity {
  id: string;
  name: string;
  purpose: string;
  lawfulBasis: string;
  legitimateInterestReason?: string;
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  internationalTransfers: Transfer[];
  retentionPeriod: string;
  securityMeasures: string[];
  automatedDecisionMaking: boolean;
  lastReviewed: string;
  nextReviewDue: string;
  complianceStatus: 'compliant' | 'needs_review' | 'non_compliant';
}

// POST /api/gdpr/compliance/breach-notification
interface BreachNotificationRequest {
  breachType: 'confidentiality' | 'integrity' | 'availability' | 'combined';
  discoveredAt: string;
  occurredAt?: string;
  affectedUserCount: number;
  dataCategories: string[];
  description: string;
  containmentMeasures: string[];
  riskAssessment: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    potentialConsequences: string[];
    mitigationMeasures: string[];
  };
}

interface BreachNotificationResponse {
  incidentReference: string;
  breachId: string;
  notificationDeadlines: {
    supervisoryAuthority: string; // 72 hours
    dataSubjects?: string; // Without undue delay if high risk
  };
  requiredNotifications: {
    authorityRequired: boolean;
    userNotificationRequired: boolean;
    authorityDeadline?: string;
    userDeadline?: string;
  };
  nextSteps: string[];
}

// GET /api/gdpr/compliance/audit-report
interface ComplianceAuditResponse {
  reportId: string;
  generatedAt: string;
  period: {
    from: string;
    to: string;
  };
  summary: {
    totalRequests: number;
    completedRequests: number;
    breaches: number;
    consentChanges: number;
    retentionExecutions: number;
  };
  compliance: {
    score: number;
    categories: Record<string, number>;
    improvements: string[];
    risks: Risk[];
  };
  dataProcessing: {
    activities: number;
    lawfulBasisDistribution: Record<string, number>;
    consentRates: Record<string, number>;
  };
  recommendations: Recommendation[];
}

// Cookie consent management
// POST /api/gdpr/cookies/consent
interface CookieConsentRequest {
  consentVersion: string;
  necessaryCookies: boolean; // Always true
  functionalCookies: boolean;
  analyticsCookies: boolean;
  marketingCookies: boolean;
  granularConsents?: Record<string, boolean>;
  userSessionId: string;
}

interface CookieConsentResponse {
  consentId: string;
  allowedCookies: {
    necessary: string[];
    functional: string[];
    analytics: string[];
    marketing: string[];
  };
  expiresAt: string;
}
```

## Frontend Components

### GDPR Consent Banner

```tsx
// components/gdpr/ConsentBanner.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Settings, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ConsentBannerProps {
  onConsentChange: (consents: CookieConsents) => void;
  initialConsents?: CookieConsents;
}

interface CookieConsents {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  granular: Record<string, boolean>;
}

interface CookieCategory {
  id: keyof CookieConsents;
  title: string;
  description: string;
  required: boolean;
  cookies: CookieInfo[];
}

interface CookieInfo {
  name: string;
  purpose: string;
  duration: string;
  provider: string;
}

export function ConsentBanner({ onConsentChange, initialConsents }: ConsentBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consents, setConsents] = useState<CookieConsents>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
    granular: {}
  });

  const cookieCategories: CookieCategory[] = [
    {
      id: 'necessary',
      title: 'Necessary Cookies',
      description: 'Essential for website operation and cannot be disabled.',
      required: true,
      cookies: [
        {
          name: 'session_id',
          purpose: 'Maintain user session and authentication',
          duration: 'Session',
          provider: 'WedSync'
        },
        {
          name: 'csrf_token',
          purpose: 'Protect against cross-site request forgery',
          duration: '1 hour',
          provider: 'WedSync'
        }
      ]
    },
    {
      id: 'functional',
      title: 'Functional Cookies',
      description: 'Remember your preferences and improve your experience.',
      required: false,
      cookies: [
        {
          name: 'user_preferences',
          purpose: 'Store your language, theme, and dashboard layout preferences',
          duration: '1 year',
          provider: 'WedSync'
        }
      ]
    },
    {
      id: 'analytics',
      title: 'Analytics Cookies',
      description: 'Help us understand how our website is used to improve our service.',
      required: false,
      cookies: [
        {
          name: '_ga',
          purpose: 'Google Analytics - distinguish unique users',
          duration: '2 years',
          provider: 'Google'
        },
        {
          name: 'amplitude_id',
          purpose: 'Product analytics and user journey tracking',
          duration: '1 year',
          provider: 'Amplitude'
        }
      ]
    },
    {
      id: 'marketing',
      title: 'Marketing Cookies',
      description: 'Used for personalized advertising and marketing campaigns.',
      required: false,
      cookies: [
        {
          name: 'facebook_pixel',
          purpose: 'Track conversions and optimize ad campaigns',
          duration: '90 days',
          provider: 'Meta'
        }
      ]
    }
  ];

  useEffect(() => {
    checkConsentStatus();
  }, []);

  const checkConsentStatus = async () => {
    try {
      const response = await fetch('/api/gdpr/cookies/status');
      const data = await response.json();
      
      if (!data.hasValidConsent) {
        setShowBanner(true);
      } else {
        setConsents(data.consents);
        onConsentChange(data.consents);
      }
    } catch (error) {
      console.error('Failed to check consent status:', error);
      setShowBanner(true);
    }
  };

  const handleConsentChange = (category: keyof CookieConsents, value: boolean) => {
    const newConsents = { ...consents, [category]: value };
    setConsents(newConsents);
  };

  const handleAcceptAll = async () => {
    const allConsents: CookieConsents = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
      granular: {}
    };

    await saveConsents(allConsents);
    setConsents(allConsents);
    onConsentChange(allConsents);
    setShowBanner(false);
  };

  const handleAcceptSelected = async () => {
    await saveConsents(consents);
    onConsentChange(consents);
    setShowBanner(false);
  };

  const handleRejectAll = async () => {
    const minimalConsents: CookieConsents = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
      granular: {}
    };

    await saveConsents(minimalConsents);
    setConsents(minimalConsents);
    onConsentChange(minimalConsents);
    setShowBanner(false);
  };

  const saveConsents = async (consentData: CookieConsents) => {
    try {
      await fetch('/api/gdpr/cookies/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentVersion: '2.0',
          necessaryCookies: consentData.necessary,
          functionalCookies: consentData.functional,
          analyticsCookies: consentData.analytics,
          marketingCookies: consentData.marketing,
          granularConsents: consentData.granular,
          userSessionId: crypto.randomUUID()
        })
      });
    } catch (error) {
      console.error('Failed to save cookie consents:', error);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Cookie Preferences</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  We use cookies to enhance your experience, analyze usage, and deliver personalized content.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBanner(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {!showDetails ? (
            // Simple banner view
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm">
                  By continuing, you consent to our use of cookies in accordance with our{' '}
                  <a href="/privacy-policy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => setShowDetails(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Preferences
                </Button>
                <Button variant="outline" onClick={handleRejectAll}>
                  Reject All
                </Button>
                <Button onClick={handleAcceptAll}>
                  <Check className="h-4 w-4 mr-2" />
                  Accept All
                </Button>
              </div>
            </div>
          ) : (
            // Detailed preferences view
            <div className="space-y-6">
              <div className="grid gap-4">
                {cookieCategories.map((category) => (
                  <div key={category.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{category.title}</h3>
                        <p className="text-sm text-gray-600">{category.description}</p>
                      </div>
                      <Switch
                        checked={consents[category.id]}
                        onCheckedChange={(checked) => handleConsentChange(category.id, checked)}
                        disabled={category.required}
                      />
                    </div>

                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-xs text-gray-500">
                          View Cookies ({category.cookies.length})
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="space-y-2">
                          {category.cookies.map((cookie, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded text-xs">
                              <div className="font-medium">{cookie.name}</div>
                              <div className="text-gray-600 mt-1">{cookie.purpose}</div>
                              <div className="flex justify-between mt-2 text-gray-500">
                                <span>Duration: {cookie.duration}</span>
                                <span>Provider: {cookie.provider}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Back to Simple View
                </Button>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={handleRejectAll}>
                    Reject All
                  </Button>
                  <Button onClick={handleAcceptSelected}>
                    Save Preferences
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t text-xs text-gray-500">
            You can change your preferences at any time in your account settings or by clicking the cookie icon in the footer.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Data Subject Request Portal

```tsx
// components/gdpr/DataSubjectRequestPortal.tsx
'use client';

import React, { useState } from 'react';
import { FileText, Download, Edit, Trash2, Shield, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DataSubjectRequestPortalProps {
  userId: string;
}

export function DataSubjectRequestPortal({ userId }: DataSubjectRequestPortalProps) {
  const [activeTab, setActiveTab] = useState('new-request');
  const [selectedRequestType, setSelectedRequestType] = useState<string>('');
  const [requestDetails, setRequestDetails] = useState('');
  const [existingRequests, setExistingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const requestTypes = [
    {
      id: 'access',
      title: 'Access My Data',
      description: 'Get a copy of all personal data we have about you',
      icon: <Eye className="h-5 w-5" />,
      timeframe: '30 days',
      details: 'You will receive a comprehensive report including all personal data, processing activities, and data sources.'
    },
    {
      id: 'rectification',
      title: 'Correct My Data',
      description: 'Update or correct inaccurate personal information',
      icon: <Edit className="h-5 w-5" />,
      timeframe: '30 days',
      details: 'Request corrections to any inaccurate or incomplete personal data we hold about you.'
    },
    {
      id: 'erasure',
      title: 'Delete My Data',
      description: 'Request deletion of your personal data (Right to be Forgotten)',
      icon: <Trash2 className="h-5 w-5" />,
      timeframe: '30 days',
      details: 'Request permanent deletion of your personal data where legally permissible.'
    },
    {
      id: 'portability',
      title: 'Export My Data',
      description: 'Get your data in a machine-readable format',
      icon: <Download className="h-5 w-5" />,
      timeframe: '30 days',
      details: 'Receive your personal data in a structured, commonly used format (JSON, CSV, or XML).'
    },
    {
      id: 'restriction',
      title: 'Restrict Processing',
      description: 'Limit how your data is processed',
      icon: <Shield className="h-5 w-5" />,
      timeframe: '30 days',
      details: 'Request restrictions on the processing of your personal data under specific circumstances.'
    },
    {
      id: 'objection',
      title: 'Object to Processing',
      description: 'Object to processing based on legitimate interests',
      icon: <Users className="h-5 w-5" />,
      timeframe: '30 days',
      details: 'Object to processing of your personal data for direct marketing or legitimate interest purposes.'
    }
  ];

  const handleSubmitRequest = async () => {
    if (!selectedRequestType || !requestDetails.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/gdpr/requests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: selectedRequestType,
          requestDetails: {
            description: requestDetails,
            ...(selectedRequestType === 'rectification' && { specificData: [] }),
            ...(selectedRequestType === 'erasure' && { erasureReason: requestDetails }),
            ...(selectedRequestType === 'objection' && { objectionReason: requestDetails })
          },
          identityVerification: {
            method: 'email',
            verificationData: 'user_email'
          }
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Reset form and show success
        setSelectedRequestType('');
        setRequestDetails('');
        setActiveTab('my-requests');
        
        // Refresh requests list
        loadExistingRequests();
      }
    } catch (error) {
      console.error('Failed to submit request:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingRequests = async () => {
    try {
      const response = await fetch(`/api/gdpr/requests?userId=${userId}`);
      const data = await response.json();
      setExistingRequests(data.requests || []);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'submitted': 'bg-blue-100 text-blue-800',
      'acknowledged': 'bg-yellow-100 text-yellow-800',
      'in_progress': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'extended': 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  React.useEffect(() => {
    loadExistingRequests();
  }, [userId]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Data Rights</h1>
        <p className="text-gray-600">
          Exercise your rights under GDPR to control how your personal data is processed.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new-request">New Request</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="new-request" className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              All requests are processed in accordance with GDPR requirements. 
              We typically respond within 30 days and may require identity verification.
            </AlertDescription>
          </Alert>

          {!selectedRequestType ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requestTypes.map((type) => (
                <Card 
                  key={type.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedRequestType(type.id)}
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {type.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{type.title}</CardTitle>
                        <div className="text-sm text-gray-500">
                          Timeframe: {type.timeframe}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-2">{type.description}</p>
                    <p className="text-sm text-gray-500">{type.details}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {requestTypes.find(t => t.id === selectedRequestType)?.icon}
                  <span>{requestTypes.find(t => t.id === selectedRequestType)?.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Please provide details about your request:
                  </label>
                  <Textarea
                    value={requestDetails}
                    onChange={(e) => setRequestDetails(e.target.value)}
                    placeholder={`Describe your ${selectedRequestType} request in detail...`}
                    rows={4}
                  />
                </div>

                {selectedRequestType === 'rectification' && (
                  <Alert>
                    <AlertDescription>
                      Please specify which information needs to be corrected and provide the accurate information.
                    </AlertDescription>
                  </Alert>
                )}

                {selectedRequestType === 'erasure' && (
                  <Alert>
                    <AlertDescription>
                      Please note that some data may be retained for legal or legitimate business purposes.
                      We will explain what can and cannot be deleted.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedRequestType('')}
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleSubmitRequest}
                    disabled={loading || !requestDetails.trim()}
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-requests">
          <div className="space-y-4">
            {existingRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No requests found
                  </h3>
                  <p className="text-gray-600">
                    You haven't submitted any data subject requests yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              existingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {requestTypes.find(t => t.id === request.requestType)?.icon}
                        </div>
                        <div>
                          <h3 className="font-medium">{request.requestReference}</h3>
                          <p className="text-sm text-gray-600">
                            {requestTypes.find(t => t.id === request.requestType)?.title}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Submitted:</span>
                        <span>{new Date(request.submittedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Due date:</span>
                        <span>{new Date(request.dueDate).toLocaleDateString()}</span>
                      </div>
                      {request.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Completed:</span>
                          <span>{new Date(request.completedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {request.status === 'completed' && request.completionData && (
                      <div className="mt-4">
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Download Results
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Core GDPR Services

```typescript
// lib/gdpr/gdpr-service.ts
import { supabase } from '@/lib/supabase';
import { createHash } from 'crypto';

export class GDPRService {
  // Consent management
  static async recordConsent(
    userId: string,
    processingActivityId: string,
    consentType: string,
    granted: boolean,
    consentVersion: string,
    consentText: string,
    collectionMethod: string = 'explicit_form',
    granularConsents: Record<string, boolean> = {},
    request?: Request
  ): Promise<string> {
    const ipAddress = request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip');
    const userAgent = request?.headers.get('user-agent');

    const { data, error } = await supabase.rpc('record_consent', {
      p_user_id: userId,
      p_processing_activity_id: processingActivityId,
      p_consent_type: consentType,
      p_granted: granted,
      p_consent_version: consentVersion,
      p_consent_text: consentText,
      p_collection_method: collectionMethod,
      p_granular_consents: granularConsents,
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    });

    if (error) throw error;
    return data;
  }

  static async getConsentStatus(userId: string, consentType?: string): Promise<any[]> {
    let query = supabase
      .from('consent_records')
      .select(`
        *,
        processing_activities(*)
      `)
      .eq('user_id', userId);

    if (consentType) {
      query = query.eq('consent_type', consentType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async withdrawConsent(
    userId: string,
    consentIds: string[],
    reason?: string,
    request?: Request
  ): Promise<void> {
    const ipAddress = request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip');
    const userAgent = request?.headers.get('user-agent');

    // Withdraw each consent
    for (const consentId of consentIds) {
      const { error } = await supabase
        .from('consent_records')
        .update({
          granted: false,
          withdrawn_at: new Date().toISOString(),
          withdrawal_reason: reason
        })
        .eq('id', consentId)
        .eq('user_id', userId);

      if (error) throw error;

      // Log to history
      await supabase
        .from('consent_history')
        .insert({
          consent_record_id: consentId,
          action: 'withdrawn',
          new_state: { granted: false, reason, timestamp: new Date() },
          ip_address: ipAddress,
          user_agent: userAgent
        });
    }
  }

  // Data subject requests
  static async submitDataSubjectRequest(
    userId: string,
    requestType: string,
    requestDetails: any,
    identityVerification: any
  ): Promise<{ requestReference: string; requestId: string }> {
    const requestReference = `DSR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const { data, error } = await supabase
      .from('data_subject_requests')
      .insert({
        request_reference: requestReference,
        user_id: userId,
        request_type: requestType,
        request_details: requestDetails,
        identity_verification_method: identityVerification.method,
        status: 'submitted'
      })
      .select()
      .single();

    if (error) throw error;

    // Send acknowledgment email
    await this.sendRequestAcknowledgment(userId, requestReference, requestType);

    return {
      requestReference,
      requestId: data.id
    };
  }

  static async fulfillAccessRequest(userId: string, requestId: string): Promise<any> {
    // Collect all user data
    const userData = await this.collectUserData(userId);

    // Create comprehensive data package
    const dataPackage = {
      personalData: userData.personal,
      processingActivities: userData.activities,
      consentHistory: userData.consents,
      communicationHistory: userData.communications,
      retentionPolicies: userData.retention,
      internationalTransfers: userData.transfers,
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        dataVersion: '1.0',
        verificationHash: this.createDataHash(userData)
      }
    };

    // Update request status
    await supabase
      .from('data_subject_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_data: dataPackage
      })
      .eq('id', requestId)
      .eq('user_id', userId);

    return dataPackage;
  }

  static async fulfillErasureRequest(
    userId: string,
    requestId: string,
    reason: string
  ): Promise<void> {
    // Check erasure eligibility
    const canErase = await this.checkErasureEligibility(userId);
    if (!canErase.eligible) {
      throw new Error(`Cannot erase data: ${canErase.reason}`);
    }

    // Perform crypto-shredding if encryption is enabled
    const { error: shredError } = await supabase.rpc('crypto_shred_user_data', {
      target_user_id: userId,
      reason
    });

    if (shredError) throw shredError;

    // Update request status
    await supabase
      .from('data_subject_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_data: { erasurePerformed: true, reason }
      })
      .eq('id', requestId)
      .eq('user_id', userId);

    // Log compliance action
    await supabase
      .from('compliance_audit_log')
      .insert({
        event_type: 'data_erasure',
        entity_type: 'user',
        entity_id: userId,
        user_id: userId,
        event_data: { requestId, reason, method: 'crypto_shredding' }
      });
  }

  static async createPortabilityExport(
    userId: string,
    format: 'json' | 'csv' | 'xml',
    dataCategories?: string[]
  ): Promise<{ exportId: string; downloadUrl: string; fileSize: number }> {
    // Collect portable data (only user-provided data)
    const portableData = await this.collectPortableData(userId, dataCategories);

    // Format data according to request
    const formattedData = this.formatDataForPortability(portableData, format);

    // Generate export file
    const exportId = `export-${userId}-${Date.now()}`;
    const filePath = await this.saveExportFile(exportId, formattedData, format);

    // Generate secure download URL (expires in 7 days)
    const downloadUrl = await this.generateSecureDownloadUrl(filePath);

    return {
      exportId,
      downloadUrl,
      fileSize: Buffer.byteLength(formattedData)
    };
  }

  // Data retention
  static async executeDataRetention(): Promise<any> {
    const { data, error } = await supabase.rpc('execute_data_retention');
    if (error) throw error;
    return data;
  }

  static async checkRetentionCompliance(): Promise<any> {
    const { data: policies } = await supabase
      .from('data_retention_policies')
      .select('*')
      .eq('active', true);

    const complianceResults = [];

    for (const policy of policies || []) {
      // Check if data past retention period exists
      const { count } = await supabase
        .from(policy.table_name)
        .select('*', { count: 'exact', head: true })
        .lt('created_at', new Date(Date.now() - this.intervalToMs(policy.retention_period)))
        .is('deleted_at', null);

      complianceResults.push({
        policyId: policy.id,
        tableName: policy.table_name,
        retentionPeriod: policy.retention_period,
        expiredRecords: count || 0,
        compliant: (count || 0) === 0
      });
    }

    return {
      overallCompliant: complianceResults.every(r => r.compliant),
      results: complianceResults,
      totalExpiredRecords: complianceResults.reduce((sum, r) => sum + r.expiredRecords, 0)
    };
  }

  // Breach notification
  static async reportDataBreach(
    breachDetails: any,
    riskAssessment: any
  ): Promise<{ incidentReference: string; notificationDeadlines: any }> {
    const incidentReference = `BREACH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const { data: breach, error } = await supabase
      .from('data_breaches')
      .insert({
        incident_reference: incidentReference,
        discovered_at: new Date().toISOString(),
        occurred_at: breachDetails.occurredAt,
        breach_type: breachDetails.breachType,
        severity_level: riskAssessment.severity,
        affected_user_count: breachDetails.affectedUserCount,
        data_categories: breachDetails.dataCategories,
        breach_description: breachDetails.description,
        potential_consequences: riskAssessment.potentialConsequences.join('; '),
        containment_measures: breachDetails.containmentMeasures,
        risk_assessment: riskAssessment
      })
      .select()
      .single();

    if (error) throw error;

    // Determine notification requirements
    const notificationDeadlines = {
      supervisoryAuthority: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
      dataSubjects: riskAssessment.severity === 'high' || riskAssessment.severity === 'critical' 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000) // Without undue delay
        : null
    };

    // Schedule automatic notifications if required
    if (riskAssessment.severity === 'high' || riskAssessment.severity === 'critical') {
      await this.scheduleBreachNotifications(breach.id, notificationDeadlines);
    }

    return { incidentReference, notificationDeadlines };
  }

  // Privacy impact assessment
  static async conductPrivacyImpactAssessment(
    projectName: string,
    processingActivityId: string,
    riskFactors: any
  ): Promise<string> {
    const piaReference = `PIA-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const highRiskProcessing = 
      riskFactors.systematicMonitoring ||
      riskFactors.largeScaleProcessing ||
      riskFactors.sensitiveDataProcessing;

    const { error } = await supabase
      .from('privacy_impact_assessments')
      .insert({
        pia_reference: piaReference,
        project_name: projectName,
        processing_activity_id: processingActivityId,
        high_risk_processing: highRiskProcessing,
        systematic_monitoring: riskFactors.systematicMonitoring,
        large_scale_processing: riskFactors.largeScaleProcessing,
        sensitive_data_processing: riskFactors.sensitiveDataProcessing,
        risk_assessment: riskFactors.riskAssessment,
        mitigation_measures: riskFactors.mitigationMeasures,
        status: 'draft'
      });

    if (error) throw error;
    return piaReference;
  }

  // Compliance monitoring
  static async generateComplianceReport(period: { from: Date; to: Date }): Promise<any> {
    const [
      requests,
      breaches,
      consents,
      retentionExecution
    ] = await Promise.all([
      this.getRequestsStats(period),
      this.getBreachStats(period),
      this.getConsentStats(period),
      this.getRetentionStats(period)
    ]);

    const complianceScore = this.calculateComplianceScore({
      requests,
      breaches,
      consents,
      retentionExecution
    });

    return {
      reportId: `COMPLIANCE-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      period,
      summary: {
        totalRequests: requests.total,
        completedRequests: requests.completed,
        breaches: breaches.total,
        consentChanges: consents.changes,
        retentionExecutions: retentionExecution.executions
      },
      compliance: {
        score: complianceScore,
        categories: this.getComplianceCategories(complianceScore),
        recommendations: this.getComplianceRecommendations(complianceScore)
      }
    };
  }

  // Helper methods
  private static async collectUserData(userId: string): Promise<any> {
    const [personal, activities, consents, communications, retention, transfers] = await Promise.all([
      this.getPersonalData(userId),
      this.getProcessingActivities(userId),
      this.getConsentHistory(userId),
      this.getCommunicationHistory(userId),
      this.getRetentionPolicies(),
      this.getInternationalTransfers(userId)
    ]);

    return { personal, activities, consents, communications, retention, transfers };
  }

  private static async collectPortableData(userId: string, categories?: string[]): Promise<any> {
    // Only collect data provided by user or generated through their use
    const queries = [
      supabase.from('user_profiles').select('*').eq('user_id', userId),
      supabase.from('weddings').select('*').eq('user_id', userId),
      supabase.from('guests').select('*').eq('user_id', userId),
      supabase.from('form_responses').select('*').eq('user_id', userId)
    ];

    const results = await Promise.all(queries.map(q => q.then(r => r.data)));

    return {
      profile: results[0]?.[0],
      weddings: results[1],
      guests: results[2],
      formResponses: results[3]
    };
  }

  private static createDataHash(data: any): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private static async checkErasureEligibility(userId: string): Promise<{ eligible: boolean; reason?: string }> {
    // Check for legal obligations that prevent erasure
    const { data: activeContracts } = await supabase
      .from('weddings')
      .select('*')
      .eq('user_id', userId)
      .gt('wedding_date', new Date().toISOString());

    if (activeContracts && activeContracts.length > 0) {
      return {
        eligible: false,
        reason: 'Active wedding contracts require data retention'
      };
    }

    return { eligible: true };
  }

  private static intervalToMs(interval: string): number {
    // Convert PostgreSQL interval to milliseconds
    const matches = interval.match(/(\d+)\s*(\w+)/);
    if (!matches) return 0;

    const value = parseInt(matches[1]);
    const unit = matches[2].toLowerCase();

    const multipliers = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };

    return value * (multipliers[unit] || 0);
  }

  private static calculateComplianceScore(stats: any): number {
    let score = 100;

    // Deduct points for late responses
    if (stats.requests.lateResponses > 0) {
      score -= Math.min(20, stats.requests.lateResponses * 2);
    }

    // Deduct points for breaches
    if (stats.breaches.total > 0) {
      score -= Math.min(30, stats.breaches.total * 10);
    }

    // Deduct points for consent issues
    if (stats.consents.withdrawalsNotProcessed > 0) {
      score -= Math.min(15, stats.consents.withdrawalsNotProcessed * 5);
    }

    return Math.max(0, score);
  }

  // Additional helper methods for stats collection
  private static async getRequestsStats(period: { from: Date; to: Date }): Promise<any> {
    const { data } = await supabase
      .from('data_subject_requests')
      .select('*')
      .gte('submitted_at', period.from.toISOString())
      .lte('submitted_at', period.to.toISOString());

    const total = data?.length || 0;
    const completed = data?.filter(r => r.status === 'completed').length || 0;
    const lateResponses = data?.filter(r => 
      r.completed_at && new Date(r.completed_at) > new Date(r.due_date)
    ).length || 0;

    return { total, completed, lateResponses };
  }

  private static async getBreachStats(period: { from: Date; to: Date }): Promise<any> {
    const { data } = await supabase
      .from('data_breaches')
      .select('*')
      .gte('discovered_at', period.from.toISOString())
      .lte('discovered_at', period.to.toISOString());

    return {
      total: data?.length || 0,
      highSeverity: data?.filter(b => b.severity_level === 'high' || b.severity_level === 'critical').length || 0
    };
  }

  private static async getConsentStats(period: { from: Date; to: Date }): Promise<any> {
    const { data } = await supabase
      .from('consent_history')
      .select('*')
      .gte('timestamp', period.from.toISOString())
      .lte('timestamp', period.to.toISOString());

    return {
      changes: data?.length || 0,
      withdrawalsNotProcessed: 0 // Would require more complex query
    };
  }

  private static async getRetentionStats(period: { from: Date; to: Date }): Promise<any> {
    const { data } = await supabase
      .from('retention_execution_log')
      .select('*')
      .gte('execution_date', period.from.toISOString())
      .lte('execution_date', period.to.toISOString());

    return {
      executions: data?.length || 0,
      recordsDeleted: data?.reduce((sum, r) => sum + r.records_deleted, 0) || 0
    };
  }

  private static getComplianceCategories(score: number): Record<string, number> {
    return {
      lawfulness: score,
      transparency: score,
      purposeLimitation: score,
      dataMinimization: score,
      accuracy: score,
      storageLimitation: score,
      security: score,
      accountability: score
    };
  }

  private static getComplianceRecommendations(score: number): string[] {
    const recommendations = [];
    
    if (score < 90) {
      recommendations.push('Review and update data processing activities');
    }
    if (score < 80) {
      recommendations.push('Implement additional security measures');
    }
    if (score < 70) {
      recommendations.push('Conduct staff GDPR training');
    }
    
    return recommendations;
  }
}
```

## Testing Requirements

### Unit Tests

```typescript
// __tests__/unit/gdpr-service.test.ts
import { GDPRService } from '@/lib/gdpr/gdpr-service';

describe('GDPRService', () => {
  describe('Consent Management', () => {
    it('should record consent with audit trail', async () => {
      const userId = 'test-user-id';
      const processingActivityId = 'test-activity-id';
      
      const consentId = await GDPRService.recordConsent(
        userId,
        processingActivityId,
        'marketing',
        true,
        '2.0',
        'I consent to marketing communications',
        'explicit_form'
      );

      expect(consentId).toBeDefined();
    });

    it('should handle consent withdrawal', async () => {
      const userId = 'test-user-id';
      const consentIds = ['consent-1', 'consent-2'];

      await expect(
        GDPRService.withdrawConsent(userId, consentIds, 'User requested withdrawal')
      ).resolves.not.toThrow();
    });
  });

  describe('Data Subject Requests', () => {
    it('should submit access request with reference', async () => {
      const result = await GDPRService.submitDataSubjectRequest(
        'test-user-id',
        'access',
        { description: 'I want to see my data' },
        { method: 'email', verificationData: 'user@example.com' }
      );

      expect(result.requestReference).toMatch(/^DSR-\d+-[A-Z0-9]{6}$/);
      expect(result.requestId).toBeDefined();
    });

    it('should fulfill access request with complete data package', async () => {
      const dataPackage = await GDPRService.fulfillAccessRequest(
        'test-user-id',
        'test-request-id'
      );

      expect(dataPackage).toMatchObject({
        personalData: expect.any(Object),
        processingActivities: expect.any(Array),
        consentHistory: expect.any(Array),
        exportMetadata: expect.objectContaining({
          exportedAt: expect.any(String),
          verificationHash: expect.any(String)
        })
      });
    });
  });

  describe('Data Retention', () => {
    it('should execute retention policies', async () => {
      const result = await GDPRService.executeDataRetention();
      expect(result).toBeDefined();
    });

    it('should check retention compliance', async () => {
      const compliance = await GDPRService.checkRetentionCompliance();
      
      expect(compliance).toMatchObject({
        overallCompliant: expect.any(Boolean),
        results: expect.any(Array),
        totalExpiredRecords: expect.any(Number)
      });
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/gdpr-api.test.ts
import { testApiHandler } from 'next-test-api-route-handler';
import consentHandler from '@/app/api/gdpr/consent/record/route';

describe('/api/gdpr/consent/record', () => {
  it('should record consent with proper validation', async () => {
    await testApiHandler({
      handler: consentHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: 'Bearer valid-jwt-token'
          },
          body: JSON.stringify({
            processingActivityId: 'test-activity',
            consentType: 'marketing',
            granted: true,
            consentVersion: '2.0',
            consentText: 'I consent to marketing',
            collectionMethod: 'explicit_form'
          })
        });

        expect(res.status).toBe(200);
        
        const data = await res.json();
        expect(data).toMatchObject({
          consentId: expect.any(String),
          recorded: true
        });
      }
    });
  });
});
```

## Dependencies

### GDPR Compliance Libraries
```json
{
  "dependencies": {
    "node-cron": "^3.0.3",
    "jszip": "^3.10.1",
    "xml2js": "^0.6.2",
    "csv-parser": "^3.0.0",
    "csv-writer": "^1.6.0",
    "@gdpr/consent-string": "^1.1.0",
    "cookie": "^0.5.0"
  }
}
```

## Effort Estimate

**Total Effort: 12-14 Sprint Points (24-28 days)**

### Breakdown:
- **Database Schema & Migrations**: 3 days
- **Consent Management System**: 4-5 days
- **Data Subject Rights Implementation**: 5-6 days
- **Data Retention & Deletion**: 3-4 days
- **Breach Notification System**: 2-3 days
- **Cookie Consent Management**: 2-3 days
- **Privacy Impact Assessments**: 2 days
- **Compliance Monitoring**: 3-4 days
- **Frontend Components**: 4-5 days
- **Testing & Legal Review**: 5-6 days
- **Documentation & Training**: 2 days

### Risk Factors:
- **High**: Legal compliance complexity across jurisdictions
- **High**: Data retention and deletion verification
- **Medium**: Cross-system consent propagation
- **Medium**: Performance impact of compliance logging
- **Low**: Frontend user experience

### Success Criteria:
- ✅ Full GDPR Article 30 compliance (processing records)
- ✅ 100% automated consent management
- ✅ Sub-30 day data subject request fulfillment
- ✅ Zero compliance violations in audit
- ✅ Complete breach notification procedures
- ✅ Legal review and approval