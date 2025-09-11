/**
 * Conditional Engine for Journey Branching
 * Handles IF/THEN logic, multiple conditions, and variable-based decisions
 */

export interface Condition {
  id: string;
  type: 'variable' | 'function' | 'comparison';
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'starts_with'
    | 'ends_with'
    | 'exists';
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array';
}

export interface ConditionGroup {
  id: string;
  operator: 'AND' | 'OR';
  conditions: (Condition | ConditionGroup)[];
}

export interface ConditionalBranch {
  id: string;
  name: string;
  conditionGroup: ConditionGroup;
  truePath: string; // Next node ID if condition is true
  falsePath: string; // Next node ID if condition is false
  abTestConfig?: {
    enabled: boolean;
    splitPercentage: number; // 0-100
    variants: string[]; // Node IDs for different variants
  };
}

export interface BranchContext {
  variables: Record<string, any>;
  clientData: Record<string, any>;
  weddingData: Record<string, any>;
  timestamp: Date;
  userId: string;
  journeyId: string;
  instanceId: string;
}

export class ConditionalEngine {
  private evaluationMetrics: Map<string, number> = new Map();

  /**
   * Main evaluation method for conditional branches
   */
  async evaluateBranch(
    branch: ConditionalBranch,
    context: BranchContext,
  ): Promise<{
    result: boolean;
    nextNodeId: string;
    evaluationTime: number;
    metadata: Record<string, any>;
  }> {
    const startTime = performance.now();

    try {
      // Handle A/B testing if enabled
      if (branch.abTestConfig?.enabled) {
        const abResult = this.handleABTesting(branch, context);
        if (abResult) {
          const endTime = performance.now();
          return {
            result: true,
            nextNodeId: abResult.nextNodeId,
            evaluationTime: endTime - startTime,
            metadata: {
              type: 'ab_test',
              variant: abResult.variant,
              splitPercentage: branch.abTestConfig.splitPercentage,
            },
          };
        }
      }

      // Evaluate condition group
      const result = await this.evaluateConditionGroup(
        branch.conditionGroup,
        context,
      );
      const nextNodeId = result ? branch.truePath : branch.falsePath;

      const endTime = performance.now();
      const evaluationTime = endTime - startTime;

      // Track performance metrics
      this.updateMetrics(branch.id, evaluationTime);

      return {
        result,
        nextNodeId,
        evaluationTime,
        metadata: {
          type: 'conditional',
          conditionsEvaluated: this.countConditions(branch.conditionGroup),
        },
      };
    } catch (error) {
      const endTime = performance.now();
      throw new Error(`Conditional evaluation failed: ${error}`);
    }
  }

