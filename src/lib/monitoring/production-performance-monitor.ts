// WS-145 Production Performance Excellence - Advanced Monitoring System
// Team A - Batch 12 - Round 3

interface PerformanceMetric {
  timestamp: number;
  type: string;
  value: number;
  url: string;
  userAgent: string;
  connection?: string;
}

interface PerformanceReport {
  timestamp: string;
  url: string;
  userAgent: string;
  connection: string;
  vitals: {
    lcp: number;
    fid: number;
    cls: number;
  };
  resources: {
    total: number;
    slowResources: Array<{ name: string; duration: number; size: number }>;
    largeResources: Array<{ name: string; size: number; duration: number }>;
  };
  memory: {
    used: number;
    total: number;
    limit: number;
  } | null;
  recommendations: PerformanceRecommendation[];
}

interface PerformanceRecommendation {
  type: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  suggestion: string;
}

interface AlertThresholds {
  lcp: { warning: number; critical: number };
  fid: { warning: number; critical: number };
  cls: { warning: number; critical: number };
  memoryUsage: { warning: number; critical: number };
  bundleSize: { warning: number; critical: number };
}

export class ProductionPerformanceMonitor {
  private metricsBuffer: PerformanceMetric[] = [];
  private alertThresholds: AlertThresholds = {
    lcp: { warning: 2000, critical: 3000 },
    fid: { warning: 80, critical: 150 },
    cls: { warning: 0.08, critical: 0.15 },
    memoryUsage: { warning: 100 * 1024 * 1024, critical: 200 * 1024 * 1024 },
    bundleSize: { warning: 700000, critical: 900000 },
  };

  constructor() {
    this.initializeProductionMonitoring();
    this.setupPerformanceObservers();
    this.startMetricsCollection();
  }

