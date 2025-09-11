# 04-audit-logging.md

# Audit Logging System

## Overview

Comprehensive audit logging for security monitoring, compliance requirements, debugging, and business intelligence. Every significant action in WedSync/WedMe is logged with appropriate detail and retention.

## Audit Log Architecture

### 1. Core Audit Schema

```sql
-- Main audit log table with partitioning for performance
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Actor information
  actor_id UUID, -- User who performed action
  actor_type TEXT, -- user, system, api, admin
  actor_email TEXT,
  impersonator_id UUID, -- If admin acting as user

  -- Action details
  action TEXT NOT NULL, -- create, read, update, delete, login, etc.
  resource_type TEXT NOT NULL, -- table/entity affected
  resource_id TEXT, -- ID of affected resource
  resource_name TEXT, -- Human-readable identifier

  -- Request context
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  request_id TEXT, -- For tracing across services

  -- Change details
  old_values JSONB, -- Previous state
  new_values JSONB, -- New state
  change_summary TEXT, -- Human-readable summary

  -- Results
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT,
  duration_ms INTEGER, -- Operation duration

  -- Metadata
  metadata JSONB, -- Additional context
  tags TEXT[], -- For categorization
  severity TEXT, -- info, warning, error, critical

  -- Compliance
  requires_review BOOLEAN DEFAULT FALSE,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes for common queries
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('error', 'critical');
CREATE INDEX idx_audit_logs_review ON audit_logs(requires_review) WHERE requires_review = TRUE;

```

### 2. Specialized Audit Tables

```sql
-- Security-specific audit logs
CREATE TABLE security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type TEXT NOT NULL, -- failed_login, permission_denied, suspicious_activity
  user_id UUID,
  ip_address INET NOT NULL,
  user_agent TEXT,

  -- Security context
  threat_level TEXT, -- low, medium, high, critical
  attack_vector TEXT, -- brute_force, sql_injection, xss, etc.
  blocked BOOLEAN DEFAULT FALSE,

  -- Details
  details JSONB,
  raw_request TEXT, -- For forensics

  -- Response
  action_taken TEXT, -- blocked, rate_limited, logged, alerted
  alert_sent BOOLEAN DEFAULT FALSE,

  -- Investigation
  investigated BOOLEAN DEFAULT FALSE,
  investigator_id UUID,
  investigation_notes TEXT
);

-- Data access audit for GDPR
CREATE TABLE data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Who accessed
  accessor_id UUID NOT NULL,
  accessor_type TEXT NOT NULL,

  -- What was accessed
  data_subject_id UUID, -- Person whose data was accessed
  data_category TEXT, -- personal, sensitive, financial
  fields_accessed TEXT[],
  record_count INTEGER,

  -- Why accessed
  purpose TEXT NOT NULL, -- support, debugging, legal_request
  legal_basis TEXT, -- consent, contract, legitimate_interest

  -- Context
  request_id TEXT,
  export_format TEXT, -- If data was exported

  -- Compliance
  gdpr_compliant BOOLEAN DEFAULT TRUE,
  retention_until DATE
);

-- Financial audit trail
CREATE TABLE financial_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Transaction details
  transaction_type TEXT, -- subscription, refund, credit
  amount_cents INTEGER,
  currency TEXT,

  -- Parties involved
  customer_id UUID,
  supplier_id UUID,

  -- Payment details
  payment_method TEXT,
  stripe_event_id TEXT,

  -- Audit fields
  initiated_by UUID,
  approved_by UUID,
  reason TEXT,

  -- Compliance
  tax_rate DECIMAL(5,4),
  invoice_id TEXT,
  receipt_url TEXT
);

```

### 3. Audit Triggers

```sql
-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_user_id UUID;
  v_action TEXT;
BEGIN
  -- Get current user
  v_user_id := current_setting('app.current_user_id', TRUE)::UUID;

  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    actor_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    success,
    metadata
  ) VALUES (
    v_user_id,
    'user',
    v_action,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::TEXT,
    v_old_data,
    v_new_data,
    TRUE,
    jsonb_build_object(
      'schema', TG_TABLE_SCHEMA,
      'operation', TG_OP
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_suppliers
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

```

### 4. Application-Level Logging

```tsx
// Centralized audit logger
class AuditLogger {
  private requestId: string;
  private userId: string | null;
  private ipAddress: string;

  constructor(context: RequestContext) {
    this.requestId = context.requestId || crypto.randomUUID();
    this.userId = context.userId;
    this.ipAddress = context.ipAddress;
  }

```

### 10. Audit Dashboard & Analytics

