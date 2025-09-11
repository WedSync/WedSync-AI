/**
 * Advanced Condition Evaluator for Journey Branching
 * Handles complex expressions, functions, and variable operations
 */

import { BranchContext, Condition, ConditionGroup } from './conditionalEngine';

export interface EvaluationResult {
  success: boolean;
  value: any;
  error?: string;
  executionTime: number;
}

export interface FunctionDefinition {
  name: string;
  params: string[];
  expression: string;
  description?: string;
}

export class ConditionEvaluator {
  private functions: Map<string, FunctionDefinition> = new Map();
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeBuiltInFunctions();
  }

  /**
   * Evaluate any condition with advanced logic
   */
  async evaluate(
    condition: Condition,
    context: BranchContext,
  ): Promise<EvaluationResult> {
    const startTime = performance.now();

    try {
      let result: any;

      switch (condition.type) {
        case 'variable':
          result = this.evaluateVariable(condition, context);
          break;
        case 'function':
          result = await this.evaluateFunction(condition, context);
          break;
        case 'comparison':
          result = this.evaluateComparison(condition, context);
          break;
        default:
          throw new Error(`Unknown condition type: ${condition.type}`);
      }

      const endTime = performance.now();

      return {
        success: true,
        value: result,
        executionTime: endTime - startTime,
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        value: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: endTime - startTime,
      };
    }
  }

  /**
   * Evaluate variable-based conditions
   */
  private evaluateVariable(condition: Condition, context: BranchContext): any {
    const cacheKey = `var_${condition.field}_${JSON.stringify(context.variables)}`;

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const value = this.getNestedValue(condition.field, context);

    this.setCache(cacheKey, value);
    return value;
  }

  /**
   * Evaluate function-based conditions
   */
  private async evaluateFunction(
    condition: Condition,
    context: BranchContext,
  ): Promise<any> {
    const functionName = condition.field;
    const func = this.functions.get(functionName);

    if (!func) {
      throw new Error(`Function not found: ${functionName}`);
    }

    const cacheKey = `func_${functionName}_${JSON.stringify(condition.value)}_${JSON.stringify(context)}`;

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const result = await this.executeFunction(func, condition.value, context);

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Evaluate comparison conditions
   */
  private evaluateComparison(
    condition: Condition,
    context: BranchContext,
  ): boolean {
    const leftValue = this.getNestedValue(condition.field, context);
    const rightValue = condition.value;

    return this.performComparison(
      leftValue,
      rightValue,
      condition.operator,
      condition.dataType,
    );
  }

  /**
   * Execute a custom function
   */
  private async executeFunction(
    func: FunctionDefinition,
    params: any,
    context: BranchContext,
  ): Promise<any> {
    // Create a safe execution context
    const executionContext = {
      ...context,
      params: Array.isArray(params) ? params : [params],
      // Utility functions
      dateAdd: (date: Date, days: number) =>
        new Date(date.getTime() + days * 24 * 60 * 60 * 1000),
      dateDiff: (date1: Date, date2: Date) =>
        Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24),
      stringFormat: (template: string, ...args: any[]) =>
        template.replace(/{(\d+)}/g, (match, number) => args[number] || match),
      arrayContains: (array: any[], value: any) =>
        Array.isArray(array) && array.includes(value),
      objectHasPath: (obj: any, path: string) =>
        this.getNestedValue(path, { root: obj }) !== undefined,
      // Wedding-specific functions
      calculateWeddingDate: this.calculateWeddingDate,
      getSeasonFromDate: this.getSeasonFromDate,
      isWeekend: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
    };

    try {
      // Use Function constructor for safe evaluation
      const evaluator = new Function(
        'context',
        `
        with (context) {
          return ${func.expression};
        }
      `,
      );

      return evaluator(executionContext);
    } catch (error) {
      throw new Error(`Function execution failed: ${error}`);
    }
  }

  /**
   * Perform comparison based on operator and data type
   */
  private performComparison(
    left: any,
    right: any,
    operator: Condition['operator'],
    dataType: Condition['dataType'],
  ): boolean {
    // Type conversion based on dataType
    const [leftVal, rightVal] = this.convertValues(left, right, dataType);

    switch (operator) {
      case 'equals':
        return leftVal === rightVal;
      case 'not_equals':
        return leftVal !== rightVal;
      case 'greater_than':
        return leftVal > rightVal;
      case 'less_than':
        return leftVal < rightVal;
      case 'contains':
        if (dataType === 'array') {
          return Array.isArray(leftVal) && leftVal.includes(rightVal);
        }
        return String(leftVal)
          .toLowerCase()
          .includes(String(rightVal).toLowerCase());
      case 'starts_with':
        return String(leftVal)
          .toLowerCase()
          .startsWith(String(rightVal).toLowerCase());
      case 'ends_with':
        return String(leftVal)
          .toLowerCase()
          .endsWith(String(rightVal).toLowerCase());
      case 'exists':
        return leftVal !== undefined && leftVal !== null;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Convert values to appropriate types
   */
  private convertValues(
    left: any,
    right: any,
    dataType: Condition['dataType'],
  ): [any, any] {
    switch (dataType) {
      case 'number':
        return [Number(left), Number(right)];
      case 'boolean':
        return [Boolean(left), Boolean(right)];
      case 'date':
        return [new Date(left), new Date(right)];
      case 'array':
        return [
          Array.isArray(left) ? left : [left],
          Array.isArray(right) ? right : [right],
        ];
      case 'string':
      default:
        return [String(left), String(right)];
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(path: string, context: BranchContext | any): any {
    const parts = path.split('.');
    let current = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Initialize built-in functions
   */
  private initializeBuiltInFunctions(): void {
    // Date functions
    this.registerFunction({
      name: 'daysUntilWedding',
      params: ['weddingDate'],
      expression:
        'Math.ceil((new Date(weddingDate) - new Date()) / (1000 * 60 * 60 * 24))',
      description: 'Calculate days until wedding date',
    });

    this.registerFunction({
      name: 'isWithinDays',
      params: ['targetDate', 'days'],
      expression:
        'Math.abs((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24)) <= days',
      description: 'Check if date is within specified days',
    });

    // Wedding-specific functions
    this.registerFunction({
      name: 'isDestinationWedding',
      params: ['distance'],
      expression: 'distance > 100',
      description: 'Determine if wedding is destination based on distance',
    });

    this.registerFunction({
      name: 'calculatePhotographerTravel',
      params: ['venueLocation', 'photographerLocation'],
      expression: 'calculateDistance(venueLocation, photographerLocation)',
      description: 'Calculate travel distance for photographer',
    });

    // Conditional helpers
    this.registerFunction({
      name: 'hasCompletedStep',
      params: ['stepName'],
      expression:
        'variables.completedSteps && variables.completedSteps.includes(stepName)',
      description: 'Check if a specific step has been completed',
    });

    this.registerFunction({
      name: 'getPreferenceValue',
      params: ['prefKey', 'defaultValue'],
      expression:
        'clientData.preferences && clientData.preferences[prefKey] || defaultValue',
      description: 'Get client preference with fallback',
    });
  }

  /**
   * Register a custom function
   */
  public registerFunction(func: FunctionDefinition): void {
    this.functions.set(func.name, func);
  }

  /**
   * Wedding-specific helper functions
   */
  private calculateWeddingDate = (
    bookingDate: Date,
    leadTime: number,
  ): Date => {
    return new Date(bookingDate.getTime() + leadTime * 24 * 60 * 60 * 1000);
  };

  private getSeasonFromDate = (date: Date): string => {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  };

  /**
   * Cache management
   */
  private isCacheValid(key: string): boolean {
    if (!this.cache.has(key)) return false;

    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return false;
    }

    return true;
  }

  private setCache(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get available functions
   */
  public getAvailableFunctions(): FunctionDefinition[] {
    return Array.from(this.functions.values());
  }
}

/**
 * Expression builder for complex conditions
 */
export class ExpressionBuilder {
  /**
   * Build complex expressions using natural language
   */
  static build(template: string, variables: Record<string, any>): string {
    let expression = template;

    // Replace variable placeholders
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      expression = expression.replace(
        new RegExp(placeholder, 'g'),
        JSON.stringify(value),
      );
    }

    return expression;
  }

  /**
   * Wedding photographer specific expressions
   */
  static wedding = {
    destinationCheck: (distanceThreshold: number = 100) =>
      ExpressionBuilder.build('weddingData.location.distance > {{threshold}}', {
        threshold: distanceThreshold,
      }),

    timelineCheck: (daysUntilWedding: number) =>
      ExpressionBuilder.build(
        'daysUntilWedding(weddingData.date) <= {{days}}',
        { days: daysUntilWedding },
      ),

    budgetTier: (amount: number) =>
      ExpressionBuilder.build('weddingData.budget >= {{amount}}', { amount }),

    seasonalWorkflow: () => 'getSeasonFromDate(weddingData.date)',

    guestCountCategory: (threshold: number) =>
      ExpressionBuilder.build('weddingData.guestCount >= {{threshold}}', {
        threshold,
      }),
  };
}
