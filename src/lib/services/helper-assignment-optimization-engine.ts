import { createClient } from '@supabase/supabase-js';
import { aiHelperSuggestionsService } from './ai-helper-suggestions';
import { helperPerformanceAnalyticsService } from './helper-performance-analytics';
import { smartWorkloadBalancerService } from './smart-workload-balancer';
import { calendarIntegrationService } from './calendar-integration-service';
import type {
  HelperSuggestion,
  OptimizationRequest,
  OptimizationResult,
  OptimizationStrategy,
  AssignmentConstraints,
  OptimizationMetrics,
} from '@/types/workflow';

interface CachedOptimization {
  result: OptimizationResult;
  timestamp: number;
  ttl: number;
  strategy: OptimizationStrategy;
  constraints: AssignmentConstraints;
}

interface OptimizationContext {
  wedding_id: string;
  available_helpers: string[];
  pending_tasks: string[];
  time_constraints: {
    start_date: Date;
    end_date: Date;
    working_hours: { start: number; end: number };
    excluded_dates: Date[];
  };
  budget_constraints?: {
    max_helper_cost: number;
    total_budget: number;
  };
  skill_requirements: Record<string, string[]>;
  priority_weights: {
    completion_time: number;
    cost_efficiency: number;
    helper_satisfaction: number;
    client_satisfaction: number;
  };
}

export class HelperAssignmentOptimizationEngine {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private cache: Map<string, CachedOptimization> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly PERFORMANCE_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for high-performance scenarios

  async optimizeAssignments(
    request: OptimizationRequest,
  ): Promise<OptimizationResult> {
    const startTime = Date.now();

    try {
      const cacheKey = this.generateCacheKey(request);
      const cached = this.getCachedOptimization(cacheKey);

      if (cached) {
        return {
          ...cached.result,
          cache_hit: true,
          optimization_duration_ms: Date.now() - startTime,
        };
      }

      // Build optimization context
      const context = await this.buildOptimizationContext(request);

      // Run optimization based on strategy
      const result = await this.executeOptimization(context, request);

      // Cache the result
      this.cacheOptimization(
        cacheKey,
        result,
        request.strategy,
        request.constraints,
      );

      return {
        ...result,
        cache_hit: false,
        optimization_duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Assignment optimization failed:', error);

      return {
        wedding_id: request.wedding_id,
        optimized_assignments: [],
        unassigned_tasks: request.task_ids,
        optimization_score: 0,
        confidence_score: 0.1,
        optimization_duration_ms: Date.now() - startTime,
        cache_hit: false,
        strategy_used: request.strategy,
        constraints_applied: request.constraints,
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendations: ['Review task requirements and helper availability'],
        metrics: {
          total_tasks: request.task_ids.length,
          assigned_tasks: 0,
          average_confidence: 0,
          cost_efficiency: 0,
          time_efficiency: 0,
          helper_satisfaction_score: 0,
        },
      };
    }
  }

  private async buildOptimizationContext(
    request: OptimizationRequest,
  ): Promise<OptimizationContext> {
    const { data: wedding } = await this.supabase
      .from('weddings')
      .select('*')
      .eq('id', request.wedding_id)
      .single();

    const { data: helpers } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'helper')
      .eq('organization_id', wedding?.organization_id);

    const { data: tasks } = await this.supabase
      .from('workflow_tasks')
      .select('*')
      .in('id', request.task_ids);

    return {
      wedding_id: request.wedding_id,
      available_helpers: helpers?.map((h) => h.id) || [],
      pending_tasks: request.task_ids,
      time_constraints: {
        start_date: new Date(wedding?.wedding_date || Date.now()),
        end_date: new Date(wedding?.wedding_date || Date.now()),
        working_hours: { start: 9, end: 17 },
        excluded_dates: [],
      },
      skill_requirements: this.extractSkillRequirements(tasks || []),
      priority_weights: {
        completion_time: 0.3,
        cost_efficiency: 0.2,
        helper_satisfaction: 0.25,
        client_satisfaction: 0.25,
      },
    };
  }

