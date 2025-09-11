/**
 * WS-115: Enhanced Marketplace Analytics Events
 * Real-time event tracking for purchase flow optimization
 *
 * Team C - Batch 9 - Round 1
 */

import { createClient } from '@/lib/supabase/client';

// =====================================================================================
// INTERFACES
// =====================================================================================

interface AnalyticsEvent {
  event_type: string;
  template_id?: string;
  user_id?: string;
  session_id: string;
  timestamp: string;
  properties: Record<string, any>;
  context: {
    user_agent: string;
    referrer?: string;
    utm_params?: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
    };
    page_url: string;
    viewport: {
      width: number;
      height: number;
    };
    device_type: 'mobile' | 'tablet' | 'desktop';
  };
}

interface PurchaseFunnelEvent extends AnalyticsEvent {
  purchase_id?: string;
  template_details?: {
    title: string;
    category: string;
    price_cents: number;
    currency: string;
  };
  step?: 'view' | 'interest' | 'checkout' | 'payment' | 'completed';
}

// =====================================================================================
// ANALYTICS SERVICE
// =====================================================================================

export class MarketplaceAnalytics {
  private static sessionId: string;
  private static supabase = createClient();

  // Initialize session
  static initialize() {
    if (typeof window === 'undefined') return;

    this.sessionId = this.getSessionId();
    this.trackPageView();
  }

