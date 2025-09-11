# TEAM D - ROUND 1: WS-177 - Audit Logging System - Security Architecture & Policies

**Date:** 2025-01-20  
**Feature ID:** WS-177 (Track all work with this ID)
**Priority:** P0 - Compliance Critical
**Mission:** Build comprehensive security architecture for audit system with threat detection and compliance enforcement  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding business security officer
**I want to:** Comprehensive security controls and threat detection for all audit operations
**So that:** The audit system itself is secure and protected from tampering or unauthorized access

**Real Wedding Problem This Solves:**
A luxury wedding company handles celebrity clients where data breaches could cause massive reputation damage. The audit system stores sensitive logs about who accessed confidential guest lists, vendor contracts, and personal details. If hackers compromise the audit system, they could hide their tracks and steal valuable information. This security architecture ensures the audit system is bulletproof and detects any tampering attempts.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Multi-layered security architecture for audit system
- Real-time threat detection and response
- Compliance enforcement for data protection laws
- Tamper-proof audit log integrity
- Access control and authorization framework
- Security monitoring and alerting system

**Technology Stack (VERIFIED):**
- Security: Row Level Security (RLS) with PostgreSQL
- Encryption: AES-256 for sensitive audit data
- Authentication: Supabase Auth with role-based access
- Monitoring: Real-time security event detection
- Compliance: GDPR, HIPAA, SOC2 frameworks
- Alerting: Multi-channel security notifications

**Integration Points:**
- Team A viewer requires secure access controls
- Team B logging needs security validation
- Team C storage requires protection policies
- Team E testing validates security measures

---

## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Security Architecture Analysis
```typescript
// Before starting complex security implementation
mcp__sequential-thinking__sequential_thinking({
  thought: "This audit system security needs multiple layers: access control, data encryption, tamper detection, and threat monitoring. Each layer must work independently but coordinate for comprehensive protection.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security layer analysis: RLS for database access, API authentication for service access, encryption for data at rest, monitoring for unusual patterns. Each needs fail-safe defaults and redundant protection.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});
```

#### Pattern 2: Threat Model Planning  
```typescript
// When designing threat detection systems
mcp__sequential-thinking__sequential_thinking({
  thought: "Potential threats include: insider access abuse, external system compromise, audit log tampering, denial of service attacks. Need detection systems for each threat vector.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Detection implementation: Pattern analysis for unusual access, integrity checking for tamper detection, rate limiting for DoS protection, behavioral monitoring for insider threats.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 3: Compliance Analysis
```typescript
// When implementing regulatory compliance
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding businesses need GDPR compliance for EU guests, CCPA for California residents, industry standards for payment data. Audit system must support all regulatory requirements.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Compliance implementation: Data retention controls, right to erasure support, consent management, cross-border data transfer protections.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// Load security architecture and patterns
await mcp__filesystem__read_file({ 
  path: "/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/security/production-security.ts" 
});

await mcp__supabase__search_docs({
  graphql_query: `
    query {
      searchDocs(query: "row level security RLS policies authentication authorization", limit: 10) {
        nodes {
          title
          href
          content
        }
      }
    }
  `
});

await mcp__Ref__ref_search_documentation({ 
  query: "PostgreSQL RLS security policies authentication best practices" 
});
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **security-compliance-officer** --audit-security "Design comprehensive audit security"
2. **postgresql-database-expert** --rls-policies "Implement Row Level Security"
3. **integration-specialist** --security-integration "Integrate with auth systems"
4. **performance-optimization-expert** --security-performance "Optimize security overhead"
5. **test-automation-architect** --security-testing "Test all security measures"

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **CODE PHASE**

