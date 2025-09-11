import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Web Vitals tracking for wedding business performance
export function initWebVitals() {
  if (typeof window === 'undefined') return;

  // Core Web Vitals
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}

function sendToAnalytics(metric: any) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    delta: metric.delta,
    rating: metric.rating,
    navigationType: metric.navigationType,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    business_type: 'wedding_services',
    page_category: getPageCategory(window.location.pathname),
  });

  // Send to multiple analytics endpoints
  const endpoints = [
    '/api/analytics/web-vitals',
    ...(process.env.NEXT_PUBLIC_ANALYTICS_URL
      ? [process.env.NEXT_PUBLIC_ANALYTICS_URL]
      : []),
  ];

  endpoints.forEach((endpoint) => {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(console.error);
  });

  // Also send to Sentry for correlation with errors
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.addBreadcrumb({
      category: 'web-vital',
      message: `${metric.name}: ${metric.value}`,
      level: 'info',
      data: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
      },
    });
  }
}

function getPageCategory(pathname: string): string {
  if (pathname.startsWith('/dashboard/clients')) return 'client_management';
  if (pathname.startsWith('/dashboard/booking')) return 'booking_management';
  if (pathname.startsWith('/dashboard/contracts')) return 'contract_management';
  if (pathname.startsWith('/dashboard/communications'))
    return 'communication_center';
  if (pathname.startsWith('/dashboard/timeline')) return 'wedding_timeline';
  if (pathname.startsWith('/dashboard/invoicing')) return 'billing_invoicing';
  if (pathname.startsWith('/dashboard')) return 'dashboard_general';
  if (pathname.startsWith('/rsvp')) return 'guest_rsvp';
  if (pathname.startsWith('/auth')) return 'authentication';
  return 'other';
}

// Custom performance markers for wedding business flows
export const performanceMarkers = {
  // Client management flow
  markClientLoadStart: () => performance.mark('client-load-start'),
  markClientLoadEnd: () => {
    performance.mark('client-load-end');
    performance.measure(
      'client-load-duration',
      'client-load-start',
      'client-load-end',
    );
    sendCustomMetric('client-load-duration');
  },

  // Booking flow
  markBookingStart: () => performance.mark('booking-flow-start'),
  markBookingStep: (step: string) => {
    const markName = `booking-${step}`;
    performance.mark(markName);
    performance.measure(`booking-step-${step}`, 'booking-flow-start', markName);
    sendCustomMetric(`booking-step-${step}`);
  },

  // Contract generation
  markContractGenStart: () => performance.mark('contract-gen-start'),
  markContractGenEnd: () => {
    performance.mark('contract-gen-end');
    performance.measure(
      'contract-generation',
      'contract-gen-start',
      'contract-gen-end',
    );
    sendCustomMetric('contract-generation');
  },

  // Payment processing
  markPaymentStart: () => performance.mark('payment-start'),
  markPaymentEnd: (success: boolean) => {
    performance.mark('payment-end');
    performance.measure('payment-duration', 'payment-start', 'payment-end');
    sendCustomMetric('payment-duration', { success });
  },

  // RSVP responses
  markRsvpStart: () => performance.mark('rsvp-start'),
  markRsvpEnd: () => {
    performance.mark('rsvp-end');
    performance.measure('rsvp-submission', 'rsvp-start', 'rsvp-end');
    sendCustomMetric('rsvp-submission');
  },
};

function sendCustomMetric(
  metricName: string,
  additionalData?: Record<string, any>,
) {
  const measure = performance.getEntriesByName(metricName)[0];
  if (!measure) return;

  const data = {
    name: metricName,
    duration: measure.duration,
    startTime: measure.startTime,
    business_type: 'wedding_services',
    timestamp: Date.now(),
    url: window.location.href,
    ...additionalData,
  };

  fetch('/api/analytics/custom-metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(console.error);
}

// Resource loading performance monitoring
export function monitorResourceLoading() {
  if (typeof window === 'undefined') return;

  // Monitor slow loading resources
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      // Flag resources taking longer than 2 seconds
      if (entry.duration > 2000) {
        const slowResource = {
          name: entry.name,
          duration: entry.duration,
          size: (entry as any).transferSize,
          type: (entry as any).initiatorType,
          timestamp: Date.now(),
          page: window.location.pathname,
        };

        fetch('/api/analytics/slow-resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slowResource),
        }).catch(console.error);
      }
    });
  });

  observer.observe({ entryTypes: ['resource'] });
}

// Database query performance (for API routes)
export function trackDatabaseQuery(
  queryName: string,
  duration: number,
  success: boolean,
) {
  const data = {
    query_name: queryName,
    duration,
    success,
    timestamp: Date.now(),
    business_context: 'wedding_database_operations',
  };

  // Log to our monitoring system
  fetch('/api/analytics/db-performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(console.error);
}
