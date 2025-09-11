/**
 * WS-158: Integration with Helper Assignment Optimization (WS-157)
 * Ensures optimal helper distribution across categories
 */

import { createClient } from '@supabase/supabase-js';
import { categoryAnalytics } from '../analytics/category-performance/categoryAnalytics';
import { TASK_CATEGORIES } from '../ai/task-categorization/categorySuggestionEngine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface HelperCategoryOptimization {
  helperId: string;
  currentCategories: string[];
  recommendedCategories: string[];
  skills: string[];
  workload: number;
  efficiency: number;
}

export interface CategoryHelperRequirements {
  categoryId: string;
  requiredHelpers: number;
  currentHelpers: number;
  skillsNeeded: string[];
  urgency: 'low' | 'medium' | 'high';
}

/**
 * Helper Assignment Integration Service
 */
export class HelperAssignmentIntegration {
  /**
   * Optimize helper distribution across categories
   */
  async optimizeHelperDistribution(eventId: string): Promise<{
    optimizations: HelperCategoryOptimization[];
    requirements: CategoryHelperRequirements[];
    recommendations: string[];
  }> {
    // Get all tasks for the event grouped by category
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, category_id, status, required_skills, priority')
      .eq('event_id', eventId);

    if (!tasks || tasks.length === 0) {
      return {
        optimizations: [],
        requirements: [],
        recommendations: ['No tasks found for optimization'],
      };
    }

    // Get all helpers for the event
    const { data: helpers } = await supabase
      .from('helpers')
      .select('id, skills, assigned_categories, availability, max_tasks')
      .eq('event_id', eventId);

    if (!helpers || helpers.length === 0) {
      return {
        optimizations: [],
        requirements: [],
        recommendations: ['No helpers assigned to this event'],
      };
    }

    // Calculate category requirements
    const requirements = await this.calculateCategoryRequirements(
      tasks,
      helpers,
    );

    // Optimize helper assignments
    const optimizations = await this.generateHelperOptimizations(
      helpers,
      requirements,
      tasks,
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      optimizations,
      requirements,
    );

    // Apply optimizations if needed
    await this.applyOptimizations(optimizations);

    return {
      optimizations,
      requirements,
      recommendations,
    };
  }

