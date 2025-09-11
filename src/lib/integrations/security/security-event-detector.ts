/**
 * WS-177 Audit Logging System - Security Event Detector
 * Team C - Automatic security event detection and pattern matching
 *
 * This module analyzes audit events in real-time to detect suspicious
 * patterns while being optimized for wedding-specific workflows.
 */

import {
  AuditEvent,
  AuditEventType,
  AuditSeverity,
  WorkflowContext,
  WeddingRole,
  SuspiciousActivityPattern,
  SecurityCondition,
  SecurityEventConfig,
  SecurityThreshold,
  SecurityResponseAction,
} from '../../../types/security-integration';

// Security event detection engine
export class SecurityEventDetector {
  private patterns: Map<string, SuspiciousActivityPattern> = new Map();
  private eventBuffer: Map<string, AuditEvent[]> = new Map(); // keyed by userId
  private thresholdTracking: Map<string, ThresholdTracker> = new Map();
  private weddingContextCache: Map<string, WeddingContextInfo> = new Map();

  constructor() {
    this.initializeWeddingSecurityPatterns();
    this.startCleanupJob();
  }

  /**
   * Analyze an audit event for security patterns
   */
  public async analyzeEvent(event: AuditEvent): Promise<DetectionResult> {
    const detectionResult: DetectionResult = {
      event,
      suspiciousPatterns: [],
      recommendedActions: [],
      severity: AuditSeverity.LOW,
      requiresImmediateAttention: false,
    };

    try {
      // Add event to buffer for pattern analysis
      this.addEventToBuffer(event);

      // Check immediate threat patterns
      const immediateThreats = await this.checkImmediateThreatPatterns(event);
      detectionResult.suspiciousPatterns.push(...immediateThreats);

      // Check behavioral patterns
      const behavioralPatterns = await this.checkBehavioralPatterns(event);
      detectionResult.suspiciousPatterns.push(...behavioralPatterns);

      // Check wedding-specific patterns
      const weddingPatterns = await this.checkWeddingSpecificPatterns(event);
      detectionResult.suspiciousPatterns.push(...weddingPatterns);

      // Update threshold tracking
      await this.updateThresholdTracking(event);

      // Check threshold violations
      const thresholdViolations = await this.checkThresholdViolations(event);
      detectionResult.suspiciousPatterns.push(...thresholdViolations);

      // Calculate overall severity and actions
      detectionResult.severity = this.calculateOverallSeverity(
        detectionResult.suspiciousPatterns,
      );
      detectionResult.recommendedActions = this.determineResponseActions(
        detectionResult.suspiciousPatterns,
      );
      detectionResult.requiresImmediateAttention =
        detectionResult.severity === AuditSeverity.CRITICAL;

      return detectionResult;
    } catch (error) {
      console.error('Security event detection failed:', error);
      return detectionResult;
    }
  }

