import { BaseNodeExecutor } from './base';
import { NodeExecutorContext, NodeExecutorResult } from './types';
import { createClient } from '@/lib/supabase/server';

interface TaskNodeConfig {
  taskType?: 'manual' | 'automated' | 'approval';
  title: string;
  description?: string;
  assigneeType?: 'vendor' | 'client' | 'team_member' | 'specific';
  assigneeId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  category?: string;
  tags?: string[];
  requiresApproval?: boolean;
  approverIds?: string[];
  autoComplete?: boolean;
  completionCriteria?: {
    type: 'manual' | 'webhook' | 'condition';
    webhookUrl?: string;
    condition?: string;
  };
}

export class TaskNodeExecutor extends BaseNodeExecutor {
  private supabase = createClient();

  async execute(
    context: NodeExecutorContext,
    config: TaskNodeConfig,
  ): Promise<NodeExecutorResult> {
    try {
      // Validate configuration
      this.validateConfig(config, ['title']);

      // Create task
      const task = await this.createTask(context, config);

      // Assign task
      await this.assignTask(task.id, context, config);

      // Set up notifications
      await this.sendTaskNotifications(task, context, config);

      // Set up auto-completion if configured
      if (config.autoComplete && config.completionCriteria) {
        await this.setupAutoCompletion(task.id, context, config);
      }

      // Track task creation
      await this.trackTaskCreation(context, task, config);

      this.logger.info('Task created successfully', {
        executionId: context.executionId,
        stepId: context.stepId,
        taskId: task.id,
        title: config.title,
      });

      // If task requires approval, pause execution
      if (config.requiresApproval) {
        return {
          success: true,
          output: {
            taskId: task.id,
            title: task.title,
            status: 'pending_approval',
            createdAt: new Date().toISOString(),
          },
          pauseExecution: true,
        };
      }

      return {
        success: true,
        output: {
          taskId: task.id,
          title: task.title,
          assignee: task.assignee_id,
          dueDate: task.due_date,
          priority: task.priority,
          createdAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Task node execution failed', {
        executionId: context.executionId,
        stepId: context.stepId,
        error,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Task creation failed',
      };
    }
  }

  private async createTask(
    context: NodeExecutorContext,
    config: TaskNodeConfig,
  ): Promise<any> {
    const taskData = {
      title: this.interpolateTemplate(config.title, context.variables),
      description: config.description
        ? this.interpolateTemplate(config.description, context.variables)
        : null,
      journey_execution_id: context.executionId,
      vendor_id: context.vendorData?.id,
      client_id: context.clientData?.id,
      priority: config.priority || 'medium',
      due_date: config.dueDate,
      category: config.category,
      tags: config.tags || [],
      status: config.requiresApproval ? 'pending_approval' : 'pending',
      requires_approval: config.requiresApproval || false,
      metadata: {
        taskType: config.taskType,
        autoComplete: config.autoComplete,
        completionCriteria: config.completionCriteria,
      },
    };

    const { data, error } = await this.supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    return data;
  }

  private async assignTask(
    taskId: string,
    context: NodeExecutorContext,
    config: TaskNodeConfig,
  ): Promise<void> {
    let assigneeId: string | null = null;

    // Determine assignee
    switch (config.assigneeType) {
      case 'vendor':
        assigneeId = context.vendorData?.id || null;
        break;
      case 'client':
        assigneeId = context.clientData?.id || null;
        break;
      case 'specific':
        assigneeId = config.assigneeId || null;
        break;
      case 'team_member':
        // Would need to look up team member
        assigneeId = await this.findTeamMember(context.vendorData?.id);
        break;
    }

    if (assigneeId) {
      const { error } = await this.supabase
        .from('tasks')
        .update({ assignee_id: assigneeId })
        .eq('id', taskId);

      if (error) {
        this.logger.warn('Failed to assign task', {
          taskId,
          assigneeId,
          error,
        });
      }
    }

    // Add approvers if required
    if (config.requiresApproval && config.approverIds) {
      const approvers = config.approverIds.map((approverId) => ({
        task_id: taskId,
        approver_id: approverId,
        status: 'pending',
      }));

      const { error } = await this.supabase
        .from('task_approvers')
        .insert(approvers);

      if (error) {
        this.logger.warn('Failed to add task approvers', {
          taskId,
          error,
        });
      }
    }
  }

  private async sendTaskNotifications(
    task: any,
    context: NodeExecutorContext,
    config: TaskNodeConfig,
  ): Promise<void> {
    const notifications = [];

    // Notification for assignee
    if (task.assignee_id) {
      notifications.push({
        user_id: task.assignee_id,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned: ${task.title}`,
        data: {
          task_id: task.id,
          priority: task.priority,
          due_date: task.due_date,
        },
      });
    }

    // Notifications for approvers
    if (config.requiresApproval && config.approverIds) {
      for (const approverId of config.approverIds) {
        notifications.push({
          user_id: approverId,
          type: 'approval_required',
          title: 'Approval Required',
          message: `Please review and approve: ${task.title}`,
          data: {
            task_id: task.id,
            requester: context.vendorData?.name,
          },
        });
      }
    }

    if (notifications.length > 0) {
      const { error } = await this.supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        this.logger.warn('Failed to send task notifications', {
          taskId: task.id,
          error,
        });
      }
    }
  }

  private async setupAutoCompletion(
    taskId: string,
    context: NodeExecutorContext,
    config: TaskNodeConfig,
  ): Promise<void> {
    if (!config.completionCriteria) {
      return;
    }

    const autoCompletionData = {
      task_id: taskId,
      journey_execution_id: context.executionId,
      criteria_type: config.completionCriteria.type,
      criteria_config: config.completionCriteria,
      status: 'active',
    };

    const { error } = await this.supabase
      .from('task_auto_completion')
      .insert(autoCompletionData);

    if (error) {
      this.logger.warn('Failed to set up auto-completion', {
        taskId,
        error,
      });
    }

    // If webhook-based completion, register the webhook
    if (
      config.completionCriteria.type === 'webhook' &&
      config.completionCriteria.webhookUrl
    ) {
      await this.registerCompletionWebhook(
        taskId,
        config.completionCriteria.webhookUrl,
      );
    }
  }

  private async registerCompletionWebhook(
    taskId: string,
    webhookUrl: string,
  ): Promise<void> {
    const { error } = await this.supabase.from('task_webhooks').insert({
      task_id: taskId,
      webhook_url: webhookUrl,
      event_type: 'completion',
      status: 'active',
    });

    if (error) {
      this.logger.warn('Failed to register completion webhook', {
        taskId,
        webhookUrl,
        error,
      });
    }
  }

  private async trackTaskCreation(
    context: NodeExecutorContext,
    task: any,
    config: TaskNodeConfig,
  ): Promise<void> {
    const { error } = await this.supabase.from('journey_task_tracking').insert({
      execution_id: context.executionId,
      step_id: context.stepId,
      task_id: task.id,
      task_type: config.taskType,
      created_at: new Date().toISOString(),
    });

    if (error) {
      this.logger.warn('Failed to track task creation', {
        executionId: context.executionId,
        taskId: task.id,
        error,
      });
    }
  }

  private async findTeamMember(vendorId?: string): Promise<string | null> {
    if (!vendorId) {
      return null;
    }

    // Find an available team member for the vendor
    const { data, error } = await this.supabase
      .from('team_members')
      .select('user_id')
      .eq('vendor_id', vendorId)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.user_id;
  }
}
