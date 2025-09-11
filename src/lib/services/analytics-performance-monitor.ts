/**
 * Analytics Performance Monitoring Service
 * Tracks query performance, identifies bottlenecks, and optimizes analytics operations
 * SECURITY: All monitoring data is organization-scoped and anonymized for sensitive information
 */

export interface QueryPerformanceMetrics {
  queryId: string;
  organizationId: string;
  queryType: 'progress' | 'realtime' | 'historical' | 'custom';
  executionTime: number; // milliseconds
  dataPointsProcessed: number;
  cacheHit: boolean;
  memoryUsage: number; // bytes
  databaseQueries: number;
  timestamp: string;
  endpoint: string;
  userAgent?: string;
  queryComplexity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'error' | 'timeout' | 'cancelled';
  errorDetails?: string;
}

export interface PerformanceThresholds {
  queryTimeWarning: number; // ms
  queryTimeError: number; // ms
  memoryWarning: number; // bytes
  memoryError: number; // bytes
  dataPointsWarning: number;
  dataPointsError: number;
}

export interface PerformanceSummary {
  totalQueries: number;
  averageExecutionTime: number;
  medianExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  cacheHitRate: number;
  errorRate: number;
  slowestQueries: QueryPerformanceMetrics[];
  performanceTrends: {
    period: string;
    avgTime: number;
    queryCount: number;
  }[];
  recommendations: string[];
}

class AnalyticsPerformanceMonitor {
  private static instance: AnalyticsPerformanceMonitor;
  private metrics: Map<string, QueryPerformanceMetrics[]> = new Map();
  private thresholds: PerformanceThresholds;
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = [];

  // Performance thresholds for different query types
  private static readonly DEFAULT_THRESHOLDS: PerformanceThresholds = {
    queryTimeWarning: 2000, // 2 seconds
    queryTimeError: 5000, // 5 seconds
    memoryWarning: 50 * 1024 * 1024, // 50MB
    memoryError: 100 * 1024 * 1024, // 100MB
    dataPointsWarning: 10000,
    dataPointsError: 50000,
  };

  private static readonly MAX_STORED_METRICS = 10000; // Prevent memory leaks
  private static readonly METRICS_RETENTION_HOURS = 24;

