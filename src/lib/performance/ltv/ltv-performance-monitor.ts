/**
 * WS-183 LTV Performance Monitor - Real-time Performance Monitoring
 * Team D - Performance/Platform Focus
 * SLI/SLO tracking, performance metrics, and anomaly detection
 */

import { EventEmitter } from 'events';
import { LTVResult } from './ltv-calculation-engine';

export interface PerformanceMetrics {
  timestamp: Date;
  calculationLatency: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    max: number;
  };
  throughput: {
    requestsPerSecond: number;
    calculationsPerMinute: number;
    batchesPerHour: number;
  };
  errorRate: {
    percentage: number;
    count: number;
    types: Record<string, number>;
  };
  resourceUtilization: {
    cpuPercent: number;
    memoryPercent: number;
    cacheHitRate: number;
    databaseConnections: number;
  };
  businessMetrics: {
    avgLtvValue: number;
    confidenceScore: number;
    segmentDistribution: Record<string, number>;
  };
}

export interface SLO {
  name: string;
  description: string;
  target: number;
  current: number;
  status: 'healthy' | 'at_risk' | 'violated';
  budget: number; // Error budget remaining (0-100%)
  alertThreshold: number;
  criticalThreshold: number;
}

export interface Anomaly {
  id: string;
  type:
    | 'latency_spike'
    | 'throughput_drop'
    | 'error_surge'
    | 'resource_exhaustion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  metrics: Record<string, number>;
  suggestedActions: string[];
  resolved: boolean;
  resolvedAt?: Date;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface PerformanceReport {
  period: DateRange;
  summary: {
    totalCalculations: number;
    avgLatency: number;
    errorRate: number;
    uptime: number;
    sloCompliance: number;
  };
  trends: {
    latencyTrend: 'improving' | 'stable' | 'degrading';
    throughputTrend: 'improving' | 'stable' | 'degrading';
    errorTrend: 'improving' | 'stable' | 'degrading';
  };
  anomalies: Anomaly[];
  recommendations: string[];
}

export class LTVPerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = [];
  private slos: SLO[] = [];
  private anomalies: Anomaly[] = [];
  private alertThresholds: Record<string, number>;
  private isMonitoring = false;

  // Performance targets (SLOs)
  private readonly SLO_TARGETS = {
    UPTIME: 99.9, // 99.9% uptime
    LATENCY_P95: 500, // 95th percentile < 500ms
    LATENCY_P99: 1000, // 99th percentile < 1000ms
    ERROR_RATE: 0.1, // < 0.1% error rate
    THROUGHPUT_MIN: 1000, // > 1000 calculations/minute
    CACHE_HIT_RATE: 85, // > 85% cache hit rate
  };

  constructor() {
    super();
    this.initializeSLOs();
    this.setupAlertThresholds();
    this.startMonitoring();
  }

  /**
   * Track individual calculation performance
   * Records latency, success/failure, and business metrics
   */
  async trackCalculationPerformance(
    calculationId: string,
    startTime: number,
    endTime: number,
    result: LTVResult,
  ): Promise<void> {
    const latency = endTime - startTime;
    const timestamp = new Date();

    try {
      // Record the calculation metrics
      await this.recordCalculation({
        id: calculationId,
        latency,
        success: true,
        result,
        timestamp,
      });

      // Update real-time metrics
      await this.updateMetrics(latency, true, result);

      // Check for anomalies
      await this.detectAnomalies();

      // Update SLO status
      await this.updateSLOStatus();

      // Emit performance event
      this.emit('calculation_tracked', {
        calculationId,
        latency,
        result,
      });
    } catch (error) {
      console.error('Performance tracking error:', error);
      // Track the error but don't fail the calculation
      await this.recordError(calculationId, error);
    }
  }

  /**
   * Generate comprehensive performance report with trends and insights
   */
  async generatePerformanceReport(
    timeRange: DateRange,
  ): Promise<PerformanceReport> {
    const metricsInRange = this.getMetricsInRange(timeRange);
    const anomaliesInRange = this.getAnomaliesInRange(timeRange);

    if (metricsInRange.length === 0) {
      return this.getEmptyReport(timeRange);
    }

    const summary = this.calculateSummaryMetrics(metricsInRange);
    const trends = this.analyzeTrends(metricsInRange);
    const recommendations = this.generateRecommendations(
      summary,
      trends,
      anomaliesInRange,
    );

    return {
      period: timeRange,
      summary,
      trends,
      anomalies: anomaliesInRange,
      recommendations,
    };
  }