#### 1. Audit Security Manager
**File:** `/wedsync/src/lib/audit/security/audit-security-manager.ts`
```typescript
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import crypto from 'crypto';

const SecurityEventSchema = z.object({
  event_type: z.enum(['access_violation', 'tampering_attempt', 'unusual_pattern', 'compliance_violation']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  details: z.record(z.any()),
  source_ip: z.string().optional(),
  user_id: z.string().uuid().optional(),
  session_id: z.string().optional()
});

export type SecurityEvent = z.infer<typeof SecurityEventSchema>;

export class AuditSecurityManager {
  private static supabase = createClient();
  private static encryptionKey = process.env.AUDIT_ENCRYPTION_KEY;

  // Access Control
  static async validateAccess(userId: string, action: string, resource?: string): Promise<boolean> {
    try {
      // Get user role and permissions
      const { data: user } = await this.supabase
        .from('user_profiles')
        .select('role, permissions')
        .eq('id', userId)
        .single();

      if (!user) return false;

      // Check role-based access
      const hasRoleAccess = this.checkRoleAccess(user.role, action);
      
      // Check resource-specific permissions
      const hasResourceAccess = resource ? 
        await this.checkResourceAccess(userId, resource) : true;

      // Log access attempt
      await this.logSecurityEvent({
        event_type: hasRoleAccess && hasResourceAccess ? 'access_granted' : 'access_violation',
        severity: hasRoleAccess && hasResourceAccess ? 'low' : 'medium',
        details: {
          userId,
          action,
          resource,
          granted: hasRoleAccess && hasResourceAccess
        },
        user_id: userId
      } as SecurityEvent);

      return hasRoleAccess && hasResourceAccess;
    } catch (error) {
      console.error('Access validation failed:', error);
      return false;
    }
  }

  private static checkRoleAccess(role: string, action: string): boolean {
    const permissions = {
      admin: ['read_audit', 'write_audit', 'delete_audit', 'manage_audit'],
      compliance: ['read_audit', 'export_audit'],
      manager: ['read_audit'],
      user: []
    };

    return permissions[role as keyof typeof permissions]?.includes(action) || false;
  }

  private static async checkResourceAccess(userId: string, resource: string): Promise<boolean> {
    // Check if user has access to specific audit resource
    const { data } = await this.supabase
      .from('audit_access_permissions')
      .select('resource_pattern')
      .eq('user_id', userId);

    if (!data?.length) return false;

    return data.some(perm => 
      new RegExp(perm.resource_pattern).test(resource)
    );
  }

  // Data Encryption
  static encryptSensitiveData(data: any): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  static decryptSensitiveData(encryptedData: string): any {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  // Integrity Verification
  static generateIntegrityHash(logEntry: any): string {
    const content = JSON.stringify(logEntry, Object.keys(logEntry).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  static verifyIntegrity(logEntry: any, expectedHash: string): boolean {
    const actualHash = this.generateIntegrityHash(logEntry);
    return actualHash === expectedHash;
  }

  // Threat Detection
  static async detectUnusualPattern(userId: string, action: string): Promise<SecurityEvent | null> {
    try {
      // Get recent activity for pattern analysis
      const { data: recentLogs } = await this.supabase
        .from('audit_logs')
        .select('action, created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
        .order('created_at', { ascending: false });

      if (!recentLogs?.length) return null;

      // Check for suspicious patterns
      const actionCount = recentLogs.filter(log => log.action === action).length;
      const totalActions = recentLogs.length;

      // Detect rapid repeated actions
      if (actionCount > 50) {
        return {
          event_type: 'unusual_pattern',
          severity: 'high',
          details: {
            pattern: 'rapid_repeated_actions',
            action,
            count: actionCount,
            timeframe: '1h'
          },
          user_id: userId
        };
      }

      // Detect volume spike
      if (totalActions > 200) {
        return {
          event_type: 'unusual_pattern',
          severity: 'medium',
          details: {
            pattern: 'volume_spike',
            totalActions,
            timeframe: '1h'
          },
          user_id: userId
        };
      }

      return null;
    } catch (error) {
      console.error('Pattern detection failed:', error);
      return null;
    }
  }

  // Security Event Logging
  static async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('security_events')
        .insert({
          ...event,
          created_at: new Date().toISOString(),
          integrity_hash: this.generateIntegrityHash(event)
        });

      if (error) {
        console.error('Security event logging failed:', error);
      }

      // Send alerts for high/critical severity
      if (event.severity === 'high' || event.severity === 'critical') {
        await this.sendSecurityAlert(event);
      }
    } catch (error) {
      console.error('Security event processing failed:', error);
    }
  }

  private static async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    // Integration with notification system
    try {
      await fetch('/api/notifications/security-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Security alert sending failed:', error);
    }
  }

  // Compliance Support
  static async enforceRetentionPolicy(complianceType: string): Promise<void> {
    const policies = {
      gdpr: { retentionDays: 1095, requiresConsent: true }, // 3 years
      hipaa: { retentionDays: 2190, requiresConsent: false }, // 6 years
      soc2: { retentionDays: 2555, requiresConsent: false } // 7 years
    };

    const policy = policies[complianceType as keyof typeof policies];
    if (!policy) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    // Delete expired logs
    const { error } = await this.supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      console.error(`Compliance cleanup failed for ${complianceType}:`, error);
    }
  }

  static async handleDataSubjectRequest(userId: string, requestType: 'access' | 'deletion'): Promise<any> {
    if (requestType === 'access') {
      // Return all audit logs for the user
      const { data } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId);

      return data;
    } else if (requestType === 'deletion') {
      // Delete or anonymize user's audit logs
      const { error } = await this.supabase
        .from('audit_logs')
        .update({ user_id: null, details: { anonymized: true } })
        .eq('user_id', userId);

      return { success: !error };
    }
  }
}
```

