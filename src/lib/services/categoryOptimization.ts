/**
 * WS-158: Category Optimization Service
 * Handles bulk processing, conflict resolution, and smart balancing
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  categorySuggestionEngine,
  TASK_CATEGORIES,
} from '../ai/task-categorization/categorySuggestionEngine';
import { categoryAnalytics } from '../analytics/category-performance/categoryAnalytics';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Schemas
const BulkProcessingRequestSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      currentCategory: z.string().optional(),
      timeSlot: z.string().optional(),
      dependencies: z.array(z.string()).optional(),
      helperSkills: z.array(z.string()).optional(),
    }),
  ),
  options: z
    .object({
      optimizeDistribution: z.boolean().default(true),
      resolveConflicts: z.boolean().default(true),
      applyML: z.boolean().default(true),
      maxProcessingTime: z.number().default(10000), // 10 seconds
    })
    .optional(),
});

const CategoryConflictSchema = z.object({
  taskId: z.string(),
  conflictType: z.enum(['dependency', 'timing', 'helper', 'resource']),
  affectedCategories: z.array(z.string()),
  severity: z.enum(['low', 'medium', 'high']),
  suggestedResolution: z.object({
    newCategory: z.string(),
    reason: z.string(),
    confidence: z.number(),
  }),
});

const MachineLearningUpdateSchema = z.object({
  modelVersion: z.string(),
  improvements: z.array(
    z.object({
      categoryId: z.string(),
      previousAccuracy: z.number(),
      newAccuracy: z.number(),
      samplesProcessed: z.number(),
    }),
  ),
  timestamp: z.string(),
});

export type BulkProcessingRequest = z.infer<typeof BulkProcessingRequestSchema>;
export type CategoryConflict = z.infer<typeof CategoryConflictSchema>;
export type MachineLearningUpdate = z.infer<typeof MachineLearningUpdateSchema>;

/**
 * Category Optimization Service
 */
export class CategoryOptimizationService {
  private processingQueue: Map<string, Promise<any>> = new Map();
  private mlModelVersion = '1.0.0';
  private conflictThreshold = 0.7;

  /**
   * Process bulk category assignments with optimization
   */
  async processBulkCategories(request: BulkProcessingRequest): Promise<{
    processed: number;
    optimized: number;
    conflicts: CategoryConflict[];
    recommendations: any[];
    processingTime: number;
  }> {
    const startTime = Date.now();
    const validatedRequest = BulkProcessingRequestSchema.parse(request);

    // Step 1: Get AI suggestions for all tasks
    const suggestions = await categorySuggestionEngine.suggestCategoriesBulk(
      validatedRequest.tasks,
    );

    // Step 2: Detect and resolve conflicts
    let conflicts: CategoryConflict[] = [];
    if (validatedRequest.options?.resolveConflicts) {
      conflicts = await this.detectAndResolveConflicts(
        validatedRequest.tasks,
        suggestions,
      );
    }

    // Step 3: Optimize category distribution
    let optimizedSuggestions = suggestions;
    if (validatedRequest.options?.optimizeDistribution) {
      optimizedSuggestions = await this.optimizeCategoryDistribution(
        suggestions,
        validatedRequest.tasks,
      );
    }

    // Step 4: Apply machine learning improvements
    if (validatedRequest.options?.applyML) {
      optimizedSuggestions =
        await this.applyMLImprovements(optimizedSuggestions);
    }

    // Step 5: Apply the categories
    const applied = await this.applyCategoryAssignments(
      optimizedSuggestions,
      validatedRequest.tasks,
    );

    // Step 6: Generate recommendations
    const recommendations = await this.generateOptimizationRecommendations(
      applied,
      conflicts,
    );

    const processingTime = Date.now() - startTime;

    // Record metrics
    await this.recordBulkProcessingMetrics({
      taskCount: validatedRequest.tasks.length,
      processingTime,
      optimizationApplied:
        validatedRequest.options?.optimizeDistribution ?? true,
      conflictsResolved: conflicts.length,
    });

    return {
      processed: validatedRequest.tasks.length,
      optimized: applied.filter((a) => a.optimized).length,
      conflicts,
      recommendations,
      processingTime,
    };
  }

