interface UserJourneyStep {
  timestamp: number;
  page: string;
  action: string;
  element?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

interface MobileAnalyticsEvent {
  eventName: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  platform: 'ios' | 'android' | 'desktop';
  isStandalone: boolean;

  // Page context
  page: string;
  referrer?: string;

  // User journey context
  journeyStep: number;
  timeOnPage: number;

  // Device context
  deviceType: string;
  screenResolution: string;
  networkCondition?: string;
  batteryLevel?: number;

  // App context
  serviceWorkerState: 'active' | 'inactive' | 'installing';
  isOffline: boolean;
  cacheHitRate?: number;

  // Event-specific data
  eventData?: Record<string, any>;
}

interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  lastActivity: number;
  platform: string;
  deviceType: string;
  isStandalone: boolean;

  // Journey tracking
  journeySteps: UserJourneyStep[];
  currentPage: string;
  pageStartTime: number;

  // Engagement metrics
  totalPageViews: number;
  totalTimeSpent: number;
  totalInteractions: number;
  bounceRate: number;

  // Conversion tracking
  conversionEvents: string[];
  funnelStep: number;

  // Performance context
  averageLoadTime: number;
  errorCount: number;
}

class MobileAnalyticsTracker {
  private session: UserSession;
  private eventQueue: MobileAnalyticsEvent[] = [];
  private journeySteps: UserJourneyStep[] = [];
  private pageStartTime: number = Date.now();
  private lastInteractionTime: number = Date.now();
  private isOnline: boolean = navigator.onLine;

  // Conversion funnel definition
  private conversionFunnel = [
    'landing',
    'signup_start',
    'signup_complete',
    'timeline_created',
    'vendor_contacted',
    'first_task_completed',
  ];

  constructor() {
    this.session = this.initializeSession();
    this.setupEventListeners();
    this.startJourneyTracking();
  }

  private initializeSession(): UserSession {
    const sessionId = this.getOrCreateSessionId();
    const existingSession = this.loadSession(sessionId);

    if (
      existingSession &&
      Date.now() - existingSession.lastActivity < 30 * 60 * 1000
    ) {
      // Resume existing session if less than 30 minutes old
      existingSession.lastActivity = Date.now();
      return existingSession;
    }

    // Create new session
    const newSession: UserSession = {
      sessionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      platform: this.getPlatform(),
      deviceType: this.getDeviceType(),
      isStandalone: this.isStandaloneMode(),

      journeySteps: [],
      currentPage: window.location.pathname,
      pageStartTime: Date.now(),

      totalPageViews: 1,
      totalTimeSpent: 0,
      totalInteractions: 0,
      bounceRate: 0,

      conversionEvents: [],
      funnelStep: 0,

      averageLoadTime: 0,
      errorCount: 0,
    };

    this.saveSession(newSession);
    this.trackEvent('session_start');

    return newSession;
  }

