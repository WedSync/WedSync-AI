/**
 * Database Performance Monitoring
 * Tracks query execution times, connection pool health, and identifies slow queries
 * FEATURE: WS-104 - Performance Monitoring Backend Infrastructure
 */

import { metrics } from './metrics';
import { logger } from './structured-logger';
import { alertManager } from './alerts';

export interface QueryMetrics {
  queryName: string;
  queryType: 'select' | 'insert' | 'update' | 'delete' | 'other';
  executionTime: number;
  rowsAffected?: number;
  tableName?: string;
  isSlowQuery: boolean;
  parameters?: Record<string, any>;
  errorMessage?: string;
  connectionId?: string;
  transactionId?: string;
}

export interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  connectionAcquisitionTime: number;
  connectionErrors: number;
}

export interface DatabaseHealthMetrics {
  connectionPool: ConnectionPoolMetrics;
  queryStats: {
    totalQueries: number;
    slowQueries: number;
    erroredQueries: number;
    averageQueryTime: number;
    p95QueryTime: number;
    p99QueryTime: number;
  };
  tableStats: Record<
    string,
    {
      selectCount: number;
      insertCount: number;
      updateCount: number;
      deleteCount: number;
      averageTime: number;
    }
  >;
}

class DatabasePerformanceMonitor {
  private queryBuffer: QueryMetrics[] = [];
  private connectionPoolStats: ConnectionPoolMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingConnections: 0,
    connectionAcquisitionTime: 0,
    connectionErrors: 0,
  };
  private slowQueryThreshold = 1000; // 1 second
  private verySlowQueryThreshold = 5000; // 5 seconds
  private maxBufferSize = 10000;
  private flushInterval = 30000; // 30 seconds

  constructor() {
    this.startPeriodicFlush();
    this.startHealthChecks();
  }

  // Track individual query performance
  async trackQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    options?: {
      queryType?: QueryMetrics['queryType'];
      tableName?: string;
      parameters?: Record<string, any>;
      connectionId?: string;
      transactionId?: string;
    },
  ): Promise<T> {
    const startTime = Date.now();
    const queryId = this.generateQueryId();

    logger.debug('Database query started', {
      queryId,
      queryName,
      queryType: options?.queryType,
      tableName: options?.tableName,
      connectionId: options?.connectionId,
      transactionId: options?.transactionId,
    });

    let result: T;
    let rowsAffected: number | undefined;
    let errorMessage: string | undefined;

    try {
      result = await queryFn();

      // Try to extract rows affected if result has this information
      if (result && typeof result === 'object') {
        const resultObj = result as any;
        if ('rowCount' in resultObj) {
          rowsAffected = resultObj.rowCount;
        } else if ('affectedRows' in resultObj) {
          rowsAffected = resultObj.affectedRows;
        } else if (Array.isArray(result)) {
          rowsAffected = result.length;
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Database query failed', error as Error, {
        queryId,
        queryName,
        queryType: options?.queryType,
        tableName: options?.tableName,
      });
      throw error;
    } finally {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Record query metrics
      this.recordQueryMetrics({
        queryName,
        queryType: options?.queryType || 'other',
        executionTime,
        rowsAffected,
        tableName: options?.tableName,
        isSlowQuery: executionTime > this.slowQueryThreshold,
        parameters: options?.parameters,
        errorMessage,
        connectionId: options?.connectionId,
        transactionId: options?.transactionId,
      });
    }

    return result;
  }

  // Record query metrics
  private recordQueryMetrics(queryMetrics: QueryMetrics): void {
    // Add to buffer for batch processing
    this.queryBuffer.push(queryMetrics);

    // Trim buffer if too large
    if (this.queryBuffer.length > this.maxBufferSize) {
      this.queryBuffer = this.queryBuffer.slice(-this.maxBufferSize);
      logger.warn('Query metrics buffer overflow, trimming oldest entries');
    }

    // Record immediate metrics
    const labels = {
      query_name: queryMetrics.queryName,
      query_type: queryMetrics.queryType,
      table_name: queryMetrics.tableName || 'unknown',
      is_slow: queryMetrics.isSlowQuery.toString(),
      has_error: (!!queryMetrics.errorMessage).toString(),
    };

    // Query execution time histogram
    metrics.recordHistogram(
      'db.query.execution_time',
      queryMetrics.executionTime,
      labels,
    );

    // Query counter
    metrics.incrementCounter('db.queries.total', 1, labels);

    // Rows affected metric
    if (queryMetrics.rowsAffected !== undefined) {
      metrics.recordHistogram(
        'db.query.rows_affected',
        queryMetrics.rowsAffected,
        labels,
      );
    }

    // Error tracking
    if (queryMetrics.errorMessage) {
      metrics.incrementCounter('db.queries.errors', 1, labels);
    }

    // Slow query tracking
    if (queryMetrics.isSlowQuery) {
      metrics.incrementCounter('db.queries.slow', 1, labels);

      logger.warn('Slow database query detected', {
        queryName: queryMetrics.queryName,
        executionTime: queryMetrics.executionTime,
        threshold: this.slowQueryThreshold,
        tableName: queryMetrics.tableName,
        queryType: queryMetrics.queryType,
      });

      // Alert on very slow queries
      if (queryMetrics.executionTime > this.verySlowQueryThreshold) {
        this.triggerSlowQueryAlert(queryMetrics);
      }
    }

    // Wedding business impact assessment
    this.assessWeddingImpact(queryMetrics);
  }

  // Update connection pool metrics
  updateConnectionPoolMetrics(poolStats: Partial<ConnectionPoolMetrics>): void {
    this.connectionPoolStats = { ...this.connectionPoolStats, ...poolStats };

    // Record connection pool metrics
    metrics.setGauge(
      'db.connection_pool.total',
      this.connectionPoolStats.totalConnections,
    );
    metrics.setGauge(
      'db.connection_pool.active',
      this.connectionPoolStats.activeConnections,
    );
    metrics.setGauge(
      'db.connection_pool.idle',
      this.connectionPoolStats.idleConnections,
    );
    metrics.setGauge(
      'db.connection_pool.waiting',
      this.connectionPoolStats.waitingConnections,
    );
    metrics.recordHistogram(
      'db.connection_pool.acquisition_time',
      this.connectionPoolStats.connectionAcquisitionTime,
    );

    // Alert on connection pool issues
    this.checkConnectionPoolHealth();
  }

  // Get current database health metrics
  getDatabaseHealth(): DatabaseHealthMetrics {
    const recentQueries = this.queryBuffer.filter(
      (q) => Date.now() - q.executionTime < 300000, // Last 5 minutes
    );

    const queryTimes = recentQueries.map((q) => q.executionTime);
    const sortedTimes = queryTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    const tableStats: Record<string, any> = {};
    recentQueries.forEach((query) => {
      if (!query.tableName) return;

      if (!tableStats[query.tableName]) {
        tableStats[query.tableName] = {
          selectCount: 0,
          insertCount: 0,
          updateCount: 0,
          deleteCount: 0,
          totalTime: 0,
          queryCount: 0,
        };
      }

      const stats = tableStats[query.tableName];
      stats[`${query.queryType}Count`]++;
      stats.totalTime += query.executionTime;
      stats.queryCount++;
    });

    // Calculate averages
    Object.values(tableStats).forEach((stats: any) => {
      stats.averageTime =
        stats.queryCount > 0 ? stats.totalTime / stats.queryCount : 0;
      delete stats.totalTime;
      delete stats.queryCount;
    });

    return {
      connectionPool: this.connectionPoolStats,
      queryStats: {
        totalQueries: recentQueries.length,
        slowQueries: recentQueries.filter((q) => q.isSlowQuery).length,
        erroredQueries: recentQueries.filter((q) => q.errorMessage).length,
        averageQueryTime:
          queryTimes.length > 0
            ? queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length
            : 0,
        p95QueryTime: sortedTimes[p95Index] || 0,
        p99QueryTime: sortedTimes[p99Index] || 0,
      },
      tableStats,
    };
  }

  // Get slow query analysis
  getSlowQueryAnalysis(limit: number = 10): Array<{
    queryName: string;
    tableName?: string;
    averageTime: number;
    maxTime: number;
    count: number;
    errorRate: number;
  }> {
    const queryGroups = new Map<string, QueryMetrics[]>();

    // Group queries by name and table
    this.queryBuffer.forEach((query) => {
      const key = `${query.queryName}:${query.tableName || 'unknown'}`;
      if (!queryGroups.has(key)) {
        queryGroups.set(key, []);
      }
      queryGroups.get(key)!.push(query);
    });

    // Calculate statistics for each group
    const analysis = Array.from(queryGroups.entries()).map(([key, queries]) => {
      const [queryName, tableName] = key.split(':');
      const times = queries.map((q) => q.executionTime);
      const errors = queries.filter((q) => q.errorMessage);

      return {
        queryName,
        tableName: tableName !== 'unknown' ? tableName : undefined,
        averageTime: times.reduce((a, b) => a + b, 0) / times.length,
        maxTime: Math.max(...times),
        count: queries.length,
        errorRate: (errors.length / queries.length) * 100,
      };
    });

    // Sort by average time and return top N
    return analysis
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit);
  }

  // Connection pool monitoring utilities
  async monitorConnectionAcquisition<T>(fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const acquisitionTime = Date.now() - startTime;

      this.updateConnectionPoolMetrics({
        connectionAcquisitionTime: acquisitionTime,
      });

      if (acquisitionTime > 5000) {
        // 5 seconds
        logger.warn('Slow connection acquisition detected', {
          acquisitionTime,
          threshold: 5000,
        });
      }

      return result;
    } catch (error) {
      this.updateConnectionPoolMetrics({
        connectionErrors: this.connectionPoolStats.connectionErrors + 1,
      });
      throw error;
    }
  }

  // Private helper methods
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
  }

  private startHealthChecks(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, 60000); // Every minute
  }

  private flushMetrics(): void {
    if (this.queryBuffer.length === 0) return;

    logger.info('Flushing database metrics', {
      bufferSize: this.queryBuffer.length,
      slowQueries: this.queryBuffer.filter((q) => q.isSlowQuery).length,
      errors: this.queryBuffer.filter((q) => q.errorMessage).length,
    });

    // Here you would typically send metrics to your monitoring system
    // For now, we'll just log the summary

    // Clear old entries (keep last 1000 for analysis)
    if (this.queryBuffer.length > 1000) {
      this.queryBuffer = this.queryBuffer.slice(-1000);
    }
  }

  private performHealthChecks(): void {
    const health = this.getDatabaseHealth();

    // Log health summary
    logger.info('Database health check', {
      totalQueries: health.queryStats.totalQueries,
      slowQueries: health.queryStats.slowQueries,
      averageQueryTime: Math.round(health.queryStats.averageQueryTime),
      p95QueryTime: Math.round(health.queryStats.p95QueryTime),
      connectionPool: health.connectionPool,
    });

    // Record health metrics
    metrics.setGauge('db.health.total_queries', health.queryStats.totalQueries);
    metrics.setGauge('db.health.slow_queries', health.queryStats.slowQueries);
    metrics.setGauge(
      'db.health.average_query_time',
      health.queryStats.averageQueryTime,
    );
    metrics.setGauge(
      'db.health.p95_query_time',
      health.queryStats.p95QueryTime,
    );
    metrics.setGauge(
      'db.health.p99_query_time',
      health.queryStats.p99QueryTime,
    );
  }

  private checkConnectionPoolHealth(): void {
    const pool = this.connectionPoolStats;

    // Check for connection pool exhaustion
    const utilisationRate =
      pool.totalConnections > 0
        ? pool.activeConnections / pool.totalConnections
        : 0;

    if (utilisationRate > 0.9) {
      logger.warn('High database connection pool utilization', {
        activeConnections: pool.activeConnections,
        totalConnections: pool.totalConnections,
        utilisationRate: Math.round(utilisationRate * 100),
      });

      metrics.incrementCounter('db.connection_pool.high_utilization_alerts', 1);
    }

    // Check for waiting connections
    if (pool.waitingConnections > 0) {
      logger.warn('Database connections waiting in queue', {
        waitingConnections: pool.waitingConnections,
        activeConnections: pool.activeConnections,
        totalConnections: pool.totalConnections,
      });

      metrics.incrementCounter(
        'db.connection_pool.waiting_connections_alerts',
        1,
      );
    }
  }

  private triggerSlowQueryAlert(queryMetrics: QueryMetrics): void {
    const alertData = {
      type: 'database_performance',
      severity: 'high',
      message: `Very slow database query detected: ${queryMetrics.queryName}`,
      details: {
        queryName: queryMetrics.queryName,
        tableName: queryMetrics.tableName,
        executionTime: queryMetrics.executionTime,
        threshold: this.verySlowQueryThreshold,
        queryType: queryMetrics.queryType,
        rowsAffected: queryMetrics.rowsAffected,
      },
      timestamp: Date.now(),
    };

    logger.error(
      'Very slow database query alert',
      new Error('Query execution time exceeded threshold'),
      alertData,
    );

    metrics.incrementCounter('db.alerts.very_slow_query', 1, {
      query_name: queryMetrics.queryName,
      table_name: queryMetrics.tableName || 'unknown',
    });

    // Trigger external alert if configured
    alertManager.triggerAlert(alertData);
  }

  private assessWeddingImpact(queryMetrics: QueryMetrics): void {
    // Assess business impact based on query patterns
    const weddingCriticalTables = [
      'clients',
      'vendors',
      'weddings',
      'rsvp_responses',
      'wedding_websites',
      'photos',
      'documents',
    ];

    const isWeddingCritical =
      queryMetrics.tableName &&
      weddingCriticalTables.some((table) =>
        queryMetrics.tableName!.includes(table),
      );

    if (isWeddingCritical && queryMetrics.isSlowQuery) {
      logger.warn('Slow query affecting wedding operations', {
        queryName: queryMetrics.queryName,
        tableName: queryMetrics.tableName,
        executionTime: queryMetrics.executionTime,
        businessImpact: 'wedding_critical',
      });

      metrics.incrementCounter('db.wedding_impact.slow_queries', 1, {
        table_name: queryMetrics.tableName!,
        query_type: queryMetrics.queryType,
      });
    }
  }
}

// Export singleton instance
export const dbPerformanceMonitor = new DatabasePerformanceMonitor();

// Utility functions for easy integration
export const trackDatabaseQuery =
  dbPerformanceMonitor.trackQuery.bind(dbPerformanceMonitor);

export const updateConnectionPoolStats =
  dbPerformanceMonitor.updateConnectionPoolMetrics.bind(dbPerformanceMonitor);

export const getDatabaseHealthMetrics =
  dbPerformanceMonitor.getDatabaseHealth.bind(dbPerformanceMonitor);

export const getSlowQueryAnalysis =
  dbPerformanceMonitor.getSlowQueryAnalysis.bind(dbPerformanceMonitor);

// Higher-order function for database operations
export function withDatabaseMonitoring<T extends any[], R>(
  queryName: string,
  queryFn: (...args: T) => Promise<R>,
  options?: {
    queryType?: QueryMetrics['queryType'];
    tableName?: string;
  },
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return dbPerformanceMonitor.trackQuery(
      queryName,
      () => queryFn(...args),
      options,
    );
  };
}
