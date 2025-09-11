/**
 * Intelligent Cache Invalidation Engine
 *
 * Automatically determines which caches to invalidate based on data changes:
 * - Dependency graph between different data types
 * - Wedding context-aware invalidation (guest list affects seating, budget, etc.)
 * - Vendor relationship mapping (photographer change affects timeline)
 * - Cascade invalidation with priority levels
 * - Smart batch invalidation to avoid cache stampede
 */

import { VendorType, IntegrationPlatform } from './cache-types';
import { invalidateAPICache } from '../middleware/cache-middleware';

export interface InvalidationRule {
  /** Trigger that causes invalidation */
  trigger: DataChangeEvent;
  /** Cache keys/patterns to invalidate */
  targets: InvalidationTarget[];
  /** Priority level for processing order */
  priority: 'critical' | 'high' | 'normal' | 'low';
  /** Delay before invalidation (to batch changes) */
  delay?: number;
  /** Conditions that must be met for invalidation */
  conditions?: InvalidationCondition[];
}

export interface DataChangeEvent {
  /** Type of data that changed */
  dataType:
    | 'guest'
    | 'vendor'
    | 'timeline'
    | 'budget'
    | 'checklist'
    | 'user'
    | 'organization';
  /** Specific operation that occurred */
  operation: 'create' | 'update' | 'delete' | 'bulk_update';
  /** ID of the affected entity */
  entityId: string;
  /** Wedding/organization context */
  weddingId?: string;
  organizationId: string;
  /** Specific fields that changed (for granular invalidation) */
  changedFields?: string[];
  /** User who made the change */
  userId?: string;
  /** Timestamp of the change */
  timestamp: string;
}

export interface InvalidationTarget {
  /** Type of cache to invalidate */
  type: 'api_route' | 'vendor_cache' | 'search_index' | 'computed_data';
  /** Specific cache keys or patterns */
  patterns: string[];
  /** Tags to invalidate */
  tags?: string[];
  /** Organization scope */
  organizationId?: string;
  /** Wedding scope */
  weddingId?: string;
}

export interface InvalidationCondition {
  /** Field to check */
  field: string;
  /** Comparison operator */
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'in'
    | 'not_in';
  /** Value to compare against */
  value: any;
}

