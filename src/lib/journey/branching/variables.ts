/**
 * Variable Management System for Journey Branching
 * Handles dynamic variables, scoping, and persistence
 */

export interface Variable {
  name: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  scope: 'global' | 'journey' | 'instance' | 'session' | 'temporary';
  readonly?: boolean;
  computed?: boolean;
  computeExpression?: string;
  metadata?: {
    description?: string;
    source?: string;
    lastUpdated?: Date;
    validUntil?: Date;
  };
}

export interface VariableScope {
  id: string;
  type: Variable['scope'];
  parentId?: string;
  variables: Map<string, Variable>;
  inherited: string[]; // Variable names inherited from parent scopes
}

export class VariableManager {
  private scopes: Map<string, VariableScope> = new Map();
  private computedVariableCache: Map<string, { value: any; expiry: number }> =
    new Map();
  private readonly COMPUTED_CACHE_TTL = 60 * 1000; // 1 minute

  constructor() {
    this.initializeDefaultScopes();
  }

  /**
   * Initialize default scopes
   */
  private initializeDefaultScopes(): void {
    // Global scope
    this.createScope('global', 'global');

    // Register system variables
    this.registerSystemVariables();
  }

  /**
   * Create a new variable scope
   */
  createScope(
    id: string,
    type: Variable['scope'],
    parentId?: string,
  ): VariableScope {
    const scope: VariableScope = {
      id,
      type,
      parentId,
      variables: new Map(),
      inherited: [],
    };

    this.scopes.set(id, scope);

    // Inherit variables from parent scope
    if (parentId) {
      this.inheritFromParent(scope, parentId);
    }

    return scope;
  }

  /**
   * Set a variable in a specific scope
   */
  setVariable(
    scopeId: string,
    name: string,
    value: any,
    options: Partial<Omit<Variable, 'name' | 'value'>> = {},
  ): void {
    const scope = this.scopes.get(scopeId);
    if (!scope) {
      throw new Error(`Scope not found: ${scopeId}`);
    }

    // Check if variable is readonly
    const existing = scope.variables.get(name);
    if (existing?.readonly) {
      throw new Error(`Cannot modify readonly variable: ${name}`);
    }

    const variable: Variable = {
      name,
      value,
      type: this.inferType(value),
      scope: scope.type,
      ...options,
      metadata: {
        ...options.metadata,
        lastUpdated: new Date(),
      },
    };

    scope.variables.set(name, variable);

    // Clear computed cache if this variable affects computed variables
    this.invalidateComputedCache(name);
  }

  /**
   * Get a variable from any accessible scope
   */
  getVariable(scopeId: string, name: string): Variable | undefined {
    // First check the specific scope
    const scope = this.scopes.get(scopeId);
    if (!scope) {
      throw new Error(`Scope not found: ${scopeId}`);
    }

    // Check direct variables
    const variable = scope.variables.get(name);
    if (variable) {
      // Handle computed variables
      if (variable.computed) {
        return this.evaluateComputedVariable(variable, scopeId);
      }
      return variable;
    }

    // Check inherited variables
    if (scope.inherited.includes(name)) {
      return this.getVariableFromParentScopes(scope, name);
    }

    // Check parent scopes
    return this.getVariableFromParentScopes(scope, name);
  }

  /**
   * Get all variables accessible from a scope
   */
  getAllVariables(scopeId: string): Record<string, any> {
    const result: Record<string, any> = {};
    const scope = this.scopes.get(scopeId);

    if (!scope) {
      throw new Error(`Scope not found: ${scopeId}`);
    }

    // Collect from all accessible scopes
    this.collectVariablesFromScope(scope, result);

    return result;
  }

  /**
   * Delete a variable
   */
  deleteVariable(scopeId: string, name: string): boolean {
    const scope = this.scopes.get(scopeId);
    if (!scope) {
      throw new Error(`Scope not found: ${scopeId}`);
    }

    const variable = scope.variables.get(name);
    if (variable?.readonly) {
      throw new Error(`Cannot delete readonly variable: ${name}`);
    }

    return scope.variables.delete(name);
  }

  /**
   * Register a computed variable
   */
  registerComputedVariable(
    scopeId: string,
    name: string,
    expression: string,
    options: Partial<
      Omit<Variable, 'name' | 'value' | 'computed' | 'computeExpression'>
    > = {},
  ): void {
    this.setVariable(scopeId, name, null, {
      ...options,
      computed: true,
      computeExpression: expression,
    });
  }