  private setupEventListeners() {
    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_hidden', {
          timeOnPage: Date.now() - this.pageStartTime,
        });
      } else {
        this.trackEvent('page_visible');
        this.pageStartTime = Date.now();
      }
    });

    // User interactions
    const interactionEvents = ['click', 'touch', 'keydown', 'scroll'];
    interactionEvents.forEach((eventType) => {
      document.addEventListener(
        eventType,
        (event) => {
          this.trackUserInteraction(eventType, event);
        },
        { passive: true, capture: true },
      );
    });

    // Network status changes
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.trackEvent('connection_restored');
      this.syncQueuedEvents();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.trackEvent('connection_lost');
    });

    // Form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.trackEvent('form_submission', {
        formId: form.id,
        formName: form.name,
        formAction: form.action,
        fieldCount: form.elements.length,
      });
    });

    // Errors
    window.addEventListener('error', (event) => {
      this.session.errorCount++;
      this.trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
      });
    });

    // Page unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent('session_end', {
        sessionDuration: Date.now() - this.session.startTime,
        totalPageViews: this.session.totalPageViews,
        totalInteractions: this.session.totalInteractions,
      });
      this.syncQueuedEvents();
    });

    // Route changes (for SPAs)
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      this.trackPageChange();
      originalPushState.apply(history, args);
    };

    window.addEventListener('popstate', () => {
      this.trackPageChange();
    });
  }

  private trackUserInteraction(eventType: string, event: Event) {
    this.session.totalInteractions++;
    this.session.lastActivity = Date.now();
    this.lastInteractionTime = Date.now();

    const target = event.target as HTMLElement;
    const elementData = this.getElementData(target);

    // Add to journey
    this.addJourneyStep({
      timestamp: Date.now(),
      page: this.session.currentPage,
      action: eventType,
      element: elementData.selector,
      metadata: {
        ...elementData,
        eventType,
      },
    });

    // Track significant interactions
    if (this.isSignificantInteraction(eventType, target)) {
      this.trackEvent('user_interaction', {
        interactionType: eventType,
        element: elementData,
        pageTimeBeforeInteraction: Date.now() - this.pageStartTime,
      });
    }
  }

  private isSignificantInteraction(
    eventType: string,
    target: HTMLElement,
  ): boolean {
    const tagName = target.tagName.toLowerCase();
    const isButton =
      tagName === 'button' || target.getAttribute('role') === 'button';
    const isLink = tagName === 'a';
    const isFormElement = ['input', 'select', 'textarea'].includes(tagName);

    return (
      (eventType === 'click' && (isButton || isLink)) ||
      (eventType === 'keydown' && isFormElement) ||
      (eventType === 'touch' && (isButton || isLink))
    );
  }

  private getElementData(element: HTMLElement) {
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.className || undefined,
      text: element.textContent?.trim().slice(0, 100) || undefined,
      selector: this.generateSelector(element),
    };
  }

  private generateSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    if (element.className) {
      const classes = element.className.split(' ').filter(Boolean).slice(0, 2);
      return `.${classes.join('.')}`;
    }

    return element.tagName.toLowerCase();
  }

  private trackPageChange() {
    // Record time spent on previous page
    const timeOnPage = Date.now() - this.pageStartTime;

    this.trackEvent('page_view', {
      previousPage: this.session.currentPage,
      timeOnPreviousPage: timeOnPage,
    });

    // Update session
    this.session.currentPage = window.location.pathname;
    this.session.totalPageViews++;
    this.session.totalTimeSpent += timeOnPage;
    this.pageStartTime = Date.now();

    // Add to journey
    this.addJourneyStep({
      timestamp: Date.now(),
      page: this.session.currentPage,
      action: 'page_navigation',
      duration: timeOnPage,
    });

    this.saveSession(this.session);
  }

  private addJourneyStep(step: UserJourneyStep) {
    this.journeySteps.push(step);
    this.session.journeySteps.push(step);

    // Limit journey steps to prevent memory issues
    if (this.journeySteps.length > 100) {
      this.journeySteps = this.journeySteps.slice(-50);
      this.session.journeySteps = this.session.journeySteps.slice(-50);
    }
  }

  private startJourneyTracking() {
    // Track initial page view
    this.trackEvent('page_view', {
      isInitialLoad: true,
      referrer: document.referrer,
    });

    // Periodic journey sync
    setInterval(() => {
      this.syncJourneyData();
    }, 30000); // Every 30 seconds
  }

  public trackEvent(eventName: string, eventData?: Record<string, any>) {
    const event: MobileAnalyticsEvent = {
      eventName,
      timestamp: Date.now(),
      sessionId: this.session.sessionId,
      userId: this.session.userId,
      platform: this.session.platform as any,
      isStandalone: this.session.isStandalone,

      page: this.session.currentPage,
      referrer: document.referrer,

      journeyStep: this.journeySteps.length,
      timeOnPage: Date.now() - this.pageStartTime,

      deviceType: this.session.deviceType,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      networkCondition: this.getNetworkCondition(),
      batteryLevel: this.getBatteryLevel(),

      serviceWorkerState: this.getServiceWorkerState(),
      isOffline: !this.isOnline,

      eventData: eventData,
    };

    this.eventQueue.push(event);

    // Check for conversion events
    this.checkConversionEvent(eventName, eventData);

    // Send events immediately if online, otherwise queue
    if (this.isOnline) {
      this.syncQueuedEvents();
    }
  }

  private checkConversionEvent(
    eventName: string,
    eventData?: Record<string, any>,
  ) {
    // Map events to funnel steps
    const funnelMapping: Record<string, string> = {
      page_view: 'landing',
      signup_start: 'signup_start',
      user_registered: 'signup_complete',
      timeline_created: 'timeline_created',
      vendor_message_sent: 'vendor_contacted',
      task_completed: 'first_task_completed',
    };

    const funnelStep = funnelMapping[eventName];
    if (funnelStep && !this.session.conversionEvents.includes(funnelStep)) {
      this.session.conversionEvents.push(funnelStep);

      const stepIndex = this.conversionFunnel.indexOf(funnelStep);
      if (stepIndex > this.session.funnelStep) {
        this.session.funnelStep = stepIndex;

        this.trackEvent('conversion_step', {
          funnelStep: funnelStep,
          stepIndex: stepIndex,
          timeToConversion: Date.now() - this.session.startTime,
        });
      }
    }
  }

  private async syncQueuedEvents() {
    if (this.eventQueue.length === 0) return;

    try {
      const events = [...this.eventQueue];
      this.eventQueue = [];

      const response = await fetch('/api/analytics/mobile-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events,
          session: this.session,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        // Re-queue events on failure
        this.eventQueue.unshift(...events);
        throw new Error(`Analytics sync failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[Mobile Analytics] Failed to sync events:', error);

      // Limit queue size
      if (this.eventQueue.length > 100) {
        this.eventQueue = this.eventQueue.slice(-50);
      }
    }
  }

  private syncJourneyData() {
    this.session.totalTimeSpent = Date.now() - this.session.startTime;
    this.session.lastActivity = this.lastInteractionTime;

    // Calculate bounce rate
    if (
      this.session.totalPageViews === 1 &&
      this.session.totalInteractions < 3
    ) {
      this.session.bounceRate = 1;
    } else {
      this.session.bounceRate = 0;
    }

    this.saveSession(this.session);
  }

  // Utility methods
  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('mobile_analytics_session');
    if (!sessionId) {
      sessionId = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('mobile_analytics_session', sessionId);
    }
    return sessionId;
  }

  private loadSession(sessionId: string): UserSession | null {
    try {
      const saved = localStorage.getItem(`mobile_session_${sessionId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  private saveSession(session: UserSession) {
    try {
      localStorage.setItem(
        `mobile_session_${session.sessionId}`,
        JSON.stringify(session),
      );
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  private getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    return 'desktop';
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipod/.test(userAgent)) return 'iphone';
    if (/ipad/.test(userAgent)) return 'ipad';
    if (/android.*mobile/.test(userAgent)) return 'android-phone';
    if (/android/.test(userAgent)) return 'android-tablet';
    return 'desktop';
  }

  private isStandaloneMode(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as any).standalone)
    );
  }

  private getNetworkCondition(): string | undefined {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType;
    }
    return undefined;
  }

  private getBatteryLevel(): number | undefined {
    // Battery API is deprecated, but we can try to get it
    return undefined;
  }

  private getServiceWorkerState(): 'active' | 'inactive' | 'installing' {
    if (!('serviceWorker' in navigator)) return 'inactive';

    if (navigator.serviceWorker.controller) {
      return navigator.serviceWorker.controller.state === 'activated'
        ? 'active'
        : 'installing';
    }

    return 'inactive';
  }

  // Public API
  public setUserId(userId: string) {
    this.session.userId = userId;
    this.saveSession(this.session);

    this.trackEvent('user_identified', {
      userId,
      sessionDuration: Date.now() - this.session.startTime,
    });
  }

  public trackCustomEvent(eventName: string, eventData?: Record<string, any>) {
    this.trackEvent(`custom_${eventName}`, eventData);
  }

  public trackConversion(conversionType: string, value?: number) {
    this.trackEvent('conversion', {
      conversionType,
      value,
      funnelStep: this.session.funnelStep,
      sessionDuration: Date.now() - this.session.startTime,
    });
  }

  public getSessionData(): UserSession {
    return { ...this.session };
  }

  public getJourneySteps(): UserJourneyStep[] {
    return [...this.journeySteps];
  }

  public getFunnelProgress(): {
    step: string;
    index: number;
    completedSteps: string[];
  } {
    return {
      step: this.conversionFunnel[this.session.funnelStep] || 'landing',
      index: this.session.funnelStep,
      completedSteps: this.session.conversionEvents,
    };
  }
}

