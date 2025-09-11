// WS-184: Real-time Performance Monitoring for Style Processing System
'use client';

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface ProcessingMetrics {
  processingId: string;
  startTime: number;
  endTime: number;
  duration: number;
  imageCount: number;
  vectorCount: number;
  processingType: 'batch' | 'single' | 'similarity_search';
  cacheHitRatio: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: number;
  quality: {
    accuracy: number;
    confidence: number;
    colorAccuracy: number;
  };
  errors?: string[];
}

export interface PerformanceReport {
  timeRange: {
    start: Date;
    end: Date;
    duration: number;
  };
  totalProcessed: number;
  averageProcessingTime: number;
  medianProcessingTime: number;
  p95ProcessingTime: number;
  p99ProcessingTime: number;
  throughput: number; // operations per second
  errorRate: number;
  cachePerformance: {
    hitRatio: number;
    averageHitTime: number;
    averageMissTime: number;
  };
  resourceUtilization: {
    averageMemoryUsage: number;
    peakMemoryUsage: number;
    averageCpuUsage: number;
    diskIOOperations: number;
  };
  qualityMetrics: {
    averageAccuracy: number;
    averageConfidence: number;
    averageColorAccuracy: number;
    qualityTrend: 'improving' | 'stable' | 'declining';
  };
  bottleneckAnalysis: {
    primaryBottleneck: 'cpu' | 'memory' | 'io' | 'cache' | 'network';
    bottleneckSeverity: number; // 0-1 scale
    recommendations: string[];
  };
}

