/**
 * Domain Router and Traffic Management for WedSync Custom Domains
 *
 * Handles intelligent routing for wedding vendor domains:
 * - bookings.vendor.com → booking forms
 * - gallery.vendor.com → photo galleries
 * - vendor.com → main landing page
 * - www.vendor.com → redirect to main
 */

import { createClient } from '@supabase/supabase-js';

export type RouteType = 'booking' | 'gallery' | 'main' | 'admin' | 'api';
export type RoutingStrategy =
  | 'round-robin'
  | 'least-connections'
  | 'geographic'
  | 'performance';

export interface DomainRoute {
  id: string;
  domain: string;
  subdomain?: string;
  routeType: RouteType;
  destinationUrl: string;
  organizationId: string;
  isActive: boolean;
  priority: number;
  healthCheckUrl?: string;
  lastHealthCheck?: Date;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  trafficWeight: number;
  geographicRegions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutingRule {
  pattern: string;
  routeType: RouteType;
  priority: number;
  conditions?: {
    timeOfDay?: { start: string; end: string };
    daysOfWeek?: number[];
    seasonalPeak?: boolean;
    userAgent?: string[];
    geoLocation?: string[];
  };
}

export interface TrafficMetrics {
  domain: string;
  timestamp: Date;
  requests: number;
  responseTime: number;
  errorRate: number;
  healthScore: number;
  activeConnections: number;
}

export class DomainRouter {
  private supabase;
  private routes: Map<string, DomainRoute[]> = new Map();
  private healthCheckInterval: NodeJS.Timer | null = null;
  private metricsInterval: NodeJS.Timer | null = null;

  // Wedding-specific routing rules
  private readonly WEDDING_ROUTING_RULES: RoutingRule[] = [
    {
      pattern: '^bookings?\\.(.+)',
      routeType: 'booking',
      priority: 100,
      conditions: {
        seasonalPeak: true, // May-September peak handling
        daysOfWeek: [5, 6, 0], // Fri-Sun special handling
      },
    },
    {
      pattern: '^gallery\\.(.+)',
      routeType: 'gallery',
      priority: 90,
    },
    {
      pattern: '^admin\\.(.+)',
      routeType: 'admin',
      priority: 80,
    },
    {
      pattern: '^api\\.(.+)',
      routeType: 'api',
      priority: 70,
    },
    {
      pattern: '^www\\.(.+)',
      routeType: 'main',
      priority: 60,
    },
    {
      pattern: '^(.+)$',
      routeType: 'main',
      priority: 50,
    },
  ];

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(),
    );

