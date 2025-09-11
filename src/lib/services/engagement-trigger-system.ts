/**
 * WS-133: Advanced Engagement Trigger System
 * Automated proactive engagement system for customer success
 */

import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  addDays,
  addHours,
  addMinutes,
  differenceInDays,
  differenceInHours,
  isAfter,
  isBefore,
} from 'date-fns';
import { redis } from '@/lib/redis';

export interface TriggerDefinition {
  id: string;
  name: string;
  description: string;
  trigger_category: TriggerCategory;
  trigger_type: TriggerType;
  conditions: TriggerCondition[];
  actions: TriggerAction[];
  priority: TriggerPriority;
  frequency_limit: FrequencyLimit;
  target_audience: TargetAudience;
  a_b_test_config?: ABTestConfig;
  is_active: boolean;
  effectiveness_metrics: EffectivenessMetrics;
  created_at: Date;
  updated_at: Date;
}

export interface UserTriggerInstance {
  id: string;
  user_id: string;
  organization_id?: string;
  trigger_definition_id: string;
  trigger_name: string;
  trigger_category: TriggerCategory;
  status: TriggerStatus;
  scheduled_for?: Date;
  triggered_at?: Date;
  completed_at?: Date;
  condition_data: Record<string, any>;
  action_results: ActionResult[];
  user_response?: UserResponse;
  effectiveness_score?: number;
  next_trigger_eligible_at?: Date;
  attempt_count: number;
  max_attempts: number;
  created_at: Date;
  updated_at: Date;
}

export interface TriggerCondition {
  condition_type:
    | 'time_based'
    | 'behavior_based'
    | 'score_based'
    | 'milestone_based'
    | 'engagement_based';
  field_path: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'not_contains'
    | 'between'
    | 'exists'
    | 'not_exists';
  value: any;
  value_secondary?: any; // For 'between' operator
  weight: number; // 0-1, for weighted condition evaluation
  is_required: boolean;
  time_window_hours?: number;
}

export interface TriggerAction {
  action_id: string;
  action_type: ActionType;
  action_config: Record<string, any>;
  delay_minutes?: number;
  fallback_action?: TriggerAction;
  success_criteria?: ActionSuccessCriteria;
  personalization_rules?: PersonalizationRule[];
}

export interface ActionResult {
  action_id: string;
  action_type: ActionType;
  executed_at: Date;
  success: boolean;
  response_data?: Record<string, any>;
  error_message?: string;
  user_interaction?: UserInteraction;
  performance_metrics?: ActionMetrics;
}

export interface UserResponse {
  response_type: 'positive' | 'negative' | 'neutral' | 'no_response';
  interaction_data?: Record<string, any>;
  feedback?: string;
  response_time_minutes?: number;
  follow_up_action?: string;
}

export interface EffectivenessMetrics {
  total_triggered: number;
  total_completed: number;
  success_rate: number;
  average_response_time_hours: number;
  user_satisfaction_score: number;
  conversion_impact: number;
  last_calculated: Date;
}

export type TriggerCategory =
  | 'onboarding'
  | 'feature_adoption'
  | 'engagement_recovery'
  | 'milestone_celebration'
  | 'at_risk_intervention'
  | 'success_expansion'
  | 'retention_focus'
  | 'feedback_collection';

export type TriggerType =
  | 'welcome_sequence'
  | 'progress_nudge'
  | 'feature_highlight'
  | 'milestone_reward'
  | 'check_in'
  | 'intervention'
  | 'celebration'
  | 'education'
  | 'feedback_request';

export type ActionType =
  | 'email'
  | 'in_app_notification'
  | 'push_notification'
  | 'sms'
  | 'task_assignment'
  | 'feature_unlock'
  | 'content_recommendation'
  | 'support_outreach'
  | 'survey'
  | 'tutorial_trigger'
  | 'discount_offer'
  | 'celebration_animation';

