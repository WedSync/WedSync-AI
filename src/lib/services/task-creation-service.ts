import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import {
  WorkflowTask,
  TaskCategory,
  TaskPriority,
  TaskStatus,
} from '@/types/workflow';
import { TaskDependencyService } from './task-dependency-service';
import { TaskTemplateService } from './task-template-service';
import { TaskAnalyticsService } from './task-analytics-service';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface CreateTaskRequest {
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  deadline?: Date;
  assigned_to?: string;
  vendor_id?: string;
  estimated_duration?: number; // in hours
  buffer_time?: number; // in hours
  dependencies?: string[];
  notes?: string;
}

export interface BulkTaskCreationRequest {
  template_ids?: string[];
  individual_tasks?: CreateTaskRequest[];
  customizations?: Record<string, Partial<WorkflowTask>>;
  wedding_date: string;
  force_create?: boolean;
}

export interface TimingConflict {
  id: string;
  type:
    | 'vendor_double_booking'
    | 'dependency_violation'
    | 'timeline_overlap'
    | 'resource_conflict';
  task_ids: string[];
  conflict_date: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestions: ConflictResolution[];
}

export interface ConflictResolution {
  type: 'reschedule' | 'reassign' | 'adjust_duration' | 'remove_dependency';
  description: string;
  impact: string;
  suggested_changes: Record<string, any>;
}

export interface TaskCreationResult {
  success: boolean;
  task?: WorkflowTask;
  conflicts?: TimingConflict[];
  suggestions?: ConflictResolution[];
  warnings?: string[];
}

export interface BulkTaskCreationResult {
  success: boolean;
  created_tasks?: WorkflowTask[];
  conflicts?: TimingConflict[];
  affected_tasks?: WorkflowTask[];
  template_usage?: string[];
  skipped_tasks?: { task: CreateTaskRequest; reason: string }[];
}

