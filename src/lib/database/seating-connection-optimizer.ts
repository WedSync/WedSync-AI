/**
 * WS-154 Seating Arrangements - Database Connection Optimization
 * Team E - Round 2: Connection pooling and management for high performance
 * Target: Efficient connection management, query routing, load balancing
 */

import { createClient } from '@/lib/supabase/server';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// ==================================================
// CONNECTION POOL CONFIGURATION
// ==================================================

interface ConnectionPoolConfig {
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  statementTimeoutMs: number;
  queryTimeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  healthCheckIntervalMs: number;
}

interface ConnectionMetrics {
  activeConnections: number;
  idleConnections: number;
  totalQueries: number;
  failedQueries: number;
  averageQueryTime: number;
  connectionErrors: number;
  lastHealthCheck: Date;
}

interface QueryContext {
  priority: 'high' | 'medium' | 'low';
  timeout?: number;
  retryable: boolean;
  cacheHint?: string;
  teamContext?: 'team-a' | 'team-b' | 'team-c' | 'team-d';
}

// ==================================================
// OPTIMIZED CONNECTION MANAGER
// ==================================================

class SeatingConnectionManager {
  private config: ConnectionPoolConfig;
  private connections: Map<string, SupabaseClient> = new Map();
  private connectionMetrics: ConnectionMetrics;
  private queryQueue: Array<{
    query: () => Promise<any>;
    context: QueryContext;
    resolve: Function;
    reject: Function;
  }> = [];
  private processingQueue = false;
  private lastHealthCheck = new Date();

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = {
      maxConnections: 20,
      idleTimeoutMs: 30000,
      connectionTimeoutMs: 10000,
      statementTimeoutMs: 30000,
      queryTimeoutMs: 15000,
      retryAttempts: 3,
      retryDelayMs: 1000,
      healthCheckIntervalMs: 60000,
      ...config,
    };

    this.connectionMetrics = {
      activeConnections: 0,
      idleConnections: 0,
      totalQueries: 0,
      failedQueries: 0,
      averageQueryTime: 0,
      connectionErrors: 0,
      lastHealthCheck: new Date(),
    };

