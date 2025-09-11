'use client';

import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
  ComposedChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Sun,
  Snowflake,
  Flower,
  Leaf,
  TrendingUp,
  TrendingDown,
  Eye,
  DollarSign,
  Users,
  Heart,
} from 'lucide-react';

import {
  SeasonalData,
  WeddingSeason,
  SeasonalMetrics,
  WEDDING_COLORS,
  SEASONAL_COLORS,
  formatCurrency,
  formatDate,
  formatPercentage,
  CHART_ANIMATIONS,
} from './types';

interface SeasonalTrendsChartProps {
  data: SeasonalData[];
  historicalData?: SeasonalData[];
  height?: number;
  showForecast?: boolean;
  showComparison?: boolean;
  showSeasonalFactors?: boolean;
  forecastPeriod?: number; // months ahead
  onSeasonClick?: (season: WeddingSeason) => void;
  onDataPointClick?: (dataPoint: SeasonalData) => void;
  className?: string;
}

const SEASON_ICONS: Record<WeddingSeason, any> = {
  spring: Flower,
  summer: Sun,
  autumn: Leaf,
  winter: Snowflake,
};

const SEASON_LABELS: Record<WeddingSeason, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

const SEASON_PEAKS: Record<WeddingSeason, string[]> = {
  spring: ['April', 'May'],
  summer: ['June', 'July', 'August'],
  autumn: ['September', 'October'],
  winter: ['December', 'January'],
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 min-w-64"
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-wedding-primary" />
        <p className="font-semibold text-gray-900">{label}</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Season:</span>
          <div className="flex items-center gap-1">
            {React.createElement(SEASON_ICONS[data.season as WeddingSeason], {
              className: 'h-3 w-3',
              style: { color: SEASONAL_COLORS[data.season as WeddingSeason] },
            })}
            <span className="font-medium text-gray-900">
              {SEASON_LABELS[data.season as WeddingSeason]}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Bookings:</span>
          <span className="font-medium text-gray-900">{data.bookings}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Revenue:</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(data.revenue)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Avg. Value:</span>
          <span className="font-medium text-gray-900">
            {formatCurrency(data.revenue / data.bookings)}
          </span>
        </div>

        {data.enquiries && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Enquiries:</span>
            <span className="font-medium text-gray-900">{data.enquiries}</span>
          </div>
        )}

        {data.conversionRate && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Conversion:</span>
            <span className="font-medium text-gray-900">
              {formatPercentage(data.conversionRate)}
            </span>
          </div>
        )}

        {data.forecast && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Forecast:</span>
              <span className="font-medium text-wedding-primary">
                {data.forecast.bookings} bookings
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Confidence:</span>
              <span className="font-medium text-green-600">
                {formatPercentage(data.forecast.confidence)}
              </span>
            </div>
          </div>
        )}

        {data.trends && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-1">Trends:</p>
            <div className="space-y-1">
              {data.trends.map((trend, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  {trend.direction === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={
                      trend.direction === 'up'
                        ? 'text-green-700'
                        : 'text-red-700'
                    }
                  >
                    {trend.factor}: {formatPercentage(trend.impact)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const SeasonSummaryCard = ({
  season,
  data,
  isActive,
  onClick,
}: {
  season: WeddingSeason;
  data: SeasonalData[];
  isActive: boolean;
  onClick: () => void;
}) => {
  const seasonData = data.filter((d) => d.season === season);
  const totalBookings = seasonData.reduce((sum, d) => sum + d.bookings, 0);
  const totalRevenue = seasonData.reduce((sum, d) => sum + d.revenue, 0);
  const avgRevenue = totalRevenue / Math.max(totalBookings, 1);

  const IconComponent = SEASON_ICONS[season];

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
          <IconComponent
            className="h-5 w-5"
            style={{ color: SEASONAL_COLORS[season] }}
          />
          <h4 className="font-medium text-gray-900">{SEASON_LABELS[season]}</h4>
        </div>
        <span className="text-xs text-gray-500">
          {SEASON_PEAKS[season].join(', ')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-gray-600">Bookings</p>
          <p className="font-semibold text-gray-900">{totalBookings}</p>
        </div>
        <div>
          <p className="text-gray-600">Revenue</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-gray-600">Avg. Value</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(avgRevenue)}
          </p>
        </div>
      </div>
    </motion.button>
  );
};

const ForecastSummary = ({
  data,
  forecastPeriod,
}: {
  data: SeasonalData[];
  forecastPeriod: number;
}) => {
  const forecastData = data.filter((d) => d.forecast);
  const totalForecastBookings = forecastData.reduce(
    (sum, d) => sum + (d.forecast?.bookings || 0),
    0,
  );
  const totalForecastRevenue = forecastData.reduce(
    (sum, d) => sum + (d.forecast?.revenue || 0),
    0,
  );
  const avgConfidence =
    forecastData.reduce((sum, d) => sum + (d.forecast?.confidence || 0), 0) /
    forecastData.length;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="h-5 w-5 text-blue-600" />
        <h4 className="font-medium text-gray-900">
          {forecastPeriod}-Month Forecast
        </h4>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <p className="text-gray-600">Expected Bookings</p>
          <p className="text-2xl font-bold text-blue-600">
            {totalForecastBookings}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-600">Projected Revenue</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalForecastRevenue)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-600">Confidence</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatPercentage(avgConfidence)}
          </p>
        </div>
      </div>
    </div>
  );
};

export const SeasonalTrendsChart: React.FC<SeasonalTrendsChartProps> = ({
  data,
  historicalData = [],
  height = 400,
  showForecast = true,
  showComparison = false,
  showSeasonalFactors = true,
  forecastPeriod = 12,
  onSeasonClick,
  onDataPointClick,
  className = '',
}) => {
  const [selectedSeason, setSelectedSeason] = useState<WeddingSeason | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<'bookings' | 'revenue' | 'both'>(
    'both',
  );

  const { chartData, seasons, seasonalMetrics, forecastData } = useMemo(() => {
    const seasons = [...new Set(data.map((d) => d.season))];

    const seasonalMetrics: SeasonalMetrics = {
      peakSeason: data.reduce((peak, current) =>
        current.bookings > peak.bookings ? current : peak,
      ).season,
      totalBookings: data.reduce((sum, d) => sum + d.bookings, 0),
      totalRevenue: data.reduce((sum, d) => sum + d.revenue, 0),
      avgConversion:
        data.reduce((sum, d) => sum + (d.conversionRate || 0), 0) / data.length,
      yearOverYearGrowth:
        historicalData.length > 0
          ? (data.reduce((sum, d) => sum + d.bookings, 0) -
              historicalData.reduce((sum, d) => sum + d.bookings, 0)) /
            historicalData.reduce((sum, d) => sum + d.bookings, 0)
          : 0,
    };

    const chartData = data.map((d) => ({
      ...d,
      bookingsLine: d.bookings,
      revenueLine: d.revenue,
      revenueBar: d.revenue / 1000, // Scale for visibility
      historical:
        historicalData.find((h) => h.month === d.month)?.bookings || 0,
      isSelected: selectedSeason ? d.season === selectedSeason : true,
    }));

    const forecastData = data.filter((d) => d.forecast);

    return { chartData, seasons, seasonalMetrics, forecastData };
  }, [data, historicalData, selectedSeason]);

  const handleSeasonClick = (season: WeddingSeason) => {
    const newSeason = selectedSeason === season ? null : season;
    setSelectedSeason(newSeason);
    onSeasonClick?.(season);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-gray-900">Seasonal Trends</h3>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('bookings')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                viewMode === 'bookings'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bookings
            </button>
            <button
              onClick={() => setViewMode('revenue')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                viewMode === 'revenue'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                viewMode === 'both'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Both
            </button>
          </div>
        </div>

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

      {/* Season Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {seasons.map((season) => (
          <SeasonSummaryCard
            key={season}
            season={season}
            data={data}
            isActive={selectedSeason === season}
            onClick={() => handleSeasonClick(season)}
          />
        ))}
      </div>

      {/* Forecast Summary */}
      {showForecast && forecastData.length > 0 && (
        <ForecastSummary data={forecastData} forecastPeriod={forecastPeriod} />
      )}

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />

            <YAxis
              yAxisId="bookings"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{ value: 'Bookings', angle: -90, position: 'insideLeft' }}
            />

            <YAxis
              yAxisId="revenue"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              label={{
                value: 'Revenue (£)',
                angle: 90,
                position: 'insideRight',
              }}
              tickFormatter={(value) => `£${value}k`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />

            {/* Historical Comparison */}
            {showComparison && historicalData.length > 0 && (
              <Line
                yAxisId="bookings"
                type="monotone"
                dataKey="historical"
                stroke="#d1d5db"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Previous Year"
              />
            )}

            {/* Bookings */}
            {(viewMode === 'bookings' || viewMode === 'both') && (
              <Area
                yAxisId="bookings"
                type="monotone"
                dataKey="bookingsLine"
                stroke={WEDDING_COLORS.primary}
                fill={WEDDING_COLORS.primary}
                fillOpacity={0.1}
                strokeWidth={3}
                name="Bookings"
                {...CHART_ANIMATIONS.area}
              />
            )}

            {/* Revenue */}
            {(viewMode === 'revenue' || viewMode === 'both') && (
              <Bar
                yAxisId="revenue"
                dataKey="revenueBar"
                fill={WEDDING_COLORS.secondary}
                fillOpacity={0.7}
                name="Revenue (£k)"
                radius={[2, 2, 0, 0]}
                {...CHART_ANIMATIONS.bar}
              />
            )}

            {/* Forecast Points */}
            {showForecast && (
              <Line
                yAxisId="bookings"
                type="monotone"
                dataKey="forecast.bookings"
                stroke={WEDDING_COLORS.accent}
                strokeWidth={2}
                strokeDasharray="8 4"
                dot={{ fill: WEDDING_COLORS.accent, strokeWidth: 2, r: 3 }}
                name="Forecast"
                connectNulls={false}
              />
            )}

            {/* Season Boundaries */}
            {showSeasonalFactors && (
              <>
                <ReferenceLine
                  x="March"
                  stroke={SEASONAL_COLORS.spring}
                  strokeDasharray="2 2"
                />
                <ReferenceLine
                  x="June"
                  stroke={SEASONAL_COLORS.summer}
                  strokeDasharray="2 2"
                />
                <ReferenceLine
                  x="September"
                  stroke={SEASONAL_COLORS.autumn}
                  strokeDasharray="2 2"
                />
                <ReferenceLine
                  x="December"
                  stroke={SEASONAL_COLORS.winter}
                  strokeDasharray="2 2"
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Seasonal Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Season Analysis */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            {React.createElement(SEASON_ICONS[seasonalMetrics.peakSeason], {
              className: 'h-5 w-5',
              style: { color: SEASONAL_COLORS[seasonalMetrics.peakSeason] },
            })}
            <h4 className="font-medium text-gray-900">Peak Season Insights</h4>
          </div>

          <div className="space-y-2 text-sm">
            <p>
              <strong>{SEASON_LABELS[seasonalMetrics.peakSeason]}</strong> is
              your peak season with the highest booking volume.
            </p>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-gray-600">Total Bookings</p>
                <p className="text-lg font-semibold">
                  {seasonalMetrics.totalBookings}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Total Revenue</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(seasonalMetrics.totalRevenue)}
                </p>
              </div>
            </div>

            {seasonalMetrics.yearOverYearGrowth !== 0 && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-gray-50 rounded">
                {seasonalMetrics.yearOverYearGrowth > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">
                  {formatPercentage(
                    Math.abs(seasonalMetrics.yearOverYearGrowth),
                  )}
                  {seasonalMetrics.yearOverYearGrowth > 0
                    ? ' growth'
                    : ' decline'}{' '}
                  vs last year
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Conversion Metrics */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-5 w-5 text-wedding-primary" />
            <h4 className="font-medium text-gray-900">Conversion Metrics</h4>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">
                  Average Conversion Rate
                </span>
                <span className="text-sm font-medium">
                  {formatPercentage(seasonalMetrics.avgConversion)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-wedding-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${seasonalMetrics.avgConversion * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-2 bg-green-50 rounded">
                <Users className="h-4 w-4 text-green-600 mx-auto mb-1" />
                <p className="text-green-600 font-medium">Best Season</p>
                <p className="text-gray-900">
                  {SEASON_LABELS[seasonalMetrics.peakSeason]}
                </p>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <DollarSign className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                <p className="text-blue-600 font-medium">Avg. Value</p>
                <p className="text-gray-900">
                  {formatCurrency(
                    seasonalMetrics.totalRevenue /
                      seasonalMetrics.totalBookings,
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonalTrendsChart;