export interface Anomaly {
  timestamp: number;
  type: 'performance' | 'quality' | 'resource' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metrics: {
    value: number;
    threshold: number;
    unit: string;
  };
  possibleCauses: string[];
  suggestedActions: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  condition: {
    metric: keyof ProcessingMetrics | string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    timeWindow: number; // milliseconds
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // milliseconds between alerts
  lastTriggered?: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

class MetricsCollector {
  private metrics: ProcessingMetrics[] = [];
  private maxMetrics = 10000; // Keep last 10k metrics

  addMetric(metric: ProcessingMetrics): void {
    this.metrics.push(metric);

    // Remove old metrics if exceeding limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(timeRange?: DateRange): ProcessingMetrics[] {
    if (!timeRange) return [...this.metrics];

    return this.metrics.filter((metric) => {
      const metricTime = new Date(metric.startTime);
      return metricTime >= timeRange.start && metricTime <= timeRange.end;
    });
  }

  getLatestMetrics(count: number): ProcessingMetrics[] {
    return this.metrics.slice(-count);
  }

  clearOldMetrics(olderThan: number): void {
    const cutoff = Date.now() - olderThan;
    this.metrics = this.metrics.filter((metric) => metric.startTime > cutoff);
  }

  getMetricsByType(
    type: ProcessingMetrics['processingType'],
  ): ProcessingMetrics[] {
    return this.metrics.filter((metric) => metric.processingType === type);
  }
}

class AnomalyDetector {
  private baselines = new Map<string, number[]>();
  private sensitivityMultiplier = 2.5; // Standard deviations for anomaly detection

  updateBaseline(metricName: string, value: number): void {
    if (!this.baselines.has(metricName)) {
      this.baselines.set(metricName, []);
    }

    const values = this.baselines.get(metricName)!;
    values.push(value);

    // Keep only last 1000 values for baseline calculation
    if (values.length > 1000) {
      this.baselines.set(metricName, values.slice(-1000));
    }
  }

  detectAnomalies(metric: ProcessingMetrics): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Processing time anomaly
    this.updateBaseline('processingTime', metric.duration);
    const processingTimeAnomaly = this.checkAnomalousValue(
      'processingTime',
      metric.duration,
    );
    if (processingTimeAnomaly) {
      anomalies.push({
        timestamp: Date.now(),
        type: 'performance',
        severity: this.calculateSeverity(processingTimeAnomaly.deviations),
        description: `Processing time anomaly detected: ${metric.duration}ms`,
        metrics: {
          value: metric.duration,
          threshold: processingTimeAnomaly.threshold,
          unit: 'ms',
        },
        possibleCauses: [
          'High system load',
          'Memory pressure',
          'Cache misses',
          'Large image batch size',
          'Network latency',
        ],
        suggestedActions: [
          'Monitor system resources',
          'Check cache performance',
          'Consider reducing batch size',
          'Verify network connectivity',
        ],
      });
    }

    // Memory usage anomaly
    const memoryUsage = metric.memoryUsage.heapUsed / (1024 * 1024); // MB
    this.updateBaseline('memoryUsage', memoryUsage);
    const memoryAnomaly = this.checkAnomalousValue('memoryUsage', memoryUsage);
    if (memoryAnomaly) {
      anomalies.push({
        timestamp: Date.now(),
        type: 'resource',
        severity: this.calculateSeverity(memoryAnomaly.deviations),
        description: `Memory usage anomaly detected: ${memoryUsage.toFixed(2)}MB`,
        metrics: {
          value: memoryUsage,
          threshold: memoryAnomaly.threshold,
          unit: 'MB',
        },
        possibleCauses: [
          'Memory leak in processing',
          'Large image batch processing',
          'Insufficient garbage collection',
          'Cache growth beyond limits',
        ],
        suggestedActions: [
          'Force garbage collection',
          'Reduce batch size',
          'Clear processing caches',
          'Monitor memory leaks',
        ],
      });
    }

    // Quality anomaly
    this.updateBaseline('accuracy', metric.quality.accuracy);
    const accuracyAnomaly = this.checkAnomalousValue(
      'accuracy',
      metric.quality.accuracy,
      true,
    ); // Lower is bad
    if (accuracyAnomaly) {
      anomalies.push({
        timestamp: Date.now(),
        type: 'quality',
        severity: this.calculateSeverity(accuracyAnomaly.deviations),
        description: `Quality accuracy anomaly detected: ${(metric.quality.accuracy * 100).toFixed(1)}%`,
        metrics: {
          value: metric.quality.accuracy,
          threshold: accuracyAnomaly.threshold,
          unit: '%',
        },
        possibleCauses: [
          'Poor quality input images',
          'Processing algorithm issues',
          'Color space conversion errors',
          'Vector quantization problems',
        ],
        suggestedActions: [
          'Review input image quality',
          'Check processing parameters',
          'Validate color processing',
          'Monitor vector quality',
        ],
      });
    }

    // Error detection
    if (metric.errors && metric.errors.length > 0) {
      anomalies.push({
        timestamp: Date.now(),
        type: 'error',
        severity: 'high',
        description: `Processing errors detected: ${metric.errors.length} errors`,
        metrics: {
          value: metric.errors.length,
          threshold: 0,
          unit: 'errors',
        },
        possibleCauses: [
          'Invalid input data',
          'Processing pipeline failures',
          'System resource exhaustion',
          'Network connectivity issues',
        ],
        suggestedActions: [
          'Review error logs',
          'Validate input data',
          'Check system resources',
          'Implement retry logic',
        ],
      });
    }

    return anomalies;
  }

  private checkAnomalousValue(
    metricName: string,
    value: number,
    lowerIsBad: boolean = false,
  ): { threshold: number; deviations: number } | null {
    const values = this.baselines.get(metricName);
    if (!values || values.length < 10) return null; // Need at least 10 values

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return null; // No variation in baseline

    const deviations = Math.abs(value - mean) / stdDev;

    if (deviations > this.sensitivityMultiplier) {
      // Check if it's the right kind of anomaly
      if (lowerIsBad && value < mean - stdDev * this.sensitivityMultiplier) {
        return {
          threshold: mean - stdDev * this.sensitivityMultiplier,
          deviations,
        };
      } else if (
        !lowerIsBad &&
        value > mean + stdDev * this.sensitivityMultiplier
      ) {
        return {
          threshold: mean + stdDev * this.sensitivityMultiplier,
          deviations,
        };
      }
    }

    return null;
  }

  private calculateSeverity(deviations: number): Anomaly['severity'] {
    if (deviations > 5) return 'critical';
    if (deviations > 4) return 'high';
    if (deviations > 3) return 'medium';
    return 'low';
  }
}

class AlertManager extends EventEmitter {
  private rules: AlertRule[] = [];