export interface TimingValidationResult {
  valid: boolean;
  conflicts: TimingConflict[];
  suggestions: ConflictResolution[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Enhanced Task Creation Service - WS-156 Core Implementation
 * Extends existing workflow system with advanced task creation capabilities
 * Integrates with existing TaskDependencyService and TaskAnalyticsService
 */
export class TaskCreationService {
  constructor(
    private client = supabase,
    private dependencyService = new TaskDependencyService(),
    private templateService = new TaskTemplateService(),
    private analyticsService = new TaskAnalyticsService(),
  ) {}

  /**
   * Create a single task with comprehensive validation and conflict detection
   * Compatible with existing WorkflowTask structure
   */
  async createSingleTask(
    wedding_id: string,
    task_data: CreateTaskRequest,
    user_id: string,
  ): Promise<TaskCreationResult> {
    try {
      // Validate wedding exists and user has access
      const wedding_access = await this.validateWeddingAccess(
        wedding_id,
        user_id,
      );
      if (!wedding_access.valid) {
        return {
          success: false,
          conflicts: [],
          suggestions: [],
          warnings: [wedding_access.message],
        };
      }

      // Convert CreateTaskRequest to WorkflowTask format
      const workflow_task: Omit<
        WorkflowTask,
        'id' | 'created_at' | 'updated_at'
      > = {
        title: task_data.title,
        description: task_data.description || '',
        wedding_id,
        category: task_data.category,
        priority: task_data.priority,
        status: TaskStatus.TODO,
        assigned_to: task_data.assigned_to || null,
        assigned_by: user_id,
        created_by: user_id,
        estimated_duration: task_data.estimated_duration || 0,
        buffer_time: task_data.buffer_time || 0,
        deadline: task_data.deadline || new Date(),
        start_date: null,
        completion_date: null,
        progress_percentage: 0,
        is_critical_path: false,
        notes: task_data.notes || '',
        attachments: [],
      };

      // Validate timing conflicts before creation
      const timing_validation = await this.validateTaskTiming(
        wedding_id,
        workflow_task,
      );

      if (
        !timing_validation.valid &&
        timing_validation.risk_level === 'critical'
      ) {
        return {
          success: false,
          conflicts: timing_validation.conflicts,
          suggestions: timing_validation.suggestions,
          warnings: ['Critical timing conflicts detected. Cannot create task.'],
        };
      }

      // Create the task
      const { data: created_task, error } = await this.client
        .from('workflow_tasks')
        .insert(workflow_task)
        .select(
          `
          *,
          assigned_user:assigned_to(id, name, email)
        `,
        )
        .single();

      if (error) {
        console.error('Failed to create task:', error);
        throw new Error(`Failed to create task: ${error.message}`);
      }

      // Create task dependencies if specified
      if (task_data.dependencies && task_data.dependencies.length > 0) {
        await this.createTaskDependencies(
          created_task.id,
          task_data.dependencies,
        );
      }

      // Update analytics
      await this.analyticsService.recordTaskCreation(wedding_id, created_task);

      // Determine if task is on critical path
      await this.updateCriticalPath(wedding_id);

      return {
        success: true,
        task: created_task,
        conflicts: timing_validation.conflicts,
        suggestions: timing_validation.suggestions,
        warnings:
          timing_validation.conflicts.length > 0
            ? ['Task created with timing conflicts - review recommended']
            : [],
      };
    } catch (error) {
      console.error('Task creation error:', error);
      return {
        success: false,
        conflicts: [],
        suggestions: [],
        warnings: [`Task creation failed: ${error.message}`],
      };
    }
  }

  /**
   * Create multiple tasks with advanced conflict detection
   * Supports both template-based and individual task creation
   */
  async createBulkTasks(
    wedding_id: string,
    request: BulkTaskCreationRequest,
    user_id: string,
  ): Promise<BulkTaskCreationResult> {
    try {
      const created_tasks: WorkflowTask[] = [];
      const skipped_tasks: { task: CreateTaskRequest; reason: string }[] = [];
      const template_usage: string[] = [];

      // Validate wedding access
      const wedding_access = await this.validateWeddingAccess(
        wedding_id,
        user_id,
      );
      if (!wedding_access.valid) {
        return {
          success: false,
          conflicts: [],
          affected_tasks: [],
          template_usage: [],
          skipped_tasks: [
            { task: {} as CreateTaskRequest, reason: wedding_access.message },
          ],
        };
      }

      // Generate tasks from templates
      if (request.template_ids && request.template_ids.length > 0) {
        const template_tasks =
          await this.templateService.generateBulkTasksFromTemplates(
            wedding_id,
            request.template_ids,
            request.wedding_date,
            request.customizations || {},
            user_id,
          );

        created_tasks.push(...template_tasks);
        template_usage.push(...request.template_ids);
      }

      // Create individual tasks
      if (request.individual_tasks && request.individual_tasks.length > 0) {
        for (const task_data of request.individual_tasks) {
          const result = await this.createSingleTask(
            wedding_id,
            task_data,
            user_id,
          );

          if (result.success && result.task) {
            created_tasks.push(result.task);
          } else {
            skipped_tasks.push({
              task: task_data,
              reason: result.warnings?.join(', ') || 'Unknown error',
            });
          }
        }
      }

      // Comprehensive conflict detection for all created tasks
      const all_conflicts = await this.detectAllConflicts(
        wedding_id,
        created_tasks,
      );

      // If critical conflicts exist and force_create is false, rollback
      const critical_conflicts = all_conflicts.filter(
        (c) => c.severity === 'critical',
      );
      if (critical_conflicts.length > 0 && !request.force_create) {
        // Rollback created tasks
        await this.rollbackTasks(created_tasks.map((t) => t.id));

        return {
          success: false,
          conflicts: all_conflicts,
          affected_tasks: created_tasks,
          template_usage: [],
          skipped_tasks: [],
        };
      }

      // Update critical path for the entire wedding
      await this.updateCriticalPath(wedding_id);

      // Update analytics for bulk creation
      await this.analyticsService.recordBulkTaskCreation(
        wedding_id,
        created_tasks,
        template_usage,
      );

      return {
        success: true,
        created_tasks,
        conflicts: all_conflicts,
        affected_tasks: [],
        template_usage,
        skipped_tasks,
      };
    } catch (error) {
      console.error('Bulk task creation error:', error);
      return {
        success: false,
        conflicts: [],
        affected_tasks: [],
        template_usage: [],
        skipped_tasks: [
          {
            task: {} as CreateTaskRequest,
            reason: `Bulk creation failed: ${error.message}`,
          },
        ],
      };
    }
  }

  /**
   * Validate task timing against existing tasks and dependencies
   * Enhanced version of existing dependency validation
   */
  async validateTaskTiming(
    wedding_id: string,
    task: Partial<WorkflowTask>,
    exclude_task_id?: string,
  ): Promise<TimingValidationResult> {
    const conflicts: TimingConflict[] = [];
    const suggestions: ConflictResolution[] = [];

    try {
      // Get all existing tasks for the wedding
      const { data: existing_tasks } = await this.client
        .from('workflow_tasks')
        .select(
          `
          id, title, deadline, estimated_duration, assigned_to, 
          category, vendor_id, status, buffer_time
        `,
        )
        .eq('wedding_id', wedding_id)
        .neq('status', TaskStatus.COMPLETED)
        .neq('status', TaskStatus.CANCELLED);

      if (!existing_tasks) {
        return {
          valid: true,
          conflicts: [],
          suggestions: [],
          risk_level: 'low',
        };
      }

      const filtered_tasks = exclude_task_id
        ? existing_tasks.filter((t) => t.id !== exclude_task_id)
        : existing_tasks;

      // Check for vendor double booking
      if (task.assigned_to && task.deadline) {
        const vendor_conflicts = this.detectVendorConflicts(
          task as WorkflowTask,
          filtered_tasks,
        );
        conflicts.push(...vendor_conflicts);
      }

      // Check for timeline overlaps
      if (task.deadline && task.estimated_duration) {
        const timeline_conflicts = this.detectTimelineOverlaps(
          task as WorkflowTask,
          filtered_tasks,
        );
        conflicts.push(...timeline_conflicts);
      }

      // Check dependency violations using existing service
      if (task.id) {
        const dependency_conflicts =
          await this.dependencyService.validateDependencyChain(
            wedding_id,
            task.id,
          );

        // Convert to our conflict format
        conflicts.push(
          ...this.convertDependencyConflicts(dependency_conflicts),
        );
      }

      // Generate resolution suggestions
      for (const conflict of conflicts) {
        suggestions.push(...this.generateConflictResolutions(conflict, task));
      }

      // Determine risk level
      const risk_level = this.calculateRiskLevel(conflicts);

      return {
        valid: conflicts.filter((c) => c.severity === 'critical').length === 0,
        conflicts,
        suggestions,
        risk_level,
      };
    } catch (error) {
      console.error('Timing validation error:', error);
      return {
        valid: false,
        conflicts: [],
        suggestions: [],
        risk_level: 'critical',
      };
    }
  }

  /**
   * Detect all types of conflicts across multiple tasks
   */
  async detectAllConflicts(
    wedding_id: string,
    tasks: WorkflowTask[],
  ): Promise<TimingConflict[]> {
    const all_conflicts: TimingConflict[] = [];

    // Validate each task against all others and existing tasks
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const conflicts = await this.detectTaskPairConflicts(
          tasks[i],
          tasks[j],
        );
        all_conflicts.push(...conflicts);
      }

      // Validate against existing tasks
      const timing_result = await this.validateTaskTiming(wedding_id, tasks[i]);
      all_conflicts.push(...timing_result.conflicts);
    }

    // Remove duplicates
    return this.deduplicateConflicts(all_conflicts);
  }

