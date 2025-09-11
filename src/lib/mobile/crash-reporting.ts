interface CrashReport {
  id: string;
  timestamp: number;
  type:
    | 'javascript'
    | 'unhandledRejection'
    | 'resourceError'
    | 'networkError'
    | 'serviceWorkerError';
  message: string;
  stack?: string;
  url: string;
  line?: number;
  column?: number;
  userAgent: string;
  platform: 'ios' | 'android' | 'desktop';
  isStandalone: boolean;
  sessionId: string;
  userId?: string;

  // Context information
  viewport: string;
  connectionType?: string;
  batteryLevel?: number;
  deviceMemory?: number;

  // App state
  currentRoute: string;
  previousRoute?: string;
  serviceWorkerState?: string;

  // User actions leading to crash
  breadcrumbs: Array<{
    timestamp: number;
    category: string;
    message: string;
    level: 'info' | 'warn' | 'error';
    data?: Record<string, any>;
  }>;
}

interface CrashReportingConfig {
  maxBreadcrumbs: number;
  enableConsoleCapture: boolean;
  enableNetworkCapture: boolean;
  enableUserInteractionCapture: boolean;
  sampleRate: number; // 0-1, percentage of crashes to report
}

class MobileCrashReporter {
  private reports: CrashReport[] = [];
  private breadcrumbs: CrashReport['breadcrumbs'] = [];
  private sessionId: string;
  private userId?: string;
  private previousRoute?: string;
  private config: CrashReportingConfig;

  constructor(config: Partial<CrashReportingConfig> = {}) {
    this.sessionId = this.generateSessionId();
    this.config = {
      maxBreadcrumbs: 50,
      enableConsoleCapture: true,
      enableNetworkCapture: true,
      enableUserInteractionCapture: true,
      sampleRate: 1.0,
      ...config,
    };

    this.initialize();
  }

