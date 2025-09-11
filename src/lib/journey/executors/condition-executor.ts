import { BaseNodeExecutor } from './base';
import { NodeExecutorContext, NodeExecutorResult } from './types';
import { createClient } from '@/lib/supabase/server';

interface ConditionNodeConfig {
  conditionType:
    | 'field_equals'
    | 'field_exists'
    | 'field_contains'
    | 'date_comparison'
    | 'custom';
  fieldPath?: string;
  operator?:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'exists';
  expectedValue?: any;
  dateField?: string;
  dateOperator?: 'before' | 'after' | 'on' | 'between';
  dateValue?: string;
  dateValue2?: string; // For 'between' operator
  customExpression?: string;
  trueNodes?: string[];
  falseNodes?: string[];
}

export class ConditionNodeExecutor extends BaseNodeExecutor {
  private supabase = createClient();

  async execute(
    context: NodeExecutorContext,
    config: ConditionNodeConfig,
  ): Promise<NodeExecutorResult> {
    try {
      // Evaluate the condition
      const conditionMet = await this.evaluateCondition(context, config);

      // Determine next nodes based on condition result
      const nextNodes = conditionMet ? config.trueNodes : config.falseNodes;

      this.logger.info('Condition evaluated', {
        executionId: context.executionId,
        stepId: context.stepId,
        conditionType: config.conditionType,
        result: conditionMet,
        nextNodes,
      });

      // Record condition evaluation
      await this.recordConditionEvaluation(context, config, conditionMet);

      return {
        success: true,
        output: {
          conditionMet,
          conditionType: config.conditionType,
          evaluatedAt: new Date().toISOString(),
          fieldPath: config.fieldPath,
          actualValue: config.fieldPath
            ? this.getNestedValue(context.variables, config.fieldPath)
            : undefined,
          expectedValue: config.expectedValue,
        },
        nextNodes,
      };
    } catch (error) {
      this.logger.error('Condition node execution failed', {
        executionId: context.executionId,
        stepId: context.stepId,
        error,
      });

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Condition evaluation failed',
      };
    }
  }

  private async evaluateCondition(
    context: NodeExecutorContext,
    config: ConditionNodeConfig,
  ): Promise<boolean> {
    switch (config.conditionType) {
      case 'field_equals':
        return this.evaluateFieldEquals(context, config);

      case 'field_exists':
        return this.evaluateFieldExists(context, config);

      case 'field_contains':
        return this.evaluateFieldContains(context, config);

      case 'date_comparison':
        return this.evaluateDateComparison(context, config);

      case 'custom':
        return this.evaluateCustomExpression(context, config);

      default:
        throw new Error(`Unknown condition type: ${config.conditionType}`);
    }
  }

  private evaluateFieldEquals(
    context: NodeExecutorContext,
    config: ConditionNodeConfig,
  ): boolean {
    if (!config.fieldPath) {
      throw new Error('fieldPath is required for field_equals condition');
    }

    const actualValue = this.getNestedValue(
      context.variables,
      config.fieldPath,
    );

    switch (config.operator) {
      case 'equals':
        return actualValue === config.expectedValue;
      case 'not_equals':
        return actualValue !== config.expectedValue;
      case 'greater_than':
        return Number(actualValue) > Number(config.expectedValue);
      case 'less_than':
        return Number(actualValue) < Number(config.expectedValue);
      default:
        return actualValue === config.expectedValue;
    }
  }

  private evaluateFieldExists(
    context: NodeExecutorContext,
    config: ConditionNodeConfig,
  ): boolean {
    if (!config.fieldPath) {
      throw new Error('fieldPath is required for field_exists condition');
    }

    const value = this.getNestedValue(context.variables, config.fieldPath);
    return value !== undefined && value !== null && value !== '';
  }

  private evaluateFieldContains(
    context: NodeExecutorContext,
    config: ConditionNodeConfig,
  ): boolean {
    if (!config.fieldPath) {
      throw new Error('fieldPath is required for field_contains condition');
    }

    const actualValue = this.getNestedValue(
      context.variables,
      config.fieldPath,
    );

    if (Array.isArray(actualValue)) {
      return actualValue.includes(config.expectedValue);
    }

    if (typeof actualValue === 'string') {
      return actualValue.includes(String(config.expectedValue));
    }

    return false;
  }

  private evaluateDateComparison(
    context: NodeExecutorContext,
    config: ConditionNodeConfig,
  ): boolean {
    if (!config.dateField || !config.dateValue) {
      throw new Error(
        'dateField and dateValue are required for date_comparison condition',
      );
    }

    const fieldValue = this.getNestedValue(context.variables, config.dateField);
    if (!fieldValue) {
      return false;
    }

    const fieldDate = new Date(fieldValue);
    const compareDate = new Date(config.dateValue);

    if (isNaN(fieldDate.getTime()) || isNaN(compareDate.getTime())) {
      throw new Error('Invalid date format');
    }

    switch (config.dateOperator) {
      case 'before':
        return fieldDate < compareDate;

      case 'after':
        return fieldDate > compareDate;

      case 'on':
        return fieldDate.toDateString() === compareDate.toDateString();

      case 'between':
        if (!config.dateValue2) {
          throw new Error('dateValue2 is required for between operator');
        }
        const endDate = new Date(config.dateValue2);
        return fieldDate >= compareDate && fieldDate <= endDate;

      default:
        return false;
    }
  }

  private evaluateCustomExpression(
    context: NodeExecutorContext,
    config: ConditionNodeConfig,
  ): boolean {
    if (!config.customExpression) {
      throw new Error('customExpression is required for custom condition');
    }

    try {
      // Create a safe evaluation context
      const safeContext = {
        ...context.variables,
        client: context.clientData,
        vendor: context.vendorData,
        now: new Date(),
      };

      // Simple expression evaluation (in production, use a proper expression parser)
      // This is a simplified version - consider using a library like expr-eval
      const expression = config.customExpression
        .replace(/\bAND\b/gi, '&&')
        .replace(/\bOR\b/gi, '||')
        .replace(/\bNOT\b/gi, '!');

      // WARNING: eval is dangerous - use a proper expression parser in production
      const func = new Function(
        'context',
        `with(context) { return ${expression}; }`,
      );
      return Boolean(func(safeContext));
    } catch (error) {
      this.logger.error('Custom expression evaluation failed', {
        executionId: context.executionId,
        expression: config.customExpression,
        error,
      });
      return false;
    }
  }

  private async recordConditionEvaluation(
    context: NodeExecutorContext,
    config: ConditionNodeConfig,
    result: boolean,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('journey_condition_evaluations')
      .insert({
        execution_id: context.executionId,
        step_id: context.stepId,
        condition_type: config.conditionType,
        condition_config: config,
        result,
        evaluated_at: new Date().toISOString(),
      });

    if (error) {
      this.logger.warn('Failed to record condition evaluation', {
        executionId: context.executionId,
        error,
      });
    }
  }
}
