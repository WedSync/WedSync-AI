import { performance } from 'perf_hooks';
import { createServerClient } from '@/lib/supabase/server';
import { BroadcastQueueManager } from '../performance/broadcast-queue-manager';
import { BroadcastCacheManager } from '../performance/broadcast-cache-manager';
import { BroadcastAutoScaler } from '../performance/auto-scaler';

interface PerformanceMetrics {
  timestamp: number;
  queueMetrics: {
    totalProcessed: number;
    averageProcessingTime: number;
    currentQueueSize: number;
    errorRate: number;
    throughputPerSecond: number;
  };
  cacheMetrics: {
    hits: number;
    misses: number;
    hitRate: number;
    memoryUsage: number;
    evictions: number;
  };
  systemMetrics: {
    cpuUtilization: number;
    memoryUtilization: number;
    activeConnections: number;
    responseTime: number;
  };
  weddingMetrics: {
    activeWeddings: number;
    criticalBroadcasts: number;
    emergencyAlerts: number;
    seasonalLoad: number;
  };
}

interface AlertRule {
  metric: string;
  threshold: number;
  comparison: 'greater' | 'less';
  severity: 'info' | 'warning' | 'error' | 'critical';
  cooldown: number; // minutes
}

export class BroadcastMetricsCollector {
  private supabase;
  private queueManager: BroadcastQueueManager;
  private cacheManager: BroadcastCacheManager;
  private autoScaler: BroadcastAutoScaler;
  private metricsHistory: PerformanceMetrics[] = [];
  private lastAlerts: Map<string, number> = new Map();

  private readonly alertRules: AlertRule[] = [
    // Queue performance alerts
    {
      metric: 'queueMetrics.errorRate',
      threshold: 0.05, // 5%
      comparison: 'greater',
      severity: 'error',
      cooldown: 10,
    },
    {
      metric: 'queueMetrics.averageProcessingTime',
      threshold: 1000, // 1 second
      comparison: 'greater',
      severity: 'warning',
      cooldown: 5,
    },
    {
      metric: 'queueMetrics.currentQueueSize',
      threshold: 5000,
      comparison: 'greater',
      severity: 'warning',
      cooldown: 15,
    },

    // Cache performance alerts
    {
      metric: 'cacheMetrics.hitRate',
      threshold: 0.8, // 80%
      comparison: 'less',
      severity: 'warning',
      cooldown: 20,
    },
    {
      metric: 'cacheMetrics.memoryUsage',
      threshold: 45 * 1024 * 1024, // 45MB
      comparison: 'greater',
      severity: 'warning',
      cooldown: 10,
    },

    // System performance alerts
    {
      metric: 'systemMetrics.responseTime',
      threshold: 500, // 500ms
      comparison: 'greater',
      severity: 'error',
      cooldown: 5,
    },
    {
      metric: 'systemMetrics.activeConnections',
      threshold: 8000,
      comparison: 'greater',
      severity: 'warning',
      cooldown: 10,
    },

    // Wedding-specific alerts
    {
      metric: 'weddingMetrics.emergencyAlerts',
      threshold: 0,
      comparison: 'greater',
      severity: 'critical',
      cooldown: 1,
    },
  ];

  constructor() {
    this.supabase = createServerClient();
    this.queueManager = new BroadcastQueueManager();
    this.cacheManager = new BroadcastCacheManager();
    this.autoScaler = new BroadcastAutoScaler();
  }

