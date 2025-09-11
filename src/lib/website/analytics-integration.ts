import { createClient } from '@/lib/supabase/client';

export interface AnalyticsEvent {
  event_name: string;
  website_id: string;
  page_url: string;
  user_agent?: string;
  referrer?: string;
  session_id: string;
  properties?: Record<string, any>;
  timestamp: string;
}

export interface PageView {
  id: string;
  website_id: string;
  page_url: string;
  page_title: string;
  referrer?: string;
  user_agent?: string;
  ip_address?: string;
  session_id: string;
  viewed_at: string;
}

export interface ConversionEvent {
  id: string;
  website_id: string;
  event_type:
    | 'rsvp_submitted'
    | 'registry_clicked'
    | 'photo_shared'
    | 'contact_form';
  session_id: string;
  page_url: string;
  properties?: Record<string, any>;
  converted_at: string;
}

export interface AnalyticsMetrics {
  total_views: number;
  unique_visitors: number;
  average_session_duration: number;
  bounce_rate: number;
  conversion_rate: number;
  top_pages: Array<{ page: string; views: number }>;
  referrer_sources: Array<{ source: string; visitors: number }>;
  device_breakdown: Array<{ device: string; percentage: number }>;
  daily_views: Array<{ date: string; views: number; visitors: number }>;
}

export class WeddingAnalytics {
  private supabase = createClient();
  private websiteId: string;
  private sessionId: string;
  private gtag?: Function;

  constructor(websiteId: string) {
    this.websiteId = websiteId;
    this.sessionId = this.generateSessionId();
    this.initializeGoogleAnalytics();
  }

  /**
   * Initialize Google Analytics if GA_MEASUREMENT_ID is provided
   */
  private initializeGoogleAnalytics(): void {
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

    if (measurementId && typeof window !== 'undefined') {
      // Load Google Analytics script
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      script.async = true;
      document.head.appendChild(script);

      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      this.gtag = function gtag() {
        window.dataLayer?.push(arguments);
      };

      this.gtag('js', new Date());
      this.gtag('config', measurementId, {
        custom_map: {
          custom_parameter_1: 'website_id',
        },
      });

      // Set website_id as custom parameter
      this.gtag('config', measurementId, {
        website_id: this.websiteId,
      });
    }
  }

