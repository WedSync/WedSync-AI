'use client';

import { useEffect } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import * as Sentry from '@sentry/nextjs';
import { monitoringHub } from '@/lib/monitoring/integration-hub';

// Client-side monitoring integration with Team E Integration Hub
export function MonitoringProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useUser();

  useEffect(() => {
    // Initialize comprehensive monitoring on client side only
    if (typeof window === 'undefined') return;

    // Initialize the monitoring integration hub
    monitoringHub.initialize().catch((error) => {
      console.error('Failed to initialize monitoring hub:', error);
    });

    // Fallback LogRocket initialization for production
    if (process.env.NODE_ENV === 'production') {
      import('logrocket')
        .then((LogRocket) => {
          LogRocket.default.init('7ci1y4/wedsync', {
            shouldCaptureIP: false,
            network: {
              requestSanitizer: (request) => {
                // Remove sensitive headers
                delete request.headers['Authorization'];
                delete request.headers['X-API-Key'];
                return request;
              },
            },
            // Only record 10% of sessions unless error occurs
            shouldCaptureSession: () => Math.random() < 0.1,
          });

          // Connect LogRocket with Sentry
          LogRocket.default.getSessionURL((sessionURL) => {
            Sentry.configureScope((scope) => {
              scope.setExtra('sessionURL', sessionURL);
            });
          });

          // Set user context in LogRocket
          if (user) {
            LogRocket.default.identify(user.id, {
              email: user.email,
              role: user.user_metadata?.role || 'user',
              subscriptionTier: user.user_metadata?.subscription_tier || 'free',
            });
          }
        })
        .catch((error) => {
          console.warn('Failed to initialize LogRocket:', error);
        });
    }

    // Set user context in Sentry
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.user_metadata?.full_name,
      });

      // Set wedding-specific context
      Sentry.setContext('wedding', {
        userId: user.id,
        subscriptionTier: user.user_metadata?.subscription_tier || 'free',
        accountCreatedAt: user.created_at,
      });
    }

    // Initialize Web Vitals tracking
    import('web-vitals')
      .then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        const sendToAnalytics = (metric: any) => {
          // Send to Sentry for performance monitoring
          Sentry.addBreadcrumb({
            category: 'web-vitals',
            message: `${metric.name}: ${metric.value}`,
            level: 'info',
            data: {
              name: metric.name,
              value: metric.value,
              rating: metric.rating,
            },
          });

          // Send to custom analytics endpoint
          fetch('/api/monitoring/performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metric: metric.name,
              value: metric.value,
              rating: metric.rating,
              timestamp: Date.now(),
              userId: user?.id,
            }),
          }).catch((error) => {
            console.warn('Failed to send performance metric:', error);
          });
        };

        getCLS(sendToAnalytics);
        getFID(sendToAnalytics);
        getFCP(sendToAnalytics);
        getLCP(sendToAnalytics);
        getTTFB(sendToAnalytics);
      })
      .catch((error) => {
        console.warn('Failed to initialize Web Vitals:', error);
      });
  }, [user]);

  return <>{children}</>;
}
