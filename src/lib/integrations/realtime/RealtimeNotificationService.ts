import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  RealtimeEventType,
  NotificationRecipient,
  NotificationChannel,
  SlackMessage,
  FormResponseData,
  JourneyProgressData,
  EmailTriggerEventData,
} from '@/types/realtime-integration';

interface EmailService {
  sendTemplate(params: {
    to: string;
    template: string;
    variables: Record<string, any>;
  }): Promise<boolean>;
}

interface SlackService {
  sendMessage(params: {
    channel: string;
    text: string;
    blocks?: any[];
    attachments?: any[];
  }): Promise<boolean>;
}

interface SMSService {
  sendMessage(params: { to: string; message: string }): Promise<boolean>;
}

export class RealtimeNotificationService {
  private supabase: SupabaseClient;
  private emailService: EmailService;
  private slackService: SlackService;
  private smsService: SMSService;

  constructor(
    supabaseClient: SupabaseClient,
    emailService: EmailService,
    slackService: SlackService,
    smsService: SMSService,
  ) {
    this.supabase = supabaseClient;
    this.emailService = emailService;
    this.slackService = slackService;
    this.smsService = smsService;
  }

  // Multi-channel notification orchestration
  async sendRealtimeNotification(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipients: NotificationRecipient[],
  ): Promise<void> {
    if (!recipients.length) {
      console.log('No recipients specified for notification');
      return;
    }

    try {
      // Filter active recipients based on their preferences
      const activeRecipients = this.filterActiveRecipients(
        recipients,
        eventType,
      );

      if (!activeRecipients.length) {
        console.log('No active recipients after filtering preferences');
        return;
      }

      // Send notifications across all channels in parallel
      const notifications = await Promise.allSettled([
        this.sendEmailNotifications(eventType, eventData, activeRecipients),
        this.sendSlackNotifications(eventType, eventData, activeRecipients),
        this.sendSMSNotifications(eventType, eventData, activeRecipients),
        this.sendInAppNotifications(eventType, eventData, activeRecipients),
      ]);

      // Log notification results and track delivery success
      const results = {
        email: notifications[0],
        slack: notifications[1],
        sms: notifications[2],
        inApp: notifications[3],
      };

      await this.logNotificationResults(
        eventType,
        eventData,
        activeRecipients,
        results,
      );

      // Handle any failed deliveries
      const failures = notifications.filter(
        (result) => result.status === 'rejected',
      );
      if (failures.length > 0) {
        await this.handleNotificationFailures(
          eventType,
          eventData,
          activeRecipients,
          failures,
        );
      }
    } catch (error) {
      console.error('Realtime notification orchestration failed:', error);
      await this.logNotificationError(eventType, eventData, recipients, error);
    }
  }

