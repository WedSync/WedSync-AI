/**
 * WS-130: AI Photography Error Boundary Components
 * React error boundaries with fallback UI for AI photography features
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  MessageCircle,
  Settings,
} from 'lucide-react';
import {
  AiPhotographyError,
  ErrorSeverity,
  ErrorCategory,
  aiPhotographyErrorHandler,
} from '../../lib/ai/photography/error-handler';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

/**
 * Main AI Photography Error Boundary
 */
export class AiPhotographyErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `boundary_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to our error handler
    const aiError: AiPhotographyError = {
      id: this.state.errorId || `boundary_error_${Date.now()}`,
      category: ErrorCategory.PROCESSING_ERROR,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      userMessage: 'A component error occurred in the AI photography features.',
      context: {
        operation: 'react-component-render',
        timestamp: new Date(),
        metadata: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        },
      },
      originalError: error,
      retryable: true,
      suggestions: [
        'Try refreshing the page',
        'Clear browser cache',
        'Use manual tools if available',
      ],
      timestamp: new Date(),
    };

    // Report to error handler
    aiPhotographyErrorHandler.setErrorReporting((err) => {
      console.error('AI Photography Component Error:', err);
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetOnPropsChange !== resetOnPropsChange) {
      if (resetOnPropsChange) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || [];
      const hasResetKeyChanged = resetKeys.some(
        (key, idx) => key !== prevResetKeys[idx],
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = (): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  handleRetryWithDelay = (): void => {
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, 1000);
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <AiPhotographyErrorFallback
          error={this.state.error}
          onRetry={this.resetErrorBoundary}
          onRetryWithDelay={this.handleRetryWithDelay}
          retryCount={this.state.retryCount}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Fallback UI Component for AI Photography Errors
 */
interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  onRetryWithDelay: () => void;
  retryCount: number;
}

export const AiPhotographyErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  onRetryWithDelay,
  retryCount,
}) => {
  const isNetworkError =
    error?.message.toLowerCase().includes('network') ||
    error?.message.toLowerCase().includes('fetch');
  const isTimeoutError = error?.message.toLowerCase().includes('timeout');
  const hasRetriedMultipleTimes = retryCount > 2;

  return (
    <div
      className="border border-red-200 rounded-lg p-6 bg-red-50 text-center max-w-md mx-auto"
      role="alert"
      aria-live="polite"
    >
      <div className="flex justify-center mb-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
      </div>

      <h3 className="text-lg font-semibold text-red-800 mb-2">
        AI Photography Feature Temporarily Unavailable
      </h3>

      <p className="text-red-600 mb-4">
        {isNetworkError && 'Network connection issue detected.'}
        {isTimeoutError && 'The request took too long to complete.'}
        {!isNetworkError && !isTimeoutError && 'An unexpected error occurred.'}
      </p>

      <div className="space-y-3">
        {!hasRetriedMultipleTimes && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            aria-label="Retry loading AI photography features"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        )}

        {hasRetriedMultipleTimes && (
          <button
            onClick={onRetryWithDelay}
            className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
            aria-label="Retry with delay"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again (1s delay)
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-red-200">
        <h4 className="font-medium text-red-800 mb-2">
          Available alternatives:
        </h4>
        <ul className="text-sm text-red-600 space-y-1">
          <li>• Use manual color selection tools</li>
          <li>• Browse photographers by location and style</li>
          <li>• Create mood boards using drag-and-drop</li>
          <li>• Access basic search filters</li>
        </ul>
      </div>

      <div className="mt-4 flex justify-center space-x-2">
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-red-600 hover:text-red-800 underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
        >
          Refresh Page
        </button>
        <span className="text-red-400">|</span>
        <button
          onClick={() => {
            if (navigator.onLine) {
              console.log(
                'Report issue functionality would be implemented here',
              );
            }
          }}
          className="text-sm text-red-600 hover:text-red-800 underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded inline-flex items-center"
        >
          <MessageCircle className="h-3 w-3 mr-1" />
          Report Issue
        </button>
      </div>
    </div>
  );
};

/**
 * Specific Error Boundaries for Different Features
 */
export const ColorAnalysisErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <AiPhotographyErrorBoundary
      fallback={<ColorAnalysisFallbackUI />}
      onError={(error) => {
        console.error('Color Analysis Error:', error);
      }}
    >
      {children}
    </AiPhotographyErrorBoundary>
  );
};

export const MoodBoardErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <AiPhotographyErrorBoundary
      fallback={<MoodBoardFallbackUI />}
      onError={(error) => {
        console.error('Mood Board Error:', error);
      }}
    >
      {children}
    </AiPhotographyErrorBoundary>
  );
};

export const StyleMatchingErrorBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <AiPhotographyErrorBoundary
      fallback={<StyleMatchingFallbackUI />}
      onError={(error) => {
        console.error('Style Matching Error:', error);
      }}
    >
      {children}
    </AiPhotographyErrorBoundary>
  );
};

/**
 * Feature-specific Fallback UIs
 */
const ColorAnalysisFallbackUI: React.FC = () => (
  <div
    className="border border-orange-200 rounded-lg p-4 bg-orange-50"
    role="alert"
  >
    <div className="flex items-center mb-2">
      <Settings className="h-5 w-5 text-orange-600 mr-2" />
      <h4 className="font-medium text-orange-800">
        Color Analysis Unavailable
      </h4>
    </div>
    <p className="text-orange-600 text-sm mb-3">
      AI color analysis is temporarily unavailable. You can still:
    </p>
    <div className="space-y-2">
      <button className="w-full text-left px-3 py-2 bg-white border border-orange-200 rounded text-sm text-orange-700 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500">
        Use manual color picker
      </button>
      <button className="w-full text-left px-3 py-2 bg-white border border-orange-200 rounded text-sm text-orange-700 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500">
        Browse predefined palettes
      </button>
      <button className="w-full text-left px-3 py-2 bg-white border border-orange-200 rounded text-sm text-orange-700 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500">
        Upload different image
      </button>
    </div>
  </div>
);

const MoodBoardFallbackUI: React.FC = () => (
  <div
    className="border border-blue-200 rounded-lg p-4 bg-blue-50"
    role="alert"
  >
    <div className="flex items-center mb-2">
      <Settings className="h-5 w-5 text-blue-600 mr-2" />
      <h4 className="font-medium text-blue-800">AI Mood Board Unavailable</h4>
    </div>
    <p className="text-blue-600 text-sm mb-3">
      AI recommendations are unavailable. Manual mood board tools are still
      active:
    </p>
    <div className="grid grid-cols-2 gap-2">
      <button className="px-3 py-2 bg-white border border-blue-200 rounded text-xs text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
        Drag & Drop
      </button>
      <button className="px-3 py-2 bg-white border border-blue-200 rounded text-xs text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
        Grid Layout
      </button>
      <button className="px-3 py-2 bg-white border border-blue-200 rounded text-xs text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
        Color Themes
      </button>
      <button className="px-3 py-2 bg-white border border-blue-200 rounded text-xs text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
        Export Tools
      </button>
    </div>
  </div>
);

const StyleMatchingFallbackUI: React.FC = () => (
  <div
    className="border border-purple-200 rounded-lg p-4 bg-purple-50"
    role="alert"
  >
    <div className="flex items-center mb-2">
      <Settings className="h-5 w-5 text-purple-600 mr-2" />
      <h4 className="font-medium text-purple-800">
        AI Style Matching Unavailable
      </h4>
    </div>
    <p className="text-purple-600 text-sm mb-3">
      AI-powered matching is unavailable. Use these filters instead:
    </p>
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {['Romantic', 'Modern', 'Classic', 'Rustic', 'Vintage'].map((style) => (
          <button
            key={style}
            className="px-3 py-1 bg-white border border-purple-200 rounded-full text-xs text-purple-700 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {style}
          </button>
        ))}
      </div>
      <div className="flex space-x-2 mt-2">
        <select className="flex-1 px-2 py-1 border border-purple-200 rounded text-xs text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option>All Locations</option>
          <option>New York</option>
          <option>Los Angeles</option>
          <option>Chicago</option>
        </select>
        <select className="flex-1 px-2 py-1 border border-purple-200 rounded text-xs text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option>Any Price</option>
          <option>$1000-3000</option>
          <option>$3000-5000</option>
          <option>$5000+</option>
        </select>
      </div>
    </div>
  </div>
);

/**
 * HOC for wrapping components with error boundaries
 */
export function withAiPhotographyErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
) {
  const WrappedComponent: React.FC<P> = (props) => (
    <AiPhotographyErrorBoundary fallback={fallback}>
      <Component {...props} />
    </AiPhotographyErrorBoundary>
  );

  WrappedComponent.displayName = `withAiPhotographyErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
