'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  BarChartIcon,
  PieChartIcon,
  StarIcon,
  MessageSquareIcon,
} from 'lucide-react';

interface ReviewMetricsProps {
  supplierId: string;
  timeframe: '7d' | '30d' | '90d' | '1y';
}

interface MetricsData {
  totalReviews: number;
  averageRating: number;
  responseRate: number;
  platformBreakdown: Array<{
    platform: string;
    count: number;
    percentage: number;
  }>;
  ratingDistribution: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
  trendsData: Array<{
    period: string;
    reviews: number;
    rating: number;
    responseRate: number;
  }>;
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral';
    title: string;
    description: string;
    value?: string;
  }>;
}

export function ReviewMetrics({ supplierId, timeframe }: ReviewMetricsProps) {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'platforms' | 'ratings' | 'trends'
  >('overview');

  useEffect(() => {
    loadMetricsData();
  }, [supplierId, timeframe]);

  const loadMetricsData = async () => {
    setLoading(true);
    try {
      // In real implementation, this would fetch from your API
      // For now, using mock data that demonstrates the component structure

      await new Promise((resolve) => setTimeout(resolve, 800));

      setData({
        totalReviews: 127,
        averageRating: 4.8,
        responseRate: 67,
        platformBreakdown: [
          { platform: 'Google', count: 68, percentage: 54 },
          { platform: 'Facebook', count: 35, percentage: 27 },
          { platform: 'WeddingWire', count: 15, percentage: 12 },
          { platform: 'Yelp', count: 9, percentage: 7 },
        ],
        ratingDistribution: [
          { rating: 5, count: 89, percentage: 70 },
          { rating: 4, count: 28, percentage: 22 },
          { rating: 3, count: 7, percentage: 6 },
          { rating: 2, count: 2, percentage: 1 },
          { rating: 1, count: 1, percentage: 1 },
        ],
        trendsData: [
          { period: 'Week 1', reviews: 12, rating: 4.7, responseRate: 65 },
          { period: 'Week 2', reviews: 18, rating: 4.8, responseRate: 72 },
          { period: 'Week 3', reviews: 15, rating: 4.9, responseRate: 68 },
          { period: 'Week 4', reviews: 22, rating: 4.8, responseRate: 74 },
        ],
        insights: [
          {
            type: 'positive',
            title: 'Response Rate Improved',
            description: 'Your response rate increased by 12% this month',
            value: '+12%',
          },
          {
            type: 'positive',
            title: 'Rating Consistency',
            description:
              '94% of reviews are 4-5 stars showing consistent quality',
            value: '94%',
          },
          {
            type: 'neutral',
            title: 'Platform Distribution',
            description: 'Google Reviews dominate your review profile',
            value: '54%',
          },
          {
            type: 'negative',
            title: 'Review Volume',
            description:
              'Slight decrease in total reviews compared to last period',
            value: '-3%',
          },
        ],
      });
    } catch (error) {
      console.error('Error loading metrics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      Google: '🌟',
      Facebook: '👍',
      Yelp: '📝',
      WeddingWire: '💍',
      'The Knot': '🎗️',
    };
    return icons[platform as keyof typeof icons] || '⭐';
  };

  const getPlatformColor = (platform: string) => {
    const colors = {
      Google: 'bg-blue-500',
      Facebook: 'bg-blue-600',
      Yelp: 'bg-red-500',
      WeddingWire: 'bg-purple-500',
      'The Knot': 'bg-pink-500',
    };
    return colors[platform as keyof typeof colors] || 'bg-gray-500';
  };

  const getInsightColor = (type: string) => {
    const colors = {
      positive: 'text-success-700 bg-success-50 border-success-200',
      negative: 'text-red-700 bg-red-50 border-red-200',
      neutral: 'text-blue-700 bg-blue-50 border-blue-200',
    };
    return colors[type as keyof typeof colors];
  };

  const getInsightIcon = (type: string) => {
    return type === 'positive' ? (
      <TrendingUpIcon className="h-4 w-4" />
    ) : type === 'negative' ? (
      <TrendingDownIcon className="h-4 w-4" />
    ) : (
      <BarChartIcon className="h-4 w-4" />
    );
  };

  if (loading || !data) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xs">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Performance Analytics
        </h2>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChartIcon },
            { id: 'platforms', label: 'Platforms', icon: PieChartIcon },
            { id: 'ratings', label: 'Ratings', icon: StarIcon },
            { id: 'trends', label: 'Trends', icon: TrendingUpIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Insights */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Key Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2">
                        {getInsightIcon(insight.type)}
                        <div>
                          <h4 className="font-medium text-sm">
                            {insight.title}
                          </h4>
                          <p className="text-sm mt-1">{insight.description}</p>
                        </div>
                      </div>
                      {insight.value && (
                        <span className="font-semibold text-sm">
                          {insight.value}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Summary Statistics
              </h3>
              <div className="grid grid-cols-3 gap-6 bg-gray-50 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {data.totalReviews}
                  </p>
                  <p className="text-sm text-gray-600">Total Reviews</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {data.averageRating}
                    </p>
                    <StarIcon className="h-5 w-5 text-yellow-400 fill-current ml-1" />
                  </div>
                  <p className="text-sm text-gray-600">Average Rating</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {data.responseRate}%
                  </p>
                  <p className="text-sm text-gray-600">Response Rate</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Platforms Tab */}
        {activeTab === 'platforms' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Platform Breakdown
            </h3>
            <div className="space-y-3">
              {data.platformBreakdown.map((platform) => (
                <div
                  key={platform.platform}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">
                      {getPlatformIcon(platform.platform)}
                    </span>
                    <span className="font-medium text-gray-900">
                      {platform.platform}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getPlatformColor(platform.platform)}`}
                        style={{ width: `${platform.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12">
                      {platform.count} ({platform.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ratings Tab */}
        {activeTab === 'ratings' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Rating Distribution
            </h3>
            <div className="space-y-3">
              {data.ratingDistribution.reverse().map((rating) => (
                <div
                  key={rating.rating}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 w-8">
                      {rating.rating}
                    </span>
                    <div className="flex">
                      {[...Array(rating.rating)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className="h-4 w-4 text-yellow-400 fill-current"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 bg-yellow-400 rounded-full"
                        style={{ width: `${rating.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12">
                      {rating.count} ({rating.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Trends Over Time
            </h3>
            <div className="space-y-4">
              {data.trendsData.map((trend, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {trend.period}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Reviews: </span>
                      <span className="font-medium text-gray-900">
                        {trend.reviews}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Rating: </span>
                      <span className="font-medium text-gray-900">
                        {trend.rating}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Response Rate: </span>
                      <span className="font-medium text-gray-900">
                        {trend.responseRate}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
