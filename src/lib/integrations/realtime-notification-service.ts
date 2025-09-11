// WS-202: Realtime Notification Service
// Multi-channel notification orchestration for wedding coordination

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { Twilio } from 'twilio';
import { WebClient as SlackWebClient } from '@slack/web-api';
import {
  RealtimeEventType,
  NotificationRecipient,
  NotificationChannel,
  NotificationPreferences,
  SlackMessage,
  FormResponseData,
  JourneyProgressData,
  NotificationDeliveryError,
  RealtimeIntegrationError,
  EventPriority,
} from '@/types/realtime-integration';

export class RealtimeNotificationService {
  private supabase: SupabaseClient;
  private resend: Resend;
  private twilio: Twilio;
  private slack: SlackWebClient;

  // Notification rate limiting
  private readonly maxNotificationsPerHour = 10;
  private notificationCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(
    supabaseClient: SupabaseClient,
    resendApiKey: string,
    twilioCredentials: {
      accountSid: string;
      authToken: string;
      phoneNumber: string;
    },
    slackBotToken: string,
  ) {
    this.supabase = supabaseClient;
    this.resend = new Resend(resendApiKey);
    this.twilio = new Twilio(
      twilioCredentials.accountSid,
      twilioCredentials.authToken,
    );
    this.slack = new SlackWebClient(slackBotToken);
  }

  /**
   * Multi-channel notification orchestration
   * Routes notifications based on recipient preferences and event priority
   */
  async sendRealtimeNotification(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipients: NotificationRecipient[],
  ): Promise<void> {
    if (!recipients || recipients.length === 0) {
      return;
    }

    try {
      // Filter active recipients
      const activeRecipients = recipients.filter(
        (r) => r.preferences?.enabled !== false,
      );

      if (activeRecipients.length === 0) {
        return;
      }

      // Determine event priority and urgency
      const priority = this.determineEventPriority(eventType, eventData);
      const isWeddingDay = this.isWeddingDayEvent(eventData);
      const isEmergency = this.isEmergencyEvent(eventType, eventData);

      // Group recipients by their preferred channels
      const channelGroups = this.groupRecipientsByChannels(
        activeRecipients,
        priority,
        isWeddingDay,
        isEmergency,
      );

      // Send notifications across all channels in parallel
      const notificationPromises: Promise<any>[] = [];

      if (channelGroups.email.length > 0) {
        notificationPromises.push(
          this.sendEmailNotifications(
            eventType,
            eventData,
            channelGroups.email,
            priority,
          ),
        );
      }

      if (
        channelGroups.sms.length > 0 &&
        (priority === 'critical' || priority === 'high')
      ) {
        notificationPromises.push(
          this.sendSMSNotifications(
            eventType,
            eventData,
            channelGroups.sms,
            priority,
          ),
        );
      }

      if (channelGroups.slack.length > 0) {
        notificationPromises.push(
          this.sendSlackNotifications(
            eventType,
            eventData,
            channelGroups.slack,
            priority,
          ),
        );
      }

      if (channelGroups.inApp.length > 0) {
        notificationPromises.push(
          this.sendInAppNotifications(
            eventType,
            eventData,
            channelGroups.inApp,
            priority,
          ),
        );
      }

      // Wait for all notifications to complete
      const results = await Promise.allSettled(notificationPromises);

      // Log notification results
      results.forEach((result, index) => {
        const channels = ['email', 'sms', 'slack', 'in-app'];
        if (result.status === 'rejected') {
          console.error(
            `${channels[index]} notification failed:`,
            result.reason,
          );
          this.logNotificationError(eventType, channels[index], result.reason);
        }
      });

      // Log successful notification orchestration
      await this.logNotificationSuccess(
        eventType,
        activeRecipients.length,
        results,
      );
    } catch (error) {
      console.error('Realtime notification orchestration error:', error);
      await this.logNotificationError(eventType, 'orchestration', error);
    }
  }

