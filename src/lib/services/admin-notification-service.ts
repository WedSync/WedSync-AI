// WS-229 Admin Notification Service
// Multi-channel notification system for wedding day coordination

import { Resend } from 'resend';
import twilio from 'twilio';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { Logger } from '@/lib/logging/Logger';

type AdminNotification =
  Database['public']['Tables']['admin_notifications']['Row'];
type AdminNotificationInsert =
  Database['public']['Tables']['admin_notifications']['Insert'];

interface NotificationChannel {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  inApp?: boolean;
}

interface NotificationPreferences {
  adminUserId: string;
  channels: NotificationChannel;
  emergencyChannels: NotificationChannel;
  emailAddress?: string;
  phoneNumber?: string;
  timezone?: string;
}

interface DeliveryStatus {
  email?: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sms?: 'pending' | 'sent' | 'delivered' | 'failed';
  push?: 'pending' | 'sent' | 'delivered' | 'failed' | 'clicked';
  inApp?: 'pending' | 'shown' | 'read' | 'dismissed';
}

interface NotificationData {
  adminUserId: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  type:
    | 'action_completed'
    | 'system_alert'
    | 'wedding_emergency'
    | 'integration_failure';
  data?: Record<string, any>;
  weddingId?: string;
  actionStatusId?: string;
  channels?: NotificationChannel;
  scheduledFor?: Date;
  expiresAt?: Date;
}

