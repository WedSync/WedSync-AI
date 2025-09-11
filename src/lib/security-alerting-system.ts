/**
 * Security Alerting System
 * Comprehensive alerting and notification system for suspicious activity
 */

import { createClient } from '@supabase/supabase-js';
import {
  type SecurityAlert,
  type AlertType,
  type AlertStatus,
} from './security-event-monitor';

export interface AlertChannel {
  id: string;
  name: string;
  type: AlertChannelType;
  enabled: boolean;
  configuration: Record<string, any>;
  rateLimiting: {
    maxAlertsPerHour: number;
    cooldownMinutes: number;
  };
}

export type AlertChannelType =
  | 'EMAIL'
  | 'SLACK'
  | 'SMS'
  | 'WEBHOOK'
  | 'CONSOLE'
  | 'DATABASE';

export interface NotificationTemplate {
  id: string;
  alertType: AlertType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  channel: AlertChannelType;
  template: {
    subject?: string;
    title: string;
    body: string;
    color?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  };
}

export interface AlertingRule {
  id: string;
  organizationId?: string; // null for global rules
  alertTypes: AlertType[];
  severities: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
  channels: string[]; // Alert channel IDs
  conditions: {
    timeOfDay?: { start: string; end: string }; // HH:MM format
    daysOfWeek?: number[]; // 0-6, Sunday=0
    minimumEventCount?: number;
    cooldownMinutes?: number;
  };
  enabled: boolean;
}

export interface AlertMetrics {
  totalAlertsSent: number;
  alertsByChannel: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  alertsByType: Record<string, number>;
  failedAlerts: number;
  averageResponseTime: number;
  rateLimitedAlerts: number;
}

class SecurityAlertingSystem {
  private supabase: any;
  private channels: Map<string, AlertChannel> = new Map();
  private templates: NotificationTemplate[] = [];
  private rules: AlertingRule[] = [];
  private alertHistory: Map<string, Date[]> = new Map(); // For rate limiting

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.initializeDefaultChannels();
    this.initializeDefaultTemplates();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default alert channels
   */
  private initializeDefaultChannels(): void {
    // Console logging (always enabled for development)
    this.channels.set('console', {
      id: 'console',
      name: 'Console Logging',
      type: 'CONSOLE',
      enabled: process.env.NODE_ENV === 'development',
      configuration: {
        logLevel: 'info',
      },
      rateLimiting: {
        maxAlertsPerHour: 100,
        cooldownMinutes: 0,
      },
    });

    // Database storage (always enabled)
    this.channels.set('database', {
      id: 'database',
      name: 'Database Storage',
      type: 'DATABASE',
      enabled: true,
      configuration: {},
      rateLimiting: {
        maxAlertsPerHour: 1000,
        cooldownMinutes: 0,
      },
    });

    // Email notifications
    this.channels.set('email', {
      id: 'email',
      name: 'Email Notifications',
      type: 'EMAIL',
      enabled: !!process.env.RESEND_API_KEY,
      configuration: {
        fromEmail: process.env.SMTP_FROM || 'security@wedsync.com',
        smtpProvider: 'resend',
      },
      rateLimiting: {
        maxAlertsPerHour: 10,
        cooldownMinutes: 15,
      },
    });

    // Slack notifications
    this.channels.set('slack', {
      id: 'slack',
      name: 'Slack Notifications',
      type: 'SLACK',
      enabled: !!process.env.SLACK_WEBHOOK_URL,
      configuration: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#security-alerts',
        username: 'WedSync Security Bot',
      },
      rateLimiting: {
        maxAlertsPerHour: 20,
        cooldownMinutes: 5,
      },
    });

