/**
 * WS-142: Customer Success - Trigger Manager
 * Manages trigger conditions and event monitoring for automated interventions
 */

import { z } from 'zod';

// Type definitions
export interface TriggerEvent {
  id: string;
  type: TriggerEventType;
  source: TriggerSource;
  userId: string;
  organizationId: string;
  data: Record<string, any>;
  timestamp: Date;
  processed: boolean;
}

export type TriggerEventType =
  | 'health_score_decline'
  | 'milestone_stagnation'
  | 'feature_abandonment'
  | 'login_drop'
  | 'support_ticket_increase'
  | 'usage_threshold_breach'
  | 'risk_level_change'
  | 'engagement_drop'
  | 'onboarding_incomplete'
  | 'subscription_downgrade_risk'
  | 'churn_prediction_trigger';

export type TriggerSource =
  | 'activity_tracker'
  | 'health_scoring'
  | 'milestone_system'
  | 'risk_assessment'
  | 'billing_system'
  | 'support_system'
  | 'manual';

export interface TriggerRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  eventType: TriggerEventType;
  conditions: TriggerCondition[];
  aggregation?: AggregationRule;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
  timeWindow?: TimeWindow;
}

export type ConditionOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'not_contains'
  | 'exists'
  | 'not_exists'
  | 'matches_pattern'
  | 'changed'
  | 'trend_up'
  | 'trend_down';

export interface TimeWindow {
  duration: number; // in seconds
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks';
}

export interface AggregationRule {
  function: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct_count';
  field?: string;
  timeWindow: TimeWindow;
  threshold: number;
}

export interface TriggerRegistration {
  triggerId: string;
  ruleId: string;
  callback: (event: TriggerEvent) => Promise<void>;
}

export interface TriggerMetrics {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  activeRules: number;
  triggersByType: Record<TriggerEventType, number>;
  lastProcessedAt?: Date;
}

// Validation schemas
const triggerConditionSchema = z.object({
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
    'not_contains',
    'exists',
    'not_exists',
    'matches_pattern',
    'changed',
    'trend_up',
    'trend_down',
  ]),
  value: z.any(),
  timeWindow: z
    .object({
      duration: z.number().positive(),
      unit: z.enum(['seconds', 'minutes', 'hours', 'days', 'weeks']),
    })
    .optional(),
});

const triggerRuleSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500),
  isActive: z.boolean().default(true),
  eventType: z.enum([
    'health_score_decline',
    'milestone_stagnation',
    'feature_abandonment',
    'login_drop',
    'support_ticket_increase',
    'usage_threshold_breach',
    'risk_level_change',
    'engagement_drop',
    'onboarding_incomplete',
    'subscription_downgrade_risk',
    'churn_prediction_trigger',
  ]),
  conditions: z.array(triggerConditionSchema),
  aggregation: z
    .object({
      function: z.enum(['count', 'sum', 'avg', 'min', 'max', 'distinct_count']),
      field: z.string().optional(),
      timeWindow: z.object({
        duration: z.number().positive(),
        unit: z.enum(['seconds', 'minutes', 'hours', 'days', 'weeks']),
      }),
      threshold: z.number(),
    })
    .optional(),
  organizationId: z.string().uuid().optional(),
});

class TriggerManager {
  private triggers = new Map<string, TriggerRule>();
  private registrations = new Map<string, TriggerRegistration[]>();
  private eventHistory: TriggerEvent[] = [];
  private metrics: TriggerMetrics = {
    totalEvents: 0,
    processedEvents: 0,
    failedEvents: 0,
    averageProcessingTime: 0,
    activeRules: 0,
    triggersByType: {} as Record<TriggerEventType, number>,
  };

