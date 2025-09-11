/**
 * WS-159: Task-Specific Notification Service
 * Enhanced notification service specifically for task status tracking and helper coordination
 */

import {
  notificationEngine,
  NotificationRequest,
  NotificationRecipient,
} from './engine';
import { notificationPreferencesManager } from './preferences';
import { notificationDeliveryTracker } from './tracking';
import {
  TaskStatusEvent,
  TaskAssignmentEvent,
  TaskReminderEvent,
} from '@/lib/realtime/task-status-realtime';

export interface TaskNotificationTemplate {
  id: string;
  name: string;
  category:
    | 'task_assignment'
    | 'task_reminder'
    | 'task_completion'
    | 'task_overdue'
    | 'task_status_change';
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'emergency';
  trigger_conditions: {
    status_changes?: string[];
    days_before_deadline?: number[];
    progress_thresholds?: number[];
    time_overdue_hours?: number[];
  };
  channels: {
    email?: {
      subject_template: string;
      html_template: string;
      text_template: string;
    };
    sms?: {
      message_template: string;
    };
    push?: {
      title_template: string;
      body_template: string;
    };
    in_app?: {
      title_template: string;
      message_template: string;
      action_url?: string;
    };
  };
  variables: string[];
  routing_rules: {
    couple_notification: boolean;
    helper_notification: boolean;
    vendor_notification: boolean;
    fallback_to_email: boolean;
    emergency_override: boolean;
  };
}

export interface TaskNotificationSettings {
  couple_id: string;
  wedding_id: string;

  // Status change notifications
  notify_on_assignment: boolean;
  notify_on_start: boolean;
  notify_on_completion: boolean;
  notify_on_overdue: boolean;
  notify_on_cancellation: boolean;

  // Progress notifications
  notify_on_progress_update: boolean;
  progress_update_threshold: number;

  // Reminder settings
  reminder_enabled: boolean;
  reminder_days_before: number[];
  overdue_reminder_hours: number[];

  // Escalation settings
  escalate_overdue_tasks: boolean;
  escalation_hours: number;
  escalation_recipients: string[];

  // Channel preferences by priority
  normal_priority_channels: ('email' | 'sms' | 'push' | 'in_app')[];
  high_priority_channels: ('email' | 'sms' | 'push' | 'in_app')[];
  urgent_priority_channels: ('email' | 'sms' | 'push' | 'in_app')[];

  // Time restrictions
  respect_quiet_hours: boolean;
  emergency_override_quiet_hours: boolean;

  created_at: string;
  updated_at: string;
}

export class TaskNotificationService {
  private static instance: TaskNotificationService;

  private templates: Map<string, TaskNotificationTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  static getInstance(): TaskNotificationService {
    if (!TaskNotificationService.instance) {
      TaskNotificationService.instance = new TaskNotificationService();
    }
    return TaskNotificationService.instance;
  }

  /**
   * Send task assignment notification
   */
  async sendTaskAssignmentNotification(
    event: TaskAssignmentEvent,
  ): Promise<void> {
    try {
      const template = this.templates.get('task_assignment_notification');
      if (!template) throw new Error('Task assignment template not found');

      // Get recipients (helper and couple)
      const recipients: NotificationRecipient[] = [];

      // Add assigned helper
      const helperRecipient =
        await notificationPreferencesManager.getNotificationRecipient(
          event.assigned_to,
          event.wedding_id,
        );
      if (helperRecipient) recipients.push(helperRecipient);

      // Add couple (if settings allow)
      const coupleRecipients = await this.getCoupleRecipients(event.wedding_id);
      const settings = await this.getTaskNotificationSettings(event.wedding_id);

      if (settings.notify_on_assignment) {
        recipients.push(...coupleRecipients);
      }

      if (recipients.length === 0) return;

      const variables = {
        helper_name: event.helper_name,
        task_title: event.task_title,
        task_description: event.task_description || '',
        deadline: event.deadline
          ? this.formatDate(event.deadline)
          : 'No deadline set',
        priority: event.priority.toUpperCase(),
        assigned_by: event.assigned_by,
        wedding_id: event.wedding_id,
      };

      const notificationRequest: NotificationRequest = {
        template_id: template.id,
        recipients,
        variables,
        context: {
          wedding_id: event.wedding_id,
          urgency_override: this.mapTaskPriorityToUrgency(event.priority),
          timeline_milestone: 'task_assignment',
        },
        delivery_options: {
          respect_quiet_hours: settings.respect_quiet_hours,
          require_delivery_confirmation:
            event.priority === 'urgent' || event.priority === 'emergency',
        },
        metadata: {
          task_id: event.task_id,
          event_type: 'task_assignment',
          notification_category: 'task_management',
        },
      };

      const results =
        await notificationEngine.sendNotification(notificationRequest);

      // Track delivery for task-specific analytics
      await this.trackTaskNotificationDelivery(
        event.task_id,
        'assignment',
        results,
      );
    } catch (error) {
      console.error('Failed to send task assignment notification:', error);
      throw error;
    }
  }

