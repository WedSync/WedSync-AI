/**
 * Enhanced Security Audit Logger
 * Comprehensive logging system for security events and monitoring
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export interface SecurityEvent {
  id?: string;
  organization_id?: string;
  user_id?: string;
  event_type: SecurityEventType;
  event_category: SecurityEventCategory;
  event_data: Record<string, any>;
  severity: SecurityEventSeverity;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  session_id?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export type SecurityEventType =
  | 'LOGIN_ATTEMPT'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'ACCOUNT_LOCKOUT'
  | 'PRIVILEGE_ESCALATION_ATTEMPT'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT'
  | 'DATA_ACCESS'
  | 'DATA_MODIFICATION'
  | 'DATA_DELETION'
  | 'EXPORT_DATA'
  | 'ADMIN_ACTION'
  | 'API_KEY_USAGE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'SECURITY_POLICY_VIOLATION'
  | 'CSRF_ATTACK_BLOCKED'
  | 'XSS_ATTEMPT_BLOCKED'
  | 'SQL_INJECTION_ATTEMPT'
  | 'FILE_UPLOAD'
  | 'PAYMENT_EVENT'
  | 'CONFIGURATION_CHANGE'
  | 'SYSTEM_ERROR'
  | 'PERFORMANCE_ANOMALY';

export type SecurityEventCategory =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'DATA_ACCESS'
  | 'SYSTEM_SECURITY'
  | 'COMPLIANCE'
  | 'PERFORMANCE'
  | 'BUSINESS_LOGIC'
  | 'INFRASTRUCTURE';

export type SecurityEventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityAuditOptions {
  enableRealTimeAlerts?: boolean;
  enablePerformanceLogging?: boolean;
  enableBusinessLogicLogging?: boolean;
  logLevel?: SecurityEventSeverity;
  retentionDays?: number;
}

class SecurityAuditLogger {
  private supabase: any;
  private options: SecurityAuditOptions;

  constructor(options: SecurityAuditOptions = {}) {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.options = {
      enableRealTimeAlerts: true,
      enablePerformanceLogging: false,
      enableBusinessLogicLogging: true,
      logLevel: 'MEDIUM',
      retentionDays: 90,
      ...options,
    };
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Check if event meets minimum severity threshold
      if (!this.shouldLogEvent(event)) {
        return;
      }

      // Enrich event with additional metadata
      const enrichedEvent = await this.enrichSecurityEvent(event);

      // Store in audit table
      const { error } = await this.supabase
        .from('enhanced_security_audit_logs')
        .insert([enrichedEvent]);

      if (error) {
        console.error('Failed to log security event:', error);
        // Fallback to console logging in case of database issues
        console.error('SECURITY EVENT:', enrichedEvent);
      }

      // Send real-time alerts for critical events
      if (this.options.enableRealTimeAlerts && event.severity === 'CRITICAL') {
        await this.sendRealTimeAlert(enrichedEvent);
      }
    } catch (error) {
      console.error('Security audit logging error:', error);
      // Emergency fallback - at minimum log to console
      console.error('EMERGENCY SECURITY LOG:', event);
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    type: 'LOGIN_ATTEMPT' | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT',
    userId?: string,
    organizationId?: string,
    metadata: Record<string, any> = {},
    request?: NextRequest,
  ): Promise<void> {
    const severity: SecurityEventSeverity =
      type === 'LOGIN_FAILURE' ? 'HIGH' : 'MEDIUM';

    await this.logSecurityEvent({
      event_type: type,
      event_category: 'AUTHENTICATION',
      severity,
      user_id: userId,
      organization_id: organizationId,
      event_data: {
        auth_method: metadata.auth_method || 'password',
        mfa_used: metadata.mfa_used || false,
        login_source: metadata.login_source || 'web',
        failure_reason: metadata.failure_reason,
        ...metadata,
      },
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined,
      request_id: metadata.request_id,
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    operation: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE',
    tableName: string,
    recordId?: string,
    userId?: string,
    organizationId?: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    const eventType =
      operation === 'READ' ? 'DATA_ACCESS' : 'DATA_MODIFICATION';
    const severity: SecurityEventSeverity =
      operation === 'DELETE' ? 'HIGH' : 'MEDIUM';

    await this.logSecurityEvent({
      event_type: eventType,
      event_category: 'DATA_ACCESS',
      severity,
      user_id: userId,
      organization_id: organizationId,
      event_data: {
        operation,
        table_name: tableName,
        record_id: recordId,
        affected_rows: metadata.affected_rows || 1,
        query_time_ms: metadata.query_time_ms,
        ...metadata,
      },
    });
  }

  /**
   * Log unauthorized access attempts
   */
  async logUnauthorizedAccess(
    resource: string,
    attemptedAction: string,
    userId?: string,
    organizationId?: string,
    request?: NextRequest,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      event_category: 'AUTHORIZATION',
      severity: 'HIGH',
      user_id: userId,
      organization_id: organizationId,
      event_data: {
        resource,
        attempted_action: attemptedAction,
        access_denied_reason: metadata.reason || 'Insufficient permissions',
        ...metadata,
      },
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined,
    });
  }

  /**
   * Log suspicious activities
   */
  async logSuspiciousActivity(
    activityType: string,
    description: string,
    userId?: string,
    organizationId?: string,
    request?: NextRequest,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'SUSPICIOUS_ACTIVITY',
      event_category: 'SYSTEM_SECURITY',
      severity: 'CRITICAL',
      user_id: userId,
      organization_id: organizationId,
      event_data: {
        activity_type: activityType,
        description,
        confidence_score: metadata.confidence_score || 0.8,
        indicators: metadata.indicators || [],
        ...metadata,
      },
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined,
    });
  }

  /**
   * Log rate limiting events
   */
  async logRateLimitExceeded(
    endpoint: string,
    userId?: string,
    organizationId?: string,
    request?: NextRequest,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'RATE_LIMIT_EXCEEDED',
      event_category: 'SYSTEM_SECURITY',
      severity: 'MEDIUM',
      user_id: userId,
      organization_id: organizationId,
      event_data: {
        endpoint,
        request_count: metadata.request_count,
        time_window: metadata.time_window,
        limit: metadata.limit,
        ...metadata,
      },
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined,
    });
  }

  /**
   * Log payment events
   */
  async logPaymentEvent(
    paymentType:
      | 'CHECKOUT_ATTEMPT'
      | 'CHECKOUT_SUCCESS'
      | 'CHECKOUT_FAILURE'
      | 'WEBHOOK_RECEIVED'
      | 'WEBHOOK_INVALID'
      | 'SUBSCRIPTION_CREATED'
      | 'SUBSCRIPTION_UPDATED'
      | 'SUBSCRIPTION_CANCELLED'
      | 'PAYMENT_SUCCESS'
      | 'PAYMENT_FAILURE'
      | 'REFUND_ISSUED',
    userId?: string,
    organizationId?: string,
    metadata: Record<string, any> = {},
    request?: NextRequest,
  ): Promise<void> {
    const severity: SecurityEventSeverity =
      paymentType.includes('FAILURE') || paymentType.includes('INVALID')
        ? 'HIGH'
        : paymentType.includes('REFUND')
          ? 'MEDIUM'
          : 'LOW';

    await this.logSecurityEvent({
      event_type: 'PAYMENT_EVENT',
      event_category: 'BUSINESS_LOGIC',
      severity,
      user_id: userId,
      organization_id: organizationId,
      event_data: {
        payment_type: paymentType,
        amount: metadata.amount,
        currency: metadata.currency,
        stripe_customer_id: metadata.stripe_customer_id,
        stripe_session_id: metadata.stripe_session_id,
        stripe_subscription_id: metadata.stripe_subscription_id,
        price_id: metadata.price_id,
        tier: metadata.tier,
        billing_cycle: metadata.billing_cycle,
        failure_reason: metadata.failure_reason,
        idempotency_key: metadata.idempotency_key,
        ...metadata,
      },
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined,
      request_id: metadata.request_id,
    });
  }

  /**
   * Log security policy violations
   */
  async logSecurityPolicyViolation(
    policyType: string,
    violationDetails: string,
    userId?: string,
    organizationId?: string,
    request?: NextRequest,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'SECURITY_POLICY_VIOLATION',
      event_category: 'COMPLIANCE',
      severity: 'HIGH',
      user_id: userId,
      organization_id: organizationId,
      event_data: {
        policy_type: policyType,
        violation_details: violationDetails,
        auto_blocked: metadata.auto_blocked || false,
        ...metadata,
      },
      ip_address: this.getClientIP(request),
      user_agent: request?.headers.get('user-agent') || undefined,
    });
  }

  /**
   * Log performance anomalies
   */
  async logPerformanceAnomaly(
    metric: string,
    value: number,
    threshold: number,
    organizationId?: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    if (!this.options.enablePerformanceLogging) return;

    await this.logSecurityEvent({
      event_type: 'PERFORMANCE_ANOMALY',
      event_category: 'PERFORMANCE',
      severity: value > threshold * 2 ? 'HIGH' : 'MEDIUM',
      organization_id: organizationId,
      event_data: {
        metric,
        value,
        threshold,
        deviation_percentage: ((value - threshold) / threshold) * 100,
        ...metadata,
      },
    });
  }

  /**
   * Get security audit summary for organization
   */
  async getSecurityAuditSummary(
    organizationId: string,
    timeRangeHours: number = 24,
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('enhanced_security_audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .gte(
        'created_at',
        new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString(),
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Aggregate statistics
    const summary = {
      total_events: data.length,
      critical_events: data.filter((e: any) => e.severity === 'CRITICAL')
        .length,
      high_events: data.filter((e: any) => e.severity === 'HIGH').length,
      medium_events: data.filter((e: any) => e.severity === 'MEDIUM').length,
      low_events: data.filter((e: any) => e.severity === 'LOW').length,
      event_categories: this.groupByCategory(data),
      recent_critical_events: data
        .filter((e: any) => e.severity === 'CRITICAL')
        .slice(0, 10),
      time_range_hours: timeRangeHours,
    };

    return summary;
  }

  /**
   * Create security audit dashboard data
   */
  async getSecurityDashboardData(organizationId: string): Promise<any> {
    const [summary24h, summary7d, summary30d] = await Promise.all([
      this.getSecurityAuditSummary(organizationId, 24),
      this.getSecurityAuditSummary(organizationId, 168), // 7 days
      this.getSecurityAuditSummary(organizationId, 720), // 30 days
    ]);

    return {
      last_24_hours: summary24h,
      last_7_days: summary7d,
      last_30_days: summary30d,
      security_score: this.calculateSecurityScore(summary30d),
      recommendations: this.generateSecurityRecommendations(summary30d),
    };
  }

  // Private helper methods
  private shouldLogEvent(event: SecurityEvent): boolean {
    const severityLevels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const minLevel = severityLevels[this.options.logLevel || 'MEDIUM'];
    const eventLevel = severityLevels[event.severity];

    return eventLevel >= minLevel;
  }

  private async enrichSecurityEvent(
    event: SecurityEvent,
  ): Promise<SecurityEvent> {
    return {
      ...event,
      timestamp: event.timestamp || new Date(),
      metadata: {
        ...event.metadata,
        logger_version: '2.0.0',
        environment: process.env.NODE_ENV,
        service: 'wedsync-api',
      },
    };
  }

  private async sendRealTimeAlert(event: SecurityEvent): Promise<void> {
    // Implementation for real-time alerting (Slack, email, etc.)
    console.error('CRITICAL SECURITY ALERT:', {
      type: event.event_type,
      severity: event.severity,
      organization: event.organization_id,
      user: event.user_id,
      data: event.event_data,
    });

    // TODO: Implement actual alerting mechanism
    // - Send to monitoring system (DataDog, New Relic, etc.)
    // - Send Slack notification
    // - Send email to security team
    // - Trigger incident response workflow
  }

  private getClientIP(request?: NextRequest): string | undefined {
    if (!request) return undefined;

    return (
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      request.ip ||
      undefined
    );
  }

  private groupByCategory(events: any[]): Record<string, number> {
    return events.reduce((acc, event) => {
      const category = event.event_category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateSecurityScore(summary: any): number {
    // Simple scoring algorithm - can be enhanced
    const baseScore = 100;
    const criticalPenalty = summary.critical_events * 10;
    const highPenalty = summary.high_events * 5;
    const mediumPenalty = summary.medium_events * 2;

    return Math.max(
      0,
      baseScore - criticalPenalty - highPenalty - mediumPenalty,
    );
  }

  private generateSecurityRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.critical_events > 0) {
      recommendations.push(
        'Immediate attention required: Critical security events detected',
      );
    }

    if (summary.high_events > 10) {
      recommendations.push(
        'High number of high-severity events - review security policies',
      );
    }

    if (summary.event_categories.AUTHENTICATION > summary.total_events * 0.5) {
      recommendations.push(
        'High authentication activity - consider implementing additional MFA',
      );
    }

    return recommendations;
  }
}

// Singleton instance for application-wide use
export const securityAuditLogger = new SecurityAuditLogger();

// Utility functions for common logging patterns
export const auditAuth = {
  loginAttempt: (
    userId: string,
    organizationId: string,
    metadata = {},
    request?: NextRequest,
  ) =>
    securityAuditLogger.logAuthEvent(
      'LOGIN_ATTEMPT',
      userId,
      organizationId,
      metadata,
      request,
    ),

  loginSuccess: (
    userId: string,
    organizationId: string,
    metadata = {},
    request?: NextRequest,
  ) =>
    securityAuditLogger.logAuthEvent(
      'LOGIN_SUCCESS',
      userId,
      organizationId,
      metadata,
      request,
    ),

  loginFailure: (metadata = {}, request?: NextRequest) =>
    securityAuditLogger.logAuthEvent(
      'LOGIN_FAILURE',
      undefined,
      undefined,
      metadata,
      request,
    ),

  logout: (userId: string, organizationId: string, metadata = {}) =>
    securityAuditLogger.logAuthEvent(
      'LOGOUT',
      userId,
      organizationId,
      metadata,
    ),
};

export const auditData = {
  read: (
    table: string,
    recordId: string,
    userId: string,
    organizationId: string,
    metadata = {},
  ) =>
    securityAuditLogger.logDataAccess(
      'READ',
      table,
      recordId,
      userId,
      organizationId,
      metadata,
    ),

  create: (
    table: string,
    recordId: string,
    userId: string,
    organizationId: string,
    metadata = {},
  ) =>
    securityAuditLogger.logDataAccess(
      'CREATE',
      table,
      recordId,
      userId,
      organizationId,
      metadata,
    ),

  update: (
    table: string,
    recordId: string,
    userId: string,
    organizationId: string,
    metadata = {},
  ) =>
    securityAuditLogger.logDataAccess(
      'UPDATE',
      table,
      recordId,
      userId,
      organizationId,
      metadata,
    ),

  delete: (
    table: string,
    recordId: string,
    userId: string,
    organizationId: string,
    metadata = {},
  ) =>
    securityAuditLogger.logDataAccess(
      'DELETE',
      table,
      recordId,
      userId,
      organizationId,
      metadata,
    ),
};

export const auditSecurity = {
  unauthorizedAccess: (
    resource: string,
    action: string,
    userId?: string,
    organizationId?: string,
    request?: NextRequest,
  ) =>
    securityAuditLogger.logUnauthorizedAccess(
      resource,
      action,
      userId,
      organizationId,
      request,
    ),

  suspiciousActivity: (
    type: string,
    description: string,
    userId?: string,
    organizationId?: string,
    request?: NextRequest,
  ) =>
    securityAuditLogger.logSuspiciousActivity(
      type,
      description,
      userId,
      organizationId,
      request,
    ),

  rateLimitExceeded: (
    endpoint: string,
    userId?: string,
    organizationId?: string,
    request?: NextRequest,
  ) =>
    securityAuditLogger.logRateLimitExceeded(
      endpoint,
      userId,
      organizationId,
      request,
    ),

  policyViolation: (
    policy: string,
    details: string,
    userId?: string,
    organizationId?: string,
    request?: NextRequest,
  ) =>
    securityAuditLogger.logSecurityPolicyViolation(
      policy,
      details,
      userId,
      organizationId,
      request,
    ),
};

export const auditPayment = {
  checkoutAttempt: (
    userId: string,
    organizationId: string,
    metadata = {},
    request?: NextRequest,
  ) =>
    securityAuditLogger.logPaymentEvent(
      'CHECKOUT_ATTEMPT',
      userId,
      organizationId,
      metadata,
      request,
    ),

  checkoutSuccess: (
    userId: string,
    organizationId: string,
    metadata = {},
    request?: NextRequest,
  ) =>
    securityAuditLogger.logPaymentEvent(
      'CHECKOUT_SUCCESS',
      userId,
      organizationId,
      metadata,
      request,
    ),

  checkoutFailure: (
    userId: string,
    organizationId: string,
    metadata = {},
    request?: NextRequest,
  ) =>
    securityAuditLogger.logPaymentEvent(
      'CHECKOUT_FAILURE',
      userId,
      organizationId,
      metadata,
      request,
    ),

  webhookReceived: (metadata = {}, request?: NextRequest) =>
    securityAuditLogger.logPaymentEvent(
      'WEBHOOK_RECEIVED',
      undefined,
      undefined,
      metadata,
      request,
    ),

  webhookInvalid: (metadata = {}, request?: NextRequest) =>
    securityAuditLogger.logPaymentEvent(
      'WEBHOOK_INVALID',
      undefined,
      undefined,
      metadata,
      request,
    ),

  subscriptionCreated: (
    userId: string,
    organizationId: string,
    metadata = {},
  ) =>
    securityAuditLogger.logPaymentEvent(
      'SUBSCRIPTION_CREATED',
      userId,
      organizationId,
      metadata,
    ),

  subscriptionUpdated: (
    userId: string,
    organizationId: string,
    metadata = {},
  ) =>
    securityAuditLogger.logPaymentEvent(
      'SUBSCRIPTION_UPDATED',
      userId,
      organizationId,
      metadata,
    ),

  subscriptionCancelled: (
    userId: string,
    organizationId: string,
    metadata = {},
  ) =>
    securityAuditLogger.logPaymentEvent(
      'SUBSCRIPTION_CANCELLED',
      userId,
      organizationId,
      metadata,
    ),

  paymentSuccess: (userId: string, organizationId: string, metadata = {}) =>
    securityAuditLogger.logPaymentEvent(
      'PAYMENT_SUCCESS',
      userId,
      organizationId,
      metadata,
    ),

  paymentFailure: (userId: string, organizationId: string, metadata = {}) =>
    securityAuditLogger.logPaymentEvent(
      'PAYMENT_FAILURE',
      userId,
      organizationId,
      metadata,
    ),
};

export { SecurityAuditLogger };
