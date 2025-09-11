/**
 * WS-142: Customer Success - Intervention Engine
 * Core engine for automated intervention management and execution
 */

import { z } from 'zod';
import { triggerManager } from './trigger-manager';
import { emailAutomation } from './email-automation';
import { schedulingService } from './scheduling-service';
import { customerHealthService } from './customer-health-service';
import { riskAssessmentService } from './risk-assessment';
import { milestoneService } from './milestone-service';

// Type definitions
export interface Intervention {
  id: string;
  userId: string;
  organizationId: string;
  type: InterventionType;
  priority: InterventionPriority;
  trigger: string;
  status: InterventionStatus;
  scheduledAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  config: InterventionConfig;
  results?: InterventionResults;
  createdAt: Date;
  updatedAt: Date;
}

export type InterventionType =
  | 'email_sequence'
  | 'in_app_message'
  | 'success_manager_task'
  | 'feature_promotion'
  | 'milestone_nudge'
  | 'risk_mitigation'
  | 'onboarding_assistance'
  | 'engagement_boost';

export type InterventionPriority = 'low' | 'medium' | 'high' | 'critical';
export type InterventionStatus =
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface InterventionConfig {
  templateId?: string;
  delay?: number; // seconds
  maxRetries?: number;
  retryDelay?: number; // seconds
  conditions?: InterventionCondition[];
  personalization?: Record<string, any>;
  channels?: InterventionChannel[];
}

export interface InterventionCondition {
  field: string;
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'nin'
    | 'contains';
  value: any;
}

export interface InterventionChannel {
  type: 'email' | 'sms' | 'in_app' | 'push' | 'slack';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface InterventionResults {
  success: boolean;
  executionTime: number; // milliseconds
  channelResults: Record<string, any>;
  userResponse?: InterventionResponse;
  metrics: InterventionMetrics;
}

export interface InterventionResponse {
  action: 'clicked' | 'dismissed' | 'completed' | 'ignored';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface InterventionMetrics {
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  engagementScore: number;
}

export interface InterventionRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: TriggerDefinition;
  intervention: InterventionDefinition;
  conditions: InterventionCondition[];
  frequency: FrequencyConfig;
  priority: InterventionPriority;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TriggerDefinition {
  event: string;
  source:
    | 'activity'
    | 'health_score'
    | 'milestone'
    | 'risk_assessment'
    | 'manual';
  conditions: Record<string, any>;
}

export interface InterventionDefinition {
  type: InterventionType;
  config: InterventionConfig;
  timing: 'immediate' | 'delayed' | 'scheduled';
  delay?: number;
  scheduledTime?: string; // cron expression or ISO timestamp
}

export interface FrequencyConfig {
  maxPerDay?: number;
  maxPerWeek?: number;
  maxPerMonth?: number;
  cooldownHours?: number;
  respectUserPreferences: boolean;
}

export interface InterventionExecutionContext {
  userId: string;
  organizationId: string;
  triggerEvent: any;
  userContext: UserInterventionContext;
  healthScore?: number;
  riskLevel?: string;
  recentMilestones?: any[];
}

export interface UserInterventionContext {
  profile: {
    name: string;
    email: string;
    joinedAt: Date;
    lastActive: Date;
    timezone: string;
    preferences: Record<string, any>;
  };
  usage: {
    totalSessions: number;
    avgSessionDuration: number;
    featuresUsed: string[];
    lastFeatureUsed: string;
    adoptionScore: number;
  };
  engagement: {
    emailsOpened: number;
    emailsClicked: number;
    inAppMessagesViewed: number;
    supportTickets: number;
    npsScore?: number;
  };
  success: {
    milestonesCompleted: number;
    healthScore: number;
    riskLevel: string;
    valueRealized: number;
    retentionProbability: number;
  };
}

// Validation schemas
const interventionConfigSchema = z.object({
  templateId: z.string().optional(),
  delay: z.number().min(0).optional(),
  maxRetries: z.number().min(0).max(5).default(3),
  retryDelay: z.number().min(0).default(300),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.enum([
          'eq',
          'ne',
          'gt',
          'gte',
          'lt',
          'lte',
          'in',
          'nin',
          'contains',
        ]),
        value: z.any(),
      }),
    )
    .optional(),
  personalization: z.record(z.any()).optional(),
  channels: z
    .array(
      z.object({
        type: z.enum(['email', 'sms', 'in_app', 'push', 'slack']),
        enabled: z.boolean(),
        config: z.record(z.any()).optional(),
      }),
    )
    .optional(),
});

const interventionRuleSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500),
  isActive: z.boolean().default(true),
  trigger: z.object({
    event: z.string(),
    source: z.enum([
      'activity',
      'health_score',
      'milestone',
      'risk_assessment',
      'manual',
    ]),
    conditions: z.record(z.any()),
  }),
  intervention: z.object({
    type: z.enum([
      'email_sequence',
      'in_app_message',
      'success_manager_task',
      'feature_promotion',
      'milestone_nudge',
      'risk_mitigation',
      'onboarding_assistance',
      'engagement_boost',
    ]),
    config: interventionConfigSchema,
    timing: z.enum(['immediate', 'delayed', 'scheduled']),
    delay: z.number().min(0).optional(),
    scheduledTime: z.string().optional(),
  }),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.enum([
          'eq',
          'ne',
          'gt',
          'gte',
          'lt',
          'lte',
          'in',
          'nin',
          'contains',
        ]),
        value: z.any(),
      }),
    )
    .default([]),
  frequency: z.object({
    maxPerDay: z.number().min(0).optional(),
    maxPerWeek: z.number().min(0).optional(),
    maxPerMonth: z.number().min(0).optional(),
    cooldownHours: z.number().min(0).default(24),
    respectUserPreferences: z.boolean().default(true),
  }),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  organizationId: z.string().uuid().optional(),
});

class InterventionEngine {
  private activeInterventions = new Map<string, Intervention>();
  private executionQueue: string[] = [];
  private isProcessing = false;