  /**
   * Send task status change notification
   */
  async sendTaskStatusChangeNotification(
    event: TaskStatusEvent,
  ): Promise<void> {
    try {
      const template = this.templates.get(`task_${event.status}_notification`);
      if (!template) {
        console.warn(`No template found for task status: ${event.status}`);
        return;
      }

      const recipients: NotificationRecipient[] = [];
      const settings = await this.getTaskNotificationSettings(event.wedding_id);

      // Determine who should be notified based on status and settings
      const shouldNotifyCouple = this.shouldNotifyCouple(
        event.status,
        settings,
      );
      const shouldNotifyHelper = this.shouldNotifyHelper(
        event.status,
        settings,
      );

      if (shouldNotifyCouple) {
        const coupleRecipients = await this.getCoupleRecipients(
          event.wedding_id,
        );
        recipients.push(...coupleRecipients);
      }

      if (shouldNotifyHelper && event.helper_id) {
        const helperRecipient =
          await notificationPreferencesManager.getNotificationRecipient(
            event.helper_id,
            event.wedding_id,
          );
        if (helperRecipient) recipients.push(helperRecipient);
      }

      if (recipients.length === 0) return;

      const variables = {
        task_id: event.task_id,
        status: event.status.replace('_', ' ').toUpperCase(),
        previous_status:
          event.previous_status?.replace('_', ' ').toUpperCase() || '',
        completion_percentage: event.completion_percentage || 0,
        notes: event.notes || '',
        completed_by: event.completed_by || 'System',
        completed_at: event.completed_at
          ? this.formatDate(event.completed_at)
          : '',
        priority: event.priority.toUpperCase(),
        deadline: event.deadline ? this.formatDate(event.deadline) : '',
        photo_evidence_url: event.photo_evidence_url || '',
        wedding_id: event.wedding_id,
      };

      const notificationRequest: NotificationRequest = {
        template_id: template.id,
        recipients,
        variables,
        context: {
          wedding_id: event.wedding_id,
          urgency_override: this.mapTaskPriorityToUrgency(event.priority),
          timeline_milestone: `task_${event.status}`,
        },
        delivery_options: {
          respect_quiet_hours:
            settings.respect_quiet_hours && event.priority !== 'emergency',
          require_delivery_confirmation:
            event.status === 'completed' || event.priority === 'urgent',
        },
        metadata: {
          task_id: event.task_id,
          event_type: 'status_change',
          old_status: event.previous_status,
          new_status: event.status,
          notification_category: 'task_status',
        },
      };

      const results =
        await notificationEngine.sendNotification(notificationRequest);
      await this.trackTaskNotificationDelivery(
        event.task_id,
        `status_${event.status}`,
        results,
      );
    } catch (error) {
      console.error('Failed to send task status change notification:', error);
      throw error;
    }
  }