```tsx
// Audit analytics service
class AuditAnalytics {
  async generateDashboard(timeRange: TimeRange): Promise<AuditDashboard> {
    const [
      userActivity,
      systemHealth,
      securityEvents,
      complianceStatus,
      performanceMetrics
    ] = await Promise.all([
      this.getUserActivityMetrics(timeRange),
      this.getSystemHealthMetrics(timeRange),
      this.getSecurityMetrics(timeRange),
      this.getComplianceMetrics(timeRange),
      this.getPerformanceMetrics(timeRange)
    ]);

    return {
      summary: {
        totalEvents: await this.getTotalEvents(timeRange),
        uniqueUsers: await this.getUniqueUsers(timeRange),
        errorRate: await this.getErrorRate(timeRange),
        avgResponseTime: await this.getAvgResponseTime(timeRange)
      },
      userActivity,
      systemHealth,
      securityEvents,
      complianceStatus,
      performanceMetrics,
      alerts: await this.getActiveAlerts()
    };
  }

  private async getUserActivityMetrics(
    timeRange: TimeRange
  ): Promise<ActivityMetrics> {
    const query = `
      SELECT
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as event_count,
        COUNT(DISTINCT actor_id) as unique_users,
        action,
        resource_type
      FROM audit_logs
      WHERE timestamp BETWEEN $1 AND $2
        AND actor_type = 'user'
      GROUP BY hour, action, resource_type
      ORDER BY hour DESC
    `;

    const results = await db.query(query, [timeRange.start, timeRange.end]);

    return {
      timeline: this.formatTimeline(results),
      topActions: this.getTopActions(results),
      activeUsers: this.getMostActiveUsers(results)
    };
  }
}

```

### 11. Forensic Investigation Tools

```sql
-- Investigation queries
CREATE OR REPLACE FUNCTION investigate_user_activity(
  p_user_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS TABLE (
  timestamp TIMESTAMPTZ,
  action TEXT,
  resource TEXT,
  ip_address INET,
  success BOOLEAN,
  details JSONB
) AS $
BEGIN
  RETURN QUERY
  SELECT
    al.timestamp,
    al.action,
    al.resource_type || ':' || al.resource_id as resource,
    al.ip_address,
    al.success,
    al.metadata as details
  FROM audit_logs al
  WHERE al.actor_id = p_user_id
    AND al.timestamp BETWEEN p_start_time AND p_end_time
  ORDER BY al.timestamp DESC;
END;
$ LANGUAGE plpgsql;

-- Trace request across services
CREATE OR REPLACE FUNCTION trace_request(
  p_request_id TEXT
) RETURNS TABLE (
  service TEXT,
  timestamp TIMESTAMPTZ,
  action TEXT,
  duration_ms INTEGER,
  success BOOLEAN,
  error TEXT
) AS $
BEGIN
  RETURN QUERY
  SELECT
    metadata->>'service' as service,
    timestamp,
    action,
    duration_ms,
    success,
    error_message as error
  FROM audit_logs
  WHERE request_id = p_request_id
  ORDER BY timestamp ASC;
END;
$ LANGUAGE plpgsql;

```

### 12. Integration with External Services

```tsx
// External logging integrations
class LoggingIntegrations {
  // Send to Datadog
  async sendToDatadog(log: AuditLog): Promise<void> {
    const ddLog = {
      ddsource: 'wedsync',
      ddtags: `env:${process.env.NODE_ENV},service:audit`,
      hostname: os.hostname(),
      service: 'wedsync-audit',
      ...this.formatForDatadog(log)
    };

    await this.datadogClient.log(ddLog);
  }

  // Send to Elasticsearch
  async sendToElasticsearch(log: AuditLog): Promise<void> {
    await this.esClient.index({
      index: `audit-logs-${format(new Date(), 'yyyy-MM')}`,
      body: {
        ...log,
        '@timestamp': log.timestamp,
        environment: process.env.NODE_ENV
      }
    });
  }

  // Send to S3 for long-term storage
  async archiveToS3(logs: AuditLog[]): Promise<void> {
    const date = new Date();
    const key = `audit-logs/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}/logs.json.gz`;

    const compressed = await this.compress(logs);

    await this.s3Client.putObject({
      Bucket: process.env.AUDIT_BUCKET,
      Key: key,
      Body: compressed,
      ServerSideEncryption: 'AES256'
    }).promise();
  }
}

```

## Implementation Checklist

- [ ]  Set up audit log tables with partitioning
- [ ]  Create audit triggers for all sensitive tables
- [ ]  Implement application-level audit logger
- [ ]  Configure API request/response logging
- [ ]  Set up security event monitoring
- [ ]  Create compliance reporting queries
- [ ]  Implement log retention policies
- [ ]  Set up real-time monitoring and alerts
- [ ]  Build audit dashboard
- [ ]  Create forensic investigation tools
- [ ]  Configure external logging integrations
- [ ]  Set up log archival to cold storage
- [ ]  Document audit log access procedures
- [ ]  Train team on audit log analysis
- [ ]  Regular audit log reviews

