import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ChannelEvent } from '../../integrations/websocket/integration-orchestrator';

export interface NotificationConfig {
  channelName: string;
  enableWhatsApp: boolean;
  enableSlack: boolean;
  enableEmail: boolean;
  enableSMS: boolean;
  whatsAppSettings: WhatsAppSettings;
  slackSettings: SlackSettings;
  emailSettings: EmailSettings;
  smsSettings: SMSSettings;
  filterRules: NotificationFilterRule[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface WhatsAppSettings {
  businessAccountId: string;
  phoneNumberId: string;
  accessToken: string;
  recipients: Contact[];
  templateName?: string;
  customMessage?: string;
}

export interface SlackSettings {
  webhookUrl: string;
  channel: string;
  username?: string;
  iconEmoji?: string;
  mentions?: string[];
  threadKey?: string;
}

export interface EmailSettings {
  fromAddress: string;
  recipients: EmailRecipient[];
  subject: string;
  templateId?: string;
  customContent?: string;
  priority: 'low' | 'normal' | 'high';
}

export interface SMSSettings {
  fromNumber: string;
  recipients: Contact[];
  message: string;
  shortLinks: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'couple' | 'photographer' | 'venue' | 'coordinator' | 'vendor';
  preferences: NotificationPreferences;
}

export interface SlackChannel {
  id: string;
  name: string;
  webhookUrl: string;
  teamId: string;
}

export interface EmailRecipient {
  id: string;
  name: string;
  email: string;
  role: string;
  preferences: NotificationPreferences;
}

export interface NotificationPreferences {
  whatsapp: boolean;
  slack: boolean;
  email: boolean;
  sms: boolean;
  urgentOnly: boolean;
  businessHoursOnly: boolean;
  timezone: string;
}

export interface NotificationFilterRule {
  eventType: string;
  condition: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'matches';
  value: string;
  action: 'include' | 'exclude' | 'upgrade_priority' | 'downgrade_priority';
}

export interface NotificationDeliveryResult {
  channel: 'whatsapp' | 'slack' | 'email' | 'sms';
  success: boolean;
  messageId?: string;
  error?: string;
  deliveryTime: number;
  recipientCount: number;
}

const notificationConfigSchema = z.object({
  channelName: z.string(),
  enableWhatsApp: z.boolean(),
  enableSlack: z.boolean(),
  enableEmail: z.boolean(),
  enableSMS: z.boolean(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
});

export class NotificationOrchestrator {
  private supabaseClient;
  private channelConfigs = new Map<string, NotificationConfig>();
  private deliveryQueue: NotificationJob[] = [];
  private isProcessing = false;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseClient = createClient(supabaseUrl, supabaseKey);
    this.loadChannelConfigs();
    this.startDeliveryProcessor();
  }

  async configureChannelNotifications(
    channelName: string,
    config: NotificationConfig,
  ): Promise<void> {
    try {
      // Validate configuration
      notificationConfigSchema.parse(config);

      // Store configuration in database
      await this.supabaseClient.from('channel_notification_configs').upsert({
        channel_name: channelName,
        config: config,
        updated_at: new Date().toISOString(),
      });

      // Update in-memory cache
      this.channelConfigs.set(channelName, config);

      console.log(
        `Notification configuration updated for channel: ${channelName}`,
      );
    } catch (error) {
      console.error(
        `Failed to configure notifications for ${channelName}:`,
        error,
      );
      throw error;
    }
  }

  async routeChannelEventToNotifications(event: ChannelEvent): Promise<void> {
    try {
      const config = this.getChannelConfig(event.channelName);
      if (!config) {
        console.log(
          `No notification config found for channel: ${event.channelName}`,
        );
        return;
      }

      // Apply filter rules
      if (!this.shouldNotify(event, config.filterRules)) {
        console.log(`Event filtered out for channel: ${event.channelName}`);
        return;
      }

      // Determine notification priority
      const priority = this.calculateNotificationPriority(event, config);

      // Queue notifications for each enabled channel
      const jobs: NotificationJob[] = [];

      if (config.enableWhatsApp) {
        jobs.push({
          id: `whatsapp-${event.id}`,
          type: 'whatsapp',
          event,
          config: config.whatsAppSettings,
          priority,
          createdAt: new Date(),
          attempts: 0,
        });
      }

      if (config.enableSlack) {
        jobs.push({
          id: `slack-${event.id}`,
          type: 'slack',
          event,
          config: config.slackSettings,
          priority,
          createdAt: new Date(),
          attempts: 0,
        });
      }

      if (config.enableEmail) {
        jobs.push({
          id: `email-${event.id}`,
          type: 'email',
          event,
          config: config.emailSettings,
          priority,
          createdAt: new Date(),
          attempts: 0,
        });
      }

      if (config.enableSMS) {
        jobs.push({
          id: `sms-${event.id}`,
          type: 'sms',
          event,
          config: config.smsSettings,
          priority,
          createdAt: new Date(),
          attempts: 0,
        });
      }

      // Add jobs to delivery queue
      this.deliveryQueue.push(...jobs);
      this.sortDeliveryQueue();
    } catch (error) {
      console.error('Failed to route channel event to notifications:', error);
      throw error;
    }
  }

  async deliverWhatsAppNotification(
    event: ChannelEvent,
    recipients: Contact[],
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();

    try {
      const config = this.getChannelConfig(event.channelName);
      if (!config || !config.whatsAppSettings) {
        throw new Error('WhatsApp configuration not found');
      }

      const message = this.generateWhatsAppMessage(event);
      const deliveredCount = 0;
      const messageIds: string[] = [];

      for (const recipient of recipients) {
        if (!recipient.preferences.whatsapp) continue;

        try {
          const messageId = await this.sendWhatsAppMessage(
            recipient.phone,
            message,
            config.whatsAppSettings,
          );
          messageIds.push(messageId);
        } catch (error) {
          console.error(
            `Failed to send WhatsApp to ${recipient.phone}:`,
            error,
          );
        }
      }

      const deliveryTime = Date.now() - startTime;

      const result: NotificationDeliveryResult = {
        channel: 'whatsapp',
        success: messageIds.length > 0,
        messageId: messageIds.join(','),
        deliveryTime,
        recipientCount: messageIds.length,
      };

      await this.logDeliveryResult(event, result);
      return result;
    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      const result: NotificationDeliveryResult = {
        channel: 'whatsapp',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryTime,
        recipientCount: 0,
      };

      await this.logDeliveryResult(event, result);
      return result;
    }
  }

  async deliverSlackNotification(
    event: ChannelEvent,
    channels: SlackChannel[],
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();

    try {
      const message = this.generateSlackMessage(event);
      const deliveredCount = 0;
      const messageIds: string[] = [];

      for (const channel of channels) {
        try {
          const response = await fetch(channel.webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
          });

          if (response.ok) {
            messageIds.push(`${channel.name}-${Date.now()}`);
          }
        } catch (error) {
          console.error(
            `Failed to send Slack message to ${channel.name}:`,
            error,
          );
        }
      }

      const deliveryTime = Date.now() - startTime;

      const result: NotificationDeliveryResult = {
        channel: 'slack',
        success: messageIds.length > 0,
        messageId: messageIds.join(','),
        deliveryTime,
        recipientCount: messageIds.length,
      };

      await this.logDeliveryResult(event, result);
      return result;
    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      const result: NotificationDeliveryResult = {
        channel: 'slack',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryTime,
        recipientCount: 0,
      };

      await this.logDeliveryResult(event, result);
      return result;
    }
  }

  async deliverEmailNotification(
    event: ChannelEvent,
    recipients: EmailRecipient[],
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();

    try {
      const config = this.getChannelConfig(event.channelName);
      if (!config || !config.emailSettings) {
        throw new Error('Email configuration not found');
      }

      const emailContent = this.generateEmailContent(
        event,
        config.emailSettings,
      );
      const deliveredCount = 0;
      const messageIds: string[] = [];

      for (const recipient of recipients) {
        if (!recipient.preferences.email) continue;

        try {
          const messageId = await this.sendEmail(
            recipient.email,
            emailContent.subject,
            emailContent.html,
            emailContent.text,
            config.emailSettings,
          );
          messageIds.push(messageId);
        } catch (error) {
          console.error(`Failed to send email to ${recipient.email}:`, error);
        }
      }

      const deliveryTime = Date.now() - startTime;

      const result: NotificationDeliveryResult = {
        channel: 'email',
        success: messageIds.length > 0,
        messageId: messageIds.join(','),
        deliveryTime,
        recipientCount: messageIds.length,
      };

      await this.logDeliveryResult(event, result);
      return result;
    } catch (error) {
      const deliveryTime = Date.now() - startTime;
      const result: NotificationDeliveryResult = {
        channel: 'email',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deliveryTime,
        recipientCount: 0,
      };

      await this.logDeliveryResult(event, result);
      return result;
    }
  }

  private getChannelConfig(
    channelName: string,
  ): NotificationConfig | undefined {
    // Try exact match first
    if (this.channelConfigs.has(channelName)) {
      return this.channelConfigs.get(channelName);
    }

    // Try pattern matching
    for (const [pattern, config] of this.channelConfigs.entries()) {
      if (this.matchesChannelPattern(channelName, pattern)) {
        return config;
      }
    }

    return undefined;
  }

  private matchesChannelPattern(channelName: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\{[^}]+\}/g, '[^:]+');

