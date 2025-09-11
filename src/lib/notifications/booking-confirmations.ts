import { createClient } from '@/lib/supabase/server';
import { smsServiceConnector } from '@/lib/services/sms-connector';
import { whatsappConnector } from '@/lib/services/whatsapp-connector';
import { formatInTimeZone } from 'date-fns-tz';
import { format } from 'date-fns';

export interface BookingConfirmationData {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  plannerName: string;
  plannerPhone: string;
  meetingType: string;
  scheduledFor: Date;
  location?: string;
  notes?: string;
  timeZone: string;
  rescheduleToken?: string;
  cancelToken?: string;
}

export interface ConfirmationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: 'sms' | 'whatsapp';
  cost?: number;
}

export interface NotificationPreferences {
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  preferred_channel: 'sms' | 'whatsapp' | 'email';
  booking_confirmations: boolean;
  reminders_24h: boolean;
  reminders_2h: boolean;
  reminders_15min: boolean;
}

export class BookingConfirmationService {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  async sendBookingConfirmation(
    data: BookingConfirmationData,
  ): Promise<ConfirmationResult[]> {
    const results: ConfirmationResult[] = [];

    try {
      // Get client notification preferences
      const preferences = await this.getNotificationPreferences(
        data.clientPhone,
      );

      // Send to client via preferred channel
      const clientResult = await this.sendClientConfirmation(data, preferences);
      results.push(clientResult);

      // Send to planner (always SMS for now)
      const plannerResult = await this.sendPlannerNotification(data);
      results.push(plannerResult);

      // Log all confirmation attempts
      await this.logConfirmationAttempts(data, results);

      // Schedule automatic reminders
      await this.scheduleAutomaticReminders(data);

      return results;
    } catch (error) {
      console.error('Booking confirmation error:', error);
      throw new Error('Failed to send booking confirmations');
    }
  }

  private async sendClientConfirmation(
    data: BookingConfirmationData,
    preferences: NotificationPreferences,
  ): Promise<ConfirmationResult> {
    if (!preferences.booking_confirmations) {
      return {
        success: false,
        channel: 'sms',
        error: 'Client has disabled booking confirmations',
      };
    }

    // Try preferred channel first
    if (
      preferences.preferred_channel === 'whatsapp' &&
      preferences.whatsapp_enabled
    ) {
      const whatsappResult = await this.sendWhatsAppConfirmation(data);
      if (whatsappResult.success) {
        return whatsappResult;
      }
    }

    // Fallback to SMS
    if (preferences.sms_enabled) {
      return await this.sendSMSConfirmation(data);
    }

    return {
      success: false,
      channel: 'sms',
      error: 'No available notification channels for client',
    };
  }

  private async sendWhatsAppConfirmation(
    data: BookingConfirmationData,
  ): Promise<ConfirmationResult> {
    try {
      const formattedDate = formatInTimeZone(
        data.scheduledFor,
        data.timeZone,
        'EEEE, MMMM do, yyyy',
      );

      const formattedTime = formatInTimeZone(
        data.scheduledFor,
        data.timeZone,
        'h:mm a z',
      );

      const result = await whatsappConnector.sendBookingConfirmation({
        clientPhone: data.clientPhone,
        clientName: data.clientName,
        plannerName: data.plannerName,
        meetingType: data.meetingType,
        date: formattedDate,
        time: formattedTime,
        location: data.location,
        notes: data.notes,
        bookingId: data.bookingId,
      });

      return {
        success: result.success,
        messageId: result.messageId,
        channel: 'whatsapp',
        cost: result.cost,
        error: result.error,
      };
    } catch (error: any) {
      return {
        success: false,
        channel: 'whatsapp',
        error: error.message || 'WhatsApp sending failed',
      };
    }
  }

