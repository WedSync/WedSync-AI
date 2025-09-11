import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { TaskPriority, TaskStatus } from '@/types/workflow';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ReminderRule {
  id: string;
  name: string;
  priority: TaskPriority;
  initial_reminder_hours: number; // Hours before deadline for first reminder
  escalation_intervals: number[]; // Hours between escalation steps
  channels: ReminderChannel[];
  escalation_recipients: string[]; // Additional recipients for escalations
  is_active: boolean;
  conditions: ReminderCondition[];
}

interface ReminderCondition {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'in' | 'contains';
  value: any;
}

interface ReminderChannel {
  type: 'email' | 'sms' | 'push' | 'slack' | 'in_app';
  priority: number; // 1-5, determines order of delivery
  enabled: boolean;
  config?: Record<string, any>;
}

interface ReminderInstance {
  id: string;
  task_id: string;
  rule_id: string;
  recipient_id: string;
  channel: string;
  scheduled_for: Date;
  sent_at: Date | null;
  escalation_level: number;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  retry_count: number;
  metadata: Record<string, any>;
}

interface EscalationStep {
  level: number;
  delay_hours: number;
  additional_recipients: string[];
  priority_boost: boolean;
  custom_message?: string;
}

interface NotificationPayload {
  title: string;
  message: string;
  task_id: string;
  wedding_id: string;
  priority: TaskPriority;
  deadline: Date;
  escalation_level: number;
  action_url?: string;
}

export class TaskReminderService {
  // Default reminder rules based on task priority
  private static readonly DEFAULT_REMINDER_RULES: Omit<ReminderRule, 'id'>[] = [
    {
      name: 'Critical Task Reminders',
      priority: TaskPriority.CRITICAL,
      initial_reminder_hours: 72, // 3 days before
      escalation_intervals: [24, 12, 6, 1], // Escalate every day, then every 12h, 6h, 1h
      channels: [
        { type: 'push', priority: 1, enabled: true },
        { type: 'email', priority: 2, enabled: true },
        { type: 'sms', priority: 3, enabled: true },
        { type: 'in_app', priority: 4, enabled: true },
      ],
      escalation_recipients: [], // Will be populated with managers/admins
      is_active: true,
      conditions: [],
    },
    {
      name: 'High Priority Task Reminders',
      priority: TaskPriority.HIGH,
      initial_reminder_hours: 48, // 2 days before
      escalation_intervals: [24, 8, 2], // Daily, then every 8h, then every 2h
      channels: [
        { type: 'push', priority: 1, enabled: true },
        { type: 'email', priority: 2, enabled: true },
        { type: 'in_app', priority: 3, enabled: true },
      ],
      escalation_recipients: [],
      is_active: true,
      conditions: [],
    },
    {
      name: 'Medium Priority Task Reminders',
      priority: TaskPriority.MEDIUM,
      initial_reminder_hours: 24, // 1 day before
      escalation_intervals: [12, 4], // Every 12h, then every 4h
      channels: [
        { type: 'push', priority: 1, enabled: true },
        { type: 'in_app', priority: 2, enabled: true },
        { type: 'email', priority: 3, enabled: false }, // Only for escalations
      ],
      escalation_recipients: [],
      is_active: true,
      conditions: [],
    },
    {
      name: 'Low Priority Task Reminders',
      priority: TaskPriority.LOW,
      initial_reminder_hours: 8, // 8 hours before
      escalation_intervals: [4], // Single escalation after 4h
      channels: [
        { type: 'in_app', priority: 1, enabled: true },
        { type: 'push', priority: 2, enabled: false }, // Disabled by default for low priority
      ],
      escalation_recipients: [],
      is_active: true,
      conditions: [],
    },
  ];

  // Schedule reminders for a task
  async scheduleTaskReminders(taskId: string): Promise<void> {
    const task = await this.getTaskDetails(taskId);
    if (
      !task ||
      task.status === TaskStatus.COMPLETED ||
      task.status === TaskStatus.CANCELLED
    ) {
      return;
    }

    // Get applicable reminder rules
    const rules = await this.getApplicableReminderRules(task);

    for (const rule of rules) {
      await this.createReminderSchedule(task, rule);
    }
  }