  /**
   * Detect and resolve category conflicts
   */
  async detectAndResolveConflicts(
    tasks: any[],
    suggestions: any[],
  ): Promise<CategoryConflict[]> {
    const conflicts: CategoryConflict[] = [];

    // Build task dependency graph
    const dependencyGraph = this.buildDependencyGraph(tasks);

    for (const suggestion of suggestions) {
      const task = tasks.find((t) => t.id === suggestion.taskId);
      if (!task) continue;

      // Check dependency conflicts
      const depConflict = this.checkDependencyConflict(
        task,
        suggestion,
        dependencyGraph,
        suggestions,
      );
      if (depConflict) conflicts.push(depConflict);

      // Check timing conflicts
      const timingConflict = this.checkTimingConflict(task, suggestion, tasks);
      if (timingConflict) conflicts.push(timingConflict);

      // Check helper availability conflicts
      const helperConflict = await this.checkHelperConflict(task, suggestion);
      if (helperConflict) conflicts.push(helperConflict);

      // Check resource conflicts
      const resourceConflict = await this.checkResourceConflict(
        task,
        suggestion,
      );
      if (resourceConflict) conflicts.push(resourceConflict);
    }

    // Resolve conflicts
    const resolved = await this.resolveConflicts(conflicts, suggestions);

    return resolved;
  }

  /**
   * Build dependency graph for tasks
   */
  private buildDependencyGraph(tasks: any[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const task of tasks) {
      if (!graph.has(task.id)) {
        graph.set(task.id, new Set());
      }

      if (task.dependencies) {
        for (const dep of task.dependencies) {
          graph.get(task.id)!.add(dep);
        }
      }
    }

    return graph;
  }

  /**
   * Check for dependency conflicts
   */
  private checkDependencyConflict(
    task: any,
    suggestion: any,
    dependencyGraph: Map<string, Set<string>>,
    allSuggestions: any[],
  ): CategoryConflict | null {
    const dependencies = dependencyGraph.get(task.id);
    if (!dependencies || dependencies.size === 0) return null;

    const suggestedCategory =
      TASK_CATEGORIES[
        suggestion.suggestedCategory as keyof typeof TASK_CATEGORIES
      ];
    if (!suggestedCategory) return null;

    for (const depId of dependencies) {
      const depSuggestion = allSuggestions.find((s) => s.taskId === depId);
      if (!depSuggestion) continue;

      const depCategory =
        TASK_CATEGORIES[
          depSuggestion.suggestedCategory as keyof typeof TASK_CATEGORIES
        ];
      if (!depCategory) continue;

      // Check if categories are incompatible based on phase
      if (
        this.arePhasesIncompatible(suggestedCategory.phase, depCategory.phase)
      ) {
        return {
          taskId: task.id,
          conflictType: 'dependency',
          affectedCategories: [
            suggestion.suggestedCategory,
            depSuggestion.suggestedCategory,
          ],
          severity: 'high',
          suggestedResolution: {
            newCategory: depSuggestion.suggestedCategory,
            reason: `Task depends on ${depId} which is in ${depCategory.phase} phase`,
            confidence: 0.8,
          },
        };
      }
    }

    return null;
  }

  /**
   * Check if phases are incompatible
   */
  private arePhasesIncompatible(phase1: string, phase2: string): boolean {
    const phaseOrder = ['pre-event', 'event', 'post-event'];

    if (phase1 === 'all' || phase2 === 'all') return false;

    const index1 = phaseOrder.indexOf(phase1);
    const index2 = phaseOrder.indexOf(phase2);

    // Tasks in later phases shouldn't depend on earlier phases
    return index1 > index2;
  }

  /**
   * Check timing conflicts
   */
  private checkTimingConflict(
    task: any,
    suggestion: any,
    allTasks: any[],
  ): CategoryConflict | null {
    if (!task.timeSlot) return null;

    const suggestedCategory =
      TASK_CATEGORIES[
        suggestion.suggestedCategory as keyof typeof TASK_CATEGORIES
      ];
    if (!suggestedCategory) return null;

    // Parse time slot (e.g., "10:00-11:00")
    const [startTime] = task.timeSlot.split('-');
    const hour = parseInt(startTime.split(':')[0]);

    // Check if time conflicts with typical category timing
    const timingConflicts: Record<string, [number, number]> = {
      setup: [6, 10], // Early morning setup
      ceremony: [11, 14], // Late morning to early afternoon
      reception: [14, 22], // Afternoon to evening
      breakdown: [22, 24], // Late evening
    };

    const expectedTiming = timingConflicts[suggestion.suggestedCategory];
    if (
      expectedTiming &&
      (hour < expectedTiming[0] || hour > expectedTiming[1])
    ) {
      // Find a better category for this time
      let betterCategory = 'coordination';
      for (const [cat, timing] of Object.entries(timingConflicts)) {
        if (hour >= timing[0] && hour <= timing[1]) {
          betterCategory = cat;
          break;
        }
      }

      return {
        taskId: task.id,
        conflictType: 'timing',
        affectedCategories: [suggestion.suggestedCategory],
        severity: 'medium',
        suggestedResolution: {
          newCategory: betterCategory,
          reason: `Task scheduled at ${task.timeSlot} better fits ${betterCategory} timing`,
          confidence: 0.7,
        },
      };
    }

    return null;
  }

