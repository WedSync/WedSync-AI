import { createClient } from '@/lib/supabase/server';
import {
  addDays,
  addWeeks,
  addMonths,
  isWeekend,
  nextMonday,
  format,
} from 'date-fns';

export interface TimelineAnchorConfig {
  anchor_type: 'booking_date' | 'wedding_date' | 'fixed_date' | 'relative_date';
  offset: {
    value: number;
    unit: 'days' | 'weeks' | 'months';
    direction: 'before' | 'after';
  };
  business_hours?: {
    enabled: boolean;
    start: string; // "09:00"
    end: string; // "17:00"
  };
  skip_weekends: boolean;
  timezone: string;
  fixed_date?: string;
}

export interface JourneyNode {
  id: string;
  journey_id: string;
  node_id: string;
  type: string;
  name: string;
  action_type?: string;
  timeline_config?: TimelineAnchorConfig;
  config: any;
}

export interface Client {
  id: string;
  wedding_date?: string;
  booking_date?: string;
  email?: string;
  phone?: string;
  name?: string;
}

export interface JourneyExecution {
  id: string;
  journey_id: string;
  client_id: string;
  status: 'active' | 'completed' | 'paused' | 'failed';
  current_node_id?: string;
  metadata: any;
}

export interface ScheduledAction {
  id: string;
  execution_id: string;
  node_id: string;
  action_type: string;
  scheduled_for: Date;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  attempt_count: number;
  result: any;
}

export class JourneyScheduler {
  private supabase = createClient();

