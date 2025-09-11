/**
 * API Routing Engine - Intelligent API Traffic Routing
 * WS-250 - Core routing engine with wedding-specific optimizations
 */

import {
  APIRoute,
  BackendServer,
  GatewayRequest,
  GatewayResponse,
  WeddingContext,
  VendorTier,
  LoadBalancingStrategy,
  CircuitBreakerState,
  GatewayError,
} from '@/types/api-gateway';

export class APIRoutingEngine {
  private routes: Map<string, APIRoute> = new Map();
  private backendServers: Map<string, BackendServer> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private routingCache: Map<string, string> = new Map();

  // Wedding-specific routing configurations
  private readonly WEDDING_CRITICAL_PATHS = [
    '/api/weddings',
    '/api/vendors/schedule',
    '/api/timeline',
    '/api/communications/urgent',
    '/api/payments/process',
    '/api/client-portal',
  ];

  private readonly SATURDAY_PROTECTION_HOURS = { start: 6, end: 23 }; // 6 AM to 11 PM
  private readonly PEAK_WEDDING_MONTHS = [5, 6, 7, 8, 9]; // May through September

  constructor() {
    this.initializeDefaultRoutes();
    this.startHealthCheckService();
  }

  /**
   * Route incoming request to appropriate backend server
   */
  public async routeRequest(request: GatewayRequest): Promise<{
    server: BackendServer;
    route: APIRoute;
    routingDecision: RoutingDecision;
  }> {
    try {
      // Step 1: Find matching route
      const route = this.findMatchingRoute(request.path, request.method);
      if (!route) {
        throw this.createRoutingError(
          'ROUTE_NOT_FOUND',
          `No route found for ${request.method} ${request.path}`,
        );
      }

      // Step 2: Apply wedding-specific routing logic
      const routingDecision = await this.makeRoutingDecision(request, route);

      // Step 3: Select appropriate backend server
      const server = await this.selectBackendServer(
        route,
        routingDecision,
        request,
      );

      // Step 4: Validate circuit breaker status
      await this.checkCircuitBreaker(server.id, request.weddingContext);

      // Step 5: Cache routing decision for optimization
      this.cacheRoutingDecision(request, server, route);

      return { server, route, routingDecision };
    } catch (error) {
      console.error('[APIRoutingEngine] Routing failed:', error);
      throw error;
    }
  }

  /**
   * Register a new API route
   */
  public registerRoute(route: APIRoute): void {
    const routeKey = this.generateRouteKey(route.path, route.method);
    this.routes.set(routeKey, route);

    console.log(
      `[APIRoutingEngine] Registered route: ${route.method} ${route.path} (Priority: ${route.priority})`,
    );
  }

  /**
   * Register a backend server
   */
  public registerBackendServer(server: BackendServer): void {
    this.backendServers.set(server.id, server);

    // Initialize circuit breaker for this server
    this.circuitBreakers.set(server.id, {
      status: 'closed',
      failureCount: 0,
      successCount: 0,
      threshold: 5,
      timeout: 60000, // 1 minute
    });

    console.log(
      `[APIRoutingEngine] Registered backend server: ${server.id} (${server.url})`,
    );
  }

  /**
   * Update server health status
   */
  public updateServerHealth(
    serverId: string,
    health: Partial<BackendServer>,
  ): void {
    const server = this.backendServers.get(serverId);
    if (server) {
      Object.assign(server, health, { lastHealthCheck: new Date() });
    }
  }

