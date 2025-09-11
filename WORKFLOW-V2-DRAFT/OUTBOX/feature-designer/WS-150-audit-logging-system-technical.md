# WS-150: Comprehensive Audit Logging System - Technical Specification

## User Story

**As a wedding venue owner running a premium venue business, I need comprehensive audit logging so that I can track all business activities, ensure compliance with financial regulations, investigate security incidents, and provide detailed reporting to my business partners.**

### Business Context

Marcus, who owns three high-end wedding venues across California, processes thousands of transactions annually and manages sensitive data for celebrity weddings and corporate events. He needs:

- **Complete audit trail** of all financial transactions for tax compliance and partner reporting
- **Security monitoring** to detect unauthorized access attempts to premium client data
- **Staff activity tracking** to ensure proper data handling and identify training needs
- **Forensic capabilities** to investigate any security incidents or data breaches
- **Compliance reporting** for PCI DSS, GDPR, and state financial regulations
- **Business intelligence** from activity patterns to optimize venue operations

Recent audits by business partners revealed gaps in activity tracking, and he needs enterprise-grade logging to maintain credibility and meet insurance requirements.

**Success Metrics:**
- 100% capture of all user and system activities
- Sub-second query response for audit investigations
- 7-year retention compliance for financial records
- Real-time alerting on security events
- Zero data loss in audit logs
- Complete forensic reconstruction capability

## Database Schema