  /**
   * Initialize wedding-specific security patterns
   */
  private initializeWeddingSecurityPatterns(): void {
    // Rapid guest list access pattern
    this.patterns.set('rapid_guest_access', {
      id: 'rapid_guest_access',
      name: 'Rapid Guest List Access',
      description: 'Multiple guest list access events in short time window',
      pattern: {
        eventTypes: [
          AuditEventType.GUEST_LIST_ACCESS,
          AuditEventType.GUEST_LIST_MODIFIED,
        ],
        conditions: [
          { field: 'count', operator: 'gt', value: 10 },
          { field: 'timeWindow', operator: 'lt', value: 300 }, // 5 minutes
        ],
        timeWindow: 300,
      },
      severity: AuditSeverity.MEDIUM,
      responseActions: [
        SecurityResponseAction.SEND_ALERT,
        SecurityResponseAction.RATE_LIMIT,
      ],
      weddingContexts: [WorkflowContext.GUEST_MANAGEMENT],
    });

    // Bulk data export pattern
    this.patterns.set('bulk_export', {
      id: 'bulk_export',
      name: 'Bulk Data Export',
      description: 'Large-scale data export operations',
      pattern: {
        eventTypes: [AuditEventType.DATA_EXPORT],
        conditions: [{ field: 'affectedRecords', operator: 'gt', value: 100 }],
        timeWindow: 3600,
      },
      severity: AuditSeverity.HIGH,
      responseActions: [
        SecurityResponseAction.SEND_ALERT,
        SecurityResponseAction.ESCALATE_TO_ADMIN,
      ],
      weddingContexts: [
        WorkflowContext.GUEST_MANAGEMENT,
        WorkflowContext.VENDOR_COORDINATION,
      ],
    });

    // Privilege escalation pattern
    this.patterns.set('privilege_escalation', {
      id: 'privilege_escalation',
      name: 'Privilege Escalation Attempt',
      description: 'Attempts to gain elevated privileges',
      pattern: {
        eventTypes: [
          AuditEventType.PERMISSION_GRANTED,
          AuditEventType.PRIVILEGE_ESCALATION,
        ],
        conditions: [
          {
            field: 'userRole',
            operator: 'in',
            value: [WeddingRole.HELPER, WeddingRole.GUEST],
          },
          {
            field: 'targetRole',
            operator: 'in',
            value: [WeddingRole.WEDDING_PLANNER, WeddingRole.ADMIN],
          },
        ],
        timeWindow: 1800,
      },
      severity: AuditSeverity.CRITICAL,
      responseActions: [
        SecurityResponseAction.SEND_ALERT,
        SecurityResponseAction.TEMPORARY_LOCK,
        SecurityResponseAction.ESCALATE_TO_ADMIN,
      ],
      weddingContexts: [
        WorkflowContext.TASK_ASSIGNMENT,
        WorkflowContext.VENDOR_COORDINATION,
      ],
    });

    // Unusual access times pattern (wedding-specific)
    this.patterns.set('unusual_access_times', {
      id: 'unusual_access_times',
      name: 'Unusual Access Times',
      description: 'Access during unusual hours for wedding context',
      pattern: {
        eventTypes: [
          AuditEventType.GUEST_LIST_ACCESS,
          AuditEventType.VENDOR_DATA_ACCESS,
          AuditEventType.BUDGET_DATA_ACCESS,
        ],
        conditions: [
          { field: 'hour', operator: 'lt', value: 6 },
          { field: 'hour', operator: 'gt', value: 23 },
        ],
        timeWindow: 7200,
      },
      severity: AuditSeverity.MEDIUM,
      responseActions: [
        SecurityResponseAction.SEND_ALERT,
        SecurityResponseAction.REQUIRE_2FA,
      ],
      weddingContexts: [
        WorkflowContext.GUEST_MANAGEMENT,
        WorkflowContext.VENDOR_COORDINATION,
        WorkflowContext.BUDGET_TRACKING,
      ],
    });

    // Multiple failed authentications
    this.patterns.set('failed_auth_attempts', {
      id: 'failed_auth_attempts',
      name: 'Multiple Failed Authentication Attempts',
      description: 'Repeated failed login attempts',
      pattern: {
        eventTypes: [AuditEventType.FAILED_AUTHENTICATION],
        conditions: [{ field: 'count', operator: 'gt', value: 5 }],
        timeWindow: 900, // 15 minutes
      },
      severity: AuditSeverity.HIGH,
      responseActions: [
        SecurityResponseAction.TEMPORARY_LOCK,
        SecurityResponseAction.SEND_ALERT,
        SecurityResponseAction.REQUIRE_2FA,
      ],
      weddingContexts: [],
    });

    // Vendor data scraping pattern
    this.patterns.set('vendor_scraping', {
      id: 'vendor_scraping',
      name: 'Vendor Data Scraping',
      description: 'Systematic vendor information access',
      pattern: {
        eventTypes: [AuditEventType.VENDOR_DATA_ACCESS],
        conditions: [
          { field: 'count', operator: 'gt', value: 20 },
          { field: 'sequentialAccess', operator: 'equals', value: true },
        ],
        timeWindow: 600,
      },
      severity: AuditSeverity.HIGH,
      responseActions: [
        SecurityResponseAction.RATE_LIMIT,
        SecurityResponseAction.SEND_ALERT,
      ],
      weddingContexts: [WorkflowContext.VENDOR_COORDINATION],
    });
  }

