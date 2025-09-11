/**
 * Mobile Monitoring Service
 * WS-155: Guest Communications - Round 3
 * Provides mobile-specific error tracking and performance monitoring
 */

import { supabase } from '@/lib/supabase';

interface ErrorReport {
  id: string;
  timestamp: string;
  userId?: string;
  sessionId: string;
  deviceId: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    source?: string;
    line?: number;
    column?: number;
  };
  context: {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
    deviceType: 'mobile' | 'tablet' | 'desktop';
    networkType?: string;
    batteryLevel?: number;
  };
  metadata: {
    featureName: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category:
      | 'javascript'
      | 'network'
      | 'performance'
      | 'user-interaction'
      | 'sync';
    tags: string[];
    breadcrumbs: BreadcrumbEntry[];
  };
}

interface BreadcrumbEntry {
  timestamp: string;
  category: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: any;
}

interface PerformanceMetric {
  id: string;
  timestamp: string;
  userId?: string;
  sessionId: string;
  deviceId: string;
  metric: {
    name: string;
    value: number;
    unit: 'ms' | 'bytes' | 'fps' | 'percent' | 'count';
  };
  context: {
    feature: string;
    action: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    networkType?: string;
    batteryLevel?: number;
  };
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'warning' | 'critical';
  enabled: boolean;
  notification: {
    email: boolean;
    slack: boolean;
    webhook?: string;
  };
}