  private constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = { ...this.DEFAULT_THRESHOLDS, ...thresholds };
    this.startCleanupInterval();
  }

  static getInstance(
    thresholds?: Partial<PerformanceThresholds>,
  ): AnalyticsPerformanceMonitor {
    if (!this.instance) {
      this.instance = new AnalyticsPerformanceMonitor(thresholds);
    }
    return this.instance;
  }

  /**
   * Start monitoring a query
   */
  startQuery(
    queryId: string,
    organizationId: string,
    queryType: QueryPerformanceMetrics['queryType'],
    endpoint: string,
    queryComplexity: QueryPerformanceMetrics['queryComplexity'] = 'medium',
  ): QueryMonitor {
    return new QueryMonitor(
      this,
      queryId,
      organizationId,
      queryType,
      endpoint,
      queryComplexity,
    );
  }

  /**
   * Record completed query metrics
   */
  recordMetrics(metrics: QueryPerformanceMetrics): void {
    const orgMetrics = this.metrics.get(metrics.organizationId) || [];
    orgMetrics.push(metrics);

    // Keep only the most recent metrics to prevent memory bloat
    if (orgMetrics.length > this.MAX_STORED_METRICS) {
      orgMetrics.splice(0, orgMetrics.length - this.MAX_STORED_METRICS);
    }

    this.metrics.set(metrics.organizationId, orgMetrics);

    // Check for performance violations
    this.checkPerformanceViolations(metrics);

    // Log to database for persistence (async, non-blocking)
    this.persistMetrics(metrics).catch((error) => {
      console.error('Failed to persist performance metrics:', error);
    });
  }

  /**
   * Get performance summary for organization
   */
  getPerformanceSummary(
    organizationId: string,
    timeRange?: { start: Date; end: Date },
  ): PerformanceSummary {
    const orgMetrics = this.metrics.get(organizationId) || [];

    // Filter by time range if provided
    let filteredMetrics = orgMetrics;
    if (timeRange) {
      filteredMetrics = orgMetrics.filter((m) => {
        const timestamp = new Date(m.timestamp);
        return timestamp >= timeRange.start && timestamp <= timeRange.end;
      });
    }

    if (filteredMetrics.length === 0) {
      return this.getEmptySummary();
    }

    // Calculate execution time statistics
    const executionTimes = filteredMetrics
      .map((m) => m.executionTime)
      .sort((a, b) => a - b);
    const totalQueries = filteredMetrics.length;
    const averageExecutionTime =
      executionTimes.reduce((a, b) => a + b, 0) / totalQueries;
    const medianExecutionTime = executionTimes[Math.floor(totalQueries / 2)];
    const p95ExecutionTime = executionTimes[Math.floor(totalQueries * 0.95)];
    const p99ExecutionTime = executionTimes[Math.floor(totalQueries * 0.99)];

    // Cache hit rate
    const cacheHits = filteredMetrics.filter((m) => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalQueries) * 100;

    // Error rate
    const errors = filteredMetrics.filter((m) => m.status === 'error').length;
    const errorRate = (errors / totalQueries) * 100;

    // Slowest queries
    const slowestQueries = [...filteredMetrics]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    // Performance trends
    const performanceTrends = this.calculatePerformanceTrends(filteredMetrics);

    // Generate recommendations
    const recommendations = this.generateRecommendations(filteredMetrics, {
      averageExecutionTime,
      cacheHitRate,
      errorRate,
      p95ExecutionTime,
    });

    return {
      totalQueries,
      averageExecutionTime: Math.round(averageExecutionTime),
      medianExecutionTime,
      p95ExecutionTime,
      p99ExecutionTime,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      slowestQueries: slowestQueries.map((q) => ({
        ...q,
        // Sanitize sensitive information
        queryId: q.queryId.substring(0, 8) + '...',
        userAgent: undefined,
      })),
      performanceTrends,
      recommendations,
    };
  }

  /**
   * Get real-time performance alerts
   */
  getActiveAlerts(organizationId: string): PerformanceAlert[] {
    const recentMetrics = this.getRecentMetrics(organizationId, 300000); // Last 5 minutes
    const alerts: PerformanceAlert[] = [];

    // Check for performance degradation
    const recentAvgTime =
      recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
      recentMetrics.length;
    if (recentAvgTime > this.thresholds.queryTimeError) {
      alerts.push({
        type: 'performance_degradation',
        severity: 'critical',
        message: `Average query time (${Math.round(recentAvgTime)}ms) exceeds critical threshold`,
        timestamp: new Date().toISOString(),
        organizationId,
        metrics: {
          averageTime: recentAvgTime,
          threshold: this.thresholds.queryTimeError,
        },
      });
    }

    // Check error rate
    const errorRate =
      (recentMetrics.filter((m) => m.status === 'error').length /
        recentMetrics.length) *
      100;
    if (errorRate > 10) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'high',
        message: `Error rate (${Math.round(errorRate)}%) is unusually high`,
        timestamp: new Date().toISOString(),
        organizationId,
        metrics: { errorRate },
      });
    }

    // Check memory usage
    const highMemoryQueries = recentMetrics.filter(
      (m) => m.memoryUsage > this.thresholds.memoryWarning,
    );
    if (highMemoryQueries.length > 0) {
      alerts.push({
        type: 'memory_usage_high',
        severity: 'medium',
        message: `${highMemoryQueries.length} queries exceeded memory warning threshold`,
        timestamp: new Date().toISOString(),
        organizationId,
        metrics: { highMemoryQueries: highMemoryQueries.length },
      });
    }

    return alerts;
  }

  /**
   * Register callback for performance alerts
   */
  onPerformanceAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  // Private methods

  private checkPerformanceViolations(metrics: QueryPerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // Check execution time
    if (metrics.executionTime > this.thresholds.queryTimeError) {
      alerts.push({
        type: 'slow_query',
        severity: 'critical',
        message: `Query ${metrics.queryId} took ${metrics.executionTime}ms (threshold: ${this.thresholds.queryTimeError}ms)`,
        timestamp: metrics.timestamp,
        organizationId: metrics.organizationId,
        metrics: {
          executionTime: metrics.executionTime,
          queryId: metrics.queryId,
        },
      });
    } else if (metrics.executionTime > this.thresholds.queryTimeWarning) {
      alerts.push({
        type: 'slow_query',
        severity: 'medium',
        message: `Query ${metrics.queryId} took ${metrics.executionTime}ms (warning threshold: ${this.thresholds.queryTimeWarning}ms)`,
        timestamp: metrics.timestamp,
        organizationId: metrics.organizationId,
        metrics: {
          executionTime: metrics.executionTime,
          queryId: metrics.queryId,
        },
      });
    }

    // Check memory usage
    if (metrics.memoryUsage > this.thresholds.memoryError) {
      alerts.push({
        type: 'memory_usage_critical',
        severity: 'critical',
        message: `Query used ${Math.round(metrics.memoryUsage / 1024 / 1024)}MB memory`,
        timestamp: metrics.timestamp,
        organizationId: metrics.organizationId,
        metrics: { memoryUsage: metrics.memoryUsage },
      });
    }

    // Trigger alert callbacks
    alerts.forEach((alert) => {
      this.alertCallbacks.forEach((callback) => {
        try {
          callback(alert);
        } catch (error) {
          console.error('Alert callback failed:', error);
        }
      });
    });
  }

  private async persistMetrics(
    metrics: QueryPerformanceMetrics,
  ): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      // Store in analytics_performance_metrics table
      await supabase.from('analytics_performance_metrics').insert({
        query_id: metrics.queryId,
        organization_id: metrics.organizationId,
        query_type: metrics.queryType,
        execution_time: metrics.executionTime,
        data_points_processed: metrics.dataPointsProcessed,
        cache_hit: metrics.cacheHit,
        memory_usage: metrics.memoryUsage,
        database_queries: metrics.databaseQueries,
        endpoint: metrics.endpoint,
        query_complexity: metrics.queryComplexity,
        status: metrics.status,
        error_details: metrics.errorDetails,
        created_at: metrics.timestamp,
      });
    } catch (error) {
      // Don't throw - metrics persistence shouldn't break main functionality
      console.error('Failed to persist performance metrics:', error);
    }
  }

  private getRecentMetrics(
    organizationId: string,
    windowMs: number,
  ): QueryPerformanceMetrics[] {
    const orgMetrics = this.metrics.get(organizationId) || [];
    const cutoff = new Date(Date.now() - windowMs);

    return orgMetrics.filter((m) => new Date(m.timestamp) >= cutoff);
  }

  private calculatePerformanceTrends(
    metrics: QueryPerformanceMetrics[],
  ): Array<{ period: string; avgTime: number; queryCount: number }> {
    // Group by hour for trend analysis
    const hourlyGroups: { [hour: string]: QueryPerformanceMetrics[] } = {};

    metrics.forEach((metric) => {
      const hour =
        new Date(metric.timestamp).toISOString().slice(0, 13) + ':00:00.000Z';
      if (!hourlyGroups[hour]) {
        hourlyGroups[hour] = [];
      }
      hourlyGroups[hour].push(metric);
    });

    return Object.entries(hourlyGroups)
      .map(([hour, groupMetrics]) => ({
        period: hour,
        avgTime: Math.round(
          groupMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
            groupMetrics.length,
        ),
        queryCount: groupMetrics.length,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private generateRecommendations(
    metrics: QueryPerformanceMetrics[],
    summary: {
      averageExecutionTime: number;
      cacheHitRate: number;
      errorRate: number;
      p95ExecutionTime: number;
    },
  ): string[] {
    const recommendations: string[] = [];

    // Cache hit rate recommendations
    if (summary.cacheHitRate < 60) {
      recommendations.push(
        'Low cache hit rate detected. Consider increasing cache TTL or implementing more aggressive caching strategies.',
      );
    }

    // Performance recommendations
    if (summary.p95ExecutionTime > this.thresholds.queryTimeWarning) {
      recommendations.push(
        '95th percentile query time is high. Review slow queries and consider query optimization or database indexing.',
      );
    }

    // Error rate recommendations
    if (summary.errorRate > 5) {
      recommendations.push(
        'High error rate detected. Review error logs and implement better error handling or query validation.',
      );
    }

    // Memory usage recommendations
    const highMemoryQueries = metrics.filter(
      (m) => m.memoryUsage > this.thresholds.memoryWarning,
    );
    if (highMemoryQueries.length > metrics.length * 0.1) {
      recommendations.push(
        'Frequent high memory usage detected. Consider implementing data pagination or result set limits.',
      );
    }

    // Database query recommendations
    const avgDbQueries =
      metrics.reduce((sum, m) => sum + m.databaseQueries, 0) / metrics.length;
    if (avgDbQueries > 5) {
      recommendations.push(
        'High number of database queries per request. Consider implementing query batching or using more efficient joins.',
      );
    }

    // Complexity recommendations
    const complexQueries = metrics.filter(
      (m) => m.queryComplexity === 'high' || m.queryComplexity === 'critical',
    );
    if (complexQueries.length > metrics.length * 0.2) {
      recommendations.push(
        'High proportion of complex queries. Consider implementing query result caching or pre-computed aggregations.',
      );
    }

    return recommendations;
  }

  private getEmptySummary(): PerformanceSummary {
    return {
      totalQueries: 0,
      averageExecutionTime: 0,
      medianExecutionTime: 0,
      p95ExecutionTime: 0,
      p99ExecutionTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
      slowestQueries: [],
      performanceTrends: [],
      recommendations: [],
    };
  }

  private startCleanupInterval(): void {
    setInterval(
      () => {
        const cutoff = new Date(
          Date.now() - this.METRICS_RETENTION_HOURS * 60 * 60 * 1000,
        );

        for (const [orgId, orgMetrics] of this.metrics.entries()) {
          const filteredMetrics = orgMetrics.filter(
            (m) => new Date(m.timestamp) >= cutoff,
          );
          if (filteredMetrics.length !== orgMetrics.length) {
            this.metrics.set(orgId, filteredMetrics);
            console.log(
              `Cleaned up ${orgMetrics.length - filteredMetrics.length} old metrics for org ${orgId}`,
            );
          }
        }
      },
      60 * 60 * 1000,
    ); // Run every hour
  }
}

/**
 * Query Monitor for individual query tracking
 */
class QueryMonitor {
  private startTime: number;
  private memoryStart: number;
  private dbQueryCount: number = 0;

  constructor(
    private monitor: AnalyticsPerformanceMonitor,
    private queryId: string,
    private organizationId: string,
    private queryType: QueryPerformanceMetrics['queryType'],
    private endpoint: string,
    private queryComplexity: QueryPerformanceMetrics['queryComplexity'],
  ) {
    this.startTime = performance.now();
    this.memoryStart = this.getCurrentMemoryUsage();
  }

  /**
   * Record a database query
   */
  recordDatabaseQuery(): void {
    this.dbQueryCount++;
  }

  /**
   * Complete the query monitoring
   */
  complete(
    dataPointsProcessed: number,
    cacheHit: boolean = false,
    status: QueryPerformanceMetrics['status'] = 'success',
    errorDetails?: string,
  ): void {
    const endTime = performance.now();
    const memoryEnd = this.getCurrentMemoryUsage();

    const metrics: QueryPerformanceMetrics = {
      queryId: this.queryId,
      organizationId: this.organizationId,
      queryType: this.queryType,
      executionTime: Math.round(endTime - this.startTime),
      dataPointsProcessed,
      cacheHit,
      memoryUsage: memoryEnd - this.memoryStart,
      databaseQueries: this.dbQueryCount,
      timestamp: new Date().toISOString(),
      endpoint: this.endpoint,
      queryComplexity: this.queryComplexity,
      status,
      errorDetails,
    };

    this.monitor.recordMetrics(metrics);
  }

  private getCurrentMemoryUsage(): number {
    // In Node.js environment, use process.memoryUsage()
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }

    // In browser environment, estimate based on performance API
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }

    // Fallback
    return 0;
  }
}

export interface PerformanceAlert {
  type:
    | 'slow_query'
    | 'memory_usage_high'
    | 'memory_usage_critical'
    | 'high_error_rate'
    | 'performance_degradation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  organizationId: string;
  metrics: Record<string, any>;
}

// Singleton instance
export const performanceMonitor = AnalyticsPerformanceMonitor.getInstance();

export { AnalyticsPerformanceMonitor, QueryMonitor };