  /**
   * Create a new intervention rule
   */
  async createInterventionRule(
    ruleData: z.infer<typeof interventionRuleSchema>,
    organizationId?: string,
  ): Promise<InterventionRule> {
    const validatedData = interventionRuleSchema.parse(ruleData);

    const rule: InterventionRule = {
      id: crypto.randomUUID(),
      name: validatedData.name,
      description: validatedData.description,
      isActive: validatedData.isActive,
      trigger: validatedData.trigger,
      intervention: validatedData.intervention,
      conditions: validatedData.conditions,
      frequency: validatedData.frequency,
      priority: validatedData.priority,
      organizationId: organizationId || validatedData.organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Register trigger with TriggerManager
    await triggerManager.registerTrigger(rule.trigger, rule.id);

    return rule;
  }

  /**
   * Process a trigger event and determine if interventions should be executed
   */
  async processTriggerEvent(
    event: string,
    context: InterventionExecutionContext,
  ): Promise<Intervention[]> {
    try {
      // Get applicable rules for this trigger
      const applicableRules = await this.getApplicableRules(event, context);

      if (applicableRules.length === 0) {
        console.log(`No applicable intervention rules for event: ${event}`);
        return [];
      }

      const createdInterventions: Intervention[] = [];

      for (const rule of applicableRules) {
        // Check frequency limits
        const canExecute = await this.checkFrequencyLimits(
          rule,
          context.userId,
        );
        if (!canExecute) {
          console.log(
            `Frequency limit exceeded for rule: ${rule.name}, user: ${context.userId}`,
          );
          continue;
        }

        // Check intervention conditions
        const conditionsMet = await this.evaluateConditions(
          rule.conditions,
          context,
        );
        if (!conditionsMet) {
          console.log(
            `Conditions not met for rule: ${rule.name}, user: ${context.userId}`,
          );
          continue;
        }

        // Create intervention
        const intervention = await this.createIntervention(rule, context);
        createdInterventions.push(intervention);

        // Schedule execution based on timing
        if (rule.intervention.timing === 'immediate') {
          this.scheduleImmediate(intervention.id);
        } else if (rule.intervention.timing === 'delayed') {
          await schedulingService.scheduleDelayed(
            intervention.id,
            rule.intervention.delay || 300, // 5 minutes default
          );
        } else if (
          rule.intervention.timing === 'scheduled' &&
          rule.intervention.scheduledTime
        ) {
          await schedulingService.scheduleAt(
            intervention.id,
            rule.intervention.scheduledTime,
          );
        }
      }

      return createdInterventions;
    } catch (error) {
      console.error('Error processing trigger event:', error);
      throw new Error(`Failed to process trigger event: ${event}`);
    }
  }

  /**
   * Execute a scheduled intervention
   */
  async executeIntervention(
    interventionId: string,
  ): Promise<InterventionResults> {
    const intervention = this.activeInterventions.get(interventionId);
    if (!intervention) {
      throw new Error(`Intervention not found: ${interventionId}`);
    }

    if (
      intervention.status !== 'scheduled' &&
      intervention.status !== 'active'
    ) {
      throw new Error(
        `Intervention cannot be executed in status: ${intervention.status}`,
      );
    }

    const startTime = Date.now();

    try {
      // Update status to active
      intervention.status = 'active';
      intervention.executedAt = new Date();
      this.activeInterventions.set(interventionId, intervention);

      // Build execution context
      const context = await this.buildExecutionContext(intervention);

      // Execute intervention based on type
      const channelResults = await this.executeByType(intervention, context);

      // Calculate metrics
      const metrics = this.calculateMetrics(channelResults);

      const results: InterventionResults = {
        success: true,
        executionTime: Date.now() - startTime,
        channelResults,
        metrics,
      };

      // Update intervention status
      intervention.status = 'completed';
      intervention.completedAt = new Date();
      intervention.results = results;
      this.activeInterventions.set(interventionId, intervention);

      return results;
    } catch (error) {
      console.error(`Error executing intervention ${interventionId}:`, error);

      const results: InterventionResults = {
        success: false,
        executionTime: Date.now() - startTime,
        channelResults: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        metrics: {
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          conversionRate: 0,
          engagementScore: 0,
        },
      };

      // Update intervention status to failed
      intervention.status = 'failed';
      intervention.results = results;
      this.activeInterventions.set(interventionId, intervention);

      return results;
    }
  }

  /**
   * Get applicable intervention rules for an event
   */
  private async getApplicableRules(
    event: string,
    context: InterventionExecutionContext,
  ): Promise<InterventionRule[]> {
    // This would typically query database for active rules matching the event
    // For now, return a mock implementation
    const allRules = await this.getAllActiveRules(context.organizationId);

    return allRules.filter(
      (rule) =>
        rule.isActive &&
        rule.trigger.event === event &&
        this.matchesTriggerConditions(rule.trigger, context),
    );
  }

  /**
   * Check if user has exceeded frequency limits for a rule
   */
  private async checkFrequencyLimits(
    rule: InterventionRule,
    userId: string,
  ): Promise<boolean> {
    // This would typically query database for recent intervention history
    // For now, return true (allowing execution)
    return true;
  }

  /**
   * Evaluate intervention conditions against context
   */
  private async evaluateConditions(
    conditions: InterventionCondition[],
    context: InterventionExecutionContext,
  ): Promise<boolean> {
    if (conditions.length === 0) return true;

    return conditions.every((condition) => {
      const contextValue = this.getContextValue(condition.field, context);
      return this.evaluateCondition(condition, contextValue);
    });
  }

  /**
   * Create intervention from rule and context
   */
  private async createIntervention(
    rule: InterventionRule,
    context: InterventionExecutionContext,
  ): Promise<Intervention> {
    const intervention: Intervention = {
      id: crypto.randomUUID(),
      userId: context.userId,
      organizationId: context.organizationId,
      type: rule.intervention.type,
      priority: rule.priority,
      trigger: rule.trigger.event,
      status: 'scheduled',
      scheduledAt: new Date(),
      config: rule.intervention.config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.activeInterventions.set(intervention.id, intervention);
    return intervention;
  }

  /**
   * Schedule immediate execution
   */
  private scheduleImmediate(interventionId: string): void {
    this.executionQueue.push(interventionId);
    if (!this.isProcessing) {
      this.processExecutionQueue();
    }
  }

  /**
   * Process execution queue
   */
  private async processExecutionQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.executionQueue.length > 0) {
        const interventionId = this.executionQueue.shift();
        if (interventionId) {
          await this.executeIntervention(interventionId);
          // Small delay between executions
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Build execution context for intervention
   */
  private async buildExecutionContext(
    intervention: Intervention,
  ): Promise<UserInterventionContext> {
    // This would typically gather user data from various services
    // Mock implementation for now
    return {
      profile: {
        name: 'User Name',
        email: 'user@example.com',
        joinedAt: new Date(),
        lastActive: new Date(),
        timezone: 'UTC',
        preferences: {},
      },
      usage: {
        totalSessions: 0,
        avgSessionDuration: 0,
        featuresUsed: [],
        lastFeatureUsed: '',
        adoptionScore: 0,
      },
      engagement: {
        emailsOpened: 0,
        emailsClicked: 0,
        inAppMessagesViewed: 0,
        supportTickets: 0,
      },
      success: {
        milestonesCompleted: 0,
        healthScore: 0,
        riskLevel: 'low',
        valueRealized: 0,
        retentionProbability: 0,
      },
    };
  }

  /**
   * Execute intervention based on type
   */
  private async executeByType(
    intervention: Intervention,
    context: UserInterventionContext,
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    switch (intervention.type) {
      case 'email_sequence':
        results.email = await emailAutomation.sendInterventionEmail(
          intervention.userId,
          intervention.config.templateId || 'default',
          intervention.config.personalization || {},
        );
        break;

      case 'in_app_message':
        results.inApp = await this.sendInAppMessage(intervention, context);
        break;

      case 'success_manager_task':
        results.task = await this.createSuccessManagerTask(
          intervention,
          context,
        );
        break;

      case 'feature_promotion':
        results.promotion = await this.promoteFeature(intervention, context);
        break;

      case 'milestone_nudge':
        results.nudge = await this.sendMilestoneNudge(intervention, context);
        break;

      case 'risk_mitigation':
        results.mitigation = await this.executeRiskMitigation(
          intervention,
          context,
        );
        break;

      case 'onboarding_assistance':
        results.assistance = await this.provideOnboardingAssistance(
          intervention,
          context,
        );
        break;

      case 'engagement_boost':
        results.boost = await this.executeEngagementBoost(
          intervention,
          context,
        );
        break;

      default:
        throw new Error(`Unsupported intervention type: ${intervention.type}`);
    }

    return results;
  }

  /**
   * Calculate intervention metrics
   */
  private calculateMetrics(
    channelResults: Record<string, any>,
  ): InterventionMetrics {
    // This would typically analyze actual delivery and engagement data
    return {
      deliveryRate: 1.0,
      openRate: 0.25,
      clickRate: 0.05,
      conversionRate: 0.02,
      engagementScore: 0.75,
    };
  }

  // Helper methods for specific intervention types
  private async sendInAppMessage(
    intervention: Intervention,
    context: UserInterventionContext,
  ): Promise<any> {
    // Implementation for in-app messaging
    return { messageId: crypto.randomUUID(), sent: true };
  }

  private async createSuccessManagerTask(
    intervention: Intervention,
    context: UserInterventionContext,
  ): Promise<any> {
    // Implementation for creating success manager tasks
    return { taskId: crypto.randomUUID(), created: true };
  }

  private async promoteFeature(
    intervention: Intervention,
    context: UserInterventionContext,
  ): Promise<any> {
    // Implementation for feature promotion
    return { promotionId: crypto.randomUUID(), promoted: true };
  }

  private async sendMilestoneNudge(
    intervention: Intervention,
    context: UserInterventionContext,
  ): Promise<any> {
    // Implementation for milestone nudging
    return { nudgeId: crypto.randomUUID(), sent: true };
  }

  private async executeRiskMitigation(
    intervention: Intervention,
    context: UserInterventionContext,
  ): Promise<any> {
    // Implementation for risk mitigation
    return { mitigationId: crypto.randomUUID(), executed: true };
  }

  private async provideOnboardingAssistance(
    intervention: Intervention,
    context: UserInterventionContext,
  ): Promise<any> {
    // Implementation for onboarding assistance
    return { assistanceId: crypto.randomUUID(), provided: true };
  }

  private async executeEngagementBoost(
    intervention: Intervention,
    context: UserInterventionContext,
  ): Promise<any> {
    // Implementation for engagement boost
    return { boostId: crypto.randomUUID(), executed: true };
  }

  // Utility methods
  private async getAllActiveRules(
    organizationId: string,
  ): Promise<InterventionRule[]> {
    // This would typically query the database
    return [];
  }

  private matchesTriggerConditions(
    trigger: TriggerDefinition,
    context: InterventionExecutionContext,
  ): boolean {
    // Implementation for matching trigger conditions
    return true;
  }

  private getContextValue(
    field: string,
    context: InterventionExecutionContext,
  ): any {
    // Implementation for extracting values from context
    const parts = field.split('.');
    let value: any = context;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  private evaluateCondition(
    condition: InterventionCondition,
    contextValue: any,
  ): boolean {
    switch (condition.operator) {
      case 'eq':
        return contextValue === condition.value;
      case 'ne':
        return contextValue !== condition.value;
      case 'gt':
        return contextValue > condition.value;
      case 'gte':
        return contextValue >= condition.value;
      case 'lt':
        return contextValue < condition.value;
      case 'lte':
        return contextValue <= condition.value;
      case 'in':
        return (
          Array.isArray(condition.value) &&
          condition.value.includes(contextValue)
        );
      case 'nin':
        return (
          Array.isArray(condition.value) &&
          !condition.value.includes(contextValue)
        );
      case 'contains':
        return String(contextValue).includes(String(condition.value));
      default:
        return false;
    }
  }

  /**
   * Get intervention status
   */
  async getInterventionStatus(
    interventionId: string,
  ): Promise<Intervention | null> {
    return this.activeInterventions.get(interventionId) || null;
  }

  /**
   * Cancel an intervention
   */
  async cancelIntervention(interventionId: string): Promise<boolean> {
    const intervention = this.activeInterventions.get(interventionId);
    if (!intervention) return false;

    if (intervention.status === 'scheduled') {
      intervention.status = 'cancelled';
      intervention.updatedAt = new Date();
      this.activeInterventions.set(interventionId, intervention);

      // Remove from execution queue if present
      const queueIndex = this.executionQueue.indexOf(interventionId);
      if (queueIndex > -1) {
        this.executionQueue.splice(queueIndex, 1);
      }

      return true;
    }

    return false;
  }

  /**
   * Get user's intervention history
   */
  async getUserInterventionHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<Intervention[]> {
    // This would typically query the database
    const userInterventions = Array.from(this.activeInterventions.values())
      .filter((intervention) => intervention.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return userInterventions;
  }
}

// Export singleton instance
export const interventionEngine = new InterventionEngine();