  private async sendSMSConfirmation(
    data: BookingConfirmationData,
  ): Promise<ConfirmationResult> {
    try {
      const message = this.generateClientConfirmationMessage(data);

      const result = await smsServiceConnector.sendSMS({
        template_id: 'booking_confirmation',
        recipient: {
          phone: data.clientPhone,
          name: data.clientName,
        },
        variables: {
          client_name: data.clientName,
          planner_name: data.plannerName,
          meeting_type: data.meetingType,
          date: formatInTimeZone(
            data.scheduledFor,
            data.timeZone,
            'EEEE, MMMM do, yyyy',
          ),
          time: formatInTimeZone(data.scheduledFor, data.timeZone, 'h:mm a z'),
          location: data.location || 'TBD',
          notes: data.notes || '',
          booking_id: data.bookingId,
          reschedule_link: data.rescheduleToken
            ? `https://wedsync.com/reschedule/${data.rescheduleToken}`
            : '',
          cancel_link: data.cancelToken
            ? `https://wedsync.com/cancel/${data.cancelToken}`
            : '',
        },
        priority: 'high',
        enable_delivery_tracking: true,
        compliance_data: {
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
          opt_in_method: 'single_opt_in',
        },
      });

      return {
        success: result.status === 'sent' || result.status === 'queued',
        messageId: result.message_id,
        channel: 'sms',
        cost: result.cost_estimate,
        error: result.error_message,
      };
    } catch (error: any) {
      return {
        success: false,
        channel: 'sms',
        error: error.message || 'SMS sending failed',
      };
    }
  }

  private async sendPlannerNotification(
    data: BookingConfirmationData,
  ): Promise<ConfirmationResult> {
    try {
      const message = this.generatePlannerNotificationMessage(data);

      const result = await smsServiceConnector.sendSMS({
        template_id: 'planner_booking_alert',
        recipient: {
          phone: data.plannerPhone,
          name: data.plannerName,
        },
        variables: {
          client_name: data.clientName,
          client_phone: data.clientPhone,
          meeting_type: data.meetingType,
          date: formatInTimeZone(
            data.scheduledFor,
            data.timeZone,
            'EEEE, MMMM do, yyyy',
          ),
          time: formatInTimeZone(data.scheduledFor, data.timeZone, 'h:mm a z'),
          location: data.location || 'TBD',
          notes: data.notes || 'None',
          booking_id: data.bookingId,
          manage_link: `https://wedsync.com/dashboard/bookings/${data.bookingId}`,
        },
        priority: 'normal',
        compliance_data: {
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
          opt_in_method: 'single_opt_in',
        },
      });

      return {
        success: result.status === 'sent' || result.status === 'queued',
        messageId: result.message_id,
        channel: 'sms',
        cost: result.cost_estimate,
        error: result.error_message,
      };
    } catch (error: any) {
      return {
        success: false,
        channel: 'sms',
        error: error.message || 'Planner SMS failed',
      };
    }
  }

  private generateClientConfirmationMessage(
    data: BookingConfirmationData,
  ): string {
    const formattedDate = formatInTimeZone(
      data.scheduledFor,
      data.timeZone,
      'EEEE, MMMM do, yyyy',
    );

    const formattedTime = formatInTimeZone(
      data.scheduledFor,
      data.timeZone,
      'h:mm a z',
    );

    let message = `🎉 Meeting Confirmed!\n\n`;
    message += `Hi ${data.clientName}! Your ${data.meetingType.toLowerCase()} is confirmed with ${data.plannerName}.\n\n`;
    message += `📅 Date: ${formattedDate}\n`;
    message += `⏰ Time: ${formattedTime}\n`;

    if (data.location) {
      message += `📍 Location: ${data.location}\n`;
    }

    if (data.notes) {
      message += `📝 Notes: ${data.notes}\n`;
    }

    message += `\n💍 We're excited to help make your wedding perfect!\n\n`;
    message += `Booking ID: ${data.bookingId}\n\n`;

    if (data.rescheduleToken) {
      message += `Need to reschedule? Visit: https://wedsync.com/reschedule/${data.rescheduleToken}\n`;
    }

    if (data.cancelToken) {
      message += `Need to cancel? Visit: https://wedsync.com/cancel/${data.cancelToken}\n`;
    }

    message += `\nReply HELP for support`;

    return message;
  }

