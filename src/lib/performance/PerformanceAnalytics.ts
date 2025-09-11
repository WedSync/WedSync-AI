/**
 * Performance Analytics Service for WedSync Environment Variables Management System
 * Team D - Performance Optimization & Mobile Experience
 * Handles business metrics, user engagement tracking, and real-time alerting
 */

import {
  performanceMonitor,
  PerformanceMetrics,
  PerformanceAlert,
  PerformanceReport,
} from './PerformanceMonitor';

export interface BusinessMetrics {
  // User engagement metrics
  sessionDuration: number;
  pageViews: number;
  uniqueUsers: number;
  bounceRate: number;

  // Feature usage metrics
  environmentVariablesAccessed: number;
  variablesCreated: number;
  variablesUpdated: number;
  variablesDeleted: number;
  searchQueries: number;

  // Wedding industry specific metrics
  supplierOnboardingTime: number;
  configurationCompleteRate: number;
  mobileUsagePercent: number;
  peakUsageHours: number[];

  // Error and reliability metrics
  errorRate: number;
  successRate: number;
  systemAvailability: number;
}

export interface UserEngagementEvent {
  eventType:
    | 'page_view'
    | 'feature_use'
    | 'error'
    | 'conversion'
    | 'search'
    | 'form_submit';
  userId?: string;
  sessionId: string;
  timestamp: Date;
  properties: Record<string, any>;
  performanceContext?: Partial<PerformanceMetrics>;
}

export interface AlertRule {
  id: string;
  metric: keyof PerformanceMetrics | keyof BusinessMetrics;
  condition: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notificationChannels: ('email' | 'slack' | 'dashboard' | 'webhook')[];
  cooldownMinutes: number;
  lastTriggered?: Date;
}

export class PerformanceAnalytics {
  private static instance: PerformanceAnalytics;
  private events: UserEngagementEvent[] = [];
  private alertRules: AlertRule[] = [];
  private businessMetrics: Partial<BusinessMetrics> = {};
  private isEnabled = true;

  // Wedding industry specific thresholds
  private weddingMetricTargets = {
    supplierOnboardingTime: 300000, // 5 minutes
    configurationCompleteRate: 0.85, // 85%
    mobileUsagePercent: 0.6, // 60%
    errorRate: 0.02, // 2%
    systemAvailability: 0.999, // 99.9%
  };

  private constructor() {
    this.initializeDefaultAlerts();
    this.startMetricsCollection();
  }

  static getInstance(): PerformanceAnalytics {
    if (!PerformanceAnalytics.instance) {
      PerformanceAnalytics.instance = new PerformanceAnalytics();
    }
    return PerformanceAnalytics.instance;
  }

  private initializeDefaultAlerts(): void {
    this.alertRules = [
      {
        id: 'dashboard-load-time',
        metric: 'dashboardLoadTime',
        condition: 'greater_than',
        threshold: 2000,
        severity: 'high',
        enabled: true,
        notificationChannels: ['dashboard', 'slack'],
        cooldownMinutes: 5,
      },
      {
        id: 'api-response-time',
        metric: 'apiResponseTime',
        condition: 'greater_than',
        threshold: 500,
        severity: 'medium',
        enabled: true,
        notificationChannels: ['dashboard'],
        cooldownMinutes: 2,
      },
      {
        id: 'mobile-performance',
        metric: 'mobileLoadTime',
        condition: 'greater_than',
        threshold: 3000,
        severity: 'high',
        enabled: true,
        notificationChannels: ['dashboard', 'email'],
        cooldownMinutes: 10,
      },
      {
        id: 'error-rate-threshold',
        metric: 'errorRate',
        condition: 'greater_than',
        threshold: 0.05, // 5%
        severity: 'critical',
        enabled: true,
        notificationChannels: ['email', 'slack', 'webhook'],
        cooldownMinutes: 1,
      },
      {
        id: 'supplier-onboarding-time',
        metric: 'supplierOnboardingTime',
        condition: 'greater_than',
        threshold: 600000, // 10 minutes
        severity: 'medium',
        enabled: true,
        notificationChannels: ['dashboard'],
        cooldownMinutes: 15,
      },
    ];
  }