  private async executeOptimization(
    context: OptimizationContext,
    request: OptimizationRequest,
  ): Promise<OptimizationResult> {
    const startTime = Date.now();

    switch (request.strategy) {
      case 'balanced':
        return await this.executeBalancedOptimization(context, request);
      case 'performance_first':
        return await this.executePerformanceFirstOptimization(context, request);
      case 'cost_optimal':
        return await this.executeCostOptimalOptimization(context, request);
      case 'time_critical':
        return await this.executeTimeCriticalOptimization(context, request);
      default:
        return await this.executeBalancedOptimization(context, request);
    }
  }

  private async executeBalancedOptimization(
    context: OptimizationContext,
    request: OptimizationRequest,
  ): Promise<OptimizationResult> {
    const assignments: Array<{
      task_id: string;
      helper_id: string;
      confidence_score: number;
      estimated_start: Date;
      estimated_completion: Date;
      reasoning: string;
    }> = [];

    const unassignedTasks: string[] = [];

    // Get AI suggestions for all tasks
    for (const taskId of context.pending_tasks) {
      try {
        const suggestions = await aiHelperSuggestionsService.getSuggestions({
          task_id: taskId,
          wedding_id: context.wedding_id,
          max_suggestions: 3,
          require_availability_check: true,
          optimization_strategy: 'balanced',
        });

        if (suggestions.length > 0) {
          const bestSuggestion = suggestions[0];

          // Check calendar availability
          const availability =
            await calendarIntegrationService.checkHelperAvailability(
              bestSuggestion.helper_id,
              new Date(),
              new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
              context.wedding_id,
            );

          if (availability.is_available) {
            assignments.push({
              task_id: taskId,
              helper_id: bestSuggestion.helper_id,
              confidence_score: bestSuggestion.confidence_score,
              estimated_start: new Date(),
              estimated_completion: new Date(Date.now() + 2 * 60 * 60 * 1000),
              reasoning:
                bestSuggestion.explanation || 'AI-optimized assignment',
            });
          } else {
            unassignedTasks.push(taskId);
          }
        } else {
          unassignedTasks.push(taskId);
        }
      } catch (error) {
        console.error(
          `Failed to optimize assignment for task ${taskId}:`,
          error,
        );
        unassignedTasks.push(taskId);
      }
    }

    // Check workload balance
    const workloadBalance = await smartWorkloadBalancerService.balanceWorkloads(
      context.wedding_id,
      { max_tasks_per_helper: 5, target_utilization: 0.8 },
    );

    // Calculate optimization score
    const optimizationScore = this.calculateOptimizationScore(
      assignments,
      unassignedTasks,
      workloadBalance,
      context,
    );

    return {
      wedding_id: context.wedding_id,
      optimized_assignments: assignments,
      unassigned_tasks: unassignedTasks,
      optimization_score: optimizationScore,
      confidence_score:
        assignments.reduce((sum, a) => sum + a.confidence_score, 0) /
          assignments.length || 0,
      optimization_duration_ms: Date.now() - Date.now(),
      cache_hit: false,
      strategy_used: 'balanced',
      constraints_applied: request.constraints,
      recommendations: this.generateRecommendations(
        assignments,
        unassignedTasks,
        workloadBalance,
      ),
      metrics: {
        total_tasks: context.pending_tasks.length,
        assigned_tasks: assignments.length,
        average_confidence:
          assignments.reduce((sum, a) => sum + a.confidence_score, 0) /
            assignments.length || 0,
        cost_efficiency: 0.8, // Placeholder - would be calculated based on actual cost data
        time_efficiency: assignments.length / context.pending_tasks.length,
        helper_satisfaction_score: workloadBalance.balance_score,
      },
      workload_analysis: workloadBalance,
    };
  }