  constructor() {
    super();
    this.setupDefaultRules();
  }

  private setupDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'processing_time_high',
        name: 'High Processing Time',
        condition: {
          metric: 'duration',
          operator: 'gt',
          threshold: 2000, // 2 seconds
          timeWindow: 60000, // 1 minute window
        },
        severity: 'medium',
        enabled: true,
        cooldown: 300000, // 5 minutes cooldown
      },
      {
        id: 'memory_usage_critical',
        name: 'Critical Memory Usage',
        condition: {
          metric: 'memoryUsage.heapUsed',
          operator: 'gt',
          threshold: 1024 * 1024 * 1024, // 1GB
          timeWindow: 30000, // 30 seconds
        },
        severity: 'critical',
        enabled: true,
        cooldown: 60000, // 1 minute cooldown
      },
      {
        id: 'quality_degradation',
        name: 'Quality Degradation',
        condition: {
          metric: 'quality.accuracy',
          operator: 'lt',
          threshold: 0.7, // 70%
          timeWindow: 120000, // 2 minutes
        },
        severity: 'high',
        enabled: true,
        cooldown: 180000, // 3 minutes cooldown
      },
      {
        id: 'cache_miss_ratio_high',
        name: 'High Cache Miss Ratio',
        condition: {
          metric: 'cacheHitRatio',
          operator: 'lt',
          threshold: 0.5, // 50%
          timeWindow: 300000, // 5 minutes
        },
        severity: 'medium',
        enabled: true,
        cooldown: 600000, // 10 minutes cooldown
      },
    ];

    this.rules = defaultRules;
  }

  checkAlerts(metric: ProcessingMetrics): void {
    const now = Date.now();

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldown) {
        continue;
      }

      const value = this.extractMetricValue(metric, rule.condition.metric);
      if (value === undefined) continue;

      const triggered = this.evaluateCondition(value, rule.condition);

      if (triggered) {
        rule.lastTriggered = now;
        this.emit('alert', {
          rule,
          metric,
          value,
          timestamp: now,
        });
      }
    }
  }

  private extractMetricValue(
    metric: ProcessingMetrics,
    path: string,
  ): number | undefined {
    const parts = path.split('.');
    let value: any = metric;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = value[part];
    }

    return typeof value === 'number' ? value : undefined;
  }

  private evaluateCondition(
    value: number,
    condition: AlertRule['condition'],
  ): boolean {
    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'gte':
        return value >= condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'lte':
        return value <= condition.threshold;
      case 'eq':
        return value === condition.threshold;
      default:
        return false;
    }
  }

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex((rule) => rule.id === ruleId);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.find((rule) => rule.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
      return true;
    }
    return false;
  }

  getRules(): AlertRule[] {
    return [...this.rules];
  }
}

export class StylePerformanceMonitor extends EventEmitter {
  private metricsCollector: MetricsCollector;
  private alertManager: AlertManager;
  private anomalyDetector: AnomalyDetector;
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private systemMetricsInterval?: NodeJS.Timeout;
  private currentSystemMetrics: {
    cpuUsage: number;
    memoryUsage: NodeJS.MemoryUsage;
    timestamp: number;
  } | null = null;

  constructor() {
    super();
    this.metricsCollector = new MetricsCollector();
    this.alertManager = new AlertManager();
    this.anomalyDetector = new AnomalyDetector();

    this.setupEventHandlers();
    this.startSystemMonitoring();
  }

  private setupEventHandlers(): void {
    this.alertManager.on('alert', (alertData) => {
      this.emit('alert', alertData);
    });
  }