  /**
   * Check helper availability conflicts
   */
  private async checkHelperConflict(
    task: any,
    suggestion: any,
  ): Promise<CategoryConflict | null> {
    if (!task.helperSkills || task.helperSkills.length === 0) return null;

    // Check if helpers with required skills are available for this category
    const { data: helpers } = await supabase
      .from('helpers')
      .select('id, skills, assigned_categories')
      .contains('skills', task.helperSkills);

    if (!helpers || helpers.length === 0) {
      return {
        taskId: task.id,
        conflictType: 'helper',
        affectedCategories: [suggestion.suggestedCategory],
        severity: 'high',
        suggestedResolution: {
          newCategory: 'coordination',
          reason: 'No helpers available with required skills for this category',
          confidence: 0.6,
        },
      };
    }

    // Check if helpers are already overloaded in this category
    const categoryHelpers = helpers.filter((h) =>
      h.assigned_categories?.includes(suggestion.suggestedCategory),
    );

    if (categoryHelpers.length === 0) {
      return {
        taskId: task.id,
        conflictType: 'helper',
        affectedCategories: [suggestion.suggestedCategory],
        severity: 'medium',
        suggestedResolution: {
          newCategory: 'coordination',
          reason: 'No specialized helpers assigned to this category',
          confidence: 0.5,
        },
      };
    }

    return null;
  }