  /**
   * Send email notifications for realtime events
   */
  async sendEmailNotifications(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipients: NotificationRecipient[],
    priority: EventPriority,
  ): Promise<void> {
    if (recipients.length === 0) return;

    try {
      const emailTemplate = this.getEmailTemplate(eventType);
      const subject = this.getEmailSubject(eventType, eventData, priority);

      // Send individual emails (Resend handles batching internally)
      const emailPromises = recipients.map(async (recipient) => {
        // Check rate limiting
        if (
          !this.isWeddingDayOverride(eventData) &&
          !this.canSendNotification(recipient.id)
        ) {
          console.log(`Rate limit reached for recipient ${recipient.id}`);
          return;
        }

        try {
          await this.resend.emails.send({
            from: 'WedSync Notifications <notifications@wedsync.com>',
            to: [recipient.email],
            subject,
            html: this.renderEmailTemplate(emailTemplate, {
              ...eventData,
              recipient_name: recipient.name,
              notification_type: eventType,
              priority,
              wedding_date: eventData.wedding_date || eventData.weddingDate,
              unsubscribe_url: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe/${recipient.id}`,
            }),
          });

          // Update rate limiting
          this.updateNotificationCount(recipient.id);

          // Log successful email delivery
          await this.logChannelDelivery(
            'email',
            recipient.id,
            eventType,
            'success',
          );
        } catch (error) {
          console.error(`Email delivery failed for ${recipient.email}:`, error);
          await this.logChannelDelivery(
            'email',
            recipient.id,
            eventType,
            'failed',
            error.message,
          );
        }
      });

      await Promise.allSettled(emailPromises);
    } catch (error) {
      console.error('Email notification batch error:', error);
      throw new NotificationDeliveryError(
        'Failed to send email notifications',
        'email',
        recipients.map((r) => r.email).join(', '),
        { eventType, error: error.message },
      );
    }
  }

  /**
   * Send SMS notifications for urgent events
   */
  async sendSMSNotifications(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipients: NotificationRecipient[],
    priority: EventPriority,
  ): Promise<void> {
    if (recipients.length === 0) return;

    try {
      const smsMessage = this.getSMSMessage(eventType, eventData);

      const smsPromises = recipients.map(async (recipient) => {
        if (!recipient.phone) {
          console.log(`No phone number for recipient ${recipient.id}`);
          return;
        }

        try {
          await this.twilio.messages.create({
            body: smsMessage,
            from: process.env.TWILIO_PHONE_NUMBER!,
            to: recipient.phone,
          });

          await this.logChannelDelivery(
            'sms',
            recipient.id,
            eventType,
            'success',
          );
        } catch (error) {
          console.error(`SMS delivery failed for ${recipient.phone}:`, error);
          await this.logChannelDelivery(
            'sms',
            recipient.id,
            eventType,
            'failed',
            error.message,
          );
        }
      });

      await Promise.allSettled(smsPromises);
    } catch (error) {
      console.error('SMS notification batch error:', error);
      throw new NotificationDeliveryError(
        'Failed to send SMS notifications',
        'sms',
        recipients
          .map((r) => r.phone)
          .filter(Boolean)
          .join(', '),
        { eventType, error: error.message },
      );
    }
  }

  /**
   * Send Slack notifications for supplier coordination
   */
  async sendSlackNotifications(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipients: NotificationRecipient[],
    priority: EventPriority,
  ): Promise<void> {
    if (recipients.length === 0) return;

    try {
      const slackMessage = this.formatSlackMessage(
        eventType,
        eventData,
        priority,
      );

      const slackPromises = recipients.map(async (recipient) => {
        const target = recipient.slackChannelId || recipient.slackUserId;

        if (!target) {
          console.log(`No Slack target for recipient ${recipient.id}`);
          return;
        }

        try {
          await this.slack.chat.postMessage({
            channel: target,
            text: slackMessage.text,
            blocks: slackMessage.blocks,
            attachments: slackMessage.attachments,
          });

          await this.logChannelDelivery(
            'slack',
            recipient.id,
            eventType,
            'success',
          );
        } catch (error) {
          console.error(`Slack delivery failed for ${target}:`, error);
          await this.logChannelDelivery(
            'slack',
            recipient.id,
            eventType,
            'failed',
            error.message,
          );
        }
      });

      await Promise.allSettled(slackPromises);
    } catch (error) {
      console.error('Slack notification batch error:', error);
      throw new NotificationDeliveryError(
        'Failed to send Slack notifications',
        'slack',
        recipients
          .map((r) => r.slackUserId || r.slackChannelId)
          .filter(Boolean)
          .join(', '),
        { eventType, error: error.message },
      );
    }
  }

  /**
   * Send in-app notifications using Supabase realtime
   */
  async sendInAppNotifications(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipients: NotificationRecipient[],
    priority: EventPriority,
  ): Promise<void> {
    if (recipients.length === 0) return;

    try {
      // Create notification records in database
      const notifications = recipients.map((recipient) => ({
        user_id: recipient.id,
        event_type: eventType,
        title: this.getNotificationTitle(eventType, eventData),
        message: this.getNotificationMessage(eventType, eventData),
        priority,
        data: eventData,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      const { error: insertError } = await this.supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        throw new RealtimeIntegrationError(
          'Failed to create in-app notifications',
          'DATABASE_ERROR',
          { error: insertError.message },
        );
      }

      // Send realtime updates to connected clients
      for (const recipient of recipients) {
        await this.supabase.channel(`notifications:${recipient.id}`).send({
          type: 'broadcast',
          event: 'new_notification',
          payload: {
            event_type: eventType,
            title: this.getNotificationTitle(eventType, eventData),
            message: this.getNotificationMessage(eventType, eventData),
            priority,
            data: eventData,
            timestamp: new Date().toISOString(),
          },
        });

        await this.logChannelDelivery(
          'in_app',
          recipient.id,
          eventType,
          'success',
        );
      }
    } catch (error) {
      console.error('In-app notification error:', error);
      throw new NotificationDeliveryError(
        'Failed to send in-app notifications',
        'in_app',
        recipients.map((r) => r.id).join(', '),
        { eventType, error: error.message },
      );
    }
  }

  /**
   * Wedding industry specific notifications
   */
  async notifyWeddingDateChange(
    weddingId: string,
    oldDate: string,
    newDate: string,
    affectedVendors: string[],
  ): Promise<void> {
    try {
      // Get all affected vendors and their notification preferences
      const { data: vendors, error } = await this.supabase
        .from('wedding_vendors')
        .select(
          `
          vendor_id,
          vendor_type,
          suppliers (
            id,
            business_name,
            email,
            phone,
            notification_preferences
          )
        `,
        )
        .eq('wedding_id', weddingId)
        .in('vendor_id', affectedVendors);

      if (error || !vendors) {
        throw new RealtimeIntegrationError(
          'Failed to fetch affected vendors',
          'DATABASE_ERROR',
          { weddingId, error: error?.message },
        );
      }

      // Transform to notification recipients
      const recipients: NotificationRecipient[] = vendors.map((vendor) => ({
        id: vendor.vendor_id,
        name: vendor.suppliers.business_name,
        email: vendor.suppliers.email,
        phone: vendor.suppliers.phone,
        channels: vendor.suppliers.notification_preferences
          ?.realtime_channels || ['email', 'in_app'],
        preferences: vendor.suppliers.notification_preferences || {
          enabled: true,
          channels: ['email'],
          weddingDayOverride: true,
          emergencyBypass: true,
        },
      }));

      // Send coordinated notifications to all vendors
      await this.sendRealtimeNotification(
        'WEDDING_DATE_CHANGE',
        {
          wedding_id: weddingId,
          old_date: oldDate,
          new_date: newDate,
          change_reason: 'Date updated by couple',
          action_required:
            'Please update your calendar and confirm availability',
          updated_at: new Date().toISOString(),
        },
        recipients,
      );
    } catch (error) {
      console.error('Wedding date change notification error:', error);
      throw error;
    }
  }

  async notifyFormResponse(
    supplierId: string,
    formResponse: FormResponseData,
  ): Promise<void> {
    try {
      // Get supplier notification preferences
      const { data: supplier, error } = await this.supabase
        .from('suppliers')
        .select('business_name, email, phone, notification_preferences')
        .eq('id', supplierId)
        .single();

      if (error || !supplier) {
        console.log(
          `Supplier ${supplierId} not found for form response notification`,
        );
        return;
      }

      const recipient: NotificationRecipient = {
        id: supplierId,
        name: supplier.business_name,
        email: supplier.email,
        phone: supplier.phone,
        channels: supplier.notification_preferences?.realtime_channels || [
          'email',
          'in_app',
        ],
        preferences: supplier.notification_preferences || {
          enabled: true,
          channels: ['email', 'in_app'],
          weddingDayOverride: true,
          emergencyBypass: true,
        },
      };

      await this.sendRealtimeNotification(
        'FORM_RESPONSE_RECEIVED',
        {
          supplier_name: supplier.business_name,
          client_name: formResponse.clientName,
          form_name: formResponse.formName,
          response_count: formResponse.questionCount,
          submitted_at: formResponse.submittedAt,
          form_id: formResponse.formId,
          response_id: formResponse.responseId,
        },
        [recipient],
      );
    } catch (error) {
      console.error('Form response notification error:', error);
      throw error;
    }
  }

  async notifyJourneyProgress(
    supplierId: string,
    journeyProgress: JourneyProgressData,
  ): Promise<void> {
    try {
      const { data: supplier, error } = await this.supabase
        .from('suppliers')
        .select('business_name, email, phone, notification_preferences')
        .eq('id', supplierId)
        .single();

      if (error || !supplier) {
        console.log(
          `Supplier ${supplierId} not found for journey progress notification`,
        );
        return;
      }

      const recipient: NotificationRecipient = {
        id: supplierId,
        name: supplier.business_name,
        email: supplier.email,
        phone: supplier.phone,
        channels: supplier.notification_preferences?.realtime_channels || [
          'email',
          'in_app',
        ],
        preferences: supplier.notification_preferences || {
          enabled: true,
          channels: ['email', 'in_app'],
          weddingDayOverride: true,
          emergencyBypass: true,
        },
      };

      await this.sendRealtimeNotification(
        'JOURNEY_MILESTONE_COMPLETED',
        {
          supplier_name: supplier.business_name,
          client_name: journeyProgress.clientName,
          milestone_name: journeyProgress.milestoneName,
          completion_percentage: journeyProgress.completionPercentage,
          completed_at: journeyProgress.completedAt,
          next_steps: journeyProgress.nextSteps,
        },
        [recipient],
      );
    } catch (error) {
      console.error('Journey progress notification error:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */

  private determineEventPriority(
    eventType: keyof RealtimeEventType,
    eventData: any,
  ): EventPriority {
    // Wedding day events are always critical
    if (this.isWeddingDayEvent(eventData)) {
      return 'critical';
    }

    // Emergency events are always critical
    if (this.isEmergencyEvent(eventType, eventData)) {
      return 'critical';
    }

    // Event-specific priority rules
    const priorityMap: Record<string, EventPriority> = {
      WEDDING_DATE_CHANGE: 'high',
      VENDOR_NO_SHOW: 'critical',
      PAYMENT_RECEIVED: 'high',
      PAYMENT_FAILED: 'high',
      FORM_RESPONSE_RECEIVED: 'normal',
      JOURNEY_MILESTONE_COMPLETED: 'normal',
      CLIENT_PROFILE_UPDATED: 'low',
    };

    return priorityMap[eventType] || 'normal';
  }

  private isWeddingDayEvent(eventData: any): boolean {
    if (!eventData.wedding_date && !eventData.weddingDate) return false;

    const weddingDate = new Date(
      eventData.wedding_date || eventData.weddingDate,
    );
    const today = new Date();

    // Consider it wedding day if within 24 hours
    const hoursDiff =
      Math.abs(weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  }

  private isEmergencyEvent(
    eventType: keyof RealtimeEventType,
    eventData: any,
  ): boolean {
    const emergencyEvents = [
      'VENDOR_NO_SHOW',
      'EMERGENCY_ALERT',
      'PAYMENT_FAILED',
    ];
    return emergencyEvents.includes(eventType);
  }

  private isWeddingDayOverride(eventData: any): boolean {
    return this.isWeddingDayEvent(eventData);
  }

  private groupRecipientsByChannels(
    recipients: NotificationRecipient[],
    priority: EventPriority,
    isWeddingDay: boolean,
    isEmergency: boolean,
  ) {
    const groups = {
      email: [] as NotificationRecipient[],
      sms: [] as NotificationRecipient[],
      slack: [] as NotificationRecipient[],
      inApp: [] as NotificationRecipient[],
    };

    recipients.forEach((recipient) => {
      let channels = recipient.channels;

      // Override preferences for high priority events
      if (isWeddingDay && recipient.preferences.weddingDayOverride) {
        channels = ['email', 'sms', 'slack', 'in_app'];
      } else if (isEmergency && recipient.preferences.emergencyBypass) {
        channels = ['email', 'sms', 'slack', 'in_app'];
      }

      // Add recipient to appropriate channel groups
      channels.forEach((channel) => {
        switch (channel) {
          case 'email':
            groups.email.push(recipient);
            break;
          case 'sms':
            if (recipient.phone) groups.sms.push(recipient);
            break;
          case 'slack':
            if (recipient.slackUserId || recipient.slackChannelId)
              groups.slack.push(recipient);
            break;
          case 'in_app':
            groups.inApp.push(recipient);
            break;
        }
      });
    });

    return groups;
  }

  private canSendNotification(recipientId: string): boolean {
    const now = Date.now();
    const tracking = this.notificationCounts.get(recipientId);

    if (!tracking || now > tracking.resetTime) {
      // Reset or initialize tracking (1 hour window)
      this.notificationCounts.set(recipientId, {
        count: 0,
        resetTime: now + 60 * 60 * 1000,
      });
      return true;
    }

    return tracking.count < this.maxNotificationsPerHour;
  }

  private updateNotificationCount(recipientId: string): void {
    const tracking = this.notificationCounts.get(recipientId);
    if (tracking) {
      tracking.count++;
    }
  }

  private getEmailTemplate(eventType: keyof RealtimeEventType): string {
    const templates: Record<string, string> = {
      FORM_RESPONSE_RECEIVED: 'realtime-form-response',
      JOURNEY_MILESTONE_COMPLETED: 'realtime-journey-progress',
      WEDDING_DATE_CHANGE: 'realtime-wedding-change',
      CLIENT_PROFILE_UPDATED: 'realtime-client-update',
      PAYMENT_RECEIVED: 'realtime-payment-received',
      VENDOR_NO_SHOW: 'realtime-emergency-alert',
    };

    return templates[eventType] || 'realtime-generic-notification';
  }

  private getEmailSubject(
    eventType: keyof RealtimeEventType,
    eventData: any,
    priority: EventPriority,
  ): string {
    const urgencyPrefix =
      priority === 'critical'
        ? '🚨 URGENT: '
        : priority === 'high'
          ? '⚡ '
          : '';

    const subjects: Record<string, string> = {
      FORM_RESPONSE_RECEIVED: `New form response from ${eventData.client_name}`,
      JOURNEY_MILESTONE_COMPLETED: `${eventData.client_name} completed ${eventData.milestone_name}`,
      WEDDING_DATE_CHANGE: `Wedding date changed for ${eventData.client_name || 'client'}`,
      CLIENT_PROFILE_UPDATED: `Client profile updated`,
      PAYMENT_RECEIVED: `Payment received for ${eventData.client_name || 'client'}`,
      VENDOR_NO_SHOW: `Vendor no-show alert for ${eventData.client_name || 'wedding'}`,
    };

    return urgencyPrefix + (subjects[eventType] || 'WedSync notification');
  }

  private getSMSMessage(
    eventType: keyof RealtimeEventType,
    eventData: any,
  ): string {
    const messages: Record<string, string> = {
      WEDDING_DATE_CHANGE: `WedSync Alert: Wedding date changed from ${eventData.old_date} to ${eventData.new_date}. Please confirm your availability.`,
      VENDOR_NO_SHOW: `URGENT: Vendor no-show alert for wedding on ${eventData.wedding_date}. Immediate action required.`,
      PAYMENT_FAILED: `Payment failed for ${eventData.client_name}. Please check your payment method.`,
      EMERGENCY_ALERT: `Wedding emergency: ${eventData.title}. Contact coordinator immediately.`,
    };

    return messages[eventType] || `WedSync notification: ${eventType}`;
  }

  private formatSlackMessage(
    eventType: keyof RealtimeEventType,
    eventData: any,
    priority: EventPriority,
  ): SlackMessage {
    const urgencyEmoji =
      priority === 'critical' ? '🚨' : priority === 'high' ? '⚡' : 'ℹ️';

    switch (eventType) {
      case 'FORM_RESPONSE_RECEIVED':
        return {
          text: `📝 New form response from ${eventData.client_name}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*New Form Response*\n*Client:* ${eventData.client_name}\n*Form:* ${eventData.form_name}\n*Questions:* ${eventData.response_count}\n*Submitted:* ${eventData.submitted_at}`,
              },
            },
          ],
        };

      case 'WEDDING_DATE_CHANGE':
        return {
          text: `📅 Wedding date changed from ${eventData.old_date} to ${eventData.new_date}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Wedding Date Change*\n*Previous Date:* ${eventData.old_date}\n*New Date:* ${eventData.new_date}\n*Action Required:* Please update your calendar and confirm availability`,
              },
            },
          ],
        };

      case 'VENDOR_NO_SHOW':
        return {
          text: `🚨 URGENT: Vendor no-show alert`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*VENDOR NO-SHOW ALERT*\n*Wedding:* ${eventData.client_name || 'Unknown'}\n*Date:* ${eventData.wedding_date}\n*Missing Vendor:* ${eventData.vendor_type}\n*Status:* Immediate action required`,
              },
            },
          ],
        };

      default:
        return {
          text: `${urgencyEmoji} ${eventType} notification`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${eventType}*\n${JSON.stringify(eventData, null, 2)}`,
              },
            },
          ],
        };
    }
  }

  private getNotificationTitle(
    eventType: keyof RealtimeEventType,
    eventData: any,
  ): string {
    const titles: Record<string, string> = {
      FORM_RESPONSE_RECEIVED: `New form response from ${eventData.client_name}`,
      JOURNEY_MILESTONE_COMPLETED: `${eventData.client_name} completed ${eventData.milestone_name}`,
      WEDDING_DATE_CHANGE: `Wedding date changed`,
      CLIENT_PROFILE_UPDATED: `Client profile updated`,
      PAYMENT_RECEIVED: `Payment received`,
      VENDOR_NO_SHOW: `Vendor no-show alert`,
    };

    return titles[eventType] || 'WedSync notification';
  }

  private getNotificationMessage(
    eventType: keyof RealtimeEventType,
    eventData: any,
  ): string {
    const messages: Record<string, string> = {
      FORM_RESPONSE_RECEIVED: `${eventData.client_name} submitted a response to your ${eventData.form_name} form.`,
      JOURNEY_MILESTONE_COMPLETED: `${eventData.client_name} has completed ${eventData.milestone_name} (${eventData.completion_percentage}%).`,
      WEDDING_DATE_CHANGE: `Wedding date has been changed from ${eventData.old_date} to ${eventData.new_date}.`,
      CLIENT_PROFILE_UPDATED: `Client profile information has been updated.`,
      PAYMENT_RECEIVED: `Payment has been received for ${eventData.client_name}.`,
      VENDOR_NO_SHOW: `Vendor no-show alert requires immediate attention.`,
    };

    return messages[eventType] || `You have a new ${eventType} notification.`;
  }

  private renderEmailTemplate(
    templateId: string,
    variables: Record<string, any>,
  ): string {
    // This would integrate with your email template system (e.g., React Email, Mjml)
    // For now, return a simple HTML template
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="padding: 20px;">
            <h2 style="color: #8B5CF6;">${variables.notification_type}</h2>
            <p>Hello ${variables.recipient_name},</p>
            <p>${this.getNotificationMessage(variables.notification_type, variables)}</p>
            <hr style="margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
              This is an automated notification from WedSync.
              <a href="${variables.unsubscribe_url}">Unsubscribe</a>
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private async logNotificationSuccess(
    eventType: keyof RealtimeEventType,
    recipientCount: number,
    results: PromiseSettledResult<any>[],
  ): Promise<void> {
    try {
      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const failureCount = results.length - successCount;

      await this.supabase.from('notification_logs').insert({
        event_type: eventType,
        recipient_count: recipientCount,
        success_count: successCount,
        failure_count: failureCount,
        logged_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log notification success:', error);
    }
  }

  private async logNotificationError(
    eventType: keyof RealtimeEventType,
    channel: string,
    error: any,
  ): Promise<void> {
    try {
      await this.supabase.from('notification_error_logs').insert({
        event_type: eventType,
        channel,
        error_message: error instanceof Error ? error.message : String(error),
        error_details: error instanceof Error ? error.stack : undefined,
        logged_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log notification error:', logError);
    }
  }

  private async logChannelDelivery(
    channel: NotificationChannel,
    recipientId: string,
    eventType: keyof RealtimeEventType,
    status: 'success' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.supabase.from('notification_delivery_logs').insert({
        channel,
        recipient_id: recipientId,
        event_type: eventType,
        status,
        error_message: errorMessage,
        delivered_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log channel delivery:', error);
    }
  }
}
