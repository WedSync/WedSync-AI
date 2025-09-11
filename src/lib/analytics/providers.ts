import posthog from 'posthog-js';
import { User } from '@supabase/supabase-js';

// =============================================
// TYPES AND INTERFACES
// =============================================

export interface AnalyticsProvider {
  name: string;
  initialize(): Promise<void>;
  identify(userId: string, properties?: Record<string, any>): Promise<void>;
  track(eventName: string, properties?: Record<string, any>): Promise<void>;
  pageView(url: string, title?: string): Promise<void>;
  reset(): Promise<void>;
  setUserProperties(properties: Record<string, any>): Promise<void>;
  isEnabled(): boolean;
}

export interface WeddingContext {
  weddingDate?: string;
  clientId?: string;
  vendorType?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  daysUntilWedding?: number;
  isWeddingSeason?: boolean;
  seasonType?: 'peak' | 'shoulder' | 'off_peak';
}

export interface EventProperties {
  [key: string]: any;
  timestamp?: string;
  page_url?: string;
  page_title?: string;
  referrer?: string;
  session_id?: string;
  user_agent?: string;
  platform?: 'wedsync' | 'wedme';
  user_type?: 'supplier' | 'couple';
}

export interface ConsentSettings {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

// =============================================
// GOOGLE ANALYTICS 4 PROVIDER
// =============================================

class GoogleAnalyticsProvider implements AnalyticsProvider {
  name = 'google-analytics';
  private measurementId: string;
  private isInitialized = false;

  constructor(measurementId: string) {
    this.measurementId = measurementId;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      // Load Google Analytics script
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
      script.async = true;
      document.head.appendChild(script);

      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };

      window.gtag('js', new Date());
      window.gtag('config', this.measurementId, {
        page_title: document.title,
        page_location: window.location.href,
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Google Analytics:', error);
    }
  }

  async identify(
    userId: string,
    properties?: Record<string, any>,
  ): Promise<void> {
    if (!this.isEnabled()) return;

    window.gtag?.('config', this.measurementId, {
      user_id: userId,
      custom_map: properties,
    });
  }

  async track(
    eventName: string,
    properties?: Record<string, any>,
  ): Promise<void> {
    if (!this.isEnabled()) return;

    window.gtag?.('event', eventName, {
      event_category: properties?.category || 'engagement',
      event_label: properties?.label,
      value: properties?.value,
      ...properties,
    });
  }

  async pageView(url: string, title?: string): Promise<void> {
    if (!this.isEnabled()) return;

    window.gtag?.('config', this.measurementId, {
      page_title: title || document.title,
      page_location: url,
    });
  }

  async reset(): Promise<void> {
    // GA4 doesn't have a direct reset method
    // Clear user_id instead
    window.gtag?.('config', this.measurementId, {
      user_id: null,
    });
  }

  async setUserProperties(properties: Record<string, any>): Promise<void> {
    if (!this.isEnabled()) return;

    window.gtag?.('config', this.measurementId, {
      custom_map: properties,
    });
  }

  isEnabled(): boolean {
    return this.isInitialized && typeof window !== 'undefined' && !!window.gtag;
  }
}

// =============================================
// POSTHOG PROVIDER
// =============================================

class PostHogProvider implements AnalyticsProvider {
  name = 'posthog';
  private apiKey: string;
  private apiHost: string;
  private isInitialized = false;

  constructor(apiKey: string, apiHost: string = 'https://app.posthog.com') {
    this.apiKey = apiKey;
    this.apiHost = apiHost;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      posthog.init(this.apiKey, {
        api_host: this.apiHost,
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            posthog.opt_out_capturing();
          }
        },
        autocapture: {
          dom_event_allowlist: ['click', 'change', 'submit'],
          url_allowlist: [window.location.origin],
          css_selector_allowlist: [
            '[data-analytics]',
            '.analytics-track',
            'button',
            'a',
            'form',
          ],
        },
        capture_pageview: false, // Manual page view tracking
        capture_pageleave: true,
        cross_subdomain_cookie: true,
        persistence: 'localStorage+cookie',
        session_recording: {
          maskAllInputs: false,
          maskInputOptions: {
            password: true,
            email: true,
            phone: true,
            credit_card: true,
          },
          maskTextSelector: '.sensitive-data, .pii-data',
          blockSelector: '.no-record',
        },
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize PostHog:', error);
    }
  }

  async identify(
    userId: string,
    properties?: Record<string, any>,
  ): Promise<void> {
    if (!this.isEnabled()) return;

    posthog.identify(userId, properties);
  }

