import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { WorkflowTask, TaskStatus, TaskPriority } from '@/types/workflow';

export interface DeadlineAlert {
  id: string;
  task_id: string;
  alert_type: 'reminder' | 'warning' | 'overdue' | 'escalation';
  alert_time: string;
  triggered_at?: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface NotificationPayload {
  recipient_id: string;
  task_id: string;
  message: string;
  type: 'email' | 'in_app' | 'sms';
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export class DeadlineTrackingService {
  private supabase;

  constructor() {
    this.supabase = createServerComponentClient({ cookies });
  }

  /**
   * Schedule automated deadline alerts for a task
   */
  async scheduleDeadlineAlerts(
    taskId: string,
    deadline: Date,
    priority: TaskPriority,
  ): Promise<void> {
    const now = new Date();
    const timeToDeadline = deadline.getTime() - now.getTime();
    const daysToDeadline = timeToDeadline / (1000 * 60 * 60 * 24);

    const alerts: Omit<DeadlineAlert, 'id'>[] = [];

    // Schedule alerts based on priority and time to deadline
    if (priority === TaskPriority.HIGH || priority === TaskPriority.CRITICAL) {
      // High priority tasks get more frequent reminders
      if (daysToDeadline > 7) {
        alerts.push({
          task_id: taskId,
          alert_type: 'reminder',
          alert_time: new Date(
            deadline.getTime() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          message: 'High priority task due in 7 days',
          priority: 'high',
        });
      }

      if (daysToDeadline > 3) {
        alerts.push({
          task_id: taskId,
          alert_type: 'reminder',
          alert_time: new Date(
            deadline.getTime() - 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          message: 'High priority task due in 3 days',
          priority: 'high',
        });
      }

      if (daysToDeadline > 1) {
        alerts.push({
          task_id: taskId,
          alert_type: 'warning',
          alert_time: new Date(
            deadline.getTime() - 24 * 60 * 60 * 1000,
          ).toISOString(),
          message: 'High priority task due tomorrow - URGENT',
          priority: 'critical',
        });
      }
    } else {
      // Normal priority tasks
      if (daysToDeadline > 5) {
        alerts.push({
          task_id: taskId,
          alert_type: 'reminder',
          alert_time: new Date(
            deadline.getTime() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          message: 'Task due in 5 days',
          priority: 'medium',
        });
      }

      if (daysToDeadline > 2) {
        alerts.push({
          task_id: taskId,
          alert_type: 'warning',
          alert_time: new Date(
            deadline.getTime() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          message: 'Task due in 2 days',
          priority: 'high',
        });
      }
    }

    // Overdue alert for all tasks
    alerts.push({
      task_id: taskId,
      alert_type: 'overdue',
      alert_time: new Date(deadline.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour after deadline
      message: 'Task is overdue',
      priority: 'critical',
    });

    // Escalation alert for critical tasks
    if (priority === TaskPriority.CRITICAL) {
      alerts.push({
        task_id: taskId,
        alert_type: 'escalation',
        alert_time: new Date(
          deadline.getTime() + 4 * 60 * 60 * 1000,
        ).toISOString(), // 4 hours after deadline
        message: 'Critical task overdue - Escalating to supervisor',
        priority: 'critical',
      });
    }

    // Insert alerts into database
    const { error } = await this.supabase
      .from('deadline_alerts')
      .insert(alerts);

    if (error) {
      throw new Error(`Failed to schedule deadline alerts: ${error.message}`);
    }
  }

  /**
   * Get pending alerts that should be triggered
   */
  async getPendingAlerts(): Promise<DeadlineAlert[]> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('deadline_alerts')
      .select('*')
      .is('triggered_at', null)
      .lte('alert_time', now)
      .order('alert_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch pending alerts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mark alert as triggered and send notifications
   */
  async triggerAlert(alert: DeadlineAlert): Promise<void> {
    // Mark alert as triggered
    const { error: updateError } = await this.supabase
      .from('deadline_alerts')
      .update({ triggered_at: new Date().toISOString() })
      .eq('id', alert.id);

    if (updateError) {
      throw new Error(
        `Failed to mark alert as triggered: ${updateError.message}`,
      );
    }

    // Get task and assignee details
    const { data: taskData, error: taskError } = await this.supabase
      .from('workflow_tasks')
      .select(
        `
        *,
        assigned_to:team_members!workflow_tasks_assigned_to_fkey(
          id, user_id, name, email, role, specialty
        ),
        created_by:team_members!workflow_tasks_created_by_fkey(
          id, user_id, name, email, role
        ),
        wedding:weddings(
          id, bride_name, groom_name, wedding_date
        )
      `,
      )
      .eq('id', alert.task_id)
      .single();

    if (taskError || !taskData) {
      throw new Error(`Failed to fetch task details: ${taskError?.message}`);
    }

    // Send notifications to assignee and creator
    const notifications: NotificationPayload[] = [];

    if (taskData.assigned_to) {
      notifications.push({
        recipient_id: taskData.assigned_to.user_id,
        task_id: alert.task_id,
        message: `${alert.message}: "${taskData.title}" for ${taskData.wedding?.bride_name} & ${taskData.wedding?.groom_name}`,
        type: alert.priority === 'critical' ? 'sms' : 'in_app',
        urgency: alert.priority,
      });
    }

    if (
      taskData.created_by &&
      taskData.created_by.user_id !== taskData.assigned_to?.user_id
    ) {
      notifications.push({
        recipient_id: taskData.created_by.user_id,
        task_id: alert.task_id,
        message: `Task delegation alert: "${taskData.title}" - ${alert.message}`,
        type: 'in_app',
        urgency: alert.priority,
      });
    }

    // For escalation alerts, notify supervisors
    if (alert.alert_type === 'escalation') {
      const { data: supervisors } = await this.supabase
        .from('team_members')
        .select('user_id, name, email')
        .in('role', ['admin', 'manager', 'coordinator'])
        .eq('wedding_id', taskData.wedding_id);

      supervisors?.forEach((supervisor) => {
        notifications.push({
          recipient_id: supervisor.user_id,
          task_id: alert.task_id,
          message: `ESCALATION: Critical task "${taskData.title}" is overdue and requires immediate attention`,
          type: 'email',
          urgency: 'critical',
        });
      });
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: notificationError } = await this.supabase
        .from('task_notifications')
        .insert(
          notifications.map((notification) => ({
            ...notification,
            created_at: new Date().toISOString(),
            status: 'pending',
          })),
        );

      if (notificationError) {
        console.error('Failed to create notifications:', notificationError);
      }
    }
  }

  /**
   * Process all pending alerts
   */
  async processAlerts(): Promise<{ processed: number; errors: string[] }> {
    const alerts = await this.getPendingAlerts();
    const errors: string[] = [];
    let processed = 0;

    for (const alert of alerts) {
      try {
        await this.triggerAlert(alert);
        processed++;
      } catch (error) {
        errors.push(
          `Alert ${alert.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return { processed, errors };
  }

  /**
   * Get deadline statistics for a wedding
   */
  async getDeadlineStats(weddingId: string): Promise<{
    upcoming: number;
    overdue: number;
    completed: number;
    critical_overdue: number;
  }> {
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('workflow_tasks')
      .select('deadline, status, priority')
      .eq('wedding_id', weddingId)
      .not('deadline', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch deadline stats: ${error.message}`);
    }

    const stats = {
      upcoming: 0,
      overdue: 0,
      completed: 0,
      critical_overdue: 0,
    };

    data?.forEach((task) => {
      if (task.status === TaskStatus.COMPLETED) {
        stats.completed++;
      } else if (task.deadline && new Date(task.deadline) < new Date()) {
        stats.overdue++;
        if (task.priority === TaskPriority.CRITICAL) {
          stats.critical_overdue++;
        }
      } else {
        stats.upcoming++;
      }
    });

    return stats;
  }

  /**
   * Update task deadline and reschedule alerts
   */
  async updateTaskDeadline(
    taskId: string,
    newDeadline: Date,
    priority: TaskPriority,
  ): Promise<void> {
    // Delete existing alerts for this task
    await this.supabase
      .from('deadline_alerts')
      .delete()
      .eq('task_id', taskId)
      .is('triggered_at', null);

    // Schedule new alerts
    await this.scheduleDeadlineAlerts(taskId, newDeadline, priority);
  }
}

export const deadlineTrackingService = new DeadlineTrackingService();
