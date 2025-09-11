'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number;
}

class PhotoGroupErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state to trigger error UI
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service (production only)
    const errorData = {
      message: error.message,
      component: 'PhotoGroupErrorBoundary',
      timestamp: new Date().toISOString(),
      // Never log stack traces or sensitive data in production
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      }),
    };

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      console.error('Photo Group Error:', errorData.message);
      // Send to Sentry or other monitoring service
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        });
      }
    } else {
      console.error('Photo Group Error:', errorData);
    }

    // Update error count for rate limiting
    this.setState((prevState) => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Auto-reset after 30 seconds if this is the first error
    if (this.state.errorCount === 0) {
      this.resetTimeoutId = setTimeout(() => {
        this.resetErrorBoundary();
      }, 30000);
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    // Clear any pending timeouts
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    // Call optional reset handler
    this.props.onReset?.();

    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      // Check for custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Rate limit check - prevent error loop
      const timeSinceLastError = Date.now() - this.state.lastErrorTime;
      if (this.state.errorCount > 5 && timeSinceLastError < 5000) {
        return (
          <Card className="m-4 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Multiple Errors Detected
              </CardTitle>
              <CardDescription className="text-red-600">
                The photo groups feature is experiencing repeated errors. Please
                refresh the page or contact support if the issue persists.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        );
      }

      // Default error UI
      return (
        <Card className="m-4 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
            <CardDescription className="text-yellow-600">
              We encountered an error while loading your photo groups.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User-friendly error message */}
            <div className="rounded-lg bg-white p-4 text-sm text-gray-700">
              {this.state.error?.message === 'Network Error' ? (
                <p>
                  Unable to connect to our servers. Please check your internet
                  connection and try again.
                </p>
              ) : this.state.error?.message?.includes('permission') ? (
                <p>
                  You don't have permission to view this content. Please ensure
                  you're logged in with the correct account.
                </p>
              ) : (
                <p>
                  An unexpected error occurred. Our team has been notified and
                  is working on a fix.
                </p>
              )}
            </div>

            {/* Development-only: Show detailed error info */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="rounded-lg bg-gray-100 p-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">
                  Developer Details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            {/* Recovery actions */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={this.resetErrorBoundary}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="text-gray-600 hover:bg-gray-100"
              >
                Go Back
              </Button>
            </div>

            {/* Error count indicator */}
            {this.state.errorCount > 1 && (
              <p className="text-xs text-gray-500">
                Error occurred {this.state.errorCount} times
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Typed Sentry interface for TypeScript
declare global {
  interface Window {
    Sentry?: {
      captureException: (error: Error, context?: any) => void;
    };
  }
}

export default PhotoGroupErrorBoundary;