  /**
   * Wedding photographer specific variables
   */
  registerWeddingVariables(
    scopeId: string,
    weddingData: any,
    clientData: any,
  ): void {
    // Wedding details
    this.setVariable(scopeId, 'wedding.date', weddingData.date, {
      type: 'date',
      scope: 'journey',
    });
    this.setVariable(scopeId, 'wedding.venue', weddingData.venue, {
      type: 'object',
      scope: 'journey',
    });
    this.setVariable(scopeId, 'wedding.guestCount', weddingData.guestCount, {
      type: 'number',
      scope: 'journey',
    });
    this.setVariable(scopeId, 'wedding.budget', weddingData.budget, {
      type: 'number',
      scope: 'journey',
    });
    this.setVariable(scopeId, 'wedding.location', weddingData.location, {
      type: 'object',
      scope: 'journey',
    });

    // Client details
    this.setVariable(scopeId, 'client.name', clientData.name, {
      type: 'string',
      scope: 'journey',
    });
    this.setVariable(scopeId, 'client.email', clientData.email, {
      type: 'string',
      scope: 'journey',
    });
    this.setVariable(scopeId, 'client.preferences', clientData.preferences, {
      type: 'object',
      scope: 'journey',
    });

    // Computed variables
    this.registerComputedVariable(
      scopeId,
      'wedding.daysUntil',
      'Math.ceil((new Date(wedding.date) - new Date()) / (1000 * 60 * 60 * 24))',
      { type: 'number', scope: 'journey' },
    );

    this.registerComputedVariable(
      scopeId,
      'wedding.isDestination',
      'wedding.location && wedding.location.distance > 100',
      { type: 'boolean', scope: 'journey' },
    );

    this.registerComputedVariable(
      scopeId,
      'wedding.season',
      'getSeasonFromDate(new Date(wedding.date))',
      { type: 'string', scope: 'journey' },
    );

    this.registerComputedVariable(
      scopeId,
      'wedding.sizeCategory',
      'wedding.guestCount < 50 ? "intimate" : wedding.guestCount < 150 ? "medium" : "large"',
      { type: 'string', scope: 'journey' },
    );
  }

  /**
   * Session tracking variables
   */
  registerSessionVariables(scopeId: string, sessionData: any): void {
    this.setVariable(scopeId, 'session.startTime', new Date(), {
      type: 'date',
      scope: 'session',
    });
    this.setVariable(scopeId, 'session.userId', sessionData.userId, {
      type: 'string',
      scope: 'session',
    });
    this.setVariable(scopeId, 'session.deviceType', sessionData.deviceType, {
      type: 'string',
      scope: 'session',
    });
    this.setVariable(scopeId, 'session.completedSteps', [], {
      type: 'array',
      scope: 'session',
    });
    this.setVariable(scopeId, 'session.currentStep', null, {
      type: 'string',
      scope: 'session',
    });
  }

  /**
   * Private helper methods
   */
  private registerSystemVariables(): void {
    const globalScope = this.scopes.get('global')!;

    // System variables
    this.setVariable('global', 'system.currentTime', new Date(), {
      type: 'date',
      computed: true,
      computeExpression: 'new Date()',
      scope: 'global',
    });

    this.setVariable('global', 'system.timestamp', Date.now(), {
      type: 'number',
      computed: true,
      computeExpression: 'Date.now()',
      scope: 'global',
    });

    this.setVariable(
      'global',
      'system.environment',
      process.env.NODE_ENV || 'development',
      {
        type: 'string',
        readonly: true,
        scope: 'global',
      },
    );
  }

  private inheritFromParent(scope: VariableScope, parentId: string): void {
    const parentScope = this.scopes.get(parentId);
    if (parentScope) {
      scope.inherited = Array.from(parentScope.variables.keys());
    }
  }

  private getVariableFromParentScopes(
    scope: VariableScope,
    name: string,
  ): Variable | undefined {
    if (!scope.parentId) return undefined;

    const parentScope = this.scopes.get(scope.parentId);
    if (!parentScope) return undefined;

    const variable = parentScope.variables.get(name);
    if (variable) return variable;

    return this.getVariableFromParentScopes(parentScope, name);
  }

  private collectVariablesFromScope(
    scope: VariableScope,
    result: Record<string, any>,
  ): void {
    // Add variables from current scope
    for (const [name, variable] of scope.variables) {
      if (variable.computed) {
        const computedVar = this.evaluateComputedVariable(variable, scope.id);
        result[name] = computedVar?.value;
      } else {
        result[name] = variable.value;
      }
    }

    // Add from parent scopes (if not already present)
    if (scope.parentId) {
      const parentScope = this.scopes.get(scope.parentId);
      if (parentScope) {
        for (const [name, variable] of parentScope.variables) {
          if (!(name in result)) {
            if (variable.computed) {
              const computedVar = this.evaluateComputedVariable(
                variable,
                parentScope.id,
              );
              result[name] = computedVar?.value;
            } else {
              result[name] = variable.value;
            }
          }
        }
      }
    }
  }