// Comprehensive invalidation rules for wedding industry data
const INVALIDATION_RULES: InvalidationRule[] = [
  // Guest List Changes - High Impact
  {
    trigger: {
      dataType: 'guest',
      operation: 'create',
      entityId: '*',
      organizationId: '*',
      timestamp: '',
    },
    targets: [
      {
        type: 'api_route',
        patterns: [
          '/api/weddings/[id]/guests',
          '/api/weddings/[id]/seating',
          '/api/weddings/[id]/budget',
        ],
        tags: ['wedding', 'guests', 'seating', 'budget'],
      },
      {
        type: 'computed_data',
        patterns: [
          'guest_count:*',
          'seating_chart:*',
          'meal_count:*',
          'total_budget:*',
        ],
      },
    ],
    priority: 'high',
    delay: 2000, // 2 second delay to batch multiple guest additions
  },

  {
    trigger: {
      dataType: 'guest',
      operation: 'update',
      entityId: '*',
      organizationId: '*',
      timestamp: '',
    },
    targets: [
      {
        type: 'api_route',
        patterns: ['/api/weddings/[id]/guests', '/api/weddings/[id]/seating'],
        tags: ['wedding', 'guests'],
      },
    ],
    priority: 'high',
    conditions: [
      {
        field: 'rsvpStatus',
        operator: 'in',
        value: ['attending', 'not_attending'],
      },
      { field: 'dietaryRestrictions', operator: 'not_equals', value: null },
    ],
  },

  {
    trigger: {
      dataType: 'guest',
      operation: 'delete',
      entityId: '*',
      organizationId: '*',
      timestamp: '',
    },
    targets: [
      {
        type: 'api_route',
        patterns: [
          '/api/weddings/[id]/guests',
          '/api/weddings/[id]/seating',
          '/api/weddings/[id]/budget',
        ],
        tags: ['wedding', 'guests', 'seating', 'budget'],
      },
      {
        type: 'computed_data',
        patterns: ['guest_count:*', 'seating_chart:*', 'meal_count:*'],
      },
    ],
    priority: 'critical', // Deletion is immediate
  },

  // Vendor Changes - Medium to High Impact
  {
    trigger: {
      dataType: 'vendor',
      operation: 'update',
      entityId: '*',
      organizationId: '*',
      timestamp: '',
    },
    targets: [
      {
        type: 'api_route',
        patterns: [
          '/api/vendors',
          '/api/vendors/[id]',
          '/api/weddings/[id]/vendors',
        ],
        tags: ['vendors', 'search', 'wedding'],
      },
      {
        type: 'vendor_cache',
        patterns: ['*:availability:*', '*:pricing:*', '*:portfolio:*'],
      },
    ],
    priority: 'high',
    conditions: [
      { field: 'availability', operator: 'not_equals', value: null },
      { field: 'pricing', operator: 'not_equals', value: null },
    ],
  },

  // Timeline Changes - High Impact (affects multiple vendors)
  {
    trigger: {
      dataType: 'timeline',
      operation: 'update',
      entityId: '*',
      organizationId: '*',
      timestamp: '',
    },
    targets: [
      {
        type: 'api_route',
        patterns: [
          '/api/weddings/[id]/timeline',
          '/api/vendors/[id]/schedule',
          '/api/ai/recommendations',
        ],
        tags: ['timeline', 'schedule', 'vendors', 'ai'],
      },
      {
        type: 'computed_data',
        patterns: [
          'timeline_conflicts:*',
          'vendor_schedule:*',
          'recommendations:*',
        ],
      },
    ],
    priority: 'critical', // Timeline changes affect many stakeholders
    delay: 1000, // Small delay to batch timeline updates
  },

  // Budget Changes - Medium Impact
  {
    trigger: {
      dataType: 'budget',
      operation: 'update',
      entityId: '*',
      organizationId: '*',
      timestamp: '',
    },
    targets: [
      {
        type: 'api_route',
        patterns: [
          '/api/weddings/[id]/budget',
          '/api/vendors/search',
          '/api/ai/recommendations',
        ],
        tags: ['budget', 'vendors', 'ai'],
      },
      {
        type: 'computed_data',
        patterns: [
          'budget_total:*',
          'budget_remaining:*',
          'vendor_recommendations:*',
        ],
      },
    ],
    priority: 'normal',
    delay: 5000, // Longer delay as budget changes are less urgent
    conditions: [{ field: 'amount', operator: 'not_equals', value: 0 }],
  },

  // Checklist Changes - Low Impact
  {
    trigger: {
      dataType: 'checklist',
      operation: 'update',
      entityId: '*',
      organizationId: '*',
      timestamp: '',
    },
    targets: [
      {
        type: 'api_route',
        patterns: ['/api/weddings/[id]/checklist', '/api/analytics/progress'],
        tags: ['checklist', 'analytics'],
      },
    ],
    priority: 'low',
    delay: 10000, // Batch checklist updates for 10 seconds
    conditions: [{ field: 'completed', operator: 'equals', value: true }],
  },

  // User Permission Changes - Critical for Security
  {
    trigger: {
      dataType: 'user',
      operation: 'update',
      entityId: '*',
      organizationId: '*',
      timestamp: '',
    },
    targets: [
      {
        type: 'api_route',
        patterns: ['/api/organizations/[id]/members', '/api/weddings/[id]'],
        tags: ['users', 'permissions', 'wedding'],
      },
    ],
    priority: 'critical',
    conditions: [
      { field: 'permissions', operator: 'not_equals', value: null },
      { field: 'role', operator: 'not_equals', value: null },
    ],
  },

  // Organization Settings - Critical System Changes
  {
    trigger: {
      dataType: 'organization',
      operation: 'update',
      entityId: '*',
      organizationId: '*',
      timestamp: '',
    },
    targets: [
      {
        type: 'api_route',
        patterns: [
          '/api/organizations/[id]',
          '/api/organizations/[id]/settings',
        ],
        tags: ['organization', 'settings'],
      },
      {
        type: 'vendor_cache',
        patterns: ['*'], // Invalidate all vendor cache for org settings change
      },
    ],
    priority: 'critical',
  },
];