  // Create reminder schedule for a specific task and rule
  private async createReminderSchedule(
    task: any,
    rule: ReminderRule,
  ): Promise<void> {
    const deadline = new Date(task.deadline);
    const assigneeId = task.assigned_to;

    if (!assigneeId) {
      // Task not assigned, skip reminders
      return;
    }

    // Schedule initial reminder
    const initialReminderTime = new Date(deadline);
    initialReminderTime.setHours(
      initialReminderTime.getHours() - rule.initial_reminder_hours,
    );

    // Only schedule if reminder time is in the future
    if (initialReminderTime > new Date()) {
      await this.createReminderInstance(
        task,
        rule,
        assigneeId,
        initialReminderTime,
        0,
      );
    }

    // Schedule escalation reminders
    let escalationTime = new Date(deadline);
    escalationTime.setHours(
      escalationTime.getHours() - rule.initial_reminder_hours,
    );

    for (let i = 0; i < rule.escalation_intervals.length; i++) {
      escalationTime.setHours(
        escalationTime.getHours() + rule.escalation_intervals[i],
      );

      if (escalationTime <= deadline && escalationTime > new Date()) {
        // Schedule for primary assignee
        await this.createReminderInstance(
          task,
          rule,
          assigneeId,
          escalationTime,
          i + 1,
        );

        // Schedule for escalation recipients
        for (const recipientId of rule.escalation_recipients) {
          await this.createReminderInstance(
            task,
            rule,
            recipientId,
            escalationTime,
            i + 1,
          );
        }
      }
    }
  }

  // Create a reminder instance
  private async createReminderInstance(
    task: any,
    rule: ReminderRule,
    recipientId: string,
    scheduledFor: Date,
    escalationLevel: number,
  ): Promise<void> {
    const enabledChannels = rule.channels
      .filter((c) => c.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const channel of enabledChannels) {
      const reminderInstance: Omit<ReminderInstance, 'id'> = {
        task_id: task.id,
        rule_id: rule.id,
        recipient_id: recipientId,
        channel: channel.type,
        scheduled_for: scheduledFor,
        sent_at: null,
        escalation_level: escalationLevel,
        status: 'scheduled',
        retry_count: 0,
        metadata: {
          task_title: task.title,
          task_priority: task.priority,
          wedding_id: task.wedding_id,
          channel_config: channel.config || {},
        },
      };

      await supabase.from('task_reminders').insert(reminderInstance);
    }
  }

  // Process due reminders (called by cron job)
  async processDueReminders(): Promise<{ sent: number; failed: number }> {
    const now = new Date();
    let sentCount = 0;
    let failedCount = 0;

    // Get all due reminders
    const { data: dueReminders, error } = await supabase
      .from('task_reminders')
      .select(
        `
        *,
        task:tasks(*),
        recipient:team_members(*)
      `,
      )
      .eq('status', 'scheduled')
      .lte('scheduled_for', now.toISOString())
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.error('Failed to fetch due reminders:', error);
      return { sent: 0, failed: 0 };
    }

    for (const reminder of dueReminders || []) {
      try {
        // Check if task is still valid for reminders
        if (this.shouldSkipReminder(reminder.task)) {
          await this.cancelReminder(reminder.id);
          continue;
        }

        const success = await this.sendReminder(reminder);

        if (success) {
          sentCount++;
          await this.markReminderSent(reminder.id);
        } else {
          failedCount++;
          await this.handleReminderFailure(reminder);
        }
      } catch (error) {
        console.error(`Failed to process reminder ${reminder.id}:`, error);
        failedCount++;
        await this.handleReminderFailure(reminder);
      }
    }

