/**
 * WS-142: Customer Success - Scheduling Service
 * Service for scheduling delayed and timed interventions
 */

import { z } from 'zod';

// Type definitions
export interface ScheduledTask {
  id: string;
  type: ScheduledTaskType;
  targetId: string; // ID of the item being scheduled (intervention, email, etc.)
  organizationId: string;
  scheduledAt: Date;
  status: ScheduledTaskStatus;
  priority: TaskPriority;
  payload: Record<string, any>;
  maxRetries: number;
  retryCount: number;
  lastAttemptAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata: TaskMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type ScheduledTaskType =
  | 'intervention_execution'
  | 'email_send'
  | 'milestone_check'
  | 'health_score_calculation'
  | 'risk_assessment'
  | 'user_engagement_check'
  | 'subscription_renewal_reminder'
  | 'onboarding_followup'
  | 'success_manager_task';

export type ScheduledTaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskMetadata {
  source: string;
  createdBy: string;
  tags: string[];
  retryPolicy: RetryPolicy;
  expiresAt?: Date;
  dependencies?: string[]; // Task IDs this task depends on
}

export interface RetryPolicy {
  strategy: 'linear' | 'exponential' | 'fixed';
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier?: number;
}

export interface ScheduleOptions {
  priority?: TaskPriority;
  maxRetries?: number;
  retryPolicy?: RetryPolicy;
  expiresAt?: Date;
  dependencies?: string[];
  tags?: string[];
}

export interface CronSchedule {
  id: string;
  name: string;
  cronExpression: string;
  taskType: ScheduledTaskType;
  isActive: boolean;
  organizationId?: string;
  payload: Record<string, any>;
  lastRunAt?: Date;
  nextRunAt: Date;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchedulingMetrics {
  totalTasks: number;
  pendingTasks: number;
  processingTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageProcessingTime: number;
  tasksByType: Record<ScheduledTaskType, number>;
  tasksByPriority: Record<TaskPriority, number>;
}

// Validation schemas
const scheduleOptionsSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  maxRetries: z.number().min(0).max(10).default(3),
  retryPolicy: z
    .object({
      strategy: z
        .enum(['linear', 'exponential', 'fixed'])
        .default('exponential'),
      baseDelayMs: z.number().min(1000).default(5000),
      maxDelayMs: z.number().min(1000).default(300000),
      backoffMultiplier: z.number().min(1).default(2),
    })
    .default({}),
  expiresAt: z.date().optional(),
  dependencies: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

const cronScheduleSchema = z.object({
  name: z.string().min(3).max(100),
  cronExpression: z.string(),
  taskType: z.enum([
    'intervention_execution',
    'email_send',
    'milestone_check',
    'health_score_calculation',
    'risk_assessment',
    'user_engagement_check',
    'subscription_renewal_reminder',
    'onboarding_followup',
    'success_manager_task',
  ]),
  isActive: z.boolean().default(true),
  organizationId: z.string().uuid().optional(),
  payload: z.record(z.any()).default({}),
  timezone: z.string().default('UTC'),
});

class SchedulingService {
  private tasks = new Map<string, ScheduledTask>();
  private cronJobs = new Map<string, CronSchedule>();
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;
  private metrics: SchedulingMetrics = {
    totalTasks: 0,
    pendingTasks: 0,
    processingTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageProcessingTime: 0,
    tasksByType: {} as Record<ScheduledTaskType, number>,
    tasksByPriority: {} as Record<TaskPriority, number>,
  };

  constructor() {
    // Start processing scheduled tasks
    this.startTaskProcessor();

    // Start cron job processor
    this.startCronProcessor();
  }

  /**
   * Schedule a delayed task
   */
  async scheduleDelayed(
    targetId: string,
    delaySeconds: number,
    type: ScheduledTaskType = 'intervention_execution',
    payload: Record<string, any> = {},
    options: ScheduleOptions = {},
  ): Promise<ScheduledTask> {
    const scheduledAt = new Date(Date.now() + delaySeconds * 1000);

    return this.scheduleAt(
      targetId,
      scheduledAt.toISOString(),
      type,
      payload,
      options,
    );
  }

