/**
 * WS-198 Error Boundary System - Main Error Boundary Component
 * Comprehensive error catching with wedding workflow context
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  timestamp: Date | null;
  retryCount: number;
  url: string;
  userAgent: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorInfo>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: 'supplier_dashboard' | 'couple_forms' | 'admin_panel' | 'general';
  level?: 'page' | 'component' | 'critical';
  enableRetry?: boolean;
  maxRetries?: number;
}

interface WeddingErrorContext {
  isWeddingDay: boolean;
  isPeakSeason: boolean;
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
  supplierType?: 'photographer' | 'venue' | 'florist' | 'catering' | 'other';
  weddingPhase?: 'planning' | 'final_week' | 'wedding_day' | 'post_wedding';
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      timestamp: null,
      retryCount: 0,
      url: '',
      userAgent: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
      timestamp: new Date(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent:
        typeof window !== 'undefined' ? window.navigator.userAgent : '',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, context = 'general' } = this.props;
    const errorId = this.state.errorId!;

    // Get wedding context for business impact analysis
    const weddingContext = this.getWeddingContext();

    // Enhanced error logging with wedding business context
    const enhancedErrorInfo = {
      errorId,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name,
      },
      context: {
        page: context,
        level: this.props.level || 'component',
        weddingContext,
        retryCount: this.state.retryCount,
        userAgent: this.state.userAgent,
        url: this.state.url,
        timestamp: this.state.timestamp?.toISOString(),
      },
    };

    // Log to console for development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary Caught Error:', enhancedErrorInfo);
    }

    // Store error in database for monitoring
    this.logErrorToDatabase(enhancedErrorInfo);

    // Auto-retry mechanism with exponential backoff
    if (
      this.props.enableRetry !== false &&
      this.state.retryCount < (this.props.maxRetries || 3)
    ) {
      this.scheduleRetry();
    }

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (handlerError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error in custom error handler:', handlerError);
        }
        // Log handler error to monitoring system
        this.logErrorToDatabase({
          error: handlerError,
          context: 'error_handler_failure',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Saturday wedding day emergency protocol
    if (weddingContext.isWeddingDay) {
      this.triggerWeddingDayProtocol(enhancedErrorInfo);
    }
  }

  private getWeddingContext(): WeddingErrorContext {
    const now = new Date();
    const isWeddingDay = now.getDay() === 6; // Saturday
    const isPeakSeason = now.getMonth() >= 4 && now.getMonth() <= 9; // May-October

    // Determine business impact based on context and timing
    let businessImpact: WeddingErrorContext['businessImpact'] = 'low';

    if (isWeddingDay) {
      businessImpact = 'critical';
    } else if (this.props.context === 'admin_panel') {
      businessImpact = 'high';
    } else if (this.props.context === 'supplier_dashboard') {
      businessImpact = isPeakSeason ? 'high' : 'medium';
    } else if (this.props.context === 'couple_forms') {
      businessImpact = 'medium';
    }

    return {
      isWeddingDay,
      isPeakSeason,
      businessImpact,
      weddingPhase: isWeddingDay ? 'wedding_day' : 'planning',
    };
  }

  private async logErrorToDatabase(errorInfo: any) {
    try {
      await this.supabase.from('error_logs').insert({
        error_id: errorInfo.errorId,
        error_message: errorInfo.error.message,
        error_stack: errorInfo.error.stack,
        component_stack: errorInfo.errorInfo.componentStack,
        context: errorInfo.context,
        created_at: new Date().toISOString(),
      });
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError);
    }
  }

  private triggerWeddingDayProtocol(errorInfo: any) {
    // Saturday wedding day emergency protocol
    console.error('🚨 WEDDING DAY EMERGENCY - ERROR DETECTED 🚨', errorInfo);

    // Attempt to notify support team (in a real implementation)
    try {
      fetch('/api/emergency/wedding-day-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'wedding_day_emergency',
          errorInfo,
          priority: 'critical',
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silent fail - don't cascade errors
      });
    } catch (emergencyError) {
      console.error(
        'Failed to trigger wedding day emergency protocol:',
        emergencyError,
      );
    }
  }

  private scheduleRetry() {
    const retryDelay = Math.min(
      2000 * Math.pow(2, this.state.retryCount),
      10000,
    ); // Exponential backoff, max 10s

    this.retryTimeoutId = setTimeout(() => {
      console.log(
        `Retrying after error boundary catch (attempt ${this.state.retryCount + 1})`,
      );

      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        timestamp: null,
        retryCount: prevState.retryCount + 1,
        url: '',
        userAgent: '',
      }));
    }, retryDelay);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError && this.state.error && this.state.errorId) {
      const { fallback: FallbackComponent } = this.props;

      if (FallbackComponent) {
        return <FallbackComponent {...this.state.errorInfo!} />;
      }

      // Default fallback - import the ErrorFallbackInterface component
      const ErrorFallbackInterface = React.lazy(() =>
        import('./ErrorFallbackInterface').then((module) => ({
          default: module.ErrorFallbackInterface,
        })),
      );

      return (
        <React.Suspense fallback={<div>Loading error interface...</div>}>
          <ErrorFallbackInterface
            error={this.state.error}
            errorId={this.state.errorId}
            timestamp={this.state.timestamp!}
            context={this.props.context || 'general'}
            retryCount={this.state.retryCount}
            onRetry={() => this.scheduleRetry()}
            canRetry={this.state.retryCount < (this.props.maxRetries || 3)}
          />
        </React.Suspense>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary components
export const SupplierDashboardErrorBoundary: React.FC<{
  children: ReactNode;
}> = ({ children }) => (
  <ErrorBoundary
    context="supplier_dashboard"
    level="page"
    enableRetry={true}
    maxRetries={3}
  >
    {children}
  </ErrorBoundary>
);

export const CoupleFormsErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary
    context="couple_forms"
    level="component"
    enableRetry={true}
    maxRetries={2}
  >
    {children}
  </ErrorBoundary>
);

export const AdminPanelErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => (
  <ErrorBoundary context="admin_panel" level="critical" enableRetry={false}>
    {children}
  </ErrorBoundary>
);

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