export class AdminNotificationService {
  private resend: Resend;
  private twilioClient: any;
  private logger: Logger;
  private supabase = createClient();

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
    this.logger = new Logger('AdminNotificationService');
  }

  /**
   * Send multi-channel notification to admin
   */
  async sendNotification(notification: NotificationData): Promise<string> {
    const startTime = Date.now();

    try {
      this.logger.info('Sending admin notification', {
        adminUserId: notification.adminUserId,
        type: notification.type,
        priority: notification.priority,
        channels: notification.channels,
      });

      // Get admin preferences
      const preferences = await this.getNotificationPreferences(
        notification.adminUserId,
      );

      // Determine channels to use
      const channels = this.determineChannels(notification, preferences);

      // Create notification record
      const notificationRecord = await this.createNotificationRecord({
        ...notification,
        channels,
      });

      if (!notificationRecord?.id) {
        throw new Error('Failed to create notification record');
      }

      // Send via selected channels
      const deliveryPromises = [];

      if (channels.email && preferences.emailAddress) {
        deliveryPromises.push(
          this.sendEmailNotification(
            notificationRecord.id,
            notification,
            preferences.emailAddress,
          ),
        );
      }

      if (channels.sms && preferences.phoneNumber) {
        deliveryPromises.push(
          this.sendSMSNotification(
            notificationRecord.id,
            notification,
            preferences.phoneNumber,
          ),
        );
      }

      if (channels.push) {
        deliveryPromises.push(
          this.sendPushNotification(notificationRecord.id, notification),
        );
      }

      if (channels.inApp) {
        deliveryPromises.push(
          this.markInAppNotification(notificationRecord.id),
        );
      }

      // Wait for all deliveries (don't fail if one fails)
      await Promise.allSettled(deliveryPromises);

      // Handle emergency escalation if needed
      if (notification.priority === 'critical') {
        await this.handleEmergencyEscalation(
          notificationRecord.id,
          notification,
        );
      }

      const duration = Date.now() - startTime;
      this.logger.info('Notification sent successfully', {
        notificationId: notificationRecord.id,
        duration,
      });

      return notificationRecord.id;
    } catch (error) {
      this.logger.error('Failed to send notification', error, {
        adminUserId: notification.adminUserId,
        type: notification.type,
      });
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    notificationId: string,
    notification: NotificationData,
    emailAddress: string,
  ): Promise<void> {
    try {
      const emailContent = this.buildEmailContent(notification);

      const result = await this.resend.emails.send({
        from: 'WedSync Alerts <alerts@wedsync.com>',
        to: [emailAddress],
        subject: `[${notification.priority.toUpperCase()}] ${notification.title}`,
        html: emailContent.html,
        text: emailContent.text,
        headers: {
          'X-Notification-ID': notificationId,
          'X-Priority': notification.priority === 'critical' ? '1' : '3',
        },
      });

      // Update delivery status
      await this.updateDeliveryStatus(notificationId, {
        email_status: 'sent',
        email_sent_at: new Date().toISOString(),
      });

      this.logger.info('Email notification sent', {
        notificationId,
        messageId: result.data?.id,
        emailAddress,
      });
    } catch (error) {
      await this.updateDeliveryStatus(notificationId, {
        email_status: 'failed',
      });
      this.logger.error('Failed to send email notification', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    notificationId: string,
    notification: NotificationData,
    phoneNumber: string,
  ): Promise<void> {
    try {
      const smsContent = this.buildSMSContent(notification);

      const message = await this.twilioClient.messages.create({
        body: smsContent,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio?notificationId=${notificationId}`,
      });

      // Update delivery status
      await this.updateDeliveryStatus(notificationId, {
        sms_status: 'sent',
        sms_sent_at: new Date().toISOString(),
      });

      this.logger.info('SMS notification sent', {
        notificationId,
        messageSid: message.sid,
        phoneNumber,
      });
    } catch (error) {
      await this.updateDeliveryStatus(notificationId, {
        sms_status: 'failed',
      });
      this.logger.error('Failed to send SMS notification', error);
      throw error;
    }
  }

  /**
   * Send push notification (placeholder for future web push implementation)
   */
  private async sendPushNotification(
    notificationId: string,
    notification: NotificationData,
  ): Promise<void> {
    try {
      // For now, just mark as sent - web push implementation would go here
      await this.updateDeliveryStatus(notificationId, {
        push_status: 'sent',
        push_sent_at: new Date().toISOString(),
      });

      this.logger.info('Push notification marked as sent', { notificationId });
    } catch (error) {
      await this.updateDeliveryStatus(notificationId, {
        push_status: 'failed',
      });
      throw error;
    }
  }

  /**
   * Mark in-app notification as shown
   */
  private async markInAppNotification(notificationId: string): Promise<void> {
    await this.updateDeliveryStatus(notificationId, {
      in_app_shown_at: new Date().toISOString(),
    });
  }

  /**
   * Handle emergency escalation for critical notifications
   */
  private async handleEmergencyEscalation(
    notificationId: string,
    notification: NotificationData,
  ): Promise<void> {
    try {
      // Get all super admin users for escalation
      const { data: superAdmins } = await this.supabase
        .from('user_profiles')
        .select('user_id, email, phone')
        .eq('role', 'super_admin');

      if (!superAdmins?.length) {
        this.logger.warn('No super admins found for emergency escalation');
        return;
      }

      // Send escalation notifications after 5 minutes if not acknowledged
      setTimeout(
        async () => {
          const isAcknowledged =
            await this.checkNotificationAcknowledgment(notificationId);

          if (!isAcknowledged) {
            for (const admin of superAdmins) {
              await this.sendEscalationNotification(admin, notification);
            }
          }
        },
        5 * 60 * 1000,
      ); // 5 minutes

      this.logger.info('Emergency escalation scheduled', {
        notificationId,
        escalationTargets: superAdmins.length,
      });
    } catch (error) {
      this.logger.error('Failed to setup emergency escalation', error);
    }
  }

  /**
   * Send escalation notification to super admin
   */
  private async sendEscalationNotification(
    admin: { user_id: string; email?: string; phone?: string },
    originalNotification: NotificationData,
  ): Promise<void> {
    const escalationNotification: NotificationData = {
      adminUserId: admin.user_id,
      title: `ESCALATION: ${originalNotification.title}`,
      message: `Critical alert not acknowledged: ${originalNotification.message}`,
      priority: 'critical',
      type: 'system_alert',
      data: {
        escalation: true,
        originalNotification: originalNotification,
      },
    };

    await this.sendNotification(escalationNotification);
  }

  /**
   * Get notification preferences for admin user
   */
  async getNotificationPreferences(
    adminUserId: string,
  ): Promise<NotificationPreferences> {
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('email, phone, notification_preferences')
      .eq('user_id', adminUserId)
      .single();

    // Default preferences
    const defaultPreferences: NotificationPreferences = {
      adminUserId,
      channels: { email: true, sms: false, push: true, inApp: true },
      emergencyChannels: { email: true, sms: true, push: true, inApp: true },
      emailAddress: profile?.email,
      phoneNumber: profile?.phone,
    };

    // Merge with stored preferences
    if (profile?.notification_preferences) {
      return { ...defaultPreferences, ...profile.notification_preferences };
    }

    return defaultPreferences;
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    adminUserId: string,
    preferences: Partial<NotificationPreferences>,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('user_profiles')
      .update({
        notification_preferences: preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', adminUserId);

    if (error) {
      throw new Error(
        `Failed to update notification preferences: ${error.message}`,
      );
    }

    this.logger.info('Notification preferences updated', { adminUserId });
  }

  /**
   * Determine which channels to use based on notification and preferences
   */
  private determineChannels(
    notification: NotificationData,
    preferences: NotificationPreferences,
  ): NotificationChannel {
    // Use emergency channels for critical notifications
    if (notification.priority === 'critical') {
      return {
        ...preferences.emergencyChannels,
        ...notification.channels, // Override with specific channel requirements
      };
    }

    // Use specified channels or fall back to user preferences
    return {
      ...preferences.channels,
      ...notification.channels,
    };
  }

  /**
   * Create notification record in database
   */
  private async createNotificationRecord(
    notification: NotificationData & { channels: NotificationChannel },
  ): Promise<AdminNotification | null> {
    const record: AdminNotificationInsert = {
      admin_user_id: notification.adminUserId,
      notification_type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      data: notification.data,
      wedding_id: notification.weddingId,
      action_status_id: notification.actionStatusId,
      send_email: notification.channels.email || false,
      send_sms: notification.channels.sms || false,
      send_push: notification.channels.push || false,
      send_in_app: notification.channels.inApp || false,
      expires_at: notification.expiresAt?.toISOString(),
      status: 'unread',
    };

    const { data, error } = await this.supabase
      .from('admin_notifications')
      .insert(record)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create notification record', error);
      throw error;
    }

    return data;
  }

  /**
   * Update delivery status in database
   */
  private async updateDeliveryStatus(
    notificationId: string,
    updates: Record<string, any>,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('admin_notifications')
      .update(updates)
      .eq('id', notificationId);

    if (error) {
      this.logger.error('Failed to update delivery status', error);
    }
  }

  /**
   * Check if notification has been acknowledged
   */
  private async checkNotificationAcknowledgment(
    notificationId: string,
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('admin_notifications')
      .select('status, read_at, dismissed_at')
      .eq('id', notificationId)
      .single();

    return data?.status === 'read' || !!data?.read_at || !!data?.dismissed_at;
  }

  /**
   * Build email content
   */
  private buildEmailContent(notification: NotificationData): {
    html: string;
    text: string;
  } {
    const priorityColor = {
      low: '#10b981',
      normal: '#3b82f6',
      high: '#f59e0b',
      critical: '#ef4444',
    }[notification.priority];

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${priorityColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${notification.title}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Priority: ${notification.priority.toUpperCase()}</p>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${priorityColor};">
            <p style="font-size: 16px; line-height: 1.6; margin: 0;">${notification.message}</p>
          </div>
          ${
            notification.weddingId
              ? `
            <div style="margin-top: 20px; padding: 15px; background: #e5e7eb; border-radius: 6px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Wedding ID: ${notification.weddingId}
              </p>
            </div>
          `
              : ''
          }
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              WedSync Admin Alert System | ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    `;

    const text = `
${notification.title}
Priority: ${notification.priority.toUpperCase()}

${notification.message}

${notification.weddingId ? `Wedding ID: ${notification.weddingId}` : ''}

---
WedSync Admin Alert System
${new Date().toLocaleString()}
    `.trim();

    return { html, text };
  }

  /**
   * Build SMS content (keep under 160 characters when possible)
   */
  private buildSMSContent(notification: NotificationData): string {
    const prefix =
      notification.priority === 'critical' ? '🚨 CRITICAL' : '📢 ALERT';
    const maxLength = 160 - prefix.length - 3; // 3 for spaces and separator

    let message = notification.message;
    if (message.length > maxLength) {
      message = message.substring(0, maxLength - 3) + '...';
    }

    return `${prefix}: ${message}`;
  }

  /**
   * Get notification history for admin
   */
  async getNotificationHistory(
    adminUserId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      priority?: string;
      type?: string;
    } = {},
  ): Promise<AdminNotification[]> {
    let query = this.supabase
      .from('admin_notifications')
      .select('*')
      .eq('admin_user_id', adminUserId)
      .order('created_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.priority) {
      query = query.eq('priority', options.priority);
    }
    if (options.type) {
      query = query.eq('notification_type', options.type);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get notification history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, adminUserId: string): Promise<void> {
    const { error } = await this.supabase
      .from('admin_notifications')
      .update({
        status: 'read',
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('admin_user_id', adminUserId);

    if (error) {
      throw new Error(`Failed to mark notification as read: ${error.message}`);
    }
  }

  /**
   * Dismiss notification
   */
  async dismissNotification(
    notificationId: string,
    adminUserId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('admin_notifications')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('admin_user_id', adminUserId);

    if (error) {
      throw new Error(`Failed to dismiss notification: ${error.message}`);
    }
  }
}

export const adminNotificationService = new AdminNotificationService();
