import { createClient } from '@/lib/supabase/server';

export interface NotificationData {
  recipientId: string;
  recipientType: 'supplier' | 'couple' | 'coordinator';
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
  channels?: ('push' | 'email' | 'sms')[];
}

export class ScheduleNotificationService {
  private supabase = createClient();

  async notifyScheduleUpdate(scheduleId: string, changes: any[]) {
    try {
      // Get schedule details
      const { data: schedule } = await this.supabase
        .from('supplier_schedules')
        .select(
          `
          *,
          supplier:suppliers(*),
          client:clients(*),
          timeline:wedding_timelines(*)
        `,
        )
        .eq('id', scheduleId)
        .single();

      if (!schedule) return;

      // Notify supplier
      await this.createNotification({
        recipientId: schedule.supplier_id,
        recipientType: 'supplier',
        type: 'schedule_update',
        title: 'Schedule Updated',
        message: `Your schedule for ${schedule.client.bride_name} & ${schedule.client.groom_name} has been updated`,
        data: {
          scheduleId,
          changes,
          weddingDate: schedule.timeline.wedding_date,
        },
        priority: 'high',
        channels: ['push', 'email'],
      });

      // Notify couple
      await this.createNotification({
        recipientId: schedule.client_id,
        recipientType: 'couple',
        type: 'supplier_schedule_update',
        title: 'Vendor Schedule Updated',
        message: `${schedule.supplier.business_name} schedule has been updated`,
        data: {
          scheduleId,
          supplierName: schedule.supplier.business_name,
          changes,
        },
        priority: 'medium',
        channels: ['push'],
      });

      // Real-time broadcast
      await this.broadcastRealTimeUpdate(scheduleId, {
        type: 'schedule_update',
        scheduleId,
        supplierId: schedule.supplier_id,
        clientId: schedule.client_id,
        changes,
      });
    } catch (error) {
      console.error('Failed to send schedule update notifications:', error);
    }
  }

  async notifyScheduleConfirmation(scheduleId: string, confirmation: any) {
    try {
      const { data: schedule } = await this.supabase
        .from('supplier_schedules')
        .select(
          `
          *,
          supplier:suppliers(*),
          client:clients(*)
        `,
        )
        .eq('id', scheduleId)
        .single();

      if (!schedule) return;

      const statusMessages = {
        confirmed: 'has confirmed their wedding schedule',
        conditional: 'has conditionally accepted their wedding schedule',
        declined: 'has declined their wedding schedule',
      };

      // Notify couple
      await this.createNotification({
        recipientId: schedule.client_id,
        recipientType: 'couple',
        type: 'schedule_confirmation',
        title: `Schedule ${confirmation.status}`,
        message: `${schedule.supplier.business_name} ${statusMessages[confirmation.status as keyof typeof statusMessages]}`,
        data: {
          scheduleId,
          supplierId: schedule.supplier_id,
          supplierName: schedule.supplier.business_name,
          status: confirmation.status,
          notes: confirmation.notes,
          conditions: confirmation.conditions,
        },
        priority: confirmation.status === 'declined' ? 'high' : 'medium',
        channels:
          confirmation.status === 'declined' ? ['push', 'email'] : ['push'],
      });

      // Real-time broadcast
      await this.broadcastRealTimeUpdate(scheduleId, {
        type: 'schedule_confirmation',
        scheduleId,
        supplierId: schedule.supplier_id,
        clientId: schedule.client_id,
        status: confirmation.status,
        notes: confirmation.notes,
      });
    } catch (error) {
      console.error(
        'Failed to send schedule confirmation notifications:',
        error,
      );
    }
  }

