'use client';

import React, { useMemo, useState } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Heart,
  MessageCircle,
  Clock,
  DollarSign,
  Award,
  TrendingUp,
  TrendingDown,
  Target,
  Smile,
  Frown,
  Meh,
  Users,
  Camera,
  MapPin,
  Calendar,
} from 'lucide-react';

import {
  SatisfactionData,
  SatisfactionMetrics,
  SatisfactionCategory,
  ReviewBreakdown,
  WEDDING_COLORS,
  formatPercentage,
  formatDate,
  CHART_ANIMATIONS,
} from './types';

interface ClientSatisfactionRadarProps {
  data: SatisfactionData[];
  historicalData?: SatisfactionData[];
  height?: number;
  showComparison?: boolean;
  showTrends?: boolean;
  showReviewBreakdown?: boolean;
  showCategoryDetails?: boolean;
  onCategoryClick?: (category: SatisfactionCategory) => void;
  onScoreHover?: (score: number, category: SatisfactionCategory) => void;
  className?: string;
}

const CATEGORY_ICONS: Record<SatisfactionCategory, any> = {
  communication: MessageCircle,
  timeliness: Clock,
  value: DollarSign,
  quality: Star,
  professionalism: Award,
  overall: Heart,
};

const CATEGORY_LABELS: Record<SatisfactionCategory, string> = {
  communication: 'Communication',
  timeliness: 'Timeliness',
  value: 'Value for Money',
  quality: 'Service Quality',
  professionalism: 'Professionalism',
  overall: 'Overall Experience',
};

const SATISFACTION_COLORS = {
  excellent: '#10b981',
  good: '#3b82f6',
  average: '#f59e0b',
  poor: '#ef4444',
  terrible: '#991b1b',
};

const SATISFACTION_ICONS = {
  excellent: Smile,
  good: Smile,
  average: Meh,
  poor: Frown,
  terrible: Frown,
};

const CustomRadarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const IconComponent = CATEGORY_ICONS[label as SatisfactionCategory];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 min-w-64"
    >
      <div className="flex items-center gap-2 mb-3">
        <IconComponent className="h-4 w-4 text-wedding-primary" />
        <p className="font-semibold text-gray-900">
          {CATEGORY_LABELS[label as SatisfactionCategory]}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Current Score:</span>
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= data[label]
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="font-medium text-gray-900">{data[label]}/5</span>
          </div>
        </div>

        {data.historical && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Previous:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600">
                {data.historical[label]}/5
              </span>
              {data[label] > data.historical[label] ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : data[label] < data.historical[label] ? (
                <TrendingDown className="h-3 w-3 text-red-500" />
              ) : null}
            </div>
          </div>
        )}

        {data.reviewCount && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Based on:</span>
            <span className="font-medium text-gray-900">
              {data.reviewCount[label]} reviews
            </span>
          </div>
        )}

        {data.trends && data.trends[label] && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Trend:</span>
              <div className="flex items-center gap-1">
                {data.trends[label].direction === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    data.trends[label].direction === 'up'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatPercentage(Math.abs(data.trends[label].change))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const CategoryScoreCard = ({
  category,
  score,
  historicalScore,
  reviewCount,
  trend,
  isActive,
  onClick,
}: {
  category: SatisfactionCategory;
  score: number;
  historicalScore?: number;
  reviewCount?: number;
  trend?: { direction: 'up' | 'down'; change: number };
  isActive: boolean;
  onClick: () => void;
}) => {
  const IconComponent = CATEGORY_ICONS[category];
  const improvement = historicalScore ? score - historicalScore : 0;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-4 rounded-lg border transition-all duration-200 text-left w-full ${
        isActive
          ? 'border-wedding-primary bg-wedding-primary/5 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IconComponent className="h-5 w-5 text-wedding-primary" />
          <h4 className="font-medium text-gray-900 text-sm">
            {CATEGORY_LABELS[category]}
          </h4>
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span
              className={`text-xs font-medium ${
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatPercentage(Math.abs(trend.change))}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-3 w-3 ${
                  star <= score
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="font-bold text-lg text-gray-900">
            {score.toFixed(1)}
          </span>
        </div>

        {improvement !== 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">vs. previous</span>
            <span
              className={`font-medium ${
                improvement > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {improvement > 0 ? '+' : ''}
              {improvement.toFixed(1)}
            </span>
          </div>
        )}

        {reviewCount && (
          <p className="text-xs text-gray-500">{reviewCount} reviews</p>
        )}
      </div>
    </motion.button>
  );
};

const ReviewBreakdownChart = ({
  data,
  className = '',
}: {
  data: ReviewBreakdown[];
  className?: string;
}) => {
  const chartData = [
    {
      name: '5 Stars',
      value: data.find((d) => d.rating === 5)?.count || 0,
      color: SATISFACTION_COLORS.excellent,
    },
    {
      name: '4 Stars',
      value: data.find((d) => d.rating === 4)?.count || 0,
      color: SATISFACTION_COLORS.good,
    },
    {
      name: '3 Stars',
      value: data.find((d) => d.rating === 3)?.count || 0,
      color: SATISFACTION_COLORS.average,
    },
    {
      name: '2 Stars',
      value: data.find((d) => d.rating === 2)?.count || 0,
      color: SATISFACTION_COLORS.poor,
    },
    {
      name: '1 Star',
      value: data.find((d) => d.rating === 1)?.count || 0,
      color: SATISFACTION_COLORS.terrible,
    },
  ];

  const totalReviews = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      className={`bg-white p-4 rounded-lg border border-gray-200 ${className}`}
    >
      <h4 className="font-medium text-gray-900 mb-4">Review Distribution</h4>

      <div className="space-y-2">
        {chartData.reverse().map((item, index) => {
          const percentage =
            totalReviews > 0 ? (item.value / totalReviews) * 100 : 0;

          return (
            <div key={item.name} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-16">{item.name}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span className="text-sm font-medium w-8 text-right">
                {item.value}
              </span>
              <span className="text-xs text-gray-500 w-10 text-right">
                {percentage.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Reviews:</span>
          <span className="font-medium text-gray-900">{totalReviews}</span>
        </div>
      </div>
    </div>
  );
};

const SatisfactionSummary = ({
  metrics,
  className = '',
}: {
  metrics: SatisfactionMetrics;
  className?: string;
}) => {
  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
        <div className="flex items-center justify-center mb-2">
          <div className="p-2 bg-yellow-100 rounded-full">
            <Star className="h-5 w-5 text-yellow-600" />
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {metrics.averageScore.toFixed(1)}
        </p>
        <p className="text-sm text-gray-600">Average Score</p>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
        <div className="flex items-center justify-center mb-2">
          <div className="p-2 bg-blue-100 rounded-full">
            <MessageCircle className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {metrics.totalReviews}
        </p>
        <p className="text-sm text-gray-600">Total Reviews</p>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
        <div className="flex items-center justify-center mb-2">
          <div className="p-2 bg-green-100 rounded-full">
            <Target className="h-5 w-5 text-green-600" />
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {formatPercentage(metrics.recommendationRate)}
        </p>
        <p className="text-sm text-gray-600">Would Recommend</p>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
        <div className="flex items-center justify-center mb-2">
          <div
            className={`p-2 rounded-full ${
              metrics.trend.direction === 'up'
                ? 'bg-green-100'
                : metrics.trend.direction === 'down'
                  ? 'bg-red-100'
                  : 'bg-gray-100'
            }`}
          >
            {metrics.trend.direction === 'up' ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : metrics.trend.direction === 'down' ? (
              <TrendingDown className="h-5 w-5 text-red-600" />
            ) : (
              <Target className="h-5 w-5 text-gray-600" />
            )}
          </div>
        </div>
        <p
          className={`text-2xl font-bold ${
            metrics.trend.direction === 'up'
              ? 'text-green-600'
              : metrics.trend.direction === 'down'
                ? 'text-red-600'
                : 'text-gray-900'
          }`}
        >
          {metrics.trend.direction === 'up'
            ? '+'
            : metrics.trend.direction === 'down'
              ? '-'
              : ''}
          {formatPercentage(Math.abs(metrics.trend.change))}
        </p>
        <p className="text-sm text-gray-600">Trend</p>
      </div>
    </div>
  );
};

export const ClientSatisfactionRadar: React.FC<
  ClientSatisfactionRadarProps
> = ({
  data,
  historicalData = [],
  height = 400,
  showComparison = false,
  showTrends = true,
  showReviewBreakdown = true,
  showCategoryDetails = true,
  onCategoryClick,
  onScoreHover,
  className = '',
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<SatisfactionCategory | null>(null);

  const {
    radarData,
    categories,
    satisfactionMetrics,
    reviewBreakdown,
    categoryTrends,
  } = useMemo(() => {
    const categories = Object.keys(CATEGORY_LABELS) as SatisfactionCategory[];

    const currentPeriod = data[data.length - 1] || {};
    const previousPeriod = historicalData[historicalData.length - 1] || {};

    const radarData = categories.map((category) => ({
      category,
      current: currentPeriod[category] || 0,
      previous: previousPeriod[category] || 0,
      fullMark: 5,
    }));

    const satisfactionMetrics: SatisfactionMetrics = {
      averageScore:
        categories.reduce((sum, cat) => sum + (currentPeriod[cat] || 0), 0) /
        categories.length,
      totalReviews: currentPeriod.totalReviews || 0,
      recommendationRate: currentPeriod.recommendationRate || 0,
      trend: {
        direction: 'up', // Calculate based on comparison
        change: 0.05, // Mock value
      },
    };

    // Calculate trend direction
    if (historicalData.length > 0) {
      const previousAvg =
        categories.reduce((sum, cat) => sum + (previousPeriod[cat] || 0), 0) /
        categories.length;
      const change =
        (satisfactionMetrics.averageScore - previousAvg) / previousAvg;
      satisfactionMetrics.trend = {
        direction: change > 0.01 ? 'up' : change < -0.01 ? 'down' : 'stable',
        change: Math.abs(change),
      };
    }

    const reviewBreakdown: ReviewBreakdown[] = [
      { rating: 5, count: Math.floor(satisfactionMetrics.totalReviews * 0.6) },
      { rating: 4, count: Math.floor(satisfactionMetrics.totalReviews * 0.25) },
      { rating: 3, count: Math.floor(satisfactionMetrics.totalReviews * 0.1) },
      { rating: 2, count: Math.floor(satisfactionMetrics.totalReviews * 0.03) },
      { rating: 1, count: Math.floor(satisfactionMetrics.totalReviews * 0.02) },
    ];

    const categoryTrends = categories.reduce(
      (acc, category) => {
        const current = currentPeriod[category] || 0;
        const previous = previousPeriod[category] || 0;
        const change = previous > 0 ? (current - previous) / previous : 0;

        acc[category] = {
          direction: change > 0.01 ? 'up' : change < -0.01 ? 'down' : 'stable',
          change: Math.abs(change),
        };
        return acc;
      },
      {} as Record<
        SatisfactionCategory,
        { direction: 'up' | 'down' | 'stable'; change: number }
      >,
    );

    return {
      radarData,
      categories,
      satisfactionMetrics,
      reviewBreakdown,
      categoryTrends,
    };
  }, [data, historicalData]);

  const handleCategoryClick = (category: SatisfactionCategory) => {
    const newCategory = selectedCategory === category ? null : category;
    setSelectedCategory(newCategory);
    onCategoryClick?.(category);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Client Satisfaction</h3>

        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showComparison}
              onChange={(e) => setShowComparison(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-gray-600">Show Comparison</span>
          </label>
        </div>
      </div>

      {/* Summary Metrics */}
      <SatisfactionSummary metrics={satisfactionMetrics} />

      {/* Main Radar Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart
            data={radarData}
            margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
          >
            <PolarGrid gridType="polygon" stroke="#f0f0f0" />

            <PolarAngleAxis
              dataKey="category"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(value) =>
                CATEGORY_LABELS[value as SatisfactionCategory]
              }
            />

            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickCount={6}
            />

            <Tooltip content={<CustomRadarTooltip />} />

            <Radar
              name="Current Period"
              dataKey="current"
              stroke={WEDDING_COLORS.primary}
              fill={WEDDING_COLORS.primary}
              fillOpacity={0.1}
              strokeWidth={3}
              dot={{ fill: WEDDING_COLORS.primary, strokeWidth: 2, r: 4 }}
              {...CHART_ANIMATIONS.radar}
            />

            {showComparison && historicalData.length > 0 && (
              <Radar
                name="Previous Period"
                dataKey="previous"
                stroke={WEDDING_COLORS.muted}
                fill="transparent"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: WEDDING_COLORS.muted, strokeWidth: 2, r: 3 }}
              />
            )}

            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Details */}
        {showCategoryDetails && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Category Breakdown</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((category) => {
                const currentData = data[data.length - 1] || {};
                const historicalScore =
                  historicalData.length > 0
                    ? historicalData[historicalData.length - 1][category]
                    : undefined;

                return (
                  <CategoryScoreCard
                    key={category}
                    category={category}
                    score={currentData[category] || 0}
                    historicalScore={historicalScore}
                    reviewCount={currentData.reviewCounts?.[category]}
                    trend={showTrends ? categoryTrends[category] : undefined}
                    isActive={selectedCategory === category}
                    onClick={() => handleCategoryClick(category)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Review Breakdown */}
        {showReviewBreakdown && <ReviewBreakdownChart data={reviewBreakdown} />}
      </div>

      {/* Selected Category Details */}
      {selectedCategory && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-wedding-primary/5 to-wedding-secondary/5 p-4 rounded-lg border border-wedding-primary/20"
        >
          <div className="flex items-center gap-2 mb-3">
            {React.createElement(CATEGORY_ICONS[selectedCategory], {
              className: 'h-5 w-5 text-wedding-primary',
            })}
            <h4 className="font-medium text-gray-900">
              {CATEGORY_LABELS[selectedCategory]} Details
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Current Score:</span>
              <span className="font-medium ml-2">
                {((data[data.length - 1] || {})[selectedCategory] || 0).toFixed(
                  1,
                )}
                /5.0
              </span>
            </div>

            {historicalData.length > 0 && (
              <div>
                <span className="text-gray-600">Previous Score:</span>
                <span className="font-medium ml-2">
                  {(
                    (historicalData[historicalData.length - 1] || {})[
                      selectedCategory
                    ] || 0
                  ).toFixed(1)}
                  /5.0
                </span>
              </div>
            )}

            {categoryTrends[selectedCategory] && (
              <div>
                <span className="text-gray-600">Trend:</span>
                <span
                  className={`font-medium ml-2 ${
                    categoryTrends[selectedCategory].direction === 'up'
                      ? 'text-green-600'
                      : categoryTrends[selectedCategory].direction === 'down'
                        ? 'text-red-600'
                        : 'text-gray-600'
                  }`}
                >
                  {categoryTrends[selectedCategory].direction === 'up'
                    ? '↗️'
                    : categoryTrends[selectedCategory].direction === 'down'
                      ? '↘️'
                      : '→'}
                  {formatPercentage(categoryTrends[selectedCategory].change)}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ClientSatisfactionRadar;