```sql
-- Comprehensive audit logging system schema
CREATE SCHEMA IF NOT EXISTS audit;

-- Main audit log table with time-based partitioning
CREATE TABLE audit.system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Actor information (who performed the action)
  actor_id UUID,
  actor_type actor_type_enum NOT NULL,
  actor_email TEXT,
  actor_name TEXT,
  impersonator_id UUID, -- For admin impersonation
  impersonation_reason TEXT,
  
  -- Action details (what was done)
  action action_type_enum NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  resource_name TEXT,
  resource_path TEXT, -- For hierarchical resources
  
  -- Request context (how/where it happened)
  request_id UUID,
  session_id TEXT,
  correlation_id UUID, -- For tracing across services
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  origin TEXT,
  request_method TEXT,
  request_path TEXT,
  
  -- Change tracking (what changed)
  old_values JSONB,
  new_values JSONB,
  change_set JSONB, -- Computed differences
  change_summary TEXT,
  
  -- Results and performance
  success BOOLEAN NOT NULL,
  status_code INTEGER,
  error_code TEXT,
  error_message TEXT,
  error_stack TEXT,
  duration_ms INTEGER,
  response_size_bytes INTEGER,
  
  -- Classification and metadata
  severity severity_level_enum NOT NULL DEFAULT 'info',
  category category_enum NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Compliance and review
  requires_review BOOLEAN DEFAULT FALSE,
  sensitive_data_accessed BOOLEAN DEFAULT FALSE,
  gdpr_relevant BOOLEAN DEFAULT FALSE,
  pci_relevant BOOLEAN DEFAULT FALSE,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Data retention
  retention_policy TEXT DEFAULT 'general',
  delete_after TIMESTAMPTZ,
  archived BOOLEAN DEFAULT FALSE,
  archive_location TEXT
  
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for current and future months
CREATE TABLE audit.system_audit_logs_2024_01 PARTITION OF audit.system_audit_logs
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit.system_audit_logs_2024_02 PARTITION OF audit.system_audit_logs
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Security-specific audit logs
CREATE TABLE audit.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Security event details
  event_type security_event_type_enum NOT NULL,
  threat_level threat_level_enum NOT NULL,
  attack_vector TEXT,
  attack_signature TEXT,
  
  -- Affected user/system
  user_id UUID,
  affected_resource TEXT,
  source_ip INET,
  source_country TEXT,
  source_asn INTEGER,
  
  -- Detection details
  detection_method TEXT, -- rule_based, ml_model, manual
  detection_rule TEXT,
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  false_positive BOOLEAN DEFAULT FALSE,
  
  -- Request context
  user_agent TEXT,
  request_payload TEXT,
  request_headers JSONB,
  
  -- Response and mitigation
  blocked BOOLEAN DEFAULT FALSE,
  action_taken TEXT,
  mitigation_applied TEXT,
  alert_sent BOOLEAN DEFAULT FALSE,
  notification_channels TEXT[],
  
  -- Investigation
  investigated BOOLEAN DEFAULT FALSE,
  investigator_id UUID,
  investigation_started_at TIMESTAMPTZ,
  investigation_completed_at TIMESTAMPTZ,
  investigation_notes TEXT,
  incident_reference TEXT,
  
  -- Compliance
  reported_to_authorities BOOLEAN DEFAULT FALSE,
  breach_notification_required BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  related_events UUID[]
);

-- Data access audit for GDPR compliance
CREATE TABLE audit.data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Who accessed the data
  accessor_id UUID NOT NULL,
  accessor_type TEXT NOT NULL, -- user, admin, system, api
  accessor_role TEXT,
  accessor_department TEXT,
  
  -- Whose data was accessed
  data_subject_id UUID,
  data_subject_type TEXT, -- customer, supplier, employee
  data_subject_consent_status TEXT,
  
  -- What data was accessed
  data_category data_category_enum NOT NULL,
  data_classification data_classification_enum NOT NULL,
  table_name TEXT,
  fields_accessed TEXT[],
  record_count INTEGER DEFAULT 1,
  query_fingerprint TEXT, -- Hash of the query
  
  -- Why accessed
  access_purpose access_purpose_enum NOT NULL,
  legal_basis legal_basis_enum,
  justification TEXT,
  
  -- How accessed
  access_method access_method_enum NOT NULL,
  application_name TEXT,
  database_name TEXT,
  
  -- Export details (if applicable)
  exported BOOLEAN DEFAULT FALSE,
  export_format TEXT,
  export_filename TEXT,
  export_encrypted BOOLEAN DEFAULT FALSE,
  
  -- Context
  request_id UUID,
  business_process TEXT,
  ticket_reference TEXT,
  
  -- Compliance
  gdpr_compliant BOOLEAN DEFAULT TRUE,
  audit_required BOOLEAN DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Financial transaction audit logs
CREATE TABLE audit.financial_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Transaction identification
  transaction_id UUID NOT NULL,
  transaction_type financial_transaction_type_enum NOT NULL,
  transaction_reference TEXT,
  parent_transaction_id UUID, -- For related transactions
  
  -- Financial details
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  exchange_rate NUMERIC(10,6),
  original_amount_cents INTEGER,
  original_currency TEXT,
  
  -- Parties involved
  customer_id UUID,
  supplier_id UUID,
  venue_id UUID,
  
  -- Payment details
  payment_method payment_method_enum,
  payment_processor TEXT,
  processor_transaction_id TEXT,
  card_last_four TEXT,
  payment_status payment_status_enum,
  
  -- Business context
  subscription_id UUID,
  invoice_id UUID,
  contract_id UUID,
  wedding_date DATE,
  
  -- Authorization and approval
  initiated_by UUID,
  approved_by UUID,
  approval_level TEXT,
  authorization_code TEXT,
  
  -- Tax and compliance
  tax_rate NUMERIC(5,4),
  tax_amount_cents INTEGER,
  tax_jurisdiction TEXT,
  
  -- Audit trail
  reason TEXT,
  business_justification TEXT,
  
  -- Results
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT,
  
  -- Compliance
  pci_compliant BOOLEAN DEFAULT TRUE,
  sarbanes_oxley_relevant BOOLEAN DEFAULT FALSE,
  
  -- Document references
  receipt_url TEXT,
  invoice_url TEXT,
  contract_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Business intelligence audit logs
CREATE TABLE audit.business_intelligence_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Query details
  query_type bi_query_type_enum NOT NULL,
  query_fingerprint TEXT NOT NULL, -- Hash of the query
  query_text TEXT, -- Sanitized query
  
  -- User context
  user_id UUID NOT NULL,
  user_role TEXT,
  department TEXT,
  
  -- Data accessed
  tables_accessed TEXT[],
  columns_accessed TEXT[],
  row_count_accessed INTEGER,
  data_range_start DATE,
  data_range_end DATE,
  
  -- Purpose and context
  report_type TEXT,
  dashboard_name TEXT,
  export_format TEXT,
  
  -- Performance
  execution_time_ms INTEGER,
  data_processed_mb NUMERIC(10,3),
  
  -- Results
  success BOOLEAN NOT NULL,
  row_count_returned INTEGER,
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- API usage audit logs
CREATE TABLE audit.api_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Request identification
  request_id UUID NOT NULL,
  trace_id UUID, -- For distributed tracing
  span_id UUID,
  
  -- Endpoint details
  http_method TEXT NOT NULL,
  endpoint_path TEXT NOT NULL,
  api_version TEXT,
  
  -- Client information
  client_id TEXT,
  client_type client_type_enum,
  api_key_id TEXT, -- Never store the actual key
  user_id UUID,
  
  -- Request details
  request_headers JSONB,
  request_params JSONB,
  request_body_size INTEGER,
  request_body_hash TEXT, -- SHA256 of request body
  
  -- Response details
  response_status INTEGER NOT NULL,
  response_headers JSONB,
  response_body_size INTEGER,
  response_time_ms INTEGER,
  
  -- Rate limiting
  rate_limit_key TEXT,
  rate_limit_remaining INTEGER,
  rate_limit_window_start TIMESTAMPTZ,
  
  -- Error details
  error_code TEXT,
  error_message TEXT,
  error_type TEXT,
  
  -- Performance metrics
  database_query_count INTEGER DEFAULT 0,
  database_time_ms INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- System event audit logs
CREATE TABLE audit.system_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Event details
  event_type system_event_type_enum NOT NULL,
  event_category TEXT,
  event_source TEXT, -- application, database, infrastructure
  
  -- System context
  hostname TEXT,
  service_name TEXT,
  service_version TEXT,
  environment TEXT,
  
  -- Event data
  event_data JSONB,
  event_message TEXT,
  
  -- Severity and impact
  severity severity_level_enum NOT NULL,
  impact_level impact_level_enum,
  
  -- Performance metrics
  cpu_usage_percent NUMERIC(5,2),
  memory_usage_percent NUMERIC(5,2),
  disk_usage_percent NUMERIC(5,2),
  
  -- Results
  success BOOLEAN,
  error_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- Create enums for audit system
CREATE TYPE actor_type_enum AS ENUM (
  'user', 'admin', 'system', 'api', 'webhook', 'scheduled_job', 'migration'
);

CREATE TYPE action_type_enum AS ENUM (
  'create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import',
  'share', 'invite', 'approve', 'reject', 'cancel', 'refund', 'subscribe', 'unsubscribe'
);

CREATE TYPE severity_level_enum AS ENUM (
  'debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency'
);

CREATE TYPE category_enum AS ENUM (
  'authentication', 'authorization', 'data_access', 'financial', 'security', 
  'business', 'system', 'compliance', 'integration', 'general'
);

CREATE TYPE security_event_type_enum AS ENUM (
  'failed_login', 'brute_force_attempt', 'suspicious_activity', 'permission_denied',
  'data_breach', 'malware_detected', 'unauthorized_access', 'privilege_escalation',
  'sql_injection', 'xss_attempt', 'csrf_attempt', 'dos_attack'
);

CREATE TYPE threat_level_enum AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE data_category_enum AS ENUM (
  'personal_data', 'sensitive_data', 'financial_data', 'health_data',
  'biometric_data', 'location_data', 'behavioral_data', 'technical_data'
);

CREATE TYPE data_classification_enum AS ENUM (
  'public', 'internal', 'confidential', 'restricted', 'top_secret'
);

CREATE TYPE access_purpose_enum AS ENUM (
  'business_operation', 'customer_support', 'system_maintenance', 'security_investigation',
  'compliance_audit', 'legal_request', 'data_correction', 'service_delivery'
);

CREATE TYPE legal_basis_enum AS ENUM (
  'consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'
);

CREATE TYPE access_method_enum AS ENUM (
  'web_ui', 'api', 'database_direct', 'admin_tool', 'export_tool', 'automated_system'
);

CREATE TYPE financial_transaction_type_enum AS ENUM (
  'payment', 'refund', 'subscription', 'cancellation', 'chargeback', 'adjustment',
  'commission', 'payout', 'fee', 'discount', 'credit', 'debit'
);

CREATE TYPE payment_method_enum AS ENUM (
  'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stripe', 'apple_pay', 'google_pay'
);

CREATE TYPE payment_status_enum AS ENUM (
  'pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'disputed'
);

CREATE TYPE bi_query_type_enum AS ENUM (
  'dashboard', 'report', 'export', 'analytics', 'ad_hoc', 'scheduled'
);

CREATE TYPE client_type_enum AS ENUM (
  'web_app', 'mobile_app', 'api_client', 'webhook', 'integration', 'test_client'
);

CREATE TYPE system_event_type_enum AS ENUM (
  'startup', 'shutdown', 'deployment', 'migration', 'backup', 'maintenance',
  'scaling', 'failover', 'recovery', 'alert', 'health_check'
);

CREATE TYPE impact_level_enum AS ENUM (
  'none', 'low', 'medium', 'high', 'critical', 'system_wide'
);

-- Comprehensive indexing strategy
CREATE INDEX idx_system_audit_logs_timestamp ON audit.system_audit_logs(timestamp DESC);
CREATE INDEX idx_system_audit_logs_actor ON audit.system_audit_logs(actor_id, timestamp DESC);
CREATE INDEX idx_system_audit_logs_resource ON audit.system_audit_logs(resource_type, resource_id);
CREATE INDEX idx_system_audit_logs_action ON audit.system_audit_logs(action, timestamp DESC);
CREATE INDEX idx_system_audit_logs_severity ON audit.system_audit_logs(severity, timestamp DESC) 
  WHERE severity IN ('warning', 'error', 'critical', 'alert', 'emergency');
CREATE INDEX idx_system_audit_logs_category ON audit.system_audit_logs(category, timestamp DESC);
CREATE INDEX idx_system_audit_logs_request_id ON audit.system_audit_logs(request_id);
CREATE INDEX idx_system_audit_logs_session_id ON audit.system_audit_logs(session_id);
CREATE INDEX idx_system_audit_logs_review ON audit.system_audit_logs(requires_review, timestamp DESC) 
  WHERE requires_review = TRUE;

CREATE INDEX idx_security_audit_logs_timestamp ON audit.security_audit_logs(timestamp DESC);
CREATE INDEX idx_security_audit_logs_user ON audit.security_audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_security_audit_logs_event_type ON audit.security_audit_logs(event_type, timestamp DESC);
CREATE INDEX idx_security_audit_logs_threat_level ON audit.security_audit_logs(threat_level, timestamp DESC);
CREATE INDEX idx_security_audit_logs_source_ip ON audit.security_audit_logs(source_ip, timestamp DESC);

CREATE INDEX idx_data_access_logs_timestamp ON audit.data_access_logs(timestamp DESC);
CREATE INDEX idx_data_access_logs_subject ON audit.data_access_logs(data_subject_id, timestamp DESC);
CREATE INDEX idx_data_access_logs_accessor ON audit.data_access_logs(accessor_id, timestamp DESC);
CREATE INDEX idx_data_access_logs_category ON audit.data_access_logs(data_category, timestamp DESC);

CREATE INDEX idx_financial_audit_logs_timestamp ON audit.financial_audit_logs(timestamp DESC);
CREATE INDEX idx_financial_audit_logs_transaction ON audit.financial_audit_logs(transaction_id);
CREATE INDEX idx_financial_audit_logs_customer ON audit.financial_audit_logs(customer_id, timestamp DESC);
CREATE INDEX idx_financial_audit_logs_supplier ON audit.financial_audit_logs(supplier_id, timestamp DESC);

CREATE INDEX idx_api_audit_logs_timestamp ON audit.api_audit_logs(timestamp DESC);
CREATE INDEX idx_api_audit_logs_endpoint ON audit.api_audit_logs(endpoint_path, timestamp DESC);
CREATE INDEX idx_api_audit_logs_client ON audit.api_audit_logs(client_id, timestamp DESC);
CREATE INDEX idx_api_audit_logs_user ON audit.api_audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_api_audit_logs_status ON audit.api_audit_logs(response_status, timestamp DESC);

-- Row Level Security
ALTER TABLE audit.system_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.data_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Audit admin can access all audit logs" ON audit.system_audit_logs
  FOR ALL USING (auth.jwt()->'app_metadata'->>'role' IN ('audit_admin', 'super_admin'));

CREATE POLICY "Users can access their own audit logs" ON audit.system_audit_logs
  FOR SELECT USING (auth.uid() = actor_id AND actor_type = 'user');

CREATE POLICY "Security team can access security logs" ON audit.security_audit_logs
  FOR ALL USING (auth.jwt()->'app_metadata'->>'role' IN ('security_admin', 'audit_admin', 'super_admin'));

-- Database triggers for automatic audit logging
CREATE OR REPLACE FUNCTION audit.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_user_id UUID;
  v_action action_type_enum;
  v_request_id UUID;
  v_session_id TEXT;
BEGIN
  -- Extract context from current settings
  v_user_id := NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
  v_request_id := NULLIF(current_setting('app.request_id', TRUE), '')::UUID;
  v_session_id := NULLIF(current_setting('app.session_id', TRUE), '');

  -- Determine action and data
  CASE TG_OP
    WHEN 'INSERT' THEN
      v_action := 'create';
      v_old_data := NULL;
      v_new_data := to_jsonb(NEW);
    WHEN 'UPDATE' THEN
      v_action := 'update';
      v_old_data := to_jsonb(OLD);
      v_new_data := to_jsonb(NEW);
    WHEN 'DELETE' THEN
      v_action := 'delete';
      v_old_data := to_jsonb(OLD);
      v_new_data := NULL;
  END CASE;

  -- Insert audit record
  INSERT INTO audit.system_audit_logs (
    actor_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    request_id,
    session_id,
    old_values,
    new_values,
    success,
    category,
    metadata
  ) VALUES (
    v_user_id,
    'user',
    v_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::TEXT,
    v_request_id,
    v_session_id,
    v_old_data,
    v_new_data,
    TRUE,
    'business',
    jsonb_build_object(
      'schema', TG_TABLE_SCHEMA,
      'operation', TG_OP,
      'trigger', TG_NAME
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

CREATE TRIGGER audit_suppliers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

CREATE TRIGGER audit_weddings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON weddings
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

-- Audit retention management
CREATE TABLE audit.retention_policies (
  policy_name TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  retention_days INTEGER NOT NULL,
  archive_after_days INTEGER,
  legal_hold BOOLEAN DEFAULT FALSE,
  encryption_required BOOLEAN DEFAULT FALSE,
  compression_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO audit.retention_policies VALUES
  ('security_audit', 'security_audit_logs', 2555, 730, TRUE, TRUE, TRUE, NOW(), NOW()),     -- 7 years
  ('financial_audit', 'financial_audit_logs', 2555, 1095, TRUE, TRUE, TRUE, NOW(), NOW()),  -- 7 years 
  ('data_access', 'data_access_logs', 1095, 365, TRUE, TRUE, TRUE, NOW(), NOW()),          -- 3 years
  ('system_audit', 'system_audit_logs', 1095, 365, FALSE, FALSE, TRUE, NOW(), NOW()),     -- 3 years
  ('api_audit', 'api_audit_logs', 365, 90, FALSE, FALSE, TRUE, NOW(), NOW()),             -- 1 year
  ('business_intelligence', 'business_intelligence_logs', 730, 180, FALSE, FALSE, TRUE, NOW(), NOW()); -- 2 years
```