  private generatePlannerNotificationMessage(
    data: BookingConfirmationData,
  ): string {
    const formattedDate = formatInTimeZone(
      data.scheduledFor,
      data.timeZone,
      'EEEE, MMMM do, yyyy',
    );

    const formattedTime = formatInTimeZone(
      data.scheduledFor,
      data.timeZone,
      'h:mm a z',
    );

    let message = `📅 New Booking Alert\n\n`;
    message += `Client: ${data.clientName}\n`;
    message += `Meeting: ${data.meetingType}\n`;
    message += `Date: ${formattedDate}\n`;
    message += `Time: ${formattedTime}\n`;
    message += `Phone: ${data.clientPhone}\n`;

    if (data.location) {
      message += `Location: ${data.location}\n`;
    }

    if (data.notes) {
      message += `Notes: ${data.notes}\n`;
    }

    message += `\nBooking ID: ${data.bookingId}\n`;
    message += `Manage: https://wedsync.com/dashboard/bookings/${data.bookingId}`;

    return message;
  }

  async sendBookingReminder(
    bookingId: string,
    hoursBeforeReminder: number = 24,
  ): Promise<ConfirmationResult[]> {
    try {
      const { data: booking, error } = await this.supabase
        .from('bookings')
        .select(
          `
          *,
          clients(name, phone),
          wedding_planners(name, phone, time_zone)
        `,
        )
        .eq('id', bookingId)
        .single();

      if (error || !booking) {
        throw new Error('Booking not found');
      }

      const scheduledTime = new Date(booking.scheduled_for);
      const reminderTime = new Date(
        scheduledTime.getTime() - hoursBeforeReminder * 60 * 60 * 1000,
      );
      const now = new Date();

      if (now < reminderTime) {
        throw new Error('Too early to send reminder');
      }

      const preferences = await this.getNotificationPreferences(
        booking.clients.phone,
      );

      // Check if this type of reminder is enabled
      const reminderEnabled =
        hoursBeforeReminder === 24
          ? preferences.reminders_24h
          : hoursBeforeReminder === 2
            ? preferences.reminders_2h
            : hoursBeforeReminder === 0.25
              ? preferences.reminders_15min
              : false;

      if (!reminderEnabled) {
        return [
          {
            success: false,
            channel: 'sms',
            error: `${hoursBeforeReminder}h reminders disabled for client`,
          },
        ];
      }

      const results: ConfirmationResult[] = [];

      // Send reminder via preferred channel
      if (
        preferences.preferred_channel === 'whatsapp' &&
        preferences.whatsapp_enabled
      ) {
        const whatsappResult = await this.sendWhatsAppReminder(
          booking,
          hoursBeforeReminder,
        );
        results.push(whatsappResult);
      } else if (preferences.sms_enabled) {
        const smsResult = await this.sendSMSReminder(
          booking,
          hoursBeforeReminder,
        );
        results.push(smsResult);
      }

      // Log reminder attempts
      for (const result of results) {
        await this.supabase.from('booking_notifications').insert({
          booking_id: bookingId,
          type: 'reminder',
          channel: result.channel,
          success: result.success,
          message_id: result.messageId,
          hours_before: hoursBeforeReminder,
          sent_at: new Date().toISOString(),
        });
      }

      return results;
    } catch (error) {
      console.error('Reminder sending error:', error);
      throw new Error('Failed to send reminder');
    }
  }

  private async sendWhatsAppReminder(
    booking: any,
    hoursBeforeReminder: number,
  ): Promise<ConfirmationResult> {
    try {
      const formattedDate = formatInTimeZone(
        new Date(booking.scheduled_for),
        booking.wedding_planners.time_zone || 'UTC',
        'EEEE, MMMM do, yyyy',
      );

      const formattedTime = formatInTimeZone(
        new Date(booking.scheduled_for),
        booking.wedding_planners.time_zone || 'UTC',
        'h:mm a z',
      );

      const result = await whatsappConnector.sendBookingReminder({
        clientPhone: booking.clients.phone,
        clientName: booking.clients.name,
        meetingType: booking.meeting_type,
        date: formattedDate,
        time: formattedTime,
        location: booking.location,
        hoursUntil: hoursBeforeReminder,
        bookingId: booking.id,
      });

      return {
        success: result.success,
        messageId: result.messageId,
        channel: 'whatsapp',
        cost: result.cost,
        error: result.error,
      };
    } catch (error: any) {
      return {
        success: false,
        channel: 'whatsapp',
        error: error.message,
      };
    }
  }

