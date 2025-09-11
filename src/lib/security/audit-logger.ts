import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export enum SecurityEventType {
  // Authentication Events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  SESSION_CREATED = 'session_created',
  SESSION_EXPIRED = 'session_expired',
  SESSION_REFRESHED = 'session_refreshed',

  // MFA Events
  MFA_ENROLLED = 'mfa_enrolled',
  MFA_UNENROLLED = 'mfa_unenrolled',
  MFA_CHALLENGE_CREATED = 'mfa_challenge_created',
  MFA_VERIFIED = 'mfa_verified',
  MFA_FAILED = 'mfa_failed',

  // Account Security Events
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',

  // Access Control Events
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_DENIED = 'permission_denied',
  ROLE_CHANGED = 'role_changed',

  // Data Access Events
  SENSITIVE_DATA_ACCESSED = 'sensitive_data_accessed',
  DATA_EXPORTED = 'data_exported',
  DATA_DELETED = 'data_deleted',

  // Security Threats
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  CSRF_ATTACK_BLOCKED = 'csrf_attack_blocked',
  XSS_ATTACK_BLOCKED = 'xss_attack_blocked',
  SQL_INJECTION_BLOCKED = 'sql_injection_blocked',
  DDOS_ATTACK_DETECTED = 'ddos_attack_detected',
}

export enum SecurityEventSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface SecurityEvent {
  id?: string;
  event_type: SecurityEventType;
  severity: SecurityEventSeverity;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  resource_type?: string;
  resource_id?: string;
  description: string;
  metadata?: Record<string, any>;
  created_at?: Date;
}

export interface AuditLogQuery {
  userId?: string;
  eventType?: SecurityEventType;
  severity?: SecurityEventSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Security Audit Logger Service
 * Implements comprehensive security event logging for OWASP compliance
 */
export class SecurityAuditLogger {
  private static instance: SecurityAuditLogger;
  private readonly tableName = 'security_audit_logs';
  private alertThresholds = {
    [SecurityEventType.LOGIN_FAILED]: { count: 5, window: 300000 }, // 5 failures in 5 minutes
    [SecurityEventType.MFA_FAILED]: { count: 3, window: 300000 }, // 3 failures in 5 minutes
    [SecurityEventType.PERMISSION_DENIED]: { count: 10, window: 600000 }, // 10 denials in 10 minutes
  };

  private constructor() {}

  public static getInstance(): SecurityAuditLogger {
    if (!SecurityAuditLogger.instance) {
      SecurityAuditLogger.instance = new SecurityAuditLogger();
    }
    return SecurityAuditLogger.instance;
  }

  /**
   * Log a security event
   */
  async logEvent(event: SecurityEvent): Promise<void> {
    try {
      // Enhance event with additional context
      const enhancedEvent = {
        ...event,
        id: crypto.randomUUID(),
        created_at: new Date(),
        environment: process.env.NODE_ENV,
        application: 'wedsync',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      };

      // Store in database
      const { error } = await supabase
        .from(this.tableName)
        .insert(enhancedEvent);

      if (error) {
        console.error('Failed to log security event:', error);
        // Fall back to console logging
        this.fallbackLog(enhancedEvent);
      }

      // Check for security alerts
      await this.checkSecurityAlerts(event);

      // Real-time notification for critical events
      if (event.severity === SecurityEventSeverity.CRITICAL) {
        await this.notifyCriticalEvent(event);
      }
    } catch (error) {
      console.error('Security audit logging error:', error);
      this.fallbackLog(event);
    }
  }

