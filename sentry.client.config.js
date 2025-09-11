import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Replay may only be enabled for the client-side
  integrations: [
    Sentry.replayIntegration({
      // Capture 10% of all sessions,
      // plus 100% of sessions with an error
      sessionSampleRate: 0.1,
      errorSampleRate: 1.0,
    }),
  ],
  
  // Performance Monitoring
  tracesSampleRate: 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
  
  // Wedding-specific context
  beforeSend(event, hint) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Sentry event (dev):', event);
      return null;
    }
    
    // Add wedding business context
    if (event.user) {
      event.tags = {
        ...event.tags,
        business_type: 'wedding_services',
        component: 'client_side'
      };
      
      // Add wedding context if available
      event.contexts = {
        ...event.contexts,
        wedding: {
          daysUntilWedding: calculateDaysUntilWedding(),
          vendorType: getCurrentVendorType(),
          criticalPeriod: isDaysUntilWedding() <= 7
        }
      };
    }
    
    return event;
  },
  
  // Filter out noisy errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'ChunkLoadError',
    'Loading chunk',
  ],
});

// Helper functions for wedding context
function calculateDaysUntilWedding() {
  try {
    const weddingData = localStorage.getItem('wedding-date');
    if (!weddingData) return null;
    
    const weddingDate = new Date(weddingData);
    const today = new Date();
    const diffTime = weddingDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  } catch (error) {
    return null;
  }
}

function getCurrentVendorType() {
  try {
    return localStorage.getItem('vendor-type') || 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

function isDaysUntilWedding() {
  const days = calculateDaysUntilWedding();
  return days !== null ? days : 999;
}