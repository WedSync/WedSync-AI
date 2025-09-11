'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Clock,
  Share2,
  MousePointer,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Calendar,
  Target,
  Download,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { format, subDays, parseISO, startOfDay, endOfDay } from 'date-fns';
import type {
  ArticleAnalytics as ArticleAnalyticsType,
  Article,
  EngagementEvent,
  TrafficSource,
  DeviceBreakdown,
  GeographicData,
} from '@/types/articles';

interface ArticleAnalyticsProps {
  article?: Article;
  articles?: Article[];
  viewMode?: 'single' | 'overview' | 'comparison';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface AnalyticsMetrics {
  totalViews: number;
  uniqueViews: number;
  avgTimeSpent: number;
  avgScrollDepth: number;
  totalShares: number;
  bounceRate: number;
  engagementRate: number;
  conversionRate: number;
}

interface TimeSeriesData {
  date: string;
  views: number;
  uniqueViews: number;
  timeSpent: number;
  shares: number;
  engagement: number;
}

export function ArticleAnalytics({
  article,
  articles = [],
  viewMode = 'overview',
  dateRange = {
    start: subDays(new Date(), 30),
    end: new Date(),
  },
}: ArticleAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ArticleAnalyticsType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<
    'views' | 'engagement' | 'time' | 'shares'
  >('views');
  const [comparisonArticles, setComparisonArticles] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'custom'>(
    '30d',
  );

  // Generate mock analytics data
  const generateMockAnalytics = (articleId: string): ArticleAnalyticsType[] => {
    const data: ArticleAnalyticsType[] = [];
    const days = Math.floor(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    for (let i = 0; i < days; i++) {
      const date = format(subDays(dateRange.end, i), 'yyyy-MM-dd');
      const baseViews = Math.floor(Math.random() * 100) + 50;
      const uniqueViews = Math.floor(baseViews * (0.7 + Math.random() * 0.2));

      data.push({
        article_id: articleId,
        date,
        views: baseViews,
        unique_views: uniqueViews,
        time_spent_seconds: Math.floor(Math.random() * 300) + 120,
        scroll_depth_percentage: Math.floor(Math.random() * 40) + 60,
        shares: Math.floor(Math.random() * 20),
        engagement_events: [
          { type: 'scroll', timestamp: new Date().toISOString(), value: 50 },
          {
            type: 'time_spent',
            timestamp: new Date().toISOString(),
            value: 180,
          },
          { type: 'share', timestamp: new Date().toISOString() },
        ],
        traffic_sources: [
          {
            source: 'direct',
            medium: 'none',
            sessions: Math.floor(baseViews * 0.4),
            bounce_rate: 0.3,
          },
          {
            source: 'google',
            medium: 'organic',
            sessions: Math.floor(baseViews * 0.3),
            bounce_rate: 0.25,
          },
          {
            source: 'social',
            medium: 'social',
            sessions: Math.floor(baseViews * 0.2),
            bounce_rate: 0.4,
          },
          {
            source: 'email',
            medium: 'email',
            sessions: Math.floor(baseViews * 0.1),
            bounce_rate: 0.15,
          },
        ],
        device_breakdown: {
          desktop: Math.floor(baseViews * 0.6),
          mobile: Math.floor(baseViews * 0.3),
          tablet: Math.floor(baseViews * 0.1),
        },
        geographic_data: [
          { country: 'United States', sessions: Math.floor(baseViews * 0.7) },
          { country: 'Canada', sessions: Math.floor(baseViews * 0.15) },
          { country: 'United Kingdom', sessions: Math.floor(baseViews * 0.1) },
          { country: 'Australia', sessions: Math.floor(baseViews * 0.05) },
        ],
      });
    }

    return data.reverse(); // Most recent first
  };

  // Calculate aggregate metrics
  const aggregateMetrics = useMemo((): AnalyticsMetrics => {
    if (analytics.length === 0) {
      return {
        totalViews: 0,
        uniqueViews: 0,
        avgTimeSpent: 0,
        avgScrollDepth: 0,
        totalShares: 0,
        bounceRate: 0,
        engagementRate: 0,
        conversionRate: 0,
      };
    }

    const totalViews = analytics.reduce((sum, item) => sum + item.views, 0);
    const uniqueViews = analytics.reduce(
      (sum, item) => sum + item.unique_views,
      0,
    );
    const totalTimeSpent = analytics.reduce(
      (sum, item) => sum + item.time_spent_seconds,
      0,
    );
    const totalScrollDepth = analytics.reduce(
      (sum, item) => sum + item.scroll_depth_percentage,
      0,
    );
    const totalShares = analytics.reduce((sum, item) => sum + item.shares, 0);

    const avgTimeSpent = totalTimeSpent / analytics.length;
    const avgScrollDepth = totalScrollDepth / analytics.length;

    // Calculate bounce rate from traffic sources
    const allSources = analytics.flatMap((item) => item.traffic_sources);
    const totalSessions = allSources.reduce(
      (sum, source) => sum + source.sessions,
      0,
    );
    const weightedBounceRate = allSources.reduce(
      (sum, source) => sum + source.bounce_rate * source.sessions,
      0,
    );
    const bounceRate =
      totalSessions > 0 ? weightedBounceRate / totalSessions : 0;

    // Calculate engagement rate (simplified)
    const engagementRate =
      avgTimeSpent > 120 && avgScrollDepth > 50
        ? Math.min(100, (avgTimeSpent / 300) * 50 + (avgScrollDepth / 100) * 50)
        : 0;

    // Calculate conversion rate (articles leading to contact/inquiry)
    const conversionRate = Math.min(10, engagementRate / 10); // Simplified conversion

    return {
      totalViews,
      uniqueViews,
      avgTimeSpent,
      avgScrollDepth,
      totalShares,
      bounceRate: bounceRate * 100,
      engagementRate,
      conversionRate,
    };
  }, [analytics]);

  // Time series data for charts
  const timeSeriesData = useMemo((): TimeSeriesData[] => {
    return analytics.map((item) => ({
      date: item.date,
      views: item.views,
      uniqueViews: item.unique_views,
      timeSpent: item.time_spent_seconds,
      shares: item.shares,
      engagement:
        (item.time_spent_seconds / 300) * 50 +
        (item.scroll_depth_percentage / 100) * 50,
    }));
  }, [analytics]);

  // Device breakdown aggregate
  const deviceBreakdown = useMemo(() => {
    if (analytics.length === 0) return { desktop: 0, mobile: 0, tablet: 0 };

    return analytics.reduce(
      (acc, item) => ({
        desktop: acc.desktop + item.device_breakdown.desktop,
        mobile: acc.mobile + item.device_breakdown.mobile,
        tablet: acc.tablet + item.device_breakdown.tablet,
      }),
      { desktop: 0, mobile: 0, tablet: 0 },
    );
  }, [analytics]);

  // Traffic sources aggregate
  const trafficSources = useMemo(() => {
    const sources = new Map<
      string,
      { sessions: number; bounce_rate: number }
    >();

    analytics.forEach((item) => {
      item.traffic_sources.forEach((source) => {
        const key = `${source.source}-${source.medium}`;
        const existing = sources.get(key) || { sessions: 0, bounce_rate: 0 };
        sources.set(key, {
          sessions: existing.sessions + source.sessions,
          bounce_rate:
            (existing.bounce_rate * existing.sessions +
              source.bounce_rate * source.sessions) /
            (existing.sessions + source.sessions),
        });
      });
    });

    return Array.from(sources.entries())
      .map(([key, data]) => ({
        source: key.split('-')[0],
        medium: key.split('-')[1],
        sessions: data.sessions,
        bounce_rate: data.bounce_rate,
      }))
      .sort((a, b) => b.sessions - a.sessions);
  }, [analytics]);

  // Load analytics data
  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      if (viewMode === 'single' && article) {
        const data = generateMockAnalytics(article.id);
        setAnalytics(data);
      } else if (viewMode === 'overview') {
        // For overview, load analytics for all articles
        const allData = articles.flatMap((art) =>
          generateMockAnalytics(art.id),
        );
        setAnalytics(allData);
      } else if (viewMode === 'comparison') {
        // Load analytics for comparison articles
        const comparisonData = comparisonArticles.flatMap((artId) =>
          generateMockAnalytics(artId),
        );
        setAnalytics(comparisonData);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update date range based on time range selection
  useEffect(() => {
    const now = new Date();
    let start: Date;

    switch (timeRange) {
      case '7d':
        start = subDays(now, 7);
        break;
      case '30d':
        start = subDays(now, 30);
        break;
      case '90d':
        start = subDays(now, 90);
        break;
      default:
        start = dateRange.start;
    }

    if (timeRange !== 'custom') {
      dateRange.start = start;
      dateRange.end = now;
    }
  }, [timeRange]);

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadAnalytics();
  }, [article, articles, viewMode, comparisonArticles, dateRange]);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getMetricColor = (metric: string): string => {
    const colors = {
      views: 'text-blue-600 bg-blue-50 border-blue-200',
      engagement: 'text-green-600 bg-green-50 border-green-200',
      time: 'text-purple-600 bg-purple-50 border-purple-200',
      shares: 'text-orange-600 bg-orange-50 border-orange-200',
    };
    return colors[metric as keyof typeof colors] || colors.views;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <BarChart3 className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {viewMode === 'single'
                  ? `Analytics: ${article?.title}`
                  : 'Article Analytics Dashboard'}
              </h3>
              <p className="text-sm text-gray-500">
                Content performance and engagement insights
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="custom">Custom range</option>
            </select>

            <button
              onClick={loadAnalytics}
              disabled={isLoading}
              className="btn-sm px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Total Views
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {aggregateMetrics.totalViews.toLocaleString()}
            </div>
            <div className="text-xs text-blue-700 mt-1">
              {aggregateMetrics.uniqueViews.toLocaleString()} unique
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Engagement Rate
              </span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {Math.round(aggregateMetrics.engagementRate)}%
            </div>
            <div className="text-xs text-green-700 mt-1">
              {Math.round(aggregateMetrics.avgScrollDepth)}% avg scroll
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                Avg Time Spent
              </span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {formatDuration(Math.round(aggregateMetrics.avgTimeSpent))}
            </div>
            <div className="text-xs text-purple-700 mt-1">
              {Math.round(aggregateMetrics.bounceRate)}% bounce rate
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center space-x-2 mb-2">
              <Share2 className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                Total Shares
              </span>
            </div>
            <div className="text-2xl font-bold text-orange-900">
              {aggregateMetrics.totalShares.toLocaleString()}
            </div>
            <div className="text-xs text-orange-700 mt-1">
              {Math.round(aggregateMetrics.conversionRate)}% conversion
            </div>
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-primary-600" />
            Performance Trends
          </h4>

          <div className="flex items-center space-x-2">
            {(['views', 'engagement', 'time', 'shares'] as const).map(
              (metric) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    selectedMetric === metric
                      ? getMetricColor(metric)
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Simple Chart Representation */}
        <div className="h-64 flex items-end space-x-1 p-4 bg-gray-50 rounded-lg">
          {timeSeriesData.slice(0, 30).map((data, index) => {
            const maxValue = Math.max(
              ...timeSeriesData.map((d) => d[selectedMetric]),
            );
            const height = (data[selectedMetric] / maxValue) * 100;

            return (
              <div
                key={data.date}
                className="flex-1 bg-primary-600 rounded-t hover:bg-primary-700 cursor-pointer transition-colors"
                style={{ height: `${Math.max(4, height)}%` }}
                title={`${format(parseISO(data.date), 'MMM d')}: ${data[selectedMetric]}`}
              />
            );
          })}
        </div>

        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{format(dateRange.start, 'MMM d')}</span>
          <span>{format(dateRange.end, 'MMM d')}</span>
        </div>
      </div>

      {/* Traffic Sources & Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <Globe className="h-4 w-4 mr-2 text-primary-600" />
            Traffic Sources
          </h4>

          <div className="space-y-3">
            {trafficSources.slice(0, 6).map((source, index) => {
              const totalSessions = trafficSources.reduce(
                (sum, s) => sum + s.sessions,
                0,
              );
              const percentage = (source.sessions / totalSessions) * 100;

              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        source.source === 'direct'
                          ? 'bg-blue-500'
                          : source.source === 'google'
                            ? 'bg-green-500'
                            : source.source === 'social'
                              ? 'bg-purple-500'
                              : 'bg-orange-500'
                      }`}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {source.source}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">
                        ({source.medium})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {source.sessions.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round(percentage)}%
                      </div>
                    </div>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-primary-600 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <Smartphone className="h-4 w-4 mr-2 text-primary-600" />
            Device Breakdown
          </h4>

          <div className="space-y-4">
            {[
              {
                type: 'desktop',
                icon: Monitor,
                count: deviceBreakdown.desktop,
                color: 'bg-blue-500',
              },
              {
                type: 'mobile',
                icon: Smartphone,
                count: deviceBreakdown.mobile,
                color: 'bg-green-500',
              },
              {
                type: 'tablet',
                icon: Tablet,
                count: deviceBreakdown.tablet,
                color: 'bg-purple-500',
              },
            ].map(({ type, icon: Icon, count, color }) => {
              const total =
                deviceBreakdown.desktop +
                deviceBreakdown.mobile +
                deviceBreakdown.tablet;
              const percentage = total > 0 ? (count / total) * 100 : 0;

              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${color.replace('bg-', 'bg-').replace('-500', '-50')}`}
                    >
                      <Icon
                        className={`h-4 w-4 ${color.replace('bg-', 'text-')}`}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {type}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {count.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round(percentage)}%
                      </div>
                    </div>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Geographic Locations */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-900 mb-3">
              Top Locations
            </h5>
            <div className="space-y-2">
              {analytics.length > 0 &&
                analytics[0].geographic_data
                  .slice(0, 4)
                  .map((location, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-700">{location.country}</span>
                      <span className="text-gray-900 font-medium">
                        {location.sessions}
                      </span>
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </div>

      {/* Export Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-md font-semibold text-gray-900">
              Export Analytics
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              Download comprehensive analytics reports
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button className="btn-sm px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>CSV</span>
            </button>
            <button className="btn-sm px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>PDF Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading analytics data...</span>
        </div>
      )}
    </div>
  );
}
