import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

export const AnalyticsComponent = () => (
  <>
    <Analytics />
    <SpeedInsights />
  </>
);

// Custom analytics events for wedding business
export const trackWeddingEvent = (
  event: string,
  properties?: Record<string, any>,
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event, {
      event_category: 'wedding_business',
      ...properties,
    });
  }
};

export const trackClientEngagement = (action: string, clientId?: string) => {
  trackWeddingEvent('client_engagement', {
    action,
    client_id: clientId,
    timestamp: new Date().toISOString(),
  });
};

export const trackBookingFunnel = (
  step: string,
  data?: Record<string, any>,
) => {
  trackWeddingEvent('booking_funnel', {
    funnel_step: step,
    ...data,
  });
};

export const trackRevenueEvent = (value: number, currency = 'USD') => {
  trackWeddingEvent('revenue', {
    value,
    currency,
    revenue_category: 'wedding_services',
  });
};
