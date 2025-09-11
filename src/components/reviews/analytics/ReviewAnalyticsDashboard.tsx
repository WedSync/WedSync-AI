/**
 * @fileoverview Review Analytics Dashboard Component
 * WS-047: Review Collection System Analytics Dashboard & Testing Framework
 *
 * Performance Requirements: <2s load time, real-time updates
 * Security: PII protection, role-based access
 * Testing: >85% coverage with visual proof
 */

'use client';

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  TrendingUp,
  Users,
  Star,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

import { ReviewMetricsCards } from './ReviewMetricsCards';
import { ReviewPerformanceCharts } from './ReviewPerformanceCharts';
import { OptimizedAnalyticsQueries } from '@/lib/database/analytics-queries';
import { AnalyticsPerformanceMonitor } from '@/lib/performance/analytics-monitor';
import { AnalyticsCache } from '@/lib/caching/analytics-cache';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

interface ReviewAnalyticsData {
  totalReviews: number;
  averageRating: number;
  responseRate: number;
  sentimentScore: number;
  monthlyGrowth: number;
  lastUpdated: string;
  trends: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor?: string;
      yAxisID?: string;
    }>;
  };
  distribution: {
    labels: string[];
    datasets: Array<{
      data: number[];
      backgroundColor: string[];
    }>;
  };
  sources: {
    labels: string[];
    datasets: Array<{
      data: number[];
      backgroundColor: string[];
    }>;
  };
  recentReviews: Array<{
    id: string;
    rating: number;
    reviewText: string;
    reviewerName: string;
    platform: string;
    publishedAt: string;
  }>;
}

interface ReviewAnalyticsDashboardProps {
  supplierId?: string;
  initialData?: Partial<ReviewAnalyticsData>;
  className?: string;
}

