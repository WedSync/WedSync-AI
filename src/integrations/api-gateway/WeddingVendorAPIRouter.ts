/**
 * WS-250: API Gateway Management System - Wedding Vendor API Router
 * Team C - Round 1: Vendor-specific API routing with wedding context
 *
 * Routes API requests to specific vendor systems based on vendor type,
 * wedding context, and business logic with intelligent failover and
 * load balancing optimized for the wedding industry.
 */

import {
  IntegrationResponse,
  IntegrationError,
  ErrorCategory,
} from '../../types/integrations';
import {
  VendorCategory,
  VendorAPI,
  WeddingContext,
} from './VendorAPIAggregator';
import ExternalAPIConnector, {
  ExternalAPIConfig,
} from './ExternalAPIConnector';
import ServiceMeshOrchestrator, {
  TrafficRoutingRule,
} from './ServiceMeshOrchestrator';

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: RoutingCondition[];
  target: RoutingTarget;
  weddingSpecific: boolean;
  seasonalOverrides?: SeasonalOverride[];
  enabled: boolean;
  createdAt: Date;
  lastModified: Date;
}

export interface RoutingCondition {
  type:
    | 'vendor_category'
    | 'wedding_date'
    | 'location'
    | 'request_type'
    | 'client_tier'
    | 'time_of_day'
    | 'custom';
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'in'
    | 'not_in'
    | 'greater_than'
    | 'less_than'
    | 'between';
  values: any[];
  weddingContext?: boolean;
  caseSensitive?: boolean;
}

export interface RoutingTarget {
  type:
    | 'single_vendor'
    | 'vendor_group'
    | 'load_balanced'
    | 'broadcast'
    | 'failover_chain';
  vendorIds: string[];
  loadBalancingStrategy?:
    | 'round_robin'
    | 'weighted'
    | 'health_based'
    | 'location_based';
  failoverRules?: FailoverRule[];
  weddingDayOverrides?: WeddingDayOverride[];
}

export interface FailoverRule {
  condition:
    | 'timeout'
    | 'error_rate'
    | 'circuit_breaker'
    | 'maintenance'
    | 'capacity';
  threshold?: number;
  fallbackTarget: string;
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  weddingDayBehavior?: 'aggressive' | 'conservative' | 'normal';
}

export interface WeddingDayOverride {
  weddingDateRange: { start: Date; end: Date };
  overrideTarget: string;
  reason: string;
  contactInfo?: string;
  emergencyProtocol?: string[];
}

export interface SeasonalOverride {
  season: 'peak' | 'off_season' | 'holiday';
  dateRange: { start: string; end: string }; // MM-DD format
  overrideTarget?: string;
  capacityMultiplier?: number;
  priorityAdjustment?: number;
}

export interface RequestContext {
  vendorCategory: VendorCategory;
  vendorId?: string;
  clientId: string;
  requestType: 'read' | 'write' | 'sync' | 'webhook' | 'health_check';
  priority: 'low' | 'medium' | 'high' | 'critical';
  weddingContext?: WeddingContext;
  location?: {
    latitude: number;
    longitude: number;
    region: string;
  };
  clientTier?: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  metadata?: Record<string, any>;
}

export interface RoutingDecision {
  selectedVendor: string;
  routingRule?: string;
  decision: 'primary' | 'failover' | 'load_balanced' | 'overridden';
  confidence: number;
  alternativeVendors: string[];
  processingTime: number;
  weddingOptimized: boolean;
  warnings: string[];
}

export interface RoutingMetrics {
  totalRequests: number;
  successfulRouting: number;
  failoverActivations: number;
  averageRoutingTime: number;
  vendorDistribution: Map<string, number>;
  ruleUsage: Map<string, number>;
  weddingDayRouting: {
    totalRequests: number;
    emergencyOverrides: number;
    responseTime: number;
  };
  seasonalMetrics: Map<
    string,
    {
      requests: number;
      overrides: number;
      successRate: number;
    }
  >;
}

