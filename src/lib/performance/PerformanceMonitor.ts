/**
 * Performance Monitor for WedSync Environment Variables Management System
 * Team D - Performance Optimization & Mobile Experience
 * Tracks Core Web Vitals and custom performance metrics
 */

export interface PerformanceMetrics {
  // Dashboard loading performance
  dashboardLoadTime: number;
  variableListRenderTime: number;
  searchResponseTime: number;

  // API performance metrics
  apiResponseTime: number;
  databaseQueryTime: number;
  cacheHitRate: number;

  // Mobile-specific metrics
  mobileLoadTime: number;
  touchResponseTime: number;
  offlineSyncTime: number;
  batteryUsage: number;

  // User experience metrics
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
}

export interface PerformanceAlert {
  metric: keyof PerformanceMetrics;
  threshold: number;
  currentValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  context?: Record<string, any>;
}

export interface PerformanceReport {
  metrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  trends: Record<string, number[]>;
  deviceInfo: DeviceInfo;
  networkInfo: NetworkInfo;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  screenSize: { width: number; height: number };
  memory?: number;
  cores?: number;
  userAgent: string;
}

export interface NetworkInfo {
  type: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Partial<PerformanceMetrics> = {};
  private alerts: PerformanceAlert[] = [];
  private observers: PerformanceObserver[] = [];

  // Performance thresholds (in milliseconds)
  private thresholds = {
    dashboardLoadTime: 1500,
    variableListRenderTime: 500,
    searchResponseTime: 200,
    apiResponseTime: 200,
    databaseQueryTime: 100,
    mobileLoadTime: 2000,
    touchResponseTime: 100,
    offlineSyncTime: 5000,
    timeToInteractive: 3000,
    firstContentfulPaint: 1200,
    largestContentfulPaint: 2500,
    cumulativeLayoutShift: 0.1,
  };

  private constructor() {
    this.initializeObservers();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    try {
      // Core Web Vitals observer
      if ('PerformanceObserver' in window) {
        // First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(
            (entry) => entry.name === 'first-contentful-paint',
          );
          if (fcpEntry) {
            this.recordMetric('firstContentfulPaint', fcpEntry.startTime);
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(fcpObserver);

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            this.recordMetric('largestContentfulPaint', lastEntry.startTime);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          this.recordMetric('cumulativeLayoutShift', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      }

      // Navigation observer for TTI
      if ('PerformanceObserver' in window) {
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries() as PerformanceNavigationTiming[];
          const navigation = entries[0];
          if (navigation) {
            const tti =
              navigation.domContentLoadedEventEnd - navigation.navigationStart;
            this.recordMetric('timeToInteractive', tti);
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      }
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  }

  private recordMetric(key: keyof PerformanceMetrics, value: number): void {
    this.metrics[key] = value;

    // Check for threshold violations
    const threshold = this.thresholds[key];
    if (threshold && value > threshold) {
      this.createAlert(key, threshold, value);
    }

    // Send to analytics if enabled
    this.sendToAnalytics(key, value);
  }

  private createAlert(
    metric: keyof PerformanceMetrics,
    threshold: number,
    currentValue: number,
  ): void {
    const severity = this.calculateSeverity(threshold, currentValue);

    const alert: PerformanceAlert = {
      metric,
      threshold,
      currentValue,
      severity,
      timestamp: new Date(),
      context: this.getContextualInfo(),
    };

    this.alerts.push(alert);
    this.triggerAlertNotification(alert);
  }

  private calculateSeverity(
    threshold: number,
    currentValue: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = currentValue / threshold;

    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  private getContextualInfo(): Record<string, any> {
    return {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      memory: (navigator as any).deviceMemory,
      cores: navigator.hardwareConcurrency,
      connection: (navigator as any).connection,
    };
  }

  private triggerAlertNotification(alert: PerformanceAlert): void {
    if (alert.severity === 'critical' || alert.severity === 'high') {
      console.error('Performance Alert:', alert);

      // Send to monitoring service
      this.sendAlertToService(alert);
    }
  }

  private sendToAnalytics(metric: string, value: number): void {
    // Queue for batch sending to analytics
    if (
      typeof window !== 'undefined' &&
      'navigator' in window &&
      'sendBeacon' in navigator
    ) {
      const data = JSON.stringify({
        metric,
        value,
        timestamp: Date.now(),
        sessionId: this.getSessionId(),
        userId: this.getUserId(),
      });

      navigator.sendBeacon('/api/admin/performance/metrics', data);
    }
  }

  private sendAlertToService(alert: PerformanceAlert): void {
    if (typeof window !== 'undefined') {
      fetch('/api/admin/performance/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      }).catch((error) => {
        console.error('Failed to send performance alert:', error);
      });
    }
  }

  // Public API methods

  /**
   * Track dashboard loading performance
   */
  trackDashboardLoad(): void {
    const startTime = performance.now();

    // Use requestIdleCallback for accurate measurement
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const loadTime = performance.now() - startTime;
        this.recordMetric('dashboardLoadTime', loadTime);
      });
    } else {
      setTimeout(() => {
        const loadTime = performance.now() - startTime;
        this.recordMetric('dashboardLoadTime', loadTime);
      }, 0);
    }
  }