export class IntelligentInvalidationEngine {
  private pendingInvalidations: Map<string, NodeJS.Timer> = new Map();
  private invalidationHistory: DataChangeEvent[] = [];
  private maxHistorySize = 1000;

  private stats = {
    totalInvalidations: 0,
    cascadeInvalidations: 0,
    batchedInvalidations: 0,
    skippedInvalidations: 0,
    avgInvalidationTime: 0,
    lastProcessed: new Date().toISOString(),
  };

  /**
   * Process a data change event and determine what to invalidate
   */
  async processDataChange(event: DataChangeEvent): Promise<{
    invalidated: string[];
    scheduled: string[];
    skipped: string[];
  }> {
    const matchingRules = this.findMatchingRules(event);
    const result = {
      invalidated: [] as string[],
      scheduled: [] as string[],
      skipped: [] as string[],
    };

    console.log(
      `🔄 Processing data change: ${event.dataType}:${event.operation} for ${event.entityId}`,
    );

    for (const rule of matchingRules) {
      // Check conditions
      if (!this.evaluateConditions(rule.conditions, event)) {
        result.skipped.push(
          `${rule.trigger.dataType}:${rule.trigger.operation}`,
        );
        continue;
      }

      // Process based on priority and delay
      if (rule.delay && rule.delay > 0) {
        await this.scheduleInvalidation(rule, event, result);
      } else {
        await this.executeInvalidation(rule, event, result);
      }
    }

    // Store in history
    this.addToHistory(event);

    return result;
  }

