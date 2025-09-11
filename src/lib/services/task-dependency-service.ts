import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { TaskStatus, DependencyType } from '@/types/workflow';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface TaskDependency {
  id: string;
  predecessor_task_id: string;
  successor_task_id: string;
  dependency_type: DependencyType;
  lag_time: number; // in hours
  created_at: Date;
}

interface TaskNode {
  id: string;
  title: string;
  status: TaskStatus;
  estimated_duration: number;
  buffer_time: number;
  deadline: Date;
  start_date: Date | null;
  completion_date: Date | null;
  assigned_to: string | null;
  predecessors: TaskDependency[];
  successors: TaskDependency[];
  earliest_start: Date;
  latest_start: Date;
  earliest_finish: Date;
  latest_finish: Date;
  total_float: number; // slack time
  free_float: number;
  is_critical: boolean;
}

interface CriticalPath {
  tasks: TaskNode[];
  total_duration: number;
  total_float: number;
  bottlenecks: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  completion_probability: number;
}

interface DependencyValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface ProjectSchedule {
  tasks: TaskNode[];
  critical_path: CriticalPath;
  milestones: Milestone[];
  resource_conflicts: ResourceConflict[];
  schedule_health: ScheduleHealth;
}

interface Milestone {
  id: string;
  name: string;
  target_date: Date;
  actual_date: Date | null;
  status: 'pending' | 'achieved' | 'missed';
  dependent_tasks: string[];
}

interface ResourceConflict {
  resource_id: string;
  conflicting_tasks: string[];
  conflict_period: {
    start: Date;
    end: Date;
  };
  severity: 'low' | 'medium' | 'high';
}

interface ScheduleHealth {
  overall_score: number; // 0-100
  on_track_percentage: number;
  critical_path_health: number;
  resource_utilization: number;
  buffer_utilization: number;
  risks: ScheduleRisk[];
}

interface ScheduleRisk {
  type: 'deadline' | 'resource' | 'dependency' | 'buffer';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_tasks: string[];
  mitigation_suggestions: string[];
}

export class TaskDependencyService {
  // Add a dependency between two tasks
  async addDependency(
    predecessorTaskId: string,
    successorTaskId: string,
    dependencyType: DependencyType = DependencyType.FINISH_TO_START,
    lagTime: number = 0,
  ): Promise<{
    success: boolean;
    dependency?: TaskDependency;
    error?: string;
  }> {
    try {
      // Validate the dependency
      const validation = await this.validateDependency(
        predecessorTaskId,
        successorTaskId,
        dependencyType,
      );

      if (!validation.is_valid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      // Check for circular dependencies
      const hasCircularDependency = await this.checkCircularDependency(
        predecessorTaskId,
        successorTaskId,
      );

      if (hasCircularDependency) {
        return {
          success: false,
          error:
            'Adding this dependency would create a circular dependency loop',
        };
      }

      // Create the dependency
      const { data, error } = await supabase
        .from('task_dependencies')
        .insert({
          predecessor_task_id: predecessorTaskId,
          successor_task_id: successorTaskId,
          dependency_type: dependencyType,
          lag_time: lagTime,
        })
        .select()
        .single();

      if (error) throw error;

      // Recalculate schedule after adding dependency
      await this.recalculateSchedule(successorTaskId);

      return { success: true, dependency: data };
    } catch (error) {
      console.error('Failed to add dependency:', error);
      return { success: false, error: 'Failed to add dependency' };
    }
  }

  // Remove a dependency
  async removeDependency(
    dependencyId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: dependency } = await supabase
        .from('task_dependencies')
        .select('successor_task_id')
        .eq('id', dependencyId)
        .single();

      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', dependencyId);

      if (error) throw error;

      // Recalculate schedule after removing dependency
      if (dependency) {
        await this.recalculateSchedule(dependency.successor_task_id);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to remove dependency:', error);
      return { success: false, error: 'Failed to remove dependency' };
    }
  }

