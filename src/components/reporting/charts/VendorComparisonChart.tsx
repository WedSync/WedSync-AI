'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
} from 'recharts';
import {
  Download,
  Users,
  Star,
  Clock,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { VendorComparison, ExportOptions, ChartProps } from '../types';
import { formatGBP, exportChart, formatNumber } from '../utils';

interface VendorComparisonChartProps extends ChartProps {
  data: VendorComparison[];
  chartType?: 'bar' | 'scatter' | 'ranking';
  metric?:
    | 'revenue'
    | 'bookings'
    | 'avgRating'
    | 'responseTime'
    | 'completionRate';
  showCategories?: boolean;
  maxVendors?: number;
}

const METRIC_COLORS = {
  revenue: '#10B981',
  bookings: '#3B82F6',
  avgRating: '#F59E0B',
  responseTime: '#8B5CF6',
  completionRate: '#EF4444',
};

const CATEGORY_COLORS = {
  photography: '#6366F1',
  videography: '#8B5CF6',
  venue: '#10B981',
  catering: '#F59E0B',
  flowers: '#EC4899',
  music: '#14B8A6',
  planning: '#F97316',
  other: '#6B7280',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg min-w-[280px]">
      <p className="font-semibold text-gray-900 mb-2">{data.vendorName}</p>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">Revenue:</span>
            <p className="font-semibold text-emerald-600">
              {formatGBP(data.metrics.revenue)}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Bookings:</span>
            <p className="font-semibold text-blue-600">
              {data.metrics.bookings}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">Rating:</span>
            <div className="flex items-center space-x-1">
              <Star size={12} className="text-amber-500 fill-current" />
              <span className="font-semibold">
                {data.metrics.avgRating.toFixed(1)}
              </span>
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600">Response:</span>
            <p className="font-semibold">{data.metrics.responseTime}h</p>
          </div>
        </div>
        <div className="pt-2 border-t">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Completion Rate:</span>
            <span className="font-semibold">
              {data.metrics.completionRate}%
            </span>
          </div>
        </div>
        <div className="pt-1">
          <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
            {data.category}
          </span>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  format,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  format: (val: number) => string;
  icon: any;
  color: string;
}) => (
  <div className="p-4 bg-gray-50 rounded-lg">
    <div className="flex items-center space-x-2 mb-2">
      <Icon size={16} style={{ color }} />
      <span className="text-sm font-medium text-gray-700">{title}</span>
    </div>
    <p className="text-xl font-bold" style={{ color }}>
      {format(value)}
    </p>
  </div>
);

