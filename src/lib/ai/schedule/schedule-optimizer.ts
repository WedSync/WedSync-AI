/**
 * WS-162: AI-Powered Helper Schedule Integration
 * Advanced ML-based schedule conflict prediction and optimization
 */

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import { z } from 'zod';

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const redis = Redis.fromEnv();

// Schema definitions
const ScheduleDataSchema = z.object({
  id: z.string(),
  helper_id: z.string(),
  task_id: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  estimated_duration: z.number(),
  actual_duration: z.number().optional(),
  difficulty_level: z.number().min(1).max(5),
  required_skills: z.array(z.string()),
  dependencies: z.array(z.string()),
  location: z.string().optional(),
});

const ConflictPredictionSchema = z.object({
  type: z.enum([
    'high_probability_conflict',
    'time_overlap',
    'resource_conflict',
    'skill_mismatch',
  ]),
  confidence: z.number().min(0).max(1),
  affected_schedules: z.array(z.string()),
  suggested_adjustments: z.array(
    z.object({
      schedule_id: z.string(),
      adjustment_type: z.string(),
      new_start_time: z.string().optional(),
      new_end_time: z.string().optional(),
      reasoning: z.string(),
    }),
  ),
  risk_factors: z.array(z.string()),
});

const ScheduleOptimizationSchema = z.object({
  optimized_schedules: z.array(ScheduleDataSchema),
  conflicts_prevented: z.number(),
  efficiency_improvement: z.number(),
  ai_recommendations: z.array(z.string()),
  workload_balance_score: z.number(),
  predicted_success_rate: z.number(),
});

export type ScheduleData = z.infer<typeof ScheduleDataSchema>;
export type ConflictPrediction = z.infer<typeof ConflictPredictionSchema>;
export type ScheduleOptimization = z.infer<typeof ScheduleOptimizationSchema>;

/**
 * AI-Powered Schedule Optimizer
 */
export class AIScheduleOptimizer {
  private cachePrefix = 'schedule:optimization:';
  private modelVersion = 'gpt-4-turbo-preview';
  private conflictMLModel: ConflictMLModel;

  constructor() {
    this.conflictMLModel = new ConflictMLModel();
  }

  /**
   * Main optimization function for helper schedules
   */
  async optimizeHelperSchedules(
    weddingId: string,
  ): Promise<ScheduleOptimization> {
    const startTime = Date.now();

    try {
      // Get all necessary data
      const [
        existingSchedules,
        helperPreferences,
        conflictHistory,
        taskDurations,
        weddingConstraints,
      ] = await Promise.all([
        this.getExistingSchedules(weddingId),
        this.getHelperPreferences(weddingId),
        this.getConflictHistory(weddingId),
        this.getHistoricalTaskDurations(),
        this.getWeddingConstraints(weddingId),
      ]);

      // Predict task durations using ML
      const predictedDurations = await this.predictTaskDurations(
        existingSchedules.map((s) => s.task_id),
        taskDurations,
      );

      // Generate optimization constraints
      const constraints = await this.generateConstraints(
        conflictHistory,
        helperPreferences,
        weddingConstraints,
      );

      // Run AI-powered optimization
      const optimization = await this.runScheduleOptimization({
        schedules: existingSchedules,
        preferences: helperPreferences,
        constraints: constraints,
        predictions: predictedDurations,
        weddingId,
      });

      // Validate optimization results
      const validatedOptimization = await this.validateOptimization(
        optimization,
        weddingConstraints,
      );

      // Cache results for performance
      await this.cacheOptimizationResult(weddingId, validatedOptimization);

      await this.recordMetrics(
        'schedule_optimization',
        Date.now() - startTime,
        {
          wedding_id: weddingId,
          schedules_optimized: existingSchedules.length,
          conflicts_prevented: validatedOptimization.conflicts_prevented,
        },
      );

      return validatedOptimization;
    } catch (error) {
      console.error('Schedule optimization error:', error);
      throw new Error(`Schedule optimization failed: ${error.message}`);
    }
  }