  async track(
    eventName: string,
    properties?: Record<string, any>,
  ): Promise<void> {
    if (!this.isEnabled()) return;

    posthog.capture(eventName, properties);
  }

  async pageView(url: string, title?: string): Promise<void> {
    if (!this.isEnabled()) return;

    posthog.capture('$pageview', {
      $current_url: url,
      $title: title || document.title,
    });
  }

  async reset(): Promise<void> {
    if (!this.isEnabled()) return;

    posthog.reset();
  }

  async setUserProperties(properties: Record<string, any>): Promise<void> {
    if (!this.isEnabled()) return;

    posthog.people.set(properties);
  }

  isEnabled(): boolean {
    return this.isInitialized && typeof window !== 'undefined';
  }
}

// =============================================
// MIXPANEL PROVIDER
// =============================================

class MixpanelProvider implements AnalyticsProvider {
  name = 'mixpanel';
  private projectToken: string;
  private isInitialized = false;

  constructor(projectToken: string) {
    this.projectToken = projectToken;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      // Load Mixpanel script
      const script = document.createElement('script');
      script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
      script.async = true;
      document.head.appendChild(script);

      // Wait for script to load
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });

      // Initialize Mixpanel
      if (window.mixpanel) {
        window.mixpanel.init(this.projectToken, {
          debug: process.env.NODE_ENV === 'development',
          track_pageview: false, // Manual page view tracking
          persistence: 'localStorage',
          property_blacklist: [
            '$current_url',
            '$initial_referrer',
            '$referrer',
          ],
          ignore_dnt: true,
        });

        this.isInitialized = true;
      }
    } catch (error) {
      console.error('Failed to initialize Mixpanel:', error);
    }
  }

  async identify(
    userId: string,
    properties?: Record<string, any>,
  ): Promise<void> {
    if (!this.isEnabled()) return;

    window.mixpanel?.identify(userId);
    if (properties) {
      window.mixpanel?.people.set(properties);
    }
  }

  async track(
    eventName: string,
    properties?: Record<string, any>,
  ): Promise<void> {
    if (!this.isEnabled()) return;

    window.mixpanel?.track(eventName, properties);
  }

  async pageView(url: string, title?: string): Promise<void> {
    if (!this.isEnabled()) return;

    window.mixpanel?.track('Page View', {
      url,
      title: title || document.title,
      referrer: document.referrer,
    });
  }

  async reset(): Promise<void> {
    if (!this.isEnabled()) return;

    window.mixpanel?.reset();
  }

  async setUserProperties(properties: Record<string, any>): Promise<void> {
    if (!this.isEnabled()) return;

    window.mixpanel?.people.set(properties);
  }

  isEnabled(): boolean {
    return (
      this.isInitialized && typeof window !== 'undefined' && !!window.mixpanel
    );
  }
}

// =============================================
// ANALYTICS MANAGER
// =============================================

export class AnalyticsManager {
  private providers: AnalyticsProvider[] = [];
  private consent: ConsentSettings = {
    analytics: false,
    marketing: false,
    functional: false,
  };
  private initialized = false;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  addProvider(provider: AnalyticsProvider): void {
    this.providers.push(provider);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load consent from localStorage
    this.loadConsentFromStorage();

    // Initialize providers if consent is given
    if (this.consent.analytics) {
      await Promise.all(
        this.providers.map((provider) =>
          provider.initialize().catch((error) => {
            console.error(`Failed to initialize ${provider.name}:`, error);
          }),
        ),
      );
    }

    this.initialized = true;
  }

  updateConsent(consent: ConsentSettings): void {
    this.consent = { ...consent };
    localStorage.setItem('analytics-consent', JSON.stringify(consent));

    // Re-initialize providers if analytics consent is now granted
    if (consent.analytics && this.initialized) {
      this.providers.forEach((provider) => {
        if (!provider.isEnabled()) {
          provider.initialize().catch((error) => {
            console.error(`Failed to initialize ${provider.name}:`, error);
          });
        }
      });
    }
  }

