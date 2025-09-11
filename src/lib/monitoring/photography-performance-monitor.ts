/**
 * WS-130 Round 3: Photography AI Performance Monitoring
 * Comprehensive performance tracking, metrics collection, and alerting system
 */

import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

interface PerformanceMetrics {
  request_id: string;
  user_id: string;
  client_id?: string;
  operation: string;
  start_time: number;
  end_time: number;
  duration_ms: number;
  status: 'success' | 'error' | 'timeout';
  error_code?: string;
  memory_usage?: NodeJS.MemoryUsage;
  team_integrations: string[];
  integration_timings: Record<string, number>;
  cache_hit_rate: number;
  rate_limit_status: 'allowed' | 'limited' | 'queued';
  api_calls_made: number;
  data_processed_bytes: number;
  user_plan: string;
}

interface AlertThresholds {
  response_time_ms: {
    warning: number;
    critical: number;
  };
  error_rate_percent: {
    warning: number;
    critical: number;
  };
  memory_usage_mb: {
    warning: number;
    critical: number;
  };
  cache_hit_rate_percent: {
    warning: number;
    critical: number;
  };
  queue_length: {
    warning: number;
    critical: number;
  };
  integration_timeout_ms: {
    warning: number;
    critical: number;
  };
}

interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'warning' | 'critical';
  metric: string;
  current_value: number;
  threshold_value: number;
  message: string;
  context: Record<string, any>;
  resolved: boolean;
  resolved_at?: number;
}

export class PhotographyPerformanceMonitor {
  private redis: Redis;
  private supabase: any;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private metricsBuffer: PerformanceMetrics[] = [];
  private alertBuffer: PerformanceAlert[] = [];