  // Validate a potential dependency
  async validateDependency(
    predecessorTaskId: string,
    successorTaskId: string,
    dependencyType: DependencyType,
  ): Promise<DependencyValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Check if tasks exist and get their details
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, wedding_id, deadline, status, estimated_duration')
        .in('id', [predecessorTaskId, successorTaskId]);

      if (!tasks || tasks.length !== 2) {
        errors.push('One or both tasks do not exist');
        return { is_valid: false, errors, warnings, suggestions };
      }

      const predecessor = tasks.find((t) => t.id === predecessorTaskId);
      const successor = tasks.find((t) => t.id === successorTaskId);

      if (!predecessor || !successor) {
        errors.push('Invalid task references');
        return { is_valid: false, errors, warnings, suggestions };
      }

      // Check if tasks belong to the same wedding
      if (predecessor.wedding_id !== successor.wedding_id) {
        errors.push('Tasks must belong to the same wedding');
        return { is_valid: false, errors, warnings, suggestions };
      }

      // Check if dependency already exists
      const { data: existingDependency } = await supabase
        .from('task_dependencies')
        .select('id')
        .eq('predecessor_task_id', predecessorTaskId)
        .eq('successor_task_id', successorTaskId)
        .single();

      if (existingDependency) {
        errors.push('Dependency already exists between these tasks');
        return { is_valid: false, errors, warnings, suggestions };
      }

      // Check timeline logic
      const predecessorDeadline = new Date(predecessor.deadline);
      const successorDeadline = new Date(successor.deadline);

      if (predecessorDeadline >= successorDeadline) {
        warnings.push(
          'Predecessor task deadline is after or same as successor deadline',
        );
        suggestions.push(
          'Consider adjusting task deadlines to ensure proper sequencing',
        );
      }

      // Check status compatibility
      if (
        predecessor.status === TaskStatus.COMPLETED &&
        successor.status === TaskStatus.TODO
      ) {
        suggestions.push(
          'Predecessor is completed - successor can be started immediately',
        );
      }

      if (predecessor.status === TaskStatus.CANCELLED) {
        warnings.push(
          'Predecessor task is cancelled - this dependency may not be meaningful',
        );
      }

      // Check for logical dependency types
      if (dependencyType === DependencyType.START_TO_FINISH) {
        warnings.push(
          'Start-to-finish dependencies are rare in wedding planning - verify this is correct',
        );
      }