  async notifyScheduleConflict(scheduleId: string, conflicts: any[]) {
    try {
      const { data: schedule } = await this.supabase
        .from('supplier_schedules')
        .select(
          `
          *,
          supplier:suppliers(*),
          client:clients(*)
        `,
        )
        .eq('id', scheduleId)
        .single();

      if (!schedule) return;

      // Notify supplier
      await this.createNotification({
        recipientId: schedule.supplier_id,
        recipientType: 'supplier',
        type: 'schedule_conflict',
        title: 'Schedule Conflicts Detected',
        message: `${conflicts.length} schedule conflicts found that need your attention`,
        data: {
          scheduleId,
          conflicts,
          conflictCount: conflicts.length,
        },
        priority: 'high',
        channels: ['push', 'email'],
      });

      // Notify couple/coordinator
      await this.createNotification({
        recipientId: schedule.client_id,
        recipientType: 'couple',
        type: 'supplier_schedule_conflict',
        title: 'Vendor Schedule Issues',
        message: `${schedule.supplier.business_name} has schedule conflicts that may need resolution`,
        data: {
          scheduleId,
          supplierName: schedule.supplier.business_name,
          conflicts,
        },
        priority: 'medium',
        channels: ['push'],
      });
    } catch (error) {
      console.error('Failed to send schedule conflict notifications:', error);
    }
  }

  async notifyUpcomingDeadlines() {
    try {
      // Find schedules with confirmation deadlines in next 48 hours
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      const { data: schedules } = await this.supabase
        .from('supplier_schedules')
        .select(
          `
          *,
          supplier:suppliers(*),
          client:clients(*)
        `,
        )
        .eq('status', 'pending')
        .lte('confirmation_deadline', twoDaysFromNow.toISOString());

      if (!schedules?.length) return;

      for (const schedule of schedules) {
        const deadline = new Date(schedule.confirmation_deadline);
        const hoursUntilDeadline = Math.ceil(
          (deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60),
        );

        await this.createNotification({
          recipientId: schedule.supplier_id,
          recipientType: 'supplier',
          type: 'confirmation_deadline',
          title: 'Schedule Confirmation Due Soon',
          message: `Please confirm your schedule for ${schedule.client.bride_name} & ${schedule.client.groom_name} within ${hoursUntilDeadline} hours`,
          data: {
            scheduleId: schedule.id,
            deadline: schedule.confirmation_deadline,
            hoursRemaining: hoursUntilDeadline,
          },
          priority: hoursUntilDeadline <= 24 ? 'high' : 'medium',
          channels:
            hoursUntilDeadline <= 24
              ? ['push', 'email', 'sms']
              : ['push', 'email'],
        });
      }
    } catch (error) {
      console.error('Failed to send deadline notifications:', error);
    }
  }

  private async createNotification(data: NotificationData) {
    try {
      const { error } = await this.supabase.from('notifications').insert({
        recipient_id: data.recipientId,
        recipient_type: data.recipientType,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        priority: data.priority || 'medium',
        channels: data.channels || ['push'],
        created_at: new Date().toISOString(),
        read: false,
      });

      if (error) {
        console.error('Failed to create notification:', error);
      }

      // Send push notification if enabled
      if (data.channels?.includes('push')) {
        await this.sendPushNotification(data);
      }

      // Send email if enabled
      if (data.channels?.includes('email')) {
        await this.sendEmailNotification(data);
      }

      // Send SMS if enabled
      if (data.channels?.includes('sms')) {
        await this.sendSMSNotification(data);
      }
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  }

  private async sendPushNotification(data: NotificationData) {
    // Implementation would integrate with push notification service
    // (e.g., Firebase Cloud Messaging, OneSignal, etc.)
    console.log('Push notification sent:', data.title);
  }

  private async sendEmailNotification(data: NotificationData) {
    // Implementation would integrate with email service
    // (e.g., SendGrid, AWS SES, etc.)
    console.log('Email notification sent:', data.title);
  }

  private async sendSMSNotification(data: NotificationData) {
    // Implementation would integrate with SMS service
    // (e.g., Twilio, AWS SNS, etc.)
    console.log('SMS notification sent:', data.title);
  }

  private async broadcastRealTimeUpdate(scheduleId: string, payload: any) {
    try {
      // Send real-time updates via Supabase Realtime
      const channel = this.supabase.channel(`schedule-${scheduleId}`).send({
        type: 'broadcast',
        event: 'schedule_update',
        payload,
      });

      // Also broadcast to general schedule updates channel
      const generalChannel = this.supabase.channel('schedule-updates').send({
        type: 'broadcast',
        event: 'schedule_update',
        payload: {
          ...payload,
          scheduleId,
        },
      });
    } catch (error) {
      console.error('Failed to broadcast real-time update:', error);
    }
  }
}

export const scheduleNotificationService = new ScheduleNotificationService();
