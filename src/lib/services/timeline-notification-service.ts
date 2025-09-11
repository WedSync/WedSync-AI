/**
 * Timeline Notification Service - WS-160
 * Handles notifications for timeline changes and updates
 */

import { createClient } from '@supabase/supabase-js';
import { TimelineEvent, TimelineConflict } from '@/types/timeline';

interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  variables: string[];
  channels: NotificationChannel[];
}

interface TimelineNotification {
  id: string;
  timelineId: string;
  eventId?: string;
  type: NotificationType;
  recipientId: string;
  title: string;
  message: string;
  channels: NotificationChannel[];
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledFor?: string;
  sentAt?: string;
  readAt?: string;
  metadata: any;
  createdAt: string;
}

type NotificationType =
  | 'event_created'
  | 'event_updated'
  | 'event_deleted'
  | 'event_moved'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'timeline_shared'
  | 'collaborator_added'
  | 'deadline_reminder'
  | 'vendor_assigned'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'calendar_sync_failed'
  | 'version_created';

type NotificationChannel =
  | 'email'
  | 'sms'
  | 'push'
  | 'in_app'
  | 'slack'
  | 'webhook';

interface NotificationPreference {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  enabled: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours?: {
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
  };
}

export class TimelineNotificationService {
  private supabase: any;
  private templates: Map<NotificationType, NotificationTemplate> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    this.initializeTemplates();
  }

  /**
   * Send notification for timeline event
   */
  async sendTimelineNotification(
    timelineId: string,
    type: NotificationType,
    data: {
      eventId?: string;
      triggerUserId: string;
      targetUserIds?: string[];
      customData?: any;
    },
  ): Promise<{ success: boolean; notificationIds: string[] }> {
    try {
      // Get timeline collaborators if no specific targets
      const recipients =
        data.targetUserIds || (await this.getTimelineRecipients(timelineId));

      // Filter out trigger user for most notifications
      const filteredRecipients = this.shouldNotifyTriggerUser(type)
        ? recipients
        : recipients.filter((id) => id !== data.triggerUserId);

      const notificationIds: string[] = [];

      // Create notifications for each recipient
      for (const recipientId of filteredRecipients) {
        const preferences = await this.getUserNotificationPreferences(
          recipientId,
          type,
        );

        if (!preferences.enabled || preferences.channels.length === 0) {
          continue;
        }

        const notification = await this.createNotification(
          timelineId,
          type,
          recipientId,
          data,
          preferences,
        );

        if (notification) {
          notificationIds.push(notification.id);
          await this.dispatchNotification(notification);
        }
      }

      return { success: true, notificationIds };
    } catch (error) {
      console.error('Failed to send timeline notification:', error);
      return { success: false, notificationIds: [] };
    }
  }

  /**
   * Send reminder notifications
   */
  async sendDeadlineReminders(timelineId: string): Promise<void> {
    try {
      const { data: upcomingEvents } = await this.supabase
        .from('timeline_events')
        .select('*')
        .eq('timeline_id', timelineId)
        .gte('start_time', new Date().toISOString())
        .lte(
          'start_time',
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        ) // Next 24 hours
        .eq('status', 'confirmed');

      if (!upcomingEvents?.length) return;

      for (const event of upcomingEvents) {
        await this.sendTimelineNotification(timelineId, 'deadline_reminder', {
          eventId: event.id,
          triggerUserId: 'system',
          customData: {
            eventTitle: event.title,
            startTime: event.start_time,
            location: event.location,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send deadline reminders:', error);
    }
  }

  /**
   * Send conflict notifications
   */
  async sendConflictNotification(
    timelineId: string,
    conflict: TimelineConflict,
    detectedBy: string,
  ): Promise<void> {
    await this.sendTimelineNotification(timelineId, 'conflict_detected', {
      triggerUserId: detectedBy,
      customData: {
        conflictType: conflict.conflict_type,
        severity: conflict.severity,
        description: conflict.description,
        eventIds: [conflict.event_id_1, conflict.event_id_2].filter(Boolean),
      },
    });
  }

  /**
   * Send vendor assignment notifications
   */
  async sendVendorAssignmentNotification(
    timelineId: string,
    eventId: string,
    vendorId: string,
    assignedBy: string,
  ): Promise<void> {
    // Get vendor email
    const { data: vendor } = await this.supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', vendorId)
      .single();

    if (vendor) {
      await this.sendTimelineNotification(timelineId, 'vendor_assigned', {
        eventId,
        triggerUserId: assignedBy,
        targetUserIds: [vendorId],
        customData: {
          vendorName: vendor.full_name,
          vendorEmail: vendor.email,
        },
      });
    }
  }

  /**
   * Create notification record
   */
  private async createNotification(
    timelineId: string,
    type: NotificationType,
    recipientId: string,
    data: any,
    preferences: NotificationPreference,
  ): Promise<TimelineNotification | null> {
    try {
      const template = this.templates.get(type);
      if (!template) return null;

      const { title, message } = await this.renderNotificationContent(
        template,
        timelineId,
        data,
      );

      const notification = {
        timeline_id: timelineId,
        event_id: data.eventId,
        type,
        recipient_id: recipientId,
        title,
        message,
        channels: preferences.channels,
        status: 'pending',
        priority: this.getNotificationPriority(type),
        scheduled_for: this.calculateScheduledTime(preferences),
        metadata: data.customData || {},
        created_at: new Date().toISOString(),
      };

      const { data: createdNotification, error } = await this.supabase
        .from('timeline_notifications')
        .insert(notification)
        .select('*')
        .single();

      if (error) throw error;

      return createdNotification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return null;
    }
  }

  /**
   * Dispatch notification to channels
   */
  private async dispatchNotification(
    notification: TimelineNotification,
  ): Promise<void> {
    const dispatchPromises = notification.channels.map(async (channel) => {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailNotification(notification);
            break;
          case 'sms':
            await this.sendSMSNotification(notification);
            break;
          case 'push':
            await this.sendPushNotification(notification);
            break;
          case 'in_app':
            await this.createInAppNotification(notification);
            break;
          case 'slack':
            await this.sendSlackNotification(notification);
            break;
          case 'webhook':
            await this.sendWebhookNotification(notification);
            break;
        }
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error);
      }
    });

    await Promise.allSettled(dispatchPromises);

    // Update notification status
    await this.supabase
      .from('timeline_notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', notification.id);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    notification: TimelineNotification,
  ): Promise<void> {
    // Get recipient email
    const { data: recipient } = await this.supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', notification.recipientId)
      .single();

    if (!recipient?.email) return;

    // TODO: Integrate with your email service (SendGrid, Mailgun, etc.)
    const emailData = {
      to: recipient.email,
      subject: notification.title,
      html: this.generateEmailHTML(notification),
      text: notification.message,
    };

    console.log('Sending email notification:', emailData);
    // await emailService.send(emailData);
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    notification: TimelineNotification,
  ): Promise<void> {
    // Get recipient phone
    const { data: recipient } = await this.supabase
      .from('user_profiles')
      .select('phone')
      .eq('id', notification.recipientId)
      .single();

    if (!recipient?.phone) return;

    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log('Sending SMS notification:', {
      to: recipient.phone,
      message: notification.message,
    });
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(
    notification: TimelineNotification,
  ): Promise<void> {
    // Get user's push tokens
    const { data: pushTokens } = await this.supabase
      .from('user_push_tokens')
      .select('token, platform')
      .eq('user_id', notification.recipientId)
      .eq('active', true);

    if (!pushTokens?.length) return;

    // TODO: Integrate with push service (Firebase FCM, APNS, etc.)
    for (const tokenData of pushTokens) {
      console.log('Sending push notification:', {
        token: tokenData.token,
        title: notification.title,
        body: notification.message,
        platform: tokenData.platform,
      });
    }
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(
    notification: TimelineNotification,
  ): Promise<void> {
    await this.supabase.from('user_notifications').insert({
      user_id: notification.recipientId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      metadata: {
        timelineId: notification.timelineId,
        eventId: notification.eventId,
        ...notification.metadata,
      },
      created_at: new Date().toISOString(),
      read: false,
    });
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(
    notification: TimelineNotification,
  ): Promise<void> {
    // Get user's Slack webhook URL or token
    const { data: integration } = await this.supabase
      .from('user_integrations')
      .select('credentials')
      .eq('user_id', notification.recipientId)
      .eq('provider', 'slack')
      .eq('active', true)
      .single();

    if (!integration?.credentials?.webhook_url) return;

    // TODO: Send to Slack webhook
    console.log('Sending Slack notification:', {
      webhook: integration.credentials.webhook_url,
      text: `${notification.title}\n${notification.message}`,
    });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    notification: TimelineNotification,
  ): Promise<void> {
    // Get user's webhook URLs
    const { data: webhooks } = await this.supabase
      .from('user_webhooks')
      .select('url, events')
      .eq('user_id', notification.recipientId)
      .eq('active', true);

    if (!webhooks?.length) return;

    const webhookPayload = {
      type: 'timeline_notification',
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timeline_id: notification.timelineId,
        event_id: notification.eventId,
        metadata: notification.metadata,
        created_at: notification.createdAt,
      },
    };

    for (const webhook of webhooks) {
      if (webhook.events.includes(notification.type)) {
        // TODO: Send webhook request
        console.log('Sending webhook notification:', {
          url: webhook.url,
          payload: webhookPayload,
        });
      }
    }
  }

  /**
   * Get timeline recipients (collaborators + vendors)
   */
  private async getTimelineRecipients(timelineId: string): Promise<string[]> {
    // Get collaborators
    const { data: collaborators } = await this.supabase
      .from('timeline_collaborators')
      .select('user_id')
      .eq('timeline_id', timelineId)
      .eq('status', 'active');

    // Get assigned vendors
    const { data: vendors } = await this.supabase
      .from('timeline_event_vendors')
      .select('vendor_id')
      .in(
        'event_id',
        this.supabase
          .from('timeline_events')
          .select('id')
          .eq('timeline_id', timelineId),
      );

    const recipients = [
      ...(collaborators?.map((c) => c.user_id) || []),
      ...(vendors?.map((v) => v.vendor_id) || []),
    ];

    return [...new Set(recipients)]; // Remove duplicates
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(
    userId: string,
    type: NotificationType,
  ): Promise<NotificationPreference> {
    const { data: preference } = await this.supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .single();

    if (preference) {
      return preference;
    }

    // Return default preferences
    return {
      userId,
      type,
      channels: ['email', 'in_app'],
      enabled: true,
      frequency: 'immediate',
    };
  }

  /**
   * Render notification content using template
   */
  private async renderNotificationContent(
    template: NotificationTemplate,
    timelineId: string,
    data: any,
  ): Promise<{ title: string; message: string }> {
    // Get context data
    const context = await this.getNotificationContext(timelineId, data);

    let title = template.title;
    let message = template.body;

    // Replace template variables
    for (const variable of template.variables) {
      const value = this.getContextValue(context, variable);
      const placeholder = `{{${variable}}}`;
      title = title.replace(new RegExp(placeholder, 'g'), value);
      message = message.replace(new RegExp(placeholder, 'g'), value);
    }

    return { title, message };
  }

  /**
   * Get notification context data
   */
  private async getNotificationContext(
    timelineId: string,
    data: any,
  ): Promise<any> {
    const context: any = { ...data.customData };

    // Get timeline info
    const { data: timeline } = await this.supabase
      .from('wedding_timelines')
      .select('name, wedding_date')
      .eq('id', timelineId)
      .single();

    context.timelineName = timeline?.name;
    context.weddingDate = timeline?.wedding_date;

    // Get event info if present
    if (data.eventId) {
      const { data: event } = await this.supabase
        .from('timeline_events')
        .select('title, start_time, location')
        .eq('id', data.eventId)
        .single();

      context.eventTitle = event?.title;
      context.eventStartTime = event?.start_time;
      context.eventLocation = event?.location;
    }

    return context;
  }

  /**
   * Get value from context using dot notation
   */
  private getContextValue(context: any, path: string): string {
    return path.split('.').reduce((obj, key) => obj?.[key], context) || '';
  }

  /**
   * Initialize notification templates
   */
  private initializeTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'event_created',
        type: 'event_created',
        title: 'New Event Added: {{eventTitle}}',
        body: 'A new event "{{eventTitle}}" has been added to {{timelineName}} on {{eventStartTime}}.',
        variables: ['eventTitle', 'timelineName', 'eventStartTime'],
        channels: ['email', 'in_app', 'push'],
      },
      {
        id: 'event_updated',
        type: 'event_updated',
        title: 'Event Updated: {{eventTitle}}',
        body: 'The event "{{eventTitle}}" in {{timelineName}} has been updated.',
        variables: ['eventTitle', 'timelineName'],
        channels: ['email', 'in_app', 'push'],
      },
      {
        id: 'conflict_detected',
        type: 'conflict_detected',
        title: 'Timeline Conflict Detected',
        body: 'A {{conflictType}} conflict has been detected in {{timelineName}}: {{description}}',
        variables: ['conflictType', 'timelineName', 'description'],
        channels: ['email', 'in_app', 'push', 'slack'],
      },
      {
        id: 'deadline_reminder',
        type: 'deadline_reminder',
        title: 'Upcoming Event: {{eventTitle}}',
        body: 'Reminder: "{{eventTitle}}" is starting soon at {{eventStartTime}} in {{eventLocation}}.',
        variables: ['eventTitle', 'eventStartTime', 'eventLocation'],
        channels: ['email', 'sms', 'push'],
      },
      {
        id: 'vendor_assigned',
        type: 'vendor_assigned',
        title: "You've Been Assigned to an Event",
        body: 'You have been assigned to "{{eventTitle}}" in {{timelineName}}.',
        variables: ['eventTitle', 'timelineName'],
        channels: ['email', 'in_app', 'push'],
      },
    ];

    templates.forEach((template) => {
      this.templates.set(template.type, template);
    });
  }

  /**
   * Get notification priority
   */
  private getNotificationPriority(
    type: NotificationType,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const priorities: Record<
      NotificationType,
      'low' | 'medium' | 'high' | 'critical'
    > = {
      event_created: 'medium',
      event_updated: 'medium',
      event_deleted: 'high',
      event_moved: 'medium',
      conflict_detected: 'high',
      conflict_resolved: 'medium',
      timeline_shared: 'low',
      collaborator_added: 'medium',
      deadline_reminder: 'high',
      vendor_assigned: 'high',
      approval_requested: 'high',
      approval_granted: 'medium',
      approval_denied: 'medium',
      calendar_sync_failed: 'medium',
      version_created: 'low',
    };

    return priorities[type] || 'medium';
  }

  /**
   * Calculate scheduled time based on user preferences
   */
  private calculateScheduledTime(
    preferences: NotificationPreference,
  ): string | undefined {
    if (preferences.frequency === 'immediate') {
      return undefined; // Send now
    }

    const now = new Date();

    switch (preferences.frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return undefined;
    }
  }

  /**
   * Check if trigger user should be notified
   */
  private shouldNotifyTriggerUser(type: NotificationType): boolean {
    const selfNotifyTypes: NotificationType[] = [
      'deadline_reminder',
      'approval_granted',
      'approval_denied',
      'calendar_sync_failed',
    ];

    return selfNotifyTypes.includes(type);
  }

  /**
   * Generate HTML email content
   */
  private generateEmailHTML(notification: TimelineNotification): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <header style="background: #3B82F6; color: white; padding: 20px; text-align: center;">
          <h1>WedSync Timeline Update</h1>
        </header>
        <main style="padding: 20px;">
          <h2>${notification.title}</h2>
          <p style="font-size: 16px; line-height: 1.5;">${notification.message}</p>
          ${
            notification.metadata.eventTitle
              ? `
            <div style="background: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Event:</strong> ${notification.metadata.eventTitle}<br>
              ${notification.metadata.eventStartTime ? `<strong>Time:</strong> ${new Date(notification.metadata.eventStartTime).toLocaleString()}<br>` : ''}
              ${notification.metadata.eventLocation ? `<strong>Location:</strong> ${notification.metadata.eventLocation}` : ''}
            </div>
          `
              : ''
          }
        </main>
        <footer style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280;">
          <p>This email was sent by WedSync Timeline System</p>
          <p><a href="/unsubscribe">Unsubscribe</a> | <a href="/preferences">Manage Preferences</a></p>
        </footer>
      </div>
    `;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('timeline_notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('recipient_id', userId);

      return !error;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Get user's unread notifications
   */
  async getUnreadNotifications(
    userId: string,
    timelineId?: string,
  ): Promise<TimelineNotification[]> {
    let query = this.supabase
      .from('timeline_notifications')
      .select('*')
      .eq('recipient_id', userId)
      .neq('status', 'read')
      .order('created_at', { ascending: false });

    if (timelineId) {
      query = query.eq('timeline_id', timelineId);
    }

    const { data } = await query;
    return data || [];
  }
}

export default TimelineNotificationService;
