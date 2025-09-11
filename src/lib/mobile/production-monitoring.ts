interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  inp?: number;

  // Mobile-specific metrics
  deviceMemory?: number;
  connectionType?: string;
  batteryLevel?: number;
  devicePixelRatio?: number;
  screenResolution?: string;

  // Page metrics
  domContentLoaded?: number;
  loadComplete?: number;
  firstPaint?: number;
  firstContentfulPaint?: number;

  // Runtime metrics
  jsHeapSizeLimit?: number;
  jsHeapSizeUsed?: number;
  serviceWorkerLatency?: number;

  // User context
  timestamp: number;
  url: string;
  userAgent: string;
  sessionId: string;
  userId?: string;
  networkCondition?: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  isStandalone?: boolean;
  platform?: 'ios' | 'android' | 'desktop';
}

interface PerformanceThresholds {
  lcp: { good: number; poor: number };
  fid: { good: number; poor: number };
  cls: { good: number; poor: number };
  ttfb: { good: number; poor: number };
  inp: { good: number; poor: number };
  loadComplete: { good: number; poor: number };
}

class MobilePerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observer?: PerformanceObserver;
  private sessionId: string;
  private thresholds: PerformanceThresholds;
  private isCollecting = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 },
      inp: { good: 200, poor: 500 },
      loadComplete: { good: 3000, poor: 6000 },
    };

    this.initialize();
  }

  private generateSessionId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    this.isCollecting = true;

    // Set up performance observers
    this.setupPerformanceObserver();

    // Collect initial metrics
    this.collectInitialMetrics();

    // Set up periodic collection
    this.setupPeriodicCollection();

    // Handle page lifecycle
    this.setupPageLifecycle();
  }

  private setupPerformanceObserver() {
    if (!('PerformanceObserver' in window)) return;

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      // Observe different types of performance entries
      this.observer.observe({
        entryTypes: [
          'navigation',
          'paint',
          'largest-contentful-paint',
          'first-input',
          'layout-shift',
        ],
      });
    } catch (error) {
      console.error('[Performance Monitor] Observer setup failed:', error);
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry) {
    const baseMetric: Partial<PerformanceMetrics> = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      platform: this.getPlatform(),
      isStandalone: this.isStandaloneMode(),
    };

    switch (entry.entryType) {
      case 'largest-contentful-paint':
        this.recordMetric({ ...baseMetric, lcp: entry.startTime });
        break;

      case 'first-input':
        const fidEntry = entry as PerformanceEventTiming;
        this.recordMetric({
          ...baseMetric,
          fid: fidEntry.processingStart - fidEntry.startTime,
        });
        break;

      case 'layout-shift':
        if (!(entry as any).hadRecentInput) {
          this.recordMetric({ ...baseMetric, cls: (entry as any).value });
        }
        break;

      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        this.recordMetric({
          ...baseMetric,
          ttfb: navEntry.responseStart - navEntry.requestStart,
          domContentLoaded:
            navEntry.domContentLoadedEventEnd - navEntry.navigationStart,
          loadComplete: navEntry.loadEventEnd - navEntry.navigationStart,
        });
        break;

      case 'paint':
        if (entry.name === 'first-paint') {
          this.recordMetric({ ...baseMetric, firstPaint: entry.startTime });
        } else if (entry.name === 'first-contentful-paint') {
          this.recordMetric({
            ...baseMetric,
            firstContentfulPaint: entry.startTime,
          });
        }
        break;
    }
  }

  private collectInitialMetrics() {
    const metric: Partial<PerformanceMetrics> = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      platform: this.getPlatform(),
      isStandalone: this.isStandaloneMode(),
    };

    // Device information
    if ('deviceMemory' in navigator) {
      metric.deviceMemory = (navigator as any).deviceMemory;
    }

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      metric.connectionType = connection.effectiveType;
      metric.networkCondition = this.mapNetworkCondition(
        connection.effectiveType,
      );
    }

    // Battery API (if available)
    if ('getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          metric.batteryLevel = Math.round(battery.level * 100);
          this.recordMetric(metric);
        })
        .catch(() => {
          this.recordMetric(metric);
        });
    } else {
      this.recordMetric(metric);
    }

    // Screen information
    metric.devicePixelRatio = window.devicePixelRatio;
    metric.screenResolution = `${screen.width}x${screen.height}`;

    // Memory information
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      metric.jsHeapSizeLimit = memory.jsHeapSizeLimit;
      metric.jsHeapSizeUsed = memory.usedJSHeapSize;
    }

    this.recordMetric(metric);
  }

  private setupPeriodicCollection() {
    // Collect metrics every 30 seconds
    setInterval(() => {
      if (!this.isCollecting) return;

      const metric: Partial<PerformanceMetrics> = {
        timestamp: Date.now(),
        url: window.location.href,
        sessionId: this.sessionId,
        platform: this.getPlatform(),
      };

      // Update memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        metric.jsHeapSizeUsed = memory.usedJSHeapSize;
      }

      this.recordMetric(metric);
    }, 30000);
  }

  private setupPageLifecycle() {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.recordMetric({
        timestamp: Date.now(),
        url: window.location.href,
        sessionId: this.sessionId,
        platform: this.getPlatform(),
      });
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.sendMetrics();
    });

    // Send metrics periodically
    setInterval(() => {
      this.sendMetrics();
    }, 60000); // Send every minute
  }

  private recordMetric(metric: Partial<PerformanceMetrics>) {
    this.metrics.push(metric as PerformanceMetrics);

    // Limit metrics array size
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-50);
    }

    // Check for performance issues
    this.checkPerformanceThresholds(metric);
  }

  private checkPerformanceThresholds(metric: Partial<PerformanceMetrics>) {
    const alerts: string[] = [];

    if (metric.lcp && metric.lcp > this.thresholds.lcp.poor) {
      alerts.push(`Poor LCP: ${metric.lcp}ms`);
    }

    if (metric.fid && metric.fid > this.thresholds.fid.poor) {
      alerts.push(`Poor FID: ${metric.fid}ms`);
    }

    if (metric.cls && metric.cls > this.thresholds.cls.poor) {
      alerts.push(`Poor CLS: ${metric.cls}`);
    }

    if (metric.ttfb && metric.ttfb > this.thresholds.ttfb.poor) {
      alerts.push(`Poor TTFB: ${metric.ttfb}ms`);
    }

    if (alerts.length > 0) {
      this.triggerPerformanceAlert(alerts, metric);
    }
  }

  private triggerPerformanceAlert(
    alerts: string[],
    metric: Partial<PerformanceMetrics>,
  ) {
    console.warn('[Performance Alert]', alerts, metric);

    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_alert', {
        alerts: alerts.join(', '),
        platform: metric.platform,
        url: metric.url,
      });
    }
  }

  private async sendMetrics() {
    if (this.metrics.length === 0) return;

    try {
      const metricsToSend = [...this.metrics];
      this.metrics = [];

      const response = await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: metricsToSend,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        // Re-add metrics on failure
        this.metrics.unshift(...metricsToSend.slice(-10)); // Keep last 10
        throw new Error(`Performance metrics send failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[Performance Monitor] Failed to send metrics:', error);
    }
  }

  private getPlatform(): 'ios' | 'android' | 'desktop' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    return 'desktop';
  }

  private isStandaloneMode(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as any).standalone)
    );
  }

  private mapNetworkCondition(
    effectiveType: string,
  ): PerformanceMetrics['networkCondition'] {
    switch (effectiveType) {
      case 'slow-2g':
        return 'slow-2g';
      case '2g':
        return '2g';
      case '3g':
        return '3g';
      case '4g':
        return '4g';
      default:
        return 'unknown';
    }
  }

  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public getPerformanceScore(): {
    score: number;
    details: Record<string, string>;
  } {
    const latest = this.metrics[this.metrics.length - 1];
    if (!latest) return { score: 0, details: {} };

    let score = 100;
    const details: Record<string, string> = {};

    // LCP scoring
    if (latest.lcp) {
      if (latest.lcp > this.thresholds.lcp.poor) {
        score -= 25;
        details.lcp = 'Poor';
      } else if (latest.lcp > this.thresholds.lcp.good) {
        score -= 10;
        details.lcp = 'Needs Improvement';
      } else {
        details.lcp = 'Good';
      }
    }

    // FID scoring
    if (latest.fid) {
      if (latest.fid > this.thresholds.fid.poor) {
        score -= 25;
        details.fid = 'Poor';
      } else if (latest.fid > this.thresholds.fid.good) {
        score -= 10;
        details.fid = 'Needs Improvement';
      } else {
        details.fid = 'Good';
      }
    }

    // CLS scoring
    if (latest.cls !== undefined) {
      if (latest.cls > this.thresholds.cls.poor) {
        score -= 25;
        details.cls = 'Poor';
      } else if (latest.cls > this.thresholds.cls.good) {
        score -= 10;
        details.cls = 'Needs Improvement';
      } else {
        details.cls = 'Good';
      }
    }

    return { score: Math.max(0, score), details };
  }

  public stop() {
    this.isCollecting = false;
    if (this.observer) {
      this.observer.disconnect();
    }
    this.sendMetrics();
  }
}

// Global performance monitor instance
let performanceMonitor: MobilePerformanceMonitor | null = null;

export const initializePerformanceMonitoring = () => {
  if (typeof window !== 'undefined' && !performanceMonitor) {
    performanceMonitor = new MobilePerformanceMonitor();
  }
  return performanceMonitor;
};

export const getPerformanceMonitor = () => performanceMonitor;

export const getPerformanceMetrics = () => {
  return performanceMonitor?.getMetrics() || [];
};

export const getPerformanceScore = () => {
  return performanceMonitor?.getPerformanceScore() || { score: 0, details: {} };
};

// Initialize automatically
if (typeof window !== 'undefined') {
  // Wait for page load before initializing
  if (document.readyState === 'complete') {
    initializePerformanceMonitoring();
  } else {
    window.addEventListener('load', initializePerformanceMonitoring);
  }
}

export default MobilePerformanceMonitor;