  /**
   * Create a new trigger rule
   */
  async createTriggerRule(
    ruleData: z.infer<typeof triggerRuleSchema>,
    organizationId?: string,
  ): Promise<TriggerRule> {
    const validatedData = triggerRuleSchema.parse(ruleData);

    const rule: TriggerRule = {
      id: crypto.randomUUID(),
      name: validatedData.name,
      description: validatedData.description,
      isActive: validatedData.isActive,
      eventType: validatedData.eventType,
      conditions: validatedData.conditions,
      aggregation: validatedData.aggregation,
      organizationId: organizationId || validatedData.organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.triggers.set(rule.id, rule);
    this.updateMetrics();

    return rule;
  }

  /**
   * Register a callback for trigger events
   */
  async registerTrigger(
    trigger: {
      event: string;
      source: TriggerSource;
      conditions: Record<string, any>;
    },
    ruleId: string,
  ): Promise<string> {
    const triggerId = crypto.randomUUID();

    const registration: TriggerRegistration = {
      triggerId,
      ruleId,
      callback: async (event: TriggerEvent) => {
        // Default callback - this would typically be overridden
        console.log(`Trigger ${triggerId} fired for rule ${ruleId}`);
      },
    };

    const existingRegistrations = this.registrations.get(trigger.event) || [];
    existingRegistrations.push(registration);
    this.registrations.set(trigger.event, existingRegistrations);

    return triggerId;
  }

  /**
   * Process an incoming event and check against all trigger rules
   */
  async processEvent(
    eventType: TriggerEventType,
    source: TriggerSource,
    userId: string,
    organizationId: string,
    data: Record<string, any>,
  ): Promise<TriggerEvent[]> {
    const startTime = Date.now();

    const event: TriggerEvent = {
      id: crypto.randomUUID(),
      type: eventType,
      source,
      userId,
      organizationId,
      data,
      timestamp: new Date(),
      processed: false,
    };

    this.eventHistory.push(event);
    this.metrics.totalEvents++;

    try {
      // Get applicable trigger rules
      const applicableRules = this.getApplicableRules(
        eventType,
        organizationId,
      );

      const triggeredEvents: TriggerEvent[] = [];

      for (const rule of applicableRules) {
        if (!rule.isActive) continue;

        // Check if rule conditions are met
        const conditionsMet = await this.evaluateConditions(
          rule.conditions,
          event,
        );

        if (conditionsMet) {
          // Check aggregation rules if present
          const aggregationMet = rule.aggregation
            ? await this.evaluateAggregation(rule.aggregation, event)
            : true;

          if (aggregationMet) {
            // Create triggered event
            const triggeredEvent = { ...event, id: crypto.randomUUID() };
            triggeredEvents.push(triggeredEvent);

            // Execute registered callbacks
            await this.executeCallbacks(
              rule.eventType.toString(),
              triggeredEvent,
            );
          }
        }
      }

      event.processed = true;
      this.metrics.processedEvents++;

      const processingTime = Date.now() - startTime;
      this.updateProcessingTimeMetrics(processingTime);

      return triggeredEvents;
    } catch (error) {
      console.error('Error processing trigger event:', error);
      this.metrics.failedEvents++;
      throw error;
    }
  }

  /**
   * Evaluate trigger conditions against an event
   */
  private async evaluateConditions(
    conditions: TriggerCondition[],
    event: TriggerEvent,
  ): Promise<boolean> {
    if (conditions.length === 0) return true;

    // All conditions must be met (AND logic)
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, event);
      if (!result) return false;
    }