#### 2. Row Level Security Policies
**File:** `/wedsync/supabase/migrations/20250120140000_ws177_audit_security_policies.sql`
```sql
-- Enable RLS on audit tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Admin access policy
CREATE POLICY "Admin full access to audit logs" ON audit_logs
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'super_admin'
  );

-- Compliance officer read-only policy
CREATE POLICY "Compliance read access to audit logs" ON audit_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'compliance' AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = (auth.jwt() ->> 'sub')::uuid 
      AND role IN ('compliance', 'admin')
    )
  );

-- Manager limited access policy
CREATE POLICY "Manager limited audit access" ON audit_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'manager' AND
    (
      user_id = (auth.jwt() ->> 'sub')::uuid OR
      resource_type IN ('task', 'guest', 'vendor') -- Business operations only
    )
  );

-- Service account access policy
CREATE POLICY "Service account write access" ON audit_logs
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'service' OR
    auth.jwt() ->> 'iss' = 'supabase' -- System generated logs
  );

-- Security event policies
CREATE POLICY "Security team access to security events" ON security_events
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'security', 'compliance')
  );

-- Function for secure log insertion with integrity checking
CREATE OR REPLACE FUNCTION secure_insert_audit_log(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  integrity_hash TEXT;
BEGIN
  -- Generate unique ID
  log_id := gen_random_uuid();
  
  -- Calculate integrity hash
  integrity_hash := encode(
    digest(
      concat(log_id, p_user_id, p_action, p_resource_type, p_resource_id, now()::text),
      'sha256'
    ),
    'hex'
  );
  
  -- Insert audit log with integrity protection
  INSERT INTO audit_logs (
    id, user_id, action, resource_type, resource_id,
    ip_address, user_agent, details, severity,
    integrity_hash, created_at
  ) VALUES (
    log_id, p_user_id, p_action, p_resource_type, p_resource_id,
    p_ip_address, p_user_agent, p_details, p_severity,
    integrity_hash, now()
  );
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to verify audit log integrity
CREATE OR REPLACE FUNCTION verify_audit_log_integrity(log_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_record RECORD;
  calculated_hash TEXT;
BEGIN
  -- Get log record
  SELECT * INTO log_record FROM audit_logs WHERE id = log_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate expected hash
  calculated_hash := encode(
    digest(
      concat(
        log_record.id, 
        log_record.user_id, 
        log_record.action, 
        log_record.resource_type, 
        log_record.resource_id, 
        log_record.created_at::text
      ),
      'sha256'
    ),
    'hex'
  );
  
  -- Compare with stored hash
  RETURN calculated_hash = log_record.integrity_hash;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for security queries
CREATE INDEX idx_audit_logs_security_user_action ON audit_logs(user_id, action, created_at);
CREATE INDEX idx_audit_logs_security_resource ON audit_logs(resource_type, severity, created_at);
CREATE INDEX idx_security_events_severity ON security_events(severity, created_at);

-- Create audit access permissions table
CREATE TABLE audit_access_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  resource_pattern TEXT NOT NULL, -- Regex pattern for allowed resources
  granted_by UUID REFERENCES user_profiles(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on permissions table
ALTER TABLE audit_access_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage audit permissions" ON audit_access_permissions
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users see own audit permissions" ON audit_access_permissions
  FOR SELECT USING (user_id = (auth.jwt() ->> 'sub')::uuid);
```

