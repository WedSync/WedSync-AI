import {
  analytics,
  AnalyticsEvents,
  WeddingContext,
  EventProperties,
} from './providers';

// =============================================
// EVENT TRACKING UTILITIES
// =============================================

export interface TrackEventOptions {
  weddingContext?: WeddingContext;
  properties?: EventProperties;
  skipLocalStorage?: boolean;
}

export interface UserInteractionEvent {
  element: string;
  action:
    | 'click'
    | 'hover'
    | 'focus'
    | 'scroll'
    | 'form_submit'
    | 'form_abandon';
  page: string;
  section?: string;
  category?: string;
  value?: number;
}

export interface FormInteractionEvent {
  formId: string;
  formName: string;
  fieldName?: string;
  fieldType?: string;
  action: 'start' | 'progress' | 'complete' | 'abandon' | 'error';
  completionPercentage?: number;
  timeSpent?: number;
  errorMessage?: string;
}

export interface FeatureUsageEvent {
  feature: string;
  action:
    | 'discovered'
    | 'first_use'
    | 'regular_use'
    | 'power_use'
    | 'abandoned';
  usageCount?: number;
  sessionDuration?: number;
  context?: Record<string, any>;
}

export interface BusinessMetricEvent {
  metric:
    | 'lead_generated'
    | 'consultation_booked'
    | 'proposal_sent'
    | 'contract_signed'
    | 'payment_received'
    | 'referral_given';
  value?: number;
  currency?: string;
  source?: string;
  conversionStep?: number;
  timeToConvert?: number;
}

export interface ErrorEvent {
  errorType: 'javascript' | 'network' | 'validation' | 'api' | 'auth';
  errorMessage: string;
  stackTrace?: string;
  errorBoundary?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// =============================================
// EVENT TRACKING CLASS
// =============================================

export class EventTracker {
  private static instance: EventTracker;
  private pageLoadTime: number;
  private sessionStartTime: number;
  private currentPage: string;
  private interactions: UserInteractionEvent[] = [];

  constructor() {
    this.pageLoadTime = Date.now();
    this.sessionStartTime = Date.now();
    this.currentPage =
      typeof window !== 'undefined' ? window.location.pathname : '';

    if (typeof window !== 'undefined') {
      this.setupAutoTracking();
    }
  }

  static getInstance(): EventTracker {
    if (!EventTracker.instance) {
      EventTracker.instance = new EventTracker();
    }
    return EventTracker.instance;
  }

  // =============================================
  // USER INTERACTION TRACKING
  // =============================================

  trackUserInteraction(
    event: UserInteractionEvent,
    options?: TrackEventOptions,
  ): void {
    this.interactions.push(event);

    const properties = {
      element: event.element,
      action: event.action,
      page: event.page,
      section: event.section,
      category: event.category || 'user_interaction',
      value: event.value,
      session_duration: Date.now() - this.sessionStartTime,
      page_duration: Date.now() - this.pageLoadTime,
      interaction_sequence: this.interactions.length,
      ...options?.properties,
    };

    analytics.trackEvent(
      'user_interaction',
      properties,
      options?.weddingContext,
    );
  }

  trackClick(
    element: string,
    page?: string,
    additionalData?: Record<string, any>,
  ): void {
    this.trackUserInteraction({
      element,
      action: 'click',
      page: page || this.currentPage,
      ...additionalData,
    });
  }

  trackFormInteraction(
    event: FormInteractionEvent,
    options?: TrackEventOptions,
  ): void {
    const eventName = `form_${event.action}`;
    const properties = {
      form_id: event.formId,
      form_name: event.formName,
      field_name: event.fieldName,
      field_type: event.fieldType,
      completion_percentage: event.completionPercentage,
      time_spent: event.timeSpent,
      error_message: event.errorMessage,
      ...options?.properties,
    };

    analytics.trackEvent(eventName, properties, options?.weddingContext);
  }

  // =============================================
  // FEATURE USAGE TRACKING
  // =============================================

  trackFeatureUsage(
    event: FeatureUsageEvent,
    options?: TrackEventOptions,
  ): void {
    const eventName = `feature_${event.action}`;
    const properties = {
      feature: event.feature,
      usage_count: event.usageCount,
      session_duration: event.sessionDuration,
      context: event.context,
      ...options?.properties,
    };

    analytics.trackEvent(eventName, properties, options?.weddingContext);

    // Update feature adoption tracking
    this.updateFeatureAdoption(event.feature, event.action);
  }

  trackFeatureDiscovery(
    feature: string,
    discoveryMethod: 'navigation' | 'search' | 'tutorial' | 'tooltip',
  ): void {
    this.trackFeatureUsage({
      feature,
      action: 'discovered',
      context: { discovery_method: discoveryMethod },
    });
  }

  trackFeatureFirstUse(feature: string, timeToFirstUse?: number): void {
    this.trackFeatureUsage({
      feature,
      action: 'first_use',
      context: { time_to_first_use: timeToFirstUse },
    });
  }

  // =============================================
  // BUSINESS METRICS TRACKING
  // =============================================