  async identifyUser(
    user: User,
    additionalContext?: Record<string, any>,
  ): Promise<void> {
    if (!this.consent.analytics) return;

    const userProperties = {
      email: user.email,
      created_at: user.created_at,

      // Core user properties
      platform: user.user_metadata?.is_couple ? 'wedme' : 'wedsync',
      user_type: user.user_metadata?.is_couple ? 'couple' : 'supplier',

      // Supplier-specific properties
      vendor_type: user.user_metadata?.vendor_type,
      business_name: user.user_metadata?.business_name,
      subscription_tier: user.user_metadata?.tier || 'free',

      // Couple-specific properties
      wedding_date: user.user_metadata?.wedding_date,
      partner_name: user.user_metadata?.partner_name,

      // Business context
      signup_source: user.user_metadata?.signup_source,
      referral_code: user.user_metadata?.referral_code,

      ...additionalContext,
    };

    await Promise.all(
      this.providers.map((provider) =>
        provider.identify(user.id, userProperties).catch((error) => {
          console.error(
            `Failed to identify user with ${provider.name}:`,
            error,
          );
        }),
      ),
    );
  }

  async trackEvent(
    eventName: string,
    properties?: EventProperties,
    weddingContext?: WeddingContext,
  ): Promise<void> {
    if (!this.consent.analytics) return;

    const eventProperties = {
      ...properties,
      timestamp: new Date().toISOString(),
      page_url:
        typeof window !== 'undefined' ? window.location.href : undefined,
      page_title: typeof window !== 'undefined' ? document.title : undefined,
      referrer: typeof window !== 'undefined' ? document.referrer : undefined,
      session_id: this.sessionId,
      user_agent:
        typeof window !== 'undefined' ? navigator.userAgent : undefined,

      // Wedding-specific context
      ...(weddingContext && {
        wedding_date: weddingContext.weddingDate,
        client_id: weddingContext.clientId,
        vendor_type: weddingContext.vendorType,
        urgency: weddingContext.urgency,
        days_until_wedding:
          weddingContext.daysUntilWedding ||
          (weddingContext.weddingDate
            ? Math.ceil(
                (new Date(weddingContext.weddingDate).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              )
            : null),
        is_wedding_season:
          weddingContext.isWeddingSeason ?? this.isWeddingSeason(),
        season_type: weddingContext.seasonType ?? this.getSeasonType(),
      }),
    };

    await Promise.all(
      this.providers.map((provider) =>
        provider.track(eventName, eventProperties).catch((error) => {
          console.error(`Failed to track event with ${provider.name}:`, error);
        }),
      ),
    );

    // Also store locally for business analytics
    this.storeEventLocally(eventName, eventProperties);
  }

  async trackPageView(url?: string, title?: string): Promise<void> {
    if (!this.consent.analytics || typeof window === 'undefined') return;

    const pageUrl = url || window.location.href;
    const pageTitle = title || document.title;

    await Promise.all(
      this.providers.map((provider) =>
        provider.pageView(pageUrl, pageTitle).catch((error) => {
          console.error(
            `Failed to track page view with ${provider.name}:`,
            error,
          );
        }),
      ),
    );
  }

  async reset(): Promise<void> {
    await Promise.all(
      this.providers.map((provider) =>
        provider.reset().catch((error) => {
          console.error(`Failed to reset ${provider.name}:`, error);
        }),
      ),
    );

    // Generate new session ID
    this.sessionId = this.generateSessionId();
  }

  async setUserProperties(properties: Record<string, any>): Promise<void> {
    if (!this.consent.analytics) return;

    await Promise.all(
      this.providers.map((provider) =>
        provider.setUserProperties(properties).catch((error) => {
          console.error(
            `Failed to set user properties with ${provider.name}:`,
            error,
          );
        }),
      ),
    );
  }

  getActiveProviders(): string[] {
    return this.providers
      .filter((provider) => provider.isEnabled())
      .map((provider) => provider.name);
  }

  hasConsent(): boolean {
    return this.consent.analytics;
  }

  private loadConsentFromStorage(): void {
    try {
      const stored = localStorage.getItem('analytics-consent');
      if (stored) {
        this.consent = { ...this.consent, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load consent from storage:', error);
    }
  }

  private generateSessionId(): string {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('analytics_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('analytics_session_id', sessionId);
      }
      return sessionId;
    }
    return crypto.randomUUID();
  }

  private isWeddingSeason(): boolean {
    const month = new Date().getMonth() + 1; // 1-12
    return month >= 5 && month <= 10; // May through October
  }

  private getSeasonType(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 9) return 'peak'; // June-September
    if ((month >= 4 && month <= 5) || month === 10) return 'shoulder'; // April-May, October
    return 'off_peak'; // November-March
  }

  private async storeEventLocally(
    eventName: string,
    properties: Record<string, any>,
  ): Promise<void> {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          properties,
          sessionId: this.sessionId,
        }),
      });
    } catch (error) {
      console.error('Failed to store analytics event locally:', error);
    }
  }
}