  private startMetricsCollection(): void {
    if (typeof window === 'undefined') return;

    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectBusinessMetrics();
    }, 30000);

    // Track page visibility changes (important for mobile)
    document.addEventListener('visibilitychange', () => {
      this.trackEvent('page_view', {
        visibility: document.hidden ? 'hidden' : 'visible',
        timestamp: new Date().toISOString(),
      });
    });

    // Track network changes (important for wedding venues)
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', () => {
        this.trackEvent('feature_use', {
          feature: 'network_change',
          connectionType: (navigator as any).connection.effectiveType,
          downlink: (navigator as any).connection.downlink,
        });
      });
    }
  }

  private collectBusinessMetrics(): void {
    // This would typically aggregate from stored events and database queries
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentEvents = this.events.filter(
      (event) => event.timestamp.getTime() > oneHourAgo,
    );

    // Calculate business metrics from recent events
    this.businessMetrics = {
      ...this.businessMetrics,
      pageViews: recentEvents.filter((e) => e.eventType === 'page_view').length,
      uniqueUsers: new Set(recentEvents.map((e) => e.userId).filter(Boolean))
        .size,
      errorRate:
        recentEvents.filter((e) => e.eventType === 'error').length /
        Math.max(recentEvents.length, 1),
      searchQueries: recentEvents.filter((e) => e.eventType === 'search')
        .length,
      mobileUsagePercent: this.calculateMobileUsagePercent(recentEvents),
    };

    // Check alert rules against current metrics
    this.checkAlertRules();
  }

  private calculateMobileUsagePercent(events: UserEngagementEvent[]): number {
    const totalEvents = events.length;
    if (totalEvents === 0) return 0;

    const mobileEvents = events.filter(
      (event) =>
        event.properties?.deviceType === 'mobile' ||
        event.properties?.screenWidth < 768,
    ).length;

    return mobileEvents / totalEvents;
  }

  private checkAlertRules(): void {
    const performanceReport = performanceMonitor.generatePerformanceReport();
    const currentMetrics = {
      ...performanceReport.metrics,
      ...this.businessMetrics,
    };

    this.alertRules.forEach((rule) => {
      if (!rule.enabled) return;

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (Date.now() - rule.lastTriggered.getTime() < cooldownMs) {
          return;
        }
      }

      const currentValue =
        currentMetrics[rule.metric as keyof typeof currentMetrics];
      if (currentValue === undefined) return;

      let shouldAlert = false;

      switch (rule.condition) {
        case 'greater_than':
          shouldAlert = currentValue > rule.threshold;
          break;
        case 'less_than':
          shouldAlert = currentValue < rule.threshold;
          break;
        case 'equals':
          shouldAlert = currentValue === rule.threshold;
          break;
      }

      if (shouldAlert) {
        this.triggerAlert(rule, currentValue, performanceReport.deviceInfo);
        rule.lastTriggered = new Date();
      }
    });
  }

  private triggerAlert(
    rule: AlertRule,
    currentValue: any,
    deviceInfo: any,
  ): void {
    const alert: PerformanceAlert = {
      metric: rule.metric as keyof PerformanceMetrics,
      threshold: rule.threshold,
      currentValue,
      severity: rule.severity,
      timestamp: new Date(),
      context: {
        rule: rule.id,
        deviceInfo,
        businessContext: this.getBusinessContext(),
      },
    };

    // Send to different notification channels
    rule.notificationChannels.forEach((channel) => {
      this.sendNotification(channel, alert);
    });
  }

  private getBusinessContext(): Record<string, any> {
    return {
      isWeddingSeason: this.isWeddingSeason(),
      peakUsageTime: this.isPeakUsageTime(),
      supplierCount: this.businessMetrics.uniqueUsers || 0,
      currentHour: new Date().getHours(),
    };
  }

  private isWeddingSeason(): boolean {
    const month = new Date().getMonth();
    // May through October are peak wedding months
    return month >= 4 && month <= 9;
  }

  private isPeakUsageTime(): boolean {
    const hour = new Date().getHours();
    // Peak usage typically 9 AM - 6 PM
    return hour >= 9 && hour <= 18;
  }

  private sendNotification(channel: string, alert: PerformanceAlert): void {
    switch (channel) {
      case 'dashboard':
        // Store alert for dashboard display
        this.storeAlertForDashboard(alert);
        break;
      case 'email':
        this.sendEmailAlert(alert);
        break;
      case 'slack':
        this.sendSlackAlert(alert);
        break;
      case 'webhook':
        this.sendWebhookAlert(alert);
        break;
    }
  }

  private storeAlertForDashboard(alert: PerformanceAlert): void {
    // Would typically store in database or state management
    localStorage.setItem(
      'performance-alerts',
      JSON.stringify([
        ...JSON.parse(localStorage.getItem('performance-alerts') || '[]'),
        alert,
      ]),
    );
  }

  private sendEmailAlert(alert: PerformanceAlert): void {
    if (typeof window !== 'undefined') {
      fetch('/api/admin/performance/alerts/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      }).catch(console.error);
    }
  }

  private sendSlackAlert(alert: PerformanceAlert): void {
    if (typeof window !== 'undefined') {
      fetch('/api/admin/performance/alerts/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      }).catch(console.error);
    }
  }

  private sendWebhookAlert(alert: PerformanceAlert): void {
    if (typeof window !== 'undefined') {
      fetch('/api/admin/performance/alerts/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      }).catch(console.error);
    }
  }

  // Public API Methods

  /**
   * Track Core Web Vitals
   */
  trackCoreWebVitals(): void {
    // This integrates with PerformanceMonitor
    performanceMonitor.trackDashboardLoad();
    performanceMonitor.trackMobilePerformance();
  }

  /**
   * Track mobile-specific performance metrics
   */
  trackMobilePerformance(): void {
    if (this.isMobileDevice()) {
      this.trackEvent('feature_use', {
        feature: 'mobile_access',
        deviceType: 'mobile',
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        orientation:
          window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      });

      // Track mobile-specific metrics
      performanceMonitor.trackMobilePerformance();
    }
  }

  /**
   * Track battery usage on mobile devices
   */
  trackBatteryUsage(): void {
    if ('getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          this.trackEvent('feature_use', {
            feature: 'battery_level',
            level: battery.level,
            charging: battery.charging,
          });
        })
        .catch(() => {
          // Battery API not available
        });
    }
  }

  /**
   * Track network usage and performance
   */
  trackNetworkUsage(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.trackEvent('feature_use', {
        feature: 'network_usage',
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      });
    }
  }

  /**
   * Track user engagement metrics
   */
  trackUserEngagement(): void {
    // Track session duration
    const sessionStart = sessionStorage.getItem('session-start');
    if (!sessionStart) {
      sessionStorage.setItem('session-start', Date.now().toString());
    }

    // Track engagement on page unload
    window.addEventListener('beforeunload', () => {
      const sessionStartTime = parseInt(
        sessionStorage.getItem('session-start') || '0',
      );
      const sessionDuration = Date.now() - sessionStartTime;

      this.trackEvent('page_view', {
        feature: 'session_end',
        sessionDuration,
        pageViews: this.events.filter((e) => e.eventType === 'page_view')
          .length,
      });
    });
  }

  /**
   * Track feature usage patterns
   */
  trackFeatureUsage(): void {
    // Track environment variable operations
    const trackFeatureUse = (featureName: string) => {
      this.trackEvent('feature_use', {
        feature: featureName,
        timestamp: new Date().toISOString(),
        context: this.getBusinessContext(),
      });
    };

    // Export tracking function for use in components
    (window as any).trackWedSyncFeature = trackFeatureUse;
  }

  /**
   * Track error rates and types
   */
  trackErrorRates(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackEvent('error', {
        error: event.error?.message || 'Unknown error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('error', {
        error: 'Unhandled Promise Rejection',
        reason: event.reason,
        promise: event.promise,
      });
    });
  }

  /**
   * Real-time alerting for critical issues
   */
  alertOnPerformanceThresholds(): void {
    // This is handled automatically by checkAlertRules
    // Called every 30 seconds in startMetricsCollection
  }

  /**
   * Notify of critical performance issues immediately
   */
  notifyOfCriticalIssues(): void {
    const criticalAlerts = this.getRecentCriticalAlerts();

    if (criticalAlerts.length > 0) {
      // Immediate notification for critical issues
      criticalAlerts.forEach((alert) => {
        this.sendNotification('email', alert);
        this.sendNotification('slack', alert);

        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('WedSync Critical Performance Alert', {
            body: `${alert.metric}: ${alert.currentValue} exceeds threshold of ${alert.threshold}`,
            icon: '/icons/alert.png',
          });
        }
      });
    }
  }

  /**
   * Track a custom event
   */
  trackEvent(
    eventType: UserEngagementEvent['eventType'],
    properties: Record<string, any>,
  ): void {
    if (!this.isEnabled) return;

    const event: UserEngagementEvent = {
      eventType,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      timestamp: new Date(),
      properties: {
        ...properties,
        url: window.location.pathname,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
      performanceContext:
        performanceMonitor.generatePerformanceReport().metrics,
    };

    this.events.push(event);

    // Keep only last 1000 events to prevent memory issues
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // Send to analytics endpoint
    this.sendEventToAnalytics(event);
  }

  private sendEventToAnalytics(event: UserEngagementEvent): void {
    if (typeof window !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/admin/performance/events',
        JSON.stringify(event),
      );
    }
  }

  /**
   * Get comprehensive analytics report
   */
  getAnalyticsReport(): {
    performance: PerformanceReport;
    business: BusinessMetrics;
    alerts: PerformanceAlert[];
    events: UserEngagementEvent[];
  } {
    return {
      performance: performanceMonitor.generatePerformanceReport(),
      business: this.businessMetrics as BusinessMetrics,
      alerts: this.getRecentAlerts(),
      events: this.events.slice(-100), // Last 100 events
    };
  }

  private getRecentAlerts(): PerformanceAlert[] {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return JSON.parse(
      localStorage.getItem('performance-alerts') || '[]',
    ).filter(
      (alert: PerformanceAlert) =>
        new Date(alert.timestamp).getTime() > oneHourAgo,
    );
  }

  private getRecentCriticalAlerts(): PerformanceAlert[] {
    return this.getRecentAlerts().filter(
      (alert) => alert.severity === 'critical',
    );
  }

  private isMobileDevice(): boolean {
    return (
      window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      )
    );
  }

  private getCurrentUserId(): string | undefined {
    // Would integrate with your authentication system
    return undefined;
  }

  private getSessionId(): string {
    if (!sessionStorage.getItem('analytics-session-id')) {
      sessionStorage.setItem('analytics-session-id', crypto.randomUUID());
    }
    return sessionStorage.getItem('analytics-session-id')!;
  }

  /**
   * Enable or disable analytics collection
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = crypto.randomUUID();
    this.alertRules.push({ ...rule, id });
    return id;
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(id: string): void {
    this.alertRules = this.alertRules.filter((rule) => rule.id !== id);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.events = [];
    this.alertRules = [];
    this.isEnabled = false;
  }
}

// Export singleton instance
export const performanceAnalytics = PerformanceAnalytics.getInstance();