  /**
   * Send task reminder notification
   */
  async sendTaskReminderNotification(event: TaskReminderEvent): Promise<void> {
    try {
      const template = this.templates.get(
        `task_${event.reminder_type}_reminder`,
      );
      if (!template) {
        console.warn(
          `No template found for reminder type: ${event.reminder_type}`,
        );
        return;
      }

      const recipients: NotificationRecipient[] = [];

      // Always notify the assigned helper
      const helperRecipient =
        await notificationPreferencesManager.getNotificationRecipient(
          event.helper_id,
          event.wedding_id,
        );
      if (helperRecipient) recipients.push(helperRecipient);

      // Notify couple based on settings
      const settings = await this.getTaskNotificationSettings(event.wedding_id);
      if (settings.reminder_enabled) {
        const coupleRecipients = await this.getCoupleRecipients(
          event.wedding_id,
        );
        recipients.push(...coupleRecipients);
      }

      if (recipients.length === 0) return;

      const variables = {
        task_title: event.task_title,
        deadline: this.formatDate(event.deadline),
        days_until_deadline: event.days_until_deadline,
        priority: event.priority.toUpperCase(),
        reminder_type: event.reminder_type.replace('_', ' ').toUpperCase(),
        wedding_id: event.wedding_id,
      };

      // Escalate priority for overdue tasks
      const urgencyOverride =
        event.reminder_type === 'overdue'
          ? 'urgent'
          : this.mapTaskPriorityToUrgency(event.priority);

      const notificationRequest: NotificationRequest = {
        template_id: template.id,
        recipients,
        variables,
        context: {
          wedding_id: event.wedding_id,
          urgency_override: urgencyOverride,
          timeline_milestone: `task_${event.reminder_type}_reminder`,
        },
        delivery_options: {
          respect_quiet_hours:
            event.reminder_type !== 'overdue' && settings.respect_quiet_hours,
          require_delivery_confirmation: event.reminder_type === 'overdue',
        },
        metadata: {
          task_id: event.task_id,
          event_type: 'reminder',
          reminder_type: event.reminder_type,
          notification_category: 'task_reminder',
        },
      };

      const results =
        await notificationEngine.sendNotification(notificationRequest);
      await this.trackTaskNotificationDelivery(
        event.task_id,
        `reminder_${event.reminder_type}`,
        results,
      );
    } catch (error) {
      console.error('Failed to send task reminder notification:', error);
      throw error;
    }
  }

  /**
   * Send task escalation notification when tasks are overdue
   */
  async sendTaskEscalationNotification(
    taskId: string,
    weddingId: string,
    hoursOverdue: number,
  ): Promise<void> {
    try {
      const settings = await this.getTaskNotificationSettings(weddingId);

      if (
        !settings.escalate_overdue_tasks ||
        hoursOverdue < settings.escalation_hours
      ) {
        return;
      }

      const template = this.templates.get('task_escalation_notification');
      if (!template) throw new Error('Task escalation template not found');

      // Get escalation recipients (couple + additional contacts)
      const recipients: NotificationRecipient[] = [];

      const coupleRecipients = await this.getCoupleRecipients(weddingId);
      recipients.push(...coupleRecipients);

      // Add additional escalation contacts
      for (const recipientId of settings.escalation_recipients) {
        const recipient =
          await notificationPreferencesManager.getNotificationRecipient(
            recipientId,
            weddingId,
          );
        if (recipient) recipients.push(recipient);
      }

      if (recipients.length === 0) return;

      const variables = {
        task_id: taskId,
        hours_overdue: hoursOverdue,
        escalation_level:
          hoursOverdue >= settings.escalation_hours * 2 ? 'HIGH' : 'MEDIUM',
        wedding_id: weddingId,
      };

      const notificationRequest: NotificationRequest = {
        template_id: template.id,
        recipients,
        variables,
        context: {
          wedding_id: weddingId,
          urgency_override: 'urgent',
          timeline_milestone: 'task_escalation',
        },
        delivery_options: {
          respect_quiet_hours: false, // Escalations always override quiet hours
          require_delivery_confirmation: true,
        },
        metadata: {
          task_id: taskId,
          event_type: 'escalation',
          hours_overdue: hoursOverdue,
          notification_category: 'task_escalation',
        },
      };

      const results =
        await notificationEngine.sendNotification(notificationRequest);
      await this.trackTaskNotificationDelivery(taskId, 'escalation', results);
    } catch (error) {
      console.error('Failed to send task escalation notification:', error);
      throw error;
    }
  }