  /**
   * Real-time anomaly detection using statistical analysis
   */
  private async detectPerformanceAnomalies(
    metrics: PerformanceMetrics[],
  ): Promise<Anomaly[]> {
    const detectedAnomalies: Anomaly[] = [];

    if (metrics.length < 10) return detectedAnomalies; // Need sufficient data

    const recent = metrics.slice(-10); // Last 10 data points
    const baseline = metrics.slice(-60, -10); // Previous 50 points for comparison

    // Latency spike detection
    const recentAvgLatency = this.calculateAverage(
      recent.map((m) => m.calculationLatency.avg),
    );
    const baselineAvgLatency = this.calculateAverage(
      baseline.map((m) => m.calculationLatency.avg),
    );

    if (recentAvgLatency > baselineAvgLatency * 2) {
      detectedAnomalies.push({
        id: `anomaly_${Date.now()}_latency`,
        type: 'latency_spike',
        severity:
          recentAvgLatency > baselineAvgLatency * 4 ? 'critical' : 'high',
        description: `Latency spike detected: ${Math.round(recentAvgLatency)}ms vs baseline ${Math.round(baselineAvgLatency)}ms`,
        detectedAt: new Date(),
        metrics: {
          currentLatency: recentAvgLatency,
          baselineLatency: baselineAvgLatency,
          spikeMultiplier: recentAvgLatency / baselineAvgLatency,
        },
        suggestedActions: [
          'Check database connection pool saturation',
          'Verify cache hit rates',
          'Review worker pool utilization',
          'Check for memory leaks',
        ],
        resolved: false,
      });
    }

    // Throughput drop detection
    const recentThroughput = this.calculateAverage(
      recent.map((m) => m.throughput.calculationsPerMinute),
    );
    const baselineThroughput = this.calculateAverage(
      baseline.map((m) => m.throughput.calculationsPerMinute),
    );

    if (recentThroughput < baselineThroughput * 0.5) {
      detectedAnomalies.push({
        id: `anomaly_${Date.now()}_throughput`,
        type: 'throughput_drop',
        severity:
          recentThroughput < baselineThroughput * 0.25 ? 'critical' : 'high',
        description: `Throughput drop detected: ${Math.round(recentThroughput)}/min vs baseline ${Math.round(baselineThroughput)}/min`,
        detectedAt: new Date(),
        metrics: {
          currentThroughput: recentThroughput,
          baselineThroughput: baselineThroughput,
          dropPercentage: (1 - recentThroughput / baselineThroughput) * 100,
        },
        suggestedActions: [
          'Check worker pool capacity',
          'Verify queue processing',
          'Review system resource utilization',
          'Check for downstream service issues',
        ],
        resolved: false,
      });
    }

    // Error rate surge detection
    const recentErrorRate = this.calculateAverage(
      recent.map((m) => m.errorRate.percentage),
    );
    const baselineErrorRate = this.calculateAverage(
      baseline.map((m) => m.errorRate.percentage),
    );

    if (recentErrorRate > Math.max(baselineErrorRate * 3, 1.0)) {
      detectedAnomalies.push({
        id: `anomaly_${Date.now()}_errors`,
        type: 'error_surge',
        severity: recentErrorRate > 5 ? 'critical' : 'medium',
        description: `Error rate surge detected: ${recentErrorRate.toFixed(2)}% vs baseline ${baselineErrorRate.toFixed(2)}%`,
        detectedAt: new Date(),
        metrics: {
          currentErrorRate: recentErrorRate,
          baselineErrorRate: baselineErrorRate,
          surgeMultiplier: recentErrorRate / Math.max(baselineErrorRate, 0.01),
        },
        suggestedActions: [
          'Check application logs for error patterns',
          'Verify database connectivity',
          'Review recent deployments',
          'Check external service dependencies',
        ],
        resolved: false,
      });
    }

    // Resource exhaustion detection
    const recentCpuUsage = this.calculateAverage(
      recent.map((m) => m.resourceUtilization.cpuPercent),
    );
    const recentMemoryUsage = this.calculateAverage(
      recent.map((m) => m.resourceUtilization.memoryPercent),
    );

    if (recentCpuUsage > 90 || recentMemoryUsage > 90) {
      detectedAnomalies.push({
        id: `anomaly_${Date.now()}_resources`,
        type: 'resource_exhaustion',
        severity: 'critical',
        description: `Resource exhaustion detected: CPU ${recentCpuUsage.toFixed(1)}%, Memory ${recentMemoryUsage.toFixed(1)}%`,
        detectedAt: new Date(),
        metrics: {
          cpuUsage: recentCpuUsage,
          memoryUsage: recentMemoryUsage,
        },
        suggestedActions: [
          'Scale up worker instances',
          'Review memory leaks',
          'Optimize calculation algorithms',
          'Clear unnecessary caches',
        ],
        resolved: false,
      });
    }

    return detectedAnomalies;
  }

