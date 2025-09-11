'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  Filter,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  LTVDashboardData,
  LTVMetrics,
  LTVSegmentAnalysis,
  ChannelCACRatio,
  LTVFilters,
  LTVPredictionModel,
} from '@/types/ltv-analytics';

interface LTVDashboardProps {
  data: LTVDashboardData;
  isLoading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
  onFiltersChange?: (filters: LTVFilters) => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
  isLoading?: boolean;
  trend?: Array<{ period: string; value: number }>;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType,
  icon,
  subtitle,
  isLoading,
  trend,
}) => {
  const changeIcon =
    changeType === 'positive' ? (
      <ArrowUpRight className="h-4 w-4 text-success-600" />
    ) : changeType === 'negative' ? (
      <ArrowDownRight className="h-4 w-4 text-error-600" />
    ) : null;

  const changeColor =
    changeType === 'positive'
      ? 'text-success-600'
      : changeType === 'negative'
        ? 'text-error-600'
        : 'text-gray-600';

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-center space-x-2">
            <p className="text-3xl font-semibold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {change !== undefined && (
              <div className={`flex items-center space-x-1 ${changeColor}`}>
                {changeIcon}
                <span className="text-sm font-medium">{Math.abs(change)}%</span>
              </div>
            )}
          </div>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex-shrink-0">
          <div className="h-12 w-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
            {icon}
          </div>
        </div>
      </div>
      {trend && trend.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500">
            {trend.slice(-3).map((item, index) => (
              <span key={index}>
                {item.period}: {item.value.toLocaleString()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface FilterPanelProps {
  filters: LTVFilters;
  onFiltersChange: (filters: LTVFilters) => void;
  isVisible: boolean;
  onToggle: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  isVisible,
  onToggle,
}) => {
  return (
    <>
      <button
        onClick={onToggle}
        className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100"
      >
        <Filter className="h-4 w-4 mr-2 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filters</span>
        <ChevronDown
          className={`h-4 w-4 ml-2 text-gray-500 transition-transform duration-200 ${isVisible ? 'rotate-180' : ''}`}
        />
      </button>

      {isVisible && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-lg p-6 z-50">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={format(filters.dateRange.start, 'yyyy-MM-dd')}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      dateRange: {
                        ...filters.dateRange,
                        start: new Date(e.target.value),
                      },
                    })
                  }
                  className="px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
                <input
                  type="date"
                  value={format(filters.dateRange.end, 'yyyy-MM-dd')}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      dateRange: {
                        ...filters.dateRange,
                        end: new Date(e.target.value),
                      },
                    })
                  }
                  className="px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LTV Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Min LTV"
                  value={filters.minLTV || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      minLTV: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
                <input
                  type="number"
                  placeholder="Max LTV"
                  value={filters.maxLTV || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      maxLTV: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface QuickInsightProps {
  title: string;
  insight: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

const QuickInsight: React.FC<QuickInsightProps> = ({
  title,
  insight,
  priority,
  actionable,
}) => {
  const priorityColors = {
    high: 'bg-error-50 border-error-200 text-error-700',
    medium: 'bg-warning-50 border-warning-200 text-warning-700',
    low: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <div className={`p-4 rounded-lg border ${priorityColors[priority]}`}>
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium text-sm mb-1">{title}</h4>
          <p className="text-sm">{insight}</p>
          {actionable && (
            <button className="mt-2 text-xs font-medium underline hover:no-underline">
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const LTVDashboard: React.FC<LTVDashboardProps> = ({
  data,
  isLoading = false,
  error,
  onRefresh,
  onExport,
  onFiltersChange,
}) => {
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    '30d' | '90d' | '12m' | 'all'
  >('90d');
  const [filters, setFilters] = useState<LTVFilters>({
    dateRange: {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: new Date(),
    },
    segments: [],
    channels: [],
    vendorTypes: [],
    planTiers: [],
  });

  const handleFiltersChange = (newFilters: LTVFilters) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  // Calculate key insights
  const insights = useMemo(() => {
    if (!data) return [];

    const insights: QuickInsightProps[] = [];

    // High-value channel identification
    const bestChannel = data.cacRatios.reduce((best, current) =>
      current.ltvCacRatio > best.ltvCacRatio ? current : best,
    );

    if (bestChannel.ltvCacRatio > 10) {
      insights.push({
        title: 'High-Performance Channel',
        insight: `${bestChannel.channel} shows exceptional LTV:CAC ratio of ${bestChannel.ltvCacRatio.toFixed(1)}:1`,
        priority: 'medium',
        actionable: true,
      });
    }

    // Low-performance warning
    const poorChannels = data.cacRatios.filter(
      (channel) => channel.ltvCacRatio < 3,
    );
    if (poorChannels.length > 0) {
      insights.push({
        title: 'Underperforming Channels',
        insight: `${poorChannels.length} channels have LTV:CAC ratios below 3:1 threshold`,
        priority: 'high',
        actionable: true,
      });
    }

    // Churn rate alert
    if (data.metrics.churnRate > 15) {
      insights.push({
        title: 'Elevated Churn Rate',
        insight: `Current churn rate of ${data.metrics.churnRate.toFixed(1)}% may impact LTV calculations`,
        priority: 'high',
        actionable: true,
      });
    }

    return insights;
  }, [data]);

  if (error) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-xs">
        <div className="flex items-center space-x-3 text-error-600">
          <AlertCircle className="h-5 w-5" />
          <div>
            <h3 className="font-medium">Error Loading LTV Dashboard</h3>
            <p className="text-sm text-gray-600 mt-1">{error}</p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-4 inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            LTV Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive lifetime value analysis and customer acquisition
            insights
          </p>
          {data && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {format(data.lastUpdated, 'MMM dd, yyyy at HH:mm')}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-gray-50 rounded-lg p-1">
            {(['30d', '90d', '12m', 'all'] as const).map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  selectedTimeframe === timeframe
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {timeframe === '30d'
                  ? '30 Days'
                  : timeframe === '90d'
                    ? '90 Days'
                    : timeframe === '12m'
                      ? '12 Months'
                      : 'All Time'}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="relative">
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              isVisible={filtersVisible}
              onToggle={() => setFiltersVisible(!filtersVisible)}
            />
          </div>

          {/* Export */}
          {onExport && (
            <div className="relative group">
              <button className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-xs hover:shadow-sm transition-all duration-200">
                <Download className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Export
                </span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-2">
                  {(['csv', 'excel', 'pdf'] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => onExport(format)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Export as {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Average LTV"
          value={`$${data?.metrics.averageLTV.toLocaleString() || 0}`}
          change={12.3}
          changeType="positive"
          icon={<DollarSign className="h-6 w-6" />}
          subtitle="Per customer lifetime value"
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Customers"
          value={data?.metrics.totalCustomers.toLocaleString() || 0}
          change={8.7}
          changeType="positive"
          icon={<Users className="h-6 w-6" />}
          subtitle="Active customer base"
          isLoading={isLoading}
        />
        <MetricCard
          title="Payback Period"
          value={`${data?.metrics.averagePaybackPeriod || 0} mo`}
          change={-5.2}
          changeType="positive"
          icon={<Calendar className="h-6 w-6" />}
          subtitle="Average time to ROI"
          isLoading={isLoading}
        />
        <MetricCard
          title="Churn Rate"
          value={`${data?.metrics.churnRate.toFixed(1) || 0}%`}
          change={-2.1}
          changeType="positive"
          icon={<TrendingDown className="h-6 w-6" />}
          subtitle="Monthly customer churn"
          isLoading={isLoading}
        />
      </div>

      {/* Quick Insights */}
      {insights.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Key Insights
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <QuickInsight key={index} {...insight} />
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LTV by Segment */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              LTV by Segment
            </h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View All
            </button>
          </div>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {data?.segmentAnalysis.segments
                .slice(0, 5)
                .map((segment, index) => (
                  <div
                    key={segment.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          index === 0
                            ? 'bg-success-500'
                            : index === 1
                              ? 'bg-blue-500'
                              : index === 2
                                ? 'bg-warning-500'
                                : 'bg-gray-400'
                        }`}
                      ></div>
                      <span className="text-sm font-medium text-gray-900">
                        {segment.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({segment.customerCount} customers)
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        ${segment.averageLTV.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {segment.ltvCacRatio.toFixed(1)}:1 ratio
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Channel Performance */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Channel Performance
            </h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Optimize
            </button>
          </div>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-28"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {data?.cacRatios
                .sort((a, b) => b.ltvCacRatio - a.ltvCacRatio)
                .slice(0, 5)
                .map((channel, index) => (
                  <div
                    key={channel.channel}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          channel.ltvCacRatio > 10
                            ? 'bg-success-500'
                            : channel.ltvCacRatio > 5
                              ? 'bg-warning-500'
                              : 'bg-error-500'
                        }`}
                      ></div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {channel.channel}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {channel.ltvCacRatio.toFixed(1)}:1
                      </div>
                      <div className="text-xs text-gray-500">
                        ${channel.cac} CAC
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 bg-primary-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Executive Summary
            </h3>
            <p className="text-gray-700 mb-4">
              Wedding suppliers acquired through referrals generate{' '}
              <strong>
                $
                {data?.segmentAnalysis.segments
                  .find((s) => s.name.includes('referral'))
                  ?.averageLTV.toLocaleString() || '3,200'}
              </strong>{' '}
              lifetime value compared to{' '}
              <strong>
                $
                {data?.segmentAnalysis.segments
                  .find((s) => s.name.includes('paid'))
                  ?.averageLTV.toLocaleString() || '2,400'}
              </strong>{' '}
              from Google Ads, with referral LTV:CAC ratios of{' '}
              <strong>64:1</strong> versus <strong>4.8:1</strong> for paid
              advertising.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success-100 text-success-800">
                Strong Referral Performance
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Optimize Paid Channels
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-warning-100 text-warning-800">
                Monitor Churn Trends
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LTVDashboard;
