'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Heart,
  Activity,
  Star,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { executiveMetricsService } from '@/lib/analytics/executiveMetrics';
import type {
  ExecutiveMetrics,
  TimeframeOption,
  MetricCard,
} from '@/types/analytics';

interface ExecutiveDashboardProps {
  className?: string;
}

export function ExecutiveDashboard({ className }: ExecutiveDashboardProps) {
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('month');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchMetrics = async (
    selectedTimeframe: TimeframeOption = timeframe,
  ) => {
    try {
      setLoading(true);
      setError(null);
      const data =
        await executiveMetricsService.getExecutiveMetrics(selectedTimeframe);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch executive metrics:', err);
      setError('Failed to load executive metrics. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
  };

  const handleTimeframeChange = async (newTimeframe: TimeframeOption) => {
    setTimeframe(newTimeframe);
    await fetchMetrics(newTimeframe);
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-GB').format(num);
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRevenueCards = (): MetricCard[] => {
    if (!metrics) return [];

    return [
      {
        title: 'Monthly Recurring Revenue',
        value: formatCurrency(metrics.revenue.mrr),
        change: metrics.revenue.mrrGrowth,
        trend:
          metrics.revenue.mrrGrowth > 0
            ? 'up'
            : metrics.revenue.mrrGrowth < 0
              ? 'down'
              : 'neutral',
      },
      {
        title: 'Annual Recurring Revenue',
        value: formatCurrency(metrics.revenue.arr),
        change: metrics.revenue.mrrGrowth, // Same trend as MRR
        trend:
          metrics.revenue.mrrGrowth > 0
            ? 'up'
            : metrics.revenue.mrrGrowth < 0
              ? 'down'
              : 'neutral',
      },
      {
        title: 'Average Revenue Per Vendor',
        value: formatCurrency(metrics.revenue.averageRevenuePer.vendor),
        format: 'currency',
      },
      {
        title: 'Customer Lifetime Value',
        value: formatCurrency(metrics.revenue.ltv),
        format: 'currency',
      },
    ];
  };

  const getUserGrowthCards = (): MetricCard[] => {
    if (!metrics) return [];

    return [
      {
        title: 'Total Wedding Vendors',
        value: formatNumber(metrics.userGrowth.totalUsers),
        change: metrics.userGrowth.growthRate,
        trend:
          metrics.userGrowth.growthRate > 0
            ? 'up'
            : metrics.userGrowth.growthRate < 0
              ? 'down'
              : 'neutral',
      },
      {
        title: `New Vendors (${timeframe})`,
        value: formatNumber(metrics.userGrowth.newUsers),
        format: 'number',
      },
      {
        title: 'Trial to Paid Conversion',
        value: formatPercentage(metrics.userGrowth.trialToConversionRate),
        format: 'percentage',
      },
      {
        title: 'Vendor Activation Rate',
        value: formatPercentage(metrics.userGrowth.activationRate),
        format: 'percentage',
      },
    ];
  };

  const getWeddingCards = (): MetricCard[] => {
    if (!metrics) return [];

    return [
      {
        title: 'Total Weddings Managed',
        value: formatNumber(metrics.weddings.totalWeddings),
        change: metrics.weddings.weddingsGrowthRate,
        trend:
          metrics.weddings.weddingsGrowthRate > 0
            ? 'up'
            : metrics.weddings.weddingsGrowthRate < 0
              ? 'down'
              : 'neutral',
      },
      {
        title: `New Weddings (${timeframe})`,
        value: formatNumber(metrics.weddings.newWeddings),
        format: 'number',
      },
      {
        title: 'Upcoming Weddings (90 days)',
        value: formatNumber(metrics.weddings.upcomingWeddings),
        format: 'number',
      },
      {
        title: 'Average Wedding Value',
        value: formatCurrency(metrics.weddings.averageWeddingValue),
        format: 'currency',
      },
    ];
  };

  const getEngagementCards = (): MetricCard[] => {
    if (!metrics) return [];

    return [
      {
        title: 'Monthly Active Vendors',
        value: formatNumber(metrics.engagement.monthlyActiveUsers),
        format: 'number',
      },
      {
        title: 'Daily Active Vendors',
        value: formatNumber(metrics.engagement.dailyActiveUsers),
        format: 'number',
      },
      {
        title: 'Vendor Engagement Rate',
        value: formatPercentage(metrics.engagement.engagementRate),
        format: 'percentage',
      },
      {
        title: `Forms Created (${timeframe})`,
        value: formatNumber(metrics.engagement.formsCreated),
        format: 'number',
      },
    ];
  };

  const getRetentionCards = (): MetricCard[] => {
    if (!metrics) return [];

    return [
      {
        title: 'Customer Retention Rate',
        value: formatPercentage(metrics.retention.customerRetentionRate),
        trend:
          metrics.retention.customerRetentionRate > 90
            ? 'up'
            : metrics.retention.customerRetentionRate < 80
              ? 'down'
              : 'neutral',
      },
      {
        title: 'Monthly Churn Rate',
        value: formatPercentage(metrics.retention.churnRate),
        trend:
          metrics.retention.churnRate < 5
            ? 'up'
            : metrics.retention.churnRate > 10
              ? 'down'
              : 'neutral',
      },
      {
        title: 'Net Promoter Score',
        value: formatNumber(metrics.retention.netPromoterScore),
        trend:
          metrics.retention.netPromoterScore > 50
            ? 'up'
            : metrics.retention.netPromoterScore < 30
              ? 'down'
              : 'neutral',
      },
      {
        title: 'Customer Satisfaction',
        value: formatPercentage(metrics.retention.customerSatisfaction),
        trend:
          metrics.retention.customerSatisfaction > 85
            ? 'up'
            : metrics.retention.customerSatisfaction < 75
              ? 'down'
              : 'neutral',
      },
    ];
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMetrics()}
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const timeframeOptions: { value: TimeframeOption; label: string }[] = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'year', label: 'Year' },
  ];

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Executive Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Wedding industry performance metrics and business intelligence
            {metrics?.lastUpdated && (
              <span className="block sm:inline sm:ml-2">
                Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {timeframeOptions.map((option) => (
              <Button
                key={option.value}
                variant={timeframe === option.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTimeframeChange(option.value)}
                className="px-3 py-1 text-xs"
                disabled={loading || refreshing}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Revenue Performance
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {getRevenueCards().map((card, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-gray-900">
                    {card.value}
                  </div>
                  {card.change !== undefined && (
                    <div
                      className={`flex items-center gap-1 ${getTrendColor(card.trend || 'neutral')}`}
                    >
                      {getTrendIcon(card.trend || 'neutral')}
                      <span className="text-sm font-medium">
                        {Math.abs(card.change).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* User Growth Metrics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Vendor Growth</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {getUserGrowthCards().map((card, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-gray-900">
                    {card.value}
                  </div>
                  {card.change !== undefined && (
                    <div
                      className={`flex items-center gap-1 ${getTrendColor(card.trend || 'neutral')}`}
                    >
                      {getTrendIcon(card.trend || 'neutral')}
                      <span className="text-sm font-medium">
                        {Math.abs(card.change).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Wedding Metrics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-pink-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Wedding Management
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {getWeddingCards().map((card, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-gray-900">
                    {card.value}
                  </div>
                  {card.change !== undefined && (
                    <div
                      className={`flex items-center gap-1 ${getTrendColor(card.trend || 'neutral')}`}
                    >
                      {getTrendIcon(card.trend || 'neutral')}
                      <span className="text-sm font-medium">
                        {Math.abs(card.change).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Engagement Metrics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Platform Engagement
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {getEngagementCards().map((card, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-gray-900">
                    {card.value}
                  </div>
                  {card.change !== undefined && (
                    <div
                      className={`flex items-center gap-1 ${getTrendColor(card.trend || 'neutral')}`}
                    >
                      {getTrendIcon(card.trend || 'neutral')}
                      <span className="text-sm font-medium">
                        {Math.abs(card.change).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Retention & Satisfaction Metrics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Customer Success
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {getRetentionCards().map((card, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-gray-900">
                    {card.value}
                  </div>
                  {card.trend && (
                    <div
                      className={`flex items-center gap-1 ${getTrendColor(card.trend)}`}
                    >
                      {getTrendIcon(card.trend)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Subscription Tier Distribution */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Vendor Distribution by Subscription Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(metrics.userGrowth.usersByTier).map(
                ([tier, count]) => (
                  <Badge
                    key={tier}
                    variant="outline"
                    className="px-3 py-1 text-sm font-medium"
                  >
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}: {count}{' '}
                    vendors
                  </Badge>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ExecutiveDashboard;
