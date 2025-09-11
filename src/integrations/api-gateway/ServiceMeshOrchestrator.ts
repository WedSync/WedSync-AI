/**
 * WS-250: API Gateway Management System - Service Mesh Orchestrator
 * Team C - Round 1: Service mesh connectivity management and orchestration
 *
 * Orchestrates service-to-service communication within the API gateway,
 * manages load balancing, service discovery, and health monitoring
 * with wedding industry specific optimizations.
 */

import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  IntegrationError,
  ErrorCategory,
  HealthCheck,
  ServiceMetrics,
} from '../../types/integrations';
import ExternalAPIConnector, {
  ExternalAPIConfig,
  ConnectionHealth,
  WeddingContext,
} from './ExternalAPIConnector';

export interface ServiceEndpoint {
  id: string;
  name: string;
  url: string;
  version: string;
  healthPath: string;
  priority: number;
  weight: number;
  timeout: number;
  maxConnections: number;
  weddingDayCapacity?: number;
  tags: string[];
}

export interface ServiceGroup {
  name: string;
  loadBalancingStrategy:
    | 'round_robin'
    | 'weighted'
    | 'least_connections'
    | 'health_based';
  endpoints: ServiceEndpoint[];
  healthCheckInterval: number;
  failoverEnabled: boolean;
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeout: number;
  };
}

export interface LoadBalancerState {
  currentIndex: number;
  connectionCounts: Map<string, number>;
  lastUsed: Map<string, Date>;
  blockedEndpoints: Set<string>;
}

export interface ServiceRegistry {
  services: Map<string, ServiceGroup>;
  healthStatuses: Map<string, HealthCheck>;
  loadBalancerStates: Map<string, LoadBalancerState>;
}

export interface OrchestrationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  serviceDistribution: Map<string, number>;
  errorDistribution: Map<string, number>;
  weddingDayOverrides: number;
}

export interface TrafficRoutingRule {
  id: string;
  name: string;
  condition: {
    path?: string;
    method?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    weddingContext?: WeddingContext;
  };
  targetService: string;
  weight: number;
  priority: number;
  enabled: boolean;
}

export interface ServiceDiscoveryConfig {
  enabled: boolean;
  registryUrl?: string;
  refreshInterval: number;
  autoRegistration: boolean;
  healthCheckPath: string;
}

export class ServiceMeshOrchestrator {
  private serviceRegistry: ServiceRegistry;
  private routingRules: TrafficRoutingRule[];
  private metrics: OrchestrationMetrics;
  private discoveryConfig: ServiceDiscoveryConfig;
  private healthCheckIntervals: Map<string, NodeJS.Timeout>;
  private readonly weddingDayProtection: boolean;

  constructor(
    config: {
      weddingDayProtection?: boolean;
      serviceDiscovery?: ServiceDiscoveryConfig;
    } = {},
  ) {
    this.weddingDayProtection = config.weddingDayProtection ?? true;
    this.discoveryConfig = config.serviceDiscovery || {
      enabled: false,
      refreshInterval: 30000,
      autoRegistration: true,
      healthCheckPath: '/health',
    };

    this.serviceRegistry = {
      services: new Map(),
      healthStatuses: new Map(),
      loadBalancerStates: new Map(),
    };

    this.routingRules = [];
    this.healthCheckIntervals = new Map();

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      serviceDistribution: new Map(),
      errorDistribution: new Map(),
      weddingDayOverrides: 0,
    };