  /**
   * Get current SLO status and compliance
   */
  async getSLOStatus(): Promise<SLO[]> {
    await this.updateSLOStatus();
    return [...this.slos];
  }

  /**
   * Get real-time performance dashboard data
   */
  async getDashboardData(): Promise<{
    currentMetrics: PerformanceMetrics | null;
    slos: SLO[];
    activeAnomalies: Anomaly[];
    healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  }> {
    const currentMetrics =
      this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
    const activeAnomalies = this.anomalies.filter((a) => !a.resolved);

    const healthStatus = this.calculateHealthStatus(activeAnomalies, this.slos);

    return {
      currentMetrics,
      slos: this.slos,
      activeAnomalies,
      healthStatus,
    };
  }

  // Private implementation methods
  private async recordCalculation(calculation: {
    id: string;
    latency: number;
    success: boolean;
    result: LTVResult;
    timestamp: Date;
  }): Promise<void> {
    // In a real implementation, this would store calculation data
    // For now, we'll use in-memory storage
  }

  private async updateMetrics(
    latency: number,
    success: boolean,
    result: LTVResult,
  ): Promise<void> {
    // Update rolling metrics window
    const now = new Date();

    // This is a simplified implementation
    // In reality, you'd collect and aggregate metrics from various sources
    const currentMetrics: PerformanceMetrics = {
      timestamp: now,
      calculationLatency: {
        p50: latency,
        p95: latency * 1.2,
        p99: latency * 1.5,
        avg: latency,
        max: latency,
      },
      throughput: {
        requestsPerSecond: 100,
        calculationsPerMinute: 6000,
        batchesPerHour: 120,
      },
      errorRate: {
        percentage: success ? 0 : 100,
        count: success ? 0 : 1,
        types: {},
      },
      resourceUtilization: {
        cpuPercent: Math.random() * 80 + 10,
        memoryPercent: Math.random() * 70 + 15,
        cacheHitRate: Math.random() * 20 + 80,
        databaseConnections: Math.floor(Math.random() * 50 + 25),
      },
      businessMetrics: {
        avgLtvValue: result.ltvValue,
        confidenceScore: result.confidence,
        segmentDistribution: { [result.segment]: 1 },
      },
    };

    this.metrics.push(currentMetrics);

    // Keep only last 1000 metrics for memory management
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  private async detectAnomalies(): Promise<void> {
    if (this.metrics.length < 10) return;

    const newAnomalies = await this.detectPerformanceAnomalies(this.metrics);

    newAnomalies.forEach((anomaly) => {
      this.anomalies.push(anomaly);
      this.emit('anomaly_detected', anomaly);

      if (anomaly.severity === 'critical') {
        this.emit('critical_alert', anomaly);
      }
    });
  }

  private async updateSLOStatus(): Promise<void> {
    if (this.metrics.length === 0) return;

    const recent = this.metrics.slice(-60); // Last hour of data

    // Update each SLO
    this.slos.forEach((slo) => {
      switch (slo.name) {
        case 'uptime':
          slo.current = this.calculateUptime(recent);
          break;
        case 'latency_p95':
          slo.current = this.calculateAverage(
            recent.map((m) => m.calculationLatency.p95),
          );
          break;
        case 'error_rate':
          slo.current = this.calculateAverage(
            recent.map((m) => m.errorRate.percentage),
          );
          break;
        case 'throughput':
          slo.current = this.calculateAverage(
            recent.map((m) => m.throughput.calculationsPerMinute),
          );
          break;
      }

      // Update status based on current vs target
      if (slo.current >= slo.target) {
        slo.status = 'healthy';
        slo.budget = 100;
      } else if (slo.current >= slo.alertThreshold) {
        slo.status = 'at_risk';
        slo.budget =
          ((slo.current - slo.criticalThreshold) /
            (slo.target - slo.criticalThreshold)) *
          100;
      } else {
        slo.status = 'violated';
        slo.budget = 0;
      }
    });
  }

  private initializeSLOs(): void {
    this.slos = [
      {
        name: 'uptime',
        description: 'System uptime percentage',
        target: this.SLO_TARGETS.UPTIME,
        current: 100,
        status: 'healthy',
        budget: 100,
        alertThreshold: 99.5,
        criticalThreshold: 99.0,
      },
      {
        name: 'latency_p95',
        description: '95th percentile response time',
        target: this.SLO_TARGETS.LATENCY_P95,
        current: 0,
        status: 'healthy',
        budget: 100,
        alertThreshold: 750,
        criticalThreshold: 1000,
      },
      {
        name: 'error_rate',
        description: 'Error rate percentage',
        target: this.SLO_TARGETS.ERROR_RATE,
        current: 0,
        status: 'healthy',
        budget: 100,
        alertThreshold: 0.5,
        criticalThreshold: 1.0,
      },
      {
        name: 'throughput',
        description: 'Calculations per minute',
        target: this.SLO_TARGETS.THROUGHPUT_MIN,
        current: 0,
        status: 'healthy',
        budget: 100,
        alertThreshold: 800,
        criticalThreshold: 500,
      },
    ];
  }

  private setupAlertThresholds(): void {
    this.alertThresholds = {
      latency_critical: 2000, // 2 seconds
      error_rate_critical: 5.0, // 5%
      throughput_critical: 100, // 100/min
      cpu_critical: 90,
      memory_critical: 90,
    };
  }

  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Collect metrics every minute
    setInterval(async () => {
      await this.collectSystemMetrics();
    }, 60000);

    // Check SLOs every 5 minutes
    setInterval(async () => {
      await this.updateSLOStatus();
    }, 300000);

    // Cleanup old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000);
  }