  // Get or create session ID
  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('marketplace_session_id');

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('marketplace_session_id', sessionId);
    }

    return sessionId;
  }

  // Get device context
  private static getDeviceContext() {
    if (typeof window === 'undefined') {
      return {
        user_agent: 'unknown',
        referrer: undefined,
        page_url: 'unknown',
        viewport: { width: 0, height: 0 },
        device_type: 'desktop' as const,
      };
    }

    const width = window.innerWidth;
    const deviceType =
      width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

    return {
      user_agent: navigator.userAgent,
      referrer: document.referrer || undefined,
      page_url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      device_type: deviceType,
    };
  }

  // Get UTM parameters
  private static getUtmParams() {
    if (typeof window === 'undefined') return undefined;

    const urlParams = new URLSearchParams(window.location.search);
    const utmParams: any = {};

    ['source', 'medium', 'campaign', 'term', 'content'].forEach((param) => {
      const value = urlParams.get(`utm_${param}`);
      if (value) {
        utmParams[param] = value;
      }
    });

    return Object.keys(utmParams).length > 0 ? utmParams : undefined;
  }

  // Track generic event
  static async trackEvent(
    eventType: string,
    properties: Record<string, any> = {},
  ) {
    try {
      const event: AnalyticsEvent = {
        event_type: eventType,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
        properties,
        context: {
          ...this.getDeviceContext(),
          utm_params: this.getUtmParams(),
        },
      };

      await this.supabase.from('marketplace_analytics_events').insert(event);

      // Also send to external analytics if configured
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventType, {
          custom_map: properties,
          session_id: this.sessionId,
        });
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  // Track page view
  static async trackPageView() {
    if (typeof window === 'undefined') return;

    await this.trackEvent('page_view', {
      page_path: window.location.pathname,
      page_title: document.title,
    });
  }

  // Track template view
  static async trackTemplateView(templateId: string, templateData: any) {
    await this.trackEvent('template_view', {
      template_id: templateId,
      template_title: templateData.title,
      template_category: templateData.category,
      template_price: templateData.price_cents,
      view_source: templateData.view_source || 'unknown',
    });
  }

  // Track purchase funnel steps
  static async trackPurchaseFunnel(
    step:
      | 'interest'
      | 'checkout_start'
      | 'payment_info'
      | 'payment_attempt'
      | 'payment_success',
    data: {
      template_id: string;
      template_details: any;
      purchase_id?: string;
      error?: string;
      payment_method?: string;
    },
  ) {
    const event: PurchaseFunnelEvent = {
      event_type: `purchase_${step}`,
      template_id: data.template_id,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      step,
      purchase_id: data.purchase_id,
      template_details: {
        title: data.template_details.title,
        category: data.template_details.category,
        price_cents: data.template_details.price_cents,
        currency: data.template_details.currency,
      },
      properties: {
        error: data.error,
        payment_method: data.payment_method,
        funnel_step: step,
      },
      context: {
        ...this.getDeviceContext(),
        utm_params: this.getUtmParams(),
      },
    };

    try {
      await this.supabase.from('marketplace_purchase_funnel').insert(event);

      // Send to Google Analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'purchase_funnel', {
          step: step,
          template_id: data.template_id,
          value: data.template_details.price_cents / 100,
          currency: data.template_details.currency,
        });
      }
    } catch (error) {
      console.error('Purchase funnel tracking error:', error);
    }
  }

  // Track search behavior
  static async trackSearch(query: string, results: any[], filters: any = {}) {
    await this.trackEvent('marketplace_search', {
      search_query: query,
      results_count: results.length,
      filters_applied: filters,
      search_type: 'marketplace_templates',
    });
  }

  // Track filter usage
  static async trackFilterUsage(filters: any, resultCount: number) {
    await this.trackEvent('filter_applied', {
      filters: filters,
      result_count: resultCount,
      filter_count: Object.keys(filters).length,
    });
  }

  // Track cart actions
  static async trackCartAction(
    action: 'add' | 'remove' | 'clear',
    templateId: string,
    templateData: any,
  ) {
    await this.trackEvent(`cart_${action}`, {
      template_id: templateId,
      template_title: templateData.title,
      template_price: templateData.price_cents,
      cart_action: action,
    });
  }

  // Track user engagement
  static async trackEngagement(
    engagementType: 'scroll' | 'time_on_page' | 'click' | 'hover',
    element: string,
    value?: number,
  ) {
    await this.trackEvent('user_engagement', {
      engagement_type: engagementType,
      element: element,
      value: value,
      timestamp: Date.now(),
    });
  }

  // Track errors
  static async trackError(
    errorType:
      | 'payment_failed'
      | 'api_error'
      | 'validation_error'
      | 'network_error',
    errorMessage: string,
    context: any = {},
  ) {
    await this.trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      error_context: context,
    });
  }

  // Track performance metrics
  static async trackPerformance(metrics: {
    page_load_time?: number;
    api_response_time?: number;
    template_render_time?: number;
  }) {
    await this.trackEvent('performance_metrics', metrics);
  }

  // Track A/B test exposure
  static async trackExperiment(
    experimentName: string,
    variant: string,
    templateId?: string,
  ) {
    await this.trackEvent('experiment_exposure', {
      experiment_name: experimentName,
      variant: variant,
      template_id: templateId,
    });
  }

  // Generate conversion report
  static async generateConversionReport(
    templateId: string,
    dateRange: {
      start: string;
      end: string;
    },
  ) {
    try {
      const { data, error } = await this.supabase.rpc(
        'get_template_conversion_funnel',
        {
          template_id: templateId,
          start_date: dateRange.start,
          end_date: dateRange.end,
        },
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Conversion report error:', error);
      return null;
    }
  }

  // Get real-time metrics
  static async getRealTimeMetrics() {
    try {
      const { data, error } = await this.supabase
        .from('marketplace_analytics_realtime')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Real-time metrics error:', error);
      return [];
    }
  }

  // Track revenue metrics
  static async trackRevenue(data: {
    purchase_id: string;
    template_id: string;
    revenue_cents: number;
    currency: string;
    payment_method: string;
    customer_tier: string;
  }) {
    await this.trackEvent('revenue_generated', {
      purchase_id: data.purchase_id,
      template_id: data.template_id,
      revenue: data.revenue_cents / 100,
      currency: data.currency,
      payment_method: data.payment_method,
      customer_tier: data.customer_tier,
    });

    // Send to Google Analytics Enhanced Ecommerce
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: data.purchase_id,
        value: data.revenue_cents / 100,
        currency: data.currency,
        items: [
          {
            item_id: data.template_id,
            item_name: 'Marketplace Template',
            category: 'Template',
            quantity: 1,
            price: data.revenue_cents / 100,
          },
        ],
      });
    }
  }

  // Batch track multiple events (for performance)
  static async trackEventsBatch(events: Partial<AnalyticsEvent>[]) {
    try {
      const processedEvents = events.map((event) => ({
        ...event,
        session_id: this.sessionId,
        timestamp: event.timestamp || new Date().toISOString(),
        context: {
          ...this.getDeviceContext(),
          utm_params: this.getUtmParams(),
          ...event.context,
        },
      }));

      await this.supabase
        .from('marketplace_analytics_events')
        .insert(processedEvents);
    } catch (error) {
      console.error('Batch analytics tracking error:', error);
    }
  }
}

// Hook for React components
export const useMarketplaceAnalytics = () => {
  const trackTemplateView = (templateId: string, templateData: any) => {
    MarketplaceAnalytics.trackTemplateView(templateId, templateData);
  };

  const trackPurchaseStep = (step: any, data: any) => {
    MarketplaceAnalytics.trackPurchaseFunnel(step, data);
  };

  const trackSearch = (query: string, results: any[], filters?: any) => {
    MarketplaceAnalytics.trackSearch(query, results, filters);
  };

  const trackError = (type: any, message: string, context?: any) => {
    MarketplaceAnalytics.trackError(type, message, context);
  };

  return {
    trackTemplateView,
    trackPurchaseStep,
    trackSearch,
    trackError,
  };
};

// Auto-initialize on client side
if (typeof window !== 'undefined') {
  MarketplaceAnalytics.initialize();
}

export default MarketplaceAnalytics;
