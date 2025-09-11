/**
 * WS-221 Team D - Branding Performance Monitoring System
 * Real-time performance tracking for brand assets and mobile optimization
 */

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  metricType:
    | 'load_time'
    | 'cache_hit'
    | 'optimization_time'
    | 'memory_usage'
    | 'error_rate';
  value: number;
  metadata: Record<string, any>;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  networkType?: 'slow-2g' | '2g' | '3g' | '4g' | '5g';
}

export interface BrandingPerformanceConfig {
  enableRealTimeMonitoring: boolean;
  sampleRate: number; // 0.0 to 1.0
  alertThresholds: {
    loadTime: number; // ms
    errorRate: number; // percentage
    memoryUsage: number; // MB
  };
  retentionDays: number;
}

export class BrandingPerformanceMonitor {
  private static instance: BrandingPerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private config: BrandingPerformanceConfig;

  private constructor(config: BrandingPerformanceConfig) {
    this.config = config;
    this.initializeMonitoring();
  }

  public static getInstance(
    config?: BrandingPerformanceConfig,
  ): BrandingPerformanceMonitor {
    if (!BrandingPerformanceMonitor.instance) {
      const defaultConfig: BrandingPerformanceConfig = {
        enableRealTimeMonitoring: true,
        sampleRate: 0.1, // 10% sampling for production
        alertThresholds: {
          loadTime: 2000, // 2 seconds
          errorRate: 5, // 5%
          memoryUsage: 50, // 50MB
        },
        retentionDays: 7,
      };
      BrandingPerformanceMonitor.instance = new BrandingPerformanceMonitor(
        config || defaultConfig,
      );
    }
    return BrandingPerformanceMonitor.instance;
  }

  /**
   * Track asset loading performance
   */
  trackAssetLoad(assetId: string, assetType: string, startTime: number): void {
    if (!this.shouldSample()) return;

    const loadTime = performance.now() - startTime;
    const deviceType = this.getDeviceType();
    const networkType = this.getNetworkType();

    this.recordMetric({
      id: this.generateMetricId(),
      timestamp: new Date(),
      metricType: 'load_time',
      value: loadTime,
      metadata: {
        assetId,
        assetType,
        url: window.location.href,
      },
      deviceType,
      networkType,
    });

    // Alert if load time exceeds threshold
    if (loadTime > this.config.alertThresholds.loadTime) {
      this.triggerAlert('slow_load', {
        assetId,
        loadTime,
        threshold: this.config.alertThresholds.loadTime,
      });
    }
  }

  /**
   * Track cache performance
   */
  trackCachePerformance(operation: 'hit' | 'miss', assetId: string): void {
    if (!this.shouldSample()) return;

    this.recordMetric({
      id: this.generateMetricId(),
      timestamp: new Date(),
      metricType: 'cache_hit',
      value: operation === 'hit' ? 1 : 0,
      metadata: {
        assetId,
        operation,
        cacheSize: this.getCurrentCacheSize(),
      },
      deviceType: this.getDeviceType(),
    });
  }

  /**
   * Track optimization performance
   */
  trackOptimizationTime(assetId: string, optimizationTime: number): void {
    if (!this.shouldSample()) return;

    this.recordMetric({
      id: this.generateMetricId(),
      timestamp: new Date(),
      metricType: 'optimization_time',
      value: optimizationTime,
      metadata: {
        assetId,
      },
      deviceType: this.getDeviceType(),
    });
  }

  /**
   * Track memory usage
   */
  trackMemoryUsage(): void {
    if (!this.shouldSample() || !('memory' in performance)) return;

    const memory = (performance as any).memory;
    const usedJSHeapSize = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB

    this.recordMetric({
      id: this.generateMetricId(),
      timestamp: new Date(),
      metricType: 'memory_usage',
      value: usedJSHeapSize,
      metadata: {
        totalJSHeapSize: memory.totalJSHeapSize / (1024 * 1024),
        jsHeapSizeLimit: memory.jsHeapSizeLimit / (1024 * 1024),
      },
      deviceType: this.getDeviceType(),
    });

    // Alert if memory usage exceeds threshold
    if (usedJSHeapSize > this.config.alertThresholds.memoryUsage) {
      this.triggerAlert('high_memory', {
        memoryUsage: usedJSHeapSize,
        threshold: this.config.alertThresholds.memoryUsage,
      });
    }
  }

  /**
   * Track error rates
   */
  trackError(error: Error, context: string): void {
    this.recordMetric({
      id: this.generateMetricId(),
      timestamp: new Date(),
      metricType: 'error_rate',
      value: 1,
      metadata: {
        error: error.message,
        context,
        stack: error.stack,
      },
      deviceType: this.getDeviceType(),
    });

    // Calculate error rate and alert if needed
    const recentErrors = this.getRecentErrorRate();
    if (recentErrors > this.config.alertThresholds.errorRate) {
      this.triggerAlert('high_error_rate', {
        errorRate: recentErrors,
        threshold: this.config.alertThresholds.errorRate,
      });
    }
  }