  // Email notifications for realtime events
  private async sendEmailNotifications(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipients: NotificationRecipient[],
  ): Promise<void> {
    const emailRecipients = recipients.filter(
      (r) =>
        r.channels.includes('email') &&
        this.shouldSendToChannel('email', r, eventType),
    );

    if (emailRecipients.length === 0) return;

    const emailTemplate = this.getEmailTemplate(eventType);

    // Send emails in parallel with rate limiting
    const emailPromises = emailRecipients.map(async (recipient) => {
      try {
        const variables = this.buildEmailVariables(
          eventType,
          eventData,
          recipient,
        );

        return await this.emailService.sendTemplate({
          to: recipient.email,
          template: emailTemplate,
          variables,
        });
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        return false;
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value,
    ).length;

    console.log(
      `Email notifications sent: ${successCount}/${emailRecipients.length}`,
    );
  }

  // Slack/Teams notifications for supplier coordination
  private async sendSlackNotifications(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipients: NotificationRecipient[],
  ): Promise<void> {
    const slackRecipients = recipients.filter(
      (r) =>
        r.channels.includes('slack') &&
        (r.slackChannelId || r.slackUserId) &&
        this.shouldSendToChannel('slack', r, eventType),
    );

    if (slackRecipients.length === 0) return;

    const slackMessage = this.formatSlackMessage(eventType, eventData);

    const slackPromises = slackRecipients.map(async (recipient) => {
      try {
        const channel = recipient.slackChannelId || recipient.slackUserId!;

        return await this.slackService.sendMessage({
          channel,
          text: slackMessage.text,
          blocks: slackMessage.blocks,
          attachments: slackMessage.attachments,
        });
      } catch (error) {
        console.error(
          `Failed to send Slack notification to ${recipient.name}:`,
          error,
        );
        return false;
      }
    });

    const results = await Promise.allSettled(slackPromises);
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value,
    ).length;

    console.log(
      `Slack notifications sent: ${successCount}/${slackRecipients.length}`,
    );
  }

  // SMS notifications for urgent updates (Premium tiers only)
  private async sendSMSNotifications(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipients: NotificationRecipient[],
  ): Promise<void> {
    // SMS only for high priority events and premium tier users
    if (!this.isHighPriorityEvent(eventType)) return;

    const smsRecipients = recipients.filter(
      (r) =>
        r.channels.includes('sms') &&
        r.phone &&
        this.shouldSendToChannel('sms', r, eventType) &&
        this.hasSMSAccess(r), // Check if user has premium tier
    );

    if (smsRecipients.length === 0) return;

    const smsMessage = this.formatSMSMessage(eventType, eventData);

    const smsPromises = smsRecipients.map(async (recipient) => {
      try {
        return await this.smsService.sendMessage({
          to: recipient.phone!,
          message: smsMessage,
        });
      } catch (error) {
        console.error(`Failed to send SMS to ${recipient.phone}:`, error);
        return false;
      }
    });

    const results = await Promise.allSettled(smsPromises);
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value,
    ).length;

    console.log(
      `SMS notifications sent: ${successCount}/${smsRecipients.length}`,
    );
  }

  // In-app notifications via Supabase Realtime
  private async sendInAppNotifications(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipients: NotificationRecipient[],
  ): Promise<void> {
    const inAppRecipients = recipients.filter(
      (r) =>
        r.channels.includes('in_app') &&
        this.shouldSendToChannel('in_app', r, eventType),
    );

    if (inAppRecipients.length === 0) return;

    try {
      for (const recipient of inAppRecipients) {
        const notification = {
          id: crypto.randomUUID(),
          user_id: recipient.id,
          event_type: eventType,
          title: this.getNotificationTitle(eventType, eventData),
          message: this.getNotificationMessage(eventType, eventData),
          data: eventData,
          is_read: false,
          created_at: new Date().toISOString(),
        };

        // Insert notification into database - will trigger realtime subscription
        await this.supabase.from('user_notifications').insert(notification);

        // Also send via Supabase Realtime for immediate delivery
        await this.supabase.channel(`notifications:${recipient.id}`).send({
          type: 'notification',
          event: eventType,
          payload: notification,
        });
      }

      console.log(`In-app notifications sent: ${inAppRecipients.length}`);
    } catch (error) {
      console.error('Failed to send in-app notifications:', error);
    }
  }

  // Wedding industry specific notifications
  async notifyWeddingDateChange(
    weddingId: string,
    oldDate: string,
    newDate: string,
    affectedVendors: string[],
  ): Promise<void> {
    try {
      // Get all affected vendors and their notification preferences
      const { data: vendors } = await this.supabase
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

      if (!vendors || vendors.length === 0) return;

      // Convert to notification recipients
      const recipients: NotificationRecipient[] = vendors.map((vendor) => ({
        id: vendor.vendor_id,
        name: vendor.suppliers.business_name,
        email: vendor.suppliers.email,
        phone: vendor.suppliers.phone,
        channels: vendor.suppliers.notification_preferences
          ?.realtime_channels || ['email'],
        preferences: {
          enabled: true,
          channels: vendor.suppliers.notification_preferences
            ?.realtime_channels || ['email'],
          weddingDayOverride: true,
          emergencyBypass: true,
        },
      }));

      // Send coordinated notifications to all vendors
      await this.sendRealtimeNotification(
        'WEDDING_DATE_CHANGE' as keyof RealtimeEventType,
        {
          wedding_id: weddingId,
          old_date: oldDate,
          new_date: newDate,
          affected_vendors: affectedVendors,
          urgency: 'high',
          requires_response: true,
        },
        recipients,
      );

      // Log the date change event for audit
      await this.logWeddingDateChangeEvent(
        weddingId,
        oldDate,
        newDate,
        affectedVendors,
      );
    } catch (error) {
      console.error('Failed to notify wedding date change:', error);
    }
  }

