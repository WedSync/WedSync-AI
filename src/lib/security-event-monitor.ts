/**
 * Security Event Monitoring System
 * Real-time security event detection, analysis, and response
 */

import { createClient } from '@supabase/supabase-js';
import {
  securityAuditLogger,
  type SecurityEvent,
  type SecurityEventSeverity,
} from './security-audit-logger';

export interface SecurityAlert {
  id: string;
  organizationId: string;
  alertType: AlertType;
  severity: SecurityEventSeverity;
  title: string;
  description: string;
  eventCount: number;
  firstSeen: Date;
  lastSeen: Date;
  affectedUsers: string[];
  sourceIPs: string[];
  recommendations: string[];
  status: AlertStatus;
  metadata: Record<string, any>;
}

export type AlertType =
  | 'BRUTE_FORCE_ATTACK'
  | 'MULTIPLE_FAILED_LOGINS'
  | 'PRIVILEGE_ESCALATION'
  | 'UNAUTHORIZED_DATA_ACCESS'
  | 'SUSPICIOUS_IP_ACTIVITY'
  | 'ACCOUNT_COMPROMISE'
  | 'DATA_EXFILTRATION'
  | 'API_ABUSE'
  | 'RATE_LIMIT_ABUSE'
  | 'SECURITY_POLICY_VIOLATION'
  | 'ANOMALOUS_USER_BEHAVIOR'
  | 'SYSTEM_INTRUSION_ATTEMPT';

export type AlertStatus =
  | 'ACTIVE'
  | 'INVESTIGATING'
  | 'RESOLVED'
  | 'FALSE_POSITIVE';

export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  eventTypes: string[];
  conditions: RuleCondition[];
  timeWindow: number; // minutes
  threshold: number;
  severity: SecurityEventSeverity;
  alertType: AlertType;
  enabled: boolean;
  organizationId?: string; // null for global rules
}

export interface RuleCondition {
  field: string;
  operator:
    | 'equals'
    | 'contains'
    | 'greater_than'
    | 'less_than'
    | 'in'
    | 'regex';
  value: any;
  negate?: boolean;
}

export interface SecurityMetrics {
  organizationId: string;
  timeRange: string;
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  activeAlerts: number;
  topEventTypes: Array<{ type: string; count: number }>;
  topSourceIPs: Array<{ ip: string; count: number }>;
  securityScore: number;
  trends: {
    eventsLastHour: number;
    eventsLastDay: number;
    eventsLastWeek: number;
  };
}

