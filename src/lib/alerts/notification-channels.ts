/**
 * WS-227 System Health - Multi-Channel Notification System
 * Handles email, SMS, Slack, and webhook notifications for alerts
 */

import { Logger } from '@/lib/logging/Logger';
import { Alert } from './alert-manager';

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'slack' | 'webhook' | 'push';
  enabled: boolean;
  config: Record<string, any>;
  rateLimits: {
    maxPerHour: number;
    maxPerDay: number;
  };
  lastUsed?: Date;
  usageCount: number;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  htmlBody?: string;
  variables?: Record<string, string>;
}

export interface NotificationResult {
  success: boolean;
  channelId: string;
  messageId?: string;
  error?: string;
  timestamp: Date;
  rateLimited?: boolean;
}

export class NotificationChannels {
  private logger: Logger;
  private channels: Map<string, NotificationChannel> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private notificationHistory: NotificationResult[] = [];

  constructor() {
    this.logger = new Logger('NotificationChannels');
    this.initializeChannels();
    this.initializeTemplates();
  }

  /**
   * Send notification through specified channel
   */
  public async send(
    channelId: string,
    alert: Alert,
  ): Promise<NotificationResult> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      const error = `Channel ${channelId} not found`;
      this.logger.error(error, { channelId, alertId: alert.id });
      return {
        success: false,
        channelId,
        error,
        timestamp: new Date(),
      };
    }

    if (!channel.enabled) {
      const error = `Channel ${channelId} is disabled`;
      this.logger.warn(error, { channelId, alertId: alert.id });
      return {
        success: false,
        channelId,
        error,
        timestamp: new Date(),
      };
    }

    // Check rate limits
    if (this.isRateLimited(channel)) {
      const error = `Channel ${channelId} is rate limited`;
      this.logger.warn(error, { channelId, alertId: alert.id });
      return {
        success: false,
        channelId,
        error,
        timestamp: new Date(),
        rateLimited: true,
      };
    }

    try {
      let result: NotificationResult;

      switch (channel.type) {
        case 'email':
          result = await this.sendEmail(channel, alert);
          break;
        case 'sms':
          result = await this.sendSMS(channel, alert);
          break;
        case 'slack':
          result = await this.sendSlack(channel, alert);
          break;
        case 'webhook':
          result = await this.sendWebhook(channel, alert);
          break;
        case 'push':
          result = await this.sendPushNotification(channel, alert);
          break;
        default:
          throw new Error(`Unsupported channel type: ${channel.type}`);
      }

      // Update usage tracking
      channel.lastUsed = new Date();
      channel.usageCount++;

      // Store result
      this.notificationHistory.push(result);

      this.logger.info('Notification sent successfully', {
        channelId,
        channelType: channel.type,
        alertId: alert.id,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const result: NotificationResult = {
        success: false,
        channelId,
        error: errorMessage,
        timestamp: new Date(),
      };

      this.notificationHistory.push(result);

      this.logger.error('Notification failed', {
        channelId,
        channelType: channel.type,
        alertId: alert.id,
        error: errorMessage,
      });

      return result;
    }
  }

  /**
   * Send alert acknowledgment notification
   */
  public async sendAcknowledgment(
    alert: Alert,
    acknowledgedBy: string,
  ): Promise<void> {
    const channels = alert.weddingDayAlert ? ['email', 'slack'] : ['slack'];

    const ackAlert = {
      ...alert,
      title: `Alert Acknowledged: ${alert.title}`,
      description: `Alert ${alert.id} has been acknowledged by ${acknowledgedBy}`,
      severity: 'info' as const,
    };

    await Promise.all(
      channels.map((channelId) => this.send(channelId, ackAlert)),
    );
  }

  /**
   * Send alert resolution notification
   */
  public async sendResolution(
    alert: Alert,
    resolvedBy?: string,
  ): Promise<void> {
    const channels = alert.weddingDayAlert ? ['email', 'slack'] : ['slack'];

    const resolutionAlert = {
      ...alert,
      title: `Alert Resolved: ${alert.title}`,
      description: `Alert ${alert.id} has been resolved${resolvedBy ? ` by ${resolvedBy}` : ''}`,
      severity: 'info' as const,
    };

    await Promise.all(
      channels.map((channelId) => this.send(channelId, resolutionAlert)),
    );
  }

  /**
   * Send email notification
   */
  private async sendEmail(
    channel: NotificationChannel,
    alert: Alert,
  ): Promise<NotificationResult> {
    const template = this.getTemplate(channel.type, alert.severity);
    const subject = this.renderTemplate(template.subject, alert);
    const body = this.renderTemplate(template.body, alert);
    const htmlBody = template.htmlBody
      ? this.renderTemplate(template.htmlBody, alert)
      : undefined;

    // Get recipients based on alert severity and wedding day mode
    const recipients = this.getEmailRecipients(alert);

    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipients,
          subject,
          text: body,
          html: htmlBody,
          priority: alert.severity === 'emergency' ? 'high' : 'normal',
          tags: [`alert-${alert.severity}`, `category-${alert.category}`],
        }),
      });

      if (!response.ok) {
        throw new Error(`Email API error: ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        channelId: channel.id,
        messageId: result.messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Email send failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(
    channel: NotificationChannel,
    alert: Alert,
  ): Promise<NotificationResult> {
    const template = this.getTemplate(channel.type, alert.severity);
    const message = this.renderTemplate(template.body, alert);

    // Get SMS recipients for emergency alerts only
    const recipients = this.getSMSRecipients(alert);

    if (recipients.length === 0) {
      return {
        success: true,
        channelId: channel.id,
        timestamp: new Date(),
        error: 'No SMS recipients for this alert severity',
      };
    }

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipients,
          message: message.substring(0, 160), // SMS character limit
          priority: alert.severity === 'emergency' ? 'high' : 'normal',
        }),
      });

      if (!response.ok) {
        throw new Error(`SMS API error: ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        channelId: channel.id,
        messageId: result.messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `SMS send failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(
    channel: NotificationChannel,
    alert: Alert,
  ): Promise<NotificationResult> {
    const slackChannel = this.getSlackChannel(alert);
    const color = this.getSlackColor(alert.severity);

    const slackMessage = {
      channel: slackChannel,
      username: 'WedSync Health Monitor',
      icon_emoji: ':warning:',
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
              title: 'Category',
              value: alert.category,
              short: true,
            },
            {
              title: 'Source',
              value: alert.source,
              short: true,
            },
            {
              title: 'Time',
              value: alert.timestamp.toLocaleString(),
              short: true,
            },
          ],
          footer: 'WedSync Health Monitor',
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    };

    // Add wedding day indicator
    if (alert.weddingDayAlert) {
      slackMessage.attachments[0].fields.unshift({
        title: '🚨 WEDDING DAY ALERT',
        value: 'This alert occurred on a Saturday (wedding day)',
        short: false,
      });
    }

    try {
      const response = await fetch(channel.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook error: ${response.status}`);
      }

      return {
        success: true,
        channelId: channel.id,
        messageId: `slack-${Date.now()}`,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Slack send failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(
    channel: NotificationChannel,
    alert: Alert,
  ): Promise<NotificationResult> {
    const payload = {
      alert,
      timestamp: new Date().toISOString(),
      source: 'wedsync-health-monitor',
      version: '1.0',
    };

    try {
      const response = await fetch(channel.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync-Health-Monitor/1.0',
          ...(channel.config.headers || {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          `Webhook error: ${response.status} ${response.statusText}`,
        );
      }

      return {
        success: true,
        channelId: channel.id,
        messageId: `webhook-${Date.now()}`,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Webhook send failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    channel: NotificationChannel,
    alert: Alert,
  ): Promise<NotificationResult> {
    const notification = {
      title: alert.title,
      body: alert.description,
      icon: '/icons/alert-icon.png',
      badge: '/icons/badge.png',
      tag: `alert-${alert.id}`,
      requireInteraction: alert.severity === 'emergency',
      silent: false,
      data: {
        alertId: alert.id,
        severity: alert.severity,
        category: alert.category,
        timestamp: alert.timestamp.toISOString(),
      },
    };

    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        throw new Error(`Push notification error: ${response.status}`);
      }

      const result = await response.json();

      return {
        success: true,
        channelId: channel.id,
        messageId: result.messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Push notification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if channel is rate limited
   */
  private isRateLimited(channel: NotificationChannel): boolean {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const hourlyCount = this.notificationHistory.filter(
      (n) => n.channelId === channel.id && n.timestamp >= hourAgo,
    ).length;

    const dailyCount = this.notificationHistory.filter(
      (n) => n.channelId === channel.id && n.timestamp >= dayAgo,
    ).length;

    return (
      hourlyCount >= channel.rateLimits.maxPerHour ||
      dailyCount >= channel.rateLimits.maxPerDay
    );
  }

  /**
   * Helper methods for recipients and templates
   */
  private getEmailRecipients(alert: Alert): string[] {
    const baseRecipients = ['admin@wedsync.com', 'alerts@wedsync.com'];

    if (alert.severity === 'emergency' || alert.weddingDayAlert) {
      return [...baseRecipients, 'emergency@wedsync.com', 'cto@wedsync.com'];
    }

    if (alert.severity === 'critical') {
      return [...baseRecipients, 'dev-team@wedsync.com'];
    }

    return baseRecipients;
  }

  private getSMSRecipients(alert: Alert): string[] {
    // Only send SMS for emergency alerts or wedding day alerts
    if (alert.severity === 'emergency' || alert.weddingDayAlert) {
      return ['+1234567890', '+1234567891']; // Emergency contacts
    }

    return [];
  }

  private getSlackChannel(alert: Alert): string {
    if (alert.weddingDayAlert || alert.severity === 'emergency') {
      return '#emergency-alerts';
    }

    if (alert.severity === 'critical') {
      return '#critical-alerts';
    }

    return '#system-alerts';
  }

  private getSlackColor(severity: string): string {
    switch (severity) {
      case 'emergency':
        return '#ff0000';
      case 'critical':
        return '#ff6600';
      case 'warning':
        return '#ffaa00';
      case 'info':
      default:
        return '#36a64f';
    }
  }

  private getTemplate(
    channelType: string,
    severity: string,
  ): NotificationTemplate {
    const key = `${channelType}_${severity}`;
    return (
      this.templates.get(key) || this.templates.get(`${channelType}_default`)!
    );
  }

  private renderTemplate(template: string, alert: Alert): string {
    return template
      .replace(/\{\{title\}\}/g, alert.title)
      .replace(/\{\{description\}\}/g, alert.description)
      .replace(/\{\{severity\}\}/g, alert.severity.toUpperCase())
      .replace(/\{\{category\}\}/g, alert.category)
      .replace(/\{\{source\}\}/g, alert.source)
      .replace(/\{\{timestamp\}\}/g, alert.timestamp.toLocaleString())
      .replace(/\{\{id\}\}/g, alert.id)
      .replace(
        /\{\{weddingDayMode\}\}/g,
        alert.weddingDayAlert ? '🚨 WEDDING DAY MODE' : '',
      );
  }

  /**
   * Initialize notification channels
   */
  private initializeChannels(): void {
    const channels: NotificationChannel[] = [
      {
        id: 'email',
        name: 'Email Notifications',
        type: 'email',
        enabled: true,
        config: {
          provider: 'resend',
          from: 'alerts@wedsync.com',
        },
        rateLimits: {
          maxPerHour: 100,
          maxPerDay: 500,
        },
        usageCount: 0,
      },
      {
        id: 'sms',
        name: 'SMS Notifications',
        type: 'sms',
        enabled: true,
        config: {
          provider: 'twilio',
        },
        rateLimits: {
          maxPerHour: 20,
          maxPerDay: 100,
        },
        usageCount: 0,
      },
      {
        id: 'slack',
        name: 'Slack Notifications',
        type: 'slack',
        enabled: true,
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
        },
        rateLimits: {
          maxPerHour: 200,
          maxPerDay: 1000,
        },
        usageCount: 0,
      },
      {
        id: 'webhook',
        name: 'Webhook Notifications',
        type: 'webhook',
        enabled: true,
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          headers: {
            Authorization: `Bearer ${process.env.ALERT_WEBHOOK_TOKEN}`,
          },
        },
        rateLimits: {
          maxPerHour: 500,
          maxPerDay: 2000,
        },
        usageCount: 0,
      },
      {
        id: 'push',
        name: 'Push Notifications',
        type: 'push',
        enabled: true,
        config: {
          vapidKey: process.env.VAPID_KEY,
        },
        rateLimits: {
          maxPerHour: 100,
          maxPerDay: 500,
        },
        usageCount: 0,
      },
    ];

    channels.forEach((channel) => {
      this.channels.set(channel.id, channel);
    });

    this.logger.info('Notification channels initialized', {
      channelCount: channels.length,
    });
  }

  /**
   * Initialize notification templates
   */
  private initializeTemplates(): void {
    const templates: [string, NotificationTemplate][] = [
      [
        'email_emergency',
        {
          subject: '🚨 EMERGENCY ALERT: {{title}} {{weddingDayMode}}',
          body: `EMERGENCY ALERT: {{title}}

{{weddingDayMode}}

Description: {{description}}
Severity: {{severity}}
Category: {{category}}
Source: {{source}}
Time: {{timestamp}}
Alert ID: {{id}}

This is an emergency-level alert that requires immediate attention.

Dashboard: https://wedsync.com/admin/health
`,
          htmlBody: `<h1 style="color: #ff0000;">🚨 EMERGENCY ALERT: {{title}}</h1>
<p><strong>{{weddingDayMode}}</strong></p>
<p><strong>Description:</strong> {{description}}</p>
<ul>
  <li><strong>Severity:</strong> {{severity}}</li>
  <li><strong>Category:</strong> {{category}}</li>
  <li><strong>Source:</strong> {{source}}</li>
  <li><strong>Time:</strong> {{timestamp}}</li>
  <li><strong>Alert ID:</strong> {{id}}</li>
</ul>
<p>This is an emergency-level alert that requires immediate attention.</p>
<p><a href="https://wedsync.com/admin/health">View Dashboard</a></p>`,
        },
      ],
      [
        'email_critical',
        {
          subject: '⚠️ CRITICAL ALERT: {{title}}',
          body: `CRITICAL ALERT: {{title}}

Description: {{description}}
Severity: {{severity}}
Category: {{category}}
Source: {{source}}
Time: {{timestamp}}
Alert ID: {{id}}

Please investigate and resolve as soon as possible.

Dashboard: https://wedsync.com/admin/health
`,
        },
      ],
      [
        'email_warning',
        {
          subject: '⚠️ WARNING: {{title}}',
          body: `WARNING: {{title}}

Description: {{description}}
Severity: {{severity}}
Category: {{category}}
Source: {{source}}
Time: {{timestamp}}
Alert ID: {{id}}

Dashboard: https://wedsync.com/admin/health
`,
        },
      ],
      [
        'email_info',
        {
          subject: 'ℹ️ INFO: {{title}}',
          body: `INFO: {{title}}

Description: {{description}}
Severity: {{severity}}
Category: {{category}}
Source: {{source}}
Time: {{timestamp}}
Alert ID: {{id}}

Dashboard: https://wedsync.com/admin/health
`,
        },
      ],
      [
        'sms_default',
        {
          subject: '',
          body: 'WedSync ALERT: {{title}} - {{severity}} - {{timestamp}} - ID: {{id}}',
        },
      ],
      [
        'slack_default',
        {
          subject: '',
          body: '{{title}}\n\n{{description}}',
        },
      ],
      [
        'webhook_default',
        {
          subject: '',
          body: '{{title}}: {{description}}',
        },
      ],
      [
        'push_default',
        {
          subject: '{{title}}',
          body: '{{description}}',
        },
      ],
    ];

    templates.forEach(([key, template]) => {
      this.templates.set(key, template);
    });

    this.logger.info('Notification templates initialized', {
      templateCount: templates.length,
    });
  }

  /**
   * Get notification statistics
   */
  public getNotificationStats(timeRangeHours: number = 24): {
    totalSent: number;
    successRate: number;
    byChannel: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const relevantNotifications = this.notificationHistory.filter(
      (n) => n.timestamp >= cutoffTime,
    );

    const byChannel: Record<string, number> = {};
    const byStatus: Record<string, number> = { success: 0, failed: 0 };

    relevantNotifications.forEach((notification) => {
      byChannel[notification.channelId] =
        (byChannel[notification.channelId] || 0) + 1;
      byStatus[notification.success ? 'success' : 'failed']++;
    });

    const successRate =
      relevantNotifications.length > 0
        ? (byStatus.success / relevantNotifications.length) * 100
        : 0;

    return {
      totalSent: relevantNotifications.length,
      successRate: Math.round(successRate),
      byChannel,
      byStatus,
    };
  }
}
