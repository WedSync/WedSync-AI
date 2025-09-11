/**
 * Performance Metrics Tracker - WS-173 Backend Performance Optimization
 * Team B - Round 1 Implementation
 * Tracks API response times, cache hits, database queries, and system performance
 */

import {
  CacheService,
  CACHE_PREFIXES,
  CACHE_TTL,
} from '@/lib/cache/redis-client';
import { createClient } from '@/lib/supabase/server';

export interface APIMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  cacheHit: boolean;
  dbQueries: number;
  dbQueryTime: number;
  memoryUsage: number;
  timestamp: Date;
  userId?: string;
  organizationId?: string;
  errorMessage?: string;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  redisConnections: number;
  cacheHitRatio: number;
  averageResponseTime: number;
  requestCount: number;
  errorRate: number;
  timestamp: Date;
}

export interface DatabaseMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: Date;
  slow: boolean;
}

export interface CacheMetrics {
  key: string;
  operation: 'GET' | 'SET' | 'DEL' | 'FLUSH';
  hit: boolean;
  size?: number;
  ttl?: number;
  timestamp: Date;
}

export class MetricsTracker {
  private static instance: MetricsTracker;
  private apiMetrics: APIMetrics[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private databaseMetrics: DatabaseMetrics[] = [];
  private cacheMetrics: CacheMetrics[] = [];

  // Performance thresholds
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private static readonly SLOW_API_THRESHOLD = 2000; // 2 seconds
  private static readonly HIGH_MEMORY_THRESHOLD = 0.85; // 85%

  // Batch processing
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  static getInstance(): MetricsTracker {
    if (!MetricsTracker.instance) {
      MetricsTracker.instance = new MetricsTracker();
    }
    return MetricsTracker.instance;
  }

  constructor() {
    this.startPeriodicFlush();
  }

  /**
   * Track API call performance
   */
  async trackAPICall(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    options: {
      cacheHit?: boolean;
      dbQueries?: number;
      dbQueryTime?: number;
      userId?: string;
      organizationId?: string;
      errorMessage?: string;
    } = {},
  ): Promise<void> {
    const memoryUsage = process.memoryUsage();

    const metric: APIMetrics = {
      endpoint,
      method,
      responseTime,
      statusCode,
      cacheHit: options.cacheHit || false,
      dbQueries: options.dbQueries || 0,
      dbQueryTime: options.dbQueryTime || 0,
      memoryUsage: memoryUsage.heapUsed,
      timestamp: new Date(),
      userId: options.userId,
      organizationId: options.organizationId,
      errorMessage: options.errorMessage,
    };

    this.apiMetrics.push(metric);

    // Check for performance issues
    if (responseTime > MetricsTracker.SLOW_API_THRESHOLD) {
      await this.logPerformanceAlert('SLOW_API', {
        endpoint,
        responseTime,
        threshold: MetricsTracker.SLOW_API_THRESHOLD,
      });
    }

    // Cache the metric for real-time access
    const realtimeKey = CacheService.buildKey(
      CACHE_PREFIXES.ANALYTICS,
      'realtime_metrics',
      Date.now().toString(),
    );
    await CacheService.set(realtimeKey, metric, CACHE_TTL.SHORT);

    this.checkBatchFlush();
  }

  /**
   * Track database query performance
   */
  async trackDatabaseQuery(
    query: string,
    executionTime: number,
    rowsAffected: number = 0,
    table: string = 'unknown',
  ): Promise<void> {
    const operation = this.extractQueryOperation(query);
    const isSlow = executionTime > MetricsTracker.SLOW_QUERY_THRESHOLD;

    const metric: DatabaseMetrics = {
      query: this.sanitizeQuery(query),
      executionTime,
      rowsAffected,
      table,
      operation,
      timestamp: new Date(),
      slow: isSlow,
    };

    this.databaseMetrics.push(metric);

    // Log slow queries
    if (isSlow) {
      await this.logPerformanceAlert('SLOW_QUERY', {
        table,
        query: metric.query,
        executionTime,
        threshold: MetricsTracker.SLOW_QUERY_THRESHOLD,
      });
    }

    this.checkBatchFlush();
  }

  /**
   * Track cache operations
   */
  async trackCacheOperation(
    key: string,
    operation: CacheMetrics['operation'],
    hit: boolean = false,
    size?: number,
    ttl?: number,
  ): Promise<void> {
    const metric: CacheMetrics = {
      key: this.sanitizeCacheKey(key),
      operation,
      hit,
      size,
      ttl,
      timestamp: new Date(),
    };

    this.cacheMetrics.push(metric);
    this.checkBatchFlush();
  }

  /**
   * Track system metrics
   */
  async trackSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const memoryPercent = memoryUsage.heapUsed / memoryUsage.heapTotal;

    // Get Redis connection info
    const redisHealth = await CacheService.healthCheck();

    // Calculate cache hit ratio from recent metrics
    const recentCacheMetrics = this.cacheMetrics.slice(-100);
    const cacheHits = recentCacheMetrics.filter(
      (m) => m.hit && m.operation === 'GET',
    ).length;
    const totalCacheOps = recentCacheMetrics.filter(
      (m) => m.operation === 'GET',
    ).length;
    const cacheHitRatio = totalCacheOps > 0 ? cacheHits / totalCacheOps : 0;

    // Calculate average response time
    const recentAPIMetrics = this.apiMetrics.slice(-100);
    const avgResponseTime =
      recentAPIMetrics.length > 0
        ? recentAPIMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
          recentAPIMetrics.length
        : 0;

    // Calculate error rate
    const errorCount = recentAPIMetrics.filter(
      (m) => m.statusCode >= 400,
    ).length;
    const errorRate =
      recentAPIMetrics.length > 0 ? errorCount / recentAPIMetrics.length : 0;

    const metric: SystemMetrics = {
      cpuUsage: await this.getCPUUsage(),
      memoryUsage: memoryPercent,
      diskUsage: 0, // Would need disk usage implementation
      activeConnections: 0, // Would need active connection tracking
      redisConnections: redisHealth.status === 'healthy' ? 1 : 0,
      cacheHitRatio,
      averageResponseTime: avgResponseTime,
      requestCount: recentAPIMetrics.length,
      errorRate,
      timestamp: new Date(),
    };

    this.systemMetrics.push(metric);

    // Check for system alerts
    if (memoryPercent > MetricsTracker.HIGH_MEMORY_THRESHOLD) {
      await this.logPerformanceAlert('HIGH_MEMORY', {
        memoryUsage: memoryPercent,
        threshold: MetricsTracker.HIGH_MEMORY_THRESHOLD,
      });
    }

    // Cache system metrics for dashboard
    const systemKey = CacheService.buildKey(
      CACHE_PREFIXES.ANALYTICS,
      'system_metrics',
    );
    await CacheService.set(systemKey, metric, CACHE_TTL.SHORT);

    return metric;
  }