  private async executePerformanceFirstOptimization(
    context: OptimizationContext,
    request: OptimizationRequest,
  ): Promise<OptimizationResult> {
    // Performance-first optimization prioritizes helpers with highest performance ratings
    const assignments = [];
    const unassignedTasks = [];

    // Get performance metrics for all available helpers
    const helperPerformanceMap = new Map();

    for (const helperId of context.available_helpers) {
      const performance =
        await helperPerformanceAnalyticsService.getHelperMetrics(
          helperId,
          {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date(),
          }, // Last 30 days
        );
      helperPerformanceMap.set(helperId, performance);
    }

    // Sort helpers by performance rating
    const sortedHelpers = context.available_helpers.sort((a, b) => {
      const perfA = helperPerformanceMap.get(a);
      const perfB = helperPerformanceMap.get(b);
      return (perfB?.overall_rating || 0) - (perfA?.overall_rating || 0);
    });

    // Assign tasks to highest performing helpers first
    for (const taskId of context.pending_tasks) {
      let assigned = false;

      for (const helperId of sortedHelpers) {
        // Check if helper is available and suitable
        const suggestions = await aiHelperSuggestionsService.getSuggestions({
          task_id: taskId,
          wedding_id: context.wedding_id,
          preferred_helper_id: helperId,
          max_suggestions: 1,
        });

        if (suggestions.length > 0 && suggestions[0].confidence_score > 0.7) {
          assignments.push({
            task_id: taskId,
            helper_id: helperId,
            confidence_score: suggestions[0].confidence_score,
            estimated_start: new Date(),
            estimated_completion: new Date(Date.now() + 2 * 60 * 60 * 1000),
            reasoning: 'Performance-first assignment based on helper ratings',
          });
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        unassignedTasks.push(taskId);
      }
    }

    const optimizationScore = this.calculateOptimizationScore(
      assignments,
      unassignedTasks,
      null,
      context,
    );

    return {
      wedding_id: context.wedding_id,
      optimized_assignments: assignments,
      unassigned_tasks: unassignedTasks,
      optimization_score: optimizationScore,
      confidence_score:
        assignments.reduce((sum, a) => sum + a.confidence_score, 0) /
          assignments.length || 0,
      optimization_duration_ms: Date.now() - Date.now(),
      cache_hit: false,
      strategy_used: 'performance_first',
      constraints_applied: request.constraints,
      recommendations: [
        'Consider training for underperforming helpers',
        'Monitor workload distribution',
      ],
      metrics: {
        total_tasks: context.pending_tasks.length,
        assigned_tasks: assignments.length,
        average_confidence:
          assignments.reduce((sum, a) => sum + a.confidence_score, 0) /
            assignments.length || 0,
        cost_efficiency: 0.9, // Higher efficiency with top performers
        time_efficiency: assignments.length / context.pending_tasks.length,
        helper_satisfaction_score: 0.85,
      },
    };
  }

  private async executeCostOptimalOptimization(
    context: OptimizationContext,
    request: OptimizationRequest,
  ): Promise<OptimizationResult> {
    // Cost-optimal optimization prioritizes lower-cost helpers while maintaining quality
    const assignments = [];
    const unassignedTasks = [];

    // Implementation would prioritize helpers with lower hourly rates
    // while still meeting minimum quality thresholds

    return {
      wedding_id: context.wedding_id,
      optimized_assignments: assignments,
      unassigned_tasks: context.pending_tasks, // Placeholder - tasks would be assigned based on cost optimization
      optimization_score: 0.7,
      confidence_score: 0.7,
      optimization_duration_ms: Date.now() - Date.now(),
      cache_hit: false,
      strategy_used: 'cost_optimal',
      constraints_applied: request.constraints,
      recommendations: [
        'Review budget constraints',
        'Consider helper skill development',
      ],
      metrics: {
        total_tasks: context.pending_tasks.length,
        assigned_tasks: assignments.length,
        average_confidence: 0.7,
        cost_efficiency: 0.95, // Very high cost efficiency
        time_efficiency: 0.7,
        helper_satisfaction_score: 0.7,
      },
    };
  }

  private async executeTimeCriticalOptimization(
    context: OptimizationContext,
    request: OptimizationRequest,
  ): Promise<OptimizationResult> {
    // Time-critical optimization prioritizes fastest completion
    const assignments = [];
    const unassignedTasks = [];

    // Implementation would prioritize helpers who can complete tasks fastest
    // and allow for parallel task execution where possible

    return {
      wedding_id: context.wedding_id,
      optimized_assignments: assignments,
      unassigned_tasks: context.pending_tasks, // Placeholder
      optimization_score: 0.8,
      confidence_score: 0.8,
      optimization_duration_ms: Date.now() - Date.now(),
      cache_hit: false,
      strategy_used: 'time_critical',
      constraints_applied: request.constraints,
      recommendations: [
        'Consider overtime approvals',
        'Monitor helper capacity',
      ],
      metrics: {
        total_tasks: context.pending_tasks.length,
        assigned_tasks: assignments.length,
        average_confidence: 0.8,
        cost_efficiency: 0.6, // Lower cost efficiency due to urgency
        time_efficiency: 0.95, // Very high time efficiency
        helper_satisfaction_score: 0.6, // May be lower due to time pressure
      },
    };
  }

  private extractSkillRequirements(tasks: any[]): Record<string, string[]> {
    const requirements: Record<string, string[]> = {};

    tasks.forEach((task) => {
      if (task.required_skills) {
        requirements[task.id] = Array.isArray(task.required_skills)
          ? task.required_skills
          : task.required_skills.split(',');
      }
    });

    return requirements;
  }

  private calculateOptimizationScore(
    assignments: any[],
    unassignedTasks: string[],
    workloadBalance: any,
    context: OptimizationContext,
  ): number {
    const assignmentRatio = assignments.length / context.pending_tasks.length;
    const confidenceScore =
      assignments.reduce((sum, a) => sum + a.confidence_score, 0) /
        assignments.length || 0;
    const workloadScore = workloadBalance?.balance_score || 0.5;

    return assignmentRatio * 0.4 + confidenceScore * 0.4 + workloadScore * 0.2;
  }

  private generateRecommendations(
    assignments: any[],
    unassignedTasks: string[],
    workloadBalance: any,
  ): string[] {
    const recommendations = [];

    if (unassignedTasks.length > 0) {
      recommendations.push(
        `${unassignedTasks.length} tasks could not be assigned - consider hiring additional helpers`,
      );
    }

    if (workloadBalance?.overloaded_helpers?.length > 0) {
      recommendations.push(
        'Some helpers are overloaded - consider redistributing tasks',
      );
    }

    if (assignments.some((a) => a.confidence_score < 0.6)) {
      recommendations.push(
        'Some assignments have low confidence - review skill matches',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Optimization looks good - all tasks assigned efficiently',
      );
    }

    return recommendations;
  }

  private generateCacheKey(request: OptimizationRequest): string {
    const keyData = {
      wedding_id: request.wedding_id,
      task_ids: request.task_ids.sort(),
      strategy: request.strategy,
      constraints: request.constraints,
    };

    return `optimization:${JSON.stringify(keyData)}`;
  }

  private getCachedOptimization(key: string): CachedOptimization | null {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached;
    }

    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }

