'use client';

import { logger } from '@/lib/logger';

export interface PWAAnalyticsEvent {
  type: 'install_prompt' | 'install_complete' | 'usage_metric';
  data: any;
}

export interface DeviceInfo {
  viewport_width?: number;
  viewport_height?: number;
  is_mobile?: boolean;
  is_ios?: boolean;
  is_android?: boolean;
  browser_name?: string;
  connection_type?: string;
  is_standalone?: boolean;
  supports_web_share?: boolean;
  supports_notifications?: boolean;
}

export interface WeddingContext {
  has_active_wedding?: boolean;
  days_until_wedding?: number;
  supplier_type?: string;
  wedding_party_size?: string;
  is_wedding_week?: boolean;
}

export interface PerformanceMetrics {
  first_contentful_paint?: number;
  largest_contentful_paint?: number;
  cumulative_layout_shift?: number;
  first_input_delay?: number;
  time_to_interactive?: number;
  service_worker_startup_time?: number;
}

class PWAAnalytics {
  private sessionId: string;
  private userId?: string;
  private eventQueue: PWAAnalyticsEvent[] = [];
  private isOnline = true;
  private batchTimeout?: NodeJS.Timeout;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_TIMEOUT = 30000; // 30 seconds

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeOnlineDetection();
    this.initializePerformanceObserver();