#### 3. Security Monitoring Service
**File:** `/wedsync/src/lib/audit/security/security-monitor.ts`
```typescript
import { AuditSecurityManager, SecurityEvent } from './audit-security-manager';
import { createClient } from '@/lib/supabase/server';

export class SecurityMonitor {
  private static supabase = createClient();
  private static alertThresholds = {
    failed_logins: 5,
    rapid_actions: 50,
    data_access_volume: 1000,
    unusual_hours: true
  };

  static async startMonitoring() {
    // Monitor for real-time security events
    const subscription = this.supabase
      .channel('security_monitoring')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => this.analyzeLogEntry(payload.new)
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'security_events' },
        (payload) => this.handleSecurityEvent(payload.new)
      )
      .subscribe();

    return subscription;
  }

  private static async analyzeLogEntry(logEntry: any) {
    try {
      // Check for suspicious patterns
      const suspiciousEvent = await this.detectSuspiciousActivity(logEntry);
      if (suspiciousEvent) {
        await AuditSecurityManager.logSecurityEvent(suspiciousEvent);
      }

      // Verify log integrity
      const integrityValid = AuditSecurityManager.verifyIntegrity(
        logEntry, 
        logEntry.integrity_hash
      );
      
      if (!integrityValid) {
        await AuditSecurityManager.logSecurityEvent({
          event_type: 'tampering_attempt',
          severity: 'critical',
          details: {
            log_id: logEntry.id,
            reason: 'integrity_hash_mismatch'
          }
        } as SecurityEvent);
      }
    } catch (error) {
      console.error('Log analysis failed:', error);
    }
  }

  private static async detectSuspiciousActivity(logEntry: any): Promise<SecurityEvent | null> {
    const { user_id, action, ip_address, created_at } = logEntry;

    // Check for unusual access hours
    const hour = new Date(created_at).getHours();
    if ((hour < 6 || hour > 22) && this.alertThresholds.unusual_hours) {
      return {
        event_type: 'unusual_pattern',
        severity: 'medium',
        details: {
          pattern: 'unusual_hours',
          hour,
          action
        },
        user_id
      };
    }

    // Check for rapid actions from same user
    const recentActions = await this.getRecentUserActions(user_id, 300); // 5 minutes
    if (recentActions > this.alertThresholds.rapid_actions) {
      return {
        event_type: 'unusual_pattern',
        severity: 'high',
        details: {
          pattern: 'rapid_actions',
          count: recentActions,
          timeframe: '5min'
        },
        user_id,
        source_ip: ip_address
      };
    }

    // Check for unusual IP addresses
    const isUnusualIP = await this.checkUnusualIP(user_id, ip_address);
    if (isUnusualIP) {
      return {
        event_type: 'unusual_pattern',
        severity: 'medium',
        details: {
          pattern: 'unusual_ip',
          ip_address
        },
        user_id,
        source_ip: ip_address
      };
    }

    return null;
  }

  private static async getRecentUserActions(userId: string, seconds: number): Promise<number> {
    const cutoff = new Date(Date.now() - seconds * 1000).toISOString();
    
    const { count } = await this.supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', cutoff);

    return count || 0;
  }

  private static async checkUnusualIP(userId: string, ipAddress: string): Promise<boolean> {
    if (!ipAddress || ipAddress === 'unknown') return false;

    // Get user's recent IP addresses
    const { data: recentIPs } = await this.supabase
      .from('audit_logs')
      .select('ip_address')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 3600000).toISOString()) // 7 days
      .not('ip_address', 'is', null);

    if (!recentIPs?.length) return false;

    const knownIPs = new Set(recentIPs.map(log => log.ip_address));
    return !knownIPs.has(ipAddress);
  }

  private static async handleSecurityEvent(event: any) {
    // Process high-severity security events
    if (event.severity === 'critical') {
      await this.triggerIncidentResponse(event);
    }

    // Update security metrics
    await this.updateSecurityMetrics(event);
  }

  private static async triggerIncidentResponse(event: any) {
    try {
      // Notify security team immediately
      await fetch('/api/notifications/security-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          requires_immediate_attention: true
        })
      });

      // Log the incident response trigger
      await AuditSecurityManager.logSecurityEvent({
        event_type: 'security_incident_triggered',
        severity: 'critical',
        details: {
          original_event_id: event.id,
          response_actions: ['notify_security_team', 'log_incident']
        }
      } as SecurityEvent);
    } catch (error) {
      console.error('Incident response trigger failed:', error);
    }
  }

  private static async updateSecurityMetrics(event: any) {
    // Update real-time security dashboard metrics
    const metrics = {
      total_security_events: 1,
      [`${event.event_type}_count`]: 1,
      [`${event.severity}_severity_count`]: 1,
      last_updated: new Date().toISOString()
    };

    // Store in metrics table or cache
    await this.supabase
      .from('security_metrics')
      .upsert({
        id: 'realtime_security_metrics',
        metrics,
        updated_at: new Date().toISOString()
      });
  }

  // Security Health Check
  static async performSecurityHealthCheck(): Promise<any> {
    const results = {
      rls_enabled: false,
      encryption_configured: false,
      monitoring_active: false,
      integrity_checks_passing: false,
      retention_policies_active: false
    };

    try {
      // Check RLS status
      const { data: rlsStatus } = await this.supabase
        .rpc('check_rls_enabled', { table_name: 'audit_logs' });
      results.rls_enabled = rlsStatus;

      // Check encryption configuration
      results.encryption_configured = !!process.env.AUDIT_ENCRYPTION_KEY;

      // Check monitoring
      const { data: recentEvents } = await this.supabase
        .from('security_events')
        .select('id')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .limit(1);
      results.monitoring_active = !!recentEvents?.length;

      // Check integrity of recent logs
      const { data: recentLogs } = await this.supabase
        .from('audit_logs')
        .select('id, integrity_hash')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentLogs?.length) {
        let integrityPassed = 0;
        for (const log of recentLogs) {
          const { data: isValid } = await this.supabase
            .rpc('verify_audit_log_integrity', { log_id: log.id });
          if (isValid) integrityPassed++;
        }
        results.integrity_checks_passing = integrityPassed === recentLogs.length;
      }

      // Check retention policy execution
      const { data: retentionLog } = await this.supabase
        .from('system_logs')
        .select('created_at')
        .eq('action', 'retention_policy_executed')
        .gte('created_at', new Date(Date.now() - 24 * 3600000).toISOString())
        .limit(1);
      results.retention_policies_active = !!retentionLog?.length;

    } catch (error) {
      console.error('Security health check failed:', error);
    }

    return results;
  }
}
```