export interface VendorHealth {
  vendorId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'maintenance';
  responseTime: number;
  errorRate: number;
  capacity: {
    current: number;
    maximum: number;
    utilization: number;
  };
  lastHealthCheck: Date;
  consecutiveFailures: number;
  weddingDayReadiness: boolean;
}

export interface RoutingConfiguration {
  defaultVendors: Map<VendorCategory, string[]>;
  globalFailover: {
    enabled: boolean;
    fallbackVendor: string;
    activationThreshold: number;
  };
  weddingDayProtection: {
    enabled: boolean;
    emergencyVendors: Map<VendorCategory, string[]>;
    responseTimeThreshold: number;
    errorRateThreshold: number;
  };
  loadBalancing: {
    algorithm: 'round_robin' | 'weighted' | 'least_connections' | 'geographic';
    healthCheckInterval: number;
    circuitBreakerSettings: {
      failureThreshold: number;
      recoveryTimeout: number;
      monitoringWindow: number;
    };
  };
}

export class WeddingVendorAPIRouter {
  private routingRules: Map<string, RoutingRule>;
  private vendorHealth: Map<string, VendorHealth>;
  private routingMetrics: RoutingMetrics;
  private configuration: RoutingConfiguration;
  private serviceOrchestrator: ServiceMeshOrchestrator;
  private activeVendors: Map<string, VendorAPI>;
  private readonly weddingDayProtection: boolean;

  constructor(
    serviceOrchestrator: ServiceMeshOrchestrator,
    options: {
      weddingDayProtection?: boolean;
      configuration?: Partial<RoutingConfiguration>;
    } = {},
  ) {
    this.serviceOrchestrator = serviceOrchestrator;
    this.weddingDayProtection = options.weddingDayProtection ?? true;

    this.routingRules = new Map();
    this.vendorHealth = new Map();
    this.activeVendors = new Map();

    // Initialize metrics
    this.routingMetrics = {
      totalRequests: 0,
      successfulRouting: 0,
      failoverActivations: 0,
      averageRoutingTime: 0,
      vendorDistribution: new Map(),
      ruleUsage: new Map(),
      weddingDayRouting: {
        totalRequests: 0,
        emergencyOverrides: 0,
        responseTime: 0,
      },
      seasonalMetrics: new Map(),
    };

    // Initialize configuration
    this.configuration = {
      defaultVendors: new Map(),
      globalFailover: {
        enabled: true,
        fallbackVendor: 'default',
        activationThreshold: 0.8,
      },
      weddingDayProtection: {
        enabled: this.weddingDayProtection,
        emergencyVendors: new Map(),
        responseTimeThreshold: 1000,
        errorRateThreshold: 0.05,
      },
      loadBalancing: {
        algorithm: 'health_based',
        healthCheckInterval: 60000,
        circuitBreakerSettings: {
          failureThreshold: 5,
          recoveryTimeout: 30000,
          monitoringWindow: 300000,
        },
      },
      ...options.configuration,
    };

    // Initialize default routing rules
    this.initializeDefaultRoutingRules();

    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Route a request to the appropriate vendor API
   */
  async routeRequest<T>(
    request: {
      path: string;
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      data?: any;
      headers?: Record<string, string>;
    },
    context: RequestContext,
  ): Promise<
    IntegrationResponse<{
      data: T;
      routingDecision: RoutingDecision;
    }>
  > {
    const startTime = Date.now();

    try {
      // Update metrics
      this.routingMetrics.totalRequests++;
      if (context.weddingContext?.isWeddingWeekend) {
        this.routingMetrics.weddingDayRouting.totalRequests++;
      }

      // Apply wedding day protection if needed
      if (this.shouldApplyWeddingDayProtection(context)) {
        return await this.handleWeddingDayRequest<T>(request, context);
      }

      // Find routing decision
      const routingDecision = await this.makeRoutingDecision(context);

      if (!routingDecision) {
        throw new IntegrationError(
          'No suitable vendor found for routing',
          'NO_VENDOR_AVAILABLE',
          ErrorCategory.SYSTEM,
        );
      }

      // Execute the request
      const result = await this.executeRoutedRequest<T>(
        request,
        routingDecision.selectedVendor,
        context,
      );

      // Update metrics on success
      this.updateMetricsOnSuccess(routingDecision, Date.now() - startTime);

      return {
        success: true,
        data: {
          data: result.data!,
          routingDecision: {
            ...routingDecision,
            processingTime: Date.now() - startTime,
          },
        },
      };
    } catch (error) {
      // Update metrics on failure
      this.updateMetricsOnFailure(context);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Routing failed',
      };
    }
  }