class SecurityEventMonitor {
  private supabase: any;
  private monitoringRules: MonitoringRule[] = [];
  private alertCallbacks: Array<(alert: SecurityAlert) => void> = [];
  private metricsCallbacks: Array<(metrics: SecurityMetrics) => void> = [];

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.initializeDefaultRules();
  }

  /**
   * Initialize default security monitoring rules
   */
  private initializeDefaultRules(): void {
    this.monitoringRules = [
      // Brute force detection
      {
        id: 'brute-force-detection',
        name: 'Brute Force Attack Detection',
        description: 'Detects multiple failed login attempts from same IP',
        eventTypes: ['LOGIN_FAILURE'],
        conditions: [],
        timeWindow: 15, // 15 minutes
        threshold: 5,
        severity: 'HIGH',
        alertType: 'BRUTE_FORCE_ATTACK',
        enabled: true,
      },

      // Privilege escalation detection
      {
        id: 'privilege-escalation',
        name: 'Privilege Escalation Attempts',
        description:
          'Detects attempts to gain unauthorized elevated privileges',
        eventTypes: [
          'PRIVILEGE_ESCALATION_ATTEMPT',
          'UNAUTHORIZED_ACCESS_ATTEMPT',
        ],
        conditions: [],
        timeWindow: 60, // 1 hour
        threshold: 3,
        severity: 'CRITICAL',
        alertType: 'PRIVILEGE_ESCALATION',
        enabled: true,
      },

      // Suspicious data access
      {
        id: 'data-access-anomaly',
        name: 'Suspicious Data Access Pattern',
        description:
          'Detects unusual data access patterns or bulk data exports',
        eventTypes: ['DATA_ACCESS', 'EXPORT_DATA'],
        conditions: [
          {
            field: 'event_data.operation',
            operator: 'in',
            value: ['READ', 'EXPORT'],
          },
        ],
        timeWindow: 60, // 1 hour
        threshold: 100, // High volume of data access
        severity: 'MEDIUM',
        alertType: 'UNAUTHORIZED_DATA_ACCESS',
        enabled: true,
      },

      // API abuse detection
      {
        id: 'api-rate-limit-abuse',
        name: 'API Rate Limit Abuse',
        description:
          'Detects repeated rate limit violations indicating API abuse',
        eventTypes: ['RATE_LIMIT_EXCEEDED'],
        conditions: [],
        timeWindow: 30, // 30 minutes
        threshold: 10,
        severity: 'MEDIUM',
        alertType: 'API_ABUSE',
        enabled: true,
      },

      // Account compromise indicators
      {
        id: 'account-compromise',
        name: 'Account Compromise Indicators',
        description:
          'Detects login from new location or device after failed attempts',
        eventTypes: ['LOGIN_SUCCESS'],
        conditions: [
          {
            field: 'event_data.login_anomaly',
            operator: 'equals',
            value: true,
          },
        ],
        timeWindow: 120, // 2 hours
        threshold: 1,
        severity: 'HIGH',
        alertType: 'ACCOUNT_COMPROMISE',
        enabled: true,
      },

      // Security policy violations
      {
        id: 'security-policy-violation',
        name: 'Security Policy Violations',
        description: 'Detects violations of security policies',
        eventTypes: [
          'SECURITY_POLICY_VIOLATION',
          'CSRF_ATTACK_BLOCKED',
          'XSS_ATTEMPT_BLOCKED',
        ],
        conditions: [],
        timeWindow: 60, // 1 hour
        threshold: 1, // Any violation should alert
        severity: 'HIGH',
        alertType: 'SECURITY_POLICY_VIOLATION',
        enabled: true,
      },
    ];
  }

  /**
   * Start monitoring security events
   */
  async startMonitoring(): Promise<void> {
    console.log('🛡️ Starting security event monitoring...');

    // Set up real-time subscriptions for new security events
    this.supabase
      .channel('security-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'enhanced_security_audit_logs',
        },
        (payload: any) => this.handleNewSecurityEvent(payload.new),
      )
      .subscribe();

    // Run periodic checks for pattern detection
    setInterval(() => this.runPeriodicChecks(), 5 * 60 * 1000); // Every 5 minutes

    console.log('✅ Security event monitoring started');
  }

  /**
   * Handle new security events in real-time
   */
  private async handleNewSecurityEvent(event: any): Promise<void> {
    try {
      // Check if this event triggers any monitoring rules
      for (const rule of this.monitoringRules.filter((r) => r.enabled)) {
        if (this.eventMatchesRule(event, rule)) {
          await this.evaluateRule(rule, event);
        }
      }

      // Update real-time metrics
      await this.updateRealTimeMetrics(event.organization_id);
    } catch (error) {
      console.error('Error handling security event:', error);
      await securityAuditLogger.logSecurityEvent({
        event_type: 'SYSTEM_ERROR',
        event_category: 'INFRASTRUCTURE',
        severity: 'MEDIUM',
        event_data: {
          error: 'security_event_monitoring_error',
          message: String(error),
          event_id: event.id,
        },
      });
    }
  }

  /**
   * Check if an event matches a monitoring rule
   */
  private eventMatchesRule(event: any, rule: MonitoringRule): boolean {
    // Check event type
    if (!rule.eventTypes.includes(event.event_type)) {
      return false;
    }

    // Check organization scope
    if (rule.organizationId && rule.organizationId !== event.organization_id) {
      return false;
    }

    // Check additional conditions
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(event, condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate a rule condition against an event
   */
  private evaluateCondition(event: any, condition: RuleCondition): boolean {
    const fieldValue = this.getNestedValue(event, condition.field);
    let result = false;

    switch (condition.operator) {
      case 'equals':
        result = fieldValue === condition.value;
        break;
      case 'contains':
        result = String(fieldValue).includes(String(condition.value));
        break;
      case 'greater_than':
        result = Number(fieldValue) > Number(condition.value);
        break;
      case 'less_than':
        result = Number(fieldValue) < Number(condition.value);
        break;
      case 'in':
        result =
          Array.isArray(condition.value) &&
          condition.value.includes(fieldValue);
        break;
      case 'regex':
        result = new RegExp(condition.value).test(String(fieldValue));
        break;
    }

    return condition.negate ? !result : result;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Evaluate a monitoring rule and create alerts if threshold is met
   */
  private async evaluateRule(
    rule: MonitoringRule,
    triggeringEvent: any,
  ): Promise<void> {
    try {
      // Get recent events matching this rule within the time window
      const { data: recentEvents, error } = await this.supabase
        .from('enhanced_security_audit_logs')
        .select('*')
        .eq('organization_id', triggeringEvent.organization_id)
        .in('event_type', rule.eventTypes)
        .gte(
          'created_at',
          new Date(Date.now() - rule.timeWindow * 60 * 1000).toISOString(),
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter events by rule conditions
      const matchingEvents = recentEvents.filter((event) =>
        rule.conditions.every((condition) =>
          this.evaluateCondition(event, condition),
        ),
      );

      // Check if threshold is met
      if (matchingEvents.length >= rule.threshold) {
        await this.createSecurityAlert(rule, matchingEvents, triggeringEvent);
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
    }
  }

  /**
   * Create a security alert
   */
  private async createSecurityAlert(
    rule: MonitoringRule,
    events: any[],
    triggeringEvent: any,
  ): Promise<void> {
    const alert: SecurityAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      organizationId: triggeringEvent.organization_id,
      alertType: rule.alertType,
      severity: rule.severity,
      title: rule.name,
      description: this.generateAlertDescription(rule, events),
      eventCount: events.length,
      firstSeen: new Date(events[events.length - 1].created_at),
      lastSeen: new Date(events[0].created_at),
      affectedUsers: [...new Set(events.map((e) => e.user_id).filter(Boolean))],
      sourceIPs: [...new Set(events.map((e) => e.ip_address).filter(Boolean))],
      recommendations: this.generateRecommendations(rule.alertType, events),
      status: 'ACTIVE',
      metadata: {
        ruleId: rule.id,
        threshold: rule.threshold,
        timeWindow: rule.timeWindow,
        triggeringEventId: triggeringEvent.id,
      },
    };

    // Store alert in database
    await this.storeAlert(alert);

    // Notify alert callbacks
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });

    console.log(`🚨 SECURITY ALERT: ${alert.title} (${alert.severity})`);
  }

  /**
   * Generate alert description
   */
  private generateAlertDescription(
    rule: MonitoringRule,
    events: any[],
  ): string {
    const eventCount = events.length;
    const uniqueIPs = new Set(events.map((e) => e.ip_address).filter(Boolean))
      .size;
    const uniqueUsers = new Set(events.map((e) => e.user_id).filter(Boolean))
      .size;

    let description = `${rule.description}. `;
    description += `Detected ${eventCount} events in the last ${rule.timeWindow} minutes`;

    if (uniqueIPs > 0) {
      description += ` from ${uniqueIPs} IP address${uniqueIPs > 1 ? 'es' : ''}`;
    }

    if (uniqueUsers > 0) {
      description += ` affecting ${uniqueUsers} user account${uniqueUsers > 1 ? 's' : ''}`;
    }

    return description + '.';
  }

  /**
   * Generate recommendations based on alert type
   */
  private generateRecommendations(
    alertType: AlertType,
    events: any[],
  ): string[] {
    const recommendations: Record<AlertType, string[]> = {
      BRUTE_FORCE_ATTACK: [
        'Block suspicious IP addresses',
        'Enable account lockout mechanisms',
        'Implement CAPTCHA for login attempts',
        'Review user account security',
      ],
      MULTIPLE_FAILED_LOGINS: [
        'Investigate failed login patterns',
        'Consider temporary IP restrictions',
        'Enable multi-factor authentication',
        'Alert affected users',
      ],
      PRIVILEGE_ESCALATION: [
        'Immediately review user permissions',
        'Investigate user activity logs',
        'Disable affected accounts if necessary',
        'Review access control policies',
      ],
      UNAUTHORIZED_DATA_ACCESS: [
        'Review data access permissions',
        'Monitor data export activities',
        'Investigate user behavior patterns',
        'Consider data access restrictions',
      ],
      SUSPICIOUS_IP_ACTIVITY: [
        'Block or restrict suspicious IPs',
        'Enhance IP-based monitoring',
        'Review geographic access patterns',
        'Implement geo-blocking if appropriate',
      ],
      ACCOUNT_COMPROMISE: [
        'Force password reset for affected accounts',
        'Enable enhanced monitoring',
        'Review recent account activities',
        'Alert users to potential compromise',
      ],
      DATA_EXFILTRATION: [
        'Immediately investigate data access',
        'Review data export logs',
        'Consider temporary data restrictions',
        'Alert data protection officer',
      ],
      API_ABUSE: [
        'Review API rate limits',
        'Block abusive API clients',
        'Monitor API usage patterns',
        'Consider API key rotation',
      ],
      RATE_LIMIT_ABUSE: [
        'Strengthen rate limiting',
        'Block persistent violators',
        'Review rate limit thresholds',
        'Monitor for distributed attacks',
      ],
      SECURITY_POLICY_VIOLATION: [
        'Review security policy configuration',
        'Investigate policy bypass attempts',
        'Strengthen policy enforcement',
        'Update security controls',
      ],
      ANOMALOUS_USER_BEHAVIOR: [
        'Review user behavior patterns',
        'Investigate unusual activities',
        'Consider user behavior analytics',
        'Alert security team',
      ],
      SYSTEM_INTRUSION_ATTEMPT: [
        'Immediately investigate system access',
        'Review system logs',
        'Strengthen system security',
        'Consider incident response procedures',
      ],
    };

    return (
      recommendations[alertType] || [
        'Investigate the security incident',
        'Review security policies',
      ]
    );
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: SecurityAlert): Promise<void> {
    const { error } = await this.supabase.from('security_alerts').insert([
      {
        id: alert.id,
        organization_id: alert.organizationId,
        alert_type: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        event_count: alert.eventCount,
        first_seen: alert.firstSeen.toISOString(),
        last_seen: alert.lastSeen.toISOString(),
        affected_users: alert.affectedUsers,
        source_ips: alert.sourceIPs,
        recommendations: alert.recommendations,
        status: alert.status,
        metadata: alert.metadata,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error('Failed to store security alert:', error);
      // Log the error as a security event
      await securityAuditLogger.logSecurityEvent({
        event_type: 'SYSTEM_ERROR',
        event_category: 'INFRASTRUCTURE',
        severity: 'MEDIUM',
        event_data: {
          error: 'alert_storage_failure',
          alert_id: alert.id,
          error_message: error.message,
        },
      });
    }
  }

  /**
   * Run periodic security checks
   */
  private async runPeriodicChecks(): Promise<void> {
    try {
      // Check for patterns that might not trigger real-time alerts
      await this.checkForDelayedPatterns();

      // Update security metrics
      await this.updateSecurityMetrics();

      // Clean up old alerts
      await this.cleanupOldAlerts();
    } catch (error) {
      console.error('Error in periodic security checks:', error);
    }
  }

  /**
   * Check for delayed security patterns
   */
  private async checkForDelayedPatterns(): Promise<void> {
    // Check for patterns that develop over longer time periods
    // This could include gradual privilege escalation, slow data exfiltration, etc.

    // Example: Check for gradually increasing failed logins over multiple days
    const { data: gradualPatterns } = await this.supabase.rpc(
      'detect_gradual_security_patterns',
    );

    if (gradualPatterns) {
      for (const pattern of gradualPatterns) {
        // Create alerts for detected patterns
        await this.handleDetectedPattern(pattern);
      }
    }
  }

  /**
   * Handle detected security patterns
   */
  private async handleDetectedPattern(pattern: any): Promise<void> {
    // Implementation would depend on pattern structure
    console.log('Detected security pattern:', pattern);
  }

  /**
   * Update real-time security metrics
   */
  private async updateRealTimeMetrics(organizationId: string): Promise<void> {
    const metrics = await this.calculateSecurityMetrics(organizationId);

    // Notify metrics callbacks
    this.metricsCallbacks.forEach((callback) => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in metrics callback:', error);
      }
    });
  }

  /**
   * Calculate security metrics for an organization
   */
  async calculateSecurityMetrics(
    organizationId: string,
    timeRangeHours: number = 24,
  ): Promise<SecurityMetrics> {
    const timeRange = new Date(
      Date.now() - timeRangeHours * 60 * 60 * 1000,
    ).toISOString();

    const [eventsData, alertsData] = await Promise.all([
      this.supabase
        .from('enhanced_security_audit_logs')
        .select('event_type, severity, created_at, ip_address')
        .eq('organization_id', organizationId)
        .gte('created_at', timeRange),

      this.supabase
        .from('security_alerts')
        .select('id, severity, status')
        .eq('organization_id', organizationId)
        .eq('status', 'ACTIVE'),
    ]);

    const events = eventsData.data || [];
    const alerts = alertsData.data || [];

    // Calculate event counts by severity
    const criticalEvents = events.filter(
      (e) => e.severity === 'CRITICAL',
    ).length;
    const highEvents = events.filter((e) => e.severity === 'HIGH').length;
    const mediumEvents = events.filter((e) => e.severity === 'MEDIUM').length;
    const lowEvents = events.filter((e) => e.severity === 'LOW').length;

    // Calculate top event types
    const eventTypeCounts: Record<string, number> = {};
    events.forEach((e) => {
      eventTypeCounts[e.event_type] = (eventTypeCounts[e.event_type] || 0) + 1;
    });

    const topEventTypes = Object.entries(eventTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // Calculate top source IPs
    const ipCounts: Record<string, number> = {};
    events.forEach((e) => {
      if (e.ip_address) {
        ipCounts[e.ip_address] = (ipCounts[e.ip_address] || 0) + 1;
      }
    });

    const topSourceIPs = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }));

    // Calculate security score (0-100)
    const securityScore = Math.max(
      0,
      100 - criticalEvents * 10 - highEvents * 5 - mediumEvents * 2,
    );

    // Calculate trends
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const eventsLastHour = events.filter(
      (e) => new Date(e.created_at).getTime() > oneHourAgo,
    ).length;
    const eventsLastDay = events.filter(
      (e) => new Date(e.created_at).getTime() > oneDayAgo,
    ).length;
    const eventsLastWeek = events.filter(
      (e) => new Date(e.created_at).getTime() > oneWeekAgo,
    ).length;

    return {
      organizationId,
      timeRange: `${timeRangeHours} hours`,
      totalEvents: events.length,
      criticalEvents,
      highEvents,
      mediumEvents,
      lowEvents,
      activeAlerts: alerts.length,
      topEventTypes,
      topSourceIPs,
      securityScore,
      trends: {
        eventsLastHour,
        eventsLastDay,
        eventsLastWeek,
      },
    };
  }

  /**
   * Update security metrics for all organizations
   */
  private async updateSecurityMetrics(): Promise<void> {
    // This would run periodically to update metrics for all organizations
    // Implementation would fetch all organizations and update their metrics
  }

  /**
   * Clean up old resolved alerts
   */
  private async cleanupOldAlerts(): Promise<void> {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await this.supabase
      .from('security_alerts')
      .delete()
      .in('status', ['RESOLVED', 'FALSE_POSITIVE'])
      .lt('created_at', thirtyDaysAgo);
  }

  /**
   * Register callback for new alerts
   */
  onAlert(callback: (alert: SecurityAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Register callback for metrics updates
   */
  onMetrics(callback: (metrics: SecurityMetrics) => void): void {
    this.metricsCallbacks.push(callback);
  }

  /**
   * Get active alerts for an organization
   */
  async getActiveAlerts(organizationId: string): Promise<SecurityAlert[]> {
    const { data, error } = await this.supabase
      .from('security_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  }

  /**
   * Update alert status
   */
  async updateAlertStatus(alertId: string, status: AlertStatus): Promise<void> {
    const { error } = await this.supabase
      .from('security_alerts')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw error;
  }

  /**
   * Add custom monitoring rule
   */
  addCustomRule(rule: MonitoringRule): void {
    this.monitoringRules.push(rule);
  }

  /**
   * Remove monitoring rule
   */
  removeRule(ruleId: string): void {
    this.monitoringRules = this.monitoringRules.filter(
      (rule) => rule.id !== ruleId,
    );
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    // Clean up subscriptions and intervals
    this.supabase.removeAllChannels();
  }
}

// Singleton instance for application-wide use
export const securityEventMonitor = new SecurityEventMonitor();

export { SecurityEventMonitor };