#### 4. Security API Routes
**File:** `/wedsync/src/app/api/audit/security/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AuditSecurityManager } from '@/lib/audit/security/audit-security-manager';
import { SecurityMonitor } from '@/lib/audit/security/security-monitor';
import { withSecureValidation } from '@/lib/api/middleware';
import { z } from 'zod';

const AccessValidationSchema = z.object({
  action: z.string().min(1),
  resource: z.string().optional()
});

const DataSubjectRequestSchema = z.object({
  userId: z.string().uuid(),
  requestType: z.enum(['access', 'deletion'])
});

export async function GET(request: NextRequest) {
  return withSecureValidation(
    async (req, session) => {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');

      switch (action) {
        case 'health-check':
          const healthStatus = await SecurityMonitor.performSecurityHealthCheck();
          return NextResponse.json({
            success: true,
            data: { health: healthStatus }
          });

        case 'validate-access':
          const resource = url.searchParams.get('resource');
          const actionType = url.searchParams.get('actionType') || 'read_audit';
          
          const hasAccess = await AuditSecurityManager.validateAccess(
            session.user.id,
            actionType,
            resource || undefined
          );
          
          return NextResponse.json({
            success: true,
            data: { hasAccess }
          });

        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
          );
      }
    },
    {
      requiredRole: 'admin',
      rateLimit: { requests: 100, window: '1h' }
    }
  )(request);
}

export async function POST(request: NextRequest) {
  return withSecureValidation(
    async (req, session) => {
      const body = await req.json();
      const action = body.action;

      switch (action) {
        case 'validate-access':
          const validation = AccessValidationSchema.parse(body);
          const hasAccess = await AuditSecurityManager.validateAccess(
            session.user.id,
            validation.action,
            validation.resource
          );
          
          return NextResponse.json({
            success: true,
            data: { hasAccess }
          });

        case 'data-subject-request':
          const request_data = DataSubjectRequestSchema.parse(body);
          const result = await AuditSecurityManager.handleDataSubjectRequest(
            request_data.userId,
            request_data.requestType
          );
          
          return NextResponse.json({
            success: true,
            data: result
          });

        case 'enforce-retention':
          const complianceType = body.complianceType;
          await AuditSecurityManager.enforceRetentionPolicy(complianceType);
          
          return NextResponse.json({
            success: true,
            message: `Retention policy enforced for ${complianceType}`
          });

        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
          );
      }
    },
    {
      requiredRole: 'admin',
      rateLimit: { requests: 50, window: '1h' }
    }
  )(request);
}
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 Deliverables:
- [x] Complete security architecture with multi-layered protection
- [x] Row Level Security (RLS) policies for all audit tables
- [x] Real-time threat detection and monitoring system
- [x] Data encryption and integrity verification
- [x] Access control framework with role-based permissions
- [x] Compliance enforcement for GDPR, HIPAA, SOC2
- [x] Security incident response automation
- [x] Security health monitoring and alerting

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature provides security controls that protect navigation to audit interfaces and enforce access restrictions.

### Navigation Implementation Requirements

**1. Security-Aware Navigation**
```tsx
// Integrate security checks into navigation components
const AuditNavigation = ({ userRole, permissions }) => {
  const canAccessAudit = userRole === 'admin' || permissions.includes('read_audit');
  
  return (
    <NavigationMenu>
      {canAccessAudit && (
        <NavigationItem href="/admin/audit" icon={ShieldIcon}>
          Audit Logs
        </NavigationItem>
      )}
    </NavigationMenu>
  );
};
```

**2. Role-Based Navigation Controls**
- Hide/show navigation items based on security roles
- Implement progressive disclosure for sensitive features
- Provide security context indicators in navigation

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: UI security requirements - Required for access control integration
- FROM Team B: Audit data format - Required for security validation

### What other teams NEED from you:
- TO Team A: Security access validation APIs - Required for UI access controls
- TO Team C: RLS policies and encryption - Required for storage security
- TO Team E: Security test scenarios - Required for security testing

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### Security Architecture:
- [x] Multi-layered security with defense in depth
- [x] Zero trust architecture for all audit access
- [x] End-to-end encryption for sensitive data
- [x] Real-time threat detection and response
- [x] Comprehensive audit trail of security events
- [x] Role-based access control with least privilege
- [x] Data integrity verification and tamper detection
- [x] Compliance with multiple regulatory frameworks

---

## 🎭 TESTING REQUIREMENTS

```javascript
// Test security access controls
await mcp__supabase__execute_sql({
  query: `
    SELECT auth.jwt() ->> 'role' as user_role,
           rls_enabled 
    FROM information_schema.tables 
    WHERE table_name = 'audit_logs';
  `
});

