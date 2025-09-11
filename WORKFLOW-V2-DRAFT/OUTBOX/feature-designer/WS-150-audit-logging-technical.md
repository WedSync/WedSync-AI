# WS-150: Audit Logging Technical Specification

## 1. User Story & Real-World Wedding Scenario

**As a wedding business owner David** managing high-end celebrity weddings worth $2M+, I need comprehensive audit logging to track every action on sensitive client data, ensure compliance with privacy contracts, and provide forensic evidence in case of security incidents or legal disputes.

**Real Wedding Scenario**: David's agency handles a celebrity wedding where contract disputes arise over photo usage rights, and the celebrity's legal team demands a complete audit trail of who accessed what data, when, and why. The audit system must provide irrefutable evidence of data handling practices, user access patterns, and system security events to protect against $10M+ liability claims.

**Business Impact**: 
- Provides legal protection against data misuse claims
- Ensures SOX compliance for public company clients  
- Maintains client trust for high-value contracts
- Enables forensic investigation of security incidents
- Supports regulatory compliance (GDPR, CCPA, HIPAA)

## 2. Technical Architecture

### Comprehensive Audit Framework
```typescript
// Multi-layered audit logging architecture
interface AuditArchitecture {
  userActions: {
    authentication: LoginAudit | LogoutAudit | PasswordChangeAudit;
    dataAccess: DataViewAudit | DataDownloadAudit | DataExportAudit;
    dataModification: DataCreateAudit | DataUpdateAudit | DataDeleteAudit;
    permissions: PermissionGrantAudit | PermissionRevokeAudit;
  };
  systemEvents: {
    security: SecurityEventAudit | BreachAttemptAudit;
    performance: PerformanceEventAudit;
    errors: ErrorEventAudit | ExceptionAudit;
    configuration: ConfigChangeAudit | SystemUpdateAudit;
  };
  businessEvents: {
    transactions: PaymentAudit | RefundAudit;
    workflows: WorkflowStateAudit | ApprovalAudit;
    communications: EmailAudit | SMSAudit;
    integrations: APICallAudit | WebhookAudit;
  };
  compliance: {
    gdpr: ConsentAudit | DataSubjectRequestAudit;
    retention: DataRetentionAudit | DataPurgeAudit;
    encryption: EncryptionAudit | KeyRotationAudit;
  };
}
```

### Event Classification System
```typescript
enum AuditEventCategory {
  AUTHENTICATION = 'authentication',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  SECURITY = 'security',
  BUSINESS = 'business',
  SYSTEM = 'system',
  COMPLIANCE = 'compliance',
  INTEGRATION = 'integration'
}

enum AuditSeverityLevel {
  INFO = 'info',           // Normal operations
  WARNING = 'warning',     // Unusual but not critical
  ERROR = 'error',         // Errors requiring attention
  CRITICAL = 'critical',   // Security or business critical
  EMERGENCY = 'emergency'  // Immediate action required
}

interface AuditEvent {
  id: string;
  timestamp: Date;
  category: AuditEventCategory;
  severity: AuditSeverityLevel;
  eventType: string;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  resource: string;
  action: string;
  outcome: 'success' | 'failure' | 'error';
  details: Record<string, any>;
  riskScore: number; // 0-100
  geolocation?: {
    country: string;
    region: string;
    city: string;
  };
  deviceFingerprint?: string;
  correlationId?: string; // Links related events
}
```

## 3. Database Schema