  private evaluateComputedVariable(
    variable: Variable,
    scopeId: string,
  ): Variable | undefined {
    if (!variable.computed || !variable.computeExpression) {
      return variable;
    }

    const cacheKey = `${scopeId}_${variable.name}`;
    const cached = this.computedVariableCache.get(cacheKey);

    if (cached && Date.now() < cached.expiry) {
      return { ...variable, value: cached.value };
    }

    try {
      // Get all variables for context
      const context = this.getAllVariables(scopeId);

      // Add utility functions
      const executionContext = {
        ...context,
        getSeasonFromDate: (date: Date) => {
          const month = date.getMonth() + 1;
          if (month >= 3 && month <= 5) return 'spring';
          if (month >= 6 && month <= 8) return 'summer';
          if (month >= 9 && month <= 11) return 'fall';
          return 'winter';
        },
      };

      const evaluator = new Function(
        'context',
        `
        with (context) {
          return ${variable.computeExpression};
        }
      `,
      );

      const value = evaluator(executionContext);

      // Cache the result
      this.computedVariableCache.set(cacheKey, {
        value,
        expiry: Date.now() + this.COMPUTED_CACHE_TTL,
      });

      return { ...variable, value };
    } catch (error) {
      console.error(
        `Error evaluating computed variable ${variable.name}:`,
        error,
      );
      return { ...variable, value: null };
    }
  }

  private invalidateComputedCache(variableName: string): void {
    // Remove all cached computed variables that might depend on this variable
    for (const [key] of this.computedVariableCache) {
      if (key.includes(variableName)) {
        this.computedVariableCache.delete(key);
      }
    }
  }

  private inferType(value: any): Variable['type'] {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  /**
   * Cleanup and utility methods
   */
  clearScope(scopeId: string): void {
    const scope = this.scopes.get(scopeId);
    if (scope) {
      scope.variables.clear();
    }
  }

  deleteScope(scopeId: string): boolean {
    return this.scopes.delete(scopeId);
  }

  getScopes(): string[] {
    return Array.from(this.scopes.keys());
  }

  exportVariables(scopeId: string): Record<string, any> {
    const scope = this.scopes.get(scopeId);
    if (!scope) {
      throw new Error(`Scope not found: ${scopeId}`);
    }

    const exported: Record<string, any> = {};
    for (const [name, variable] of scope.variables) {
      exported[name] = {
        value: variable.value,
        type: variable.type,
        scope: variable.scope,
        metadata: variable.metadata,
      };
    }

    return exported;
  }

  importVariables(scopeId: string, variables: Record<string, any>): void {
    for (const [name, data] of Object.entries(variables)) {
      this.setVariable(scopeId, name, data.value, {
        type: data.type,
        scope: data.scope,
        metadata: data.metadata,
      });
    }
  }
}

/**
 * Variable builder utilities
 */
export const VariableBuilder = {
  /**
   * Create wedding-specific variables
   */
  wedding: {
    basicInfo: (weddingData: any) => ({
      'wedding.date': { value: weddingData.date, type: 'date' as const },
      'wedding.venue': { value: weddingData.venue, type: 'object' as const },
      'wedding.guestCount': {
        value: weddingData.guestCount,
        type: 'number' as const,
      },
      'wedding.budget': { value: weddingData.budget, type: 'number' as const },
    }),

    location: (locationData: any) => ({
      'wedding.location.address': {
        value: locationData.address,
        type: 'string' as const,
      },
      'wedding.location.city': {
        value: locationData.city,
        type: 'string' as const,
      },
      'wedding.location.distance': {
        value: locationData.distance,
        type: 'number' as const,
      },
      'wedding.location.coordinates': {
        value: locationData.coordinates,
        type: 'object' as const,
      },
    }),

    timeline: (timelineData: any) => ({
      'wedding.timeline.ceremony': {
        value: timelineData.ceremony,
        type: 'date' as const,
      },
      'wedding.timeline.reception': {
        value: timelineData.reception,
        type: 'date' as const,
      },
      'wedding.timeline.preparation': {
        value: timelineData.preparation,
        type: 'date' as const,
      },
    }),
  },

  /**
   * Create client-specific variables
   */
  client: {
    basic: (clientData: any) => ({
      'client.name': { value: clientData.name, type: 'string' as const },
      'client.email': { value: clientData.email, type: 'string' as const },
      'client.phone': { value: clientData.phone, type: 'string' as const },
    }),

    preferences: (preferences: any) => ({
      'client.preferences': { value: preferences, type: 'object' as const },
      'client.communicationStyle': {
        value: preferences.communicationStyle,
        type: 'string' as const,
      },
      'client.preferredTime': {
        value: preferences.preferredTime,
        type: 'string' as const,
      },
    }),
  },
};