  private async sendSMSReminder(
    booking: any,
    hoursBeforeReminder: number,
  ): Promise<ConfirmationResult> {
    try {
      const timeText =
        hoursBeforeReminder === 24
          ? 'tomorrow'
          : hoursBeforeReminder === 2
            ? 'in 2 hours'
            : hoursBeforeReminder === 0.25
              ? 'in 15 minutes'
              : `in ${hoursBeforeReminder} hours`;

      const result = await smsServiceConnector.sendSMS({
        template_id: 'booking_reminder',
        recipient: {
          phone: booking.clients.phone,
          name: booking.clients.name,
        },
        variables: {
          client_name: booking.clients.name,
          meeting_type: booking.meeting_type,
          time_text: timeText,
          date: formatInTimeZone(
            new Date(booking.scheduled_for),
            booking.wedding_planners.time_zone || 'UTC',
            'EEEE, MMMM do, yyyy',
          ),
          time: formatInTimeZone(
            new Date(booking.scheduled_for),
            booking.wedding_planners.time_zone || 'UTC',
            'h:mm a z',
          ),
          location: booking.location || 'TBD',
          booking_id: booking.id,
        },
        priority: 'normal',
        compliance_data: {
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
          opt_in_method: 'single_opt_in',
        },
      });

      return {
        success: result.status === 'sent' || result.status === 'queued',
        messageId: result.message_id,
        channel: 'sms',
        cost: result.cost_estimate,
        error: result.error_message,
      };
    } catch (error: any) {
      return {
        success: false,
        channel: 'sms',
        error: error.message,
      };
    }
  }

  async handleBookingCancellation(
    cancelToken: string,
    reason?: string,
  ): Promise<boolean> {
    try {
      const { data: booking, error } = await this.supabase
        .from('bookings')
        .select(
          `
          *,
          clients(name, phone),
          wedding_planners(name, phone)
        `,
        )
        .eq('cancel_token', cancelToken)
        .eq('status', 'confirmed')
        .single();

      if (error || !booking) {
        throw new Error('Invalid cancellation token or booking not found');
      }

      // Update booking status
      const { error: updateError } = await this.supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || 'Client requested',
        })
        .eq('id', booking.id);

      if (updateError) {
        throw new Error('Failed to cancel booking');
      }

      // Send cancellation confirmations
      const preferences = await this.getNotificationPreferences(
        booking.clients.phone,
      );

      // Confirm to client via preferred channel
      if (
        preferences.preferred_channel === 'whatsapp' &&
        preferences.whatsapp_enabled
      ) {
        await whatsappConnector.sendCancellationConfirmation({
          clientPhone: booking.clients.phone,
          clientName: booking.clients.name,
          meetingType: booking.meeting_type,
          date: format(new Date(booking.scheduled_for), 'PPP'),
          time: format(new Date(booking.scheduled_for), 'p'),
          reason: reason,
          bookingId: booking.id,
        });
      } else if (preferences.sms_enabled) {
        await smsServiceConnector.sendSMS({
          template_id: 'booking_cancelled',
          recipient: {
            phone: booking.clients.phone,
            name: booking.clients.name,
          },
          variables: {
            client_name: booking.clients.name,
            meeting_type: booking.meeting_type,
            date: format(new Date(booking.scheduled_for), 'PPP'),
            time: format(new Date(booking.scheduled_for), 'p'),
            reason: reason || 'Not specified',
            booking_id: booking.id,
          },
          priority: 'normal',
          compliance_data: {
            consent_given: true,
            consent_timestamp: new Date().toISOString(),
            opt_in_method: 'single_opt_in',
          },
        });
      }