## Performance Considerations

### Optimization Strategies

- Partition tables by month for faster queries
- Use batch inserts for high-volume logging
- Implement async logging to avoid blocking operations
- Use read replicas for audit queries
- Archive old logs to cold storage
- Compress logs before archival
- Use appropriate indexes for common queries

## Security of Audit Logs

### Protection Measures

- Audit logs are append-only (no updates or deletes)
- Separate permissions for audit log access
- Encrypt sensitive data in audit logs
- Sign logs cryptographically for tamper detection
- Replicate logs to multiple locations
- Regular integrity checks
- Restricted access to audit dashboard

## Compliance Requirements

### Standards Coverage

- **GDPR**: Article 30 processing records, breach notifications
- **PCI DSS**: 10.1-10.9 logging requirements
- **ISO 27001**: A.12.4 logging and monitoring
- **SOC 2**: Monitoring and logging controls
- **HIPAA**: Audit trail requirements (if applicable)
    
    async log(entry: AuditEntry): Promise<void> {
    const enrichedEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    request_id: this.requestId,
    actor_id: this.userId,
    ip_address: this.ipAddress,
    user_agent: this.getUserAgent(),
    session_id: this.getSessionId()
    };
    
    // Write to database
    await this.writeToDatabase(enrichedEntry);
    
    // Send to external logging service
    await this.sendToLoggingService(enrichedEntry);
    
    // Alert on critical events
    if (entry.severity === 'critical') {
    await this.sendAlert(enrichedEntry);
    }
    }
    
    // Specific logging methods
    async logLogin(success: boolean, method: string): Promise<void> {
    await this.log({
    action: 'login',
    resource_type: 'auth',
    success,
    metadata: { method },
    severity: success ? 'info' : 'warning'
    });
    }
    
    async logDataAccess(
    dataType: string,
    recordCount: number,
    purpose: string
    ): Promise<void> {
    await this.log({
    action: 'data_access',
    resource_type: dataType,
    success: true,
    metadata: { record_count: recordCount, purpose },
    severity: 'info',
    tags: ['gdpr', 'data_access']
    });
    }
    
    async logSecurityEvent(
    eventType: string,
    threatLevel: string,
    details: any
    ): Promise<void> {
    await this.log({
    action: 'security_event',
    resource_type: 'security',
    success: false,
    metadata: { event_type: eventType, threat_level: threatLevel, details },
    severity: threatLevel === 'critical' ? 'critical' : 'warning',
    requires_review: true
    });
    }
    }
    

```

### 5. API Request Logging

```typescript
// Middleware for API request/response logging
export async function auditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // Store request details
  const requestLog = {
    request_id: requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    body: this.sanitizeBody(req.body), // Remove sensitive data
    headers: this.sanitizeHeaders(req.headers),
    ip: req.ip,
    user_id: req.user?.id
  };

  // Log request
  await this.logApiRequest(requestLog);

  // Capture response
  const originalSend = res.send;
  res.send = function(data: any) {
    res.send = originalSend;

    // Log response
    const responseLog = {
      request_id: requestId,
      status_code: res.statusCode,
      duration_ms: Date.now() - startTime,
      response_size: JSON.stringify(data).length
    };

    // Async log (don't block response)
    setImmediate(() => {
      this.logApiResponse(responseLog);
    });

    return res.send(data);
  };

  next();
}

```

### 6. Business Activity Logging

```tsx
// Log business-critical actions
class BusinessAuditLogger {
  async logSupplierAction(
    supplierId: string,
    action: string,
    details: any
  ): Promise<void> {
    const log = {
      actor_id: supplierId,
      actor_type: 'supplier',
      action,
      resource_type: 'business',
      metadata: {
        ...details,
        subscription_tier: await this.getSupplierTier(supplierId),
        client_count: await this.getClientCount(supplierId)
      }
    };

    await this.audit.log(log);
  }

  async logCoupleAction(
    coupleId: string,
    action: string,
    details: any
  ): Promise<void> {
    const log = {
      actor_id: coupleId,
      actor_type: 'couple',
      action,
      resource_type: 'wedding',
      metadata: {
        ...details,
        wedding_date: await this.getWeddingDate(coupleId),
        supplier_count: await this.getSupplierCount(coupleId)
      }
    };

    await this.audit.log(log);
  }

  // Track viral growth metrics
  async logViralAction(
    action: 'invite_sent' | 'invite_accepted' | 'referral_created',
    fromUser: string,
    toUser: string
  ): Promise<void> {
    const log = {
      actor_id: fromUser,
      action: `viral_${action}`,
      resource_type: 'growth',
      resource_id: toUser,
      metadata: {
        viral_chain: await this.getViralChain(fromUser),
        generation: await this.getViralGeneration(fromUser)
      },
      tags: ['viral', 'growth']
    };

    await this.audit.log(log);
  }
}

