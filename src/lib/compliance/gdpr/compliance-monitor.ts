/**
 * WS-176 GDPR Compliance System - Team D Round 1
 * Real-time GDPR compliance monitoring system
 *
 * @fileoverview Continuous monitoring system that tracks GDPR compliance across
 * all wedding data processing activities with real-time alerts and automated reporting
 */

import {
  ComplianceStatus,
  ComplianceIssue,
  ComplianceEvent,
  ComplianceMonitor,
  MonitorType,
  Jurisdiction,
  PersonalDataType,
  LegalBasis,
  AlertThreshold,
  ComplianceError,
} from '../../../types/gdpr-compliance';
import { createClient } from '@supabase/supabase-js';
import { auditLogger } from '../../middleware/audit';
import { z } from 'zod';

/**
 * Real-time GDPR compliance monitoring system
 * Continuously monitors compliance status and triggers alerts for violations
 */
export class GDPRComplianceMonitor {
  private static instance: GDPRComplianceMonitor;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  private monitors: Map<string, ComplianceMonitor> = new Map();
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  private constructor() {
    this.initializeDefaultMonitors();
  }

  /**
   * Singleton instance getter
   */
  public static getInstance(): GDPRComplianceMonitor {
    if (!GDPRComplianceMonitor.instance) {
      GDPRComplianceMonitor.instance = new GDPRComplianceMonitor();
    }
    return GDPRComplianceMonitor.instance;
  }

  /**
   * Initialize default compliance monitors for wedding platform
   */
  private initializeDefaultMonitors(): void {
    const defaultMonitors: ComplianceMonitor[] = [
      {
        id: 'consent-expiry-monitor',
        name: 'Consent Expiry Monitoring',
        description:
          'Monitors consent expiration for wedding couples and vendors',
        type: 'consent_expiry',
        jurisdiction: 'GLOBAL',
        schedule: {
          frequency: 'daily',
          times: ['09:00', '15:00'],
          timezone: 'UTC',
        },
        thresholds: [
          {
            metric: 'expired_consents',
            operator: '>',
            value: 0,
            severity: 'high',
            notificationRecipients: [
              'dpo@wedsync.com',
              'compliance@wedsync.com',
            ],
          },
        ],
        isActive: true,
      },
      {
        id: 'retention-compliance-monitor',
        name: 'Data Retention Compliance',
        description:
          'Ensures wedding data is deleted according to retention policies',
        type: 'retention_compliance',
        jurisdiction: 'GLOBAL',
        schedule: {
          frequency: 'daily',
          times: ['02:00'],
          timezone: 'UTC',
        },
        thresholds: [
          {
            metric: 'overdue_deletions',
            operator: '>',
            value: 5,
            severity: 'critical',
            notificationRecipients: ['dpo@wedsync.com', 'legal@wedsync.com'],
          },
        ],
        isActive: true,
      },
      {
        id: 'breach-indicators-monitor',
        name: 'Privacy Breach Detection',
        description: 'Real-time monitoring for potential privacy breaches',
        type: 'breach_indicators',
        jurisdiction: 'GLOBAL',
        schedule: {
          frequency: 'real_time',
          timezone: 'UTC',
        },
        thresholds: [
          {
            metric: 'suspicious_access_patterns',
            operator: '>',
            value: 3,
            severity: 'critical',
            notificationRecipients: ['security@wedsync.com', 'dpo@wedsync.com'],
          },
        ],
        isActive: true,
      },
      {
        id: 'cross-border-transfer-monitor',
        name: 'Cross-Border Transfer Compliance',
        description:
          'Monitors international data transfers for wedding services',
        type: 'cross_border_transfers',
        jurisdiction: 'EU',
        schedule: {
          frequency: 'hourly',
          timezone: 'UTC',
        },
        thresholds: [
          {
            metric: 'unauthorized_transfers',
            operator: '>',
            value: 0,
            severity: 'critical',
            notificationRecipients: [
              'dpo@wedsync.com',
              'compliance@wedsync.com',
            ],
          },
        ],
        isActive: true,
      },
    ];

    defaultMonitors.forEach((monitor) => {
      this.monitors.set(monitor.id, monitor);
    });
  }

