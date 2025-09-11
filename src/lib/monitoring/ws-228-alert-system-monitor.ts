/**
 * WS-228 Alert System Performance & Health Monitor
 * Team E Implementation - Monitoring Integration
 *
 * Monitors alert system performance, health metrics, and wedding day protection
 */

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

export interface AlertSystemMetrics {
  alert_creation_time_p95: number;
  alert_creation_time_p99: number;
  deduplication_time_avg: number;
  websocket_notification_time: number;
  active_alerts_count: number;
  critical_alerts_count: number;
  wedding_day_alerts_count: number;
  saturday_deployment_blocks: number;
  websocket_connection_count: number;
  redis_deduplication_hits: number;
  redis_deduplication_misses: number;
  database_query_time: number;
  notification_delivery_rate: number;
}

export interface WeddingDayMetrics {
  active_weddings_today: number;
  wedding_alerts_escalated: number;
  saturday_protection_triggered: number;
  venue_connectivity_alerts: number;
  wedding_day_performance_degradation: number;
}

export class AlertSystemMonitor extends EventEmitter {
  private redis: Redis;
  private supabase: any;
  private metricCollectionInterval: NodeJS.Timeout | null = null;
  private performanceMetrics: Map<string, number[]> = new Map();
  private weddingDayMetrics: WeddingDayMetrics = {
    active_weddings_today: 0,
    wedding_alerts_escalated: 0,
    saturday_protection_triggered: 0,
    venue_connectivity_alerts: 0,
    wedding_day_performance_degradation: 0,
  };

  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL!);
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Start monitoring alert system performance
   */
  async startMonitoring(intervalMs: number = 30000) {
    console.log('🚨 Starting WS-228 Alert System Monitor');

    this.metricCollectionInterval = setInterval(async () => {
      try {
        await this.collectAlertSystemMetrics();
        await this.collectWeddingDayMetrics();
        await this.checkPerformanceThresholds();
        await this.checkWeddingDayProtocol();
      } catch (error) {
        console.error('Alert system monitoring error:', error);
        this.emit('monitoring_error', error);
      }
    }, intervalMs);

    // Initial collection
    await this.collectAlertSystemMetrics();
    this.emit('monitoring_started');
  }

  /**
   * Collect core alert system performance metrics
   */
  async collectAlertSystemMetrics(): Promise<AlertSystemMetrics> {
    const startTime = performance.now();

    // Collect database metrics
    const { data: alertStats } = await this.supabase
      .from('alerts')
      .select('id, priority, created_at, acknowledged_at, resolved_at')
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      );

    // Collect Redis deduplication metrics
    const redisInfo = await this.redis.info('stats');
    const redisStats = this.parseRedisStats(redisInfo);

    // Calculate performance percentiles
    const creationTimes = this.getMetricHistory('alert_creation_time');
    const p95CreationTime = this.calculatePercentile(creationTimes, 95);
    const p99CreationTime = this.calculatePercentile(creationTimes, 99);

    const metrics: AlertSystemMetrics = {
      alert_creation_time_p95: p95CreationTime,
      alert_creation_time_p99: p99CreationTime,
      deduplication_time_avg: this.getAverageMetric('deduplication_time'),
      websocket_notification_time: this.getAverageMetric(
        'websocket_notification_time',
      ),
      active_alerts_count:
        alertStats?.filter((a) => !a.resolved_at).length || 0,
      critical_alerts_count:
        alertStats?.filter((a) => a.priority === 'CRITICAL' && !a.resolved_at)
          .length || 0,
      wedding_day_alerts_count: this.weddingDayMetrics.wedding_alerts_escalated,
      saturday_deployment_blocks:
        this.weddingDayMetrics.saturday_protection_triggered,
      websocket_connection_count: await this.getWebSocketConnectionCount(),
      redis_deduplication_hits: redisStats.keyspace_hits,
      redis_deduplication_misses: redisStats.keyspace_misses,
      database_query_time: performance.now() - startTime,
      notification_delivery_rate:
        await this.calculateNotificationDeliveryRate(),
    };

    // Store metrics for trending
    await this.storeMetricsSnapshot(metrics);

    this.emit('metrics_collected', metrics);
    return metrics;
  }

  /**
   * Monitor wedding day specific metrics and protocols
   */
  async collectWeddingDayMetrics(): Promise<WeddingDayMetrics> {
    const today = new Date().toISOString().split('T')[0];
    const isSaturday = new Date().getDay() === 6;

    // Check active weddings today
    const { data: activeWeddings } = await this.supabase
      .from('weddings')
      .select('id, date, venue')
      .eq('date', today)
      .eq('status', 'active');

    // Check wedding day alerts in last hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: weddingAlerts } = await this.supabase
      .from('alerts')
      .select('id, priority, type, metadata')
      .gte('created_at', hourAgo)
      .eq('type', 'WEDDING_DAY');

    // Check Saturday deployment protection
    const saturdayBlocks =
      (await this.redis.get('saturday_deployment_blocks_today')) || '0';

    this.weddingDayMetrics = {
      active_weddings_today: activeWeddings?.length || 0,
      wedding_alerts_escalated:
        weddingAlerts?.filter((a) => a.priority === 'CRITICAL').length || 0,
      saturday_protection_triggered: parseInt(saturdayBlocks),
      venue_connectivity_alerts:
        weddingAlerts?.filter(
          (a) => a.metadata?.alert_type === 'venue_connectivity',
        ).length || 0,
      wedding_day_performance_degradation:
        await this.checkWeddingDayPerformance(),
    };

    // Emit Saturday protection alert if deployments attempted
    if (
      isSaturday &&
      this.weddingDayMetrics.saturday_protection_triggered > 0
    ) {
      this.emit('saturday_protection_triggered', {
        attempts: this.weddingDayMetrics.saturday_protection_triggered,
        active_weddings: this.weddingDayMetrics.active_weddings_today,
      });
    }

    this.emit('wedding_day_metrics_collected', this.weddingDayMetrics);
    return this.weddingDayMetrics;
  }

  /**
   * Check if alert system performance meets requirements
   */
  async checkPerformanceThresholds() {
    const metrics = await this.collectAlertSystemMetrics();

    // CRITICAL: Alert creation must be under 500ms (p95)
    if (metrics.alert_creation_time_p95 > 500) {
      this.emit('performance_violation', {
        metric: 'alert_creation_time_p95',
        current: metrics.alert_creation_time_p95,
        threshold: 500,
        severity: 'CRITICAL',
      });
    }

    // HIGH: Alert creation p99 should be under 1000ms
    if (metrics.alert_creation_time_p99 > 1000) {
      this.emit('performance_violation', {
        metric: 'alert_creation_time_p99',
        current: metrics.alert_creation_time_p99,
        threshold: 1000,
        severity: 'HIGH',
      });
    }

    // MEDIUM: Deduplication should be under 100ms average
    if (metrics.deduplication_time_avg > 100) {
      this.emit('performance_violation', {
        metric: 'deduplication_time_avg',
        current: metrics.deduplication_time_avg,
        threshold: 100,
        severity: 'MEDIUM',
      });
    }

    // Check WebSocket notification speed
    if (metrics.websocket_notification_time > 50) {
      this.emit('performance_violation', {
        metric: 'websocket_notification_time',
        current: metrics.websocket_notification_time,
        threshold: 50,
        severity: 'HIGH',
      });
    }
  }

  /**
   * Monitor wedding day protocol compliance
   */
  async checkWeddingDayProtocol() {
    const isSaturday = new Date().getDay() === 6;
    const hasActiveWeddings = this.weddingDayMetrics.active_weddings_today > 0;

    if (isSaturday && hasActiveWeddings) {
      // MAXIMUM PROTECTION MODE
      this.emit('wedding_day_maximum_protection', {
        active_weddings: this.weddingDayMetrics.active_weddings_today,
        protection_level: 'MAXIMUM',
      });

      // Monitor for any system changes on Saturday
      const recentChanges = await this.detectSystemChanges();
      if (recentChanges.length > 0) {
        this.emit('saturday_system_changes_detected', {
          changes: recentChanges,
          active_weddings: this.weddingDayMetrics.active_weddings_today,
        });
      }
    }
  }

  /**
   * Record alert creation performance metric
   */
  recordAlertCreationTime(durationMs: number) {
    this.recordMetric('alert_creation_time', durationMs);

    // Immediate check for performance violation
    if (durationMs > 500) {
      this.emit('alert_creation_slow', {
        duration: durationMs,
        threshold: 500,
      });
    }
  }

  /**
   * Record deduplication performance
   */
  recordDeduplicationTime(durationMs: number) {
    this.recordMetric('deduplication_time', durationMs);
  }

  /**
   * Record WebSocket notification time
   */
  recordWebSocketNotificationTime(durationMs: number) {
    this.recordMetric('websocket_notification_time', durationMs);
  }

  /**
   * Record Saturday deployment block
   */
  async recordSaturdayDeploymentBlock() {
    await this.redis.incr('saturday_deployment_blocks_today');
    await this.redis.expire('saturday_deployment_blocks_today', 24 * 60 * 60); // 24 hours

    this.emit('saturday_deployment_blocked', {
      timestamp: new Date(),
      total_blocks_today: await this.redis.get(
        'saturday_deployment_blocks_today',
      ),
    });
  }

  /**
   * Get real-time dashboard metrics for admin UI
   */
  async getDashboardMetrics() {
    const [systemMetrics, weddingMetrics] = await Promise.all([
      this.collectAlertSystemMetrics(),
      this.collectWeddingDayMetrics(),
    ]);

    return {
      system: systemMetrics,
      wedding_day: weddingMetrics,
      performance_status: this.getPerformanceStatus(systemMetrics),
      wedding_day_status: this.getWeddingDayStatus(weddingMetrics),
      last_updated: new Date(),
    };
  }

  /**
   * Private helper methods
   */
  private recordMetric(key: string, value: number) {
    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, []);
    }

    const metrics = this.performanceMetrics.get(key)!;
    metrics.push(value);

    // Keep only last 1000 measurements for memory efficiency
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  private getMetricHistory(key: string): number[] {
    return this.performanceMetrics.get(key) || [];
  }

  private getAverageMetric(key: string): number {
    const values = this.getMetricHistory(key);
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private parseRedisStats(info: string): {
    keyspace_hits: number;
    keyspace_misses: number;
  } {
    const hits = info.match(/keyspace_hits:(\d+)/);
    const misses = info.match(/keyspace_misses:(\d+)/);
    return {
      keyspace_hits: hits ? parseInt(hits[1]) : 0,
      keyspace_misses: misses ? parseInt(misses[1]) : 0,
    };
  }

  private async getWebSocketConnectionCount(): Promise<number> {
    // This would integrate with your WebSocket manager
    const connectionCount =
      (await this.redis.get('websocket_connections')) || '0';
    return parseInt(connectionCount);
  }

  private async calculateNotificationDeliveryRate(): Promise<number> {
    const sent = (await this.redis.get('notifications_sent_24h')) || '0';
    const delivered =
      (await this.redis.get('notifications_delivered_24h')) || '0';

    const sentCount = parseInt(sent);
    const deliveredCount = parseInt(delivered);

    return sentCount > 0 ? (deliveredCount / sentCount) * 100 : 100;
  }

  private async checkWeddingDayPerformance(): Promise<number> {
    const currentP95 = this.calculatePercentile(
      this.getMetricHistory('alert_creation_time'),
      95,
    );
    const baselineP95 = 200; // Normal performance baseline

    return Math.max(0, ((currentP95 - baselineP95) / baselineP95) * 100);
  }

  private async detectSystemChanges(): Promise<any[]> {
    // Monitor for deployments, config changes, etc.
    // This would integrate with your deployment tracking
    const changes = [];

    // Check for recent deployments
    const recentDeployments =
      (await this.redis.get('recent_deployments')) || '[]';
    changes.push(...JSON.parse(recentDeployments));

    return changes;
  }

  private async storeMetricsSnapshot(metrics: AlertSystemMetrics) {
    await this.redis.setex(
      `alert_metrics_${Date.now()}`,
      60 * 60 * 24, // 24 hours
      JSON.stringify(metrics),
    );
  }

  private getPerformanceStatus(
    metrics: AlertSystemMetrics,
  ): 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'CRITICAL' {
    if (metrics.alert_creation_time_p95 > 500) return 'CRITICAL';
    if (metrics.alert_creation_time_p95 > 300) return 'DEGRADED';
    if (metrics.alert_creation_time_p95 > 150) return 'GOOD';
    return 'EXCELLENT';
  }

  private getWeddingDayStatus(
    metrics: WeddingDayMetrics,
  ): 'SAFE' | 'MONITORING' | 'CRITICAL' {
    if (metrics.active_weddings_today > 0 && new Date().getDay() === 6)
      return 'CRITICAL';
    if (metrics.active_weddings_today > 0) return 'MONITORING';
    return 'SAFE';
  }

  async stopMonitoring() {
    if (this.metricCollectionInterval) {
      clearInterval(this.metricCollectionInterval);
      this.metricCollectionInterval = null;
    }
    this.emit('monitoring_stopped');
  }
}

// Singleton instance for global use
export const alertSystemMonitor = new AlertSystemMonitor();
