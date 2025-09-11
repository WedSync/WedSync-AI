/**
 * WS-158: Category-Based Workflow Automation Triggers
 * Handles automatic task creation, assignments, and state transitions based on category rules
 */

import { createClient } from '@/lib/supabase/client';
import { TaskCategory, WorkflowTask } from '@/types/workflow';
import { getCategorySyncService } from '@/lib/realtime/category-sync';
import { getCategoryWebSocketHandler } from '@/lib/websocket/category-handlers';

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  trigger_type: TriggerType;
  trigger_conditions: TriggerCondition[];
  actions: AutomationAction[];
  is_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
  execution_count: number;
  last_executed?: string;
  created_by: string;
}

export type TriggerType =
  | 'task_created'
  | 'task_completed'
  | 'task_overdue'
  | 'category_threshold'
  | 'time_based'
  | 'dependency_met'
  | 'user_action'
  | 'external_event'
  | 'milestone_reached'
  | 'phase_transition';

export interface TriggerCondition {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'greater_than'
    | 'less_than'
    | 'in'
    | 'not_in';
  value: any;
  data_type: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

export interface AutomationAction {
  type: ActionType;
  parameters: Record<string, any>;
  delay?: number; // Delay in seconds before executing
  retry_on_failure?: boolean;
  max_retries?: number;
}

export type ActionType =
  | 'create_task'
  | 'update_task'
  | 'assign_task'
  | 'move_to_category'
  | 'send_notification'
  | 'trigger_webhook'
  | 'update_priority'
  | 'add_comment'
  | 'create_subtasks'
  | 'escalate'
  | 'archive'
  | 'generate_report'
  | 'sync_calendar'
  | 'start_timer'
  | 'complete_phase';

export interface AutomationContext {
  rule: AutomationRule;
  trigger_event: TriggerEvent;
  task?: WorkflowTask;
  category?: TaskCategory;
  user_id: string;
  organization_id: string;
  metadata?: Record<string, any>;
}

export interface TriggerEvent {
  type: TriggerType;
  source: 'system' | 'user' | 'api' | 'webhook';
  timestamp: string;
  data: Record<string, any>;
}

export interface AutomationResult {
  rule_id: string;
  success: boolean;
  actions_executed: number;
  errors?: string[];
  execution_time: number;
  outputs?: Record<string, any>;
}

export class CategoryAutomationEngine {
  private supabase = createClient();
  private rules: Map<string, AutomationRule> = new Map();
  private activeExecutions: Map<string, Promise<AutomationResult>> = new Map();
  private organizationId: string;
  private userId: string;
  private wsHandler?: ReturnType<typeof getCategoryWebSocketHandler>;
  private syncService?: ReturnType<typeof getCategorySyncService>;
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private eventListeners: Map<TriggerType, Set<Function>> = new Map();
  private performanceMetrics = {
    total_executions: 0,
    successful_executions: 0,
    failed_executions: 0,
    average_execution_time: 0,
  };

  constructor(organizationId: string, userId: string) {
    this.organizationId = organizationId;
    this.userId = userId;
    this.initializeEngine();
  }

  /**
   * Initialize automation engine
   */
  private async initializeEngine(): Promise<void> {
    try {
      // Load automation rules
      await this.loadAutomationRules();

      // Set up event listeners
      this.setupEventListeners();

      // Initialize scheduled jobs
      this.initializeScheduledJobs();

      // Connect to WebSocket for real-time triggers
      this.wsHandler = getCategoryWebSocketHandler(
        this.organizationId,
        this.userId,
      );
      await this.wsHandler.connect();

      // Initialize sync service for cross-platform automation
      this.syncService = getCategorySyncService({
        organizationId: this.organizationId,
        userId: this.userId,
        onCategoryUpdate: this.handleCategoryUpdate.bind(this),
        onTaskCategoryChange: this.handleTaskCategoryChange.bind(this),
      });
      await this.syncService.initialize();

      console.log('Category automation engine initialized');
    } catch (error) {
      console.error('Failed to initialize automation engine:', error);
      throw error;
    }
  }

