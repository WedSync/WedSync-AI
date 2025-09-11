/**
 * React Error Boundary with Enhanced Error Handling
 * Implements comprehensive error boundaries for React 19 components
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';
import { errorHandler } from '@/lib/stability/error-handler';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  lastErrorTime: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  level?: 'page' | 'component' | 'critical';
  context?: Record<string, any>;
}

interface ErrorDisplayProps {
  error: Error;
  errorId: string;
  onRetry: () => void;
  canRetry: boolean;
  level: string;
}

// Wedding-specific error context detection
function getWeddingErrorContext(error: Error) {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';

  // Network/connectivity issues (common at wedding venues)
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout')
  ) {
    return {
      type: 'network',
      title: 'Connection Issue',
      description:
        'This might be due to poor WiFi at your wedding venue. Your data is safe.',
      icon: '📶',
      color: 'amber',
    };
  }

  // Wedding data related errors
  if (
    message.includes('client') ||
    message.includes('vendor') ||
    message.includes('wedding') ||
    stack.includes('forms')
  ) {
    return {
      type: 'wedding-data',
      title: 'Wedding Data Protected',
      description:
        'Your client information, vendor details, and wedding forms are safely stored.',
      icon: '💒',
      color: 'blue',
    };
  }

  // Payment/booking errors
  if (
    message.includes('payment') ||
    message.includes('booking') ||
    message.includes('stripe')
  ) {
    return {
      type: 'payment',
      title: 'Payment Processing Issue',
      description:
        'No charges were processed. Your payment information is secure.',
      icon: '💳',
      color: 'green',
    };
  }

  // Photo/file upload errors
  if (
    message.includes('upload') ||
    message.includes('file') ||
    message.includes('image')
  ) {
    return {
      type: 'upload',
      title: 'File Upload Issue',
      description:
        'Your wedding photos and documents are being processed. Please try again.',
      icon: '📸',
      color: 'purple',
    };
  }

  // Default error
  return {
    type: 'general',
    title: 'Technical Issue',
    description:
      'We encountered a temporary issue. Your wedding planning data is safe.',
    icon: '⚙️',
    color: 'gray',
  };
}

// Error display component
function ErrorDisplay({
  error,
  errorId,
  onRetry,
  canRetry,
  level,
}: ErrorDisplayProps) {
  const isPageLevel = level === 'page';
  const isCritical = level === 'critical';
  const weddingContext = getWeddingErrorContext(error);

  if (isCritical) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-lg w-full bg-white rounded-lg shadow-xl border border-pink-100 p-6">
          {/* Wedding context alert */}
          <div
            className={`mb-4 p-4 rounded-lg border border-${weddingContext.color}-200 bg-${weddingContext.color}-50`}
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">{weddingContext.icon}</span>
              <div>
                <h4 className={`font-medium text-${weddingContext.color}-800`}>
                  {weddingContext.title}
                </h4>
                <p className={`text-sm text-${weddingContext.color}-700 mt-1`}>
                  {weddingContext.description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg
                className="h-8 w-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.888-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-red-800">
                Critical Wedding Platform Error
              </h3>
              <p className="text-sm text-red-600">
                Don't worry - your wedding planning data is completely safe and
                backed up.
              </p>
            </div>
          </div>

          <div className="mb-4">
            <details className="text-sm">
              <summary className="cursor-pointer text-red-700 font-medium">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-red-100 rounded text-red-800">
                <p>
                  <strong>Error ID:</strong> {errorId}
                </p>
                <p>
                  <strong>Message:</strong> {error.message}
                </p>
                <p>
                  <strong>Time:</strong> {new Date().toLocaleString()}
                </p>
              </div>
            </details>
          </div>

          <div className="flex space-x-3">
            {canRetry && (
              <button
                onClick={onRetry}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isPageLevel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-lg w-full bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Something went wrong
            </h2>
            <p className="mt-2 text-gray-600">
              We encountered an error while loading this page. Our team has been
              notified.
            </p>

            <div className="mt-6 space-y-3">
              {canRetry && (
                <button
                  onClick={onRetry}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={() => (window.location.href = '/dashboard')}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Go to Dashboard
              </button>
            </div>

            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">
                Error Details (ID: {errorId})
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-sm text-gray-700">
                <p>{error.message}</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }

  // Component level error
  return (
    <div className="border border-red-300 rounded-md p-4 bg-red-50">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">Component Error</h3>
          <p className="mt-1 text-sm text-red-700">
            This component failed to load properly.
          </p>
          {canRetry && (
            <div className="mt-2">
              <button
                onClick={onRetry}
                className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
              >
                Retry Component
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state to trigger error UI
    return {
      hasError: true,
      error,
      errorId: `ui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component', context = {} } = this.props;
    const errorId = this.state.errorId!;

    // Enhanced error logging
    const enhancedContext = {
      ...context,
      errorId,
      level,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      retryCount: this.state.retryCount,
      userAgent:
        typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: new Date().toISOString(),
    };

    // Log to structured logger
    logger.error('React Error Boundary caught error', error, enhancedContext);

    // Record metrics
    metrics.incrementCounter('errors.react_boundary', 1, {
      level,
      component:
        enhancedContext.componentStack?.split('\n')[1]?.trim() || 'unknown',
      retry_count: this.state.retryCount.toString(),
    });

    // Update state with error info
    this.setState({
      errorInfo,
      lastErrorTime: Date.now(),
    });

    // Call custom error handler
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (handlerError) {
        logger.error(
          'Error in custom error handler',
          handlerError as Error,
          enhancedContext,
        );
      }
    }

    // Report to external monitoring if configured
    this.reportToMonitoring(error, enhancedContext);
  }

  private reportToMonitoring(error: Error, context: any) {
    try {
      // Send to error monitoring service (Sentry, Bugsnag, etc.)
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          tags: {
            errorBoundary: true,
            level: this.props.level,
          },
          extra: context,
        });
      }

      // Report to custom monitoring endpoint
      if (typeof window !== 'undefined') {
        fetch('/api/monitoring/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
            context,
          }),
        }).catch(() => {
          // Silently fail - don't let error reporting cause more errors
        });
      }
    } catch (reportingError) {
      // Silently fail - error reporting should never crash the app
      console.error('Failed to report error to monitoring:', reportingError);
    }
  }

  private handleRetry = () => {
    const {
      enableRetry = true,
      maxRetries = 3,
      retryDelay = 2000,
    } = this.props;

    if (!enableRetry || this.state.retryCount >= maxRetries) {
      return;
    }

    // Prevent rapid retries
    const timeSinceLastError = Date.now() - this.state.lastErrorTime;
    if (timeSinceLastError < retryDelay) {
      return;
    }

    logger.info('Retrying after error boundary catch', {
      errorId: this.state.errorId,
      retryCount: this.state.retryCount + 1,
      maxRetries,
    });

    // Clear the timeout if it exists
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Set timeout for retry
    this.retryTimeoutId = setTimeout(
      () => {
        this.setState((prevState) => ({
          hasError: false,
          error: null,
          errorInfo: null,
          errorId: null,
          retryCount: prevState.retryCount + 1,
          lastErrorTime: 0,
        }));

        metrics.incrementCounter('errors.react_boundary_retry', 1, {
          retry_count: (this.state.retryCount + 1).toString(),
        });
      },
      Math.min(retryDelay * (this.state.retryCount + 1), 10000),
    ); // Cap at 10 seconds
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError && this.state.error && this.state.errorId) {
      const {
        fallback,
        enableRetry = true,
        maxRetries = 3,
        level = 'component',
      } = this.props;

      if (fallback) {
        return fallback;
      }

      const canRetry = enableRetry && this.state.retryCount < maxRetries;

      return (
        <ErrorDisplay
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          canRetry={canRetry}
          level={level}
        />
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>,
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for error reporting in functional components
export function useErrorHandler() {
  const reportError = React.useCallback(
    (error: Error, context?: Record<string, any>) => {
      const errorId = `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      logger.error('Manual error report from useErrorHandler', error, {
        ...context,
        errorId,
        timestamp: new Date().toISOString(),
      });

      metrics.incrementCounter('errors.manual_report', 1);

      // Report to monitoring
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          tags: { manual: true },
          extra: context,
        });
      }

      return errorId;
    },
    [],
  );

  return { reportError };
}

// Specialized error boundaries for different app sections
export const PageErrorBoundary = (props: Omit<ErrorBoundaryProps, 'level'>) => (
  <ErrorBoundary {...props} level="page" />
);

export const ComponentErrorBoundary = (
  props: Omit<ErrorBoundaryProps, 'level'>,
) => <ErrorBoundary {...props} level="component" />;

export const CriticalErrorBoundary = (
  props: Omit<ErrorBoundaryProps, 'level'>,
) => <ErrorBoundary {...props} level="critical" />;