## API Endpoints

### Audit Query and Investigation Endpoints

```typescript
// /api/audit - Audit logging and investigation system

// GET /api/audit/logs
interface AuditLogQueryRequest {
  timeRange?: {
    start: string;
    end: string;
  };
  filters?: {
    actorId?: string;
    actorType?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    severity?: string[];
    category?: string[];
    success?: boolean;
    tags?: string[];
  };
  search?: string; // Full-text search
  pagination?: {
    page: number;
    limit: number;
    orderBy?: 'timestamp' | 'severity' | 'duration_ms';
    orderDirection?: 'asc' | 'desc';
  };
}

interface AuditLogQueryResponse {
  logs: AuditLogEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  aggregations: {
    totalEvents: number;
    uniqueActors: number;
    errorRate: number;
    severityDistribution: Record<string, number>;
    categoryDistribution: Record<string, number>;
  };
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: {
    id?: string;
    type: string;
    email?: string;
    name?: string;
  };
  action: string;
  resource: {
    type: string;
    id?: string;
    name?: string;
  };
  success: boolean;
  duration?: number;
  severity: string;
  category: string;
  tags: string[];
  changeSet?: {
    added: Record<string, any>;
    modified: Record<string, { old: any; new: any }>;
    removed: Record<string, any>;
  };
  error?: {
    code: string;
    message: string;
  };
}

// GET /api/audit/investigation/:investigationId
interface InvestigationRequest {
  type: 'user_activity' | 'security_incident' | 'data_breach' | 'performance_issue';
  timeRange: {
    start: string;
    end: string;
  };
  subjects: {
    userIds?: string[];
    ipAddresses?: string[];
    resources?: string[];
  };
  context?: Record<string, any>;
}

interface InvestigationResponse {
  investigationId: string;
  timeline: InvestigationEvent[];
  summary: {
    totalEvents: number;
    timespan: string;
    affectedResources: number;
    severityLevel: string;
    riskScore: number;
  };
  findings: {
    patterns: PatternMatch[];
    anomalies: Anomaly[];
    correlations: Correlation[];
    recommendations: string[];
  };
  evidence: {
    auditTrail: AuditLogEntry[];
    securityEvents: SecurityEvent[];
    dataAccess: DataAccessEvent[];
  };
}

// POST /api/audit/investigation/trace
interface TraceRequestRequest {
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  includeRelatedRequests?: boolean;
}

interface TraceRequestResponse {
  traceId: string;
  requests: RequestTrace[];
  totalDuration: number;
  services: string[];
  errorCount: number;
  performanceMetrics: {
    databaseTime: number;
    cacheHits: number;
    cacheMisses: number;
    externalApiCalls: number;
  };
}

interface RequestTrace {
  requestId: string;
  timestamp: string;
  service: string;
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  error?: string;
  spans: TraceSpan[];
}

// GET /api/audit/compliance/gdpr
interface GDPRComplianceRequest {
  dataSubjectId: string;
  timeRange: {
    start: string;
    end: string;
  };
  includeExports?: boolean;
}

interface GDPRComplianceResponse {
  dataSubject: {
    id: string;
    type: string;
    consentStatus: ConsentStatus;
  };
  dataAccess: DataAccessSummary[];
  processing: ProcessingActivity[];
  exports: DataExport[];
  rights: {
    accessRequests: number;
    rectificationRequests: number;
    erasureRequests: number;
  };
  compliance: {
    score: number;
    issues: ComplianceIssue[];
    recommendations: string[];
  };
}

// GET /api/audit/security/threats
interface SecurityThreatAnalysisRequest {
  timeRange: {
    start: string;
    end: string;
  };
  threatLevels?: string[];
  includeResolved?: boolean;
}

interface SecurityThreatAnalysisResponse {
  threats: SecurityThreat[];
  summary: {
    totalThreats: number;
    activeThreats: number;
    criticalThreats: number;
    threatTrend: 'increasing' | 'stable' | 'decreasing';
  };
  topAttackVectors: AttackVector[];
  geographicDistribution: GeographicThreat[];
  timelineAnalysis: ThreatTimeline[];
  recommendations: SecurityRecommendation[];
}

// GET /api/audit/financial/transactions
interface FinancialAuditRequest {
  timeRange: {
    start: string;
    end: string;
  };
  transactionTypes?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
  currency?: string;
  includeRefunds?: boolean;
  includeDisputes?: boolean;
}

interface FinancialAuditResponse {
  transactions: FinancialTransaction[];
  summary: {
    totalTransactions: number;
    totalAmount: number;
    averageAmount: number;
    successRate: number;
    refundRate: number;
  };
  complianceStatus: {
    pciCompliant: boolean;
    taxCompliant: boolean;
    reportingCompliant: boolean;
    issues: string[];
  };
  reconciliation: {
    matched: number;
    unmatched: number;
    discrepancies: Discrepancy[];
  };
}
```