  // Private helper methods

  private async validateWeddingAccess(
    wedding_id: string,
    user_id: string,
  ): Promise<{ valid: boolean; message: string }> {
    try {
      // Check if wedding exists and user has access
      const { data: wedding, error } = await this.client
        .from('weddings')
        .select('id, organization_id')
        .eq('id', wedding_id)
        .single();

      if (error || !wedding) {
        return { valid: false, message: 'Wedding not found or access denied' };
      }

      // Additional access validation would go here
      // For now, assume valid if wedding exists
      return { valid: true, message: '' };
    } catch (error) {
      return { valid: false, message: 'Failed to validate wedding access' };
    }
  }

  private detectVendorConflicts(
    task: WorkflowTask,
    existing_tasks: any[],
  ): TimingConflict[] {
    const conflicts: TimingConflict[] = [];

    if (!task.assigned_to || !task.deadline) return conflicts;

    const task_start = new Date(task.deadline);
    const task_end = new Date(
      task_start.getTime() + task.estimated_duration * 60 * 60 * 1000,
    );

    for (const existing_task of existing_tasks) {
      if (
        existing_task.assigned_to === task.assigned_to &&
        existing_task.deadline
      ) {
        const existing_start = new Date(existing_task.deadline);
        const existing_end = new Date(
          existing_start.getTime() +
            existing_task.estimated_duration * 60 * 60 * 1000,
        );

        // Check for overlap
        if (task_start < existing_end && task_end > existing_start) {
          conflicts.push({
            id: `vendor_conflict_${task.id}_${existing_task.id}`,
            type: 'vendor_double_booking',
            task_ids: [task.id!, existing_task.id],
            conflict_date: task.deadline.toISOString(),
            severity: 'high',
            message: `Vendor ${task.assigned_to} is double-booked for "${task.title}" and "${existing_task.title}"`,
            suggestions: [],
          });
        }
      }
    }

    return conflicts;
  }

  private detectTimelineOverlaps(
    task: WorkflowTask,
    existing_tasks: any[],
  ): TimingConflict[] {
    const conflicts: TimingConflict[] = [];
    const task_date = new Date(task.deadline).toDateString();

    // Find tasks on the same day
    const same_day_tasks = existing_tasks.filter(
      (t) => t.deadline && new Date(t.deadline).toDateString() === task_date,
    );

    if (same_day_tasks.length >= 3) {
      // Threshold for "busy day"
      conflicts.push({
        id: `timeline_overlap_${task.id}`,
        type: 'timeline_overlap',
        task_ids: [task.id!, ...same_day_tasks.map((t) => t.id)],
        conflict_date: task.deadline.toISOString(),
        severity: 'medium',
        message: `High task density on ${task_date} - ${same_day_tasks.length + 1} tasks scheduled`,
        suggestions: [],
      });
    }

    return conflicts;
  }