  /**
   * Predict schedule conflicts using ML
   */
  async predictScheduleConflicts(
    schedule: ScheduleData,
  ): Promise<ConflictPrediction[]> {
    try {
      // Extract features for ML prediction
      const features = this.extractScheduleFeatures(schedule);

      // Get ML-based conflict probability
      const conflictProbability = await this.conflictMLModel.predict(features);

      if (conflictProbability < 0.3) {
        return []; // No significant conflict risk
      }

      // Get detailed conflict analysis from AI
      const aiAnalysis = await this.getAIConflictAnalysis(
        schedule,
        conflictProbability,
      );

      // Combine ML and AI predictions
      const predictions = await this.combineConflictPredictions(
        conflictProbability,
        aiAnalysis,
        schedule,
      );

      return predictions;
    } catch (error) {
      console.error('Conflict prediction error:', error);
      return [
        {
          type: 'high_probability_conflict',
          confidence: 0.5,
          affected_schedules: [schedule.id],
          suggested_adjustments: [],
          risk_factors: ['prediction_error'],
        },
      ];
    }
  }

  /**
   * Intelligent task duration estimation
   */
  async predictTaskDurations(
    taskIds: string[],
    historicalData: any[],
  ): Promise<Map<string, number>> {
    const predictions = new Map<string, number>();

    for (const taskId of taskIds) {
      try {
        // Get task details
        const taskDetails = await this.getTaskDetails(taskId);

        // Filter relevant historical data
        const relevantHistory = historicalData.filter(
          (h) =>
            h.task_type === taskDetails.type &&
            h.difficulty_level === taskDetails.difficulty_level,
        );

        if (relevantHistory.length >= 3) {
          // Use statistical analysis for duration prediction
          const durations = relevantHistory.map((h) => h.actual_duration);
          const avgDuration =
            durations.reduce((a, b) => a + b, 0) / durations.length;
          const stdDev = Math.sqrt(
            durations.reduce(
              (acc, val) => acc + Math.pow(val - avgDuration, 2),
              0,
            ) / durations.length,
          );

          // Add buffer based on complexity and uncertainty
          const complexityMultiplier = 1 + taskDetails.complexity_score * 0.1;
          const uncertaintyBuffer = stdDev * 0.5;

          predictions.set(
            taskId,
            Math.round(avgDuration * complexityMultiplier + uncertaintyBuffer),
          );
        } else {
          // Use AI for tasks with limited historical data
          const aiPrediction =
            await this.getAITaskDurationPrediction(taskDetails);
          predictions.set(taskId, aiPrediction);
        }
      } catch (error) {
        console.error(`Duration prediction error for task ${taskId}:`, error);
        // Fallback to conservative estimate
        predictions.set(taskId, 60); // 60 minutes default
      }
    }

    return predictions;
  }

