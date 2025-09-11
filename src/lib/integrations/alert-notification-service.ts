import {
  SecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
} from '@/lib/security/audit-logger';
import { AdminAuditEntry } from '@/lib/admin/auditLogger';

interface AlertConfig {
  slack?: {
    webhookUrl: string;
    channel?: string;
    username?: string;
    iconEmoji?: string;
  };
  pagerDuty?: {
    integrationKey: string;
    serviceKey?: string;
  };
  email?: {
    smtpServer: string;
    port: number;
    username: string;
    password: string;
    from: string;
    to: string[];
  };
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: 'security' | 'admin' | 'compliance' | 'system';
  timestamp: Date;
  metadata: Record<string, any>;
  tags: string[];
}

interface SlackMessage {
  channel?: string;
  username?: string;
  icon_emoji?: string;
  text: string;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
}

interface SlackAttachment {
  color: string;
  title: string;
  text: string;
  fields: Array<{
    title: string;
    value: string;
    short: boolean;
  }>;
  footer: string;
  ts: number;
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

interface PagerDutyEvent {
  routing_key: string;
  event_action: 'trigger' | 'acknowledge' | 'resolve';
  dedup_key?: string;
  payload: {
    summary: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    source: string;
    component?: string;
    group?: string;
    class?: string;
    custom_details?: Record<string, any>;
  };
  client?: string;
  client_url?: string;
  links?: Array<{
    href: string;
    text: string;
  }>;
  images?: Array<{
    src: string;
    href?: string;
    alt: string;
  }>;
}

export class AlertNotificationService {
  private config: AlertConfig;
  private alertThresholds: Map<
    string,
    { count: number; windowMs: number; lastReset: Date }
  > = new Map();
  private recentAlerts: Map<string, Date> = new Map();
  private readonly rateLimitWindowMs = 300000; // 5 minutes
  private readonly maxAlertsPerWindow = 10;

  constructor() {
    this.config = {
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        channel: process.env.SLACK_CHANNEL || '#security-alerts',
        username: process.env.SLACK_USERNAME || 'WedSync Security',
        iconEmoji: process.env.SLACK_ICON || ':warning:',
      },
      pagerDuty: {
        integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY || '',
        serviceKey: process.env.PAGERDUTY_SERVICE_KEY,
      },
      email: {
        smtpServer: process.env.SMTP_SERVER || '',
        port: parseInt(process.env.SMTP_PORT || '587'),
        username: process.env.SMTP_USERNAME || '',
        password: process.env.SMTP_PASSWORD || '',
        from: process.env.ALERT_EMAIL_FROM || 'security@wedsync.com',
        to: (process.env.ALERT_EMAIL_TO || '').split(',').filter(Boolean),
      },
    };

    // Initialize alert thresholds
    this.initializeAlertThresholds();
  }

  /**
   * Process security event and send alerts if needed
   */
  async processSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const shouldAlert = this.shouldTriggerAlert(event);
      if (!shouldAlert) return;