  trackBusinessMetric(
    event: BusinessMetricEvent,
    options?: TrackEventOptions,
  ): void {
    const properties = {
      metric: event.metric,
      value: event.value,
      currency: event.currency || 'USD',
      source: event.source,
      conversion_step: event.conversionStep,
      time_to_convert: event.timeToConvert,
      ...options?.properties,
    };

    analytics.trackEvent(
      'business_metric',
      properties,
      options?.weddingContext,
    );
  }

  trackRevenue(amount: number, source: string, clientId?: string): void {
    this.trackBusinessMetric(
      {
        metric: 'payment_received',
        value: amount,
        source,
        conversionStep: this.calculateConversionStep(),
      },
      {
        properties: { client_id: clientId },
        weddingContext: clientId ? { clientId } : undefined,
      },
    );
  }

  trackLead(source: string, quality: 'high' | 'medium' | 'low'): void {
    this.trackBusinessMetric({
      metric: 'lead_generated',
      source,
      value: this.getLeadValue(quality),
    });
  }

  // =============================================
  // ERROR TRACKING
  // =============================================

  trackError(error: ErrorEvent): void {
    const properties = {
      error_type: error.errorType,
      error_message: error.errorMessage,
      stack_trace: error.stackTrace,
      error_boundary: error.errorBoundary,
      user_agent:
        error.userAgent ||
        (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      url:
        error.url ||
        (typeof window !== 'undefined' ? window.location.href : ''),
      user_id: error.userId,
      severity: error.severity,
      session_duration: Date.now() - this.sessionStartTime,
    };

    analytics.trackEvent('error_occurred', properties);
  }

  trackJavaScriptError(error: Error, errorBoundary?: string): void {
    this.trackError({
      errorType: 'javascript',
      errorMessage: error.message,
      stackTrace: error.stack,
      errorBoundary,
      severity: 'medium',
    });
  }

  trackNetworkError(url: string, status: number, message: string): void {
    this.trackError({
      errorType: 'network',
      errorMessage: `${status}: ${message}`,
      url,
      severity: status >= 500 ? 'high' : 'medium',
    });
  }

  // =============================================
  // JOURNEY & FUNNEL TRACKING
  // =============================================

  trackOnboardingStep(
    step: string,
    completed: boolean,
    timeSpent?: number,
  ): void {
    const properties = {
      step,
      completed,
      time_spent: timeSpent,
      funnel: 'onboarding',
    };

    analytics.trackEvent('funnel_step', properties);
  }

  trackConversionFunnel(
    funnelName: string,
    step: string,
    stepNumber: number,
    completed: boolean,
  ): void {
    const properties = {
      funnel: funnelName,
      step,
      step_number: stepNumber,
      completed,
      session_duration: Date.now() - this.sessionStartTime,
    };

    analytics.trackEvent('conversion_funnel', properties);
  }

  // =============================================
  // SEARCH & NAVIGATION TRACKING
  // =============================================

  trackSearch(
    query: string,
    results: number,
    filters?: Record<string, any>,
  ): void {
    const properties = {
      query,
      results_count: results,
      has_results: results > 0,
      filters,
      search_method: 'manual',
    };

    analytics.trackEvent('search_performed', properties);
  }

  trackNavigation(
    from: string,
    to: string,
    method: 'link' | 'button' | 'breadcrumb' | 'menu',
  ): void {
    const properties = {
      from_page: from,
      to_page: to,
      navigation_method: method,
      session_page_count:
        this.interactions.filter((i) => i.action === 'click').length + 1,
    };

    analytics.trackEvent('navigation', properties);
    this.currentPage = to;
    this.pageLoadTime = Date.now();
  }

  // =============================================
  // PERFORMANCE TRACKING
  // =============================================

  trackPageLoad(loadTime: number, pageSize?: number): void {
    const properties = {
      load_time: loadTime,
      page_size: pageSize,
      page: this.currentPage,
      connection_type: this.getConnectionType(),
      device_type: this.getDeviceType(),
    };

    analytics.trackEvent('page_load', properties);
  }

  trackApiCall(
    endpoint: string,
    method: string,
    responseTime: number,
    status: number,
  ): void {
    const properties = {
      endpoint,
      method,
      response_time: responseTime,
      status,
      success: status >= 200 && status < 300,
    };

    analytics.trackEvent('api_call', properties);
  }

  // =============================================
  // WEDDING-SPECIFIC TRACKING
  // =============================================

  trackWeddingPlanningProgress(
    clientId: string,
    weddingDate: string,
    progress: number,
    category: string,
  ): void {
    const daysUntilWedding = Math.ceil(
      (new Date(weddingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const properties = {
      client_id: clientId,
      progress_percentage: progress,
      category,
      planning_efficiency: this.calculatePlanningEfficiency(
        progress,
        daysUntilWedding,
      ),
    };

    analytics.trackEvent('wedding_progress', properties, {
      clientId,
      weddingDate,
      daysUntilWedding,
      urgency: this.calculateUrgency(daysUntilWedding),
    });
  }

  trackVendorInteraction(
    vendorId: string,
    vendorType: string,
    action: 'contacted' | 'booked' | 'paid' | 'reviewed',
  ): void {
    const properties = {
      vendor_id: vendorId,
      vendor_type: vendorType,
      action,
    };

    analytics.trackEvent('vendor_interaction', properties, {
      vendorType,
    });
  }

  // =============================================
  // PRIVATE HELPER METHODS
  // =============================================

  private setupAutoTracking(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      analytics.trackEvent('page_visibility_change', {
        hidden: document.hidden,
        visibility_state: document.visibilityState,
      });
    });

    // Track unload
    window.addEventListener('beforeunload', () => {
      analytics.trackEvent('page_unload', {
        session_duration: Date.now() - this.sessionStartTime,
        page_duration: Date.now() - this.pageLoadTime,
        interactions_count: this.interactions.length,
      });
    });

    // Track errors automatically
    window.addEventListener('error', (event) => {
      this.trackJavaScriptError(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        errorType: 'javascript',
        errorMessage: `Unhandled Promise Rejection: ${event.reason}`,
        severity: 'high',
      });
    });
  }

  private updateFeatureAdoption(feature: string, action: string): void {
    // Store feature usage data locally
    const key = `feature_usage_${feature}`;
    const usage = JSON.parse(
      localStorage.getItem(key) ||
        '{"count": 0, "firstUsed": null, "lastUsed": null}',
    );

    usage.count++;
    usage.lastUsed = new Date().toISOString();

    if (!usage.firstUsed || action === 'first_use') {
      usage.firstUsed = new Date().toISOString();
    }

    localStorage.setItem(key, JSON.stringify(usage));
  }

  private calculateConversionStep(): number {
    // Simple heuristic based on session interactions
    const interactionCount = this.interactions.length;
    if (interactionCount < 5) return 1;
    if (interactionCount < 15) return 2;
    if (interactionCount < 30) return 3;
    return 4;
  }

  private getLeadValue(quality: 'high' | 'medium' | 'low'): number {
    // Assign monetary value to leads based on quality
    switch (quality) {
      case 'high':
        return 500;
      case 'medium':
        return 200;
      case 'low':
        return 50;
      default:
        return 100;
    }
  }

  private calculatePlanningEfficiency(
    progress: number,
    daysUntilWedding: number,
  ): number {
    // Calculate how efficiently the couple is planning
    const expectedProgress = Math.max(0, 100 - (daysUntilWedding / 365) * 100);
    return progress - expectedProgress;
  }

  private calculateUrgency(
    daysUntilWedding: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (daysUntilWedding <= 7) return 'critical';
    if (daysUntilWedding <= 30) return 'high';
    if (daysUntilWedding <= 90) return 'medium';
    return 'low';
  }

  private getConnectionType(): string {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      return (navigator as any).connection?.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private getDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';

    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
}

// =============================================
// EXPORTED UTILITY FUNCTIONS
// =============================================

export const eventTracker = EventTracker.getInstance();

// Convenience functions for common tracking scenarios
export function trackClick(
  element: string,
  additionalData?: Record<string, any>,
): void {
  eventTracker.trackClick(element, undefined, additionalData);
}

export function trackFormStart(formId: string, formName: string): void {
  eventTracker.trackFormInteraction({
    formId,
    formName,
    action: 'start',
  });
}

export function trackFormComplete(
  formId: string,
  formName: string,
  timeSpent: number,
): void {
  eventTracker.trackFormInteraction({
    formId,
    formName,
    action: 'complete',
    timeSpent,
    completionPercentage: 100,
  });
}

export function trackFeatureDiscovery(
  feature: string,
  method: 'navigation' | 'search' | 'tutorial' | 'tooltip',
): void {
  eventTracker.trackFeatureDiscovery(feature, method);
}

export function trackError(error: Error): void {
  eventTracker.trackJavaScriptError(error);
}

export function trackRevenue(amount: number, source: string): void {
  eventTracker.trackRevenue(amount, source);
}

export function trackSearch(query: string, resultCount: number): void {
  eventTracker.trackSearch(query, resultCount);
}

// =============================================
// REACT HOOKS INTEGRATION
// =============================================

export function useAnalyticsTracking() {
  const trackPageView = (title?: string) => {
    if (typeof window !== 'undefined') {
      analytics.trackPageView(window.location.href, title);
    }
  };

  const trackEvent = (
    eventName: string,
    properties?: EventProperties,
    weddingContext?: WeddingContext,
  ) => {
    analytics.trackEvent(eventName, properties, weddingContext);
  };

  const trackUserAction = (
    action: string,
    element: string,
    additionalData?: Record<string, any>,
  ) => {
    eventTracker.trackClick(element, additionalData);
  };

  return {
    trackPageView,
    trackEvent,
    trackUserAction,
    trackFeatureUsage: eventTracker.trackFeatureUsage.bind(eventTracker),
    trackBusinessMetric: eventTracker.trackBusinessMetric.bind(eventTracker),
    trackError: eventTracker.trackJavaScriptError.bind(eventTracker),
  };
}
