/**
 * WS-241 AI Cache Performance Monitoring Integration
 * Real-time performance tracking and alerting for AI cache system
 */

import type {
  CachePerformanceMetrics,
  CacheAlert,
  SupplierType,
  CacheType,
  WeddingSeason,
} from '@/types/ai-cache';

// Performance monitoring configuration
interface PerformanceMonitorConfig {
  metricsInterval: number; // milliseconds
  alertThresholds: Record<string, number>;
  maxMetricsHistory: number;
  enableRealTimeAlerts: boolean;
  weddingSeasonMultipliers: Record<WeddingSeason, number>;
}

// Performance event types
type PerformanceEvent =
  | {
      type: 'cache_hit';
      duration: number;
      cacheType: CacheType;
      quality: number;
    }
  | { type: 'cache_miss'; duration: number; cacheType: CacheType }
  | { type: 'cache_warm'; duration: number; queriesWarmed: number }
  | { type: 'cache_clear'; entriesCleared: number; storageFreed: string }
  | {
      type: 'threshold_breach';
      metric: string;
      value: number;
      threshold: number;
    };

// Performance alert callback
type AlertCallback = (alert: CacheAlert) => void;

class CachePerformanceMonitor {
  private config: PerformanceMonitorConfig;
  private metricsHistory: CachePerformanceMetrics[] = [];
  private activeAlerts: Map<string, CacheAlert> = new Map();
  private alertCallbacks: AlertCallback[] = [];
  private metricsInterval: NodeJS.Timeout | null = null;
  private eventBuffer: PerformanceEvent[] = [];
  private lastMetricsFlush = Date.now();

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    this.config = {
      metricsInterval: 30000, // 30 seconds
      alertThresholds: {
        hit_rate: 70, // Below 70% is concerning
        response_time: 200, // Above 200ms is slow
        error_rate: 5, // Above 5% errors is problematic
        storage_usage: 85, // Above 85% storage is concerning
      },
      maxMetricsHistory: 1000, // Keep last 1000 metrics
      enableRealTimeAlerts: true,
      weddingSeasonMultipliers: {
        peak: 1.5, // Higher thresholds during peak season
        shoulder: 1.2,
        off: 0.8,
        holiday: 1.1,
      },
      ...config,
    };
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.metricsInterval) {
      this.stop();
    }

    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);

    console.log('Cache performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    console.log('Cache performance monitoring stopped');
  }

  /**
   * Record a performance event
   */
  recordEvent(event: PerformanceEvent): void {
    this.eventBuffer.push(event);

    // Process event immediately for real-time alerts
    if (this.config.enableRealTimeAlerts) {
      this.processEventForAlerts(event);
    }

    // Flush buffer if it gets too large
    if (this.eventBuffer.length > 100) {
      this.flushEventBuffer();
    }
  }

  /**
   * Add alert callback
   */
  onAlert(callback: AlertCallback): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): CachePerformanceMetrics | null {
    return this.metricsHistory.length > 0
      ? this.metricsHistory[this.metricsHistory.length - 1]
      : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): CachePerformanceMetrics[] {
    const history = [...this.metricsHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): CacheAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.activeAlerts.delete(alertId);
      console.log(`Alert resolved: ${alert.message}`);
    }
  }

  /**
   * Get performance insights
   */
  getPerformanceInsights(): Array<{
    title: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    significance: 'high' | 'medium' | 'low';
  }> {
    const insights = [];
    const recentMetrics = this.metricsHistory.slice(-10);

    if (recentMetrics.length >= 2) {
      const current = recentMetrics[recentMetrics.length - 1];
      const previous = recentMetrics[recentMetrics.length - 2];

      // Hit rate trend
      const hitRateDiff = current.hitRate - previous.hitRate;
      insights.push({
        title: 'Cache Hit Rate Trend',
        value: `${current.hitRate.toFixed(1)}%`,
        trend: hitRateDiff > 1 ? 'up' : hitRateDiff < -1 ? 'down' : 'stable',
        significance:
          Math.abs(hitRateDiff) > 5
            ? 'high'
            : Math.abs(hitRateDiff) > 2
              ? 'medium'
              : 'low',
      });

      // Response time trend
      const responseTimeDiff =
        current.averageResponseTime - previous.averageResponseTime;
      insights.push({
        title: 'Response Time Trend',
        value: `${current.averageResponseTime.toFixed(0)}ms`,
        trend:
          responseTimeDiff < -10
            ? 'up'
            : responseTimeDiff > 10
              ? 'down'
              : 'stable',
        significance:
          Math.abs(responseTimeDiff) > 50
            ? 'high'
            : Math.abs(responseTimeDiff) > 20
              ? 'medium'
              : 'low',
      });

      // Cost savings trend
      const costSavingsDiff = current.costSavings - previous.costSavings;
      insights.push({
        title: 'Cost Optimization',
        value: `£${current.costSavings.toFixed(2)}`,
        trend:
          costSavingsDiff > 0.1
            ? 'up'
            : costSavingsDiff < -0.1
              ? 'down'
              : 'stable',
        significance:
          Math.abs(costSavingsDiff) > 1
            ? 'high'
            : Math.abs(costSavingsDiff) > 0.3
              ? 'medium'
              : 'low',
      });
    }

    return insights;
  }

  /**
   * Set wedding season context for adjusted thresholds
   */
  setWeddingSeason(season: WeddingSeason): void {
    const multiplier = this.config.weddingSeasonMultipliers[season];

    // Adjust thresholds based on wedding season
    Object.keys(this.config.alertThresholds).forEach((metric) => {
      this.config.alertThresholds[metric] *= multiplier;
    });

    console.log(
      `Adjusted performance thresholds for ${season} season (${multiplier}x)`,
    );
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(timeRange: 'hour' | 'day' | 'week' = 'day'): {
    summary: Record<string, any>;
    alerts: CacheAlert[];
    recommendations: string[];
  } {
    const now = Date.now();
    const timeRanges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - timeRanges[timeRange];
    const relevantMetrics = this.metricsHistory.filter(
      (m) => new Date(m.timestamp).getTime() > cutoff,
    );

    if (relevantMetrics.length === 0) {
      return {
        summary: { message: 'No metrics available for selected time range' },
        alerts: [],
        recommendations: [],
      };
    }

    // Calculate summary statistics
    const avgHitRate =
      relevantMetrics.reduce((sum, m) => sum + m.hitRate, 0) /
      relevantMetrics.length;
    const avgResponseTime =
      relevantMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) /
      relevantMetrics.length;
    const totalSavings = relevantMetrics.reduce(
      (sum, m) => sum + m.costSavings,
      0,
    );

    const summary = {
      timeRange,
      metricPoints: relevantMetrics.length,
      averageHitRate: avgHitRate,
      averageResponseTime: avgResponseTime,
      totalCostSavings: totalSavings,
      uptime: this.calculateUptime(relevantMetrics),
      performanceGrade: this.calculatePerformanceGrade(
        avgHitRate,
        avgResponseTime,
      ),
    };

    // Get recent alerts
    const recentAlerts = Array.from(this.activeAlerts.values()).filter(
      (alert) => new Date(alert.timestamp).getTime() > cutoff,
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, recentAlerts);

    return {
      summary,
      alerts: recentAlerts,
      recommendations,
    };
  }

  // Private methods

  private async collectMetrics(): Promise<void> {
    try {
      // Flush any pending events
      this.flushEventBuffer();

      // Collect current performance data
      const metrics = await this.gatherCurrentMetrics();

      if (metrics) {
        this.metricsHistory.push(metrics);

        // Maintain history size limit
        if (this.metricsHistory.length > this.config.maxMetricsHistory) {
          this.metricsHistory.shift();
        }

        // Check for threshold breaches
        this.checkThresholds(metrics);
      }
    } catch (error) {
      console.error('Error collecting cache performance metrics:', error);
    }
  }

  private async gatherCurrentMetrics(): Promise<CachePerformanceMetrics | null> {
    try {
      // This would integrate with actual cache service
      // For now, simulate metrics based on recent events
      const hitEvents = this.eventBuffer.filter((e) => e.type === 'cache_hit');
      const missEvents = this.eventBuffer.filter(
        (e) => e.type === 'cache_miss',
      );

      const totalEvents = hitEvents.length + missEvents.length;
      const hitRate =
        totalEvents > 0 ? (hitEvents.length / totalEvents) * 100 : 0;

      const avgResponseTime =
        hitEvents.length > 0
          ? hitEvents.reduce((sum, e) => sum + e.duration, 0) / hitEvents.length
          : 100;

      return {
        timestamp: new Date().toISOString(),
        hitRate,
        missRate: 100 - hitRate,
        averageResponseTime: avgResponseTime,
        p95ResponseTime: avgResponseTime * 1.5,
        p99ResponseTime: avgResponseTime * 2,
        errorRate: 0, // Would be calculated from actual error events
        throughput: totalEvents / (this.config.metricsInterval / 1000), // events per second
        storageEfficiency: 85, // Would come from cache service
        costSavings: hitRate * 0.01, // Simplified calculation
      };
    } catch (error) {
      console.error('Error gathering metrics:', error);
      return null;
    }
  }

  private checkThresholds(metrics: CachePerformanceMetrics): void {
    // Check hit rate
    if (metrics.hitRate < this.config.alertThresholds.hit_rate) {
      this.createAlert(
        'hit_rate',
        'Cache hit rate below threshold',
        'medium',
        metrics.hitRate,
      );
    }

    // Check response time
    if (
      metrics.averageResponseTime > this.config.alertThresholds.response_time
    ) {
      this.createAlert(
        'response_time',
        'Cache response time above threshold',
        'high',
        metrics.averageResponseTime,
      );
    }

    // Check error rate
    if (metrics.errorRate > this.config.alertThresholds.error_rate) {
      this.createAlert(
        'error_rate',
        'Cache error rate above threshold',
        'high',
        metrics.errorRate,
      );
    }
  }

  private createAlert(
    metric: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    value: number,
  ): void {
    const alertId = `${metric}-${Date.now()}`;
    const alert: CacheAlert = {
      id: alertId,
      timestamp: new Date().toISOString(),
      severity,
      metric,
      threshold: this.config.alertThresholds[metric],
      actualValue: value,
      message,
      supplierImpact: [], // Would be determined based on context
      recommendedActions: this.getRecommendedActions(metric, value),
      resolved: false,
    };

    this.activeAlerts.set(alertId, alert);

    // Notify callbacks
    this.alertCallbacks.forEach((callback) => callback(alert));

    console.warn(`Cache performance alert: ${message} (${value})`);
  }

  private getRecommendedActions(metric: string, value: number): string[] {
    switch (metric) {
      case 'hit_rate':
        return [
          'Consider warming popular queries',
          'Review semantic thresholds',
          'Analyze query patterns for optimization opportunities',
        ];
      case 'response_time':
        return [
          'Check cache storage performance',
          'Optimize query processing',
          'Consider increasing cache capacity',
        ];
      case 'error_rate':
        return [
          'Review cache service logs',
          'Check storage connectivity',
          'Verify configuration settings',
        ];
      default:
        return ['Review cache configuration and performance settings'];
    }
  }

  private processEventForAlerts(event: PerformanceEvent): void {
    if (event.type === 'threshold_breach') {
      this.createAlert(
        event.metric,
        'Real-time threshold breach detected',
        'high',
        event.value,
      );
    }
  }

  private flushEventBuffer(): void {
    // Process accumulated events for metrics calculation
    this.lastMetricsFlush = Date.now();
    // Clear the buffer after processing
    this.eventBuffer = [];
  }

  private calculateUptime(metrics: CachePerformanceMetrics[]): number {
    // Simplified uptime calculation based on error rates
    const avgErrorRate =
      metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
    return Math.max(0, 100 - avgErrorRate);
  }

  private calculatePerformanceGrade(
    hitRate: number,
    responseTime: number,
  ): string {
    if (hitRate >= 90 && responseTime <= 100) return 'A+';
    if (hitRate >= 85 && responseTime <= 150) return 'A';
    if (hitRate >= 80 && responseTime <= 200) return 'B+';
    if (hitRate >= 75 && responseTime <= 300) return 'B';
    if (hitRate >= 70 && responseTime <= 400) return 'C+';
    if (hitRate >= 65 && responseTime <= 500) return 'C';
    return 'D';
  }

  private generateRecommendations(
    summary: Record<string, any>,
    alerts: CacheAlert[],
  ): string[] {
    const recommendations = [];

    if (summary.averageHitRate < 80) {
      recommendations.push(
        'Implement aggressive cache warming strategy for popular queries',
      );
    }

    if (summary.averageResponseTime > 200) {
      recommendations.push(
        'Optimize cache storage configuration for faster retrieval',
      );
    }

    if (alerts.length > 5) {
      recommendations.push('Review alerting thresholds - may be too sensitive');
    }

    if (summary.totalCostSavings < 10) {
      recommendations.push(
        'Analyze query patterns to identify optimization opportunities',
      );
    }

    return recommendations;
  }
}

// Export singleton instance
export const cachePerformanceMonitor = new CachePerformanceMonitor();

// Export class for custom instances
export { CachePerformanceMonitor };

// Export types
export type { PerformanceEvent, AlertCallback, PerformanceMonitorConfig };
