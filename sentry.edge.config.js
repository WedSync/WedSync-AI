import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: 1.0,
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
  
  // Edge-specific context
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry edge event (dev):', event);
      return null;
    }
    
    event.tags = {
      ...event.tags,
      business_type: 'wedding_services',
      component: 'edge_runtime'
    };
    
    return event;
  },
});