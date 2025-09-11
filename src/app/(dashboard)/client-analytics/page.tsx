'use client';

import React, { Suspense } from 'react';
import { ClientPortalAnalytics } from '../../../components/analytics/ClientPortalAnalytics';
import { Card } from '../../../components/ui/card';
import { BarChart3, Loader2 } from 'lucide-react';

// Loading skeleton component
const AnalyticsLoading = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </div>

    {/* Metrics cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="p-6">
          <div className="animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>

    {/* Charts skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(2)].map((_, i) => (
        <Card key={i} className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

// Error boundary component
const AnalyticsError = ({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) => (
  <Card className="p-8 text-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="p-3 bg-red-100 rounded-full">
        <BarChart3 className="w-8 h-8 text-red-600" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Failed to load analytics
        </h3>
        <p className="text-gray-600 mt-1">{error.message}</p>
      </div>
      <button
        onClick={retry}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  </Card>
);

interface PageProps {
  searchParams?: {
    supplierId?: string;
    timeRange?: string;
  };
}

export default function ClientAnalyticsPage({ searchParams }: PageProps) {
  const supplierId = searchParams?.supplierId;
  const timeRange = searchParams?.timeRange || '30d';

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Client Portal Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor client engagement and portal usage to optimize your service
            delivery
          </p>
        </div>

        {/* Quick Actions */}
        <div className="hidden md:flex items-center space-x-4">
          <button className="text-sm text-gray-600 hover:text-gray-900 font-medium">
            View Help Guide
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
            Export All Data
          </button>
        </div>
      </div>

      {/* Analytics Content */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-gray-700">Loading client analytics...</span>
            </div>
          </div>
        }
      >
        <ErrorBoundary
          fallback={(error, retry) => (
            <AnalyticsError error={error} retry={retry} />
          )}
        >
          <ClientPortalAnalytics
            supplierId={supplierId}
            timeRange={timeRange}
            className="w-full"
          />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}

// Simple error boundary implementation
class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    fallback: (error: Error, retry: () => void) => React.ReactNode;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Client Analytics Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, () => {
        this.setState({ hasError: false, error: null });
      });
    }

    return this.props.children;
  }
}