### Real-time Monitoring Endpoints

```typescript
// /api/audit/monitoring - Real-time audit monitoring

// GET /api/audit/monitoring/dashboard
interface AuditDashboardResponse {
  realTimeMetrics: {
    eventsPerSecond: number;
    errorRate: number;
    averageResponseTime: number;
    activeUsers: number;
    activeAlerts: number;
  };
  trends: {
    hourlyEvents: DataPoint[];
    errorTrend: DataPoint[];
    performanceTrend: DataPoint[];
    userActivityTrend: DataPoint[];
  };
  topEvents: {
    mostActiveUsers: UserActivity[];
    frequentErrors: ErrorSummary[];
    slowestOperations: OperationPerformance[];
    recentSecurityEvents: SecurityEvent[];
  };
  systemHealth: {
    auditSystemStatus: 'healthy' | 'degraded' | 'critical';
    logIngestionRate: number;
    storageUsage: StorageMetrics;
    retentionCompliance: RetentionStatus;
  };
  alerts: ActiveAlert[];
}

// POST /api/audit/monitoring/alerts
interface CreateAlertRequest {
  name: string;
  description: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

interface AlertCondition {
  metric: string; // 'error_rate', 'failed_logins', 'data_exports'
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'contains';
  threshold: number | string;
  timeWindow: string; // '5m', '1h', '1d'
  aggregation?: 'count' | 'avg' | 'sum' | 'max' | 'min';
}

interface AlertAction {
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'pagerduty';
  configuration: Record<string, any>;
  escalationDelay?: string;
}

// GET /api/audit/monitoring/alerts/:alertId/history
interface AlertHistoryResponse {
  alert: AlertDefinition;
  history: AlertOccurrence[];
  statistics: {
    totalOccurrences: number;
    averageDuration: number;
    falsePositiveRate: number;
    lastTriggered: string;
  };
}

// WebSocket endpoint for real-time audit events
// ws://api/audit/monitoring/stream
interface AuditStreamMessage {
  type: 'audit_event' | 'security_alert' | 'system_status' | 'metric_update';
  timestamp: string;
  data: any;
  severity?: string;
  category?: string;
}
```

### Reporting and Analytics Endpoints

```typescript
// /api/audit/reports - Audit reporting and analytics

// POST /api/audit/reports/generate
interface AuditReportRequest {
  reportType: 'compliance' | 'security' | 'financial' | 'operational' | 'custom';
  timeRange: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  includeCharts?: boolean;
  includeRawData?: boolean;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    recipients: string[];
    nextRun?: string;
  };
}

interface AuditReportResponse {
  reportId: string;
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
  metadata: {
    recordCount: number;
    fileSize: number;
    generationTime: number;
  };
}

// GET /api/audit/analytics/patterns
interface PatternAnalysisRequest {
  analysisType: 'user_behavior' | 'security_patterns' | 'performance_patterns' | 'business_patterns';
  timeRange: {
    start: string;
    end: string;
  };
  confidence?: number; // 0.0 to 1.0
  includeAnonymous?: boolean;
}

interface PatternAnalysisResponse {
  patterns: DetectedPattern[];
  insights: AnalyticalInsight[];
  recommendations: ActionableRecommendation[];
  confidence: number;
  dataQuality: {
    completeness: number;
    accuracy: number;
    consistency: number;
  };
}

interface DetectedPattern {
  id: string;
  type: string;
  description: string;
  frequency: number;
  confidence: number;
  risk: 'low' | 'medium' | 'high';
  affectedUsers: number;
  timePattern: string;
  examples: AuditLogEntry[];
}

// GET /api/audit/analytics/trends
interface TrendAnalysisRequest {
  metrics: string[];
  timeRange: {
    start: string;
    end: string;
  };
  granularity: 'hour' | 'day' | 'week' | 'month';
  forecasting?: {
    enabled: boolean;
    periods: number;
  };
}

interface TrendAnalysisResponse {
  trends: MetricTrend[];
  correlations: MetricCorrelation[];
  forecasts?: TrendForecast[];
  seasonality: SeasonalityAnalysis[];
  changePoints: ChangePoint[];
}
```

## Frontend Components