  /**
   * Track specific variable operation performance
   */
  trackVariableOperation(operation: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;

      switch (operation) {
        case 'search':
          this.recordMetric('searchResponseTime', duration);
          break;
        case 'render':
          this.recordMetric('variableListRenderTime', duration);
          break;
        case 'api-call':
          this.recordMetric('apiResponseTime', duration);
          break;
        default:
          this.sendToAnalytics(`operation_${operation}`, duration);
      }
    };
  }

  /**
   * Track mobile-specific performance metrics
   */
  trackMobilePerformance(): void {
    if (!this.isMobileDevice()) return;

    const startTime = performance.now();

    // Track mobile load time
    window.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;
      this.recordMetric('mobileLoadTime', loadTime);
    });

    // Track touch responsiveness
    let touchStartTime: number;

    document.addEventListener('touchstart', () => {
      touchStartTime = performance.now();
    });

    document.addEventListener('touchend', () => {
      if (touchStartTime) {
        const responseTime = performance.now() - touchStartTime;
        this.recordMetric('touchResponseTime', responseTime);
      }
    });

    // Track battery usage (if available)
    if ('getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          const initialLevel = battery.level;

          setTimeout(() => {
            const currentLevel = battery.level;
            const usage = (initialLevel - currentLevel) * 100;
            this.recordMetric('batteryUsage', usage);
          }, 60000); // Check after 1 minute
        })
        .catch(() => {
          // Battery API not available
        });
    }
  }

  /**
   * Track offline sync performance
   */
  trackOfflineSync(): () => void {
    const startTime = performance.now();

    return () => {
      const syncTime = performance.now() - startTime;
      this.recordMetric('offlineSyncTime', syncTime);
    };
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(): PerformanceReport {
    return {
      metrics: this.metrics as PerformanceMetrics,
      alerts: [...this.alerts],
      trends: this.getTrends(),
      deviceInfo: this.getDeviceInfo(),
      networkInfo: this.getNetworkInfo(),
    };
  }

  /**
   * Alert when performance thresholds are exceeded
   */
  alertOnPerformanceThresholds(): void {
    // Already handled in recordMetric method
    const criticalAlerts = this.alerts.filter(
      (alert) =>
        alert.severity === 'critical' &&
        Date.now() - alert.timestamp.getTime() < 5000, // Last 5 seconds
    );

    if (criticalAlerts.length > 0) {
      // Trigger urgent notification
      console.error('CRITICAL Performance Issues Detected:', criticalAlerts);
    }
  }

  private getTrends(): Record<string, number[]> {
    // This would typically come from stored historical data
    // For now, return empty trends
    return {};
  }

  private getDeviceInfo(): DeviceInfo {
    const width = window.innerWidth;
    const height = window.innerHeight;

    let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (width < 768) type = 'mobile';
    else if (width < 1024) type = 'tablet';

    return {
      type,
      screenSize: { width, height },
      memory: (navigator as any).deviceMemory,
      cores: navigator.hardwareConcurrency,
      userAgent: navigator.userAgent,
    };
  }

  private getNetworkInfo(): NetworkInfo {
    const connection = (navigator as any).connection || {};

    return {
      type: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false,
    };
  }

  private isMobileDevice(): boolean {
    return (
      window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      )
    );
  }

  private getSessionId(): string {
    // Generate or retrieve session ID
    if (!sessionStorage.getItem('performance-session-id')) {
      sessionStorage.setItem('performance-session-id', crypto.randomUUID());
    }
    return sessionStorage.getItem('performance-session-id')!;
  }

  private getUserId(): string | null {
    // This would come from your auth system
    return null;
  }

  /**
   * Clean up observers and resources
   */
  destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