  /**
   * Evaluate a condition group (supports nested AND/OR logic)
   */
  private async evaluateConditionGroup(
    group: ConditionGroup,
    context: BranchContext,
  ): Promise<boolean> {
    const results: boolean[] = [];

    for (const item of group.conditions) {
      if ('operator' in item) {
        // It's a nested condition group
        const nestedResult = await this.evaluateConditionGroup(item, context);
        results.push(nestedResult);
      } else {
        // It's a single condition
        const conditionResult = await this.evaluateCondition(item, context);
        results.push(conditionResult);
      }
    }

    // Apply the group operator
    if (group.operator === 'AND') {
      return results.every((result) => result);
    } else {
      // OR
      return results.some((result) => result);
    }
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: Condition,
    context: BranchContext,
  ): Promise<boolean> {
    const value = this.extractValue(condition.field, context);
    const expectedValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return this.compareValues(value, expectedValue, '===');
      case 'not_equals':
        return this.compareValues(value, expectedValue, '!==');
      case 'greater_than':
        return this.compareValues(value, expectedValue, '>');
      case 'less_than':
        return this.compareValues(value, expectedValue, '<');
      case 'contains':
        return this.stringContains(value, expectedValue);
      case 'starts_with':
        return this.stringStartsWith(value, expectedValue);
      case 'ends_with':
        return this.stringEndsWith(value, expectedValue);
      case 'exists':
        return value !== undefined && value !== null;
      default:
        throw new Error(`Unsupported operator: ${condition.operator}`);
    }
  }

  /**
   * Extract value from context using field path
   */
  private extractValue(field: string, context: BranchContext): any {
    const parts = field.split('.');
    let current: any = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Handle A/B testing logic
   */
  private handleABTesting(
    branch: ConditionalBranch,
    context: BranchContext,
  ): { nextNodeId: string; variant: string } | null {
    if (!branch.abTestConfig || !branch.abTestConfig.enabled) {
      return null;
    }

    // Use user ID for consistent variant assignment
    const hash = this.simpleHash(context.userId + branch.id);
    const percentage = hash % 100;

    if (percentage < branch.abTestConfig.splitPercentage) {
      const variantIndex = hash % branch.abTestConfig.variants.length;
      return {
        nextNodeId: branch.abTestConfig.variants[variantIndex],
        variant: `variant_${variantIndex}`,
      };
    }

    return null;
  }

  /**
   * Compare values based on operator
   */
  private compareValues(value1: any, value2: any, operator: string): boolean {
    switch (operator) {
      case '===':
        return value1 === value2;
      case '!==':
        return value1 !== value2;
      case '>':
        return Number(value1) > Number(value2);
      case '<':
        return Number(value1) < Number(value2);
      default:
        return false;
    }
  }

  /**
   * String operations
   */
  private stringContains(value: any, expected: any): boolean {
    return String(value).toLowerCase().includes(String(expected).toLowerCase());
  }

  private stringStartsWith(value: any, expected: any): boolean {
    return String(value)
      .toLowerCase()
      .startsWith(String(expected).toLowerCase());
  }

  private stringEndsWith(value: any, expected: any): boolean {
    return String(value).toLowerCase().endsWith(String(expected).toLowerCase());
  }

  /**
   * Simple hash function for A/B testing
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Count total conditions in a group (for metrics)
   */
  private countConditions(group: ConditionGroup): number {
    let count = 0;
    for (const item of group.conditions) {
      if ('operator' in item) {
        count += this.countConditions(item);
      } else {
        count++;
      }
    }
    return count;
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(branchId: string, evaluationTime: number): void {
    this.evaluationMetrics.set(branchId, evaluationTime);
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): Record<string, number> {
    return Object.fromEntries(this.evaluationMetrics);
  }

  /**
   * Clear metrics (for testing)
   */
  public clearMetrics(): void {
    this.evaluationMetrics.clear();
  }
}

/**
 * Utility functions for building conditions
 */
export const ConditionBuilder = {
  /**
   * Create a simple condition
   */
  condition(
    field: string,
    operator: Condition['operator'],
    value: any,
    dataType: Condition['dataType'] = 'string',
  ): Condition {
    return {
      id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'comparison',
      field,
      operator,
      value,
      dataType,
    };
  },

  /**
   * Create a condition group
   */
  group(
    operator: 'AND' | 'OR',
    conditions: (Condition | ConditionGroup)[],
  ): ConditionGroup {
    return {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operator,
      conditions,
    };
  },

  /**
   * Wedding-specific condition helpers
   */
  wedding: {
    isDestination: (distanceThreshold: number = 100): Condition =>
      ConditionBuilder.condition(
        'weddingData.location.distance',
        'greater_than',
        distanceThreshold,
        'number',
      ),

    isLocal: (distanceThreshold: number = 100): Condition =>
      ConditionBuilder.condition(
        'weddingData.location.distance',
        'less_than',
        distanceThreshold,
        'number',
      ),

    hasVenue: (): Condition =>
      ConditionBuilder.condition('weddingData.venue.id', 'exists', true),

    guestCount: (
      operator: 'greater_than' | 'less_than',
      count: number,
    ): Condition =>
      ConditionBuilder.condition(
        'weddingData.guestCount',
        operator,
        count,
        'number',
      ),

    budget: (
      operator: 'greater_than' | 'less_than',
      amount: number,
    ): Condition =>
      ConditionBuilder.condition(
        'weddingData.budget',
        operator,
        amount,
        'number',
      ),
  },
};
