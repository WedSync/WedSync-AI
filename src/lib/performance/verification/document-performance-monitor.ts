import { ProcessingResult } from './verification-processing-engine';

export interface ProcessingMetrics {
  processingId: string;
  startTime: Date;
  endTime?: Date;
  documentsCount: number;
  successfulDocuments: number;
  failedDocuments: number;
  averageProcessingTime: number;
  averageConfidence: number;
  memoryPeakUsage: number;
  throughputPerSecond: number;
  bottlenecks: ProcessingBottleneck[];
}

export interface ProcessingBottleneck {
  type: 'memory' | 'cpu' | 'io' | 'ocr_engine' | 'cache_miss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
  detectedAt: Date;
}

export interface ProcessingReport {
  reportId: string;
  timeRange: DateRange;
  totalProcessingJobs: number;
  totalDocumentsProcessed: number;
  averageProcessingTime: number;
  processingTimePercentiles: ProcessingPercentiles;
  successRate: number;
  averageConfidence: number;
  resourceUtilization: ResourceUtilization;
  performanceTrends: PerformanceTrend[];
  recommendations: OptimizationRecommendation[];
  generatedAt: Date;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ProcessingPercentiles {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface ResourceUtilization {
  averageCpuUsage: number;
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  diskIOOperations: number;
  networkBandwidthUsed: number;
  workerPoolEfficiency: number;
}

export interface PerformanceTrend {
  metric: string;
  trend: 'improving' | 'declining' | 'stable';
  changePercent: number;
  timeframe: string;
}

export interface OptimizationRecommendation {
  category: 'performance' | 'resource' | 'accuracy' | 'cost';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedImpact: string;
  implementationEffort: 'low' | 'medium' | 'high';
}

export interface Anomaly {
  id: string;
  type:
    | 'performance_degradation'
    | 'accuracy_drop'
    | 'resource_spike'
    | 'failure_spike';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  affectedDocuments: number;
  potentialCauses: string[];
  recommendedActions: string[];
}

export interface AlertManager {
  sendAlert(alert: ProcessingAlert): Promise<void>;
  getActiveAlerts(): Promise<ProcessingAlert[]>;
  acknowledgeAlert(alertId: string): Promise<void>;
}

export interface ProcessingAlert {
  id: string;
  type: 'performance' | 'accuracy' | 'resource' | 'failure';
  severity: 'warning' | 'error' | 'critical';
  message: string;
  details: any;
  createdAt: Date;
  acknowledgedAt?: Date;
}

export class DocumentPerformanceMonitor {
  private metricsStorage: Map<string, ProcessingMetrics> = new Map();
  private historicalData: ProcessingMetrics[] = [];
  private alertManager: AlertManager;
  private performanceBaselines: Map<string, number> = new Map();
  private anomalDetectors: Map<string, AnomalyDetector> = new Map();
  private isInitialized: boolean = false;

  constructor(alertManager?: AlertManager) {
    this.alertManager = alertManager || new DefaultAlertManager();
    this.initializePerformanceBaselines();
    this.initializeAnomalyDetectors();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Start background monitoring tasks
    this.startPerformanceMonitoring();
    this.startAnomalyDetection();

    this.isInitialized = true;
  }

  async trackProcessingStart(
    processingId: string,
    documentsCount: number,
  ): Promise<void> {
    const metrics: ProcessingMetrics = {
      processingId,
      startTime: new Date(),
      documentsCount,
      successfulDocuments: 0,
      failedDocuments: 0,
      averageProcessingTime: 0,
      averageConfidence: 0,
      memoryPeakUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      throughputPerSecond: 0,
      bottlenecks: [],
    };

    this.metricsStorage.set(processingId, metrics);
  }

  async trackProcessingPerformance(
    processingId: string,
    startTime: number,
    endTime: number,
    result: ProcessingResult,
  ): Promise<void> {
    const metrics = this.metricsStorage.get(processingId);
    if (!metrics) {
      console.warn(`No metrics found for processing ID: ${processingId}`);
      return;
    }

    const processingTime = endTime - startTime;

    // Update metrics
    if (result.success) {
      metrics.successfulDocuments++;
    } else {
      metrics.failedDocuments++;
    }

    // Update running averages
    const totalProcessed =
      metrics.successfulDocuments + metrics.failedDocuments;
    metrics.averageProcessingTime =
      (metrics.averageProcessingTime * (totalProcessed - 1) + processingTime) /
      totalProcessed;

    if (result.success) {
      const successfulCount = metrics.successfulDocuments;
      metrics.averageConfidence =
        (metrics.averageConfidence * (successfulCount - 1) +
          result.confidence) /
        successfulCount;
    }

    // Track memory usage
    const currentMemoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    metrics.memoryPeakUsage = Math.max(
      metrics.memoryPeakUsage,
      currentMemoryUsage,
    );

    // Detect bottlenecks in real-time
    await this.detectBottlenecks(processingId, processingTime, result);
  }

  async trackProcessingCompletion(
    processingId: string,
    totalTime: number,
    results: ProcessingResult[],
  ): Promise<void> {
    const metrics = this.metricsStorage.get(processingId);
    if (!metrics) {
      console.warn(`No metrics found for processing ID: ${processingId}`);
      return;
    }

    metrics.endTime = new Date();
    metrics.throughputPerSecond = results.length / (totalTime / 1000);

    // Store in historical data
    this.historicalData.push({ ...metrics });

    // Trigger performance analysis
    await this.analyzeProcessingPerformance(metrics);

    // Clean up metrics storage (keep last 100 entries)
    if (this.metricsStorage.size > 100) {
      const oldestKey = this.metricsStorage.keys().next().value;
      this.metricsStorage.delete(oldestKey);
    }
  }

  async trackProcessingFailure(
    processingId: string,
    error: Error,
  ): Promise<void> {
    const metrics = this.metricsStorage.get(processingId);
    if (metrics) {
      metrics.endTime = new Date();
      metrics.failedDocuments = metrics.documentsCount;

      // Add failure bottleneck
      metrics.bottlenecks.push({
        type: 'ocr_engine',
        severity: 'high',
        description: `Processing failed: ${error.message}`,
        impact: 'Complete processing failure',
        recommendation:
          'Check OCR engine configuration and resource availability',
        detectedAt: new Date(),
      });

      // Store failure in historical data
      this.historicalData.push({ ...metrics });
    }

    // Send failure alert
    await this.alertManager.sendAlert({
      id: `failure_${processingId}_${Date.now()}`,
      type: 'failure',
      severity: 'error',
      message: `Processing failed for batch ${processingId}`,
      details: { processingId, error: error.message },
      createdAt: new Date(),
    });
  }

  async generateProcessingReport(
    timeRange: DateRange,
  ): Promise<ProcessingReport> {
    const relevantMetrics = this.historicalData.filter(
      (metric) =>
        metric.startTime >= timeRange.startDate &&
        metric.startTime <= timeRange.endDate,
    );

    if (relevantMetrics.length === 0) {
      throw new Error('No data available for the specified time range');
    }

    const totalDocuments = relevantMetrics.reduce(
      (sum, metric) => sum + metric.documentsCount,
      0,
    );
    const successfulDocuments = relevantMetrics.reduce(
      (sum, metric) => sum + metric.successfulDocuments,
      0,
    );
    const processingTimes = relevantMetrics.map(
      (metric) => metric.averageProcessingTime,
    );

    return {
      reportId: `report_${Date.now()}`,
      timeRange,
      totalProcessingJobs: relevantMetrics.length,
      totalDocumentsProcessed: totalDocuments,
      averageProcessingTime: this.calculateAverage(processingTimes),
      processingTimePercentiles: this.calculatePercentiles(processingTimes),
      successRate: (successfulDocuments / totalDocuments) * 100,
      averageConfidence: this.calculateAverageConfidence(relevantMetrics),
      resourceUtilization: this.calculateResourceUtilization(relevantMetrics),
      performanceTrends: this.analyzePerformanceTrends(relevantMetrics),
      recommendations:
        this.generateOptimizationRecommendations(relevantMetrics),
      generatedAt: new Date(),
    };
  }

  private async detectBottlenecks(
    processingId: string,
    processingTime: number,
    result: ProcessingResult,
  ): Promise<void> {
    const metrics = this.metricsStorage.get(processingId);
    if (!metrics) return;

    const bottlenecks: ProcessingBottleneck[] = [];

    // Detect slow processing
    const expectedTime =
      this.performanceBaselines.get('expected_processing_time') || 15000;
    if (processingTime > expectedTime * 2) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'high',
        description: `Processing time (${processingTime}ms) exceeds baseline by 100%+`,
        impact: 'Significantly slower document processing',
        recommendation:
          'Consider scaling processing resources or optimizing OCR parameters',
        detectedAt: new Date(),
      });
    }

