import { createClient } from '@/lib/supabase/server';
import { EmailService } from '@/lib/email/email-service';
import { z } from 'zod';

// Alert notification types and interfaces
export enum AlertPriority {
  CRITICAL = 'critical', // System down, payment failures - immediate notification
  HIGH = 'high', // Performance degradation, high churn - notify within 5 min
  MEDIUM = 'medium', // Unusual patterns, pending actions - notify within 30 min
  LOW = 'low', // Informational, suggestions - daily digest
  INFO = 'info', // FYI notifications - weekly digest
}

export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  SMS = 'sms',
  WEBHOOK = 'webhook',
  PUSH = 'push',
}

export interface Alert {
  id: string;
  type: string;
  priority: AlertPriority;
  title: string;
  message: string;
  metadata: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  snoozedUntil?: Date;
}

export interface NotificationConfig {
  id: string;
  adminUserId: string;
  channel: NotificationChannel;
  priority: AlertPriority[];
  alertTypes: string[];
  enabled: boolean;
  settings: Record<string, any>; // Channel-specific settings
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export interface NotificationDelivery {
  id: string;
  alertId: string;
  channel: NotificationChannel;
  recipient: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
}

const AlertNotificationSchema = z.object({
  alertId: z.string().uuid(),
  channel: z.nativeEnum(NotificationChannel),
  recipient: z.string(),
  priority: z.nativeEnum(AlertPriority),
  title: z.string().min(1),
  message: z.string().min(1),
  metadata: z.record(z.any()).optional(),
});

export class AlertNotificationService {
  private supabase = createClient();
  private emailService = new EmailService();

  constructor() {}

  /**
   * Send alert notification via all configured channels for recipient
   */
  async sendAlertNotification(
    alert: Alert,
    recipients?: string[],
  ): Promise<void> {
    try {
      // Get notification configurations for alert
      const configs = await this.getNotificationConfigs(alert, recipients);

      // Group by recipient and channel for efficient processing
      const deliveryTasks = this.groupDeliveryTasks(alert, configs);

      // Process deliveries with proper error handling and retries
      await Promise.allSettled(
        deliveryTasks.map((task) => this.processDeliveryTask(task)),
      );

      // Log alert notification completion
      await this.logNotificationEvent(alert.id, 'notification_sent', {
        recipientCount: deliveryTasks.length,
        channels: [...new Set(deliveryTasks.map((t) => t.channel))],
        priority: alert.priority,
      });
    } catch (error) {
      console.error('Failed to send alert notifications:', error);

      await this.logNotificationEvent(alert.id, 'notification_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        priority: alert.priority,
      });

      throw error;
    }
  }

  /**
   * Get notification configurations for an alert
   */
  private async getNotificationConfigs(
    alert: Alert,
    recipients?: string[],
  ): Promise<NotificationConfig[]> {
    let query = this.supabase
      .from('admin_notification_configs')
      .select('*')
      .eq('enabled', true)
      .contains('alert_types', [alert.type])
      .contains('priority', [alert.priority]);

    if (recipients && recipients.length > 0) {
      query = query.in('admin_user_id', recipients);
    }

    const { data: configs, error } = await query;

    if (error) {
      console.error('Failed to fetch notification configs:', error);
      return [];
    }

    // Filter out configs that are in quiet hours
    return configs?.filter((config) => !this.isInQuietHours(config)) || [];
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(config: NotificationConfig): boolean {
    if (!config.quietHours) return false;

    try {
      const now = new Date();
      const timezone = config.quietHours.timezone;
      const currentTime = now.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      const quietStart = config.quietHours.start;
      const quietEnd = config.quietHours.end;

      // Handle quiet hours that span midnight
      if (quietStart > quietEnd) {
        return currentTime >= quietStart || currentTime <= quietEnd;
      } else {
        return currentTime >= quietStart && currentTime <= quietEnd;
      }
    } catch (error) {
      console.error('Error checking quiet hours:', error);
      return false;
    }
  }

  /**
   * Group delivery tasks by recipient and channel
   */
  private groupDeliveryTasks(
    alert: Alert,
    configs: NotificationConfig[],
  ): DeliveryTask[] {
    const tasks: DeliveryTask[] = [];

    for (const config of configs) {
      // Apply escalation rules based on priority
      const channels = this.getChannelsForPriority(alert.priority, config);

      for (const channel of channels) {
        tasks.push({
          alertId: alert.id,
          alert: alert,
          channel: channel,
          recipient: this.getRecipientForChannel(channel, config),
          config: config,
          retryCount: 0,
          maxRetries: this.getMaxRetriesForChannel(channel),
        });
      }
    }

    return tasks;
  }

  /**
   * Get appropriate channels based on alert priority
   */
  private getChannelsForPriority(
    priority: AlertPriority,
    config: NotificationConfig,
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    switch (priority) {
      case AlertPriority.CRITICAL:
        // Critical: All channels immediately
        channels.push(NotificationChannel.EMAIL, NotificationChannel.SLACK);
        if (config.settings.smsEnabled) {
          channels.push(NotificationChannel.SMS);
        }
        break;

      case AlertPriority.HIGH:
        // High: Email + Slack
        channels.push(NotificationChannel.EMAIL, NotificationChannel.SLACK);
        break;

      case AlertPriority.MEDIUM:
        // Medium: Email + Slack (non-urgent)
        channels.push(NotificationChannel.EMAIL);
        if (config.settings.slackNonUrgent !== false) {
          channels.push(NotificationChannel.SLACK);
        }
        break;

      case AlertPriority.LOW:
      case AlertPriority.INFO:
        // Low/Info: Email digest only
        channels.push(NotificationChannel.EMAIL);
        break;
    }

    return channels.filter(
      (channel) => config.settings[`${channel}Enabled`] !== false,
    );
  }

  /**
   * Get recipient address/ID for specific channel
   */
  private getRecipientForChannel(
    channel: NotificationChannel,
    config: NotificationConfig,
  ): string {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return config.settings.emailAddress || config.adminUserId;
      case NotificationChannel.SLACK:
        return (
          config.settings.slackUserId ||
          config.settings.slackChannel ||
          '#alerts'
        );
      case NotificationChannel.SMS:
        return config.settings.smsNumber || '';
      default:
        return config.adminUserId;
    }
  }

