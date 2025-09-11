/**
 * WS-145: Performance Optimization Targets Implementation
 * Core Web Vitals Performance Monitoring Service
 */

import { onLCP, onFID, onCLS, onTTFB, onINP, Metric } from 'web-vitals';

// Performance targets from WS-145 specification
export const PERFORMANCE_TARGETS = {
  LCP: {
    good: 2500, // Largest Contentful Paint < 2.5s
    poor: 4000, // > 4s is poor
    mobile: 3000, // Slightly relaxed for mobile
  },
  FID: {
    good: 100, // First Input Delay < 100ms
    poor: 300, // > 300ms is poor
    mobile: 100, // Same for mobile
  },
  CLS: {
    good: 0.1, // Cumulative Layout Shift < 0.1
    poor: 0.25, // > 0.25 is poor
    mobile: 0.1, // Same for mobile
  },
  TTFB: {
    good: 800, // Time to First Byte < 800ms
    poor: 1800, // > 1.8s is poor
    mobile: 800, // Same for mobile
  },
  INP: {
    good: 200, // Interaction to Next Paint < 200ms
    poor: 500, // > 500ms is poor
    mobile: 200, // Same for mobile
  },
} as const;

// Bundle size targets from WS-145 specification
export const BUNDLE_TARGETS = {
  main: 200000, // 200KB main bundle
  vendor: 300000, // 300KB vendor bundle
  forms: 150000, // 150KB forms module
  dashboard: 180000, // 180KB dashboard module
  total: 800000, // 800KB total JS
} as const;

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
  deviceType: 'desktop' | 'mobile';
  connectionType?: string;
  userId?: string;
}

export interface BundleStats {
  main: number;
  vendor: number;
  forms: number;
  dashboard: number;
  total: number;
  timestamp: number;
}

export interface PerformanceAlert {
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: number;
  url: string;
  deviceType: string;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private bundleStats: BundleStats[] = [];
  private alerts: PerformanceAlert[] = [];
  private isInitialized = false;
  private userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  public initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    // Set up Core Web Vitals monitoring
    onLCP(this.handleLCP.bind(this));
    onFID(this.handleFID.bind(this));
    onCLS(this.handleCLS.bind(this));
    onTTFB(this.handleTTFB.bind(this));
    onINP(this.handleINP.bind(this));

    // Collect bundle stats
    this.collectBundleStats();