// Test threat detection
const rapidRequests = Array.from({length: 60}, (_, i) => 
  fetch('/api/audit/logs', {
    headers: { 'Authorization': 'Bearer test-token' }
  })
);

await Promise.all(rapidRequests);

// Verify security alert was triggered
const securityEvents = await fetch('/api/audit/security?action=recent-events');
const events = await securityEvents.json();

// Test data encryption
const testData = { sensitive: 'wedding guest dietary requirements' };
const encrypted = AuditSecurityManager.encryptSensitiveData(testData);
const decrypted = AuditSecurityManager.decryptSensitiveData(encrypted);

console.assert(JSON.stringify(testData) === JSON.stringify(decrypted), 'Encryption test failed');
```

---

## ✅ SUCCESS CRITERIA

### Technical Implementation:
- [x] RLS policies block unauthorized access 100%
- [x] Threat detection response time < 5 seconds
- [x] Data encryption/decryption < 10ms
- [x] Integrity verification accuracy 100%
- [x] Security event processing < 1 second
- [x] Access control validation < 100ms
- [x] Compliance policy enforcement automated

### Evidence Package Required:
- [x] Security audit report with penetration testing results
- [x] RLS policy validation and access control testing
- [x] Threat detection and response demonstration
- [x] Data encryption and integrity verification tests
- [x] Compliance framework validation documentation
- [x] Performance benchmarks for security operations

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Security Service: `/wedsync/src/lib/audit/security/`
- API Routes: `/wedsync/src/app/api/audit/security/`
- Migrations: `/wedsync/supabase/migrations/`
- Tests: `/wedsync/__tests__/audit/security/`
- Types: `/wedsync/src/types/audit-security.ts`

### Team Report:
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch23/WS-177-team-d-round-1-complete.md`

---

END OF ROUND PROMPT