export type TriggerStatus =
  | 'pending'
  | 'scheduled'
  | 'triggered'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export type TriggerPriority = 'low' | 'medium' | 'high' | 'critical';

export interface FrequencyLimit {
  max_per_day?: number;
  max_per_week?: number;
  max_per_month?: number;
  min_hours_between?: number;
  cooldown_after_negative_response_hours?: number;
}

export interface TargetAudience {
  user_types?: string[];
  organization_sizes?: string[];
  engagement_levels?: string[];
  health_score_range?: { min: number; max: number };
  exclude_segments?: string[];
}

export interface ABTestConfig {
  test_name: string;
  variants: ABVariant[];
  traffic_split: number[];
  success_metric: string;
  statistical_significance_threshold: number;
}

export interface ABVariant {
  variant_id: string;
  variant_name: string;
  action_overrides: Partial<TriggerAction>[];
}

export interface ActionSuccessCriteria {
  success_events: string[];
  timeout_hours: number;
  minimum_engagement_score?: number;
}

export interface PersonalizationRule {
  condition: TriggerCondition;
  content_overrides: Record<string, any>;
}

export interface UserInteraction {
  interaction_type:
    | 'click'
    | 'view'
    | 'dismiss'
    | 'complete'
    | 'skip'
    | 'feedback';
  interaction_data?: Record<string, any>;
  timestamp: Date;
}

export interface ActionMetrics {
  delivery_success: boolean;
  open_rate?: number;
  click_rate?: number;
  completion_rate?: number;
  response_rate?: number;
  satisfaction_score?: number;
}

export interface TriggerExecutionContext {
  user_id: string;
  organization_id?: string;
  user_data: Record<string, any>;
  system_data: Record<string, any>;
  trigger_history: UserTriggerInstance[];
  current_time: Date;
}

export class EngagementTriggerSystem {
  private supabase: SupabaseClient;
  private cachePrefix = 'trigger:';
  private processingQueue = 'engagement_triggers';

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Initialize engagement triggers for a new user
   */
  async initializeUserTriggers(
    userId: string,
    userType: string,
    organizationId?: string,
  ): Promise<UserTriggerInstance[]> {
    try {
      // Get applicable trigger definitions for this user
      const triggerDefinitions = await this.getApplicableTriggerDefinitions(
        userType,
        organizationId,
      );

      const userTriggers: Omit<
        UserTriggerInstance,
        'id' | 'created_at' | 'updated_at'
      >[] = [];

      for (const definition of triggerDefinitions) {
        // Check if user qualifies for this trigger
        const qualifies = await this.evaluateTargetAudience(
          userId,
          definition.target_audience,
        );

        if (qualifies) {
          // Calculate initial scheduling
          const scheduledFor = this.calculateInitialSchedule(definition);

          userTriggers.push({
            user_id: userId,
            organization_id: organizationId,
            trigger_definition_id: definition.id,
            trigger_name: definition.name,
            trigger_category: definition.trigger_category,
            status: scheduledFor ? 'scheduled' : 'pending',
            scheduled_for: scheduledFor,
            condition_data: {},
            action_results: [],
            attempt_count: 0,
            max_attempts: this.getMaxAttempts(definition.priority),
          });
        }
      }

      // Insert user triggers
      const { data: insertedTriggers, error } = await this.supabase
        .from('user_trigger_instances')
        .insert(userTriggers)
        .select();

      if (error) {
        throw new Error(`Failed to initialize triggers: ${error.message}`);
      }

      // Schedule immediate processing for time-based triggers
      await this.scheduleProcessing(userId);

      return insertedTriggers;
    } catch (error) {
      console.error('Error initializing user triggers:', error);
      throw error;
    }
  }