  /**
   * Load automation rules from database
   */
  private async loadAutomationRules(): Promise<void> {
    const { data: rules, error } = await this.supabase
      .from('automation_rules')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to load automation rules:', error);
      return;
    }

    // Store rules in memory for fast access
    rules?.forEach((rule) => {
      this.rules.set(rule.id, rule);
    });

    console.log(`Loaded ${rules?.length || 0} active automation rules`);
  }

  /**
   * Set up event listeners for triggers
   */
  private setupEventListeners(): void {
    // Task lifecycle events
    this.addEventListener('task_created', this.onTaskCreated.bind(this));
    this.addEventListener('task_completed', this.onTaskCompleted.bind(this));
    this.addEventListener('task_overdue', this.onTaskOverdue.bind(this));

    // Category events
    this.addEventListener(
      'category_threshold',
      this.onCategoryThreshold.bind(this),
    );

    // Phase and milestone events
    this.addEventListener(
      'milestone_reached',
      this.onMilestoneReached.bind(this),
    );
    this.addEventListener(
      'phase_transition',
      this.onPhaseTransition.bind(this),
    );

    // External events
    this.addEventListener('external_event', this.onExternalEvent.bind(this));
  }

  /**
   * Initialize scheduled jobs for time-based triggers
   */
  private initializeScheduledJobs(): void {
    // Check for overdue tasks every 5 minutes
    const overdueCheck = setInterval(
      () => {
        this.checkOverdueTasks();
      },
      5 * 60 * 1000,
    );
    this.scheduledJobs.set('overdue_check', overdueCheck);

    // Check time-based triggers every minute
    const timeBasedCheck = setInterval(() => {
      this.processTimeBasedTriggers();
    }, 60 * 1000);
    this.scheduledJobs.set('time_based_check', timeBasedCheck);

    // Category threshold checks every 10 minutes
    const thresholdCheck = setInterval(
      () => {
        this.checkCategoryThresholds();
      },
      10 * 60 * 1000,
    );
    this.scheduledJobs.set('threshold_check', thresholdCheck);
  }