    return new RegExp(`^${regexPattern}$`).test(channelName);
  }

  private shouldNotify(
    event: ChannelEvent,
    filterRules: NotificationFilterRule[],
  ): boolean {
    let shouldNotify = true;

    for (const rule of filterRules) {
      const matches = this.evaluateFilterRule(event, rule);

      if (matches && rule.action === 'exclude') {
        shouldNotify = false;
      } else if (matches && rule.action === 'include') {
        shouldNotify = true;
      }
    }

    return shouldNotify;
  }

  private evaluateFilterRule(
    event: ChannelEvent,
    rule: NotificationFilterRule,
  ): boolean {
    const value = event.eventType;

    switch (rule.condition) {
      case 'equals':
        return value === rule.value;
      case 'contains':
        return value.includes(rule.value);
      case 'startsWith':
        return value.startsWith(rule.value);
      case 'endsWith':
        return value.endsWith(rule.value);
      case 'matches':
        return new RegExp(rule.value).test(value);
      default:
        return false;
    }
  }

  private calculateNotificationPriority(
    event: ChannelEvent,
    config: NotificationConfig,
  ): 'low' | 'normal' | 'high' | 'urgent' {
    let priority = config.priority;

    // Upgrade priority for urgent event types
    const urgentEventTypes = [
      'payment_failed',
      'booking_cancelled',
      'emergency_contact',
    ];
    if (urgentEventTypes.includes(event.eventType)) {
      priority = 'urgent';
    }

    // Upgrade priority for wedding day events
    const isWeddingDay = this.isWeddingDay(event);
    if (isWeddingDay && priority === 'normal') {
      priority = 'high';
    }

    return priority;
  }

  private isWeddingDay(event: ChannelEvent): boolean {
    if (!event.weddingId) return false;

    const today = new Date().toISOString().split('T')[0];
    const weddingDate = event.payload.weddingDate || event.payload.eventDate;

    return weddingDate === today;
  }

  private generateWhatsAppMessage(event: ChannelEvent): string {
    const coupleName = event.payload.coupleName || 'Couple';
    const eventType = event.eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    switch (event.eventType) {
      case 'timeline_updated':
        return `🕐 *Timeline Update* for ${coupleName}\n\nCeremony time: ${event.payload.ceremonyTime}\nReception time: ${event.payload.receptionTime}\n\nPlease update your schedule accordingly.`;

      case 'guest_count_changed':
        return `👥 *Guest Count Update* for ${coupleName}\n\nNew guest count: ${event.payload.guestCount}\n\nPlease adjust your arrangements.`;

      case 'venue_changed':
        return `📍 *Venue Change* for ${coupleName}\n\nNew venue: ${event.payload.venueName}\nAddress: ${event.payload.venueAddress}\n\nPlease update your location details.`;

      case 'payment_received':
        return `💰 *Payment Received* for ${coupleName}\n\nAmount: ${event.payload.amount}\nPayment method: ${event.payload.paymentMethod}\n\nThank you!`;

      case 'booking_confirmed':
        return `✅ *Booking Confirmed* for ${coupleName}\n\nDate: ${event.payload.weddingDate}\nVenue: ${event.payload.venueName}\n\nLooking forward to your special day!`;

      default:
        return `📋 *${eventType}* for ${coupleName}\n\nPlease check your WedSync dashboard for details.`;
    }
  }

  private generateSlackMessage(event: ChannelEvent): any {
    const coupleName = event.payload.coupleName || 'Unknown Couple';
    const eventType = event.eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return {
      text: `🎉 ${eventType} for *${coupleName}*`,
      attachments: [
        {
          color: this.getSlackColor(event.eventType),
          fields: [
            {
              title: 'Wedding ID',
              value: event.weddingId || 'N/A',
              short: true,
            },
            {
              title: 'Event Type',
              value: eventType,
              short: true,
            },
            {
              title: 'Timestamp',
              value: new Date(event.timestamp).toLocaleString(),
              short: true,
            },
            {
              title: 'Channel',
              value: event.channelName,
              short: true,
            },
          ],
          footer: 'WedSync Integration',
          ts: Math.floor(new Date(event.timestamp).getTime() / 1000),
        },
      ],
    };
  }

  private getSlackColor(eventType: string): string {
    const colorMap: Record<string, string> = {
      payment_received: 'good',
      booking_confirmed: 'good',
      booking_cancelled: 'danger',
      payment_failed: 'danger',
      timeline_updated: 'warning',
      guest_count_changed: 'warning',
    };

    return colorMap[eventType] || '#36C5F0';
  }

  private generateEmailContent(
    event: ChannelEvent,
    settings: EmailSettings,
  ): {
    subject: string;
    html: string;
    text: string;
  } {
    const coupleName = event.payload.coupleName || 'Unknown Couple';
    const eventType = event.eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const subject = settings.customContent
      ? settings.subject
      : `WedSync: ${eventType} for ${coupleName}`;

    const html = `
      <html>
        <head><title>${subject}</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">${eventType}</h2>
            
            <div style="background: white; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
              <h3 style="margin-top: 0;">Wedding Details</h3>
              <p><strong>Couple:</strong> ${coupleName}</p>
              <p><strong>Wedding ID:</strong> ${event.weddingId || 'N/A'}</p>
              <p><strong>Event Type:</strong> ${eventType}</p>
              <p><strong>Timestamp:</strong> ${new Date(event.timestamp).toLocaleString()}</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 4px;">
              <h3 style="margin-top: 0;">Event Data</h3>
              <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(event.payload, null, 2)}</pre>
            </div>
            
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
              This notification was sent from WedSync. Please log into your dashboard for complete details.
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
WedSync: ${eventType}

Couple: ${coupleName}
Wedding ID: ${event.weddingId || 'N/A'}
Event Type: ${eventType}
Timestamp: ${new Date(event.timestamp).toLocaleString()}

Event Data:
${JSON.stringify(event.payload, null, 2)}

This notification was sent from WedSync. Please log into your dashboard for complete details.
    `;

    return { subject, html, text };
  }

  private async sendWhatsAppMessage(
    phoneNumber: string,
    message: string,
    settings: WhatsAppSettings,
  ): Promise<string> {
    const url = `https://graph.facebook.com/v18.0/${settings.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: message,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.messages?.[0]?.id || 'unknown';
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
    settings: EmailSettings,
  ): Promise<string> {
    // Using Resend API (as per WedSync tech stack)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: settings.fromAddress,
        to,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id || 'unknown';
  }

  private async loadChannelConfigs(): Promise<void> {
    try {
      const { data } = await this.supabaseClient
        .from('channel_notification_configs')
        .select('*');

      if (data) {
        for (const row of data) {
          this.channelConfigs.set(row.channel_name, row.config);
        }
      }
    } catch (error) {
      console.error(
        'Failed to load channel notification configurations:',
        error,
      );
    }
  }

  private startDeliveryProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing && this.deliveryQueue.length > 0) {
        this.processDeliveryQueue();
      }
    }, 1000); // Check every second
  }

  private async processDeliveryQueue(): Promise<void> {
    this.isProcessing = true;

    try {
      while (this.deliveryQueue.length > 0) {
        const job = this.deliveryQueue.shift();
        if (!job) continue;

        try {
          await this.processNotificationJob(job);
        } catch (error) {
          console.error(`Failed to process notification job ${job.id}:`, error);

          // Retry logic
          if (job.attempts < 3) {
            job.attempts++;
            job.nextRetryAt = new Date(
              Date.now() + Math.pow(2, job.attempts) * 1000,
            );
            this.deliveryQueue.push(job);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processNotificationJob(job: NotificationJob): Promise<void> {
    switch (job.type) {
      case 'whatsapp':
        const whatsAppConfig = job.config as WhatsAppSettings;
        await this.deliverWhatsAppNotification(
          job.event,
          whatsAppConfig.recipients,
        );
        break;

      case 'slack':
        const slackConfig = job.config as SlackSettings;
        const slackChannels: SlackChannel[] = [
          {
            id: 'default',
            name: slackConfig.channel,
            webhookUrl: slackConfig.webhookUrl,
            teamId: 'default',
          },
        ];
        await this.deliverSlackNotification(job.event, slackChannels);
        break;

      case 'email':
        const emailConfig = job.config as EmailSettings;
        await this.deliverEmailNotification(job.event, emailConfig.recipients);
        break;

      case 'sms':
        // SMS delivery would be implemented here
        console.log('SMS delivery not implemented yet');
        break;
    }
  }

  private sortDeliveryQueue(): void {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };

    this.deliveryQueue.sort((a, b) => {
      // First sort by priority
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by creation time
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  private async logDeliveryResult(
    event: ChannelEvent,
    result: NotificationDeliveryResult,
  ): Promise<void> {
    try {
      await this.supabaseClient.from('notification_deliveries').insert({
        event_id: event.id,
        channel_name: event.channelName,
        notification_channel: result.channel,
        success: result.success,
        message_id: result.messageId,
        error_message: result.error,
        delivery_time_ms: result.deliveryTime,
        recipient_count: result.recipientCount,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log notification delivery result:', error);
    }
  }
}

interface NotificationJob {
  id: string;
  type: 'whatsapp' | 'slack' | 'email' | 'sms';
  event: ChannelEvent;
  config: WhatsAppSettings | SlackSettings | EmailSettings | SMSSettings;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  attempts: number;
  nextRetryAt?: Date;
}
