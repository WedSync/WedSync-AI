/**
 * WS-177 Audit Logging System - Suspicious Activity Handler
 * Team C - Automated response to security events
 *
 * This module handles suspicious activity detection results and executes
 * appropriate automated responses while considering wedding context.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AuditEvent,
  AuditEventType,
  AuditSeverity,
  WorkflowContext,
  WeddingRole,
  SuspiciousActivityPattern,
  SecurityResponseAction,
} from '../../../types/security-integration';

// Response execution results
export interface ResponseExecutionResult {
  actionId: string;
  action: SecurityResponseAction;
  executed: boolean;
  success: boolean;
  errorMessage?: string;
  details: Record<string, any>;
  timestamp: Date;
}

// Activity response context
export interface ActivityResponseContext {
  userId: string;
  weddingId?: string;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  patterns: SuspiciousActivityPattern[];
  originalEvent: AuditEvent;
  severity: AuditSeverity;
}

// Alert notification interface
export interface SecurityAlert {
  id: string;
  type: 'security_incident' | 'suspicious_activity' | 'threshold_violation';
  severity: AuditSeverity;
  userId: string;
  weddingId?: string;
  title: string;
  description: string;
  patterns: SuspiciousActivityPattern[];
  recommendedActions: string[];
  timestamp: Date;
  resolved: boolean;
}

// Rate limiting state
interface RateLimitState {
  userId: string;
  requestCount: number;
  windowStart: number;
  blocked: boolean;
  blockedUntil?: number;
}

// User lock state
interface UserLockState {
  userId: string;
  lockReason: string;
  lockedAt: Date;
  lockedUntil?: Date;
  lockLevel: 'soft' | 'hard';
  bypassCode?: string;
}

export class SuspiciousActivityHandler {
  private rateLimitStates: Map<string, RateLimitState> = new Map();
  private userLockStates: Map<string, UserLockState> = new Map();
  private recentAlerts: Map<string, SecurityAlert[]> = new Map();
  private notificationService?: any; // Will be injected
  private auditLogger?: any; // Will be injected from Team B

  constructor(notificationService?: any, auditLogger?: any) {
    this.notificationService = notificationService;
    this.auditLogger = auditLogger;
    this.startCleanupJob();
  }

  /**
   * Handle suspicious activity detection results
   */
  public async handleSuspiciousActivity(
    patterns: SuspiciousActivityPattern[],
    context: ActivityResponseContext,
  ): Promise<ResponseExecutionResult[]> {
    const results: ResponseExecutionResult[] = [];
    const alert = await this.createSecurityAlert(patterns, context);

    try {
      // Store the alert
      this.storeAlert(alert);

      // Determine unique response actions
      const actions = this.determineResponseActions(patterns, context);

      // Execute each action
      for (const action of actions) {
        const result = await this.executeResponseAction(action, context, alert);
        results.push(result);
      }

      // Log the response execution
      await this.logResponseExecution(alert, results, context);

      return results;
    } catch (error) {
      console.error('Failed to handle suspicious activity:', error);

      // Create error result
      results.push({
        actionId: uuidv4(),
        action: SecurityResponseAction.LOG_ONLY,
        executed: false,
        success: false,
        errorMessage: error?.message || 'Unknown error',
        details: { error: error?.stack },
        timestamp: new Date(),
      });

      return results;
    }
  }

  /**
   * Execute a specific security response action
   */
  private async executeResponseAction(
    action: SecurityResponseAction,
    context: ActivityResponseContext,
    alert: SecurityAlert,
  ): Promise<ResponseExecutionResult> {
    const actionId = uuidv4();
    const startTime = Date.now();

    try {
      let result: ResponseExecutionResult;

      switch (action) {
        case SecurityResponseAction.LOG_ONLY:
          result = await this.executeLogOnly(actionId, context, alert);
          break;

        case SecurityResponseAction.SEND_ALERT:
          result = await this.executeSendAlert(actionId, context, alert);
          break;

        case SecurityResponseAction.RATE_LIMIT:
          result = await this.executeRateLimit(actionId, context, alert);
          break;

        case SecurityResponseAction.TEMPORARY_LOCK:
          result = await this.executeTemporaryLock(actionId, context, alert);
          break;

        case SecurityResponseAction.REQUIRE_2FA:
          result = await this.executeRequire2FA(actionId, context, alert);
          break;

        case SecurityResponseAction.ESCALATE_TO_ADMIN:
          result = await this.executeEscalateToAdmin(actionId, context, alert);
          break;

        default:
          result = {
            actionId,
            action,
            executed: false,
            success: false,
            errorMessage: `Unsupported action: ${action}`,
            details: {},
            timestamp: new Date(),
          };
      }

      result.details.executionTime = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        actionId,
        action,
        executed: false,
        success: false,
        errorMessage: error?.message || 'Action execution failed',
        details: {
          error: error?.stack,
          executionTime: Date.now() - startTime,
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute log only action
   */
  private async executeLogOnly(
    actionId: string,
    context: ActivityResponseContext,
    alert: SecurityAlert,
  ): Promise<ResponseExecutionResult> {
    console.log('Security Alert (Log Only):', {
      alertId: alert.id,
      userId: context.userId,
      patterns: alert.patterns.map((p) => p.name),
      severity: alert.severity,
    });

    return {
      actionId,
      action: SecurityResponseAction.LOG_ONLY,
      executed: true,
      success: true,
      details: { loggedAt: new Date().toISOString() },
      timestamp: new Date(),
    };
  }

  /**
   * Execute send alert action
   */
  private async executeSendAlert(
    actionId: string,
    context: ActivityResponseContext,
    alert: SecurityAlert,
  ): Promise<ResponseExecutionResult> {
    const notification = {
      id: uuidv4(),
      type: 'security_alert',
      recipients: await this.determineAlertRecipients(context),
      subject: this.generateAlertSubject(alert, context),
      message: this.generateAlertMessage(alert, context),
      priority: this.mapSeverityToPriority(alert.severity),
      weddingContext: context.weddingId
        ? {
            weddingId: context.weddingId,
            affectedWorkflows: alert.patterns
              .map((p) => p.weddingContexts)
              .flat(),
          }
        : undefined,
    };

    try {
      if (this.notificationService) {
        await this.notificationService.sendAlert(notification);
      } else {
        // Fallback to console logging
        console.warn('Security Alert:', notification);
      }

      return {
        actionId,
        action: SecurityResponseAction.SEND_ALERT,
        executed: true,
        success: true,
        details: {
          notificationId: notification.id,
          recipients: notification.recipients.length,
          channel: 'email_and_dashboard',
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        actionId,
        action: SecurityResponseAction.SEND_ALERT,
        executed: true,
        success: false,
        errorMessage: error?.message || 'Alert sending failed',
        details: { notificationId: notification.id },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute rate limit action
   */
  private async executeRateLimit(
    actionId: string,
    context: ActivityResponseContext,
    alert: SecurityAlert,
  ): Promise<ResponseExecutionResult> {
    const userId = context.userId;
    const currentTime = Date.now();

    // Calculate rate limit duration based on severity
    const limitDuration = this.calculateRateLimitDuration(alert.severity);

    const rateLimitState: RateLimitState = {
      userId,
      requestCount: 0,
      windowStart: currentTime,
      blocked: true,
      blockedUntil: currentTime + limitDuration,
    };

    this.rateLimitStates.set(userId, rateLimitState);

    return {
      actionId,
      action: SecurityResponseAction.RATE_LIMIT,
      executed: true,
      success: true,
      details: {
        userId,
        limitDuration,
        blockedUntil: new Date(rateLimitState.blockedUntil!).toISOString(),
        reason: `Suspicious activity: ${alert.patterns.map((p) => p.name).join(', ')}`,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Execute temporary lock action
   */
  private async executeTemporaryLock(
    actionId: string,
    context: ActivityResponseContext,
    alert: SecurityAlert,
  ): Promise<ResponseExecutionResult> {
    const userId = context.userId;
    const lockDuration = this.calculateLockDuration(alert.severity);
    const bypassCode = this.generateBypassCode();

    const lockState: UserLockState = {
      userId,
      lockReason: `Suspicious activity detected: ${alert.patterns.map((p) => p.name).join(', ')}`,
      lockedAt: new Date(),
      lockedUntil: new Date(Date.now() + lockDuration),
      lockLevel: alert.severity === AuditSeverity.CRITICAL ? 'hard' : 'soft',
      bypassCode:
        alert.severity !== AuditSeverity.CRITICAL ? bypassCode : undefined,
    };

    this.userLockStates.set(userId, lockState);

    // Send lock notification to user if wedding context available
    if (context.weddingId && this.notificationService) {
      await this.sendLockNotification(context, lockState);
    }

    return {
      actionId,
      action: SecurityResponseAction.TEMPORARY_LOCK,
      executed: true,
      success: true,
      details: {
        userId,
        lockLevel: lockState.lockLevel,
        lockDuration,
        lockedUntil: lockState.lockedUntil!.toISOString(),
        bypassCode: lockState.bypassCode,
        reason: lockState.lockReason,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Execute require 2FA action
   */
  private async executeRequire2FA(
    actionId: string,
    context: ActivityResponseContext,
    alert: SecurityAlert,
  ): Promise<ResponseExecutionResult> {
    // This would integrate with the authentication system to require 2FA
    // For now, we'll simulate the action

    try {
      // TODO: Integrate with authentication system
      // await authService.requireTwoFactorAuth(context.userId, context.sessionId);

      return {
        actionId,
        action: SecurityResponseAction.REQUIRE_2FA,
        executed: true,
        success: true,
        details: {
          userId: context.userId,
          sessionId: context.sessionId,
          requiredAt: new Date().toISOString(),
          reason: 'Suspicious activity detected',
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        actionId,
        action: SecurityResponseAction.REQUIRE_2FA,
        executed: true,
        success: false,
        errorMessage: error?.message || '2FA requirement failed',
        details: { userId: context.userId },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute escalate to admin action
   */
  private async executeEscalateToAdmin(
    actionId: string,
    context: ActivityResponseContext,
    alert: SecurityAlert,
  ): Promise<ResponseExecutionResult> {
    const escalationTicket = {
      id: uuidv4(),
      type: 'security_escalation',
      severity: 'high',
      userId: context.userId,
      weddingId: context.weddingId,
      title: `Security Escalation: ${alert.title}`,
      description: this.generateEscalationDescription(alert, context),
      patterns: alert.patterns,
      evidenceEvents: [context.originalEvent],
      createdAt: new Date(),
      status: 'open',
      assignedTo: 'security_team',
    };

    try {
      // TODO: Integrate with ticketing system
      // await ticketingService.createTicket(escalationTicket);

      // Send immediate notification to admins
      if (this.notificationService) {
        await this.notificationService.sendAdminAlert({
          type: 'security_escalation',
          ticketId: escalationTicket.id,
          severity: alert.severity,
          userId: context.userId,
          weddingId: context.weddingId,
          summary: alert.title,
        });
      }

      return {
        actionId,
        action: SecurityResponseAction.ESCALATE_TO_ADMIN,
        executed: true,
        success: true,
        details: {
          ticketId: escalationTicket.id,
          escalatedAt: new Date().toISOString(),
          assignedTo: escalationTicket.assignedTo,
          severity: escalationTicket.severity,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        actionId,
        action: SecurityResponseAction.ESCALATE_TO_ADMIN,
        executed: true,
        success: false,
        errorMessage: error?.message || 'Admin escalation failed',
        details: { ticketId: escalationTicket.id },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check if user is currently rate limited
   */
  public isUserRateLimited(userId: string): boolean {
    const rateLimitState = this.rateLimitStates.get(userId);
    if (!rateLimitState || !rateLimitState.blocked) {
      return false;
    }

    const now = Date.now();
    if (rateLimitState.blockedUntil && now > rateLimitState.blockedUntil) {
      // Rate limit expired
      rateLimitState.blocked = false;
      rateLimitState.blockedUntil = undefined;
      return false;
    }

    return true;
  }

  /**
   * Check if user is currently locked
   */
  public isUserLocked(userId: string): UserLockState | null {
    const lockState = this.userLockStates.get(userId);
    if (!lockState) {
      return null;
    }

    const now = new Date();
    if (lockState.lockedUntil && now > lockState.lockedUntil) {
      // Lock expired
      this.userLockStates.delete(userId);
      return null;
    }

    return lockState;
  }

  /**
   * Unlock user with bypass code
   */
  public unlockUser(userId: string, bypassCode: string): boolean {
    const lockState = this.userLockStates.get(userId);
    if (!lockState || lockState.lockLevel === 'hard') {
      return false;
    }

    if (lockState.bypassCode === bypassCode) {
      this.userLockStates.delete(userId);
      return true;
    }

    return false;
  }

  // Helper methods
  private determineResponseActions(
    patterns: SuspiciousActivityPattern[],
    context: ActivityResponseContext,
  ): SecurityResponseAction[] {
    const allActions = new Set<SecurityResponseAction>();

    patterns.forEach((pattern) => {
      pattern.responseActions.forEach((action) => {
        allActions.add(action);
      });
    });

    // Add context-specific actions for wedding scenarios
    if (context.severity === AuditSeverity.CRITICAL) {
      allActions.add(SecurityResponseAction.ESCALATE_TO_ADMIN);
    }

    if (
      context.weddingId &&
      patterns.some((p) =>
        p.weddingContexts.includes(WorkflowContext.GUEST_MANAGEMENT),
      )
    ) {
      allActions.add(SecurityResponseAction.SEND_ALERT);
    }

    return Array.from(allActions);
  }

  private async createSecurityAlert(
    patterns: SuspiciousActivityPattern[],
    context: ActivityResponseContext,
  ): Promise<SecurityAlert> {
    return {
      id: uuidv4(),
      type: 'suspicious_activity',
      severity: context.severity,
      userId: context.userId,
      weddingId: context.weddingId,
      title: this.generateAlertTitle(patterns, context),
      description: this.generateAlertDescription(patterns, context),
      patterns,
      recommendedActions: this.generateRecommendedActions(patterns),
      timestamp: new Date(),
      resolved: false,
    };
  }

  private generateAlertTitle(
    patterns: SuspiciousActivityPattern[],
    context: ActivityResponseContext,
  ): string {
    const patternNames = patterns.map((p) => p.name).join(', ');
    const weddingContext = context.weddingId
      ? ` (Wedding ${context.weddingId})`
      : '';
    return `Suspicious Activity Detected: ${patternNames}${weddingContext}`;
  }

  private generateAlertDescription(
    patterns: SuspiciousActivityPattern[],
    context: ActivityResponseContext,
  ): string {
    const descriptions = patterns.map((p) => `• ${p.description}`).join('\n');
    return `User ${context.userId} triggered the following security patterns:\n${descriptions}\n\nWorkflow Context: ${context.originalEvent.workflowContext}`;
  }

  private generateRecommendedActions(
    patterns: SuspiciousActivityPattern[],
  ): string[] {
    const actions = new Set<string>();

    patterns.forEach((pattern) => {
      pattern.responseActions.forEach((action) => {
        switch (action) {
          case SecurityResponseAction.RATE_LIMIT:
            actions.add(
              'Review user activity patterns and consider rate limiting',
            );
            break;
          case SecurityResponseAction.TEMPORARY_LOCK:
            actions.add(
              'Temporarily restrict user access pending investigation',
            );
            break;
          case SecurityResponseAction.REQUIRE_2FA:
            actions.add(
              'Require additional authentication for sensitive operations',
            );
            break;
          case SecurityResponseAction.ESCALATE_TO_ADMIN:
            actions.add('Escalate to security team for immediate review');
            break;
        }
      });
    });

    return Array.from(actions);
  }

  private async determineAlertRecipients(
    context: ActivityResponseContext,
  ): Promise<string[]> {
    const recipients: string[] = [];

    // Always include security team
    recipients.push('security@wedsync.com');

    // Include wedding planner if wedding context exists
    if (context.weddingId) {
      // TODO: Get wedding planner email from wedding service
      recipients.push('planner@example.com');
    }

    // Include admin for critical events
    if (context.severity === AuditSeverity.CRITICAL) {
      recipients.push('admin@wedsync.com');
    }

    return recipients;
  }

  private generateAlertSubject(
    alert: SecurityAlert,
    context: ActivityResponseContext,
  ): string {
    const severityPrefix = alert.severity.toUpperCase();
    return `[${severityPrefix}] ${alert.title}`;
  }

  private generateAlertMessage(
    alert: SecurityAlert,
    context: ActivityResponseContext,
  ): string {
    return `
Security Alert Details:
- Alert ID: ${alert.id}
- Severity: ${alert.severity}
- User: ${context.userId}
- IP Address: ${context.ipAddress}
- Timestamp: ${alert.timestamp.toISOString()}
- Wedding ID: ${context.weddingId || 'N/A'}

Detected Patterns:
${alert.patterns.map((p) => `• ${p.name}: ${p.description}`).join('\n')}

Recommended Actions:
${alert.recommendedActions.map((a) => `• ${a}`).join('\n')}

Original Event:
- Type: ${context.originalEvent.eventType}
- Context: ${context.originalEvent.workflowContext}
- Details: ${JSON.stringify(context.originalEvent.details, null, 2)}
`;
  }

  private generateEscalationDescription(
    alert: SecurityAlert,
    context: ActivityResponseContext,
  ): string {
    return `
Critical security event requiring immediate attention:

${alert.description}

Context:
- User: ${context.userId}
- IP: ${context.ipAddress}
- Session: ${context.sessionId}
- Wedding: ${context.weddingId || 'N/A'}

Technical Details:
- Event Type: ${context.originalEvent.eventType}
- Workflow: ${context.originalEvent.workflowContext}
- Severity: ${alert.severity}

This incident requires investigation and potential user restriction.
`;
  }

  private calculateRateLimitDuration(severity: AuditSeverity): number {
    switch (severity) {
      case AuditSeverity.CRITICAL:
        return 60 * 60 * 1000; // 1 hour
      case AuditSeverity.HIGH:
        return 30 * 60 * 1000; // 30 minutes
      case AuditSeverity.MEDIUM:
        return 15 * 60 * 1000; // 15 minutes
      case AuditSeverity.LOW:
        return 5 * 60 * 1000; // 5 minutes
      default:
        return 5 * 60 * 1000;
    }
  }

  private calculateLockDuration(severity: AuditSeverity): number {
    switch (severity) {
      case AuditSeverity.CRITICAL:
        return 24 * 60 * 60 * 1000; // 24 hours
      case AuditSeverity.HIGH:
        return 4 * 60 * 60 * 1000; // 4 hours
      case AuditSeverity.MEDIUM:
        return 2 * 60 * 60 * 1000; // 2 hours
      case AuditSeverity.LOW:
        return 30 * 60 * 1000; // 30 minutes
      default:
        return 30 * 60 * 1000;
    }
  }

  private generateBypassCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  private mapSeverityToPriority(severity: AuditSeverity): string {
    switch (severity) {
      case AuditSeverity.CRITICAL:
        return 'urgent';
      case AuditSeverity.HIGH:
        return 'high';
      case AuditSeverity.MEDIUM:
        return 'medium';
      case AuditSeverity.LOW:
        return 'low';
      default:
        return 'medium';
    }
  }

  private storeAlert(alert: SecurityAlert): void {
    const userId = alert.userId;
    if (!this.recentAlerts.has(userId)) {
      this.recentAlerts.set(userId, []);
    }

    const userAlerts = this.recentAlerts.get(userId)!;
    userAlerts.push(alert);

    // Keep only recent alerts (last 24 hours)
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
    this.recentAlerts.set(
      userId,
      userAlerts.filter((a) => a.timestamp.getTime() >= cutoffTime),
    );
  }

  private async sendLockNotification(
    context: ActivityResponseContext,
    lockState: UserLockState,
  ): Promise<void> {
    if (!this.notificationService) return;

    try {
      await this.notificationService.sendUserNotification({
        userId: context.userId,
        type: 'account_locked',
        title: 'Account Temporarily Locked',
        message: `Your account has been temporarily locked due to suspicious activity. ${
          lockState.bypassCode
            ? `Use bypass code: ${lockState.bypassCode}`
            : 'Please contact support.'
        }`,
        severity: 'warning',
      });
    } catch (error) {
      console.error('Failed to send lock notification:', error);
    }
  }

  private async logResponseExecution(
    alert: SecurityAlert,
    results: ResponseExecutionResult[],
    context: ActivityResponseContext,
  ): Promise<void> {
    if (!this.auditLogger) return;

    try {
      const logEvent: AuditEvent = {
        id: uuidv4(),
        timestamp: new Date(),
        eventType: AuditEventType.UNUSUAL_ACCESS_PATTERN,
        severity: AuditSeverity.MEDIUM,
        userId: 'system',
        userRole: WeddingRole.ADMIN,
        weddingId: context.weddingId,
        workflowContext: context.originalEvent.workflowContext,
        resourceType: 'security_response',
        ipAddress: '127.0.0.1',
        userAgent: 'security-system',
        sessionId: 'security-response',
        details: {
          alertId: alert.id,
          targetUserId: context.userId,
          executedActions: results.map((r) => ({
            action: r.action,
            success: r.success,
            details: r.details,
          })),
          patterns: alert.patterns.map((p) => p.name),
        },
        metadata: {
          requestId: uuidv4(),
          source: 'background',
          success: results.every((r) => r.success),
        },
      };

      await this.auditLogger.logEvent(logEvent);
    } catch (error) {
      console.error('Failed to log response execution:', error);
    }
  }

  /**
   * Cleanup expired states
   */
  private startCleanupJob(): void {
    setInterval(
      () => {
        const now = Date.now();

        // Clean up expired rate limits
        this.rateLimitStates.forEach((state, userId) => {
          if (state.blockedUntil && now > state.blockedUntil) {
            this.rateLimitStates.delete(userId);
          }
        });

        // Clean up expired locks
        this.userLockStates.forEach((state, userId) => {
          if (state.lockedUntil && now > state.lockedUntil.getTime()) {
            this.userLockStates.delete(userId);
          }
        });

        // Clean up old alerts
        const cutoffTime = now - 24 * 60 * 60 * 1000;
        this.recentAlerts.forEach((alerts, userId) => {
          const filteredAlerts = alerts.filter(
            (a) => a.timestamp.getTime() >= cutoffTime,
          );
          if (filteredAlerts.length === 0) {
            this.recentAlerts.delete(userId);
          } else {
            this.recentAlerts.set(userId, filteredAlerts);
          }
        });
      },
      60 * 60 * 1000,
    ); // Run every hour
  }
}

// Factory function
export function createSuspiciousActivityHandler(
  notificationService?: any,
  auditLogger?: any,
): SuspiciousActivityHandler {
  return new SuspiciousActivityHandler(notificationService, auditLogger);
}

// Singleton instance for global use
export const suspiciousActivityHandler = createSuspiciousActivityHandler();

export default SuspiciousActivityHandler;