  /**
   * Schedule a journey for a specific client
   */
  async scheduleJourneyForClient(
    journeyId: string,
    clientId: string,
  ): Promise<string> {
    try {
      // Get journey definition
      const { data: journey, error: journeyError } = await this.supabase
        .from('journeys')
        .select('*')
        .eq('id', journeyId)
        .single();

      if (journeyError || !journey) {
        throw new Error(`Journey not found: ${journeyId}`);
      }

      // Get client data
      const { data: client, error: clientError } = await this.supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        throw new Error(`Client not found: ${clientId}`);
      }

      // Get journey nodes
      const { data: nodes, error: nodesError } = await this.supabase
        .from('journey_nodes')
        .select('*')
        .eq('journey_id', journeyId)
        .order('created_at');

      if (nodesError) {
        throw new Error(`Failed to fetch journey nodes: ${nodesError.message}`);
      }

      // Create execution record
      const { data: execution, error: executionError } = await this.supabase
        .from('journey_executions')
        .insert({
          journey_id: journeyId,
          client_id: clientId,
          status: 'active',
          metadata: {
            client_data: client,
            journey_data: journey,
            started_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (executionError || !execution) {
        throw new Error(
          `Failed to create execution: ${executionError?.message}`,
        );
      }

      // Schedule all timeline-based actions
      const timelineNodes = nodes.filter(
        (n) => n.type === 'timeline' && n.timeline_config,
      );

      for (const node of timelineNodes) {
        try {
          const scheduledDate = this.calculateScheduleDate(
            node.timeline_config!,
            new Date(client.wedding_date || new Date()),
            new Date(client.booking_date || new Date()),
          );

          await this.scheduleAction(
            execution.id,
            node.id,
            node.action_type || 'reminder',
            scheduledDate,
          );
        } catch (nodeError) {
          console.error(`Failed to schedule node ${node.name}:`, nodeError);
          // Continue with other nodes
        }
      }

      return execution.id;
    } catch (error) {
      console.error('Failed to schedule journey:', error);
      throw error;
    }
  }

  /**
   * Calculate the execution date for a timeline node
   */
  private calculateScheduleDate(
    config: TimelineAnchorConfig,
    weddingDate: Date,
    bookingDate: Date,
    fixedDate?: Date,
  ): Date {
    let anchor: Date;

    switch (config.anchor_type) {
      case 'wedding_date':
        anchor = weddingDate;
        break;
      case 'booking_date':
        anchor = bookingDate;
        break;
      case 'fixed_date':
        anchor =
          fixedDate ||
          (config.fixed_date ? new Date(config.fixed_date) : new Date());
        break;
      default:
        throw new Error(`Unsupported anchor type: ${config.anchor_type}`);
    }

    // Calculate offset
    let scheduledDate: Date;
    const offsetValue =
      config.offset.direction === 'before'
        ? -Math.abs(config.offset.value)
        : Math.abs(config.offset.value);

    switch (config.offset.unit) {
      case 'days':
        scheduledDate = addDays(anchor, offsetValue);
        break;
      case 'weeks':
        scheduledDate = addWeeks(anchor, offsetValue);
        break;
      case 'months':
        scheduledDate = addMonths(anchor, offsetValue);
        break;
      default:
        throw new Error(`Unsupported offset unit: ${config.offset.unit}`);
    }

    // Handle business hours and weekend skipping
    if (config.skip_weekends && isWeekend(scheduledDate)) {
      scheduledDate = nextMonday(scheduledDate);
    }

    // Apply business hours
    if (config.business_hours?.enabled) {
      const [startHour, startMinute] = config.business_hours.start
        .split(':')
        .map(Number);
      scheduledDate.setHours(startHour, startMinute, 0, 0);
    }

    return scheduledDate;
  }

  /**
   * Schedule a specific action
   */
  private async scheduleAction(
    executionId: string,
    nodeId: string,
    actionType: string,
    scheduledDate: Date,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('journey_scheduled_actions')
      .insert({
        execution_id: executionId,
        node_id: nodeId,
        action_type: actionType,
        scheduled_for: scheduledDate.toISOString(),
        status: 'pending',
        attempt_count: 0,
        result: {},
      });

    if (error) {
      throw new Error(`Failed to schedule action: ${error.message}`);
    }
  }

  /**
   * Execute a scheduled action
   */
  async executeScheduledAction(actionId: string): Promise<void> {
    try {
      // Get the scheduled action
      const { data: action, error: actionError } = await this.supabase
        .from('journey_scheduled_actions')
        .select('*')
        .eq('id', actionId)
        .single();

      if (actionError || !action) {
        throw new Error(`Scheduled action not found: ${actionId}`);
      }

      // Get execution details
      const { data: execution, error: executionError } = await this.supabase
        .from('journey_executions')
        .select('*')
        .eq('id', action.execution_id)
        .single();

      if (executionError || !execution) {
        throw new Error(`Execution not found: ${action.execution_id}`);
      }

      // Get client details
      const { data: client, error: clientError } = await this.supabase
        .from('clients')
        .select('*')
        .eq('id', execution.client_id)
        .single();

      if (clientError || !client) {
        throw new Error(`Client not found: ${execution.client_id}`);
      }

      // Execute the action based on type
      let result: any = {};

      try {
        switch (action.action_type) {
          case 'email':
            result = await this.sendEmail(action, client);
            break;
          case 'sms':
            result = await this.sendSMS(action, client);
            break;
          case 'form':
            result = await this.sendForm(action, client);
            break;
          case 'reminder':
            result = await this.createReminder(action, client);
            break;
          default:
            throw new Error(`Unsupported action type: ${action.action_type}`);
        }

        // Mark action as completed
        await this.markActionCompleted(actionId, result);
      } catch (executionError) {
        // Mark action as failed
        await this.markActionFailed(
          actionId,
          executionError instanceof Error
            ? executionError.message
            : 'Unknown error',
        );
        throw executionError;
      }
    } catch (error) {
      console.error('Failed to execute scheduled action:', error);
      throw error;
    }
  }

  /**
   * Send email action
   */
  private async sendEmail(
    action: ScheduledAction,
    client: Client,
  ): Promise<any> {
    // TODO: Integrate with email service
    console.log(`Sending email to ${client.email} for action ${action.id}`);

    // Simulate email sending
    return {
      action: 'email_sent',
      recipient: client.email,
      timestamp: new Date().toISOString(),
      message_id: `email_${Date.now()}`,
    };
  }

  /**
   * Send SMS action
   */
  private async sendSMS(action: ScheduledAction, client: Client): Promise<any> {
    // TODO: Integrate with SMS service
    console.log(`Sending SMS to ${client.phone} for action ${action.id}`);

    // Simulate SMS sending
    return {
      action: 'sms_sent',
      recipient: client.phone,
      timestamp: new Date().toISOString(),
      message_id: `sms_${Date.now()}`,
    };
  }

  /**
   * Send form action
   */
  private async sendForm(
    action: ScheduledAction,
    client: Client,
  ): Promise<any> {
    // TODO: Generate and send form link
    console.log(`Sending form to ${client.email} for action ${action.id}`);

    // Simulate form sending
    return {
      action: 'form_sent',
      recipient: client.email,
      timestamp: new Date().toISOString(),
      form_url: `https://forms.wedsync.com/form_${Date.now()}`,
    };
  }

  /**
   * Create reminder action
   */
  private async createReminder(
    action: ScheduledAction,
    client: Client,
  ): Promise<any> {
    // TODO: Create internal reminder/task
    console.log(
      `Creating reminder for client ${client.name} for action ${action.id}`,
    );

    // Simulate reminder creation
    return {
      action: 'reminder_created',
      client_id: client.id,
      timestamp: new Date().toISOString(),
      reminder_id: `reminder_${Date.now()}`,
    };
  }

  /**
   * Mark action as completed
   */
  private async markActionCompleted(
    actionId: string,
    result: any,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('journey_scheduled_actions')
      .update({
        status: 'executed',
        result,
        attempt_count: this.supabase.sql`attempt_count + 1`,
      })
      .eq('id', actionId);

    if (error) {
      throw new Error(`Failed to mark action as completed: ${error.message}`);
    }
  }

  /**
   * Mark action as failed
   */
  private async markActionFailed(
    actionId: string,
    errorMessage: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('journey_scheduled_actions')
      .update({
        status: 'failed',
        result: { error: errorMessage },
        attempt_count: this.supabase.sql`attempt_count + 1`,
      })
      .eq('id', actionId);

    if (error) {
      throw new Error(`Failed to mark action as failed: ${error.message}`);
    }
  }

  /**
   * Get pending actions ready for execution
   */
  async getPendingActions(limit: number = 100): Promise<ScheduledAction[]> {
    const { data: actions, error } = await this.supabase
      .from('journey_scheduled_actions')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for')
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get pending actions: ${error.message}`);
    }

    return actions || [];
  }

  /**
   * Process all pending actions
   */
  async processPendingActions(): Promise<{
    processed: number;
    failed: number;
  }> {
    let processed = 0;
    let failed = 0;

    try {
      const pendingActions = await this.getPendingActions();

      for (const action of pendingActions) {
        try {
          await this.executeScheduledAction(action.id);
          processed++;
        } catch (error) {
          console.error(`Failed to execute action ${action.id}:`, error);
          failed++;
        }
      }
    } catch (error) {
      console.error('Failed to process pending actions:', error);
      throw error;
    }

    return { processed, failed };
  }

  /**
   * Pause a journey execution
   */
  async pauseJourneyExecution(executionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('journey_executions')
      .update({ status: 'paused' })
      .eq('id', executionId);

    if (error) {
      throw new Error(`Failed to pause execution: ${error.message}`);
    }

    // Cancel all pending actions for this execution
    await this.supabase
      .from('journey_scheduled_actions')
      .update({ status: 'cancelled' })
      .eq('execution_id', executionId)
      .eq('status', 'pending');
  }

  /**
   * Resume a journey execution
   */
  async resumeJourneyExecution(executionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('journey_executions')
      .update({ status: 'active' })
      .eq('id', executionId);

    if (error) {
      throw new Error(`Failed to resume execution: ${error.message}`);
    }

    // TODO: Reschedule cancelled actions if needed
  }

  /**
   * Get execution statistics for a journey
   */
  async getJourneyStats(journeyId: string): Promise<any> {
    const { data: stats, error } = await this.supabase
      .from('journey_executions')
      .select('status')
      .eq('journey_id', journeyId);

    if (error) {
      throw new Error(`Failed to get journey stats: ${error.message}`);
    }

    const summary = {
      total: stats.length,
      active: 0,
      completed: 0,
      paused: 0,
      failed: 0,
    };

    stats.forEach((execution) => {
      summary[execution.status as keyof typeof summary]++;
    });

    return summary;
  }
}

export const journeyScheduler = new JourneyScheduler();