  /**
   * Process triggers based on user events
   */
  async processEventTriggers(
    userId: string,
    eventType: string,
    eventData: Record<string, any>,
  ): Promise<UserTriggerInstance[]> {
    try {
      const executionContext = await this.buildExecutionContext(
        userId,
        eventData,
      );

      // Get pending triggers that might be activated by this event
      const pendingTriggers = await this.getPendingTriggers(userId, eventType);

      const activatedTriggers: UserTriggerInstance[] = [];

      for (const triggerInstance of pendingTriggers) {
        const definition = await this.getTriggerDefinition(
          triggerInstance.trigger_definition_id,
        );

        if (!definition) continue;

        // Evaluate trigger conditions
        const conditionsResult = await this.evaluateTriggerConditions(
          definition.conditions,
          executionContext,
          eventType,
          eventData,
        );

        if (conditionsResult.met) {
          // Activate trigger
          const activatedTrigger = await this.activateTrigger(
            triggerInstance,
            definition,
            conditionsResult.data,
            executionContext,
          );

          if (activatedTrigger) {
            activatedTriggers.push(activatedTrigger);
          }
        }
      }

      return activatedTriggers;
    } catch (error) {
      console.error('Error processing event triggers:', error);
      return [];
    }
  }

  /**
   * Process scheduled triggers (called by background job)
   */
  async processScheduledTriggers(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    try {
      const now = new Date();
      let processed = 0;
      let successful = 0;
      let failed = 0;

      // Get triggers scheduled for now or earlier
      const { data: scheduledTriggers, error } = await this.supabase
        .from('user_trigger_instances')
        .select(
          `
          *,
          trigger_definitions!inner(*)
        `,
        )
        .eq('status', 'scheduled')
        .lte('scheduled_for', now.toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(100); // Process in batches

      if (error || !scheduledTriggers) {
        console.error('Error fetching scheduled triggers:', error);
        return { processed: 0, successful: 0, failed: 0 };
      }

      for (const triggerInstance of scheduledTriggers) {
        try {
          processed++;

          const executionContext = await this.buildExecutionContext(
            triggerInstance.user_id,
            triggerInstance.condition_data,
          );

          // Check if conditions are still met
          const conditionsResult = await this.evaluateTriggerConditions(
            triggerInstance.trigger_definitions.conditions,
            executionContext,
            'scheduled_trigger',
            {},
          );

          if (conditionsResult.met) {
            await this.executeTriggerActions(
              triggerInstance,
              triggerInstance.trigger_definitions,
              executionContext,
            );
            successful++;
          } else {
            // Conditions no longer met, cancel trigger
            await this.cancelTrigger(triggerInstance.id, 'conditions_not_met');
            successful++; // Still counts as successfully processed
          }
        } catch (error) {
          console.error(
            `Error processing trigger ${triggerInstance.id}:`,
            error,
          );
          failed++;

          // Mark trigger as failed
          await this.failTrigger(triggerInstance.id, error);
        }
      }

      return { processed, successful, failed };
    } catch (error) {
      console.error('Error in processScheduledTriggers:', error);
      return { processed: 0, successful: 0, failed: 0 };
    }
  }

  /**
   * Get user's active and recent triggers
   */
  async getUserTriggers(
    userId: string,
    includeCompleted: boolean = false,
  ): Promise<{
    active: UserTriggerInstance[];
    scheduled: UserTriggerInstance[];
    recent_completed: UserTriggerInstance[];
    effectiveness_summary: {
      total_triggered: number;
      success_rate: number;
      average_response_time: number;
    };
  }> {
    try {
      let query = this.supabase
        .from('user_trigger_instances')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!includeCompleted) {
        query = query.neq('status', 'completed');
      }

      const { data: triggers, error } = await query;

      if (error) {
        throw error;
      }

      const active =
        triggers?.filter((t) =>
          ['triggered', 'in_progress'].includes(t.status),
        ) || [];

      const scheduled = triggers?.filter((t) => t.status === 'scheduled') || [];

      const recentCompleted =
        triggers?.filter(
          (t) =>
            t.status === 'completed' &&
            differenceInDays(
              new Date(),
              new Date(t.completed_at || t.updated_at),
            ) <= 7,
        ) || [];

      // Calculate effectiveness summary
      const allTriggered =
        triggers?.filter((t) =>
          ['triggered', 'completed', 'failed'].includes(t.status),
        ) || [];

      const successful =
        triggers?.filter(
          (t) =>
            t.status === 'completed' &&
            t.effectiveness_score &&
            t.effectiveness_score > 70,
        ) || [];

      const avgResponseTime =
        successful.length > 0
          ? successful.reduce((sum, t) => {
              const responseTime = t.user_response?.response_time_minutes || 0;
              return sum + responseTime;
            }, 0) / successful.length
          : 0;

      return {
        active,
        scheduled,
        recent_completed: recentCompleted,
        effectiveness_summary: {
          total_triggered: allTriggered.length,
          success_rate:
            allTriggered.length > 0
              ? (successful.length / allTriggered.length) * 100
              : 0,
          average_response_time: avgResponseTime,
        },
      };
    } catch (error) {
      console.error('Error getting user triggers:', error);
      throw error;
    }
  }

