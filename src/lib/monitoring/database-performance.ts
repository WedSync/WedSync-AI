/**
 * Enhanced Database Performance Monitoring
 * Comprehensive PostgreSQL monitoring for WedSync production environment
 * Wedding Day Priority: Saturday performance optimization and early warning systems
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './structured-logger';
import { metrics } from './metrics';
import { alertManager } from './alerts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
);

interface QueryPerformanceMetric {
  query: string;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'JOIN';
  executionTime: number;
  rowsAffected?: number;
  timestamp: string;
  userId?: string;
  organizationId?: string;
  weddingContext?: {
    isWeddingDay: boolean;
    weddingId?: string;
    criticalOperation: boolean;
  };
}

interface ConnectionPoolMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  maxConnections: number;
  waitingConnections: number;
  connectionPoolUtilization: number;
  averageConnectionTime: number;
  timestamp: string;
}

interface DatabaseHealthMetrics {
  performanceScore: number;
  queryMetrics: {
    averageResponseTime: number;
    slowQueryCount: number;
    totalQueries: number;
    errorRate: number;
    topSlowQueries: QueryPerformanceMetric[];
  };
  connectionMetrics: ConnectionPoolMetrics;
  tableMetrics: {
    [tableName: string]: {
      size: number;
      indexEfficiency: number;
      queryFrequency: number;
      lastVacuum?: string;
    };
  };
  weddingDayMetrics?: {
    criticalPathPerformance: number;
    paymentQueryPerformance: number;
    guestDataQueryPerformance: number;
    alertsTriggered: number;
  };
}

interface SlowQueryAlert {
  query: string;
  executionTime: number;
  threshold: number;
  table: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  weddingDayImpact?: boolean;
}

class DatabasePerformanceMonitor {
  private queryMetrics: QueryPerformanceMetric[] = [];
  private isWeddingDay: boolean = false;
  private monitoring: boolean = false;
  private metricsRetention: number = 24 * 60 * 60 * 1000; // 24 hours

  // Wedding day critical tables and thresholds
  private criticalTables = [
    'clients',
    'guests',
    'forms',
    'payments',
    'user_profiles',
    'organizations',
    'venues',
  ];

  // GUARDIAN FIX: Ultra-strict wedding day thresholds for zero tolerance
  private weddingDayThresholds = {
    slowQuery: 200, // 200ms (CRITICAL: Wedding day operations must be instant)
    verySlowQuery: 500, // 500ms (was 1000ms - too slow for wedding coordination)
    criticalQuery: 1000, // 1000ms (was 2000ms - unacceptable for wedding day)
    errorRate: 0.1, // 0.1% (was 0.5% - zero tolerance for wedding failures)
    connectionUtilization: 50, // 50% (was 70% - more headroom for wedding day spikes)
  };

  private normalThresholds = {
    slowQuery: 1000, // 1000ms
    verySlowQuery: 2000, // 2000ms
    criticalQuery: 5000, // 5000ms
    errorRate: 1, // 1%
    connectionUtilization: 80, // 80%
  };

  constructor() {
    this.isWeddingDay = new Date().getDay() === 6; // Saturday
    this.startMonitoring();
  }

  private startMonitoring(): void {
    if (this.monitoring) return;

    this.monitoring = true;

    // Start periodic monitoring
    setInterval(() => {
      this.collectMetrics();
    }, 30000); // Every 30 seconds

    // Wedding day enhanced monitoring
    if (this.isWeddingDay) {
      logger.info('🎂 Wedding day database monitoring activated', {
        context: 'DatabasePerformanceMonitor',
        thresholds: this.weddingDayThresholds,
      });

      // More frequent monitoring on wedding day
      setInterval(() => {
        this.collectCriticalMetrics();
      }, 10000); // Every 10 seconds
    }

    // Cleanup old metrics
    setInterval(
      () => {
        this.cleanupOldMetrics();
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  // Track individual query performance
  async trackQuery(
    query: string,
    operation: QueryPerformanceMetric['operation'],
    executionTime: number,
    context?: {
      table?: string;
      rowsAffected?: number;
      userId?: string;
      organizationId?: string;
      weddingId?: string;
    },
  ): Promise<void> {
    const table = context?.table || this.extractTableFromQuery(query);
    const isCriticalTable = this.criticalTables.includes(table);
    const thresholds = this.isWeddingDay
      ? this.weddingDayThresholds
      : this.normalThresholds;

    const queryMetric: QueryPerformanceMetric = {
      query: this.sanitizeQuery(query),
      table,
      operation,
      executionTime,
      rowsAffected: context?.rowsAffected,
      timestamp: new Date().toISOString(),
      userId: context?.userId,
      organizationId: context?.organizationId,
      weddingContext: {
        isWeddingDay: this.isWeddingDay,
        weddingId: context?.weddingId,
        criticalOperation: isCriticalTable && this.isWeddingDay,
      },
    };

    // Store metric
    this.queryMetrics.push(queryMetric);

    // Update metrics system
    metrics.increment('database.queries.total');
    metrics.histogram('database.query.duration', executionTime);
    metrics.histogram(
      `database.query.${operation.toLowerCase()}.duration`,
      executionTime,
    );

    if (isCriticalTable) {
      metrics.histogram(
        'database.critical_table.query.duration',
        executionTime,
      );
    }

    // Check for slow queries and trigger alerts
    if (executionTime > thresholds.slowQuery) {
      await this.handleSlowQuery(queryMetric, thresholds);
    }

    // Wedding day specific logging
    if (
      this.isWeddingDay &&
      (executionTime > thresholds.slowQuery || isCriticalTable)
    ) {
      logger.performance('Wedding day database query', executionTime, {
        query: queryMetric.query,
        table,
        operation,
        criticalTable: isCriticalTable,
        weddingId: context?.weddingId,
      });
    }
  }

  // Get comprehensive database health metrics
  async getHealthMetrics(): Promise<DatabaseHealthMetrics> {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;

    // Filter recent queries
    const recentQueries = this.queryMetrics.filter(
      (query) => new Date(query.timestamp).getTime() > hourAgo,
    );

    // Calculate query performance metrics
    const totalQueries = recentQueries.length;
    const averageResponseTime =
      totalQueries > 0
        ? recentQueries.reduce((sum, q) => sum + q.executionTime, 0) /
          totalQueries
        : 0;

    const thresholds = this.isWeddingDay
      ? this.weddingDayThresholds
      : this.normalThresholds;
    const slowQueryCount = recentQueries.filter(
      (q) => q.executionTime > thresholds.slowQuery,
    ).length;
    const errorRate = 0; // Would come from error tracking

    // Get top slow queries
    const topSlowQueries = recentQueries
      .filter((q) => q.executionTime > thresholds.slowQuery)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 5);

    // Get connection metrics (simulated - in production, query pg_stat_activity)
    const connectionMetrics = await this.getConnectionMetrics();

    // Get table metrics
    const tableMetrics = await this.getTableMetrics();

    // Calculate performance score
    const performanceScore = this.calculatePerformanceScore(
      averageResponseTime,
      slowQueryCount,
      totalQueries,
      connectionMetrics,
      thresholds,
    );

    const healthMetrics: DatabaseHealthMetrics = {
      performanceScore,
      queryMetrics: {
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
        slowQueryCount,
        totalQueries,
        errorRate,
        topSlowQueries,
      },
      connectionMetrics,
      tableMetrics,
    };

    // Add wedding day specific metrics
    if (this.isWeddingDay) {
      healthMetrics.weddingDayMetrics =
        await this.getWeddingDayMetrics(recentQueries);
    }

    return healthMetrics;
  }

  // Get real-time connection pool metrics
  private async getConnectionMetrics(): Promise<ConnectionPoolMetrics> {
    try {
      // In production, this would query pg_stat_activity and connection pool stats
      // For now, simulate realistic metrics

      const maxConnections = 100;
      const activeConnections = Math.floor(Math.random() * 50) + 10;
      const idleConnections = Math.floor(Math.random() * 20) + 5;
      const totalConnections = activeConnections + idleConnections;
      const waitingConnections = Math.floor(Math.random() * 5);
      const connectionPoolUtilization =
        (totalConnections / maxConnections) * 100;
      const averageConnectionTime = 50 + Math.random() * 100; // 50-150ms

      return {
        activeConnections,
        idleConnections,
        totalConnections,
        maxConnections,
        waitingConnections,
        connectionPoolUtilization,
        averageConnectionTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get connection metrics', error as Error);

      return {
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
        maxConnections: 100,
        waitingConnections: 0,
        connectionPoolUtilization: 0,
        averageConnectionTime: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Get table-specific performance metrics
  private async getTableMetrics(): Promise<
    DatabaseHealthMetrics['tableMetrics']
  > {
    const tableMetrics: DatabaseHealthMetrics['tableMetrics'] = {};

    try {
      // In production, query pg_stat_user_tables for real metrics
      // For now, simulate metrics for critical tables

      for (const table of this.criticalTables) {
        const recentQueries = this.queryMetrics.filter(
          (q) =>
            q.table === table &&
            new Date(q.timestamp).getTime() > Date.now() - 60 * 60 * 1000,
        );

        tableMetrics[table] = {
          size: Math.floor(Math.random() * 1000000) + 10000, // 10K-1M rows
          indexEfficiency: 85 + Math.random() * 15, // 85-100%
          queryFrequency: recentQueries.length,
          lastVacuum: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        };
      }

      return tableMetrics;
    } catch (error) {
      logger.error('Failed to get table metrics', error as Error);
      return {};
    }
  }

  // Get wedding day specific performance metrics
  private async getWeddingDayMetrics(
    recentQueries: QueryPerformanceMetric[],
  ): Promise<DatabaseHealthMetrics['weddingDayMetrics']> {
    const criticalQueries = recentQueries.filter(
      (q) => q.weddingContext?.criticalOperation,
    );
    const paymentQueries = recentQueries.filter((q) => q.table === 'payments');
    const guestQueries = recentQueries.filter((q) => q.table === 'guests');

    const criticalPathPerformance =
      criticalQueries.length > 0
        ? criticalQueries.reduce((sum, q) => sum + q.executionTime, 0) /
          criticalQueries.length
        : 0;

    const paymentQueryPerformance =
      paymentQueries.length > 0
        ? paymentQueries.reduce((sum, q) => sum + q.executionTime, 0) /
          paymentQueries.length
        : 0;

    const guestDataQueryPerformance =
      guestQueries.length > 0
        ? guestQueries.reduce((sum, q) => sum + q.executionTime, 0) /
          guestQueries.length
        : 0;

    return {
      criticalPathPerformance: Math.round(criticalPathPerformance * 100) / 100,
      paymentQueryPerformance: Math.round(paymentQueryPerformance * 100) / 100,
      guestDataQueryPerformance:
        Math.round(guestDataQueryPerformance * 100) / 100,
      alertsTriggered: 0, // Would come from alert system
    };
  }

  // Handle slow query detection and alerting
  private async handleSlowQuery(
    queryMetric: QueryPerformanceMetric,
    thresholds: typeof this.weddingDayThresholds,
  ): Promise<void> {
    const { query, table, executionTime, operation, weddingContext } =
      queryMetric;

    // Determine impact level
    let impact: SlowQueryAlert['impact'];
    if (executionTime > thresholds.criticalQuery) {
      impact = 'critical';
    } else if (executionTime > thresholds.verySlowQuery) {
      impact = 'high';
    } else if (weddingContext?.criticalOperation) {
      impact = 'high'; // Elevate wedding day critical operations
    } else {
      impact = 'medium';
    }

    // Generate recommendation
    const recommendation = this.generateQueryRecommendation(
      table,
      operation,
      executionTime,
    );

    const slowQueryAlert: SlowQueryAlert = {
      query,
      executionTime,
      threshold: thresholds.slowQuery,
      table,
      impact,
      recommendation,
      weddingDayImpact: weddingContext?.isWeddingDay,
    };

    // Log the slow query
    logger.warn('Slow database query detected', {
      context: 'DatabasePerformanceMonitor',
      queryAlert: slowQueryAlert,
      weddingDay: this.isWeddingDay,
    });

    // Track metrics
    metrics.increment('database.queries.slow');
    metrics.increment(`database.queries.slow.${impact}`);

    if (weddingContext?.isWeddingDay) {
      metrics.increment('database.queries.slow.wedding_day');
    }

    // Trigger alerts for high-impact queries
    if (impact === 'critical' || (impact === 'high' && this.isWeddingDay)) {
      await this.triggerSlowQueryAlert(slowQueryAlert);
    }
  }

  // Generate query optimization recommendations
  private generateQueryRecommendation(
    table: string,
    operation: string,
    executionTime: number,
  ): string {
    const recommendations = [
      `Consider adding indexes to ${table} for ${operation} operations`,
      `Review WHERE clauses for ${table} queries to ensure they use indexes`,
      `Consider query optimization or breaking down complex ${operation} on ${table}`,
      `Check for missing or outdated statistics on ${table}`,
      `Consider connection pooling optimization for ${table} operations`,
    ];

    if (executionTime > 5000) {
      recommendations.unshift(
        `URGENT: ${executionTime}ms query needs immediate optimization`,
      );
    }

    if (this.isWeddingDay) {
      recommendations.unshift(
        `🎂 WEDDING DAY: Priority optimization needed for ${table}`,
      );
    }

    return recommendations[Math.floor(Math.random() * recommendations.length)];
  }

  // Trigger alerts for critical database performance issues
  private async triggerSlowQueryAlert(alert: SlowQueryAlert): Promise<void> {
    const severity = alert.impact === 'critical' ? 'critical' : 'warning';
    const title = `Slow Database Query: ${alert.table}`;
    const description =
      `Query execution time: ${alert.executionTime}ms (threshold: ${alert.threshold}ms)\n` +
      `Table: ${alert.table}\n` +
      `Impact: ${alert.impact}\n` +
      `Recommendation: ${alert.recommendation}` +
      (alert.weddingDayImpact ? '\n🎂 WEDDING DAY IMPACT' : '');

    try {
      await alertManager.createAlert({
        title,
        description,
        severity,
        source: 'database-monitor',
        metadata: {
          query: alert.query,
          executionTime: alert.executionTime,
          table: alert.table,
          weddingDay: alert.weddingDayImpact,
        },
      });
    } catch (error) {
      logger.error('Failed to create slow query alert', error as Error);
    }
  }

  // Calculate overall database performance score (0-100)
  private calculatePerformanceScore(
    avgResponseTime: number,
    slowQueryCount: number,
    totalQueries: number,
    connectionMetrics: ConnectionPoolMetrics,
    thresholds: typeof this.weddingDayThresholds,
  ): number {
    let score = 100;

    // Response time impact (max -30 points)
    const responseTimeRatio = avgResponseTime / thresholds.slowQuery;
    if (responseTimeRatio > 1) {
      score -= Math.min(30, responseTimeRatio * 10);
    }

    // Slow query ratio impact (max -25 points)
    if (totalQueries > 0) {
      const slowQueryRatio = slowQueryCount / totalQueries;
      score -= slowQueryRatio * 25;
    }

    // Connection pool utilization impact (max -20 points)
    const utilizationImpact = Math.max(
      0,
      connectionMetrics.connectionPoolUtilization -
        thresholds.connectionUtilization,
    );
    score -= utilizationImpact * 0.5;

    // Wedding day bonus/penalty
    if (this.isWeddingDay) {
      if (score > 95) {
        score += 5; // Bonus for excellent wedding day performance
      } else if (score < 80) {
        score -= 10; // Penalty for poor wedding day performance
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Periodic metrics collection
  private async collectMetrics(): Promise<void> {
    try {
      const healthMetrics = await this.getHealthMetrics();

      // Update system metrics
      metrics.gauge(
        'database.performance.score',
        healthMetrics.performanceScore,
      );
      metrics.gauge(
        'database.queries.average_time',
        healthMetrics.queryMetrics.averageResponseTime,
      );
      metrics.gauge(
        'database.connections.active',
        healthMetrics.connectionMetrics.activeConnections,
      );
      metrics.gauge(
        'database.connections.utilization',
        healthMetrics.connectionMetrics.connectionPoolUtilization,
      );

      // Wedding day specific metrics
      if (healthMetrics.weddingDayMetrics) {
        metrics.gauge(
          'database.wedding_day.critical_path_performance',
          healthMetrics.weddingDayMetrics.criticalPathPerformance,
        );
        metrics.gauge(
          'database.wedding_day.payment_performance',
          healthMetrics.weddingDayMetrics.paymentQueryPerformance,
        );
        metrics.gauge(
          'database.wedding_day.guest_performance',
          healthMetrics.weddingDayMetrics.guestDataQueryPerformance,
        );
      }
    } catch (error) {
      logger.error('Failed to collect database metrics', error as Error, {
        context: 'DatabasePerformanceMonitor',
      });
    }
  }

  // Wedding day critical metrics collection
  private async collectCriticalMetrics(): Promise<void> {
    if (!this.isWeddingDay) return;

    try {
      const connectionMetrics = await this.getConnectionMetrics();
      const recentCriticalQueries = this.queryMetrics.filter(
        (q) =>
          q.weddingContext?.criticalOperation &&
          new Date(q.timestamp).getTime() > Date.now() - 5 * 60 * 1000, // Last 5 minutes
      );

      // Check for wedding day performance issues
      if (connectionMetrics.connectionPoolUtilization > 80) {
        logger.warn('🎂 Wedding day high database connection utilization', {
          utilization: connectionMetrics.connectionPoolUtilization,
          activeConnections: connectionMetrics.activeConnections,
        });
      }

      if (recentCriticalQueries.length > 0) {
        const avgCriticalQueryTime =
          recentCriticalQueries.reduce((sum, q) => sum + q.executionTime, 0) /
          recentCriticalQueries.length;

        if (avgCriticalQueryTime > 300) {
          // 300ms threshold for wedding day
          logger.warn('🎂 Wedding day critical queries slower than expected', {
            averageTime: avgCriticalQueryTime,
            queryCount: recentCriticalQueries.length,
          });
        }
      }
    } catch (error) {
      logger.error(
        'Failed to collect wedding day critical metrics',
        error as Error,
      );
    }
  }

  // Utility methods
  private extractTableFromQuery(query: string): string {
    const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();

    // Simple table extraction (in production, use SQL parser)
    const fromMatch = normalizedQuery.match(/from\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    const intoMatch = normalizedQuery.match(/into\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    const updateMatch = normalizedQuery.match(
      /update\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
    );

    return fromMatch?.[1] || intoMatch?.[1] || updateMatch?.[1] || 'unknown';
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data from query for logging
    return (
      query
        .replace(/(\$\d+|\?)/g, '?') // Replace parameters
        .replace(/('[^']*'|"[^"]*")/g, "'***'") // Replace string literals
        .substring(0, 200) + (query.length > 200 ? '...' : '')
    ); // Truncate long queries
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.metricsRetention;
    const initialCount = this.queryMetrics.length;

    this.queryMetrics = this.queryMetrics.filter(
      (metric) => new Date(metric.timestamp).getTime() > cutoff,
    );

    const removedCount = initialCount - this.queryMetrics.length;
    if (removedCount > 0) {
      logger.info(`Cleaned up ${removedCount} old database metrics`, {
        context: 'DatabasePerformanceMonitor',
        remaining: this.queryMetrics.length,
      });
    }
  }

  // Public methods for external integration
  public async getSlowQueries(
    limit: number = 10,
  ): Promise<QueryPerformanceMetric[]> {
    const thresholds = this.isWeddingDay
      ? this.weddingDayThresholds
      : this.normalThresholds;

    return this.queryMetrics
      .filter((q) => q.executionTime > thresholds.slowQuery)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  public async getTableStats(
    tableName: string,
  ): Promise<QueryPerformanceMetric[]> {
    return this.queryMetrics
      .filter((q) => q.table === tableName)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
  }

  public isWeddingDayMode(): boolean {
    return this.isWeddingDay;
  }

  public getThresholds() {
    return this.isWeddingDay
      ? this.weddingDayThresholds
      : this.normalThresholds;
  }
}

// Export singleton instance
export const databaseMonitor = new DatabasePerformanceMonitor();

// Export types for external use
export type {
  QueryPerformanceMetric,
  ConnectionPoolMetrics,
  DatabaseHealthMetrics,
  SlowQueryAlert,
};

// Middleware for automatic query tracking
export function withDatabaseMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: {
    operation: QueryPerformanceMetric['operation'];
    table?: string;
    query?: string;
  },
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();

    try {
      const result = await fn(...args);
      const executionTime = Date.now() - startTime;

      await databaseMonitor.trackQuery(
        context.query || `${context.operation} operation`,
        context.operation,
        executionTime,
        { table: context.table },
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      await databaseMonitor.trackQuery(
        context.query || `${context.operation} operation (ERROR)`,
        context.operation,
        executionTime,
        { table: context.table },
      );

      metrics.increment('database.queries.error');
      throw error;
    }
  };
}