    return true;
  }

  /**
   * Evaluate a single trigger condition
   */
  private async evaluateCondition(
    condition: TriggerCondition,
    event: TriggerEvent,
  ): Promise<boolean> {
    const fieldValue = this.getFieldValue(condition.field, event);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;

      case 'ne':
        return fieldValue !== condition.value;

      case 'gt':
        return Number(fieldValue) > Number(condition.value);

      case 'gte':
        return Number(fieldValue) >= Number(condition.value);

      case 'lt':
        return Number(fieldValue) < Number(condition.value);

      case 'lte':
        return Number(fieldValue) <= Number(condition.value);

      case 'in':
        return (
          Array.isArray(condition.value) && condition.value.includes(fieldValue)
        );

      case 'nin':
        return (
          Array.isArray(condition.value) &&
          !condition.value.includes(fieldValue)
        );

      case 'contains':
        return String(fieldValue).includes(String(condition.value));

      case 'not_contains':
        return !String(fieldValue).includes(String(condition.value));

      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;

      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;

      case 'matches_pattern':
        const regex = new RegExp(condition.value);
        return regex.test(String(fieldValue));

      case 'changed':
        return await this.hasFieldChanged(
          condition.field,
          event,
          condition.timeWindow,
        );

      case 'trend_up':
        return await this.hasUpwardTrend(
          condition.field,
          event,
          condition.timeWindow,
        );

      case 'trend_down':
        return await this.hasDownwardTrend(
          condition.field,
          event,
          condition.timeWindow,
        );

      default:
        console.warn(`Unknown operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Evaluate aggregation rules
   */
  private async evaluateAggregation(
    aggregation: AggregationRule,
    event: TriggerEvent,
  ): Promise<boolean> {
    const timeWindowMs = this.convertTimeWindowToMs(aggregation.timeWindow);
    const cutoffTime = new Date(event.timestamp.getTime() - timeWindowMs);

    // Get relevant events within time window
    const relevantEvents = this.eventHistory.filter(
      (e) =>
        e.userId === event.userId &&
        e.type === event.type &&
        e.timestamp >= cutoffTime &&
        e.timestamp <= event.timestamp,
    );

    let aggregatedValue: number;

    switch (aggregation.function) {
      case 'count':
        aggregatedValue = relevantEvents.length;
        break;

      case 'sum':
        if (!aggregation.field)
          throw new Error('Field required for sum aggregation');
        aggregatedValue = relevantEvents.reduce(
          (sum, e) => sum + Number(this.getFieldValue(aggregation.field!, e)),
          0,
        );
        break;

      case 'avg':
        if (!aggregation.field)
          throw new Error('Field required for avg aggregation');
        const values = relevantEvents.map((e) =>
          Number(this.getFieldValue(aggregation.field!, e)),
        );
        aggregatedValue =
          values.length > 0
            ? values.reduce((a, b) => a + b) / values.length
            : 0;
        break;

      case 'min':
        if (!aggregation.field)
          throw new Error('Field required for min aggregation');
        const minValues = relevantEvents.map((e) =>
          Number(this.getFieldValue(aggregation.field!, e)),
        );
        aggregatedValue = minValues.length > 0 ? Math.min(...minValues) : 0;
        break;

      case 'max':
        if (!aggregation.field)
          throw new Error('Field required for max aggregation');
        const maxValues = relevantEvents.map((e) =>
          Number(this.getFieldValue(aggregation.field!, e)),
        );
        aggregatedValue = maxValues.length > 0 ? Math.max(...maxValues) : 0;
        break;

      case 'distinct_count':
        if (!aggregation.field)
          throw new Error('Field required for distinct_count aggregation');
        const distinctValues = new Set(
          relevantEvents.map((e) => this.getFieldValue(aggregation.field!, e)),
        );
        aggregatedValue = distinctValues.size;
        break;

      default:
        throw new Error(
          `Unknown aggregation function: ${aggregation.function}`,
        );
    }

    return aggregatedValue >= aggregation.threshold;
  }

  /**
   * Get applicable trigger rules for an event type and organization
   */
  private getApplicableRules(
    eventType: TriggerEventType,
    organizationId: string,
  ): TriggerRule[] {
    return Array.from(this.triggers.values()).filter(
      (rule) =>
        rule.eventType === eventType &&
        (rule.organizationId === organizationId || !rule.organizationId) &&
        rule.isActive,
    );
  }

  /**
   * Execute callbacks for triggered events
   */
  private async executeCallbacks(
    event: string,
    triggerEvent: TriggerEvent,
  ): Promise<void> {
    const registrations = this.registrations.get(event) || [];

    for (const registration of registrations) {
      try {
        await registration.callback(triggerEvent);
      } catch (error) {
        console.error(
          `Error executing callback for trigger ${registration.triggerId}:`,
          error,
        );
      }
    }
  }

  /**
   * Get field value from event data
   */
  private getFieldValue(field: string, event: TriggerEvent): any {
    const parts = field.split('.');
    let value: any = event;

    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }

    return value;
  }

  /**
   * Check if field has changed within time window
   */
  private async hasFieldChanged(
    field: string,
    event: TriggerEvent,
    timeWindow?: TimeWindow,
  ): Promise<boolean> {
    if (!timeWindow) return false;

    const timeWindowMs = this.convertTimeWindowToMs(timeWindow);
    const cutoffTime = new Date(event.timestamp.getTime() - timeWindowMs);

    const previousEvents = this.eventHistory
      .filter(
        (e) =>
          e.userId === event.userId &&
          e.type === event.type &&
          e.timestamp >= cutoffTime &&
          e.timestamp < event.timestamp,
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (previousEvents.length === 0) return true; // First occurrence counts as change

    const currentValue = this.getFieldValue(field, event);
    const previousValue = this.getFieldValue(field, previousEvents[0]);

    return currentValue !== previousValue;
  }

  /**
   * Check for upward trend in field values
   */
  private async hasUpwardTrend(
    field: string,
    event: TriggerEvent,
    timeWindow?: TimeWindow,
  ): Promise<boolean> {
    if (!timeWindow) return false;

    const values = await this.getFieldTrendValues(field, event, timeWindow);
    if (values.length < 2) return false;

    // Simple trend detection: compare first and last values
    return values[values.length - 1] > values[0];
  }

  /**
   * Check for downward trend in field values
   */
  private async hasDownwardTrend(
    field: string,
    event: TriggerEvent,
    timeWindow?: TimeWindow,
  ): Promise<boolean> {
    if (!timeWindow) return false;

    const values = await this.getFieldTrendValues(field, event, timeWindow);
    if (values.length < 2) return false;

    // Simple trend detection: compare first and last values
    return values[values.length - 1] < values[0];
  }

  /**
   * Get field values for trend analysis
   */
  private async getFieldTrendValues(
    field: string,
    event: TriggerEvent,
    timeWindow: TimeWindow,
  ): Promise<number[]> {
    const timeWindowMs = this.convertTimeWindowToMs(timeWindow);
    const cutoffTime = new Date(event.timestamp.getTime() - timeWindowMs);

    const relevantEvents = this.eventHistory
      .filter(
        (e) =>
          e.userId === event.userId &&
          e.type === event.type &&
          e.timestamp >= cutoffTime &&
          e.timestamp <= event.timestamp,
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return relevantEvents.map((e) => Number(this.getFieldValue(field, e)));
  }

  /**
   * Convert time window to milliseconds
   */
  private convertTimeWindowToMs(timeWindow: TimeWindow): number {
    const multipliers = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
    };

    return timeWindow.duration * multipliers[timeWindow.unit];
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.metrics.activeRules = Array.from(this.triggers.values()).filter(
      (rule) => rule.isActive,
    ).length;
  }

  /**
   * Update processing time metrics
   */
  private updateProcessingTimeMetrics(processingTime: number): void {
    const totalProcessingTime =
      this.metrics.averageProcessingTime * (this.metrics.processedEvents - 1);
    this.metrics.averageProcessingTime =
      (totalProcessingTime + processingTime) / this.metrics.processedEvents;
  }

  /**
   * Get trigger metrics
   */
  getTriggerMetrics(): TriggerMetrics {
    return {
      ...this.metrics,
      lastProcessedAt:
        this.eventHistory.length > 0
          ? this.eventHistory[this.eventHistory.length - 1].timestamp
          : undefined,
    };
  }

  /**
   * Get trigger rule by ID
   */
  getTriggerRule(id: string): TriggerRule | undefined {
    return this.triggers.get(id);
  }

  /**
   * Get all trigger rules for organization
   */
  getTriggerRules(organizationId?: string): TriggerRule[] {
    return Array.from(this.triggers.values()).filter(
      (rule) => !organizationId || rule.organizationId === organizationId,
    );
  }

  /**
   * Update trigger rule
   */
  async updateTriggerRule(
    id: string,
    updates: Partial<z.infer<typeof triggerRuleSchema>>,
  ): Promise<TriggerRule | null> {
    const existingRule = this.triggers.get(id);
    if (!existingRule) return null;

    const updatedRule: TriggerRule = {
      ...existingRule,
      ...updates,
      updatedAt: new Date(),
    };

    // Validate updated rule
    const validatedData = triggerRuleSchema.parse(updatedRule);

    this.triggers.set(id, updatedRule);
    this.updateMetrics();

    return updatedRule;
  }

  /**
   * Delete trigger rule
   */
  async deleteTriggerRule(id: string): Promise<boolean> {
    const deleted = this.triggers.delete(id);
    if (deleted) {
      this.updateMetrics();
    }
    return deleted;
  }

  /**
   * Clear event history older than specified days
   */
  clearOldEvents(days: number = 30): void {
    const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    this.eventHistory = this.eventHistory.filter(
      (event) => event.timestamp >= cutoffTime,
    );
  }
}

// Export singleton instance
export const triggerManager = new TriggerManager();