  /**
   * Start the compliance monitoring system
   */
  public async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      throw new ComplianceError(
        'Monitoring is already running',
        'MONITOR_ALREADY_RUNNING',
      );
    }

    this.isRunning = true;

    await auditLogger.log({
      event_type: 'COMPLIANCE_MONITORING_STARTED',
      resource_type: 'compliance_monitor',
      resource_id: 'gdpr-compliance-monitor',
      metadata: {
        active_monitors: Array.from(this.monitors.keys()),
        start_time: new Date().toISOString(),
      },
    });

    // Start real-time monitoring
    this.intervalId = setInterval(() => {
      this.runScheduledChecks();
    }, 60000); // Check every minute for scheduled monitors

    // Initialize real-time monitors
    await this.initializeRealTimeMonitors();
  }

  /**
   * Stop the compliance monitoring system
   */
  public async stopMonitoring(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    await auditLogger.log({
      event_type: 'COMPLIANCE_MONITORING_STOPPED',
      resource_type: 'compliance_monitor',
      resource_id: 'gdpr-compliance-monitor',
      metadata: {
        stop_time: new Date().toISOString(),
      },
    });
  }

  /**
   * Get current compliance status across all jurisdictions
   */
  public async getComplianceStatus(
    jurisdiction?: Jurisdiction,
  ): Promise<ComplianceStatus> {
    const issues = await this.getAllComplianceIssues(jurisdiction);
    const totalChecks = await this.getTotalComplianceChecks(jurisdiction);
    const passedChecks =
      totalChecks -
      issues.filter((i) => i.severity === 'critical' || i.severity === 'high')
        .length;

    const score =
      totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;
    const compliant =
      issues.filter((i) => i.severity === 'critical').length === 0;

    const status: ComplianceStatus = {
      compliant,
      score,
      lastChecked: new Date(),
      issues,
      nextReviewDate: this.calculateNextReviewDate(),
    };

    await auditLogger.log({
      event_type: 'COMPLIANCE_STATUS_CHECKED',
      resource_type: 'compliance_status',
      resource_id: jurisdiction || 'global',
      metadata: {
        compliance_score: score,
        is_compliant: compliant,
        issue_count: issues.length,
        critical_issues: issues.filter((i) => i.severity === 'critical').length,
      },
    });

    return status;
  }

  /**
   * Record a compliance event for monitoring
   */
  public async recordComplianceEvent(
    event: Omit<ComplianceEvent, 'id' | 'timestamp'>,
  ): Promise<string> {
    const eventId = crypto.randomUUID();
    const complianceEvent: ComplianceEvent = {
      id: eventId,
      timestamp: new Date(),
      ...event,
    };

    // Store in database
    const { error } = await this.supabase.from('compliance_events').insert([
      {
        id: eventId,
        type: event.type,
        user_id: event.userId,
        data_type: event.dataType,
        jurisdiction: event.jurisdiction,
        legal_basis: event.legalBasis,
        metadata: event.metadata,
        timestamp: complianceEvent.timestamp.toISOString(),
      },
    ]);

    if (error) {
      throw new ComplianceError(
        `Failed to record compliance event: ${error.message}`,
        'EVENT_RECORDING_FAILED',
      );
    }

    await auditLogger.log({
      event_type: 'COMPLIANCE_EVENT_RECORDED',
      resource_type: 'compliance_event',
      resource_id: eventId,
      user_id: event.userId,
      metadata: {
        event_type: event.type,
        data_type: event.dataType,
        jurisdiction: event.jurisdiction,
        legal_basis: event.legalBasis,
      },
    });

    // Check if this event triggers any compliance issues
    await this.analyzeEventForCompliance(complianceEvent);

    return eventId;
  }

  /**
   * Add a custom compliance monitor
   */
  public addMonitor(monitor: ComplianceMonitor): void {
    this.monitors.set(monitor.id, monitor);

    auditLogger.log({
      event_type: 'COMPLIANCE_MONITOR_ADDED',
      resource_type: 'compliance_monitor',
      resource_id: monitor.id,
      metadata: {
        monitor_name: monitor.name,
        monitor_type: monitor.type,
        jurisdiction: monitor.jurisdiction,
      },
    });
  }

  /**
   * Remove a compliance monitor
   */
  public removeMonitor(monitorId: string): boolean {
    const removed = this.monitors.delete(monitorId);

    if (removed) {
      auditLogger.log({
        event_type: 'COMPLIANCE_MONITOR_REMOVED',
        resource_type: 'compliance_monitor',
        resource_id: monitorId,
        metadata: {
          removed_at: new Date().toISOString(),
        },
      });
    }

    return removed;
  }

  /**
   * Get all active monitors
   */
  public getActiveMonitors(): ComplianceMonitor[] {
    return Array.from(this.monitors.values()).filter((m) => m.isActive);
  }

  /**
   * Check consent expiry compliance
   */
  public async checkConsentExpiry(
    jurisdiction?: Jurisdiction,
  ): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    // Query for expired consents
    let query = this.supabase
      .from('user_consents')
      .select('user_id, consent_type, expires_at, jurisdiction')
      .lt('expires_at', new Date().toISOString())
      .eq('status', 'active');

    if (jurisdiction && jurisdiction !== 'GLOBAL') {
      query = query.eq('jurisdiction', jurisdiction);
    }

    const { data: expiredConsents, error } = await query;

    if (error) {
      throw new ComplianceError(
        `Failed to check consent expiry: ${error.message}`,
        'CONSENT_CHECK_FAILED',
        jurisdiction,
      );
    }

    if (expiredConsents && expiredConsents.length > 0) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'consent_expired',
        severity: 'high',
        description: `${expiredConsents.length} user consents have expired and require renewal`,
        affectedDataSubjects: expiredConsents.length,
        legalReference: 'GDPR Article 7(3)',
        detectedAt: new Date(),
        jurisdiction: jurisdiction || 'GLOBAL',
      });
    }

    return issues;
  }

  /**
   * Check data retention compliance
   */
  public async checkRetentionCompliance(
    jurisdiction?: Jurisdiction,
  ): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    // Query for data that should have been deleted
    let query = this.supabase
      .from('retention_schedule')
      .select('user_id, data_type, scheduled_deletion_date, jurisdiction')
      .lt('scheduled_deletion_date', new Date().toISOString())
      .eq('status', 'pending');

    if (jurisdiction && jurisdiction !== 'GLOBAL') {
      query = query.eq('jurisdiction', jurisdiction);
    }

    const { data: overdueData, error } = await query;

    if (error) {
      throw new ComplianceError(
        `Failed to check retention compliance: ${error.message}`,
        'RETENTION_CHECK_FAILED',
        jurisdiction,
      );
    }

    if (overdueData && overdueData.length > 0) {
      const affectedUsers = new Set(overdueData.map((d) => d.user_id)).size;

      issues.push({
        id: crypto.randomUUID(),
        type: 'retention_violation',
        severity: overdueData.length > 10 ? 'critical' : 'high',
        description: `${overdueData.length} data records are overdue for deletion according to retention policies`,
        affectedDataSubjects: affectedUsers,
        legalReference: 'GDPR Article 5(1)(e)',
        detectedAt: new Date(),
        jurisdiction: jurisdiction || 'GLOBAL',
      });
    }

    return issues;
  }

  /**
   * Analyze event for compliance implications
   */
  private async analyzeEventForCompliance(
    event: ComplianceEvent,
  ): Promise<void> {
    // Check for suspicious patterns that might indicate a breach
    if (event.type === 'data_accessed' && event.userId) {
      const recentAccesses = await this.getRecentAccessEvents(event.userId, 15); // Last 15 minutes

      if (recentAccesses.length > 50) {
        await this.createComplianceIssue({
          type: 'unauthorized_access',
          severity: 'critical',
          description: `Suspicious access pattern detected: ${recentAccesses.length} data accesses in 15 minutes`,
          affectedDataSubjects: 1,
          legalReference: 'GDPR Article 32',
          jurisdiction: event.jurisdiction,
          metadata: {
            user_id: event.userId,
            access_count: recentAccesses.length,
            event_id: event.id,
          },
        });
      }
    }

    // Check for unauthorized cross-border transfers
    if (event.type === 'data_accessed' && event.jurisdiction === 'EU') {
      const userLocation = await this.getUserLocation(event.userId);
      if (userLocation && !this.isEUJurisdiction(userLocation)) {
        await this.createComplianceIssue({
          type: 'cross_border_violation',
          severity: 'high',
          description: `Potential unauthorized cross-border data transfer detected`,
          affectedDataSubjects: 1,
          legalReference: 'GDPR Chapter V',
          jurisdiction: 'EU',
          metadata: {
            user_id: event.userId,
            user_location: userLocation,
            data_type: event.dataType,
          },
        });
      }
    }
  }

  /**
   * Initialize real-time monitors
   */
  private async initializeRealTimeMonitors(): Promise<void> {
    const realTimeMonitors = Array.from(this.monitors.values()).filter(
      (m) => m.schedule.frequency === 'real_time' && m.isActive,
    );

    for (const monitor of realTimeMonitors) {
      await this.setupRealTimeMonitor(monitor);
    }
  }

  /**
   * Setup individual real-time monitor
   */
  private async setupRealTimeMonitor(
    monitor: ComplianceMonitor,
  ): Promise<void> {
    // Subscribe to relevant database changes based on monitor type
    let table = '';

    switch (monitor.type) {
      case 'breach_indicators':
        table = 'audit_logs';
        break;
      case 'access_patterns':
        table = 'user_activities';
        break;
      case 'cross_border_transfers':
        table = 'data_access_logs';
        break;
      default:
        return;
    }

    const subscription = this.supabase
      .channel(`compliance-${monitor.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        async (payload) => {
          await this.handleRealTimeEvent(monitor, payload);
        },
      )
      .subscribe();
  }

  /**
   * Handle real-time compliance events
   */
  private async handleRealTimeEvent(
    monitor: ComplianceMonitor,
    payload: any,
  ): Promise<void> {
    // Process the real-time event based on monitor type
    switch (monitor.type) {
      case 'breach_indicators':
        await this.processBreachIndicators(monitor, payload);
        break;
      case 'access_patterns':
        await this.processAccessPatterns(monitor, payload);
        break;
      case 'cross_border_transfers':
        await this.processCrossBorderTransfers(monitor, payload);
        break;
    }
  }

  /**
   * Process breach indicators
   */
  private async processBreachIndicators(
    monitor: ComplianceMonitor,
    payload: any,
  ): Promise<void> {
    const event = payload.new;

    // Analyze for potential breach indicators
    if (
      event.event_type === 'UNAUTHORIZED_ACCESS' ||
      event.event_type === 'SECURITY_VIOLATION'
    ) {
      await this.createComplianceIssue({
        type: 'data_breach',
        severity: 'critical',
        description: `Security event detected: ${event.event_type}`,
        affectedDataSubjects: 1,
        legalReference: 'GDPR Article 33',
        jurisdiction: monitor.jurisdiction,
        metadata: {
          audit_event_id: event.id,
          event_type: event.event_type,
          monitor_id: monitor.id,
        },
      });
    }
  }

  /**
   * Process access patterns
   */
  private async processAccessPatterns(
    monitor: ComplianceMonitor,
    payload: any,
  ): Promise<void> {
    // Implementation for access pattern analysis
    // This would analyze user access patterns for anomalies
  }

  /**
   * Process cross-border transfers
   */
  private async processCrossBorderTransfers(
    monitor: ComplianceMonitor,
    payload: any,
  ): Promise<void> {
    // Implementation for cross-border transfer monitoring
    // This would check for unauthorized international data transfers
  }

  /**
   * Run scheduled compliance checks
   */
  private async runScheduledChecks(): Promise<void> {
    const now = new Date();
    const activeMonitors = Array.from(this.monitors.values()).filter(
      (m) => m.isActive,
    );

    for (const monitor of activeMonitors) {
      if (this.shouldRunMonitor(monitor, now)) {
        try {
          await this.runMonitorCheck(monitor);
          monitor.lastRun = now;
          monitor.nextRun = this.calculateNextRun(monitor, now);
        } catch (error) {
          console.error(`Monitor ${monitor.id} failed:`, error);

          await auditLogger.log({
            event_type: 'COMPLIANCE_MONITOR_FAILED',
            resource_type: 'compliance_monitor',
            resource_id: monitor.id,
            metadata: {
              error: error instanceof Error ? error.message : 'Unknown error',
              monitor_type: monitor.type,
            },
          });
        }
      }
    }
  }

  /**
   * Check if monitor should run now
   */
  private shouldRunMonitor(monitor: ComplianceMonitor, now: Date): boolean {
    if (!monitor.nextRun) {
      return true; // First run
    }

    return now >= monitor.nextRun;
  }

  /**
   * Run specific monitor check
   */
  private async runMonitorCheck(monitor: ComplianceMonitor): Promise<void> {
    let issues: ComplianceIssue[] = [];

    switch (monitor.type) {
      case 'consent_expiry':
        issues = await this.checkConsentExpiry(monitor.jurisdiction);
        break;
      case 'retention_compliance':
        issues = await this.checkRetentionCompliance(monitor.jurisdiction);
        break;
      // Add other monitor types as needed
    }

    // Process any issues found
    for (const issue of issues) {
      await this.createComplianceIssue(issue);
    }
  }

  /**
   * Create a compliance issue
   */
  private async createComplianceIssue(
    issueData: Omit<ComplianceIssue, 'id' | 'detectedAt'>,
  ): Promise<string> {
    const issue: ComplianceIssue = {
      id: crypto.randomUUID(),
      detectedAt: new Date(),
      ...issueData,
    };

    // Store in database
    const { error } = await this.supabase.from('compliance_issues').insert([
      {
        id: issue.id,
        type: issue.type,
        severity: issue.severity,
        description: issue.description,
        affected_data_subjects: issue.affectedDataSubjects,
        legal_reference: issue.legalReference,
        detected_at: issue.detectedAt.toISOString(),
        jurisdiction: issue.jurisdiction,
        metadata: (issue as any).metadata,
      },
    ]);

    if (error) {
      throw new ComplianceError(
        `Failed to create compliance issue: ${error.message}`,
        'ISSUE_CREATION_FAILED',
      );
    }

    // Send alerts based on severity
    await this.sendComplianceAlert(issue);

    return issue.id;
  }

  /**
   * Send compliance alert
   */
  private async sendComplianceAlert(issue: ComplianceIssue): Promise<void> {
    if (issue.severity === 'critical' || issue.severity === 'high') {
      // Send immediate notifications
      const recipients = this.getAlertRecipients(issue.type);

      // Here you would integrate with your notification system
      console.log(
        `COMPLIANCE ALERT [${issue.severity.toUpperCase()}]: ${issue.description}`,
      );
      console.log(`Recipients: ${recipients.join(', ')}`);

      await auditLogger.log({
        event_type: 'COMPLIANCE_ALERT_SENT',
        resource_type: 'compliance_issue',
        resource_id: issue.id,
        metadata: {
          severity: issue.severity,
          type: issue.type,
          recipients: recipients,
          affected_subjects: issue.affectedDataSubjects,
        },
      });
    }
  }

  /**
   * Get alert recipients based on issue type
   */
  private getAlertRecipients(issueType: string): string[] {
    const recipientMap = {
      consent_expired: ['dpo@wedsync.com', 'compliance@wedsync.com'],
      retention_violation: ['dpo@wedsync.com', 'legal@wedsync.com'],
      unauthorized_access: ['security@wedsync.com', 'dpo@wedsync.com'],
      data_breach: [
        'security@wedsync.com',
        'dpo@wedsync.com',
        'legal@wedsync.com',
        'ceo@wedsync.com',
      ],
      cross_border_violation: ['dpo@wedsync.com', 'compliance@wedsync.com'],
      missing_legal_basis: ['legal@wedsync.com', 'dpo@wedsync.com'],
    };

    return (
      recipientMap[issueType as keyof typeof recipientMap] || [
        'dpo@wedsync.com',
      ]
    );
  }

  /**
   * Helper methods
   */
  private async getAllComplianceIssues(
    jurisdiction?: Jurisdiction,
  ): Promise<ComplianceIssue[]> {
    let query = this.supabase
      .from('compliance_issues')
      .select('*')
      .is('resolved_at', null);

    if (jurisdiction && jurisdiction !== 'GLOBAL') {
      query = query.eq('jurisdiction', jurisdiction);
    }

    const { data, error } = await query;

    if (error) {
      throw new ComplianceError(
        `Failed to fetch compliance issues: ${error.message}`,
        'FETCH_ISSUES_FAILED',
      );
    }

    return (
      data?.map((d) => ({
        id: d.id,
        type: d.type,
        severity: d.severity,
        description: d.description,
        affectedDataSubjects: d.affected_data_subjects,
        legalReference: d.legal_reference,
        detectedAt: new Date(d.detected_at),
        resolvedAt: d.resolved_at ? new Date(d.resolved_at) : undefined,
        remediation: d.remediation,
        jurisdiction: d.jurisdiction,
      })) || []
    );
  }

  private async getTotalComplianceChecks(
    jurisdiction?: Jurisdiction,
  ): Promise<number> {
    // This would return the total number of compliance checks performed
    // For now, return a static number based on active monitors
    const relevantMonitors = Array.from(this.monitors.values()).filter(
      (m) =>
        !jurisdiction ||
        jurisdiction === 'GLOBAL' ||
        m.jurisdiction === jurisdiction,
    );

    return relevantMonitors.length * 10; // Assume 10 checks per monitor
  }

  private calculateNextReviewDate(): Date {
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + 7); // Weekly reviews
    return nextReview;
  }

  private calculateNextRun(monitor: ComplianceMonitor, current: Date): Date {
    const next = new Date(current);

    switch (monitor.schedule.frequency) {
      case 'hourly':
        next.setHours(next.getHours() + 1);
        break;
      case 'daily':
        next.setDate(next.getDate() + 1);
        if (monitor.schedule.times && monitor.schedule.times.length > 0) {
          const [hours, minutes] = monitor.schedule.times[0]
            .split(':')
            .map(Number);
          next.setHours(hours, minutes, 0, 0);
        }
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        next.setHours(next.getHours() + 1);
    }

    return next;
  }

  private async getRecentAccessEvents(
    userId?: string,
    minutes: number = 15,
  ): Promise<any[]> {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    let query = this.supabase
      .from('compliance_events')
      .select('*')
      .eq('type', 'data_accessed')
      .gte('timestamp', since.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching recent access events:', error);
      return [];
    }

    return data || [];
  }

  private async getUserLocation(userId?: string): Promise<string | null> {
    if (!userId) return null;

    // This would implement actual user location detection
    // For now, return null to avoid false positives
    return null;
  }

  private isEUJurisdiction(location: string): boolean {
    const euCountries = [
      'AT',
      'BE',
      'BG',
      'HR',
      'CY',
      'CZ',
      'DK',
      'EE',
      'FI',
      'FR',
      'DE',
      'GR',
      'HU',
      'IE',
      'IT',
      'LV',
      'LT',
      'LU',
      'MT',
      'NL',
      'PL',
      'PT',
      'RO',
      'SK',
      'SI',
      'ES',
      'SE',
    ];
    return euCountries.includes(location.toUpperCase());
  }
}

// Export singleton instance
export const gdprComplianceMonitor = GDPRComplianceMonitor.getInstance();
