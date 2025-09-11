import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken';

type SupabaseClient = ReturnType<typeof createClient>;

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface NotificationData {
  supplier_id: string;
  timeline_id: string;
  notification_type:
    | 'schedule_generated'
    | 'schedule_updated'
    | 'schedule_reminder'
    | 'confirmation_request';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data: {
    timeline_name: string;
    wedding_date: string;
    supplier_name: string;
    contact_email: string;
    contact_phone?: string;
    schedule_summary?: any;
    changes_summary?: any;
    access_token?: string;
    confirmation_deadline?: string;
  };
}

interface NotificationTemplate {
  subject: string;
  html_content: string;
  text_content: string;
  sms_content?: string;
}

interface NotificationResult {
  notification_id: string;
  supplier_id: string;
  channels_sent: ('email' | 'sms' | 'push' | 'in_app')[];
  success: boolean;
  errors?: string[];
  tracking_info?: {
    email_id?: string;
    sms_id?: string;
    push_id?: string;
  };
}

interface NotificationPreferences {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
}

// =====================================================
// SUPPLIER NOTIFICATION SERVICE
// =====================================================

export class SupplierNotificationService {
  private supabase: SupabaseClient;
  private resend?: Resend;
  private readonly DEFAULT_FROM_EMAIL = 'schedules@wedsync.app';
  private readonly DEFAULT_FROM_NAME = 'WedSync Schedule Updates';

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;

