'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  TrendingUp,
  Target,
  Award,
  RefreshCcw,
  ArrowUp,
  ArrowDown,
  Minus,
  DollarSign,
  Clock,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SupplierReferralStats,
  ReferralStatsProps,
} from '@/types/supplier-referrals';
import { ShimmerButton } from '@/components/magicui/shimmer-button';

/**
 * ReferralStats Component
 *
 * Displays real-time supplier referral statistics with conversion funnel,
 * achievement milestones, current rankings, and performance metrics.
 *
 * Features:
 * - Real-time metrics display with loading states
 * - Conversion funnel visualization
 * - Achievement progress tracking
 * - Ranking position highlighting
 * - Mobile-responsive design (375px+)
 * - Accessibility compliant (ARIA labels, keyboard nav)
 */
export const ReferralStats: React.FC<ReferralStatsProps> = ({
  stats,
  onRefresh,
  rankingData,
  isLoading = false,
  className,
}) => {
  // Calculate trend indicators
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { trend: 'neutral' as const, percentage: 0 };
    const change = ((current - previous) / previous) * 100;
    if (change > 5) return { trend: 'up' as const, percentage: change };
    if (change < -5)
      return { trend: 'down' as const, percentage: Math.abs(change) };
    return { trend: 'neutral' as const, percentage: Math.abs(change) };
  };

  // Format numbers for display
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format percentage
  const formatPercentage = (num: number) => `${num.toFixed(1)}%`;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100); // Assuming amount is in pence
  };

  // Referral pipeline stages
  const pipelineStages = [
    {
      name: 'Sent',
      value: stats.total_referrals_sent,
      color: 'bg-gray-100 text-gray-700',
      icon: Users,
      description: 'Referrals sent to suppliers',
    },
    {
      name: 'Clicked',
      value: stats.total_clicks,
      color: 'bg-blue-100 text-blue-700',
      icon: TrendingUp,
      description: 'Suppliers who clicked your link',
    },
    {
      name: 'Signed Up',
      value: stats.total_signups,
      color: 'bg-purple-100 text-purple-700',
      icon: Target,
      description: 'Suppliers who created accounts',
    },
    {
      name: 'Started Trial',
      value: stats.total_trials_started,
      color: 'bg-amber-100 text-amber-700',
      icon: Zap,
      description: 'Suppliers who started free trials',
    },
    {
      name: 'Converted',
      value: stats.total_conversions,
      color: 'bg-green-100 text-green-700',
      icon: Award,
      description: 'Suppliers who became paid subscribers',
    },
  ];

  // Key metrics for cards
  const keyMetrics = [
    {
      label: 'Total Rewards',
      value: formatCurrency(stats.total_rewards_earned),
      trend: calculateTrend(
        stats.current_month_stats.rewards_earned,
        stats.lifetime_stats.best_month_rewards,
      ),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Conversion Rate',
      value: formatPercentage(stats.conversion_rate),
      trend: calculateTrend(stats.conversion_rate, 5.0), // Assuming 5% average
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Avg. Time to Convert',
      value: `${stats.avg_time_to_conversion_days}d`,
      trend: calculateTrend(30 - stats.avg_time_to_conversion_days, 0), // Lower is better
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 rounded-xl h-24"></div>
            ))}
          </div>
          <div className="bg-gray-200 rounded-xl h-64 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-gray-200 rounded-xl h-20"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Your Referral Performance
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time statistics and conversion metrics
          </p>
        </div>

        <ShimmerButton
          onClick={onRefresh}
          className="shadow-lg hover:shadow-xl transition-shadow"
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh Stats
        </ShimmerButton>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {keyMetrics.map((metric, index) => {
          const TrendIcon =
            metric.trend.trend === 'up'
              ? ArrowUp
              : metric.trend.trend === 'down'
                ? ArrowDown
                : Minus;

          return (
            <Card key={index} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={cn('p-2 rounded-lg', metric.bgColor)}>
                    <metric.icon className={cn('h-5 w-5', metric.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {metric.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {metric.value}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <TrendIcon
                    className={cn(
                      'h-4 w-4',
                      metric.trend.trend === 'up'
                        ? 'text-green-600'
                        : metric.trend.trend === 'down'
                          ? 'text-red-600'
                          : 'text-gray-400',
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-medium',
                      metric.trend.trend === 'up'
                        ? 'text-green-600'
                        : metric.trend.trend === 'down'
                          ? 'text-red-600'
                          : 'text-gray-400',
                    )}
                  >
                    {metric.trend.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Accessibility label */}
              <span className="sr-only">
                {metric.label}: {metric.value}, trend {metric.trend.trend} by{' '}
                {metric.trend.percentage.toFixed(1)}%
              </span>
            </Card>
          );
        })}
      </div>

      {/* Current Rankings */}
      {rankingData && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            Your Current Rankings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  Category Rank
                </span>
                <Badge
                  variant={
                    rankingData.category_rank <= 5 ? 'success' : 'secondary'
                  }
                  className="text-sm"
                >
                  #{rankingData.category_rank} of{' '}
                  {rankingData.total_in_category}
                </Badge>
              </div>

              <Progress
                value={
                  (1 -
                    (rankingData.category_rank - 1) /
                      rankingData.total_in_category) *
                  100
                }
                className="h-2"
                aria-label={`Category rank ${rankingData.category_rank} out of ${rankingData.total_in_category}`}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  Overall Rank
                </span>
                <Badge
                  variant={
                    rankingData.overall_rank <= 10 ? 'success' : 'secondary'
                  }
                  className="text-sm"
                >
                  #{rankingData.overall_rank} of {rankingData.total_overall}
                </Badge>
              </div>

              <Progress
                value={
                  (1 -
                    (rankingData.overall_rank - 1) /
                      rankingData.total_overall) *
                  100
                }
                className="h-2"
                aria-label={`Overall rank ${rankingData.overall_rank} out of ${rankingData.total_overall}`}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Referral Pipeline */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Referral Conversion Pipeline
        </h3>

        {/* Desktop View */}
        <div className="hidden md:block">
          <div className="grid grid-cols-5 gap-4">
            {pipelineStages.map((stage, index) => {
              const Icon = stage.icon;
              const percentage =
                stats.total_referrals_sent > 0
                  ? (stage.value / stats.total_referrals_sent) * 100
                  : 0;

              return (
                <div key={stage.name} className="text-center">
                  <div
                    className={cn(
                      'mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3',
                      stage.color,
                    )}
                  >
                    <Icon className="h-8 w-8" />
                  </div>

                  <h4 className="font-medium text-gray-900 mb-1">
                    {stage.name}
                  </h4>

                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {formatNumber(stage.value)}
                  </p>

                  <p className="text-xs text-gray-500 mb-3">
                    {formatPercentage(percentage)}
                  </p>

                  <p className="text-xs text-gray-600 leading-tight">
                    {stage.description}
                  </p>

                  {/* Connection line */}
                  {index < pipelineStages.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gray-200 transform -translate-y-1/2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile View */}
        <div className="md:hidden space-y-4">
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;
            const percentage =
              stats.total_referrals_sent > 0
                ? (stage.value / stats.total_referrals_sent) * 100
                : 0;

            return (
              <div
                key={stage.name}
                className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
                    stage.color,
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-900">{stage.name}</h4>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatNumber(stage.value)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatPercentage(percentage)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Monthly Performance Comparison */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          This Month vs Lifetime Best
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">
              Referrals Sent
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.current_month_stats.referrals_sent}
            </p>
            <p className="text-xs text-gray-500">
              Best: {stats.lifetime_stats.best_month_conversions}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">
              Conversions
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.current_month_stats.conversions}
            </p>
            <p className="text-xs text-gray-500">
              Best: {stats.lifetime_stats.best_month_conversions}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Rewards</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.current_month_stats.rewards_earned)}
            </p>
            <p className="text-xs text-gray-500">
              Best: {formatCurrency(stats.lifetime_stats.best_month_rewards)}
            </p>
          </div>
        </div>

        {/* Activity Streak */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Activity Streak
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {stats.lifetime_stats.current_streak_days} days
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-600">
                Longest Streak
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {stats.lifetime_stats.longest_streak_days} days
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ReferralStats;