    // Detect memory issues
    const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const memoryThreshold = 1024; // 1GB
    if (currentMemory > memoryThreshold) {
      bottlenecks.push({
        type: 'memory',
        severity: 'medium',
        description: `Memory usage (${currentMemory.toFixed(2)}MB) exceeds threshold`,
        impact: 'Potential memory pressure affecting performance',
        recommendation:
          'Implement more aggressive memory cleanup between batches',
        detectedAt: new Date(),
      });
    }

    // Detect low confidence scores
    if (result.success && result.confidence < 0.7) {
      bottlenecks.push({
        type: 'ocr_engine',
        severity: 'medium',
        description: `Low OCR confidence score: ${result.confidence}`,
        impact: 'Reduced accuracy in data extraction',
        recommendation: 'Improve image preprocessing or adjust OCR parameters',
        detectedAt: new Date(),
      });
    }

    // Add detected bottlenecks to metrics
    metrics.bottlenecks.push(...bottlenecks);

    // Send alerts for critical bottlenecks
    for (const bottleneck of bottlenecks) {
      if (
        bottleneck.severity === 'critical' ||
        bottleneck.severity === 'high'
      ) {
        await this.alertManager.sendAlert({
          id: `bottleneck_${processingId}_${Date.now()}`,
          type: 'performance',
          severity: bottleneck.severity === 'critical' ? 'critical' : 'warning',
          message: `Performance bottleneck detected: ${bottleneck.description}`,
          details: { processingId, bottleneck },
          createdAt: new Date(),
        });
      }
    }
  }

  private async detectProcessingAnomalies(
    metrics: ProcessingMetrics[],
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    if (metrics.length < 5) return anomalies; // Need sufficient data

    const recentMetrics = metrics.slice(-10);
    const averageProcessingTime = this.calculateAverage(
      recentMetrics.map((m) => m.averageProcessingTime),
    );

    // Detect processing time anomalies
    const baselineProcessingTime =
      this.performanceBaselines.get('average_processing_time') || 10000;
    if (averageProcessingTime > baselineProcessingTime * 1.5) {
      anomalies.push({
        id: `anomaly_processing_time_${Date.now()}`,
        type: 'performance_degradation',
        severity: 'medium',
        description: `Average processing time increased by ${((averageProcessingTime / baselineProcessingTime - 1) * 100).toFixed(1)}%`,
        detectedAt: new Date(),
        affectedDocuments: recentMetrics.reduce(
          (sum, m) => sum + m.documentsCount,
          0,
        ),
        potentialCauses: [
          'Increased document complexity',
          'Resource contention',
          'OCR engine degradation',
          'Memory pressure',
        ],
        recommendedActions: [
          'Check system resources',
          'Review recent document batches',
          'Consider scaling processing capacity',
          'Optimize OCR parameters',
        ],
      });
    }

    // Detect accuracy anomalies
    const recentConfidence = this.calculateAverageConfidence(recentMetrics);
    const baselineConfidence =
      this.performanceBaselines.get('average_confidence') || 0.85;
    if (recentConfidence < baselineConfidence * 0.9) {
      anomalies.push({
        id: `anomaly_accuracy_${Date.now()}`,
        type: 'accuracy_drop',
        severity: 'high',
        description: `OCR confidence dropped to ${(recentConfidence * 100).toFixed(1)}%`,
        detectedAt: new Date(),
        affectedDocuments: recentMetrics.reduce(
          (sum, m) => sum + m.successfulDocuments,
          0,
        ),
        potentialCauses: [
          'Poor document quality',
          'OCR configuration issues',
          'New document types',
          'Preprocessing problems',
        ],
        recommendedActions: [
          'Review document preprocessing pipeline',
          'Adjust OCR parameters',
          'Implement additional quality checks',
          'Consider manual verification for low-confidence results',
        ],
      });
    }

    return anomalies;
  }

  private initializePerformanceBaselines(): void {
    // Set baseline performance expectations
    this.performanceBaselines.set('expected_processing_time', 15000); // 15 seconds
    this.performanceBaselines.set('average_processing_time', 10000); // 10 seconds
    this.performanceBaselines.set('average_confidence', 0.85); // 85%
    this.performanceBaselines.set('success_rate', 0.95); // 95%
    this.performanceBaselines.set('memory_threshold', 512); // 512MB
  }

  private initializeAnomalyDetectors(): void {
    // Initialize statistical anomaly detectors
    this.anomalDetectors.set(
      'processing_time',
      new StatisticalAnomalyDetector(),
    );
    this.anomalDetectors.set(
      'confidence_score',
      new StatisticalAnomalyDetector(),
    );
    this.anomalDetectors.set('memory_usage', new StatisticalAnomalyDetector());
  }

  private startPerformanceMonitoring(): void {
    // Monitor system resources every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);
  }

  private startAnomalyDetection(): void {
    // Check for anomalies every 5 minutes
    setInterval(async () => {
      const recentMetrics = this.historicalData.slice(-20);
      const anomalies = await this.detectProcessingAnomalies(recentMetrics);

      for (const anomaly of anomalies) {
        await this.alertManager.sendAlert({
          id: anomaly.id,
          type: 'performance',
          severity: anomaly.severity === 'critical' ? 'critical' : 'warning',
          message: `Anomaly detected: ${anomaly.description}`,
          details: anomaly,
          createdAt: new Date(),
        });
      }
    }, 300000);
  }

  private collectSystemMetrics(): void {
    const memoryUsage = process.memoryUsage();
    // Store system metrics for trend analysis
    // Implementation would store in time-series database
  }

  private async analyzeProcessingPerformance(
    metrics: ProcessingMetrics,
  ): Promise<void> {
    // Analyze individual processing job performance
    // Update baselines if needed
    // Trigger optimization recommendations
  }

  private calculateAverage(values: number[]): number {
    return values.length > 0
      ? values.reduce((sum, val) => sum + val, 0) / values.length
      : 0;
  }

  private calculatePercentiles(values: number[]): ProcessingPercentiles {
    const sorted = [...values].sort((a, b) => a - b);
    const length = sorted.length;

    return {
      p50: sorted[Math.floor(length * 0.5)] || 0,
      p90: sorted[Math.floor(length * 0.9)] || 0,
      p95: sorted[Math.floor(length * 0.95)] || 0,
      p99: sorted[Math.floor(length * 0.99)] || 0,
    };
  }

  private calculateAverageConfidence(metrics: ProcessingMetrics[]): number {
    const successfulMetrics = metrics.filter((m) => m.successfulDocuments > 0);
    if (successfulMetrics.length === 0) return 0;

    return (
      successfulMetrics.reduce((sum, m) => sum + m.averageConfidence, 0) /
      successfulMetrics.length
    );
  }

  private calculateResourceUtilization(
    metrics: ProcessingMetrics[],
  ): ResourceUtilization {
    return {
      averageCpuUsage: 65 + Math.random() * 20, // Mock values
      averageMemoryUsage:
        metrics.reduce((sum, m) => sum + m.memoryPeakUsage, 0) / metrics.length,
      peakMemoryUsage: Math.max(...metrics.map((m) => m.memoryPeakUsage)),
      diskIOOperations: 1000 + Math.random() * 5000,
      networkBandwidthUsed: 50 + Math.random() * 100,
      workerPoolEfficiency: 75 + Math.random() * 20,
    };
  }

  private analyzePerformanceTrends(
    metrics: ProcessingMetrics[],
  ): PerformanceTrend[] {
    // Mock trend analysis - in production would do statistical analysis
    return [
      {
        metric: 'processing_time',
        trend: 'improving',
        changePercent: -5.2,
        timeframe: 'last_7_days',
      },
      {
        metric: 'confidence_score',
        trend: 'stable',
        changePercent: 0.8,
        timeframe: 'last_7_days',
      },
    ];
  }

  private generateOptimizationRecommendations(
    metrics: ProcessingMetrics[],
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    const avgProcessingTime = this.calculateAverage(
      metrics.map((m) => m.averageProcessingTime),
    );
    const avgConfidence = this.calculateAverageConfidence(metrics);

    if (avgProcessingTime > 20000) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        description: 'Processing time exceeds target of 20 seconds',
        expectedImpact: 'Reduce average processing time by 25-40%',
        implementationEffort: 'medium',
      });
    }

    if (avgConfidence < 0.8) {
      recommendations.push({
        category: 'accuracy',
        priority: 'high',
        description: 'OCR confidence below 80% threshold',
        expectedImpact:
          'Improve extraction accuracy and reduce manual verification',
        implementationEffort: 'medium',
      });
    }

    return recommendations;
  }

  async shutdown(): Promise<void> {
    // Clean up monitoring intervals and resources
    this.isInitialized = false;
  }
}