  /**
   * Schedule a task at specific time
   */
  async scheduleAt(
    targetId: string,
    scheduledTime: string, // ISO timestamp or cron expression
    type: ScheduledTaskType = 'intervention_execution',
    payload: Record<string, any> = {},
    options: ScheduleOptions = {},
  ): Promise<ScheduledTask> {
    const validatedOptions = scheduleOptionsSchema.parse(options);

    let scheduledAt: Date;

    // Parse scheduled time
    if (this.isCronExpression(scheduledTime)) {
      scheduledAt = this.getNextCronTime(scheduledTime);
    } else {
      scheduledAt = new Date(scheduledTime);
      if (isNaN(scheduledAt.getTime())) {
        throw new Error(`Invalid scheduled time: ${scheduledTime}`);
      }
    }

    const task: ScheduledTask = {
      id: crypto.randomUUID(),
      type,
      targetId,
      organizationId: payload.organizationId || 'default',
      scheduledAt,
      status: 'pending',
      priority: validatedOptions.priority,
      payload,
      maxRetries: validatedOptions.maxRetries,
      retryCount: 0,
      metadata: {
        source: 'scheduling_service',
        createdBy: 'system',
        tags: validatedOptions.tags,
        retryPolicy: validatedOptions.retryPolicy,
        expiresAt: validatedOptions.expiresAt,
        dependencies: validatedOptions.dependencies,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(task.id, task);
    this.updateMetrics();

    return task;
  }

  /**
   * Create a recurring cron schedule
   */
  async createCronSchedule(
    cronData: z.infer<typeof cronScheduleSchema>,
  ): Promise<CronSchedule> {
    const validatedData = cronScheduleSchema.parse(cronData);

    if (!this.isValidCronExpression(validatedData.cronExpression)) {
      throw new Error(
        `Invalid cron expression: ${validatedData.cronExpression}`,
      );
    }

    const schedule: CronSchedule = {
      id: crypto.randomUUID(),
      name: validatedData.name,
      cronExpression: validatedData.cronExpression,
      taskType: validatedData.taskType,
      isActive: validatedData.isActive,
      organizationId: validatedData.organizationId,
      payload: validatedData.payload,
      nextRunAt: this.getNextCronTime(
        validatedData.cronExpression,
        validatedData.timezone,
      ),
      timezone: validatedData.timezone,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.cronJobs.set(schedule.id, schedule);
    return schedule;
  }

  /**
   * Cancel a scheduled task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'pending') {
      task.status = 'cancelled';
      task.updatedAt = new Date();
      this.tasks.set(taskId, task);
      this.updateMetrics();
      return true;
    }

    return false;
  }

  /**
   * Reschedule a task
   */
  async rescheduleTask(
    taskId: string,
    newScheduledTime: string,
    options?: Partial<ScheduleOptions>,
  ): Promise<ScheduledTask | null> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return null;

    const scheduledAt = new Date(newScheduledTime);
    if (isNaN(scheduledAt.getTime())) {
      throw new Error(`Invalid scheduled time: ${newScheduledTime}`);
    }

    task.scheduledAt = scheduledAt;
    task.updatedAt = new Date();

    if (options) {
      if (options.priority) task.priority = options.priority;
      if (options.maxRetries !== undefined)
        task.maxRetries = options.maxRetries;
      if (options.tags) task.metadata.tags = options.tags;
    }

    this.tasks.set(taskId, task);
    return task;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): ScheduledTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get tasks by criteria
   */
  getTasks(
    criteria: {
      status?: ScheduledTaskStatus;
      type?: ScheduledTaskType;
      organizationId?: string;
      priority?: TaskPriority;
      limit?: number;
      offset?: number;
    } = {},
  ): ScheduledTask[] {
    let tasks = Array.from(this.tasks.values());

    // Apply filters
    if (criteria.status) {
      tasks = tasks.filter((task) => task.status === criteria.status);
    }
    if (criteria.type) {
      tasks = tasks.filter((task) => task.type === criteria.type);
    }
    if (criteria.organizationId) {
      tasks = tasks.filter(
        (task) => task.organizationId === criteria.organizationId,
      );
    }
    if (criteria.priority) {
      tasks = tasks.filter((task) => task.priority === criteria.priority);
    }

    // Sort by scheduled time
    tasks.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    // Apply pagination
    const offset = criteria.offset || 0;
    const limit = criteria.limit || 100;
    return tasks.slice(offset, offset + limit);
  }

  /**
   * Process pending tasks
   */
  private async processTasks(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      const readyTasks = Array.from(this.tasks.values())
        .filter(
          (task) =>
            task.status === 'pending' &&
            task.scheduledAt <= now &&
            (!task.metadata.expiresAt || task.metadata.expiresAt > now) &&
            this.areDependenciesMet(task),
        )
        .sort((a, b) => {
          // Process by priority, then by scheduled time
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const priorityDiff =
            priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.scheduledAt.getTime() - b.scheduledAt.getTime();
        });

      for (const task of readyTasks.slice(0, 10)) {
        // Process max 10 tasks per iteration
        await this.processTask(task.id);

        // Small delay between tasks
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single task
   */
  private async processTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') return;

    const startTime = Date.now();

    task.status = 'processing';
    task.lastAttemptAt = new Date();
    task.updatedAt = new Date();
    this.tasks.set(taskId, task);

    try {
      // Execute task based on type
      await this.executeTask(task);

      // Mark as completed
      task.status = 'completed';
      task.completedAt = new Date();
      task.updatedAt = new Date();
    } catch (error) {
      console.error(`Task ${taskId} failed:`, error);

      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.retryCount++;

      if (task.retryCount < task.maxRetries) {
        // Schedule retry
        const retryDelay = this.calculateRetryDelay(task);
        task.scheduledAt = new Date(Date.now() + retryDelay);
        task.status = 'pending';
      } else {
        task.status = 'failed';
      }

      task.updatedAt = new Date();
    }

    this.tasks.set(taskId, task);
    this.updateProcessingTimeMetrics(Date.now() - startTime);
    this.updateMetrics();
  }

  /**
   * Execute task based on type
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    // This would typically delegate to appropriate services
    // For now, we'll just simulate task execution

    switch (task.type) {
      case 'intervention_execution':
        await this.executeIntervention(task);
        break;

      case 'email_send':
        await this.executeEmailSend(task);
        break;

      case 'milestone_check':
        await this.executeMilestoneCheck(task);
        break;

      case 'health_score_calculation':
        await this.executeHealthScoreCalculation(task);
        break;

      case 'risk_assessment':
        await this.executeRiskAssessment(task);
        break;

      case 'user_engagement_check':
        await this.executeUserEngagementCheck(task);
        break;

      case 'subscription_renewal_reminder':
        await this.executeSubscriptionRenewalReminder(task);
        break;

      case 'onboarding_followup':
        await this.executeOnboardingFollowup(task);
        break;

      case 'success_manager_task':
        await this.executeSuccessManagerTask(task);
        break;

      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  // Task execution methods (would integrate with actual services)
  private async executeIntervention(task: ScheduledTask): Promise<void> {
    console.log(`Executing intervention: ${task.targetId}`);
    // Would call interventionEngine.executeIntervention(task.targetId)
  }

  private async executeEmailSend(task: ScheduledTask): Promise<void> {
    console.log(`Sending email: ${task.targetId}`);
    // Would call emailAutomation.processEmailJob(task.targetId)
  }

  private async executeMilestoneCheck(task: ScheduledTask): Promise<void> {
    console.log(`Checking milestone: ${task.targetId}`);
    // Would call milestoneService.checkMilestone(task.targetId)
  }

  private async executeHealthScoreCalculation(
    task: ScheduledTask,
  ): Promise<void> {
    console.log(`Calculating health score for: ${task.targetId}`);
    // Would call customerHealthService.calculateHealthScore(task.targetId)
  }

  private async executeRiskAssessment(task: ScheduledTask): Promise<void> {
    console.log(`Performing risk assessment for: ${task.targetId}`);
    // Would call riskAssessmentService.assessUserRisk(task.targetId)
  }

  private async executeUserEngagementCheck(task: ScheduledTask): Promise<void> {
    console.log(`Checking user engagement: ${task.targetId}`);
    // Would call activityTracker.checkUserEngagement(task.targetId)
  }

  private async executeSubscriptionRenewalReminder(
    task: ScheduledTask,
  ): Promise<void> {
    console.log(`Sending subscription renewal reminder: ${task.targetId}`);
    // Would send renewal reminder email
  }

  private async executeOnboardingFollowup(task: ScheduledTask): Promise<void> {
    console.log(`Executing onboarding followup: ${task.targetId}`);
    // Would check onboarding progress and send appropriate followup
  }

  private async executeSuccessManagerTask(task: ScheduledTask): Promise<void> {
    console.log(`Creating success manager task: ${task.targetId}`);
    // Would create task in success manager system
  }

  /**
   * Check if task dependencies are met
   */
  private areDependenciesMet(task: ScheduledTask): boolean {
    if (
      !task.metadata.dependencies ||
      task.metadata.dependencies.length === 0
    ) {
      return true;
    }

    return task.metadata.dependencies.every((depId) => {
      const depTask = this.tasks.get(depId);
      return depTask && depTask.status === 'completed';
    });
  }

  /**
   * Calculate retry delay based on retry policy
   */
  private calculateRetryDelay(task: ScheduledTask): number {
    const policy = task.metadata.retryPolicy;
    let delay = policy.baseDelayMs;

    switch (policy.strategy) {
      case 'linear':
        delay = policy.baseDelayMs * task.retryCount;
        break;

      case 'exponential':
        delay =
          policy.baseDelayMs *
          Math.pow(policy.backoffMultiplier || 2, task.retryCount - 1);
        break;

      case 'fixed':
      default:
        delay = policy.baseDelayMs;
        break;
    }

    return Math.min(delay, policy.maxDelayMs);
  }

  /**
   * Process cron jobs
   */
  private async processCronJobs(): Promise<void> {
    const now = new Date();

    for (const [id, schedule] of this.cronJobs.entries()) {
      if (!schedule.isActive || schedule.nextRunAt > now) continue;

      try {
        // Create task for this cron job
        await this.scheduleAt(
          id,
          now.toISOString(),
          schedule.taskType,
          schedule.payload,
        );

        // Update next run time
        schedule.lastRunAt = now;
        schedule.nextRunAt = this.getNextCronTime(
          schedule.cronExpression,
          schedule.timezone,
        );
        schedule.updatedAt = new Date();

        this.cronJobs.set(id, schedule);
      } catch (error) {
        console.error(`Failed to process cron job ${id}:`, error);
      }
    }
  }

  /**
   * Start task processor
   */
  private startTaskProcessor(): void {
    // Process tasks every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processTasks();
    }, 30000);

    // Also process immediately
    setTimeout(() => this.processTasks(), 1000);
  }

  /**
   * Start cron processor
   */
  private startCronProcessor(): void {
    // Process cron jobs every minute
    setInterval(() => {
      this.processCronJobs();
    }, 60000);
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    const tasks = Array.from(this.tasks.values());

    this.metrics.totalTasks = tasks.length;
    this.metrics.pendingTasks = tasks.filter(
      (t) => t.status === 'pending',
    ).length;
    this.metrics.processingTasks = tasks.filter(
      (t) => t.status === 'processing',
    ).length;
    this.metrics.completedTasks = tasks.filter(
      (t) => t.status === 'completed',
    ).length;
    this.metrics.failedTasks = tasks.filter(
      (t) => t.status === 'failed',
    ).length;

    // Reset counters
    this.metrics.tasksByType = {} as Record<ScheduledTaskType, number>;
    this.metrics.tasksByPriority = {} as Record<TaskPriority, number>;

    // Count by type and priority
    for (const task of tasks) {
      this.metrics.tasksByType[task.type] =
        (this.metrics.tasksByType[task.type] || 0) + 1;
      this.metrics.tasksByPriority[task.priority] =
        (this.metrics.tasksByPriority[task.priority] || 0) + 1;
    }
  }

  /**
   * Update processing time metrics
   */
  private updateProcessingTimeMetrics(processingTime: number): void {
    const totalTime =
      this.metrics.averageProcessingTime * (this.metrics.completedTasks - 1);
    this.metrics.averageProcessingTime =
      (totalTime + processingTime) / this.metrics.completedTasks;
  }

  /**
   * Utility methods for cron expressions
   */
  private isCronExpression(time: string): boolean {
    // Simple check for cron format (5 or 6 parts separated by spaces)
    const parts = time.trim().split(/\s+/);
    return parts.length >= 5 && parts.length <= 6;
  }

  private isValidCronExpression(cron: string): boolean {
    // Basic cron validation - would use a proper cron library in production
    return this.isCronExpression(cron);
  }

  private getNextCronTime(
    cronExpression: string,
    timezone: string = 'UTC',
  ): Date {
    // This would use a proper cron library like 'cron-parser' in production
    // For now, return next hour as a placeholder
    return new Date(Date.now() + 60 * 60 * 1000);
  }

  /**
   * Get scheduling metrics
   */
  getMetrics(): SchedulingMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cron schedules
   */
  getCronSchedules(organizationId?: string): CronSchedule[] {
    return Array.from(this.cronJobs.values()).filter(
      (schedule) =>
        !organizationId || schedule.organizationId === organizationId,
    );
  }

  /**
   * Update cron schedule
   */
  async updateCronSchedule(
    scheduleId: string,
    updates: Partial<z.infer<typeof cronScheduleSchema>>,
  ): Promise<CronSchedule | null> {
    const existing = this.cronJobs.get(scheduleId);
    if (!existing) return null;

    const updated: CronSchedule = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    // Recalculate next run time if cron expression changed
    if (updates.cronExpression) {
      updated.nextRunAt = this.getNextCronTime(
        updates.cronExpression,
        updated.timezone,
      );
    }

    this.cronJobs.set(scheduleId, updated);
    return updated;
  }

  /**
   * Delete cron schedule
   */
  async deleteCronSchedule(scheduleId: string): Promise<boolean> {
    return this.cronJobs.delete(scheduleId);
  }

  /**
   * Cleanup completed and old tasks
   */
  cleanupOldTasks(daysToKeep: number = 30): number {
    const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [id, task] of this.tasks.entries()) {
      if (
        (task.status === 'completed' || task.status === 'failed') &&
        task.updatedAt < cutoffTime
      ) {
        this.tasks.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.updateMetrics();
    }

    return cleanedCount;
  }
}

// Export singleton instance
export const schedulingService = new SchedulingService();