  private readonly THRESHOLDS: AlertThresholds = {
    response_time_ms: {
      warning: 3000, // 3 seconds
      critical: 8000, // 8 seconds
    },
    error_rate_percent: {
      warning: 5, // 5%
      critical: 15, // 15%
    },
    memory_usage_mb: {
      warning: 400, // 400MB
      critical: 700, // 700MB
    },
    cache_hit_rate_percent: {
      warning: 70, // 70%
      critical: 50, // 50%
    },
    queue_length: {
      warning: 50, // 50 requests
      critical: 150, // 150 requests
    },
    integration_timeout_ms: {
      warning: 10000, // 10 seconds
      critical: 20000, // 20 seconds
    },
  };

  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.startPeriodicFlush();
    this.startPeriodicAnalysis();
  }

  /**
   * Start monitoring a request
   */
  startRequest(
    requestId: string,
    operation: string,
    userId: string,
    clientId?: string,
  ): void {
    const startTime = Date.now();
    const initialMetrics: Partial<PerformanceMetrics> = {
      request_id: requestId,
      user_id: userId,
      client_id: clientId,
      operation,
      start_time: startTime,
      status: 'success',
      team_integrations: [],
      integration_timings: {},
      cache_hit_rate: 0,
      rate_limit_status: 'allowed',
      api_calls_made: 0,
      data_processed_bytes: 0,
      user_plan: 'unknown',
    };

    this.metrics.set(requestId, initialMetrics as PerformanceMetrics);
  }

  /**
   * Track team integration timing
   */
  trackIntegration(requestId: string, team: string, duration: number): void {
    const metrics = this.metrics.get(requestId);
    if (metrics) {
      metrics.team_integrations.push(team);
      metrics.integration_timings[team] = duration;

      // Check for integration timeout alerts
      if (duration > this.THRESHOLDS.integration_timeout_ms.critical) {
        this.createAlert('critical', 'integration_timeout', duration, {
          request_id: requestId,
          team,
          duration,
        });
      } else if (duration > this.THRESHOLDS.integration_timeout_ms.warning) {
        this.createAlert('warning', 'integration_timeout', duration, {
          request_id: requestId,
          team,
          duration,
        });
      }
    }
  }

  /**
   * Update cache hit rate
   */
  updateCacheStats(requestId: string, hitRate: number): void {
    const metrics = this.metrics.get(requestId);
    if (metrics) {
      metrics.cache_hit_rate = hitRate;

      // Check cache performance
      const hitRatePercent = hitRate * 100;
      if (hitRatePercent < this.THRESHOLDS.cache_hit_rate_percent.critical) {
        this.createAlert('critical', 'low_cache_hit_rate', hitRatePercent, {
          request_id: requestId,
          cache_hit_rate: hitRatePercent,
        });
      } else if (
        hitRatePercent < this.THRESHOLDS.cache_hit_rate_percent.warning
      ) {
        this.createAlert('warning', 'low_cache_hit_rate', hitRatePercent, {
          request_id: requestId,
          cache_hit_rate: hitRatePercent,
        });
      }
    }
  }

  /**
   * Update rate limiting status
   */
  updateRateLimit(
    requestId: string,
    status: 'allowed' | 'limited' | 'queued',
    userPlan: string,
  ): void {
    const metrics = this.metrics.get(requestId);
    if (metrics) {
      metrics.rate_limit_status = status;
      metrics.user_plan = userPlan;
    }
  }

  /**
   * Track API calls and data processing
   */
  updateApiStats(
    requestId: string,
    apiCalls: number,
    bytesProcessed: number,
  ): void {
    const metrics = this.metrics.get(requestId);
    if (metrics) {
      metrics.api_calls_made += apiCalls;
      metrics.data_processed_bytes += bytesProcessed;
    }
  }

  /**
   * Complete monitoring for a request
   */
  completeRequest(
    requestId: string,
    status: 'success' | 'error' | 'timeout',
    errorCode?: string,
  ): void {
    const metrics = this.metrics.get(requestId);
    if (!metrics) return;

    const endTime = Date.now();
    const duration = endTime - metrics.start_time;

    metrics.end_time = endTime;
    metrics.duration_ms = duration;
    metrics.status = status;
    metrics.error_code = errorCode;
    metrics.memory_usage = process.memoryUsage();

    // Check performance thresholds
    this.checkPerformanceThresholds(metrics);

    // Buffer for batch processing
    this.metricsBuffer.push(metrics);
    this.metrics.delete(requestId);

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      this.flushMetrics();
    }
  }

  /**
   * Get current performance statistics
   */
  async getCurrentStats(): Promise<{
    active_requests: number;
    avg_response_time_ms: number;
    error_rate_percent: number;
    cache_hit_rate_percent: number;
    memory_usage_mb: number;
    active_alerts: number;
    requests_last_hour: number;
    team_integration_health: Record<
      string,
      { success_rate: number; avg_duration: number }
    >;
  }> {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Get recent metrics from Redis
    const recentMetricsJson = await this.redis.lrange(
      'photography-metrics',
      0,
      999,
    );
    const recentMetrics: PerformanceMetrics[] = recentMetricsJson.map((json) =>
      JSON.parse(json),
    );

    // Filter to last hour
    const hourlyMetrics = recentMetrics.filter(
      (m) => m.start_time > oneHourAgo,
    );

    const activeRequests = this.metrics.size;
    const totalRequests = hourlyMetrics.length;
    const successfulRequests = hourlyMetrics.filter(
      (m) => m.status === 'success',
    ).length;

    const avgResponseTime =
      totalRequests > 0
        ? hourlyMetrics.reduce((sum, m) => sum + m.duration_ms, 0) /
          totalRequests
        : 0;

    const errorRate =
      totalRequests > 0
        ? ((totalRequests - successfulRequests) / totalRequests) * 100
        : 0;

    const cacheHits = hourlyMetrics.reduce(
      (sum, m) => sum + m.cache_hit_rate,
      0,
    );
    const avgCacheHitRate =
      totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;

    // Team integration health
    const teamHealth: Record<
      string,
      { success_rate: number; avg_duration: number }
    > = {};
    const teams = ['music_ai', 'floral_ai', 'pricing', 'trials'];

    for (const team of teams) {
      const teamMetrics = hourlyMetrics.filter((m) =>
        m.team_integrations.includes(team),
      );
      if (teamMetrics.length > 0) {
        const teamSuccessful = teamMetrics.filter(
          (m) => m.status === 'success',
        ).length;
        const avgDuration =
          teamMetrics.reduce(
            (sum, m) => sum + (m.integration_timings[team] || 0),
            0,
          ) / teamMetrics.length;

        teamHealth[team] = {
          success_rate: (teamSuccessful / teamMetrics.length) * 100,
          avg_duration: avgDuration,
        };
      }
    }

    return {
      active_requests: activeRequests,
      avg_response_time_ms: Math.round(avgResponseTime),
      error_rate_percent: Math.round(errorRate * 100) / 100,
      cache_hit_rate_percent: Math.round(avgCacheHitRate * 100) / 100,
      memory_usage_mb: Math.round(memoryUsageMB * 100) / 100,
      active_alerts: this.activeAlerts.size,
      requests_last_hour: totalRequests,
      team_integration_health: teamHealth,
    };
  }

  /**
   * Get performance history for dashboards
   */
  async getPerformanceHistory(hoursBack: number = 24): Promise<{
    timestamps: number[];
    response_times: number[];
    error_rates: number[];
    cache_hit_rates: number[];
    memory_usage: number[];
  }> {
    const now = Date.now();
    const startTime = now - hoursBack * 60 * 60 * 1000;

    const { data: historicalData } = await this.supabase
      .from('photography_performance_metrics')
      .select('*')
      .gte('timestamp', new Date(startTime).toISOString())
      .order('timestamp', { ascending: true });

    if (!historicalData || historicalData.length === 0) {
      return {
        timestamps: [],
        response_times: [],
        error_rates: [],
        cache_hit_rates: [],
        memory_usage: [],
      };
    }

    return {
      timestamps: historicalData.map((d: any) =>
        new Date(d.timestamp).getTime(),
      ),
      response_times: historicalData.map(
        (d: any) => d.avg_response_time_ms || 0,
      ),
      error_rates: historicalData.map((d: any) => d.error_rate_percent || 0),
      cache_hit_rates: historicalData.map(
        (d: any) => d.cache_hit_rate_percent || 0,
      ),
      memory_usage: historicalData.map((d: any) => d.memory_usage_mb || 0),
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values()).filter(
      (alert) => !alert.resolved,
    );
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolution: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolved_at = Date.now();

      // Update in database
      await this.supabase
        .from('photography_performance_alerts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolution,
        })
        .eq('id', alertId);

      // Remove from active alerts after a delay
      setTimeout(() => {
        this.activeAlerts.delete(alertId);
      }, 300000); // 5 minutes
    }
  }

  /**
   * Check performance thresholds and create alerts
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    // Response time check
    if (metrics.duration_ms > this.THRESHOLDS.response_time_ms.critical) {
      this.createAlert('critical', 'high_response_time', metrics.duration_ms, {
        request_id: metrics.request_id,
        operation: metrics.operation,
      });
    } else if (metrics.duration_ms > this.THRESHOLDS.response_time_ms.warning) {
      this.createAlert('warning', 'high_response_time', metrics.duration_ms, {
        request_id: metrics.request_id,
        operation: metrics.operation,
      });
    }

    // Memory usage check
    if (metrics.memory_usage) {
      const memoryMB = metrics.memory_usage.heapUsed / 1024 / 1024;
      if (memoryMB > this.THRESHOLDS.memory_usage_mb.critical) {
        this.createAlert('critical', 'high_memory_usage', memoryMB, {
          request_id: metrics.request_id,
          heap_used: memoryMB,
        });
      } else if (memoryMB > this.THRESHOLDS.memory_usage_mb.warning) {
        this.createAlert('warning', 'high_memory_usage', memoryMB, {
          request_id: metrics.request_id,
          heap_used: memoryMB,
        });
      }
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(
    severity: 'warning' | 'critical',
    metric: string,
    currentValue: number,
    context: Record<string, any>,
  ): void {
    const alertId = `${metric}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const thresholdValue =
      severity === 'critical'
        ? (this.THRESHOLDS as any)[metric]?.critical || currentValue
        : (this.THRESHOLDS as any)[metric]?.warning || currentValue;

    const alert: PerformanceAlert = {
      id: alertId,
      timestamp: Date.now(),
      severity,
      metric,
      current_value: currentValue,
      threshold_value: thresholdValue,
      message: this.generateAlertMessage(
        metric,
        currentValue,
        thresholdValue,
        severity,
      ),
      context,
      resolved: false,
    };

    this.activeAlerts.set(alertId, alert);
    this.alertBuffer.push(alert);

    // Log critical alerts immediately
    if (severity === 'critical') {
      console.error(`CRITICAL ALERT: ${alert.message}`, {
        alert_id: alertId,
        context,
      });
    }
  }

  /**
   * Generate human-readable alert messages
   */
  private generateAlertMessage(
    metric: string,
    currentValue: number,
    thresholdValue: number,
    severity: 'warning' | 'critical',
  ): string {
    const severityText = severity.toUpperCase();

    switch (metric) {
      case 'high_response_time':
        return `${severityText}: Photography AI response time is ${Math.round(currentValue)}ms (threshold: ${thresholdValue}ms)`;

      case 'high_memory_usage':
        return `${severityText}: Memory usage is ${Math.round(currentValue)}MB (threshold: ${thresholdValue}MB)`;

      case 'low_cache_hit_rate':
        return `${severityText}: Cache hit rate is ${Math.round(currentValue)}% (threshold: ${thresholdValue}%)`;

      case 'integration_timeout':
        return `${severityText}: Team integration timeout ${Math.round(currentValue)}ms (threshold: ${thresholdValue}ms)`;

      default:
        return `${severityText}: ${metric} value ${currentValue} exceeds threshold ${thresholdValue}`;
    }
  }

  /**
   * Flush metrics to persistent storage
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0 && this.alertBuffer.length === 0)
      return;

    try {
      // Store metrics in Redis for quick access
      if (this.metricsBuffer.length > 0) {
        const metricsJson = this.metricsBuffer.map((m) => JSON.stringify(m));
        await this.redis.lpush('photography-metrics', ...metricsJson);
        await this.redis.ltrim('photography-metrics', 0, 9999); // Keep last 10k metrics

        // Store aggregated data in Supabase for historical analysis
        await this.storeAggregatedMetrics(this.metricsBuffer);
      }

      // Store alerts in Supabase
      if (this.alertBuffer.length > 0) {
        const alertsData = this.alertBuffer.map((alert) => ({
          id: alert.id,
          timestamp: new Date(alert.timestamp).toISOString(),
          severity: alert.severity,
          metric: alert.metric,
          current_value: alert.current_value,
          threshold_value: alert.threshold_value,
          message: alert.message,
          context: alert.context,
          resolved: alert.resolved,
          resolved_at: alert.resolved_at
            ? new Date(alert.resolved_at).toISOString()
            : null,
        }));

        await this.supabase
          .from('photography_performance_alerts')
          .upsert(alertsData);
      }

      // Clear buffers
      this.metricsBuffer = [];
      this.alertBuffer = [];
    } catch (error) {
      console.error('Failed to flush performance metrics:', error);
    }
  }

  /**
   * Store aggregated metrics for historical analysis
   */
  private async storeAggregatedMetrics(
    metrics: PerformanceMetrics[],
  ): Promise<void> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Aggregate metrics for 5-minute intervals
    const successfulMetrics = metrics.filter((m) => m.status === 'success');
    const totalRequests = metrics.length;
    const successfulRequests = successfulMetrics.length;

    if (totalRequests === 0) return;

    const avgResponseTime =
      successfulMetrics.reduce((sum, m) => sum + m.duration_ms, 0) /
        successfulRequests || 0;
    const errorRate =
      ((totalRequests - successfulRequests) / totalRequests) * 100;
    const avgCacheHitRate =
      (metrics.reduce((sum, m) => sum + m.cache_hit_rate, 0) / totalRequests) *
      100;
    const avgMemoryUsage =
      metrics.reduce((sum, m) => sum + (m.memory_usage?.heapUsed || 0), 0) /
      totalRequests /
      1024 /
      1024;
    const totalApiCalls = metrics.reduce((sum, m) => sum + m.api_calls_made, 0);
    const totalDataProcessed = metrics.reduce(
      (sum, m) => sum + m.data_processed_bytes,
      0,
    );

    // Team integration stats
    const teamStats: Record<string, { count: number; avg_duration: number }> =
      {};
    metrics.forEach((m) => {
      m.team_integrations.forEach((team) => {
        if (!teamStats[team]) {
          teamStats[team] = { count: 0, avg_duration: 0 };
        }
        teamStats[team].count++;
        teamStats[team].avg_duration += m.integration_timings[team] || 0;
      });
    });

    Object.keys(teamStats).forEach((team) => {
      teamStats[team].avg_duration /= teamStats[team].count;
    });

    const aggregatedData = {
      timestamp: fiveMinutesAgo.toISOString(),
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      avg_response_time_ms: Math.round(avgResponseTime),
      error_rate_percent: Math.round(errorRate * 100) / 100,
      cache_hit_rate_percent: Math.round(avgCacheHitRate * 100) / 100,
      memory_usage_mb: Math.round(avgMemoryUsage * 100) / 100,
      total_api_calls: totalApiCalls,
      total_data_processed_bytes: totalDataProcessed,
      team_integration_stats: teamStats,
    };

    await this.supabase
      .from('photography_performance_metrics')
      .upsert(aggregatedData);
  }

  /**
   * Start periodic analysis for proactive alerting
   */
  private startPeriodicAnalysis(): void {
    setInterval(async () => {
      try {
        await this.analyzeSystemHealth();
      } catch (error) {
        console.error('System health analysis failed:', error);
      }
    }, 60000); // Every minute
  }

  /**
   * Analyze system health and create proactive alerts
   */
  private async analyzeSystemHealth(): Promise<void> {
    const stats = await this.getCurrentStats();

    // Check error rate trend
    if (
      stats.error_rate_percent > this.THRESHOLDS.error_rate_percent.critical
    ) {
      this.createAlert(
        'critical',
        'high_error_rate',
        stats.error_rate_percent,
        {
          requests_analyzed: stats.requests_last_hour,
        },
      );
    } else if (
      stats.error_rate_percent > this.THRESHOLDS.error_rate_percent.warning
    ) {
      this.createAlert('warning', 'high_error_rate', stats.error_rate_percent, {
        requests_analyzed: stats.requests_last_hour,
      });
    }

    // Check team integration health
    Object.entries(stats.team_integration_health).forEach(([team, health]) => {
      if (health.success_rate < 85) {
        // 85% success rate threshold
        this.createAlert(
          'warning',
          'team_integration_degraded',
          health.success_rate,
          {
            team,
            success_rate: health.success_rate,
            avg_duration: health.avg_duration,
          },
        );
      }
    });
  }

  /**
   * Start periodic flushing
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Shutdown monitoring
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Final flush
    await this.flushMetrics();
    await this.redis.quit();
  }
}

// Export singleton instance
export const photographyPerformanceMonitor =
  new PhotographyPerformanceMonitor();