class DefaultAlertManager implements AlertManager {
  private alerts: ProcessingAlert[] = [];

  async sendAlert(alert: ProcessingAlert): Promise<void> {
    this.alerts.push(alert);
    console.warn(`ALERT [${alert.severity}]: ${alert.message}`, alert.details);
  }

  async getActiveAlerts(): Promise<ProcessingAlert[]> {
    return this.alerts.filter((alert) => !alert.acknowledgedAt);
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledgedAt = new Date();
    }
  }
}

class StatisticalAnomalyDetector {
  private dataPoints: number[] = [];
  private maxDataPoints = 100;

  addDataPoint(value: number): void {
    this.dataPoints.push(value);
    if (this.dataPoints.length > this.maxDataPoints) {
      this.dataPoints.shift();
    }
  }

  detectAnomaly(value: number, threshold: number = 2): boolean {
    if (this.dataPoints.length < 10) return false;

    const mean =
      this.dataPoints.reduce((sum, val) => sum + val, 0) /
      this.dataPoints.length;
    const variance =
      this.dataPoints.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      this.dataPoints.length;
    const stdDev = Math.sqrt(variance);

    return Math.abs(value - mean) > threshold * stdDev;
  }
}

interface AnomalyDetector {
  addDataPoint(value: number): void;
  detectAnomaly(value: number, threshold?: number): boolean;
}

// Export singleton instance
export const documentPerformanceMonitor = new DocumentPerformanceMonitor();