  /**
   * Track page view
   */
  async trackPageView(pageUrl: string, pageTitle: string): Promise<void> {
    try {
      // Track in Google Analytics
      if (this.gtag) {
        this.gtag('event', 'page_view', {
          page_title: pageTitle,
          page_location: pageUrl,
          custom_parameter_1: this.websiteId,
        });
      }

      // Track in our database
      const pageView: Omit<PageView, 'id'> = {
        website_id: this.websiteId,
        page_url: pageUrl,
        page_title: pageTitle,
        referrer: document.referrer || undefined,
        user_agent: navigator.userAgent,
        session_id: this.sessionId,
        viewed_at: new Date().toISOString(),
      };

      await this.supabase.from('analytics_page_views').insert(pageView);
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }

  /**
   * Track custom event
   */
  async trackEvent(
    eventName: string,
    properties?: Record<string, any>,
    pageUrl?: string,
  ): Promise<void> {
    try {
      // Track in Google Analytics
      if (this.gtag) {
        this.gtag('event', eventName, {
          ...properties,
          custom_parameter_1: this.websiteId,
        });
      }

      // Track in our database
      const event: Omit<AnalyticsEvent, 'id'> = {
        event_name: eventName,
        website_id: this.websiteId,
        page_url: pageUrl || window.location.href,
        user_agent: navigator.userAgent,
        referrer: document.referrer || undefined,
        session_id: this.sessionId,
        properties,
        timestamp: new Date().toISOString(),
      };

      await this.supabase.from('analytics_events').insert(event);
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  /**
   * Track conversion events (RSVP, registry clicks, etc.)
   */
  async trackConversion(
    eventType: ConversionEvent['event_type'],
    properties?: Record<string, any>,
  ): Promise<void> {
    try {
      // Track in Google Analytics as conversion
      if (this.gtag) {
        this.gtag('event', 'conversion', {
          send_to: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
          event_category: 'wedding_website',
          event_label: eventType,
          value: 1,
          custom_parameter_1: this.websiteId,
        });
      }

      // Track in our database
      const conversion: Omit<ConversionEvent, 'id'> = {
        website_id: this.websiteId,
        event_type: eventType,
        session_id: this.sessionId,
        page_url: window.location.href,
        properties,
        converted_at: new Date().toISOString(),
      };

      await this.supabase.from('analytics_conversions').insert(conversion);

      // Also track as regular event
      await this.trackEvent(`conversion_${eventType}`, properties);
    } catch (error) {
      console.error('Error tracking conversion:', error);
    }
  }

  /**
   * Track RSVP submission
   */
  async trackRSVPSubmission(rsvpData: {
    attending: boolean;
    guest_count: number;
    dietary_restrictions?: string;
  }): Promise<void> {
    await this.trackConversion('rsvp_submitted', rsvpData);
  }

  /**
   * Track registry link clicks
   */
  async trackRegistryClick(registryStore: string): Promise<void> {
    await this.trackConversion('registry_clicked', { store: registryStore });
  }

  /**
   * Track photo sharing
   */
  async trackPhotoShare(platform: string, photoId: string): Promise<void> {
    await this.trackConversion('photo_shared', {
      platform,
      photo_id: photoId,
    });
  }

  /**
   * Track contact form submissions
   */
  async trackContactForm(formType: string): Promise<void> {
    await this.trackConversion('contact_form', { form_type: formType });
  }

  /**
   * Get analytics metrics for website owner
   */
  async getAnalyticsMetrics(
    startDate: string,
    endDate: string,
  ): Promise<AnalyticsMetrics> {
    try {
      const { data: pageViews } = await this.supabase
        .from('analytics_page_views')
        .select('*')
        .eq('website_id', this.websiteId)
        .gte('viewed_at', startDate)
        .lte('viewed_at', endDate);

      const { data: conversions } = await this.supabase
        .from('analytics_conversions')
        .select('*')
        .eq('website_id', this.websiteId)
        .gte('converted_at', startDate)
        .lte('converted_at', endDate);

      return this.calculateMetrics(pageViews || [], conversions || []);
    } catch (error) {
      console.error('Error getting analytics metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate analytics metrics from raw data
   */
  private calculateMetrics(
    pageViews: PageView[],
    conversions: ConversionEvent[],
  ): AnalyticsMetrics {
    const uniqueVisitors = new Set(pageViews.map((pv) => pv.session_id)).size;
    const totalViews = pageViews.length;

    // Calculate bounce rate (sessions with only 1 page view)
    const sessionPageCounts = pageViews.reduce(
      (acc, pv) => {
        acc[pv.session_id] = (acc[pv.session_id] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const singlePageSessions = Object.values(sessionPageCounts).filter(
      (count) => count === 1,
    ).length;
    const bounceRate =
      uniqueVisitors > 0 ? (singlePageSessions / uniqueVisitors) * 100 : 0;

    // Calculate conversion rate
    const conversionRate =
      totalViews > 0 ? (conversions.length / totalViews) * 100 : 0;

    // Top pages
    const pageCounts = pageViews.reduce(
      (acc, pv) => {
        acc[pv.page_url] = (acc[pv.page_url] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topPages = Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }));

    // Referrer sources
    const referrerCounts = pageViews.reduce(
      (acc, pv) => {
        const source = this.extractReferrerSource(pv.referrer);
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const referrerSources = Object.entries(referrerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([source, visitors]) => ({ source, visitors }));

    // Device breakdown
    const deviceCounts = pageViews.reduce(
      (acc, pv) => {
        const device = this.extractDeviceType(pv.user_agent);
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const deviceBreakdown = Object.entries(deviceCounts).map(
      ([device, count]) => ({
        device,
        percentage: (count / totalViews) * 100,
      }),
    );

    // Daily views
    const dailyViewCounts = pageViews.reduce(
      (acc, pv) => {
        const date = pv.viewed_at.split('T')[0];
        if (!acc[date]) {
          acc[date] = { views: 0, visitors: new Set() };
        }
        acc[date].views++;
        acc[date].visitors.add(pv.session_id);
        return acc;
      },
      {} as Record<string, { views: number; visitors: Set<string> }>,
    );

    const dailyViews = Object.entries(dailyViewCounts)
      .map(([date, data]) => ({
        date,
        views: data.views,
        visitors: data.visitors.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      total_views: totalViews,
      unique_visitors: uniqueVisitors,
      average_session_duration: this.calculateAverageSessionDuration(pageViews),
      bounce_rate: bounceRate,
      conversion_rate: conversionRate,
      top_pages: topPages,
      referrer_sources: referrerSources,
      device_breakdown: deviceBreakdown,
      daily_views: dailyViews,
    };
  }

  private calculateAverageSessionDuration(pageViews: PageView[]): number {
    const sessions = pageViews.reduce(
      (acc, pv) => {
        if (!acc[pv.session_id]) {
          acc[pv.session_id] = { start: pv.viewed_at, end: pv.viewed_at };
        } else {
          if (pv.viewed_at < acc[pv.session_id].start) {
            acc[pv.session_id].start = pv.viewed_at;
          }
          if (pv.viewed_at > acc[pv.session_id].end) {
            acc[pv.session_id].end = pv.viewed_at;
          }
        }
        return acc;
      },
      {} as Record<string, { start: string; end: string }>,
    );

    const durations = Object.values(sessions).map((session) => {
      const start = new Date(session.start).getTime();
      const end = new Date(session.end).getTime();
      return (end - start) / 1000; // Convert to seconds
    });

    return durations.length > 0
      ? durations.reduce((sum, duration) => sum + duration, 0) /
          durations.length
      : 0;
  }

  private extractReferrerSource(referrer?: string): string {
    if (!referrer) return 'Direct';

    try {
      const url = new URL(referrer);
      const hostname = url.hostname.toLowerCase();

      if (hostname.includes('google')) return 'Google';
      if (hostname.includes('facebook')) return 'Facebook';
      if (hostname.includes('instagram')) return 'Instagram';
      if (hostname.includes('twitter')) return 'Twitter';
      if (hostname.includes('pinterest')) return 'Pinterest';
      if (hostname.includes('linkedin')) return 'LinkedIn';

      return hostname;
    } catch {
      return 'Unknown';
    }
  }

  private extractDeviceType(userAgent?: string): string {
    if (!userAgent) return 'Unknown';

    const ua = userAgent.toLowerCase();

    if (
      ua.includes('mobile') ||
      ua.includes('android') ||
      ua.includes('iphone')
    ) {
      return 'Mobile';
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'Tablet';
    }
    return 'Desktop';
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// React hook for using analytics
export function useWeddingAnalytics(websiteId: string) {
  const analytics = new WeddingAnalytics(websiteId);

  return {
    trackPageView: analytics.trackPageView.bind(analytics),
    trackEvent: analytics.trackEvent.bind(analytics),
    trackConversion: analytics.trackConversion.bind(analytics),
    trackRSVPSubmission: analytics.trackRSVPSubmission.bind(analytics),
    trackRegistryClick: analytics.trackRegistryClick.bind(analytics),
    trackPhotoShare: analytics.trackPhotoShare.bind(analytics),
    trackContactForm: analytics.trackContactForm.bind(analytics),
    getMetrics: analytics.getAnalyticsMetrics.bind(analytics),
  };
}
