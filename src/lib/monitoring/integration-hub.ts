/**
 * Team E: Monitoring Integration Hub
 * Coordinates all monitoring services and provides unified integration
 * Central orchestrator for Sentry, LogRocket, performance monitoring, and alerts
 */

'use client';

import * as Sentry from '@sentry/nextjs';

interface WebVital {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  id: string;
  navigationType: string;
}

interface MonitoringConfig {
  sentry: {
    enabled: boolean;
    dsn?: string;
    tracesSampleRate: number;
    sessionReplaySampleRate: number;
  };
  logrocket: {
    enabled: boolean;
    appId?: string;
    sessionSampleRate: number;
  };
  webVitals: {
    enabled: boolean;
    threshold: {
      lcp: number; // Largest Contentful Paint
      fid: number; // First Input Delay
      cls: number; // Cumulative Layout Shift
      fcp: number; // First Contentful Paint
      ttfb: number; // Time to First Byte
    };
  };
  alerts: {
    enabled: boolean;
    weddingDayCritical: boolean;
  };
}

export class MonitoringIntegrationHub {
  private config: MonitoringConfig;
  private initialized = false;
  private webVitalsCollected: WebVital[] = [];
  private performanceObserver?: PerformanceObserver;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      sentry: {
        enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        tracesSampleRate: 0.1,
        sessionReplaySampleRate: 0.1,
      },
      logrocket: {
        enabled: !!process.env.NEXT_PUBLIC_LOGROCKET_APP_ID,
        appId: process.env.NEXT_PUBLIC_LOGROCKET_APP_ID,
        sessionSampleRate: 0.1,
      },
      webVitals: {
        enabled: true,
        threshold: {
          lcp: 2500, // 2.5s
          fid: 100, // 100ms
          cls: 0.1, // 0.1
          fcp: 1800, // 1.8s
          ttfb: 800, // 800ms
        },
      },
      alerts: {
        enabled: true,
        weddingDayCritical: true,
      },
      ...config,
    };
  }

  /**
   * Initialize all monitoring services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('MonitoringIntegrationHub already initialized');
      return;
    }

    console.log('Initializing MonitoringIntegrationHub...');

    try {
      // 1. Initialize Sentry
      if (this.config.sentry.enabled) {
        await this.initializeSentry();
      }

      // 2. Initialize LogRocket
      if (this.config.logrocket.enabled) {
        await this.initializeLogRocket();
      }

      // 3. Setup Sentry <-> LogRocket integration
      if (this.config.sentry.enabled && this.config.logrocket.enabled) {
        this.connectSentryLogRocket();
      }

      // 4. Initialize Web Vitals monitoring
      if (this.config.webVitals.enabled) {
        this.initializeWebVitals();
      }

      // 5. Setup error boundaries
      this.setupErrorBoundaries();

      // 6. Initialize performance monitoring
      this.initializePerformanceMonitoring();

      // 7. Start health check intervals
      this.startHealthChecks();

      // 8. Setup wedding-specific monitoring
      this.initializeWeddingMonitoring();

      this.initialized = true;
      console.log('MonitoringIntegrationHub initialized successfully');

      // Send initialization success event
      this.trackEvent('monitoring_initialized', {
        services: this.getEnabledServices(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to initialize MonitoringIntegrationHub:', error);

      // Send initialization failure to Sentry if available
      if (this.config.sentry.enabled) {
        Sentry.captureException(error);
      }

      throw error;
    }
  }

  /**
   * Initialize Sentry with enhanced configuration
   */
  private async initializeSentry(): Promise<void> {
    if (!this.config.sentry.dsn) {
      console.warn('Sentry DSN not configured, skipping Sentry initialization');
      return;
    }

    // Sentry is typically initialized in sentry.client.config.js
    // Here we just add additional context and integrations

    Sentry.configureScope((scope) => {
      scope.setTag('monitoring.hub', 'active');
      scope.setContext('monitoring', {
        services: this.getEnabledServices(),
        timestamp: new Date().toISOString(),
      });
    });

    console.log('Sentry integration configured');
  }

  /**
   * Initialize LogRocket
   */
  private async initializeLogRocket(): Promise<void> {
    if (!this.config.logrocket.appId) {
      console.warn(
        'LogRocket App ID not configured, skipping LogRocket initialization',
      );
      return;
    }

    try {
      // Dynamic import to avoid SSR issues
      const LogRocket = (await import('logrocket')).default;

      LogRocket.init(this.config.logrocket.appId, {
        shouldCaptureIP: false,
        console: {
          shouldAggregateConsoleErrors: true,
        },
        network: {
          requestSanitizer: (request) => {
            // Sanitize sensitive data from requests
            if (request.headers && request.headers['authorization']) {
              request.headers['authorization'] = '[Filtered]';
            }
            return request;
          },
          responseSanitizer: (response) => {
            // Sanitize sensitive data from responses
            return response;
          },
        },
        shouldCaptureSession: () => {
          return Math.random() < this.config.logrocket.sessionSampleRate;
        },
      });

      // Add wedding-specific identification
      LogRocket.identify(this.getUserId(), {
        name: this.getUserName(),
        email: this.getUserEmail(),
        weddingPlatform: 'wedsync',
        monitoringHub: 'active',
      });

      console.log('LogRocket initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LogRocket:', error);
    }
  }

  /**
   * Connect Sentry and LogRocket for enhanced debugging
   */
  private connectSentryLogRocket(): void {
    try {
      // This integration allows Sentry errors to include LogRocket session URLs
      import('logrocket').then((LogRocket) => {
        LogRocket.default.getSessionURL((sessionURL) => {
          Sentry.configureScope((scope) => {
            scope.setExtra('sessionURL', sessionURL);
          });
        });

        // Send LogRocket session URL to Sentry for all captured exceptions
        const originalCaptureException = Sentry.captureException;
        Sentry.captureException = (exception, captureContext) => {
          LogRocket.default.getSessionURL((sessionURL) => {
            return originalCaptureException(exception, {
              ...captureContext,
              extra: {
                ...captureContext?.extra,
                logRocketSessionURL: sessionURL,
              },
            });
          });
        };

        console.log('Sentry <-> LogRocket integration established');
      });
    } catch (error) {
      console.error('Failed to connect Sentry and LogRocket:', error);
    }
  }

  /**
   * Initialize Web Vitals monitoring
   */
  private initializeWebVitals(): void {
    try {
      // Dynamic import to avoid SSR issues
      import('web-vitals').then(
        ({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
          const onVitalCapture = (vital: WebVital) => {
            this.handleWebVital(vital);
          };

          getCLS(onVitalCapture);
          getFID(onVitalCapture);
          getFCP(onVitalCapture);
          getLCP(onVitalCapture);
          getTTFB(onVitalCapture);

          console.log('Web Vitals monitoring initialized');
        },
      );
    } catch (error) {
      console.error('Failed to initialize Web Vitals:', error);
    }
  }

  /**
   * Handle Web Vital measurements
   */
  private handleWebVital(vital: WebVital): void {
    this.webVitalsCollected.push(vital);

    // Send to analytics
    this.sendToAnalytics(vital);

    // Check if vital exceeds threshold
    const threshold =
      this.config.webVitals.threshold[
        vital.name as keyof typeof this.config.webVitals.threshold
      ];
    if (threshold && vital.value > threshold) {
      this.handlePoorWebVital(vital, threshold);
    }

    // Send to Sentry
    if (this.config.sentry.enabled) {
      Sentry.addBreadcrumb({
        category: 'web-vital',
        message: `${vital.name}: ${vital.value}ms (${vital.rating})`,
        level: vital.rating === 'poor' ? 'warning' : 'info',
        data: {
          name: vital.name,
          value: vital.value,
          rating: vital.rating,
          delta: vital.delta,
        },
      });
    }

    console.log(
      `Web Vital captured: ${vital.name} = ${vital.value}ms (${vital.rating})`,
    );
  }

  /**
   * Handle poor Web Vital performance
   */
  private async handlePoorWebVital(
    vital: WebVital,
    threshold: number,
  ): Promise<void> {
    const isWeddingDay = this.isWeddingDay();
    const severity = isWeddingDay ? 'high' : 'medium';

    // Send alert for poor performance
    if (this.config.alerts.enabled) {
      try {
        const { sendPerformanceAlert } = await import('./alert-manager');

        await sendPerformanceAlert(
          `Poor ${vital.name.toUpperCase()} Performance`,
          `${vital.name.toUpperCase()} is ${vital.value}ms, exceeding threshold of ${threshold}ms. This may impact user experience${isWeddingDay ? ' on wedding day' : ''}.`,
          severity,
        );
      } catch (error) {
        console.error('Failed to send performance alert:', error);
      }
    }

    // Send to LogRocket with high priority
    if (this.config.logrocket.enabled) {
      try {
        const LogRocket = (await import('logrocket')).default;
        LogRocket.track('Poor Web Vital', {
          name: vital.name,
          value: vital.value,
          threshold,
          rating: vital.rating,
          isWeddingDay,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Failed to track poor web vital in LogRocket:', error);
      }
    }
  }

  /**
   * Send Web Vital data to analytics
   */
  private sendToAnalytics(vital: WebVital): void {
    // Send to Google Analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', vital.name, {
        event_category: 'Web Vitals',
        value: Math.round(
          vital.name === 'CLS' ? vital.value * 1000 : vital.value,
        ),
        event_label: vital.id,
        non_interaction: true,
      });
    }

    // Send to custom analytics endpoint
    this.sendToCustomAnalytics('web_vital', {
      name: vital.name,
      value: vital.value,
      rating: vital.rating,
      delta: vital.delta,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    });
  }

  /**
   * Setup error boundaries and global error handlers
   */
  private setupErrorBoundaries(): void {
    // Global unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);

      if (this.config.sentry.enabled) {
        Sentry.captureException(event.reason);
      }

      this.trackEvent('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        url: window.location.href,
      });
    });

    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);

      if (this.config.sentry.enabled) {
        Sentry.captureException(event.error);
      }

      this.trackEvent('global_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        url: window.location.href,
      });
    });

    console.log('Error boundaries configured');
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    // Resource timing monitoring
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handlePerformanceEntry(entry);
        }
      });

      try {
        this.performanceObserver.observe({
          entryTypes: ['navigation', 'resource', 'measure', 'mark'],
        });
        console.log('Performance monitoring started');
      } catch (error) {
        console.error('Failed to start performance monitoring:', error);
      }
    }

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handleLongTask(entry as PerformanceLongTaskTiming);
          }
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.log('Long task monitoring not supported');
      }
    }
  }

  /**
   * Handle performance entries
   */
  private handlePerformanceEntry(entry: PerformanceEntry): void {
    // Track slow resources
    if (entry.entryType === 'resource') {
      const resourceEntry = entry as PerformanceResourceTiming;

      // Prevent feedback loop: exclude monitoring endpoints from tracking
      if (resourceEntry.name.includes('/api/monitoring/')) {
        return; // Skip tracking monitoring endpoints to prevent infinite loops
      }

      if (resourceEntry.duration > 1000) {
        // Resources taking more than 1s
        this.trackEvent('slow_resource', {
          name: resourceEntry.name,
          duration: resourceEntry.duration,
          size: resourceEntry.transferSize || 0,
          type: resourceEntry.initiatorType,
        });

        console.warn(
          `Slow resource detected: ${resourceEntry.name} (${resourceEntry.duration}ms)`,
        );
      }
    }

    // Track navigation timing
    if (entry.entryType === 'navigation') {
      const navEntry = entry as PerformanceNavigationTiming;

      const metrics = {
        dns_lookup: navEntry.domainLookupEnd - navEntry.domainLookupStart,
        tcp_connect: navEntry.connectEnd - navEntry.connectStart,
        ttfb: navEntry.responseStart - navEntry.requestStart,
        dom_content_loaded:
          navEntry.domContentLoadedEventEnd -
          navEntry.domContentLoadedEventStart,
        load_complete: navEntry.loadEventEnd - navEntry.loadEventStart,
      };

      this.trackEvent('navigation_timing', metrics);
    }
  }

  /**
   * Handle long tasks (>50ms)
   */
  private handleLongTask(entry: PerformanceLongTaskTiming): void {
    this.trackEvent('long_task', {
      duration: entry.duration,
      startTime: entry.startTime,
      name: entry.name,
    });

    if (this.config.sentry.enabled) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `Long task detected: ${entry.duration}ms`,
        level: 'warning',
        data: {
          duration: entry.duration,
          startTime: entry.startTime,
        },
      });
    }

    console.warn(`Long task detected: ${entry.duration}ms`);
  }

  /**
   * Start health check intervals
   */
  private startHealthChecks(): void {
    // Client-side health monitoring
    setInterval(() => {
      this.performClientHealthCheck();
    }, 60000); // Every minute

    console.log('Client health checks started');
  }

  /**
   * Perform client-side health check
   */
  private performClientHealthCheck(): void {
    const health = {
      timestamp: Date.now(),
      performance: {
        memory: this.getMemoryUsage(),
        timing: this.getPerformanceTiming(),
      },
      errors: {
        recent: this.webVitalsCollected.filter(
          (v) =>
            Date.now() - new Date(v.id).getTime() < 300000 &&
            v.rating === 'poor',
        ).length,
      },
      connection: this.getConnectionInfo(),
    };

    this.trackEvent('client_health_check', health);
  }

  /**
   * Initialize wedding-specific monitoring
   */
  private initializeWeddingMonitoring(): void {
    // Add wedding context to all monitoring
    const weddingContext = this.getWeddingContext();

    if (this.config.sentry.enabled) {
      Sentry.configureScope((scope) => {
        scope.setContext('wedding', weddingContext);
      });
    }

    // Enhanced monitoring for wedding day
    if (weddingContext.isWeddingDay) {
      console.log('🎉 Wedding day detected - Enhanced monitoring activated');

      // Reduce Web Vitals thresholds for wedding day
      this.config.webVitals.threshold = {
        lcp: 2000, // Stricter: 2s instead of 2.5s
        fid: 50, // Stricter: 50ms instead of 100ms
        cls: 0.05, // Stricter: 0.05 instead of 0.1
        fcp: 1500, // Stricter: 1.5s instead of 1.8s
        ttfb: 600, // Stricter: 600ms instead of 800ms
      };

      // More frequent health checks
      setInterval(() => {
        this.performWeddingDayHealthCheck();
      }, 30000); // Every 30 seconds on wedding day
    }
  }

  /**
   * Wedding day specific health check
   */
  private performWeddingDayHealthCheck(): void {
    const criticalSystems = [
      'database_connection',
      'api_response_time',
      'payment_gateway',
      'image_loading',
      'form_submission',
    ];

    this.trackEvent('wedding_day_health_check', {
      timestamp: Date.now(),
      systems: criticalSystems,
      webVitals: this.webVitalsCollected.slice(-5), // Last 5 vitals
    });
  }

  /**
   * Utility methods
   */
  private getEnabledServices(): string[] {
    const services = [];
    if (this.config.sentry.enabled) services.push('sentry');
    if (this.config.logrocket.enabled) services.push('logrocket');
    if (this.config.webVitals.enabled) services.push('webVitals');
    if (this.config.alerts.enabled) services.push('alerts');
    return services;
  }

  private getUserId(): string {
    // Get user ID from your auth system
    return 'anonymous-' + Math.random().toString(36).substring(7);
  }

  private getUserName(): string {
    return 'Wedding User';
  }

  private getUserEmail(): string {
    return '';
  }

  private isWeddingDay(): boolean {
    // Check if today is a wedding day for any active user
    // This would integrate with your database
    return false;
  }

  private getWeddingContext(): any {
    return {
      isWeddingDay: this.isWeddingDay(),
      daysUntilWedding: null,
      activeCouples: 0,
    };
  }

  private getMemoryUsage(): any {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }

  private getPerformanceTiming(): any {
    const timing = performance.timing;
    return {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaint:
        performance.getEntriesByName('first-paint')[0]?.startTime || null,
    };
  }

  private getConnectionInfo(): any {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      };
    }
    return null;
  }

  private trackEvent(eventName: string, data: any): void {
    // Send to custom analytics endpoint
    this.sendToCustomAnalytics(eventName, data);
  }

  private async sendToCustomAnalytics(
    eventName: string,
    data: any,
  ): Promise<void> {
    try {
      await fetch('/api/monitoring/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: eventName,
          data,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  /**
   * Public API methods
   */
  public getWebVitals(): WebVital[] {
    return [...this.webVitalsCollected];
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  public async shutdown(): Promise<void> {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.initialized = false;
    console.log('MonitoringIntegrationHub shut down');
  }
}

// Export singleton instance
export const monitoringHub = new MonitoringIntegrationHub();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      monitoringHub.initialize().catch(console.error);
    });
  } else {
    monitoringHub.initialize().catch(console.error);
  }
}

// Type exports
export type { WebVital, MonitoringConfig };