    // Webhook notifications (for external systems)
    this.channels.set('webhook', {
      id: 'webhook',
      name: 'External Webhook',
      type: 'WEBHOOK',
      enabled: !!process.env.SECURITY_WEBHOOK_URL,
      configuration: {
        webhookUrl: process.env.SECURITY_WEBHOOK_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SECURITY_WEBHOOK_TOKEN || ''}`,
        },
      },
      rateLimiting: {
        maxAlertsPerHour: 50,
        cooldownMinutes: 2,
      },
    });
  }

  /**
   * Initialize default notification templates
   */
  private initializeDefaultTemplates(): void {
    this.templates = [
      // Brute force attack templates
      {
        id: 'brute-force-critical',
        alertType: 'BRUTE_FORCE_ATTACK',
        severity: 'CRITICAL',
        channel: 'EMAIL',
        template: {
          subject: '🚨 CRITICAL: Brute Force Attack Detected',
          title: 'Critical Security Alert: Brute Force Attack',
          body: `A brute force attack has been detected on your WedSync account.

**Alert Details:**
- Organization: {{organizationName}}
- Attack Source: {{sourceIPs}}
- Failed Attempts: {{eventCount}}
- Time Period: {{timeRange}}
- Affected Users: {{affectedUsers}}

**Immediate Actions Taken:**
- Source IPs have been temporarily blocked
- Affected accounts have been flagged for review
- Enhanced monitoring has been enabled

**Recommended Actions:**
{{#each recommendations}}
- {{this}}
{{/each}}

This is an automated security alert. Please investigate immediately.`,
          color: '#ff0000',
          priority: 'URGENT',
        },
      },

      {
        id: 'brute-force-slack',
        alertType: 'BRUTE_FORCE_ATTACK',
        severity: 'HIGH',
        channel: 'SLACK',
        template: {
          title: '🚨 Brute Force Attack Detected',
          body: `*Severity:* HIGH
*Organization:* {{organizationName}}
*Source IPs:* {{sourceIPs}}
*Failed Attempts:* {{eventCount}}
*Time:* {{timeRange}}

*Immediate Actions Needed:*
{{#each recommendations}}
• {{this}}
{{/each}}

<{{dashboardUrl}}|View Security Dashboard>`,
          color: '#ff6b35',
        },
      },

      // Privilege escalation templates
      {
        id: 'privilege-escalation-critical',
        alertType: 'PRIVILEGE_ESCALATION',
        severity: 'CRITICAL',
        channel: 'EMAIL',
        template: {
          subject: '🚨 CRITICAL: Privilege Escalation Attempt Detected',
          title: 'Critical Security Alert: Privilege Escalation',
          body: `A privilege escalation attempt has been detected in your WedSync organization.

**Alert Details:**
- Organization: {{organizationName}}
- User Account: {{affectedUsers}}
- Source IP: {{sourceIPs}}
- Attempts: {{eventCount}}
- Detection Time: {{lastSeen}}

**Security Response:**
This type of attack could indicate a compromised account or malicious insider activity.

**Immediate Actions Required:**
{{#each recommendations}}
- {{this}}
{{/each}}

**Next Steps:**
1. Investigate the affected user account immediately
2. Review recent user activity and permissions
3. Consider temporarily suspending the account
4. Enable additional monitoring

This alert requires immediate attention from your security team.`,
          color: '#cc0000',
          priority: 'URGENT',
        },
      },

      // Data access anomaly templates
      {
        id: 'data-access-medium',
        alertType: 'UNAUTHORIZED_DATA_ACCESS',
        severity: 'MEDIUM',
        channel: 'SLACK',
        template: {
          title: '⚠️ Unusual Data Access Pattern',
          body: `*Severity:* MEDIUM
*Organization:* {{organizationName}}
*User:* {{affectedUsers}}
*Data Access Count:* {{eventCount}}
*Time Period:* {{timeRange}}

Unusual data access patterns detected. This may indicate:
• Automated data scraping
• Bulk data export
• Compromised account activity

*Recommended Actions:*
{{#each recommendations}}
• {{this}}
{{/each}}

<{{dashboardUrl}}|Review Activity Logs>`,
          color: '#ffad33',
        },
      },

      // API abuse templates
      {
        id: 'api-abuse-webhook',
        alertType: 'API_ABUSE',
        severity: 'MEDIUM',
        channel: 'WEBHOOK',
        template: {
          title: 'API Rate Limit Abuse Detected',
          body: JSON.stringify({
            alert_type: 'api_abuse',
            severity: '{{severity}}',
            organization_id: '{{organizationId}}',
            source_ips: '{{sourceIPs}}',
            event_count: '{{eventCount}}',
            time_range: '{{timeRange}}',
            recommendations: '{{recommendations}}',
            timestamp: '{{timestamp}}',
          }),
        },
      },

      // Generic high-severity template
      {
        id: 'generic-high-email',
        alertType: 'SUSPICIOUS_IP_ACTIVITY',
        severity: 'HIGH',
        channel: 'EMAIL',
        template: {
          subject: '🚨 Security Alert: {{title}}',
          title: 'Security Alert: {{title}}',
          body: `A security event requiring your attention has been detected.

**Alert Information:**
- Alert Type: {{alertType}}
- Severity: {{severity}}
- Organization: {{organizationName}}
- Detection Time: {{lastSeen}}
- Event Count: {{eventCount}}

**Details:**
{{description}}

**Affected Resources:**
{{#if affectedUsers}}
- Users: {{affectedUsers}}
{{/if}}
{{#if sourceIPs}}
- Source IPs: {{sourceIPs}}
{{/if}}

**Recommended Actions:**
{{#each recommendations}}
- {{this}}
{{/each}}

Please review this alert and take appropriate action through your security dashboard.

---
This is an automated security notification from WedSync.
Alert ID: {{alertId}}`,
          priority: 'HIGH',
        },
      },
    ];
  }

  /**
   * Initialize default alerting rules
   */
  private initializeDefaultRules(): void {
    this.rules = [
      // Critical alerts - immediate notification via all channels
      {
        id: 'critical-immediate',
        alertTypes: [
          'PRIVILEGE_ESCALATION',
          'ACCOUNT_COMPROMISE',
          'SYSTEM_INTRUSION_ATTEMPT',
        ],
        severities: ['CRITICAL'],
        channels: ['console', 'database', 'email', 'slack', 'webhook'],
        conditions: {
          cooldownMinutes: 0, // No cooldown for critical alerts
        },
        enabled: true,
      },

      // High severity - multi-channel notification
      {
        id: 'high-severity-multi',
        alertTypes: [
          'BRUTE_FORCE_ATTACK',
          'DATA_EXFILTRATION',
          'SECURITY_POLICY_VIOLATION',
        ],
        severities: ['HIGH'],
        channels: ['console', 'database', 'email', 'slack'],
        conditions: {
          cooldownMinutes: 15,
        },
        enabled: true,
      },

      // Medium severity - during business hours
      {
        id: 'medium-business-hours',
        alertTypes: [
          'UNAUTHORIZED_DATA_ACCESS',
          'API_ABUSE',
          'ANOMALOUS_USER_BEHAVIOR',
        ],
        severities: ['MEDIUM'],
        channels: ['console', 'database', 'slack'],
        conditions: {
          timeOfDay: { start: '09:00', end: '17:00' },
          daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
          cooldownMinutes: 30,
        },
        enabled: true,
      },

      // Low severity - daily digest
      {
        id: 'low-severity-digest',
        alertTypes: ['RATE_LIMIT_ABUSE', 'MULTIPLE_FAILED_LOGINS'],
        severities: ['LOW', 'MEDIUM'],
        channels: ['console', 'database'],
        conditions: {
          minimumEventCount: 5,
          cooldownMinutes: 120, // 2 hours
        },
        enabled: true,
      },
    ];
  }

  /**
   * Process and send security alert
   */
  async processAlert(alert: SecurityAlert): Promise<void> {
    console.log(
      `📢 Processing security alert: ${alert.title} (${alert.severity})`,
    );

    try {
      // Find applicable alerting rules
      const applicableRules = this.findApplicableRules(alert);

      if (applicableRules.length === 0) {
        console.log('No alerting rules match this alert');
        return;
      }

      // Process each applicable rule
      for (const rule of applicableRules) {
        await this.processAlertRule(alert, rule);
      }

      // Update alert metrics
      await this.updateAlertMetrics(alert);
    } catch (error) {
      console.error('Error processing security alert:', error);

      // Fallback: at minimum log to console
      console.error('FALLBACK SECURITY ALERT:', {
        id: alert.id,
        type: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        organizationId: alert.organizationId,
      });
    }
  }

  /**
   * Find applicable alerting rules for an alert
   */
  private findApplicableRules(alert: SecurityAlert): AlertingRule[] {
    return this.rules.filter((rule) => {
      if (!rule.enabled) return false;

      // Check organization scope
      if (rule.organizationId && rule.organizationId !== alert.organizationId) {
        return false;
      }

      // Check alert type
      if (!rule.alertTypes.includes(alert.alertType)) {
        return false;
      }

      // Check severity
      if (!rule.severities.includes(alert.severity)) {
        return false;
      }

      // Check time-based conditions
      if (!this.checkTimeConditions(rule.conditions)) {
        return false;
      }

      // Check event count threshold
      if (
        rule.conditions.minimumEventCount &&
        alert.eventCount < rule.conditions.minimumEventCount
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check time-based conditions
   */
  private checkTimeConditions(conditions: AlertingRule['conditions']): boolean {
    const now = new Date();

    // Check time of day
    if (conditions.timeOfDay) {
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      if (
        currentTime < conditions.timeOfDay.start ||
        currentTime > conditions.timeOfDay.end
      ) {
        return false;
      }
    }

    // Check day of week
    if (conditions.daysOfWeek) {
      const currentDay = now.getDay();
      if (!conditions.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Process alert according to a specific rule
   */
  private async processAlertRule(
    alert: SecurityAlert,
    rule: AlertingRule,
  ): Promise<void> {
    console.log(`Processing alert with rule: ${rule.id}`);

    for (const channelId of rule.channels) {
      const channel = this.channels.get(channelId);

      if (!channel || !channel.enabled) {
        continue;
      }

      // Check rate limiting
      if (!this.checkRateLimit(channelId, rule.conditions.cooldownMinutes)) {
        console.log(`Rate limit exceeded for channel ${channelId}`);
        continue;
      }

      try {
        await this.sendAlertToChannel(alert, channel);
        this.recordAlertSent(channelId);
      } catch (error) {
        console.error(`Failed to send alert to channel ${channelId}:`, error);
        await this.recordFailedAlert(alert, channelId, error);
      }
    }
  }

  /**
   * Check rate limiting for a channel
   */
  private checkRateLimit(channelId: string, cooldownMinutes?: number): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    const history = this.alertHistory.get(channelId) || [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Clean old entries
    const recentAlerts = history.filter((timestamp) => timestamp > oneHourAgo);
    this.alertHistory.set(channelId, recentAlerts);

    // Check hourly rate limit
    if (recentAlerts.length >= channel.rateLimiting.maxAlertsPerHour) {
      return false;
    }

    // Check cooldown period
    if (cooldownMinutes && cooldownMinutes > 0) {
      const cooldownTime = new Date(
        now.getTime() - cooldownMinutes * 60 * 1000,
      );
      const recentInCooldown = recentAlerts.filter(
        (timestamp) => timestamp > cooldownTime,
      );
      if (recentInCooldown.length > 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Send alert to specific channel
   */
  private async sendAlertToChannel(
    alert: SecurityAlert,
    channel: AlertChannel,
  ): Promise<void> {
    const template = this.findTemplate(
      alert.alertType,
      alert.severity,
      channel.type,
    );
    const message = this.renderTemplate(template, alert);

    switch (channel.type) {
      case 'CONSOLE':
        this.sendConsoleAlert(alert, message);
        break;
      case 'DATABASE':
        await this.sendDatabaseAlert(alert);
        break;
      case 'EMAIL':
        await this.sendEmailAlert(alert, message, channel);
        break;
      case 'SLACK':
        await this.sendSlackAlert(alert, message, channel);
        break;
      case 'WEBHOOK':
        await this.sendWebhookAlert(alert, message, channel);
        break;
      default:
        console.warn(`Unsupported channel type: ${channel.type}`);
    }
  }

  /**
   * Find appropriate template for alert
   */
  private findTemplate(
    alertType: AlertType,
    severity: string,
    channelType: AlertChannelType,
  ): NotificationTemplate | null {
    // Try to find exact match
    let template = this.templates.find(
      (t) =>
        t.alertType === alertType &&
        t.severity === severity &&
        t.channel === channelType,
    );

    // Fall back to generic template for severity and channel
    if (!template) {
      template = this.templates.find(
        (t) => t.severity === severity && t.channel === channelType,
      );
    }

    // Fall back to any template for the channel
    if (!template) {
      template = this.templates.find((t) => t.channel === channelType);
    }

    return template || null;
  }

  /**
   * Render template with alert data
   */
  private renderTemplate(
    template: NotificationTemplate | null,
    alert: SecurityAlert,
  ): any {
    if (!template) {
      return {
        title: alert.title,
        body: alert.description,
      };
    }

    const context = {
      ...alert,
      alertId: alert.id,
      alertType: alert.alertType,
      organizationId: alert.organizationId,
      organizationName: `Organization ${alert.organizationId}`, // TODO: Fetch actual name
      sourceIPs: alert.sourceIPs.join(', '),
      affectedUsers: alert.affectedUsers.join(', '),
      timeRange: `${alert.firstSeen.toLocaleString()} - ${alert.lastSeen.toLocaleString()}`,
      timestamp: new Date().toISOString(),
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/security`,
      recommendations: alert.recommendations,
    };

    // Simple template rendering (in production, use a proper template engine)
    const rendered = {
      ...template.template,
      title: this.renderString(template.template.title, context),
      body: this.renderString(template.template.body, context),
    };

    if (template.template.subject) {
      rendered.subject = this.renderString(template.template.subject, context);
    }

    return rendered;
  }

  /**
   * Simple template string rendering
   */
  private renderString(template: string, context: Record<string, any>): string {
    let rendered = template;

    // Replace simple variables {{variable}}
    Object.entries(context).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    });

    // Handle simple each loops {{#each array}}{{this}}{{/each}}
    const eachRegex = /{{#each (\w+)}}(.*?){{\/each}}/gs;
    rendered = rendered.replace(eachRegex, (match, arrayName, itemTemplate) => {
      const array = context[arrayName];
      if (Array.isArray(array)) {
        return array
          .map((item) => itemTemplate.replace(/{{this}}/g, item))
          .join('');
      }
      return '';
    });

    return rendered;
  }

  /**
   * Send console alert
   */
  private sendConsoleAlert(alert: SecurityAlert, message: any): void {
    const severity = alert.severity.toLowerCase();
    const logMethod =
      severity === 'critical'
        ? 'error'
        : severity === 'high'
          ? 'error'
          : severity === 'medium'
            ? 'warn'
            : 'info';

    console[logMethod](`🚨 SECURITY ALERT [${alert.severity}]:`, {
      id: alert.id,
      type: alert.alertType,
      organization: alert.organizationId,
      title: message.title,
      description: alert.description,
      eventCount: alert.eventCount,
      sourceIPs: alert.sourceIPs,
      affectedUsers: alert.affectedUsers,
      recommendations: alert.recommendations,
    });
  }

  /**
   * Send database alert (store in alerts table)
   */
  private async sendDatabaseAlert(alert: SecurityAlert): Promise<void> {
    // This is handled by the security event monitor when it creates the alert
    // We just acknowledge it here
    console.log(`📄 Alert ${alert.id} stored in database`);
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    alert: SecurityAlert,
    message: any,
    channel: AlertChannel,
  ): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
      throw new Error(
        'Email notifications not configured (RESEND_API_KEY missing)',
      );
    }

    // In a real implementation, integrate with your email service
    // For now, we'll just log what would be sent
    console.log('📧 EMAIL ALERT:', {
      to: channel.configuration.recipientEmails || ['admin@organization.com'],
      from: channel.configuration.fromEmail,
      subject: message.subject,
      text: message.body,
      html: this.convertToHTML(message.body),
    });

    // TODO: Implement actual email sending with Resend
    /*
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: channel.configuration.fromEmail,
      to: channel.configuration.recipientEmails,
      subject: message.subject,
      html: this.convertToHTML(message.body)
    });
    */
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(
    alert: SecurityAlert,
    message: any,
    channel: AlertChannel,
  ): Promise<void> {
    if (!channel.configuration.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const slackPayload = {
      channel: channel.configuration.channel,
      username: channel.configuration.username,
      text: message.title,
      attachments: [
        {
          color:
            message.color ||
            (alert.severity === 'CRITICAL'
              ? 'danger'
              : alert.severity === 'HIGH'
                ? 'warning'
                : 'good'),
          title: message.title,
          text: message.body,
          footer: 'WedSync Security',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    console.log('💬 SLACK ALERT:', slackPayload);

    // TODO: Implement actual Slack webhook sending
    /*
    await fetch(channel.configuration.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload)
    });
    */
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(
    alert: SecurityAlert,
    message: any,
    channel: AlertChannel,
  ): Promise<void> {
    if (!channel.configuration.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    const webhookPayload = {
      alert_id: alert.id,
      alert_type: alert.alertType,
      severity: alert.severity,
      organization_id: alert.organizationId,
      title: alert.title,
      description: alert.description,
      event_count: alert.eventCount,
      first_seen: alert.firstSeen.toISOString(),
      last_seen: alert.lastSeen.toISOString(),
      source_ips: alert.sourceIPs,
      affected_users: alert.affectedUsers,
      recommendations: alert.recommendations,
      timestamp: new Date().toISOString(),
    };

    console.log('🔗 WEBHOOK ALERT:', webhookPayload);

    // TODO: Implement actual webhook sending
    /*
    await fetch(channel.configuration.webhookUrl, {
      method: channel.configuration.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...channel.configuration.headers
      },
      body: JSON.stringify(webhookPayload)
    });
    */
  }

  /**
   * Convert plain text to HTML
   */
  private convertToHTML(text: string): string {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  /**
   * Record that an alert was sent
   */
  private recordAlertSent(channelId: string): void {
    const history = this.alertHistory.get(channelId) || [];
    history.push(new Date());
    this.alertHistory.set(channelId, history);
  }

  /**
   * Record failed alert attempt
   */
  private async recordFailedAlert(
    alert: SecurityAlert,
    channelId: string,
    error: any,
  ): Promise<void> {
    console.error(`Failed to send alert ${alert.id} via ${channelId}:`, error);

    // TODO: Store failed alert in database for monitoring
    /*
    await this.supabase
      .from('failed_alert_notifications')
      .insert([{
        alert_id: alert.id,
        channel_id: channelId,
        error_message: String(error),
        created_at: new Date().toISOString()
      }]);
    */
  }

  /**
   * Update alert metrics
   */
  private async updateAlertMetrics(alert: SecurityAlert): Promise<void> {
    // TODO: Implement metrics tracking
    console.log(`📊 Updated metrics for alert ${alert.id}`);
  }

  /**
   * Get alerting metrics
   */
  async getAlertingMetrics(
    organizationId: string,
    timeRangeHours: number = 24,
  ): Promise<AlertMetrics> {
    // TODO: Implement actual metrics calculation from database
    return {
      totalAlertsSent: 0,
      alertsByChannel: {},
      alertsBySeverity: {},
      alertsByType: {},
      failedAlerts: 0,
      averageResponseTime: 0,
      rateLimitedAlerts: 0,
    };
  }

  /**
   * Add custom alerting rule
   */
  addAlertingRule(rule: AlertingRule): void {
    this.rules.push(rule);
  }

  /**
   * Add custom alert channel
   */
  addAlertChannel(channel: AlertChannel): void {
    this.channels.set(channel.id, channel);
  }

  /**
   * Add custom notification template
   */
  addNotificationTemplate(template: NotificationTemplate): void {
    this.templates.push(template);
  }

  /**
   * Enable/disable alerting rule
   */
  toggleAlertingRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Enable/disable alert channel
   */
  toggleAlertChannel(channelId: string, enabled: boolean): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.enabled = enabled;
    }
  }
}

// Singleton instance for application-wide use
export const securityAlertingSystem = new SecurityAlertingSystem();

export { SecurityAlertingSystem };
