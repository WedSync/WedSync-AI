'use client';

// WS-195: Seasonal Trends Chart Component
// Visualization of wedding season impact on business metrics

import React, { useMemo } from 'react';
import { ChartProps } from '@/types/business-metrics';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Heart,
  Sun,
  Snowflake,
  Flower,
  Leaf,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeasonalData {
  season: string;
  amount: number;
  percentage: number;
  trend?: 'up' | 'down' | 'stable';
  weddingActivity?: 'peak' | 'shoulder' | 'off_peak';
}

interface SeasonalTrendsChartProps extends Omit<ChartProps, 'data'> {
  data: SeasonalData[];
}

/**
 * Seasonal Trends Chart Component
 * Visualizes wedding season impact on business performance
 * Features:
 * - Season-specific styling with wedding context
 * - Visual representation of peak/shoulder/off-peak periods
 * - Trend indicators for seasonal performance changes
 * - Interactive season details with wedding industry insights
 * - Responsive design for various dashboard layouts
 */
export function SeasonalTrendsChart({
  data,
  height = 200,
  showLegend = true,
  interactive = false,
}: SeasonalTrendsChartProps) {
  // Process and enhance seasonal data
  const seasonalMetrics = useMemo(() => {
    if (!data.length) return { seasons: [], maxAmount: 0, totalAmount: 0 };

    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    const maxAmount = Math.max(...data.map((item) => item.amount));

    const seasons = data.map((item) => ({
      ...item,
      relativeHeight: (item.amount / maxAmount) * 100,
      actualPercentage: (item.amount / totalAmount) * 100,
    }));

    return { seasons, maxAmount, totalAmount };
  }, [data]);

  // Get season styling based on type
  const getSeasonStyle = (season: string, activity: string = 'shoulder') => {
    const seasonLower = season.toLowerCase();

    // Base seasonal colors
    let baseColor = '';
    let icon = <Calendar className="w-4 h-4" />;

    if (seasonLower.includes('spring')) {
      baseColor = 'green';
      icon = <Flower className="w-4 h-4" />;
    } else if (seasonLower.includes('summer')) {
      baseColor = 'yellow';
      icon = <Sun className="w-4 h-4" />;
    } else if (seasonLower.includes('fall') || seasonLower.includes('autumn')) {
      baseColor = 'orange';
      icon = <Leaf className="w-4 h-4" />;
    } else if (seasonLower.includes('winter')) {
      baseColor = 'blue';
      icon = <Snowflake className="w-4 h-4" />;
    } else if (seasonLower.includes('peak')) {
      baseColor = 'pink';
      icon = <Heart className="w-4 h-4" />;
    } else if (seasonLower.includes('off')) {
      baseColor = 'gray';
      icon = <Calendar className="w-4 h-4" />;
    }

    // Wedding activity intensity overlay
    const intensity =
      activity === 'peak' ? '600' : activity === 'shoulder' ? '500' : '400';

    return {
      bg: `bg-${baseColor}-${intensity}`,
      lightBg: `bg-${baseColor}-100`,
      text: `text-${baseColor}-700`,
      border: `border-${baseColor}-300`,
      icon,
      weddingIntensity: activity,
    };
  };

  // Get wedding activity badge
  const getWeddingActivityBadge = (activity: string = 'shoulder') => {
    switch (activity) {
      case 'peak':
        return (
          <Badge className="bg-pink-100 text-pink-800 text-xs">
            Peak Season
          </Badge>
        );
      case 'shoulder':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 text-xs">
            Shoulder Season
          </Badge>
        );
      case 'off_peak':
        return (
          <Badge className="bg-gray-100 text-gray-800 text-xs">
            Off Season
          </Badge>
        );
      default:
        return null;
    }
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) return `£${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `£${(amount / 1000).toFixed(0)}K`;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get trend icon
  const getTrendIcon = (trend: string = 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-600" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  if (!seasonalMetrics.seasons.length) {
    return (
      <div
        className="flex items-center justify-center text-gray-500"
        style={{ height }}
      >
        <div className="text-center">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No seasonal data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ minHeight: height }}>
      {/* Chart Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-600" />
          <h4 className="font-medium text-gray-900">Seasonal Trends</h4>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {formatCurrency(seasonalMetrics.totalAmount)}
          </div>
          <div className="text-sm text-gray-600">Total Revenue</div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="space-y-3">
        {seasonalMetrics.seasons.map((season, index) => {
          const style = getSeasonStyle(season.season, season.weddingActivity);

          return (
            <div
              key={index}
              className={cn(
                'relative group',
                interactive && 'cursor-pointer hover:shadow-sm',
              )}
            >
              {/* Season Label */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {style.icon}
                  <span className="text-sm font-medium capitalize">
                    {season.season.replace('_', ' ')}
                  </span>
                  {getTrendIcon(season.trend)}
                  {getWeddingActivityBadge(season.weddingActivity)}
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold">
                    {formatCurrency(season.amount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {season.actualPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-6">
                  <div
                    className={cn(
                      'h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2',
                      // Using hardcoded colors for reliability
                      season.season.toLowerCase().includes('spring')
                        ? 'bg-green-500'
                        : season.season.toLowerCase().includes('summer')
                          ? 'bg-yellow-500'
                          : season.season.toLowerCase().includes('fall') ||
                              season.season.toLowerCase().includes('autumn')
                            ? 'bg-orange-500'
                            : season.season.toLowerCase().includes('winter')
                              ? 'bg-blue-500'
                              : season.season.toLowerCase().includes('peak')
                                ? 'bg-pink-500'
                                : season.season.toLowerCase().includes('off')
                                  ? 'bg-gray-500'
                                  : 'bg-purple-500',
                    )}
                    style={{ width: `${season.relativeHeight}%` }}
                  >
                    <span className="text-white text-xs font-medium">
                      {season.actualPercentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Wedding Activity Indicator */}
                {season.weddingActivity === 'peak' && (
                  <div className="absolute -top-1 -right-1">
                    <Heart className="w-4 h-4 text-pink-600 animate-pulse" />
                  </div>
                )}
              </div>

              {/* Interactive Tooltip */}
              {interactive && (
                <div className="absolute left-0 top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="bg-white rounded-lg shadow-lg border p-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 mb-2">
                      {style.icon}
                      <span className="font-medium capitalize">
                        {season.season.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between gap-4">
                        <span>Revenue:</span>
                        <span className="font-medium">
                          {formatCurrency(season.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Share:</span>
                        <span className="font-medium">
                          {season.actualPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Activity:</span>
                        <span className="font-medium capitalize">
                          {season.weddingActivity?.replace('_', ' ') ||
                            'Normal'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Season Summary */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="p-2 bg-pink-50 rounded-lg">
          <div className="text-sm font-bold text-pink-600">
            {seasonalMetrics.seasons
              .filter((s) => s.weddingActivity === 'peak')
              .reduce((sum, s) => sum + s.amount, 0) > 0
              ? formatCurrency(
                  seasonalMetrics.seasons
                    .filter((s) => s.weddingActivity === 'peak')
                    .reduce((sum, s) => sum + s.amount, 0),
                )
              : 'N/A'}
          </div>
          <div className="text-xs text-pink-700">Peak Season</div>
        </div>

        <div className="p-2 bg-yellow-50 rounded-lg">
          <div className="text-sm font-bold text-yellow-600">
            {seasonalMetrics.seasons
              .filter((s) => s.weddingActivity === 'shoulder')
              .reduce((sum, s) => sum + s.amount, 0) > 0
              ? formatCurrency(
                  seasonalMetrics.seasons
                    .filter((s) => s.weddingActivity === 'shoulder')
                    .reduce((sum, s) => sum + s.amount, 0),
                )
              : 'N/A'}
          </div>
          <div className="text-xs text-yellow-700">Shoulder Season</div>
        </div>

        <div className="p-2 bg-gray-50 rounded-lg">
          <div className="text-sm font-bold text-gray-600">
            {seasonalMetrics.seasons
              .filter((s) => s.weddingActivity === 'off_peak')
              .reduce((sum, s) => sum + s.amount, 0) > 0
              ? formatCurrency(
                  seasonalMetrics.seasons
                    .filter((s) => s.weddingActivity === 'off_peak')
                    .reduce((sum, s) => sum + s.amount, 0),
                )
              : 'N/A'}
          </div>
          <div className="text-xs text-gray-700">Off Season</div>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3 text-pink-600" />
            <span>Peak Wedding Season</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-yellow-600" />
            <span>Shoulder Season</span>
          </div>
          <div className="flex items-center gap-1">
            <Snowflake className="w-3 h-3 text-gray-600" />
            <span>Off-Peak Season</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SeasonalTrendsChart;