  /**
   * Check resource conflicts
   */
  private async checkResourceConflict(
    task: any,
    suggestion: any,
  ): Promise<CategoryConflict | null> {
    // Check if category has capacity for more tasks
    const { data: categoryTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('category_id', suggestion.suggestedCategory)
      .eq('status', 'pending');

    const taskCount = categoryTasks?.length || 0;
    const categoryCapacity: Record<string, number> = {
      setup: 30,
      ceremony: 15,
      reception: 40,
      breakdown: 20,
      coordination: 15,
      vendor: 10,
    };

    const capacity = categoryCapacity[suggestion.suggestedCategory] || 20;

    if (taskCount >= capacity) {
      // Find category with available capacity
      let alternativeCategory = 'coordination';
      let minLoad = 1.0;

      for (const [cat, cap] of Object.entries(categoryCapacity)) {
        const { data: catTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('category_id', cat)
          .eq('status', 'pending');

        const load = (catTasks?.length || 0) / cap;
        if (load < minLoad) {
          minLoad = load;
          alternativeCategory = cat;
        }
      }

      return {
        taskId: task.id,
        conflictType: 'resource',
        affectedCategories: [suggestion.suggestedCategory],
        severity: 'low',
        suggestedResolution: {
          newCategory: alternativeCategory,
          reason: `${suggestion.suggestedCategory} at capacity, ${alternativeCategory} has availability`,
          confidence: 0.6,
        },
      };
    }

    return null;
  }

  /**
   * Resolve detected conflicts
   */
  private async resolveConflicts(
    conflicts: CategoryConflict[],
    suggestions: any[],
  ): Promise<CategoryConflict[]> {
    // Group conflicts by task
    const conflictsByTask = new Map<string, CategoryConflict[]>();

    for (const conflict of conflicts) {
      if (!conflictsByTask.has(conflict.taskId)) {
        conflictsByTask.set(conflict.taskId, []);
      }
      conflictsByTask.get(conflict.taskId)!.push(conflict);
    }

    // Resolve conflicts for each task
    const resolved: CategoryConflict[] = [];

    for (const [taskId, taskConflicts] of conflictsByTask) {
      // Sort by severity
      const sorted = taskConflicts.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      // Take the highest severity conflict resolution
      const primaryConflict = sorted[0];

      // Update the suggestion
      const suggestionIndex = suggestions.findIndex((s) => s.taskId === taskId);
      if (suggestionIndex !== -1) {
        suggestions[suggestionIndex].suggestedCategory =
          primaryConflict.suggestedResolution.newCategory;
        suggestions[suggestionIndex].confidence =
          primaryConflict.suggestedResolution.confidence;
        suggestions[suggestionIndex].reasoning =
          `Resolved conflict: ${primaryConflict.suggestedResolution.reason}`;
      }

      resolved.push(primaryConflict);
    }

    return resolved;
  }

  /**
   * Optimize category distribution
   */
  private async optimizeCategoryDistribution(
    suggestions: any[],
    tasks: any[],
  ): Promise<any[]> {
    // Get current distribution
    const distribution = suggestions.reduce(
      (acc, s) => {
        acc[s.suggestedCategory] = (acc[s.suggestedCategory] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Get balancing recommendations
    const { recommendations, optimalDistribution } =
      await categoryAnalytics.getBalancingRecommendations(distribution);

    // Apply recommendations
    for (const rec of recommendations) {
      // Find tasks to move
      const toMove = suggestions
        .filter(
          (s) =>
            s.suggestedCategory === rec.from &&
            s.confidence < this.conflictThreshold,
        )
        .slice(0, rec.count);

      for (const suggestion of toMove) {
        suggestion.suggestedCategory = rec.to;
        suggestion.reasoning = `Optimized for balance: ${rec.reason}`;
        suggestion.confidence = 0.7;
      }
    }

    return suggestions;
  }

  /**
   * Apply machine learning improvements
   */
  private async applyMLImprovements(suggestions: any[]): Promise<any[]> {
    // Fetch ML model improvements
    const improvements = await this.fetchMLModelImprovements();

    if (!improvements || improvements.length === 0) {
      return suggestions;
    }

    // Apply improvements to suggestions
    for (const suggestion of suggestions) {
      const improvement = improvements.find(
        (i) => i.categoryId === suggestion.suggestedCategory,
      );

      if (
        improvement &&
        improvement.newAccuracy > improvement.previousAccuracy
      ) {
        // Boost confidence based on ML improvements
        const boost =
          (improvement.newAccuracy - improvement.previousAccuracy) * 0.5;
        suggestion.confidence = Math.min(1, suggestion.confidence + boost);
        suggestion.reasoning = `${suggestion.reasoning} (ML-enhanced)`;
      }
    }

    // Record ML application
    await this.recordMLApplication(suggestions.length, improvements);

    return suggestions;
  }

  /**
   * Fetch ML model improvements
   */
  private async fetchMLModelImprovements(): Promise<any[]> {
    try {
      const { data } = await supabase
        .from('ml_model_improvements')
        .select('*')
        .eq('model_version', this.mlModelVersion)
        .order('timestamp', { ascending: false })
        .limit(1);

      return data?.[0]?.improvements || [];
    } catch (error) {
      console.error('Failed to fetch ML improvements:', error);
      return [];
    }
  }

  /**
   * Apply category assignments to tasks
   */
  private async applyCategoryAssignments(
    suggestions: any[],
    tasks: any[],
  ): Promise<any[]> {
    const applied = [];

    for (const suggestion of suggestions) {
      const task = tasks.find((t) => t.id === suggestion.taskId);
      if (!task) continue;

      const wasOptimized =
        task.currentCategory !== suggestion.suggestedCategory;

      // Update task in database
      const { error } = await supabase
        .from('tasks')
        .update({
          category_id: suggestion.suggestedCategory,
          category_confidence: suggestion.confidence,
          category_reasoning: suggestion.reasoning,
          last_categorized_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (!error) {
        applied.push({
          taskId: task.id,
          category: suggestion.suggestedCategory,
          optimized: wasOptimized,
        });

        // Store prediction for ML training
        await this.storePrediction(task, suggestion);
      }
    }

    return applied;
  }

  /**
   * Store prediction for ML training
   */
  private async storePrediction(task: any, suggestion: any): Promise<void> {
    try {
      await supabase.from('ai_category_predictions').insert({
        task_id: task.id,
        predicted_category: suggestion.suggestedCategory,
        confidence: suggestion.confidence,
        actual_category: task.currentCategory,
        features: {
          title: task.title,
          description: task.description,
          timeSlot: task.timeSlot,
          dependencies: task.dependencies,
          helperSkills: task.helperSkills,
        },
        model_version: this.mlModelVersion,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to store prediction:', error);
    }
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(
    applied: any[],
    conflicts: CategoryConflict[],
  ): Promise<any[]> {
    const recommendations = [];

    // Analyze optimization results
    const optimizationRate =
      applied.filter((a) => a.optimized).length / applied.length;

    if (optimizationRate > 0.3) {
      recommendations.push({
        type: 'optimization',
        message: `${Math.round(optimizationRate * 100)}% of tasks were recategorized for better efficiency`,
        impact: 'high',
      });
    }

    // Analyze conflicts
    const highConflicts = conflicts.filter((c) => c.severity === 'high');
    if (highConflicts.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `${highConflicts.length} high-severity conflicts were resolved`,
        impact: 'high',
        details: highConflicts.map((c) => c.suggestedResolution.reason),
      });
    }

    // Get category-specific recommendations
    const categoryMetrics = await categoryAnalytics.getComparativeAnalytics();
    recommendations.push(
      ...categoryMetrics.recommendations.map((r) => ({
        type: 'insight',
        message: r,
        impact: 'medium',
      })),
    );

    return recommendations;
  }

  /**
   * Record bulk processing metrics
   */
  private async recordBulkProcessingMetrics(metrics: any): Promise<void> {
    try {
      await supabase.from('bulk_processing_metrics').insert({
        ...metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record metrics:', error);
    }
  }

  /**
   * Record ML application metrics
   */
  private async recordMLApplication(
    taskCount: number,
    improvements: any[],
  ): Promise<void> {
    try {
      await supabase.from('ml_application_metrics').insert({
        tasks_processed: taskCount,
        improvements_applied: improvements.length,
        model_version: this.mlModelVersion,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record ML application:', error);
    }
  }

  /**
   * Train ML model with feedback
   */
  async trainMLModel(
    feedback: Array<{
      taskId: string;
      correctCategory: string;
      feedback: string;
    }>,
  ): Promise<MachineLearningUpdate> {
    // Collect training data
    const trainingData = [];

    for (const item of feedback) {
      const { data: prediction } = await supabase
        .from('ai_category_predictions')
        .select('*')
        .eq('task_id', item.taskId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (prediction) {
        trainingData.push({
          ...prediction,
          correct_category: item.correctCategory,
          feedback: item.feedback,
        });
      }
    }

    // Process training data (simplified - in production would use actual ML pipeline)
    const improvements = await this.processTrainingData(trainingData);

    // Update model version
    const newVersion = this.incrementModelVersion();

    const update: MachineLearningUpdate = {
      modelVersion: newVersion,
      improvements,
      timestamp: new Date().toISOString(),
    };

    // Store update
    await supabase.from('ml_model_improvements').insert(update);

    return update;
  }

  /**
   * Process training data for ML improvements
   */
  private async processTrainingData(trainingData: any[]): Promise<any[]> {
    const categoryAccuracy: Record<string, { correct: number; total: number }> =
      {};

    for (const data of trainingData) {
      const category = data.predicted_category;
      if (!categoryAccuracy[category]) {
        categoryAccuracy[category] = { correct: 0, total: 0 };
      }

      categoryAccuracy[category].total++;
      if (data.predicted_category === data.correct_category) {
        categoryAccuracy[category].correct++;
      }
    }

    const improvements = [];

    for (const [categoryId, stats] of Object.entries(categoryAccuracy)) {
      const previousAccuracy = stats.correct / stats.total;
      // Simulate improvement (in production would retrain model)
      const newAccuracy = Math.min(previousAccuracy + 0.05, 0.95);

      improvements.push({
        categoryId,
        previousAccuracy,
        newAccuracy,
        samplesProcessed: stats.total,
      });
    }

    return improvements;
  }

  /**
   * Increment model version
   */
  private incrementModelVersion(): string {
    const parts = this.mlModelVersion.split('.');
    const patch = parseInt(parts[2]) + 1;
    this.mlModelVersion = `${parts[0]}.${parts[1]}.${patch}`;
    return this.mlModelVersion;
  }
}

// Export singleton instance
export const categoryOptimization = new CategoryOptimizationService();