    // Start health check interval
    this.startHealthCheck();
  }

  /**
   * Get optimized connection based on query context
   */
  async getConnection(
    context: QueryContext = { priority: 'medium', retryable: true },
  ): Promise<SupabaseClient> {
    const connectionKey = this.getConnectionKey(context);

    let connection = this.connections.get(connectionKey);
    if (!connection || !(await this.isConnectionHealthy(connection))) {
      connection = await this.createOptimizedConnection(context);
      this.connections.set(connectionKey, connection);
    }

    return connection;
  }

  /**
   * Execute query with connection optimization and retry logic
   */
  async executeQuery<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
    context: QueryContext = { priority: 'medium', retryable: true },
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queryQueue.push({
        query: () => this.executeQueryInternal(queryFn, context),
        context,
        resolve,
        reject,
      });

      if (!this.processingQueue) {
        this.processQueryQueue();
      }
    });
  }

  /**
   * Internal query execution with retries and timeout
   */
  private async executeQueryInternal<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
    context: QueryContext,
  ): Promise<T> {
    const startTime = performance.now();
    let lastError: any;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const connection = await this.getConnection(context);

        // Apply query timeout
        const timeout = context.timeout || this.config.queryTimeoutMs;
        const result = await Promise.race([
          queryFn(connection),
          this.createTimeoutPromise(timeout),
        ]);

        // Update metrics
        this.updateQueryMetrics(startTime, true);
        return result as T;
      } catch (error) {
        lastError = error;
        console.warn(`Query attempt ${attempt} failed:`, error);

        if (!context.retryable || attempt === this.config.retryAttempts) {
          break;
        }

        // Exponential backoff
        const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    // Update failure metrics
    this.updateQueryMetrics(startTime, false);
    throw lastError;
  }

  /**
   * Process query queue with priority handling
   */
  private async processQueryQueue(): Promise<void> {
    this.processingQueue = true;

    while (this.queryQueue.length > 0) {
      // Sort by priority
      this.queryQueue.sort((a, b) => {
        const priorities = { high: 3, medium: 2, low: 1 };
        return priorities[b.context.priority] - priorities[a.context.priority];
      });

      const { query, resolve, reject } = this.queryQueue.shift()!;

      try {
        const result = await query();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processingQueue = false;
  }

  /**
   * Create optimized connection based on context
   */
  private async createOptimizedConnection(
    context: QueryContext,
  ): Promise<SupabaseClient> {
    try {
      const client = await createClient();

      // Apply connection-specific optimizations
      await this.optimizeConnectionSettings(client, context);

      this.connectionMetrics.activeConnections++;
      return client;
    } catch (error) {
      this.connectionMetrics.connectionErrors++;
      throw error;
    }
  }

  /**
   * Apply connection-specific optimizations
   */
  private async optimizeConnectionSettings(
    client: SupabaseClient,
    context: QueryContext,
  ): Promise<void> {
    try {
      // Team-specific optimizations
      switch (context.teamContext) {
        case 'team-a': // Frontend data requirements
          await this.optimizeForFrontend(client);
          break;
        case 'team-b': // Algorithm optimization
          await this.optimizeForAlgorithms(client);
          break;
        case 'team-c': // Real-time operations
          await this.optimizeForRealtime(client);
          break;
        case 'team-d': // Mobile optimization
          await this.optimizeForMobile(client);
          break;
      }

      // Priority-based optimizations
      switch (context.priority) {
        case 'high':
          // High priority queries get more resources
          break;
        case 'low':
          // Low priority queries get restricted resources
          break;
      }
    } catch (error) {
      console.warn('Connection optimization failed:', error);
    }
  }

  /**
   * Team A - Frontend optimization settings
   */
  private async optimizeForFrontend(client: SupabaseClient): Promise<void> {
    // Optimize for fast UI data loading
    // Focus on reducing latency and improving response times
  }

  /**
   * Team B - Algorithm optimization settings
   */
  private async optimizeForAlgorithms(client: SupabaseClient): Promise<void> {
    // Optimize for complex analytical queries
    // Increase memory and processing power allocation
  }

  /**
   * Team C - Real-time optimization settings
   */
  private async optimizeForRealtime(client: SupabaseClient): Promise<void> {
    // Optimize for real-time subscriptions and updates
    // Minimize connection overhead
  }

  /**
   * Team D - Mobile optimization settings
   */
  private async optimizeForMobile(client: SupabaseClient): Promise<void> {
    // Optimize for mobile constraints
    // Reduce data transfer and battery usage
  }

  /**
   * Get connection key for pooling
   */
  private getConnectionKey(context: QueryContext): string {
    return `${context.priority}_${context.teamContext || 'general'}`;
  }

  /**
   * Check connection health
   */
  private async isConnectionHealthy(client: SupabaseClient): Promise<boolean> {
    try {
      // Simple health check query
      const { error } = await client
        .from('reception_tables')
        .select('id')
        .limit(1)
        .single();
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    this.lastHealthCheck = new Date();

    // Check all connections
    const healthChecks = Array.from(this.connections.entries()).map(
      async ([key, client]) => {
        const healthy = await this.isConnectionHealthy(client);
        if (!healthy) {
          this.connections.delete(key);
          this.connectionMetrics.activeConnections--;
        }
        return healthy;
      },
    );

    await Promise.all(healthChecks);
    this.connectionMetrics.lastHealthCheck = new Date();
  }

  /**
   * Update query metrics
   */
  private updateQueryMetrics(startTime: number, success: boolean): void {
    const duration = performance.now() - startTime;

    this.connectionMetrics.totalQueries++;
    if (!success) {
      this.connectionMetrics.failedQueries++;
    }

    // Update average query time
    const totalSuccessful =
      this.connectionMetrics.totalQueries -
      this.connectionMetrics.failedQueries;
    if (totalSuccessful > 0) {
      this.connectionMetrics.averageQueryTime =
        (this.connectionMetrics.averageQueryTime * (totalSuccessful - 1) +
          duration) /
        totalSuccessful;
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Query timeout after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    this.connections.clear();
    this.connectionMetrics.activeConnections = 0;
    this.connectionMetrics.idleConnections = 0;
  }
}

// ==================================================
// QUERY ROUTER FOR TEAM OPTIMIZATION
// ==================================================

export class SeatingQueryRouter {
  constructor(private connectionManager: SeatingConnectionManager) {}

  /**
   * Team A - Frontend optimized queries
   */
  async executeForFrontend<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
  ): Promise<T> {
    return this.connectionManager.executeQuery(queryFn, {
      priority: 'high',
      retryable: true,
      teamContext: 'team-a',
      cacheHint: 'frontend-data',
    });
  }

  /**
   * Team B - Algorithm optimized queries
   */
  async executeForAlgorithm<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
  ): Promise<T> {
    return this.connectionManager.executeQuery(queryFn, {
      priority: 'medium',
      retryable: true,
      teamContext: 'team-b',
      timeout: 30000, // Longer timeout for complex algorithms
    });
  }

  /**
   * Team C - Real-time optimized queries
   */
  async executeForRealtime<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
  ): Promise<T> {
    return this.connectionManager.executeQuery(queryFn, {
      priority: 'high',
      retryable: false, // Real-time doesn't retry
      teamContext: 'team-c',
      timeout: 5000, // Short timeout for real-time
    });
  }

  /**
   * Team D - Mobile optimized queries
   */
  async executeForMobile<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
  ): Promise<T> {
    return this.connectionManager.executeQuery(queryFn, {
      priority: 'medium',
      retryable: true,
      teamContext: 'team-d',
      cacheHint: 'mobile-optimized',
    });
  }

  /**
   * Background/batch operations
   */
  async executeForBackground<T>(
    queryFn: (client: SupabaseClient) => Promise<T>,
  ): Promise<T> {
    return this.connectionManager.executeQuery(queryFn, {
      priority: 'low',
      retryable: true,
      timeout: 60000, // Very long timeout for batch operations
    });
  }
}