  /**
   * Calculate helper requirements for each category
   */
  private async calculateCategoryRequirements(
    tasks: any[],
    helpers: any[],
  ): Promise<CategoryHelperRequirements[]> {
    const requirements: CategoryHelperRequirements[] = [];

    // Group tasks by category
    const tasksByCategory = tasks.reduce(
      (acc, task) => {
        if (!acc[task.category_id]) {
          acc[task.category_id] = [];
        }
        acc[task.category_id].push(task);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    // Calculate requirements for each category
    for (const [categoryId, categoryTasks] of Object.entries(tasksByCategory)) {
      const pendingTasks = categoryTasks.filter((t) => t.status === 'pending');
      const highPriorityTasks = categoryTasks.filter(
        (t) => t.priority === 'high',
      );

      // Collect all required skills
      const skillsNeeded = new Set<string>();
      categoryTasks.forEach((task) => {
        if (task.required_skills) {
          task.required_skills.forEach((skill: string) =>
            skillsNeeded.add(skill),
          );
        }
      });

      // Count current helpers assigned to this category
      const currentHelpers = helpers.filter((h) =>
        h.assigned_categories?.includes(categoryId),
      ).length;

      // Calculate required helpers based on workload
      const avgTasksPerHelper = 5; // Configurable
      const requiredHelpers = Math.ceil(
        pendingTasks.length / avgTasksPerHelper,
      );

      // Determine urgency
      let urgency: 'low' | 'medium' | 'high' = 'low';
      if (highPriorityTasks.length > 5 || pendingTasks.length > 20) {
        urgency = 'high';
      } else if (highPriorityTasks.length > 2 || pendingTasks.length > 10) {
        urgency = 'medium';
      }

      requirements.push({
        categoryId,
        requiredHelpers,
        currentHelpers,
        skillsNeeded: Array.from(skillsNeeded),
        urgency,
      });
    }

    return requirements;
  }

  /**
   * Generate helper optimization recommendations
   */
  private async generateHelperOptimizations(
    helpers: any[],
    requirements: CategoryHelperRequirements[],
    tasks: any[],
  ): Promise<HelperCategoryOptimization[]> {
    const optimizations: HelperCategoryOptimization[] = [];

    for (const helper of helpers) {
      // Calculate current workload
      const { data: assignedTasks } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('helper_id', helper.id)
        .in(
          'task_id',
          tasks.map((t) => t.id),
        );

      const currentWorkload = assignedTasks?.length || 0;
      const maxWorkload = helper.max_tasks || 10;
      const workloadPercentage = currentWorkload / maxWorkload;

      // Calculate efficiency score
      const { data: completedTasks } = await supabase
        .from('task_assignments')
        .select('task_id, completed_at')
        .eq('helper_id', helper.id)
        .not('completed_at', 'is', null);

      const efficiency = completedTasks
        ? completedTasks.length / Math.max(currentWorkload, 1)
        : 0;

      // Determine recommended categories based on skills and requirements
      const recommendedCategories = this.matchHelperToCategories(
        helper,
        requirements,
        workloadPercentage,
      );

      optimizations.push({
        helperId: helper.id,
        currentCategories: helper.assigned_categories || [],
        recommendedCategories,
        skills: helper.skills || [],
        workload: workloadPercentage,
        efficiency,
      });
    }

    return optimizations;
  }

  /**
   * Match helper skills to category requirements
   */
  private matchHelperToCategories(
    helper: any,
    requirements: CategoryHelperRequirements[],
    currentWorkload: number,
  ): string[] {
    const recommended: string[] = [];
    const helperSkills = new Set(helper.skills || []);

    // Don't recommend more categories if helper is overloaded
    if (currentWorkload > 0.8) {
      return helper.assigned_categories || [];
    }

    // Sort requirements by urgency and helper deficit
    const sortedRequirements = requirements.sort((a, b) => {
      const urgencyScore = { high: 3, medium: 2, low: 1 };
      const aScore =
        urgencyScore[a.urgency] * (a.requiredHelpers - a.currentHelpers);
      const bScore =
        urgencyScore[b.urgency] * (b.requiredHelpers - b.currentHelpers);
      return bScore - aScore;
    });

    // Match helper to categories based on skills
    for (const req of sortedRequirements) {
      const skillMatch = req.skillsNeeded.filter((skill) =>
        helperSkills.has(skill),
      ).length;

      const skillMatchRatio =
        req.skillsNeeded.length > 0 ? skillMatch / req.skillsNeeded.length : 0;

      // Recommend if good skill match or category needs helpers urgently
      if (
        skillMatchRatio > 0.5 ||
        (req.urgency === 'high' && req.currentHelpers < req.requiredHelpers)
      ) {
        recommended.push(req.categoryId);
      }

      // Limit recommendations based on workload
      if (recommended.length >= Math.floor((1 - currentWorkload) * 3)) {
        break;
      }
    }

    return recommended;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    optimizations: HelperCategoryOptimization[],
    requirements: CategoryHelperRequirements[],
  ): string[] {
    const recommendations: string[] = [];

    // Check for understaffed categories
    const understaffed = requirements.filter(
      (r) => r.currentHelpers < r.requiredHelpers,
    );

    if (understaffed.length > 0) {
      const categories = understaffed
        .map(
          (r) =>
            TASK_CATEGORIES[r.categoryId as keyof typeof TASK_CATEGORIES]
              ?.name || r.categoryId,
        )
        .join(', ');
      recommendations.push(`Categories needing more helpers: ${categories}`);
    }

    // Check for overworked helpers
    const overworked = optimizations.filter((o) => o.workload > 0.8);
    if (overworked.length > 0) {
      recommendations.push(
        `${overworked.length} helpers are at >80% capacity - consider redistributing tasks`,
      );
    }

    // Check for skill mismatches
    const skillMismatches = optimizations.filter((o) => {
      const currentSet = new Set(o.currentCategories);
      const recommendedSet = new Set(o.recommendedCategories);
      return o.recommendedCategories.some((cat) => !currentSet.has(cat));
    });

    if (skillMismatches.length > 0) {
      recommendations.push(
        `${skillMismatches.length} helpers could be better utilized in different categories`,
      );
    }

    // Check for high urgency categories
    const urgent = requirements.filter((r) => r.urgency === 'high');
    if (urgent.length > 0) {
      recommendations.push(
        `${urgent.length} categories require urgent attention`,
      );
    }

    // Success message if well optimized
    if (recommendations.length === 0) {
      recommendations.push(
        'Helper distribution is well optimized across categories',
      );
    }

    return recommendations;
  }

  /**
   * Apply optimization recommendations
   */
  private async applyOptimizations(
    optimizations: HelperCategoryOptimization[],
  ): Promise<void> {
    for (const optimization of optimizations) {
      // Only apply if there are changes
      const currentSet = new Set(optimization.currentCategories);
      const recommendedSet = new Set(optimization.recommendedCategories);

      const toAdd = optimization.recommendedCategories.filter(
        (cat) => !currentSet.has(cat),
      );
      const toRemove = optimization.currentCategories.filter(
        (cat) => !recommendedSet.has(cat),
      );

      if (toAdd.length > 0 || toRemove.length > 0) {
        // Update helper's assigned categories
        await supabase
          .from('helpers')
          .update({
            assigned_categories: optimization.recommendedCategories,
            last_optimization_at: new Date().toISOString(),
          })
          .eq('id', optimization.helperId);

        // Log the optimization
        await supabase.from('helper_optimization_logs').insert({
          helper_id: optimization.helperId,
          previous_categories: optimization.currentCategories,
          new_categories: optimization.recommendedCategories,
          workload: optimization.workload,
          efficiency: optimization.efficiency,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Get category-specific helper performance
   */
  async getCategoryHelperPerformance(
    categoryId: string,
    period: 'day' | 'week' | 'month' = 'week',
  ): Promise<{
    topPerformers: Array<{
      helperId: string;
      tasksCompleted: number;
      averageTime: number;
      efficiency: number;
    }>;
    categoryMetrics: {
      averageCompletionTime: number;
      helperUtilization: number;
      taskDistribution: Record<string, number>;
    };
  }> {
    const startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    // Get tasks in category
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, created_at, completed_at')
      .eq('category_id', categoryId)
      .gte('created_at', startDate.toISOString());

    if (!tasks || tasks.length === 0) {
      return {
        topPerformers: [],
        categoryMetrics: {
          averageCompletionTime: 0,
          helperUtilization: 0,
          taskDistribution: {},
        },
      };
    }

    // Get helper assignments
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('helper_id, task_id, assigned_at, completed_at')
      .in(
        'task_id',
        tasks.map((t) => t.id),
      );

    // Calculate helper performance
    const helperPerformance = new Map<
      string,
      {
        tasksCompleted: number;
        totalTime: number;
        tasksAssigned: number;
      }
    >();

    for (const assignment of assignments || []) {
      if (!helperPerformance.has(assignment.helper_id)) {
        helperPerformance.set(assignment.helper_id, {
          tasksCompleted: 0,
          totalTime: 0,
          tasksAssigned: 0,
        });
      }

      const perf = helperPerformance.get(assignment.helper_id)!;
      perf.tasksAssigned++;

      if (assignment.completed_at) {
        perf.tasksCompleted++;
        const completionTime =
          new Date(assignment.completed_at).getTime() -
          new Date(assignment.assigned_at).getTime();
        perf.totalTime += completionTime;
      }
    }

    // Calculate top performers
    const topPerformers = Array.from(helperPerformance.entries())
      .map(([helperId, perf]) => ({
        helperId,
        tasksCompleted: perf.tasksCompleted,
        averageTime:
          perf.tasksCompleted > 0 ? perf.totalTime / perf.tasksCompleted : 0,
        efficiency:
          perf.tasksAssigned > 0 ? perf.tasksCompleted / perf.tasksAssigned : 0,
      }))
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 5);

    // Calculate category metrics
    const completedTasks = tasks.filter((t) => t.completed_at);
    const totalCompletionTime = completedTasks.reduce((acc, task) => {
      return (
        acc +
        (new Date(task.completed_at!).getTime() -
          new Date(task.created_at).getTime())
      );
    }, 0);

    const averageCompletionTime =
      completedTasks.length > 0
        ? totalCompletionTime / completedTasks.length
        : 0;

    const uniqueHelpers = new Set(assignments?.map((a) => a.helper_id)).size;
    const helperUtilization =
      tasks.length > 0 ? uniqueHelpers / tasks.length : 0;

    // Task distribution by status
    const taskDistribution = tasks.reduce(
      (acc, task) => {
        const status = task.completed_at ? 'completed' : 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      topPerformers,
      categoryMetrics: {
        averageCompletionTime,
        helperUtilization,
        taskDistribution,
      },
    };
  }

  /**
   * Sync category changes with helper assignments
   */
  async syncCategoryChanges(
    taskId: string,
    oldCategory: string,
    newCategory: string,
  ): Promise<void> {
    // Get current task assignment
    const { data: assignment } = await supabase
      .from('task_assignments')
      .select('helper_id')
      .eq('task_id', taskId)
      .single();

    if (!assignment) return;

    // Check if helper is suitable for new category
    const { data: helper } = await supabase
      .from('helpers')
      .select('assigned_categories, skills')
      .eq('id', assignment.helper_id)
      .single();

    if (!helper) return;

    // If helper not assigned to new category, find alternative
    if (!helper.assigned_categories?.includes(newCategory)) {
      const { data: alternativeHelpers } = await supabase
        .from('helpers')
        .select('id, assigned_categories, skills')
        .contains('assigned_categories', [newCategory]);

      if (alternativeHelpers && alternativeHelpers.length > 0) {
        // Find best match based on skills
        const { data: task } = await supabase
          .from('tasks')
          .select('required_skills')
          .eq('id', taskId)
          .single();

        const bestHelper = this.findBestHelperMatch(
          alternativeHelpers,
          task?.required_skills || [],
        );

        if (bestHelper) {
          // Reassign task to better suited helper
          await supabase
            .from('task_assignments')
            .update({
              helper_id: bestHelper.id,
              reassigned_at: new Date().toISOString(),
              reassignment_reason: 'Category change optimization',
            })
            .eq('task_id', taskId);

          // Log the reassignment
          await supabase.from('task_reassignment_logs').insert({
            task_id: taskId,
            previous_helper_id: assignment.helper_id,
            new_helper_id: bestHelper.id,
            previous_category: oldCategory,
            new_category: newCategory,
            reason: 'Category change requires different skill set',
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  /**
   * Find best helper match based on skills
   */
  private findBestHelperMatch(helpers: any[], requiredSkills: string[]): any {
    if (requiredSkills.length === 0) {
      return helpers[0];
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const helper of helpers) {
      const helperSkills = new Set(helper.skills || []);
      const matchScore = requiredSkills.filter((skill) =>
        helperSkills.has(skill),
      ).length;

      if (matchScore > bestScore) {
        bestScore = matchScore;
        bestMatch = helper;
      }
    }

    return bestMatch || helpers[0];
  }
}

// Export singleton instance
export const helperAssignmentIntegration = new HelperAssignmentIntegration();
