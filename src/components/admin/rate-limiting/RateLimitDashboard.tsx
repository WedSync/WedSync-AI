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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ActivityIcon,
  AlertTriangleIcon,
  BarChart3Icon,
  ShieldIcon,
  TrendingUpIcon,
  UsersIcon,
  RefreshCwIcon,
  WifiIcon,
} from 'lucide-react';
import {
  RateLimitMetrics,
  RateViolation,
  TierLimits,
  RateLimitStatus,
  RATE_LIMIT_COLORS,
  isPeakWeddingSeason,
  getSeasonalMultiplier,
} from '@/types/rate-limiting';

interface RateLimitDashboardProps {
  rateLimitMetrics: RateLimitMetrics[];
  violationAlerts: RateViolation[];
  subscriptionTierLimits: TierLimits[];
  realTimeUpdates: boolean;
  onRefresh?: () => void;
}

export default function RateLimitDashboard({
  rateLimitMetrics,
  violationAlerts,
  subscriptionTierLimits,
  realTimeUpdates,
  onRefresh,
}: RateLimitDashboardProps) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting'
  >('connected');

  // Calculate dashboard statistics
  const totalUsers = rateLimitMetrics.length;
  const activeViolations = violationAlerts.filter(
    (v) => new Date().getTime() - v.timestamp.getTime() < 3600000, // Last hour
  ).length;

  const statusDistribution = rateLimitMetrics.reduce(
    (acc, metric) => {
      acc[metric.status] = (acc[metric.status] || 0) + 1;
      return acc;
    },
    {} as Record<RateLimitStatus, number>,
  );

  const averageUsagePercentage =
    rateLimitMetrics.length > 0
      ? rateLimitMetrics.reduce(
          (sum, metric) =>
            sum + (metric.requestsUsed / metric.requestsAllowed) * 100,
          0,
        ) / rateLimitMetrics.length
      : 0;

  // Wedding season context
  const isWeddingSeason = isPeakWeddingSeason();
  const seasonalMultiplier = getSeasonalMultiplier();
  const weddingContextMetrics = rateLimitMetrics.filter(
    (m) => m.weddingContext,
  );

  // Real-time updates simulation
  useEffect(() => {
    if (!realTimeUpdates) return;

    const interval = setInterval(() => {
      setLastUpdated(new Date());
      // Simulate WebSocket connection status changes
      setConnectionStatus((prev) =>
        prev === 'connected' ? 'connected' : 'connected',
      );
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [realTimeUpdates]);

  const handleRefresh = () => {
    setConnectionStatus('connecting');
    onRefresh?.();
    setTimeout(() => {
      setConnectionStatus('connected');
      setLastUpdated(new Date());
    }, 1000);
  };

  const getStatusColor = (status: RateLimitStatus): string => {
    return RATE_LIMIT_COLORS[status];
  };

  const getStatusIcon = (status: RateLimitStatus) => {
    switch (status) {
      case RateLimitStatus.SAFE:
        return <ShieldIcon className="w-4 h-4" />;
      case RateLimitStatus.MODERATE:
        return <ActivityIcon className="w-4 h-4" />;
      case RateLimitStatus.HIGH:
        return <AlertTriangleIcon className="w-4 h-4" />;
      case RateLimitStatus.EXCEEDED:
        return <AlertTriangleIcon className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Rate Limiting Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor API usage, violations, and system health across all wedding
            suppliers
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <WifiIcon
              className={`w-4 h-4 ${
                connectionStatus === 'connected'
                  ? 'text-green-500'
                  : connectionStatus === 'connecting'
                    ? 'text-yellow-500'
                    : 'text-red-500'
              }`}
            />
            <span className="text-sm text-gray-600 capitalize">
              {connectionStatus}
            </span>
          </div>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={connectionStatus === 'connecting'}
          >
            <RefreshCwIcon
              className={`w-4 h-4 mr-2 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Wedding Season Alert */}
      {isWeddingSeason && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="w-5 h-5 text-yellow-600" />
            <span className="font-semibold text-yellow-800">
              Peak Wedding Season Active
            </span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            Traffic multiplier: {seasonalMultiplier}x normal levels. Monitor for
            increased API usage.
          </p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalUsers.toLocaleString()}
                </p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Violations
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {activeViolations}
                </p>
              </div>
              <AlertTriangleIcon className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Average Usage
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {averageUsagePercentage.toFixed(1)}%
                </p>
              </div>
              <BarChart3Icon className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Wedding Context
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {weddingContextMetrics.length}
                </p>
              </div>
              <TrendingUpIcon className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limit Status Distribution</CardTitle>
          <CardDescription>
            Current status breakdown across all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(statusDistribution).map(([status, count]) => (
              <div key={status} className="text-center">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center"
                  style={{
                    backgroundColor:
                      getStatusColor(status as RateLimitStatus) + '20',
                  }}
                >
                  <div
                    style={{ color: getStatusColor(status as RateLimitStatus) }}
                  >
                    {getStatusIcon(status as RateLimitStatus)}
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600 capitalize">
                  {status.toLowerCase()}
                </p>
                <p className="text-xl font-bold text-gray-900">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="tiers">Subscription Tiers</TabsTrigger>
          <TabsTrigger value="wedding">Wedding Context</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Rate Limit Activity</CardTitle>
                <CardDescription>
                  Latest 10 users approaching or exceeding limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rateLimitMetrics
                    .filter((metric) => metric.status !== RateLimitStatus.SAFE)
                    .slice(0, 10)
                    .map((metric) => {
                      const usagePercentage =
                        (metric.requestsUsed / metric.requestsAllowed) * 100;
                      return (
                        <div
                          key={metric.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: getStatusColor(metric.status),
                                color: getStatusColor(metric.status),
                              }}
                            >
                              {metric.subscriptionTier}
                            </Badge>
                            <div>
                              <p className="font-medium text-gray-900">
                                {metric.endpoint}
                              </p>
                              <p className="text-sm text-gray-600">
                                {metric.requestsUsed.toLocaleString()} /{' '}
                                {metric.requestsAllowed.toLocaleString()}{' '}
                                requests
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Progress
                              value={usagePercentage}
                              className="w-20 mb-1"
                            />
                            <p className="text-xs text-gray-600">
                              {usagePercentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Real-time monitoring status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      WebSocket Connection
                    </span>
                    <Badge
                      variant={
                        connectionStatus === 'connected'
                          ? 'default'
                          : 'destructive'
                      }
                    >
                      {connectionStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Updated</span>
                    <span className="text-sm text-gray-600">
                      {lastUpdated.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Auto Refresh</span>
                    <Badge variant={realTimeUpdates ? 'default' : 'secondary'}>
                      {realTimeUpdates ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Wedding Season</span>
                    <Badge variant={isWeddingSeason ? 'default' : 'secondary'}>
                      {isWeddingSeason ? 'Peak Season' : 'Normal'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="violations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Violations</CardTitle>
              <CardDescription>
                Latest rate limit violations requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {violationAlerts.slice(0, 20).map((violation) => (
                  <div
                    key={violation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangleIcon className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {violation.endpoint}
                        </p>
                        <p className="text-sm text-gray-600">
                          {violation.requestsAttempted} requests attempted,{' '}
                          {violation.requestsAllowed} allowed
                        </p>
                        <p className="text-xs text-gray-500">
                          {violation.timestamp.toLocaleString()} • Retry in{' '}
                          {violation.retryAfter}s
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">
                      {violation.violationType}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptionTierLimits.map((tierLimit) => (
              <Card key={tierLimit.tier}>
                <CardHeader>
                  <CardTitle>{tierLimit.tier}</CardTitle>
                  <CardDescription>${tierLimit.price}/month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Monthly Requests</p>
                      <p className="text-lg font-bold">
                        {tierLimit.monthlyRequestLimit.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Rate Limit</p>
                      <p className="text-lg font-bold">
                        {tierLimit.rateLimitPerMinute}/min
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Wedding Season Multiplier
                      </p>
                      <p className="text-lg font-bold">
                        {tierLimit.weddingSeasonMultiplier}x
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="wedding" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Wedding Industry Context</CardTitle>
              <CardDescription>
                Rate limiting patterns specific to wedding suppliers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weddingContextMetrics.map((metric) => (
                  <div key={metric.id} className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-purple-900">
                          {metric.endpoint}
                        </p>
                        <p className="text-sm text-purple-700">
                          Context:{' '}
                          {metric.weddingContext?.contextType.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-purple-600">
                          Seasonal Multiplier:{' '}
                          {metric.weddingContext?.seasonalMultiplier}x
                          {metric.weddingContext?.isPeakSeason &&
                            ' (Peak Season)'}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-purple-300 text-purple-700"
                      >
                        {metric.weddingContext?.urgency}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