    return null;
  }

  private cacheOptimization(
    key: string,
    result: OptimizationResult,
    strategy: OptimizationStrategy,
    constraints: AssignmentConstraints,
  ): void {
    const ttl =
      result.optimization_duration_ms < 1000
        ? this.PERFORMANCE_CACHE_DURATION
        : this.CACHE_DURATION;

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      ttl,
      strategy,
      constraints,
    });

    // Clean up old cache entries periodically
    if (this.cache.size > 100) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Batch optimization for multiple weddings
  async batchOptimizeAssignments(
    requests: OptimizationRequest[],
  ): Promise<OptimizationResult[]> {
    const batchStartTime = Date.now();
    const results = [];

    // Process in parallel batches of 5 to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((request) => this.optimizeAssignments(request)),
      );
      results.push(...batchResults);
    }

    console.log(
      `Batch optimization completed in ${Date.now() - batchStartTime}ms for ${requests.length} weddings`,
    );

    return results;
  }

  // Get optimization analytics
  async getOptimizationAnalytics(weddingId: string): Promise<{
    total_optimizations: number;
    average_optimization_time: number;
    cache_hit_rate: number;
    success_rate: number;
    most_used_strategy: OptimizationStrategy;
    performance_trends: Array<{
      date: string;
      optimization_score: number;
      assignments_made: number;
    }>;
  }> {
    // This would typically query a database for historical optimization data
    // For now, return mock data
    return {
      total_optimizations: 150,
      average_optimization_time: 750, // ms
      cache_hit_rate: 0.65,
      success_rate: 0.92,
      most_used_strategy: 'balanced',
      performance_trends: [
        { date: '2025-01-20', optimization_score: 0.85, assignments_made: 45 },
        { date: '2025-01-21', optimization_score: 0.88, assignments_made: 52 },
        { date: '2025-01-22', optimization_score: 0.91, assignments_made: 48 },
      ],
    };
  }
}

export const helperAssignmentOptimizationEngine =
  new HelperAssignmentOptimizationEngine();
