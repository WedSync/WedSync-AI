/**
 * WS-177 Audit Logging System - Security Alert System
 * Team D - Round 1: Real-time security event monitoring
 *
 * Monitors audit logs for security threats in wedding operations:
 * - Real-time pattern detection for suspicious activities
 * - Wedding-specific security scenarios (guest data breaches, supplier impersonation)
 * - Automated alert generation and notification system
 * - Integration with Supabase realtime for immediate response
 */

import {
  createClient,
  SupabaseClient,
  RealtimeChannel,
} from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import {
  AuditEvent,
  SecurityAlert,
  SecurityAlertType,
  AuditSeverity,
  AuditEventType,
  AuditAction,
  SupplierRole,
  AuditEventFilters,
} from '../../../types/audit-performance';

/**
 * Security alert rule definition
 */
export interface SecurityAlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  alertType: SecurityAlertType;
  severity: AuditSeverity;

  // Pattern matching conditions
  eventTypes: AuditEventType[];
  actions: AuditAction[];
  timeWindowMinutes: number;
  thresholdCount: number;

  // Wedding-specific conditions
  weddingDataConditions?: {
    protectGuestData: boolean;
    protectPaymentInfo: boolean;
    protectVendorInfo: boolean;
    protectPhotoMetadata: boolean;
  };

  // Advanced pattern matching
  sqlCondition?: string;
  metadataPatterns?: { [key: string]: any };
  ipWhitelist?: string[];
  userAgentBlacklist?: string[];

  // Response configuration
  notifyImmediately: boolean;
  escalateAfterMinutes?: number;
  autoBlock: boolean;
  requireAcknowledgment: boolean;
}

/**
 * Alert notification configuration
 */
export interface AlertNotificationConfig {
  channels: NotificationChannel[];
  webhookUrls: string[];
  emailRecipients: string[];
  slackWebhookUrl?: string;
  teamsWebhookUrl?: string;

  // Wedding-specific notifications
  weddingCoordinatorEmails: string[];
  supplierNotificationEnabled: boolean;
  clientNotificationThreshold: AuditSeverity;
}

export enum NotificationChannel {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  TEAMS = 'teams',
  DATABASE = 'database',
  REALTIME = 'realtime',
}

/**
 * Real-time security monitoring system
 */
export class SecurityAlertSystem extends EventEmitter {
  private supabase: SupabaseClient;
  private realtimeChannel: RealtimeChannel | null = null;
  private alertRules: Map<string, SecurityAlertRule> = new Map();
  private activeAlerts: Map<string, SecurityAlert> = new Map();
  private eventBuffer: AuditEvent[] = [];
  private notificationConfig: AlertNotificationConfig;

  // Pattern detection state
  private suspiciousPatterns: Map<
    string,
    { count: number; firstSeen: Date; lastSeen: Date }
  > = new Map();
  private blockedIPs: Set<string> = new Set();
  private blockedUsers: Set<string> = new Set();

  constructor(notificationConfig: AlertNotificationConfig) {
    super();
    this.notificationConfig = notificationConfig;
    this.initializeConnection();
    this.loadDefaultSecurityRules();
  }