export class MobileMonitoringService {
  private static instance: MobileMonitoringService;
  private sessionId: string;
  private deviceId: string;
  private breadcrumbs: BreadcrumbEntry[] = [];
  private performanceObserver: PerformanceObserver | null = null;
  private errorBuffer: ErrorReport[] = [];
  private metricsBuffer: PerformanceMetric[] = [];
  private alertRules: AlertRule[] = [];
  private isInitialized: boolean = false;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.deviceId = this.getDeviceId();
  }

  static getInstance(): MobileMonitoringService {
    if (!this.instance) {
      this.instance = new MobileMonitoringService();
    }
    return this.instance;
  }

  /**
   * Initialize monitoring service
   */
  async initialize(userId?: string): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Setup error handlers
      this.setupGlobalErrorHandlers();

      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      // Setup network monitoring
      this.setupNetworkMonitoring();

      // Setup user interaction tracking
      this.setupUserInteractionTracking();

      // Setup battery monitoring
      this.setupBatteryMonitoring();

      // Load alert rules
      await this.loadAlertRules();

      // Start periodic reporting
      this.startPeriodicReporting();

      this.isInitialized = true;
      console.log('Mobile monitoring initialized');

      // Initial context breadcrumb
      this.addBreadcrumb('system', 'Monitoring service initialized', 'info');
    } catch (error) {
      console.error('Failed to initialize mobile monitoring:', error);
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleJavaScriptError(event);
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleUnhandledRejection(event);
    });

    // React error boundary integration
    if ((window as any).onReactError) {
      (window as any).onReactError = (error: Error, errorInfo: any) => {
        this.handleReactError(error, errorInfo);
      };
    }
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Cumulative Layout Shift (CLS)
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (
            entry.entryType === 'layout-shift' &&
            !(entry as any).hadRecentInput
          ) {
            this.recordMetric(
              'cls',
              (entry as any).value,
              'count',
              'performance',
            );
          }
        });
      });
      this.performanceObserver.observe({ entryTypes: ['layout-shift'] });

      // First Input Delay (FID)
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric(
            'fid',
            (entry as any).processingStart - entry.startTime,
            'ms',
            'performance',
          );
        });
      }).observe({ entryTypes: ['first-input'] });

      // Largest Contentful Paint (LCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('lcp', lastEntry.startTime, 'ms', 'performance');
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    }

    // Custom performance metrics
    this.setupCustomPerformanceMetrics();
  }

  /**
   * Setup custom performance metrics
   */
  private setupCustomPerformanceMetrics(): void {
    // Message load times
    document.addEventListener('message-load-start', () => {
      performance.mark('message-load-start');
    });

    document.addEventListener('message-load-end', () => {
      performance.mark('message-load-end');
      performance.measure(
        'message-load-time',
        'message-load-start',
        'message-load-end',
      );

      const measure = performance.getEntriesByName('message-load-time')[0];
      this.recordMetric(
        'message_load_time',
        measure.duration,
        'ms',
        'messaging',
      );

      // Check against alert threshold
      if (measure.duration > 1000) {
        // 1 second threshold
        this.checkAlerts('message_load_time', measure.duration);
      }
    });

    // Sync performance
    document.addEventListener('sync-start', () => {
      performance.mark('sync-start');
    });

    document.addEventListener('sync-end', () => {
      performance.mark('sync-end');
      performance.measure('sync-time', 'sync-start', 'sync-end');

      const measure = performance.getEntriesByName('sync-time')[0];
      this.recordMetric('sync_time', measure.duration, 'ms', 'sync');
    });

    // Memory usage
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.recordMetric(
          'memory_used',
          memory.usedJSHeapSize / 1048576,
          'bytes',
          'performance',
        );
        this.recordMetric(
          'memory_total',
          memory.totalJSHeapSize / 1048576,
          'bytes',
          'performance',
        );

        // Check for memory leaks
        const memoryUsage = memory.usedJSHeapSize / 1048576;
        if (memoryUsage > 100) {
          // 100MB threshold
          this.checkAlerts('memory_usage', memoryUsage);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      const url =
        args[0] instanceof Request ? args[0].url : (args[0] as string);

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;

        this.recordMetric('network_request_time', duration, 'ms', 'network');
        this.addBreadcrumb('network', `Fetch: ${url}`, 'info', {
          status: response.status,
          duration: Math.round(duration),
        });

        // Check for slow requests
        if (duration > 5000) {
          // 5 second threshold
          this.checkAlerts('slow_network_request', duration);
        }

        return response;
      } catch (error) {
        const duration = performance.now() - start;
        this.handleNetworkError(url, error, duration);
        throw error;
      }
    };

    // Network connection monitoring
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', () => {
        this.addBreadcrumb(
          'network',
          `Connection changed: ${connection.effectiveType}`,
          'info',
          {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
          },
        );
      });
    }
  }

  /**
   * Setup user interaction tracking
   */
  private setupUserInteractionTracking(): void {
    // Track user interactions for context
    ['click', 'touch', 'keydown', 'scroll'].forEach((eventType) => {
      document.addEventListener(
        eventType,
        (event) => {
          this.addBreadcrumb('user', `User ${eventType}`, 'info', {
            target: this.getElementDescription(event.target as Element),
            timestamp: Date.now(),
          });
        },
        { passive: true, capture: true },
      );
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.addBreadcrumb('user', 'Form submitted', 'info', {
        action: form.action,
        method: form.method,
        formId: form.id,
      });
    });
  }

  /**
   * Setup battery monitoring
   */
  private setupBatteryMonitoring(): void {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        // Monitor battery level changes
        battery.addEventListener('levelchange', () => {
          this.recordMetric(
            'battery_level',
            battery.level * 100,
            'percent',
            'battery',
          );

          // Alert on critically low battery
          if (battery.level < 0.1) {
            this.checkAlerts('low_battery', battery.level * 100);
          }
        });

        // Monitor charging state
        battery.addEventListener('chargingchange', () => {
          this.addBreadcrumb(
            'system',
            `Battery charging: ${battery.charging}`,
            'info',
          );
        });
      });
    }
  }

  /**
   * Handle JavaScript errors
   */
  private handleJavaScriptError(event: ErrorEvent): void {
    const error: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      error: {
        name: event.error?.name || 'Error',
        message: event.message,
        stack: event.error?.stack,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
      },
      context: this.getErrorContext(),
      metadata: {
        featureName: 'messaging', // Default to messaging for WS-155
        severity: this.determineSeverity(event.error),
        category: 'javascript',
        tags: ['unhandled', 'javascript-error'],
        breadcrumbs: [...this.breadcrumbs],
      },
    };

    this.reportError(error);
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      error: {
        name: 'UnhandledPromiseRejection',
        message:
          event.reason?.message ||
          event.reason?.toString() ||
          'Promise rejection',
        stack: event.reason?.stack,
      },
      context: this.getErrorContext(),
      metadata: {
        featureName: 'messaging',
        severity: 'medium',
        category: 'javascript',
        tags: ['promise-rejection', 'unhandled'],
        breadcrumbs: [...this.breadcrumbs],
      },
    };

    this.reportError(error);
  }

  /**
   * Handle React errors
   */
  private handleReactError(error: Error, errorInfo: any): void {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context: this.getErrorContext(),
      metadata: {
        featureName: 'messaging',
        severity: 'high',
        category: 'javascript',
        tags: ['react-error', 'component-error'],
        breadcrumbs: [...this.breadcrumbs],
      },
    };

    errorReport.metadata.tags.push('react-component');
    if (errorInfo.componentStack) {
      errorReport.error.stack += '\n' + errorInfo.componentStack;
    }

    this.reportError(errorReport);
  }

  /**
   * Handle network errors
   */
  private handleNetworkError(url: string, error: any, duration: number): void {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      error: {
        name: 'NetworkError',
        message: error.message || 'Network request failed',
        stack: error.stack,
      },
      context: {
        ...this.getErrorContext(),
        url,
      },
      metadata: {
        featureName: 'messaging',
        severity: 'medium',
        category: 'network',
        tags: ['network-error', 'fetch-failed'],
        breadcrumbs: [...this.breadcrumbs],
      },
    };

    this.reportError(errorReport);
  }

  /**
   * Record performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: 'ms' | 'bytes' | 'fps' | 'percent' | 'count',
    feature: string,
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      metric: { name, value, unit },
      context: {
        feature,
        action: 'measurement',
        deviceType: this.getDeviceType(),
        networkType: this.getNetworkType(),
        batteryLevel: this.getBatteryLevel(),
      },
    };

    this.metricsBuffer.push(metric);
    this.addBreadcrumb('performance', `${name}: ${value}${unit}`, 'info');
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(
    category: string,
    message: string,
    level: 'info' | 'warning' | 'error',
    data?: any,
  ): void {
    const breadcrumb: BreadcrumbEntry = {
      timestamp: new Date().toISOString(),
      category,
      message,
      level,
      data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only last 50 breadcrumbs
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Report error
   */
  private async reportError(error: ErrorReport): Promise<void> {
    this.errorBuffer.push(error);

    // Immediate reporting for critical errors
    if (error.metadata.severity === 'critical') {
      await this.sendErrorReport(error);
    }

    console.error('Mobile monitoring error:', error);
  }

  /**
   * Send error report to server
   */
  private async sendErrorReport(error: ErrorReport): Promise<void> {
    try {
      await supabase.from('error_reports').insert({
        id: error.id,
        timestamp: error.timestamp,
        user_id: error.userId,
        session_id: error.sessionId,
        device_id: error.deviceId,
        error_data: error.error,
        context_data: error.context,
        metadata: error.metadata,
      });
    } catch (err) {
      console.error('Failed to send error report:', err);
    }
  }

  /**
   * Send performance metrics to server
   */
  private async sendMetrics(metrics: PerformanceMetric[]): Promise<void> {
    try {
      const records = metrics.map((metric) => ({
        id: metric.id,
        timestamp: metric.timestamp,
        user_id: metric.userId,
        session_id: metric.sessionId,
        device_id: metric.deviceId,
        metric_name: metric.metric.name,
        metric_value: metric.metric.value,
        metric_unit: metric.metric.unit,
        context_data: metric.context,
      }));

      await supabase.from('performance_metrics').insert(records);
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
    }
  }

  /**
   * Load alert rules
   */
  private async loadAlertRules(): Promise<void> {
    try {
      const { data } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('enabled', true);

      this.alertRules = data || [];
    } catch (error) {
      console.error('Failed to load alert rules:', error);
    }
  }

  /**
   * Check alerts
   */
  private checkAlerts(metricName: string, value: number): void {
    const rules = this.alertRules.filter((rule) => rule.name === metricName);

    rules.forEach((rule) => {
      if (this.evaluateCondition(rule.condition, value, rule.threshold)) {
        this.triggerAlert(rule, value);
      }
    });
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(
    condition: string,
    value: number,
    threshold: number,
  ): boolean {
    switch (condition) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(rule: AlertRule, value: number): Promise<void> {
    console.warn(
      `Alert triggered: ${rule.name} = ${value} (threshold: ${rule.threshold})`,
    );

    // Send alert to server
    await supabase.from('alerts').insert({
      rule_id: rule.id,
      session_id: this.sessionId,
      device_id: this.deviceId,
      metric_value: value,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    setInterval(() => {
      this.flushBuffers();
    }, 60000); // Every minute

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushBuffers();
    });
  }

  /**
   * Flush error and metrics buffers
   */
  private async flushBuffers(): Promise<void> {
    if (this.errorBuffer.length > 0) {
      const errors = [...this.errorBuffer];
      this.errorBuffer = [];

      for (const error of errors) {
        await this.sendErrorReport(error);
      }
    }

    if (this.metricsBuffer.length > 0) {
      const metrics = [...this.metricsBuffer];
      this.metricsBuffer = [];

      await this.sendMetrics(metrics);
    }
  }

  /**
   * Helper methods
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceId(): string {
    return localStorage.getItem('device_id') || 'unknown';
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const userAgent = navigator.userAgent;
    if (/iPhone|iPod|Android.*Mobile/.test(userAgent)) return 'mobile';
    if (/iPad|Android/.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  private getNetworkType(): string {
    if ('connection' in navigator) {
      return (navigator as any).connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private getBatteryLevel(): number {
    // This would need to be updated via battery monitoring
    return 0;
  }

  private getErrorContext(): ErrorReport['context'] {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      deviceType: this.getDeviceType(),
      networkType: this.getNetworkType(),
      batteryLevel: this.getBatteryLevel(),
    };
  }

  private determineSeverity(
    error: Error,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (!error) return 'low';

    const message = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';

    // Critical errors
    if (
      message.includes('chunk load failed') ||
      message.includes('loading chunk') ||
      message.includes('network error')
    ) {
      return 'critical';
    }

    // High severity errors
    if (
      message.includes('reference') ||
      message.includes('undefined') ||
      stack.includes('react')
    ) {
      return 'high';
    }

    // Medium severity
    if (message.includes('warning') || message.includes('deprecated')) {
      return 'medium';
    }

    return 'low';
  }

  private getElementDescription(element: Element): string {
    if (!element) return 'unknown';

    let description = element.tagName.toLowerCase();
    if (element.id) description += `#${element.id}`;
    if (element.className) description += `.${element.className.split(' ')[0]}`;

    return description;
  }

  /**
   * Get monitoring dashboard data
   */
  getMonitoringDashboard(): {
    sessionId: string;
    deviceId: string;
    errorCount: number;
    metricsCount: number;
    breadcrumbCount: number;
    alertRuleCount: number;
  } {
    return {
      sessionId: this.sessionId,
      deviceId: this.deviceId,
      errorCount: this.errorBuffer.length,
      metricsCount: this.metricsBuffer.length,
      breadcrumbCount: this.breadcrumbs.length,
      alertRuleCount: this.alertRules.length,
    };
  }

  /**
   * Cleanup on service destruction
   */
  cleanup(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    // Final buffer flush
    this.flushBuffers();
  }
}

// Export singleton instance
export const mobileMonitoring = MobileMonitoringService.getInstance();