  /**
   * Get performance dashboard data
   */
  getDashboardMetrics(timeRange: 'hour' | 'day' | 'week' = 'day'): {
    averageLoadTime: number;
    cacheHitRate: number;
    errorRate: number;
    memoryUsage: number;
    deviceBreakdown: Record<string, number>;
    networkBreakdown: Record<string, number>;
  } {
    const cutoffTime = this.getCutoffTime(timeRange);
    const relevantMetrics = this.metrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );

    const loadTimeMetrics = relevantMetrics.filter(
      (m) => m.metricType === 'load_time',
    );
    const cacheMetrics = relevantMetrics.filter(
      (m) => m.metricType === 'cache_hit',
    );
    const errorMetrics = relevantMetrics.filter(
      (m) => m.metricType === 'error_rate',
    );
    const memoryMetrics = relevantMetrics.filter(
      (m) => m.metricType === 'memory_usage',
    );

    return {
      averageLoadTime: this.calculateAverage(
        loadTimeMetrics.map((m) => m.value),
      ),
      cacheHitRate: this.calculatePercentage(cacheMetrics, 1),
      errorRate:
        (errorMetrics.length / Math.max(relevantMetrics.length, 1)) * 100,
      memoryUsage: this.calculateAverage(memoryMetrics.map((m) => m.value)),
      deviceBreakdown: this.calculateDeviceBreakdown(relevantMetrics),
      networkBreakdown: this.calculateNetworkBreakdown(relevantMetrics),
    };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.convertToCSV(this.metrics);
    }
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Clear old metrics to prevent memory leaks
   */
  cleanupOldMetrics(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    this.metrics = this.metrics.filter((m) => m.timestamp >= cutoffDate);
  }

  // Private methods
  private initializeMonitoring(): void {
    if (!this.config.enableRealTimeMonitoring) return;

    // Monitor resource loading
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (
            entry.name.includes('logo') ||
            entry.name.includes('brand') ||
            entry.name.includes('theme')
          ) {
            this.trackAssetLoad(entry.name, 'resource', entry.startTime);
          }
        });
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    }

    // Periodic memory monitoring
    setInterval(() => {
      this.trackMemoryUsage();
    }, 30000); // Every 30 seconds

    // Cleanup old metrics daily
    setInterval(
      () => {
        this.cleanupOldMetrics();
      },
      24 * 60 * 60 * 1000,
    ); // Daily
  }

  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Prevent memory bloat
    if (this.metrics.length > 10000) {
      this.metrics.shift();
    }
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width <= 768) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  private getNetworkType(): PerformanceMetric['networkType'] {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || undefined;
    }
    return undefined;
  }

  private getCurrentCacheSize(): number {
    // Estimate current cache size (implement based on actual cache implementation)
    return 0;
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private triggerAlert(alertType: string, data: any): void {
    console.warn(`[BrandingPerformance] Alert: ${alertType}`, data);

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service (implement actual alert system)
    }
  }

  private getRecentErrorRate(): number {
    const recentTime = new Date();
    recentTime.setMinutes(recentTime.getMinutes() - 5); // Last 5 minutes

    const recentMetrics = this.metrics.filter((m) => m.timestamp >= recentTime);
    const errorCount = recentMetrics.filter(
      (m) => m.metricType === 'error_rate',
    ).length;

    return recentMetrics.length > 0
      ? (errorCount / recentMetrics.length) * 100
      : 0;
  }

  private getCutoffTime(timeRange: 'hour' | 'day' | 'week'): Date {
    const cutoff = new Date();
    switch (timeRange) {
      case 'hour':
        cutoff.setHours(cutoff.getHours() - 1);
        break;
      case 'day':
        cutoff.setDate(cutoff.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(cutoff.getDate() - 7);
        break;
    }
    return cutoff;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculatePercentage(
    metrics: PerformanceMetric[],
    targetValue: number,
  ): number {
    if (metrics.length === 0) return 0;
    const matches = metrics.filter((m) => m.value === targetValue).length;
    return (matches / metrics.length) * 100;
  }

  private calculateDeviceBreakdown(
    metrics: PerformanceMetric[],
  ): Record<string, number> {
    const breakdown: Record<string, number> = {
      mobile: 0,
      tablet: 0,
      desktop: 0,
    };
    metrics.forEach((m) => {
      breakdown[m.deviceType] = (breakdown[m.deviceType] || 0) + 1;
    });
    return breakdown;
  }

  private calculateNetworkBreakdown(
    metrics: PerformanceMetric[],
  ): Record<string, number> {
    const breakdown: Record<string, number> = {};
    metrics.forEach((m) => {
      if (m.networkType) {
        breakdown[m.networkType] = (breakdown[m.networkType] || 0) + 1;
      }
    });
    return breakdown;
  }

  private convertToCSV(metrics: PerformanceMetric[]): string {
    const headers = [
      'id',
      'timestamp',
      'metricType',
      'value',
      'deviceType',
      'networkType',
    ];
    const rows = metrics.map((m) => [
      m.id,
      m.timestamp.toISOString(),
      m.metricType,
      m.value.toString(),
      m.deviceType,
      m.networkType || '',
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }
}

export const brandingPerformanceMonitor =
  BrandingPerformanceMonitor.getInstance();