  /**
   * Log authentication event
   */
  async logAuthEvent(
    userId: string,
    eventType: SecurityEventType,
    success: boolean,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logEvent({
      event_type: eventType,
      severity: success
        ? SecurityEventSeverity.LOW
        : SecurityEventSeverity.MEDIUM,
      user_id: userId,
      description: `Authentication event: ${eventType}`,
      metadata: {
        ...metadata,
        success,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log MFA event
   */
  async logMFAEvent(
    userId: string,
    eventType: SecurityEventType,
    factorType?: string,
    success?: boolean,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const severity = this.getMFAEventSeverity(eventType, success);

    await this.logEvent({
      event_type: eventType,
      severity,
      user_id: userId,
      description: `MFA event: ${eventType}`,
      metadata: {
        ...metadata,
        factor_type: factorType,
        success,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log data access event
   */
  async logDataAccessEvent(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logEvent({
      event_type: SecurityEventType.SENSITIVE_DATA_ACCESSED,
      severity: SecurityEventSeverity.LOW,
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      description: `Data access: ${action} on ${resourceType}`,
      metadata: {
        ...metadata,
        action,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log security threat
   */
  async logSecurityThreat(
    threatType: SecurityEventType,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logEvent({
      event_type: threatType,
      severity: SecurityEventSeverity.CRITICAL,
      ip_address: ipAddress,
      user_agent: userAgent,
      description: `Security threat detected: ${threatType}`,
      metadata: {
        ...metadata,
        threat_type: threatType,
        timestamp: new Date().toISOString(),
        blocked: true,
      },
    });
  }

  /**
   * Query audit logs
   */
  async queryLogs(query: AuditLogQuery): Promise<SecurityEvent[]> {
    try {
      let dbQuery = supabase.from(this.tableName).select('*');

      if (query.userId) {
        dbQuery = dbQuery.eq('user_id', query.userId);
      }

      if (query.eventType) {
        dbQuery = dbQuery.eq('event_type', query.eventType);
      }

      if (query.severity) {
        dbQuery = dbQuery.eq('severity', query.severity);
      }

      if (query.startDate) {
        dbQuery = dbQuery.gte('created_at', query.startDate.toISOString());
      }

      if (query.endDate) {
        dbQuery = dbQuery.lte('created_at', query.endDate.toISOString());
      }

      dbQuery = dbQuery
        .order('created_at', { ascending: false })
        .limit(query.limit || 100);

      if (query.offset) {
        dbQuery = dbQuery.range(
          query.offset,
          query.offset + (query.limit || 100) - 1,
        );
      }

      const { data, error } = await dbQuery;

      if (error) {
        console.error('Failed to query audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Audit log query error:', error);
      return [];
    }
  }

  /**
   * Get user security summary
   */
  async getUserSecuritySummary(
    userId: string,
    days: number = 30,
  ): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.queryLogs({
      userId,
      startDate,
      limit: 1000,
    });

    const summary = {
      totalEvents: logs.length,
      loginAttempts: logs.filter(
        (l) =>
          l.event_type === SecurityEventType.LOGIN_SUCCESS ||
          l.event_type === SecurityEventType.LOGIN_FAILED,
      ).length,
      failedLogins: logs.filter(
        (l) => l.event_type === SecurityEventType.LOGIN_FAILED,
      ).length,
      mfaEvents: logs.filter((l) => l.event_type.startsWith('mfa_')).length,
      securityThreats: logs.filter(
        (l) => l.severity === SecurityEventSeverity.CRITICAL,
      ).length,
      lastLogin: logs.find(
        (l) => l.event_type === SecurityEventType.LOGIN_SUCCESS,
      )?.created_at,
      suspiciousActivities: logs.filter(
        (l) => l.event_type === SecurityEventType.SUSPICIOUS_ACTIVITY,
      ).length,
    };

    return summary;
  }

  /**
   * Check for security alerts based on event patterns
   */
  private async checkSecurityAlerts(event: SecurityEvent): Promise<void> {
    const threshold = this.alertThresholds[event.event_type];
    if (!threshold) return;

    // Query recent events of the same type
    const windowStart = new Date(Date.now() - threshold.window);
    const recentEvents = await this.queryLogs({
      userId: event.user_id,
      eventType: event.event_type,
      startDate: windowStart,
    });

    if (recentEvents.length >= threshold.count) {
      // Trigger security alert
      await this.triggerSecurityAlert(event, recentEvents.length, threshold);
    }
  }

  /**
   * Trigger security alert
   */
  private async triggerSecurityAlert(
    event: SecurityEvent,
    count: number,
    threshold: { count: number; window: number },
  ): Promise<void> {
    const alert = {
      event_type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecurityEventSeverity.HIGH,
      user_id: event.user_id,
      description: `Security alert: ${count} ${event.event_type} events in ${threshold.window / 60000} minutes`,
      metadata: {
        trigger_event: event.event_type,
        event_count: count,
        threshold_count: threshold.count,
        window_minutes: threshold.window / 60000,
        alert_time: new Date().toISOString(),
      },
    };

    await this.logEvent(alert);

    // Additional actions for critical alerts
    if (event.event_type === SecurityEventType.LOGIN_FAILED && count >= 5) {
      // Trigger account lockout
      await this.triggerAccountLockout(event.user_id!);
    }
  }

  /**
   * Trigger account lockout
   */
  private async triggerAccountLockout(userId: string): Promise<void> {
    await this.logEvent({
      event_type: SecurityEventType.ACCOUNT_LOCKED,
      severity: SecurityEventSeverity.HIGH,
      user_id: userId,
      description:
        'Account automatically locked due to multiple failed login attempts',
      metadata: {
        lockout_duration: 1800, // 30 minutes
        locked_at: new Date().toISOString(),
      },
    });
  }

  /**
   * Notify critical events
   */
  private async notifyCriticalEvent(event: SecurityEvent): Promise<void> {
    // In production, this would send notifications to security team
    console.error('CRITICAL SECURITY EVENT:', event);

    // Could integrate with services like:
    // - PagerDuty
    // - Slack
    // - Email alerts
    // - SMS alerts
  }

  /**
   * Get MFA event severity
   */
  private getMFAEventSeverity(
    eventType: SecurityEventType,
    success?: boolean,
  ): SecurityEventSeverity {
    if (eventType === SecurityEventType.MFA_FAILED) {
      return SecurityEventSeverity.MEDIUM;
    }
    if (eventType === SecurityEventType.MFA_UNENROLLED) {
      return SecurityEventSeverity.MEDIUM;
    }
    if (eventType === SecurityEventType.MFA_ENROLLED) {
      return SecurityEventSeverity.LOW;
    }
    return SecurityEventSeverity.LOW;
  }

  /**
   * Fallback logging when database is unavailable
   */
  private fallbackLog(event: SecurityEvent): void {
    const logMessage = `[SECURITY_AUDIT] ${event.severity.toUpperCase()} - ${event.event_type}: ${event.description}`;

    if (event.severity === SecurityEventSeverity.CRITICAL) {
      console.error(logMessage, event);
    } else if (event.severity === SecurityEventSeverity.HIGH) {
      console.warn(logMessage, event);
    } else {
      console.log(logMessage, event);
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    const logs = await this.queryLogs({
      startDate,
      endDate,
      limit: 10000,
    });

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV format
    const headers = [
      'ID',
      'Event Type',
      'Severity',
      'User ID',
      'IP Address',
      'Description',
      'Created At',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.event_type,
      log.severity,
      log.user_id || '',
      log.ip_address || '',
      log.description,
      log.created_at?.toString() || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }
}

// Export singleton instance
export const auditLogger = SecurityAuditLogger.getInstance();
