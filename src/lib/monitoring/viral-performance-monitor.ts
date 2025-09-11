import { createClient } from '@supabase/supabase-js';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/monitoring/logger';
import * as Sentry from '@sentry/nextjs';

export interface MetricHealth {
  metric: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  target: number;
  message: string;
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  metrics: MetricHealth[];
  timestamp: Date;
  recommendations?: string[];
}

export class ViralPerformanceMonitor {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private static performanceThresholds = {
    viralCoefficient: { healthy: 1.2, warning: 1.0, critical: 0.8 },
    apiResponseTime: { healthy: 200, warning: 500, critical: 1000 },
    invitationProcessing: { healthy: 150, warning: 300, critical: 500 },
    cacheHitRate: { healthy: 0.9, warning: 0.7, critical: 0.5 },
    errorRate: { healthy: 0.01, warning: 0.05, critical: 0.1 },
    concurrentUsers: { healthy: 10000, warning: 8000, critical: 5000 },
  };

  /**
   * Check overall viral system health
   */
  static async checkViralHealth(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Run all health checks in parallel
      const metrics = await Promise.all([
        this.checkViralCoefficient(),
        this.checkAPIPerformance(),
        this.checkDatabaseHealth(),
        this.checkCacheHealth(),
        this.checkIntegrationStatus(),
        this.checkConcurrentCapacity(),
        this.checkErrorRates(),
      ]);

      const health = this.aggregateHealth(metrics);

      // Alert if critical
      if (health.status === 'critical') {
        await this.alertOpsTeam(health);
        Sentry.captureMessage('Viral system health critical', 'error');
      }

      // Log performance metrics
      await this.logPerformanceMetrics(metrics, Date.now() - startTime);

      return health;
    } catch (error) {
      logger.error('Failed to check viral health', { error });
      Sentry.captureException(error);

      return {
        status: 'critical',
        metrics: [],
        timestamp: new Date(),
        recommendations: [
          'System health check failed - investigate immediately',
        ],
      };
    }
  }

  /**
   * Check viral coefficient health
   */
  private static async checkViralCoefficient(): Promise<MetricHealth> {
    try {
      const coefficient = await this.getCurrentViralCoefficient();
      const thresholds = this.performanceThresholds.viralCoefficient;

      return {
        metric: 'viral_coefficient',
        value: coefficient,
        status:
          coefficient >= thresholds.healthy
            ? 'healthy'
            : coefficient >= thresholds.warning
              ? 'warning'
              : 'critical',
        target: thresholds.healthy,
        message: `Viral coefficient: ${coefficient.toFixed(2)} (target: ${thresholds.healthy}+)`,
      };
    } catch (error) {
      logger.error('Failed to check viral coefficient', { error });
      return {
        metric: 'viral_coefficient',
        value: 0,
        status: 'critical',
        target: this.performanceThresholds.viralCoefficient.healthy,
        message: 'Failed to retrieve viral coefficient',
      };
    }
  }

  /**
   * Check API performance metrics
   */
  private static async checkAPIPerformance(): Promise<MetricHealth> {
    try {
      const avgResponseTime = await this.getAverageAPIResponseTime('viral');
      const thresholds = this.performanceThresholds.apiResponseTime;

      return {
        metric: 'api_performance',
        value: avgResponseTime,
        status:
          avgResponseTime <= thresholds.healthy
            ? 'healthy'
            : avgResponseTime <= thresholds.warning
              ? 'warning'
              : 'critical',
        target: thresholds.healthy,
        message: `Viral API avg response: ${avgResponseTime}ms (target: <${thresholds.healthy}ms)`,
      };
    } catch (error) {
      logger.error('Failed to check API performance', { error });
      return {
        metric: 'api_performance',
        value: 9999,
        status: 'critical',
        target: this.performanceThresholds.apiResponseTime.healthy,
        message: 'Failed to measure API performance',
      };
    }
  }

  /**
   * Check database health and query performance
   */
  private static async checkDatabaseHealth(): Promise<MetricHealth> {
    try {
      const startTime = Date.now();

      // Test critical query performance
      const { data, error } = await this.supabase
        .from('viral_coefficient_cache')
        .select('viral_coefficient')
        .order('calculation_time', { ascending: false })
        .limit(1)
        .single();

      const queryTime = Date.now() - startTime;

      if (error) throw error;

      return {
        metric: 'database_health',
        value: queryTime,
        status:
          queryTime <= 100
            ? 'healthy'
            : queryTime <= 500
              ? 'warning'
              : 'critical',
        target: 100,
        message: `Database query time: ${queryTime}ms (target: <100ms)`,
      };
    } catch (error) {
      logger.error('Database health check failed', { error });
      return {
        metric: 'database_health',
        value: 9999,
        status: 'critical',
        target: 100,
        message: 'Database health check failed',
      };
    }
  }

  /**
   * Check cache health and hit rates
   */
  private static async checkCacheHealth(): Promise<MetricHealth> {
    try {
      const stats = await redis.info('stats');
      const hitRate = this.parseCacheHitRate(stats);
      const thresholds = this.performanceThresholds.cacheHitRate;

      return {
        metric: 'cache_hit_rate',
        value: hitRate,
        status:
          hitRate >= thresholds.healthy
            ? 'healthy'
            : hitRate >= thresholds.warning
              ? 'warning'
              : 'critical',
        target: thresholds.healthy,
        message: `Cache hit rate: ${(hitRate * 100).toFixed(1)}% (target: >${thresholds.healthy * 100}%)`,
      };
    } catch (error) {
      logger.error('Failed to check cache health', { error });
      return {
        metric: 'cache_hit_rate',
        value: 0,
        status: 'warning',
        target: this.performanceThresholds.cacheHitRate.healthy,
        message: 'Cache health check unavailable',
      };
    }
  }

  /**
   * Check integration status with other teams
   */
  private static async checkIntegrationStatus(): Promise<MetricHealth> {
    try {
      const integrations = await Promise.all([
        this.pingIntegration('/api/marketing/health'), // Team D
        this.pingIntegration('/api/offline/health'), // Team E
        this.pingIntegration('/api/email-templates/health'), // Team C
      ]);

      const healthyCount = integrations.filter((i) => i).length;
      const totalCount = integrations.length;

      return {
        metric: 'integration_health',
        value: healthyCount,
        status:
          healthyCount === totalCount
            ? 'healthy'
            : healthyCount >= totalCount - 1
              ? 'warning'
              : 'critical',
        target: totalCount,
        message: `Integrations healthy: ${healthyCount}/${totalCount}`,
      };
    } catch (error) {
      logger.error('Failed to check integration status', { error });
      return {
        metric: 'integration_health',
        value: 0,
        status: 'warning',
        target: 3,
        message: 'Integration health check failed',
      };
    }
  }

  /**
   * Check concurrent user capacity
   */
  private static async checkConcurrentCapacity(): Promise<MetricHealth> {
    try {
      const activeUsers = await redis.scard('viral:active:users');
      const thresholds = this.performanceThresholds.concurrentUsers;

      // Check if we're approaching capacity
      const capacityUsed = activeUsers / thresholds.healthy;

      return {
        metric: 'concurrent_capacity',
        value: activeUsers,
        status:
          capacityUsed <= 0.7
            ? 'healthy'
            : capacityUsed <= 0.9
              ? 'warning'
              : 'critical',
        target: thresholds.healthy,
        message: `Active users: ${activeUsers}/${thresholds.healthy} (${(capacityUsed * 100).toFixed(1)}% capacity)`,
      };
    } catch (error) {
      logger.error('Failed to check concurrent capacity', { error });
      return {
        metric: 'concurrent_capacity',
        value: 0,
        status: 'warning',
        target: this.performanceThresholds.concurrentUsers.healthy,
        message: 'Concurrent capacity check failed',
      };
    }
  }

  /**
   * Check error rates across the system
   */
  private static async checkErrorRates(): Promise<MetricHealth> {
    try {
      const { data } = await this.supabase
        .from('viral_performance_metrics')
        .select('error_count, sample_count')
        .gte('measured_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
        .order('measured_at', { ascending: false })
        .limit(100);

      if (!data || data.length === 0) {
        return {
          metric: 'error_rate',
          value: 0,
          status: 'healthy',
          target: this.performanceThresholds.errorRate.healthy,
          message: 'No errors in the last hour',
        };
      }

      const totalErrors = data.reduce(
        (sum, d) => sum + (d.error_count || 0),
        0,
      );
      const totalSamples = data.reduce(
        (sum, d) => sum + (d.sample_count || 0),
        0,
      );
      const errorRate = totalSamples > 0 ? totalErrors / totalSamples : 0;
      const thresholds = this.performanceThresholds.errorRate;

      return {
        metric: 'error_rate',
        value: errorRate,
        status:
          errorRate <= thresholds.healthy
            ? 'healthy'
            : errorRate <= thresholds.warning
              ? 'warning'
              : 'critical',
        target: thresholds.healthy,
        message: `Error rate: ${(errorRate * 100).toFixed(2)}% (${totalErrors}/${totalSamples} requests)`,
      };
    } catch (error) {
      logger.error('Failed to check error rates', { error });
      return {
        metric: 'error_rate',
        value: 0,
        status: 'warning',
        target: this.performanceThresholds.errorRate.healthy,
        message: 'Error rate check failed',
      };
    }
  }

  /**
   * Get current viral coefficient from cache
   */
  private static async getCurrentViralCoefficient(): Promise<number> {
    // Try Redis cache first
    const cached = await redis.get('viral:coefficient:current');
    if (cached) {
      return parseFloat(cached);
    }

    // Fall back to database
    const { data, error } = await this.supabase
      .from('viral_coefficient_cache')
      .select('viral_coefficient')
      .order('calculation_time', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error('Failed to get viral coefficient');
    }

    // Update cache
    await redis.setex('viral:coefficient:current', 300, data.viral_coefficient);

    return data.viral_coefficient;
  }

  /**
   * Get average API response time
   */
  private static async getAverageAPIResponseTime(
    category: string,
  ): Promise<number> {
    const { data } = await this.supabase
      .from('viral_performance_metrics')
      .select('value')
      .eq('metric_name', 'api_response_time')
      .like('endpoint', `%${category}%`)
      .gte('measured_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
      .order('measured_at', { ascending: false })
      .limit(50);

    if (!data || data.length === 0) {
      return 0;
    }

    const avg = data.reduce((sum, d) => sum + d.value, 0) / data.length;
    return Math.round(avg);
  }

  /**
   * Parse cache hit rate from Redis info
   */
  private static parseCacheHitRate(info: string): number {
    const lines = info.split('\r\n');
    let hits = 0;
    let misses = 0;

    for (const line of lines) {
      if (line.startsWith('keyspace_hits:')) {
        hits = parseInt(line.split(':')[1]);
      } else if (line.startsWith('keyspace_misses:')) {
        misses = parseInt(line.split(':')[1]);
      }
    }

    const total = hits + misses;
    return total > 0 ? hits / total : 0;
  }

  /**
   * Ping integration endpoint
   */
  private static async pingIntegration(endpoint: string): Promise<boolean> {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Aggregate health metrics
   */
  private static aggregateHealth(metrics: MetricHealth[]): HealthStatus {
    const criticalCount = metrics.filter((m) => m.status === 'critical').length;
    const warningCount = metrics.filter((m) => m.status === 'warning').length;

    let status: 'healthy' | 'warning' | 'critical';
    const recommendations: string[] = [];

    if (criticalCount > 0) {
      status = 'critical';
      recommendations.push(
        'Critical issues detected - immediate action required',
      );

      // Add specific recommendations
      metrics
        .filter((m) => m.status === 'critical')
        .forEach((m) => {
          if (m.metric === 'viral_coefficient') {
            recommendations.push(
              'Viral coefficient below target - review invitation templates and targeting',
            );
          } else if (m.metric === 'api_performance') {
            recommendations.push(
              'API performance degraded - check server load and database queries',
            );
          } else if (m.metric === 'database_health') {
            recommendations.push(
              'Database performance issues - review query optimization and indexes',
            );
          }
        });
    } else if (warningCount > 0) {
      status = 'warning';
      recommendations.push('Performance warnings detected - monitor closely');
    } else {
      status = 'healthy';
      recommendations.push('System operating within normal parameters');
    }

    return {
      status,
      metrics,
      timestamp: new Date(),
      recommendations,
    };
  }

  /**
   * Alert operations team
   */
  private static async alertOpsTeam(health: HealthStatus): Promise<void> {
    const criticalMetrics = health.metrics.filter(
      (m) => m.status === 'critical',
    );

    // Send to Slack or other alerting system
    await fetch('/api/alerts/ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        severity: 'critical',
        service: 'viral_optimization',
        metrics: criticalMetrics,
        recommendations: health.recommendations,
        timestamp: health.timestamp,
      }),
    });

    // Log critical event
    logger.error('Viral system health critical', {
      metrics: criticalMetrics,
      recommendations: health.recommendations,
    });
  }

  /**
   * Log performance metrics to database
   */
  private static async logPerformanceMetrics(
    metrics: MetricHealth[],
    checkDuration: number,
  ): Promise<void> {
    const metricsToLog = metrics.map((m) => ({
      metric_name: m.metric,
      value: m.value,
      unit: m.metric.includes('time')
        ? 'ms'
        : m.metric.includes('rate')
          ? 'percentage'
          : 'count',
      sample_count: 1,
      measured_at: new Date().toISOString(),
    }));

    // Add health check duration
    metricsToLog.push({
      metric_name: 'health_check_duration',
      value: checkDuration,
      unit: 'ms',
      sample_count: 1,
      measured_at: new Date().toISOString(),
    });

    await this.supabase.from('viral_performance_metrics').insert(metricsToLog);
  }
}