```sql
-- Comprehensive audit log table with partitioning
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  event_id TEXT NOT NULL UNIQUE, -- Human-readable event ID
  correlation_id UUID, -- Links related events together
  parent_event_id UUID, -- For nested/hierarchical events
  
  -- Timestamp and timing
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_duration_ms INTEGER, -- How long the action took
  
  -- Event classification
  category TEXT NOT NULL, -- authentication, data_access, etc.
  event_type TEXT NOT NULL, -- login_success, data_viewed, etc.
  severity_level TEXT NOT NULL DEFAULT 'info',
  
  -- User and session context
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT, -- Stored separately in case user is deleted
  user_role TEXT,
  session_id TEXT,
  impersonated_by UUID REFERENCES auth.users(id), -- If admin acting as user
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  request_id TEXT, -- From load balancer or application
  api_endpoint TEXT,
  http_method TEXT,
  http_status INTEGER,
  
  -- Resource and action details
  resource_type TEXT, -- user, wedding, client, supplier, etc.
  resource_id TEXT, -- ID of the affected resource
  resource_name TEXT, -- Human-readable resource identifier
  action TEXT NOT NULL, -- create, read, update, delete, login, etc.
  outcome TEXT NOT NULL, -- success, failure, error
  
  -- Data context
  data_classification TEXT, -- public, internal, confidential, restricted
  sensitive_data_accessed BOOLEAN DEFAULT false,
  data_categories TEXT[], -- PII, financial, health, etc.
  field_names TEXT[], -- Specific fields accessed/modified
  record_count INTEGER, -- Number of records affected
  
  -- Change tracking
  old_values JSONB, -- Previous values (encrypted if sensitive)
  new_values JSONB, -- New values (encrypted if sensitive)
  change_summary TEXT, -- Human-readable summary of changes
  
  -- Security and risk
  risk_score INTEGER DEFAULT 0, -- 0-100 calculated risk score
  anomaly_detected BOOLEAN DEFAULT false,
  fraud_indicators TEXT[],
  security_flags TEXT[],
  
  -- Geolocation and device
  country_code TEXT,
  region TEXT,
  city TEXT,
  device_fingerprint TEXT,
  device_type TEXT, -- desktop, mobile, tablet
  browser_name TEXT,
  operating_system TEXT,
  
  -- Business context
  client_id UUID REFERENCES clients(id),
  wedding_id UUID REFERENCES weddings(id),
  organization_id UUID REFERENCES organizations(id),
  
  -- Compliance and legal
  legal_basis TEXT, -- GDPR legal basis
  retention_period INTERVAL, -- How long to keep this audit record
  compliance_tags TEXT[], -- GDPR, CCPA, SOX, etc.
  data_subject_id UUID, -- Person whose data was accessed
  
  -- Additional metadata
  application_version TEXT,
  feature_flags TEXT[], -- Which features were enabled
  experiment_id TEXT, -- A/B testing context
  custom_attributes JSONB, -- Extensible custom data
  
  -- Error details (if outcome = error or failure)
  error_code TEXT,
  error_message TEXT,
  stack_trace TEXT,
  
  -- Notification and alerting
  alert_triggered BOOLEAN DEFAULT false,
  alert_recipients TEXT[],
  notification_sent_at TIMESTAMPTZ,
  
  -- Integrity and verification
  checksum TEXT, -- Hash of the entire record for tamper detection
  digital_signature TEXT, -- Optional digital signature
  
  -- Indexes for common queries
  INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC),
  INDEX idx_audit_log_user_id ON audit_log(user_id),
  INDEX idx_audit_log_category ON audit_log(category),
  INDEX idx_audit_log_event_type ON audit_log(event_type),
  INDEX idx_audit_log_resource_type_id ON audit_log(resource_type, resource_id),
  INDEX idx_audit_log_severity ON audit_log(severity_level),
  INDEX idx_audit_log_outcome ON audit_log(outcome),
  INDEX idx_audit_log_risk_score ON audit_log(risk_score DESC),
  INDEX idx_audit_log_ip_address ON audit_log(ip_address),
  INDEX idx_audit_log_correlation_id ON audit_log(correlation_id),
  INDEX idx_audit_log_sensitive_data ON audit_log(sensitive_data_accessed),
  INDEX idx_audit_log_compliance ON audit_log USING GIN(compliance_tags),
  INDEX idx_audit_log_data_categories ON audit_log USING GIN(data_categories)
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for better performance
CREATE TABLE audit_log_2024_01 PARTITION OF audit_log
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE audit_log_2024_02 PARTITION OF audit_log
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Security events table for high-priority security incidents
CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID REFERENCES audit_log(id),
  
  -- Security-specific fields
  threat_type TEXT NOT NULL, -- brute_force, injection, xss, etc.
  attack_vector TEXT,
  threat_level TEXT NOT NULL, -- low, medium, high, critical
  blocked BOOLEAN DEFAULT false,
  
  -- Attack details
  payload TEXT, -- Malicious payload (sanitized)
  source_ip INET,
  target_resource TEXT,
  attack_pattern TEXT,
  
  -- Response actions
  response_actions TEXT[], -- blocked_ip, revoked_session, etc.
  incident_id UUID, -- Links to incident management system
  
  -- Investigation
  investigated_by UUID REFERENCES auth.users(id),
  investigation_status TEXT DEFAULT 'pending',
  false_positive BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_security_audit_threat_type ON security_audit_log(threat_type),
  INDEX idx_security_audit_threat_level ON security_audit_log(threat_level),
  INDEX idx_security_audit_source_ip ON security_audit_log(source_ip)
);

-- Performance audit log for monitoring system performance
CREATE TABLE performance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID REFERENCES audit_log(id),
  
  -- Performance metrics
  response_time_ms INTEGER,
  cpu_usage_percent DECIMAL(5,2),
  memory_usage_mb INTEGER,
  database_query_time_ms INTEGER,
  database_query_count INTEGER,
  cache_hit_rate DECIMAL(5,2),
  
  -- Resource usage
  bytes_transferred BIGINT,
  files_processed INTEGER,
  api_calls_made INTEGER,
  
  -- Performance thresholds
  sla_violated BOOLEAN DEFAULT false,
  performance_threshold TEXT, -- Which threshold was crossed
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_performance_audit_response_time ON performance_audit_log(response_time_ms DESC),
  INDEX idx_performance_audit_sla_violated ON performance_audit_log(sla_violated)
);

-- Data access patterns for anomaly detection
CREATE TABLE data_access_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Access pattern analysis
  resource_type TEXT,
  access_frequency INTEGER, -- Accesses per day
  typical_access_times INTEGER[], -- Array of typical hours (0-23)
  typical_locations TEXT[], -- Typical countries/regions
  typical_devices TEXT[], -- Typical device fingerprints
  
  -- Anomaly tracking
  anomaly_score DECIMAL(5,2), -- Current anomaly score (0-100)
  last_anomaly_at TIMESTAMPTZ,
  anomaly_count INTEGER DEFAULT 0,
  
  -- Pattern metadata
  pattern_established_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  confidence_level DECIMAL(5,2), -- How confident we are in the pattern
  
  UNIQUE(user_id, resource_type),
  INDEX idx_data_access_patterns_user_id ON data_access_patterns(user_id),
  INDEX idx_data_access_patterns_anomaly_score ON data_access_patterns(anomaly_score DESC)
);

-- Audit retention policies
CREATE TABLE audit_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name TEXT NOT NULL UNIQUE,
  
  -- Selection criteria
  category_filter TEXT[], -- Which categories this policy applies to
  severity_filter TEXT[], -- Which severity levels
  user_role_filter TEXT[], -- Which user roles
  resource_type_filter TEXT[], -- Which resource types
  
  -- Retention rules
  retention_period INTERVAL NOT NULL,
  archive_after INTERVAL, -- Move to cold storage after this time
  
  -- Legal and compliance
  legal_basis TEXT,
  compliance_requirement TEXT[], -- SOX, GDPR, etc.
  override_conditions TEXT[], -- Conditions that override this policy
  
  -- Policy metadata
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_audit_retention_policies_active ON audit_retention_policies(active)
);

-- Audit log exports and reports
CREATE TABLE audit_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_id TEXT NOT NULL UNIQUE,
  
  -- Export parameters
  requested_by UUID REFERENCES auth.users(id) NOT NULL,
  export_type TEXT NOT NULL, -- compliance_report, security_audit, etc.
  format TEXT NOT NULL, -- json, csv, pdf
  
  -- Filter criteria
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  category_filter TEXT[],
  user_filter TEXT[],
  resource_filter TEXT[],
  
  -- Export status
  status TEXT DEFAULT 'processing', -- processing, completed, failed, expired
  progress_percent INTEGER DEFAULT 0,
  total_records BIGINT,
  processed_records BIGINT,
  
  -- Export metadata
  file_size_bytes BIGINT,
  file_path TEXT, -- Path to exported file
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  encryption_key_id TEXT, -- For encrypted exports
  
  -- Compliance and security
  access_log JSONB DEFAULT '[]', -- Who accessed the export
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  INDEX idx_audit_exports_requested_by ON audit_exports(requested_by),
  INDEX idx_audit_exports_status ON audit_exports(status),
  INDEX idx_audit_exports_expires_at ON audit_exports(expires_at)
);

-- Real-time alert configurations
CREATE TABLE audit_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Trigger conditions
  event_category TEXT,
  event_types TEXT[], -- Specific event types to monitor
  severity_threshold TEXT, -- Minimum severity to trigger
  user_roles TEXT[], -- Which user roles to monitor
  resource_types TEXT[], -- Which resource types to monitor
  
  -- Advanced conditions
  risk_score_threshold INTEGER, -- Minimum risk score
  frequency_threshold INTEGER, -- Max events per time window
  time_window_minutes INTEGER DEFAULT 60,
  anomaly_threshold DECIMAL(5,2), -- Anomaly score threshold
  
  -- Conditional logic
  conditions JSONB, -- Complex JSON-based conditions
  
  -- Alert actions
  alert_channels TEXT[], -- email, slack, webhook, sms
  recipients TEXT[], -- Who to notify
  escalation_minutes INTEGER, -- Auto-escalate if not acknowledged
  
  -- Alert metadata
  active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_audit_alert_rules_active ON audit_alert_rules(active),
  INDEX idx_audit_alert_rules_category ON audit_alert_rules(event_category)
);

-- Alert instances and acknowledgments
CREATE TABLE audit_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id TEXT NOT NULL UNIQUE,
  rule_id UUID REFERENCES audit_alert_rules(id),
  audit_log_id UUID REFERENCES audit_log(id),
  
  -- Alert details
  alert_level TEXT NOT NULL, -- info, warning, critical
  alert_message TEXT NOT NULL,
  alert_data JSONB, -- Additional alert context
  
  -- Status tracking
  status TEXT DEFAULT 'active', -- active, acknowledged, resolved, false_positive
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Notification tracking
  notifications_sent JSONB DEFAULT '[]', -- Array of sent notifications
  escalated BOOLEAN DEFAULT false,
  escalated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_audit_alerts_rule_id ON audit_alerts(rule_id),
  INDEX idx_audit_alerts_status ON audit_alerts(status),
  INDEX idx_audit_alerts_created_at ON audit_alerts(created_at DESC)
);

-- Create triggers for automatic audit logging
CREATE OR REPLACE FUNCTION log_data_changes()
RETURNS TRIGGER AS $$
DECLARE
  audit_data JSONB;
  current_user_id UUID;
  current_ip INET;
BEGIN
  -- Get current user context (set by application)
  current_user_id := current_setting('audit.user_id', true)::UUID;
  current_ip := current_setting('audit.ip_address', true)::INET;
  
  -- Build audit data
  audit_data := jsonb_build_object(
    'table_name', TG_TABLE_NAME,
    'operation', TG_OP,
    'old_values', CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    'new_values', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
  );
  
  -- Insert audit record
  INSERT INTO audit_log (
    event_id, category, event_type, user_id, ip_address,
    resource_type, action, outcome, old_values, new_values,
    custom_attributes
  ) VALUES (
    'DB_' || gen_random_uuid()::TEXT,
    'data_modification',
    TG_TABLE_NAME || '_' || lower(TG_OP),
    current_user_id,
    current_ip,
    TG_TABLE_NAME,
    lower(TG_OP),
    'success',
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    audit_data
  );
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_users_changes
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION log_data_changes();

CREATE TRIGGER audit_clients_changes
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION log_data_changes();

CREATE TRIGGER audit_suppliers_changes
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION log_data_changes();
```

## 4. API Endpoints