      const alert = this.createSecurityAlert(event);
      await this.sendAlert(alert);
    } catch (error) {
      console.error('Failed to process security event for alerting:', error);
    }
  }

  /**
   * Process admin audit event and send alerts if needed
   */
  async processAdminEvent(event: AdminAuditEntry): Promise<void> {
    try {
      const shouldAlert = this.shouldTriggerAdminAlert(event);
      if (!shouldAlert) return;

      const alert = this.createAdminAlert(event);
      await this.sendAlert(alert);
    } catch (error) {
      console.error('Failed to process admin event for alerting:', error);
    }
  }

  /**
   * Send custom alert
   */
  async sendCustomAlert(
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    description: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    try {
      const alert: Alert = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        severity,
        title,
        description,
        source: 'system',
        timestamp: new Date(),
        metadata,
        tags: ['custom', 'manual'],
      };

      await this.sendAlert(alert);
    } catch (error) {
      console.error('Failed to send custom alert:', error);
    }
  }

  /**
   * Send compliance violation alert
   */
  async sendComplianceAlert(
    violationType: string,
    description: string,
    affectedUsers?: number,
    severity: 'medium' | 'high' | 'critical' = 'high',
  ): Promise<void> {
    try {
      const alert: Alert = {
        id: `compliance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        severity,
        title: `Compliance Violation: ${violationType}`,
        description,
        source: 'compliance',
        timestamp: new Date(),
        metadata: {
          violation_type: violationType,
          affected_users: affectedUsers,
          requires_immediate_action: severity === 'critical',
        },
        tags: ['compliance', 'violation', violationType.toLowerCase()],
      };

      await this.sendAlert(alert);
    } catch (error) {
      console.error('Failed to send compliance alert:', error);
    }
  }

  /**
   * Send system health alert
   */
  async sendSystemHealthAlert(
    component: string,
    status: 'degraded' | 'down' | 'critical',
    details: string,
    metrics?: Record<string, number>,
  ): Promise<void> {
    try {
      const severity =
        status === 'critical'
          ? 'critical'
          : status === 'down'
            ? 'high'
            : 'medium';

      const alert: Alert = {
        id: `health-${component}-${Date.now()}`,
        severity,
        title: `System Health Alert: ${component} is ${status}`,
        description: details,
        source: 'system',
        timestamp: new Date(),
        metadata: {
          component,
          status,
          metrics: metrics || {},
        },
        tags: ['health', 'system', component, status],
      };

      await this.sendAlert(alert);
    } catch (error) {
      console.error('Failed to send system health alert:', error);
    }
  }

  /**
   * Core alert sending logic
   */
  private async sendAlert(alert: Alert): Promise<void> {
    // Apply rate limiting
    if (!this.checkRateLimit(alert)) {
      console.warn('Alert rate limit exceeded, skipping:', alert.id);
      return;
    }

    // Send to all configured channels
    const promises: Promise<void>[] = [];

    if (this.config.slack?.webhookUrl) {
      promises.push(this.sendSlackAlert(alert));
    }

    if (
      this.config.pagerDuty?.integrationKey &&
      this.shouldSendToPagerDuty(alert)
    ) {
      promises.push(this.sendPagerDutyAlert(alert));
    }

    if (this.config.email?.smtpServer && this.shouldSendEmailAlert(alert)) {
      promises.push(this.sendEmailAlert(alert));
    }

    // Wait for all notifications to complete
    const results = await Promise.allSettled(promises);

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Alert notification failed for channel ${index}:`,
          result.reason,
        );
      }
    });

    // Track alert for rate limiting
    this.recentAlerts.set(alert.id, alert.timestamp);
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    if (!this.config.slack?.webhookUrl) return;

    const color = this.getSlackColor(alert.severity);
    const emoji = this.getAlertEmoji(alert.severity);

    const message: SlackMessage = {
      channel: this.config.slack.channel,
      username: this.config.slack.username,
      icon_emoji: this.config.slack.iconEmoji,
      text: `${emoji} *${alert.title}*`,
      attachments: [
        {
          color,
          title: alert.title,
          text: alert.description,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Source',
              value: alert.source,
              short: true,
            },
            {
              title: 'Time',
              value: alert.timestamp.toISOString(),
              short: true,
            },
            {
              title: 'Alert ID',
              value: alert.id,
              short: true,
            },
          ],
          footer: 'WedSync Security Monitoring',
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    };

    // Add metadata fields if present
    if (Object.keys(alert.metadata).length > 0) {
      message.attachments![0].fields.push({
        title: 'Additional Details',
        value: Object.entries(alert.metadata)
          .map(([key, value]) => `*${key}:* ${value}`)
          .join('\n'),
        short: false,
      });
    }

    const response = await fetch(this.config.slack.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(
        `Slack webhook failed: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(alert: Alert): Promise<void> {
    if (!this.config.pagerDuty?.integrationKey) return;

    const event: PagerDutyEvent = {
      routing_key: this.config.pagerDuty.integrationKey,
      event_action: 'trigger',
      dedup_key: `wedsync-${alert.source}-${alert.id}`,
      payload: {
        summary: `${alert.title}: ${alert.description}`,
        severity: this.mapToPagerDutySeverity(alert.severity),
        source: 'WedSync',
        component: alert.source,
        group: 'security',
        class: alert.severity,
        custom_details: {
          alert_id: alert.id,
          timestamp: alert.timestamp.toISOString(),
          tags: alert.tags,
          ...alert.metadata,
        },
      },
      client: 'WedSync Security System',
      client_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/audit`,
    };

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PagerDuty API failed: ${response.status} ${errorText}`);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    if (!this.config.email?.smtpServer || this.config.email.to.length === 0)
      return;

    // This is a simplified email implementation
    // In production, you would use a proper email service like SendGrid, SES, or nodemailer

    const subject = `[WedSync Security] ${alert.severity.toUpperCase()}: ${alert.title}`;
    const body = this.generateEmailBody(alert);

    console.log(
      `Email alert would be sent to: ${this.config.email.to.join(', ')}`,
    );
    console.log(`Subject: ${subject}`);
    console.log(`Body preview: ${body.substring(0, 200)}...`);

    // Actual email sending implementation would go here
    // For now, we'll log it as a placeholder
  }

  /**
   * Helper methods
   */
  private shouldTriggerAlert(event: SecurityEvent): boolean {
    // High and critical severity events always trigger alerts
    if (
      event.severity === SecurityEventSeverity.CRITICAL ||
      event.severity === SecurityEventSeverity.HIGH
    ) {
      return true;
    }

    // Specific event types that should always alert
    const alwaysAlertEvents = [
      SecurityEventType.BRUTE_FORCE_DETECTED,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventType.ACCOUNT_LOCKED,
      SecurityEventType.DATA_BREACH,
      SecurityEventType.SQL_INJECTION_BLOCKED,
      SecurityEventType.XSS_ATTACK_BLOCKED,
    ];

    if (alwaysAlertEvents.includes(event.event_type)) {
      return true;
    }

    // Check for patterns (multiple events of same type)
    const threshold = this.alertThresholds.get(event.event_type);
    if (threshold) {
      return this.checkEventThreshold(event.event_type, threshold);
    }

    return false;
  }

  private shouldTriggerAdminAlert(event: AdminAuditEntry): boolean {
    // Failed or error status admin actions
    if (event.status === 'failed' || event.status === 'error') {
      return true;
    }

    // High-risk admin actions
    const highRiskActions = [
      'user_delete',
      'admin_role_change',
      'system_configuration_change',
      'security_settings_change',
      'audit_log_cleanup',
      'data_export',
      'bulk_operation',
    ];

    return highRiskActions.includes(event.action);
  }

  private shouldSendToPagerDuty(alert: Alert): boolean {
    // Only send high and critical alerts to PagerDuty
    return alert.severity === 'high' || alert.severity === 'critical';
  }

  private shouldSendEmailAlert(alert: Alert): boolean {
    // Send email for medium, high, and critical alerts
    return ['medium', 'high', 'critical'].includes(alert.severity);
  }

  private checkRateLimit(alert: Alert): boolean {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.rateLimitWindowMs);

    // Count recent alerts
    const recentCount = Array.from(this.recentAlerts.values()).filter(
      (timestamp) => timestamp > windowStart,
    ).length;

    return recentCount < this.maxAlertsPerWindow;
  }

  private checkEventThreshold(
    eventType: string,
    threshold: { count: number; windowMs: number; lastReset: Date },
  ): boolean {
    const now = new Date();

    // Reset counter if window expired
    if (now.getTime() - threshold.lastReset.getTime() > threshold.windowMs) {
      threshold.count = 0;
      threshold.lastReset = now;
    }

    threshold.count++;
    return threshold.count >= 3; // Alert after 3 occurrences
  }

  private createSecurityAlert(event: SecurityEvent): Alert {
    return {
      id: `security-${event.id || Date.now()}`,
      severity: this.mapSecuritySeverity(event.severity),
      title: `Security Event: ${event.event_type}`,
      description: event.description,
      source: 'security',
      timestamp: event.created_at || new Date(),
      metadata: {
        event_type: event.event_type,
        user_id: event.user_id,
        ip_address: event.ip_address,
        resource_type: event.resource_type,
        resource_id: event.resource_id,
        ...event.metadata,
      },
      tags: ['security', event.event_type, event.severity],
    };
  }

  private createAdminAlert(event: AdminAuditEntry): Alert {
    const severity = event.status === 'success' ? 'medium' : 'high';

    return {
      id: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity,
      title: `Admin Action: ${event.action}`,
      description: `Admin ${event.adminEmail} performed ${event.action} with status: ${event.status}`,
      source: 'admin',
      timestamp: new Date(event.timestamp),
      metadata: {
        admin_id: event.adminId,
        admin_email: event.adminEmail,
        action: event.action,
        status: event.status,
        client_ip: event.clientIP,
        requires_mfa: event.requiresMFA,
        details: event.details,
      },
      tags: ['admin', event.action, event.status],
    };
  }

  private mapSecuritySeverity(
    severity: SecurityEventSeverity,
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity) {
      case SecurityEventSeverity.CRITICAL:
        return 'critical';
      case SecurityEventSeverity.HIGH:
        return 'high';
      case SecurityEventSeverity.MEDIUM:
        return 'medium';
      case SecurityEventSeverity.LOW:
        return 'low';
      default:
        return 'medium';
    }
  }

  private mapToPagerDutySeverity(
    severity: string,
  ): 'info' | 'warning' | 'error' | 'critical' {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'warning';
    }
  }

  private getSlackColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'high':
        return 'danger';
      case 'medium':
        return 'warning';
      case 'low':
        return 'good';
      default:
        return 'warning';
    }
  }

  private getAlertEmoji(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '⚠️';
    }
  }

  private generateEmailBody(alert: Alert): string {
    return `
Security Alert: ${alert.title}

Severity: ${alert.severity.toUpperCase()}
Time: ${alert.timestamp.toISOString()}
Source: ${alert.source}
Alert ID: ${alert.id}

Description:
${alert.description}

Additional Details:
${Object.entries(alert.metadata)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}

Tags: ${alert.tags.join(', ')}

---
This alert was generated by the WedSync Security Monitoring System.
Please review and take appropriate action if necessary.

Dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/admin/audit
`;
  }

  private initializeAlertThresholds(): void {
    const now = new Date();

    // Define thresholds for different event types
    const thresholdConfigs = [
      { eventType: SecurityEventType.LOGIN_FAILED, count: 5, windowMs: 300000 }, // 5 failures in 5 minutes
      { eventType: SecurityEventType.MFA_FAILED, count: 3, windowMs: 600000 }, // 3 failures in 10 minutes
      {
        eventType: SecurityEventType.PERMISSION_DENIED,
        count: 10,
        windowMs: 300000,
      }, // 10 denials in 5 minutes
    ];

    thresholdConfigs.forEach((config) => {
      this.alertThresholds.set(config.eventType, {
        count: 0,
        windowMs: config.windowMs,
        lastReset: now,
      });
    });
  }

  /**
   * Health check for notification services
   */
  async healthCheck(): Promise<{
    slack: boolean;
    pagerDuty: boolean;
    email: boolean;
  }> {
    const health = {
      slack: false,
      pagerDuty: false,
      email: false,
    };

    // Test Slack webhook
    if (this.config.slack?.webhookUrl) {
      try {
        // Send a minimal test message to validate webhook
        const testMessage = {
          text: 'WedSync Alert Service Health Check',
          username: 'Health Check Bot',
        };

        const response = await fetch(this.config.slack.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testMessage),
        });

        health.slack = response.ok;
      } catch (error) {
        console.error('Slack health check failed:', error);
      }
    }

    // Test PagerDuty integration
    if (this.config.pagerDuty?.integrationKey) {
      health.pagerDuty = true; // PagerDuty is configured
    }

    // Test email configuration
    if (this.config.email?.smtpServer) {
      health.email = true; // Email is configured
    }

    return health;
  }
}

// Export singleton instance
export const alertNotificationService = new AlertNotificationService();
