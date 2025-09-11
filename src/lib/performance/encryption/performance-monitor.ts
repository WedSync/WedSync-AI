/**
 * WS-175 Advanced Data Encryption - Performance Monitor
 * Real-time performance tracking and alerting for encryption operations
 */

import { performance } from 'node:perf_hooks';
import { EventEmitter } from 'node:events';
import * as crypto from 'node:crypto';
import type {
  PerformanceMonitorService,
  EncryptionMetrics,
  SystemPerformanceSnapshot,
  PerformanceAlert,
  PerformanceThreshold,
  ThroughputMetrics,
  AlertSeverity,
  EncryptionOperation,
} from '../../../types/encryption-performance';

/**
 * Time-series data point for performance tracking
 */
interface MetricDataPoint {
  timestamp: number;
  value: number;
  operation: EncryptionOperation;
  metadata?: Record<string, unknown>;
}

/**
 * Performance statistics aggregator
 */
interface PerformanceStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  values: number[];
}

/**
 * Alert tracking for preventing spam
 */
interface AlertTracker {
  alertId: string;
  lastTriggered: number;
  count: number;
  suppressUntil: number;
}

/**
 * Real-time performance monitoring system for encryption operations
 * Optimized for wedding venue high-performance requirements (<10ms per operation)
 */
