/**
 * WS-155: Guest Communications - Production Monitoring Service
 * Team E - Round 3: Real-time database performance monitoring
 * Feature ID: WS-155
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

interface PerformanceMetrics {
  timestamp: Date;
  queryCount: number;
  averageQueryTime: number;
  slowQueries: number;
  activeConnections: number;
  cacheHitRatio: number;
  errorRate: number;
  throughput: number;
}

interface HealthCheckResult {
  checkName: string;
  status: 'healthy' | 'warning' | 'critical';
  details: any;
  timestamp: Date;
}

interface AlertConfig {
  metric: string;
  threshold: number;
  comparison: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldownMs: number;
}

interface BackupStatus {
  lastBackup: Date | null;
  backupType: string;
  status: string;
  nextScheduled: Date | null;
  backupSize: number;
  duration: number;
}

export class CommunicationProductionMonitor extends EventEmitter {
  private supabase: SupabaseClient;
  private monitoringInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsBuffer: PerformanceMetrics[] = [];
  private alertConfigs: AlertConfig[] = [];
  private lastAlertTime = new Map<string, number>();
  private isMonitoring = false;

  constructor(supabaseUrl: string, supabaseKey: string) {
    super();
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializeDefaultAlerts();
  }

  /**
   * Initialize default alert configurations
   */
  private initializeDefaultAlerts(): void {
    this.alertConfigs = [
      {
        metric: 'averageQueryTime',
        threshold: 1000, // 1 second
        comparison: 'gt',
        severity: 'high',
        cooldownMs: 300000, // 5 minutes
      },
      {
        metric: 'errorRate',
        threshold: 5, // 5%
        comparison: 'gt',
        severity: 'critical',
        cooldownMs: 60000, // 1 minute
      },
      {
        metric: 'activeConnections',
        threshold: 90, // 90% of max connections
        comparison: 'gt',
        severity: 'high',
        cooldownMs: 120000, // 2 minutes
      },
      {
        metric: 'cacheHitRatio',
        threshold: 70, // 70%
        comparison: 'lt',
        severity: 'medium',
        cooldownMs: 600000, // 10 minutes
      },
      {
        metric: 'slowQueries',
        threshold: 10,
        comparison: 'gt',
        severity: 'medium',
        cooldownMs: 300000, // 5 minutes
      },
    ];
  }

  /**
   * Start monitoring with specified interval
   */
  async startMonitoring(intervalMs: number = 60000): Promise<void> {
    if (this.isMonitoring) {
      console.log('Monitoring already running');
      return;
    }

    this.isMonitoring = true;

    // Initial metrics collection
    await this.collectMetrics();

    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, intervalMs);

    // Start health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs * 2); // Health checks at half the frequency

    this.emit('monitoring:started', { intervalMs });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.isMonitoring = false;
    this.emit('monitoring:stopped');
  }

  /**
   * Collect current performance metrics
   */
  private async collectMetrics(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      queryCount: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      activeConnections: 0,
      cacheHitRatio: 0,
      errorRate: 0,
      throughput: 0,
    };

    try {
      // Collect query performance metrics
      const queryMetrics = await this.getQueryMetrics();
      metrics.queryCount = queryMetrics.count;
      metrics.averageQueryTime = queryMetrics.avgTime;
      metrics.slowQueries = queryMetrics.slowCount;

      // Collect connection metrics
      const connectionMetrics = await this.getConnectionMetrics();
      metrics.activeConnections = connectionMetrics.active;

      // Collect cache metrics
      const cacheMetrics = await this.getCacheMetrics();
      metrics.cacheHitRatio = cacheMetrics.hitRatio;

      // Collect error metrics
      const errorMetrics = await this.getErrorMetrics();
      metrics.errorRate = errorMetrics.rate;

      // Calculate throughput
      metrics.throughput = await this.calculateThroughput();

      // Store metrics
      await this.storeMetrics(metrics);

      // Check for alerts
      this.checkAlerts(metrics);

      // Add to buffer
      this.metricsBuffer.push(metrics);
      if (this.metricsBuffer.length > 100) {
        this.metricsBuffer.shift(); // Keep only last 100 metrics
      }

      this.emit('metrics:collected', metrics);

      return metrics;
    } catch (error) {
      console.error('Error collecting metrics:', error);
      this.emit('metrics:error', error);
      return metrics;
    }
  }

  /**
   * Get query performance metrics
   */
  private async getQueryMetrics(): Promise<{
    count: number;
    avgTime: number;
    slowCount: number;
  }> {
    const { data, error } = await this.supabase
      .from('communication_query_performance')
      .select('execution_time_ms')
      .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false });

    if (error || !data) {
      return { count: 0, avgTime: 0, slowCount: 0 };
    }

    const times = data.map((d) => d.execution_time_ms);
    const count = times.length;
    const avgTime =
      count > 0 ? times.reduce((sum, t) => sum + t, 0) / count : 0;
    const slowCount = times.filter((t) => t > 1000).length; // Queries over 1 second

    return { count, avgTime, slowCount };
  }

  /**
   * Get connection pool metrics
   */
  private async getConnectionMetrics(): Promise<{
    active: number;
    max: number;
  }> {
    // Query pg_stat_activity for active connections
    const { data, error } = await this.supabase.rpc('get_connection_stats', {});

    if (error || !data) {
      return { active: 0, max: 100 };
    }

    return {
      active: data.active_connections || 0,
      max: data.max_connections || 100,
    };
  }

  /**
   * Get cache performance metrics
   */
  private async getCacheMetrics(): Promise<{ hitRatio: number }> {
    // Query cache statistics
    const { data, error } = await this.supabase.rpc('get_cache_stats', {});

    if (error || !data) {
      return { hitRatio: 0 };
    }

    const hits = data.cache_hits || 0;
    const misses = data.cache_misses || 0;
    const total = hits + misses;

    return {
      hitRatio: total > 0 ? (hits / total) * 100 : 0,
    };
  }

  /**
   * Get error rate metrics
   */
  private async getErrorMetrics(): Promise<{ rate: number; count: number }> {
    const { data: failedData } = await this.supabase
      .from('delivery_status')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 300000).toISOString());

    const { data: totalData } = await this.supabase
      .from('delivery_status')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 300000).toISOString());

    const failedCount = failedData?.length || 0;
    const totalCount = totalData?.length || 0;

    return {
      count: failedCount,
      rate: totalCount > 0 ? (failedCount / totalCount) * 100 : 0,
    };
  }

  /**
   * Calculate message throughput
   */
  private async calculateThroughput(): Promise<number> {
    const { data, error } = await this.supabase
      .from('guest_communications')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', new Date(Date.now() - 60000).toISOString()); // Last minute

    return data?.length || 0;
  }

  /**
   * Store metrics in database
   */
  private async storeMetrics(metrics: PerformanceMetrics): Promise<void> {
    const metricsToStore = [
      {
        metric_name: 'query_count',
        metric_value: metrics.queryCount,
        metric_unit: 'count',
      },
      {
        metric_name: 'average_query_time',
        metric_value: metrics.averageQueryTime,
        metric_unit: 'ms',
      },
      {
        metric_name: 'slow_queries',
        metric_value: metrics.slowQueries,
        metric_unit: 'count',
      },
      {
        metric_name: 'active_connections',
        metric_value: metrics.activeConnections,
        metric_unit: 'count',
      },
      {
        metric_name: 'cache_hit_ratio',
        metric_value: metrics.cacheHitRatio,
        metric_unit: 'percentage',
      },
      {
        metric_name: 'error_rate',
        metric_value: metrics.errorRate,
        metric_unit: 'percentage',
      },
      {
        metric_name: 'throughput',
        metric_value: metrics.throughput,
        metric_unit: 'messages_per_minute',
      },
    ];

    await this.supabase
      .from('communication_performance_metrics')
      .insert(metricsToStore);
  }

  /**
   * Check metrics against alert thresholds
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    for (const config of this.alertConfigs) {
      const value = (metrics as any)[config.metric];
      if (value === undefined) continue;

      let shouldAlert = false;
      switch (config.comparison) {
        case 'gt':
          shouldAlert = value > config.threshold;
          break;
        case 'lt':
          shouldAlert = value < config.threshold;
          break;
        case 'gte':
          shouldAlert = value >= config.threshold;
          break;
        case 'lte':
          shouldAlert = value <= config.threshold;
          break;
        case 'eq':
          shouldAlert = value === config.threshold;
          break;
      }

      if (shouldAlert) {
        const alertKey = `${config.metric}_${config.severity}`;
        const lastAlert = this.lastAlertTime.get(alertKey) || 0;

        if (Date.now() - lastAlert > config.cooldownMs) {
          this.triggerAlert(config, value, metrics);
          this.lastAlertTime.set(alertKey, Date.now());
        }
      }
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(
    config: AlertConfig,
    value: number,
    metrics: PerformanceMetrics,
  ): void {
    const alert = {
      metric: config.metric,
      value,
      threshold: config.threshold,
      severity: config.severity,
      message: `${config.metric} is ${value} (threshold: ${config.threshold})`,
      timestamp: new Date(),
      metrics,
    };

    this.emit('alert:triggered', alert);

    // Store alert in database
    this.supabase.from('communication_security_audit').insert({
      event_type: 'performance_alert',
      action: config.metric,
      risk_level: config.severity,
      success: false,
      metadata: alert,
    });
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    // Check database connectivity
    results.push(await this.checkDatabaseHealth());

    // Check table sizes
    results.push(await this.checkTableSizes());

    // Check backup status
    results.push(await this.checkBackupStatus());

    // Check query performance
    results.push(await this.checkQueryPerformance());

    // Check compliance status
    results.push(await this.checkComplianceStatus());

    this.emit('health:checked', results);

    return results;
  }

  /**
   * Check database connectivity
   */
  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    try {
      const { error } = await this.supabase
        .from('guest_communications')
        .select('id')
        .limit(1);

      return {
        checkName: 'database_connectivity',
        status: error ? 'critical' : 'healthy',
        details: { connected: !error, error: error?.message },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        checkName: 'database_connectivity',
        status: 'critical',
        details: { connected: false, error },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check table sizes for capacity
   */
  private async checkTableSizes(): Promise<HealthCheckResult> {
    const { data, error } = await this.supabase.rpc(
      'check_communication_system_health',
      {},
    );

    if (error || !data) {
      return {
        checkName: 'table_sizes',
        status: 'warning',
        details: { error: error?.message },
        timestamp: new Date(),
      };
    }

    const tableSizeCheck = data.find(
      (d: any) => d.check_name === 'table_sizes',
    );

    return {
      checkName: 'table_sizes',
      status: tableSizeCheck?.status || 'healthy',
      details: tableSizeCheck?.details || {},
      timestamp: new Date(),
    };
  }

  /**
   * Check backup status
   */
  private async checkBackupStatus(): Promise<HealthCheckResult> {
    const { data, error } = await this.supabase
      .from('communication_backups')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return {
        checkName: 'backup_status',
        status: 'critical',
        details: { lastBackup: null, error: 'No backups found' },
        timestamp: new Date(),
      };
    }

    const hoursSinceBackup =
      (Date.now() - new Date(data.completed_at).getTime()) / (1000 * 60 * 60);
    const status =
      hoursSinceBackup > 48
        ? 'critical'
        : hoursSinceBackup > 24
          ? 'warning'
          : 'healthy';

    return {
      checkName: 'backup_status',
      status,
      details: {
        lastBackup: data.completed_at,
        backupId: data.backup_id,
        hoursSinceBackup,
        rowCount: data.row_count,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Check query performance
   */
  private async checkQueryPerformance(): Promise<HealthCheckResult> {
    const metrics = await this.getQueryMetrics();
    const status =
      metrics.avgTime > 5000
        ? 'critical'
        : metrics.avgTime > 1000
          ? 'warning'
          : 'healthy';

    return {
      checkName: 'query_performance',
      status,
      details: {
        averageQueryTime: metrics.avgTime,
        slowQueries: metrics.slowCount,
        totalQueries: metrics.count,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Check GDPR and CAN-SPAM compliance
   */
  private async checkComplianceStatus(): Promise<HealthCheckResult> {
    // Check for recent non-compliant messages
    const { data: nonCompliant, error } = await this.supabase
      .from('communication_canspam_compliance')
      .select('*')
      .lt('compliance_score', 80)
      .gte('created_at', new Date(Date.now() - 86400000).toISOString()); // Last 24 hours

    const hasIssues = (nonCompliant?.length || 0) > 0;

    return {
      checkName: 'compliance_status',
      status: hasIssues ? 'warning' : 'healthy',
      details: {
        nonCompliantMessages: nonCompliant?.length || 0,
        complianceIssues: nonCompliant?.map((nc) => nc.validation_errors) || [],
      },
      timestamp: new Date(),
    };
  }

  /**
   * Get current metrics buffer
   */
  getMetricsBuffer(): PerformanceMetrics[] {
    return [...this.metricsBuffer];
  }

  /**
   * Get metrics summary for a time period
   */
  getMetricsSummary(periodMinutes: number = 60): {
    avgQueryTime: number;
    maxQueryTime: number;
    totalQueries: number;
    avgThroughput: number;
    avgErrorRate: number;
  } {
    const cutoff = Date.now() - periodMinutes * 60 * 1000;
    const relevantMetrics = this.metricsBuffer.filter(
      (m) => m.timestamp.getTime() > cutoff,
    );

    if (relevantMetrics.length === 0) {
      return {
        avgQueryTime: 0,
        maxQueryTime: 0,
        totalQueries: 0,
        avgThroughput: 0,
        avgErrorRate: 0,
      };
    }

    const queryTimes = relevantMetrics.map((m) => m.averageQueryTime);
    const throughputs = relevantMetrics.map((m) => m.throughput);
    const errorRates = relevantMetrics.map((m) => m.errorRate);
    const totalQueries = relevantMetrics.reduce(
      (sum, m) => sum + m.queryCount,
      0,
    );

    return {
      avgQueryTime:
        queryTimes.reduce((sum, t) => sum + t, 0) / queryTimes.length,
      maxQueryTime: Math.max(...queryTimes),
      totalQueries,
      avgThroughput:
        throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length,
      avgErrorRate:
        errorRates.reduce((sum, r) => sum + r, 0) / errorRates.length,
    };
  }

  /**
   * Export metrics for analysis
   */
  async exportMetrics(startDate: Date, endDate: Date): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('communication_performance_metrics')
      .select('*')
      .gte('metric_timestamp', startDate.toISOString())
      .lte('metric_timestamp', endDate.toISOString())
      .order('metric_timestamp', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }
}