    // Set up page visibility change listener for final metrics
    document.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange.bind(this),
    );

    this.isInitialized = true;
    console.log('PerformanceMonitor initialized');
  }

  /**
   * Handle Largest Contentful Paint metric
   */
  private handleLCP(metric: Metric): void {
    const performanceMetric = this.createPerformanceMetric('LCP', metric);
    this.recordMetric(performanceMetric);
    this.checkThreshold('LCP', metric.value, PERFORMANCE_TARGETS.LCP);
  }

  /**
   * Handle First Input Delay metric
   */
  private handleFID(metric: Metric): void {
    const performanceMetric = this.createPerformanceMetric('FID', metric);
    this.recordMetric(performanceMetric);
    this.checkThreshold('FID', metric.value, PERFORMANCE_TARGETS.FID);
  }

  /**
   * Handle Cumulative Layout Shift metric
   */
  private handleCLS(metric: Metric): void {
    const performanceMetric = this.createPerformanceMetric('CLS', metric);
    this.recordMetric(performanceMetric);
    this.checkThreshold('CLS', metric.value, PERFORMANCE_TARGETS.CLS);
  }

  /**
   * Handle Time to First Byte metric
   */
  private handleTTFB(metric: Metric): void {
    const performanceMetric = this.createPerformanceMetric('TTFB', metric);
    this.recordMetric(performanceMetric);
    this.checkThreshold('TTFB', metric.value, PERFORMANCE_TARGETS.TTFB);
  }

  /**
   * Handle Interaction to Next Paint metric
   */
  private handleINP(metric: Metric): void {
    const performanceMetric = this.createPerformanceMetric('INP', metric);
    this.recordMetric(performanceMetric);
    this.checkThreshold('INP', metric.value, PERFORMANCE_TARGETS.INP);
  }

  /**
   * Create a standardized performance metric object
   */
  private createPerformanceMetric(
    name: string,
    metric: Metric,
  ): PerformanceMetric {
    const deviceType = this.getDeviceType();
    const rating = this.getRating(name, metric.value, deviceType);

    return {
      id: metric.id,
      name,
      value: metric.value,
      rating,
      timestamp: Date.now(),
      url: window.location.href,
      deviceType,
      connectionType: this.getConnectionType(),
      userId: this.userId,
    };
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    this.metrics.get(metric.name)!.push(metric);

    // Send to analytics API
    this.sendMetricToAPI(metric);
  }

  /**
   * Get performance rating based on metric and device type
   */
  private getRating(
    metricName: string,
    value: number,
    deviceType: 'desktop' | 'mobile',
  ): 'good' | 'needs-improvement' | 'poor' {
    const targets =
      PERFORMANCE_TARGETS[metricName as keyof typeof PERFORMANCE_TARGETS];
    if (!targets) return 'good';

    const goodThreshold =
      deviceType === 'mobile' && targets.mobile ? targets.mobile : targets.good;
    const poorThreshold = targets.poor;

    if (value <= goodThreshold) return 'good';
    if (value <= poorThreshold) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Check if metric exceeds thresholds and create alerts
   */
  private checkThreshold(
    metricName: string,
    value: number,
    thresholds: { good: number; poor: number; mobile?: number },
  ): void {
    const deviceType = this.getDeviceType();
    const goodThreshold =
      deviceType === 'mobile' && thresholds.mobile
        ? thresholds.mobile
        : thresholds.good;
    const poorThreshold = thresholds.poor;

    if (value > poorThreshold) {
      this.createAlert(metricName, value, poorThreshold, 'critical');
    } else if (value > goodThreshold) {
      this.createAlert(metricName, value, goodThreshold, 'warning');
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(
    metric: string,
    value: number,
    threshold: number,
    severity: 'warning' | 'critical',
  ): void {
    const alert: PerformanceAlert = {
      metric,
      value,
      threshold,
      severity,
      timestamp: Date.now(),
      url: window.location.href,
      deviceType: this.getDeviceType(),
    };

    this.alerts.push(alert);

    // Send alert to monitoring system
    this.sendAlertToAPI(alert);

    // Log to console for development
    console.warn(
      `Performance Alert: ${metric} = ${value}ms exceeds ${severity} threshold of ${threshold}ms`,
    );
  }

  /**
   * Collect bundle size statistics
   */
  private collectBundleStats(): void {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return;
    }

    const resources = performance.getEntriesByType(
      'resource',
    ) as PerformanceResourceTiming[];
    const jsResources = resources.filter((r) => r.name.endsWith('.js'));

    const stats: BundleStats = {
      main: this.calculateBundleSize(jsResources, 'main'),
      vendor: this.calculateBundleSize(jsResources, 'vendor'),
      forms: this.calculateBundleSize(jsResources, 'forms'),
      dashboard: this.calculateBundleSize(jsResources, 'dashboard'),
      total: jsResources.reduce((total, r) => total + (r.transferSize || 0), 0),
      timestamp: Date.now(),
    };

    this.bundleStats.push(stats);

    // Check bundle size thresholds
    this.checkBundleThresholds(stats);

    // Send to analytics API
    this.sendBundleStatsToAPI(stats);
  }

  /**
   * Calculate bundle size for a specific bundle type
   */
  private calculateBundleSize(
    resources: PerformanceResourceTiming[],
    bundleType: string,
  ): number {
    return resources
      .filter((r) => r.name.includes(bundleType))
      .reduce((total, r) => total + (r.transferSize || 0), 0);
  }

  /**
   * Check bundle size thresholds
   */
  private checkBundleThresholds(stats: BundleStats): void {
    Object.entries(BUNDLE_TARGETS).forEach(([bundleType, threshold]) => {
      const actualSize = stats[bundleType as keyof BundleStats] as number;
      if (actualSize > threshold) {
        console.warn(
          `Bundle size warning: ${bundleType} bundle (${actualSize} bytes) exceeds threshold (${threshold} bytes)`,
        );
      }
    });
  }

  /**
   * Get device type based on user agent and screen size
   */
  private getDeviceType(): 'desktop' | 'mobile' {
    if (typeof window === 'undefined') return 'desktop';

    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    const hasSmallScreen = window.innerWidth < 768;

    return isMobile || hasSmallScreen ? 'mobile' : 'desktop';
  }

  /**
   * Get connection type from Network Information API
   */
  private getConnectionType(): string | undefined {
    if (typeof navigator === 'undefined') return undefined;

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    return connection?.effectiveType || undefined;
  }

  /**
   * Handle page visibility change to send final metrics
   */
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      this.sendFinalMetrics();
    }
  }

  /**
   * Send metric to analytics API
   */
  private async sendMetricToAPI(metric: PerformanceMetric): Promise<void> {
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'performance_metric',
          data: metric,
        }),
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to send performance metric:', error);
    }
  }

  /**
   * Send bundle stats to analytics API
   */
  private async sendBundleStatsToAPI(stats: BundleStats): Promise<void> {
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'bundle_stats',
          data: stats,
        }),
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to send bundle stats:', error);
    }
  }

  /**
   * Send alert to monitoring system
   */
  private async sendAlertToAPI(alert: PerformanceAlert): Promise<void> {
    try {
      await fetch('/api/alerts/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'performance_alert',
          data: alert,
        }),
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to send performance alert:', error);
    }
  }

  /**
   * Send all final metrics when page becomes hidden
   */
  private sendFinalMetrics(): void {
    const finalMetrics = {
      metrics: Array.from(this.metrics.entries()).reduce(
        (acc, [name, metrics]) => {
          acc[name] = metrics;
          return acc;
        },
        {} as Record<string, PerformanceMetric[]>,
      ),
      bundleStats: this.bundleStats,
      alerts: this.alerts,
      sessionEnd: Date.now(),
      url: window.location.href,
    };

    navigator.sendBeacon(
      '/api/analytics/performance/session',
      JSON.stringify(finalMetrics),
    );
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): Map<string, PerformanceMetric[]> {
    return this.metrics;
  }

  /**
   * Get latest bundle statistics
   */
  public getLatestBundleStats(): BundleStats | null {
    return this.bundleStats.length > 0
      ? this.bundleStats[this.bundleStats.length - 1]
      : null;
  }

  /**
   * Get performance alerts
   */
  public getAlerts(): PerformanceAlert[] {
    return this.alerts;
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    lcp?: number;
    fid?: number;
    cls?: number;
    ttfb?: number;
    inp?: number;
    bundleSize?: number;
    rating: 'good' | 'needs-improvement' | 'poor';
  } {
    const latestMetrics: Record<string, number> = {};

    // Get latest metric for each type
    ['LCP', 'FID', 'CLS', 'TTFB', 'INP'].forEach((metricName) => {
      const metrics = this.metrics.get(metricName);
      if (metrics && metrics.length > 0) {
        latestMetrics[metricName.toLowerCase()] =
          metrics[metrics.length - 1].value;
      }
    });

    const latestBundle = this.getLatestBundleStats();
    if (latestBundle) {
      latestMetrics.bundleSize = latestBundle.total;
    }

    // Determine overall rating based on worst metric
    let overallRating: 'good' | 'needs-improvement' | 'poor' = 'good';

    Object.entries(latestMetrics).forEach(([metricName, value]) => {
      if (metricName === 'bundleSize') return;

      const rating = this.getRating(
        metricName.toUpperCase(),
        value,
        this.getDeviceType(),
      );
      if (rating === 'poor') {
        overallRating = 'poor';
      } else if (rating === 'needs-improvement' && overallRating !== 'poor') {
        overallRating = 'needs-improvement';
      }
    });

    return {
      ...latestMetrics,
      rating: overallRating,
    };
  }

  /**
   * Clear all collected data
   */
  public clearData(): void {
    this.metrics.clear();
    this.bundleStats = [];
    this.alerts = [];
  }

  /**
   * Static method to create and initialize monitor
   */
  public static createAndInitialize(userId?: string): PerformanceMonitor {
    const monitor = new PerformanceMonitor(userId);
    monitor.initialize();
    return monitor;
  }
}

// Export a default instance for immediate use
export const performanceMonitor = PerformanceMonitor.createAndInitialize();

// Export for React integration
export const usePerformanceMonitor = () => {
  return {
    monitor: performanceMonitor,
    metrics: performanceMonitor.getMetrics(),
    bundleStats: performanceMonitor.getLatestBundleStats(),
    alerts: performanceMonitor.getAlerts(),
    summary: performanceMonitor.getPerformanceSummary(),
  };
};