  /**
   * Smart notification timing optimization
   */
  async optimizeNotificationTiming(
    userId: string,
    notificationType: string,
    scheduleContext: any,
  ): Promise<{
    optimal_time: string;
    confidence: number;
    reasoning: string;
  }> {
    try {
      // Get user behavior patterns
      const userBehavior = await this.getUserBehaviorPatterns(userId);

      // Get notification history and engagement
      const notificationHistory = await this.getNotificationHistory(
        userId,
        notificationType,
      );

      // Analyze schedule context
      const contextAnalysis =
        await this.analyzeScheduleContext(scheduleContext);

      // Use AI to determine optimal timing
      const optimizationPrompt = `
        Optimize notification timing for wedding helper:
        
        User Behavior:
        - Timezone: ${userBehavior.timezone}
        - Active hours: ${JSON.stringify(userBehavior.active_hours)}
        - Response patterns: ${JSON.stringify(userBehavior.response_patterns)}
        
        Notification History:
        - Type: ${notificationType}
        - Previous engagement: ${JSON.stringify(notificationHistory.engagement_by_time)}
        - Best performing times: ${JSON.stringify(notificationHistory.best_times)}
        
        Schedule Context:
        - Urgency level: ${contextAnalysis.urgency}
        - Task complexity: ${contextAnalysis.complexity}
        - Dependencies: ${JSON.stringify(contextAnalysis.dependencies)}
        
        Determine the optimal notification time considering:
        1. User's historical engagement patterns
        2. Schedule urgency and context
        3. Time zone and personal preferences
        4. Wedding day proximity
        
        Return JSON with: optimal_time (ISO string), confidence (0-1), reasoning
      `;

      const response = await openai.chat.completions.create({
        model: this.modelVersion,
        messages: [
          {
            role: 'system',
            content:
              'You are an AI notification timing optimizer for wedding planning.',
          },
          {
            role: 'user',
            content: optimizationPrompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      return {
        optimal_time: result.optimal_time || new Date().toISOString(),
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || 'AI-optimized based on user patterns',
      };
    } catch (error) {
      console.error('Notification timing optimization error:', error);
      return {
        optimal_time: new Date().toISOString(),
        confidence: 0.3,
        reasoning: 'Fallback timing due to optimization error',
      };
    }
  }

  /**
   * Intelligent helper workload balancing
   */
  async balanceHelperWorkloads(
    weddingId: string,
    schedules: ScheduleData[],
  ): Promise<{
    balanced_schedules: ScheduleData[];
    workload_scores: Map<string, number>;
    recommendations: string[];
  }> {
    try {
      // Calculate current workload distribution
      const workloadDistribution =
        await this.calculateWorkloadDistribution(schedules);

      // Get helper capabilities and preferences
      const helperCapabilities = await this.getHelperCapabilities(weddingId);

      // Identify imbalances
      const imbalances = this.identifyWorkloadImbalances(
        workloadDistribution,
        helperCapabilities,
      );

      if (imbalances.length === 0) {
        return {
          balanced_schedules: schedules,
          workload_scores: workloadDistribution,
          recommendations: ['Workload is already well-balanced'],
        };
      }

      // Use AI to generate rebalancing strategy
      const rebalancingStrategy = await this.generateRebalancingStrategy(
        schedules,
        workloadDistribution,
        helperCapabilities,
        imbalances,
      );

      // Apply rebalancing
      const balancedSchedules = await this.applyWorkloadRebalancing(
        schedules,
        rebalancingStrategy,
      );

      // Calculate new workload scores
      const newWorkloadScores =
        await this.calculateWorkloadDistribution(balancedSchedules);

      return {
        balanced_schedules: balancedSchedules,
        workload_scores: newWorkloadScores,
        recommendations: rebalancingStrategy.recommendations,
      };
    } catch (error) {
      console.error('Workload balancing error:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getExistingSchedules(
    weddingId: string,
  ): Promise<ScheduleData[]> {
    const { data, error } = await supabase
      .from('helper_schedules')
      .select(
        `
        id,
        helper_id,
        task_id,
        start_time,
        end_time,
        estimated_duration,
        actual_duration,
        difficulty_level,
        required_skills,
        dependencies,
        location
      `,
      )
      .eq('wedding_id', weddingId);

    if (error) throw error;
    return data?.map((d) => ScheduleDataSchema.parse(d)) || [];
  }

  private async getHelperPreferences(weddingId: string) {
    const { data, error } = await supabase
      .from('helper_preferences')
      .select('*')
      .eq('wedding_id', weddingId);

    if (error) throw error;
    return data || [];
  }

  private async getConflictHistory(weddingId: string) {
    const { data, error } = await supabase
      .from('schedule_conflicts')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }

  private async getHistoricalTaskDurations() {
    const { data, error } = await supabase
      .from('task_duration_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;
    return data || [];
  }

  private extractScheduleFeatures(schedule: ScheduleData): number[] {
    // Extract numerical features for ML model
    return [
      new Date(schedule.start_time).getHours(), // Hour of day
      new Date(schedule.start_time).getDay(), // Day of week
      schedule.estimated_duration,
      schedule.difficulty_level,
      schedule.required_skills.length,
      schedule.dependencies.length,
    ];
  }

  private async recordMetrics(
    operation: string,
    duration: number,
    metadata: any,
  ) {
    try {
      await supabase.from('ai_schedule_metrics').insert({
        operation,
        duration_ms: duration,
        metadata,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Metrics recording error:', error);
    }
  }
}

/**
 * ML Model for conflict prediction
 */
class ConflictMLModel {
  async predict(features: number[]): Promise<number> {
    // Simplified ML prediction - in production, this would use a trained model
    // For now, using heuristic-based prediction

    const [hour, day, duration, difficulty, skillCount, depCount] = features;

    let conflictScore = 0;

    // Peak hours increase conflict probability
    if (hour >= 9 && hour <= 17) conflictScore += 0.2;

    // Weekend work increases complexity
    if (day === 0 || day === 6) conflictScore += 0.1;

    // Long duration tasks have higher conflict risk
    if (duration > 120) conflictScore += 0.15;

    // High difficulty increases risk
    if (difficulty >= 4) conflictScore += 0.2;

    // Multiple skills required increase complexity
    if (skillCount > 3) conflictScore += 0.1;

    // Dependencies increase risk
    if (depCount > 2) conflictScore += 0.15;

    return Math.min(conflictScore, 0.95);
  }
}

// Export singleton instance
export const aiScheduleOptimizer = new AIScheduleOptimizer();
