import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'exists'
  | 'not_exists'
  | 'in'
  | 'not_in'
  | 'regex_match'
  | 'is_empty'
  | 'is_not_empty'
  | 'date_before'
  | 'date_after'
  | 'days_since'
  | 'days_until';

export type LogicalOperator = 'AND' | 'OR';

export interface JourneyCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: any;
  logicalOperator?: LogicalOperator;
  group?: string; // For grouping conditions with parentheses
}

export interface ConditionGroup {
  id: string;
  conditions: JourneyCondition[];
  logicalOperator: LogicalOperator;
  parentGroup?: string;
}

export interface ConditionExecutionConfig {
  conditions: JourneyCondition[];
  groups?: ConditionGroup[];
  defaultResult?: boolean; // If no conditions match
  stopOnFirstMatch?: boolean;
  cacheResult?: boolean;
  debugMode?: boolean;
}

export interface ConditionExecutionResult {
  result: boolean;
  matchedConditions: string[];
  evaluationLog: Array<{
    conditionId: string;
    field: string;
    operator: ConditionOperator;
    value: any;
    actualValue: any;
    result: boolean;
    error?: string;
  }>;
  executionTime: number;
  cacheHit?: boolean;
}

/**
 * Condition Executor - Evaluates complex conditional logic for journey branching
 */