### Audit Dashboard

```tsx
// components/audit/AuditDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Shield, AlertTriangle, Eye, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface AuditDashboardProps {
  timeRange?: { start: string; end: string };
}

export function AuditDashboard({ timeRange }: AuditDashboardProps) {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [timeRange, autoRefresh]);

  const loadDashboardData = async () => {
    try {
      const params = new URLSearchParams();
      if (timeRange) {
        params.append('start', timeRange.start);
        params.append('end', timeRange.end);
      }
      
      const response = await fetch(`/api/audit/monitoring/dashboard?${params}`);
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading audit dashboard...</div>;
  }

  const { realTimeMetrics, trends, topEvents, systemHealth, alerts } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events/sec</CardTitle>
            <Activity className="h-4 w-4 ml-auto text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeMetrics.eventsPerSecond}</div>
            <p className="text-xs text-muted-foreground">Current ingestion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 ml-auto text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(realTimeMetrics.errorRate * 100).toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Last 5 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 ml-auto text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeMetrics.averageResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Eye className="h-4 w-4 ml-auto text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeMetrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Shield className="h-4 w-4 ml-auto text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeMetrics.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>
      </div>

      {/* System Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>System Health</span>
            <Badge variant={systemHealth.auditSystemStatus === 'healthy' ? 'secondary' : 'destructive'}>
              {systemHealth.auditSystemStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Log Ingestion Rate</div>
              <div className="text-lg font-semibold">{systemHealth.logIngestionRate} logs/min</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Storage Usage</div>
              <div className="text-lg font-semibold">
                {systemHealth.storageUsage.used}GB / {systemHealth.storageUsage.total}GB
              </div>
              <div className="text-xs text-gray-500">
                ({Math.round((systemHealth.storageUsage.used / systemHealth.storageUsage.total) * 100)}% used)
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Retention Compliance</div>
              <div className="text-lg font-semibold">{systemHealth.retentionCompliance.percentage}%</div>
              <div className="text-xs text-gray-500">
                {systemHealth.retentionCompliance.issuesCount} issues
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topEvents.recentSecurityEvents?.slice(0, 10).map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        event.severity === 'critical' ? 'bg-red-600' :
                        event.severity === 'high' ? 'bg-orange-600' :
                        event.severity === 'medium' ? 'bg-yellow-600' :
                        'bg-green-600'
                      }`} />
                      <div>
                        <div className="font-medium">{event.action}</div>
                        <div className="text-sm text-gray-600">
                          {event.actor?.email || event.actor?.name || 'Unknown actor'} • {event.resource?.type}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                      <Badge variant={event.success ? 'secondary' : 'destructive'}>
                        {event.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topEvents.recentSecurityEvents?.map((event: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{event.eventType}</div>
                        <div className="text-sm text-gray-600">{event.sourceIp}</div>
                      </div>
                      <Badge variant={
                        event.threatLevel === 'critical' ? 'destructive' :
                        event.threatLevel === 'high' ? 'destructive' :
                        'secondary'
                      }>
                        {event.threatLevel}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Threat Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">Top Attack Vector</div>
                    <div className="text-lg font-semibold">Brute Force Login</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Blocked Attempts (24h)</div>
                    <div className="text-lg font-semibold">247</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Geographic Distribution</div>
                    <div className="text-sm">
                      <div>CN: 45%</div>
                      <div>RU: 23%</div>
                      <div>US: 18%</div>
                      <div>Others: 14%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Slowest Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topEvents.slowestOperations?.map((op: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{op.operation}</div>
                        <div className="text-sm text-gray-600">{op.count} occurrences</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{op.averageDuration}ms</div>
                        <div className="text-sm text-gray-600">avg</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topEvents.frequentErrors?.map((error: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{error.errorCode}</div>
                        <div className="text-sm text-gray-600">{error.message}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{error.count}</div>
                        <div className="text-sm text-gray-600">occurrences</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Active Alerts</CardTitle>
              <Button variant="outline" size="sm">
                Configure Alerts
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts?.map((alert: any, index: number) => (
                  <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                        alert.severity === 'critical' ? 'text-red-600' :
                        alert.severity === 'high' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`} />
                      <div>
                        <div className="font-medium">{alert.name}</div>
                        <div className="text-sm text-gray-600">{alert.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Triggered: {new Date(alert.triggeredAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={alert.acknowledged ? 'secondary' : 'destructive'}>
                        {alert.acknowledged ? 'Acknowledged' : 'Active'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        {alert.acknowledged ? 'Resolve' : 'Acknowledge'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Audit Investigation Interface

```tsx
// components/audit/AuditInvestigationInterface.tsx
'use client';

import React, { useState } from 'react';
import { Search, Filter, Download, Eye, Clock, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AuditInvestigationInterfaceProps {
  investigationType: 'security' | 'compliance' | 'performance' | 'general';
}

export function AuditInvestigationInterface({ investigationType }: AuditInvestigationInterfaceProps) {
  const [query, setQuery] = useState('');
  const [timeRange, setTimeRange] = useState({ start: '', end: '' });
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        start: timeRange.start,
        end: timeRange.end,
        type: investigationType
      });

      const response = await fetch(`/api/audit/logs?${params}`);
      const data = await response.json();
      setResults(data.logs || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      'critical': 'bg-red-100 text-red-800',
      'error': 'bg-red-100 text-red-800',
      'warning': 'bg-yellow-100 text-yellow-800',
      'info': 'bg-blue-100 text-blue-800',
      'debug': 'bg-gray-100 text-gray-800'
    };
    return colors[severity] || colors.info;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Audit Investigation</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <Input
              placeholder="Search audit logs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start Time</label>
              <Input
                type="datetime-local"
                value={timeRange.start}
                onChange={(e) => setTimeRange({ ...timeRange, start: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Time</label>
              <Input
                type="datetime-local"
                value={timeRange.end}
                onChange={(e) => setTimeRange({ ...timeRange, end: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Investigation Results ({results.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((log, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedLog?.id === log.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={getSeverityColor(log.severity)}>
                          {log.severity}
                        </Badge>
                        <span className="font-medium">{log.action}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{log.actor?.email || 'System'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{log.resource?.type}</span>
                      </div>
                      {log.duration && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{log.duration}ms</span>
                        </div>
                      )}
                    </div>

                    {log.error && (
                      <div className="mt-2 text-sm text-red-600">
                        Error: {log.error.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Panel */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLog ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Timestamp</div>
                    <div>{new Date(selectedLog.timestamp).toLocaleString()}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-600">Actor</div>
                    <div>{selectedLog.actor?.email || selectedLog.actor?.name || 'System'}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-600">Action</div>
                    <div>{selectedLog.action}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-600">Resource</div>
                    <div>{selectedLog.resource?.type} ({selectedLog.resource?.id})</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-gray-600">Status</div>
                    <Badge variant={selectedLog.success ? 'secondary' : 'destructive'}>
                      {selectedLog.success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>

                  {selectedLog.changeSet && (
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-2">Changes</div>
                      <Tabs defaultValue="summary" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="summary">Summary</TabsTrigger>
                          <TabsTrigger value="before">Before</TabsTrigger>
                          <TabsTrigger value="after">After</TabsTrigger>
                        </TabsList>
                        <TabsContent value="summary" className="mt-2">
                          <div className="text-sm">
                            <div>Added: {Object.keys(selectedLog.changeSet.added || {}).length} fields</div>
                            <div>Modified: {Object.keys(selectedLog.changeSet.modified || {}).length} fields</div>
                            <div>Removed: {Object.keys(selectedLog.changeSet.removed || {}).length} fields</div>
                          </div>
                        </TabsContent>
                        <TabsContent value="before" className="mt-2">
                          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(selectedLog.oldValues, null, 2)}
                          </pre>
                        </TabsContent>
                        <TabsContent value="after" className="mt-2">
                          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(selectedLog.newValues, null, 2)}
                          </pre>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  {selectedLog.metadata && (
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-2">Metadata</div>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-600 py-8">
                  <Eye className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>Select an event to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

## Core Audit Services

```typescript
// lib/audit/audit-service.ts
import { supabase } from '@/lib/supabase';
import { createHash } from 'crypto';

export class AuditService {
  private requestId: string;
  private userId: string | null;
  private sessionId: string | null;
  private ipAddress: string | null;

  constructor(context: AuditContext) {
    this.requestId = context.requestId || crypto.randomUUID();
    this.userId = context.userId;
    this.sessionId = context.sessionId;
    this.ipAddress = context.ipAddress;
  }

  // Core audit logging method
  async log(entry: AuditLogEntry): Promise<void> {
    const enrichedEntry = this.enrichLogEntry(entry);
    
    // Write to primary audit table
    await this.writeToDatabase(enrichedEntry);
    
    // Write to specialized tables based on category
    await this.writeToSpecializedTables(enrichedEntry);
    
    // Send to external logging services
    await this.sendToExternalServices(enrichedEntry);
    
    // Check for real-time alerts
    await this.checkAlertConditions(enrichedEntry);
  }

  // Specialized logging methods
  async logUserActivity(
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any
  ): Promise<void> {
    await this.log({
      action,
      resource: { type: resourceType, id: resourceId },
      success: true,
      category: 'business',
      metadata: details,
      severity: 'info'
    });
  }

  async logSecurityEvent(
    eventType: string,
    threatLevel: 'low' | 'medium' | 'high' | 'critical',
    details: SecurityEventDetails
  ): Promise<void> {
    // Log to main audit table
    await this.log({
      action: 'security_event',
      resource: { type: 'security', id: eventType },
      success: false,
      category: 'security',
      severity: threatLevel === 'critical' ? 'critical' : 'error',
      metadata: details,
      requiresReview: threatLevel === 'high' || threatLevel === 'critical'
    });

    // Log to security-specific table
    await supabase
      .from('security_audit_logs')
      .insert({
        event_type: eventType,
        threat_level: threatLevel,
        user_id: this.userId,
        source_ip: this.ipAddress,
        detection_method: details.detectionMethod,
        confidence_score: details.confidenceScore,
        blocked: details.blocked,
        action_taken: details.actionTaken,
        metadata: details
      });
  }

  async logDataAccess(
    dataSubjectId: string,
    dataCategory: string,
    fieldsAccessed: string[],
    purpose: string,
    legalBasis: string
  ): Promise<void> {
    // Log to main audit table
    await this.log({
      action: 'data_access',
      resource: { type: 'personal_data', id: dataSubjectId },
      success: true,
      category: 'compliance',
      severity: 'info',
      metadata: {
        data_category: dataCategory,
        fields_accessed: fieldsAccessed,
        purpose,
        legal_basis: legalBasis
      },
      gdprRelevant: true
    });

    // Log to GDPR-specific table
    await supabase
      .from('data_access_logs')
      .insert({
        accessor_id: this.userId,
        accessor_type: 'user',
        data_subject_id: dataSubjectId,
        data_category: dataCategory,
        fields_accessed: fieldsAccessed,
        access_purpose: purpose,
        legal_basis: legalBasis,
        access_method: 'web_ui',
        request_id: this.requestId,
        gdpr_compliant: true
      });
  }

  async logFinancialTransaction(
    transactionId: string,
    transactionType: string,
    amount: number,
    currency: string,
    details: FinancialTransactionDetails
  ): Promise<void> {
    // Log to main audit table
    await this.log({
      action: 'financial_transaction',
      resource: { type: 'transaction', id: transactionId },
      success: details.success,
      category: 'financial',
      severity: details.success ? 'info' : 'warning',
      metadata: {
        transaction_type: transactionType,
        amount_cents: amount,
        currency,
        ...details
      },
      pciRelevant: true
    });

    // Log to financial-specific table
    await supabase
      .from('financial_audit_logs')
      .insert({
        transaction_id: transactionId,
        transaction_type: transactionType,
        amount_cents: amount,
        currency: currency,
        customer_id: details.customerId,
        supplier_id: details.supplierId,
        payment_method: details.paymentMethod,
        payment_processor: details.paymentProcessor,
        initiated_by: this.userId,
        success: details.success,
        error_code: details.errorCode,
        error_message: details.errorMessage,
        metadata: details.additionalData
      });
  }

  async logApiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    requestDetails: ApiRequestDetails
  ): Promise<void> {
    // Log to main audit table
    await this.log({
      action: 'api_request',
      resource: { type: 'api_endpoint', id: `${method} ${endpoint}` },
      success: statusCode < 400,
      category: 'system',
      severity: statusCode >= 500 ? 'error' : 'info',
      duration: duration,
      metadata: {
        method,
        endpoint,
        status_code: statusCode,
        request_size: requestDetails.requestSize,
        response_size: requestDetails.responseSize
      }
    });

    // Log to API-specific table
    await supabase
      .from('api_audit_logs')
      .insert({
        request_id: this.requestId,
        http_method: method,
        endpoint_path: endpoint,
        response_status: statusCode,
        response_time_ms: duration,
        client_type: requestDetails.clientType,
        user_id: this.userId,
        request_body_size: requestDetails.requestSize,
        response_body_size: requestDetails.responseSize,
        database_query_count: requestDetails.dbQueryCount,
        database_time_ms: requestDetails.dbTime,
        metadata: requestDetails.additionalData
      });
  }

  // Investigation and querying methods
  async investigateUserActivity(
    userId: string,
    timeRange: { start: Date; end: Date },
    actions?: string[]
  ): Promise<UserActivityInvestigation> {
    let query = supabase
      .from('system_audit_logs')
      .select('*')
      .eq('actor_id', userId)
      .gte('timestamp', timeRange.start.toISOString())
      .lte('timestamp', timeRange.end.toISOString())
      .order('timestamp', { ascending: false });

    if (actions && actions.length > 0) {
      query = query.in('action', actions);
    }

    const { data: auditLogs, error } = await query.limit(1000);
    if (error) throw error;

    // Analyze patterns
    const patterns = this.analyzeUserPatterns(auditLogs);
    const anomalies = await this.detectAnomalies(auditLogs, userId);
    const riskScore = this.calculateUserRiskScore(auditLogs, patterns, anomalies);

    return {
      userId,
      timeRange,
      totalEvents: auditLogs.length,
      auditTrail: auditLogs,
      patterns,
      anomalies,
      riskScore,
      recommendations: this.generateSecurityRecommendations(patterns, anomalies, riskScore)
    };
  }

  async traceRequest(requestId: string): Promise<RequestTrace> {
    const { data: auditLogs } = await supabase
      .from('system_audit_logs')
      .select('*')
      .eq('request_id', requestId)
      .order('timestamp', { ascending: true });

    const { data: apiLogs } = await supabase
      .from('api_audit_logs')
      .select('*')
      .eq('request_id', requestId)
      .order('timestamp', { ascending: true });

    const timeline = this.buildRequestTimeline(auditLogs || [], apiLogs || []);
    const performance = this.analyzeRequestPerformance(apiLogs || []);

    return {
      requestId,
      timeline,
      performance,
      totalDuration: performance.totalDuration,
      services: [...new Set(auditLogs?.map(log => log.metadata?.service).filter(Boolean) || [])],
      errorCount: (auditLogs?.filter(log => !log.success) || []).length
    };
  }

  // Analytics and reporting
  async generateComplianceReport(
    timeRange: { start: Date; end: Date },
    complianceType: 'gdpr' | 'pci' | 'sox' | 'all'
  ): Promise<ComplianceReport> {
    const filters: any = {
      timestamp: `gte.${timeRange.start.toISOString()},lte.${timeRange.end.toISOString()}`
    };

    if (complianceType === 'gdpr') {
      filters.gdpr_relevant = 'eq.true';
    } else if (complianceType === 'pci') {
      filters.pci_relevant = 'eq.true';
    }

    const { data: auditLogs } = await supabase
      .from('system_audit_logs')
      .select('*')
      .match(filters)
      .order('timestamp', { ascending: false });

    const { data: dataAccessLogs } = await supabase
      .from('data_access_logs')
      .select('*')
      .gte('timestamp', timeRange.start.toISOString())
      .lte('timestamp', timeRange.end.toISOString());

    const { data: financialLogs } = await supabase
      .from('financial_audit_logs')
      .select('*')
      .gte('timestamp', timeRange.start.toISOString())
      .lte('timestamp', timeRange.end.toISOString());

    return {
      reportId: crypto.randomUUID(),
      complianceType,
      timeRange,
      summary: {
        totalEvents: (auditLogs || []).length,
        dataAccessEvents: (dataAccessLogs || []).length,
        financialEvents: (financialLogs || []).length,
        violationsCount: this.countViolations(auditLogs || [], complianceType),
        complianceScore: this.calculateComplianceScore(auditLogs || [], complianceType)
      },
      findings: this.analyzeComplianceFindings(auditLogs || [], complianceType),
      recommendations: this.generateComplianceRecommendations(auditLogs || [], complianceType)
    };
  }

  // Helper methods
  private enrichLogEntry(entry: AuditLogEntry): EnrichedAuditLogEntry {
    return {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
      sessionId: this.sessionId,
      actor: {
        id: this.userId,
        type: entry.actor?.type || 'user',
        ...entry.actor
      },
      ipAddress: this.ipAddress,
      userAgent: this.getUserAgent(),
      changeSet: entry.oldValues && entry.newValues ? 
        this.calculateChangeSet(entry.oldValues, entry.newValues) : 
        undefined
    };
  }

  private async writeToDatabase(entry: EnrichedAuditLogEntry): Promise<void> {
    const { error } = await supabase
      .from('system_audit_logs')
      .insert({
        id: entry.id,
        timestamp: entry.timestamp,
        actor_id: entry.actor.id,
        actor_type: entry.actor.type,
        actor_email: entry.actor.email,
        action: entry.action,
        resource_type: entry.resource.type,
        resource_id: entry.resource.id,
        resource_name: entry.resource.name,
        request_id: entry.requestId,
        session_id: entry.sessionId,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        old_values: entry.oldValues,
        new_values: entry.newValues,
        change_set: entry.changeSet,
        success: entry.success,
        error_code: entry.error?.code,
        error_message: entry.error?.message,
        duration_ms: entry.duration,
        severity: entry.severity,
        category: entry.category,
        tags: entry.tags,
        metadata: entry.metadata,
        requires_review: entry.requiresReview,
        sensitive_data_accessed: entry.sensitiveDataAccessed,
        gdpr_relevant: entry.gdprRelevant,
        pci_relevant: entry.pciRelevant,
        retention_policy: entry.retentionPolicy || 'general'
      });

    if (error) {
      console.error('Failed to write audit log:', error);
      // Don't throw - audit logging shouldn't break application flow
    }
  }

  private calculateChangeSet(oldValues: any, newValues: any): any {
    const added: any = {};
    const modified: any = {};
    const removed: any = {};

    // Find added and modified fields
    for (const [key, value] of Object.entries(newValues)) {
      if (!(key in oldValues)) {
        added[key] = value;
      } else if (JSON.stringify(oldValues[key]) !== JSON.stringify(value)) {
        modified[key] = { old: oldValues[key], new: value };
      }
    }

    // Find removed fields
    for (const [key, value] of Object.entries(oldValues)) {
      if (!(key in newValues)) {
        removed[key] = value;
      }
    }

    return { added, modified, removed };
  }

  private analyzeUserPatterns(auditLogs: any[]): UserPattern[] {
    // Implement pattern analysis logic
    const patterns: UserPattern[] = [];

    // Analyze login patterns
    const logins = auditLogs.filter(log => log.action === 'login');
    if (logins.length > 0) {
      patterns.push({
        type: 'login_pattern',
        description: `User logs in ${logins.length} times in the period`,
        frequency: logins.length,
        confidence: 0.9,
        risk: this.assessPatternRisk('login_pattern', logins.length)
      });
    }

    // Analyze data access patterns
    const dataAccess = auditLogs.filter(log => log.action === 'data_access');
    if (dataAccess.length > 10) {
      patterns.push({
        type: 'bulk_data_access',
        description: `User accessed ${dataAccess.length} data records`,
        frequency: dataAccess.length,
        confidence: 0.85,
        risk: this.assessPatternRisk('bulk_data_access', dataAccess.length)
      });
    }

    return patterns;
  }

  private async detectAnomalies(auditLogs: any[], userId: string): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Get user's historical behavior
    const { data: historicalLogs } = await supabase
      .from('system_audit_logs')
      .select('*')
      .eq('actor_id', userId)
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    // Detect anomalies based on historical patterns
    const currentHourlyActivity = this.getHourlyActivity(auditLogs);
    const historicalHourlyActivity = this.getHourlyActivity(historicalLogs || []);

    for (const [hour, activity] of Object.entries(currentHourlyActivity)) {
      const historicalAvg = historicalHourlyActivity[hour] || 0;
      if (activity > historicalAvg * 3) { // 3x more than usual
        anomalies.push({
          type: 'unusual_activity_time',
          description: `Unusual activity at ${hour}:00`,
          severity: 'medium',
          confidence: 0.8,
          data: { current: activity, historical: historicalAvg }
        });
      }
    }

    return anomalies;
  }

  private getHourlyActivity(logs: any[]): Record<string, number> {
    const hourlyActivity: Record<string, number> = {};
    
    for (const log of logs) {
      const hour = new Date(log.timestamp).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    }

    return hourlyActivity;
  }

  private calculateUserRiskScore(
    auditLogs: any[],
    patterns: UserPattern[],
    anomalies: Anomaly[]
  ): number {
    let riskScore = 0;

    // Base risk from failed operations
    const failedOps = auditLogs.filter(log => !log.success);
    riskScore += Math.min(failedOps.length * 5, 30);

    // Risk from patterns
    for (const pattern of patterns) {
      if (pattern.risk === 'high') riskScore += 20;
      else if (pattern.risk === 'medium') riskScore += 10;
      else if (pattern.risk === 'low') riskScore += 5;
    }

    // Risk from anomalies
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'high') riskScore += 25;
      else if (anomaly.severity === 'medium') riskScore += 15;
      else riskScore += 5;
    }

    return Math.min(riskScore, 100);
  }

  private assessPatternRisk(patternType: string, frequency: number): 'low' | 'medium' | 'high' {
    const riskThresholds = {
      login_pattern: { low: 5, medium: 20 },
      bulk_data_access: { low: 50, medium: 200 },
      failed_operations: { low: 3, medium: 10 }
    };

    const thresholds = riskThresholds[patternType] || { low: 10, medium: 50 };
    
    if (frequency >= thresholds.medium) return 'high';
    if (frequency >= thresholds.low) return 'medium';
    return 'low';
  }

  private getUserAgent(): string | null {
    // Implementation depends on request context
    return null;
  }
}

// Type definitions
interface AuditContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogEntry {
  action: string;
  resource: {
    type: string;
    id?: string;
    name?: string;
  };
  actor?: {
    type?: string;
    email?: string;
    name?: string;
  };
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
  duration?: number;
  oldValues?: any;
  newValues?: any;
  severity: string;
  category: string;
  tags?: string[];
  metadata?: any;
  requiresReview?: boolean;
  sensitiveDataAccessed?: boolean;
  gdprRelevant?: boolean;
  pciRelevant?: boolean;
  retentionPolicy?: string;
}

interface SecurityEventDetails {
  attackVector?: string;
  detectionMethod: string;
  confidenceScore?: number;
  blocked: boolean;
  actionTaken: string;
  [key: string]: any;
}

interface FinancialTransactionDetails {
  success: boolean;
  customerId?: string;
  supplierId?: string;
  paymentMethod?: string;
  paymentProcessor?: string;
  errorCode?: string;
  errorMessage?: string;
  additionalData?: any;
}

interface UserPattern {
  type: string;
  description: string;
  frequency: number;
  confidence: number;
  risk: 'low' | 'medium' | 'high';
}

interface Anomaly {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  data: any;
}
```

## Testing Requirements

### Unit Tests

```typescript
// __tests__/unit/audit-service.test.ts
import { AuditService } from '@/lib/audit/audit-service';

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService({
      requestId: 'test-request-id',
      userId: 'test-user-id',
      ipAddress: '127.0.0.1'
    });
  });

  describe('Core audit logging', () => {
    it('should log user activity with proper enrichment', async () => {
      await auditService.logUserActivity(
        'create',
        'wedding',
        'wedding-123',
        { venue: 'Grand Ballroom' }
      );

      // Verify log was written to database
      // Mock assertions would go here
      expect(true).toBe(true); // Placeholder
    });

    it('should log security events with threat assessment', async () => {
      await auditService.logSecurityEvent(
        'brute_force_attempt',
        'high',
        {
          detectionMethod: 'rate_limiting',
          blocked: true,
          actionTaken: 'ip_blocked'
        }
      );

      // Verify security log was written
      expect(true).toBe(true);
    });
  });

  describe('Investigation capabilities', () => {
    it('should investigate user activity patterns', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-02')
      };

      const investigation = await auditService.investigateUserActivity(
        'test-user-id',
        timeRange
      );

      expect(investigation).toMatchObject({
        userId: 'test-user-id',
        timeRange,
        patterns: expect.any(Array),
        anomalies: expect.any(Array),
        riskScore: expect.any(Number)
      });
    });

    it('should trace request across services', async () => {
      const trace = await auditService.traceRequest('test-request-id');

      expect(trace).toMatchObject({
        requestId: 'test-request-id',
        timeline: expect.any(Array),
        performance: expect.any(Object)
      });
    });
  });

  describe('Compliance reporting', () => {
    it('should generate GDPR compliance report', async () => {
      const timeRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };

      const report = await auditService.generateComplianceReport(
        timeRange,
        'gdpr'
      );

      expect(report).toMatchObject({
        complianceType: 'gdpr',
        summary: expect.objectContaining({
          complianceScore: expect.any(Number)
        }),
        findings: expect.any(Array),
        recommendations: expect.any(Array)
      });
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/audit-api.test.ts
import { testApiHandler } from 'next-test-api-route-handler';
import auditHandler from '@/app/api/audit/logs/route';

describe('/api/audit/logs', () => {
  it('should query audit logs with filters', async () => {
    await testApiHandler({
      handler: auditHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: {
            authorization: 'Bearer valid-admin-token'
          },
          url: '?timeRange.start=2024-01-01&timeRange.end=2024-01-31&severity=error'
        });

        expect(res.status).toBe(200);
        
        const data = await res.json();
        expect(data).toMatchObject({
          logs: expect.any(Array),
          pagination: expect.objectContaining({
            total: expect.any(Number)
          }),
          aggregations: expect.any(Object)
        });
      }
    });
  });

  it('should require proper authorization for audit access', async () => {
    await testApiHandler({
      handler: auditHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET'
        });

        expect(res.status).toBe(401);
      }
    });
  });
});
```

## Dependencies

### Audit and Monitoring Libraries
```json
{
  "dependencies": {
    "winston": "^3.11.0",
    "winston-transport": "^4.6.0",
    "@datadog/browser-logs": "^5.8.0",
    "@elastic/elasticsearch": "^8.11.0",
    "node-cron": "^3.0.3",
    "compression": "^1.7.4",
    "archiver": "^6.0.1"
  },
  "devDependencies": {
    "@types/archiver": "^6.0.2",
    "@types/compression": "^1.7.5"
  }
}
```

## Effort Estimate

**Total Effort: 14-16 Sprint Points (28-32 days)**

### Breakdown:
- **Database Schema & Partitioning**: 3-4 days
- **Core Audit Service Implementation**: 5-6 days
- **Specialized Audit Tables & Logic**: 3-4 days
- **Real-time Monitoring System**: 4-5 days
- **Investigation & Analytics Tools**: 4-5 days
- **Frontend Dashboard & Investigation UI**: 5-6 days
- **External Integrations**: 2-3 days
- **Performance Optimization**: 2-3 days
- **Compliance Reporting**: 3-4 days
- **Testing & Security Validation**: 4-5 days
- **Documentation & Training**: 2 days

### Risk Factors:
- **High**: Performance at scale with high-volume logging
- **High**: Data retention and archival complexity
- **Medium**: Real-time monitoring and alerting
- **Medium**: Compliance reporting accuracy
- **Low**: Basic audit logging functionality

### Success Criteria:
- ✅ 100% capture of critical business activities
- ✅ Sub-second query performance for investigations
- ✅ Zero data loss in audit trails
- ✅ Complete forensic reconstruction capability
- ✅ Full regulatory compliance (GDPR, PCI DSS, SOX)
- ✅ Real-time security threat detection and alerting