  /**
   * Get max retries for channel
   */
  private getMaxRetriesForChannel(channel: NotificationChannel): number {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return 3;
      case NotificationChannel.SLACK:
        return 5;
      case NotificationChannel.SMS:
        return 3;
      default:
        return 2;
    }
  }

  /**
   * Process individual delivery task
   */
  private async processDeliveryTask(task: DeliveryTask): Promise<void> {
    const delivery: NotificationDelivery = {
      id: crypto.randomUUID(),
      alertId: task.alertId,
      channel: task.channel,
      recipient: task.recipient,
      status: 'pending',
      retryCount: task.retryCount,
      maxRetries: task.maxRetries,
    };

    try {
      // Record delivery attempt
      await this.recordDeliveryAttempt(delivery);

      // Send via appropriate channel
      switch (task.channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmailNotification(task);
          break;
        case NotificationChannel.SLACK:
          await this.sendSlackNotification(task);
          break;
        case NotificationChannel.SMS:
          await this.sendSMSNotification(task);
          break;
        default:
          throw new Error(`Unsupported notification channel: ${task.channel}`);
      }

      // Mark as sent
      await this.updateDeliveryStatus(delivery.id, 'sent', {
        sentAt: new Date(),
      });
    } catch (error) {
      console.error(`Failed to send ${task.channel} notification:`, error);

      await this.updateDeliveryStatus(delivery.id, 'failed', {
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      });

      // Schedule retry if within retry limit
      if (task.retryCount < task.maxRetries) {
        await this.scheduleRetry(task);
      }
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(task: DeliveryTask): Promise<void> {
    const template = await this.getAlertEmailTemplate(task.alert.priority);

    const variables = {
      alert_title: task.alert.title,
      alert_message: task.alert.message,
      alert_priority: task.alert.priority.toUpperCase(),
      alert_type: task.alert.type,
      alert_timestamp: task.alert.timestamp.toISOString(),
      alert_id: task.alert.id,
      admin_dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts`,
      acknowledge_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts/${task.alert.id}/acknowledge`,
      current_year: new Date().getFullYear().toString(),
    };

    const emailData = {
      to: task.recipient,
      subject: this.processTemplate(template.subject, variables),
      html: this.processTemplate(template.html_template, variables),
      text: this.processTemplate(template.text_template, variables),
      from: process.env.ADMIN_EMAIL_FROM || 'admin@wedsync.com',
      template_variables: variables,
    };

    await this.emailService.sendEmail(emailData as any);
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(task: DeliveryTask): Promise<void> {
    const slackWebhookUrl =
      process.env.SLACK_WEBHOOK_URL || task.config.settings.slackWebhookUrl;

    if (!slackWebhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const color = this.getSlackColorForPriority(task.alert.priority);
    const urgencyEmoji = this.getUrgencyEmojiForPriority(task.alert.priority);

    const slackMessage = {
      channel: task.recipient,
      username: 'WedSync Admin Alerts',
      icon_emoji: ':warning:',
      attachments: [
        {
          color: color,
          title: `${urgencyEmoji} ${task.alert.title}`,
          text: task.alert.message,
          fields: [
            {
              title: 'Priority',
              value: task.alert.priority.toUpperCase(),
              short: true,
            },
            {
              title: 'Type',
              value: task.alert.type,
              short: true,
            },
            {
              title: 'Time',
              value: task.alert.timestamp.toLocaleString(),
              short: true,
            },
          ],
          actions: [
            {
              type: 'button',
              text: 'View Alert',
              url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts/${task.alert.id}`,
            },
            {
              type: 'button',
              text: 'Acknowledge',
              url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts/${task.alert.id}/acknowledge`,
            },
          ],
          timestamp: Math.floor(task.alert.timestamp.getTime() / 1000),
        },
      ],
    };

    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      throw new Error(
        `Slack API error: ${response.status} ${response.statusText}`,
      );
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(task: DeliveryTask): Promise<void> {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const urgencyEmoji = this.getUrgencyEmojiForPriority(task.alert.priority);
    const smsMessage = `${urgencyEmoji} WedSync Alert (${task.alert.priority.toUpperCase()})\n\n${task.alert.title}\n\n${task.alert.message}\n\nView: ${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts/${task.alert.id}`;

    // Truncate message to SMS limit (160 characters for single SMS, 1600 for concatenated)
    const truncatedMessage =
      smsMessage.length > 1500
        ? smsMessage.substring(0, 1497) + '...'
        : smsMessage;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString(
      'base64',
    );

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: task.recipient,
        From: twilioFromNumber,
        Body: truncatedMessage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Twilio API error: ${response.status} ${errorData}`);
    }
  }

  /**
   * Get Slack color for priority
   */
  private getSlackColorForPriority(priority: AlertPriority): string {
    switch (priority) {
      case AlertPriority.CRITICAL:
        return 'danger';
      case AlertPriority.HIGH:
        return 'warning';
      case AlertPriority.MEDIUM:
        return '#36a64f'; // green
      case AlertPriority.LOW:
        return '#439FE0'; // blue
      case AlertPriority.INFO:
        return 'good';
      default:
        return '#808080'; // grey
    }
  }

  /**
   * Get urgency emoji for priority
   */
  private getUrgencyEmojiForPriority(priority: AlertPriority): string {
    switch (priority) {
      case AlertPriority.CRITICAL:
        return '🚨';
      case AlertPriority.HIGH:
        return '⚠️';
      case AlertPriority.MEDIUM:
        return '🔔';
      case AlertPriority.LOW:
        return '💡';
      case AlertPriority.INFO:
        return 'ℹ️';
      default:
        return '📢';
    }
  }

  /**
   * Get alert email template
   */
  private async getAlertEmailTemplate(priority: AlertPriority): Promise<any> {
    // Try to get from database first
    const { data: template } = await this.supabase
      .from('alert_email_templates')
      .select('*')
      .eq('priority', priority)
      .eq('is_active', true)
      .single();

    if (template) {
      return template;
    }

    // Fallback to default templates
    return this.getDefaultAlertEmailTemplate(priority);
  }

  /**
   * Default alert email templates
   */
  private getDefaultAlertEmailTemplate(priority: AlertPriority): any {
    const baseTemplate = {
      subject: `🚨 WedSync Alert ({alert_priority}): {alert_title}`,
      html_template: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <div style="background: {priority_color}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: white;">{urgency_emoji} WedSync Admin Alert</h2>
                <p style="margin: 5px 0 0 0; color: white; opacity: 0.9;">Priority: {alert_priority}</p>
              </div>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>{alert_title}</h3>
                <p>{alert_message}</p>
                
                <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                  <p style="margin: 0; font-size: 14px;"><strong>Alert Type:</strong> {alert_type}</p>
                  <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Time:</strong> {alert_timestamp}</p>
                  <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Alert ID:</strong> {alert_id}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{acknowledge_url}" 
                     style="background: #007bff; color: white; padding: 12px 30px; 
                            text-decoration: none; border-radius: 5px; font-weight: bold; margin: 5px;">
                    Acknowledge Alert
                  </a>
                  <a href="{admin_dashboard_url}" 
                     style="background: #28a745; color: white; padding: 12px 30px; 
                            text-decoration: none; border-radius: 5px; font-weight: bold; margin: 5px;">
                    View Dashboard
                  </a>
                </div>
              </div>
              
              <p style="font-size: 12px; color: #666;">
                This is an automated alert from WedSync Admin System.
                © {current_year} WedSync. All rights reserved.
              </p>
            </div>
          </body>
        </html>
      `,
      text_template: `
        WedSync Admin Alert - {alert_priority}
        
        {alert_title}
        
        {alert_message}
        
        Alert Details:
        - Type: {alert_type}
        - Time: {alert_timestamp}
        - Alert ID: {alert_id}
        
        Actions:
        - Acknowledge: {acknowledge_url}
        - Dashboard: {admin_dashboard_url}
        
        © {current_year} WedSync. All rights reserved.
      `,
    };

    // Add priority-specific styling
    let priorityColor = '#007bff';
    let urgencyEmoji = '📢';

    switch (priority) {
      case AlertPriority.CRITICAL:
        priorityColor = '#dc3545';
        urgencyEmoji = '🚨';
        break;
      case AlertPriority.HIGH:
        priorityColor = '#fd7e14';
        urgencyEmoji = '⚠️';
        break;
      case AlertPriority.MEDIUM:
        priorityColor = '#ffc107';
        urgencyEmoji = '🔔';
        break;
      case AlertPriority.LOW:
        priorityColor = '#28a745';
        urgencyEmoji = '💡';
        break;
      case AlertPriority.INFO:
        priorityColor = '#17a2b8';
        urgencyEmoji = 'ℹ️';
        break;
    }

    return {
      ...baseTemplate,
      priority_color: priorityColor,
      urgency_emoji: urgencyEmoji,
    };
  }

  /**
   * Process template variables
   */
  private processTemplate(
    template: string,
    variables: Record<string, string>,
  ): string {
    let processed = template;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processed = processed.replace(regex, value || '');
    });

    return processed;
  }

  /**
   * Record delivery attempt in database
   */
  private async recordDeliveryAttempt(
    delivery: NotificationDelivery,
  ): Promise<void> {
    await this.supabase.from('alert_notification_deliveries').insert({
      id: delivery.id,
      alert_id: delivery.alertId,
      channel: delivery.channel,
      recipient: delivery.recipient,
      status: delivery.status,
      retry_count: delivery.retryCount,
      max_retries: delivery.maxRetries,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Update delivery status
   */
  private async updateDeliveryStatus(
    deliveryId: string,
    status: NotificationDelivery['status'],
    updates: Partial<NotificationDelivery>,
  ): Promise<void> {
    await this.supabase
      .from('alert_notification_deliveries')
      .update({
        status,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);
  }

  /**
   * Schedule retry for failed delivery
   */
  private async scheduleRetry(task: DeliveryTask): Promise<void> {
    // Exponential backoff: 2^retryCount minutes
    const delayMinutes = Math.pow(2, task.retryCount);
    const retryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

    await this.supabase.from('alert_notification_retries').insert({
      id: crypto.randomUUID(),
      alert_id: task.alertId,
      channel: task.channel,
      recipient: task.recipient,
      retry_count: task.retryCount + 1,
      retry_at: retryAt.toISOString(),
      task_data: JSON.stringify(task),
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Log notification event
   */
  private async logNotificationEvent(
    alertId: string,
    eventType: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.supabase.from('alert_notification_logs').insert({
        id: crypto.randomUUID(),
        alert_id: alertId,
        event_type: eventType,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log notification event:', error);
      // Don't throw - logging failures shouldn't break notifications
    }
  }

  /**
   * Process pending retries (called by background job)
   */
  async processRetries(): Promise<void> {
    const { data: retries } = await this.supabase
      .from('alert_notification_retries')
      .select('*')
      .lte('retry_at', new Date().toISOString())
      .eq('processed', false)
      .limit(100);

    if (!retries?.length) return;

    for (const retry of retries) {
      try {
        const task: DeliveryTask = JSON.parse(retry.task_data);
        task.retryCount = retry.retry_count;

        await this.processDeliveryTask(task);

        // Mark retry as processed
        await this.supabase
          .from('alert_notification_retries')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('id', retry.id);
      } catch (error) {
        console.error(`Failed to process retry ${retry.id}:`, error);
      }
    }
  }

  /**
   * Get notification delivery statistics
   */
  async getDeliveryStats(dateFrom?: string, dateTo?: string) {
    let query = this.supabase
      .from('alert_notification_deliveries')
      .select('channel, status, created_at');

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data } = await query;

    const stats =
      data?.reduce(
        (acc, delivery) => {
          acc.total = (acc.total || 0) + 1;
          acc[delivery.status] = (acc[delivery.status] || 0) + 1;

          acc.byChannel = acc.byChannel || {};
          acc.byChannel[delivery.channel] =
            acc.byChannel[delivery.channel] || {};
          acc.byChannel[delivery.channel][delivery.status] =
            (acc.byChannel[delivery.channel][delivery.status] || 0) + 1;

          return acc;
        },
        {} as Record<string, any>,
      ) || {};

    return stats;
  }
}

// Helper interfaces
interface DeliveryTask {
  alertId: string;
  alert: Alert;
  channel: NotificationChannel;
  recipient: string;
  config: NotificationConfig;
  retryCount: number;
  maxRetries: number;
}