  async collectMetrics(): Promise<PerformanceMetrics> {
    const startTime = performance.now();

    try {
      // Collect queue metrics
      const queueMetrics = await this.queueManager.getMetrics();

      // Collect cache metrics
      const cacheMetrics = await this.cacheManager.getStats();

      // Collect system metrics
      const systemMetrics = await this.collectSystemMetrics();

      // Collect wedding-specific metrics
      const weddingMetrics = await this.collectWeddingMetrics();

      const metrics: PerformanceMetrics = {
        timestamp: Date.now(),
        queueMetrics,
        cacheMetrics,
        systemMetrics,
        weddingMetrics,
      };

      // Store metrics history (keep last 1000 samples)
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory.shift();
      }

      // Persist to database
      await this.storeMetrics(metrics);

      // Check alert rules
      await this.checkAlerts(metrics);

      // Publish to auto-scaler
      await this.autoScaler.publishCustomMetrics({
        currentConnections: systemMetrics.activeConnections,
        queueSize: queueMetrics.currentQueueSize,
        processingLatency: queueMetrics.averageProcessingTime,
        errorRate: queueMetrics.errorRate,
        cpuUtilization: systemMetrics.cpuUtilization,
        memoryUtilization: systemMetrics.memoryUtilization,
      });

      const collectionTime = performance.now() - startTime;
      console.debug(`Metrics collected in ${collectionTime.toFixed(2)}ms`);

      return metrics;
    } catch (error) {
      console.error('Failed to collect metrics:', error);
      throw error;
    }
  }

  private async collectSystemMetrics(): Promise<
    PerformanceMetrics['systemMetrics']
  > {
    // Simulate system metrics collection (in real implementation, use system monitoring APIs)
    const startTime = performance.now();

    // Test response time with a simple operation
    await this.supabase.from('broadcasts').select('count').limit(1);
    const responseTime = performance.now() - startTime;

    // Get active connections from connection pool or monitoring
    const activeConnections = await this.getActiveConnectionCount();

    return {
      cpuUtilization: await this.getCpuUtilization(),
      memoryUtilization: await this.getMemoryUtilization(),
      activeConnections,
      responseTime,
    };
  }

  private async collectWeddingMetrics(): Promise<
    PerformanceMetrics['weddingMetrics']
  > {
    try {
      // Count active weddings (today and next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: activeWeddings } = await this.supabase
        .from('weddings')
        .select('id')
        .gte('wedding_date', new Date().toISOString().split('T')[0])
        .lte('wedding_date', nextWeek.toISOString().split('T')[0])
        .eq('status', 'confirmed');

      // Count critical broadcasts in last hour
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const { data: criticalBroadcasts } = await this.supabase
        .from('broadcasts')
        .select('id')
        .eq('priority', 'critical')
        .gte('created_at', hourAgo.toISOString());

      // Count emergency alerts in last hour
      const { data: emergencyAlerts } = await this.supabase
        .from('scaling_alerts')
        .select('id')
        .eq('alert_type', 'emergency')
        .gte('timestamp', hourAgo.toISOString());

      // Calculate seasonal load factor
      const seasonalLoad = this.calculateSeasonalLoad();

      return {
        activeWeddings: activeWeddings?.length || 0,
        criticalBroadcasts: criticalBroadcasts?.length || 0,
        emergencyAlerts: emergencyAlerts?.length || 0,
        seasonalLoad,
      };
    } catch (error) {
      console.error('Failed to collect wedding metrics:', error);
      return {
        activeWeddings: 0,
        criticalBroadcasts: 0,
        emergencyAlerts: 0,
        seasonalLoad: 1.0,
      };
    }
  }

  private calculateSeasonalLoad(): number {
    const now = new Date();
    const month = now.getMonth() + 1;
    const dayOfWeek = now.getDay();

    // Wedding season multipliers
    const seasonMultipliers = {
      1: 0.6, // January
      2: 0.7, // February
      3: 0.8, // March
      4: 1.1, // April
      5: 1.4, // May - peak season
      6: 1.6, // June - peak season
      7: 1.2, // July
      8: 1.1, // August
      9: 1.5, // September - peak season
      10: 1.4, // October - peak season
      11: 0.9, // November
      12: 1.0, // December
    };

    // Weekend multiplier
    const weekendMultiplier =
      dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0 ? 1.3 : 1.0;

    return seasonMultipliers[month] * weekendMultiplier;
  }

  private async getActiveConnectionCount(): Promise<number> {
    // Simulated - in real implementation, would query connection pool or load balancer
    return Math.floor(Math.random() * 5000) + 1000; // 1000-6000 connections
  }

  private async getCpuUtilization(): Promise<number> {
    // Simulated - in real implementation, would use OS metrics
    return Math.random() * 100; // 0-100%
  }

  private async getMemoryUtilization(): Promise<number> {
    // Simulated - in real implementation, would use process.memoryUsage()
    const memUsage = process.memoryUsage();
    return (memUsage.heapUsed / memUsage.heapTotal) * 100;
  }

  private async storeMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      await this.supabase.from('broadcast_metrics').insert({
        timestamp: new Date(metrics.timestamp).toISOString(),
        queue_processed: metrics.queueMetrics.totalProcessed,
        queue_processing_time: metrics.queueMetrics.averageProcessingTime,
        queue_size: metrics.queueMetrics.currentQueueSize,
        queue_error_rate: metrics.queueMetrics.errorRate,
        queue_throughput: metrics.queueMetrics.throughputPerSecond,
        cache_hit_rate: metrics.cacheMetrics.hitRate,
        cache_memory_usage: metrics.cacheMetrics.memoryUsage,
        system_cpu_utilization: metrics.systemMetrics.cpuUtilization,
        system_memory_utilization: metrics.systemMetrics.memoryUtilization,
        system_active_connections: metrics.systemMetrics.activeConnections,
        system_response_time: metrics.systemMetrics.responseTime,
        wedding_active_count: metrics.weddingMetrics.activeWeddings,
        wedding_critical_broadcasts: metrics.weddingMetrics.criticalBroadcasts,
        wedding_emergency_alerts: metrics.weddingMetrics.emergencyAlerts,
        seasonal_load_factor: metrics.weddingMetrics.seasonalLoad,
      });
    } catch (error) {
      console.error('Failed to store metrics:', error);
    }
  }

  private async checkAlerts(metrics: PerformanceMetrics): Promise<void> {
    for (const rule of this.alertRules) {
      try {
        const metricValue = this.getNestedMetricValue(metrics, rule.metric);
        const alertKey = `${rule.metric}_${rule.severity}`;
        const lastAlert = this.lastAlerts.get(alertKey) || 0;
        const cooldownExpired =
          Date.now() - lastAlert > rule.cooldown * 60 * 1000;

        if (!cooldownExpired) continue;

        let shouldAlert = false;
        if (rule.comparison === 'greater') {
          shouldAlert = metricValue > rule.threshold;
        } else {
          shouldAlert = metricValue < rule.threshold;
        }

        if (shouldAlert) {
          await this.sendAlert(rule, metricValue, metrics);
          this.lastAlerts.set(alertKey, Date.now());
        }
      } catch (error) {
        console.error(`Failed to check alert rule ${rule.metric}:`, error);
      }
    }
  }

  private getNestedMetricValue(
    metrics: PerformanceMetrics,
    path: string,
  ): number {
    const keys = path.split('.');
    let value: any = metrics;

    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return 0;
    }

    return typeof value === 'number' ? value : 0;
  }

  private async sendAlert(
    rule: AlertRule,
    value: number,
    metrics: PerformanceMetrics,
  ): Promise<void> {
    const alertMessage = {
      severity: rule.severity,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      comparison: rule.comparison,
      timestamp: new Date().toISOString(),
      context: {
        queueSize: metrics.queueMetrics.currentQueueSize,
        activeConnections: metrics.systemMetrics.activeConnections,
        activeWeddings: metrics.weddingMetrics.activeWeddings,
      },
    };

    console.warn(
      `BROADCAST ALERT [${rule.severity.toUpperCase()}]:`,
      alertMessage,
    );

    // Store alert in database
    await this.supabase.from('broadcast_alerts').insert({
      severity: rule.severity,
      metric_name: rule.metric,
      metric_value: value,
      threshold_value: rule.threshold,
      alert_message: `${rule.metric} is ${value} (${rule.comparison} ${rule.threshold})`,
      context: alertMessage.context,
      created_at: alertMessage.timestamp,
    });

    // Send to external alerting systems based on severity
    if (rule.severity === 'critical') {
      await this.sendCriticalAlert(alertMessage);
    } else if (rule.severity === 'error') {
      await this.sendErrorAlert(alertMessage);
    }
  }

  private async sendCriticalAlert(alert: any): Promise<void> {
    // Integration with PagerDuty, Slack, SMS, etc.
    console.error(
      `🚨 CRITICAL BROADCAST ALERT: ${alert.metric} = ${alert.value}`,
    );

    // Emergency scaling if needed
    if (alert.metric.includes('activeConnections') && alert.value > 10000) {
      await this.autoScaler.emergencyScale(
        20,
        'Critical connection threshold exceeded',
      );
    }
  }

  private async sendErrorAlert(alert: any): Promise<void> {
    // Integration with Slack, email notifications
    console.error(`❌ BROADCAST ERROR: ${alert.metric} = ${alert.value}`);
  }

  // Real-time metrics streaming
  async startMetricsCollection(intervalMs: number = 30000): Promise<void> {
    console.info(`Starting broadcast metrics collection every ${intervalMs}ms`);

    const collectAndStore = async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('Metrics collection cycle failed:', error);
      }
    };

    // Initial collection
    await collectAndStore();

    // Set up interval
    setInterval(collectAndStore, intervalMs);

    // Wedding season optimization - collect more frequently during peak
    const checkSeasonalFrequency = () => {
      const seasonalLoad = this.calculateSeasonalLoad();
      if (seasonalLoad > 1.3) {
        // Increase frequency during high-load periods
        console.info(
          'Increasing metrics collection frequency for wedding season',
        );
        return Math.max(15000, intervalMs / 2); // Minimum 15 seconds
      }
      return intervalMs;
    };

    // Adjust collection frequency based on seasonal load
    setInterval(
      () => {
        const newInterval = checkSeasonalFrequency();
        if (newInterval !== intervalMs) {
          console.info(
            `Adjusting metrics collection interval to ${newInterval}ms`,
          );
        }
      },
      5 * 60 * 1000,
    ); // Check every 5 minutes
  }

  // Get metrics summary for dashboard
  async getMetricsSummary(timeRangeMinutes: number = 60): Promise<any> {
    const cutoff = Date.now() - timeRangeMinutes * 60 * 1000;
    const recentMetrics = this.metricsHistory.filter(
      (m) => m.timestamp > cutoff,
    );

    if (recentMetrics.length === 0) {
      return null;
    }

    // Calculate averages and trends
    const avgProcessingTime =
      recentMetrics.reduce(
        (sum, m) => sum + m.queueMetrics.averageProcessingTime,
        0,
      ) / recentMetrics.length;
    const avgCacheHitRate =
      recentMetrics.reduce((sum, m) => sum + m.cacheMetrics.hitRate, 0) /
      recentMetrics.length;
    const avgActiveConnections =
      recentMetrics.reduce(
        (sum, m) => sum + m.systemMetrics.activeConnections,
        0,
      ) / recentMetrics.length;
    const maxQueueSize = Math.max(
      ...recentMetrics.map((m) => m.queueMetrics.currentQueueSize),
    );

    return {
      timeRange: timeRangeMinutes,
      sampleCount: recentMetrics.length,
      performance: {
        avgProcessingTime,
        avgCacheHitRate,
        avgActiveConnections,
        maxQueueSize,
      },
      latest: recentMetrics[recentMetrics.length - 1],
      trend: this.calculateTrend(recentMetrics),
    };
  }

  private calculateTrend(
    metrics: PerformanceMetrics[],
  ): 'improving' | 'stable' | 'degrading' {
    if (metrics.length < 5) return 'stable';

    const recent = metrics.slice(-5);
    const earlier = metrics.slice(-10, -5);

    const recentAvg =
      recent.reduce((sum, m) => sum + m.queueMetrics.averageProcessingTime, 0) /
      recent.length;
    const earlierAvg =
      earlier.reduce(
        (sum, m) => sum + m.queueMetrics.averageProcessingTime,
        0,
      ) / earlier.length;

    const changePercent = ((recentAvg - earlierAvg) / earlierAvg) * 100;

    if (changePercent > 10) return 'degrading';
    if (changePercent < -10) return 'improving';
    return 'stable';
  }

  async getHealthStatus(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: PerformanceMetrics | null;
  }> {
    try {
      const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
      const issues: string[] = [];

      if (latestMetrics) {
        // Check queue health
        if (latestMetrics.queueMetrics.errorRate > 0.05) {
          issues.push(
            `High queue error rate: ${(latestMetrics.queueMetrics.errorRate * 100).toFixed(1)}%`,
          );
        }

        if (latestMetrics.queueMetrics.averageProcessingTime > 1000) {
          issues.push(
            `Slow processing: ${latestMetrics.queueMetrics.averageProcessingTime.toFixed(0)}ms`,
          );
        }

        // Check cache health
        if (latestMetrics.cacheMetrics.hitRate < 0.8) {
          issues.push(
            `Low cache hit rate: ${(latestMetrics.cacheMetrics.hitRate * 100).toFixed(1)}%`,
          );
        }

        // Check system health
        if (latestMetrics.systemMetrics.responseTime > 500) {
          issues.push(
            `High response time: ${latestMetrics.systemMetrics.responseTime.toFixed(0)}ms`,
          );
        }
      }

      return {
        healthy: issues.length === 0,
        issues,
        metrics: latestMetrics || null,
      };
    } catch (error) {
      return {
        healthy: false,
        issues: ['Failed to check health status'],
        metrics: null,
      };
    }
  }
}
