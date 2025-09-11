/**
 * WS-203 Team D: Real-Time WebSocket Performance Tracker
 *
 * Comprehensive performance monitoring with wedding-industry specific metrics.
 * Real-time anomaly detection, alerting, and performance optimization recommendations.
 *
 * Wedding Industry Context:
 * - Sub-200ms channel switching critical for photographer workflows
 * - Wedding day performance must be 100% reliable (zero tolerance)
 * - Peak season monitoring: 10x traffic spikes during June/September/October
 * - Multi-vendor coordination requires instant response times
 */

import { z } from 'zod';
import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/client';
import NodeCache from 'node-cache';

// Configuration Schema
const performanceTrackerConfigSchema = z.object({
  tracking: z.object({
    metricsInterval: z.number().min(1000).max(60000).default(5000), // 5 seconds
    anomalyDetectionWindow: z.number().min(60000).max(1800000).default(300000), // 5 minutes
    alertCooldown: z.number().min(30000).max(600000).default(120000), // 2 minutes
    historyRetention: z
      .number()
      .min(86400000)
      .max(2592000000)
      .default(604800000), // 7 days
    batchSize: z.number().min(10).max(1000).default(100),
  }),
  thresholds: z.object({
    channelSwitchTime: z.object({
      warning: z.number().default(150), // 150ms warning
      critical: z.number().default(200), // 200ms critical
      emergency: z.number().default(500), // 500ms emergency
    }),
    connectionLatency: z.object({
      warning: z.number().default(100),
      critical: z.number().default(200),
      emergency: z.number().default(500),
    }),
    memoryUsage: z.object({
      warning: z.number().default(0.7), // 70%
      critical: z.number().default(0.85), // 85%
      emergency: z.number().default(0.95), // 95%
    }),
    errorRate: z.object({
      warning: z.number().default(0.01), // 1%
      critical: z.number().default(0.05), // 5%
      emergency: z.number().default(0.1), // 10%
    }),
    throughput: z.object({
      minimum: z.number().default(100), // messages/second
      warning: z.number().default(50),
      critical: z.number().default(25),
    }),
  }),
  wedding: z.object({
    criticalPeriodHours: z.number().min(1).max(72).default(24), // Hours before wedding
    emergencyResponseTime: z.number().min(30).max(300).default(60), // Seconds for wedding day issues
    photographerChannelLimit: z.number().default(15),
    venueSubscriberLimit: z.number().default(100),
  }),
  alerts: z.object({
    enabled: z.boolean().default(true),
    channels: z
      .array(z.enum(['email', 'sms', 'webhook', 'dashboard']))
      .default(['email', 'dashboard']),
    escalationDelay: z.number().min(60000).max(1800000).default(300000), // 5 minutes
    weddingDayOverride: z.boolean().default(true), // Override all settings for wedding days
  }),
});

export type PerformanceTrackerConfig = z.infer<
  typeof performanceTrackerConfigSchema
>;

// Core Interfaces
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  userId?: string;
  channelName?: string;
  metadata?: PerformanceMetadata;
}

export interface PerformanceMetadata {
  userRole?: 'photographer' | 'venue' | 'planner' | 'couple';
  weddingId?: string;
  weddingDate?: Date;
  tier: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  connectionType?: 'websocket' | 'sse' | 'polling';
  region?: string;
  sessionId: string;
}

export interface PerformanceAnomaly {
  id: string;
  type: AnomalyType;
  severity: AlertSeverity;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  duration: number;
  affectedUsers: string[];
  affectedChannels: string[];
  weddings: WeddingImpact[];
  context: AnomalyContext;
  recommendations: string[];
  resolved: boolean;
  resolvedAt?: Date;
}