```

### 7. Compliance Reporting

```sql
-- GDPR compliance queries
CREATE OR REPLACE FUNCTION generate_gdpr_report(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  access_date DATE,
  accessor TEXT,
  data_accessed TEXT,
  purpose TEXT,
  legal_basis TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(dal.timestamp) as access_date,
    u.email as accessor,
    array_to_string(dal.fields_accessed, ', ') as data_accessed,
    dal.purpose,
    dal.legal_basis
  FROM data_access_logs dal
  LEFT JOIN users u ON dal.accessor_id = u.id
  WHERE dal.data_subject_id = p_user_id
    AND dal.timestamp BETWEEN p_start_date AND p_end_date
  ORDER BY dal.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Security incident report
CREATE OR REPLACE FUNCTION generate_security_report(
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  incident_date DATE,
  threat_level TEXT,
  event_type TEXT,
  affected_users INTEGER,
  action_taken TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(timestamp) as incident_date,
    threat_level,
    event_type,
    COUNT(DISTINCT user_id) as affected_users,
    action_taken
  FROM security_audit_logs
  WHERE timestamp BETWEEN p_start_date AND p_end_date
    AND threat_level IN ('high', 'critical')
  GROUP BY DATE(timestamp), threat_level, event_type, action_taken
  ORDER BY incident_date DESC, threat_level DESC;
END;
$$ LANGUAGE plpgsql;

```

### 8. Log Retention & Archival

```sql
-- Retention policies
CREATE TABLE audit_retention_policies (
  log_type TEXT PRIMARY KEY,
  retention_days INTEGER NOT NULL,
  archive_after_days INTEGER,
  delete_after_days INTEGER,
  legal_hold BOOLEAN DEFAULT FALSE
);

INSERT INTO audit_retention_policies VALUES
  ('security', 730, 365, 730, FALSE),      -- 2 years
  ('financial', 2555, 1095, 2555, TRUE),   -- 7 years (legal requirement)
  ('access', 365, 180, 365, FALSE),        -- 1 year
  ('general', 180, 90, 180, FALSE);        -- 6 months

-- Automated archival procedure
CREATE OR REPLACE FUNCTION archive_old_logs()
RETURNS void AS $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN SELECT * FROM audit_retention_policies LOOP
    -- Archive to cold storage
    IF v_policy.archive_after_days IS NOT NULL THEN
      INSERT INTO archived_audit_logs
      SELECT * FROM audit_logs
      WHERE timestamp < NOW() - INTERVAL '1 day' * v_policy.archive_after_days
        AND tags @> ARRAY[v_policy.log_type];
    END IF;

    -- Delete if past retention (unless legal hold)
    IF NOT v_policy.legal_hold THEN
      DELETE FROM audit_logs
      WHERE timestamp < NOW() - INTERVAL '1 day' * v_policy.delete_after_days
        AND tags @> ARRAY[v_policy.log_type];
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule archival job
SELECT cron.schedule('archive-logs', '0 2 * * *', 'SELECT archive_old_logs()');

```

### 9. Real-time Monitoring & Alerts

```tsx
// Real-time audit monitoring
class AuditMonitor {
  private alertThresholds = {
    failed_logins: { count: 5, window: '5 minutes' },
    data_exports: { count: 100, window: '1 hour' },
    permission_denied: { count: 10, window: '10 minutes' },
    api_errors: { rate: 0.05, window: '5 minutes' }
  };

  async monitorAuditStream(): Promise<void> {
    // Subscribe to real-time audit events
    const subscription = supabase
      .from('audit_logs')
      .on('INSERT', async (payload) => {
        await this.processAuditEvent(payload.new);
      })
      .subscribe();

    // Process each audit event
    await this.startMonitoring();
  }

  private async processAuditEvent(event: AuditLog): Promise<void> {
    // Check against thresholds
    for (const [metric, threshold] of Object.entries(this.alertThresholds)) {
      if (await this.checkThreshold(event, metric, threshold)) {
        await this.sendAlert(metric, event);
      }
    }

    // Pattern detection
    if (await this.detectSuspiciousPattern(event)) {
      await this.escalateToSecurity(event);
    }
  }

  private async detectSuspiciousPattern(event: AuditLog): Promise<boolean> {
    const patterns = [
      this.detectBruteForce(event),
      this.detectDataScraping(event),
      this.detectPrivilegeEscalation(event),
      this.detectAnomalousAccess(event)
    ];

    const results = await Promise.all(patterns);
    return results.some(r => r === true);
  }
}

```