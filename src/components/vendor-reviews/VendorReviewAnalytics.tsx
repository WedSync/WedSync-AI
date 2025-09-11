'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  Star,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Award,
  Calendar,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';

interface VendorMetrics {
  vendor_id: string;
  vendor_name: string;
  vendor_category: string;
  total_reviews: number;
  average_overall_rating: number;
  average_communication_rating: number;
  average_quality_rating: number;
  average_professionalism_rating: number;
  average_value_rating: number;
  average_reliability_rating: number;
  recommendation_percentage: number;
  hire_again_percentage: number;
  response_rate: number;
  reviews_last_30_days: number;
  reviews_last_90_days: number;
  reviews_last_year: number;
  rating_distribution: {
    rating_1_count: number;
    rating_2_count: number;
    rating_3_count: number;
    rating_4_count: number;
    rating_5_count: number;
  };
  last_review_date: string;
}

interface ReviewTrend {
  date: string;
  reviews_count: number;
  average_rating: number;
}

interface CategoryBreakdown {
  category: string;
  total_reviews: number;
  average_rating: number;
  recommendation_rate: number;
}

export function VendorReviewAnalytics() {
  const supabase = createClientComponentClient();
  const [metrics, setMetrics] = useState<VendorMetrics[]>([]);
  const [trends, setTrends] = useState<ReviewTrend[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    '30d' | '90d' | '1y' | 'all'
  >('90d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'recent'>(
    'rating',
  );

  useEffect(() => {
    loadAnalytics();
  }, [selectedTimeRange, selectedCategory]);

  const loadAnalytics = async () => {
    setLoading(true);

    try {
      // Load vendor performance metrics
      const { data: metricsData } = await supabase
        .from('vendor_performance_metrics')
        .select(
          `
          *,
          vendor:vendors!vendor_performance_metrics_vendor_id_fkey(
            business_name,
            category
          )
        `,
        )
        .order('average_overall_rating', { ascending: false });

      if (metricsData) {
        const formattedMetrics = metricsData.map((item) => ({
          vendor_id: item.vendor_id,
          vendor_name: item.vendor?.business_name || 'Unknown',
          vendor_category: item.vendor?.category || 'Uncategorized',
          total_reviews: item.total_reviews || 0,
          average_overall_rating: parseFloat(
            item.average_overall_rating || '0',
          ),
          average_communication_rating: parseFloat(
            item.average_communication_rating || '0',
          ),
          average_quality_rating: parseFloat(
            item.average_quality_rating || '0',
          ),
          average_professionalism_rating: parseFloat(
            item.average_professionalism_rating || '0',
          ),
          average_value_rating: parseFloat(item.average_value_rating || '0'),
          average_reliability_rating: parseFloat(
            item.average_reliability_rating || '0',
          ),
          recommendation_percentage: parseFloat(
            item.recommendation_percentage || '0',
          ),
          hire_again_percentage: parseFloat(item.hire_again_percentage || '0'),
          response_rate: parseFloat(item.vendor_response_rate || '0'),
          reviews_last_30_days: item.reviews_last_30_days || 0,
          reviews_last_90_days: item.reviews_last_90_days || 0,
          reviews_last_year: item.reviews_last_year || 0,
          rating_distribution: {
            rating_1_count: item.rating_1_count || 0,
            rating_2_count: item.rating_2_count || 0,
            rating_3_count: item.rating_3_count || 0,
            rating_4_count: item.rating_4_count || 0,
            rating_5_count: item.rating_5_count || 0,
          },
          last_review_date: item.last_review_date,
        }));

        setMetrics(formattedMetrics);
      }

      // Load review trends
      const trendsQuery = supabase
        .from('vendor_reviews')
        .select('created_at, overall_rating')
        .eq('moderation_status', 'approved');

      if (selectedTimeRange !== 'all') {
        const daysAgo =
          selectedTimeRange === '30d'
            ? 30
            : selectedTimeRange === '90d'
              ? 90
              : 365;
        trendsQuery.gte(
          'created_at',
          new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        );
      }

      const { data: trendsData } = await trendsQuery;

      if (trendsData) {
        // Group by date and calculate metrics
        const trendsByDate = trendsData.reduce((acc, review) => {
          const date = new Date(review.created_at).toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = { reviews: [], total: 0, sum: 0 };
          }
          acc[date].reviews.push(review);
          acc[date].total += 1;
          acc[date].sum += review.overall_rating;
          return acc;
        }, {} as any);

        const formattedTrends = Object.entries(trendsByDate)
          .map(([date, data]: [string, any]) => ({
            date,
            reviews_count: data.total,
            average_rating: data.sum / data.total,
          }))
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );

        setTrends(formattedTrends);
      }

      // Load category breakdown
      const { data: categoryBreakdown } = await supabase
        .from('vendor_review_analytics')
        .select('*');

      if (categoryBreakdown) {
        setCategoryData(
          categoryBreakdown.map((item) => ({
            category: item.vendor_category,
            total_reviews: item.total_reviews,
            average_rating: parseFloat(item.avg_rating || '0'),
            recommendation_rate: parseFloat(item.recommend_percentage || '0'),
          })),
        );
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort metrics
  const filteredMetrics = metrics
    .filter(
      (m) =>
        selectedCategory === 'all' ||
        m.vendor_category.toLowerCase() === selectedCategory.toLowerCase(),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.average_overall_rating - a.average_overall_rating;
        case 'reviews':
          return b.total_reviews - a.total_reviews;
        case 'recent':
          return (
            new Date(b.last_review_date).getTime() -
            new Date(a.last_review_date).getTime()
          );
        default:
          return 0;
      }
    });

  // Calculate overall statistics
  const totalReviews = metrics.reduce((sum, m) => sum + m.total_reviews, 0);
  const averageRating =
    metrics.reduce(
      (sum, m) => sum + m.average_overall_rating * m.total_reviews,
      0,
    ) / totalReviews || 0;
  const recommendationRate =
    metrics.reduce(
      (sum, m) => sum + m.recommendation_percentage * m.total_reviews,
      0,
    ) / totalReviews || 0;

  // Rating distribution data for pie chart
  const ratingDistribution = [
    {
      name: '5 Stars',
      value: metrics.reduce(
        (sum, m) => sum + m.rating_distribution.rating_5_count,
        0,
      ),
      color: '#10B981',
    },
    {
      name: '4 Stars',
      value: metrics.reduce(
        (sum, m) => sum + m.rating_distribution.rating_4_count,
        0,
      ),
      color: '#84CC16',
    },
    {
      name: '3 Stars',
      value: metrics.reduce(
        (sum, m) => sum + m.rating_distribution.rating_3_count,
        0,
      ),
      color: '#F59E0B',
    },
    {
      name: '2 Stars',
      value: metrics.reduce(
        (sum, m) => sum + m.rating_distribution.rating_2_count,
        0,
      ),
      color: '#EF4444',
    },
    {
      name: '1 Star',
      value: metrics.reduce(
        (sum, m) => sum + m.rating_distribution.rating_1_count,
        0,
      ),
      color: '#DC2626',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Vendor Review Analytics
        </h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadAnalytics}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button className="flex items-center px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Range
            </label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="all">All time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              {Array.from(new Set(metrics.map((m) => m.vendor_category))).map(
                (category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="rating">Highest Rating</option>
              <option value="reviews">Most Reviews</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <MessageSquare className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {totalReviews.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Total Reviews</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-warning-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {averageRating.toFixed(1)}
              </p>
              <p className="text-sm text-gray-600">Average Rating</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-success-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {recommendationRate.toFixed(0)}%
              </p>
              <p className="text-sm text-gray-600">Recommendation Rate</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900">
                {metrics.filter((m) => m.total_reviews > 0).length}
              </p>
              <p className="text-sm text-gray-600">Active Vendors</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Review Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <YAxis yAxisId="reviews" orientation="left" />
              <YAxis yAxisId="rating" orientation="right" />
              <Tooltip
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Area
                yAxisId="reviews"
                type="monotone"
                dataKey="reviews_count"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.3}
                name="Reviews"
              />
              <Line
                yAxisId="rating"
                type="monotone"
                dataKey="average_rating"
                stroke="#F59E0B"
                strokeWidth={2}
                name="Avg Rating"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Rating Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Rating Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ratingDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {ratingDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Performance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Performance by Category
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={categoryData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis yAxisId="reviews" orientation="left" />
            <YAxis yAxisId="rating" orientation="right" domain={[0, 5]} />
            <Tooltip />
            <Bar
              yAxisId="reviews"
              dataKey="total_reviews"
              fill="#3B82F6"
              name="Total Reviews"
            />
            <Bar
              yAxisId="rating"
              dataKey="average_rating"
              fill="#F59E0B"
              name="Avg Rating"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Performing Vendors
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reviews
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recommendation Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMetrics.slice(0, 10).map((vendor) => (
                <tr key={vendor.vendor_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {vendor.vendor_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      {vendor.vendor_category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-warning-500 mr-1" />
                      <span className="text-sm font-medium text-gray-900">
                        {vendor.average_overall_rating.toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vendor.total_reviews}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vendor.recommendation_percentage.toFixed(0)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {vendor.response_rate.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
