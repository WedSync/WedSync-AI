'use client';

import { useEffect, useCallback, useRef } from 'react';
import { errorTracker } from '@/lib/monitoring/error-tracking';

interface ErrorHandlerOptions {
  enableConsoleErrorCapture?: boolean;
  enableUnhandledRejectionCapture?: boolean;
  enableNetworkErrorCapture?: boolean;
  enablePerformanceTracking?: boolean;
  weddingContext?: {
    clientId?: string;
    weddingDate?: string;
    vendorType?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
  };
  userId?: string;
  onError?: (error: Error, context: any) => void;
}

interface NetworkError extends Error {
  status?: number;
  url?: string;
  method?: string;
}

export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    enableConsoleErrorCapture = true,
    enableUnhandledRejectionCapture = true,
    enableNetworkErrorCapture = true,
    enablePerformanceTracking = true,
    weddingContext,
    userId,
    onError,
  } = options;

  const originalConsoleError = useRef<typeof console.error>();
  const originalFetch = useRef<typeof fetch>();

  // Manual error reporting function
  const reportError = useCallback(
    (error: Error, context: any = {}, tags: Record<string, string> = {}) => {
      const errorId = errorTracker.captureError(
        error,
        {
          userId,
          endpoint: window.location.pathname,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
          environment: process.env.NODE_ENV || 'development',
          ...context,
        },
        {
          ...tags,
          wedding_context: weddingContext
            ? JSON.stringify(weddingContext)
            : undefined,
          source: 'manual_report',
          has_wedding_context: Boolean(weddingContext).toString(),
        },
      );

      // Add breadcrumb for manual error reporting
      errorTracker.addBreadcrumb({
        category: 'error',
        message: `Manual error report: ${error.message}`,
        level: 'error',
        data: { errorId, context, tags },
      });

      // Call custom error handler if provided
      if (onError) {
        onError(error, { errorId, context, tags });
      }

      return errorId;
    },
    [userId, weddingContext, onError],
  );

  // Network error interceptor
  const interceptFetch = useCallback(() => {
    if (!enableNetworkErrorCapture || typeof window === 'undefined') return;

    originalFetch.current = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const startTime = performance.now();
      const url = input instanceof Request ? input.url : input.toString();
      const method =
        init?.method || (input instanceof Request ? input.method : 'GET');

      try {
        const response = await originalFetch.current!(input, init);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Track slow requests
        if (enablePerformanceTracking && duration > 3000) {
          errorTracker.addBreadcrumb({
            category: 'performance',
            message: `Slow API request: ${method} ${url}`,
            level: 'warning',
            data: {
              url,
              method,
              duration: Math.round(duration),
              status: response.status,
            },
          });
        }

        // Track HTTP errors
        if (!response.ok) {
          const networkError: NetworkError = new Error(
            `HTTP ${response.status}: ${method} ${url}`,
          );
          networkError.name = 'NetworkError';
          networkError.status = response.status;
          networkError.url = url;
          networkError.method = method;

          reportError(
            networkError,
            {
              endpoint: url,
              method,
              requestDuration: Math.round(duration),
            },
            {
              error_type: 'network_error',
              status_code: response.status.toString(),
              response_ok: response.ok.toString(),
            },
          );
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Handle network failures
        if (error instanceof Error) {
          const networkError: NetworkError = new Error(
            `Network request failed: ${method} ${url} - ${error.message}`,
          );
          networkError.name = 'NetworkError';
          networkError.url = url;
          networkError.method = method;
          networkError.cause = error;

          reportError(
            networkError,
            {
              endpoint: url,
              method,
              requestDuration: Math.round(duration),
              originalError: error.message,
            },
            {
              error_type: 'network_failure',
              network_error_type: error.name,
              is_offline: !navigator.onLine ? 'true' : 'false',
            },
          );
        }

        throw error;
      }
    };
  }, [enableNetworkErrorCapture, enablePerformanceTracking, reportError]);

  // Console error interceptor
  const interceptConsoleError = useCallback(() => {
    if (!enableConsoleErrorCapture || typeof window === 'undefined') return;

    originalConsoleError.current = console.error;

    console.error = (...args: any[]) => {
      // Call original console.error first
      originalConsoleError.current?.(...args);

      // Extract error information
      const firstArg = args[0];
      let error: Error;

      if (firstArg instanceof Error) {
        error = firstArg;
      } else if (typeof firstArg === 'string') {
        error = new Error(firstArg);
        error.name = 'ConsoleError';
      } else {
        error = new Error(String(firstArg));
        error.name = 'ConsoleError';
      }

      // Don't report our own error tracking errors to avoid loops
      if (
        error.message.includes('errorTracker') ||
        error.message.includes('Sentry') ||
        error.stack?.includes('error-tracking.ts')
      ) {
        return;
      }

      reportError(
        error,
        {
          endpoint: window.location.pathname,
          consoleArgs: args.slice(0, 5), // Limit args to prevent too much data
        },
        {
          error_type: 'console_error',
          args_count: args.length.toString(),
        },
      );
    };
  }, [enableConsoleErrorCapture, reportError]);

  // Performance monitoring
  const trackPerformance = useCallback(() => {
    if (!enablePerformanceTracking || typeof window === 'undefined') return;

    // Track page load performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navigationEntry = entry as PerformanceNavigationTiming;
          const loadTime =
            navigationEntry.loadEventEnd - navigationEntry.navigationStart;

          if (loadTime > 5000) {
            // Page took more than 5 seconds to load
            errorTracker.addBreadcrumb({
              category: 'performance',
              message: `Slow page load: ${Math.round(loadTime)}ms`,
              level: 'warning',
              data: {
                url: window.location.href,
                loadTime: Math.round(loadTime),
                domContentLoaded: Math.round(
                  navigationEntry.domContentLoadedEventEnd -
                    navigationEntry.navigationStart,
                ),
                firstContentfulPaint: Math.round(
                  navigationEntry.domContentLoadedEventEnd -
                    navigationEntry.navigationStart,
                ),
              },
            });
          }
        }

        if (entry.entryType === 'largest-contentful-paint') {
          const lcp = entry.startTime;
          if (lcp > 4000) {
            // LCP > 4 seconds is poor
            errorTracker.addBreadcrumb({
              category: 'performance',
              message: `Poor LCP: ${Math.round(lcp)}ms`,
              level: 'warning',
              data: {
                lcp: Math.round(lcp),
                url: window.location.href,
              },
            });
          }
        }

        if (entry.entryType === 'first-input-delay') {
          const fid = (entry as any).processingStart - entry.startTime;
          if (fid > 300) {
            // FID > 300ms is poor
            errorTracker.addBreadcrumb({
              category: 'performance',
              message: `Poor FID: ${Math.round(fid)}ms`,
              level: 'warning',
              data: {
                fid: Math.round(fid),
                url: window.location.href,
              },
            });
          }
        }
      }
    });

    observer.observe({
      entryTypes: [
        'navigation',
        'largest-contentful-paint',
        'first-input-delay',
      ],
    });

    return () => observer.disconnect();
  }, [enablePerformanceTracking]);

  // User activity tracking
  const trackUserActivity = useCallback(() => {
    if (typeof window === 'undefined') return;

    let lastActivity = Date.now();
    let activityTimer: NodeJS.Timeout;

    const updateActivity = () => {
      lastActivity = Date.now();
      clearTimeout(activityTimer);

      // Track user inactivity (30 minutes)
      activityTimer = setTimeout(
        () => {
          errorTracker.addBreadcrumb({
            category: 'user',
            message: 'User inactive for 30 minutes',
            level: 'info',
            data: {
              lastActivity: new Date(lastActivity).toISOString(),
              url: window.location.href,
              weddingContext: weddingContext || null,
            },
          });
        },
        30 * 60 * 1000,
      ); // 30 minutes
    };

    const events = ['click', 'scroll', 'keydown', 'mousemove', 'touchstart'];
    events.forEach((event) => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    updateActivity(); // Initialize

    return () => {
      clearTimeout(activityTimer);
      events.forEach((event) => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [weddingContext]);

  // Global error handlers
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!enableUnhandledRejectionCapture) return;

      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      error.name = 'UnhandledPromiseRejection';

      reportError(
        error,
        {
          endpoint: window.location.pathname,
          promiseRejection: true,
        },
        {
          error_type: 'unhandled_rejection',
          rejection_reason: typeof event.reason,
        },
      );
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection,
      );
    };
  }, [enableUnhandledRejectionCapture, reportError]);

  // Initialize all interceptors and trackers
  useEffect(() => {
    if (typeof window === 'undefined') return;

    interceptConsoleError();
    interceptFetch();
    const performanceCleanup = trackPerformance();
    const activityCleanup = trackUserActivity();

    // Add initial breadcrumb
    errorTracker.addBreadcrumb({
      category: 'navigation',
      message: `Error handler initialized for ${window.location.pathname}`,
      level: 'info',
      data: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        hasWeddingContext: Boolean(weddingContext),
        timestamp: new Date().toISOString(),
      },
    });

    // Cleanup function
    return () => {
      // Restore original functions
      if (originalConsoleError.current) {
        console.error = originalConsoleError.current;
      }
      if (originalFetch.current) {
        window.fetch = originalFetch.current;
      }

      // Run cleanup functions
      performanceCleanup?.();
      activityCleanup?.();
    };
  }, [
    interceptConsoleError,
    interceptFetch,
    trackPerformance,
    trackUserActivity,
    weddingContext,
  ]);

  return {
    reportError,
    // Utility functions for manual tracking
    trackUserAction: (action: string, data?: any) => {
      errorTracker.addBreadcrumb({
        category: 'user',
        message: action,
        level: 'info',
        data: { ...data, weddingContext },
      });
    },
    trackAPICall: (
      endpoint: string,
      method: string,
      duration: number,
      success: boolean,
    ) => {
      errorTracker.addBreadcrumb({
        category: 'http',
        message: `${method} ${endpoint}`,
        level: success ? 'info' : 'error',
        data: { endpoint, method, duration, success, weddingContext },
      });
    },
  };
}
