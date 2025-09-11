// WS-098 Rollback Notifications - Multi-Channel Alert System
// Handles notifications for rollback events across Slack, email, SMS

import {
  RollbackConfig,
  RollbackMetrics,
  WeddingCheckResult,
} from './rollbackManager';

export interface NotificationChannel {
  type: 'slack' | 'email' | 'sms' | 'webhook';
  enabled: boolean;
  config?: any;
}

export interface NotificationPayload {
  rollbackId: string;
  event: 'start' | 'success' | 'failed' | 'blocked' | 'wedding_alert';
  timestamp: Date;
  environment: string;
  message: string;
  details: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class RollbackNotificationManager {
  private channels: NotificationChannel[] = [];
  private readonly CRITICAL_CONTACTS =
    process.env.EMERGENCY_CONTACTS?.split(',') || [];
  private readonly SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
  private readonly SMS_ENABLED = process.env.SMS_NOTIFICATIONS === 'true';

  constructor() {
    this.initializeChannels();
  }

  /**
   * Initialize notification channels based on environment
   */
  private initializeChannels(): void {
    // Slack channel
    if (this.SLACK_WEBHOOK) {
      this.channels.push({
        type: 'slack',
        enabled: true,
        config: { webhookUrl: this.SLACK_WEBHOOK },
      });
    }

    // Email channel (always enabled)
    this.channels.push({
      type: 'email',
      enabled: true,
      config: { recipients: this.CRITICAL_CONTACTS },
    });

    // SMS channel for critical alerts
    if (this.SMS_ENABLED) {
      this.channels.push({
        type: 'sms',
        enabled: true,
        config: { recipients: this.CRITICAL_CONTACTS },
      });
    }
  }

  /**
   * Notify rollback start
   */
  async notifyRollbackStart(
    rollbackId: string,
    config: RollbackConfig,
    metrics: RollbackMetrics,
  ): Promise<void> {
    const payload: NotificationPayload = {
      rollbackId,
      event: 'start',
      timestamp: new Date(),
      environment: config.environment,
      message: `🔄 Rollback initiated for ${config.environment}`,
      details: {
        targetCommit: config.targetCommit,
        reason: config.reason,
        weddingProtection: !config.disableWeddingProtection,
        dryRun: config.dryRun,
      },
      priority: config.environment === 'production' ? 'high' : 'medium',
    };

    await this.sendToAllChannels(payload);
  }

  /**
   * Notify rollback success
   */
  async notifyRollbackSuccess(
    rollbackId: string,
    config: RollbackConfig,
    metrics: RollbackMetrics,
  ): Promise<void> {
    const duration = metrics.duration
      ? `${Math.round(metrics.duration / 1000)}s`
      : 'unknown';

    const payload: NotificationPayload = {
      rollbackId,
      event: 'success',
      timestamp: new Date(),
      environment: config.environment,
      message: `✅ Rollback completed successfully in ${duration}`,
      details: {
        targetCommit: config.targetCommit,
        duration,
        healthCheck: metrics.healthCheck,
        verificationPassed: metrics.verificationResults?.every(
          (r) => r.status !== 'failed',
        ),
      },
      priority: 'medium',
    };

    await this.sendToAllChannels(payload);
  }

  /**
   * Notify rollback failure
   */
  async notifyRollbackFailed(
    rollbackId: string,
    config: RollbackConfig,
    metrics: RollbackMetrics,
  ): Promise<void> {
    const payload: NotificationPayload = {
      rollbackId,
      event: 'failed',
      timestamp: new Date(),
      environment: config.environment,
      message: `❌ ROLLBACK FAILED - Manual intervention required`,
      details: {
        targetCommit: config.targetCommit,
        errorMessage: metrics.errorMessage,
        failedVerifications: metrics.verificationResults?.filter(
          (r) => r.status === 'failed',
        ),
        lastHealthCheck: metrics.healthCheck,
      },
      priority: 'critical',
    };

    await this.sendToAllChannels(payload);

    // Send SMS for critical production failures
    if (config.environment === 'production' && this.SMS_ENABLED) {
      await this.sendEmergencySMS(payload);
    }
  }

  /**
   * Notify wedding day block
   */
  async notifyWeddingBlocked(
    rollbackId: string,
    weddingCheck: WeddingCheckResult,
  ): Promise<void> {
    const payload: NotificationPayload = {
      rollbackId,
      event: 'blocked',
      timestamp: new Date(),
      environment: 'production',
      message: `🚨 ROLLBACK BLOCKED - ${weddingCheck.weddingCount} active weddings detected`,
      details: {
        weddingCount: weddingCheck.weddingCount,
        weddings: weddingCheck.weddings?.map((w) => ({
          name: w.clientName,
          date: w.weddingDate,
          contact: w.phone,
        })),
      },
      priority: 'critical',
    };

    await this.sendToAllChannels(payload);

    // Always send SMS for wedding blocks
    if (this.SMS_ENABLED) {
      await this.sendWeddingAlertSMS(weddingCheck);
    }
  }

  /**
   * Get wedding context for notifications
   */
  async getWeddingContext(): Promise<any> {
    try {
      const response = await fetch('/api/weddings/today');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get wedding context:', error);
    }
    return null;
  }

  /**
   * Send notification to all configured channels
   */
  private async sendToAllChannels(payload: NotificationPayload): Promise<void> {
    const promises = this.channels
      .filter((channel) => channel.enabled)
      .map((channel) => this.sendToChannel(channel, payload));

    await Promise.allSettled(promises);
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    payload: NotificationPayload,
  ): Promise<void> {
    try {
      switch (channel.type) {
        case 'slack':
          await this.sendSlackNotification(payload, channel.config);
          break;
        case 'email':
          await this.sendEmailNotification(payload, channel.config);
          break;
        case 'sms':
          if (payload.priority === 'critical') {
            await this.sendSMSNotification(payload, channel.config);
          }
          break;
        case 'webhook':
          await this.sendWebhookNotification(payload, channel.config);
          break;
      }
    } catch (error) {
      console.error(`Failed to send ${channel.type} notification:`, error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(
    payload: NotificationPayload,
    config: any,
  ): Promise<void> {
    if (!config?.webhookUrl) return;

    const color = this.getSlackColor(payload.event);
    const emoji = this.getEventEmoji(payload.event);

    const slackMessage = {
      text: `${emoji} ${payload.message}`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Rollback ID',
              value: payload.rollbackId,
              short: true,
            },
            {
              title: 'Environment',
              value: payload.environment,
              short: true,
            },
            {
              title: 'Priority',
              value: payload.priority.toUpperCase(),
              short: true,
            },
            {
              title: 'Timestamp',
              value: payload.timestamp.toISOString(),
              short: true,
            },
          ],
          footer: 'WedSync Rollback System',
          ts: Math.floor(payload.timestamp.getTime() / 1000),
        },
      ],
    };

    // Add details if present
    if (payload.details) {
      slackMessage.attachments[0].fields.push({
        title: 'Details',
        value: JSON.stringify(payload.details, null, 2),
        short: false,
      });
    }

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    payload: NotificationPayload,
    config: any,
  ): Promise<void> {
    const recipients = config?.recipients || this.CRITICAL_CONTACTS;
    if (!recipients || recipients.length === 0) return;

    const emailData = {
      to: recipients,
      subject: `[${payload.priority.toUpperCase()}] WedSync Rollback Alert: ${payload.event}`,
      html: this.generateEmailHTML(payload),
    };

    // Send via email service (implementation depends on email provider)
    await fetch('/api/notifications/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData),
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    payload: NotificationPayload,
    config: any,
  ): Promise<void> {
    const recipients = config?.recipients || this.CRITICAL_CONTACTS;
    if (!recipients || recipients.length === 0) return;

    const message =
      `🚨 WedSync Rollback ${payload.event.toUpperCase()}\n` +
      `Env: ${payload.environment}\n` +
      `${payload.message}\n` +
      `ID: ${payload.rollbackId}`;

    // Send via SMS service
    await fetch('/api/notifications/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipients,
        message: message.substring(0, 160), // SMS limit
      }),
    });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    payload: NotificationPayload,
    config: any,
  ): Promise<void> {
    if (!config?.url) return;

    await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Rollback-Event': payload.event,
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send emergency SMS for critical failures
   */
  private async sendEmergencySMS(payload: NotificationPayload): Promise<void> {
    const message =
      `🚨 CRITICAL: WedSync rollback FAILED in ${payload.environment}. ` +
      `Manual intervention required immediately. ` +
      `Rollback ID: ${payload.rollbackId}`;

    for (const contact of this.CRITICAL_CONTACTS) {
      try {
        await fetch('/api/notifications/sms/emergency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: contact,
            message,
            priority: 'emergency',
          }),
        });
      } catch (error) {
        console.error(`Failed to send emergency SMS to ${contact}:`, error);
      }
    }
  }

  /**
   * Send wedding alert SMS
   */
  private async sendWeddingAlertSMS(
    weddingCheck: WeddingCheckResult,
  ): Promise<void> {
    const message =
      `🚨 WEDDING PROTECTION: Rollback blocked. ` +
      `${weddingCheck.weddingCount} active weddings today. ` +
      `DO NOT proceed with rollback.`;

    for (const contact of this.CRITICAL_CONTACTS) {
      try {
        await fetch('/api/notifications/sms/wedding-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: contact,
            message,
            priority: 'critical',
            weddingData: weddingCheck,
          }),
        });
      } catch (error) {
        console.error(`Failed to send wedding alert SMS to ${contact}:`, error);
      }
    }
  }

  /**
   * Generate HTML for email notifications
   */
  private generateEmailHTML(payload: NotificationPayload): string {
    const emoji = this.getEventEmoji(payload.event);
    const color = this.getEmailColor(payload.event);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
          .header { background: ${color}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
          .critical { color: #dc3545; font-weight: bold; }
          .success { color: #28a745; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emoji} WedSync Rollback Alert</h1>
            <h2>${payload.message}</h2>
          </div>
          <div class="content">
            <div class="detail-row">
              <strong>Rollback ID:</strong>
              <span>${payload.rollbackId}</span>
            </div>
            <div class="detail-row">
              <strong>Event:</strong>
              <span class="${payload.event === 'failed' ? 'critical' : payload.event === 'success' ? 'success' : ''}">${payload.event.toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <strong>Environment:</strong>
              <span>${payload.environment}</span>
            </div>
            <div class="detail-row">
              <strong>Priority:</strong>
              <span class="${payload.priority === 'critical' ? 'critical' : ''}">${payload.priority.toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <strong>Timestamp:</strong>
              <span>${payload.timestamp.toLocaleString()}</span>
            </div>
            ${
              payload.details
                ? `
              <div style="margin-top: 20px;">
                <h3>Details:</h3>
                <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">
${JSON.stringify(payload.details, null, 2)}
                </pre>
              </div>
            `
                : ''
            }
          </div>
          <div class="footer">
            <p>This is an automated alert from the WedSync Rollback System.</p>
            <p>For assistance, contact the DevOps team immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get Slack color based on event
   */
  private getSlackColor(event: string): string {
    switch (event) {
      case 'success':
        return 'good';
      case 'failed':
      case 'blocked':
        return 'danger';
      case 'start':
        return 'warning';
      default:
        return '#808080';
    }
  }

  /**
   * Get email color based on event
   */
  private getEmailColor(event: string): string {
    switch (event) {
      case 'success':
        return '#28a745';
      case 'failed':
      case 'blocked':
        return '#dc3545';
      case 'start':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  }

  /**
   * Get emoji for event type
   */
  private getEventEmoji(event: string): string {
    switch (event) {
      case 'start':
        return '🔄';
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      case 'blocked':
        return '🚨';
      case 'wedding_alert':
        return '👰';
      default:
        return '📢';
    }
  }
}

// Export singleton for global access
export const rollbackNotificationManager = new RollbackNotificationManager();