  /**
   * Record user response to a trigger
   */
  async recordUserResponse(
    triggerInstanceId: string,
    response: UserResponse,
  ): Promise<void> {
    try {
      // Update trigger instance with user response
      const { error } = await this.supabase
        .from('user_trigger_instances')
        .update({
          user_response: response,
          status: 'completed',
          completed_at: new Date(),
          effectiveness_score: this.calculateEffectivenessScore(response),
          updated_at: new Date(),
        })
        .eq('id', triggerInstanceId);

      if (error) {
        throw error;
      }

      // Update frequency limits if negative response
      if (response.response_type === 'negative') {
        await this.updateFrequencyLimits(triggerInstanceId);
      }

      // Track response for analytics
      await this.trackTriggerResponse(triggerInstanceId, response);
    } catch (error) {
      console.error('Error recording user response:', error);
      throw error;
    }
  }

  /**
   * Get trigger performance analytics
   */
  async getTriggerAnalytics(
    organizationId?: string,
    timePeriodDays: number = 30,
  ): Promise<{
    overview: {
      total_triggers_sent: number;
      success_rate: number;
      average_response_time_hours: number;
      user_satisfaction_score: number;
    };
    by_category: Record<
      TriggerCategory,
      {
        sent: number;
        success_rate: number;
        avg_response_time: number;
        user_satisfaction: number;
      }
    >;
    by_action_type: Record<
      ActionType,
      {
        sent: number;
        delivery_rate: number;
        engagement_rate: number;
        conversion_rate: number;
      }
    >;
    top_performing_triggers: {
      trigger_name: string;
      success_rate: number;
      user_satisfaction: number;
      total_sent: number;
    }[];
    improvement_recommendations: string[];
  }> {
    try {
      const startDate = addDays(new Date(), -timePeriodDays);

      let query = this.supabase
        .from('user_trigger_instances')
        .select(
          `
          *,
          trigger_definitions!inner(name, trigger_category)
        `,
        )
        .gte('created_at', startDate.toISOString());

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: triggers, error } = await query;

      if (error) {
        throw error;
      }

      // Calculate overview metrics
      const totalSent = triggers?.length || 0;
      const successful =
        triggers?.filter(
          (t) =>
            t.status === 'completed' &&
            t.effectiveness_score &&
            t.effectiveness_score > 70,
        ) || [];

      const successRate =
        totalSent > 0 ? (successful.length / totalSent) * 100 : 0;

      const avgResponseTime =
        successful.length > 0
          ? successful.reduce(
              (sum, t) => sum + (t.user_response?.response_time_minutes || 0),
              0,
            ) /
            successful.length /
            60
          : 0;

      const avgSatisfaction =
        successful.length > 0
          ? successful.reduce(
              (sum, t) => sum + (t.effectiveness_score || 0),
              0,
            ) / successful.length
          : 0;

      // Group by category
      const byCategory =
        triggers?.reduce(
          (acc, trigger) => {
            const category = trigger.trigger_definitions?.trigger_category;
            if (!category) return acc;

            if (!acc[category]) {
              acc[category] = {
                triggers: [],
                sent: 0,
                successful: 0,
                totalResponseTime: 0,
                totalSatisfaction: 0,
              };
            }

            acc[category].triggers.push(trigger);
            acc[category].sent++;

            if (
              trigger.status === 'completed' &&
              trigger.effectiveness_score &&
              trigger.effectiveness_score > 70
            ) {
              acc[category].successful++;
              acc[category].totalResponseTime +=
                trigger.user_response?.response_time_minutes || 0;
              acc[category].totalSatisfaction +=
                trigger.effectiveness_score || 0;
            }

            return acc;
          },
          {} as Record<string, any>,
        ) || {};

      const categoryAnalytics: Record<string, any> = {};
      Object.entries(byCategory).forEach(([category, data]: [string, any]) => {
        categoryAnalytics[category] = {
          sent: data.sent,
          success_rate: data.sent > 0 ? (data.successful / data.sent) * 100 : 0,
          avg_response_time:
            data.successful > 0
              ? data.totalResponseTime / data.successful / 60
              : 0,
          user_satisfaction:
            data.successful > 0 ? data.totalSatisfaction / data.successful : 0,
        };
      });

      // Get top performing triggers
      const triggerPerformance = Object.entries(
        triggers?.reduce(
          (acc, trigger) => {
            const name = trigger.trigger_definitions?.name;
            if (!name) return acc;

            if (!acc[name]) {
              acc[name] = { sent: 0, successful: 0, totalSatisfaction: 0 };
            }

            acc[name].sent++;
            if (
              trigger.status === 'completed' &&
              trigger.effectiveness_score &&
              trigger.effectiveness_score > 70
            ) {
              acc[name].successful++;
              acc[name].totalSatisfaction += trigger.effectiveness_score;
            }

            return acc;
          },
          {} as Record<string, any>,
        ) || {},
      )
        .map(([name, data]: [string, any]) => ({
          trigger_name: name,
          success_rate: data.sent > 0 ? (data.successful / data.sent) * 100 : 0,
          user_satisfaction:
            data.successful > 0 ? data.totalSatisfaction / data.successful : 0,
          total_sent: data.sent,
        }))
        .sort((a, b) => b.success_rate - a.success_rate)
        .slice(0, 5);

      // Generate improvement recommendations
      const recommendations = this.generateImprovementRecommendations({
        successRate,
        avgResponseTime,
        avgSatisfaction,
        categoryAnalytics,
        totalSent,
      });

      return {
        overview: {
          total_triggers_sent: totalSent,
          success_rate: Math.round(successRate),
          average_response_time_hours: Math.round(avgResponseTime * 10) / 10,
          user_satisfaction_score: Math.round(avgSatisfaction),
        },
        by_category: categoryAnalytics,
        by_action_type: {}, // Placeholder - would need action result tracking
        top_performing_triggers: triggerPerformance,
        improvement_recommendations: recommendations,
      };
    } catch (error) {
      console.error('Error getting trigger analytics:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getApplicableTriggerDefinitions(
    userType: string,
    organizationId?: string,
  ): Promise<TriggerDefinition[]> {
    const { data: definitions, error } = await this.supabase
      .from('trigger_definitions')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error getting trigger definitions:', error);
      return [];
    }

    // Filter by target audience (simplified)
    return (
      definitions?.filter((def) => {
        if (
          def.target_audience?.user_types &&
          !def.target_audience.user_types.includes(userType)
        ) {
          return false;
        }
        return true;
      }) || []
    );
  }