export const ReviewAnalyticsDashboard = memo<ReviewAnalyticsDashboardProps>(
  ({ supplierId, initialData, className = '' }) => {
    const [data, setData] = useState<ReviewAnalyticsData | null>(null);
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [realtimeConnected, setRealtimeConnected] = useState(false);

    const monitor = useMemo(
      () => AnalyticsPerformanceMonitor.getInstance(),
      [],
    );
    const cache = useMemo(() => AnalyticsCache.getInstance(), []);

    // Memoized metrics for performance
    const metrics = useMemo(() => {
      if (!data) return null;

      return {
        totalReviews: {
          value: data.totalReviews,
          label: 'Total Reviews',
          icon: BarChart3,
          trend: data.monthlyGrowth > 0 ? 'up' : 'down',
          trendValue: `${Math.abs(data.monthlyGrowth * 100).toFixed(1)}%`,
        },
        averageRating: {
          value: data.averageRating.toFixed(1),
          label: 'Average Rating',
          icon: Star,
          trend:
            data.averageRating >= 4.5
              ? 'up'
              : data.averageRating >= 3.5
                ? 'neutral'
                : 'down',
          suffix: '/5',
        },
        responseRate: {
          value: `${(data.responseRate * 100).toFixed(1)}%`,
          label: 'Response Rate',
          icon: TrendingUp,
          trend:
            data.responseRate >= 0.8
              ? 'up'
              : data.responseRate >= 0.6
                ? 'neutral'
                : 'down',
        },
        sentimentScore: {
          value: `${(data.sentimentScore * 100).toFixed(0)}%`,
          label: 'Sentiment Score',
          icon: Users,
          trend:
            data.sentimentScore >= 0.7
              ? 'up'
              : data.sentimentScore >= 0.5
                ? 'neutral'
                : 'down',
        },
      };
    }, [data]);

    // Optimized data fetching with caching
    const fetchAnalyticsData = useCallback(
      async (forceRefresh: boolean = false) => {
        const startTime = performance.now();
        const cacheKey = `review_analytics_${supplierId || 'all'}`;

        try {
          setLoading(true);
          setError(null);

          // Use cache if available and not forcing refresh
          if (!forceRefresh) {
            const cached = cache.get<ReviewAnalyticsData>(cacheKey);
            if (cached) {
              setData(cached);
              setLoading(false);
              monitor.measureDashboardLoad(startTime);
              return;
            }
          }

          // Fetch fresh data with parallel requests for performance
          const [
            metricsResult,
            trendsResult,
            distributionResult,
            sourcesResult,
            recentResult,
          ] = await Promise.all([
            OptimizedAnalyticsQueries.getAggregateMetrics(supplierId),
            OptimizedAnalyticsQueries.getReviewTrends(supplierId, { days: 30 }),
            OptimizedAnalyticsQueries.getRatingDistribution(supplierId),
            OptimizedAnalyticsQueries.getReviewSources(supplierId),
            OptimizedAnalyticsQueries.getRecentReviews(supplierId, 5),
          ]);

          // Check for errors
          if (metricsResult.error) throw new Error(metricsResult.error.message);
          if (trendsResult.error) throw new Error(trendsResult.error.message);
          if (distributionResult.error)
            throw new Error(distributionResult.error.message);
          if (sourcesResult.error) throw new Error(sourcesResult.error.message);
          if (recentResult.error) throw new Error(recentResult.error.message);

          const analyticsData: ReviewAnalyticsData = {
            totalReviews: metricsResult.data?.total_reviews || 0,
            averageRating: metricsResult.data?.average_rating || 0,
            responseRate: metricsResult.data?.response_rate || 0,
            sentimentScore: metricsResult.data?.sentiment_score || 0,
            monthlyGrowth: metricsResult.data?.monthly_growth || 0,
            lastUpdated: new Date().toISOString(),
            trends: {
              labels: trendsResult.data?.labels || [],
              datasets: trendsResult.data?.datasets || [],
            },
            distribution: {
              labels: distributionResult.data?.labels || [],
              datasets: distributionResult.data?.datasets || [],
            },
            sources: {
              labels: sourcesResult.data?.labels || [],
              datasets: sourcesResult.data?.datasets || [],
            },
            recentReviews: recentResult.data || [],
          };

          setData(analyticsData);
          setLastRefresh(new Date());

          // Cache the results
          cache.set(cacheKey, analyticsData, 300000); // 5 minutes TTL

          monitor.measureDashboardLoad(startTime);
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : 'Failed to load analytics data';
          setError(errorMessage);
          console.error('Analytics fetch error:', err);
        } finally {
          setLoading(false);
        }
      },
      [supplierId, cache, monitor],
    );

    // Real-time updates subscription
    const { isConnected, lastMessage } = useSupabaseRealtime('reviews', {
      filter: supplierId ? `supplier_id=eq.${supplierId}` : undefined,
      onMessage: useCallback(
        (payload) => {
          const updateStartTime = performance.now();

          // Optimistic update for better UX
          if (payload.eventType === 'INSERT' && data) {
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    totalReviews: prev.totalReviews + 1,
                    recentReviews: [
                      {
                        id: payload.new.id,
                        rating: payload.new.rating,
                        reviewText: payload.new.review_text || '',
                        reviewerName: payload.new.reviewer_name || 'Anonymous',
                        platform: payload.new.platform || 'Direct',
                        publishedAt: payload.new.created_at,
                      },
                      ...prev.recentReviews.slice(0, 4),
                    ],
                  }
                : null,
            );
          }

          // Debounced full refresh to avoid overwhelming the system
          setTimeout(() => {
            fetchAnalyticsData(true);
          }, 2000);

          monitor.measureRealtimeLatency(
            payload.timestamp || Date.now() - updateStartTime,
          );
        },
        [data, fetchAnalyticsData, monitor],
      ),
    });

    // Update realtime connection status
    useEffect(() => {
      setRealtimeConnected(isConnected);
    }, [isConnected]);

    // Initial data load
    useEffect(() => {
      if (!initialData && !data) {
        fetchAnalyticsData();
      } else if (initialData && !data) {
        setData(initialData as ReviewAnalyticsData);
      }
    }, [initialData, data, fetchAnalyticsData]);

    // Export functionality
    const handleExport = useCallback(async () => {
      if (!data) return;

      try {
        const response = await fetch('/api/analytics/reviews/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            format: 'csv',
            supplierId,
            dateRange: {
              start: new Date(
                Date.now() - 30 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              end: new Date().toISOString(),
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `review-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Export error:', err);
        setError('Failed to export data');
      }
    }, [data, supplierId]);

    // Loading state
    if (loading && !data) {
      return <DashboardSkeleton />;
    }

    // Error state
    if (error && !data) {
      return (
        <div
          className={`space-y-6 ${className}`}
          data-testid="analytics-dashboard-error"
        >
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Failed to Load Analytics
              </h3>
              <p className="text-muted-foreground text-center mb-4">{error}</p>
              <Button
                onClick={() => fetchAnalyticsData(true)}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div
        className={`space-y-6 ${className}`}
        data-testid="analytics-dashboard"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Review Analytics
            </h1>
            <p className="text-muted-foreground">
              Track your review performance and insights
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Real-time connection indicator */}
            <Badge
              variant={realtimeConnected ? 'success' : 'secondary'}
              className="flex items-center gap-1"
              data-testid="realtime-connection-status"
            >
              <CheckCircle className="h-3 w-3" />
              {realtimeConnected ? 'Live' : 'Offline'}
            </Badge>

            {/* Last updated */}
            <span
              className="text-sm text-muted-foreground"
              data-testid="last-updated"
            >
              Updated {lastRefresh.toLocaleTimeString()}
            </span>

            {/* Export button */}
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              data-testid="export-button"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            {/* Refresh button */}
            <Button
              onClick={() => fetchAnalyticsData(true)}
              variant="outline"
              size="sm"
              disabled={loading}
              data-testid="refresh-button"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {error && data && (
          <Card
            className="border-orange-200 bg-orange-50"
            data-testid="error-banner"
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-orange-800">
                  Some data may be outdated: {error}
                </span>
              </div>
              <Button
                onClick={() => fetchAnalyticsData(true)}
                variant="outline"
                size="sm"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        {metrics && (
          <ReviewMetricsCards
            metrics={metrics}
            loading={loading}
            data-testid="metrics-section"
          />
        )}

        {/* Charts Section */}
        {data && (
          <ReviewPerformanceCharts
            trends={data.trends}
            distribution={data.distribution}
            sources={data.sources}
            loading={loading}
            data-testid="charts-section"
          />
        )}

        {/* Recent Reviews */}
        {data?.recentReviews && data.recentReviews.length > 0 && (
          <Card data-testid="recent-reviews-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentReviews.map((review) => (
                  <div
                    key={review.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                    data-testid={`recent-review-${review.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">
                          {review.reviewerName}
                        </span>
                        <div className="flex items-center">
                          {'★'.repeat(review.rating)}
                          {'☆'.repeat(5 - review.rating)}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {review.platform}
                        </Badge>
                      </div>
                      {review.reviewText && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {review.reviewText}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-sm">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              <pre>{JSON.stringify(monitor.getMetrics(), null, 2)}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    );
  },
);

ReviewAnalyticsDashboard.displayName = 'ReviewAnalyticsDashboard';

// Loading skeleton component
const DashboardSkeleton = memo(() => (
  <div className="space-y-6" data-testid="dashboard-skeleton">
    {/* Header skeleton */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>

    {/* Metrics skeleton */}
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      data-testid="metrics-skeleton"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Charts skeleton */}
    <div
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      data-testid="charts-skeleton"
    >
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
));

DashboardSkeleton.displayName = 'DashboardSkeleton';

export default ReviewAnalyticsDashboard;