    // Start service discovery if enabled
    if (this.discoveryConfig.enabled) {
      this.startServiceDiscovery();
    }
  }

  /**
   * Register a service group with the orchestrator
   */
  registerService(serviceGroup: ServiceGroup): void {
    this.serviceRegistry.services.set(serviceGroup.name, serviceGroup);

    // Initialize load balancer state
    this.serviceRegistry.loadBalancerStates.set(serviceGroup.name, {
      currentIndex: 0,
      connectionCounts: new Map(),
      lastUsed: new Map(),
      blockedEndpoints: new Set(),
    });

    // Initialize health status for each endpoint
    serviceGroup.endpoints.forEach((endpoint) => {
      this.serviceRegistry.healthStatuses.set(endpoint.id, {
        status: 'healthy',
        lastChecked: new Date(),
        responseTime: 0,
      });
    });

    // Start health checks
    this.startHealthChecks(serviceGroup);
  }

  /**
   * Unregister a service group
   */
  unregisterService(serviceName: string): void {
    const serviceGroup = this.serviceRegistry.services.get(serviceName);
    if (!serviceGroup) return;

    // Stop health checks
    this.stopHealthChecks(serviceGroup);

    // Clean up registry
    this.serviceRegistry.services.delete(serviceName);
    this.serviceRegistry.loadBalancerStates.delete(serviceName);

    serviceGroup.endpoints.forEach((endpoint) => {
      this.serviceRegistry.healthStatuses.delete(endpoint.id);
    });
  }

  /**
   * Route request to appropriate service endpoint
   */
  async routeRequest<T>(
    serviceName: string,
    request: {
      path: string;
      method: string;
      data?: any;
      headers?: Record<string, string>;
      context?: WeddingContext;
    },
  ): Promise<IntegrationResponse<T>> {
    const startTime = Date.now();

    try {
      // Apply traffic routing rules
      const targetService = this.applyRoutingRules(serviceName, request);

      // Get service group
      const serviceGroup = this.serviceRegistry.services.get(targetService);
      if (!serviceGroup) {
        throw new IntegrationError(
          `Service not found: ${targetService}`,
          'SERVICE_NOT_FOUND',
          ErrorCategory.SYSTEM,
        );
      }

      // Select endpoint based on load balancing strategy
      const endpoint = await this.selectEndpoint(serviceGroup, request.context);
      if (!endpoint) {
        throw new IntegrationError(
          `No healthy endpoints available for service: ${targetService}`,
          'NO_HEALTHY_ENDPOINTS',
          ErrorCategory.SYSTEM,
        );
      }

      // Create API connector for the selected endpoint
      const connector = this.createConnectorForEndpoint(endpoint);

      // Execute the request
      const response = await connector.executeRequest<T>(
        {
          path: request.path,
          method: request.method as any,
          requiresAuth: true,
        },
        request.data,
        request.context,
      );

      // Update metrics on success
      const latency = Date.now() - startTime;
      this.updateMetricsOnSuccess(targetService, latency);

      return response;
    } catch (error) {
      // Update metrics on failure
      this.updateMetricsOnFailure(serviceName);

      if (error instanceof IntegrationError) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Routing failed',
      };
    }
  }

  /**
   * Execute distributed transaction across multiple services
   */
  async executeDistributedTransaction<T>(transaction: {
    id: string;
    operations: Array<{
      service: string;
      operation: {
        path: string;
        method: string;
        data?: any;
        compensationPath?: string;
      };
    }>;
    context?: WeddingContext;
  }): Promise<IntegrationResponse<T[]>> {
    const completedOperations: Array<{
      service: string;
      operation: any;
      result: any;
    }> = [];

    try {
      // Execute all operations
      for (const { service, operation } of transaction.operations) {
        const result = await this.routeRequest<T>(service, {
          path: operation.path,
          method: operation.method,
          data: operation.data,
          context: transaction.context,
        });

        if (!result.success) {
          // Compensate completed operations
          await this.compensateOperations(completedOperations);
          return {
            success: false,
            error: `Transaction failed at service ${service}: ${result.error}`,
          };
        }

        completedOperations.push({
          service,
          operation,
          result: result.data,
        });
      }

      return {
        success: true,
        data: completedOperations.map((op) => op.result),
      };
    } catch (error) {
      // Compensate completed operations on error
      await this.compensateOperations(completedOperations);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
      };
    }
  }

  /**
   * Add traffic routing rule
   */
  addRoutingRule(rule: TrafficRoutingRule): void {
    // Remove existing rule with same ID
    this.routingRules = this.routingRules.filter((r) => r.id !== rule.id);

    // Add new rule
    this.routingRules.push(rule);

    // Sort by priority (higher priority first)
    this.routingRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove traffic routing rule
   */
  removeRoutingRule(ruleId: string): void {
    this.routingRules = this.routingRules.filter((r) => r.id !== ruleId);
  }

  /**
   * Get comprehensive orchestration metrics
   */
  getMetrics(): OrchestrationMetrics {
    return {
      ...this.metrics,
      serviceDistribution: new Map(this.metrics.serviceDistribution),
      errorDistribution: new Map(this.metrics.errorDistribution),
    };
  }

  /**
   * Get service health summary
   */
  getServiceHealthSummary(): {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
    services: Array<{
      name: string;
      status: string;
      endpointCount: number;
      healthyEndpoints: number;
    }>;
  } {
    const services = Array.from(this.serviceRegistry.services.entries());
    let healthyServices = 0;
    let degradedServices = 0;
    let unhealthyServices = 0;

    const serviceDetails = services.map(([name, group]) => {
      let healthyEndpoints = 0;
      let totalEndpoints = group.endpoints.length;

      group.endpoints.forEach((endpoint) => {
        const health = this.serviceRegistry.healthStatuses.get(endpoint.id);
        if (health?.status === 'healthy') {
          healthyEndpoints++;
        }
      });

      let status: string;
      if (healthyEndpoints === totalEndpoints) {
        status = 'healthy';
        healthyServices++;
      } else if (healthyEndpoints > 0) {
        status = 'degraded';
        degradedServices++;
      } else {
        status = 'unhealthy';
        unhealthyServices++;
      }

      return {
        name,
        status,
        endpointCount: totalEndpoints,
        healthyEndpoints,
      };
    });

    return {
      totalServices: services.length,
      healthyServices,
      degradedServices,
      unhealthyServices,
      services: serviceDetails,
    };
  }

  /**
   * Handle wedding day capacity scaling
   */
  async scaleForWeddingDay(
    serviceName: string,
    scalingFactor: number,
  ): Promise<void> {
    const serviceGroup = this.serviceRegistry.services.get(serviceName);
    if (!serviceGroup) return;

    // Update endpoint capacities for wedding day
    serviceGroup.endpoints.forEach((endpoint) => {
      if (endpoint.weddingDayCapacity) {
        endpoint.maxConnections = Math.floor(
          endpoint.weddingDayCapacity * scalingFactor,
        );
      }
    });

    // Track wedding day overrides
    this.metrics.weddingDayOverrides++;
  }

  // Private methods

  private async selectEndpoint(
    serviceGroup: ServiceGroup,
    context?: WeddingContext,
  ): Promise<ServiceEndpoint | null> {
    const availableEndpoints = serviceGroup.endpoints.filter((endpoint) => {
      const health = this.serviceRegistry.healthStatuses.get(endpoint.id);
      const loadBalancer = this.serviceRegistry.loadBalancerStates.get(
        serviceGroup.name,
      );

      return (
        health?.status === 'healthy' &&
        !loadBalancer?.blockedEndpoints.has(endpoint.id) &&
        this.hasCapacity(endpoint, loadBalancer)
      );
    });

    if (availableEndpoints.length === 0) {
      return null;
    }

    // Apply wedding day priority if needed
    if (context?.isWeddingWeekend && this.weddingDayProtection) {
      const weddingPriorityEndpoints = availableEndpoints.filter(
        (endpoint) =>
          endpoint.weddingDayCapacity && endpoint.weddingDayCapacity > 0,
      );

      if (weddingPriorityEndpoints.length > 0) {
        return this.applyLoadBalancing(serviceGroup, weddingPriorityEndpoints);
      }
    }

    return this.applyLoadBalancing(serviceGroup, availableEndpoints);
  }

  private applyLoadBalancing(
    serviceGroup: ServiceGroup,
    endpoints: ServiceEndpoint[],
  ): ServiceEndpoint {
    const loadBalancer = this.serviceRegistry.loadBalancerStates.get(
      serviceGroup.name,
    )!;

    switch (serviceGroup.loadBalancingStrategy) {
      case 'round_robin':
        const index = loadBalancer.currentIndex % endpoints.length;
        loadBalancer.currentIndex =
          (loadBalancer.currentIndex + 1) % endpoints.length;
        return endpoints[index];

      case 'weighted':
        return this.selectWeightedEndpoint(endpoints);

      case 'least_connections':
        return endpoints.reduce((min, current) => {
          const minConnections = loadBalancer.connectionCounts.get(min.id) || 0;
          const currentConnections =
            loadBalancer.connectionCounts.get(current.id) || 0;
          return currentConnections < minConnections ? current : min;
        });

      case 'health_based':
        return endpoints.reduce((best, current) => {
          const bestHealth = this.serviceRegistry.healthStatuses.get(best.id)!;
          const currentHealth = this.serviceRegistry.healthStatuses.get(
            current.id,
          )!;
          return currentHealth.responseTime < bestHealth.responseTime
            ? current
            : best;
        });

      default:
        return endpoints[0];
    }
  }

  private selectWeightedEndpoint(
    endpoints: ServiceEndpoint[],
  ): ServiceEndpoint {
    const totalWeight = endpoints.reduce(
      (sum, endpoint) => sum + endpoint.weight,
      0,
    );
    let random = Math.random() * totalWeight;

    for (const endpoint of endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }

    return endpoints[endpoints.length - 1];
  }

  private hasCapacity(
    endpoint: ServiceEndpoint,
    loadBalancer?: LoadBalancerState,
  ): boolean {
    if (!loadBalancer) return true;

    const currentConnections =
      loadBalancer.connectionCounts.get(endpoint.id) || 0;
    return currentConnections < endpoint.maxConnections;
  }

  private applyRoutingRules(
    serviceName: string,
    request: {
      path: string;
      method: string;
      headers?: Record<string, string>;
      context?: WeddingContext;
    },
  ): string {
    for (const rule of this.routingRules) {
      if (!rule.enabled) continue;

      if (this.matchesRoutingCondition(rule.condition, request)) {
        return rule.targetService;
      }
    }

    return serviceName;
  }

  private matchesRoutingCondition(
    condition: TrafficRoutingRule['condition'],
    request: {
      path: string;
      method: string;
      headers?: Record<string, string>;
      context?: WeddingContext;
    },
  ): boolean {
    if (condition.path && !request.path.includes(condition.path)) {
      return false;
    }

    if (condition.method && condition.method !== request.method) {
      return false;
    }

    if (condition.headers && request.headers) {
      for (const [key, value] of Object.entries(condition.headers)) {
        if (request.headers[key] !== value) {
          return false;
        }
      }
    }

    if (condition.weddingContext && request.context) {
      if (
        condition.weddingContext.isWeddingWeekend !==
        request.context.isWeddingWeekend
      ) {
        return false;
      }
      if (condition.weddingContext.priority !== request.context.priority) {
        return false;
      }
    }

    return true;
  }

  private createConnectorForEndpoint(
    endpoint: ServiceEndpoint,
  ): ExternalAPIConnector {
    const config: ExternalAPIConfig = {
      apiUrl: endpoint.url,
      baseUrl: endpoint.url,
      timeout: endpoint.timeout,
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        monitoringWindow: 60000,
      },
      weddingDayProtection: this.weddingDayProtection,
    };

    const credentials: IntegrationCredentials = {
      userId: 'system',
      organizationId: 'system',
      provider: endpoint.name,
      apiKey: '', // This should be properly configured
    };

    return new ExternalAPIConnector(config, credentials);
  }

  private async compensateOperations(
    operations: Array<{
      service: string;
      operation: any;
      result: any;
    }>,
  ): Promise<void> {
    // Execute compensation operations in reverse order
    for (let i = operations.length - 1; i >= 0; i--) {
      const { service, operation } = operations[i];

      if (operation.compensationPath) {
        try {
          await this.routeRequest(service, {
            path: operation.compensationPath,
            method: 'POST',
            data: { originalResult: operations[i].result },
          });
        } catch (error) {
          console.error(`Compensation failed for ${service}:`, error);
          // Continue with other compensations
        }
      }
    }
  }

  private startHealthChecks(serviceGroup: ServiceGroup): void {
    const intervalId = setInterval(async () => {
      for (const endpoint of serviceGroup.endpoints) {
        try {
          const startTime = Date.now();
          const connector = this.createConnectorForEndpoint(endpoint);

          await connector.performHealthCheck();

          const responseTime = Date.now() - startTime;
          this.serviceRegistry.healthStatuses.set(endpoint.id, {
            status: 'healthy',
            lastChecked: new Date(),
            responseTime,
          });
        } catch (error) {
          this.serviceRegistry.healthStatuses.set(endpoint.id, {
            status: 'unhealthy',
            lastChecked: new Date(),
            responseTime: 0,
            error:
              error instanceof Error ? error.message : 'Health check failed',
          });
        }
      }
    }, serviceGroup.healthCheckInterval);

    this.healthCheckIntervals.set(serviceGroup.name, intervalId);
  }

  private stopHealthChecks(serviceGroup: ServiceGroup): void {
    const intervalId = this.healthCheckIntervals.get(serviceGroup.name);
    if (intervalId) {
      clearInterval(intervalId);
      this.healthCheckIntervals.delete(serviceGroup.name);
    }
  }

  private startServiceDiscovery(): void {
    if (!this.discoveryConfig.enabled) return;

    // Implement service discovery logic here
    // This would typically involve:
    // 1. Connecting to a service registry (like Consul, etcd, etc.)
    // 2. Periodically discovering new services
    // 3. Auto-registering this orchestrator
    // 4. Handling service lifecycle events

    setInterval(() => {
      this.refreshServiceRegistry();
    }, this.discoveryConfig.refreshInterval);
  }

  private async refreshServiceRegistry(): Promise<void> {
    // Implement service registry refresh logic
    // This is a placeholder for actual service discovery implementation
    console.log('Refreshing service registry...');
  }

  private updateMetricsOnSuccess(serviceName: string, latency: number): void {
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;

    // Update average latency
    const total =
      this.metrics.averageLatency * (this.metrics.totalRequests - 1);
    this.metrics.averageLatency =
      (total + latency) / this.metrics.totalRequests;

    // Update service distribution
    const currentCount = this.metrics.serviceDistribution.get(serviceName) || 0;
    this.metrics.serviceDistribution.set(serviceName, currentCount + 1);
  }

  private updateMetricsOnFailure(serviceName: string): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;

    // Update error distribution
    const currentCount = this.metrics.errorDistribution.get(serviceName) || 0;
    this.metrics.errorDistribution.set(serviceName, currentCount + 1);
  }
}

export default ServiceMeshOrchestrator;