    return { sent: sentCount, failed: failedCount };
  }

  // Send a reminder through the specified channel
  private async sendReminder(
    reminder: ReminderInstance & { task: any; recipient: any },
  ): Promise<boolean> {
    const payload = this.buildNotificationPayload(reminder);

    switch (reminder.channel) {
      case 'email':
        return await this.sendEmailReminder(reminder.recipient, payload);
      case 'sms':
        return await this.sendSMSReminder(reminder.recipient, payload);
      case 'push':
        return await this.sendPushReminder(reminder.recipient, payload);
      case 'slack':
        return await this.sendSlackReminder(reminder.recipient, payload);
      case 'in_app':
        return await this.sendInAppReminder(reminder.recipient, payload);
      default:
        console.warn(`Unknown reminder channel: ${reminder.channel}`);
        return false;
    }
  }

  // Build notification payload
  private buildNotificationPayload(
    reminder: ReminderInstance & { task: any },
  ): NotificationPayload {
    const task = reminder.task;
    const isOverdue = new Date(task.deadline) < new Date();
    const urgencyText = isOverdue ? 'OVERDUE' : 'UPCOMING';
    const escalationText =
      reminder.escalation_level > 0
        ? ` (Escalation Level ${reminder.escalation_level})`
        : '';

    return {
      title: `${urgencyText}: ${task.title}${escalationText}`,
      message: this.buildReminderMessage(
        task,
        reminder.escalation_level,
        isOverdue,
      ),
      task_id: task.id,
      wedding_id: task.wedding_id,
      priority: task.priority,
      deadline: new Date(task.deadline),
      escalation_level: reminder.escalation_level,
      action_url: `/weddings/${task.wedding_id}/tasks/${task.id}`,
    };
  }

  private buildReminderMessage(
    task: any,
    escalationLevel: number,
    isOverdue: boolean,
  ): string {
    const deadline = new Date(task.deadline);
    const timeUntil = this.getTimeUntilText(deadline);

    let message = `Task: ${task.title}\n`;

    if (isOverdue) {
      message += `⚠️ This task is overdue by ${timeUntil}!\n`;
    } else {
      message += `⏰ Due in ${timeUntil}\n`;
    }

    message += `Priority: ${task.priority.toUpperCase()}\n`;
    message += `Category: ${task.category}\n`;

    if (task.description) {
      message += `Description: ${task.description.slice(0, 100)}${task.description.length > 100 ? '...' : ''}\n`;
    }

    if (escalationLevel > 0) {
      message += `\n🚨 This is escalation level ${escalationLevel}. Please take immediate action.`;
    }

    return message;
  }

  private getTimeUntilText(deadline: Date): string {
    const now = new Date();
    const diffMs = Math.abs(deadline.getTime() - now.getTime());
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
  }

  // Channel-specific sending methods
  private async sendEmailReminder(
    recipient: any,
    payload: NotificationPayload,
  ): Promise<boolean> {
    try {
      // Integration with email service (SendGrid, etc.)
      const emailData = {
        to: recipient.email,
        subject: payload.title,
        html: this.buildEmailHTML(payload),
        priority:
          payload.priority === TaskPriority.CRITICAL ? 'high' : 'normal',
      };

      // Call email service API
      console.log('Sending email reminder:', emailData);

      // Simulate email sending
      return true;
    } catch (error) {
      console.error('Email reminder failed:', error);
      return false;
    }
  }

  private async sendSMSReminder(
    recipient: any,
    payload: NotificationPayload,
  ): Promise<boolean> {
    try {
      // Integration with SMS service (Twilio, etc.)
      const smsData = {
        to: recipient.phone_number,
        body: this.buildSMSText(payload),
      };

      console.log('Sending SMS reminder:', smsData);

      // Simulate SMS sending
      return true;
    } catch (error) {
      console.error('SMS reminder failed:', error);
      return false;
    }
  }

  private async sendPushReminder(
    recipient: any,
    payload: NotificationPayload,
  ): Promise<boolean> {
    try {
      // Integration with push notification service
      const pushData = {
        user_id: recipient.user_id,
        title: payload.title,
        body: payload.message.split('\n')[0], // First line for push
        data: {
          task_id: payload.task_id,
          wedding_id: payload.wedding_id,
          action_url: payload.action_url,
        },
        priority:
          payload.priority === TaskPriority.CRITICAL ? 'high' : 'normal',
      };

      console.log('Sending push reminder:', pushData);

      // Call push service
      return await this.sendPushNotification(pushData);
    } catch (error) {
      console.error('Push reminder failed:', error);
      return false;
    }
  }

  private async sendSlackReminder(
    recipient: any,
    payload: NotificationPayload,
  ): Promise<boolean> {
    try {
      // Integration with Slack webhook
      const slackData = {
        channel: recipient.slack_channel || recipient.slack_user_id,
        text: payload.title,
        attachments: [
          {
            color: this.getSlackColor(payload.priority),
            fields: [
              { title: 'Task', value: payload.message, short: false },
              {
                title: 'Deadline',
                value: payload.deadline.toLocaleString(),
                short: true,
              },
              {
                title: 'Priority',
                value: payload.priority.toUpperCase(),
                short: true,
              },
            ],
            actions: [
              {
                type: 'button',
                text: 'View Task',
                url: payload.action_url,
              },
            ],
          },
        ],
      };

      console.log('Sending Slack reminder:', slackData);

      // Call Slack API
      return true;
    } catch (error) {
      console.error('Slack reminder failed:', error);
      return false;
    }
  }

  private async sendInAppReminder(
    recipient: any,
    payload: NotificationPayload,
  ): Promise<boolean> {
    try {
      // Create in-app notification
      const notification = {
        user_id: recipient.user_id,
        title: payload.title,
        message: payload.message,
        type: 'task_reminder',
        priority: payload.priority,
        metadata: {
          task_id: payload.task_id,
          wedding_id: payload.wedding_id,
          escalation_level: payload.escalation_level,
        },
        action_url: payload.action_url,
        is_read: false,
      };

      await supabase.from('notifications').insert(notification);
      return true;
    } catch (error) {
      console.error('In-app reminder failed:', error);
      return false;
    }
  }

  // Helper methods
  private buildEmailHTML(payload: NotificationPayload): string {
    const urgencyClass =
      payload.priority === TaskPriority.CRITICAL ? 'critical' : 'normal';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${this.getPriorityColor(payload.priority)}; color: white; padding: 20px; text-align: center;">
          <h1>${payload.title}</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9;">
          <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${payload.message}</pre>
          <div style="margin-top: 20px; text-align: center;">
            <a href="${payload.action_url}" 
               style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Task
            </a>
          </div>
        </div>
        <div style="padding: 10px; text-align: center; font-size: 12px; color: #666;">
          This is an automated reminder from WedSync Task Management
        </div>
      </div>
    `;
  }

  private buildSMSText(payload: NotificationPayload): string {
    const lines = payload.message.split('\n');
    return `${payload.title}\n\n${lines[0]}\n${lines[1]}\n\nView: ${payload.action_url}`;
  }

  private getPriorityColor(priority: TaskPriority): string {
    const colors = {
      [TaskPriority.CRITICAL]: '#dc2626',
      [TaskPriority.HIGH]: '#ea580c',
      [TaskPriority.MEDIUM]: '#ca8a04',
      [TaskPriority.LOW]: '#65a30d',
    };
    return colors[priority] || '#6b7280';
  }

  private getSlackColor(priority: TaskPriority): string {
    const colors = {
      [TaskPriority.CRITICAL]: 'danger',
      [TaskPriority.HIGH]: 'warning',
      [TaskPriority.MEDIUM]: 'good',
      [TaskPriority.LOW]: '#36a64f',
    };
    return colors[priority] || 'good';
  }

  // Push notification service integration
  private async sendPushNotification(data: any): Promise<boolean> {
    try {
      // This would integrate with your push notification service
      // For example, Firebase Cloud Messaging, OneSignal, etc.

      const { data: userTokens } = await supabase
        .from('user_push_tokens')
        .select('token, platform')
        .eq('user_id', data.user_id)
        .eq('is_active', true);

      if (!userTokens || userTokens.length === 0) {
        return false;
      }

      // Send to each device token
      for (const tokenData of userTokens) {
        // Call push service API
        console.log(`Sending push to ${tokenData.platform}:`, {
          token: tokenData.token,
          title: data.title,
          body: data.body,
          data: data.data,
        });
      }

      return true;
    } catch (error) {
      console.error('Push notification failed:', error);
      return false;
    }
  }

  // Utility methods
  private shouldSkipReminder(task: any): boolean {
    // Skip if task is completed, cancelled, or blocked
    const skipStatuses = [
      TaskStatus.COMPLETED,
      TaskStatus.CANCELLED,
      TaskStatus.BLOCKED,
    ];
    return skipStatuses.includes(task.status);
  }

  private async markReminderSent(reminderId: string): Promise<void> {
    await supabase
      .from('task_reminders')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', reminderId);
  }

  private async handleReminderFailure(
    reminder: ReminderInstance,
  ): Promise<void> {
    const retryLimit = 3;
    const newRetryCount = reminder.retry_count + 1;

    if (newRetryCount < retryLimit) {
      // Schedule retry
      const retryTime = new Date();
      retryTime.setMinutes(retryTime.getMinutes() + newRetryCount * 15); // Exponential backoff

      await supabase
        .from('task_reminders')
        .update({
          retry_count: newRetryCount,
          scheduled_for: retryTime.toISOString(),
        })
        .eq('id', reminder.id);
    } else {
      // Mark as failed
      await supabase
        .from('task_reminders')
        .update({ status: 'failed' })
        .eq('id', reminder.id);
    }
  }

  private async cancelReminder(reminderId: string): Promise<void> {
    await supabase
      .from('task_reminders')
      .update({ status: 'cancelled' })
      .eq('id', reminderId);
  }

  private async getTaskDetails(taskId: string): Promise<any> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    return error ? null : data;
  }

  private async getApplicableReminderRules(task: any): Promise<ReminderRule[]> {
    const { data, error } = await supabase
      .from('reminder_rules')
      .select('*')
      .eq('priority', task.priority)
      .eq('is_active', true);

    if (error || !data || data.length === 0) {
      // Return default rule for this priority
      const defaultRule = TaskReminderService.DEFAULT_REMINDER_RULES.find(
        (rule) => rule.priority === task.priority,
      );

      if (defaultRule) {
        return [
          {
            ...defaultRule,
            id: `default-${task.priority}`,
            escalation_recipients: await this.getDefaultEscalationRecipients(
              task.wedding_id,
            ),
          },
        ];
      }
    }

    return data || [];
  }

  private async getDefaultEscalationRecipients(
    weddingId: string,
  ): Promise<string[]> {
    const { data } = await supabase
      .from('wedding_team_assignments')
      .select('team_member_id, team_member:team_members(role)')
      .eq('wedding_id', weddingId)
      .in('team_member.role', ['admin', 'manager', 'lead']);

    return data?.map((item) => item.team_member_id) || [];
  }

  // Cancel all reminders for a task (when task is completed)
  async cancelTaskReminders(taskId: string): Promise<void> {
    await supabase
      .from('task_reminders')
      .update({ status: 'cancelled' })
      .eq('task_id', taskId)
      .eq('status', 'scheduled');
  }

  // Get reminder statistics
  async getReminderStats(weddingId?: string): Promise<any> {
    let query = supabase.from('task_reminders').select(`
        status,
        escalation_level,
        channel,
        task:tasks(wedding_id, priority)
      `);

    if (weddingId) {
      query = query.eq('task.wedding_id', weddingId);
    }

    const { data, error } = await query;

    if (error) return null;

    const stats = {
      total_reminders: data?.length || 0,
      sent: data?.filter((r) => r.status === 'sent').length || 0,
      failed: data?.filter((r) => r.status === 'failed').length || 0,
      cancelled: data?.filter((r) => r.status === 'cancelled').length || 0,
      escalations: data?.filter((r) => r.escalation_level > 0).length || 0,
      by_channel: this.groupBy(data || [], 'channel'),
      by_priority: this.groupBy(data?.map((r) => r.task) || [], 'priority'),
    };

    return stats;
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }
}