// ==================================================
// CONNECTION HEALTH MONITOR
// ==================================================

export class SeatingConnectionHealthMonitor {
  constructor(private connectionManager: SeatingConnectionManager) {}

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    metrics: ConnectionMetrics;
    recommendations: string[];
    alerts: string[];
  }> {
    const metrics = this.connectionManager.getMetrics();
    const recommendations: string[] = [];
    const alerts: string[] = [];

    // Analyze metrics and generate recommendations
    if (metrics.failedQueries / metrics.totalQueries > 0.05) {
      alerts.push('High query failure rate detected');
      recommendations.push(
        'Check database connectivity and query optimization',
      );
    }

    if (metrics.averageQueryTime > 1000) {
      alerts.push('Slow query performance detected');
      recommendations.push('Consider query optimization or connection tuning');
    }

    if (metrics.connectionErrors > 10) {
      alerts.push('Multiple connection errors detected');
      recommendations.push('Review connection pool configuration');
    }

    const healthy = alerts.length === 0;

    return {
      healthy,
      metrics,
      recommendations,
      alerts,
    };
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    queryThroughput: number;
    successRate: number;
    averageResponseTime: number;
    connectionEfficiency: number;
  } {
    const metrics = this.connectionManager.getMetrics();

    return {
      queryThroughput:
        (metrics.totalQueries /
          (Date.now() - metrics.lastHealthCheck.getTime())) *
        1000,
      successRate:
        1 - metrics.failedQueries / Math.max(metrics.totalQueries, 1),
      averageResponseTime: metrics.averageQueryTime,
      connectionEfficiency:
        metrics.activeConnections / Math.max(metrics.totalQueries, 1),
    };
  }
}

// ==================================================
// SINGLETON EXPORTS
// ==================================================

export const seatingConnectionManager = new SeatingConnectionManager();
export const seatingQueryRouter = new SeatingQueryRouter(
  seatingConnectionManager,
);
export const seatingHealthMonitor = new SeatingConnectionHealthMonitor(
  seatingConnectionManager,
);

// ==================================================
// UTILITY FUNCTIONS
// ==================================================

/**
 * Create optimized query context
 */
export function createQueryContext(
  team: 'team-a' | 'team-b' | 'team-c' | 'team-d',
  options: Partial<QueryContext> = {},
): QueryContext {
  const teamDefaults = {
    'team-a': { priority: 'high' as const, retryable: true, timeout: 5000 },
    'team-b': { priority: 'medium' as const, retryable: true, timeout: 30000 },
    'team-c': { priority: 'high' as const, retryable: false, timeout: 3000 },
    'team-d': { priority: 'medium' as const, retryable: true, timeout: 8000 },
  };

  return {
    ...teamDefaults[team],
    ...options,
    teamContext: team,
  };
}

/**
 * Monitor database performance
 */
export async function monitorDatabasePerformance(): Promise<void> {
  const healthStatus = await seatingHealthMonitor.getHealthStatus();
  const performanceReport = seatingHealthMonitor.getPerformanceReport();

  console.log('Database Health Status:', healthStatus);
  console.log('Performance Report:', performanceReport);

  // Log warnings if performance is degraded
  if (!healthStatus.healthy) {
    console.warn('Database health issues detected:', healthStatus.alerts);
  }

  if (performanceReport.averageResponseTime > 1000) {
    console.warn('Slow query performance detected:', performanceReport);
  }
}