export class PerformanceMonitor
  extends EventEmitter
  implements PerformanceMonitorService
{
  private metrics: MetricDataPoint[] = [];
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private alerts: Map<string, AlertTracker> = new Map();

  // Performance statistics by operation type
  private operationStats: Map<EncryptionOperation, PerformanceStats> =
    new Map();

  // System performance tracking
  private systemSnapshots: SystemPerformanceSnapshot[] = [];
  private readonly MAX_METRICS_RETENTION = 10000; // Keep last 10k metrics
  private readonly MAX_SNAPSHOTS_RETENTION = 1440; // Keep 24 hours worth (1 per minute)

  // Alert configuration
  private readonly ALERT_SUPPRESSION_MS = 5 * 60 * 1000; // 5 minutes
  private readonly ALERT_ESCALATION_THRESHOLD = 5; // Escalate after 5 consecutive alerts

  // Performance optimization
  private metricsBuffer: EncryptionMetrics[] = [];
  private bufferFlushInterval: NodeJS.Timeout;
  private readonly BUFFER_SIZE = 100;
  private readonly BUFFER_FLUSH_INTERVAL_MS = 1000; // Flush every second

  constructor() {
    super();
    this.initializeDefaultThresholds();
    this.startSystemMonitoring();
    this.setupBufferFlushing();
  }

  /**
   * Record encryption performance metrics with buffering for high throughput
   */
  recordMetrics(metrics: EncryptionMetrics): void {
    // Add to buffer for batch processing
    this.metricsBuffer.push(metrics);

    // Immediate flush if buffer is full or critical operation
    if (
      this.metricsBuffer.length >= this.BUFFER_SIZE ||
      metrics.operation === 'key_derivation' ||
      metrics.duration > 50
    ) {
      // Flush slow operations immediately
      this.flushMetricsBuffer();
    }
  }

  /**
   * Get current system performance snapshot
   */
  getSnapshot(): SystemPerformanceSnapshot {
    const now = new Date();
    const recentMetrics = this.metrics.filter(
      (m) => now.getTime() - m.timestamp < 60000,
    ); // Last minute

    // Calculate system metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = this.calculateCPUUsage();

    // Count active operations (recent metrics)
    const activeOperations = this.countActiveOperations();
    const queuedOperations = this.countQueuedOperations();

    // Calculate cache metrics (would integrate with actual cache)
    const cacheMetrics = {
      hitRate: this.calculateCacheHitRate(recentMetrics),
      missRate: 1 - this.calculateCacheHitRate(recentMetrics),
      evictionCount: 0, // Would be provided by cache service
      totalEntries: 0, // Would be provided by cache service
      memoryUsageBytes: memoryUsage.heapUsed,
      avgAccessTime: this.calculateAverageAccessTime(recentMetrics),
      hotKeys: [], // Would be provided by cache service
    };

    // Calculate throughput metrics
    const throughputMetrics = this.calculateThroughputMetrics(recentMetrics);

    const snapshot: SystemPerformanceSnapshot = {
      timestamp: now,
      cpuUsage,
      memoryUsage: memoryUsage.heapUsed,
      activeOperations,
      queuedOperations,
      cacheMetrics,
      throughputMetrics,
    };

    // Store snapshot
    this.systemSnapshots.push(snapshot);
    this.trimSnapshots();

    return snapshot;
  }

  /**
   * Check all configured thresholds and generate alerts
   */
  checkThresholds(): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];
    const snapshot = this.getSnapshot();

    for (const [thresholdId, threshold] of Array.from(
      this.thresholds.entries(),
    )) {
      const alert = this.evaluateThreshold(threshold, snapshot);
      if (alert && this.shouldTriggerAlert(thresholdId, alert)) {
        alerts.push(alert);
        this.recordAlert(thresholdId, alert);
      }
    }

    return alerts;
  }

  /**
   * Configure performance thresholds for monitoring
   */
  configureThresholds(thresholds: PerformanceThreshold[]): void {
    for (const threshold of thresholds) {
      const thresholdId = this.generateThresholdId(threshold);
      this.thresholds.set(thresholdId, threshold);
    }
  }

  /**
   * Export performance metrics in various formats
   */
  exportMetrics(format: 'json' | 'csv' | 'prometheus'): string {
    switch (format) {
      case 'json':
        return this.exportAsJSON();
      case 'csv':
        return this.exportAsCSV();
      case 'prometheus':
        return this.exportAsPrometheus();
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Get performance statistics for specific operation
   */
  getOperationStats(operation: EncryptionOperation): PerformanceStats | null {
    return this.operationStats.get(operation) || null;
  }

  /**
   * Get recent performance trends for analysis
   */
  getPerformanceTrends(timeRangeMs: number = 300000): {
    latencyTrend: number[];
    throughputTrend: number[];
    errorRateTrend: number[];
    timestamps: number[];
  } {
    const now = Date.now();
    const recentSnapshots = this.systemSnapshots.filter(
      (s) => now - s.timestamp.getTime() < timeRangeMs,
    );

    return {
      latencyTrend: recentSnapshots.map(
        (s) => s.throughputMetrics.averageLatencyMs,
      ),
      throughputTrend: recentSnapshots.map(
        (s) => s.throughputMetrics.operationsPerSecond,
      ),
      errorRateTrend: recentSnapshots.map((s) => s.throughputMetrics.errorRate),
      timestamps: recentSnapshots.map((s) => s.timestamp.getTime()),
    };
  }

  // Private implementation methods

  private flushMetricsBuffer(): void {
    if (this.metricsBuffer.length === 0) return;

    const bufferCopy = [...this.metricsBuffer];
    this.metricsBuffer = [];

    // Process metrics in batch
    for (const metric of bufferCopy) {
      this.processMetric(metric);
    }

    // Emit batch processed event
    this.emit('metricsProcessed', bufferCopy.length);
  }

  private processMetric(metric: EncryptionMetrics): void {
    const dataPoint: MetricDataPoint = {
      timestamp: metric.timestamp.getTime(),
      value: metric.duration,
      operation: metric.operation,
      metadata: {
        inputSize: metric.inputSize,
        outputSize: metric.outputSize,
        throughput: metric.throughput,
        cacheHit: metric.cacheHit,
        workerUsed: metric.workerUsed,
      },
    };

    // Add to metrics array
    this.metrics.push(dataPoint);
    this.trimMetrics();

    // Update operation statistics
    this.updateOperationStats(metric);

    // Check for immediate threshold violations
    this.checkImmediateThresholds(metric);
  }

  private updateOperationStats(metric: EncryptionMetrics): void {
    let stats = this.operationStats.get(metric.operation);

    if (!stats) {
      stats = {
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        values: [],
      };
      this.operationStats.set(metric.operation, stats);
    }

    // Update basic stats
    stats.count++;
    stats.sum += metric.duration;
    stats.min = Math.min(stats.min, metric.duration);
    stats.max = Math.max(stats.max, metric.duration);
    stats.avg = stats.sum / stats.count;

    // Add to values for percentile calculation
    stats.values.push(metric.duration);

    // Keep only recent values for percentile calculation (last 1000)
    if (stats.values.length > 1000) {
      stats.values = stats.values.slice(-1000);
    }

    // Calculate percentiles
    const sortedValues = [...stats.values].sort((a, b) => a - b);
    stats.p50 = this.calculatePercentile(sortedValues, 50);
    stats.p95 = this.calculatePercentile(sortedValues, 95);
    stats.p99 = this.calculatePercentile(sortedValues, 99);
  }

  private calculatePercentile(
    sortedValues: number[],
    percentile: number,
  ): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }

  private calculateThroughputMetrics(
    recentMetrics: MetricDataPoint[],
  ): ThroughputMetrics {
    if (recentMetrics.length === 0) {
      return {
        operationsPerSecond: 0,
        bytesPerSecond: 0,
        averageLatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        errorRate: 0,
      };
    }

    const durations = recentMetrics.map((m) => m.value);
    const totalBytes = recentMetrics.reduce((sum, m) => {
      return sum + ((m.metadata?.inputSize as number) || 0);
    }, 0);

    const timeRangeSeconds = 60; // Last minute
    const sortedDurations = [...durations].sort((a, b) => a - b);

    return {
      operationsPerSecond: recentMetrics.length / timeRangeSeconds,
      bytesPerSecond: totalBytes / timeRangeSeconds,
      averageLatencyMs:
        durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p95LatencyMs: this.calculatePercentile(sortedDurations, 95),
      p99LatencyMs: this.calculatePercentile(sortedDurations, 99),
      errorRate: 0, // Would need error tracking from metrics
    };
  }

  private evaluateThreshold(
    threshold: PerformanceThreshold,
    snapshot: SystemPerformanceSnapshot,
  ): PerformanceAlert | null {
    let actualValue: number;
    let metricName: string;

    // Determine which metric to check based on threshold operation
    switch (threshold.operation) {
      case 'encrypt':
      case 'decrypt':
      case 'bulk_encrypt':
      case 'bulk_decrypt':
        actualValue = snapshot.throughputMetrics.averageLatencyMs;
        metricName = 'Average Latency';
        break;
      case 'key_derivation':
        const keyDerivationStats = this.operationStats.get('key_derivation');
        actualValue = keyDerivationStats?.avg || 0;
        metricName = 'Key Derivation Time';
        break;
      case 'cache_lookup':
        actualValue = snapshot.cacheMetrics.avgAccessTime;
        metricName = 'Cache Access Time';
        break;
      default:
        return null;
    }

    // Check if threshold is violated
    const isViolated = actualValue > threshold.maxDurationMs;

    if (!isViolated) return null;

    // Determine alert severity based on how much threshold is exceeded
    const exceedanceRatio = actualValue / threshold.maxDurationMs;
    let severity: AlertSeverity;

    if (exceedanceRatio > 3) {
      severity = 'critical';
    } else if (exceedanceRatio > 2) {
      severity = 'error';
    } else if (exceedanceRatio > 1.5) {
      severity = 'warning';
    } else {
      severity = 'info';
    }

    return {
      alertId: crypto.randomUUID(),
      operation: threshold.operation,
      threshold,
      actualValue,
      expectedValue: threshold.maxDurationMs,
      severity,
      timestamp: new Date(),
      metadata: {
        metricName,
        exceedanceRatio,
        snapshot: this.serializeSnapshot(snapshot),
      },
    };
  }

  private shouldTriggerAlert(
    thresholdId: string,
    alert: PerformanceAlert,
  ): boolean {
    const tracker = this.alerts.get(thresholdId);
    const now = Date.now();

    if (!tracker) {
      return true; // First time triggering this alert
    }

    // Check suppression window
    if (now < tracker.suppressUntil) {
      return false; // Still suppressed
    }

    // Check if we should escalate based on frequency
    if (tracker.count >= this.ALERT_ESCALATION_THRESHOLD) {
      alert.severity = this.escalateSeverity(alert.severity);
    }

    return true;
  }

  private recordAlert(thresholdId: string, alert: PerformanceAlert): void {
    const now = Date.now();
    const tracker = this.alerts.get(thresholdId);

    if (tracker) {
      tracker.lastTriggered = now;
      tracker.count++;
      tracker.suppressUntil = now + this.ALERT_SUPPRESSION_MS;
    } else {
      this.alerts.set(thresholdId, {
        alertId: alert.alertId,
        lastTriggered: now,
        count: 1,
        suppressUntil: now + this.ALERT_SUPPRESSION_MS,
      });
    }

    // Emit alert event
    this.emit('performanceAlert', alert);
  }

  private escalateSeverity(severity: AlertSeverity): AlertSeverity {
    switch (severity) {
      case 'info':
        return 'warning';
      case 'warning':
        return 'error';
      case 'error':
        return 'critical';
      case 'critical':
        return 'critical';
      default:
        return severity;
    }
  }

  private initializeDefaultThresholds(): void {
    const defaultThresholds: PerformanceThreshold[] = [
      {
        operation: 'encrypt',
        maxDurationMs: 10, // <10ms requirement for wedding venue
        maxMemoryUsageMB: 100,
        minThroughputBytesPerSec: 1024 * 1024, // 1MB/s minimum
        alertOnViolation: true,
      },
      {
        operation: 'decrypt',
        maxDurationMs: 5, // Decryption should be faster
        maxMemoryUsageMB: 50,
        minThroughputBytesPerSec: 2 * 1024 * 1024, // 2MB/s minimum
        alertOnViolation: true,
      },
      {
        operation: 'bulk_encrypt',
        maxDurationMs: 100, // Per batch, not per field
        maxMemoryUsageMB: 500,
        minThroughputBytesPerSec: 10 * 1024 * 1024, // 10MB/s for bulk
        alertOnViolation: true,
      },
      {
        operation: 'key_derivation',
        maxDurationMs: 50,
        maxMemoryUsageMB: 25,
        minThroughputBytesPerSec: 0, // Not applicable
        alertOnViolation: true,
      },
      {
        operation: 'cache_lookup',
        maxDurationMs: 1, // Cache should be very fast
        maxMemoryUsageMB: 10,
        minThroughputBytesPerSec: 0,
        alertOnViolation: true,
      },
    ];

    this.configureThresholds(defaultThresholds);
  }

  private startSystemMonitoring(): void {
    // Take snapshot every minute
    setInterval(() => {
      this.getSnapshot();
      this.checkThresholds();
    }, 60000);

    // Lightweight check every 10 seconds for critical metrics
    setInterval(() => {
      this.checkImmediateThresholds();
    }, 10000);
  }

  private setupBufferFlushing(): void {
    this.bufferFlushInterval = setInterval(() => {
      this.flushMetricsBuffer();
    }, this.BUFFER_FLUSH_INTERVAL_MS);
  }

  private checkImmediateThresholds(metric?: EncryptionMetrics): void {
    if (!metric) return;

    // Check for critical performance violations that need immediate attention
    if (metric.duration > 50) {
      // > 50ms is critical for wedding venue
      const alert: PerformanceAlert = {
        alertId: crypto.randomUUID(),
        operation: metric.operation,
        threshold:
          this.thresholds.get(
            this.generateThresholdId({
              operation: metric.operation,
              maxDurationMs: 50,
              maxMemoryUsageMB: 0,
              minThroughputBytesPerSec: 0,
              alertOnViolation: true,
            }),
          ) || ({} as PerformanceThreshold),
        actualValue: metric.duration,
        expectedValue: 10,
        severity: 'critical',
        timestamp: new Date(),
        metadata: { immediate: true, metric },
      };

      this.emit('criticalPerformanceAlert', alert);
    }
  }

  private generateThresholdId(threshold: PerformanceThreshold): string {
    return `${threshold.operation}_${threshold.maxDurationMs}_${threshold.maxMemoryUsageMB}`;
  }

  private calculateCPUUsage(): number {
    // Simplified CPU usage calculation
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000000; // Convert to seconds
  }

  private calculateCacheHitRate(metrics: MetricDataPoint[]): number {
    const cacheMetrics = metrics.filter((m) => m.operation === 'cache_lookup');
    if (cacheMetrics.length === 0) return 0;

    const hits = cacheMetrics.filter(
      (m) => m.metadata?.cacheHit === true,
    ).length;
    return hits / cacheMetrics.length;
  }

  private calculateAverageAccessTime(metrics: MetricDataPoint[]): number {
    if (metrics.length === 0) return 0;

    const totalTime = metrics.reduce((sum, m) => sum + m.value, 0);
    return totalTime / metrics.length;
  }

  private countActiveOperations(): number {
    // Count operations in the last 10 seconds
    const now = Date.now();
    const recentMetrics = this.metrics.filter((m) => now - m.timestamp < 10000);
    return recentMetrics.length;
  }

  private countQueuedOperations(): number {
    // This would integrate with actual operation queue
    return 0;
  }

  private trimMetrics(): void {
    if (this.metrics.length > this.MAX_METRICS_RETENTION) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_RETENTION);
    }
  }

  private trimSnapshots(): void {
    if (this.systemSnapshots.length > this.MAX_SNAPSHOTS_RETENTION) {
      this.systemSnapshots = this.systemSnapshots.slice(
        -this.MAX_SNAPSHOTS_RETENTION,
      );
    }
  }

  private serializeSnapshot(
    snapshot: SystemPerformanceSnapshot,
  ): Record<string, unknown> {
    return {
      timestamp: snapshot.timestamp.toISOString(),
      cpuUsage: snapshot.cpuUsage,
      memoryUsage: snapshot.memoryUsage,
      activeOperations: snapshot.activeOperations,
      throughput: snapshot.throughputMetrics.operationsPerSecond,
    };
  }

  private exportAsJSON(): string {
    return JSON.stringify(
      {
        metrics: this.metrics.slice(-1000), // Last 1000 metrics
        snapshots: this.systemSnapshots.slice(-100), // Last 100 snapshots
        operationStats: Object.fromEntries(this.operationStats),
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
  }

  private exportAsCSV(): string {
    const headers = [
      'timestamp',
      'operation',
      'duration',
      'inputSize',
      'outputSize',
      'throughput',
    ];
    const rows = this.metrics.map((m) => [
      m.timestamp,
      m.operation,
      m.value,
      m.metadata?.inputSize || 0,
      m.metadata?.outputSize || 0,
      m.metadata?.throughput || 0,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  private exportAsPrometheus(): string {
    const metrics = [];

    // Export operation statistics as Prometheus metrics
    for (const [operation, stats] of Array.from(
      this.operationStats.entries(),
    )) {
      metrics.push(
        `# HELP encryption_operation_duration_seconds Duration of encryption operations`,
      );
      metrics.push(`# TYPE encryption_operation_duration_seconds histogram`);
      metrics.push(
        `encryption_operation_duration_avg{operation="${operation}"} ${stats.avg / 1000}`,
      );
      metrics.push(
        `encryption_operation_duration_p95{operation="${operation}"} ${stats.p95 / 1000}`,
      );
      metrics.push(
        `encryption_operation_duration_p99{operation="${operation}"} ${stats.p99 / 1000}`,
      );
      metrics.push(
        `encryption_operation_total{operation="${operation}"} ${stats.count}`,
      );
    }

    return metrics.join('\n');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }

    this.removeAllListeners();
    this.metrics = [];
    this.systemSnapshots = [];
    this.operationStats.clear();
    this.thresholds.clear();
    this.alerts.clear();
  }
}

/**
 * Factory function to create performance monitor
 */
export function createPerformanceMonitor(): PerformanceMonitor {
  return new PerformanceMonitor();
}

/**
 * Wedding-optimized performance monitor with strict thresholds
 */
export function createWeddingPerformanceMonitor(): PerformanceMonitor {
  const monitor = new PerformanceMonitor();

  // Configure strict wedding-specific thresholds
  const weddingThresholds: PerformanceThreshold[] = [
    {
      operation: 'encrypt',
      maxDurationMs: 8, // Stricter than default 10ms
      maxMemoryUsageMB: 75,
      minThroughputBytesPerSec: 2 * 1024 * 1024, // 2MB/s
      alertOnViolation: true,
    },
    {
      operation: 'bulk_encrypt',
      maxDurationMs: 80, // Stricter for guest data processing
      maxMemoryUsageMB: 400,
      minThroughputBytesPerSec: 15 * 1024 * 1024, // 15MB/s
      alertOnViolation: true,
    },
  ];

  monitor.configureThresholds(weddingThresholds);

  return monitor;
}
