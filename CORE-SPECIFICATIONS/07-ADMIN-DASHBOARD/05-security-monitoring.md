# 05-security-monitoring

## What to Build

Security monitoring and compliance dashboard tracking authentication, data access, suspicious activities, and GDPR/privacy compliance.

## Key Technical Requirements

### Security Metrics Structure

```tsx
interface SecurityMetrics {
  authentication: {
    failedLogins: number
    suspiciousAttempts: number
    mfaAdoptionRate: number
    passwordResets: number
  }
  dataAccess: {
    unusualExports: DataExport[]
    bulkOperations: BulkOperation[]
    sensitiveDataAccess: AccessLog[]
  }
  compliance: {
    gdprRequests: GDPRRequest[]
    dataBreaches: Incident[]
    auditLogs: AuditEntry[]
  }
  threats: {
    activeThreats: Threat[]
    blockedIPs: string[]
    rateLimitViolations: RateLimit[]
  }
}

interface SecurityIncident {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  type: string
  affectedUsers: number
  detectedAt: Date
  status: 'active' | 'investigating' | 'resolved'
  description: string
  actions: string[]
}

```

### Security Monitor Implementation

```tsx
class SecurityMonitor {
  private readonly SUSPICIOUS_PATTERNS = {
    rapidFailedLogins: 5, // within 5 minutes
    unusualGeoLocation: true,
    bulkDataExport: 1000, // records
    afterHoursAccess: true,
    privilegeEscalation: true
  }

  async detectAnomalies(): Promise<SecurityIncident[]> {
    const incidents: SecurityIncident[] = []

    // Check authentication anomalies
    const authAnomalies = await this.checkAuthenticationPatterns()

    // Monitor data access patterns
    const dataAnomalies = await this.checkDataAccessPatterns()

    // Check for potential breaches
    const breachIndicators = await this.checkBreachIndicators()

    // Combine and prioritize
    return this.prioritizeIncidents([
      ...authAnomalies,
      ...dataAnomalies,
      ...breachIndicators
    ])
  }

  private async checkAuthenticationPatterns() {
    const query = `
      SELECT
        user_id,
        COUNT(*) as attempt_count,
        COUNT(DISTINCT ip_address) as unique_ips,
        COUNT(DISTINCT country) as unique_countries,
        MAX(created_at) - MIN(created_at) as time_span
      FROM auth_logs
      WHERE created_at > NOW() - INTERVAL '1 hour'
        AND success = false
      GROUP BY user_id
      HAVING COUNT(*) > 5
    `

    const suspiciousAuth = await db.query(query)

    return suspiciousAuth.map(auth => ({
      id: generateId(),
      severity: auth.attempt_count > 10 ? 'critical' : 'high',
      type: 'suspicious_authentication',
      affectedUsers: 1,
      detectedAt: new Date(),
      status: 'active',
      description: `${auth.attempt_count} failed login attempts from ${auth.unique_ips} IPs`,
      actions: ['block_ip', 'notify_user', 'require_mfa']
    }))
  }
}

```

### Security Dashboard Component

```tsx
const SecurityDashboard = () => {
  const [timeRange, setTimeRange] = useState('24h')
  const security = useSecurityMetrics(timeRange)
  const incidents = useActiveIncidents()

  return (
    <div className="security-dashboard">
      {/* Threat Level Indicator */}
      <ThreatLevelIndicator
        level={security.threatLevel}
        activeIncidents={incidents.length}
      />

      {/* Real-time Security Feed */}
      <div className="security-feed">
        <h3>Security Events (Live)</h3>
        <SecurityEventStream
          events={security.liveEvents}
          onIncident={(incident) => handleIncident(incident)}
        />
      </div>

      {/* Authentication Security */}
      <div className="auth-security">
        <MetricCard
          title="Failed Logins (24h)"
          value={security.authentication.failedLogins}
          threshold={100}
          status={security.authentication.failedLogins > 100 ? 'warning' : 'ok'}
        />
        <MetricCard
          title="MFA Adoption"
          value={`${security.authentication.mfaAdoptionRate}%`}
          target="80%"
        />
        <MetricCard
          title="Suspicious IPs Blocked"
          value={security.threats.blockedIPs.length}
        />
      </div>

      {/* Data Access Monitoring */}
      <DataAccessMonitor
        exports={security.dataAccess.unusualExports}
        bulkOps={security.dataAccess.bulkOperations}
      />

      {/* GDPR Compliance */}
      <GDPRCompliancePanel
        requests={security.compliance.gdprRequests}
        dataRetention={security.compliance.dataRetention}
      />
    </div>
  )
}

```

### GDPR & Privacy Compliance

```tsx
class PrivacyCompliance {
  async handleGDPRRequest(request: GDPRRequest) {
    switch(request.type) {
      case 'access':
        return await this.handleDataAccessRequest(request)
      case 'deletion':
        return await this.handleDeletionRequest(request)
      case 'portability':
        return await this.handlePortabilityRequest(request)
      case 'rectification':
        return await this.handleRectificationRequest(request)
    }
  }

  async generateComplianceReport(): Promise<ComplianceReport> {
    return {
      gdprRequests: {
        pending: await this.getPendingRequests(),
        completed: await this.getCompletedRequests(),
        averageResponseTime: await this.getAverageResponseTime()
      },
      dataRetention: {
        usersOverRetention: await this.getUsersOverRetention(),
        scheduledDeletions: await this.getScheduledDeletions()
      },
      consent: {
        validConsents: await this.getValidConsents(),
        expiredConsents: await this.getExpiredConsents()
      },
      breaches: {
        reported: await this.getReportedBreaches(),
        unreported: await this.getUnreportedBreaches()
      }
    }
  }
}

```

## Critical Implementation Notes

- Implement real-time threat detection with WebSocket updates
- Use rate limiting on all sensitive operations
- Log all admin actions for audit trail
- Implement IP-based geo-blocking for suspicious locations
- Set up automated incident response workflows
- Regular security audits and penetration testing
- Implement data encryption at rest and in transit

## Database Structure

```sql
-- Security incidents table
CREATE TABLE security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  type TEXT NOT NULL,
  description TEXT,
  affected_users INTEGER,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  response_actions JSONB,
  created_by TEXT
);

-- Authentication logs for security monitoring
CREATE TABLE auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type TEXT,
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  success BOOLEAN,
  failure_reason TEXT,
  mfa_used BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_logs_user ON auth_logs(user_id, created_at DESC);
CREATE INDEX idx_auth_logs_ip ON auth_logs(ip_address, created_at DESC);

-- GDPR requests tracking
CREATE TABLE gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  request_type TEXT CHECK (request_type IN
    ('access', 'deletion', 'portability', 'rectification')),
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  response_data JSONB,
  notes TEXT
);

-- Audit trail for all admin actions
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  changes JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

```