  /**
   * Route request with automatic failover
   */
  async routeWithFailover<T>(
    request: {
      path: string;
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      data?: any;
      headers?: Record<string, string>;
    },
    context: RequestContext,
    options?: {
      maxFailovers?: number;
      timeoutMs?: number;
      retryBackoff?: number;
    },
  ): Promise<
    IntegrationResponse<{
      data: T;
      routingDecision: RoutingDecision;
      failoverAttempts: number;
    }>
  > {
    const {
      maxFailovers = 3,
      timeoutMs = 30000,
      retryBackoff = 1000,
    } = options || {};
    let failoverAttempts = 0;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxFailovers; attempt++) {
      try {
        const result = await this.routeRequest<T>(request, {
          ...context,
          priority: attempt > 0 ? 'high' : context.priority, // Increase priority on failover
        });

        if (result.success) {
          return {
            success: true,
            data: {
              data: result.data!.data,
              routingDecision: result.data!.routingDecision,
              failoverAttempts: attempt,
            },
          };
        } else {
          lastError = new Error(result.error);
          failoverAttempts++;
        }
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error('Failover attempt failed');
        failoverAttempts++;
      }

      // Apply backoff delay if not the last attempt
      if (attempt < maxFailovers) {
        await this.delay(retryBackoff * Math.pow(2, attempt));
      }
    }

    // All failover attempts failed
    this.routingMetrics.failoverActivations++;

