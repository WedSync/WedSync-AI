'use client';

import React, { ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class BudgetErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In production, would send to Sentry or similar service
    console.error('Budget component error:', error, errorInfo);

    // Store error details for debugging
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `error-${this.state.errorId}`,
        JSON.stringify({
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      );
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  handleReportBug = () => {
    const bugReport = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent:
        typeof window !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
    };

    // Create mailto link for bug report
    const subject = encodeURIComponent(
      `Budget System Error - ID: ${this.state.errorId}`,
    );
    const body = encodeURIComponent(`
Bug Report Details:
Error ID: ${bugReport.errorId}
Timestamp: ${bugReport.timestamp}
URL: ${bugReport.url}
Error Message: ${bugReport.error}

Please describe what you were doing when this error occurred:
[Your description here]
    `);

    if (typeof window !== 'undefined') {
      window.open(`mailto:support@wedsync.com?subject=${subject}&body=${body}`);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <p className="text-sm text-muted-foreground">
                We encountered an unexpected error with the budget system. Our
                team has been automatically notified.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center text-xs text-muted-foreground">
                Error ID: {this.state.errorId}
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>

                <Button
                  variant="outline"
                  onClick={() =>
                    typeof window !== 'undefined' &&
                    (window.location.href = '/dashboard')
                  }
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>

                <Button
                  variant="ghost"
                  onClick={this.handleReportBug}
                  className="w-full text-xs"
                >
                  <Bug className="w-3 h-3 mr-2" />
                  Report This Issue
                </Button>
              </div>

              <div className="text-xs text-center text-muted-foreground">
                If this problem persists, please contact support at{' '}
                <a
                  href="mailto:support@wedsync.com"
                  className="text-primary hover:underline"
                >
                  support@wedsync.com
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage wrapper component
export function withBudgetErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
) {
  return function WrappedComponent(props: T) {
    return (
      <BudgetErrorBoundary>
        <Component {...props} />
      </BudgetErrorBoundary>
    );
  };
}

// Hook for error reporting from function components
export function useBudgetErrorHandler() {
  const reportError = (error: Error, context?: string) => {
    const errorId = Math.random().toString(36).substr(2, 9);

    console.error('Budget error reported:', error, context);

    // Store error details
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `error-${errorId}`,
        JSON.stringify({
          error: error.message,
          stack: error.stack,
          context,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      );
    }

    return errorId;
  };

  return { reportError };
}