    // Initialize email service if configured
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  // Main method to send schedule notifications
  async sendScheduleNotification(
    notificationData: NotificationData,
  ): Promise<NotificationResult> {
    try {
      console.log(
        `Sending ${notificationData.notification_type} notification to supplier ${notificationData.supplier_id}`,
      );

      // Get supplier preferences
      const preferences = await this.getNotificationPreferences(
        notificationData.supplier_id,
      );

      // Check if we should send notification now (respect quiet hours)
      if (!this.shouldSendNotification(preferences)) {
        // Schedule for later
        return await this.scheduleNotification(notificationData, preferences);
      }

      // Generate notification templates
      const templates =
        await this.generateNotificationTemplates(notificationData);

      // Create notification record
      const notificationRecord = await this.createNotificationRecord(
        notificationData,
        templates,
      );

      const results: NotificationResult = {
        notification_id: notificationRecord.id,
        supplier_id: notificationData.supplier_id,
        channels_sent: [],
        success: false,
        tracking_info: {},
      };

      const errors: string[] = [];

      // Send email notification
      if (preferences.email_enabled && this.resend) {
        try {
          const emailResult = await this.sendEmailNotification(
            notificationData,
            templates,
          );
          if (emailResult.success) {
            results.channels_sent.push('email');
            results.tracking_info!.email_id = emailResult.email_id;
          } else {
            errors.push(`Email: ${emailResult.error}`);
          }
        } catch (error) {
          errors.push(
            `Email: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Send SMS notification if enabled and phone available
      if (preferences.sms_enabled && notificationData.data.contact_phone) {
        try {
          const smsResult = await this.sendSMSNotification(
            notificationData,
            templates,
          );
          if (smsResult.success) {
            results.channels_sent.push('sms');
            results.tracking_info!.sms_id = smsResult.sms_id;
          } else {
            errors.push(`SMS: ${smsResult.error}`);
          }
        } catch (error) {
          errors.push(
            `SMS: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Send push notification if enabled
      if (preferences.push_enabled) {
        try {
          const pushResult = await this.sendPushNotification(
            notificationData,
            templates,
          );
          if (pushResult.success) {
            results.channels_sent.push('push');
            results.tracking_info!.push_id = pushResult.push_id;
          } else {
            errors.push(`Push: ${pushResult.error}`);
          }
        } catch (error) {
          errors.push(
            `Push: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Always create in-app notification
      try {
        await this.createInAppNotification(notificationData, templates);
        results.channels_sent.push('in_app');
      } catch (error) {
        errors.push(
          `In-app: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }

      results.success = results.channels_sent.length > 0;
      if (errors.length > 0) {
        results.errors = errors;
      }

      // Update notification record with results
      await this.updateNotificationRecord(notificationRecord.id, results);

      console.log(
        `Notification sent via ${results.channels_sent.join(', ')} for supplier ${notificationData.supplier_id}`,
      );

      return results;
    } catch (error) {
      console.error('Error sending schedule notification:', error);
      throw error;
    }
  }

  // Get notification preferences for supplier
  private async getNotificationPreferences(
    supplierId: string,
  ): Promise<NotificationPreferences> {
    const { data: preferences, error } = await this.supabase
      .from('supplier_notification_preferences')
      .select('*')
      .eq('supplier_id', supplierId)
      .single();

    if (error || !preferences) {
      // Return default preferences if not found
      return {
        email_enabled: true,
        sms_enabled: false,
        push_enabled: true,
        timezone: 'Europe/London',
      };
    }

    return preferences;
  }

  // Check if we should send notification now (respect quiet hours)
  private shouldSendNotification(
    preferences: NotificationPreferences,
  ): boolean {
    if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) {
      return true; // No quiet hours set
    }

    const now = new Date();
    const timezone = preferences.timezone || 'Europe/London';

    try {
      const currentTime = now.toLocaleTimeString('en-GB', {
        timeZone: timezone,
        hour12: false,
      });

      const quietStart = preferences.quiet_hours_start;
      const quietEnd = preferences.quiet_hours_end;

      // Simple time comparison (this could be improved for cross-midnight ranges)
      return !(currentTime >= quietStart && currentTime <= quietEnd);
    } catch (error) {
      console.warn('Error checking quiet hours:', error);
      return true; // Send if we can't determine
    }
  }

  // Schedule notification for later
  private async scheduleNotification(
    notificationData: NotificationData,
    preferences: NotificationPreferences,
  ): Promise<NotificationResult> {
    // TODO: Implement notification scheduling
    // This would typically use a job queue like Redis Bull or similar

    console.log(
      `Scheduling notification for supplier ${notificationData.supplier_id} outside quiet hours`,
    );

    return {
      notification_id: `scheduled-${Date.now()}`,
      supplier_id: notificationData.supplier_id,
      channels_sent: [],
      success: true,
      errors: ['Notification scheduled for later due to quiet hours'],
    };
  }

  // Generate notification templates
  private async generateNotificationTemplates(
    notificationData: NotificationData,
  ): Promise<NotificationTemplate> {
    const { data, notification_type } = notificationData;

    switch (notification_type) {
      case 'schedule_generated':
        return {
          subject: `Your Wedding Schedule - ${data.timeline_name}`,
          html_content: this.generateScheduleGeneratedHTMLTemplate(data),
          text_content: this.generateScheduleGeneratedTextTemplate(data),
          sms_content: `Your wedding schedule for ${data.timeline_name} (${data.wedding_date}) is ready. View: ${this.generateScheduleAccessLink(notificationData)}`,
        };

      case 'schedule_updated':
        return {
          subject: `Schedule Update - ${data.timeline_name}`,
          html_content: this.generateScheduleUpdatedHTMLTemplate(data),
          text_content: this.generateScheduleUpdatedTextTemplate(data),
          sms_content: `Wedding schedule updated for ${data.timeline_name}. ${data.changes_summary?.requires_reconfirmation ? 'Please review and confirm.' : 'No action needed.'} View: ${this.generateScheduleAccessLink(notificationData)}`,
        };

      case 'confirmation_request':
        return {
          subject: `Please Confirm Your Schedule - ${data.timeline_name}`,
          html_content: this.generateConfirmationRequestHTMLTemplate(data),
          text_content: this.generateConfirmationRequestTextTemplate(data),
          sms_content: `Please confirm your wedding schedule for ${data.timeline_name} by ${data.confirmation_deadline}. Confirm: ${this.generateScheduleAccessLink(notificationData)}`,
        };

      case 'schedule_reminder':
        return {
          subject: `Upcoming Wedding Reminder - ${data.timeline_name}`,
          html_content: this.generateScheduleReminderHTMLTemplate(data),
          text_content: this.generateScheduleReminderTextTemplate(data),
          sms_content: `Reminder: ${data.timeline_name} wedding is in 3 days. Your schedule: ${this.generateScheduleAccessLink(notificationData)}`,
        };

      default:
        throw new Error(`Unknown notification type: ${notification_type}`);
    }
  }

  // Generate schedule access link with token
  private generateScheduleAccessLink(
    notificationData: NotificationData,
  ): string {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'https://app.wedsync.com';

    // Generate access token if not provided
    let accessToken = notificationData.data.access_token;
    if (!accessToken) {
      accessToken = this.generateSupplierAccessToken(
        notificationData.supplier_id,
        notificationData.timeline_id,
      );
    }

    return `${baseUrl}/supplier-schedule/${notificationData.supplier_id}?timeline_id=${notificationData.timeline_id}&token=${accessToken}`;
  }

  // Generate supplier access token
  private generateSupplierAccessToken(
    supplierId: string,
    timelineId: string,
  ): string {
    const payload = {
      supplier_id: supplierId,
      timeline_id: timelineId,
      type: 'schedule_access',
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '30d' });
  }

  // Create notification record in database
  private async createNotificationRecord(
    notificationData: NotificationData,
    templates: NotificationTemplate,
  ) {
    const { data, error } = await this.supabase
      .from('supplier_notifications')
      .insert({
        supplier_id: notificationData.supplier_id,
        timeline_id: notificationData.timeline_id,
        type: notificationData.notification_type,
        priority: notificationData.priority,
        subject: templates.subject,
        content: templates.html_content,
        data: notificationData.data,
        status: 'sending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create notification record: ${error.message}`);
    }

    return data;
  }

  // Update notification record with results
  private async updateNotificationRecord(
    notificationId: string,
    results: NotificationResult,
  ) {
    await this.supabase
      .from('supplier_notifications')
      .update({
        status: results.success ? 'sent' : 'failed',
        channels_sent: results.channels_sent,
        tracking_info: results.tracking_info,
        errors: results.errors,
        sent_at: new Date().toISOString(),
      })
      .eq('id', notificationId);
  }

  // Send email notification
  private async sendEmailNotification(
    notificationData: NotificationData,
    templates: NotificationTemplate,
  ): Promise<{ success: boolean; email_id?: string; error?: string }> {
    if (!this.resend) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const result = await this.resend.emails.send({
        from: `${this.DEFAULT_FROM_NAME} <${this.DEFAULT_FROM_EMAIL}>`,
        to: [notificationData.data.contact_email],
        subject: templates.subject,
        html: templates.html_content,
        text: templates.text_content,
        tags: [
          { name: 'type', value: notificationData.notification_type },
          { name: 'supplier_id', value: notificationData.supplier_id },
        ],
      });

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return { success: true, email_id: result.data?.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error',
      };
    }
  }

  // Send SMS notification
  private async sendSMSNotification(
    notificationData: NotificationData,
    templates: NotificationTemplate,
  ): Promise<{ success: boolean; sms_id?: string; error?: string }> {
    // TODO: Implement SMS service integration (Twilio, etc.)
    console.log('SMS sending not implemented yet');
    return { success: false, error: 'SMS service not implemented' };
  }

  // Send push notification
  private async sendPushNotification(
    notificationData: NotificationData,
    templates: NotificationTemplate,
  ): Promise<{ success: boolean; push_id?: string; error?: string }> {
    // TODO: Implement push notification service
    console.log('Push notification sending not implemented yet');
    return {
      success: false,
      error: 'Push notification service not implemented',
    };
  }

  // Create in-app notification
  private async createInAppNotification(
    notificationData: NotificationData,
    templates: NotificationTemplate,
  ) {
    await this.supabase.from('in_app_notifications').insert({
      supplier_id: notificationData.supplier_id,
      title: templates.subject,
      message: templates.text_content,
      type: notificationData.notification_type,
      data: notificationData.data,
      is_read: false,
      created_at: new Date().toISOString(),
    });
  }

  // Template generation methods
  private generateScheduleGeneratedHTMLTemplate(data: any): string {
    return `
      <h2>Your Wedding Schedule is Ready!</h2>
      <p>Hello ${data.supplier_name},</p>
      <p>Your wedding day schedule for <strong>${data.timeline_name}</strong> on <strong>${data.wedding_date}</strong> has been generated and is ready for your review.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Schedule Summary:</h3>
        <ul>
          ${data.schedule_summary?.total_events ? `<li>Total Events: ${data.schedule_summary.total_events}</li>` : ''}
          ${data.schedule_summary?.earliest_arrival ? `<li>First Arrival: ${new Date(data.schedule_summary.earliest_arrival).toLocaleString()}</li>` : ''}
          ${data.schedule_summary?.latest_departure ? `<li>Last Departure: ${new Date(data.schedule_summary.latest_departure).toLocaleString()}</li>` : ''}
        </ul>
      </div>

      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Review your complete schedule using the link below</li>
        <li>Confirm your availability for all events</li>
        <li>Add any special requirements or notes</li>
      </ol>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.generateScheduleAccessLink({ supplier_id: data.supplier_id, timeline_id: data.timeline_id, data } as NotificationData)}" 
           style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View Your Schedule
        </a>
      </div>

      <p>If you have any questions or need to make changes, please contact the wedding planner directly.</p>
      
      <p>Thank you,<br>The WedSync Team</p>
    `;
  }

  private generateScheduleGeneratedTextTemplate(data: any): string {
    return `
Hello ${data.supplier_name},

Your wedding day schedule for ${data.timeline_name} on ${data.wedding_date} has been generated and is ready for your review.

Schedule Summary:
${data.schedule_summary?.total_events ? `- Total Events: ${data.schedule_summary.total_events}` : ''}
${data.schedule_summary?.earliest_arrival ? `- First Arrival: ${new Date(data.schedule_summary.earliest_arrival).toLocaleString()}` : ''}
${data.schedule_summary?.latest_departure ? `- Last Departure: ${new Date(data.schedule_summary.latest_departure).toLocaleString()}` : ''}

Next Steps:
1. Review your complete schedule
2. Confirm your availability for all events  
3. Add any special requirements or notes

View your schedule: ${this.generateScheduleAccessLink({ supplier_id: data.supplier_id, timeline_id: data.timeline_id, data } as NotificationData)}

If you have any questions, please contact the wedding planner directly.

Thank you,
The WedSync Team
    `.trim();
  }

  private generateScheduleUpdatedHTMLTemplate(data: any): string {
    const changes = data.changes_summary || {};
    return `
      <h2>Your Wedding Schedule Has Been Updated</h2>
      <p>Hello ${data.supplier_name},</p>
      <p>The wedding schedule for <strong>${data.timeline_name}</strong> on <strong>${data.wedding_date}</strong> has been updated.</p>
      
      <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <h3>What Changed:</h3>
        <ul>
          ${changes.change_details ? changes.change_details.map((detail: string) => `<li>${detail}</li>`).join('') : '<li>Schedule timing updated</li>'}
        </ul>
      </div>

      ${
        changes.requires_reconfirmation
          ? `
        <div style="background: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <strong>⚠️ Action Required:</strong> These changes require your confirmation. Please review and confirm your updated schedule.
        </div>
      `
          : `
        <div style="background: #d1edff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0084ff;">
          <strong>ℹ️ No Action Required:</strong> These are minor updates that don't affect your timing significantly.
        </div>
      `
      }

      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.generateScheduleAccessLink({ supplier_id: data.supplier_id, timeline_id: data.timeline_id, data } as NotificationData)}" 
           style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          ${changes.requires_reconfirmation ? 'Review & Confirm Schedule' : 'View Updated Schedule'}
        </a>
      </div>

      <p>Thank you,<br>The WedSync Team</p>
    `;
  }

  private generateScheduleUpdatedTextTemplate(data: any): string {
    const changes = data.changes_summary || {};
    return `
Hello ${data.supplier_name},

The wedding schedule for ${data.timeline_name} on ${data.wedding_date} has been updated.

What Changed:
${changes.change_details ? changes.change_details.map((detail: string) => `- ${detail}`).join('\n') : '- Schedule timing updated'}

${
  changes.requires_reconfirmation
    ? '⚠️ ACTION REQUIRED: These changes require your confirmation. Please review and confirm your updated schedule.'
    : "ℹ️ No action required - these are minor updates that don't affect your timing significantly."
}

View your updated schedule: ${this.generateScheduleAccessLink({ supplier_id: data.supplier_id, timeline_id: data.timeline_id, data } as NotificationData)}

Thank you,
The WedSync Team
    `.trim();
  }

  private generateConfirmationRequestHTMLTemplate(data: any): string {
    return `
      <h2>Please Confirm Your Wedding Schedule</h2>
      <p>Hello ${data.supplier_name},</p>
      <p>We need your confirmation for the wedding schedule for <strong>${data.timeline_name}</strong> on <strong>${data.wedding_date}</strong>.</p>
      
      ${
        data.confirmation_deadline
          ? `
        <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <strong>⏰ Confirmation Deadline:</strong> ${data.confirmation_deadline}
        </div>
      `
          : ''
      }

      <p>Please review your schedule and confirm:</p>
      <ul>
        <li>Your availability for all assigned events</li>
        <li>Arrival and departure times</li>
        <li>Any special requirements or equipment needs</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.generateScheduleAccessLink({ supplier_id: data.supplier_id, timeline_id: data.timeline_id, data } as NotificationData)}" 
           style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Confirm Your Schedule
        </a>
      </div>

      <p>If you can't confirm by the deadline or have concerns, please contact the wedding planner immediately.</p>
      
      <p>Thank you,<br>The WedSync Team</p>
    `;
  }

  private generateConfirmationRequestTextTemplate(data: any): string {
    return `
Hello ${data.supplier_name},

We need your confirmation for the wedding schedule for ${data.timeline_name} on ${data.wedding_date}.

${data.confirmation_deadline ? `⏰ Confirmation Deadline: ${data.confirmation_deadline}\n` : ''}

Please review and confirm:
- Your availability for all assigned events
- Arrival and departure times  
- Any special requirements or equipment needs

Confirm your schedule: ${this.generateScheduleAccessLink({ supplier_id: data.supplier_id, timeline_id: data.timeline_id, data } as NotificationData)}

If you can't confirm by the deadline or have concerns, please contact the wedding planner immediately.

Thank you,
The WedSync Team
    `.trim();
  }

  private generateScheduleReminderHTMLTemplate(data: any): string {
    return `
      <h2>Wedding Day Reminder</h2>
      <p>Hello ${data.supplier_name},</p>
      <p>This is a friendly reminder that <strong>${data.timeline_name}</strong> is coming up on <strong>${data.wedding_date}</strong>.</p>
      
      <div style="background: #d1edff; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3>Final Checklist:</h3>
        <ul>
          <li>✓ Review your schedule one more time</li>
          <li>✓ Prepare and pack all necessary equipment</li>
          <li>✓ Plan your travel route and parking</li>
          <li>✓ Have emergency contact numbers ready</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${this.generateScheduleAccessLink({ supplier_id: data.supplier_id, timeline_id: data.timeline_id, data } as NotificationData)}" 
           style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
          View Your Schedule
        </a>
      </div>

      <p>Wishing you a successful wedding day!</p>
      
      <p>Best regards,<br>The WedSync Team</p>
    `;
  }

  private generateScheduleReminderTextTemplate(data: any): string {
    return `
Hello ${data.supplier_name},

This is a friendly reminder that ${data.timeline_name} is coming up on ${data.wedding_date}.

Final Checklist:
✓ Review your schedule one more time
✓ Prepare and pack all necessary equipment  
✓ Plan your travel route and parking
✓ Have emergency contact numbers ready

View your schedule: ${this.generateScheduleAccessLink({ supplier_id: data.supplier_id, timeline_id: data.timeline_id, data } as NotificationData)}

Wishing you a successful wedding day!

Best regards,
The WedSync Team
    `.trim();
  }

  // Static method to create service instance
  static async create(): Promise<SupplierNotificationService> {
    const supabase = await createClient();
    return new SupplierNotificationService(supabase);
  }

  // Static helper methods for common notification scenarios
  static async notifyScheduleGenerated(
    supplierId: string,
    timelineId: string,
    scheduleData: any,
  ): Promise<NotificationResult> {
    const service = await SupplierNotificationService.create();
    return service.sendScheduleNotification({
      supplier_id: supplierId,
      timeline_id: timelineId,
      notification_type: 'schedule_generated',
      priority: 'medium',
      data: {
        timeline_name: scheduleData.timeline_name,
        wedding_date: scheduleData.wedding_date,
        supplier_name: scheduleData.supplier_name,
        contact_email: scheduleData.contact_email,
        contact_phone: scheduleData.contact_phone,
        schedule_summary: {
          total_events: scheduleData.total_events,
          earliest_arrival: scheduleData.earliest_arrival,
          latest_departure: scheduleData.latest_departure,
        },
      },
    });
  }

  static async notifyScheduleUpdated(
    supplierId: string,
    timelineId: string,
    updateData: any,
  ): Promise<NotificationResult> {
    const service = await SupplierNotificationService.create();
    return service.sendScheduleNotification({
      supplier_id: supplierId,
      timeline_id: timelineId,
      notification_type: 'schedule_updated',
      priority: updateData.changes_summary?.requires_reconfirmation
        ? 'high'
        : 'medium',
      data: {
        timeline_name: updateData.timeline_name,
        wedding_date: updateData.wedding_date,
        supplier_name: updateData.supplier_name,
        contact_email: updateData.contact_email,
        contact_phone: updateData.contact_phone,
        changes_summary: updateData.changes_summary,
      },
    });
  }

  static async requestScheduleConfirmation(
    supplierId: string,
    timelineId: string,
    confirmationData: any,
  ): Promise<NotificationResult> {
    const service = await SupplierNotificationService.create();
    return service.sendScheduleNotification({
      supplier_id: supplierId,
      timeline_id: timelineId,
      notification_type: 'confirmation_request',
      priority: 'high',
      data: {
        timeline_name: confirmationData.timeline_name,
        wedding_date: confirmationData.wedding_date,
        supplier_name: confirmationData.supplier_name,
        contact_email: confirmationData.contact_email,
        contact_phone: confirmationData.contact_phone,
        confirmation_deadline: confirmationData.confirmation_deadline,
      },
    });
  }
}

export default SupplierNotificationService;