  private async evaluateTargetAudience(
    userId: string,
    audience: TargetAudience,
  ): Promise<boolean> {
    // Evaluate if user matches target audience criteria
    // This would check user profile, health score, etc.
    return true; // Simplified for now
  }

  private calculateInitialSchedule(definition: TriggerDefinition): Date | null {
    // Calculate when the trigger should first be scheduled
    if (definition.trigger_category === 'onboarding') {
      return addMinutes(new Date(), 5); // Welcome triggers fire quickly
    }

    if (definition.trigger_type === 'progress_nudge') {
      return addDays(new Date(), 1); // Give users a day to get started
    }

    return null; // Event-based triggers don't get initially scheduled
  }

  private getMaxAttempts(priority: TriggerPriority): number {
    switch (priority) {
      case 'critical':
        return 5;
      case 'high':
        return 3;
      case 'medium':
        return 2;
      case 'low':
        return 1;
      default:
        return 1;
    }
  }

  private async scheduleProcessing(userId: string): Promise<void> {
    // Add to processing queue for background job
    try {
      await redis.lpush(
        this.processingQueue,
        JSON.stringify({
          user_id: userId,
          type: 'user_initialization',
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (error) {
      console.warn('Failed to queue trigger processing:', error);
    }
  }

  private async buildExecutionContext(
    userId: string,
    eventData: Record<string, any>,
  ): Promise<TriggerExecutionContext> {
    // Build comprehensive context for trigger evaluation
    const [userData, triggerHistory] = await Promise.all([
      this.getUserData(userId),
      this.getTriggerHistory(userId),
    ]);

    return {
      user_id: userId,
      organization_id: userData?.organization_id,
      user_data: userData || {},
      system_data: eventData,
      trigger_history: triggerHistory,
      current_time: new Date(),
    };
  }

  private async getUserData(
    userId: string,
  ): Promise<Record<string, any> | null> {
    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return error ? null : profile;
  }

  private async getTriggerHistory(
    userId: string,
  ): Promise<UserTriggerInstance[]> {
    const { data: history, error } = await this.supabase
      .from('user_trigger_instances')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    return error ? [] : history || [];
  }

  private async getPendingTriggers(
    userId: string,
    eventType: string,
  ): Promise<UserTriggerInstance[]> {
    const { data: triggers, error } = await this.supabase
      .from('user_trigger_instances')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'scheduled']);

    return error ? [] : triggers || [];
  }

  private async getTriggerDefinition(
    definitionId: string,
  ): Promise<TriggerDefinition | null> {
    const { data: definition, error } = await this.supabase
      .from('trigger_definitions')
      .select('*')
      .eq('id', definitionId)
      .single();

    return error ? null : definition;
  }

  private async evaluateTriggerConditions(
    conditions: TriggerCondition[],
    context: TriggerExecutionContext,
    eventType: string,
    eventData: Record<string, any>,
  ): Promise<{ met: boolean; data: Record<string, any> }> {
    // Evaluate all trigger conditions
    let totalWeight = 0;
    let metWeight = 0;
    const conditionData: Record<string, any> = {};

    for (const condition of conditions) {
      const conditionMet = this.evaluateSingleCondition(
        condition,
        context,
        eventType,
        eventData,
      );

      totalWeight += condition.weight;
      if (conditionMet) {
        metWeight += condition.weight;
      }

      conditionData[condition.field_path] = {
        met: conditionMet,
        value: this.getFieldValue(condition.field_path, context, eventData),
      };

      // Required conditions must be met
      if (condition.is_required && !conditionMet) {
        return { met: false, data: conditionData };
      }
    }

    // Check if enough weighted conditions are met (at least 70%)
    const weightedScore = totalWeight > 0 ? metWeight / totalWeight : 0;
    const met = weightedScore >= 0.7;

    return { met, data: conditionData };
  }

  private evaluateSingleCondition(
    condition: TriggerCondition,
    context: TriggerExecutionContext,
    eventType: string,
    eventData: Record<string, any>,
  ): boolean {
    const fieldValue = this.getFieldValue(
      condition.field_path,
      context,
      eventData,
    );

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > condition.value;
      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < condition.value;
      case 'contains':
        return (
          typeof fieldValue === 'string' && fieldValue.includes(condition.value)
        );
      case 'not_contains':
        return (
          typeof fieldValue === 'string' &&
          !fieldValue.includes(condition.value)
        );
      case 'between':
        return (
          typeof fieldValue === 'number' &&
          fieldValue >= condition.value &&
          fieldValue <= (condition.value_secondary || condition.value)
        );
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }

  private getFieldValue(
    fieldPath: string,
    context: TriggerExecutionContext,
    eventData: Record<string, any>,
  ): any {
    // Navigate nested object paths like 'user_data.health_score' or 'system_data.event_count'
    const parts = fieldPath.split('.');
    let current: any = { ...context, event_data: eventData };

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private async activateTrigger(
    triggerInstance: UserTriggerInstance,
    definition: TriggerDefinition,
    conditionData: Record<string, any>,
    context: TriggerExecutionContext,
  ): Promise<UserTriggerInstance | null> {
    try {
      // Update trigger status
      const { data: updatedTrigger, error } = await this.supabase
        .from('user_trigger_instances')
        .update({
          status: 'triggered',
          triggered_at: new Date(),
          condition_data: conditionData,
          updated_at: new Date(),
        })
        .eq('id', triggerInstance.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Execute trigger actions
      await this.executeTriggerActions(updatedTrigger, definition, context);

      return updatedTrigger;
    } catch (error) {
      console.error('Error activating trigger:', error);
      return null;
    }
  }

  private async executeTriggerActions(
    triggerInstance: UserTriggerInstance,
    definition: TriggerDefinition,
    context: TriggerExecutionContext,
  ): Promise<void> {
    const actionResults: ActionResult[] = [];

    for (const action of definition.actions) {
      try {
        // Apply delay if specified
        if (action.delay_minutes && action.delay_minutes > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, action.delay_minutes * 60 * 1000),
          );
        }

        // Execute action
        const result = await this.executeAction(
          action,
          context,
          triggerInstance,
        );
        actionResults.push(result);
      } catch (error) {
        console.error(`Error executing action ${action.action_id}:`, error);

        actionResults.push({
          action_id: action.action_id,
          action_type: action.action_type,
          executed_at: new Date(),
          success: false,
          error_message: error instanceof Error ? error.message : String(error),
        });

        // Execute fallback action if available
        if (action.fallback_action) {
          try {
            const fallbackResult = await this.executeAction(
              action.fallback_action,
              context,
              triggerInstance,
            );
            actionResults.push(fallbackResult);
          } catch (fallbackError) {
            console.error('Fallback action also failed:', fallbackError);
          }
        }
      }
    }

    // Update trigger instance with action results
    await this.supabase
      .from('user_trigger_instances')
      .update({
        action_results: actionResults,
        status: 'in_progress',
        updated_at: new Date(),
      })
      .eq('id', triggerInstance.id);
  }

  private async executeAction(
    action: TriggerAction,
    context: TriggerExecutionContext,
    triggerInstance: UserTriggerInstance,
  ): Promise<ActionResult> {
    const startTime = new Date();

    try {
      let result: any = {};

      switch (action.action_type) {
        case 'email':
          result = await this.executeEmailAction(action, context);
          break;
        case 'in_app_notification':
          result = await this.executeNotificationAction(action, context);
          break;
        case 'task_assignment':
          result = await this.executeTaskAction(action, context);
          break;
        case 'feature_unlock':
          result = await this.executeFeatureUnlockAction(action, context);
          break;
        case 'survey':
          result = await this.executeSurveyAction(action, context);
          break;
        default:
          throw new Error(`Unsupported action type: ${action.action_type}`);
      }

      return {
        action_id: action.action_id,
        action_type: action.action_type,
        executed_at: startTime,
        success: true,
        response_data: result,
        performance_metrics: {
          delivery_success: true,
          ...result.metrics,
        },
      };
    } catch (error) {
      return {
        action_id: action.action_id,
        action_type: action.action_type,
        executed_at: startTime,
        success: false,
        error_message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async executeEmailAction(
    action: TriggerAction,
    context: TriggerExecutionContext,
  ): Promise<any> {
    // Implementation would send personalized email
    console.log('Sending email action:', action.action_config);
    return { email_id: 'email_123', delivered: true };
  }

  private async executeNotificationAction(
    action: TriggerAction,
    context: TriggerExecutionContext,
  ): Promise<any> {
    // Implementation would create in-app notification
    console.log('Creating notification:', action.action_config);
    return { notification_id: 'notif_123', created: true };
  }

  private async executeTaskAction(
    action: TriggerAction,
    context: TriggerExecutionContext,
  ): Promise<any> {
    // Implementation would create a task for the user
    console.log('Creating task:', action.action_config);
    return { task_id: 'task_123', assigned: true };
  }

  private async executeFeatureUnlockAction(
    action: TriggerAction,
    context: TriggerExecutionContext,
  ): Promise<any> {
    // Implementation would unlock a feature for the user
    console.log('Unlocking feature:', action.action_config);
    return { feature: action.action_config.feature_id, unlocked: true };
  }

  private async executeSurveyAction(
    action: TriggerAction,
    context: TriggerExecutionContext,
  ): Promise<any> {
    // Implementation would create/send survey
    console.log('Creating survey:', action.action_config);
    return { survey_id: 'survey_123', sent: true };
  }

  private async cancelTrigger(
    triggerInstanceId: string,
    reason: string,
  ): Promise<void> {
    await this.supabase
      .from('user_trigger_instances')
      .update({
        status: 'cancelled',
        updated_at: new Date(),
        condition_data: { cancellation_reason: reason },
      })
      .eq('id', triggerInstanceId);
  }

  private async failTrigger(
    triggerInstanceId: string,
    error: any,
  ): Promise<void> {
    await this.supabase
      .from('user_trigger_instances')
      .update({
        status: 'failed',
        updated_at: new Date(),
        condition_data: {
          error_message: error instanceof Error ? error.message : String(error),
        },
      })
      .eq('id', triggerInstanceId);
  }

  private calculateEffectivenessScore(response: UserResponse): number {
    switch (response.response_type) {
      case 'positive':
        return 90;
      case 'neutral':
        return 70;
      case 'negative':
        return 30;
      case 'no_response':
        return 10;
      default:
        return 50;
    }
  }

  private async updateFrequencyLimits(
    triggerInstanceId: string,
  ): Promise<void> {
    // Update frequency limits after negative response
    // This would implement cooldown logic
    console.log('Updating frequency limits for trigger:', triggerInstanceId);
  }

  private async trackTriggerResponse(
    triggerInstanceId: string,
    response: UserResponse,
  ): Promise<void> {
    try {
      await this.supabase.from('trigger_response_analytics').insert({
        trigger_instance_id: triggerInstanceId,
        response_type: response.response_type,
        response_time_minutes: response.response_time_minutes,
        interaction_data: response.interaction_data,
        feedback: response.feedback,
        created_at: new Date(),
      });
    } catch (error) {
      console.error('Failed to track trigger response:', error);
    }
  }

  private generateImprovementRecommendations(analytics: any): string[] {
    const recommendations: string[] = [];

    if (analytics.successRate < 50) {
      recommendations.push(
        'Review trigger conditions and timing to improve relevance',
      );
    }

    if (analytics.avgResponseTime > 24) {
      recommendations.push(
        'Consider more urgent action types for time-sensitive triggers',
      );
    }

    if (analytics.avgSatisfaction < 60) {
      recommendations.push(
        'Improve personalization and message content quality',
      );
    }

    if (analytics.totalSent < 100) {
      recommendations.push('Expand target audience to increase trigger volume');
    }

    return recommendations;
  }
}

// Export singleton instance
export const engagementTriggerSystem = new EngagementTriggerSystem();