  private startSystemMonitoring(): void {
    // Monitor system metrics every 5 seconds
    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000);
  }

  private collectSystemMetrics(): void {
    this.currentSystemMetrics = {
      cpuUsage: process.cpuUsage().user / 1000, // Convert to milliseconds
      memoryUsage: process.memoryUsage(),
      timestamp: Date.now(),
    };
  }

  /**
   * WS-184: Track processing performance with comprehensive metrics
   */
  async trackProcessingPerformance(
    processingId: string,
    startTime: number,
    endTime: number,
    result: any, // ProcessingResult from style processing
  ): Promise<void> {
    const duration = endTime - startTime;

    const metric: ProcessingMetrics = {
      processingId,
      startTime,
      endTime,
      duration,
      imageCount: result.metadata?.totalImages || 0,
      vectorCount: result.processedVectors?.length || 0,
      processingType: result.metadata?.totalImages > 1 ? 'batch' : 'single',
      cacheHitRatio: result.performance?.cacheHitRatio || 0,
      memoryUsage:
        this.currentSystemMetrics?.memoryUsage || process.memoryUsage(),
      cpuUsage: this.currentSystemMetrics?.cpuUsage,
      quality: {
        accuracy: result.quality?.accuracy || 0,
        confidence: result.quality?.confidence || 0,
        colorAccuracy: result.metadata?.colorAccuracy || 0,
      },
      errors: result.errors || [],
    };

    // Add to metrics collection
    this.metricsCollector.addMetric(metric);

    // Check for anomalies
    const anomalies = this.anomalyDetector.detectAnomalies(metric);
    if (anomalies.length > 0) {
      this.emit('anomalies', { processingId, anomalies });
    }

    // Check alert conditions
    this.alertManager.checkAlerts(metric);

    // Emit metric for real-time monitoring
    this.emit('metric', metric);

    // Log performance if below target
    if (duration > 2000) {
      // Sub-2-second target
      console.warn(
        `Processing ${processingId} exceeded 2s target: ${duration}ms`,
      );
    }
  }

  /**
   * WS-184: Generate comprehensive performance report
   */
  async generatePerformanceReport(
    timeRange: DateRange,
  ): Promise<PerformanceReport> {
    const metrics = this.metricsCollector.getMetrics(timeRange);

    if (metrics.length === 0) {
      throw new Error('No metrics available for the specified time range');
    }

    // Calculate processing times
    const processingTimes = metrics
      .map((m) => m.duration)
      .sort((a, b) => a - b);
    const totalProcessed = metrics.length;
    const averageProcessingTime =
      processingTimes.reduce((sum, t) => sum + t, 0) / totalProcessed;
    const medianProcessingTime =
      processingTimes[Math.floor(totalProcessed / 2)];
    const p95ProcessingTime =
      processingTimes[Math.floor(totalProcessed * 0.95)];
    const p99ProcessingTime =
      processingTimes[Math.floor(totalProcessed * 0.99)];

    // Calculate throughput
    const timeRangeDuration =
      timeRange.end.getTime() - timeRange.start.getTime();
    const throughput = (totalProcessed / timeRangeDuration) * 1000; // per second

    // Calculate error rate
    const errorCount = metrics.filter(
      (m) => m.errors && m.errors.length > 0,
    ).length;
    const errorRate = errorCount / totalProcessed;

    // Cache performance
    const cacheHitRatios = metrics.map((m) => m.cacheHitRatio);
    const avgCacheHitRatio =
      cacheHitRatios.reduce((sum, r) => sum + r, 0) / cacheHitRatios.length;

    const cacheHits = metrics.filter((m) => m.cacheHitRatio > 0.5);
    const cacheMisses = metrics.filter((m) => m.cacheHitRatio <= 0.5);

    const avgHitTime =
      cacheHits.length > 0
        ? cacheHits.reduce((sum, m) => sum + m.duration, 0) / cacheHits.length
        : 0;
    const avgMissTime =
      cacheMisses.length > 0
        ? cacheMisses.reduce((sum, m) => sum + m.duration, 0) /
          cacheMisses.length
        : 0;

    // Resource utilization
    const memoryUsages = metrics.map((m) => m.memoryUsage.heapUsed);
    const avgMemoryUsage =
      memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length;
    const peakMemoryUsage = Math.max(...memoryUsages);

    const cpuUsages = metrics
      .filter((m) => m.cpuUsage !== undefined)
      .map((m) => m.cpuUsage!);
    const avgCpuUsage =
      cpuUsages.length > 0
        ? cpuUsages.reduce((sum, c) => sum + c, 0) / cpuUsages.length
        : 0;

    // Quality metrics
    const accuracies = metrics.map((m) => m.quality.accuracy);
    const avgAccuracy =
      accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length;

    const confidences = metrics.map((m) => m.quality.confidence);
    const avgConfidence =
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length;

    const colorAccuracies = metrics.map((m) => m.quality.colorAccuracy);
    const avgColorAccuracy =
      colorAccuracies.reduce((sum, c) => sum + c, 0) / colorAccuracies.length;

    // Quality trend analysis
    const recentMetrics = metrics.slice(
      -Math.min(100, Math.floor(metrics.length / 3)),
    );
    const olderMetrics = metrics.slice(
      0,
      Math.min(100, Math.floor(metrics.length / 3)),
    );

    const recentAvgAccuracy =
      recentMetrics.reduce((sum, m) => sum + m.quality.accuracy, 0) /
      recentMetrics.length;
    const olderAvgAccuracy =
      olderMetrics.reduce((sum, m) => sum + m.quality.accuracy, 0) /
      olderMetrics.length;

    let qualityTrend: 'improving' | 'stable' | 'declining' = 'stable';
    const qualityChange = recentAvgAccuracy - olderAvgAccuracy;
    if (Math.abs(qualityChange) > 0.05) {
      // 5% threshold
      qualityTrend = qualityChange > 0 ? 'improving' : 'declining';
    }

    // Bottleneck analysis
    const bottleneckAnalysis = this.analyzeBottlenecks(metrics);

    return {
      timeRange: {
        start: timeRange.start,
        end: timeRange.end,
        duration: timeRangeDuration,
      },
      totalProcessed,
      averageProcessingTime,
      medianProcessingTime,
      p95ProcessingTime,
      p99ProcessingTime,
      throughput,
      errorRate,
      cachePerformance: {
        hitRatio: avgCacheHitRatio,
        averageHitTime: avgHitTime,
        averageMissTime: avgMissTime,
      },
      resourceUtilization: {
        averageMemoryUsage: avgMemoryUsage,
        peakMemoryUsage: peakMemoryUsage,
        averageCpuUsage: avgCpuUsage,
        diskIOOperations: 0, // Would need additional monitoring
      },
      qualityMetrics: {
        averageAccuracy: avgAccuracy,
        averageConfidence: avgConfidence,
        averageColorAccuracy: avgColorAccuracy,
        qualityTrend,
      },
      bottleneckAnalysis,
    };
  }

  /**
   * WS-184: Detect performance anomalies using statistical analysis
   */
  private async detectPerformanceAnomalies(
    metrics: ProcessingMetrics[],
  ): Promise<Anomaly[]> {
    const allAnomalies: Anomaly[] = [];

    for (const metric of metrics) {
      const anomalies = this.anomalyDetector.detectAnomalies(metric);
      allAnomalies.push(...anomalies);
    }

    return allAnomalies;
  }

  private analyzeBottlenecks(
    metrics: ProcessingMetrics[],
  ): PerformanceReport['bottleneckAnalysis'] {
    // Analyze correlation between resource usage and performance
    const highLatencyMetrics = metrics.filter((m) => m.duration > 1500); // >1.5 seconds

    if (highLatencyMetrics.length === 0) {
      return {
        primaryBottleneck: 'cpu',
        bottleneckSeverity: 0,
        recommendations: ['Performance is within acceptable ranges'],
      };
    }

    // Memory bottleneck analysis
    const avgMemoryInHighLatency =
      highLatencyMetrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) /
      highLatencyMetrics.length;
    const avgMemoryOverall =
      metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) /
      metrics.length;
    const memoryCorrelation = avgMemoryInHighLatency / avgMemoryOverall;

    // Cache bottleneck analysis
    const avgCacheHitInHighLatency =
      highLatencyMetrics.reduce((sum, m) => sum + m.cacheHitRatio, 0) /
      highLatencyMetrics.length;
    const avgCacheHitOverall =
      metrics.reduce((sum, m) => sum + m.cacheHitRatio, 0) / metrics.length;
    const cacheCorrelation = 1 - avgCacheHitInHighLatency / avgCacheHitOverall; // Inverted - low cache hit = high correlation

    // Determine primary bottleneck
    let primaryBottleneck: 'cpu' | 'memory' | 'io' | 'cache' | 'network' =
      'cpu';
    let maxCorrelation = 0.5; // Base correlation for CPU

    if (memoryCorrelation > maxCorrelation) {
      primaryBottleneck = 'memory';
      maxCorrelation = memoryCorrelation;
    }

    if (cacheCorrelation > maxCorrelation) {
      primaryBottleneck = 'cache';
      maxCorrelation = cacheCorrelation;
    }

    // Generate recommendations
    const recommendations: string[] = [];

    switch (primaryBottleneck) {
      case 'memory':
        recommendations.push(
          'Implement more aggressive garbage collection',
          'Reduce batch sizes to lower memory pressure',
          'Optimize vector storage and compression',
          'Consider increasing available heap size',
        );
        break;
      case 'cache':
        recommendations.push(
          'Increase cache size for frequently accessed vectors',
          'Implement better cache warming strategies',
          'Optimize cache eviction policies',
          'Pre-compute frequently requested style combinations',
        );
        break;
      case 'cpu':
        recommendations.push(
          'Optimize vector similarity algorithms',
          'Implement more efficient color processing',
          'Consider GPU acceleration for complex operations',
          'Reduce computational complexity in hot paths',
        );
        break;
      default:
        recommendations.push(
          'Monitor system resources for optimization opportunities',
        );
    }

    return {
      primaryBottleneck,
      bottleneckSeverity: Math.min(1, (maxCorrelation - 1) * 2), // 0-1 scale
      recommendations,
    };
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(intervalMs: number = 10000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);

    this.emit('monitoringStarted');
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('monitoringStopped');
  }

  private performHealthCheck(): void {
    const recentMetrics = this.metricsCollector.getLatestMetrics(10);

    if (recentMetrics.length === 0) {
      this.emit('healthCheck', {
        status: 'idle',
        message: 'No recent processing activity',
      });
      return;
    }

    const avgProcessingTime =
      recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
      recentMetrics.length;
    const errorRate =
      recentMetrics.filter((m) => m.errors && m.errors.length > 0).length /
      recentMetrics.length;
    const avgCacheHitRatio =
      recentMetrics.reduce((sum, m) => sum + m.cacheHitRatio, 0) /
      recentMetrics.length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'All systems operating normally';

    if (avgProcessingTime > 2000 || errorRate > 0.1 || avgCacheHitRatio < 0.3) {
      status = 'degraded';
      message = 'Performance below optimal levels';
    }

    if (avgProcessingTime > 5000 || errorRate > 0.3) {
      status = 'unhealthy';
      message = 'Critical performance issues detected';
    }

    this.emit('healthCheck', {
      status,
      message,
      metrics: {
        averageProcessingTime: avgProcessingTime,
        errorRate: errorRate,
        cacheHitRatio: avgCacheHitRatio,
      },
    });
  }

  /**
   * Get current performance statistics
   */
  getCurrentStats(): {
    totalMetrics: number;
    recentAverageProcessingTime: number;
    currentCacheHitRatio: number;
    systemMemoryUsage: number;
    isMonitoring: boolean;
  } {
    const recentMetrics = this.metricsCollector.getLatestMetrics(20);

    return {
      totalMetrics: this.metricsCollector.getMetrics().length,
      recentAverageProcessingTime:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
            recentMetrics.length
          : 0,
      currentCacheHitRatio:
        recentMetrics.length > 0
          ? recentMetrics.reduce((sum, m) => sum + m.cacheHitRatio, 0) /
            recentMetrics.length
          : 0,
      systemMemoryUsage: this.currentSystemMetrics?.memoryUsage.heapUsed || 0,
      isMonitoring: this.isMonitoring,
    };
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertManager.addRule(rule);
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return this.alertManager.getRules();
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopMonitoring();

    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
      this.systemMetricsInterval = undefined;
    }

    // Clean old metrics (older than 24 hours)
    this.metricsCollector.clearOldMetrics(24 * 60 * 60 * 1000);

    this.removeAllListeners();
  }
}

export default StylePerformanceMonitor;