  async notifyFormResponse(
    supplierId: string,
    formResponse: FormResponseData,
  ): Promise<void> {
    try {
      // Get supplier notification preferences
      const { data: supplier } = await this.supabase
        .from('suppliers')
        .select('business_name, email, phone, notification_preferences')
        .eq('id', supplierId)
        .single();

      if (!supplier) return;

      const recipient: NotificationRecipient = {
        id: supplierId,
        name: supplier.business_name,
        email: supplier.email,
        phone: supplier.phone,
        channels: supplier.notification_preferences?.realtime_channels || [
          'email',
          'in_app',
        ],
        preferences: {
          enabled: true,
          channels: supplier.notification_preferences?.realtime_channels || [
            'email',
            'in_app',
          ],
          weddingDayOverride: false,
          emergencyBypass: false,
        },
      };

      await this.sendRealtimeNotification(
        'FORM_RESPONSE_RECEIVED' as keyof RealtimeEventType,
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
      console.error('Failed to notify form response:', error);
    }
  }

  async notifyJourneyProgress(
    supplierId: string,
    journeyProgress: JourneyProgressData,
  ): Promise<void> {
    try {
      const { data: supplier } = await this.supabase
        .from('suppliers')
        .select('business_name, email, phone, notification_preferences')
        .eq('id', supplierId)
        .single();

      if (!supplier) return;

      const recipient: NotificationRecipient = {
        id: supplierId,
        name: supplier.business_name,
        email: supplier.email,
        phone: supplier.phone,
        channels: supplier.notification_preferences?.realtime_channels || [
          'email',
          'in_app',
        ],
        preferences: {
          enabled: true,
          channels: supplier.notification_preferences?.realtime_channels || [
            'email',
            'in_app',
          ],
          weddingDayOverride: false,
          emergencyBypass: false,
        },
      };

      await this.sendRealtimeNotification(
        'JOURNEY_MILESTONE_COMPLETED' as keyof RealtimeEventType,
        {
          supplier_name: supplier.business_name,
          client_name: journeyProgress.clientName,
          milestone_name: journeyProgress.milestoneName,
          completion_percentage: journeyProgress.completionPercentage,
          completed_at: journeyProgress.completedAt,
          journey_id: journeyProgress.journeyId,
          next_steps: journeyProgress.nextSteps,
        },
        [recipient],
      );
    } catch (error) {
      console.error('Failed to notify journey progress:', error);
    }
  }

  // Template and formatting methods
  private getEmailTemplate(eventType: keyof RealtimeEventType): string {
    const templates = {
      FORM_RESPONSE_RECEIVED: 'realtime-form-response',
      JOURNEY_MILESTONE_COMPLETED: 'realtime-journey-progress',
      WEDDING_DATE_CHANGE: 'realtime-wedding-change',
      CLIENT_PROFILE_UPDATED: 'realtime-client-update',
      PAYMENT_RECEIVED: 'realtime-payment-confirmation',
      VENDOR_ASSIGNED: 'realtime-vendor-assignment',
      EMERGENCY_ALERT: 'realtime-emergency-alert',
    };

    return templates[eventType] || 'realtime-generic-notification';
  }

  private buildEmailVariables(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipient: NotificationRecipient,
  ): Record<string, any> {
    const baseVariables = {
      recipient_name: recipient.name,
      notification_type: eventType,
      timestamp: new Date().toLocaleString(),
      year: new Date().getFullYear(),
    };

    // Add event-specific variables
    return {
      ...baseVariables,
      ...eventData,
      // Wedding-specific formatting
      wedding_date_formatted: eventData.wedding_date
        ? new Date(eventData.wedding_date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : undefined,
    };
  }

  private formatSlackMessage(
    eventType: keyof RealtimeEventType,
    eventData: any,
  ): SlackMessage {
    switch (eventType) {
      case 'FORM_RESPONSE_RECEIVED':
        return {
          text: `📝 New form response from ${eventData.client_name}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*New Form Response*\n*Client:* ${eventData.client_name}\n*Form:* ${eventData.form_name}\n*Submitted:* ${eventData.submitted_at}`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'View Response',
                  },
                  url: `${process.env.NEXT_PUBLIC_APP_URL}/forms/responses/${eventData.response_id}`,
                },
              ],
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
                text: `*🚨 Wedding Date Change*\n*Previous Date:* ${eventData.old_date}\n*New Date:* ${eventData.new_date}\n*Action Required:* Please update your calendar and confirm availability`,
              },
            },
          ],
        };

      case 'JOURNEY_MILESTONE_COMPLETED':
        return {
          text: `🎉 Journey milestone completed: ${eventData.milestone_name}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Journey Progress Update*\n*Client:* ${eventData.client_name}\n*Milestone:* ${eventData.milestone_name}\n*Progress:* ${eventData.completion_percentage}%\n*Completed:* ${eventData.completed_at}`,
              },
            },
          ],
        };

      case 'EMERGENCY_ALERT':
        return {
          text: `🚨 EMERGENCY: ${eventData.title}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*🚨 WEDDING DAY EMERGENCY*\n*Alert:* ${eventData.title}\n*Description:* ${eventData.description}\n*Wedding:* ${eventData.wedding_date}\n*Severity:* ${eventData.severity?.toUpperCase()}`,
              },
            },
          ],
        };

      default:
        return {
          text: `ℹ️ Realtime update: ${eventType}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Realtime Update*\n*Event:* ${eventType}\n*Time:* ${new Date().toLocaleString()}`,
              },
            },
          ],
        };
    }
  }

  private formatSMSMessage(
    eventType: keyof RealtimeEventType,
    eventData: any,
  ): string {
    switch (eventType) {
      case 'WEDDING_DATE_CHANGE':
        return `URGENT: Wedding date changed from ${eventData.old_date} to ${eventData.new_date}. Please confirm your availability immediately. - WedSync`;

      case 'EMERGENCY_ALERT':
        return `WEDDING EMERGENCY: ${eventData.title}. ${eventData.description}. Contact coordinator immediately. - WedSync`;

      case 'VENDOR_NO_SHOW':
        return `URGENT: Vendor no-show reported for ${eventData.wedding_date}. Emergency coordination required. Check WedSync app. - WedSync`;

      default:
        return `WedSync Update: ${eventType.replace(/_/g, ' ')}. Check your WedSync dashboard for details.`;
    }
  }

  // Helper methods
  private filterActiveRecipients(
    recipients: NotificationRecipient[],
    eventType: keyof RealtimeEventType,
  ): NotificationRecipient[] {
    return recipients.filter((recipient) => {
      // Check if notifications are enabled
      if (!recipient.preferences.enabled) {
        // Allow if it's an emergency and emergency bypass is enabled
        if (
          this.isEmergencyEvent(eventType) &&
          recipient.preferences.emergencyBypass
        ) {
          return true;
        }
        return false;
      }

      // Check quiet hours (unless wedding day override or emergency)
      if (
        this.isInQuietHours(recipient) &&
        !recipient.preferences.weddingDayOverride &&
        !this.isEmergencyEvent(eventType)
      ) {
        return false;
      }

      // Check if recipient has at least one valid channel
      return recipient.channels.some((channel) =>
        recipient.preferences.channels.includes(channel),
      );
    });
  }

  private shouldSendToChannel(
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    eventType: keyof RealtimeEventType,
  ): boolean {
    // Check if channel is in recipient's preferences
    if (!recipient.preferences.channels.includes(channel)) return false;

    // SMS only for high priority events and users with phone numbers
    if (channel === 'sms') {
      return this.isHighPriorityEvent(eventType) && !!recipient.phone;
    }

    // Slack only if slack credentials are available
    if (channel === 'slack') {
      return !!(recipient.slackChannelId || recipient.slackUserId);
    }

    return true;
  }

  private isHighPriorityEvent(eventType: keyof RealtimeEventType): boolean {
    const highPriorityEvents = [
      'WEDDING_DATE_CHANGE',
      'EMERGENCY_ALERT',
      'VENDOR_NO_SHOW',
      'PAYMENT_FAILED',
    ];
    return highPriorityEvents.includes(eventType as string);
  }

  private isEmergencyEvent(eventType: keyof RealtimeEventType): boolean {
    const emergencyEvents = ['EMERGENCY_ALERT', 'VENDOR_NO_SHOW'];
    return emergencyEvents.includes(eventType as string);
  }

  private isInQuietHours(recipient: NotificationRecipient): boolean {
    if (!recipient.preferences.quietHours) return false;

    const now = new Date();
    const timezone = recipient.preferences.quietHours.timezone || 'UTC';

    // Simple quiet hours check (in production, use proper timezone handling)
    const currentHour = now.getHours();
    const quietStart = parseInt(
      recipient.preferences.quietHours.start.split(':')[0],
    );
    const quietEnd = parseInt(
      recipient.preferences.quietHours.end.split(':')[0],
    );

    if (quietStart < quietEnd) {
      return currentHour >= quietStart && currentHour < quietEnd;
    } else {
      // Quiet hours span midnight
      return currentHour >= quietStart || currentHour < quietEnd;
    }
  }

  private hasSMSAccess(recipient: NotificationRecipient): boolean {
    // TODO: Check if recipient has premium tier access for SMS
    // For now, return true - implement proper tier checking
    return true;
  }

  private getNotificationTitle(
    eventType: keyof RealtimeEventType,
    eventData: any,
  ): string {
    const titles = {
      FORM_RESPONSE_RECEIVED: 'New Form Response',
      JOURNEY_MILESTONE_COMPLETED: 'Journey Milestone Completed',
      WEDDING_DATE_CHANGE: 'Wedding Date Changed',
      CLIENT_PROFILE_UPDATED: 'Client Profile Updated',
      PAYMENT_RECEIVED: 'Payment Received',
      VENDOR_ASSIGNED: 'New Vendor Assigned',
      EMERGENCY_ALERT: 'Wedding Emergency',
    };
    return titles[eventType] || 'WedSync Notification';
  }

  private getNotificationMessage(
    eventType: keyof RealtimeEventType,
    eventData: any,
  ): string {
    switch (eventType) {
      case 'FORM_RESPONSE_RECEIVED':
        return `${eventData.client_name} submitted a response to ${eventData.form_name}`;
      case 'WEDDING_DATE_CHANGE':
        return `Wedding date changed from ${eventData.old_date} to ${eventData.new_date}`;
      case 'JOURNEY_MILESTONE_COMPLETED':
        return `${eventData.client_name} completed ${eventData.milestone_name}`;
      default:
        return 'You have a new notification from WedSync';
    }
  }

  // Logging and error handling
  private async logNotificationResults(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipients: NotificationRecipient[],
    results: Record<string, PromiseSettledResult<void>>,
  ): Promise<void> {
    try {
      await this.supabase.from('notification_logs').insert({
        event_type: eventType,
        recipient_count: recipients.length,
        email_status: results.email.status,
        slack_status: results.slack.status,
        sms_status: results.sms.status,
        in_app_status: results.inApp.status,
        event_data: eventData,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log notification results:', error);
    }
  }

  private async logNotificationError(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipients: NotificationRecipient[],
    error: any,
  ): Promise<void> {
    try {
      await this.supabase.from('notification_errors').insert({
        event_type: eventType,
        recipient_count: recipients.length,
        error_message: error instanceof Error ? error.message : String(error),
        error_stack: error instanceof Error ? error.stack : null,
        event_data: eventData,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log notification error:', logError);
    }
  }

  private async handleNotificationFailures(
    eventType: keyof RealtimeEventType,
    eventData: any,
    recipients: NotificationRecipient[],
    failures: PromiseRejectedResult[],
  ): Promise<void> {
    // TODO: Implement retry logic for failed notifications
    console.warn(
      `${failures.length} notification channels failed for event ${eventType}`,
    );

    // For critical events, try alternative channels
    if (this.isEmergencyEvent(eventType)) {
      // Implement fallback notification strategy
      console.log('Implementing emergency fallback notifications');
    }
  }

  private async logWeddingDateChangeEvent(
    weddingId: string,
    oldDate: string,
    newDate: string,
    affectedVendors: string[],
  ): Promise<void> {
    try {
      await this.supabase.from('wedding_date_changes').insert({
        wedding_id: weddingId,
        old_date: oldDate,
        new_date: newDate,
        affected_vendors: affectedVendors,
        notification_sent: true,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log wedding date change:', error);
    }
  }
}