  private initializeProductionMonitoring() {
    // Real User Monitoring (RUM)
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'production'
    ) {
      // Initialize performance observers for production
      this.observeNavigationTiming();
      this.observeResourceTiming();
      this.observeMemoryUsage();
      this.observeLongTasks();
    }
  }

  private setupPerformanceObservers() {
    if (typeof window === 'undefined') return;

    // Web Vitals observers
    this.setupWebVitalsObservers();

    // Custom performance observers
    this.setupCustomObservers();
  }

  private setupWebVitalsObservers() {
    // LCP Observer
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      this.recordMetric('lcp', lastEntry.startTime, {
        element: (lastEntry as any).element,
        url: (lastEntry as any).url,
      });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    // CLS Observer
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      this.recordMetric('cls', clsValue);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    // FID Observer
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric(
          'fid',
          (entry as any).processingStart - entry.startTime,
          {
            eventType: (entry as any).name,
          },
        );
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  }

  private setupCustomObservers() {
    // Custom performance tracking for WedSync-specific features
    this.observeFormPerformance();
    this.observePhotoUploadPerformance();
    this.observeTimelinePerformance();
  }

  private observeNavigationTiming() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const navTiming = entry as PerformanceNavigationTiming;
        this.analyzeNavigationPerformance(navTiming);
      });
    });
    observer.observe({ entryTypes: ['navigation'] });
  }

  private observeResourceTiming() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const resourceTiming = entry as PerformanceResourceTiming;
        this.analyzeResourcePerformance(resourceTiming);
      });
    });
    observer.observe({ entryTypes: ['resource'] });
  }

  private observeMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordMetric('memory', memory.usedJSHeapSize, {
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        });

        // Check memory thresholds
        if (memory.usedJSHeapSize > this.alertThresholds.memoryUsage.critical) {
          this.triggerPerformanceAlert('memory_critical', {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
          });
        }
      }, 10000); // Check every 10 seconds
    }
  }

  private observeLongTasks() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > 50) {
          // Long tasks > 50ms
          this.reportLongTask({
            duration: entry.duration,
            startTime: entry.startTime,
            attribution: (entry as any).attribution,
          });
        }
      });
    });
    observer.observe({ entryTypes: ['longtask'] });
  }

  private observeFormPerformance() {
    // Monitor wedding form performance specifically
    const formObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.querySelector('form[data-wedding-form]')) {
                this.trackFormRenderTime(element);
              }
            }
          });
        }
      });
    });

    formObserver.observe(document.body, { childList: true, subtree: true });
  }

  private observePhotoUploadPerformance() {
    // Monitor photo upload performance
    if (typeof window !== 'undefined') {
      window.addEventListener('photo-upload-start', () => {
        this.recordMetric('photo-upload-start', performance.now());
      });

      window.addEventListener('photo-upload-complete', (event: any) => {
        const duration = performance.now() - event.detail.startTime;
        this.recordMetric('photo-upload-duration', duration, {
          fileSize: event.detail.fileSize,
          fileCount: event.detail.fileCount,
        });
      });
    }
  }

  private observeTimelinePerformance() {
    // Monitor timeline rendering performance
    const timelineObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('timeline-render')) {
          this.recordMetric('timeline-render', entry.duration, {
            eventCount: (entry as any).detail?.eventCount,
          });
        }
      });
    });
    timelineObserver.observe({ entryTypes: ['measure'] });
  }

  private analyzeNavigationPerformance(timing: PerformanceNavigationTiming) {
    const metrics = {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      connect: timing.connectEnd - timing.connectStart,
      ttfb: timing.responseStart - timing.requestStart,
      download: timing.responseEnd - timing.responseStart,
      domParse: timing.domContentLoadedEventEnd - timing.responseEnd,
      resource: timing.loadEventEnd - timing.domContentLoadedEventEnd,
      total: timing.loadEventEnd - timing.startTime,
    };

    // Identify performance bottlenecks
    const bottleneck = this.identifyBottleneck(metrics);

    if (metrics.total > 3000) {
      // Critical threshold
      this.triggerPerformanceAlert('navigation_slow', {
        metrics,
        bottleneck,
        url: window.location.pathname,
        userAgent: navigator.userAgent,
        connection: (navigator as any).connection?.effectiveType,
      });
    }

    this.sendMetricsToAnalytics('navigation', metrics);
  }

  private analyzeResourcePerformance(resource: PerformanceResourceTiming) {
    // Flag slow resources
    if (resource.duration > 1000) {
      this.triggerPerformanceAlert('slow_resource', {
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize,
        type: this.getResourceType(resource.name),
      });
    }

    // Flag large resources
    if (resource.transferSize > 500000) {
      this.triggerPerformanceAlert('large_resource', {
        name: resource.name,
        size: resource.transferSize,
        duration: resource.duration,
        type: this.getResourceType(resource.name),
      });
    }
  }

  private identifyBottleneck(metrics: any): string {
    const bottlenecks = [
      { name: 'dns', value: metrics.dns, threshold: 100 },
      { name: 'connect', value: metrics.connect, threshold: 200 },
      { name: 'ttfb', value: metrics.ttfb, threshold: 500 },
      { name: 'download', value: metrics.download, threshold: 300 },
      { name: 'domParse', value: metrics.domParse, threshold: 800 },
      { name: 'resource', value: metrics.resource, threshold: 400 },
    ];

    const slowestBottleneck = bottlenecks
      .filter((b) => b.value > b.threshold)
      .sort((a, b) => b.value - a.value)[0];

    return slowestBottleneck?.name || 'none';
  }

  private getResourceType(url: string): string {
    if (url.match(/\.(js|mjs)$/)) return 'javascript';
    if (url.match(/\.css$/)) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|avif)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    if (url.match(/\.json$/)) return 'json';
    return 'other';
  }

  private trackFormRenderTime(element: Element) {
    const startTime = performance.now();

    // Use requestAnimationFrame to measure when form is fully rendered
    requestAnimationFrame(() => {
      const renderTime = performance.now() - startTime;
      this.recordMetric('form-render-time', renderTime, {
        formType: element.getAttribute('data-wedding-form'),
        fieldCount: element.querySelectorAll('input, select, textarea').length,
      });
    });
  }

  private recordMetric(type: string, value: number, metadata?: any) {
    const metric: PerformanceMetric = {
      timestamp: Date.now(),
      type,
      value,
      url: window.location.pathname,
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType,
    };

    this.metricsBuffer.push(metric);

    // Check thresholds
    this.checkThresholds(type, value, metadata);

    // Buffer management
    if (this.metricsBuffer.length > 100) {
      this.flushMetricsBuffer();
    }
  }

  private checkThresholds(type: string, value: number, metadata?: any) {
    const threshold = this.alertThresholds[type as keyof AlertThresholds];
    if (!threshold) return;

    if (value > threshold.critical) {
      this.triggerPerformanceAlert(`${type}_critical`, {
        value,
        threshold: threshold.critical,
        metadata,
      });
    } else if (value > threshold.warning) {
      this.triggerPerformanceAlert(`${type}_warning`, {
        value,
        threshold: threshold.warning,
        metadata,
      });
    }
  }

  private triggerPerformanceAlert(alertType: string, data: any) {
    console.warn(`Performance Alert: ${alertType}`, data);

    // Send to analytics service
    this.sendAlertToAnalytics(alertType, data);

    // Send to monitoring service
    this.sendAlertToMonitoring(alertType, data);
  }

  private reportLongTask(taskData: any) {
    console.warn('Long Task Detected:', taskData);

    this.triggerPerformanceAlert('long_task', taskData);

    // Additional analysis for long tasks
    if (taskData.attribution && taskData.attribution.length > 0) {
      const culprit = taskData.attribution[0];
      console.warn('Long Task Attribution:', culprit);
    }
  }

  private startMetricsCollection() {
    // Periodic metrics collection
    setInterval(() => {
      if (this.metricsBuffer.length > 0) {
        this.flushMetricsBuffer();
      }
    }, 30000); // Flush every 30 seconds

    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushMetricsBuffer();
      }
    });

    // Before page unload
    window.addEventListener('beforeunload', () => {
      this.flushMetricsBuffer();
    });
  }

  private flushMetricsBuffer() {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    // Send to analytics
    this.sendMetricsToAnalytics('batch', metrics);
  }

  private sendMetricsToAnalytics(type: string, data: any) {
    // Send to Supabase analytics
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data, timestamp: new Date().toISOString() }),
    }).catch((error) => {
      console.error('Failed to send metrics:', error);
    });
  }

  private sendAlertToAnalytics(alertType: string, data: any) {
    fetch('/api/alerts/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertType,
        data,
        timestamp: new Date().toISOString(),
        severity: this.getAlertSeverity(alertType),
      }),
    }).catch((error) => {
      console.error('Failed to send alert:', error);
    });
  }

  private sendAlertToMonitoring(alertType: string, data: any) {
    // Integration with monitoring services (Sentry, DataDog, etc.)
    if (window.Sentry) {
      window.Sentry.captureMessage(`Performance Alert: ${alertType}`, {
        level: 'warning',
        extra: data,
      });
    }
  }

  private getAlertSeverity(alertType: string): string {
    if (alertType.includes('critical')) return 'critical';
    if (alertType.includes('warning')) return 'warning';
    return 'info';
  }

  async getCurrentWebVitals(): Promise<{
    lcp: number;
    fid: number;
    cls: number;
  }> {
    return new Promise((resolve) => {
      const vitals = { lcp: 0, fid: 0, cls: 0 };
      let collected = 0;
      const target = 3;

      const checkComplete = () => {
        collected++;
        if (collected >= target) {
          resolve(vitals);
        }
      };

      // Get current LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          vitals.lcp = entries[entries.length - 1].startTime;
        }
        checkComplete();
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // Get current CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        vitals.cls = clsValue;
        checkComplete();
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Get current FID
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          vitals.fid = (entry as any).processingStart - entry.startTime;
        }
        checkComplete();
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // Timeout fallback
      setTimeout(() => {
        resolve(vitals);
      }, 2000);
    });
  }

  async generatePerformanceReport(): Promise<PerformanceReport> {
    const resourceEntries = performance.getEntriesByType(
      'resource',
    ) as PerformanceResourceTiming[];
    const navigationEntries = performance.getEntriesByType(
      'navigation',
    ) as PerformanceNavigationTiming[];

    const report: PerformanceReport = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType || 'unknown',

      // Core Web Vitals
      vitals: await this.getCurrentWebVitals(),

      // Resource analysis
      resources: {
        total: resourceEntries.length,
        slowResources: resourceEntries
          .filter((r) => r.duration > 1000)
          .map((r) => ({
            name: r.name,
            duration: r.duration,
            size: r.transferSize,
          })),
        largeResources: resourceEntries
          .filter((r) => r.transferSize > 500000)
          .map((r) => ({
            name: r.name,
            size: r.transferSize,
            duration: r.duration,
          })),
      },

      // Memory analysis
      memory: (performance as any).memory
        ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit,
          }
        : null,

      // Performance recommendations
      recommendations: this.generateRecommendations(
        resourceEntries,
        navigationEntries[0],
      ),
    };

    return report;
  }

  private generateRecommendations(
    resources: PerformanceResourceTiming[],
    navigation: PerformanceNavigationTiming,
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // Bundle size recommendations
    const jsResources = resources.filter((r) => r.name.endsWith('.js'));
    const totalJSSize = jsResources.reduce((sum, r) => sum + r.transferSize, 0);

    // GUARDIAN FIX: Ultra-aggressive bundle size thresholds for wedding operations
    if (totalJSSize > 500000) {
      // Reduced from 800KB to 500KB for wedding day performance
      recommendations.push({
        type: 'bundle_optimization',
        priority: 'critical', // Elevated from 'high' to 'critical'
        description: `JavaScript bundle size ${(totalJSSize / 1024).toFixed(0)}KB exceeds wedding day limit of 500KB`,
        impact: 'wedding_day_critical_performance',
        suggestion:
          'IMMEDIATE: Implement aggressive code splitting, lazy loading, and remove unused dependencies',
        weddingDayRisk: 'high',
        actionRequired: 'immediate',
      });
    }

    // GUARDIAN FIX: Add warning threshold for proactive optimization
    if (totalJSSize > 400000) {
      // Warning at 400KB
      recommendations.push({
        type: 'bundle_optimization',
        priority: 'high',
        description: `JavaScript bundle size ${(totalJSSize / 1024).toFixed(0)}KB approaching wedding day limit`,
        impact: 'mobile_venue_performance',
        suggestion:
          'Proactive optimization needed: Review and optimize large components',
        weddingDayRisk: 'medium',
        actionRequired: 'this_week',
      });
    }

    // Image optimization recommendations
    const imageResources = resources.filter((r) =>
      /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(r.name),
    );
    const unoptimizedImages = imageResources.filter(
      (r) =>
        r.transferSize > 200000 &&
        !r.name.includes('webp') &&
        !r.name.includes('avif'),
    );

    if (unoptimizedImages.length > 0) {
      recommendations.push({
        type: 'image_optimization',
        priority: 'medium',
        description: `${unoptimizedImages.length} large unoptimized images detected`,
        impact: 'visual_stability',
        suggestion:
          'Convert to WebP/AVIF format and implement responsive images',
      });
    }

    // Network recommendations
    if (navigation.domainLookupEnd - navigation.domainLookupStart > 100) {
      recommendations.push({
        type: 'dns_optimization',
        priority: 'low',
        description: 'DNS lookup time exceeds 100ms',
        impact: 'initial_connection',
        suggestion: 'Consider DNS prefetching for external resources',
      });
    }

    return recommendations;
  }

  // Public methods for integration with other systems
  public setAlertThresholds(thresholds: Partial<AlertThresholds>) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }

  public getMetricsBuffer(): PerformanceMetric[] {
    return [...this.metricsBuffer];
  }

  public clearMetricsBuffer() {
    this.metricsBuffer = [];
  }
}

// Global instance for production use
let productionMonitor: ProductionPerformanceMonitor;

export function initializeProductionMonitoring(): ProductionPerformanceMonitor {
  if (!productionMonitor && typeof window !== 'undefined') {
    productionMonitor = new ProductionPerformanceMonitor();
  }
  return productionMonitor;
}

export function getProductionMonitor():
  | ProductionPerformanceMonitor
  | undefined {
  return productionMonitor;
}