      return {
        is_valid: errors.length === 0,
        errors,
        warnings,
        suggestions,
      };
    } catch (error) {
      console.error('Dependency validation error:', error);
      return {
        is_valid: false,
        errors: ['Failed to validate dependency'],
        warnings,
        suggestions,
      };
    }
  }

  // Check for circular dependencies using DFS
  async checkCircularDependency(
    predecessorTaskId: string,
    successorTaskId: string,
  ): Promise<boolean> {
    try {
      // Get all existing dependencies
      const { data: dependencies } = await supabase
        .from('task_dependencies')
        .select('predecessor_task_id, successor_task_id');

      if (!dependencies) return false;

      // Build adjacency list
      const graph: Record<string, string[]> = {};
      dependencies.forEach((dep) => {
        if (!graph[dep.predecessor_task_id]) {
          graph[dep.predecessor_task_id] = [];
        }
        graph[dep.predecessor_task_id].push(dep.successor_task_id);
      });

      // Add the new dependency temporarily
      if (!graph[predecessorTaskId]) {
        graph[predecessorTaskId] = [];
      }
      graph[predecessorTaskId].push(successorTaskId);

      // Check for cycles using DFS
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const hasCycle = (node: string): boolean => {
        if (recursionStack.has(node)) return true;
        if (visited.has(node)) return false;

        visited.add(node);
        recursionStack.add(node);

        const neighbors = graph[node] || [];
        for (const neighbor of neighbors) {
          if (hasCycle(neighbor)) return true;
        }

        recursionStack.delete(node);
        return false;
      };

      // Check all nodes
      for (const node of Object.keys(graph)) {
        if (hasCycle(node)) return true;
      }

      return false;
    } catch (error) {
      console.error('Circular dependency check failed:', error);
      return true; // Assume circular to be safe
    }
  }

  // Calculate critical path using Critical Path Method (CPM)
  async calculateCriticalPath(weddingId: string): Promise<CriticalPath> {
    try {
      const tasks = await this.getTasksWithDependencies(weddingId);

      if (tasks.length === 0) {
        return {
          tasks: [],
          total_duration: 0,
          total_float: 0,
          bottlenecks: [],
          risk_level: 'low',
          completion_probability: 100,
        };
      }

      // Forward pass - calculate earliest start and finish times
      await this.forwardPass(tasks);

      // Backward pass - calculate latest start and finish times
      await this.backwardPass(tasks);

      // Calculate float and identify critical path
      this.calculateFloat(tasks);

      const criticalTasks = tasks.filter((task) => task.is_critical);
      const totalDuration =
        Math.max(...tasks.map((t) => t.earliest_finish.getTime())) -
        Math.min(...tasks.map((t) => t.earliest_start.getTime()));

      const bottlenecks = this.identifyBottlenecks(tasks);
      const riskLevel = this.assessRiskLevel(criticalTasks, tasks);
      const completionProbability =
        this.calculateCompletionProbability(criticalTasks);

      return {
        tasks: criticalTasks,
        total_duration: totalDuration / (1000 * 60 * 60), // Convert to hours
        total_float: Math.min(...tasks.map((t) => t.total_float)),
        bottlenecks,
        risk_level: riskLevel,
        completion_probability: completionProbability,
      };
    } catch (error) {
      console.error('Critical path calculation failed:', error);
      throw error;
    }
  }

  // Forward pass calculation
  private async forwardPass(tasks: TaskNode[]): Promise<void> {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    // Topological sort to process tasks in dependency order
    const visited = new Set<string>();
    const processed = new Set<string>();

    const processTask = (task: TaskNode) => {
      if (processed.has(task.id)) return;
      if (visited.has(task.id)) {
        throw new Error('Circular dependency detected during forward pass');
      }

      visited.add(task.id);

      // Process all predecessors first
      for (const dep of task.predecessors) {
        const predecessor = taskMap.get(dep.predecessor_task_id);
        if (predecessor) {
          processTask(predecessor);
        }
      }

      // Calculate earliest start time
      if (task.predecessors.length === 0) {
        // No predecessors - can start immediately
        task.earliest_start = new Date();
      } else {
        let maxFinishTime = new Date(0);

        for (const dep of task.predecessors) {
          const predecessor = taskMap.get(dep.predecessor_task_id);
          if (!predecessor) continue;

          let dependentTime: Date;

          switch (dep.dependency_type) {
            case DependencyType.FINISH_TO_START:
              dependentTime = new Date(
                predecessor.earliest_finish.getTime() +
                  dep.lag_time * 60 * 60 * 1000,
              );
              break;
            case DependencyType.START_TO_START:
              dependentTime = new Date(
                predecessor.earliest_start.getTime() +
                  dep.lag_time * 60 * 60 * 1000,
              );
              break;
            case DependencyType.FINISH_TO_FINISH:
              dependentTime = new Date(
                predecessor.earliest_finish.getTime() -
                  task.estimated_duration * 60 * 60 * 1000 +
                  dep.lag_time * 60 * 60 * 1000,
              );
              break;
            case DependencyType.START_TO_FINISH:
              dependentTime = new Date(
                predecessor.earliest_start.getTime() -
                  task.estimated_duration * 60 * 60 * 1000 +
                  dep.lag_time * 60 * 60 * 1000,
              );
              break;
            default:
              dependentTime = new Date(
                predecessor.earliest_finish.getTime() +
                  dep.lag_time * 60 * 60 * 1000,
              );
          }

          if (dependentTime > maxFinishTime) {
            maxFinishTime = dependentTime;
          }
        }

        task.earliest_start = maxFinishTime;
      }

      // Calculate earliest finish time
      task.earliest_finish = new Date(
        task.earliest_start.getTime() +
          (task.estimated_duration + task.buffer_time) * 60 * 60 * 1000,
      );

      visited.delete(task.id);
      processed.add(task.id);
    };

    // Process all tasks
    for (const task of tasks) {
      processTask(task);
    }
  }

  // Backward pass calculation
  private async backwardPass(tasks: TaskNode[]): Promise<void> {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    // Find project end time
    const projectEndTime = new Date(
      Math.max(...tasks.map((t) => t.earliest_finish.getTime())),
    );

    // Start from tasks with no successors
    const visited = new Set<string>();
    const processed = new Set<string>();

    const processTask = (task: TaskNode) => {
      if (processed.has(task.id)) return;
      if (visited.has(task.id)) {
        throw new Error('Circular dependency detected during backward pass');
      }

      visited.add(task.id);

      // Process all successors first
      for (const dep of task.successors) {
        const successor = taskMap.get(dep.successor_task_id);
        if (successor) {
          processTask(successor);
        }
      }

      // Calculate latest finish time
      if (task.successors.length === 0) {
        // No successors - latest finish is project end or task deadline
        task.latest_finish = new Date(
          Math.min(projectEndTime.getTime(), task.deadline.getTime()),
        );
      } else {
        let minStartTime = new Date(projectEndTime.getTime());

        for (const dep of task.successors) {
          const successor = taskMap.get(dep.successor_task_id);
          if (!successor) continue;

          let dependentTime: Date;

          switch (dep.dependency_type) {
            case DependencyType.FINISH_TO_START:
              dependentTime = new Date(
                successor.latest_start.getTime() -
                  dep.lag_time * 60 * 60 * 1000,
              );
              break;
            case DependencyType.START_TO_START:
              dependentTime = new Date(
                successor.latest_start.getTime() -
                  dep.lag_time * 60 * 60 * 1000 +
                  (task.estimated_duration + task.buffer_time) * 60 * 60 * 1000,
              );
              break;
            case DependencyType.FINISH_TO_FINISH:
              dependentTime = new Date(
                successor.latest_finish.getTime() -
                  dep.lag_time * 60 * 60 * 1000,
              );
              break;
            case DependencyType.START_TO_FINISH:
              dependentTime = new Date(
                successor.latest_finish.getTime() -
                  dep.lag_time * 60 * 60 * 1000 +
                  (task.estimated_duration + task.buffer_time) * 60 * 60 * 1000,
              );
              break;
            default:
              dependentTime = new Date(
                successor.latest_start.getTime() -
                  dep.lag_time * 60 * 60 * 1000,
              );
          }

          if (dependentTime < minStartTime) {
            minStartTime = dependentTime;
          }
        }

        task.latest_finish = minStartTime;
      }

      // Calculate latest start time
      task.latest_start = new Date(
        task.latest_finish.getTime() -
          (task.estimated_duration + task.buffer_time) * 60 * 60 * 1000,
      );

      visited.delete(task.id);
      processed.add(task.id);
    };

    // Process all tasks
    for (const task of tasks) {
      processTask(task);
    }
  }

  // Calculate float and identify critical tasks
  private calculateFloat(tasks: TaskNode[]): void {
    for (const task of tasks) {
      // Total float (slack) = Latest Start - Earliest Start
      task.total_float =
        (task.latest_start.getTime() - task.earliest_start.getTime()) /
        (1000 * 60 * 60); // in hours

      // Free float calculation (simplified)
      task.free_float = task.total_float;

      // Task is critical if total float is zero or negative
      task.is_critical = task.total_float <= 0;
    }
  }

  // Identify bottlenecks in the schedule
  private identifyBottlenecks(tasks: TaskNode[]): string[] {
    const bottlenecks: string[] = [];

    for (const task of tasks) {
      // Task is a bottleneck if:
      // 1. It's on the critical path
      // 2. It has multiple successors
      // 3. It has low buffer time relative to duration

      if (task.is_critical && task.successors.length > 2) {
        bottlenecks.push(task.id);
      }

      if (
        task.buffer_time / task.estimated_duration < 0.1 &&
        task.successors.length > 0
      ) {
        bottlenecks.push(task.id);
      }
    }

    return [...new Set(bottlenecks)]; // Remove duplicates
  }

  // Assess overall risk level
  private assessRiskLevel(
    criticalTasks: TaskNode[],
    allTasks: TaskNode[],
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalPathPercentage = criticalTasks.length / allTasks.length;
    const avgFloatOnCriticalPath =
      criticalTasks.reduce((sum, task) => sum + task.total_float, 0) /
      criticalTasks.length;

    if (criticalPathPercentage > 0.7 || avgFloatOnCriticalPath < -24) {
      // More than 70% critical or 1+ day behind
      return 'critical';
    } else if (criticalPathPercentage > 0.5 || avgFloatOnCriticalPath < -8) {
      return 'high';
    } else if (criticalPathPercentage > 0.3 || avgFloatOnCriticalPath < 0) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  // Calculate completion probability based on critical path analysis
  private calculateCompletionProbability(criticalTasks: TaskNode[]): number {
    if (criticalTasks.length === 0) return 100;

    // Simplified Monte Carlo-style probability calculation
    const totalBuffer = criticalTasks.reduce(
      (sum, task) => sum + task.buffer_time,
      0,
    );
    const totalDuration = criticalTasks.reduce(
      (sum, task) => sum + task.estimated_duration,
      0,
    );

    const bufferRatio = totalBuffer / totalDuration;

    // Convert buffer ratio to probability (simplified model)
    let probability = 70 + bufferRatio * 25; // Base 70% + buffer contribution

    // Adjust for overdue tasks
    const overdueTasks = criticalTasks.filter(
      (task) => new Date() > task.deadline,
    );
    probability -= overdueTasks.length * 10;

    return Math.max(0, Math.min(100, probability));
  }

  // Get tasks with their dependencies
  private async getTasksWithDependencies(
    weddingId: string,
  ): Promise<TaskNode[]> {
    const { data: tasksData } = await supabase
      .from('tasks')
      .select(
        `
        *,
        predecessors:task_dependencies!successor_task_id(*),
        successors:task_dependencies!predecessor_task_id(*)
      `,
      )
      .eq('wedding_id', weddingId);

    if (!tasksData) return [];

    return tasksData.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status as TaskStatus,
      estimated_duration: task.estimated_duration || 1,
      buffer_time: task.buffer_time || 0,
      deadline: new Date(task.deadline),
      start_date: task.start_date ? new Date(task.start_date) : null,
      completion_date: task.completion_date
        ? new Date(task.completion_date)
        : null,
      assigned_to: task.assigned_to,
      predecessors: task.predecessors || [],
      successors: task.successors || [],
      earliest_start: new Date(),
      latest_start: new Date(),
      earliest_finish: new Date(),
      latest_finish: new Date(),
      total_float: 0,
      free_float: 0,
      is_critical: false,
    }));
  }

  // Recalculate schedule after dependency changes
  private async recalculateSchedule(affectedTaskId: string): Promise<void> {
    try {
      // Get wedding ID for the affected task
      const { data: task } = await supabase
        .from('tasks')
        .select('wedding_id')
        .eq('id', affectedTaskId)
        .single();

      if (!task) return;

      // Recalculate critical path for the entire wedding
      await this.calculateCriticalPath(task.wedding_id);

      // Update task schedules in database if needed
      // This would typically trigger other services like reminder rescheduling
    } catch (error) {
      console.error('Failed to recalculate schedule:', error);
    }
  }

  // Get dependency suggestions for a task
  async getDependencySuggestions(
    taskId: string,
  ): Promise<
    { task_id: string; title: string; reason: string; confidence: number }[]
  > {
    try {
      const { data: task } = await supabase
        .from('tasks')
        .select('*, wedding_id')
        .eq('id', taskId)
        .single();

      if (!task) return [];

      // Get other tasks in the same wedding
      const { data: siblingTasks } = await supabase
        .from('tasks')
        .select('id, title, category, deadline')
        .eq('wedding_id', task.wedding_id)
        .neq('id', taskId);

      if (!siblingTasks) return [];

      const suggestions: {
        task_id: string;
        title: string;
        reason: string;
        confidence: number;
      }[] = [];

      // Wedding-specific dependency logic
      const dependencyRules = this.getWeddingDependencyRules();

      for (const siblingTask of siblingTasks) {
        const rule = dependencyRules.find(
          (r) =>
            r.successor === task.category &&
            r.predecessor === siblingTask.category,
        );

        if (rule) {
          suggestions.push({
            task_id: siblingTask.id,
            title: siblingTask.title,
            reason: rule.reason,
            confidence: rule.confidence,
          });
        }
      }

      // Sort by confidence
      return suggestions.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Failed to get dependency suggestions:', error);
      return [];
    }
  }

  // Wedding-specific dependency rules
  private getWeddingDependencyRules() {
    return [
      {
        predecessor: 'venue_management',
        successor: 'catering',
        reason:
          'Venue must be confirmed before finalizing catering arrangements',
        confidence: 0.9,
      },
      {
        predecessor: 'catering',
        successor: 'florals',
        reason:
          'Table arrangements needed before finalizing floral centerpieces',
        confidence: 0.8,
      },
      {
        predecessor: 'photography',
        successor: 'florals',
        reason: 'Photography timeline affects floral delivery timing',
        confidence: 0.7,
      },
      {
        predecessor: 'music',
        successor: 'vendor_coordination',
        reason: 'Sound requirements impact overall vendor setup coordination',
        confidence: 0.75,
      },
      {
        predecessor: 'transportation',
        successor: 'logistics',
        reason: 'Transportation schedule affects day-of logistics planning',
        confidence: 0.8,
      },
    ];
  }

  // Generate dependency report
  async generateDependencyReport(weddingId: string): Promise<any> {
    try {
      const criticalPath = await this.calculateCriticalPath(weddingId);
      const tasks = await this.getTasksWithDependencies(weddingId);

      const report = {
        summary: {
          total_tasks: tasks.length,
          critical_tasks: criticalPath.tasks.length,
          total_dependencies: tasks.reduce(
            (sum, task) => sum + task.predecessors.length,
            0,
          ),
          critical_path_duration: criticalPath.total_duration,
          risk_level: criticalPath.risk_level,
          completion_probability: criticalPath.completion_probability,
        },
        critical_path: criticalPath,
        bottlenecks: criticalPath.bottlenecks,
        recommendations: this.generateRecommendations(tasks, criticalPath),
        dependency_matrix: this.buildDependencyMatrix(tasks),
      };

      return report;
    } catch (error) {
      console.error('Failed to generate dependency report:', error);
      throw error;
    }
  }

  private generateRecommendations(
    tasks: TaskNode[],
    criticalPath: CriticalPath,
  ): string[] {
    const recommendations: string[] = [];

    if (
      criticalPath.risk_level === 'critical' ||
      criticalPath.risk_level === 'high'
    ) {
      recommendations.push(
        'Critical path is at high risk - consider adding buffer time to critical tasks',
      );
    }

    if (criticalPath.completion_probability < 70) {
      recommendations.push(
        'Low completion probability - review task estimates and add contingency plans',
      );
    }

    const overdueTasks = tasks.filter(
      (task) =>
        new Date() > task.deadline && task.status !== TaskStatus.COMPLETED,
    );
    if (overdueTasks.length > 0) {
      recommendations.push(
        `${overdueTasks.length} tasks are overdue - prioritize these immediately`,
      );
    }

    if (criticalPath.bottlenecks.length > 0) {
      recommendations.push(
        'Bottleneck tasks identified - consider adding resources or parallel processing',
      );
    }

    return recommendations;
  }

  private buildDependencyMatrix(tasks: TaskNode[]): Record<string, string[]> {
    const matrix: Record<string, string[]> = {};

    tasks.forEach((task) => {
      matrix[task.id] = task.predecessors.map((dep) => dep.predecessor_task_id);
    });

    return matrix;
  }
}
