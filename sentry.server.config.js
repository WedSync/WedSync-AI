import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 1.0,
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Release tracking  
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
  
  // Server-side integrations
  integrations: [
    new Sentry.ProfilingIntegration(),
  ],
  
  // Profiling
  profilesSampleRate: 0.1,
  
  // Wedding business context
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry server event (dev):', event);
      return null;
    }
    
    // Add server context
    event.tags = {
      ...event.tags,
      business_type: 'wedding_services',
      component: 'server_side'
    };
    
    // Add wedding-specific context
    if (event.request) {
      const url = event.request.url;
      if (url?.includes('/api/clients')) {
        event.tags.api_category = 'client_management';
      } else if (url?.includes('/api/booking')) {
        event.tags.api_category = 'booking_system';
      } else if (url?.includes('/api/contracts')) {
        event.tags.api_category = 'contract_management';
      } else if (url?.includes('/api/communications')) {
        event.tags.api_category = 'communication_system';
      }
    }
    
    return event;
  },
  
  // Filter out noisy server errors
  ignoreErrors: [
    'ECONNRESET',
    'EPIPE',
    'ECANCELED',
    'Request timeout',
  ],
});