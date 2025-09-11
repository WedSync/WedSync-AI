'use client';

import React from 'react';
import { Card } from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button-untitled';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ClientErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

class ClientErrorBoundary extends React.Component<
  ClientErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ClientErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to Team E's monitoring system
    console.error('Client Views Error:', error, errorInfo);

    // In production, send to error tracking service
    if (typeof window !== 'undefined') {
      try {
        // Integration with Team E's error tracking
        window
          .fetch('/api/monitoring/error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: error.message,
              stack: error.stack,
              componentStack: errorInfo.componentStack,
              url: window.location.href,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              feature: 'client-list-views',
            }),
          })
          .catch(console.error);
      } catch (e) {
        console.error('Failed to log error:', e);
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error!}
            retry={this.handleRetry}
          />
        );
      }

      return (
        <DefaultErrorFallback
          error={this.state.error!}
          retry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const isNetworkError =
    error.message.includes('fetch') || error.message.includes('network');
  const isAuthError =
    error.message.includes('401') || error.message.includes('Unauthorized');

  return (
    <Card className="p-8 text-center max-w-md mx-auto mt-8 border border-red-200 bg-red-50">
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-red-100 rounded-full">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        {isNetworkError
          ? 'Connection Problem'
          : isAuthError
            ? 'Authentication Required'
            : 'Something went wrong'}
      </h2>

      <p className="text-gray-600 mb-6">
        {isNetworkError
          ? 'Unable to load client data. Please check your internet connection.'
          : isAuthError
            ? 'Your session has expired. Please log in again.'
            : 'We encountered an error while loading your client list.'}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={retry} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>

        {isAuthError ? (
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/login')}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Log In
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/dashboard')}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Button>
        )}
      </div>

      {process.env.NODE_ENV === 'development' && (
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2">
            <Bug className="w-4 h-4" />
            Technical Details
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-auto max-h-40">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}
    </Card>
  );
}

// Specialized error boundaries for different client view components
export function ClientListErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientErrorBoundary
      fallback={({ error, retry }) => (
        <Card className="p-6 text-center border border-amber-200 bg-amber-50">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-2">
            Client List Error
          </h3>
          <p className="text-gray-600 mb-4">
            Unable to display client list. This may be a temporary issue.
          </p>
          <div className="flex justify-center gap-2">
            <Button size="sm" onClick={retry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload List
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
        </Card>
      )}
    >
      {children}
    </ClientErrorBoundary>
  );
}

export function ClientSearchErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientErrorBoundary
      fallback={({ error, retry }) => (
        <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Search Error</span>
          </div>
          <p className="text-sm text-red-600 mt-1">
            Search functionality is temporarily unavailable.
          </p>
          <Button size="sm" variant="outline" onClick={retry} className="mt-2">
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      )}
    >
      {children}
    </ClientErrorBoundary>
  );
}

export function ClientNotificationErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientErrorBoundary
      fallback={({ error, retry }) => (
        <Card className="p-4 border border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-2 text-yellow-700 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Notification Error</span>
          </div>
          <p className="text-sm text-yellow-600 mb-3">
            Unable to load notifications. Team E's notification service may be
            temporarily unavailable.
          </p>
          <Button size="sm" onClick={retry} className="text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />
            Reload Notifications
          </Button>
        </Card>
      )}
    >
      {children}
    </ClientErrorBoundary>
  );
}

export default ClientErrorBoundary;