// =============================================
// PREDEFINED EVENTS
// =============================================

export const AnalyticsEvents = {
  // Onboarding funnel
  SIGNUP_STARTED: 'signup_started',
  VENDOR_TYPE_SELECTED: 'vendor_type_selected',
  ACCOUNT_CREATED: 'account_created',
  PROFILE_COMPLETED: 'profile_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Form builder events
  FORM_BUILDER_OPENED: 'form_builder_opened',
  FORM_FIELD_ADDED: 'form_field_added',
  FORM_SAVED: 'form_saved',
  FORM_PUBLISHED: 'form_published',
  FORM_SHARED: 'form_shared',

  // Client management
  CLIENT_ADDED: 'client_added',
  CLIENT_IMPORTED: 'clients_imported',
  CLIENT_PROFILE_VIEWED: 'client_profile_viewed',
  CLIENT_CONNECTED_WEDME: 'client_connected_wedme',

  // Journey automation
  JOURNEY_CREATED: 'journey_created',
  JOURNEY_ACTIVATED: 'journey_activated',
  JOURNEY_MODULE_ADDED: 'journey_module_added',
  JOURNEY_TRIGGERED: 'journey_triggered',

  // Form responses and engagement
  FORM_SUBMISSION_RECEIVED: 'form_submission_received',
  RESPONSE_VIEWED: 'response_viewed',
  RESPONSE_EXPORTED: 'response_exported',

  // Feature adoption
  FEATURE_DISCOVERED: 'feature_discovered',
  FEATURE_FIRST_USE: 'feature_first_use',
  FEATURE_POWER_USER: 'feature_power_user',

  // Business outcomes
  LEAD_CONVERTED: 'lead_converted',
  CONTRACT_SIGNED: 'contract_signed',
  PAYMENT_RECEIVED: 'payment_received',
  WEDDING_COMPLETED: 'wedding_completed',

  // Support and help
  HELP_ACCESSED: 'help_accessed',
  SUPPORT_CONTACTED: 'support_contacted',
  TUTORIAL_COMPLETED: 'tutorial_completed',
} as const;

// =============================================
// FACTORY FUNCTIONS
// =============================================

export function createAnalyticsManager(): AnalyticsManager {
  const manager = new AnalyticsManager();

  // Add providers based on environment variables
  if (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    manager.addProvider(
      new GoogleAnalyticsProvider(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
    );
  }

  if (
    process.env.NEXT_PUBLIC_POSTHOG_KEY &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST
  ) {
    manager.addProvider(
      new PostHogProvider(
        process.env.NEXT_PUBLIC_POSTHOG_KEY,
        process.env.NEXT_PUBLIC_POSTHOG_HOST,
      ),
    );
  }

  if (process.env.NEXT_PUBLIC_MIXPANEL_TOKEN) {
    manager.addProvider(
      new MixpanelProvider(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN),
    );
  }

  return manager;
}

// Singleton instance
export const analytics = createAnalyticsManager();

// =============================================
// HELPER FUNCTIONS
// =============================================

export function trackWeddingMilestone(
  milestone: string,
  clientId: string,
  weddingDate: string,
  vendorType: string,
  additionalProperties?: Record<string, any>,
): void {
  analytics.trackEvent(
    AnalyticsEvents.FORM_SUBMISSION_RECEIVED,
    {
      milestone,
      client_id: clientId,
      ...additionalProperties,
    },
    {
      weddingDate,
      clientId,
      vendorType,
      urgency: calculateUrgency(weddingDate),
    },
  );
}

export function trackBusinessOutcome(
  outcome:
    | 'lead_generated'
    | 'consultation_booked'
    | 'contract_signed'
    | 'payment_received',
  value?: number,
  clientId?: string,
  source?: string,
): void {
  analytics.trackEvent('business_outcome', {
    outcome,
    value,
    client_id: clientId,
    source,
    revenue_impact: value || 0,
  });
}

function calculateUrgency(
  weddingDate: string,
): 'low' | 'medium' | 'high' | 'critical' {
  const days = Math.ceil(
    (new Date(weddingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 7) return 'critical';
  if (days <= 30) return 'high';
  if (days <= 90) return 'medium';
  return 'low';
}

// =============================================
// TYPE EXTENSIONS
// =============================================

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    mixpanel?: any;
  }
}
