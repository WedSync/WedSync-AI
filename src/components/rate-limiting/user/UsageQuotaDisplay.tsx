'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart3Icon,
  ClockIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  RefreshCwIcon,
  ArrowUpIcon,
  CalendarIcon,
  ZapIcon,
  HeartIcon,
  InfoIcon,
  CheckCircleIcon,
} from 'lucide-react';
import {
  UsageMetrics,
  SubscriptionLimits,
  RateLimitStatus,
  SubscriptionTier,
  RATE_LIMIT_COLORS,
  isPeakWeddingSeason,
  getSeasonalMultiplier,
} from '@/types/rate-limiting';

interface UsageQuotaDisplayProps {
  currentUsage: UsageMetrics;
  subscriptionLimits: SubscriptionLimits;
  showTrends?: boolean;
  showWeddingContext?: boolean;
  onUpgrade?: () => void;
  onRefresh?: () => void;
  realTimeUpdates?: boolean;
  className?: string;
  compactMode?: boolean;
}

export default function UsageQuotaDisplay({
  currentUsage,
  subscriptionLimits,
  showTrends = false,
  showWeddingContext = true,
  onUpgrade,
  onRefresh,
  realTimeUpdates = false,
  className = '',
  compactMode = false,
}: UsageQuotaDisplayProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const isWeddingSeason = isPeakWeddingSeason();
  const seasonalMultiplier = getSeasonalMultiplier();

  // Calculate usage percentages
  const monthlyUsagePercentage =
    subscriptionLimits.monthlyLimit > 0
      ? Math.min(
          (currentUsage.totalRequests / subscriptionLimits.monthlyLimit) * 100,
          100,
        )
      : 0;

  const dailyUsagePercentage =
    subscriptionLimits.dailyLimit > 0
      ? Math.min(
          (currentUsage.dailyRequests / subscriptionLimits.dailyLimit) * 100,
          100,
        )
      : 0;

  const remainingMonthly = Math.max(
    0,
    subscriptionLimits.monthlyLimit - currentUsage.totalRequests,
  );
  const remainingDaily = Math.max(
    0,
    subscriptionLimits.dailyLimit - currentUsage.dailyRequests,
  );

  // Determine status
  const getUsageStatus = (): RateLimitStatus => {
    const maxPercentage = Math.max(
      monthlyUsagePercentage,
      dailyUsagePercentage,
    );

    if (maxPercentage >= 95) return RateLimitStatus.EXCEEDED;
    if (maxPercentage >= 80) return RateLimitStatus.HIGH;
    if (maxPercentage >= 60) return RateLimitStatus.MODERATE;
    return RateLimitStatus.SAFE;
  };

  const usageStatus = getUsageStatus();
  const statusColor = RATE_LIMIT_COLORS[usageStatus];

  // Real-time updates
  useEffect(() => {
    if (!realTimeUpdates) return;

    const interval = setInterval(() => {
      setLastUpdated(new Date());
      // In real implementation, this would trigger data refresh
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [realTimeUpdates]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh?.();
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false);
      setLastUpdated(new Date());
    }, 1000);
  };

  const getStatusMessage = (): string => {
    switch (usageStatus) {
      case RateLimitStatus.SAFE:
        return "You're well within your usage limits";
      case RateLimitStatus.MODERATE:
        return "Normal usage - you're on track";
      case RateLimitStatus.HIGH:
        return 'High usage - consider upgrading soon';
      case RateLimitStatus.EXCEEDED:
        return 'Usage limits exceeded - upgrade recommended';
    }
  };

  const getStatusIcon = () => {
    switch (usageStatus) {
      case RateLimitStatus.SAFE:
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case RateLimitStatus.MODERATE:
        return <BarChart3Icon className="w-5 h-5 text-blue-500" />;
      case RateLimitStatus.HIGH:
        return <AlertTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case RateLimitStatus.EXCEEDED:
        return <AlertTriangleIcon className="w-5 h-5 text-red-500" />;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getTimeUntilReset = (): string => {
    const days = subscriptionLimits.daysUntilReset;
    if (days === 0) return 'Resets today';
    if (days === 1) return 'Resets tomorrow';
    return `Resets in ${days} days`;
  };

  const getProjectedUsage = (): number => {
    if (subscriptionLimits.daysUntilReset === 0)
      return currentUsage.totalRequests;

    const daysInMonth = 30;
    const daysElapsed = daysInMonth - subscriptionLimits.daysUntilReset;
    const dailyAverage =
      daysElapsed > 0 ? currentUsage.totalRequests / daysElapsed : 0;

    return dailyAverage * daysInMonth;
  };

  const projectedUsage = getProjectedUsage();
  const projectedPercentage =
    subscriptionLimits.monthlyLimit > 0
      ? Math.min((projectedUsage / subscriptionLimits.monthlyLimit) * 100, 100)
      : 0;

  if (compactMode) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <p className="font-medium text-gray-900">
                  {subscriptionLimits.currentTier}
                </p>
                <p className="text-sm text-gray-600">
                  {formatNumber(currentUsage.totalRequests)} /{' '}
                  {formatNumber(subscriptionLimits.monthlyLimit)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant="outline"
                style={{
                  borderColor: statusColor,
                  color: statusColor,
                  backgroundColor: statusColor + '10',
                }}
              >
                {monthlyUsagePercentage.toFixed(0)}%
              </Badge>
              <div className="w-20 mt-1">
                <Progress value={monthlyUsagePercentage} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">Usage & Quotas</CardTitle>
              <CardDescription>
                {subscriptionLimits.currentTier} Plan
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {realTimeUpdates && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">Live</span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCwIcon
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>

        {/* Wedding Season Alert */}
        {showWeddingContext && isWeddingSeason && (
          <Alert className="border-purple-200 bg-purple-50">
            <HeartIcon className="h-4 w-4 text-purple-600" />
            <AlertDescription>
              Peak wedding season is active! Your plan includes{' '}
              {seasonalMultiplier}x request multiplier.
            </AlertDescription>
          </Alert>
        )}

        {/* Status Message */}
        <div
          className="p-3 rounded-lg border"
          style={{
            borderColor: statusColor + '40',
            backgroundColor: statusColor + '10',
          }}
        >
          <p className="text-sm font-medium" style={{ color: statusColor }}>
            {getStatusMessage()}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Monthly Usage */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Monthly Usage</h3>
            <Badge variant="outline">
              {monthlyUsagePercentage.toFixed(1)}% used
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Current usage</span>
              <span>
                {formatNumber(currentUsage.totalRequests)} /{' '}
                {formatNumber(subscriptionLimits.monthlyLimit)}
              </span>
            </div>

            <Progress
              value={monthlyUsagePercentage}
              className="h-3"
              style={{
                backgroundColor: statusColor + '20',
              }}
            />

            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatNumber(remainingMonthly)} remaining</span>
              <span>{getTimeUntilReset()}</span>
            </div>
          </div>
        </div>

        {/* Daily Usage */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Today's Usage</h3>
            <Badge variant="outline">
              {dailyUsagePercentage.toFixed(1)}% of daily limit
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Today</span>
              <span>
                {formatNumber(currentUsage.dailyRequests)} /{' '}
                {formatNumber(subscriptionLimits.dailyLimit)}
              </span>
            </div>

            <Progress value={dailyUsagePercentage} className="h-2" />

            <div className="flex justify-between text-xs text-gray-500">
              <span>{formatNumber(remainingDaily)} remaining today</span>
              <span>Resets at midnight</span>
            </div>
          </div>
        </div>

        {/* Usage Trends */}
        {showTrends && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Usage Trends</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="text-lg font-bold text-gray-900">
                    {currentUsage.hourlyRequests}
                  </span>
                  {currentUsage.hourlyRequests >
                  currentUsage.dailyRequests / 24 ? (
                    <TrendingUpIcon className="w-4 h-4 text-orange-500" />
                  ) : (
                    <TrendingDownIcon className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-gray-600">Requests this hour</p>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-gray-900">
                  {currentUsage.averageResponseTime.toFixed(0)}ms
                </p>
                <p className="text-xs text-gray-600">Avg response time</p>
              </div>
            </div>

            {/* Projected Usage */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-800">
                  Projected Monthly Usage
                </span>
                <span className="text-sm text-blue-600">
                  {projectedPercentage.toFixed(0)}%
                </span>
              </div>
              <Progress value={projectedPercentage} className="h-2 mb-1" />
              <p className="text-xs text-blue-600">
                Based on current usage: ~{formatNumber(projectedUsage)} requests
                this month
              </p>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Performance</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangleIcon
                  className={`w-4 h-4 ${
                    currentUsage.errorRate > 5
                      ? 'text-red-500'
                      : currentUsage.errorRate > 2
                        ? 'text-yellow-500'
                        : 'text-green-500'
                  }`}
                />
                <span className="font-medium">
                  {currentUsage.errorRate.toFixed(2)}%
                </span>
              </div>
              <p className="text-xs text-gray-600">Error rate</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <ClockIcon
                  className={`w-4 h-4 ${
                    currentUsage.averageResponseTime > 1000
                      ? 'text-red-500'
                      : currentUsage.averageResponseTime > 500
                        ? 'text-yellow-500'
                        : 'text-green-500'
                  }`}
                />
                <span className="font-medium">
                  {currentUsage.averageResponseTime.toFixed(0)}ms
                </span>
              </div>
              <p className="text-xs text-gray-600">Response time</p>
            </div>
          </div>
        </div>

        {/* Upgrade Recommendation */}
        {subscriptionLimits.upgradeRequired && (
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangleIcon className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-800">
                Upgrade Recommended
              </span>
            </div>

            <p className="text-sm text-yellow-700 mb-3">
              You're approaching your limits. Upgrade to{' '}
              {subscriptionLimits.nextTier} for more capacity and features.
            </p>

            {projectedPercentage > 90 && (
              <p className="text-xs text-orange-700 mb-3">
                ⚠️ Your projected usage ({projectedPercentage.toFixed(0)}%)
                suggests you'll exceed limits this month.
              </p>
            )}

            {onUpgrade && (
              <Button size="sm" onClick={onUpgrade} className="w-full">
                <ArrowUpIcon className="w-4 h-4 mr-2" />
                Upgrade to {subscriptionLimits.nextTier}
              </Button>
            )}
          </div>
        )}

        {/* Wedding Season Benefits */}
        {showWeddingContext &&
          isWeddingSeason &&
          subscriptionLimits.currentTier !== SubscriptionTier.FREE && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ZapIcon className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-purple-800">
                  Wedding Season Bonus Active
                </span>
              </div>
              <p className="text-sm text-purple-700">
                Your plan includes {seasonalMultiplier}x request multiplier
                during peak wedding season. That's{' '}
                {formatNumber(
                  subscriptionLimits.monthlyLimit * (seasonalMultiplier - 1),
                )}{' '}
                bonus requests!
              </p>
            </div>
          )}

        {/* Next Tier Preview */}
        {subscriptionLimits.nextTier && !subscriptionLimits.upgradeRequired && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpIcon className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800">
                Next Tier: {subscriptionLimits.nextTier}
              </span>
            </div>
            <p className="text-sm text-green-700">
              Get unlimited requests, advanced features, and priority support.
            </p>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
          <InfoIcon className="w-3 h-3" />
          <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          {realTimeUpdates && <span>• Auto-refreshing</span>}
        </div>
      </CardContent>
    </Card>
  );
}