    this.initializeHealthChecking();
    this.initializeMetricsCollection();
  }

  /**
   * Route incoming request to appropriate destination
   */
  async routeRequest(
    domain: string,
    pathname: string = '/',
    userAgent?: string,
  ): Promise<{
    destinationUrl: string;
    routeType: RouteType;
    route: DomainRoute;
    cached: boolean;
  }> {
    try {
      // Get or load routes for domain
      const domainRoutes = await this.getRoutesForDomain(domain);

      if (!domainRoutes || domainRoutes.length === 0) {
        throw new Error(`No routes configured for domain: ${domain}`);
      }

      // Apply routing rules to find best match
      const matchingRoute = await this.findBestRoute(
        domain,
        pathname,
        domainRoutes,
        userAgent,
      );

      if (!matchingRoute) {
        throw new Error(`No matching route found for ${domain}${pathname}`);
      }

      // Check route health before routing
      if (matchingRoute.healthStatus === 'unhealthy') {
        const fallbackRoute = await this.findHealthyFallback(
          domainRoutes,
          matchingRoute,
        );
        if (fallbackRoute) {
          await this.logRouteSwitch(matchingRoute, fallbackRoute, 'health');
          return {
            destinationUrl: fallbackRoute.destinationUrl + pathname,
            routeType: fallbackRoute.routeType,
            route: fallbackRoute,
            cached: false,
          };
        }
      }

      // Log successful routing
      await this.recordRouteUsage(matchingRoute, pathname);

      return {
        destinationUrl: matchingRoute.destinationUrl + pathname,
        routeType: matchingRoute.routeType,
        route: matchingRoute,
        cached: this.routes.has(domain),
      };
    } catch (error) {
      console.error(`Domain routing failed for ${domain}: ${error}`);
      throw error;
    }
  }

  /**
   * Find best matching route using wedding-specific rules
   */
  private async findBestRoute(
    domain: string,
    pathname: string,
    routes: DomainRoute[],
    userAgent?: string,
  ): Promise<DomainRoute | null> {
    // Apply routing rules in priority order
    for (const rule of this.WEDDING_ROUTING_RULES) {
      const regex = new RegExp(rule.pattern);
      const match = domain.match(regex);

      if (match) {
        // Find routes matching this rule
        const matchingRoutes = routes.filter(
          (route) =>
            route.routeType === rule.routeType &&
            route.isActive &&
            this.evaluateRoutingConditions(rule.conditions, userAgent),
        );

        if (matchingRoutes.length === 0) continue;

        // Apply load balancing strategy
        const selectedRoute = await this.applyLoadBalancing(
          matchingRoutes,
          'performance',
        );
        if (selectedRoute) return selectedRoute;
      }
    }

    // Fallback to first active route
    return routes.find((route) => route.isActive) || null;
  }

  /**
   * Apply load balancing strategy to select from multiple routes
   */
  private async applyLoadBalancing(
    routes: DomainRoute[],
    strategy: RoutingStrategy = 'round-robin',
  ): Promise<DomainRoute | null> {
    if (routes.length === 0) return null;
    if (routes.length === 1) return routes[0];

    const healthyRoutes = routes.filter(
      (route) => route.healthStatus !== 'unhealthy',
    );
    if (healthyRoutes.length === 0) return routes[0]; // Emergency fallback

    switch (strategy) {
      case 'round-robin':
        return this.roundRobinSelect(healthyRoutes);

      case 'least-connections':
        return await this.leastConnectionsSelect(healthyRoutes);

      case 'performance':
        return await this.performanceBasedSelect(healthyRoutes);

      case 'geographic':
        return await this.geographicSelect(healthyRoutes);

      default:
        return healthyRoutes[0];
    }
  }

  /**
   * Round-robin load balancing
   */
  private roundRobinSelect(routes: DomainRoute[]): DomainRoute {
    const now = Date.now();
    const index = Math.floor(now / 1000) % routes.length;
    return routes[index];
  }

  /**
   * Performance-based route selection
   */
  private async performanceBasedSelect(
    routes: DomainRoute[],
  ): Promise<DomainRoute> {
    const routeMetrics = await Promise.all(
      routes.map(async (route) => {
        const metrics = await this.getRouteMetrics(route.id);
        return {
          route,
          score: this.calculatePerformanceScore(metrics),
        };
      }),
    );

    // Sort by performance score (higher is better)
    routeMetrics.sort((a, b) => b.score - a.score);

    return routeMetrics[0]?.route || routes[0];
  }

  /**
   * Calculate performance score for route selection
   */
  private calculatePerformanceScore(metrics: TrafficMetrics[]): number {
    if (!metrics || metrics.length === 0) return 50; // Default score

    const recent = metrics.slice(-10); // Last 10 measurements
    const avgResponseTime =
      recent.reduce((sum, m) => sum + m.responseTime, 0) / recent.length;
    const avgErrorRate =
      recent.reduce((sum, m) => sum + m.errorRate, 0) / recent.length;

    // Score: lower response time + lower error rate = higher score
    const responseScore = Math.max(0, 100 - avgResponseTime);
    const errorScore = Math.max(0, 100 - avgErrorRate * 100);

    return (responseScore + errorScore) / 2;
  }

  /**
   * Evaluate routing conditions for wedding-specific logic
   */
  private evaluateRoutingConditions(
    conditions?: RoutingRule['conditions'],
    userAgent?: string,
  ): boolean {
    if (!conditions) return true;

    const now = new Date();

    // Time of day check
    if (conditions.timeOfDay) {
      const currentHour = now.getHours();
      const startHour = parseInt(conditions.timeOfDay.start.split(':')[0]);
      const endHour = parseInt(conditions.timeOfDay.end.split(':')[0]);

      if (currentHour < startHour || currentHour > endHour) {
        return false;
      }
    }

    // Day of week check
    if (conditions.daysOfWeek) {
      const currentDay = now.getDay();
      if (!conditions.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    // Wedding season peak (May-September)
    if (conditions.seasonalPeak) {
      const month = now.getMonth() + 1; // 1-12
      const isPeakSeason = month >= 5 && month <= 9;

      if (!isPeakSeason) {
        return false;
      }
    }

    // User agent check
    if (conditions.userAgent && userAgent) {
      const matchesUserAgent = conditions.userAgent.some((pattern) =>
        new RegExp(pattern, 'i').test(userAgent),
      );
      if (!matchesUserAgent) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get routes for domain (with caching)
   */
  private async getRoutesForDomain(domain: string): Promise<DomainRoute[]> {
    // Check cache first
    if (this.routes.has(domain)) {
      return this.routes.get(domain)!;
    }

    // Load from database
    const { data, error } = await this.supabase
      .from('domain_routes')
      .select('*')
      .eq('domain', domain)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) {
      throw new Error(`Failed to load routes for ${domain}: ${error.message}`);
    }

    const routes: DomainRoute[] = (data || []).map(this.mapDatabaseToRoute);

    // Cache for 5 minutes
    this.routes.set(domain, routes);
    setTimeout(() => this.routes.delete(domain), 5 * 60 * 1000);

    return routes;
  }

  /**
   * Create new domain route
   */
  async createRoute(
    route: Omit<DomainRoute, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<DomainRoute> {
    const { data, error } = await this.supabase
      .from('domain_routes')
      .insert({
        domain: route.domain,
        subdomain: route.subdomain,
        route_type: route.routeType,
        destination_url: route.destinationUrl,
        organization_id: route.organizationId,
        is_active: route.isActive,
        priority: route.priority,
        health_check_url: route.healthCheckUrl,
        health_status: route.healthStatus,
        traffic_weight: route.trafficWeight,
        geographic_regions: route.geographicRegions,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create route: ${error.message}`);
    }

    // Clear cache to force reload
    this.routes.delete(route.domain);

    return this.mapDatabaseToRoute(data);
  }

  /**
   * Health check monitoring
   */
  private initializeHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        console.error('Health check cycle failed:', error);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform health checks on all active routes
   */
  private async performHealthChecks(): Promise<void> {
    const { data: routes } = await this.supabase
      .from('domain_routes')
      .select('*')
      .eq('is_active', true)
      .not('health_check_url', 'is', null);

    if (!routes) return;

    const healthPromises = routes.map(async (route) => {
      try {
        const startTime = Date.now();
        const response = await fetch(route.health_check_url!, {
          method: 'GET',
          timeout: 10000,
          headers: { 'User-Agent': 'WedSync-HealthCheck/1.0' },
        });

        const responseTime = Date.now() - startTime;
        const isHealthy = response.ok;

        await this.updateRouteHealth(route.id, isHealthy, responseTime);
      } catch (error) {
        await this.updateRouteHealth(route.id, false, 10000, error.message);
      }
    });

    await Promise.allSettled(healthPromises);
  }

  /**
   * Update route health status
   */
  private async updateRouteHealth(
    routeId: string,
    isHealthy: boolean,
    responseTime: number,
    error?: string,
  ): Promise<void> {
    const healthStatus = isHealthy ? 'healthy' : 'unhealthy';

    await this.supabase
      .from('domain_routes')
      .update({
        health_status: healthStatus,
        last_health_check: new Date().toISOString(),
        last_response_time: responseTime,
        last_health_error: error || null,
      })
      .eq('id', routeId);

    // Record metrics
    await this.recordHealthMetric(routeId, isHealthy, responseTime);
  }

  /**
   * Initialize metrics collection
   */
  private initializeMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectTrafficMetrics();
      } catch (error) {
        console.error('Metrics collection failed:', error);
      }
    }, 60000); // Every minute
  }

  /**
   * Get route performance metrics
   */
  async getRouteMetrics(
    routeId: string,
    hours: number = 1,
  ): Promise<TrafficMetrics[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const { data, error } = await this.supabase
      .from('route_metrics')
      .select('*')
      .eq('route_id', routeId)
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Failed to get route metrics:', error);
      return [];
    }

    return (data || []).map((row) => ({
      domain: row.domain,
      timestamp: new Date(row.timestamp),
      requests: row.requests,
      responseTime: row.response_time,
      errorRate: row.error_rate,
      healthScore: row.health_score,
      activeConnections: row.active_connections,
    }));
  }

  /**
   * Map database row to DomainRoute object
   */
  private mapDatabaseToRoute(data: any): DomainRoute {
    return {
      id: data.id,
      domain: data.domain,
      subdomain: data.subdomain,
      routeType: data.route_type,
      destinationUrl: data.destination_url,
      organizationId: data.organization_id,
      isActive: data.is_active,
      priority: data.priority,
      healthCheckUrl: data.health_check_url,
      lastHealthCheck: data.last_health_check
        ? new Date(data.last_health_check)
        : undefined,
      healthStatus: data.health_status,
      trafficWeight: data.traffic_weight,
      geographicRegions: data.geographic_regions,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.routes.clear();
  }

  // Additional utility methods for internal use
  private async recordRouteUsage(
    route: DomainRoute,
    pathname: string,
  ): Promise<void> {
    // Implementation for usage tracking
  }

  private async logRouteSwitch(
    from: DomainRoute,
    to: DomainRoute,
    reason: string,
  ): Promise<void> {
    // Implementation for route switching logs
  }

  private async findHealthyFallback(
    routes: DomainRoute[],
    excludeRoute: DomainRoute,
  ): Promise<DomainRoute | null> {
    return (
      routes.find(
        (route) =>
          route.id !== excludeRoute.id &&
          route.healthStatus === 'healthy' &&
          route.isActive,
      ) || null
    );
  }

  private async leastConnectionsSelect(
    routes: DomainRoute[],
  ): Promise<DomainRoute> {
    // Implementation for least connections selection
    return routes[0]; // Simplified for now
  }

  private async geographicSelect(routes: DomainRoute[]): Promise<DomainRoute> {
    // Implementation for geographic-based selection
    return routes[0]; // Simplified for now
  }

  private async collectTrafficMetrics(): Promise<void> {
    // Implementation for traffic metrics collection
  }

  private async recordHealthMetric(
    routeId: string,
    isHealthy: boolean,
    responseTime: number,
  ): Promise<void> {
    // Implementation for health metrics recording
  }
}

export default DomainRouter;