export function VendorComparisonChart({
  data,
  loading = false,
  error,
  onExport,
  height,
  className = '',
  chartType = 'bar',
  metric = 'revenue',
  showCategories = true,
  maxVendors = 20,
}: VendorComparisonChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] =
    useState<keyof VendorComparison['metrics']>('revenue');
  const [viewType, setViewType] = useState<'bar' | 'scatter' | 'ranking'>(
    chartType,
  );
  const chartId = 'vendor-comparison-chart';

  const processedData = useMemo(() => {
    let filteredData = data;

    // Filter by category
    if (selectedCategory !== 'all') {
      filteredData = data.filter(
        (vendor) => vendor.category === selectedCategory,
      );
    }

    // Sort by selected metric
    filteredData = [...filteredData].sort(
      (a, b) => b.metrics[sortBy] - a.metrics[sortBy],
    );

    // Limit to maxVendors
    filteredData = filteredData.slice(0, maxVendors);

    // Add ranking and category colors
    return filteredData.map((vendor, index) => ({
      ...vendor,
      rank: index + 1,
      categoryColor:
        CATEGORY_COLORS[vendor.category as keyof typeof CATEGORY_COLORS] ||
        CATEGORY_COLORS.other,
      displayName:
        vendor.vendorName.length > 15
          ? vendor.vendorName.substring(0, 15) + '...'
          : vendor.vendorName,
    }));
  }, [data, selectedCategory, sortBy, maxVendors]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(data.map((vendor) => vendor.category)));
    return ['all', ...cats];
  }, [data]);

  const aggregateStats = useMemo(() => {
    if (!processedData.length) return null;

    return {
      totalRevenue: processedData.reduce(
        (sum, v) => sum + v.metrics.revenue,
        0,
      ),
      totalBookings: processedData.reduce(
        (sum, v) => sum + v.metrics.bookings,
        0,
      ),
      avgRating:
        processedData.reduce((sum, v) => sum + v.metrics.avgRating, 0) /
        processedData.length,
      avgResponseTime:
        processedData.reduce((sum, v) => sum + v.metrics.responseTime, 0) /
        processedData.length,
      avgCompletionRate:
        processedData.reduce((sum, v) => sum + v.metrics.completionRate, 0) /
        processedData.length,
    };
  }, [processedData]);

  const handleExport = useCallback(
    (format: ExportOptions['format']) => {
      if (onExport) {
        onExport({ format, filename: `vendor-comparison-${metric}` });
      } else {
        exportChart(chartId, {
          format,
          filename: `vendor-comparison-${metric}`,
        });
      }
    },
    [onExport, metric],
  );

  const formatMetricValue = (value: number, metricType: string) => {
    switch (metricType) {
      case 'revenue':
        return formatGBP(value);
      case 'avgRating':
        return value.toFixed(1);
      case 'responseTime':
        return `${value}h`;
      case 'completionRate':
        return `${value}%`;
      default:
        return formatNumber(value);
    }
  };

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={processedData}
        margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="displayName"
          angle={-45}
          textAnchor="end"
          height={80}
          stroke="#6B7280"
          fontSize={12}
        />
        <YAxis
          stroke="#6B7280"
          fontSize={12}
          tickFormatter={(value) => formatMetricValue(value, metric)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar
          dataKey={`metrics.${metric}`}
          fill={METRIC_COLORS[metric]}
          name={metric.charAt(0).toUpperCase() + metric.slice(1)}
          radius={[4, 4, 0, 0]}
        >
          {showCategories &&
            processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.categoryColor} />
            ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderScatterChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart
        data={processedData}
        margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          type="number"
          dataKey="metrics.revenue"
          stroke="#6B7280"
          fontSize={12}
          tickFormatter={(value) => formatGBP(value)}
          name="Revenue"
        />
        <YAxis
          type="number"
          dataKey="metrics.avgRating"
          stroke="#6B7280"
          fontSize={12}
          domain={[0, 5]}
          name="Rating"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Scatter name="Vendors" fill="#3B82F6">
          {processedData.map((entry, index) => (
            <Cell key={`scatter-${index}`} fill={entry.categoryColor} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );

  const renderRankingList = () => (
    <div className="space-y-3">
      {processedData.map((vendor, index) => (
        <div
          key={vendor.vendorId}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold text-sm">
              {vendor.rank}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">
                {vendor.vendorName}
              </h4>
              <span className="text-sm text-gray-600 capitalize">
                {vendor.category}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p
              className="font-bold text-lg"
              style={{ color: METRIC_COLORS[metric] }}
            >
              {formatMetricValue(vendor.metrics[metric], metric)}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center space-x-1">
                <Star size={12} className="text-amber-500 fill-current" />
                <span className="text-sm">
                  {vendor.metrics.avgRating.toFixed(1)}
                </span>
              </div>
              <span className="text-sm text-gray-500">
                {vendor.metrics.bookings} bookings
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className={`p-6 bg-white rounded-lg border ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`p-6 bg-white rounded-lg border border-red-200 ${className}`}
      >
        <div className="text-center">
          <p className="text-red-600 font-semibold">
            Error loading vendor data
          </p>
          <p className="text-gray-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={`p-6 bg-white rounded-lg border ${className}`}>
        <div className="text-center">
          <p className="text-gray-600">No vendor data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-white rounded-lg border ${className}`} id={chartId}>
      {/* Header */}
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Vendor Performance Comparison
            </h3>
            <p className="text-sm text-gray-600">
              Compare vendors across key metrics
            </p>
          </div>

          <button
            onClick={() => handleExport('png')}
            className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Chart Type */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {(['bar', 'scatter', 'ranking'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setViewType(type)}
                className={`px-3 py-1 text-xs rounded-md transition-colors capitalize ${
                  viewType === type
                    ? 'bg-white text-gray-900 font-medium shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all'
                  ? 'All Categories'
                  : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white"
          >
            <option value="revenue">Sort by Revenue</option>
            <option value="bookings">Sort by Bookings</option>
            <option value="avgRating">Sort by Rating</option>
            <option value="responseTime">Sort by Response Time</option>
            <option value="completionRate">Sort by Completion Rate</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      {aggregateStats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <MetricCard
            title="Total Revenue"
            value={aggregateStats.totalRevenue}
            format={formatGBP}
            icon={Users}
            color="#10B981"
          />
          <MetricCard
            title="Total Bookings"
            value={aggregateStats.totalBookings}
            format={formatNumber}
            icon={Users}
            color="#3B82F6"
          />
          <MetricCard
            title="Avg Rating"
            value={aggregateStats.avgRating}
            format={(v) => v.toFixed(1)}
            icon={Star}
            color="#F59E0B"
          />
          <MetricCard
            title="Avg Response"
            value={aggregateStats.avgResponseTime}
            format={(v) => `${v.toFixed(1)}h`}
            icon={Clock}
            color="#8B5CF6"
          />
          <MetricCard
            title="Avg Completion"
            value={aggregateStats.avgCompletionRate}
            format={(v) => `${v.toFixed(1)}%`}
            icon={CheckCircle}
            color="#EF4444"
          />
        </div>
      )}

      {/* Chart Area */}
      <div className="mb-6">
        {viewType === 'bar' && renderBarChart()}
        {viewType === 'scatter' && renderScatterChart()}
        {viewType === 'ranking' && renderRankingList()}
      </div>

      {/* Category Legend */}
      {showCategories && viewType !== 'ranking' && (
        <div className="flex flex-wrap gap-2 mt-4 p-4 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700 mr-2">
            Categories:
          </span>
          {Object.entries(CATEGORY_COLORS).map(([category, color]) => (
            <div key={category} className="flex items-center space-x-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-600 capitalize">
                {category}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Performance Insights */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-2">
          <Filter className="text-blue-600 mt-0.5" size={16} />
          <div>
            <h4 className="font-semibold text-blue-900">Comparison Insights</h4>
            <ul className="mt-2 space-y-1 text-sm text-blue-800">
              <li>
                • Bar chart shows direct metric comparisons across vendors
              </li>
              <li>
                • Scatter plot reveals correlation between revenue and ratings
              </li>
              <li>
                • Ranking view provides comprehensive vendor performance
                overview
              </li>
              <li>
                • Colors represent different vendor categories when enabled
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VendorComparisonChart;