  /**
   * Process trigger event
   */
  async processTrigger(event: TriggerEvent): Promise<AutomationResult[]> {
    const results: AutomationResult[] = [];
    const startTime = performance.now();

    try {
      // Find matching rules
      const matchingRules = this.findMatchingRules(event);

      // Execute rules in parallel
      const executionPromises = matchingRules.map((rule) =>
        this.executeRule(rule, event),
      );

      const ruleResults = await Promise.allSettled(executionPromises);

      // Process results
      ruleResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            rule_id: matchingRules[index].id,
            success: false,
            actions_executed: 0,
            errors: [result.reason?.toString() || 'Unknown error'],
            execution_time: performance.now() - startTime,
          });
        }
      });

      // Update metrics
      this.updatePerformanceMetrics(results, performance.now() - startTime);

      return results;
    } catch (error) {
      console.error('Error processing trigger:', error);
      return results;
    }
  }

  /**
   * Find rules matching the trigger event
   */
  private findMatchingRules(event: TriggerEvent): AutomationRule[] {
    const matchingRules: AutomationRule[] = [];

    for (const [ruleId, rule] of this.rules) {
      if (
        rule.trigger_type === event.type &&
        this.evaluateConditions(rule, event)
      ) {
        matchingRules.push(rule);
      }
    }

    return matchingRules;
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateConditions(
    rule: AutomationRule,
    event: TriggerEvent,
  ): boolean {
    if (!rule.trigger_conditions || rule.trigger_conditions.length === 0) {
      return true; // No conditions means always match
    }

    return rule.trigger_conditions.every((condition) =>
      this.evaluateCondition(condition, event.data),
    );
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(
    condition: TriggerCondition,
    data: Record<string, any>,
  ): boolean {
    const fieldValue = this.getNestedValue(data, condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'contains':
        return String(fieldValue).includes(String(conditionValue));
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      case 'in':
        return (
          Array.isArray(conditionValue) && conditionValue.includes(fieldValue)
        );
      case 'not_in':
        return (
          Array.isArray(conditionValue) && !conditionValue.includes(fieldValue)
        );
      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Execute automation rule
   */
  private async executeRule(
    rule: AutomationRule,
    event: TriggerEvent,
  ): Promise<AutomationResult> {
    const executionId = crypto.randomUUID();
    const startTime = performance.now();

    // Check if rule is already executing (prevent loops)
    if (this.activeExecutions.has(rule.id)) {
      return {
        rule_id: rule.id,
        success: false,
        actions_executed: 0,
        errors: ['Rule already executing'],
        execution_time: 0,
      };
    }

    const executionPromise = this.executeRuleActions(rule, event);
    this.activeExecutions.set(rule.id, executionPromise);

    try {
      const result = await executionPromise;

      // Update rule execution stats
      await this.updateRuleStats(rule.id);

      // Log execution
      await this.logExecution(executionId, rule, event, result);

      return {
        ...result,
        execution_time: performance.now() - startTime,
      };
    } finally {
      this.activeExecutions.delete(rule.id);
    }
  }

  /**
   * Execute rule actions
   */
  private async executeRuleActions(
    rule: AutomationRule,
    event: TriggerEvent,
  ): Promise<AutomationResult> {
    const result: AutomationResult = {
      rule_id: rule.id,
      success: true,
      actions_executed: 0,
      errors: [],
      execution_time: 0,
      outputs: {},
    };

    const context: AutomationContext = {
      rule,
      trigger_event: event,
      user_id: this.userId,
      organization_id: this.organizationId,
      metadata: event.data,
    };

    // Execute actions sequentially
    for (const action of rule.actions) {
      try {
        // Apply delay if specified
        if (action.delay) {
          await new Promise((resolve) =>
            setTimeout(resolve, action.delay * 1000),
          );
        }

        // Execute action
        const actionResult = await this.executeAction(action, context);

        if (actionResult.success) {
          result.actions_executed++;
          result.outputs![action.type] = actionResult.output;
        } else {
          result.errors?.push(
            `Action ${action.type} failed: ${actionResult.error}`,
          );

          // Stop execution if action is critical (no retry)
          if (!action.retry_on_failure) {
            result.success = false;
            break;
          }
        }
      } catch (error) {
        result.errors?.push(`Action ${action.type} error: ${error}`);
        result.success = false;

        if (!action.retry_on_failure) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Execute single action
   */
  private async executeAction(
    action: AutomationAction,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      switch (action.type) {
        case 'create_task':
          return await this.actionCreateTask(action.parameters, context);

        case 'update_task':
          return await this.actionUpdateTask(action.parameters, context);

        case 'assign_task':
          return await this.actionAssignTask(action.parameters, context);

        case 'move_to_category':
          return await this.actionMoveToCategory(action.parameters, context);

        case 'send_notification':
          return await this.actionSendNotification(action.parameters, context);

        case 'trigger_webhook':
          return await this.actionTriggerWebhook(action.parameters, context);

        case 'update_priority':
          return await this.actionUpdatePriority(action.parameters, context);

        case 'add_comment':
          return await this.actionAddComment(action.parameters, context);

        case 'create_subtasks':
          return await this.actionCreateSubtasks(action.parameters, context);

        case 'escalate':
          return await this.actionEscalate(action.parameters, context);

        case 'archive':
          return await this.actionArchive(action.parameters, context);

        case 'generate_report':
          return await this.actionGenerateReport(action.parameters, context);

        case 'sync_calendar':
          return await this.actionSyncCalendar(action.parameters, context);

        case 'start_timer':
          return await this.actionStartTimer(action.parameters, context);

        case 'complete_phase':
          return await this.actionCompletePhase(action.parameters, context);

        default:
          return {
            success: false,
            error: `Unknown action type: ${action.type}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error?.toString() || 'Action execution failed',
      };
    }
  }

  /**
   * Action: Create Task
   */
  private async actionCreateTask(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const taskData = {
        title: this.interpolateTemplate(parameters.title, context),
        description: this.interpolateTemplate(parameters.description, context),
        category_id: parameters.category_id || context.category?.id,
        priority: parameters.priority || 'medium',
        due_date: this.calculateDueDate(parameters.due_date_offset),
        assigned_to: parameters.assigned_to,
        organization_id: this.organizationId,
        created_by: this.userId,
        tags: parameters.tags || [],
        status: 'todo',
      };

      const { data: task, error } = await this.supabase
        .from('workflow_tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;

      // Broadcast task creation
      this.wsHandler?.sendMessage({
        type: 'task:category_changed',
        payload: { task, action: 'created' },
      });

      return { success: true, output: task };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Update Task
   */
  private async actionUpdateTask(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const updates: any = {};

      if (parameters.status) updates.status = parameters.status;
      if (parameters.priority) updates.priority = parameters.priority;
      if (parameters.title)
        updates.title = this.interpolateTemplate(parameters.title, context);
      if (parameters.description)
        updates.description = this.interpolateTemplate(
          parameters.description,
          context,
        );

      const { data: task, error } = await this.supabase
        .from('workflow_tasks')
        .update(updates)
        .eq('id', context.task?.id || parameters.task_id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, output: task };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Assign Task
   */
  private async actionAssignTask(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const assignee = await this.determineAssignee(parameters, context);

      const { data: task, error } = await this.supabase
        .from('workflow_tasks')
        .update({
          assigned_to: assignee.user_id,
          assigned_to_email: assignee.email,
        })
        .eq('id', context.task?.id || parameters.task_id)
        .select()
        .single();

      if (error) throw error;

      // Send assignment notification
      await this.sendAssignmentNotification(assignee, task);

      return { success: true, output: task };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Move to Category
   */
  private async actionMoveToCategory(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const { data: task, error } = await this.supabase
        .from('workflow_tasks')
        .update({ category_id: parameters.category_id })
        .eq('id', context.task?.id || parameters.task_id)
        .select()
        .single();

      if (error) throw error;

      // Broadcast category change
      this.wsHandler?.sendMessage({
        type: 'task:category_changed',
        payload: {
          taskId: task.id,
          oldCategoryId: context.task?.category_id,
          newCategoryId: parameters.category_id,
        },
      });

      return { success: true, output: task };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Send Notification
   */
  private async actionSendNotification(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const notification = {
        type: parameters.type || 'info',
        title: this.interpolateTemplate(parameters.title, context),
        message: this.interpolateTemplate(parameters.message, context),
        channels: parameters.channels || ['web'],
        priority: parameters.priority || 'medium',
        category_id: context.category?.id,
      };

      // Send through WebSocket handler
      this.wsHandler?.sendMessage({
        type: 'notification:category_alert',
        payload: notification,
      });

      return { success: true, output: notification };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Trigger Webhook
   */
  private async actionTriggerWebhook(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const webhookData = {
        rule_id: context.rule.id,
        trigger_type: context.trigger_event.type,
        task: context.task,
        category: context.category,
        timestamp: new Date().toISOString(),
        ...parameters.data,
      };

      const response = await fetch(parameters.url, {
        method: parameters.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...parameters.headers,
        },
        body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      const result = await response.json();
      return { success: true, output: result };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Update Priority
   */
  private async actionUpdatePriority(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const newPriority = this.calculatePriority(parameters, context);

      const { data: task, error } = await this.supabase
        .from('workflow_tasks')
        .update({ priority: newPriority })
        .eq('id', context.task?.id || parameters.task_id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, output: task };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Add Comment
   */
  private async actionAddComment(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const comment = {
        task_id: context.task?.id || parameters.task_id,
        content: this.interpolateTemplate(parameters.content, context),
        author_id: this.userId,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('task_comments')
        .insert(comment)
        .select()
        .single();

      if (error) throw error;

      return { success: true, output: data };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Create Subtasks
   */
  private async actionCreateSubtasks(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const parentTaskId = context.task?.id || parameters.parent_task_id;
      const subtasks = [];

      for (const subtaskTemplate of parameters.subtasks) {
        const subtask = {
          title: this.interpolateTemplate(subtaskTemplate.title, context),
          description: this.interpolateTemplate(
            subtaskTemplate.description,
            context,
          ),
          category_id: context.category?.id,
          parent_task_id: parentTaskId,
          priority: subtaskTemplate.priority || 'medium',
          due_date: this.calculateDueDate(subtaskTemplate.due_date_offset),
          organization_id: this.organizationId,
          created_by: this.userId,
          status: 'todo',
        };

        subtasks.push(subtask);
      }

      const { data, error } = await this.supabase
        .from('workflow_tasks')
        .insert(subtasks)
        .select();

      if (error) throw error;

      return { success: true, output: data };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Escalate
   */
  private async actionEscalate(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      // Find escalation target (manager, supervisor, etc.)
      const escalationTarget = await this.findEscalationTarget(
        parameters,
        context,
      );

      // Update task with escalation
      const { data: task, error } = await this.supabase
        .from('workflow_tasks')
        .update({
          assigned_to: escalationTarget.user_id,
          priority: 'urgent',
          escalated: true,
          escalated_at: new Date().toISOString(),
        })
        .eq('id', context.task?.id || parameters.task_id)
        .select()
        .single();

      if (error) throw error;

      // Send escalation notification
      await this.sendEscalationNotification(
        escalationTarget,
        task,
        parameters.reason,
      );

      return { success: true, output: task };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Archive
   */
  private async actionArchive(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const { data: task, error } = await this.supabase
        .from('workflow_tasks')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_by: this.userId,
        })
        .eq('id', context.task?.id || parameters.task_id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, output: task };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Generate Report
   */
  private async actionGenerateReport(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const reportData = await this.gatherReportData(parameters, context);

      const report = {
        type: parameters.report_type,
        category_id: context.category?.id,
        data: reportData,
        generated_at: new Date().toISOString(),
        generated_by: this.userId,
      };

      // Store report
      const { data, error } = await this.supabase
        .from('automation_reports')
        .insert(report)
        .select()
        .single();

      if (error) throw error;

      // Send report if recipients specified
      if (parameters.recipients) {
        await this.sendReport(data, parameters.recipients);
      }

      return { success: true, output: data };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Sync Calendar
   */
  private async actionSyncCalendar(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      // Trigger calendar sync through integration service
      const syncResult = {
        provider: parameters.provider || 'google',
        category_id: context.category?.id,
        tasks_synced: 0,
        timestamp: new Date().toISOString(),
      };

      // Send sync request to integration service
      this.wsHandler?.sendMessage({
        type: 'sync:request',
        payload: {
          category_id: context.category?.id,
          provider: parameters.provider,
        },
      });

      return { success: true, output: syncResult };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Start Timer
   */
  private async actionStartTimer(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      const timer = {
        task_id: context.task?.id || parameters.task_id,
        user_id: this.userId,
        started_at: new Date().toISOString(),
        duration: parameters.duration || null,
      };

      const { data, error } = await this.supabase
        .from('task_timers')
        .insert(timer)
        .select()
        .single();

      if (error) throw error;

      // Update task status to in_progress
      await this.supabase
        .from('workflow_tasks')
        .update({ status: 'in_progress' })
        .eq('id', timer.task_id);

      return { success: true, output: data };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Action: Complete Phase
   */
  private async actionCompletePhase(
    parameters: Record<string, any>,
    context: AutomationContext,
  ): Promise<{ success: boolean; output?: any; error?: string }> {
    try {
      // Mark all tasks in phase as completed
      const { data: tasks, error } = await this.supabase
        .from('workflow_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('category_id', context.category?.id)
        .eq('phase', parameters.phase)
        .select();

      if (error) throw error;

      // Trigger next phase if specified
      if (parameters.next_phase) {
        await this.initiatePhase(parameters.next_phase, context);
      }

      return { success: true, output: { tasks_completed: tasks.length } };
    } catch (error) {
      return { success: false, error: error?.toString() };
    }
  }

  /**
   * Event handlers
   */
  private async onTaskCreated(event: TriggerEvent): Promise<void> {
    await this.processTrigger(event);
  }

  private async onTaskCompleted(event: TriggerEvent): Promise<void> {
    await this.processTrigger(event);
  }

  private async onTaskOverdue(event: TriggerEvent): Promise<void> {
    await this.processTrigger(event);
  }

  private async onCategoryThreshold(event: TriggerEvent): Promise<void> {
    await this.processTrigger(event);
  }

  private async onMilestoneReached(event: TriggerEvent): Promise<void> {
    await this.processTrigger(event);
  }

  private async onPhaseTransition(event: TriggerEvent): Promise<void> {
    await this.processTrigger(event);
  }

  private async onExternalEvent(event: TriggerEvent): Promise<void> {
    await this.processTrigger(event);
  }

  /**
   * Check for overdue tasks
   */
  private async checkOverdueTasks(): Promise<void> {
    const { data: overdueTasks } = await this.supabase
      .from('workflow_tasks')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('status', 'todo')
      .lt('due_date', new Date().toISOString());

    if (overdueTasks) {
      for (const task of overdueTasks) {
        const event: TriggerEvent = {
          type: 'task_overdue',
          source: 'system',
          timestamp: new Date().toISOString(),
          data: { task },
        };

        await this.processTrigger(event);
      }
    }
  }

  /**
   * Process time-based triggers
   */
  private async processTimeBasedTriggers(): Promise<void> {
    const now = new Date();
    const timeBasedRules = Array.from(this.rules.values()).filter(
      (rule) => rule.trigger_type === 'time_based',
    );

    for (const rule of timeBasedRules) {
      if (this.shouldExecuteTimeBasedRule(rule, now)) {
        const event: TriggerEvent = {
          type: 'time_based',
          source: 'system',
          timestamp: now.toISOString(),
          data: { rule_id: rule.id, time: now },
        };

        await this.processTrigger(event);
      }
    }
  }

  /**
   * Check category thresholds
   */
  private async checkCategoryThresholds(): Promise<void> {
    const { data: categoryStats } = await this.supabase.rpc(
      'calculate_category_stats',
      {
        org_id: this.organizationId,
      },
    );

    if (categoryStats) {
      for (const stat of categoryStats) {
        // Check various thresholds
        if (stat.completion_rate >= 90) {
          const event: TriggerEvent = {
            type: 'category_threshold',
            source: 'system',
            timestamp: new Date().toISOString(),
            data: {
              category_id: stat.category_id,
              threshold_type: 'high_completion',
              value: stat.completion_rate,
            },
          };

          await this.processTrigger(event);
        }

        if (stat.pending_tasks > 20) {
          const event: TriggerEvent = {
            type: 'category_threshold',
            source: 'system',
            timestamp: new Date().toISOString(),
            data: {
              category_id: stat.category_id,
              threshold_type: 'high_pending',
              value: stat.pending_tasks,
            },
          };

          await this.processTrigger(event);
        }
      }
    }
  }

  /**
   * Helper methods
   */
  private interpolateTemplate(
    template: string,
    context: AutomationContext,
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return (
        context.metadata?.[key] ||
        context.task?.[key] ||
        context.category?.[key] ||
        match
      );
    });
  }

  private calculateDueDate(offset?: any): string {
    if (!offset) return new Date().toISOString();

    const date = new Date();
    if (offset.days) date.setDate(date.getDate() + offset.days);
    if (offset.hours) date.setHours(date.getHours() + offset.hours);

    return date.toISOString();
  }

  private async determineAssignee(
    parameters: any,
    context: AutomationContext,
  ): Promise<any> {
    // Logic to determine assignee based on rules
    // Could be round-robin, load-based, skill-based, etc.
    return { user_id: parameters.user_id, email: parameters.email };
  }

  private calculatePriority(
    parameters: any,
    context: AutomationContext,
  ): string {
    // Logic to calculate priority based on various factors
    return parameters.priority || 'medium';
  }

  private async findEscalationTarget(
    parameters: any,
    context: AutomationContext,
  ): Promise<any> {
    // Logic to find escalation target
    return {
      user_id: parameters.escalate_to,
      email: parameters.escalate_email,
    };
  }

  private async gatherReportData(
    parameters: any,
    context: AutomationContext,
  ): Promise<any> {
    // Gather data for report generation
    return {};
  }

  private shouldExecuteTimeBasedRule(rule: AutomationRule, now: Date): boolean {
    // Check if rule should execute based on time conditions
    return false; // Implement actual logic
  }

  private async initiatePhase(
    phase: string,
    context: AutomationContext,
  ): Promise<void> {
    // Initiate next phase in workflow
  }

  private async sendAssignmentNotification(
    assignee: any,
    task: any,
  ): Promise<void> {
    // Send notification to assigned user
  }

  private async sendEscalationNotification(
    target: any,
    task: any,
    reason: string,
  ): Promise<void> {
    // Send escalation notification
  }

  private async sendReport(report: any, recipients: string[]): Promise<void> {
    // Send report to recipients
  }

  private async updateRuleStats(ruleId: string): Promise<void> {
    await this.supabase
      .from('automation_rules')
      .update({
        execution_count: this.rules.get(ruleId)!.execution_count + 1,
        last_executed: new Date().toISOString(),
      })
      .eq('id', ruleId);
  }

  private async logExecution(
    executionId: string,
    rule: AutomationRule,
    event: TriggerEvent,
    result: AutomationResult,
  ): Promise<void> {
    await this.supabase.from('automation_logs').insert({
      id: executionId,
      rule_id: rule.id,
      trigger_type: event.type,
      trigger_data: event.data,
      result,
      organization_id: this.organizationId,
      executed_by: this.userId,
      executed_at: new Date().toISOString(),
    });
  }

  private updatePerformanceMetrics(
    results: AutomationResult[],
    executionTime: number,
  ): void {
    this.performanceMetrics.total_executions += results.length;
    this.performanceMetrics.successful_executions += results.filter(
      (r) => r.success,
    ).length;
    this.performanceMetrics.failed_executions += results.filter(
      (r) => !r.success,
    ).length;

    const avgTime = this.performanceMetrics.average_execution_time;
    const totalExec = this.performanceMetrics.total_executions;
    this.performanceMetrics.average_execution_time =
      (avgTime * (totalExec - results.length) + executionTime) / totalExec;
  }

  private addEventListener(type: TriggerType, handler: Function): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(handler);
  }

  private handleCategoryUpdate(category: TaskCategory, action: string): void {
    // Handle category updates from sync service
  }

  private handleTaskCategoryChange(
    task: WorkflowTask,
    oldCategory?: string,
    newCategory?: string,
  ): void {
    // Handle task category changes from sync service
  }

  /**
   * Public methods
   */
  async addRule(rule: AutomationRule): Promise<void> {
    this.rules.set(rule.id, rule);

    // Save to database
    await this.supabase.from('automation_rules').insert(rule);
  }

  async updateRule(
    ruleId: string,
    updates: Partial<AutomationRule>,
  ): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    Object.assign(rule, updates);
    this.rules.set(ruleId, rule);

    // Update in database
    await this.supabase
      .from('automation_rules')
      .update(updates)
      .eq('id', ruleId);
  }

  async deleteRule(ruleId: string): Promise<void> {
    this.rules.delete(ruleId);

    // Delete from database
    await this.supabase.from('automation_rules').delete().eq('id', ruleId);
  }

  getPerformanceMetrics() {
    return this.performanceMetrics;
  }

  async cleanup(): Promise<void> {
    // Clear scheduled jobs
    this.scheduledJobs.forEach((job) => clearInterval(job));
    this.scheduledJobs.clear();

    // Disconnect services
    if (this.wsHandler) {
      this.wsHandler.disconnect();
    }

    if (this.syncService) {
      await this.syncService.cleanup();
    }

    // Clear state
    this.rules.clear();
    this.activeExecutions.clear();
    this.eventListeners.clear();
  }
}

// Export singleton factory
let automationEngineInstance: CategoryAutomationEngine | null = null;

export function getCategoryAutomationEngine(
  organizationId: string,
  userId: string,
): CategoryAutomationEngine {
  if (!automationEngineInstance) {
    automationEngineInstance = new CategoryAutomationEngine(
      organizationId,
      userId,
    );
  }
  return automationEngineInstance;
}