### Audit Query API
```typescript
interface AuditQueryAPI {
  // Search and filter audit logs
  'GET /audit/logs': {
    query: {
      startDate?: string;
      endDate?: string;
      category?: string[];
      eventType?: string[];
      userId?: string;
      resourceType?: string;
      resourceId?: string;
      severity?: string[];
      outcome?: 'success' | 'failure' | 'error';
      riskScore?: {
        min?: number;
        max?: number;
      };
      sensitiveData?: boolean;
      ipAddress?: string;
      search?: string; // Full-text search
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    };
    response: {
      logs: AuditLogEntry[];
      pagination: {
        total: number;
        page: number;
        pages: number;
        limit: number;
      };
      aggregations: {
        categoryCounts: Record<string, number>;
        severityCounts: Record<string, number>;
        timeDistribution: Array<{ date: string; count: number }>;
      };
    };
  };

  // Get specific audit log entry with full details
  'GET /audit/logs/:logId': {
    response: {
      log: DetailedAuditLogEntry;
      relatedEvents: AuditLogEntry[]; // Events with same correlation ID
      context: {
        userSession: SessionContext;
        resourceHistory: ResourceChangeHistory[];
        riskAnalysis: RiskAnalysis;
      };
    };
  };

  // Get audit trail for specific resource
  'GET /audit/trail/:resourceType/:resourceId': {
    query: {
      startDate?: string;
      endDate?: string;
      includeRelated?: boolean;
    };
    response: {
      resource: {
        type: string;
        id: string;
        name: string;
        currentState: any;
      };
      trail: AuditLogEntry[];
      timeline: Array<{
        timestamp: string;
        action: string;
        user: string;
        summary: string;
        impact: 'low' | 'medium' | 'high';
      }>;
    };
  };

  // Get user activity audit
  'GET /audit/users/:userId/activity': {
    query: {
      startDate?: string;
      endDate?: string;
      includeSystemActions?: boolean;
      groupBy?: 'day' | 'week' | 'month';
    };
    response: {
      user: UserSummary;
      statistics: {
        totalEvents: number;
        loginCount: number;
        dataAccessCount: number;
        modificationsCount: number;
        securityEvents: number;
        avgRiskScore: number;
      };
      activity: AuditLogEntry[];
      patterns: {
        mostActiveHours: number[];
        commonActions: Array<{ action: string; count: number }>;
        frequentResources: Array<{ resource: string; count: number }>;
      };
    };
  };

  // Security events monitoring
  'GET /audit/security/events': {
    query: {
      threatLevel?: 'low' | 'medium' | 'high' | 'critical';
      threatType?: string;
      blocked?: boolean;
      investigated?: boolean;
      startDate?: string;
      endDate?: string;
    };
    response: {
      events: SecurityAuditEvent[];
      threats: {
        active: number;
        blocked: number;
        investigated: number;
        falsePositives: number;
      };
      topThreats: Array<{
        type: string;
        count: number;
        trend: 'increasing' | 'decreasing' | 'stable';
      }>;
    };
  };
}
```

### Audit Administration API
```typescript
interface AuditAdministrationAPI {
  // Create audit export/report
  'POST /audit/exports': {
    body: {
      exportType: 'compliance_report' | 'security_audit' | 'user_activity' | 'data_access';
      format: 'json' | 'csv' | 'pdf' | 'xlsx';
      filters: {
        startDate: string;
        endDate: string;
        categories?: string[];
        users?: string[];
        resources?: string[];
        severity?: string[];
      };
      includePersonalData?: boolean;
      encryptExport?: boolean;
      recipientEmail?: string;
    };
    response: {
      exportId: string;
      status: 'processing' | 'completed' | 'failed';
      estimatedCompletion: string;
      downloadUrl?: string;
      expiresAt: string;
    };
  };

  // Get export status and download
  'GET /audit/exports/:exportId': {
    response: {
      exportId: string;
      status: 'processing' | 'completed' | 'failed' | 'expired';
      progress: number; // 0-100
      totalRecords: number;
      processedRecords: number;
      downloadUrl?: string;
      expiresAt: string;
      error?: string;
    };
  };

  // Configure audit alert rules
  'POST /audit/alerts/rules': {
    body: {
      ruleName: string;
      description?: string;
      conditions: {
        categories?: string[];
        eventTypes?: string[];
        severityThreshold?: string;
        riskScoreThreshold?: number;
        frequencyThreshold?: {
          count: number;
          timeWindow: number; // minutes
        };
        userRoles?: string[];
        resourceTypes?: string[];
      };
      actions: {
        channels: ('email' | 'slack' | 'webhook' | 'sms')[];
        recipients: string[];
        escalationMinutes?: number;
      };
      active: boolean;
    };
    response: {
      ruleId: string;
      status: 'active' | 'inactive';
      validationErrors?: string[];
    };
  };

  // Manage audit retention policies
  'POST /audit/retention/policies': {
    body: {
      policyName: string;
      criteria: {
        categories?: string[];
        severityLevels?: string[];
        userRoles?: string[];
        resourceTypes?: string[];
      };
      retentionPeriod: string; // ISO duration
      archiveAfter?: string; // ISO duration
      legalBasis: string;
      complianceRequirements: string[];
    };
    response: {
      policyId: string;
      affectedRecords: number;
      nextPurgeDate: string;
    };
  };

  // Anonymize or purge audit data
  'POST /audit/purge': {
    body: {
      criteria: {
        olderThan: string; // ISO date
        categories?: string[];
        users?: string[];
        retentionPolicyId?: string;
      };
      action: 'anonymize' | 'delete';
      dryRun?: boolean;
    };
    response: {
      affectedRecords: number;
      purgeJobId: string;
      estimatedCompletion: string;
      warnings: string[];
    };
  };

  // Real-time audit streaming
  'GET /audit/stream': {
    headers: {
      'Accept': 'text/event-stream';
    };
    query: {
      categories?: string;
      minSeverity?: string;
      users?: string;
    };
    response: ServerSentEvent; // Real-time audit events
  };
}
```

### Compliance Audit API
```typescript
interface ComplianceAuditAPI {
  // Generate compliance report
  'GET /audit/compliance/report': {
    query: {
      regulation: 'GDPR' | 'CCPA' | 'SOX' | 'HIPAA' | 'PCI_DSS';
      startDate: string;
      endDate: string;
      format: 'json' | 'pdf';
      includeRecommendations?: boolean;
    };
    response: {
      reportId: string;
      regulation: string;
      period: { start: string; end: string };
      complianceScore: number; // 0-100
      findings: ComplianceFinding[];
      recommendations: ComplianceRecommendation[];
      auditTrail: {
        dataAccess: DataAccessSummary;
        userManagement: UserManagementSummary;
        securityEvents: SecurityEventsSummary;
        dataRetention: DataRetentionSummary;
      };
      downloadUrl?: string;
    };
  };

  // Data lineage and access tracking
  'GET /audit/compliance/data-lineage': {
    query: {
      dataSubjectId?: string;
      resourceId?: string;
      dataCategory?: string;
      includeProcessingBasis?: boolean;
    };
    response: {
      dataSubject: DataSubjectInfo;
      accessLog: DataAccessEvent[];
      processingActivities: ProcessingActivity[];
      dataFlow: DataFlowMap[];
      retentionStatus: RetentionStatus;
      consentHistory: ConsentEvent[];
    };
  };

  // Compliance dashboard metrics
  'GET /audit/compliance/metrics': {
    query: {
      timeframe: '7d' | '30d' | '90d' | '1y';
    };
    response: {
      overview: {
        totalAuditEvents: number;
        securityIncidents: number;
        complianceViolations: number;
        dataSubjectRequests: number;
      };
      trends: {
        auditVolume: TimeSeriesData[];
        riskScores: TimeSeriesData[];
        userActivity: TimeSeriesData[];
        securityEvents: TimeSeriesData[];
      };
      compliance: {
        gdpr: ComplianceMetrics;
        ccpa: ComplianceMetrics;
        sox: ComplianceMetrics;
      };
      topRisks: RiskSummary[];
    };
  };
}
```

## 5. Frontend Components