  private initializeConnection(): void {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Start real-time security monitoring
   * Subscribes to audit events and processes them for security patterns
   */
  async startMonitoring(): Promise<void> {
    console.log('[SecurityAlerts] Starting real-time security monitoring...');

    try {
      // Subscribe to audit events for real-time processing
      this.realtimeChannel = this.supabase
        .channel('security-monitoring')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'audit_events',
          },
          (payload) => {
            this.processAuditEvent(payload.new as AuditEvent);
          },
        )
        .subscribe();

      // Load existing alerts from database
      await this.loadActiveAlerts();

      console.log('[SecurityAlerts] Real-time monitoring started successfully');
    } catch (error) {
      console.error('[SecurityAlerts] Failed to start monitoring:', error);
      throw error;
    }
  }

  /**
   * Process incoming audit event for security patterns
   */
  private async processAuditEvent(event: AuditEvent): Promise<void> {
    // Add to buffer for batch analysis
    this.eventBuffer.push(event);

    // Process immediately for high-severity events
    if (
      event.severity === AuditSeverity.HIGH ||
      event.severity === AuditSeverity.CRITICAL
    ) {
      await this.analyzeEventImmediately(event);
    }

    // Check against all enabled alert rules
    for (const rule of Array.from(this.alertRules.values())) {
      if (rule.enabled && this.matchesRule(event, rule)) {
        await this.processAlertRule(event, rule);
      }
    }

    // Periodic batch analysis
    if (this.eventBuffer.length >= 100) {
      await this.analyzeBatchPatterns();
      this.eventBuffer = [];
    }
  }

  /**
   * Analyze single event for immediate security concerns
   */
  private async analyzeEventImmediately(event: AuditEvent): Promise<void> {
    const alerts: SecurityAlert[] = [];

    // Check for wedding-specific security concerns
    if (this.isGuestDataExposure(event)) {
      alerts.push(
        await this.createSecurityAlert(
          SecurityAlertType.GUEST_DATA_EXPOSURE,
          AuditSeverity.CRITICAL,
          'Potential guest data exposure detected',
          [event.id],
          event,
        ),
      );
    }

    if (this.isSupplierImpersonation(event)) {
      alerts.push(
        await this.createSecurityAlert(
          SecurityAlertType.SUPPLIER_IMPERSONATION,
          AuditSeverity.HIGH,
          'Potential supplier impersonation attempt',
          [event.id],
          event,
        ),
      );
    }

    if (this.isUnauthorizedWeddingAccess(event)) {
      alerts.push(
        await this.createSecurityAlert(
          SecurityAlertType.UNAUTHORIZED_API_ACCESS,
          AuditSeverity.HIGH,
          'Unauthorized access to wedding data',
          [event.id],
          event,
        ),
      );
    }

    // Process alerts
    for (const alert of alerts) {
      await this.handleSecurityAlert(alert);
    }
  }

  /**
   * Analyze batch of events for complex patterns
   */
  private async analyzeBatchPatterns(): Promise<void> {
    const alerts: SecurityAlert[] = [];

    // Analyze for bulk data access patterns
    const bulkAccessEvents = this.eventBuffer.filter(
      (event) =>
        event.action === AuditAction.READ &&
        event.metadata.guestsAffected &&
        event.metadata.guestsAffected > 10,
    );

    if (bulkAccessEvents.length > 3) {
      alerts.push(
        await this.createSecurityAlert(
          SecurityAlertType.BULK_DATA_EXPORT,
          AuditSeverity.HIGH,
          `Bulk data access pattern detected: ${bulkAccessEvents.length} operations`,
          bulkAccessEvents.map((e) => e.id),
          bulkAccessEvents[0],
        ),
      );
    }

    // Analyze for multiple failed login attempts
    const failedLogins = this.eventBuffer.filter(
      (event) =>
        event.eventType === AuditEventType.AUTHENTICATION &&
        event.action === AuditAction.LOGIN &&
        event.severity === AuditSeverity.HIGH, // Failed login
    );

    const failedLoginsByIP = this.groupByIP(failedLogins);
    for (const [ip, events] of Array.from(failedLoginsByIP.entries())) {
      if (events.length >= 5) {
        alerts.push(
          await this.createSecurityAlert(
            SecurityAlertType.MULTIPLE_FAILED_ATTEMPTS,
            AuditSeverity.MEDIUM,
            `Multiple failed login attempts from IP: ${ip}`,
            events.map((e) => e.id),
            events[0],
          ),
        );
      }
    }

    // Process detected alerts
    for (const alert of alerts) {
      await this.handleSecurityAlert(alert);
    }
  }

  /**
   * Check if event matches security rule
   */
  private matchesRule(event: AuditEvent, rule: SecurityAlertRule): boolean {
    // Check basic conditions
    if (!rule.eventTypes.includes(event.eventType)) return false;
    if (!rule.actions.includes(event.action)) return false;

    // Check wedding-specific conditions
    if (rule.weddingDataConditions) {
      if (
        rule.weddingDataConditions.protectGuestData &&
        !this.involvesGuestData(event)
      )
        return false;
      if (
        rule.weddingDataConditions.protectPaymentInfo &&
        !this.involvesPaymentData(event)
      )
        return false;
      if (
        rule.weddingDataConditions.protectVendorInfo &&
        !this.involvesVendorData(event)
      )
        return false;
    }

    // Check IP whitelist
    if (
      rule.ipWhitelist &&
      event.ipAddress &&
      !rule.ipWhitelist.includes(event.ipAddress)
    )
      return false;

    // Check user agent blacklist
    if (rule.userAgentBlacklist && event.userAgent) {
      const isBlocked = rule.userAgentBlacklist.some((blocked) =>
        event.userAgent?.toLowerCase().includes(blocked.toLowerCase()),
      );
      if (isBlocked) return true;
    }

    // Check metadata patterns
    if (rule.metadataPatterns) {
      for (const [key, expectedValue] of Object.entries(
        rule.metadataPatterns,
      )) {
        const actualValue = event.metadata[key];
        if (actualValue !== expectedValue) return false;
      }
    }

    return true;
  }

  /**
   * Process alert rule and check thresholds
   */
  private async processAlertRule(
    event: AuditEvent,
    rule: SecurityAlertRule,
  ): Promise<void> {
    const patternKey = `${rule.id}-${event.organizationId}-${event.ipAddress || 'unknown'}`;
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - rule.timeWindowMinutes * 60 * 1000,
    );

    // Update pattern tracking
    const existing = this.suspiciousPatterns.get(patternKey);
    if (existing) {
      if (existing.lastSeen > windowStart) {
        existing.count++;
        existing.lastSeen = now;
      } else {
        // Reset counter if outside time window
        existing.count = 1;
        existing.firstSeen = now;
        existing.lastSeen = now;
      }
    } else {
      this.suspiciousPatterns.set(patternKey, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
      });
    }

    const pattern = this.suspiciousPatterns.get(patternKey)!;

    // Check if threshold is met
    if (pattern.count >= rule.thresholdCount) {
      const alert = await this.createSecurityAlert(
        rule.alertType,
        rule.severity,
        `${rule.name}: Pattern detected ${pattern.count} times`,
        [event.id],
        event,
      );

      await this.handleSecurityAlert(alert);

      // Auto-block if configured
      if (rule.autoBlock) {
        await this.autoBlockThreat(event, rule);
      }

      // Reset pattern counter after alert
      this.suspiciousPatterns.delete(patternKey);
    }
  }

  /**
   * Create security alert record
   */
  private async createSecurityAlert(
    alertType: SecurityAlertType,
    severity: AuditSeverity,
    description: string,
    eventIds: string[],
    triggerEvent: AuditEvent,
  ): Promise<SecurityAlert> {
    const alert: SecurityAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      alertType,
      severity,
      description,
      triggeredBy: eventIds,
      eventIds,
      pattern: `${alertType}-${triggerEvent.organizationId}`,
      userId: triggerEvent.userId,
      organizationId: triggerEvent.organizationId,
      weddingId: triggerEvent.weddingId,
      ipAddress: triggerEvent.ipAddress,
      acknowledged: false,
      resolved: false,
      weddingDate: triggerEvent.weddingDate,
      supplierRole: triggerEvent.supplierRole,
      guestDataExposed: this.involvesGuestData(triggerEvent),
    };

    // Store alert in database
    const { error } = await this.supabase.from('security_alerts').insert([
      {
        id: alert.id,
        timestamp: alert.timestamp,
        alert_type: alert.alertType,
        severity: alert.severity,
        description: alert.description,
        triggered_by: alert.triggeredBy,
        event_ids: alert.eventIds,
        pattern: alert.pattern,
        user_id: alert.userId,
        organization_id: alert.organizationId,
        wedding_id: alert.weddingId,
        ip_address: alert.ipAddress,
        acknowledged: alert.acknowledged,
        resolved: alert.resolved,
        wedding_date: alert.weddingDate,
        supplier_role: alert.supplierRole,
        guest_data_exposed: alert.guestDataExposed,
      },
    ]);

    if (error) {
      console.error('[SecurityAlerts] Failed to store alert:', error);
    }

    this.activeAlerts.set(alert.id, alert);
    return alert;
  }

  /**
   * Handle security alert with appropriate response
   */
  private async handleSecurityAlert(alert: SecurityAlert): Promise<void> {
    console.log(
      `[SecurityAlerts] Handling ${alert.severity} alert: ${alert.alertType}`,
    );

    // Emit event for real-time listeners
    this.emit('securityAlert', alert);

    // Send notifications based on severity and configuration
    await this.sendNotifications(alert);

    // Handle critical alerts with immediate response
    if (alert.severity === AuditSeverity.CRITICAL) {
      await this.handleCriticalAlert(alert);
    }

    // Log alert processing
    console.log(`[SecurityAlerts] Alert ${alert.id} processed successfully`);
  }

  /**
   * Send notifications for security alert
   */
  private async sendNotifications(alert: SecurityAlert): Promise<void> {
    const notifications = [];

    // Database notification (always enabled)
    if (
      this.notificationConfig.channels.includes(NotificationChannel.DATABASE)
    ) {
      notifications.push(this.storeNotification(alert));
    }

    // Real-time notification via Supabase
    if (
      this.notificationConfig.channels.includes(NotificationChannel.REALTIME)
    ) {
      notifications.push(this.sendRealtimeNotification(alert));
    }

    // Email notifications
    if (this.notificationConfig.channels.includes(NotificationChannel.EMAIL)) {
      notifications.push(this.sendEmailNotification(alert));
    }

    // Webhook notifications
    if (
      this.notificationConfig.channels.includes(NotificationChannel.WEBHOOK)
    ) {
      for (const webhookUrl of this.notificationConfig.webhookUrls) {
        notifications.push(this.sendWebhookNotification(alert, webhookUrl));
      }
    }

    // Slack notifications
    if (
      this.notificationConfig.channels.includes(NotificationChannel.SLACK) &&
      this.notificationConfig.slackWebhookUrl
    ) {
      notifications.push(this.sendSlackNotification(alert));
    }

    // Wait for all notifications to complete
    await Promise.allSettled(notifications);
  }

  /**
   * Handle critical security alerts with immediate response
   */
  private async handleCriticalAlert(alert: SecurityAlert): Promise<void> {
    // Block IP if guest data is exposed
    if (alert.guestDataExposed && alert.ipAddress) {
      this.blockedIPs.add(alert.ipAddress);
      console.log(
        `[SecurityAlerts] Blocked IP ${alert.ipAddress} due to critical alert`,
      );
    }

    // Block user if supplier impersonation detected
    if (
      alert.alertType === SecurityAlertType.SUPPLIER_IMPERSONATION &&
      alert.userId
    ) {
      this.blockedUsers.add(alert.userId);
      console.log(
        `[SecurityAlerts] Blocked user ${alert.userId} due to impersonation`,
      );
    }

    // Notify wedding coordinators immediately for guest data issues
    if (
      alert.guestDataExposed &&
      this.notificationConfig.weddingCoordinatorEmails.length > 0
    ) {
      await this.sendWeddingCoordinatorAlert(alert);
    }
  }

  /**
   * Auto-block threat based on rule configuration
   */
  private async autoBlockThreat(
    event: AuditEvent,
    rule: SecurityAlertRule,
  ): Promise<void> {
    if (event.ipAddress) {
      this.blockedIPs.add(event.ipAddress);
      console.log(
        `[SecurityAlerts] Auto-blocked IP ${event.ipAddress} based on rule ${rule.name}`,
      );
    }

    if (
      event.userId &&
      rule.alertType === SecurityAlertType.PRIVILEGE_ESCALATION
    ) {
      this.blockedUsers.add(event.userId);
      console.log(
        `[SecurityAlerts] Auto-blocked user ${event.userId} based on rule ${rule.name}`,
      );
    }
  }

  /**
   * Load default security rules for wedding operations
   */
  private loadDefaultSecurityRules(): void {
    const defaultRules: SecurityAlertRule[] = [
      {
        id: 'failed-login-attempts',
        name: 'Multiple Failed Login Attempts',
        description: 'Detect multiple failed login attempts from same IP',
        enabled: true,
        alertType: SecurityAlertType.MULTIPLE_FAILED_ATTEMPTS,
        severity: AuditSeverity.MEDIUM,
        eventTypes: [AuditEventType.AUTHENTICATION],
        actions: [AuditAction.LOGIN],
        timeWindowMinutes: 10,
        thresholdCount: 5,
        notifyImmediately: true,
        autoBlock: true,
        requireAcknowledgment: false,
      },
      {
        id: 'guest-data-exposure',
        name: 'Guest Data Exposure',
        description: 'Detect unauthorized access to guest information',
        enabled: true,
        alertType: SecurityAlertType.GUEST_DATA_EXPOSURE,
        severity: AuditSeverity.CRITICAL,
        eventTypes: [AuditEventType.DATA_CHANGE, AuditEventType.API_CALL],
        actions: [AuditAction.READ, AuditAction.EXPORT],
        timeWindowMinutes: 5,
        thresholdCount: 1,
        weddingDataConditions: {
          protectGuestData: true,
          protectPaymentInfo: false,
          protectVendorInfo: false,
          protectPhotoMetadata: false,
        },
        notifyImmediately: true,
        autoBlock: true,
        requireAcknowledgment: true,
      },
      {
        id: 'bulk-data-export',
        name: 'Bulk Data Export',
        description: 'Detect large-scale data export operations',
        enabled: true,
        alertType: SecurityAlertType.BULK_DATA_EXPORT,
        severity: AuditSeverity.HIGH,
        eventTypes: [AuditEventType.USER_ACTION, AuditEventType.API_CALL],
        actions: [AuditAction.EXPORT],
        timeWindowMinutes: 15,
        thresholdCount: 3,
        notifyImmediately: true,
        autoBlock: false,
        requireAcknowledgment: true,
      },
      {
        id: 'supplier-impersonation',
        name: 'Supplier Impersonation',
        description: 'Detect attempts to impersonate wedding suppliers',
        enabled: true,
        alertType: SecurityAlertType.SUPPLIER_IMPERSONATION,
        severity: AuditSeverity.HIGH,
        eventTypes: [AuditEventType.AUTHORIZATION, AuditEventType.USER_ACTION],
        actions: [AuditAction.UPDATE, AuditAction.CREATE],
        timeWindowMinutes: 30,
        thresholdCount: 2,
        weddingDataConditions: {
          protectGuestData: false,
          protectPaymentInfo: true,
          protectVendorInfo: true,
          protectPhotoMetadata: false,
        },
        notifyImmediately: true,
        autoBlock: true,
        requireAcknowledgment: true,
      },
    ];

    for (const rule of defaultRules) {
      this.alertRules.set(rule.id, rule);
    }

    console.log(
      `[SecurityAlerts] Loaded ${defaultRules.length} default security rules`,
    );
  }

  // Helper methods for security pattern detection
  private isGuestDataExposure(event: AuditEvent): boolean {
    return (
      event.resource.includes('guest') ||
      event.resource.includes('attendee') ||
      (event.metadata.guestsAffected && event.metadata.guestsAffected > 0)
    );
  }

  private isSupplierImpersonation(event: AuditEvent): boolean {
    return (
      event.supplierRole !== undefined &&
      event.eventType === AuditEventType.AUTHORIZATION &&
      event.severity === AuditSeverity.HIGH
    );
  }

  private isUnauthorizedWeddingAccess(event: AuditEvent): boolean {
    return (
      event.weddingId !== undefined &&
      event.eventType === AuditEventType.AUTHORIZATION &&
      event.action === AuditAction.READ &&
      event.severity === AuditSeverity.HIGH
    );
  }

  private involvesGuestData(event: AuditEvent): boolean {
    return this.isGuestDataExposure(event);
  }

  private involvesPaymentData(event: AuditEvent): boolean {
    return (
      event.resource.includes('payment') ||
      event.resource.includes('billing') ||
      event.resource.includes('invoice')
    );
  }

  private involvesVendorData(event: AuditEvent): boolean {
    return (
      event.resource.includes('supplier') ||
      event.resource.includes('vendor') ||
      event.supplierRole !== undefined
    );
  }

  private groupByIP(events: AuditEvent[]): Map<string, AuditEvent[]> {
    const groups = new Map<string, AuditEvent[]>();
    for (const event of events) {
      const ip = event.ipAddress || 'unknown';
      if (!groups.has(ip)) {
        groups.set(ip, []);
      }
      groups.get(ip)!.push(event);
    }
    return groups;
  }

  // Notification methods (simplified implementations)
  private async storeNotification(alert: SecurityAlert): Promise<void> {
    // Store notification in database for admin dashboard
    const { error } = await this.supabase
      .from('security_notifications')
      .insert([
        {
          alert_id: alert.id,
          message: `Security Alert: ${alert.description}`,
          severity: alert.severity,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('[SecurityAlerts] Failed to store notification:', error);
    }
  }

  private async sendRealtimeNotification(alert: SecurityAlert): Promise<void> {
    // Send via Supabase realtime to connected clients
    await this.supabase.channel('security-alerts').send({
      type: 'broadcast',
      event: 'security_alert',
      payload: alert,
    });
  }

  private async sendEmailNotification(alert: SecurityAlert): Promise<void> {
    // Email notification implementation would go here
    console.log(
      `[SecurityAlerts] Email notification sent for alert ${alert.id}`,
    );
  }

  private async sendWebhookNotification(
    alert: SecurityAlert,
    webhookUrl: string,
  ): Promise<void> {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert_id: alert.id,
          alert_type: alert.alertType,
          severity: alert.severity,
          description: alert.description,
          timestamp: alert.timestamp,
          organization_id: alert.organizationId,
          wedding_id: alert.weddingId,
        }),
      });
    } catch (error) {
      console.error('[SecurityAlerts] Webhook notification failed:', error);
    }
  }

  private async sendSlackNotification(alert: SecurityAlert): Promise<void> {
    // Slack notification implementation would go here
    console.log(
      `[SecurityAlerts] Slack notification sent for alert ${alert.id}`,
    );
  }

  private async sendWeddingCoordinatorAlert(
    alert: SecurityAlert,
  ): Promise<void> {
    // Special notification for wedding coordinators on critical guest data issues
    console.log(
      `[SecurityAlerts] Wedding coordinator alert sent for ${alert.id}`,
    );
  }

  private async loadActiveAlerts(): Promise<void> {
    const { data, error } = await this.supabase
      .from('security_alerts')
      .select('*')
      .eq('resolved', false);

    if (error) {
      console.error('[SecurityAlerts] Failed to load active alerts:', error);
      return;
    }

    for (const row of data || []) {
      const alert: SecurityAlert = {
        id: row.id,
        timestamp: row.timestamp,
        alertType: row.alert_type,
        severity: row.severity,
        description: row.description,
        triggeredBy: row.triggered_by,
        eventIds: row.event_ids,
        pattern: row.pattern,
        userId: row.user_id,
        organizationId: row.organization_id,
        weddingId: row.wedding_id,
        ipAddress: row.ip_address,
        acknowledged: row.acknowledged,
        acknowledgedBy: row.acknowledged_by,
        acknowledgedAt: row.acknowledged_at,
        resolved: row.resolved,
        resolvedBy: row.resolved_by,
        resolvedAt: row.resolved_at,
        weddingDate: row.wedding_date,
        supplierRole: row.supplier_role,
        guestDataExposed: row.guest_data_exposed,
      };

      this.activeAlerts.set(alert.id, alert);
    }

    console.log(
      `[SecurityAlerts] Loaded ${this.activeAlerts.size} active alerts`,
    );
  }

  /**
   * Public API methods
   */

  async getActiveAlerts(): Promise<SecurityAlert[]> {
    return Array.from(this.activeAlerts.values());
  }

  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date().toISOString();

      await this.supabase
        .from('security_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: acknowledgedBy,
          acknowledged_at: alert.acknowledgedAt,
        })
        .eq('id', alertId);
    }
  }

  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedBy = resolvedBy;
      alert.resolvedAt = new Date().toISOString();

      await this.supabase
        .from('security_alerts')
        .update({
          resolved: true,
          resolved_by: resolvedBy,
          resolved_at: alert.resolvedAt,
        })
        .eq('id', alertId);

      this.activeAlerts.delete(alertId);
    }
  }

  isBlocked(ipAddress?: string, userId?: string): boolean {
    if (ipAddress && this.blockedIPs.has(ipAddress)) return true;
    if (userId && this.blockedUsers.has(userId)) return true;
    return false;
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.realtimeChannel) {
      await this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    this.alertRules.clear();
    this.activeAlerts.clear();
    this.suspiciousPatterns.clear();
    this.removeAllListeners();
  }
}

/**
 * Factory function for creating security alert system
 */
export function createSecurityAlertSystem(
  config: Partial<AlertNotificationConfig> = {},
): SecurityAlertSystem {
  const defaultConfig: AlertNotificationConfig = {
    channels: [NotificationChannel.DATABASE, NotificationChannel.REALTIME],
    webhookUrls: [],
    emailRecipients: [],
    weddingCoordinatorEmails: [],
    supplierNotificationEnabled: true,
    clientNotificationThreshold: AuditSeverity.HIGH,
  };

  const finalConfig = { ...defaultConfig, ...config };
  return new SecurityAlertSystem(finalConfig);
}

/**
 * Singleton instance for application use
 */
export const securityAlertSystem = createSecurityAlertSystem();