  private generateSessionId(): string {
    return `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    // Set up error handlers
    this.setupErrorHandlers();

    // Set up breadcrumb collection
    this.setupBreadcrumbCollection();

    // Track route changes
    this.trackRouteChanges();

    // Set up periodic reporting
    this.setupPeriodicReporting();

    this.addBreadcrumb('system', 'Crash reporting initialized', 'info');
  }

  private setupErrorHandlers() {
    // JavaScript runtime errors
    window.addEventListener('error', (event) => {
      if (Math.random() > this.config.sampleRate) return;

      const report: CrashReport = {
        id: this.generateReportId(),
        timestamp: Date.now(),
        type: 'javascript',
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        line: event.lineno,
        column: event.colno,
        userAgent: navigator.userAgent,
        platform: this.getPlatform(),
        isStandalone: this.isStandaloneMode(),
        sessionId: this.sessionId,
        userId: this.userId,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        currentRoute: window.location.pathname,
        previousRoute: this.previousRoute,
        breadcrumbs: [...this.breadcrumbs],
      };

      this.addDeviceContext(report);
      this.recordCrash(report);
      this.addBreadcrumb(
        'error',
        `JavaScript error: ${event.message}`,
        'error',
        {
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      );
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (Math.random() > this.config.sampleRate) return;

      const report: CrashReport = {
        id: this.generateReportId(),
        timestamp: Date.now(),
        type: 'unhandledRejection',
        message:
          event.reason?.message ||
          String(event.reason) ||
          'Unhandled promise rejection',
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        platform: this.getPlatform(),
        isStandalone: this.isStandaloneMode(),
        sessionId: this.sessionId,
        userId: this.userId,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        currentRoute: window.location.pathname,
        previousRoute: this.previousRoute,
        breadcrumbs: [...this.breadcrumbs],
      };

      this.addDeviceContext(report);
      this.recordCrash(report);
      this.addBreadcrumb(
        'error',
        `Unhandled rejection: ${report.message}`,
        'error',
      );
    });

    // Resource loading errors
    window.addEventListener(
      'error',
      (event) => {
        if (event.target !== window && event.target) {
          const target = event.target as HTMLElement;
          const tagName = target.tagName?.toLowerCase();

          if (['img', 'script', 'link', 'video', 'audio'].includes(tagName)) {
            const report: CrashReport = {
              id: this.generateReportId(),
              timestamp: Date.now(),
              type: 'resourceError',
              message: `Failed to load ${tagName}: ${(target as any).src || (target as any).href}`,
              url: window.location.href,
              userAgent: navigator.userAgent,
              platform: this.getPlatform(),
              isStandalone: this.isStandaloneMode(),
              sessionId: this.sessionId,
              userId: this.userId,
              viewport: `${window.innerWidth}x${window.innerHeight}`,
              currentRoute: window.location.pathname,
              previousRoute: this.previousRoute,
              breadcrumbs: [...this.breadcrumbs],
            };

            this.addDeviceContext(report);
            this.recordCrash(report);
            this.addBreadcrumb(
              'resource',
              `Resource load failed: ${tagName}`,
              'error',
              {
                src: (target as any).src || (target as any).href,
              },
            );
          }
        }
      },
      true,
    );
  }

  private setupBreadcrumbCollection() {
    if (
      !this.config.enableConsoleCapture &&
      !this.config.enableNetworkCapture &&
      !this.config.enableUserInteractionCapture
    ) {
      return;
    }

    // Console capture
    if (this.config.enableConsoleCapture) {
      this.interceptConsole();
    }

    // Network capture
    if (this.config.enableNetworkCapture) {
      this.interceptNetworkRequests();
    }

    // User interaction capture
    if (this.config.enableUserInteractionCapture) {
      this.captureUserInteractions();
    }
  }

  private interceptConsole() {
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };

    console.error = (...args) => {
      this.addBreadcrumb('console', `Error: ${args.join(' ')}`, 'error');
      originalConsole.error.apply(console, args);
    };

    console.warn = (...args) => {
      this.addBreadcrumb('console', `Warning: ${args.join(' ')}`, 'warn');
      originalConsole.warn.apply(console, args);
    };
  }

  private interceptNetworkRequests() {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const startTime = Date.now();

      try {
        const response = await originalFetch.apply(window, args);
        const duration = Date.now() - startTime;

        this.addBreadcrumb(
          'network',
          `Fetch ${response.status}: ${url}`,
          'info',
          {
            method: args[1]?.method || 'GET',
            status: response.status,
            duration,
          },
        );

        if (!response.ok) {
          this.addBreadcrumb(
            'network',
            `Network error ${response.status}: ${url}`,
            'error',
            {
              status: response.status,
              statusText: response.statusText,
            },
          );
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.addBreadcrumb('network', `Network error: ${url}`, 'error', {
          error: error instanceof Error ? error.message : String(error),
          duration,
        });
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...args) {
      (this as any)._crashReporterUrl = url;
      (this as any)._crashReporterMethod = method;
      (this as any)._crashReporterStartTime = Date.now();
      return originalXHROpen.apply(this, [method, url, ...args]);
    };

    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener('load', function () {
        const duration = Date.now() - (this as any)._crashReporterStartTime;
        const url = (this as any)._crashReporterUrl;
        const method = (this as any)._crashReporterMethod;

        if (this.status >= 400) {
          window.crashReporter?.addBreadcrumb(
            'network',
            `XHR error ${this.status}: ${url}`,
            'error',
            {
              method,
              status: this.status,
              duration,
            },
          );
        } else {
          window.crashReporter?.addBreadcrumb(
            'network',
            `XHR ${this.status}: ${url}`,
            'info',
            {
              method,
              status: this.status,
              duration,
            },
          );
        }
      });

      this.addEventListener('error', function () {
        const url = (this as any)._crashReporterUrl;
        const method = (this as any)._crashReporterMethod;
        window.crashReporter?.addBreadcrumb(
          'network',
          `XHR error: ${url}`,
          'error',
          { method },
        );
      });

      return originalXHRSend.apply(this, args);
    };
  }

  private captureUserInteractions() {
    const interactionEvents = ['click', 'touch', 'keydown', 'scroll'];

    interactionEvents.forEach((eventType) => {
      document.addEventListener(
        eventType,
        (event) => {
          const target = event.target as HTMLElement;
          const tagName = target.tagName?.toLowerCase();
          const id = target.id;
          const className = target.className;

          let description = `${eventType} on ${tagName}`;
          if (id) description += `#${id}`;
          if (className) description += `.${className.split(' ')[0]}`;

          this.addBreadcrumb('interaction', description, 'info', {
            eventType,
            tagName,
            id,
            className: className || undefined,
          });
        },
        { passive: true, capture: true },
      );
    });
  }

  private trackRouteChanges() {
    // Track route changes for SPAs
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      this.previousRoute = window.location.pathname;
      originalPushState.apply(history, args);
      this.addBreadcrumb(
        'navigation',
        `Route changed to: ${window.location.pathname}`,
        'info',
        {
          from: this.previousRoute,
          to: window.location.pathname,
        },
      );
    };

    history.replaceState = (...args) => {
      this.previousRoute = window.location.pathname;
      originalReplaceState.apply(history, args);
      this.addBreadcrumb(
        'navigation',
        `Route replaced to: ${window.location.pathname}`,
        'info',
        {
          to: window.location.pathname,
        },
      );
    };

    // Handle popstate
    window.addEventListener('popstate', () => {
      this.addBreadcrumb(
        'navigation',
        `Route navigated to: ${window.location.pathname}`,
        'info',
        {
          to: window.location.pathname,
        },
      );
    });
  }

  private setupPeriodicReporting() {
    // Send reports every 30 seconds
    setInterval(() => {
      this.sendReports();
    }, 30000);

    // Send reports on page unload
    window.addEventListener('beforeunload', () => {
      this.sendReports();
    });

    // Send reports on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.sendReports();
      }
    });
  }

  private addDeviceContext(report: CrashReport) {
    // Network information
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      report.connectionType = connection.effectiveType;
    }

    // Device memory
    if ('deviceMemory' in navigator) {
      report.deviceMemory = (navigator as any).deviceMemory;
    }

    // Battery information
    if ('getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((battery: any) => {
          report.batteryLevel = Math.round(battery.level * 100);
        })
        .catch(() => {
          // Ignore battery errors
        });
    }

    // Service Worker state
    if ('serviceWorker' in navigator) {
      report.serviceWorkerState = navigator.serviceWorker.controller
        ? 'active'
        : 'inactive';
    }
  }

  public addBreadcrumb(
    category: string,
    message: string,
    level: 'info' | 'warn' | 'error' = 'info',
    data?: Record<string, any>,
  ) {
    this.breadcrumbs.push({
      timestamp: Date.now(),
      category,
      message,
      level,
      data,
    });

    // Limit breadcrumb size
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  public recordCrash(report: CrashReport) {
    console.error('[Crash Reporter] Recording crash:', report);
    this.reports.push(report);

    // Limit reports array size
    if (this.reports.length > 50) {
      this.reports = this.reports.slice(-25);
    }

    // Send immediately for critical errors
    if (report.type === 'javascript' || report.type === 'unhandledRejection') {
      this.sendReports();
    }
  }

  public setUserId(userId: string) {
    this.userId = userId;
    this.addBreadcrumb('system', `User identified: ${userId}`, 'info');
  }

  private async sendReports() {
    if (this.reports.length === 0) return;

    try {
      const reportsToSend = [...this.reports];
      this.reports = [];

      const response = await fetch('/api/analytics/crashes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reports: reportsToSend,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        // Re-add reports on failure
        this.reports.unshift(...reportsToSend.slice(-10));
        throw new Error(`Crash report send failed: ${response.status}`);
      }

      console.log(
        `[Crash Reporter] Sent ${reportsToSend.length} crash reports`,
      );
    } catch (error) {
      console.error('[Crash Reporter] Failed to send reports:', error);
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

  public getCrashReports(): CrashReport[] {
    return [...this.reports];
  }

  public getBreadcrumbs(): CrashReport['breadcrumbs'] {
    return [...this.breadcrumbs];
  }
}

// Global crash reporter instance
let crashReporter: MobileCrashReporter | null = null;

export const initializeCrashReporting = (
  config?: Partial<CrashReportingConfig>,
) => {
  if (typeof window !== 'undefined' && !crashReporter) {
    crashReporter = new MobileCrashReporter(config);
    (window as any).crashReporter = crashReporter;
  }
  return crashReporter;
};

export const getCrashReporter = () => crashReporter;

export const reportManualCrash = (message: string, error?: Error) => {
  if (!crashReporter) return;

  const report: CrashReport = {
    id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type: 'javascript',
    message,
    stack: error?.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    platform: crashReporter['getPlatform'](),
    isStandalone: crashReporter['isStandaloneMode'](),
    sessionId: crashReporter['sessionId'],
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    currentRoute: window.location.pathname,
    breadcrumbs: crashReporter.getBreadcrumbs(),
  };

  crashReporter.recordCrash(report);
};

export const addBreadcrumb = (
  category: string,
  message: string,
  level?: 'info' | 'warn' | 'error',
  data?: Record<string, any>,
) => {
  crashReporter?.addBreadcrumb(category, message, level, data);
};

// Auto-initialize
if (typeof window !== 'undefined') {
  initializeCrashReporting();
}

export default MobileCrashReporter;
