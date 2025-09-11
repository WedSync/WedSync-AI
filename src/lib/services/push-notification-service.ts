import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { TaskPriority, TaskStatus } from '@/types/workflow';
import webpush from 'web-push';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  device_type: 'web' | 'ios' | 'android';
  device_name?: string;
  user_agent?: string;
  is_active: boolean;
  created_at: Date;
  last_used_at?: Date;
}

export interface PushNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  click_action?: string;
  priority: 'high' | 'normal' | 'low';
  notification_type:
    | 'task_reminder'
    | 'deadline_alert'
    | 'assignment'
    | 'update'
    | 'system';
  scheduled_for?: Date;
  sent_at?: Date;
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  error_message?: string;
  task_id?: string;
  wedding_id?: string;
  metadata?: Record<string, any>;
}

export interface NotificationTemplate {
  type: string;
  title_template: string;
  body_template: string;
  icon?: string;
  priority: 'high' | 'normal' | 'low';
  default_data?: Record<string, any>;
}

export class PushNotificationService {
  // Register push subscription
  async registerPushSubscription(
    userId: string,
    subscription: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    },
    deviceInfo: {
      type: 'web' | 'ios' | 'android';
      name?: string;
      userAgent?: string;
    },
  ): Promise<PushSubscription> {
    try {
      // Check if subscription already exists
      const { data: existingSubscription } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
        .single();

      if (existingSubscription) {
        // Update existing subscription
        const { data: updatedSubscription, error } = await supabase
          .from('push_subscriptions')
          .update({
            p256dh_key: subscription.keys.p256dh,
            auth_key: subscription.keys.auth,
            device_type: deviceInfo.type,
            device_name: deviceInfo.name,
            user_agent: deviceInfo.userAgent,
            is_active: true,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', existingSubscription.id)
          .select()
          .single();

        if (error) throw error;
        return updatedSubscription;
      } else {
        // Create new subscription
        const { data: newSubscription, error } = await supabase
          .from('push_subscriptions')
          .insert({
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh_key: subscription.keys.p256dh,
            auth_key: subscription.keys.auth,
            device_type: deviceInfo.type,
            device_name: deviceInfo.name,
            user_agent: deviceInfo.userAgent,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return newSubscription;
      }
    } catch (error) {
      console.error('Failed to register push subscription:', error);
      throw error;
    }
  }

  // Unregister push subscription
  async unregisterPushSubscription(
    userId: string,
    endpoint: string,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('endpoint', endpoint);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to unregister push subscription:', error);
      throw error;
    }
  }

  // Send push notification
  async sendPushNotification(
    notification: Omit<PushNotification, 'id' | 'sent_at' | 'delivery_status'>,
  ): Promise<PushNotification> {
    try {
      // Create notification record
      const { data: notificationRecord, error: insertError } = await supabase
        .from('push_notifications')
        .insert({
          ...notification,
          delivery_status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Get user's active push subscriptions
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', notification.user_id)
        .eq('is_active', true);

      if (subscriptionsError) throw subscriptionsError;

      if (!subscriptions || subscriptions.length === 0) {
        // Update notification status to failed
        await supabase
          .from('push_notifications')
          .update({
            delivery_status: 'failed',
            error_message: 'No active push subscriptions found',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notificationRecord.id);

        return { ...notificationRecord, delivery_status: 'failed' };
      }

      // Send to all subscriptions
      const sendResults = await Promise.allSettled(
        subscriptions.map((subscription) =>
          this.sendToSubscription(subscription, notification),
        ),
      );

      // Determine overall delivery status
      const successCount = sendResults.filter(
        (result) => result.status === 'fulfilled',
      ).length;
      const deliveryStatus = successCount > 0 ? 'sent' : 'failed';
      const errorMessages = sendResults
        .filter((result) => result.status === 'rejected')
        .map((result) => (result as PromiseRejectedResult).reason)
        .join('; ');

      // Update notification record
      const { data: updatedNotification, error: updateError } = await supabase
        .from('push_notifications')
        .update({
          delivery_status: deliveryStatus,
          sent_at: new Date().toISOString(),
          error_message: errorMessages || null,
        })
        .eq('id', notificationRecord.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return updatedNotification;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      throw error;
    }
  }

  // Send notification to specific subscription
  private async sendToSubscription(
    subscription: PushSubscription,
    notification: Omit<PushNotification, 'id' | 'sent_at' | 'delivery_status'>,
  ): Promise<void> {
    try {
      if (subscription.device_type === 'web') {
        await this.sendWebPushNotification(subscription, notification);
      } else if (subscription.device_type === 'ios') {
        await this.sendAPNSNotification(subscription, notification);
      } else if (subscription.device_type === 'android') {
        await this.sendFCMNotification(subscription, notification);
      }
    } catch (error) {
      console.error(
        `Failed to send to ${subscription.device_type} device:`,
        error,
      );

      // Mark subscription as inactive if it fails
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('id', subscription.id);

      throw error;
    }
  }

  // Send Web Push notification
  private async sendWebPushNotification(
    subscription: PushSubscription,
    notification: Omit<PushNotification, 'id' | 'sent_at' | 'delivery_status'>,
  ): Promise<void> {
    // Configure web-push
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
      },
    };

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icons/notification-icon.png',
      image: notification.image,
      badge: notification.badge || '/icons/notification-badge.png',
      tag: notification.tag,
      data: {
        ...notification.data,
        clickAction: notification.click_action,
        taskId: notification.task_id,
        weddingId: notification.wedding_id,
        notificationType: notification.notification_type,
      },
      requireInteraction: notification.priority === 'high',
      actions: this.getNotificationActions(notification.notification_type),
    });

    const options = {
      priority: notification.priority,
      timeToLive: 24 * 60 * 60, // 24 hours
      headers: {},
    };

    await webpush.sendNotification(pushSubscription, payload, options);
  }

  // Send APNS notification (iOS)
  private async sendAPNSNotification(
    subscription: PushSubscription,
    notification: Omit<PushNotification, 'id' | 'sent_at' | 'delivery_status'>,
  ): Promise<void> {
    // This would integrate with Apple Push Notification Service
    // Implementation would use libraries like node-apn
    console.log('APNS notification sending not implemented yet');

    // Placeholder for APNS implementation
    const apnsPayload = {
      aps: {
        alert: {
          title: notification.title,
          body: notification.body,
        },
        badge: 1,
        sound: 'default',
        priority: notification.priority === 'high' ? 10 : 5,
      },
      data: {
        taskId: notification.task_id,
        weddingId: notification.wedding_id,
        type: notification.notification_type,
      },
    };

    // Would send via APNS here
  }

  // Send FCM notification (Android)
  private async sendFCMNotification(
    subscription: PushSubscription,
    notification: Omit<PushNotification, 'id' | 'sent_at' | 'delivery_status'>,
  ): Promise<void> {
    try {
      const fcmPayload = {
        to: subscription.endpoint.split('/').pop(), // Extract FCM token
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon,
          image: notification.image,
          click_action: notification.click_action,
        },
        data: {
          taskId: notification.task_id || '',
          weddingId: notification.wedding_id || '',
          type: notification.notification_type,
          ...notification.data,
        },
        priority: notification.priority,
        time_to_live: 86400, // 24 hours
      };

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${process.env.FCM_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fcmPayload),
      });

      if (!response.ok) {
        throw new Error(`FCM request failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('FCM notification failed:', error);
      throw error;
    }
  }

  // Get notification actions based on type
  private getNotificationActions(type: string): any[] {
    const actionsByType = {
      task_reminder: [
        {
          action: 'mark_complete',
          title: 'Mark Complete',
          icon: '/icons/check.png',
        },
        { action: 'snooze', title: 'Snooze 1h', icon: '/icons/snooze.png' },
      ],
      deadline_alert: [
        { action: 'view_task', title: 'View Task', icon: '/icons/view.png' },
        {
          action: 'reschedule',
          title: 'Reschedule',
          icon: '/icons/calendar.png',
        },
      ],
      assignment: [
        { action: 'accept', title: 'Accept', icon: '/icons/check.png' },
        {
          action: 'view_details',
          title: 'View Details',
          icon: '/icons/info.png',
        },
      ],
      update: [
        { action: 'view_update', title: 'View', icon: '/icons/view.png' },
      ],
    };

    return actionsByType[type as keyof typeof actionsByType] || [];
  }

  // Send task reminder notification
  async sendTaskReminder(
    taskId: string,
    reminderType: 'deadline' | 'overdue' | 'check_in' = 'deadline',
  ): Promise<void> {
    try {
      // Get task details
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select(
          `
          id, title, description, deadline, priority, status, assigned_to,
          wedding:weddings(client_name, wedding_date)
        `,
        )
        .eq('id', taskId)
        .single();

      if (taskError || !task || !task.assigned_to) return;

      const templates = this.getNotificationTemplates();
      const template = templates[`task_${reminderType}`];

      if (!template) return;

      const daysUntil = Math.ceil(
        (new Date(task.deadline).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const notification: Omit<
        PushNotification,
        'id' | 'sent_at' | 'delivery_status'
      > = {
        user_id: task.assigned_to,
        title: this.processTemplate(template.title_template, {
          task_title: task.title,
          days_until: daysUntil,
          wedding_name: task.wedding?.client_name,
        }),
        body: this.processTemplate(template.body_template, {
          task_title: task.title,
          deadline: new Date(task.deadline).toLocaleDateString(),
          days_until: daysUntil,
          wedding_name: task.wedding?.client_name,
          priority: task.priority,
        }),
        icon: '/icons/task-reminder.png',
        priority: this.getPriorityFromTask(task.priority, reminderType),
        notification_type: 'task_reminder',
        click_action: `/tasks/${taskId}`,
        task_id: taskId,
        wedding_id: task.wedding_id,
        data: {
          reminderType,
          taskStatus: task.status,
          taskPriority: task.priority,
          daysUntil,
        },
        tag: `task-${taskId}-${reminderType}`,
      };

      await this.sendPushNotification(notification);
    } catch (error) {
      console.error('Failed to send task reminder:', error);
    }
  }

  // Send bulk notifications for multiple tasks
  async sendBulkTaskReminders(
    taskIds: string[],
    reminderType: 'deadline' | 'overdue' | 'check_in' = 'deadline',
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const taskId of taskIds) {
      try {
        await this.sendTaskReminder(taskId, reminderType);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Task ${taskId}: ${error}`);
      }
    }

    return results;
  }

  // Send assignment notification
  async sendTaskAssignmentNotification(
    taskId: string,
    assignedToUserId: string,
    assignedByUserId: string,
  ): Promise<void> {
    try {
      // Get task and assignee details
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select(
          `
          id, title, description, deadline, priority,
          wedding:weddings(client_name),
          assigned_by:team_members!assigned_by(name)
        `,
        )
        .eq('id', taskId)
        .single();

      if (taskError || !task) return;

      const templates = this.getNotificationTemplates();
      const template = templates.task_assignment;

      const notification: Omit<
        PushNotification,
        'id' | 'sent_at' | 'delivery_status'
      > = {
        user_id: assignedToUserId,
        title: this.processTemplate(template.title_template, {
          task_title: task.title,
          assigner_name: task.assigned_by?.name || 'Team Member',
        }),
        body: this.processTemplate(template.body_template, {
          task_title: task.title,
          wedding_name: task.wedding?.client_name,
          deadline: new Date(task.deadline).toLocaleDateString(),
          assigner_name: task.assigned_by?.name || 'Team Member',
        }),
        icon: '/icons/assignment.png',
        priority: 'high',
        notification_type: 'assignment',
        click_action: `/tasks/${taskId}`,
        task_id: taskId,
        wedding_id: task.wedding_id,
        data: {
          assignedBy: assignedByUserId,
          taskPriority: task.priority,
        },
        tag: `assignment-${taskId}`,
      };

      await this.sendPushNotification(notification);
    } catch (error) {
      console.error('Failed to send assignment notification:', error);
    }
  }

  // Send system notification
  async sendSystemNotification(
    userId: string,
    title: string,
    body: string,
    options: {
      priority?: 'high' | 'normal' | 'low';
      clickAction?: string;
      data?: Record<string, any>;
      tag?: string;
    } = {},
  ): Promise<void> {
    try {
      const notification: Omit<
        PushNotification,
        'id' | 'sent_at' | 'delivery_status'
      > = {
        user_id: userId,
        title,
        body,
        icon: '/icons/system.png',
        priority: options.priority || 'normal',
        notification_type: 'system',
        click_action: options.clickAction,
        data: options.data,
        tag: options.tag || `system-${Date.now()}`,
      };

      await this.sendPushNotification(notification);
    } catch (error) {
      console.error('Failed to send system notification:', error);
    }
  }

  // Get notification templates
  private getNotificationTemplates(): Record<string, NotificationTemplate> {
    return {
      task_deadline: {
        type: 'task_deadline',
        title_template: '⏰ Task Deadline Approaching',
        body_template:
          '{{task_title}} is due in {{days_until}} days for {{wedding_name}}',
        icon: '/icons/deadline.png',
        priority: 'high',
      },
      task_overdue: {
        type: 'task_overdue',
        title_template: '🚨 Overdue Task',
        body_template:
          '{{task_title}} was due on {{deadline}} for {{wedding_name}}',
        icon: '/icons/overdue.png',
        priority: 'high',
      },
      task_check_in: {
        type: 'task_check_in',
        title_template: '👋 Task Check-in',
        body_template:
          'How is {{task_title}} progressing for {{wedding_name}}?',
        icon: '/icons/checkin.png',
        priority: 'normal',
      },
      task_assignment: {
        type: 'task_assignment',
        title_template: '📋 New Task Assigned',
        body_template:
          '{{assigner_name}} assigned "{{task_title}}" to you for {{wedding_name}}',
        icon: '/icons/assignment.png',
        priority: 'high',
      },
      wedding_milestone: {
        type: 'wedding_milestone',
        title_template: '🎉 Wedding Milestone',
        body_template:
          'Congratulations! {{milestone_name}} completed for {{wedding_name}}',
        icon: '/icons/milestone.png',
        priority: 'normal',
      },
    };
  }

  // Process notification template
  private processTemplate(
    template: string,
    variables: Record<string, any>,
  ): string {
    let processed = template;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(
        new RegExp(placeholder, 'g'),
        String(value || ''),
      );
    });

    return processed;
  }

  // Get priority from task priority and reminder type
  private getPriorityFromTask(
    taskPriority: string,
    reminderType: string,
  ): 'high' | 'normal' | 'low' {
    if (reminderType === 'overdue') return 'high';

    if (taskPriority === 'critical') return 'high';
    if (taskPriority === 'high') return 'high';
    if (taskPriority === 'medium') return 'normal';
    return 'low';
  }

  // Get user's push notification preferences
  async getUserNotificationPreferences(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

      return (
        data || {
          task_reminders: true,
          deadline_alerts: true,
          assignments: true,
          system_notifications: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          timezone: 'UTC',
        }
      );
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      return null;
    }
  }

  // Update user's push notification preferences
  async updateUserNotificationPreferences(
    userId: string,
    preferences: Record<string, any>,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  // Get notification history for user
  async getNotificationHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<PushNotification[]> {
    try {
      const { data, error } = await supabase
        .from('push_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get notification history:', error);
      throw error;
    }
  }

  // Cancel scheduled notification
  async cancelScheduledNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('push_notifications')
        .update({
          delivery_status: 'cancelled',
        })
        .eq('id', notificationId)
        .eq('delivery_status', 'pending');

      if (error) throw error;
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      throw error;
    }
  }

  // Get push notification analytics
  async getNotificationAnalytics(
    userId?: string,
    weddingId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    try {
      let query = supabase
        .from('push_notifications')
        .select('delivery_status, notification_type, priority, sent_at');

      if (userId) query = query.eq('user_id', userId);
      if (weddingId) query = query.eq('wedding_id', weddingId);
      if (startDate) query = query.gte('sent_at', startDate.toISOString());
      if (endDate) query = query.lte('sent_at', endDate.toISOString());

      const { data, error } = await query;
      if (error) throw error;

      // Calculate analytics
      const analytics = {
        total_sent: data?.length || 0,
        delivery_rates: {},
        type_breakdown: {},
        priority_breakdown: {},
        daily_volume: {},
      };

      if (data) {
        // Calculate delivery rates
        const statusCounts = data.reduce(
          (acc, notif) => {
            acc[notif.delivery_status] = (acc[notif.delivery_status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        analytics.delivery_rates = {
          sent: (((statusCounts.sent || 0) / data.length) * 100).toFixed(1),
          delivered: (
            ((statusCounts.delivered || 0) / data.length) *
            100
          ).toFixed(1),
          failed: (((statusCounts.failed || 0) / data.length) * 100).toFixed(1),
        };

        // Type breakdown
        analytics.type_breakdown = data.reduce(
          (acc, notif) => {
            acc[notif.notification_type] =
              (acc[notif.notification_type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        // Priority breakdown
        analytics.priority_breakdown = data.reduce(
          (acc, notif) => {
            acc[notif.priority] = (acc[notif.priority] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );
      }

      return analytics;
    } catch (error) {
      console.error('Failed to get notification analytics:', error);
      throw error;
    }
  }
}
