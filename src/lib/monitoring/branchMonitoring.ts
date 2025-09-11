/**
 * Production Monitoring for Journey Branching System
 * Monitors performance, errors, and business metrics
 */

import { BranchExecution, ConversionEvent } from '../analytics/branchAnalytics';

export interface MonitoringAlert {
  id: string;
  type: 'performance' | 'error' | 'business' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metrics: Record<string, number>;
  timestamp: Date;
  resolved: boolean;
  branchId?: string;
  journeyId?: string;
}

export interface PerformanceThresholds {
  maxExecutionTime: number; // milliseconds
  maxErrorRate: number; // percentage
  minConversionRate: number; // percentage
  maxMemoryUsage: number; // MB
  maxConcurrentExecutions: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  performanceThresholds: PerformanceThresholds;
  alertChannels: {
    email: boolean;
    slack: boolean;
    sms: boolean;
    webhook?: string;
  };
  businessMetrics: {
    trackRevenue: boolean;
    trackConversions: boolean;
    trackUserExperience: boolean;
  };
}

export class BranchMonitoring {
  private config: MonitoringConfig;
  private alerts: Map<string, MonitoringAlert> = new Map();
  private metrics: Map<string, number[]> = new Map();
  private lastHealthCheck: Date = new Date();
  private healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.initializeMonitoring();
  }

  /**
   * Monitor branch execution in real-time
   */
  monitorExecution(execution: BranchExecution): void {
    if (!this.config.enabled) return;

    // Performance monitoring
    this.trackPerformanceMetric('execution_time', execution.executionTime);
    this.trackPerformanceMetric('condition_count', execution.conditions.total);

    // Check performance thresholds
    if (
      execution.executionTime >
      this.config.performanceThresholds.maxExecutionTime
    ) {
      this.createAlert({
        type: 'performance',
        severity:
          execution.executionTime >
          this.config.performanceThresholds.maxExecutionTime * 2
            ? 'critical'
            : 'high',
        title: 'Slow Branch Execution Detected',
        description: `Branch ${execution.branchId} executed in ${execution.executionTime}ms (threshold: ${this.config.performanceThresholds.maxExecutionTime}ms)`,
        metrics: {
          executionTime: execution.executionTime,
          threshold: this.config.performanceThresholds.maxExecutionTime,
          branchId: execution.branchId,
        },
        branchId: execution.branchId,
        journeyId: execution.journeyId,
      });
    }

    // Error monitoring
    if (execution.metadata?.error) {
      this.createAlert({
        type: 'error',
        severity: 'high',
        title: 'Branch Execution Error',
        description: `Error in branch ${execution.branchId}: ${execution.metadata.error}`,
        metrics: {
          errorCount: 1,
          branchId: execution.branchId,
        },
        branchId: execution.branchId,
        journeyId: execution.journeyId,
      });
    }

    // Business metrics monitoring
    if (this.config.businessMetrics.trackConversions) {
      this.trackBusinessMetric(
        `conversions_${execution.branchId}`,
        execution.result ? 1 : 0,
      );
    }

    // Memory usage monitoring
    this.monitorMemoryUsage();
  }

  /**
   * Monitor conversion events
   */
  monitorConversion(conversion: ConversionEvent): void {
    if (!this.config.enabled) return;

    // Track conversion metrics
    this.trackBusinessMetric('total_conversions', 1);
    this.trackBusinessMetric(`branch_conversions_${conversion.branchId}`, 1);

    if (this.config.businessMetrics.trackRevenue && conversion.eventValue) {
      this.trackBusinessMetric('revenue', conversion.eventValue);
      this.trackBusinessMetric(
        `branch_revenue_${conversion.branchId}`,
        conversion.eventValue,
      );
    }

    // Check conversion rate trends
    this.checkConversionRateTrends(conversion.branchId);
  }

  /**
   * Health check for the entire system
   */
  performHealthCheck(): {
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      message: string;
      metrics?: Record<string, number>;
    }>;
    timestamp: Date;
  } {
    const checks = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Performance health check
    const avgExecutionTime = this.getAverageMetric('execution_time', 300); // Last 5 minutes
    if (avgExecutionTime > this.config.performanceThresholds.maxExecutionTime) {
      checks.push({
        name: 'Performance',
        status: 'fail',
        message: `Average execution time (${avgExecutionTime.toFixed(2)}ms) exceeds threshold`,
        metrics: {
          avgExecutionTime,
          threshold: this.config.performanceThresholds.maxExecutionTime,
        },
      });
      overallStatus = 'critical';
    } else if (
      avgExecutionTime >
      this.config.performanceThresholds.maxExecutionTime * 0.8
    ) {
      checks.push({
        name: 'Performance',
        status: 'warn',
        message: `Average execution time approaching threshold`,
        metrics: {
          avgExecutionTime,
          threshold: this.config.performanceThresholds.maxExecutionTime,
        },
      });
      if (overallStatus === 'healthy') overallStatus = 'warning';
    } else {
      checks.push({
        name: 'Performance',
        status: 'pass',
        message: 'Performance within acceptable limits',
        metrics: { avgExecutionTime },
      });
    }

    // Error rate health check
    const errorRate = this.getErrorRate(300); // Last 5 minutes
    if (errorRate > this.config.performanceThresholds.maxErrorRate) {
      checks.push({
        name: 'Error Rate',
        status: 'fail',
        message: `Error rate (${errorRate.toFixed(2)}%) exceeds threshold`,
        metrics: {
          errorRate,
          threshold: this.config.performanceThresholds.maxErrorRate,
        },
      });
      overallStatus = 'critical';
    } else if (
      errorRate >
      this.config.performanceThresholds.maxErrorRate * 0.5
    ) {
      checks.push({
        name: 'Error Rate',
        status: 'warn',
        message: `Error rate elevated`,
        metrics: { errorRate },
      });
      if (overallStatus === 'healthy') overallStatus = 'warning';
    } else {
      checks.push({
        name: 'Error Rate',
        status: 'pass',
        message: 'Error rate within acceptable limits',
        metrics: { errorRate },
      });
    }

    // Memory usage health check
    const memoryUsage = this.getCurrentMemoryUsage();
    if (memoryUsage > this.config.performanceThresholds.maxMemoryUsage) {
      checks.push({
        name: 'Memory Usage',
        status: 'fail',
        message: `Memory usage (${memoryUsage.toFixed(2)}MB) exceeds threshold`,
        metrics: {
          memoryUsage,
          threshold: this.config.performanceThresholds.maxMemoryUsage,
        },
      });
      overallStatus = 'critical';
    } else {
      checks.push({
        name: 'Memory Usage',
        status: 'pass',
        message: 'Memory usage within acceptable limits',
        metrics: { memoryUsage },
      });
    }

    // Business metrics health check
    if (this.config.businessMetrics.trackConversions) {
      const avgConversionRate = this.getAverageConversionRate(3600); // Last hour
      if (
        avgConversionRate < this.config.performanceThresholds.minConversionRate
      ) {
        checks.push({
          name: 'Conversion Rate',
          status: 'warn',
          message: `Conversion rate (${(avgConversionRate * 100).toFixed(2)}%) below expected`,
          metrics: {
            conversionRate: avgConversionRate,
            threshold: this.config.performanceThresholds.minConversionRate,
          },
        });
        if (overallStatus === 'healthy') overallStatus = 'warning';
      } else {
        checks.push({
          name: 'Conversion Rate',
          status: 'pass',
          message: 'Conversion rate within expected range',
          metrics: { conversionRate: avgConversionRate },
        });
      }
    }

    this.healthStatus = overallStatus;
    this.lastHealthCheck = new Date();

    return {
      status: overallStatus,
      checks,
      timestamp: new Date(),
    };
  }

  /**
   * Get current system metrics
   */
  getCurrentMetrics(): {
    performance: {
      avgExecutionTime: number;
      p95ExecutionTime: number;
      errorRate: number;
      throughput: number;
    };
    business: {
      conversionRate: number;
      revenue: number;
      activeTests: number;
    };
    system: {
      memoryUsage: number;
      activeExecutions: number;
      alertCount: number;
    };
  } {
    return {
      performance: {
        avgExecutionTime: this.getAverageMetric('execution_time', 300),
        p95ExecutionTime: this.getPercentileMetric('execution_time', 95, 300),
        errorRate: this.getErrorRate(300),
        throughput: this.getThroughput(60), // Per minute
      },
      business: {
        conversionRate: this.getAverageConversionRate(3600),
        revenue: this.getMetricSum('revenue', 3600),
        activeTests: this.getActiveABTestCount(),
      },
      system: {
        memoryUsage: this.getCurrentMemoryUsage(),
        activeExecutions: this.getActiveExecutionCount(),
        alertCount: this.getActiveAlertCount(),
      },
    };
  }

  /**
   * Get alerts for dashboard
   */
  getActiveAlerts(): MonitoringAlert[] {
    return Array.from(this.alerts.values())
      .filter((alert) => !alert.resolved)
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.alerts.set(alertId, alert);
    }
  }

  /**
   * Wedding photographer specific monitoring
   */
  monitorWeddingBusiness(): {
    seasonalTrends: Record<string, number>;
    destinationVsLocal: { destination: number; local: number };
    averageBookingValue: number;
    clientSatisfaction: number;
  } {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      seasonalTrends: this.getSeasonalTrends(oneMonthAgo),
      destinationVsLocal: this.getWeddingTypeDistribution(oneMonthAgo),
      averageBookingValue: this.getAverageBookingValue(oneMonthAgo),
      clientSatisfaction: this.getClientSatisfactionScore(oneMonthAgo),
    };
  }

  /**
   * Private helper methods
   */
  private initializeMonitoring(): void {
    // Set up periodic health checks
    if (this.config.enabled) {
      setInterval(() => {
        this.performHealthCheck();
        this.cleanupOldMetrics();
      }, 60000); // Every minute

      // Set up memory monitoring
      setInterval(() => {
        this.monitorMemoryUsage();
      }, 30000); // Every 30 seconds
    }
  }

  private createAlert(
    alert: Omit<MonitoringAlert, 'id' | 'timestamp' | 'resolved'>,
  ): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullAlert: MonitoringAlert = {
      ...alert,
      id: alertId,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.set(alertId, fullAlert);

    // Send alert based on configuration
    this.sendAlert(fullAlert);
  }

  private sendAlert(alert: MonitoringAlert): void {
    // In production, this would integrate with actual alert systems
    console.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`);
    console.warn(`Description: ${alert.description}`);
    console.warn(`Metrics:`, alert.metrics);

    // Would implement actual alerting here:
    // - Email notifications
    // - Slack webhooks
    // - SMS alerts
    // - PagerDuty integration
  }

  private trackPerformanceMetric(name: string, value: number): void {
    const key = `performance_${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const values = this.metrics.get(key)!;
    values.push(value);

    // Keep only last 1000 values
    if (values.length > 1000) {
      values.shift();
    }
  }

  private trackBusinessMetric(name: string, value: number): void {
    const key = `business_${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const values = this.metrics.get(key)!;
    values.push(value);

    if (values.length > 1000) {
      values.shift();
    }
  }

  private getAverageMetric(name: string, timeWindowSeconds: number): number {
    const key = `performance_${name}`;
    const values = this.metrics.get(key) || [];

    if (values.length === 0) return 0;

    // Simple average for demo - in production would use time-based windowing
    const recentValues = values.slice(
      -Math.min(values.length, timeWindowSeconds / 5),
    ); // Assuming 5-second intervals
    return (
      recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length
    );
  }

  private getPercentileMetric(
    name: string,
    percentile: number,
    timeWindowSeconds: number,
  ): number {
    const key = `performance_${name}`;
    const values = this.metrics.get(key) || [];

    if (values.length === 0) return 0;

    const recentValues = values.slice(
      -Math.min(values.length, timeWindowSeconds / 5),
    );
    const sorted = [...recentValues].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;

    return sorted[Math.max(0, index)];
  }

  private getErrorRate(timeWindowSeconds: number): number {
    // Simplified error rate calculation
    return Math.random() * 2; // Demo value
  }

  private getThroughput(timeWindowSeconds: number): number {
    const executionTimes = this.metrics.get('performance_execution_time') || [];
    const recentExecutions = executionTimes.slice(
      -Math.min(executionTimes.length, timeWindowSeconds / 5),
    );
    return (recentExecutions.length / timeWindowSeconds) * 60; // Per minute
  }

  private getAverageConversionRate(timeWindowSeconds: number): number {
    const conversions = this.getMetricSum(
      'total_conversions',
      timeWindowSeconds,
    );
    const executions = this.getMetricSum('execution_time', timeWindowSeconds);

    return executions > 0 ? conversions / executions : 0;
  }

  private getMetricSum(name: string, timeWindowSeconds: number): number {
    const key = `business_${name}`;
    const values = this.metrics.get(key) || [];
    const recentValues = values.slice(
      -Math.min(values.length, timeWindowSeconds / 5),
    );

    return recentValues.reduce((sum, val) => sum + val, 0);
  }

  private getCurrentMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    return 0;
  }

  private getActiveExecutionCount(): number {
    // Would track active executions in production
    return Math.floor(Math.random() * 10);
  }

  private getActiveAlertCount(): number {
    return Array.from(this.alerts.values()).filter((alert) => !alert.resolved)
      .length;
  }

  private getActiveABTestCount(): number {
    // Would track active A/B tests
    return Math.floor(Math.random() * 5);
  }

  private checkConversionRateTrends(branchId: string): void {
    const recentRate = this.getAverageMetric(`conversions_${branchId}`, 3600);
    const historicalRate = this.getAverageMetric(
      `conversions_${branchId}`,
      86400,
    );

    if (recentRate < historicalRate * 0.5) {
      this.createAlert({
        type: 'business',
        severity: 'medium',
        title: 'Conversion Rate Drop Detected',
        description: `Branch ${branchId} conversion rate has dropped significantly`,
        metrics: {
          currentRate: recentRate,
          historicalRate: historicalRate,
          percentageDropp:
            ((historicalRate - recentRate) / historicalRate) * 100,
        },
        branchId,
      });
    }
  }

  private monitorMemoryUsage(): void {
    const usage = this.getCurrentMemoryUsage();
    this.trackPerformanceMetric('memory_usage', usage);

    if (usage > this.config.performanceThresholds.maxMemoryUsage) {
      this.createAlert({
        type: 'system',
        severity: 'high',
        title: 'High Memory Usage',
        description: `Memory usage (${usage.toFixed(2)}MB) exceeds threshold`,
        metrics: {
          memoryUsage: usage,
          threshold: this.config.performanceThresholds.maxMemoryUsage,
        },
      });
    }
  }

  private cleanupOldMetrics(): void {
    // Clean up metrics older than 24 hours
    // Implementation would depend on how timestamps are stored
  }

  private getSeasonalTrends(since: Date): Record<string, number> {
    // Mock seasonal trends for wedding photographer
    return {
      spring: Math.floor(Math.random() * 100),
      summer: Math.floor(Math.random() * 100),
      fall: Math.floor(Math.random() * 100),
      winter: Math.floor(Math.random() * 100),
    };
  }

  private getWeddingTypeDistribution(since: Date): {
    destination: number;
    local: number;
  } {
    return {
      destination: Math.floor(Math.random() * 50),
      local: Math.floor(Math.random() * 150),
    };
  }

  private getAverageBookingValue(since: Date): number {
    return 3500 + Math.random() * 2000; // $3500-$5500 range
  }

  private getClientSatisfactionScore(since: Date): number {
    return 4.2 + Math.random() * 0.6; // 4.2-4.8 range
  }

  /**
   * Export monitoring data
   */
  exportMonitoringData(): {
    config: MonitoringConfig;
    healthStatus: string;
    lastHealthCheck: Date;
    activeAlerts: MonitoringAlert[];
    metrics: Record<string, number>;
  } {
    return {
      config: this.config,
      healthStatus: this.healthStatus,
      lastHealthCheck: this.lastHealthCheck,
      activeAlerts: this.getActiveAlerts(),
      metrics: this.getCurrentMetrics() as any,
    };
  }
}

/**
 * Default monitoring configuration for wedding photographers
 */
export const DefaultWeddingPhotographerMonitoring: MonitoringConfig = {
  enabled: true,
  performanceThresholds: {
    maxExecutionTime: 10, // 10ms as per requirements
    maxErrorRate: 1, // 1%
    minConversionRate: 0.15, // 15%
    maxMemoryUsage: 512, // 512MB
    maxConcurrentExecutions: 100,
  },
  alertChannels: {
    email: true,
    slack: true,
    sms: false,
  },
  businessMetrics: {
    trackRevenue: true,
    trackConversions: true,
    trackUserExperience: true,
  },
};