### Comprehensive Audit Dashboard
```tsx
// Advanced audit logging dashboard with real-time monitoring
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { 
  Shield, Search, Filter, Download, AlertTriangle, 
  Eye, Activity, Users, Database, Settings, Clock 
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  category: string;
  eventType: string;
  severity: string;
  userId?: string;
  userEmail?: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  outcome: string;
  riskScore: number;
  ipAddress: string;
  location?: string;
  details: any;
}

interface AuditFilters {
  dateRange: { from: Date; to: Date };
  categories: string[];
  severity: string[];
  users: string[];
  outcome: string[];
  search: string;
}

export function AuditDashboard() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [filters, setFilters] = useState<AuditFilters>({
    dateRange: { 
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
      to: new Date() 
    },
    categories: [],
    severity: [],
    users: [],
    outcome: [],
    search: ''
  });
  const [loading, setLoading] = useState(true);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    loadAuditLogs();
    loadStatistics();
    
    // Set up real-time updates if enabled
    if (realTimeEnabled) {
      setupRealTimeUpdates();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [filters, realTimeEnabled]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        startDate: filters.dateRange.from.toISOString(),
        endDate: filters.dateRange.to.toISOString(),
        ...(filters.categories.length && { category: filters.categories.join(',') }),
        ...(filters.severity.length && { severity: filters.severity.join(',') }),
        ...(filters.outcome.length && { outcome: filters.outcome.join(',') }),
        ...(filters.search && { search: filters.search }),
        limit: '100',
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      const response = await fetch(`/audit/logs?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      
      const data = await response.json();
      setLogs(data.logs);
      setFilteredLogs(data.logs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
    setLoading(false);
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch('/audit/compliance/metrics?timeframe=7d', {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const setupRealTimeUpdates = () => {
    const eventSource = new EventSource(`/audit/stream?minSeverity=warning`, {
      headers: { 'Authorization': `Bearer ${getAccessToken()}` }
    });

    eventSource.onmessage = (event) => {
      const newLog = JSON.parse(event.data);
      setLogs(prev => [newLog, ...prev.slice(0, 99)]);
      setFilteredLogs(prev => [newLog, ...prev.slice(0, 99)]);
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      setRealTimeEnabled(false);
    };

    eventSourceRef.current = eventSource;
  };

  const exportAuditLogs = async (format: string) => {
    try {
      const response = await fetch('/audit/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({
          exportType: 'security_audit',
          format,
          filters: {
            startDate: filters.dateRange.from.toISOString(),
            endDate: filters.dateRange.to.toISOString(),
            categories: filters.categories,
            severity: filters.severity
          }
        })
      });

      const result = await response.json();
      
      // Poll for completion
      if (result.exportId) {
        pollExportStatus(result.exportId);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const pollExportStatus = async (exportId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/audit/exports/${exportId}`, {
          headers: { 'Authorization': `Bearer ${getAccessToken()}` }
        });
        const status = await response.json();

        if (status.status === 'completed' && status.downloadUrl) {
          // Trigger download
          window.open(status.downloadUrl, '_blank');
        } else if (status.status === 'processing') {
          setTimeout(checkStatus, 2000); // Check again in 2 seconds
        }
      } catch (error) {
        console.error('Failed to check export status:', error);
      }
    };

    checkStatus();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'bg-red-100 text-red-800 border-red-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'failure': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600 font-bold';
    if (score >= 60) return 'text-orange-600 font-semibold';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading && logs.length === 0) return <div>Loading audit dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="text-blue-600" />
          Audit & Security Dashboard
        </h1>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={realTimeEnabled ? 'default' : 'outline'}
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
          >
            <Activity size={16} className="mr-1" />
            Real-time {realTimeEnabled ? 'On' : 'Off'}
          </Button>
          
          <Select onValueChange={(format) => exportAuditLogs(format)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <Download size={16} className="mr-1 inline" />
                CSV
              </SelectItem>
              <SelectItem value="json">
                <Download size={16} className="mr-1 inline" />
                JSON
              </SelectItem>
              <SelectItem value="pdf">
                <Download size={16} className="mr-1 inline" />
                PDF
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Events</p>
                <p className="text-2xl font-bold">{statistics.overview.totalAuditEvents.toLocaleString()}</p>
              </div>
              <Activity className="text-blue-500" size={24} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Security Incidents</p>
                <p className="text-2xl font-bold text-red-600">{statistics.overview.securityIncidents}</p>
              </div>
              <AlertTriangle className="text-red-500" size={24} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{statistics.overview.activeUsers || 'N/A'}</p>
              </div>
              <Users className="text-green-500" size={24} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Data Requests</p>
                <p className="text-2xl font-bold">{statistics.overview.dataSubjectRequests}</p>
              </div>
              <Database className="text-purple-500" size={24} />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Search size={16} />
            <Input
              placeholder="Search audit logs..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-64"
            />
          </div>

          <DatePickerWithRange
            date={filters.dateRange}
            onDateChange={(range) => setFilters({ ...filters, dateRange: range })}
          />

          <Select 
            value={filters.categories.join(',')} 
            onValueChange={(value) => setFilters({ ...filters, categories: value.split(',').filter(Boolean) })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              <SelectItem value="authentication">Authentication</SelectItem>
              <SelectItem value="data_access">Data Access</SelectItem>
              <SelectItem value="data_modification">Data Modification</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.severity.join(',')}
            onValueChange={(value) => setFilters({ ...filters, severity: value.split(',').filter(Boolean) })}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Severity</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setFilters({
              dateRange: { 
                from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
                to: new Date() 
              },
              categories: [],
              severity: [],
              users: [],
              outcome: [],
              search: ''
            })}
          >
            <Filter size={16} className="mr-1" />
            Clear Filters
          </Button>
        </div>
      </Card>

      <Tabs defaultValue="logs" className="w-full">
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="security">Security Events</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <Card key={log.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getSeverityColor(log.severity)}>
                        {log.severity.toUpperCase()}
                      </Badge>
                      <Badge className={getOutcomeColor(log.outcome)}>
                        {log.outcome}
                      </Badge>
                      <Badge variant="outline">
                        {log.category.replace('_', ' ')}
                      </Badge>
                      {log.riskScore > 50 && (
                        <Badge variant="destructive">
                          Risk: {log.riskScore}
                        </Badge>
                      )}
                    </div>

                    <div className="mb-2">
                      <h3 className="font-medium">
                        {log.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {log.userEmail || 'System'} {log.action}ed {log.resourceType}
                        {log.resourceId && ` (${log.resourceId.slice(0, 8)}...)`}
                      </p>
                    </div>

                    <div className="text-xs text-gray-500 space-x-4">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <span>{log.ipAddress}</span>
                      {log.location && <span>{log.location}</span>}
                      {log.riskScore > 0 && (
                        <span className={getRiskScoreColor(log.riskScore)}>
                          Risk Score: {log.riskScore}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      // Navigate to detailed view
                      window.open(`/audit/logs/${log.id}`, '_blank');
                    }}
                  >
                    <Eye size={16} />
                  </Button>
                </div>

                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <details>
                      <summary className="text-sm font-medium cursor-pointer">
                        Additional Details
                      </summary>
                      <pre className="text-xs mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </Card>
            ))}

            {filteredLogs.length === 0 && (
              <Card className="p-8 text-center">
                <Shield className="mx-auto mb-4 text-gray-400" size={48} />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Audit Logs Found</h3>
                <p className="text-gray-500">
                  Try adjusting your filters or date range to see more results.
                </p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="security">
          <SecurityEventsView />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceView />
        </TabsContent>

        <TabsContent value="analytics">
          <AuditAnalyticsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Audit Trail Viewer Component
```tsx
// Detailed audit trail viewer for specific resources
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timeline } from '@/components/ui/timeline';
import { History, User, Calendar, MapPin, Shield } from 'lucide-react';

interface AuditTrailEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  userRole: string;
  summary: string;
  details: any;
  impact: 'low' | 'medium' | 'high';
  ipAddress: string;
  location?: string;
  outcome: string;
}

interface AuditTrailViewerProps {
  resourceType: string;
  resourceId: string;
  resourceName: string;
}

export function AuditTrailViewer({ 
  resourceType, 
  resourceId, 
  resourceName 
}: AuditTrailViewerProps) {
  const [trail, setTrail] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAuditTrail();
  }, [resourceType, resourceId]);

  const loadAuditTrail = async () => {
    try {
      const response = await fetch(
        `/audit/trail/${resourceType}/${resourceId}?includeRelated=true`,
        {
          headers: { 'Authorization': `Bearer ${getAccessToken()}` }
        }
      );
      const data = await response.json();
      setTrail(data.trail);
    } catch (error) {
      console.error('Failed to load audit trail:', error);
    }
    setLoading(false);
  };

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return '➕';
    if (action.includes('update') || action.includes('modify')) return '✏️';
    if (action.includes('delete') || action.includes('remove')) return '🗑️';
    if (action.includes('view') || action.includes('access')) return '👁️';
    if (action.includes('export') || action.includes('download')) return '📥';
    return '📝';
  };

  if (loading) return <div>Loading audit trail...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="text-blue-600" />
            Audit Trail
          </h1>
          <p className="text-gray-600">
            {resourceType}: {resourceName} ({resourceId.slice(0, 8)}...)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
          >
            Print Report
          </Button>
          <Button
            size="sm"
            onClick={() => {
              // Export audit trail
              const data = {
                resource: { type: resourceType, id: resourceId, name: resourceName },
                trail,
                generatedAt: new Date().toISOString()
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `audit-trail-${resourceId}.json`;
              a.click();
            }}
          >
            Export Trail
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-3">
          <Shield className="text-blue-600" size={20} />
          <div>
            <h3 className="font-semibold text-blue-900">Audit Trail Summary</h3>
            <p className="text-sm text-blue-800">
              {trail.length} events recorded • 
              {trail.filter(t => t.impact === 'high').length} high-impact changes • 
              {new Set(trail.map(t => t.user)).size} unique users
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {trail.map((entry, index) => (
          <Card key={entry.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getActionIcon(entry.action)}</span>
                  <h3 className="font-medium">{entry.summary}</h3>
                  <Badge className={getImpactColor(entry.impact)}>
                    {entry.impact.toUpperCase()}
                  </Badge>
                  {entry.outcome !== 'success' && (
                    <Badge variant="destructive">
                      {entry.outcome}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <span className="flex items-center gap-1">
                    <User size={12} />
                    {entry.user} ({entry.userRole})
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {entry.location || entry.ipAddress}
                  </span>
                </div>

                {expandedEntries.has(entry.id) && entry.details && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <h4 className="font-medium text-sm mb-2">Additional Details:</h4>
                    <pre className="text-xs text-gray-700 overflow-x-auto">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {entry.details && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleExpanded(entry.id)}
                  >
                    {expandedEntries.has(entry.id) ? 'Less' : 'More'}
                  </Button>
                )}
                
                <div className="w-2 h-8 rounded-full bg-gray-200 relative">
                  <div 
                    className={`absolute inset-x-0 bottom-0 rounded-full ${
                      entry.impact === 'high' ? 'bg-red-500' :
                      entry.impact === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{
                      height: `${
                        entry.impact === 'high' ? '100%' :
                        entry.impact === 'medium' ? '60%' : '30%'
                      }`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Timeline connector (except for last item) */}
            {index < trail.length - 1 && (
              <div className="flex justify-center mt-2">
                <div className="w-px h-4 bg-gray-300" />
              </div>
            )}
          </Card>
        ))}

        {trail.length === 0 && (
          <Card className="p-8 text-center">
            <History className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No Audit Trail Found</h3>
            <p className="text-gray-500">
              No audit events have been recorded for this resource.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
```

## 6. Implementation Code Examples

### Comprehensive Audit Service
```typescript
// Advanced audit logging service with risk scoring and anomaly detection
export class AuditService {
  private readonly RISK_THRESHOLDS = {
    HIGH_RISK_SCORE: 80,
    MEDIUM_RISK_SCORE: 50,
    ANOMALY_THRESHOLD: 0.8
  };

  // Main audit logging method
  async logEvent(event: AuditEventInput, context: AuditContext): Promise<void> {
    try {
      // Enrich event with additional context
      const enrichedEvent = await this.enrichEvent(event, context);

      // Calculate risk score
      const riskScore = await this.calculateRiskScore(enrichedEvent, context);

      // Detect anomalies
      const anomalyScore = await this.detectAnomalies(enrichedEvent, context);

      // Create audit log entry
      const auditEntry: AuditLogEntry = {
        id: crypto.randomUUID(),
        eventId: this.generateEventId(enrichedEvent),
        correlationId: context.correlationId || crypto.randomUUID(),
        timestamp: new Date(),
        
        // Event classification
        category: enrichedEvent.category,
        eventType: enrichedEvent.eventType,
        severityLevel: this.determineSeverity(riskScore, anomalyScore),
        
        // User and session context
        userId: context.userId,
        userEmail: context.userEmail,
        userRole: context.userRole,
        sessionId: context.sessionId,
        impersonatedBy: context.impersonatedBy,
        
        // Request context
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        apiEndpoint: context.apiEndpoint,
        httpMethod: context.httpMethod,
        httpStatus: context.httpStatus,
        processingDurationMs: context.processingTime,
        
        // Resource and action
        resourceType: enrichedEvent.resourceType,
        resourceId: enrichedEvent.resourceId,
        resourceName: enrichedEvent.resourceName,
        action: enrichedEvent.action,
        outcome: enrichedEvent.outcome,
        
        // Data context
        dataClassification: enrichedEvent.dataClassification,
        sensitiveDataAccessed: enrichedEvent.sensitiveDataAccessed,
        dataCategories: enrichedEvent.dataCategories,
        fieldNames: enrichedEvent.fieldNames,
        recordCount: enrichedEvent.recordCount,
        
        // Change tracking
        oldValues: enrichedEvent.oldValues,
        newValues: enrichedEvent.newValues,
        changeSummary: enrichedEvent.changeSummary,
        
        // Risk and security
        riskScore,
        anomalyDetected: anomalyScore > this.RISK_THRESHOLDS.ANOMALY_THRESHOLD,
        fraudIndicators: enrichedEvent.fraudIndicators || [],
        securityFlags: enrichedEvent.securityFlags || [],
        
        // Location and device
        countryCode: context.geoLocation?.country,
        region: context.geoLocation?.region,
        city: context.geoLocation?.city,
        deviceFingerprint: context.deviceFingerprint,
        deviceType: context.deviceType,
        browserName: context.browserName,
        operatingSystem: context.operatingSystem,
        
        // Business context
        clientId: context.clientId,
        weddingId: context.weddingId,
        organizationId: context.organizationId,
        
        // Compliance
        legalBasis: enrichedEvent.legalBasis,
        retentionPeriod: this.getRetentionPeriod(enrichedEvent),
        complianceTags: enrichedEvent.complianceTags || [],
        dataSubjectId: enrichedEvent.dataSubjectId,
        
        // Additional metadata
        applicationVersion: process.env.APP_VERSION,
        featureFlags: context.featureFlags || [],
        experimentId: context.experimentId,
        customAttributes: enrichedEvent.customAttributes,
        
        // Error information
        errorCode: enrichedEvent.errorCode,
        errorMessage: enrichedEvent.errorMessage,
        stackTrace: enrichedEvent.stackTrace,
        
        // Integrity
        checksum: '', // Will be calculated after insertion
        digitalSignature: '' // Optional digital signature
      };

      // Store audit log
      await this.storeAuditLog(auditEntry);

      // Check for alerting conditions
      await this.checkAlertConditions(auditEntry);

      // Update user access patterns
      if (auditEntry.userId) {
        await this.updateAccessPatterns(auditEntry);
      }

      // Store security events separately if needed
      if (auditEntry.category === 'security') {
        await this.storeSecurityEvent(auditEntry);
      }

      console.log(`Audit event logged: ${auditEntry.eventId}`);

    } catch (error) {
      console.error('Failed to log audit event:', error);
      
      // Create emergency audit log entry
      await this.logEmergencyEvent({
        eventType: 'audit_logging_failure',
        error: error.message,
        originalEvent: event
      });
    }
  }

  private async enrichEvent(
    event: AuditEventInput,
    context: AuditContext
  ): Promise<EnrichedAuditEvent> {
    const enriched: EnrichedAuditEvent = { ...event };

    // Enrich with resource information
    if (event.resourceId && event.resourceType) {
      try {
        const resourceInfo = await this.getResourceInfo(event.resourceType, event.resourceId);
        enriched.resourceName = resourceInfo.name;
        enriched.dataClassification = resourceInfo.classification;
      } catch (error) {
        console.warn('Failed to enrich resource info:', error);
      }
    }

    // Detect sensitive data access
    if (event.fieldNames) {
      enriched.sensitiveDataAccessed = this.hasSensitiveFields(event.fieldNames);
      enriched.dataCategories = this.categorizeDataFields(event.fieldNames);
    }

    // Add fraud indicators
    enriched.fraudIndicators = await this.detectFraudIndicators(event, context);

    // Add security flags
    enriched.securityFlags = await this.detectSecurityFlags(event, context);

    return enriched;
  }

  private async calculateRiskScore(
    event: EnrichedAuditEvent,
    context: AuditContext
  ): Promise<number> {
    let riskScore = 0;

    // Base risk by event type
    const eventRiskScores = {
      'login_failure': 10,
      'permission_escalation': 50,
      'sensitive_data_access': 30,
      'bulk_data_export': 60,
      'admin_action': 40,
      'security_policy_change': 70,
      'data_deletion': 45,
      'user_creation': 25,
      'password_change': 15
    };

    riskScore += eventRiskScores[event.eventType] || 5;

    // Increase risk for sensitive data
    if (event.sensitiveDataAccessed) {
      riskScore += 25;
    }

    // Increase risk for high data classification
    if (event.dataClassification === 'restricted' || event.dataClassification === 'top_secret') {
      riskScore += 30;
    }

    // Geographic risk
    if (context.geoLocation) {
      const userCountry = await this.getUserPrimaryCountry(context.userId);
      if (userCountry && userCountry !== context.geoLocation.country) {
        riskScore += 20;
      }
    }

    // Time-based risk
    const currentHour = new Date().getHours();
    const typicalHours = await this.getUserTypicalHours(context.userId);
    if (!typicalHours.includes(currentHour)) {
      riskScore += 15;
    }

    // Device risk
    if (context.deviceFingerprint) {
      const isKnownDevice = await this.isKnownDevice(context.userId, context.deviceFingerprint);
      if (!isKnownDevice) {
        riskScore += 25;
      }
    }

    // Volume-based risk
    if (event.recordCount && event.recordCount > 100) {
      riskScore += Math.min(30, Math.floor(event.recordCount / 100) * 10);
    }

    // Outcome-based risk
    if (event.outcome === 'failure' || event.outcome === 'error') {
      riskScore += 20;
    }

    // Security flags
    if (event.securityFlags && event.securityFlags.length > 0) {
      riskScore += event.securityFlags.length * 15;
    }

    return Math.min(riskScore, 100);
  }

  private async detectAnomalies(
    event: EnrichedAuditEvent,
    context: AuditContext
  ): Promise<number> {
    if (!context.userId) return 0;

    try {
      // Get user's historical access patterns
      const patterns = await db.query(
        'SELECT * FROM data_access_patterns WHERE user_id = $1 AND resource_type = $2',
        [context.userId, event.resourceType]
      );

      if (patterns.rows.length === 0) {
        return 0; // No pattern established yet
      }

      const pattern = patterns.rows[0];
      let anomalyScore = 0;

      // Time-based anomaly
      const currentHour = new Date().getHours();
      if (!pattern.typical_access_times.includes(currentHour)) {
        anomalyScore += 0.3;
      }

      // Frequency anomaly
      const recentAccesses = await this.getRecentAccesses(
        context.userId,
        event.resourceType,
        24 // hours
      );
      
      if (recentAccesses > pattern.access_frequency * 2) {
        anomalyScore += 0.4;
      }

      // Location anomaly
      if (context.geoLocation && !pattern.typical_locations.includes(context.geoLocation.country)) {
        anomalyScore += 0.3;
      }

      return Math.min(anomalyScore, 1.0);

    } catch (error) {
      console.error('Anomaly detection failed:', error);
      return 0;
    }
  }

  private determineSeverity(riskScore: number, anomalyScore: number): string {
    if (riskScore >= 90 || anomalyScore >= 0.9) return 'emergency';
    if (riskScore >= this.RISK_THRESHOLDS.HIGH_RISK_SCORE || anomalyScore >= 0.8) return 'critical';
    if (riskScore >= 60 || anomalyScore >= 0.6) return 'error';
    if (riskScore >= this.RISK_THRESHOLDS.MEDIUM_RISK_SCORE || anomalyScore >= 0.4) return 'warning';
    return 'info';
  }

  private async storeAuditLog(entry: AuditLogEntry): Promise<void> {
    // Calculate checksum for integrity
    const checksum = crypto.createHash('sha256')
      .update(JSON.stringify(entry))
      .digest('hex');
    
    entry.checksum = checksum;

    // Insert into database
    await db.query(`
      INSERT INTO audit_log (
        id, event_id, correlation_id, timestamp, category, event_type,
        severity_level, user_id, user_email, user_role, session_id,
        ip_address, user_agent, request_id, api_endpoint, http_method,
        http_status, processing_duration_ms, resource_type, resource_id,
        resource_name, action, outcome, data_classification,
        sensitive_data_accessed, data_categories, field_names,
        record_count, old_values, new_values, change_summary,
        risk_score, anomaly_detected, fraud_indicators, security_flags,
        country_code, region, city, device_fingerprint, device_type,
        browser_name, operating_system, client_id, wedding_id,
        organization_id, legal_basis, retention_period, compliance_tags,
        data_subject_id, application_version, feature_flags,
        experiment_id, custom_attributes, error_code, error_message,
        stack_trace, checksum
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
        $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
        $51, $52, $53, $54, $55, $56
      )
    `, [
      entry.id, entry.eventId, entry.correlationId, entry.timestamp,
      entry.category, entry.eventType, entry.severityLevel, entry.userId,
      entry.userEmail, entry.userRole, entry.sessionId, entry.ipAddress,
      entry.userAgent, entry.requestId, entry.apiEndpoint, entry.httpMethod,
      entry.httpStatus, entry.processingDurationMs, entry.resourceType,
      entry.resourceId, entry.resourceName, entry.action, entry.outcome,
      entry.dataClassification, entry.sensitiveDataAccessed,
      entry.dataCategories, entry.fieldNames, entry.recordCount,
      entry.oldValues ? JSON.stringify(entry.oldValues) : null,
      entry.newValues ? JSON.stringify(entry.newValues) : null,
      entry.changeSummary, entry.riskScore, entry.anomalyDetected,
      entry.fraudIndicators, entry.securityFlags, entry.countryCode,
      entry.region, entry.city, entry.deviceFingerprint, entry.deviceType,
      entry.browserName, entry.operatingSystem, entry.clientId,
      entry.weddingId, entry.organizationId, entry.legalBasis,
      entry.retentionPeriod, entry.complianceTags, entry.dataSubjectId,
      entry.applicationVersion, entry.featureFlags, entry.experimentId,
      entry.customAttributes ? JSON.stringify(entry.customAttributes) : null,
      entry.errorCode, entry.errorMessage, entry.stackTrace, entry.checksum
    ]);
  }

  private async checkAlertConditions(entry: AuditLogEntry): Promise<void> {
    // Get active alert rules
    const rules = await db.query(
      'SELECT * FROM audit_alert_rules WHERE active = true'
    );

    for (const rule of rules.rows) {
      if (await this.evaluateAlertRule(rule, entry)) {
        await this.triggerAlert(rule, entry);
      }
    }
  }

  private async evaluateAlertRule(rule: any, entry: AuditLogEntry): Promise<boolean> {
    // Check category filter
    if (rule.event_category && rule.event_category !== entry.category) {
      return false;
    }

    // Check event types
    if (rule.event_types && !rule.event_types.includes(entry.eventType)) {
      return false;
    }

    // Check severity threshold
    if (rule.severity_threshold) {
      const severityLevels = ['info', 'warning', 'error', 'critical', 'emergency'];
      const ruleSeverityIndex = severityLevels.indexOf(rule.severity_threshold);
      const entrySeverityIndex = severityLevels.indexOf(entry.severityLevel);
      
      if (entrySeverityIndex < ruleSeverityIndex) {
        return false;
      }
    }

    // Check risk score threshold
    if (rule.risk_score_threshold && entry.riskScore < rule.risk_score_threshold) {
      return false;
    }

    // Check frequency threshold
    if (rule.frequency_threshold && rule.time_window_minutes) {
      const recentEvents = await this.getRecentEventCount(
        entry.userId,
        entry.eventType,
        rule.time_window_minutes
      );
      
      if (recentEvents <= rule.frequency_threshold) {
        return false;
      }
    }

    // Evaluate complex conditions
    if (rule.conditions) {
      return this.evaluateComplexConditions(rule.conditions, entry);
    }

    return true;
  }

  private async triggerAlert(rule: any, entry: AuditLogEntry): Promise<void> {
    const alertId = `ALERT_${Date.now()}_${rule.id}`;
    
    // Create alert record
    await db.query(`
      INSERT INTO audit_alerts (
        alert_id, rule_id, audit_log_id, alert_level,
        alert_message, alert_data, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      alertId,
      rule.id,
      entry.id,
      this.getAlertLevel(entry.severityLevel),
      this.generateAlertMessage(rule, entry),
      JSON.stringify({
        eventType: entry.eventType,
        riskScore: entry.riskScore,
        user: entry.userEmail,
        resource: entry.resourceName
      }),
      'active'
    ]);

    // Send notifications
    for (const channel of rule.alert_channels) {
      await this.sendAlertNotification(channel, rule.recipients, alertId, entry);
    }

    // Update rule statistics
    await db.query(`
      UPDATE audit_alert_rules 
      SET last_triggered_at = NOW(), trigger_count = trigger_count + 1
      WHERE id = $1
    `, [rule.id]);
  }

  // Audit query and reporting methods
  async queryAuditLogs(filters: AuditQueryFilters): Promise<AuditQueryResult> {
    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    if (filters.categories?.length) {
      query += ` AND category = ANY($${paramIndex})`;
      params.push(filters.categories);
      paramIndex++;
    }

    if (filters.userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters.resourceType) {
      query += ` AND resource_type = $${paramIndex}`;
      params.push(filters.resourceType);
      paramIndex++;
    }

    if (filters.minRiskScore) {
      query += ` AND risk_score >= $${paramIndex}`;
      params.push(filters.minRiskScore);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (event_type ILIKE $${paramIndex} OR resource_name ILIKE $${paramIndex} OR user_email ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Add ordering and pagination
    query += ` ORDER BY ${filters.sortBy || 'timestamp'} ${filters.sortOrder || 'DESC'}`;
    query += ` LIMIT ${filters.limit || 100} OFFSET ${(filters.page || 1 - 1) * (filters.limit || 100)}`;

    const result = await db.query(query, params);

    return {
      logs: result.rows,
      pagination: {
        total: await this.getAuditLogCount(filters),
        page: filters.page || 1,
        limit: filters.limit || 100,
        pages: Math.ceil((await this.getAuditLogCount(filters)) / (filters.limit || 100))
      }
    };
  }

  async generateComplianceReport(
    regulation: string,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    // Implementation for generating compliance reports
    // This would be regulation-specific (GDPR, SOX, etc.)
    const auditEvents = await this.queryAuditLogs({
      startDate,
      endDate,
      complianceTags: [regulation.toLowerCase()]
    });

    return {
      regulation,
      period: { start: startDate, end: endDate },
      totalEvents: auditEvents.logs.length,
      complianceScore: this.calculateComplianceScore(auditEvents.logs, regulation),
      findings: this.generateComplianceFindings(auditEvents.logs, regulation),
      recommendations: this.generateComplianceRecommendations(auditEvents.logs, regulation)
    };
  }

  // Helper methods
  private generateEventId(event: EnrichedAuditEvent): string {
    const timestamp = Date.now();
    const category = event.category.toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${category}_${timestamp}_${random}`;
  }

  private hasSensitiveFields(fieldNames: string[]): boolean {
    const sensitiveFields = [
      'ssn', 'tax_id', 'passport_number', 'drivers_license',
      'credit_card', 'bank_account', 'routing_number',
      'password', 'api_key', 'token'
    ];

    return fieldNames.some(field => 
      sensitiveFields.some(sensitive => 
        field.toLowerCase().includes(sensitive)
      )
    );
  }

  private categorizeDataFields(fieldNames: string[]): string[] {
    const categories = new Set<string>();

    fieldNames.forEach(field => {
      const lowerField = field.toLowerCase();
      
      if (['ssn', 'tax_id', 'passport'].some(pii => lowerField.includes(pii))) {
        categories.add('pii');
      }
      
      if (['credit_card', 'bank_account', 'payment'].some(fin => lowerField.includes(fin))) {
        categories.add('financial');
      }
      
      if (['health', 'medical', 'allergy'].some(health => lowerField.includes(health))) {
        categories.add('health');
      }
      
      if (['email', 'phone', 'address'].some(contact => lowerField.includes(contact))) {
        categories.add('contact');
      }
    });

    return Array.from(categories);
  }

  private getRetentionPeriod(event: EnrichedAuditEvent): string {
    // Default retention periods by data classification
    const retentionPeriods = {
      'public': '1 year',
      'internal': '3 years',
      'confidential': '7 years',
      'restricted': '10 years',
      'top_secret': 'permanent'
    };

    return retentionPeriods[event.dataClassification] || '3 years';
  }
}

// Supporting interfaces
interface AuditEventInput {
  category: string;
  eventType: string;
  resourceType: string;
  resourceId?: string;
  action: string;
  outcome: string;
  oldValues?: any;
  newValues?: any;
  fieldNames?: string[];
  recordCount?: number;
  dataClassification?: string;
  legalBasis?: string;
  complianceTags?: string[];
  dataSubjectId?: string;
  customAttributes?: any;
  errorCode?: string;
  errorMessage?: string;
  stackTrace?: string;
}

interface AuditContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  correlationId?: string;
  impersonatedBy?: string;
  ipAddress: string;
  userAgent?: string;
  requestId?: string;
  apiEndpoint?: string;
  httpMethod?: string;
  httpStatus?: number;
  processingTime?: number;
  geoLocation?: {
    country: string;
    region: string;
    city: string;
  };
  deviceFingerprint?: string;
  deviceType?: string;
  browserName?: string;
  operatingSystem?: string;
  clientId?: string;
  weddingId?: string;
  organizationId?: string;
  featureFlags?: string[];
  experimentId?: string;
}

interface EnrichedAuditEvent extends AuditEventInput {
  resourceName?: string;
  sensitiveDataAccessed?: boolean;
  dataCategories?: string[];
  fraudIndicators?: string[];
  securityFlags?: string[];
  changeSummary?: string;
}

interface AuditLogEntry extends EnrichedAuditEvent {
  id: string;
  eventId: string;
  correlationId: string;
  timestamp: Date;
  severityLevel: string;
  riskScore: number;
  anomalyDetected: boolean;
  checksum: string;
  digitalSignature?: string;
  // ... all other fields from context
}
```

## 7. Testing Requirements

### Audit System Testing Suite
```typescript
// Comprehensive audit logging testing
describe('Audit Logging System', () => {
  describe('Event Logging', () => {
    it('should log authentication events with full context', async () => {
      const auditEvent = {
        category: 'authentication',
        eventType: 'login_success',
        resourceType: 'user',
        resourceId: 'test-user-id',
        action: 'login',
        outcome: 'success'
      };

      const context = {
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        sessionId: 'test-session-id'
      };

      await auditService.logEvent(auditEvent, context);

      const logs = await db.query(
        'SELECT * FROM audit_log WHERE user_id = $1 AND event_type = $2',
        ['test-user-id', 'login_success']
      );

      expect(logs.rows).toHaveLength(1);
      expect(logs.rows[0].category).toBe('authentication');
      expect(logs.rows[0].risk_score).toBeGreaterThanOrEqual(0);
      expect(logs.rows[0].checksum).toBeDefined();
    });

    it('should calculate higher risk scores for anomalous activities', async () => {
      // Create user with established pattern
      const user = await createTestUserWithAccessPattern();
      
      // Log access from unusual location
      const auditEvent = {
        category: 'data_access',
        eventType: 'sensitive_data_access',
        resourceType: 'client',
        action: 'read',
        outcome: 'success',
        sensitiveDataAccessed: true
      };

      const context = {
        userId: user.id,
        ipAddress: '203.0.113.1', // Different country
        geoLocation: {
          country: 'CN',
          region: 'Beijing',
          city: 'Beijing'
        }
      };

      await auditService.logEvent(auditEvent, context);

      const logs = await db.query(
        'SELECT risk_score FROM audit_log WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [user.id]
      );

      expect(logs.rows[0].risk_score).toBeGreaterThan(50);
    });

    it('should detect and flag fraud indicators', async () => {
      const auditEvent = {
        category: 'data_modification',
        eventType: 'bulk_data_export',
        resourceType: 'client',
        action: 'export',
        outcome: 'success',
        recordCount: 1000
      };

      const context = {
        userId: 'test-user-id',
        ipAddress: '192.168.1.1',
        // Simulate rapid successive requests
        sessionId: 'suspicious-session'
      };

      await auditService.logEvent(auditEvent, context);

      const logs = await db.query(
        'SELECT fraud_indicators FROM audit_log WHERE session_id = $1',
        ['suspicious-session']
      );

      expect(logs.rows[0].fraud_indicators).toContain('bulk_export');
    });
  });

  describe('Alert System', () => {
    it('should trigger alerts for high-risk events', async () => {
      // Create alert rule
      await db.query(`
        INSERT INTO audit_alert_rules (
          rule_name, event_category, risk_score_threshold,
          alert_channels, recipients, active
        ) VALUES (
          'High Risk Activity', 'security', 80,
          ARRAY['email'], ARRAY['admin@example.com'], true
        )
      `);

      // Log high-risk event
      const auditEvent = {
        category: 'security',
        eventType: 'permission_escalation',
        resourceType: 'user',
        action: 'escalate',
        outcome: 'success'
      };

      const context = {
        userId: 'test-user-id',
        ipAddress: '192.168.1.1'
      };

      await auditService.logEvent(auditEvent, context);

      // Check if alert was triggered
      const alerts = await db.query(
        'SELECT * FROM audit_alerts WHERE alert_level = $1',
        ['critical']
      );

      expect(alerts.rows.length).toBeGreaterThan(0);
    });

    it('should handle alert escalation', async () => {
      // Create alert with escalation
      const alert = await createTestAlert({
        escalationMinutes: 5
      });

      // Simulate time passage
      await jest.advanceTimersByTime(5 * 60 * 1000);

      // Check if alert was escalated
      const escalatedAlert = await db.query(
        'SELECT escalated FROM audit_alerts WHERE id = $1',
        [alert.id]
      );

      expect(escalatedAlert.rows[0].escalated).toBe(true);
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate GDPR compliance report', async () => {
      // Create test audit data
      await createGDPRAuditData();

      const report = await auditService.generateComplianceReport(
        'GDPR',
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(report.regulation).toBe('GDPR');
      expect(report.complianceScore).toBeGreaterThanOrEqual(0);
      expect(report.complianceScore).toBeLessThanOrEqual(100);
      expect(report.findings).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should track data access lineage', async () => {
      const userId = 'test-user-id';
      
      // Log data access events
      await logDataAccessChain(userId);

      const response = await request(app)
        .get(`/audit/compliance/data-lineage?dataSubjectId=${userId}`)
        .set('Authorization', `Bearer ${createAdminToken()}`);

      expect(response.body.accessLog).toBeInstanceOf(Array);
      expect(response.body.processingActivities).toBeDefined();
      expect(response.body.dataFlow).toBeDefined();
    });
  });

  describe('Data Retention', () => {
    it('should apply retention policies automatically', async () => {
      // Create old audit logs
      await createOldAuditLogs();

      // Apply retention policies
      await auditService.applyRetentionPolicies();

      // Check that old logs are purged/anonymized
      const oldLogs = await db.query(
        'SELECT COUNT(*) FROM audit_log WHERE timestamp < $1',
        [new Date(Date.now() - 8 * 365 * 24 * 60 * 60 * 1000)] // 8 years ago
      );

      expect(parseInt(oldLogs.rows[0].count)).toBe(0);
    });

    it('should preserve logs under legal hold', async () => {
      const logId = 'legal-hold-log';
      
      // Create audit log with legal hold
      await createAuditLogWithLegalHold(logId);

      // Apply retention policies
      await auditService.applyRetentionPolicies();

      // Verify log is preserved
      const preservedLog = await db.query(
        'SELECT * FROM audit_log WHERE event_id = $1',
        [logId]
      );

      expect(preservedLog.rows).toHaveLength(1);
    });
  });

  describe('Audit Trail Integrity', () => {
    it('should detect tampering with audit logs', async () => {
      // Create audit log
      const logId = await createTestAuditLog();

      // Tamper with the log
      await db.query(
        'UPDATE audit_log SET outcome = $1 WHERE id = $2',
        ['tampered', logId]
      );

      // Run integrity check
      const integrityResult = await auditService.verifyLogIntegrity(logId);

      expect(integrityResult.tampered).toBe(true);
      expect(integrityResult.checksumMismatch).toBe(true);
    });

    it('should maintain chronological ordering', async () => {
      const events = ['event1', 'event2', 'event3'];
      const timestamps = [];

      for (const event of events) {
        await auditService.logEvent({
          category: 'test',
          eventType: event,
          resourceType: 'test',
          action: 'test',
          outcome: 'success'
        }, {
          ipAddress: '192.168.1.1'
        });
        timestamps.push(new Date());
        await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      }

      const logs = await db.query(
        'SELECT event_type, timestamp FROM audit_log WHERE event_type IN ($1, $2, $3) ORDER BY timestamp',
        events
      );

      expect(logs.rows[0].event_type).toBe('event1');
      expect(logs.rows[1].event_type).toBe('event2');
      expect(logs.rows[2].event_type).toBe('event3');
    });
  });

  describe('Performance Tests', () => {
    it('should log 1000 events within 10 seconds', async () => {
      const start = performance.now();
      
      const promises = Array.from({ length: 1000 }, (_, i) => 
        auditService.logEvent({
          category: 'performance_test',
          eventType: 'bulk_test',
          resourceType: 'test',
          action: 'test',
          outcome: 'success'
        }, {
          userId: `test-user-${i}`,
          ipAddress: '192.168.1.1'
        })
      );

      await Promise.all(promises);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    it('should query large audit datasets efficiently', async () => {
      // Create 10,000 audit logs
      await createBulkAuditLogs(10000);

      const start = performance.now();
      
      const result = await auditService.queryAuditLogs({
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        categories: ['authentication', 'data_access'],
        limit: 100
      });

      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(1000); // 1 second
      expect(result.logs).toHaveLength(100);
    });
  });
});

// Security penetration tests
describe('Audit Security Tests', () => {
  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in audit queries', async () => {
      const maliciousInput = "'; DROP TABLE audit_log; --";
      
      await expect(
        auditService.queryAuditLogs({
          search: maliciousInput
        })
      ).not.toThrow();

      // Verify table still exists
      const tableCheck = await db.query(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'audit_log'"
      );
      expect(parseInt(tableCheck.rows[0].count)).toBe(1);
    });
  });

  describe('Access Control', () => {
    it('should enforce role-based access to audit logs', async () => {
      const userToken = createUserToken('regular-user');
      
      const response = await request(app)
        .get('/audit/logs')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.message).toContain('insufficient permissions');
    });

    it('should allow admin access to all audit logs', async () => {
      const adminToken = createAdminToken('admin-user');
      
      const response = await request(app)
        .get('/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.logs).toBeDefined();
    });
  });
});
```

## 8. Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "crypto": "^1.0.1",
    "geoip-lite": "^1.4.10",
    "ua-parser-js": "^1.0.37",
    "node-cron": "^3.0.3",
    "nodemailer": "^6.9.8",
    "slack-webhook": "^2.0.3",
    "date-fns": "^3.3.1",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "@types/geoip-lite": "^1.4.4",
    "@types/ua-parser-js": "^0.7.39",
    "@types/node-cron": "^3.0.11",
    "jest": "^29.7.0",
    "supertest": "^6.3.4"
  }
}
```

### Infrastructure Dependencies
- **PostgreSQL**: With partitioning support for large audit datasets
- **Redis**: For caching user patterns and alert states
- **Message Queue**: For async audit processing and alerting
- **File Storage**: For audit exports and long-term archival
- **Monitoring**: Real-time dashboard and alerting system

## 9. Operational Procedures

### Audit Management
- **Daily**: Monitor alert dashboard and investigate high-risk events
- **Weekly**: Review audit volume and performance metrics
- **Monthly**: Generate compliance reports and trend analysis
- **Quarterly**: Audit system health check and retention policy review
- **Annually**: Comprehensive security audit and penetration testing

### Incident Response
1. **Detection**: Automated alerts for critical security events
2. **Triage**: Risk assessment and incident classification
3. **Investigation**: Forensic analysis using audit trail
4. **Containment**: Immediate response actions and user notification
5. **Recovery**: System restoration and security improvements
6. **Documentation**: Incident report and lessons learned

### Compliance Management
- **GDPR**: Data subject access requests and breach notifications
- **SOX**: Financial controls and audit trail requirements
- **PCI DSS**: Payment data access logging and monitoring
- **HIPAA**: Healthcare data protection and audit requirements

## 10. Effort Estimate

### Development Phases

**Phase 1: Core Audit Infrastructure (5-6 weeks)**
- Database schema and partitioning
- Basic audit logging service
- Event enrichment and context
- Risk scoring algorithm

**Phase 2: Advanced Analytics (4-5 weeks)**
- Anomaly detection system
- User behavior patterns
- Fraud indicator detection
- Real-time monitoring

**Phase 3: Alerting & Notification (3-4 weeks)**
- Alert rule engine
- Multi-channel notifications
- Escalation procedures
- Alert management interface

**Phase 4: Compliance & Reporting (4-5 weeks)**
- Compliance report generation
- Data lineage tracking
- Audit trail viewer
- Export functionality

**Phase 5: Frontend & API (3-4 weeks)**
- Audit dashboard
- Search and filtering
- Real-time updates
- Administrative interfaces

**Phase 6: Testing & Optimization (2-3 weeks)**
- Performance optimization
- Security testing
- Compliance validation
- Documentation

**Total Estimated Effort: 21-27 weeks**

### Resource Requirements
- **Senior Security Engineer**: Full-time
- **Backend Developer**: Full-time  
- **Frontend Developer**: 70% allocation
- **DevOps Engineer**: 50% allocation
- **Compliance Specialist**: Part-time consultation

### Success Metrics
- **Coverage**: 100% of sensitive operations logged
- **Performance**: <50ms audit logging latency
- **Reliability**: 99.99% audit system uptime
- **Compliance**: 100% regulatory requirement coverage
- **Response**: <5 minutes alert notification delivery
- **Retention**: Automated compliance with data retention policies