  /**
   * Get routing statistics
   */
  public getRoutingStats(): RoutingStatistics {
    const totalServers = this.backendServers.size;
    const healthyServers = Array.from(this.backendServers.values()).filter(
      (s) => s.status === 'healthy',
    ).length;

    const totalRoutes = this.routes.size;
    const weddingCriticalRoutes = Array.from(this.routes.values()).filter(
      (r) => r.weddingContext?.isWeddingCritical,
    ).length;

    const circuitBreakerStats = Array.from(
      this.circuitBreakers.entries(),
    ).reduce(
      (acc, [serverId, state]) => {
        acc[state.status] = (acc[state.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalServers,
      healthyServers,
      totalRoutes,
      weddingCriticalRoutes,
      circuitBreakerStats,
      cacheHitRate: this.calculateCacheHitRate(),
    };
  }

  // ========================================
  // Private Methods
  // ========================================

  private findMatchingRoute(path: string, method: string): APIRoute | null {
    const exactKey = this.generateRouteKey(path, method);
    const exactMatch = this.routes.get(exactKey);

    if (exactMatch) return exactMatch;

    // Try pattern matching for dynamic routes
    for (const [routeKey, route] of this.routes.entries()) {
      if (this.matchesPattern(path, route.path) && route.method === method) {
        return route;
      }
    }

    return null;
  }

  private async makeRoutingDecision(
    request: GatewayRequest,
    route: APIRoute,
  ): Promise<RoutingDecision> {
    const decision: RoutingDecision = {
      timestamp: new Date(),
      strategy: 'round-robin',
      weddingPriority: false,
      saturdayProtection: false,
      seasonalAdjustment: false,
      reasons: [],
    };

    // Wedding context analysis
    if (request.weddingContext || route.weddingContext?.isWeddingCritical) {
      decision.weddingPriority = true;
      decision.reasons.push('Wedding context detected');

      // Saturday protection
      if (this.isSaturday() && this.isDuringWeddingHours()) {
        decision.saturdayProtection = true;
        decision.strategy = 'wedding-priority';
        decision.reasons.push('Saturday wedding protection active');
      }
    }

    // Check if we're in peak wedding season
    const currentMonth = new Date().getMonth() + 1;
    if (this.PEAK_WEDDING_MONTHS.includes(currentMonth)) {
      decision.seasonalAdjustment = true;
      decision.reasons.push('Peak wedding season adjustment');
    }

    // Vendor tier prioritization
    if (
      request.vendorContext?.tier === 'enterprise' ||
      request.vendorContext?.tier === 'scale'
    ) {
      decision.strategy = 'least-response-time';
      decision.reasons.push(`High-tier vendor (${request.vendorContext.tier})`);
    }

    // Critical path routing
    if (this.isWeddingCriticalPath(request.path)) {
      decision.weddingPriority = true;
      decision.strategy = 'wedding-priority';
      decision.reasons.push('Wedding-critical API path');
    }

    return decision;
  }

  private async selectBackendServer(
    route: APIRoute,
    decision: RoutingDecision,
    request: GatewayRequest,
  ): Promise<BackendServer> {
    const availableServers = this.getAvailableServers();

    if (availableServers.length === 0) {
      throw this.createRoutingError(
        'NO_SERVERS_AVAILABLE',
        'All backend servers are unavailable',
      );
    }

    switch (decision.strategy) {
      case 'wedding-priority':
        return this.selectWeddingPriorityServer(availableServers, request);

      case 'least-response-time':
        return this.selectLeastResponseTimeServer(availableServers);

      case 'least-connections':
        return this.selectLeastConnectionsServer(availableServers);

      case 'round-robin':
      default:
        return this.selectRoundRobinServer(availableServers);
    }
  }

  private selectWeddingPriorityServer(
    servers: BackendServer[],
    request: GatewayRequest,
  ): BackendServer {
    // Prioritize servers with wedding capabilities and best health scores
    const weddingServers = servers.filter(
      (s) =>
        s.capabilities.includes('wedding-optimized') ||
        s.capabilities.includes('high-availability'),
    );

    const targetServers = weddingServers.length > 0 ? weddingServers : servers;

    return targetServers.reduce((best, current) =>
      current.healthScore > best.healthScore ? current : best,
    );
  }

  private selectLeastResponseTimeServer(
    servers: BackendServer[],
  ): BackendServer {
    return servers.reduce((fastest, current) =>
      current.responseTime < fastest.responseTime ? current : fastest,
    );
  }

  private selectLeastConnectionsServer(
    servers: BackendServer[],
  ): BackendServer {
    return servers.reduce((least, current) =>
      current.currentConnections < least.currentConnections ? current : least,
    );
  }

  private selectRoundRobinServer(servers: BackendServer[]): BackendServer {
    // Simple round-robin implementation
    const timestamp = Date.now();
    const index = timestamp % servers.length;
    return servers[index];
  }

  private getAvailableServers(): BackendServer[] {
    return Array.from(this.backendServers.values())
      .filter((server) => {
        const circuitBreaker = this.circuitBreakers.get(server.id);
        return server.status === 'healthy' && circuitBreaker?.status !== 'open';
      })
      .sort((a, b) => b.healthScore - a.healthScore); // Sort by health score
  }

  private async checkCircuitBreaker(
    serverId: string,
    weddingContext?: WeddingContext,
  ): Promise<void> {
    const circuitBreaker = this.circuitBreakers.get(serverId);

    if (!circuitBreaker) return;

    // Wedding override - keep critical services available
    if (weddingContext?.emergencyOverride && weddingContext.isWeddingCritical) {
      console.warn(
        `[APIRoutingEngine] Wedding emergency override for server ${serverId}`,
      );
      return;
    }

    if (circuitBreaker.status === 'open') {
      const now = Date.now();
      if (
        !circuitBreaker.nextAttemptTime ||
        now < circuitBreaker.nextAttemptTime.getTime()
      ) {
        throw this.createRoutingError(
          'CIRCUIT_BREAKER_OPEN',
          `Server ${serverId} circuit breaker is open`,
        );
      } else {
        // Try half-open state
        circuitBreaker.status = 'half-open';
        console.log(
          `[APIRoutingEngine] Circuit breaker for ${serverId} is now half-open`,
        );
      }
    }
  }

  private cacheRoutingDecision(
    request: GatewayRequest,
    server: BackendServer,
    route: APIRoute,
  ): void {
    const cacheKey = `${request.method}:${request.path}:${request.vendorContext?.tier || 'none'}`;
    const cacheValue = `${server.id}:${route.id}`;

    this.routingCache.set(cacheKey, cacheValue);

    // Limit cache size
    if (this.routingCache.size > 10000) {
      const firstKey = this.routingCache.keys().next().value;
      this.routingCache.delete(firstKey);
    }
  }

  private calculateCacheHitRate(): number {
    // This would be implemented with proper metrics collection
    // For now, return a placeholder
    return 0.85; // 85% cache hit rate
  }

  private initializeDefaultRoutes(): void {
    // Initialize wedding-critical routes with high priority
    const weddingRoutes: Partial<APIRoute>[] = [
      {
        path: '/api/weddings/*',
        method: 'GET',
        priority: 'critical',
        weddingContext: {
          isWeddingCritical: true,
          saturdayProtection: true,
          vendorTier: 'professional',
          seasonalPriority: true,
        },
      },
      {
        path: '/api/vendors/schedule/*',
        method: 'POST',
        priority: 'critical',
        weddingContext: {
          isWeddingCritical: true,
          saturdayProtection: true,
          vendorTier: 'starter',
          seasonalPriority: true,
        },
      },
      {
        path: '/api/payments/process',
        method: 'POST',
        priority: 'critical',
        weddingContext: {
          isWeddingCritical: true,
          saturdayProtection: false,
          vendorTier: 'free',
          seasonalPriority: false,
        },
      },
    ];

    weddingRoutes.forEach((routeConfig, index) => {
      const route: APIRoute = {
        id: `wedding-route-${index}`,
        path: routeConfig.path!,
        method: routeConfig.method as any,
        target: 'wedding-backend',
        priority: routeConfig.priority!,
        weddingContext: routeConfig.weddingContext,
        version: '1.0.0',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.registerRoute(route);
    });
  }

  private startHealthCheckService(): void {
    // Start periodic health checks every 30 seconds
    setInterval(() => {
      this.performHealthChecks();
    }, 30000);
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.backendServers.values()).map(
      async (server) => {
        try {
          const startTime = Date.now();

          // Simplified health check - in production this would make actual HTTP requests
          const isHealthy = Math.random() > 0.1; // 90% health rate simulation
          const responseTime = Date.now() - startTime;

          this.updateServerHealth(server.id, {
            responseTime,
            status: isHealthy ? 'healthy' : 'degraded',
            healthScore: isHealthy
              ? Math.min(100, server.healthScore + 5)
              : Math.max(0, server.healthScore - 10),
            lastHealthCheck: new Date(),
          });

          // Update circuit breaker
          const circuitBreaker = this.circuitBreakers.get(server.id);
          if (circuitBreaker && isHealthy) {
            circuitBreaker.successCount++;
            if (
              circuitBreaker.status === 'half-open' &&
              circuitBreaker.successCount >= 3
            ) {
              circuitBreaker.status = 'closed';
              circuitBreaker.failureCount = 0;
            }
          }
        } catch (error) {
          console.error(
            `[APIRoutingEngine] Health check failed for ${server.id}:`,
            error,
          );
          this.handleServerFailure(server.id);
        }
      },
    );

    await Promise.allSettled(healthCheckPromises);
  }

  private handleServerFailure(serverId: string): void {
    const circuitBreaker = this.circuitBreakers.get(serverId);
    if (circuitBreaker) {
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = new Date();

      if (circuitBreaker.failureCount >= circuitBreaker.threshold) {
        circuitBreaker.status = 'open';
        circuitBreaker.nextAttemptTime = new Date(
          Date.now() + circuitBreaker.timeout,
        );
        console.error(
          `[APIRoutingEngine] Circuit breaker opened for server ${serverId}`,
        );
      }
    }

    // Update server health
    this.updateServerHealth(serverId, {
      status: 'unhealthy',
      healthScore: 0,
    });
  }

  // Utility methods
  private generateRouteKey(path: string, method: string): string {
    return `${method.toUpperCase()}:${path}`;
  }

  private matchesPattern(path: string, pattern: string): boolean {
    // Convert route pattern to regex (simplified implementation)
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/:([^/]+)/g, '([^/]+)');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  private isWeddingCriticalPath(path: string): boolean {
    return this.WEDDING_CRITICAL_PATHS.some((criticalPath) =>
      path.startsWith(criticalPath.replace('*', '')),
    );
  }

  private isSaturday(): boolean {
    return new Date().getDay() === 6; // Saturday = 6
  }

  private isDuringWeddingHours(): boolean {
    const hour = new Date().getHours();
    return (
      hour >= this.SATURDAY_PROTECTION_HOURS.start &&
      hour <= this.SATURDAY_PROTECTION_HOURS.end
    );
  }

  private createRoutingError(code: string, message: string): GatewayError {
    return {
      code,
      message,
      severity: 'high',
      timestamp: new Date(),
      requestId: `routing-${Date.now()}`,
      weddingImpact: this.isSaturday(),
    };
  }
}

// Supporting interfaces
interface RoutingDecision {
  timestamp: Date;
  strategy: LoadBalancingStrategy;
  weddingPriority: boolean;
  saturdayProtection: boolean;
  seasonalAdjustment: boolean;
  reasons: string[];
}

interface RoutingStatistics {
  totalServers: number;
  healthyServers: number;
  totalRoutes: number;
  weddingCriticalRoutes: number;
  circuitBreakerStats: Record<string, number>;
  cacheHitRate: number;
}

// Singleton instance for global use
export const apiRoutingEngine = new APIRoutingEngine();