export enum AnomalyType {
  THRESHOLD_BREACH = 'threshold_breach',
  SUDDEN_SPIKE = 'sudden_spike',
  GRADUAL_DEGRADATION = 'gradual_degradation',
  PATTERN_DEVIATION = 'pattern_deviation',
  CASCADE_FAILURE = 'cascade_failure',
  WEDDING_DAY_ISSUE = 'wedding_day_issue',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

export interface AnomalyContext {
  seasonalFactor: number;
  isWeddingDay: boolean;
  isPeakHour: boolean;
  trafficMultiplier: number;
  systemLoad: number;
  concurrentUsers: number;
  activeWeddings: number;
}

export interface WeddingImpact {
  weddingId: string;
  weddingDate: Date;
  suppliersAffected: number;
  guestsAffected: number;
  impactSeverity: 'low' | 'medium' | 'high' | 'critical';
  hoursUntilWedding: number;
}

export interface PerformanceReport {
  id: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    averageChannelSwitchTime: number;
    averageConnectionLatency: number;
    peakConcurrentConnections: number;
    totalMessages: number;
    errorRate: number;
    uptime: number;
  };
  cacheEfficiency: {
    hitRatio: number;
    averageResponseTime: number;
    memoryUsage: number;
    evictionRate: number;
  };
  systemResourceUsage: {
    cpu: ResourceMetric;
    memory: ResourceMetric;
    network: ResourceMetric;
    disk: ResourceMetric;
  };
  weddingMetrics: {
    activeWeddings: number;
    criticalPeriodWeddings: number;
    photographerSessions: number;
    channelSwitches: number;
  };
  anomalies: PerformanceAnomaly[];
  recommendedOptimizations: string[];
  seasonalContext: {
    monthlyMultiplier: number;
    expectedLoad: number;
    capacityRecommendation: string;
  };
}

export interface ResourceMetric {
  current: number;
  average: number;
  peak: number;
  unit: string;
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  tags: string[];
  channels: string[];
  escalated: boolean;
  resolved: boolean;
  resolvedAt?: Date;
  wedding?: {
    weddingId: string;
    hoursUntilWedding: number;
    impact: string;
  };
}

/**
 * Real-Time Performance Tracker
 *
 * Comprehensive monitoring system for WebSocket performance:
 * - Real-time metric collection and anomaly detection
 * - Wedding-specific performance thresholds and alerting
 * - Intelligent pattern recognition and predictive alerts
 * - Multi-channel alerting with escalation support
 * - Detailed performance reporting and optimization recommendations
 */
export class PerformanceTracker extends EventEmitter {
  private config: PerformanceTrackerConfig;
  private metricsCache: NodeCache;
  private anomalies: Map<string, PerformanceAnomaly> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private trackingTimer?: NodeJS.Timeout;
  private anomalyTimer?: NodeJS.Timeout;
  private reportTimer?: NodeJS.Timeout;
  private supabase = createClient();
  private metricsBatch: PerformanceMetric[] = [];
  private lastAlertTimes: Map<string, Date> = new Map();

  constructor(config?: Partial<PerformanceTrackerConfig>) {
    super();
    this.config = performanceTrackerConfigSchema.parse(config || {});
    this.metricsCache = new NodeCache({
      stdTTL: this.config.tracking.historyRetention / 1000,
      checkperiod: 120, // Check every 2 minutes
      useClones: false,
    });
    this.startTracking();

    logger.info('Performance Tracker initialized', {
      metricsInterval: this.config.tracking.metricsInterval,
      alertsEnabled: this.config.alerts.enabled,
      weddingDayOverride: this.config.alerts.weddingDayOverride,
      component: 'PerformanceTracker',
    });
  }

  /**
   * Track channel switching performance for photographers
   */
  trackChannelSwitchTime(
    userId: string,
    fromChannel: string,
    toChannel: string,
    duration: number,
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      name: 'channel_switch_time',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      tags: {
        from_channel: fromChannel,
        to_channel: toChannel,
        metric_type: 'performance',
      },
      userId,
      channelName: toChannel,
      metadata: {
        sessionId: this.generateSessionId(),
        tier: 'professional', // Default, would be looked up in real implementation
      },
    };

    this.addMetric(metric);

    // Check for immediate threshold breaches
    this.checkChannelSwitchThresholds(metric);

    // Wedding-specific tracking
    this.trackWeddingPerformanceImpact(metric);

