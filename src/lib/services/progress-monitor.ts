/**
 * WS-142: ProgressMonitor - Monitor User Progress Toward Key Milestones
 * Real-time progress tracking and automated milestone advancement
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';
import {
  milestoneService,
  Milestone,
  MilestoneProgress,
} from './milestone-service';
import { activityTracker } from './activity-tracker';

export interface ProgressRule {
  ruleId: string;
  milestoneType: string;
  triggerEvent: string;
  progressCalculation: ProgressCalculation;
  conditions: ProgressCondition[];
  isActive: boolean;
  priority: number;
}

export interface ProgressCalculation {
  calculationType: 'increment' | 'set_value' | 'percentage' | 'custom';
  value: number;
  formula?: string;
  aggregation?: 'sum' | 'count' | 'max' | 'min' | 'average';
  timeframe?: '1d' | '7d' | '30d' | 'all_time';
}

export interface ProgressCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in_array';
  value: any;
}

export interface ProgressEvent {
  eventId: string;
  userId: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  source: 'user_action' | 'system_event' | 'integration' | 'manual';
}

export interface ProgressInsight {
  userId: string;
  milestoneId: string;
  insightType:
    | 'acceleration'
    | 'deceleration'
    | 'stagnation'
    | 'completion_risk';
  message: string;
  recommendations: string[];
  severity: 'low' | 'medium' | 'high';
  detectedAt: Date;
}

export interface ProgressMetrics {
  userId: string;
  period: '1d' | '7d' | '30d';
  totalProgressEvents: number;
  activeMilestones: number;
  avgProgressPerMilestone: number;
  fastestProgressing: Milestone[];
  slowestProgressing: Milestone[];
  riskOfStagnation: boolean;
  projectedCompletions: MilestoneProjection[];
}

export interface MilestoneProjection {
  milestoneId: string;
  currentProgress: number;
  averageVelocity: number; // progress per day
  projectedCompletionDate: Date;
  confidenceLevel: number; // 0-100
  requiredVelocity: number; // to meet due date if exists
}

export class ProgressMonitor {
  private supabase: SupabaseClient;
  private cachePrefix = 'progress_monitor:';
  private progressRules: Map<string, ProgressRule> = new Map();

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
    this.initializeProgressRules();
  }

  /**
   * Initialize progress tracking for a user
   */
  async initializeUserProgress(
    userId: string,
    organizationId?: string,
  ): Promise<void> {
    try {
      // Set up real-time progress monitoring
      await this.setupProgressListeners(userId);

      // Initialize baseline metrics
      await this.recordBaselineMetrics(userId);

      // Start monitoring active milestones
      const activeMilestones = await milestoneService.getUserMilestones(
        userId,
        { includeAchieved: false },
      );

      for (const milestone of activeMilestones) {
        await this.startMilestoneMonitoring(milestone);
      }

      console.log(`Progress monitoring initialized for user ${userId}`);
    } catch (error) {
      console.error('Error initializing user progress:', error);
      throw error;
    }
  }

  /**
   * Process a progress event and update relevant milestones
   */
  async processProgressEvent(
    event: ProgressEvent,
  ): Promise<MilestoneProgress[]> {
    try {
      const appliedRules = await this.findApplicableRules(event);
      const progressUpdates: MilestoneProgress[] = [];

      for (const rule of appliedRules) {
        try {
          const progressUpdate = await this.applyProgressRule(event, rule);
          if (progressUpdate) {
            progressUpdates.push(progressUpdate);
          }
        } catch (error) {
          console.warn(`Failed to apply progress rule ${rule.ruleId}:`, error);
        }
      }

      // Store event for analytics
      await this.storeProgressEvent(event);

      // Check for progress insights
      setTimeout(() => this.analyzeProgressInsights(event.userId), 1000);

      return progressUpdates;
    } catch (error) {
      console.error('Error processing progress event:', error);
      return [];
    }
  }

  /**
   * Get real-time progress metrics for a user
   */
  async getProgressMetrics(
    userId: string,
    period: '1d' | '7d' | '30d' = '7d',
  ): Promise<ProgressMetrics> {
    const cacheKey = `${this.cachePrefix}metrics:${userId}:${period}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Cache read error for progress metrics:', error);
    }

    try {
      const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get progress events
      const { data: events, error: eventsError } = await this.supabase
        .from('milestone_progress_history')
        .select('*')
        .eq('user_id', userId)
        .gte('progress_date', startDate.toISOString());

      if (eventsError) throw eventsError;

      // Get active milestones
      const activeMilestones = await milestoneService.getUserMilestones(
        userId,
        { includeAchieved: false },
      );

      // Calculate metrics
      const totalProgressEvents = events?.length || 0;
      const avgProgressPerMilestone =
        activeMilestones.length > 0
          ? totalProgressEvents / activeMilestones.length
          : 0;

      // Analyze velocity and projections
      const projections = await this.calculateProjections(
        activeMilestones,
        events || [],
      );

      // Identify fastest and slowest progressing
      const milestonesWithVelocity = projections
        .map((p) => ({
          ...activeMilestones.find((m) => m.id === p.milestoneId)!,
          velocity: p.averageVelocity,
        }))
        .filter((m) => m.velocity !== undefined);

      const fastestProgressing = milestonesWithVelocity
        .sort((a, b) => b.velocity - a.velocity)
        .slice(0, 3);

      const slowestProgressing = milestonesWithVelocity
        .sort((a, b) => a.velocity - b.velocity)
        .slice(0, 3);

      const metrics: ProgressMetrics = {
        userId,
        period,
        totalProgressEvents,
        activeMilestones: activeMilestones.length,
        avgProgressPerMilestone,
        fastestProgressing,
        slowestProgressing,
        riskOfStagnation:
          avgProgressPerMilestone < 1 && activeMilestones.length > 0,
        projectedCompletions: projections,
      };

      // Cache metrics
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(metrics)); // 5 minutes cache
      } catch (error) {
        console.warn('Cache write error for progress metrics:', error);
      }

      return metrics;
    } catch (error) {
      console.error('Error calculating progress metrics:', error);
      return this.getEmptyProgressMetrics(userId, period);
    }
  }

  /**
   * Analyze progress patterns and generate insights
   */
  async analyzeProgressInsights(userId: string): Promise<ProgressInsight[]> {
    try {
      const metrics = await this.getProgressMetrics(userId, '7d');
      const insights: ProgressInsight[] = [];

      // Check for stagnation
      if (metrics.riskOfStagnation) {
        insights.push({
          userId,
          milestoneId: '', // General insight
          insightType: 'stagnation',
          message:
            'Progress has slowed significantly across multiple milestones',
          recommendations: [
            'Schedule check-in to identify blockers',
            'Review milestone priorities',
            'Consider breaking down complex milestones',
          ],
          severity: 'high',
          detectedAt: new Date(),
        });
      }

      // Check individual milestone risks
      for (const projection of metrics.projectedCompletions) {
        if (projection.confidenceLevel < 50) {
          const milestone = await milestoneService
            .getUserMilestones(userId)
            .then((milestones) =>
              milestones.find((m) => m.id === projection.milestoneId),
            );

          if (milestone) {
            insights.push({
              userId,
              milestoneId: projection.milestoneId,
              insightType: 'completion_risk',
              message: `${milestone.title} is at risk of not being completed on time`,
              recommendations: [
                'Increase focus on this milestone',
                'Break down into smaller tasks',
                'Consider extending deadline',
              ],
              severity: milestone.isRequired ? 'high' : 'medium',
              detectedAt: new Date(),
            });
          }
        }
      }

      // Store insights for later retrieval
      await this.storeProgressInsights(insights);

      return insights;
    } catch (error) {
      console.error('Error analyzing progress insights:', error);
      return [];
    }
  }

  /**
   * Set up automated progress tracking rules
   */
  async setupAutomatedTracking(): Promise<void> {
    try {
      const rules: ProgressRule[] = [
        // Onboarding milestones
        {
          ruleId: 'profile_completion',
          milestoneType: 'onboarding',
          triggerEvent: 'profile_updated',
          progressCalculation: {
            calculationType: 'set_value',
            value: 1,
            aggregation: 'count',
          },
          conditions: [
            { field: 'profile_completeness', operator: 'equals', value: 100 },
          ],
          isActive: true,
          priority: 1,
        },
        // Feature adoption milestones
        {
          ruleId: 'client_creation',
          milestoneType: 'feature_adoption',
          triggerEvent: 'client_created',
          progressCalculation: {
            calculationType: 'increment',
            value: 1,
            aggregation: 'count',
          },
          conditions: [],
          isActive: true,
          priority: 2,
        },
        // Engagement milestones
        {
          ruleId: 'daily_login',
          milestoneType: 'engagement',
          triggerEvent: 'user_login',
          progressCalculation: {
            calculationType: 'increment',
            value: 1,
            aggregation: 'count',
            timeframe: '1d',
          },
          conditions: [
            { field: 'login_type', operator: 'equals', value: 'daily' },
          ],
          isActive: true,
          priority: 3,
        },
      ];

      for (const rule of rules) {
        this.progressRules.set(rule.ruleId, rule);
      }

      console.log(`Set up ${rules.length} automated tracking rules`);
    } catch (error) {
      console.error('Error setting up automated tracking:', error);
    }
  }

  // Private helper methods

  private async initializeProgressRules(): Promise<void> {
    await this.setupAutomatedTracking();

    // Load additional rules from database if they exist
    try {
      const { data: customRules, error } = await this.supabase
        .from('progress_rules')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.warn('Could not load custom progress rules:', error);
        return;
      }

      if (customRules) {
        customRules.forEach((rule) => {
          this.progressRules.set(rule.rule_id, {
            ruleId: rule.rule_id,
            milestoneType: rule.milestone_type,
            triggerEvent: rule.trigger_event,
            progressCalculation: rule.progress_calculation,
            conditions: rule.conditions || [],
            isActive: rule.is_active,
            priority: rule.priority || 5,
          });
        });
      }
    } catch (error) {
      console.warn('Error loading custom progress rules:', error);
    }
  }

  private async setupProgressListeners(userId: string): Promise<void> {
    // Set up Redis pub/sub listeners for real-time progress tracking
    try {
      await redis.subscribe(`user_events:${userId}`);
      console.log(`Set up progress listeners for user ${userId}`);
    } catch (error) {
      console.warn('Could not set up Redis listeners:', error);
    }
  }

  private async recordBaselineMetrics(userId: string): Promise<void> {
    try {
      const baselineKey = `${this.cachePrefix}baseline:${userId}`;
      const baseline = {
        initiatedAt: new Date(),
        activeMilestones: await milestoneService.getUserMilestones(userId, {
          includeAchieved: false,
        }),
        initialProgressSum: 0,
      };

      baseline.initialProgressSum = baseline.activeMilestones.reduce(
        (sum, milestone) => sum + milestone.currentValue,
        0,
      );

      await redis.setex(baselineKey, 86400, JSON.stringify(baseline)); // 24 hours
    } catch (error) {
      console.warn('Error recording baseline metrics:', error);
    }
  }

  private async startMilestoneMonitoring(milestone: Milestone): Promise<void> {
    try {
      const monitoringKey = `${this.cachePrefix}monitoring:${milestone.id}`;
      const monitoringData = {
        milestoneId: milestone.id,
        userId: milestone.userId,
        startedAt: new Date(),
        lastProgressUpdate: milestone.updatedAt,
        initialValue: milestone.currentValue,
      };

      await redis.setex(
        monitoringKey,
        86400 * 7,
        JSON.stringify(monitoringData),
      ); // 7 days
    } catch (error) {
      console.warn(
        `Error starting monitoring for milestone ${milestone.id}:`,
        error,
      );
    }
  }

  private async findApplicableRules(
    event: ProgressEvent,
  ): Promise<ProgressRule[]> {
    const applicableRules: ProgressRule[] = [];

    for (const [ruleId, rule] of this.progressRules.entries()) {
      if (!rule.isActive) continue;

      // Check if event type matches
      if (rule.triggerEvent === event.eventType) {
        // Check conditions
        const conditionsMet = rule.conditions.every((condition) =>
          this.evaluateCondition(condition, event.eventData),
        );

        if (conditionsMet) {
          applicableRules.push(rule);
        }
      }
    }

    // Sort by priority
    return applicableRules.sort((a, b) => a.priority - b.priority);
  }

  private async applyProgressRule(
    event: ProgressEvent,
    rule: ProgressRule,
  ): Promise<MilestoneProgress | null> {
    try {
      // Find relevant milestones for this rule
      const milestones = await milestoneService.getUserMilestones(
        event.userId,
        {
          type: rule.milestoneType as any,
          includeAchieved: false,
        },
      );

      if (milestones.length === 0) return null;

      // Apply progress calculation to the first matching milestone
      const milestone = milestones[0];
      let newValue = milestone.currentValue;

      switch (rule.progressCalculation.calculationType) {
        case 'increment':
          newValue += rule.progressCalculation.value;
          break;
        case 'set_value':
          newValue = rule.progressCalculation.value;
          break;
        case 'percentage':
          newValue = Math.min(
            milestone.targetValue,
            milestone.currentValue +
              (milestone.targetValue * rule.progressCalculation.value) / 100,
          );
          break;
      }

      // Update milestone progress
      return await milestoneService.updateProgress(
        milestone.id,
        newValue,
        'automatic',
        {
          ruleId: rule.ruleId,
          triggerEvent: event.eventType,
          eventData: event.eventData,
        },
      );
    } catch (error) {
      console.error('Error applying progress rule:', error);
      return null;
    }
  }

  private evaluateCondition(
    condition: ProgressCondition,
    eventData: Record<string, any>,
  ): boolean {
    const fieldValue = eventData[condition.field];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'greater_than':
        return fieldValue > condition.value;
      case 'less_than':
        return fieldValue < condition.value;
      case 'contains':
        return (
          typeof fieldValue === 'string' && fieldValue.includes(condition.value)
        );
      case 'in_array':
        return (
          Array.isArray(condition.value) && condition.value.includes(fieldValue)
        );
      default:
        return false;
    }
  }

  private async calculateProjections(
    milestones: Milestone[],
    progressHistory: any[],
  ): Promise<MilestoneProjection[]> {
    const projections: MilestoneProjection[] = [];

    for (const milestone of milestones) {
      try {
        // Calculate velocity from progress history
        const milestoneProgress = progressHistory.filter(
          (p) => p.milestone_id === milestone.id,
        );

        let averageVelocity = 0;
        if (milestoneProgress.length > 1) {
          const totalProgress = milestoneProgress.reduce(
            (sum, p) => sum + p.increment_amount,
            0,
          );
          const timeSpan = milestoneProgress.length; // Simplified - days
          averageVelocity = totalProgress / timeSpan;
        }

        // Project completion
        const remainingProgress =
          milestone.targetValue - milestone.currentValue;
        const daysToComplete =
          averageVelocity > 0 ? remainingProgress / averageVelocity : Infinity;

        const projectedCompletionDate = new Date(
          Date.now() + daysToComplete * 24 * 60 * 60 * 1000,
        );

        // Calculate confidence based on velocity consistency
        const confidenceLevel = Math.min(
          100,
          Math.max(10, averageVelocity * 10 + milestoneProgress.length * 5),
        );

        projections.push({
          milestoneId: milestone.id,
          currentProgress: milestone.completionPercentage,
          averageVelocity,
          projectedCompletionDate,
          confidenceLevel: Math.round(confidenceLevel),
          requiredVelocity: milestone.dueDate
            ? remainingProgress /
              Math.max(
                1,
                Math.ceil(
                  (milestone.dueDate.getTime() - Date.now()) /
                    (24 * 60 * 60 * 1000),
                ),
              )
            : 0,
        });
      } catch (error) {
        console.warn(
          `Error calculating projection for milestone ${milestone.id}:`,
          error,
        );
      }
    }

    return projections;
  }

  private async storeProgressEvent(event: ProgressEvent): Promise<void> {
    try {
      const { error } = await this.supabase.from('progress_events').insert({
        event_id: event.eventId,
        user_id: event.userId,
        event_type: event.eventType,
        event_data: event.eventData,
        timestamp: event.timestamp.toISOString(),
        source: event.source,
      });

      if (error) throw error;
    } catch (error) {
      console.warn('Error storing progress event:', error);
    }
  }

  private async storeProgressInsights(
    insights: ProgressInsight[],
  ): Promise<void> {
    if (insights.length === 0) return;

    try {
      const insightRecords = insights.map((insight) => ({
        user_id: insight.userId,
        milestone_id: insight.milestoneId || null,
        insight_type: insight.insightType,
        message: insight.message,
        recommendations: insight.recommendations,
        severity: insight.severity,
        detected_at: insight.detectedAt.toISOString(),
      }));

      const { error } = await this.supabase
        .from('progress_insights')
        .insert(insightRecords);

      if (error) throw error;
    } catch (error) {
      console.warn('Error storing progress insights:', error);
    }
  }

  private getEmptyProgressMetrics(
    userId: string,
    period: '1d' | '7d' | '30d',
  ): ProgressMetrics {
    return {
      userId,
      period,
      totalProgressEvents: 0,
      activeMilestones: 0,
      avgProgressPerMilestone: 0,
      fastestProgressing: [],
      slowestProgressing: [],
      riskOfStagnation: false,
      projectedCompletions: [],
    };
  }
}

// Export singleton instance
export const progressMonitor = new ProgressMonitor();