    return {
      success: false,
      error: `All failover attempts failed. Last error: ${lastError?.message || 'Unknown error'}`,
    };
  }

  /**
   * Broadcast request to multiple vendors simultaneously
   */
  async broadcastRequest<T>(
    request: {
      path: string;
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      data?: any;
      headers?: Record<string, string>;
    },
    context: RequestContext,
    targetVendors?: string[],
  ): Promise<
    IntegrationResponse<{
      results: Map<string, IntegrationResponse<T>>;
      successCount: number;
      failureCount: number;
    }>
  > {
    try {
      // Determine target vendors
      const vendors =
        targetVendors || this.getVendorsForCategory(context.vendorCategory);

      if (vendors.length === 0) {
        throw new IntegrationError(
          `No vendors available for category: ${context.vendorCategory}`,
          'NO_VENDORS_AVAILABLE',
          ErrorCategory.SYSTEM,
        );
      }

      // Execute requests in parallel
      const promises = vendors.map(async (vendorId) => {
        try {
          const result = await this.executeRoutedRequest<T>(
            request,
            vendorId,
            context,
          );
          return { vendorId, result };
        } catch (error) {
          return {
            vendorId,
            result: {
              success: false,
              error: error instanceof Error ? error.message : 'Request failed',
            } as IntegrationResponse<T>,
          };
        }
      });

      const responses = await Promise.all(promises);
      const results = new Map<string, IntegrationResponse<T>>();
      let successCount = 0;
      let failureCount = 0;

      responses.forEach(({ vendorId, result }) => {
        results.set(vendorId, result);
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      });

      return {
        success: successCount > 0,
        data: {
          results,
          successCount,
          failureCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Broadcast failed',
      };
    }
  }

  /**
   * Add or update routing rule
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.set(rule.id, rule);

    // Sort rules by priority (higher priority first)
    const sortedRules = Array.from(this.routingRules.entries()).sort(
      ([, a], [, b]) => b.priority - a.priority,
    );

    this.routingRules.clear();
    sortedRules.forEach(([id, rule]) => {
      this.routingRules.set(id, rule);
    });
  }

  /**
   * Remove routing rule
   */
  removeRoutingRule(ruleId: string): void {
    this.routingRules.delete(ruleId);
  }

  /**
   * Update vendor health status
   */
  updateVendorHealth(vendorId: string, health: Partial<VendorHealth>): void {
    const existing = this.vendorHealth.get(vendorId);
    this.vendorHealth.set(vendorId, {
      vendorId,
      status: 'healthy',
      responseTime: 0,
      errorRate: 0,
      capacity: { current: 0, maximum: 100, utilization: 0 },
      lastHealthCheck: new Date(),
      consecutiveFailures: 0,
      weddingDayReadiness: true,
      ...existing,
      ...health,
    });
  }

  /**
   * Get routing metrics and analytics
   */
  getRoutingMetrics(): RoutingMetrics {
    return {
      ...this.routingMetrics,
      vendorDistribution: new Map(this.routingMetrics.vendorDistribution),
      ruleUsage: new Map(this.routingMetrics.ruleUsage),
      seasonalMetrics: new Map(this.routingMetrics.seasonalMetrics),
    };
  }

  /**
   * Get vendor health summary
   */
  getVendorHealthSummary(): {
    totalVendors: number;
    healthyVendors: number;
    degradedVendors: number;
    unhealthyVendors: number;
    averageResponseTime: number;
    weddingReadyVendors: number;
    vendorDetails: VendorHealth[];
  } {
    const vendors = Array.from(this.vendorHealth.values());

    return {
      totalVendors: vendors.length,
      healthyVendors: vendors.filter((v) => v.status === 'healthy').length,
      degradedVendors: vendors.filter((v) => v.status === 'degraded').length,
      unhealthyVendors: vendors.filter((v) => v.status === 'unhealthy').length,
      averageResponseTime:
        vendors.reduce((sum, v) => sum + v.responseTime, 0) / vendors.length ||
        0,
      weddingReadyVendors: vendors.filter((v) => v.weddingDayReadiness).length,
      vendorDetails: vendors,
    };
  }

  /**
   * Configure emergency wedding day routing
   */
  configureWeddingDayEmergency(
    category: VendorCategory,
    emergencyVendors: string[],
    protocols: string[],
  ): void {
    this.configuration.weddingDayProtection.emergencyVendors.set(
      category,
      emergencyVendors,
    );

    // Add emergency routing rule
    const emergencyRule: RoutingRule = {
      id: `emergency_${category}`,
      name: `Emergency ${category} routing`,
      priority: 1000, // Highest priority
      conditions: [
        {
          type: 'vendor_category',
          operator: 'equals',
          values: [category],
          weddingContext: true,
        },
        {
          type: 'custom',
          operator: 'equals',
          values: ['wedding_emergency'],
          weddingContext: true,
        },
      ],
      target: {
        type: 'failover_chain',
        vendorIds: emergencyVendors,
        failoverRules: [
          {
            condition: 'timeout',
            threshold: 5000,
            fallbackTarget: emergencyVendors[0],
            maxRetries: 2,
            backoffStrategy: 'fixed',
            weddingDayBehavior: 'aggressive',
          },
        ],
      },
      weddingSpecific: true,
      enabled: true,
      createdAt: new Date(),
      lastModified: new Date(),
    };

    this.addRoutingRule(emergencyRule);
  }

  // Private methods

  private async makeRoutingDecision(
    context: RequestContext,
  ): Promise<RoutingDecision | null> {
    const startTime = Date.now();

    // Apply routing rules in priority order
    for (const [ruleId, rule] of this.routingRules) {
      if (!rule.enabled) continue;

      if (this.evaluateRoutingRule(rule, context)) {
        const vendor = await this.selectVendorFromTarget(rule.target, context);

        if (vendor) {
          // Update rule usage metrics
          const currentUsage = this.routingMetrics.ruleUsage.get(ruleId) || 0;
          this.routingMetrics.ruleUsage.set(ruleId, currentUsage + 1);

          return {
            selectedVendor: vendor,
            routingRule: ruleId,
            decision: 'primary',
            confidence: this.calculateRoutingConfidence(rule, context),
            alternativeVendors: this.getAlternativeVendors(rule.target, vendor),
            processingTime: Date.now() - startTime,
            weddingOptimized: rule.weddingSpecific,
            warnings: this.getRoutingWarnings(rule, context),
          };
        }
      }
    }

    // Fall back to default routing
    const defaultVendors = this.configuration.defaultVendors.get(
      context.vendorCategory,
    );
    if (defaultVendors && defaultVendors.length > 0) {
      const vendor = this.selectHealthiestVendor(defaultVendors);

      if (vendor) {
        return {
          selectedVendor: vendor,
          decision: 'primary',
          confidence: 0.7,
          alternativeVendors: defaultVendors.filter((v) => v !== vendor),
          processingTime: Date.now() - startTime,
          weddingOptimized: false,
          warnings: ['Using default routing - no specific rules matched'],
        };
      }
    }

    return null;
  }

  private evaluateRoutingRule(
    rule: RoutingRule,
    context: RequestContext,
  ): boolean {
    // Check seasonal overrides first
    if (rule.seasonalOverrides) {
      const currentSeason = this.getCurrentSeason();
      const seasonalOverride = rule.seasonalOverrides.find(
        (override) =>
          override.season === currentSeason &&
          this.isInSeasonalRange(override.dateRange),
      );

      if (seasonalOverride) {
        // Apply seasonal modifications to rule evaluation
        // This is a simplified implementation
      }
    }

    // Evaluate all conditions (AND logic)
    return rule.conditions.every((condition) =>
      this.evaluateRoutingCondition(condition, context),
    );
  }

  private evaluateRoutingCondition(
    condition: RoutingCondition,
    context: RequestContext,
  ): boolean {
    let value: any;

    switch (condition.type) {
      case 'vendor_category':
        value = context.vendorCategory;
        break;
      case 'wedding_date':
        value = context.weddingContext?.weddingDate;
        break;
      case 'location':
        value = context.location?.region;
        break;
      case 'request_type':
        value = context.requestType;
        break;
      case 'client_tier':
        value = context.clientTier;
        break;
      case 'time_of_day':
        value = new Date().getHours();
        break;
      case 'custom':
        value = context.metadata?.[condition.values[0]]; // First value is the metadata key
        break;
      default:
        return true;
    }

    return this.evaluateConditionValue(value, condition);
  }

  private evaluateConditionValue(
    value: any,
    condition: RoutingCondition,
  ): boolean {
    const conditionValues = condition.values;

    switch (condition.operator) {
      case 'equals':
        return condition.caseSensitive
          ? value === conditionValues[0]
          : String(value).toLowerCase() ===
              String(conditionValues[0]).toLowerCase();
      case 'not_equals':
        return value !== conditionValues[0];
      case 'contains':
        return String(value).includes(String(conditionValues[0]));
      case 'in':
        return conditionValues.includes(value);
      case 'not_in':
        return !conditionValues.includes(value);
      case 'greater_than':
        return Number(value) > Number(conditionValues[0]);
      case 'less_than':
        return Number(value) < Number(conditionValues[0]);
      case 'between':
        return (
          Number(value) >= Number(conditionValues[0]) &&
          Number(value) <= Number(conditionValues[1])
        );
      default:
        return true;
    }
  }

  private async selectVendorFromTarget(
    target: RoutingTarget,
    context: RequestContext,
  ): Promise<string | null> {
    const availableVendors = target.vendorIds.filter((vendorId) => {
      const health = this.vendorHealth.get(vendorId);
      return (
        health &&
        health.status !== 'unhealthy' &&
        health.status !== 'maintenance'
      );
    });

    if (availableVendors.length === 0) {
      return null;
    }

    switch (target.type) {
      case 'single_vendor':
        return availableVendors[0] || null;

      case 'load_balanced':
        return this.applyLoadBalancing(
          availableVendors,
          target.loadBalancingStrategy || 'health_based',
          context,
        );

      case 'failover_chain':
        return this.selectFromFailoverChain(
          availableVendors,
          target.failoverRules || [],
          context,
        );

      case 'broadcast':
        // For broadcast, return the first available vendor (actual broadcast is handled elsewhere)
        return availableVendors[0] || null;

      default:
        return availableVendors[0] || null;
    }
  }

  private applyLoadBalancing(
    vendors: string[],
    strategy: string,
    context: RequestContext,
  ): string | null {
    switch (strategy) {
      case 'round_robin':
        // Simple round-robin based on request count
        const requestCounts = vendors.map(
          (vendor) => this.routingMetrics.vendorDistribution.get(vendor) || 0,
        );
        const minRequests = Math.min(...requestCounts);
        const vendorIndex = requestCounts.indexOf(minRequests);
        return vendors[vendorIndex];

      case 'weighted':
        // Weight based on health and capacity
        return this.selectWeightedVendor(vendors);

      case 'health_based':
        return this.selectHealthiestVendor(vendors);

      case 'location_based':
        return this.selectLocationBasedVendor(vendors, context.location);

      default:
        return vendors[0];
    }
  }

  private selectHealthiestVendor(vendors: string[]): string | null {
    let bestVendor: string | null = null;
    let bestScore = -1;

    for (const vendorId of vendors) {
      const health = this.vendorHealth.get(vendorId);
      if (!health) continue;

      // Calculate health score
      const healthScore = this.calculateHealthScore(health);

      if (healthScore > bestScore) {
        bestScore = healthScore;
        bestVendor = vendorId;
      }
    }

    return bestVendor;
  }

  private selectWeightedVendor(vendors: string[]): string {
    const weights = vendors.map((vendor) => {
      const health = this.vendorHealth.get(vendor);
      return health ? this.calculateHealthScore(health) : 0.1;
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < vendors.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return vendors[i];
      }
    }

    return vendors[vendors.length - 1];
  }

  private selectLocationBasedVendor(
    vendors: string[],
    location?: RequestContext['location'],
  ): string | null {
    if (!location) {
      return this.selectHealthiestVendor(vendors);
    }

    // This would implement actual geographic routing logic
    // For now, fall back to health-based selection
    return this.selectHealthiestVendor(vendors);
  }

  private selectFromFailoverChain(
    vendors: string[],
    failoverRules: FailoverRule[],
    context: RequestContext,
  ): string | null {
    // For now, return the first healthy vendor
    // In a full implementation, this would consider failover rules and conditions
    return this.selectHealthiestVendor(vendors);
  }

  private calculateHealthScore(health: VendorHealth): number {
    let score = 100;

    // Penalize based on status
    switch (health.status) {
      case 'healthy':
        break;
      case 'degraded':
        score -= 30;
        break;
      case 'unhealthy':
        score = 0;
        break;
      case 'maintenance':
        score = 0;
        break;
    }

    // Penalize high response time (normalize to 0-1000ms range)
    const responseTimePenalty = Math.min(health.responseTime / 10, 50);
    score -= responseTimePenalty;

    // Penalize high error rate
    const errorRatePenalty = health.errorRate * 100;
    score -= errorRatePenalty;

    // Penalize high utilization
    const utilizationPenalty = Math.max(
      0,
      (health.capacity.utilization - 0.8) * 100,
    );
    score -= utilizationPenalty;

    return Math.max(0, score);
  }

  private calculateRoutingConfidence(
    rule: RoutingRule,
    context: RequestContext,
  ): number {
    let confidence = 0.8;

    // Higher confidence for wedding-specific rules
    if (rule.weddingSpecific && context.weddingContext) {
      confidence += 0.1;
    }

    // Higher confidence for more specific conditions
    confidence += rule.conditions.length * 0.05;

    // Lower confidence if using failover
    if (rule.target.type === 'failover_chain') {
      confidence -= 0.1;
    }

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  private getAlternativeVendors(
    target: RoutingTarget,
    selectedVendor: string,
  ): string[] {
    return target.vendorIds.filter((vendor) => vendor !== selectedVendor);
  }

  private getRoutingWarnings(
    rule: RoutingRule,
    context: RequestContext,
  ): string[] {
    const warnings: string[] = [];

    // Check for seasonal considerations
    const currentSeason = this.getCurrentSeason();
    if (currentSeason === 'peak' && !rule.seasonalOverrides) {
      warnings.push('Peak wedding season - consider seasonal routing rules');
    }

    // Check for wedding day proximity
    if (context.weddingContext?.weddingDate) {
      const daysToWedding = Math.ceil(
        (context.weddingContext.weddingDate.getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      );

      if (daysToWedding <= 7 && !rule.weddingSpecific) {
        warnings.push(
          'Wedding within 7 days - consider using wedding-specific routing',
        );
      }
    }

    return warnings;
  }

  private async executeRoutedRequest<T>(
    request: {
      path: string;
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      data?: any;
      headers?: Record<string, string>;
    },
    vendorId: string,
    context: RequestContext,
  ): Promise<IntegrationResponse<T>> {
    // Use service orchestrator to execute the request
    return await this.serviceOrchestrator.routeRequest<T>(vendorId, {
      path: request.path,
      method: request.method,
      data: request.data,
      headers: request.headers,
      context: context.weddingContext,
    });
  }

  private shouldApplyWeddingDayProtection(context: RequestContext): boolean {
    if (
      !this.weddingDayProtection ||
      !this.configuration.weddingDayProtection.enabled
    ) {
      return false;
    }

    return (
      context.weddingContext?.isWeddingWeekend ||
      context.priority === 'critical'
    );
  }

  private async handleWeddingDayRequest<T>(
    request: {
      path: string;
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      data?: any;
      headers?: Record<string, string>;
    },
    context: RequestContext,
  ): Promise<
    IntegrationResponse<{
      data: T;
      routingDecision: RoutingDecision;
    }>
  > {
    this.routingMetrics.weddingDayRouting.emergencyOverrides++;

    // Use emergency vendors if available
    const emergencyVendors =
      this.configuration.weddingDayProtection.emergencyVendors.get(
        context.vendorCategory,
      );

    if (emergencyVendors && emergencyVendors.length > 0) {
      const vendor = this.selectHealthiestVendor(emergencyVendors);

      if (vendor) {
        const result = await this.executeRoutedRequest<T>(
          request,
          vendor,
          context,
        );

        if (result.success) {
          return {
            success: true,
            data: {
              data: result.data!,
              routingDecision: {
                selectedVendor: vendor,
                decision: 'overridden',
                confidence: 1.0,
                alternativeVendors: emergencyVendors.filter(
                  (v) => v !== vendor,
                ),
                processingTime: 0,
                weddingOptimized: true,
                warnings: ['Wedding day protection activated'],
              },
            },
          };
        }
      }
    }

    // Fall back to normal routing with high priority
    return await this.routeRequest<T>(request, {
      ...context,
      priority: 'critical',
    });
  }

  private getVendorsForCategory(category: VendorCategory): string[] {
    const vendors: string[] = [];

    for (const [vendorId, vendor] of this.activeVendors) {
      if (vendor.category === category) {
        vendors.push(vendorId);
      }
    }

    return vendors;
  }

  private updateMetricsOnSuccess(
    decision: RoutingDecision,
    processingTime: number,
  ): void {
    this.routingMetrics.successfulRouting++;

    // Update average routing time
    const totalTime =
      this.routingMetrics.averageRoutingTime *
      (this.routingMetrics.totalRequests - 1);
    this.routingMetrics.averageRoutingTime =
      (totalTime + processingTime) / this.routingMetrics.totalRequests;

    // Update vendor distribution
    const currentCount =
      this.routingMetrics.vendorDistribution.get(decision.selectedVendor) || 0;
    this.routingMetrics.vendorDistribution.set(
      decision.selectedVendor,
      currentCount + 1,
    );

    // Update wedding day metrics
    if (decision.weddingOptimized) {
      const weddingTotal =
        this.routingMetrics.weddingDayRouting.responseTime *
        (this.routingMetrics.weddingDayRouting.totalRequests - 1);
      this.routingMetrics.weddingDayRouting.responseTime =
        (weddingTotal + processingTime) /
        this.routingMetrics.weddingDayRouting.totalRequests;
    }
  }

  private updateMetricsOnFailure(context: RequestContext): void {
    // Track failure metrics
    // This would be expanded with more detailed failure tracking
  }

  private getCurrentSeason(): 'peak' | 'off_season' | 'holiday' {
    const month = new Date().getMonth();

    // Peak wedding season: May-September (months 4-8)
    if (month >= 4 && month <= 8) {
      return 'peak';
    }

    // Holiday season: November-December (months 10-11)
    if (month >= 10) {
      return 'holiday';
    }

    return 'off_season';
  }

  private isInSeasonalRange(dateRange: {
    start: string;
    end: string;
  }): boolean {
    const now = new Date();
    const currentDate = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return currentDate >= dateRange.start && currentDate <= dateRange.end;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private initializeDefaultRoutingRules(): void {
    // Photography vendor routing
    this.addRoutingRule({
      id: 'photography_default',
      name: 'Default photography routing',
      priority: 100,
      conditions: [
        {
          type: 'vendor_category',
          operator: 'equals',
          values: ['photography'],
        },
      ],
      target: {
        type: 'load_balanced',
        vendorIds: ['tave', 'lightblue'],
        loadBalancingStrategy: 'health_based',
      },
      weddingSpecific: false,
      enabled: true,
      createdAt: new Date(),
      lastModified: new Date(),
    });

    // Wedding day emergency routing
    this.addRoutingRule({
      id: 'wedding_day_emergency',
      name: 'Wedding day emergency routing',
      priority: 999,
      conditions: [
        {
          type: 'custom',
          operator: 'equals',
          values: ['wedding_emergency'],
          weddingContext: true,
        },
      ],
      target: {
        type: 'failover_chain',
        vendorIds: ['emergency_vendor'],
        failoverRules: [
          {
            condition: 'timeout',
            threshold: 3000,
            fallbackTarget: 'emergency_vendor',
            maxRetries: 1,
            backoffStrategy: 'fixed',
            weddingDayBehavior: 'aggressive',
          },
        ],
      },
      weddingSpecific: true,
      enabled: true,
      createdAt: new Date(),
      lastModified: new Date(),
    });
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, this.configuration.loadBalancing.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    // Perform health checks on all vendors
    // This would implement actual health checking logic
    for (const [vendorId] of this.activeVendors) {
      // Simulate health check
      this.updateVendorHealth(vendorId, {
        lastHealthCheck: new Date(),
        responseTime: Math.random() * 1000,
        errorRate: Math.random() * 0.1,
        capacity: {
          current: Math.floor(Math.random() * 80),
          maximum: 100,
          utilization: Math.random(),
        },
      });
    }
  }
}

export default WeddingVendorAPIRouter;