    // Send queued events when page is about to unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushEventQueue();
      });

      // Send events when page becomes hidden
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushEventQueue();
        }
      });
    }
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private initializeOnlineDetection() {
    if (typeof window === 'undefined') return;

    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processEventQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private initializePerformanceObserver() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      // Observe Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.trackPerformanceMetric(entry);
        });
      });

      observer.observe({ entryTypes: ['navigation', 'paint', 'layout-shift'] });

      // Observe First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.trackUsageMetric('performance_timing', {
            first_input_delay: entry.processingStart - entry.startTime,
          });
        });
      });

      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      logger.warn('Performance observer initialization failed', { error });
    }
  }

  private trackPerformanceMetric(entry: PerformanceEntry) {
    const metrics: Partial<PerformanceMetrics> = {};

    switch (entry.entryType) {
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          metrics.first_contentful_paint = entry.startTime;
        }
        break;

      case 'largest-contentful-paint':
        metrics.largest_contentful_paint = entry.startTime;
        break;

      case 'layout-shift':
        if (!(entry as any).hadRecentInput) {
          metrics.cumulative_layout_shift = (entry as any).value;
        }
        break;

      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        metrics.time_to_interactive =
          navEntry.domInteractive - navEntry.navigationStart;
        break;
    }

    if (Object.keys(metrics).length > 0) {
      this.trackUsageMetric('performance_timing', {
        performance_metrics: metrics,
      });
    }
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  setWeddingContext(context: WeddingContext) {
    this.weddingContext = context;
  }

  private weddingContext?: WeddingContext;

  getDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') return {};

    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = isIOS || isAndroid || /Mobi|Mobile/i.test(userAgent);

    const getBrowserName = (): string => {
      if (userAgent.includes('Chrome')) return 'chrome';
      if (userAgent.includes('Firefox')) return 'firefox';
      if (userAgent.includes('Safari') && !userAgent.includes('Chrome'))
        return 'safari';
      if (userAgent.includes('Edge')) return 'edge';
      if (userAgent.includes('Opera')) return 'opera';
      return 'other';
    };

    const getConnectionType = (): string => {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      if (connection) {
        return connection.effectiveType || 'unknown';
      }
      return 'unknown';
    };

    return {
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      is_mobile: isMobile,
      is_ios: isIOS,
      is_android: isAndroid,
      browser_name: getBrowserName(),
      connection_type: getConnectionType(),
      is_standalone: window.matchMedia('(display-mode: standalone)').matches,
      supports_web_share: 'share' in navigator,
      supports_notifications: 'Notification' in window,
    };
  }

  trackInstallPrompt(
    eventType: 'prompt_shown' | 'prompt_dismissed' | 'prompt_accepted',
    context?: any,
  ) {
    const event = {
      event_type: eventType,
      user_id: this.userId,
      session_id: this.sessionId,
      device_info: this.getDeviceInfo(),
      prompt_context: {
        page_url: window.location.href,
        user_gesture: context?.userGesture || false,
        days_since_last_prompt: context?.daysSinceLastPrompt,
        previous_dismissals: context?.previousDismissals,
      },
      wedding_context: this.weddingContext,
    };

    this.queueEvent({ type: 'install_prompt', data: event });

    logger.info('PWA install prompt tracked', {
      eventType,
      sessionId: this.sessionId,
    });
  }

  trackInstallComplete(
    eventType:
      | 'installation_started'
      | 'installation_completed'
      | 'installation_failed',
    data?: any,
  ) {
    const event = {
      event_type: eventType,
      user_id: this.userId,
      session_id: this.sessionId,
      installation_method: data?.installationMethod || 'browser_prompt',
      device_info: this.getDeviceInfo(),
      installation_context: {
        page_url: window.location.href,
        referrer: document.referrer,
        time_on_page_seconds: data?.timeOnPageSeconds,
        interactions_before_install: data?.interactionsBeforeInstall,
        from_offline_banner: data?.fromOfflineBanner || false,
      },
      wedding_context: this.weddingContext,
      performance_metrics: data?.performanceMetrics,
    };

    this.queueEvent({ type: 'install_complete', data: event });

    logger.info('PWA installation tracked', {
      eventType,
      sessionId: this.sessionId,
    });
  }

  trackUsageMetric(metricType: string, data?: any) {
    const event = {
      user_id: this.userId,
      session_id: this.sessionId,
      metric_type: metricType,
      metric_data: {
        page_url: window.location.href,
        duration_seconds: data?.durationSeconds,
        is_standalone: window.matchMedia('(display-mode: standalone)').matches,
        is_offline: !navigator.onLine,
        load_time_ms: data?.loadTimeMs,
        service_worker_version: data?.serviceWorkerVersion,
        network_type: this.getConnectionType(),
        ...data?.metricData,
      },
      wedding_activity: data?.weddingActivity,
      performance_metrics: data?.performanceMetrics,
      error_info: data?.errorInfo,
    };

    this.queueEvent({ type: 'usage_metric', data: event });
  }

  trackWeddingActivity(feature: string, action: string, data?: any) {
    this.trackUsageMetric('wedding_activity', {
      weddingActivity: {
        feature_used: feature,
        action_type: action,
        offline_capable: data?.offlineCapable || false,
        sync_required: data?.syncRequired || false,
        critical_data: data?.criticalData || false,
      },
    });
  }

  trackError(errorType: string, errorMessage: string, stackTrace?: string) {
    this.trackUsageMetric('error', {
      errorInfo: {
        error_type: errorType,
        error_message: errorMessage.slice(0, 500), // Limit message length
        stack_trace: stackTrace?.slice(0, 1000), // Limit stack trace length
      },
    });
  }

  trackServiceWorkerEvent(eventType: string, data?: any) {
    this.trackUsageMetric('service_worker_event', {
      metricData: {
        service_worker_event: eventType,
        service_worker_version: data?.version,
        ...data,
      },
    });
  }

  private getConnectionType(): string {
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      return connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private queueEvent(event: PWAAnalyticsEvent) {
    this.eventQueue.push(event);

    // Process queue if we have enough events or if we're offline
    if (this.eventQueue.length >= this.BATCH_SIZE || !this.isOnline) {
      this.processEventQueue();
    } else {
      // Set timeout for batch processing
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }

      this.batchTimeout = setTimeout(() => {
        this.processEventQueue();
      }, this.BATCH_TIMEOUT);
    }
  }

  private async processEventQueue() {
    if (this.eventQueue.length === 0 || !this.isOnline) return;

    // Clear batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = undefined;
    }

    const eventsToSend = this.eventQueue.splice(0, this.BATCH_SIZE);

    try {
      await Promise.allSettled([
        this.sendInstallPromptEvents(
          eventsToSend.filter((e) => e.type === 'install_prompt'),
        ),
        this.sendInstallCompleteEvents(
          eventsToSend.filter((e) => e.type === 'install_complete'),
        ),
        this.sendUsageMetricEvents(
          eventsToSend.filter((e) => e.type === 'usage_metric'),
        ),
      ]);
    } catch (error) {
      logger.error('Failed to send analytics events', { error });
      // Re-queue events on failure (but limit retries to avoid infinite loops)
      if (eventsToSend.length > 0 && this.eventQueue.length < 100) {
        this.eventQueue.unshift(...eventsToSend);
      }
    }
  }

  private async sendInstallPromptEvents(events: PWAAnalyticsEvent[]) {
    if (events.length === 0) return;

    for (const event of events) {
      try {
        const response = await fetch('/api/pwa/install-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event.data),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        logger.error('Failed to send install prompt event', {
          error,
          eventType: event.data?.event_type,
        });
        throw error;
      }
    }
  }

  private async sendInstallCompleteEvents(events: PWAAnalyticsEvent[]) {
    if (events.length === 0) return;

    for (const event of events) {
      try {
        const response = await fetch('/api/pwa/install-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event.data),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        logger.error('Failed to send install complete event', {
          error,
          eventType: event.data?.event_type,
        });
        throw error;
      }
    }
  }

  private async sendUsageMetricEvents(events: PWAAnalyticsEvent[]) {
    if (events.length === 0) return;

    try {
      // Send usage metrics in batch
      const response = await fetch('/api/pwa/usage-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events.map((e) => e.data)),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send usage metric events', {
        error,
        eventCount: events.length,
      });
      throw error;
    }
  }

  private flushEventQueue() {
    if (this.eventQueue.length === 0) return;

    // Use sendBeacon if available for reliable delivery on page unload
    if ('sendBeacon' in navigator) {
      try {
        const events = this.eventQueue.splice(0);
        const data = JSON.stringify(events);

        navigator.sendBeacon('/api/pwa/usage-metrics', data);

        logger.info('Flushed analytics queue via sendBeacon', {
          eventCount: events.length,
        });
      } catch (error) {
        logger.error('Failed to flush analytics queue', { error });
      }
    } else {
      // Fallback: try to send synchronously (may be unreliable on page unload)
      this.processEventQueue();
    }
  }

  // Public method to manually flush events (e.g., before navigation)
  flush() {
    this.flushEventQueue();
  }
}

// Global analytics instance
export const pwaAnalytics = new PWAAnalytics();
