/**
 * Client-side Sentry initialization
 * Replaces sentry.client.config.js for Next.js 15 compatibility
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring - reduced for client-side
  tracesSampleRate: 0.1,

  // Environment
  environment: process.env.NODE_ENV,

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'development',

  // Client-side integrations
  integrations: [
    new Sentry.BrowserTracing({
      tracingOrigins: [
        'localhost',
        /^\//,
        /^https:\/\/yourapp\.vercel\.app\/api/,
      ],
    }),
  ],

  // Session Replay (optional)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Wedding business context
  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry client event (dev):', event);
      return null;
    }

    // Add client context
    event.tags = {
      ...event.tags,
      business_type: 'wedding_services',
      component: 'client_side',
    };

    // Add user-facing context
    const url = window.location.pathname;
    if (url.includes('/dashboard')) {
      event.tags.page_category = 'dashboard';
    } else if (url.includes('/clients')) {
      event.tags.page_category = 'client_management';
    } else if (url.includes('/forms')) {
      event.tags.page_category = 'form_builder';
    } else if (url.includes('/analytics')) {
      event.tags.page_category = 'analytics';
    }

    // Filter out wedding-day critical errors differently
    const isWeddingDay = new Date().getDay() === 6; // Saturday
    if (isWeddingDay && event.level === 'error') {
      event.tags.wedding_day_critical = 'true';
      // Prioritize wedding day errors
      event.level = 'fatal';
    }

    return event;
  },

  // Filter out noisy client errors
  ignoreErrors: [
    'Non-Error exception captured',
    'ChunkLoadError',
    'Loading chunk',
    'ResizeObserver loop limit exceeded',
    'Script error',
    // Wedding-specific ignores
    'Photo upload cancelled by user',
    'Form auto-save interrupted',
  ],

  // Filter out non-essential transactions
  beforeSendTransaction(event) {
    // Skip auto-save transactions to reduce noise
    if (event.transaction?.includes('auto-save')) {
      return null;
    }

    return event;
  },
});
