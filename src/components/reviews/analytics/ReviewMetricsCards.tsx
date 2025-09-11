/**
 * @fileoverview Review Metrics Cards Component
 * WS-047: Review Collection System Analytics Dashboard & Testing Framework
 *
 * Displays key performance indicators for review analytics
 * Features: Real-time updates, trend indicators, accessibility support
 */

'use client';

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface MetricData {
  value: number | string;
  label: string;
  icon: LucideIcon;
  trend: 'up' | 'down' | 'neutral';
  trendValue?: string;
  suffix?: string;
}

interface Metrics {
  totalReviews: MetricData;
  averageRating: MetricData;
  responseRate: MetricData;
  sentimentScore: MetricData;
}

interface ReviewMetricsCardsProps {
  metrics: Metrics;
  loading?: boolean;
  className?: string;
}

export const ReviewMetricsCards = memo<ReviewMetricsCardsProps>(
  ({ metrics, loading = false, className = '' }) => {
    if (loading) {
      return <MetricsSkeleton className={className} />;
    }

    const metricsArray = [
      metrics.totalReviews,
      metrics.averageRating,
      metrics.responseRate,
      metrics.sentimentScore,
    ];

    return (
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}
      >
        {metricsArray.map((metric, index) => (
          <MetricCard key={metric.label} metric={metric} index={index} />
        ))}
      </div>
    );
  },
);

ReviewMetricsCards.displayName = 'ReviewMetricsCards';

// Individual metric card component
const MetricCard = memo<{
  metric: MetricData;
  index: number;
}>(({ metric, index }) => {
  const { value, label, icon: Icon, trend, trendValue, suffix } = metric;

  // Determine trend colors and icons
  const getTrendConfig = (trendType: string) => {
    switch (trendType) {
      case 'up':
        return {
          icon: TrendingUp,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          badgeVariant: 'success' as const,
        };
      case 'down':
        return {
          icon: TrendingDown,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          badgeVariant: 'destructive' as const,
        };
      default:
        return {
          icon: Minus,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          badgeVariant: 'secondary' as const,
        };
    }
  };

  const trendConfig = getTrendConfig(trend);
  const TrendIcon = trendConfig.icon;

  return (
    <Card
      className="transition-all duration-200 hover:shadow-md"
      data-testid={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {/* Metric Label */}
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {label}
            </p>

            {/* Metric Value */}
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight">{value}</span>
              {suffix && (
                <span className="text-lg text-muted-foreground">{suffix}</span>
              )}
            </div>

            {/* Trend Indicator */}
            {trendValue && (
              <div className="flex items-center gap-1 mt-2">
                <Badge
                  variant={trendConfig.badgeVariant}
                  className="flex items-center gap-1 text-xs"
                >
                  <TrendIcon className="h-3 w-3" />
                  {trendValue}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  vs last month
                </span>
              </div>
            )}
          </div>

          {/* Icon */}
          <div className={`p-3 rounded-full ${trendConfig.bgColor}`}>
            <Icon className={`h-5 w-5 ${trendConfig.color}`} />
          </div>
        </div>

        {/* Accessibility: Screen reader content */}
        <div className="sr-only">
          {label}: {value}
          {suffix}
          {trendValue && `, trending ${trend} by ${trendValue}`}
        </div>
      </CardContent>
    </Card>
  );
});

MetricCard.displayName = 'MetricCard';

// Loading skeleton for metrics
const MetricsSkeleton = memo<{ className?: string }>(({ className = '' }) => (
  <div
    className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}
    data-testid="metrics-skeleton"
  >
    {Array.from({ length: 4 }).map((_, index) => (
      <Card key={index}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {/* Label skeleton */}
              <Skeleton className="h-4 w-24 mb-2" />

              {/* Value skeleton */}
              <Skeleton className="h-8 w-16 mb-2" />

              {/* Trend skeleton */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>

            {/* Icon skeleton */}
            <Skeleton className="h-11 w-11 rounded-full" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
));

MetricsSkeleton.displayName = 'MetricsSkeleton';

export default ReviewMetricsCards;