      // Notify planner
      const plannerMessage = `❌ Meeting Cancelled\n\n${booking.clients.name} cancelled their ${booking.meeting_type} scheduled for ${format(new Date(booking.scheduled_for), 'PPp')}.\n\nReason: ${reason || 'Not specified'}\n\nBooking ID: ${booking.id}`;

      await smsServiceConnector.sendSMS({
        custom_message: plannerMessage,
        recipient: {
          phone: booking.wedding_planners.phone,
          name: booking.wedding_planners.name,
        },
        variables: {},
        priority: 'normal',
        compliance_data: {
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
          opt_in_method: 'single_opt_in',
        },
      });

      return true;
    } catch (error) {
      console.error('Cancellation error:', error);
      return false;
    }
  }

  private async getNotificationPreferences(
    clientPhone: string,
  ): Promise<NotificationPreferences> {
    try {
      const { data: client, error } = await this.supabase
        .from('clients')
        .select('notification_preferences')
        .eq('phone', clientPhone)
        .single();

      if (error || !client?.notification_preferences) {
        // Return default preferences
        return {
          sms_enabled: true,
          whatsapp_enabled: false,
          email_enabled: true,
          preferred_channel: 'sms',
          booking_confirmations: true,
          reminders_24h: true,
          reminders_2h: true,
          reminders_15min: false,
        };
      }

      return client.notification_preferences as NotificationPreferences;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      // Return default preferences on error
      return {
        sms_enabled: true,
        whatsapp_enabled: false,
        email_enabled: true,
        preferred_channel: 'sms',
        booking_confirmations: true,
        reminders_24h: true,
        reminders_2h: true,
        reminders_15min: false,
      };
    }
  }

  private async logConfirmationAttempts(
    data: BookingConfirmationData,
    results: ConfirmationResult[],
  ): Promise<void> {
    try {
      for (const result of results) {
        await this.supabase.from('booking_notifications').insert({
          booking_id: data.bookingId,
          type: 'confirmation',
          channel: result.channel,
          success: result.success,
          message_id: result.messageId,
          error_message: result.error,
          cost: result.cost,
          sent_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to log confirmation attempts:', error);
    }
  }

  private async scheduleAutomaticReminders(
    data: BookingConfirmationData,
  ): Promise<void> {
    try {
      const scheduledTime = data.scheduledFor;
      const reminderTimes = [
        { hours: 24, label: '24 hours' },
        { hours: 2, label: '2 hours' },
        { hours: 0.25, label: '15 minutes' },
      ];

      for (const reminder of reminderTimes) {
        const reminderTime = new Date(
          scheduledTime.getTime() - reminder.hours * 60 * 60 * 1000,
        );

        // Only schedule if reminder is in the future
        if (reminderTime > new Date()) {
          await this.supabase.from('scheduled_notifications').insert({
            booking_id: data.bookingId,
            notification_type: 'reminder',
            scheduled_for: reminderTime.toISOString(),
            hours_before: reminder.hours,
            status: 'pending',
          });
        }
      }
    } catch (error) {
      console.error('Failed to schedule automatic reminders:', error);
    }
  }

  async processScheduledNotifications(): Promise<void> {
    try {
      const now = new Date();
      const { data: notifications, error } = await this.supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', now.toISOString());

      if (error || !notifications?.length) {
        return;
      }

      for (const notification of notifications) {
        try {
          if (notification.notification_type === 'reminder') {
            await this.sendBookingReminder(
              notification.booking_id,
              notification.hours_before,
            );
          }

          // Mark as processed
          await this.supabase
            .from('scheduled_notifications')
            .update({
              status: 'sent',
              processed_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
        } catch (error) {
          console.error(
            `Failed to process notification ${notification.id}:`,
            error,
          );

          // Mark as failed
          await this.supabase
            .from('scheduled_notifications')
            .update({
              status: 'failed',
              processed_at: new Date().toISOString(),
              error_message:
                error instanceof Error ? error.message : 'Unknown error',
            })
            .eq('id', notification.id);
        }
      }
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
    }
  }
}
