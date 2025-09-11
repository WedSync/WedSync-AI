'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ZapIcon,
  ActivityIcon,
  InfoIcon,
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

interface UsageMonitorCardProps {
  currentUsage: UsageMetrics;
  subscriptionLimits: SubscriptionLimits;
  className?: string;
  onUpgradeClick?: () => void;
  onViewDetailsClick?: () => void;
  showActions?: boolean;
  compactMode?: boolean;
}

export default function UsageMonitorCard({
  currentUsage,
  subscriptionLimits,
  className = '',
  onUpgradeClick,
  onViewDetailsClick,
  showActions = true,
  compactMode = false,
}: UsageMonitorCardProps) {
  // Calculate usage statistics
  const monthlyUsagePercentage =
    subscriptionLimits.monthlyLimit > 0
      ? (currentUsage.totalRequests / subscriptionLimits.monthlyLimit) * 100
      : 0;

  const dailyUsagePercentage =
    subscriptionLimits.dailyLimit > 0
      ? (currentUsage.dailyRequests / subscriptionLimits.dailyLimit) * 100
      : 0;

  const remainingRequests = Math.max(
    0,
    subscriptionLimits.monthlyLimit - currentUsage.totalRequests,
  );
  const remainingDaily = Math.max(
    0,
    subscriptionLimits.dailyLimit - currentUsage.dailyRequests,
  );

  // Determine status based on usage
  const getUsageStatus = (): RateLimitStatus => {
    if (monthlyUsagePercentage >= 95 || dailyUsagePercentage >= 95)
      return RateLimitStatus.EXCEEDED;
    if (monthlyUsagePercentage >= 80 || dailyUsagePercentage >= 80)
      return RateLimitStatus.HIGH;
    if (monthlyUsagePercentage >= 60 || dailyUsagePercentage >= 60)
      return RateLimitStatus.MODERATE;
    return RateLimitStatus.SAFE;
  };

  const usageStatus = getUsageStatus();
  const statusColor = RATE_LIMIT_COLORS[usageStatus];

  // Wedding season adjustments
  const isWeddingSeason = isPeakWeddingSeason();
  const seasonalMultiplier = getSeasonalMultiplier();

  // Trend calculation (simplified - in real app would compare with previous period)
  const getTrendIcon = () => {
    if (currentUsage.hourlyRequests > currentUsage.dailyRequests / 24) {
      return <TrendingUpIcon className="w-4 h-4 text-orange-500" />;
    }
    return <TrendingDownIcon className="w-4 h-4 text-green-500" />;
  };

  const getStatusIcon = () => {
    switch (usageStatus) {
      case RateLimitStatus.SAFE:
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case RateLimitStatus.MODERATE:
        return <ActivityIcon className="w-5 h-5 text-blue-500" />;
      case RateLimitStatus.HIGH:
        return <AlertTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case RateLimitStatus.EXCEEDED:
        return <AlertTriangleIcon className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusMessage = (): string => {
    switch (usageStatus) {
      case RateLimitStatus.SAFE:
        return 'Usage within normal limits';
      case RateLimitStatus.MODERATE:
        return 'Moderate usage - monitor closely';
      case RateLimitStatus.HIGH:
        return 'High usage - consider upgrading';
      case RateLimitStatus.EXCEEDED:
        return 'Limits exceeded - upgrade required';
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
              <div className="w-20 mb-1">
                <Progress value={monthlyUsagePercentage} className="h-2" />
              </div>
              <p className="text-xs text-gray-500">
                {monthlyUsagePercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">Usage Monitor</CardTitle>
              <CardDescription>
                {subscriptionLimits.currentTier} Plan
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            style={{
              borderColor: statusColor,
              color: statusColor,
              backgroundColor: statusColor + '10',
            }}
          >
            {usageStatus}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Wedding Season Alert */}
        {isWeddingSeason && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <ZapIcon className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                Peak Wedding Season
              </span>
            </div>
            <p className="text-xs text-purple-600 mt-1">
              Traffic multiplier: {seasonalMultiplier}x normal levels
            </p>
          </div>
        )}

        {/* Status Message */}
        <div className="flex items-center gap-2">
          <InfoIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">{getStatusMessage()}</span>
          {getTrendIcon()}
        </div>

        {/* Monthly Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Monthly Usage</span>
            <span className="text-gray-600">
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
            <span>{monthlyUsagePercentage.toFixed(1)}% used</span>
            <span>{formatNumber(remainingRequests)} remaining</span>
          </div>
        </div>

        {/* Daily Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Daily Usage</span>
            <span className="text-gray-600">
              {formatNumber(currentUsage.dailyRequests)} /{' '}
              {formatNumber(subscriptionLimits.dailyLimit)}
            </span>
          </div>
          <Progress value={dailyUsagePercentage} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{dailyUsagePercentage.toFixed(1)}% used</span>
            <span>{formatNumber(remainingDaily)} remaining</span>
          </div>
        </div>

        {/* Usage Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">
              {formatNumber(currentUsage.hourlyRequests)}
            </p>
            <p className="text-xs text-gray-600">Hourly Requests</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">
              {currentUsage.averageResponseTime.toFixed(0)}ms
            </p>
            <p className="text-xs text-gray-600">Avg Response</p>
          </div>
        </div>

        {/* Error Rate */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium">Error Rate</p>
            <p className="text-xs text-gray-600">Last 24 hours</p>
          </div>
          <div className="text-right">
            <p
              className={`text-lg font-bold ${
                currentUsage.errorRate > 5
                  ? 'text-red-600'
                  : currentUsage.errorRate > 2
                    ? 'text-yellow-600'
                    : 'text-green-600'
              }`}
            >
              {currentUsage.errorRate.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Reset Information */}
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
          <ClockIcon className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-700">{getTimeUntilReset()}</span>
        </div>

        {/* Upgrade Recommendation */}
        {subscriptionLimits.upgradeRequired && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangleIcon className="w-4 h-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">
                Upgrade Recommended
              </span>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              You're approaching your limits. Upgrade to{' '}
              {subscriptionLimits.nextTier} for unlimited requests.
            </p>
            {showActions && (
              <Button size="sm" onClick={onUpgradeClick}>
                Upgrade to {subscriptionLimits.nextTier}
              </Button>
            )}
          </div>
        )}

        {/* Next Tier Preview */}
        {subscriptionLimits.nextTier && !subscriptionLimits.upgradeRequired && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800 mb-1">
              Next Tier: {subscriptionLimits.nextTier}
            </p>
            <p className="text-xs text-green-600">
              Get more requests and advanced features
            </p>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            {onViewDetailsClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewDetailsClick}
                className="flex-1"
              >
                View Details
              </Button>
            )}
            {subscriptionLimits.upgradeRequired && onUpgradeClick && (
              <Button size="sm" onClick={onUpgradeClick} className="flex-1">
                Upgrade Now
              </Button>
            )}
          </div>
        )}

        {/* Peak Usage Time */}
        {currentUsage.peakUsageTime && (
          <div className="text-xs text-gray-500 pt-2 border-t">
            Peak usage: {currentUsage.peakUsageTime.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