  /**
   * Check for immediate threat patterns
   */
  private async checkImmediateThreatPatterns(
    event: AuditEvent,
  ): Promise<SuspiciousActivityPattern[]> {
    const threats: SuspiciousActivityPattern[] = [];

    // Check for critical events that require immediate attention
    if (event.eventType === AuditEventType.PRIVILEGE_ESCALATION) {
      const pattern = this.patterns.get('privilege_escalation');
      if (pattern) threats.push(pattern);
    }

    // Check for bulk operations that might indicate data theft
    if (
      event.eventType === AuditEventType.BULK_OPERATION &&
      event.details.affectedRecords > 100
    ) {
      const pattern = this.patterns.get('bulk_export');
      if (pattern) threats.push(pattern);
    }

    // Check for failed authentication attempts
    if (event.eventType === AuditEventType.FAILED_AUTHENTICATION) {
      const recentFailures = this.getRecentEvents(event.userId, 900) // 15 minutes
        .filter((e) => e.eventType === AuditEventType.FAILED_AUTHENTICATION);

      if (recentFailures.length >= 5) {
        const pattern = this.patterns.get('failed_auth_attempts');
        if (pattern) threats.push(pattern);
      }
    }

    return threats;
  }

  /**
   * Check behavioral patterns based on user activity
   */
  private async checkBehavioralPatterns(
    event: AuditEvent,
  ): Promise<SuspiciousActivityPattern[]> {
    const patterns: SuspiciousActivityPattern[] = [];
    const userEvents = this.getUserEvents(event.userId);

    // Check for rapid successive operations
    if (this.isRapidActivity(userEvents, event.workflowContext)) {
      const pattern = this.patterns.get('rapid_guest_access');
      if (pattern && pattern.weddingContexts.includes(event.workflowContext)) {
        patterns.push(pattern);
      }
    }

    // Check for unusual access times
    if (this.isUnusualAccessTime(event)) {
      const pattern = this.patterns.get('unusual_access_times');
      if (pattern) patterns.push(pattern);
    }

    // Check for sequential data access (scraping behavior)
    if (this.isSequentialDataAccess(userEvents, event)) {
      const pattern = this.patterns.get('vendor_scraping');
      if (pattern) patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Check wedding-specific security patterns
   */
  private async checkWeddingSpecificPatterns(
    event: AuditEvent,
  ): Promise<SuspiciousActivityPattern[]> {
    const patterns: SuspiciousActivityPattern[] = [];

    // Check if user is accessing data outside their wedding context
    if (
      event.weddingId &&
      !this.isUserAuthorizedForWedding(event.userId, event.weddingId)
    ) {
      // This would be a custom pattern for cross-wedding access
      patterns.push({
        id: 'cross_wedding_access',
        name: 'Cross-Wedding Data Access',
        description: 'User accessing data from unauthorized wedding',
        pattern: {
          eventTypes: [event.eventType],
          conditions: [],
          timeWindow: 0,
        },
        severity: AuditSeverity.CRITICAL,
        responseActions: [
          SecurityResponseAction.TEMPORARY_LOCK,
          SecurityResponseAction.ESCALATE_TO_ADMIN,
        ],
        weddingContexts: [event.workflowContext],
      });
    }

    // Check for helpers accessing admin functions
    if (event.userRole === WeddingRole.HELPER && this.isAdminFunction(event)) {
      patterns.push({
        id: 'helper_admin_access',
        name: 'Helper Accessing Admin Functions',
        description: 'Wedding helper attempting to access admin-only functions',
        pattern: {
          eventTypes: [event.eventType],
          conditions: [],
          timeWindow: 0,
        },
        severity: AuditSeverity.HIGH,
        responseActions: [
          SecurityResponseAction.SEND_ALERT,
          SecurityResponseAction.RATE_LIMIT,
        ],
        weddingContexts: [event.workflowContext],
      });
    }

    return patterns;
  }

  /**
   * Update threshold tracking for rate limiting
   */
  private async updateThresholdTracking(event: AuditEvent): Promise<void> {
    const key = `${event.userId}_${event.eventType}`;
    const now = Date.now();

    if (!this.thresholdTracking.has(key)) {
      this.thresholdTracking.set(key, {
        count: 0,
        firstEventTime: now,
        lastEventTime: now,
        events: [],
      });
    }

    const tracker = this.thresholdTracking.get(key)!;
    tracker.count++;
    tracker.lastEventTime = now;
    tracker.events.push(event);

    // Keep only events within relevant time windows
    tracker.events = tracker.events.filter(
      (e) => now - e.timestamp.getTime() <= 3600000, // 1 hour
    );
  }

  /**
   * Check for threshold violations
   */
  private async checkThresholdViolations(
    event: AuditEvent,
  ): Promise<SuspiciousActivityPattern[]> {
    const violations: SuspiciousActivityPattern[] = [];
    const key = `${event.userId}_${event.eventType}`;
    const tracker = this.thresholdTracking.get(key);

    if (!tracker) return violations;

    // Check various time window thresholds
    const timeWindows = [300, 900, 3600]; // 5min, 15min, 1hour

    for (const window of timeWindows) {
      const windowStart = Date.now() - window * 1000;
      const eventsInWindow = tracker.events.filter(
        (e) => e.timestamp.getTime() >= windowStart,
      );

      if (this.isThresholdViolated(eventsInWindow, event.eventType, window)) {
        violations.push({
          id: `threshold_violation_${event.eventType}_${window}`,
          name: `Threshold Violation - ${event.eventType}`,
          description: `Too many ${event.eventType} events in ${window} seconds`,
          pattern: {
            eventTypes: [event.eventType],
            conditions: [
              { field: 'count', operator: 'gt', value: eventsInWindow.length },
            ],
            timeWindow: window,
          },
          severity: this.getThresholdViolationSeverity(
            eventsInWindow.length,
            window,
          ),
          responseActions: [
            SecurityResponseAction.RATE_LIMIT,
            SecurityResponseAction.SEND_ALERT,
          ],
          weddingContexts: [event.workflowContext],
        });
      }
    }

    return violations;
  }

  /**
   * Helper methods for pattern detection
   */
  private addEventToBuffer(event: AuditEvent): void {
    if (!this.eventBuffer.has(event.userId)) {
      this.eventBuffer.set(event.userId, []);
    }

    const userEvents = this.eventBuffer.get(event.userId)!;
    userEvents.push(event);

    // Keep only recent events (last 24 hours)
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
    this.eventBuffer.set(
      event.userId,
      userEvents.filter((e) => e.timestamp.getTime() >= cutoffTime),
    );
  }

  private getUserEvents(userId: string): AuditEvent[] {
    return this.eventBuffer.get(userId) || [];
  }

  private getRecentEvents(
    userId: string,
    timeWindowSeconds: number,
  ): AuditEvent[] {
    const userEvents = this.getUserEvents(userId);
    const cutoffTime = Date.now() - timeWindowSeconds * 1000;
    return userEvents.filter((e) => e.timestamp.getTime() >= cutoffTime);
  }

  private isRapidActivity(
    events: AuditEvent[],
    context: WorkflowContext,
  ): boolean {
    const recentEvents = events
      .filter((e) => e.workflowContext === context)
      .filter((e) => Date.now() - e.timestamp.getTime() <= 300000); // 5 minutes

    return recentEvents.length > 10;
  }

  private isUnusualAccessTime(event: AuditEvent): boolean {
    const hour = event.timestamp.getHours();
    return hour < 6 || hour > 23;
  }

  private isSequentialDataAccess(
    events: AuditEvent[],
    currentEvent: AuditEvent,
  ): boolean {
    if (currentEvent.eventType !== AuditEventType.VENDOR_DATA_ACCESS) {
      return false;
    }

    const recentVendorAccess = events
      .filter((e) => e.eventType === AuditEventType.VENDOR_DATA_ACCESS)
      .filter((e) => Date.now() - e.timestamp.getTime() <= 600000) // 10 minutes
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return recentVendorAccess.length > 15;
  }

  private isUserAuthorizedForWedding(
    userId: string,
    weddingId: string,
  ): boolean {
    // This would check against the actual authorization system
    // For now, assume authorized unless proven otherwise
    return true;
  }

  private isAdminFunction(event: AuditEvent): boolean {
    const adminEventTypes = [
      AuditEventType.PERMISSION_GRANTED,
      AuditEventType.PERMISSION_REVOKED,
      AuditEventType.DATA_EXPORT,
    ];

    return (
      adminEventTypes.includes(event.eventType) ||
      event.details.adminAction === true
    );
  }

  private isThresholdViolated(
    events: AuditEvent[],
    eventType: AuditEventType,
    windowSeconds: number,
  ): boolean {
    const thresholds: Partial<Record<AuditEventType, Record<number, number>>> =
      {
        [AuditEventType.GUEST_LIST_ACCESS]: { 300: 20, 900: 50, 3600: 200 },
        [AuditEventType.VENDOR_DATA_ACCESS]: { 300: 15, 900: 40, 3600: 150 },
        [AuditEventType.DATA_EXPORT]: { 300: 3, 900: 5, 3600: 10 },
        [AuditEventType.FAILED_AUTHENTICATION]: { 300: 5, 900: 10, 3600: 20 },
      };

    const threshold = thresholds[eventType]?.[windowSeconds];
    return threshold ? events.length > threshold : false;
  }

  private getThresholdViolationSeverity(
    eventCount: number,
    windowSeconds: number,
  ): AuditSeverity {
    const ratio = eventCount / (windowSeconds / 60); // events per minute

    if (ratio > 10) return AuditSeverity.CRITICAL;
    if (ratio > 5) return AuditSeverity.HIGH;
    if (ratio > 2) return AuditSeverity.MEDIUM;
    return AuditSeverity.LOW;
  }

  private calculateOverallSeverity(
    patterns: SuspiciousActivityPattern[],
  ): AuditSeverity {
    if (patterns.some((p) => p.severity === AuditSeverity.CRITICAL)) {
      return AuditSeverity.CRITICAL;
    }
    if (patterns.some((p) => p.severity === AuditSeverity.HIGH)) {
      return AuditSeverity.HIGH;
    }
    if (patterns.some((p) => p.severity === AuditSeverity.MEDIUM)) {
      return AuditSeverity.MEDIUM;
    }
    return AuditSeverity.LOW;
  }

  private determineResponseActions(
    patterns: SuspiciousActivityPattern[],
  ): SecurityResponseAction[] {
    const actions = new Set<SecurityResponseAction>();

    patterns.forEach((pattern) => {
      pattern.responseActions.forEach((action) => actions.add(action));
    });

    return Array.from(actions);
  }

  /**
   * Cleanup job to prevent memory leaks
   */
  private startCleanupJob(): void {
    setInterval(
      () => {
        const now = Date.now();
        const cutoffTime = now - 24 * 60 * 60 * 1000; // 24 hours

        // Clean event buffer
        this.eventBuffer.forEach((events, userId) => {
          const filteredEvents = events.filter(
            (e) => e.timestamp.getTime() >= cutoffTime,
          );
          if (filteredEvents.length === 0) {
            this.eventBuffer.delete(userId);
          } else {
            this.eventBuffer.set(userId, filteredEvents);
          }
        });

        // Clean threshold tracking
        this.thresholdTracking.forEach((tracker, key) => {
          tracker.events = tracker.events.filter(
            (e) => e.timestamp.getTime() >= cutoffTime,
          );
          if (tracker.events.length === 0) {
            this.thresholdTracking.delete(key);
          }
        });
      },
      60 * 60 * 1000,
    ); // Run every hour
  }
}

// Supporting types and interfaces
interface DetectionResult {
  event: AuditEvent;
  suspiciousPatterns: SuspiciousActivityPattern[];
  recommendedActions: SecurityResponseAction[];
  severity: AuditSeverity;
  requiresImmediateAttention: boolean;
}

interface ThresholdTracker {
  count: number;
  firstEventTime: number;
  lastEventTime: number;
  events: AuditEvent[];
}

interface WeddingContextInfo {
  weddingId: string;
  authorizedUsers: string[];
  weddingDate: Date;
  privacyLevel: string;
}

// Factory function
export function createSecurityEventDetector(): SecurityEventDetector {
  return new SecurityEventDetector();
}

// Singleton instance for global use
export const securityEventDetector = createSecurityEventDetector();

export default SecurityEventDetector;
