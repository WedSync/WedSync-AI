import { createClient } from '@/lib/supabase/server';
import { BookingConfirmationService } from '@/lib/notifications/booking-confirmations';

export interface MeetingPreparationWorkflow {
  id: string;
  meeting_type: string;
  workflow_name: string;
  steps: MeetingPreparationStep[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MeetingPreparationStep {
  id: string;
  step_order: number;
  step_type:
    | 'checklist_item'
    | 'document_preparation'
    | 'reminder'
    | 'client_communication';
  title: string;
  description: string;
  due_hours_before_meeting: number;
  is_required: boolean;
  assignee_type: 'planner' | 'client' | 'system';
  template_content?: string;
  completion_criteria?: string;
}

export interface MeetingPreparationTask {
  id: string;
  booking_id: string;
  step_id: string;
  title: string;
  description: string;
  due_date: string;
  assignee_type: 'planner' | 'client';
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completed_at?: string;
  completed_by?: string;
  notes?: string;
}

export class MeetingPreparationWorkflowService {
  private supabase;
  private confirmationService: BookingConfirmationService;

  constructor() {
    this.supabase = createClient();
    this.confirmationService = new BookingConfirmationService();
  }

  async createPreparationTasks(
    bookingId: string,
  ): Promise<MeetingPreparationTask[]> {
    try {
      // Get booking details
      const { data: booking, error: bookingError } = await this.supabase
        .from('bookings')
        .select(
          `
          *,
          clients(name, phone),
          wedding_planners(name, time_zone)
        `,
        )
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        throw new Error('Booking not found');
      }

      // Get workflow for this meeting type
      const { data: workflow, error: workflowError } = await this.supabase
        .from('meeting_preparation_workflows')
        .select(
          `
          *,
          steps:meeting_preparation_steps(*)
        `,
        )
        .eq('meeting_type', booking.meeting_type)
        .eq('is_active', true)
        .single();

      if (workflowError || !workflow) {
        // Use default workflow
        const defaultWorkflow = await this.getDefaultWorkflow(
          booking.meeting_type,
        );
        return await this.createTasksFromWorkflow(
          bookingId,
          booking,
          defaultWorkflow,
        );
      }

      return await this.createTasksFromWorkflow(bookingId, booking, workflow);
    } catch (error) {
      console.error('Error creating preparation tasks:', error);
      throw error;
    }
  }

  private async createTasksFromWorkflow(
    bookingId: string,
    booking: any,
    workflow: MeetingPreparationWorkflow,
  ): Promise<MeetingPreparationTask[]> {
    const tasks: MeetingPreparationTask[] = [];
    const meetingTime = new Date(booking.scheduled_for);

    for (const step of workflow.steps) {
      if (step.assignee_type === 'system') continue; // Skip system tasks

      const dueDate = new Date(
        meetingTime.getTime() - step.due_hours_before_meeting * 60 * 60 * 1000,
      );

      // Don't create tasks with due dates in the past (unless within 1 hour)
      const now = new Date();
      if (dueDate < new Date(now.getTime() - 60 * 60 * 1000)) {
        continue;
      }

      const taskData = {
        booking_id: bookingId,
        step_id: step.id,
        workflow_id: workflow.id,
        title: step.title,
        description: step.description,
        due_date: dueDate.toISOString(),
        assignee_type: step.assignee_type,
        is_required: step.is_required,
        status: 'pending' as const,
        step_order: step.step_order,
        template_content: step.template_content,
        completion_criteria: step.completion_criteria,
      };

      const { data: task, error } = await this.supabase
        .from('meeting_preparation_tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        continue;
      }

      tasks.push(task);
    }

    // Send initial preparation notification to planner
    await this.sendPreparationNotification(bookingId, tasks.length);

    return tasks;
  }

  private async getDefaultWorkflow(
    meetingType: string,
  ): Promise<MeetingPreparationWorkflow> {
    const defaultWorkflows: Record<string, MeetingPreparationWorkflow> = {
      venue_walkthrough: {
        id: 'default_venue_walkthrough',
        meeting_type: 'venue_walkthrough',
        workflow_name: 'Default Venue Walkthrough Preparation',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        steps: [
          {
            id: '1',
            step_order: 1,
            step_type: 'document_preparation',
            title: 'Prepare venue layout diagrams',
            description:
              'Review venue layouts, seating arrangements, and floor plans',
            due_hours_before_meeting: 24,
            is_required: true,
            assignee_type: 'planner',
            template_content:
              'Venue diagrams and layout options for client review',
          },
          {
            id: '2',
            step_order: 2,
            step_type: 'checklist_item',
            title: 'Confirm venue access and timing',
            description:
              'Ensure venue will be accessible and contact person is available',
            due_hours_before_meeting: 4,
            is_required: true,
            assignee_type: 'planner',
          },
          {
            id: '3',
            step_order: 3,
            step_type: 'client_communication',
            title: 'Review questions with client',
            description:
              'Send client a list of questions to consider during walkthrough',
            due_hours_before_meeting: 48,
            is_required: false,
            assignee_type: 'planner',
            template_content: `Hi {client_name}, here are some questions to think about before our venue walkthrough:
            
1. Where do you envision the ceremony taking place?
2. How many guests will you have?
3. Do you prefer indoor or outdoor spaces?
4. What's your vision for the reception layout?
5. Are there any accessibility requirements?

See you {meeting_date} at {meeting_time}!`,
          },
        ],
      },
      menu_tasting: {
        id: 'default_menu_tasting',
        meeting_type: 'menu_tasting',
        workflow_name: 'Default Menu Tasting Preparation',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        steps: [
          {
            id: '1',
            step_order: 1,
            step_type: 'document_preparation',
            title: 'Prepare dietary requirements form',
            description: 'Review client dietary restrictions and preferences',
            due_hours_before_meeting: 48,
            is_required: true,
            assignee_type: 'planner',
          },
          {
            id: '2',
            step_order: 2,
            step_type: 'client_communication',
            title: 'Confirm dietary restrictions',
            description:
              'Double-check any allergies or dietary requirements with client',
            due_hours_before_meeting: 24,
            is_required: true,
            assignee_type: 'planner',
            template_content: `Hi {client_name}, just confirming for tomorrow's tasting - do you or your partner have any food allergies or dietary restrictions we should know about?`,
          },
          {
            id: '3',
            step_order: 3,
            step_type: 'checklist_item',
            title: 'Coordinate with catering team',
            description:
              'Ensure catering team is prepared with sample portions',
            due_hours_before_meeting: 4,
            is_required: true,
            assignee_type: 'planner',
          },
        ],
      },
      planning_session: {
        id: 'default_planning_session',
        meeting_type: 'planning_session',
        workflow_name: 'Default Planning Session Preparation',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        steps: [
          {
            id: '1',
            step_order: 1,
            step_type: 'document_preparation',
            title: 'Review wedding timeline',
            description:
              'Update and review current wedding timeline and checklist',
            due_hours_before_meeting: 24,
            is_required: true,
            assignee_type: 'planner',
          },
          {
            id: '2',
            step_order: 2,
            step_type: 'document_preparation',
            title: 'Prepare vendor updates',
            description:
              'Gather updates from all vendors and compile status report',
            due_hours_before_meeting: 4,
            is_required: true,
            assignee_type: 'planner',
          },
          {
            id: '3',
            step_order: 3,
            step_type: 'checklist_item',
            title: 'Review outstanding decisions',
            description:
              'List any pending decisions or actions needed from client',
            due_hours_before_meeting: 2,
            is_required: true,
            assignee_type: 'planner',
          },
        ],
      },
      rehearsal_coordination: {
        id: 'default_rehearsal_coordination',
        meeting_type: 'rehearsal_coordination',
        workflow_name: 'Default Rehearsal Coordination Preparation',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        steps: [
          {
            id: '1',
            step_order: 1,
            step_type: 'document_preparation',
            title: 'Prepare ceremony script and timeline',
            description:
              'Finalize ceremony order, readings, and participant roles',
            due_hours_before_meeting: 48,
            is_required: true,
            assignee_type: 'planner',
          },
          {
            id: '2',
            step_order: 2,
            step_type: 'client_communication',
            title: 'Confirm participant attendance',
            description:
              'Verify all wedding party members can attend rehearsal',
            due_hours_before_meeting: 24,
            is_required: true,
            assignee_type: 'planner',
            template_content: `Hi {client_name}, please confirm that your wedding party can attend tomorrow's rehearsal at {meeting_time}. We'll need: bridal party, groomsmen, parents, and officiant.`,
          },
          {
            id: '3',
            step_order: 3,
            step_type: 'checklist_item',
            title: 'Coordinate with venue and vendors',
            description:
              'Ensure venue access and key vendor availability for rehearsal',
            due_hours_before_meeting: 4,
            is_required: true,
            assignee_type: 'planner',
          },
        ],
      },
    };

    return (
      defaultWorkflows[meetingType] || defaultWorkflows['planning_session']
    );
  }

  async getPreparationTasks(
    bookingId: string,
  ): Promise<MeetingPreparationTask[]> {
    try {
      const { data: tasks, error } = await this.supabase
        .from('meeting_preparation_tasks')
        .select(
          `
          *,
          step:meeting_preparation_steps(*)
        `,
        )
        .eq('booking_id', bookingId)
        .order('step_order');

      if (error) {
        throw new Error(`Failed to fetch preparation tasks: ${error.message}`);
      }

      return tasks || [];
    } catch (error) {
      console.error('Error fetching preparation tasks:', error);
      return [];
    }
  }

  async updateTaskStatus(
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'skipped',
    userId: string,
    notes?: string,
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = userId;
      }

      if (notes) {
        updateData.notes = notes;
      }

      const { error } = await this.supabase
        .from('meeting_preparation_tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) {
        throw new Error(`Failed to update task: ${error.message}`);
      }

      // Check if all required tasks are completed
      await this.checkAllTasksCompleted(taskId);

      return true;
    } catch (error) {
      console.error('Error updating task status:', error);
      return false;
    }
  }

  private async checkAllTasksCompleted(taskId: string): Promise<void> {
    try {
      // Get booking ID from the task
      const { data: task } = await this.supabase
        .from('meeting_preparation_tasks')
        .select('booking_id')
        .eq('id', taskId)
        .single();

      if (!task) return;

      // Check if all required tasks are completed
      const { data: incompleteTasks } = await this.supabase
        .from('meeting_preparation_tasks')
        .select('id')
        .eq('booking_id', task.booking_id)
        .eq('is_required', true)
        .neq('status', 'completed');

      if (!incompleteTasks?.length) {
        // All required tasks completed - send notification
        await this.sendPreparationCompleteNotification(task.booking_id);
      }
    } catch (error) {
      console.error('Error checking task completion:', error);
    }
  }

  async getPreparationStatus(bookingId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    requiredTasks: number;
    completedRequiredTasks: number;
    overdueTasks: number;
    upcomingTasks: number;
    completionPercentage: number;
    isReady: boolean;
  }> {
    try {
      const { data: tasks, error } = await this.supabase
        .from('meeting_preparation_tasks')
        .select('*')
        .eq('booking_id', bookingId);

      if (error || !tasks) {
        return {
          totalTasks: 0,
          completedTasks: 0,
          requiredTasks: 0,
          completedRequiredTasks: 0,
          overdueTasks: 0,
          upcomingTasks: 0,
          completionPercentage: 0,
          isReady: false,
        };
      }

      const now = new Date();
      const completedTasks = tasks.filter(
        (t) => t.status === 'completed',
      ).length;
      const requiredTasks = tasks.filter((t) => t.is_required).length;
      const completedRequiredTasks = tasks.filter(
        (t) => t.is_required && t.status === 'completed',
      ).length;
      const overdueTasks = tasks.filter(
        (t) => t.status !== 'completed' && new Date(t.due_date) < now,
      ).length;
      const upcomingTasks = tasks.filter(
        (t) =>
          t.status === 'pending' &&
          new Date(t.due_date) > now &&
          new Date(t.due_date) < new Date(now.getTime() + 24 * 60 * 60 * 1000),
      ).length;

      return {
        totalTasks: tasks.length,
        completedTasks,
        requiredTasks,
        completedRequiredTasks,
        overdueTasks,
        upcomingTasks,
        completionPercentage:
          tasks.length > 0
            ? Math.round((completedTasks / tasks.length) * 100)
            : 0,
        isReady: completedRequiredTasks === requiredTasks,
      };
    } catch (error) {
      console.error('Error getting preparation status:', error);
      throw error;
    }
  }

  async sendTaskReminder(taskId: string): Promise<boolean> {
    try {
      const { data: task, error } = await this.supabase
        .from('meeting_preparation_tasks')
        .select(
          `
          *,
          booking:bookings(
            *,
            clients(name, phone),
            wedding_planners(name, phone)
          )
        `,
        )
        .eq('id', taskId)
        .single();

      if (error || !task) {
        throw new Error('Task not found');
      }

      const phoneNumber =
        task.assignee_type === 'client'
          ? task.booking.clients.phone
          : task.booking.wedding_planners.phone;

      const recipientName =
        task.assignee_type === 'client'
          ? task.booking.clients.name
          : task.booking.wedding_planners.name;

      const message = this.generateTaskReminderMessage(task, recipientName);

      // Send via SMS (could be extended to support WhatsApp based on preferences)
      const result = await this.supabase.from('sms_logs').insert({
        to_phone: phoneNumber,
        message_content: message,
        message_type: 'task_reminder',
        booking_id: task.booking_id,
        task_id: taskId,
        sent_at: new Date().toISOString(),
      });

      return !result.error;
    } catch (error) {
      console.error('Error sending task reminder:', error);
      return false;
    }
  }

  private generateTaskReminderMessage(
    task: any,
    recipientName: string,
  ): string {
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const hoursUntilDue = Math.round(
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60),
    );

    let timeText = '';
    if (hoursUntilDue <= 0) {
      timeText = 'overdue';
    } else if (hoursUntilDue < 24) {
      timeText = `due in ${hoursUntilDue} hours`;
    } else {
      const daysUntilDue = Math.round(hoursUntilDue / 24);
      timeText = `due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`;
    }

    let message = `📋 Task Reminder\n\n`;
    message += `Hi ${recipientName}! You have a preparation task ${timeText}:\n\n`;
    message += `**${task.title}**\n`;
    message += `${task.description}\n\n`;

    if (task.template_content) {
      message += `Guidelines:\n${task.template_content}\n\n`;
    }

    message += `Meeting: ${task.booking.meeting_type} on ${new Date(task.booking.scheduled_for).toLocaleDateString()}\n\n`;
    message += `Please complete this task to ensure a smooth meeting. Reply DONE when completed.`;

    return message;
  }

  private async sendPreparationNotification(
    bookingId: string,
    taskCount: number,
  ): Promise<void> {
    try {
      const { data: booking, error } = await this.supabase
        .from('bookings')
        .select(
          `
          *,
          wedding_planners(name, phone)
        `,
        )
        .eq('id', bookingId)
        .single();

      if (error || !booking) return;

      const message = `📅 Meeting Preparation Started\n\nPreparation tasks have been created for your upcoming ${booking.meeting_type} meeting.\n\nTotal tasks: ${taskCount}\nMeeting: ${new Date(booking.scheduled_for).toLocaleDateString()}\n\nView tasks at: https://wedsync.com/dashboard/bookings/${bookingId}/preparation`;

      await this.supabase.from('sms_logs').insert({
        to_phone: booking.wedding_planners.phone,
        message_content: message,
        message_type: 'preparation_started',
        booking_id: bookingId,
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending preparation notification:', error);
    }
  }

  private async sendPreparationCompleteNotification(
    bookingId: string,
  ): Promise<void> {
    try {
      const { data: booking, error } = await this.supabase
        .from('bookings')
        .select(
          `
          *,
          wedding_planners(name, phone)
        `,
        )
        .eq('id', bookingId)
        .single();

      if (error || !booking) return;

      const message = `✅ Meeting Preparation Complete\n\nAll required preparation tasks have been completed for your ${booking.meeting_type} meeting on ${new Date(booking.scheduled_for).toLocaleDateString()}.\n\nYou're all set for a successful meeting!`;

      await this.supabase.from('sms_logs').insert({
        to_phone: booking.wedding_planners.phone,
        message_content: message,
        message_type: 'preparation_complete',
        booking_id: bookingId,
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending preparation complete notification:', error);
    }
  }

  async processOverdueTasks(): Promise<void> {
    try {
      const now = new Date();
      const { data: overdueTasks, error } = await this.supabase
        .from('meeting_preparation_tasks')
        .select(
          `
          *,
          booking:bookings(scheduled_for)
        `,
        )
        .eq('status', 'pending')
        .lt('due_date', now.toISOString())
        .gte('booking.scheduled_for', now.toISOString()); // Only for future meetings

      if (error || !overdueTasks?.length) return;

      for (const task of overdueTasks) {
        // Send overdue reminder
        await this.sendTaskReminder(task.id);

        // Mark as overdue in database
        await this.supabase
          .from('meeting_preparation_tasks')
          .update({
            status: 'overdue',
            updated_at: new Date().toISOString(),
          })
          .eq('id', task.id);
      }
    } catch (error) {
      console.error('Error processing overdue tasks:', error);
    }
  }
}