  private async collectSystemMetrics(): Promise<void> {
    // Mock system metrics collection
    // In a real implementation, this would collect from system monitors
  }

  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    this.anomalies = this.anomalies.filter((a) => a.detectedAt > cutoff);
    this.metrics = this.metrics.filter((m) => m.timestamp > cutoff);
  }

  // Utility methods
  private calculateAverage(numbers: number[]): number {
    return numbers.length > 0
      ? numbers.reduce((a, b) => a + b, 0) / numbers.length
      : 0;
  }

  private calculateUptime(metrics: PerformanceMetrics[]): number {
    // Simplified uptime calculation based on successful metrics collection
    return metrics.length > 0 ? 99.9 : 0;
  }

  private getMetricsInRange(range: DateRange): PerformanceMetrics[] {
    return this.metrics.filter(
      (m) => m.timestamp >= range.startDate && m.timestamp <= range.endDate,
    );
  }

  private getAnomaliesInRange(range: DateRange): Anomaly[] {
    return this.anomalies.filter(
      (a) => a.detectedAt >= range.startDate && a.detectedAt <= range.endDate,
    );
  }

  private calculateSummaryMetrics(metrics: PerformanceMetrics[]): any {
    return {
      totalCalculations: metrics.length * 100, // Estimate
      avgLatency: this.calculateAverage(
        metrics.map((m) => m.calculationLatency.avg),
      ),
      errorRate: this.calculateAverage(
        metrics.map((m) => m.errorRate.percentage),
      ),
      uptime: this.calculateUptime(metrics),
      sloCompliance:
        (this.slos.filter((slo) => slo.status === 'healthy').length /
          this.slos.length) *
        100,
    };
  }

  private analyzeTrends(metrics: PerformanceMetrics[]): any {
    // Simplified trend analysis
    return {
      latencyTrend: 'stable' as const,
      throughputTrend: 'stable' as const,
      errorTrend: 'stable' as const,
    };
  }

  private generateRecommendations(
    summary: any,
    trends: any,
    anomalies: Anomaly[],
  ): string[] {
    const recommendations: string[] = [];

    if (summary.avgLatency > this.SLO_TARGETS.LATENCY_P95) {
      recommendations.push(
        'Consider optimizing calculation algorithms or increasing worker pool size',
      );
    }

    if (summary.errorRate > this.SLO_TARGETS.ERROR_RATE) {
      recommendations.push(
        'Investigate error patterns and implement additional error handling',
      );
    }

    if (anomalies.length > 5) {
      recommendations.push(
        'High anomaly count detected - review system stability and monitoring thresholds',
      );
    }

    return recommendations;
  }

  private calculateHealthStatus(
    anomalies: Anomaly[],
    slos: SLO[],
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const criticalAnomalies = anomalies.filter(
      (a) => a.severity === 'critical',
    ).length;
    const violatedSlos = slos.filter((slo) => slo.status === 'violated').length;

    if (criticalAnomalies > 0 || violatedSlos > 0) return 'unhealthy';
    if (anomalies.length > 3 || slos.some((slo) => slo.status === 'at_risk'))
      return 'degraded';
    return 'healthy';
  }

  private getEmptyReport(timeRange: DateRange): PerformanceReport {
    return {
      period: timeRange,
      summary: {
        totalCalculations: 0,
        avgLatency: 0,
        errorRate: 0,
        uptime: 0,
        sloCompliance: 0,
      },
      trends: {
        latencyTrend: 'stable',
        throughputTrend: 'stable',
        errorTrend: 'stable',
      },
      anomalies: [],
      recommendations: ['Insufficient data for analysis'],
    };
  }

  private async recordError(
    calculationId: string,
    error: unknown,
  ): Promise<void> {
    // Record error for analysis
    console.error(`Calculation ${calculationId} failed:`, error);
  }
}

export default LTVPerformanceMonitor;