// Global analytics tracker instance
let mobileAnalytics: MobileAnalyticsTracker | null = null;

export const initializeMobileAnalytics = () => {
  if (typeof window !== 'undefined' && !mobileAnalytics) {
    mobileAnalytics = new MobileAnalyticsTracker();
    (window as any).mobileAnalytics = mobileAnalytics;
  }
  return mobileAnalytics;
};

export const getMobileAnalytics = () => mobileAnalytics;

export const trackMobileEvent = (
  eventName: string,
  eventData?: Record<string, any>,
) => {
  mobileAnalytics?.trackEvent(eventName, eventData);
};

export const trackCustomEvent = (
  eventName: string,
  eventData?: Record<string, any>,
) => {
  mobileAnalytics?.trackCustomEvent(eventName, eventData);
};

export const trackConversion = (conversionType: string, value?: number) => {
  mobileAnalytics?.trackConversion(conversionType, value);
};

export const setAnalyticsUserId = (userId: string) => {
  mobileAnalytics?.setUserId(userId);
};

export const getSessionData = () => {
  return mobileAnalytics?.getSessionData();
};

export const getJourneySteps = () => {
  return mobileAnalytics?.getJourneySteps() || [];
};

export const getFunnelProgress = () => {
  return mobileAnalytics?.getFunnelProgress();
};

// Auto-initialize
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    initializeMobileAnalytics();
  } else {
    window.addEventListener('load', initializeMobileAnalytics);
  }
}

export default MobileAnalyticsTracker;
