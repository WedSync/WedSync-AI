import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { journeyExecutor } from './executor';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface SchedulerConfig {
  processInterval: number; // milliseconds
  batchSize: number;
  maxRetries: number;
  retryDelay: number; // milliseconds
  timezone: string;
  businessHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
    days: string[]; // ['mon', 'tue', 'wed', 'thu', 'fri']
  };
}

interface ScheduledTask {
  id: string;
  instance_id: string;
  node_id: string;
  scheduled_for: Date;
  schedule_type: string;
  status: string;
  retry_count: number;
  metadata?: any;
}

/**
 * Journey Scheduler - Handles time-based execution and business hours
 */
export class JourneyScheduler {
  private config: SchedulerConfig;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      processInterval: 30000, // 30 seconds
      batchSize: 50,
      maxRetries: 3,
      retryDelay: 60000, // 1 minute
      timezone: 'America/New_York',
      businessHours: {
        enabled: true,
        start: '09:00',
        end: '17:00',
        days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      },
      ...config,
    };
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.warn('Scheduler is already running');
      return;
    }

    console.log('Starting Journey Scheduler');
    this.isRunning = true;

    // Start the main processing loop
    this.intervalId = setInterval(() => {
      if (!this.processing) {
        this.processScheduledTasks();
      }
    }, this.config.processInterval);

    // Process immediately on start
    setTimeout(() => {
      this.processScheduledTasks();
    }, 1000);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.warn('Scheduler is not running');
      return;
    }

    console.log('Stopping Journey Scheduler');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Process all scheduled tasks that are due
   */
  private async processScheduledTasks() {
    if (this.processing) return;

    this.processing = true;
    const startTime = Date.now();

    try {
      console.log(`Processing scheduled tasks - ${new Date().toISOString()}`);

      // Get pending tasks that are due
      const dueTasks = await this.getDueTasks();

      if (dueTasks.length === 0) {
        console.log('No scheduled tasks due for execution');
        return;
      }

      console.log(`Found ${dueTasks.length} tasks due for execution`);

      // Process tasks in batches
      const batches = this.chunkArray(dueTasks, this.config.batchSize);

      for (const batch of batches) {
        await this.processBatch(batch);
      }

      // Clean up old completed tasks
      await this.cleanupCompletedTasks();

      const duration = Date.now() - startTime;
      console.log(`Scheduled task processing completed in ${duration}ms`);
    } catch (error) {
      console.error('Error processing scheduled tasks:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get tasks that are due for execution
   */
  private async getDueTasks(): Promise<ScheduledTask[]> {
    const now = new Date();

    // Get tasks scheduled for execution
    const { data: tasks, error } = await supabase
      .from('journey_schedules')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(this.config.batchSize * 3); // Get more than we need for filtering

    if (error) {
      console.error('Error fetching scheduled tasks:', error);
      return [];
    }

    if (!tasks || tasks.length === 0) {
      return [];
    }

    // Filter tasks based on business hours if enabled
    const filteredTasks = tasks.filter((task) => {
      // Get the journey settings for this task
      return this.isTaskExecutableNow(task as any);
    });

    return filteredTasks as ScheduledTask[];
  }

  /**
   * Check if a task can be executed now based on business hours
   */
  private async isTaskExecutableNow(task: ScheduledTask): Promise<boolean> {
    try {
      // Get the journey settings
      const { data: instance } = await supabase
        .from('journey_instances')
        .select(
          `
          journey_id,
          journeys!inner(settings)
        `,
        )
        .eq('id', task.instance_id)
        .single();

      if (!instance) return true; // Default to executable if we can't find settings

      const journeySettings = (instance as any).journeys.settings || {};
      const businessHours =
        journeySettings.businessHours || this.config.businessHours;

      // If business hours are disabled, task is always executable
      if (!businessHours.enabled) {
        return true;
      }

      // Check current time against business hours
      return this.isWithinBusinessHours(
        new Date(),
        businessHours,
        journeySettings.timezone || this.config.timezone,
      );
    } catch (error) {
      console.error('Error checking business hours for task:', error);
      return true; // Default to executable on error
    }
  }

  /**
   * Check if current time is within business hours
   */
  private isWithinBusinessHours(
    date: Date,
    businessHours: any,
    timezone: string,
  ): boolean {
    // Create date in the specified timezone
    const dateInTimezone = new Date(
      date.toLocaleString('en-US', { timeZone: timezone }),
    );

    // Get day of week (0 = Sunday, 1 = Monday, ...)
    const dayOfWeek = dateInTimezone.getDay();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const currentDay = dayNames[dayOfWeek];

    // Check if current day is a business day
    if (!businessHours.days.includes(currentDay)) {
      return false;
    }

    // Check if current time is within business hours
    const currentTime =
      dateInTimezone.getHours() * 60 + dateInTimezone.getMinutes();
    const [startHour, startMin] = businessHours.start.split(':').map(Number);
    const [endHour, endMin] = businessHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Process a batch of tasks
   */
  private async processBatch(tasks: ScheduledTask[]) {
    const promises = tasks.map((task) => this.processTask(task));

    // Process all tasks in parallel but catch individual errors
    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Task ${tasks[index].id} failed:`, result.reason);
      }
    });
  }

  /**
   * Process a single scheduled task
   */
  private async processTask(task: ScheduledTask) {
    try {
      console.log(
        `Processing scheduled task: ${task.id} for node: ${task.node_id}`,
      );

      // Mark task as processing
      await supabase
        .from('journey_schedules')
        .update({
          status: 'processing',
          processed_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      // Get the journey instance
      const { data: instance, error: instanceError } = await supabase
        .from('journey_instances')
        .select('*')
        .eq('id', task.instance_id)
        .single();

      if (instanceError || !instance) {
        throw new Error(`Journey instance not found: ${task.instance_id}`);
      }

      // Check if instance is still active
      if (instance.state !== 'active') {
        await supabase
          .from('journey_schedules')
          .update({ status: 'cancelled' })
          .eq('id', task.id);
        return;
      }

      // Get the node to execute
      const { data: node, error: nodeError } = await supabase
        .from('journey_nodes')
        .select('*')
        .eq('journey_id', instance.journey_id)
        .eq('node_id', task.node_id)
        .single();

      if (nodeError || !node) {
        throw new Error(`Journey node not found: ${task.node_id}`);
      }

      // Execute the node using the journey executor
      await this.executeScheduledNode(instance as any, node as any, task);

      // Mark task as completed
      await supabase
        .from('journey_schedules')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', task.id);
    } catch (error) {
      console.error(`Error processing task ${task.id}:`, error);
      await this.handleTaskError(task, error);
    }
  }

  /**
   * Execute a scheduled node
   */
  private async executeScheduledNode(
    instance: any,
    node: any,
    task: ScheduledTask,
  ) {
    // Use the journey executor to continue from this node
    if (task.schedule_type === 'delay' || task.schedule_type === 'wait') {
      // Continue to next nodes after wait
      const nextNodes = node.next_nodes || [];

      for (const nextNodeId of nextNodes) {
        // Get the next node
        const { data: nextNode } = await supabase
          .from('journey_nodes')
          .select('*')
          .eq('journey_id', instance.journey_id)
          .eq('node_id', nextNodeId)
          .single();

        if (nextNode) {
          // Update instance current node
          await supabase
            .from('journey_instances')
            .update({
              current_node_id: nextNodeId,
              current_step: instance.current_step + 1,
            })
            .eq('id', instance.id);

          // Execute the next node
          await (journeyExecutor as any).executeNode(
            { ...instance, current_node_id: nextNodeId },
            nextNode,
          );
        }
      }
    } else if (task.schedule_type === 'retry') {
      // Retry the current node
      await (journeyExecutor as any).executeNode(instance, node);
    } else if (task.schedule_type === 'time_trigger') {
      // Execute time-triggered node
      await (journeyExecutor as any).executeNode(instance, node);
    }
  }

  /**
   * Handle task execution error
   */
  private async handleTaskError(task: ScheduledTask, error: any) {
    const retryCount = task.retry_count + 1;

    if (retryCount <= this.config.maxRetries) {
      // Schedule retry
      const nextRetryTime = new Date(
        Date.now() + this.config.retryDelay * Math.pow(2, retryCount - 1),
      );

      await supabase
        .from('journey_schedules')
        .update({
          status: 'pending',
          retry_count: retryCount,
          next_retry_at: nextRetryTime.toISOString(),
          scheduled_for: nextRetryTime.toISOString(),
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', task.id);

      console.log(
        `Scheduled retry ${retryCount}/${this.config.maxRetries} for task ${task.id} at ${nextRetryTime.toISOString()}`,
      );
    } else {
      // Max retries exceeded
      await supabase
        .from('journey_schedules')
        .update({
          status: 'failed',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
          processed_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      console.error(
        `Task ${task.id} failed after ${this.config.maxRetries} retries:`,
        error,
      );

      // Optionally fail the journey instance
      await this.handleInstanceFailure(task.instance_id, error);
    }
  }

  /**
   * Handle instance failure due to task failure
   */
  private async handleInstanceFailure(instanceId: string, error: any) {
    await supabase
      .from('journey_instances')
      .update({
        state: 'failed',
        failed_at: new Date().toISOString(),
        last_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', instanceId);
  }

  /**
   * Clean up old completed tasks
   */
  private async cleanupCompletedTasks() {
    try {
      // Delete completed tasks older than 7 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const { error } = await supabase
        .from('journey_schedules')
        .delete()
        .in('status', ['completed', 'cancelled'])
        .lt('processed_at', cutoffDate.toISOString());

      if (error) {
        console.error('Error cleaning up completed tasks:', error);
      }
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  }

  /**
   * Schedule a new task
   */
  async scheduleTask(
    instanceId: string,
    nodeId: string,
    scheduledFor: Date,
    scheduleType: string = 'delay',
    metadata?: any,
  ): Promise<string> {
    const { data: schedule, error } = await supabase
      .from('journey_schedules')
      .insert({
        instance_id: instanceId,
        node_id: nodeId,
        scheduled_for: scheduledFor.toISOString(),
        schedule_type: scheduleType,
        status: 'pending',
        retry_count: 0,
        metadata,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to schedule task: ${error.message}`);
    }

    console.log(
      `Scheduled task ${schedule.id} for ${scheduledFor.toISOString()}`,
    );
    return schedule.id;
  }

  /**
   * Cancel a scheduled task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const { error } = await supabase
      .from('journey_schedules')
      .update({ status: 'cancelled' })
      .eq('id', taskId)
      .eq('status', 'pending');

    return !error;
  }

  /**
   * Cancel all tasks for an instance
   */
  async cancelInstanceTasks(instanceId: string): Promise<boolean> {
    const { error } = await supabase
      .from('journey_schedules')
      .update({ status: 'cancelled' })
      .eq('instance_id', instanceId)
      .eq('status', 'pending');

    return !error;
  }

  /**
   * Get scheduler statistics
   */
  async getSchedulerStats() {
    const { data: stats } = await supabase
      .from('journey_schedules')
      .select('status')
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ); // Last 24 hours

    const statusCounts =
      stats?.reduce(
        (acc, s) => {
          acc[s.status] = (acc[s.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    return {
      ...statusCounts,
      isRunning: this.isRunning,
      processing: this.processing,
      config: this.config,
      lastProcessed: new Date().toISOString(),
    };
  }

  /**
   * Utility function to chunk array into batches
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Calculate next business day for scheduling
   */
  calculateNextBusinessDay(
    fromDate: Date,
    businessHours: any,
    timezone: string = this.config.timezone,
  ): Date {
    const date = new Date(fromDate);
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    // Find next business day
    while (true) {
      const dayOfWeek = date.getDay();
      const currentDay = dayNames[dayOfWeek];

      if (businessHours.days.includes(currentDay)) {
        // Set to start of business hours
        const [startHour, startMin] = businessHours.start
          .split(':')
          .map(Number);
        date.setHours(startHour, startMin, 0, 0);

        // If this is still in the future, we found our slot
        if (date > fromDate) {
          break;
        }
      }

      // Move to next day
      date.setDate(date.getDate() + 1);
      date.setHours(0, 0, 0, 0);
    }

    return date;
  }

  /**
   * Schedule task with business hours consideration
   */
  async scheduleTaskWithBusinessHours(
    instanceId: string,
    nodeId: string,
    delay: number, // milliseconds
    scheduleType: string = 'delay',
  ): Promise<string> {
    // Get journey settings
    const { data: instance } = await supabase
      .from('journey_instances')
      .select(
        `
        journey_id,
        journeys!inner(settings)
      `,
      )
      .eq('id', instanceId)
      .single();

    let scheduledFor = new Date(Date.now() + delay);

    if (instance) {
      const journeySettings = (instance as any).journeys.settings || {};
      const businessHours =
        journeySettings.businessHours || this.config.businessHours;

      if (businessHours.enabled) {
        const timezone = journeySettings.timezone || this.config.timezone;

        // If the scheduled time falls outside business hours, move to next business day
        if (
          !this.isWithinBusinessHours(scheduledFor, businessHours, timezone)
        ) {
          scheduledFor = this.calculateNextBusinessDay(
            scheduledFor,
            businessHours,
            timezone,
          );
        }
      }
    }

    return this.scheduleTask(instanceId, nodeId, scheduledFor, scheduleType);
  }
}

// Export singleton instance
export const journeyScheduler = new JourneyScheduler();