  private convertDependencyConflicts(
    dependency_validation: any,
  ): TimingConflict[] {
    // Convert existing dependency service results to our format
    if (!dependency_validation?.conflicts) return [];

    return dependency_validation.conflicts.map((conflict: any) => ({
      id: `dependency_${conflict.id}`,
      type: 'dependency_violation',
      task_ids: [conflict.predecessor_id, conflict.successor_id],
      conflict_date: new Date().toISOString(),
      severity: conflict.severity || 'medium',
      message: conflict.message || 'Dependency constraint violation',
      suggestions: [],
    }));
  }

  private generateConflictResolutions(
    conflict: TimingConflict,
    task: Partial<WorkflowTask>,
  ): ConflictResolution[] {
    const suggestions: ConflictResolution[] = [];

    switch (conflict.type) {
      case 'vendor_double_booking':
        suggestions.push({
          type: 'reschedule',
          description: 'Move task to a different time slot',
          impact: 'May affect dependent tasks',
          suggested_changes: {
            deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next day
          },
        });

        suggestions.push({
          type: 'reassign',
          description: 'Assign to a different vendor',
          impact: 'May require vendor negotiation',
          suggested_changes: {
            assigned_to: null,
          },
        });
        break;

      case 'timeline_overlap':
        suggestions.push({
          type: 'reschedule',
          description: 'Spread tasks across multiple days',
          impact: 'Better workload distribution',
          suggested_changes: {
            deadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // Two days later
          },
        });
        break;

      case 'dependency_violation':
        suggestions.push({
          type: 'remove_dependency',
          description: 'Remove conflicting dependency',
          impact: 'May affect project timeline',
          suggested_changes: {},
        });
        break;
    }

    return suggestions;
  }

  private calculateRiskLevel(
    conflicts: TimingConflict[],
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (conflicts.some((c) => c.severity === 'critical')) return 'critical';
    if (conflicts.some((c) => c.severity === 'high')) return 'high';
    if (conflicts.some((c) => c.severity === 'medium')) return 'medium';
    return 'low';
  }

  private async detectTaskPairConflicts(
    task1: WorkflowTask,
    task2: WorkflowTask,
  ): Promise<TimingConflict[]> {
    const conflicts: TimingConflict[] = [];

    // Check if same vendor assigned to both at overlapping times
    if (
      task1.assigned_to === task2.assigned_to &&
      task1.assigned_to &&
      task1.deadline &&
      task2.deadline
    ) {
      const t1_start = new Date(task1.deadline);
      const t1_end = new Date(
        t1_start.getTime() + task1.estimated_duration * 60 * 60 * 1000,
      );
      const t2_start = new Date(task2.deadline);
      const t2_end = new Date(
        t2_start.getTime() + task2.estimated_duration * 60 * 60 * 1000,
      );

      if (t1_start < t2_end && t1_end > t2_start) {
        conflicts.push({
          id: `pair_conflict_${task1.id}_${task2.id}`,
          type: 'vendor_double_booking',
          task_ids: [task1.id, task2.id],
          conflict_date: task1.deadline.toISOString(),
          severity: 'high',
          message: `Tasks "${task1.title}" and "${task2.title}" have overlapping vendor assignments`,
          suggestions: [],
        });
      }
    }

    return conflicts;
  }

  private deduplicateConflicts(conflicts: TimingConflict[]): TimingConflict[] {
    const seen = new Set<string>();
    return conflicts.filter((conflict) => {
      const key = `${conflict.type}_${conflict.task_ids.sort().join('_')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async createTaskDependencies(
    task_id: string,
    dependency_ids: string[],
  ): Promise<void> {
    try {
      for (const dependency_id of dependency_ids) {
        await this.dependencyService.addDependency(
          dependency_id, // predecessor
          task_id, // successor
          'FINISH_TO_START' as any,
          0, // no lag time
        );
      }
    } catch (error) {
      console.error('Failed to create task dependencies:', error);
      // Non-fatal - task was created successfully
    }
  }

  private async updateCriticalPath(wedding_id: string): Promise<void> {
    try {
      await this.dependencyService.calculateCriticalPath(wedding_id);
    } catch (error) {
      console.error('Failed to update critical path:', error);
      // Non-fatal
    }
  }

  private async rollbackTasks(task_ids: string[]): Promise<void> {
    try {
      await this.client.from('workflow_tasks').delete().in('id', task_ids);
    } catch (error) {
      console.error('Failed to rollback tasks:', error);
    }
  }
}

/**
 * Singleton instance for dependency injection
 */
export const taskCreationService = new TaskCreationService();