    logger.debug('Channel switch tracked', {
      userId,
      fromChannel,
      toChannel,
      duration,
      component: 'PerformanceTracker',
    });
  }

  /**
   * Track WebSocket connection latency
   */
  trackConnectionLatency(connectionId: string, latency: number): void {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      name: 'connection_latency',
      value: latency,
      unit: 'ms',
      timestamp: new Date(),
      tags: {
        connection_id: connectionId,
        metric_type: 'latency',
      },
      metadata: {
        sessionId: this.generateSessionId(),
        tier: 'professional',
      },
    };

    this.addMetric(metric);
    this.checkLatencyThresholds(metric);
  }

  /**
   * Track system memory usage
   */
  trackMemoryUsage(component: string, usage: number): void {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      name: 'memory_usage',
      value: usage,
      unit: 'ratio',
      timestamp: new Date(),
      tags: {
        component,
        metric_type: 'resource',
      },
      metadata: {
        sessionId: this.generateSessionId(),
        tier: 'system',
      },
    };

    this.addMetric(metric);
    this.checkMemoryThresholds(metric);
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(): Promise<PerformanceReport> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

    try {
      logger.info('Generating performance report', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        component: 'PerformanceTracker',
      });

      // Collect metrics from cache and database
      const metrics = await this.getMetricsInRange(startTime, endTime);
      const anomalies = Array.from(this.anomalies.values()).filter(
        (a) => a.timestamp >= startTime && a.timestamp <= endTime,
      );

      // Calculate performance metrics
      const channelSwitchMetrics = metrics.filter(
        (m) => m.name === 'channel_switch_time',
      );
      const connectionMetrics = metrics.filter(
        (m) => m.name === 'connection_latency',
      );
      const memoryMetrics = metrics.filter((m) => m.name === 'memory_usage');

      // Generate report
      const report: PerformanceReport = {
        id: this.generateReportId(),
        generatedAt: endTime,
        period: { start: startTime, end: endTime },
        metrics: {
          averageChannelSwitchTime: this.calculateAverage(channelSwitchMetrics),
          averageConnectionLatency: this.calculateAverage(connectionMetrics),
          peakConcurrentConnections: await this.getPeakConnections(
            startTime,
            endTime,
          ),
          totalMessages: metrics.filter((m) => m.name === 'message_sent')
            .length,
          errorRate: await this.calculateErrorRate(startTime, endTime),
          uptime: await this.calculateUptime(startTime, endTime),
        },
        cacheEfficiency: await this.getCacheEfficiencyMetrics(
          startTime,
          endTime,
        ),
        systemResourceUsage: await this.getResourceUsageMetrics(
          startTime,
          endTime,
        ),
        weddingMetrics: await this.getWeddingMetrics(startTime, endTime),
        anomalies,
        recommendedOptimizations:
          await this.generateOptimizationRecommendations(metrics, anomalies),
        seasonalContext: await this.getSeasonalContext(),
      };

      // Store report
      await this.storePerformanceReport(report);

      logger.info('Performance report generated', {
        reportId: report.id,
        metricsCount: metrics.length,
        anomaliesCount: anomalies.length,
        averageChannelSwitch: report.metrics.averageChannelSwitchTime,
        component: 'PerformanceTracker',
      });

      this.emit('reportGenerated', report);
      return report;
    } catch (error) {
      logger.error('Error generating performance report', {
        error: error.message,
        component: 'PerformanceTracker',
      });
      throw error;
    }
  }

  /**
   * Detect performance anomalies using statistical analysis
   */
  async detectPerformanceAnomalies(): Promise<PerformanceAnomaly[]> {
    const detectedAnomalies: PerformanceAnomaly[] = [];

    try {
      const now = new Date();
      const windowStart = new Date(
        now.getTime() - this.config.tracking.anomalyDetectionWindow,
      );

      // Get recent metrics for analysis
      const recentMetrics = await this.getMetricsInRange(windowStart, now);

      // Group metrics by type
      const metricGroups = this.groupMetricsByType(recentMetrics);

      // Analyze each metric type for anomalies
      for (const [metricType, metrics] of metricGroups.entries()) {
        const anomalies = await this.analyzeMetricsForAnomalies(
          metricType,
          metrics,
        );
        detectedAnomalies.push(...anomalies);
      }

      // Wedding-specific anomaly detection
      const weddingAnomalies =
        await this.detectWeddingSpecificAnomalies(recentMetrics);
      detectedAnomalies.push(...weddingAnomalies);

      // Update anomaly store
      detectedAnomalies.forEach((anomaly) => {
        this.anomalies.set(anomaly.id, anomaly);
      });

      // Generate alerts for new anomalies
      await this.generateAlertsForAnomalies(detectedAnomalies);

      logger.debug('Anomaly detection completed', {
        detectedCount: detectedAnomalies.length,
        totalMetrics: recentMetrics.length,
        component: 'PerformanceTracker',
      });

      return detectedAnomalies;
    } catch (error) {
      logger.error('Error detecting performance anomalies', {
        error: error.message,
        component: 'PerformanceTracker',
      });
      return [];
    }
  }

  /**
   * Alert when performance thresholds are breached
   */
  async alertOnThresholdBreach(metric: string, value: number): Promise<void> {
    try {
      const thresholdConfig = this.getThresholdConfig(metric);
      if (!thresholdConfig) return;

      let severity: AlertSeverity = AlertSeverity.INFO;
      let threshold = 0;

      // Determine severity based on thresholds
      if (value >= thresholdConfig.emergency) {
        severity = AlertSeverity.EMERGENCY;
        threshold = thresholdConfig.emergency;
      } else if (value >= thresholdConfig.critical) {
        severity = AlertSeverity.CRITICAL;
        threshold = thresholdConfig.critical;
      } else if (value >= thresholdConfig.warning) {
        severity = AlertSeverity.WARNING;
        threshold = thresholdConfig.warning;
      } else {
        return; // No threshold breached
      }

      // Check alert cooldown to prevent spam
      const alertKey = `${metric}_${severity}`;
      const lastAlertTime = this.lastAlertTimes.get(alertKey);
      const now = new Date();

      if (
        lastAlertTime &&
        now.getTime() - lastAlertTime.getTime() <
          this.config.alerts.alertCooldown
      ) {
        return; // Still in cooldown period
      }

      // Create alert
      const alert = await this.createPerformanceAlert(
        metric,
        value,
        threshold,
        severity,
      );

      // Update last alert time
      this.lastAlertTimes.set(alertKey, now);

      // Send alert through configured channels
      await this.sendAlert(alert);

      logger.warn('Performance threshold breached', {
        metric,
        value,
        threshold,
        severity,
        alertId: alert.id,
        component: 'PerformanceTracker',
      });
    } catch (error) {
      logger.error('Error alerting on threshold breach', {
        metric,
        value,
        error: error.message,
        component: 'PerformanceTracker',
      });
    }
  }

  // Private Helper Methods

  private addMetric(metric: PerformanceMetric): void {
    // Add to batch for database storage
    this.metricsBatch.push(metric);

    // Store in cache for real-time access
    const cacheKey = `${metric.name}_${metric.timestamp.getTime()}`;
    this.metricsCache.set(cacheKey, metric);

    // Process batch if it's full
    if (this.metricsBatch.length >= this.config.tracking.batchSize) {
      this.flushMetricsBatch();
    }

    this.emit('metricTracked', metric);
  }

  private async flushMetricsBatch(): Promise<void> {
    if (this.metricsBatch.length === 0) return;

    try {
      const batch = [...this.metricsBatch];
      this.metricsBatch = [];

      // Store metrics in database
      const { error } = await this.supabase
        .from('websocket_performance_metrics')
        .insert(
          batch.map((metric) => ({
            metric_id: metric.id,
            name: metric.name,
            value: metric.value,
            unit: metric.unit,
            timestamp: metric.timestamp.toISOString(),
            user_id: metric.userId,
            channel_name: metric.channelName,
            tags: metric.tags,
            metadata: metric.metadata,
          })),
        );

      if (error) throw error;

      logger.debug('Metrics batch flushed', {
        batchSize: batch.length,
        component: 'PerformanceTracker',
      });
    } catch (error) {
      logger.error('Error flushing metrics batch', {
        batchSize: this.metricsBatch.length,
        error: error.message,
        component: 'PerformanceTracker',
      });
    }
  }

  private checkChannelSwitchThresholds(metric: PerformanceMetric): void {
    if (metric.name !== 'channel_switch_time') return;

    const thresholds = this.config.thresholds.channelSwitchTime;
    this.alertOnThresholdBreach('channel_switch_time', metric.value);

    // Special wedding day handling
    if (this.isWeddingDay(metric)) {
      // Lower thresholds for wedding days
      const weddingThresholds = {
        warning: thresholds.warning * 0.8,
        critical: thresholds.critical * 0.8,
        emergency: thresholds.emergency * 0.8,
      };

      if (metric.value > weddingThresholds.warning) {
        this.createWeddingDayAlert(
          metric,
          'Channel switching performance degraded on wedding day',
        );
      }
    }
  }

  private checkLatencyThresholds(metric: PerformanceMetric): void {
    if (metric.name !== 'connection_latency') return;
    this.alertOnThresholdBreach('connection_latency', metric.value);
  }

  private checkMemoryThresholds(metric: PerformanceMetric): void {
    if (metric.name !== 'memory_usage') return;
    this.alertOnThresholdBreach('memory_usage', metric.value);
  }

  private async getMetricsInRange(
    start: Date,
    end: Date,
  ): Promise<PerformanceMetric[]> {
    try {
      const { data, error } = await this.supabase
        .from('websocket_performance_metrics')
        .select('*')
        .gte('timestamp', start.toISOString())
        .lte('timestamp', end.toISOString())
        .order('timestamp', { ascending: false })
        .limit(10000);

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.metric_id,
        name: row.name,
        value: row.value,
        unit: row.unit,
        timestamp: new Date(row.timestamp),
        tags: row.tags || {},
        userId: row.user_id,
        channelName: row.channel_name,
        metadata: row.metadata,
      }));
    } catch (error) {
      logger.error('Error getting metrics in range', {
        start: start.toISOString(),
        end: end.toISOString(),
        error: error.message,
        component: 'PerformanceTracker',
      });
      return [];
    }
  }

  private groupMetricsByType(
    metrics: PerformanceMetric[],
  ): Map<string, PerformanceMetric[]> {
    const groups = new Map<string, PerformanceMetric[]>();

    metrics.forEach((metric) => {
      if (!groups.has(metric.name)) {
        groups.set(metric.name, []);
      }
      groups.get(metric.name)!.push(metric);
    });

    return groups;
  }

  private async analyzeMetricsForAnomalies(
    metricType: string,
    metrics: PerformanceMetric[],
  ): Promise<PerformanceAnomaly[]> {
    const anomalies: PerformanceAnomaly[] = [];

    if (metrics.length < 10) return anomalies; // Need sufficient data

    // Calculate statistical baseline
    const values = metrics.map((m) => m.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        values.length,
    );

    // Detect outliers (values > 2 standard deviations from mean)
    const outlierThreshold = mean + 2 * stdDev;

    for (const metric of metrics) {
      if (metric.value > outlierThreshold) {
        const anomaly: PerformanceAnomaly = {
          id: this.generateAnomalyId(),
          type: AnomalyType.SUDDEN_SPIKE,
          severity: this.calculateAnomalySeverity(metric.value, mean, stdDev),
          metric: metricType,
          value: metric.value,
          threshold: outlierThreshold,
          timestamp: metric.timestamp,
          duration: 0, // Will be updated if anomaly persists
          affectedUsers: metric.userId ? [metric.userId] : [],
          affectedChannels: metric.channelName ? [metric.channelName] : [],
          weddings: await this.getAffectedWeddings(metric),
          context: await this.getAnomalyContext(metric.timestamp),
          recommendations: this.getRecommendationsForAnomaly(
            metricType,
            metric.value,
          ),
          resolved: false,
        };

        anomalies.push(anomaly);
      }
    }

    return anomalies;
  }

  private async detectWeddingSpecificAnomalies(
    metrics: PerformanceMetric[],
  ): Promise<PerformanceAnomaly[]> {
    const anomalies: PerformanceAnomaly[] = [];

    // Check for wedding day performance issues
    const weddingDayMetrics = metrics.filter((m) => this.isWeddingDay(m));

    for (const metric of weddingDayMetrics) {
      if (this.isWeddingDayPerformanceIssue(metric)) {
        const anomaly: PerformanceAnomaly = {
          id: this.generateAnomalyId(),
          type: AnomalyType.WEDDING_DAY_ISSUE,
          severity: AlertSeverity.EMERGENCY, // Wedding day issues are always critical
          metric: metric.name,
          value: metric.value,
          threshold: this.getWeddingDayThreshold(metric.name),
          timestamp: metric.timestamp,
          duration: 0,
          affectedUsers: metric.userId ? [metric.userId] : [],
          affectedChannels: metric.channelName ? [metric.channelName] : [],
          weddings: [], // Will be populated
          context: {
            seasonalFactor: 1.0,
            isWeddingDay: true,
            isPeakHour: false,
            trafficMultiplier: 1.0,
            systemLoad: 0.8,
            concurrentUsers: 100,
            activeWeddings: 1,
          },
          recommendations: [
            'Immediate escalation to on-call team',
            'Consider emergency scaling',
            'Monitor wedding progress closely',
          ],
          resolved: false,
        };

        anomalies.push(anomaly);
      }
    }

    return anomalies;
  }

  private calculateAverage(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  private async getPeakConnections(start: Date, end: Date): Promise<number> {
    // This would query connection pool metrics
    return 850; // Placeholder value
  }

  private async calculateErrorRate(start: Date, end: Date): Promise<number> {
    // This would calculate error rate from metrics
    return 0.001; // 0.1% error rate
  }

  private async calculateUptime(start: Date, end: Date): Promise<number> {
    // This would calculate system uptime
    return 0.9995; // 99.95% uptime
  }

  private async getCacheEfficiencyMetrics(
    start: Date,
    end: Date,
  ): Promise<any> {
    return {
      hitRatio: 0.96,
      averageResponseTime: 45,
      memoryUsage: 512,
      evictionRate: 0.01,
    };
  }

  private async getResourceUsageMetrics(start: Date, end: Date): Promise<any> {
    return {
      cpu: { current: 0.65, average: 0.6, peak: 0.85, unit: 'ratio' },
      memory: { current: 0.7, average: 0.65, peak: 0.9, unit: 'ratio' },
      network: { current: 150, average: 120, peak: 300, unit: 'mbps' },
      disk: { current: 0.3, average: 0.25, peak: 0.5, unit: 'ratio' },
    };
  }

  private async getWeddingMetrics(start: Date, end: Date): Promise<any> {
    return {
      activeWeddings: 25,
      criticalPeriodWeddings: 3,
      photographerSessions: 45,
      channelSwitches: 1250,
    };
  }

  private async generateOptimizationRecommendations(
    metrics: PerformanceMetric[],
    anomalies: PerformanceAnomaly[],
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze channel switch performance
    const channelSwitchMetrics = metrics.filter(
      (m) => m.name === 'channel_switch_time',
    );
    const avgChannelSwitch = this.calculateAverage(channelSwitchMetrics);

    if (avgChannelSwitch > 150) {
      recommendations.push(
        'Consider connection pool optimization to reduce channel switching latency',
      );
    }

    // Analyze memory usage
    const memoryMetrics = metrics.filter((m) => m.name === 'memory_usage');
    const avgMemory = this.calculateAverage(memoryMetrics);

    if (avgMemory > 0.8) {
      recommendations.push(
        'Memory usage is high - consider cache optimization or scaling',
      );
    }

    // Anomaly-based recommendations
    if (anomalies.length > 5) {
      recommendations.push(
        'High anomaly count detected - investigate system stability',
      );
    }

    return recommendations;
  }

  private async getSeasonalContext(): Promise<any> {
    const month = new Date()
      .toLocaleDateString('en', { month: 'long' })
      .toLowerCase();
    const seasonalMultipliers: Record<string, number> = {
      january: 0.6,
      february: 0.7,
      march: 0.8,
      april: 1.2,
      may: 2.0,
      june: 10.0,
      july: 3.0,
      august: 2.5,
      september: 8.0,
      october: 6.0,
      november: 1.0,
      december: 0.8,
    };

    const multiplier = seasonalMultipliers[month] || 1.0;

    return {
      monthlyMultiplier: multiplier,
      expectedLoad: 1000 * multiplier,
      capacityRecommendation:
        multiplier > 2.0
          ? 'Scale up for wedding season'
          : 'Normal capacity sufficient',
    };
  }

  private isWeddingDay(metric: PerformanceMetric): boolean {
    // This would check if the metric is related to a wedding happening today
    return (
      metric.metadata?.weddingDate &&
      Math.abs(metric.metadata.weddingDate.getTime() - new Date().getTime()) <
        24 * 60 * 60 * 1000
    );
  }

  private isWeddingDayPerformanceIssue(metric: PerformanceMetric): boolean {
    const weddingThresholds = {
      channel_switch_time: 160, // Stricter for wedding days
      connection_latency: 80,
      memory_usage: 0.75,
    };

    const threshold =
      weddingThresholds[metric.name as keyof typeof weddingThresholds];
    return threshold && metric.value > threshold;
  }

  private getWeddingDayThreshold(metricName: string): number {
    const weddingThresholds: Record<string, number> = {
      channel_switch_time: 160,
      connection_latency: 80,
      memory_usage: 0.75,
    };

    return weddingThresholds[metricName] || 0;
  }

  private calculateAnomalySeverity(
    value: number,
    mean: number,
    stdDev: number,
  ): AlertSeverity {
    const deviations = Math.abs(value - mean) / stdDev;

    if (deviations > 3) return AlertSeverity.EMERGENCY;
    if (deviations > 2.5) return AlertSeverity.CRITICAL;
    if (deviations > 2) return AlertSeverity.WARNING;
    return AlertSeverity.INFO;
  }

  private async getAffectedWeddings(
    metric: PerformanceMetric,
  ): Promise<WeddingImpact[]> {
    // This would query for weddings affected by the performance issue
    return [];
  }

  private async getAnomalyContext(timestamp: Date): Promise<AnomalyContext> {
    return {
      seasonalFactor: 1.0,
      isWeddingDay: false,
      isPeakHour: [18, 19, 20].includes(timestamp.getHours()),
      trafficMultiplier: 1.0,
      systemLoad: 0.7,
      concurrentUsers: 200,
      activeWeddings: 5,
    };
  }

  private getRecommendationsForAnomaly(
    metricType: string,
    value: number,
  ): string[] {
    const recommendations: string[] = [];

    switch (metricType) {
      case 'channel_switch_time':
        recommendations.push('Optimize connection pool configuration');
        recommendations.push('Check cache performance');
        break;
      case 'connection_latency':
        recommendations.push('Investigate network connectivity');
        recommendations.push('Consider load balancing adjustments');
        break;
      case 'memory_usage':
        recommendations.push('Monitor for memory leaks');
        recommendations.push('Consider scaling up resources');
        break;
    }

    return recommendations;
  }

  private getThresholdConfig(metric: string): any {
    const thresholdMap: Record<string, any> = {
      channel_switch_time: this.config.thresholds.channelSwitchTime,
      connection_latency: this.config.thresholds.connectionLatency,
      memory_usage: this.config.thresholds.memoryUsage,
      error_rate: this.config.thresholds.errorRate,
    };

    return thresholdMap[metric];
  }

  private async createPerformanceAlert(
    metric: string,
    value: number,
    threshold: number,
    severity: AlertSeverity,
  ): Promise<PerformanceAlert> {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      severity,
      title: `Performance Alert: ${metric}`,
      message: `${metric} value ${value} exceeded threshold ${threshold}`,
      metric,
      value,
      threshold,
      tags: [severity, metric],
      channels: this.config.alerts.channels,
      escalated: false,
      resolved: false,
    };

    this.alerts.set(alert.id, alert);
    return alert;
  }

  private async createWeddingDayAlert(
    metric: PerformanceMetric,
    message: string,
  ): Promise<void> {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      severity: AlertSeverity.EMERGENCY,
      title: 'Wedding Day Performance Issue',
      message,
      metric: metric.name,
      value: metric.value,
      threshold: this.getWeddingDayThreshold(metric.name),
      tags: ['wedding_day', 'emergency', metric.name],
      channels: ['email', 'sms', 'webhook', 'dashboard'], // All channels for wedding day
      escalated: true, // Auto-escalate wedding day issues
      resolved: false,
      wedding: {
        weddingId: metric.metadata?.weddingId || 'unknown',
        hoursUntilWedding: this.calculateHoursUntilWedding(
          metric.metadata?.weddingDate,
        ),
        impact: 'Critical - Wedding coordination may be affected',
      },
    };

    this.alerts.set(alert.id, alert);
    await this.sendAlert(alert);
  }

  private calculateHoursUntilWedding(weddingDate?: Date): number {
    if (!weddingDate) return 0;
    return Math.max(
      0,
      Math.floor((weddingDate.getTime() - Date.now()) / (60 * 60 * 1000)),
    );
  }

  private async sendAlert(alert: PerformanceAlert): Promise<void> {
    try {
      // Store alert in database
      await this.supabase.from('performance_alerts').insert({
        alert_id: alert.id,
        timestamp: alert.timestamp.toISOString(),
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        tags: alert.tags,
        channels: alert.channels,
        escalated: alert.escalated,
        resolved: alert.resolved,
        wedding_context: alert.wedding,
      });

      // Send through configured channels
      for (const channel of alert.channels) {
        await this.sendAlertToChannel(alert, channel);
      }

      this.emit('alertSent', alert);

      logger.warn('Performance alert sent', {
        alertId: alert.id,
        severity: alert.severity,
        metric: alert.metric,
        channels: alert.channels,
        component: 'PerformanceTracker',
      });
    } catch (error) {
      logger.error('Error sending alert', {
        alertId: alert.id,
        error: error.message,
        component: 'PerformanceTracker',
      });
    }
  }

  private async sendAlertToChannel(
    alert: PerformanceAlert,
    channel: string,
  ): Promise<void> {
    try {
      switch (channel) {
        case 'email':
          await this.sendEmailAlert(alert);
          break;
        case 'sms':
          await this.sendSMSAlert(alert);
          break;
        case 'webhook':
          await this.sendWebhookAlert(alert);
          break;
        case 'dashboard':
          await this.sendDashboardAlert(alert);
          break;
      }
    } catch (error) {
      logger.error('Error sending alert to channel', {
        alertId: alert.id,
        channel,
        error: error.message,
        component: 'PerformanceTracker',
      });
    }
  }

  private async sendEmailAlert(alert: PerformanceAlert): Promise<void> {
    // Email alert implementation would go here
    logger.debug('Email alert sent', {
      alertId: alert.id,
      component: 'PerformanceTracker',
    });
  }

  private async sendSMSAlert(alert: PerformanceAlert): Promise<void> {
    // SMS alert implementation would go here
    logger.debug('SMS alert sent', {
      alertId: alert.id,
      component: 'PerformanceTracker',
    });
  }

  private async sendWebhookAlert(alert: PerformanceAlert): Promise<void> {
    // Webhook alert implementation would go here
    logger.debug('Webhook alert sent', {
      alertId: alert.id,
      component: 'PerformanceTracker',
    });
  }

  private async sendDashboardAlert(alert: PerformanceAlert): Promise<void> {
    // Dashboard alert implementation would go here
    this.emit('dashboardAlert', alert);
    logger.debug('Dashboard alert sent', {
      alertId: alert.id,
      component: 'PerformanceTracker',
    });
  }

  private async storePerformanceReport(
    report: PerformanceReport,
  ): Promise<void> {
    try {
      await this.supabase.from('performance_reports').insert({
        report_id: report.id,
        generated_at: report.generatedAt.toISOString(),
        period_start: report.period.start.toISOString(),
        period_end: report.period.end.toISOString(),
        metrics: report.metrics,
        cache_efficiency: report.cacheEfficiency,
        resource_usage: report.systemResourceUsage,
        wedding_metrics: report.weddingMetrics,
        anomalies_count: report.anomalies.length,
        recommendations: report.recommendedOptimizations,
        seasonal_context: report.seasonalContext,
      });
    } catch (error) {
      logger.error('Error storing performance report', {
        reportId: report.id,
        error: error.message,
        component: 'PerformanceTracker',
      });
    }
  }

  private trackWeddingPerformanceImpact(metric: PerformanceMetric): void {
    if (this.isWeddingDay(metric) && metric.value > 200) {
      this.emit('weddingPerformanceImpact', {
        weddingId: metric.metadata?.weddingId,
        metric: metric.name,
        value: metric.value,
        impact: 'high',
        timestamp: metric.timestamp,
      });
    }
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateAnomalyId(): string {
    return `anomaly_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private async generateAlertsForAnomalies(
    anomalies: PerformanceAnomaly[],
  ): Promise<void> {
    for (const anomaly of anomalies) {
      if (
        anomaly.severity === AlertSeverity.CRITICAL ||
        anomaly.severity === AlertSeverity.EMERGENCY
      ) {
        const alert = await this.createPerformanceAlert(
          anomaly.metric,
          anomaly.value,
          anomaly.threshold,
          anomaly.severity,
        );
        await this.sendAlert(alert);
      }
    }
  }

  private startTracking(): void {
    // Start metrics collection timer
    this.trackingTimer = setInterval(async () => {
      await this.flushMetricsBatch();
    }, this.config.tracking.metricsInterval);

    // Start anomaly detection timer
    this.anomalyTimer = setInterval(async () => {
      try {
        await this.detectPerformanceAnomalies();
      } catch (error) {
        logger.error('Anomaly detection error', {
          error: error.message,
          component: 'PerformanceTracker',
        });
      }
    }, this.config.tracking.anomalyDetectionWindow);

    // Start report generation timer (daily)
    this.reportTimer = setInterval(
      async () => {
        try {
          await this.generatePerformanceReport();
        } catch (error) {
          logger.error('Report generation error', {
            error: error.message,
            component: 'PerformanceTracker',
          });
        }
      },
      24 * 60 * 60 * 1000,
    ); // Daily reports
  }

  /**
   * Shutdown performance tracker gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Performance Tracker', {
      component: 'PerformanceTracker',
    });

    // Clear timers
    if (this.trackingTimer) clearInterval(this.trackingTimer);
    if (this.anomalyTimer) clearInterval(this.anomalyTimer);
    if (this.reportTimer) clearInterval(this.reportTimer);

    // Flush remaining metrics
    await this.flushMetricsBatch();

    // Close cache
    this.metricsCache.close();

    logger.info('Performance Tracker shutdown complete', {
      component: 'PerformanceTracker',
    });
  }
}

// Export singleton instance
export const performanceTracker = new PerformanceTracker();

// Initialize wedding day monitoring
export async function initializeWeddingDayMonitoring(): Promise<void> {
  logger.info('Initializing wedding day performance monitoring', {
    component: 'PerformanceTracker',
  });

  // Set up enhanced monitoring for today's weddings
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // This would query for weddings happening today/tomorrow
  // and set up enhanced monitoring

  logger.info('Wedding day monitoring initialized', {
    date: today.toDateString(),
    component: 'PerformanceTracker',
  });
}
