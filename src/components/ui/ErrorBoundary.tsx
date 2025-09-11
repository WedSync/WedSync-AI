'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { errorTracker } from '@/lib/monitoring/error-tracking';

interface WeddingContext {
  clientId?: string;
  weddingDate?: string;
  vendorType?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
  weddingContext?: WeddingContext;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  showFeedback: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showFeedback: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Capture error with wedding context
    const errorId = errorTracker.captureError(
      error,
      {
        userId: this.getUserId(),
        endpoint: window.location.pathname,
        userAgent: navigator.userAgent,
        environment: process.env.NODE_ENV || 'development',
        timestamp: Date.now(),
      },
      {
        component_stack: errorInfo.componentStack || 'unknown',
        context: this.props.context || 'unknown',
        wedding_context: this.props.weddingContext
          ? JSON.stringify(this.props.weddingContext)
          : 'none',
        has_wedding_context: Boolean(this.props.weddingContext).toString(),
        urgency: this.calculateUrgency(),
        vendor_type: this.props.weddingContext?.vendorType || 'unknown',
      },
    );

    this.setState({ errorInfo, errorId });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private getUserId(): string | undefined {
    // Try to get user ID from various sources
    if (typeof window !== 'undefined') {
      // From localStorage or sessionStorage
      const userData =
        localStorage.getItem('user') || sessionStorage.getItem('user');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          return parsed.id || parsed.user_id;
        } catch {
          // Ignore JSON parsing errors
        }
      }
    }
    return undefined;
  }

  private calculateUrgency(): string {
    if (!this.props.weddingContext?.weddingDate) return 'low';

    const daysUntil = Math.ceil(
      (new Date(this.props.weddingContext.weddingDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysUntil <= 0) return 'critical';
    if (daysUntil <= 1) return 'critical';
    if (daysUntil <= 7) return 'high';
    if (daysUntil <= 30) return 'medium';
    return 'low';
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showFeedback: false,
    });
  };

  handleShowFeedback = () => {
    this.setState({ showFeedback: true });
  };

  handleSendFeedback = async (feedback: string) => {
    if (!this.state.errorId) return;

    try {
      const response = await fetch('/api/errors/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId: this.state.errorId,
          feedback,
          context: this.props.context,
          weddingContext: this.props.weddingContext,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });

      if (response.ok) {
        this.setState({ showFeedback: false });
        alert(
          'Thank you for your feedback! We will investigate this issue and prioritize it based on your wedding timeline.',
        );
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Failed to send feedback:', error);
      alert(
        'Unable to send feedback. Please contact support directly with error ID: ' +
          this.state.errorId,
      );
    }
  };

  getUrgencyMessage = (): string | null => {
    if (!this.props.weddingContext?.weddingDate) return null;

    const daysUntil = Math.ceil(
      (new Date(this.props.weddingContext.weddingDate).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysUntil <= 0) {
      return '🚨 Your wedding is today! Our team has been immediately notified and will resolve this with highest priority.';
    } else if (daysUntil <= 1) {
      return '⚡ Your wedding is tomorrow! Our team has been notified and will prioritize this issue immediately.';
    } else if (daysUntil <= 7) {
      return '📅 Your wedding is next week. Our team will address this issue with high priority.';
    } else if (daysUntil <= 30) {
      return "💒 Your wedding is coming up soon. We'll make sure this gets resolved quickly.";
    }

    return null;
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const urgencyMessage = this.getUrgencyMessage();
      const isHighPriority = urgencyMessage !== null;

      // Wedding-aware error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle
                className={`text-center ${isHighPriority ? 'text-red-600' : 'text-orange-600'}`}
              >
                <div className="flex justify-center mb-2">
                  <div
                    className={`${isHighPriority ? 'bg-red-100' : 'bg-orange-100'} rounded-full p-3`}
                  >
                    <AlertTriangle
                      className={`h-8 w-8 ${isHighPriority ? 'text-red-600' : 'text-orange-600'}`}
                    />
                  </div>
                </div>
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                We've been notified and are looking into this issue.
              </p>

              {urgencyMessage && (
                <div
                  className={`p-4 rounded-lg border ${
                    isHighPriority
                      ? 'bg-red-50 border-red-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <p
                    className={`text-sm ${
                      isHighPriority ? 'text-red-700' : 'text-blue-700'
                    }`}
                  >
                    {urgencyMessage}
                  </p>
                </div>
              )}

              {this.props.weddingContext?.vendorType && (
                <div className="text-center text-sm text-muted-foreground">
                  Service: {this.props.weddingContext.vendorType}
                </div>
              )}

              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  Error ID:{' '}
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {this.state.errorId}
                  </code>
                </p>
              </div>

              {this.state.showFeedback ? (
                <div className="space-y-3">
                  <label
                    htmlFor="error-feedback"
                    className="block text-sm font-medium"
                  >
                    What were you trying to do when this error occurred?
                  </label>
                  <textarea
                    id="error-feedback"
                    placeholder="Please describe what happened and what you were trying to accomplish..."
                    className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                  />
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const feedback = (
                          document.getElementById(
                            'error-feedback',
                          ) as HTMLTextAreaElement
                        ).value;
                        this.handleSendFeedback(feedback);
                      }}
                      className="flex-1"
                    >
                      Send Feedback
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => this.setState({ showFeedback: false })}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    onClick={this.handleReset}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={this.handleShowFeedback}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Report Issue
                  </Button>
                </div>
              )}

              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (window.location.href = '/')}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Home className="h-4 w-4" />
                  Return to Dashboard
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Developer Info (Development Only)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                    <p className="font-mono text-red-600 break-all mb-2">
                      {this.state.error.message}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="text-gray-600 overflow-auto max-h-32 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component wrapper for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
) {
  return (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
}

// Simple error fallback component
export function ErrorFallback({
  error,
  resetError,
}: {
  error?: Error;
  resetError?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-6">
      <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h3>
      <p className="text-gray-600 text-center mb-4 max-w-md">
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      {resetError && (
        <Button onClick={resetError} size="sm">
          Try again
        </Button>
      )}
    </div>
  );
}