  /**
   * Get task notification settings for a wedding
   */
  private async getTaskNotificationSettings(
    weddingId: string,
  ): Promise<TaskNotificationSettings> {
    // This would typically fetch from database
    // For now, return sensible defaults
    return {
      couple_id: 'default',
      wedding_id: weddingId,
      notify_on_assignment: true,
      notify_on_start: false,
      notify_on_completion: true,
      notify_on_overdue: true,
      notify_on_cancellation: true,
      notify_on_progress_update: false,
      progress_update_threshold: 25,
      reminder_enabled: true,
      reminder_days_before: [7, 3, 1],
      overdue_reminder_hours: [24, 72],
      escalate_overdue_tasks: true,
      escalation_hours: 48,
      escalation_recipients: [],
      normal_priority_channels: ['email', 'in_app'],
      high_priority_channels: ['email', 'push', 'in_app'],
      urgent_priority_channels: ['email', 'sms', 'push', 'in_app'],
      respect_quiet_hours: true,
      emergency_override_quiet_hours: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Get couple recipients for a wedding
   */
  private async getCoupleRecipients(
    weddingId: string,
  ): Promise<NotificationRecipient[]> {
    return await notificationPreferencesManager.getWeddingRecipients(
      weddingId,
      false,
    );
  }

  /**
   * Track task notification delivery for analytics
   */
  private async trackTaskNotificationDelivery(
    taskId: string,
    notificationType: string,
    results: any[],
  ): Promise<void> {
    try {
      // Log task-specific delivery metrics
      for (const result of results) {
        await notificationDeliveryTracker.trackDeliveryAttempt({
          ...result,
          metadata: {
            ...result.metadata,
            task_id: taskId,
            notification_type: notificationType,
            category: 'task_notification',
          },
        });
      }
    } catch (error) {
      console.error('Failed to track task notification delivery:', error);
    }
  }

  /**
   * Determine if couple should be notified based on status and settings
   */
  private shouldNotifyCouple(
    status: string,
    settings: TaskNotificationSettings,
  ): boolean {
    switch (status) {
      case 'pending':
        return settings.notify_on_assignment;
      case 'in_progress':
        return settings.notify_on_start;
      case 'completed':
        return settings.notify_on_completion;
      case 'overdue':
        return settings.notify_on_overdue;
      case 'cancelled':
        return settings.notify_on_cancellation;
      default:
        return false;
    }
  }

  /**
   * Determine if helper should be notified based on status and settings
   */
  private shouldNotifyHelper(
    status: string,
    settings: TaskNotificationSettings,
  ): boolean {
    // Helpers should generally be notified of all status changes
    return true;
  }

  /**
   * Map task priority to notification urgency
   */
  private mapTaskPriorityToUrgency(
    priority: string,
  ): 'low' | 'normal' | 'high' | 'urgent' | 'emergency' {
    const priorityMap: Record<
      string,
      'low' | 'normal' | 'high' | 'urgent' | 'emergency'
    > = {
      low: 'low',
      normal: 'normal',
      high: 'high',
      urgent: 'urgent',
      emergency: 'emergency',
    };
    return priorityMap[priority] || 'normal';
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Initialize default notification templates
   */
  private initializeDefaultTemplates(): void {
    // Task Assignment Template
    this.templates.set('task_assignment_notification', {
      id: 'task_assignment_notification',
      name: 'Task Assignment Notification',
      category: 'task_assignment',
      priority: 'normal',
      trigger_conditions: {},
      channels: {
        email: {
          subject_template: 'New Task Assigned: {{task_title}}',
          html_template: `
            <h2>You've been assigned a new task!</h2>
            <p>Hello {{helper_name}},</p>
            <p>You've been assigned the following task for the upcoming wedding:</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3>{{task_title}}</h3>
              <p><strong>Description:</strong> {{task_description}}</p>
              <p><strong>Priority:</strong> {{priority}}</p>
              <p><strong>Deadline:</strong> {{deadline}}</p>
              <p><strong>Assigned by:</strong> {{assigned_by}}</p>
            </div>
            <p>Please log into your dashboard to view more details and update your progress.</p>
          `,
          text_template:
            'New task assigned: {{task_title}}. Priority: {{priority}}. Deadline: {{deadline}}',
        },
        sms: {
          message_template:
            'New task assigned: {{task_title}} ({{priority}} priority). Deadline: {{deadline}}',
        },
        push: {
          title_template: 'New Task Assigned',
          body_template: '{{task_title}} - Due: {{deadline}}',
        },
        in_app: {
          title_template: 'New Task Assignment',
          message_template: "You've been assigned: {{task_title}}",
          action_url: '/tasks/{{task_id}}',
        },
      },
      variables: [
        'helper_name',
        'task_title',
        'task_description',
        'priority',
        'deadline',
        'assigned_by',
        'task_id',
      ],
      routing_rules: {
        couple_notification: true,
        helper_notification: true,
        vendor_notification: false,
        fallback_to_email: true,
        emergency_override: false,
      },
    });

    // Task Completion Template
    this.templates.set('task_completed_notification', {
      id: 'task_completed_notification',
      name: 'Task Completion Notification',
      category: 'task_completion',
      priority: 'normal',
      trigger_conditions: {
        status_changes: ['completed'],
      },
      channels: {
        email: {
          subject_template: 'Task Completed: {{task_title}}',
          html_template: `
            <h2>Great news! A task has been completed.</h2>
            <p>The following task has been marked as completed:</p>
            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3>✅ {{task_title}}</h3>
              <p><strong>Completed by:</strong> {{completed_by}}</p>
              <p><strong>Completed at:</strong> {{completed_at}}</p>
              {{#if notes}}<p><strong>Notes:</strong> {{notes}}</p>{{/if}}
              {{#if photo_evidence_url}}<p><strong>Photo Evidence:</strong> <a href="{{photo_evidence_url}}">View Photo</a></p>{{/if}}
            </div>
          `,
          text_template:
            'Task completed: {{task_title}} by {{completed_by}} at {{completed_at}}',
        },
        push: {
          title_template: 'Task Completed!',
          body_template:
            '{{task_title}} has been completed by {{completed_by}}',
        },
        in_app: {
          title_template: 'Task Completed',
          message_template: '{{task_title}} has been completed',
          action_url: '/tasks/{{task_id}}',
        },
      },
      variables: [
        'task_title',
        'completed_by',
        'completed_at',
        'notes',
        'photo_evidence_url',
        'task_id',
      ],
      routing_rules: {
        couple_notification: true,
        helper_notification: false,
        vendor_notification: false,
        fallback_to_email: true,
        emergency_override: false,
      },
    });

    // Task Overdue Template
    this.templates.set('task_overdue_notification', {
      id: 'task_overdue_notification',
      name: 'Task Overdue Notification',
      category: 'task_overdue',
      priority: 'urgent',
      trigger_conditions: {
        status_changes: ['overdue'],
      },
      channels: {
        email: {
          subject_template: '🚨 OVERDUE TASK: {{task_title}}',
          html_template: `
            <h2 style="color: #d32f2f;">⚠️ Task Overdue Alert</h2>
            <p>The following task is now overdue and requires immediate attention:</p>
            <div style="background: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 15px 0;">
              <h3>{{task_title}}</h3>
              <p><strong>Original Deadline:</strong> {{deadline}}</p>
              <p><strong>Priority:</strong> {{priority}}</p>
              <p><strong>Current Status:</strong> {{status}}</p>
            </div>
            <p>Please take action immediately to complete this task or contact support if there are issues.</p>
          `,
          text_template:
            'OVERDUE TASK: {{task_title}} was due {{deadline}}. Priority: {{priority}}',
        },
        sms: {
          message_template:
            '🚨 OVERDUE: {{task_title}} was due {{deadline}}. Please complete ASAP!',
        },
        push: {
          title_template: '🚨 Task Overdue',
          body_template: '{{task_title}} is overdue - take action now!',
        },
        in_app: {
          title_template: 'Task Overdue',
          message_template:
            '{{task_title}} is overdue and needs immediate attention',
          action_url: '/tasks/{{task_id}}',
        },
      },
      variables: ['task_title', 'deadline', 'priority', 'status', 'task_id'],
      routing_rules: {
        couple_notification: true,
        helper_notification: true,
        vendor_notification: false,
        fallback_to_email: true,
        emergency_override: true,
      },
    });

    // Add more templates for other statuses...
  }
}

// Export singleton instance
export const taskNotificationService = TaskNotificationService.getInstance();