  /**
   * Get performance summary
   */
  async getPerformanceSummary(timeRange: '1h' | '24h' | '7d' = '1h'): Promise<{
    api: {
      totalRequests: number;
      averageResponseTime: number;
      errorRate: number;
      slowRequests: number;
    };
    database: {
      totalQueries: number;
      averageExecutionTime: number;
      slowQueries: number;
    };
    cache: {
      hitRatio: number;
      totalOperations: number;
    };
    system: {
      averageMemoryUsage: number;
      peakMemoryUsage: number;
      averageCPUUsage: number;
    };
  }> {
    const cutoffTime = this.getCutoffTime(timeRange);

    // Filter metrics by time range
    const apiMetrics = this.apiMetrics.filter((m) => m.timestamp >= cutoffTime);
    const dbMetrics = this.databaseMetrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );
    const cacheMetrics = this.cacheMetrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );
    const sysMetrics = this.systemMetrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );

    return {
      api: {
        totalRequests: apiMetrics.length,
        averageResponseTime:
          apiMetrics.length > 0
            ? apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
              apiMetrics.length
            : 0,
        errorRate:
          apiMetrics.length > 0
            ? apiMetrics.filter((m) => m.statusCode >= 400).length /
              apiMetrics.length
            : 0,
        slowRequests: apiMetrics.filter(
          (m) => m.responseTime > MetricsTracker.SLOW_API_THRESHOLD,
        ).length,
      },
      database: {
        totalQueries: dbMetrics.length,
        averageExecutionTime:
          dbMetrics.length > 0
            ? dbMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
              dbMetrics.length
            : 0,
        slowQueries: dbMetrics.filter((m) => m.slow).length,
      },
      cache: {
        hitRatio: (() => {
          const getOps = cacheMetrics.filter((m) => m.operation === 'GET');
          const hits = getOps.filter((m) => m.hit);
          return getOps.length > 0 ? hits.length / getOps.length : 0;
        })(),
        totalOperations: cacheMetrics.length,
      },
      system: {
        averageMemoryUsage:
          sysMetrics.length > 0
            ? sysMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) /
              sysMetrics.length
            : 0,
        peakMemoryUsage:
          sysMetrics.length > 0
            ? Math.max(...sysMetrics.map((m) => m.memoryUsage))
            : 0,
        averageCPUUsage:
          sysMetrics.length > 0
            ? sysMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) /
              sysMetrics.length
            : 0,
      },
    };
  }

  /**
   * Get top slow endpoints
   */
  async getSlowEndpoints(limit: number = 10): Promise<
    Array<{
      endpoint: string;
      method: string;
      averageResponseTime: number;
      requestCount: number;
      errorRate: number;
    }>
  > {
    const endpointMap = new Map<string, APIMetrics[]>();

    // Group by endpoint + method
    this.apiMetrics.forEach((metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, []);
      }
      endpointMap.get(key)!.push(metric);
    });

    // Calculate averages and sort by response time
    const results = Array.from(endpointMap.entries())
      .map(([key, metrics]) => {
        const [method, endpoint] = key.split(' ', 2);
        const avgResponseTime =
          metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
        const errorCount = metrics.filter((m) => m.statusCode >= 400).length;

        return {
          endpoint,
          method,
          averageResponseTime: avgResponseTime,
          requestCount: metrics.length,
          errorRate: errorCount / metrics.length,
        };
      })
      .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
      .slice(0, limit);

    return results;
  }

  /**
   * Clear metrics older than specified time
   */
  async cleanup(
    olderThan: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
  ): Promise<void> {
    this.apiMetrics = this.apiMetrics.filter((m) => m.timestamp > olderThan);
    this.databaseMetrics = this.databaseMetrics.filter(
      (m) => m.timestamp > olderThan,
    );
    this.cacheMetrics = this.cacheMetrics.filter(
      (m) => m.timestamp > olderThan,
    );
    this.systemMetrics = this.systemMetrics.filter(
      (m) => m.timestamp > olderThan,
    );
  }

  /**
   * Flush metrics to persistent storage
   */
  private async flushMetrics(): Promise<void> {
    if (this.apiMetrics.length === 0 && this.databaseMetrics.length === 0) {
      return;
    }

    try {
      const supabase = await createClient();
      const batch = [];

      // Prepare API metrics for storage
      const apiMetricsToFlush = this.apiMetrics.splice(0, this.BATCH_SIZE);
      if (apiMetricsToFlush.length > 0) {
        batch.push(
          supabase.from('performance_metrics').insert(
            apiMetricsToFlush.map((m) => ({
              metric_type: 'api',
              endpoint: m.endpoint,
              method: m.method,
              response_time: m.responseTime,
              status_code: m.statusCode,
              cache_hit: m.cacheHit,
              db_queries: m.dbQueries,
              db_query_time: m.dbQueryTime,
              memory_usage: m.memoryUsage,
              user_id: m.userId,
              organization_id: m.organizationId,
              error_message: m.errorMessage,
              timestamp: m.timestamp.toISOString(),
            })),
          ),
        );
      }

      // Prepare database metrics for storage
      const dbMetricsToFlush = this.databaseMetrics.splice(0, this.BATCH_SIZE);
      if (dbMetricsToFlush.length > 0) {
        batch.push(
          supabase.from('performance_metrics').insert(
            dbMetricsToFlush.map((m) => ({
              metric_type: 'database',
              query_text: m.query,
              execution_time: m.executionTime,
              rows_affected: m.rowsAffected,
              table_name: m.table,
              operation: m.operation,
              is_slow: m.slow,
              timestamp: m.timestamp.toISOString(),
            })),
          ),
        );
      }

      // Execute batch operations
      await Promise.all(batch);

      console.log(
        `Flushed ${apiMetricsToFlush.length} API metrics and ${dbMetricsToFlush.length} DB metrics`,
      );
    } catch (error) {
      console.error('Failed to flush metrics:', error);

      // Re-add metrics to queue if flush failed (with limit to prevent memory leaks)
      if (this.apiMetrics.length < 1000) {
        // Add back to beginning of array
        this.apiMetrics.unshift(...apiMetricsToFlush);
      }
      if (this.databaseMetrics.length < 1000) {
        this.databaseMetrics.unshift(...dbMetricsToFlush);
      }
    }
  }

  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, this.FLUSH_INTERVAL);
  }

  private checkBatchFlush(): void {
    const totalMetrics = this.apiMetrics.length + this.databaseMetrics.length;
    if (totalMetrics >= this.BATCH_SIZE) {
      this.flushMetrics();
    }
  }

  private getCutoffTime(timeRange: '1h' | '24h' | '7d'): Date {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 60 * 60 * 1000);
    }
  }

  private extractQueryOperation(query: string): DatabaseMetrics['operation'] {
    const upperQuery = query.trim().toUpperCase();
    if (upperQuery.startsWith('SELECT')) return 'SELECT';
    if (upperQuery.startsWith('INSERT')) return 'INSERT';
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
    if (upperQuery.startsWith('DELETE')) return 'DELETE';
    return 'SELECT'; // Default fallback
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data and normalize query for analysis
    return query
      .replace(/\$\d+/g, '?') // Replace parameterized queries
      .replace(/'\s*[^']*\s*'/g, "'?'") // Replace string literals
      .replace(/\d+/g, '?') // Replace numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 500); // Limit length
  }

  private sanitizeCacheKey(key: string): string {
    // Remove sensitive data from cache keys
    return key
      .replace(/[a-f0-9-]{36}/g, '[UUID]') // Replace UUIDs
      .replace(/\d+/g, '[NUM]') // Replace numbers
      .substring(0, 200); // Limit length
  }

  private async getCPUUsage(): Promise<number> {
    // Simple CPU usage calculation - in production would use more sophisticated method
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000000; // Convert microseconds to seconds
  }

  private async logPerformanceAlert(type: string, data: any): Promise<void> {
    const alertKey = CacheService.buildKey(
      'alerts',
      'performance',
      type,
      Date.now().toString(),
    );
    await CacheService.set(
      alertKey,
      {
        type,
        data,
        timestamp: new Date().toISOString(),
      },
      CACHE_TTL.LONG,
    );

    console.warn(`Performance Alert [${type}]:`, data);
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushMetrics();
  }
}

// Export singleton instance
export const metricsTracker = MetricsTracker.getInstance();

// Middleware helper function
export function withMetricsTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  endpoint: string,
  method: string,
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    let statusCode = 200;
    let error: Error | null = null;

    try {
      const result = await fn(...args);
      return result;
    } catch (err) {
      error = err as Error;
      statusCode = 500;
      throw err;
    } finally {
      const responseTime = Date.now() - startTime;

      await metricsTracker.trackAPICall(
        endpoint,
        method,
        responseTime,
        statusCode,
        {
          errorMessage: error?.message,
        },
      );
    }
  }) as T;
}