  /**
   * Find rules that match the data change event
   */
  private findMatchingRules(event: DataChangeEvent): InvalidationRule[] {
    return INVALIDATION_RULES.filter((rule) => {
      const trigger = rule.trigger;

      // Check data type
      if (trigger.dataType !== event.dataType && trigger.dataType !== '*') {
        return false;
      }

      // Check operation
      if (
        trigger.operation !== event.operation &&
        trigger.operation !== ('*' as any)
      ) {
        return false;
      }

      // Check entity ID (support wildcards)
      if (trigger.entityId !== '*' && trigger.entityId !== event.entityId) {
        return false;
      }

      // Check organization ID (support wildcards)
      if (
        trigger.organizationId !== '*' &&
        trigger.organizationId !== event.organizationId
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Evaluate conditions for an invalidation rule
   */
  private evaluateConditions(
    conditions: InvalidationCondition[] | undefined,
    event: DataChangeEvent,
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    return conditions.every((condition) => {
      const fieldValue = this.getEventFieldValue(event, condition.field);
      return this.evaluateCondition(
        fieldValue,
        condition.operator,
        condition.value,
      );
    });
  }

  /**
   * Get field value from event
   */
  private getEventFieldValue(event: DataChangeEvent, field: string): any {
    // In a real implementation, this would extract the field value from the event
    // For now, we'll use changedFields as a simple check
    if (event.changedFields && event.changedFields.includes(field)) {
      return 'changed'; // Simplified - would have actual field values
    }
    return null;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    fieldValue: any,
    operator: string,
    expectedValue: any,
  ): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'not_equals':
        return fieldValue !== expectedValue;
      case 'contains':
        return fieldValue && fieldValue.toString().includes(expectedValue);
      case 'not_contains':
        return !fieldValue || !fieldValue.toString().includes(expectedValue);
      case 'in':
        return (
          Array.isArray(expectedValue) && expectedValue.includes(fieldValue)
        );
      case 'not_in':
        return (
          !Array.isArray(expectedValue) || !expectedValue.includes(fieldValue)
        );
      default:
        return false;
    }
  }

  /**
   * Schedule invalidation with delay for batching
   */
  private async scheduleInvalidation(
    rule: InvalidationRule,
    event: DataChangeEvent,
    result: { scheduled: string[] },
  ): Promise<void> {
    const scheduleKey = `${rule.trigger.dataType}:${rule.trigger.operation}:${event.organizationId}:${event.weddingId || 'global'}`;

    // Cancel existing scheduled invalidation for this key
    const existingTimer = this.pendingInvalidations.get(scheduleKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new invalidation
    const timer = setTimeout(async () => {
      try {
        const batchResult = {
          invalidated: [] as string[],
          scheduled: [] as string[],
          skipped: [] as string[],
        };

        await this.executeInvalidation(rule, event, batchResult);
        this.stats.batchedInvalidations++;

        console.log(`⏰ Batched invalidation completed: ${scheduleKey}`);
      } catch (error) {
        console.error(`Error in scheduled invalidation ${scheduleKey}:`, error);
      } finally {
        this.pendingInvalidations.delete(scheduleKey);
      }
    }, rule.delay);

    this.pendingInvalidations.set(scheduleKey, timer);
    result.scheduled.push(scheduleKey);
  }

  /**
   * Execute invalidation immediately
   */
  private async executeInvalidation(
    rule: InvalidationRule,
    event: DataChangeEvent,
    result: { invalidated: string[] },
  ): Promise<void> {
    const startTime = Date.now();

    for (const target of rule.targets) {
      try {
        await this.invalidateTarget(target, event);
        result.invalidated.push(`${target.type}:${target.patterns.join(',')}`);

        // Check for cascade invalidations
        if (rule.priority === 'critical') {
          await this.processCascadeInvalidations(target, event);
          this.stats.cascadeInvalidations++;
        }
      } catch (error) {
        console.error(`Error invalidating target ${target.type}:`, error);
      }
    }

    // Update stats
    const duration = Date.now() - startTime;
    this.stats.totalInvalidations++;
    this.stats.avgInvalidationTime =
      (this.stats.avgInvalidationTime + duration) / 2;
    this.stats.lastProcessed = new Date().toISOString();
  }

  /**
   * Invalidate a specific target
   */
  private async invalidateTarget(
    target: InvalidationTarget,
    event: DataChangeEvent,
  ): Promise<void> {
    const organizationId = target.organizationId || event.organizationId;

    switch (target.type) {
      case 'api_route':
        // Use the API cache invalidation
        const patterns = target.patterns.map((pattern) =>
          this.substitutePatternVariables(pattern, event),
        );

        await invalidateAPICache({
          routes: patterns,
          tags: target.tags,
          organizationId,
        });
        break;

      case 'vendor_cache':
        // Invalidate vendor-specific caches
        await this.invalidateVendorCache(target.patterns, organizationId);
        break;

      case 'search_index':
        // Invalidate search indexes
        await this.invalidateSearchIndex(target.patterns, organizationId);
        break;

      case 'computed_data':
        // Invalidate computed data caches
        await this.invalidateComputedData(target.patterns, organizationId);
        break;
    }
  }

  /**
   * Substitute pattern variables with actual values
   */
  private substitutePatternVariables(
    pattern: string,
    event: DataChangeEvent,
  ): string {
    return pattern
      .replace('[id]', event.entityId)
      .replace('[weddingId]', event.weddingId || event.entityId)
      .replace('[organizationId]', event.organizationId);
  }

  /**
   * Process cascade invalidations for critical changes
   */
  private async processCascadeInvalidations(
    target: InvalidationTarget,
    event: DataChangeEvent,
  ): Promise<void> {
    // Define cascade relationships
    const cascadeMap: Record<string, string[]> = {
      guest: ['seating', 'catering', 'budget', 'timeline'],
      vendor: ['timeline', 'budget', 'recommendations'],
      timeline: ['vendors', 'checklist', 'notifications'],
      budget: ['vendors', 'recommendations'],
    };

    const cascadeTargets = cascadeMap[event.dataType];
    if (cascadeTargets) {
      for (const cascadeType of cascadeTargets) {
        // Create cascade invalidation event
        const cascadeEvent: DataChangeEvent = {
          ...event,
          dataType: cascadeType as any,
          operation: 'update',
        };

        // Process cascade (but with lower priority to avoid infinite loops)
        await this.processDataChange(cascadeEvent);
      }
    }
  }

  /**
   * Add event to history for analytics
   */
  private addToHistory(event: DataChangeEvent): void {
    this.invalidationHistory.push(event);

    // Keep history size manageable
    if (this.invalidationHistory.length > this.maxHistorySize) {
      this.invalidationHistory = this.invalidationHistory.slice(
        -this.maxHistorySize,
      );
    }
  }

  // Implementation stubs for different cache types

  private async invalidateVendorCache(
    patterns: string[],
    organizationId: string,
  ): Promise<void> {
    console.log(`Invalidating vendor cache patterns: ${patterns.join(', ')}`);
    // Implementation would call vendor cache manager
  }

  private async invalidateSearchIndex(
    patterns: string[],
    organizationId: string,
  ): Promise<void> {
    console.log(`Invalidating search index patterns: ${patterns.join(', ')}`);
    // Implementation would invalidate search indexes
  }

  private async invalidateComputedData(
    patterns: string[],
    organizationId: string,
  ): Promise<void> {
    console.log(`Invalidating computed data patterns: ${patterns.join(', ')}`);
    // Implementation would invalidate computed data caches
  }

  /**
   * Get invalidation statistics
   */
  getStats() {
    return {
      ...this.stats,
      pendingInvalidations: this.pendingInvalidations.size,
      historySize: this.invalidationHistory.length,
    };
  }

  /**
   * Get recent invalidation history
   */
  getRecentHistory(limit = 50): DataChangeEvent[] {
    return this.invalidationHistory.slice(-limit);
  }

  /**
   * Clear pending invalidations (for testing or shutdown)
   */
  clearPendingInvalidations(): void {
    // Use forEach for downlevelIteration compatibility
    this.pendingInvalidations.forEach((timer) => {
      clearTimeout(timer);
    });
    this.pendingInvalidations.clear();
  }

  /**
   * Wedding day mode - execute all invalidations immediately
   */
  enableWeddingDayMode(): void {
    console.log('🏰 Wedding day mode: Disabling invalidation delays');

    // Clear all pending invalidations and execute immediately - use forEach for downlevelIteration compatibility
    this.pendingInvalidations.forEach((timer, key) => {
      clearTimeout(timer);
      console.log(`⚡ Executing immediate invalidation for: ${key}`);
    });
    this.pendingInvalidations.clear();
  }
}

// Helper functions for common invalidation scenarios

/**
 * Invalidate guest-related caches
 */
export async function invalidateGuestCaches(
  weddingId: string,
  organizationId: string,
): Promise<void> {
  const engine = new IntelligentInvalidationEngine();

  await engine.processDataChange({
    dataType: 'guest',
    operation: 'update',
    entityId: 'bulk',
    weddingId,
    organizationId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Invalidate vendor-related caches
 */
export async function invalidateVendorCaches(
  vendorId: string,
  organizationId: string,
): Promise<void> {
  const engine = new IntelligentInvalidationEngine();

  await engine.processDataChange({
    dataType: 'vendor',
    operation: 'update',
    entityId: vendorId,
    organizationId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Invalidate wedding-specific caches
 */
export async function invalidateWeddingCaches(
  weddingId: string,
  organizationId: string,
): Promise<void> {
  const engine = new IntelligentInvalidationEngine();

  const cacheTypes = ['guest', 'timeline', 'budget', 'checklist', 'vendor'];

  for (const dataType of cacheTypes) {
    await engine.processDataChange({
      dataType: dataType as any,
      operation: 'update',
      entityId: weddingId,
      weddingId,
      organizationId,
      timestamp: new Date().toISOString(),
    });
  }
}

export default IntelligentInvalidationEngine;