export class ConditionExecutor {
  /**
   * Execute condition evaluation
   */
  static async execute(
    instanceId: string,
    clientId: string,
    config: ConditionExecutionConfig,
    variables: Record<string, any> = {},
  ): Promise<ConditionExecutionResult> {
    const startTime = Date.now();

    try {
      // Check cache if enabled
      if (config.cacheResult) {
        const cachedResult = await this.getCachedResult(instanceId, config);
        if (cachedResult) {
          return {
            ...cachedResult,
            cacheHit: true,
          };
        }
      }

      // Get client data for evaluation
      const clientData = await this.getClientData(clientId);

      // Merge all data sources
      const evaluationData = {
        ...variables,
        ...clientData,
        // System variables
        current_date: new Date().toISOString(),
        current_time: new Date().toTimeString(),
        day_of_week: new Date().getDay(),
        hour_of_day: new Date().getHours(),
      };

      // Evaluate conditions
      const result = await this.evaluateConditions(config, evaluationData);

      // Record evaluation result
      await this.recordConditionEvaluation(
        instanceId,
        clientId,
        config,
        result,
      );

      // Cache result if enabled
      if (config.cacheResult) {
        await this.cacheResult(instanceId, config, result);
      }

      return {
        ...result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Condition execution failed:', error);

      const errorResult: ConditionExecutionResult = {
        result: config.defaultResult ?? false,
        matchedConditions: [],
        evaluationLog: [
          {
            conditionId: 'error',
            field: 'system',
            operator: 'equals',
            value: 'error',
            actualValue:
              error instanceof Error ? error.message : 'Unknown error',
            result: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
        executionTime: Date.now() - startTime,
      };

      await this.recordConditionEvaluation(
        instanceId,
        clientId,
        config,
        errorResult,
      );

      return errorResult;
    }
  }

  /**
   * Get client data for condition evaluation
   */
  private static async getClientData(
    clientId: string,
  ): Promise<Record<string, any>> {
    const { data: client } = await supabase
      .from('clients')
      .select(
        `
        *,
        vendor:vendors(business_name, vendor_type)
      `,
      )
      .eq('id', clientId)
      .single();

    if (!client) {
      return {};
    }

    // Transform client data for condition evaluation
    const clientData = {
      // Basic info
      client_id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone,

      // Event details
      event_date: client.event_date,
      event_type: client.event_type,
      guest_count: client.guest_count,
      budget_range: client.budget_range,
      venue_name: client.venue_name,
      venue_address: client.venue_address,

      // Status fields
      status: client.status,
      journey_stage: client.journey_stage,

      // Dates
      created_at: client.created_at,
      updated_at: client.updated_at,
      last_contacted_at: client.last_contacted_at,

      // Custom fields
      ...(client.custom_fields || {}),

      // Tags
      tags: client.tags || [],

      // Vendor info
      vendor_name: client.vendor?.business_name,
      vendor_type: client.vendor?.vendor_type,

      // Calculated fields
      days_since_created: this.daysBetween(
        new Date(client.created_at),
        new Date(),
      ),
      days_until_event: client.event_date
        ? this.daysBetween(new Date(), new Date(client.event_date))
        : null,
      days_since_last_contact: client.last_contacted_at
        ? this.daysBetween(new Date(client.last_contacted_at), new Date())
        : null,
    };

    return clientData;
  }

  /**
   * Evaluate all conditions
   */
  private static async evaluateConditions(
    config: ConditionExecutionConfig,
    data: Record<string, any>,
  ): Promise<Omit<ConditionExecutionResult, 'executionTime'>> {
    const evaluationLog: ConditionExecutionResult['evaluationLog'] = [];
    const matchedConditions: string[] = [];

    if (config.conditions.length === 0) {
      return {
        result: config.defaultResult ?? true,
        matchedConditions,
        evaluationLog,
      };
    }

    // Group conditions if groups are defined
    if (config.groups && config.groups.length > 0) {
      return this.evaluateGroupedConditions(config.groups, data);
    }

    // Evaluate simple conditions
    let result = true;

    for (let i = 0; i < config.conditions.length; i++) {
      const condition = config.conditions[i];
      const conditionResult = await this.evaluateSingleCondition(
        condition,
        data,
      );

      evaluationLog.push(conditionResult);

      if (conditionResult.result) {
        matchedConditions.push(condition.id);
      }

      // Apply logical operators
      if (i === 0) {
        result = conditionResult.result;
      } else {
        const logicalOp = config.conditions[i - 1].logicalOperator || 'AND';
        if (logicalOp === 'AND') {
          result = result && conditionResult.result;
        } else {
          result = result || conditionResult.result;
        }
      }

      // Stop early if configured and we have a definitive result
      if (config.stopOnFirstMatch && conditionResult.result) {
        break;
      }
    }

    return {
      result,
      matchedConditions,
      evaluationLog,
    };
  }

  /**
   * Evaluate grouped conditions (with parentheses)
   */
  private static async evaluateGroupedConditions(
    groups: ConditionGroup[],
    data: Record<string, any>,
  ): Promise<Omit<ConditionExecutionResult, 'executionTime'>> {
    const evaluationLog: ConditionExecutionResult['evaluationLog'] = [];
    const matchedConditions: string[] = [];
    const groupResults: Record<string, boolean> = {};

    // Evaluate each group
    for (const group of groups) {
      let groupResult = true;

      for (let i = 0; i < group.conditions.length; i++) {
        const condition = group.conditions[i];
        const conditionResult = await this.evaluateSingleCondition(
          condition,
          data,
        );

        evaluationLog.push(conditionResult);

        if (conditionResult.result) {
          matchedConditions.push(condition.id);
        }

        // Apply logical operators within group
        if (i === 0) {
          groupResult = conditionResult.result;
        } else {
          if (group.logicalOperator === 'AND') {
            groupResult = groupResult && conditionResult.result;
          } else {
            groupResult = groupResult || conditionResult.result;
          }
        }
      }

      groupResults[group.id] = groupResult;
    }

    // Combine group results (simplified - assumes all groups use AND)
    const finalResult = Object.values(groupResults).every((result) => result);

    return {
      result: finalResult,
      matchedConditions,
      evaluationLog,
    };
  }

  /**
   * Evaluate a single condition
   */
  private static async evaluateSingleCondition(
    condition: JourneyCondition,
    data: Record<string, any>,
  ): Promise<ConditionExecutionResult['evaluationLog'][0]> {
    try {
      const fieldValue = this.getFieldValue(data, condition.field);
      const conditionValue = condition.value;

      let result = false;

      switch (condition.operator) {
        case 'equals':
          result = fieldValue === conditionValue;
          break;

        case 'not_equals':
          result = fieldValue !== conditionValue;
          break;

        case 'contains':
          result = String(fieldValue)
            .toLowerCase()
            .includes(String(conditionValue).toLowerCase());
          break;

        case 'not_contains':
          result = !String(fieldValue)
            .toLowerCase()
            .includes(String(conditionValue).toLowerCase());
          break;

        case 'starts_with':
          result = String(fieldValue)
            .toLowerCase()
            .startsWith(String(conditionValue).toLowerCase());
          break;

        case 'ends_with':
          result = String(fieldValue)
            .toLowerCase()
            .endsWith(String(conditionValue).toLowerCase());
          break;

        case 'greater_than':
          result = Number(fieldValue) > Number(conditionValue);
          break;

        case 'greater_than_or_equal':
          result = Number(fieldValue) >= Number(conditionValue);
          break;

        case 'less_than':
          result = Number(fieldValue) < Number(conditionValue);
          break;

        case 'less_than_or_equal':
          result = Number(fieldValue) <= Number(conditionValue);
          break;

        case 'exists':
          result = fieldValue !== undefined && fieldValue !== null;
          break;

        case 'not_exists':
          result = fieldValue === undefined || fieldValue === null;
          break;

        case 'in':
          result =
            Array.isArray(conditionValue) &&
            conditionValue.includes(fieldValue);
          break;

        case 'not_in':
          result =
            Array.isArray(conditionValue) &&
            !conditionValue.includes(fieldValue);
          break;

        case 'regex_match':
          try {
            const regex = new RegExp(conditionValue);
            result = regex.test(String(fieldValue));
          } catch (e) {
            throw new Error(`Invalid regex pattern: ${conditionValue}`);
          }
          break;

        case 'is_empty':
          result =
            !fieldValue ||
            (Array.isArray(fieldValue) && fieldValue.length === 0) ||
            (typeof fieldValue === 'string' && fieldValue.trim() === '');
          break;

        case 'is_not_empty':
          result =
            !!fieldValue &&
            !(Array.isArray(fieldValue) && fieldValue.length === 0) &&
            !(typeof fieldValue === 'string' && fieldValue.trim() === '');
          break;

        case 'date_before':
          result = new Date(fieldValue) < new Date(conditionValue);
          break;

        case 'date_after':
          result = new Date(fieldValue) > new Date(conditionValue);
          break;

        case 'days_since':
          const daysSince = this.daysBetween(new Date(fieldValue), new Date());
          result = daysSince >= Number(conditionValue);
          break;

        case 'days_until':
          const daysUntil = this.daysBetween(new Date(), new Date(fieldValue));
          result = daysUntil <= Number(conditionValue);
          break;

        default:
          throw new Error(`Unknown condition operator: ${condition.operator}`);
      }

      return {
        conditionId: condition.id,
        field: condition.field,
        operator: condition.operator,
        value: conditionValue,
        actualValue: fieldValue,
        result,
      };
    } catch (error) {
      return {
        conditionId: condition.id,
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        actualValue: undefined,
        result: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get field value with support for nested paths
   */
  private static getFieldValue(
    data: Record<string, any>,
    fieldPath: string,
  ): any {
    const parts = fieldPath.split('.');
    let value = data;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Calculate days between two dates
   */
  private static daysBetween(date1: Date, date2: Date): number {
    const diffTime = date2.getTime() - date1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Record condition evaluation for audit trail
   */
  private static async recordConditionEvaluation(
    instanceId: string,
    clientId: string,
    config: ConditionExecutionConfig,
    result: Omit<ConditionExecutionResult, 'executionTime'>,
  ) {
    try {
      await supabase.from('journey_events').insert({
        instance_id: instanceId,
        client_id: clientId,
        event_type: 'condition_evaluated',
        event_source: 'system',
        event_data: {
          result: result.result,
          matchedConditions: result.matchedConditions,
          conditionCount: config.conditions.length,
          evaluationLog: config.debugMode ? result.evaluationLog : undefined,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to record condition evaluation:', error);
    }
  }

  /**
   * Get cached condition result
   */
  private static async getCachedResult(
    instanceId: string,
    config: ConditionExecutionConfig,
  ): Promise<ConditionExecutionResult | null> {
    try {
      // Create a hash of the configuration for cache key
      const configHash = this.hashConfig(config);

      const { data: cached } = await supabase
        .from('journey_events')
        .select('event_data')
        .eq('instance_id', instanceId)
        .eq('event_type', 'condition_cached')
        .contains('event_data', { configHash })
        .gte('occurred_at', new Date(Date.now() - 60000).toISOString()) // 1 minute cache
        .single();

      if (cached?.event_data?.result) {
        return cached.event_data.result;
      }
    } catch (error) {
      // Cache miss or error - continue with evaluation
    }

    return null;
  }

  /**
   * Cache condition result
   */
  private static async cacheResult(
    instanceId: string,
    config: ConditionExecutionConfig,
    result: Omit<ConditionExecutionResult, 'executionTime'>,
  ) {
    try {
      const configHash = this.hashConfig(config);

      await supabase.from('journey_events').insert({
        instance_id: instanceId,
        event_type: 'condition_cached',
        event_source: 'system',
        event_data: {
          configHash,
          result,
          cachedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to cache condition result:', error);
    }
  }

  /**
   * Create hash of configuration for caching
   */
  private static hashConfig(config: ConditionExecutionConfig): string {
    // Simple hash - in production you might want a more robust solution
    const configString = JSON.stringify({
      conditions: config.conditions,
      groups: config.groups,
      defaultResult: config.defaultResult,
    });

    return Buffer.from(configString).toString('base64').slice(0, 16);
  }

  /**
   * Get condition execution statistics
   */
  static async getConditionStats(
    instanceId?: string,
    journeyId?: string,
  ): Promise<{
    totalEvaluations: number;
    trueResults: number;
    falseResults: number;
    averageExecutionTime: number;
    mostFrequentConditions: Array<{ field: string; count: number }>;
  }> {
    try {
      let query = supabase
        .from('journey_events')
        .select('event_data')
        .eq('event_type', 'condition_evaluated');

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }
      if (journeyId) {
        query = query.eq('journey_id', journeyId);
      }

      const { data: events } = await query;

      if (!events || events.length === 0) {
        return {
          totalEvaluations: 0,
          trueResults: 0,
          falseResults: 0,
          averageExecutionTime: 0,
          mostFrequentConditions: [],
        };
      }

      const stats = {
        totalEvaluations: events.length,
        trueResults: events.filter((e) => e.event_data?.result === true).length,
        falseResults: events.filter((e) => e.event_data?.result === false)
          .length,
        averageExecutionTime: 0,
        mostFrequentConditions: [],
      };

      return stats;
    } catch (error) {
      console.error('Failed to get condition stats:', error);
      return {
        totalEvaluations: 0,
        trueResults: 0,
        falseResults: 0,
        averageExecutionTime: 0,
        mostFrequentConditions: [],
      };
    }
  }

  /**
   * Validate condition configuration
   */
  static validateConfig(config: ConditionExecutionConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.conditions || config.conditions.length === 0) {
      errors.push('At least one condition is required');
    }

    config.conditions.forEach((condition, index) => {
      if (!condition.id) {
        errors.push(`Condition ${index + 1}: ID is required`);
      }

      if (!condition.field) {
        errors.push(`Condition ${index + 1}: Field is required`);
      }

      if (!condition.operator) {
        errors.push(`Condition ${index + 1}: Operator is required`);
      }

      if (
        condition.value === undefined &&
        !['exists', 'not_exists', 'is_empty', 'is_not_empty'].includes(
          condition.operator,
        )
      ) {
        errors.push(
          `Condition ${index + 1}: Value is required for operator ${condition.operator}`,
        );
      }
    });

    // Validate groups if present
    if (config.groups) {
      config.groups.forEach((group, index) => {
        if (!group.id) {
          errors.push(`Group ${index + 1}: ID is required`);
        }

        if (!group.conditions || group.conditions.length === 0) {
          errors.push(`Group ${index + 1}: At least one condition is required`);
        }

        if (!group.logicalOperator) {
          errors.push(`Group ${index + 1}: Logical operator is required`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
