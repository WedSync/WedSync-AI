/**
 * WS-227: Performance Chart Component
 * Interactive charts for visualizing system health metrics over time
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface DataPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

interface PerformanceChartProps {
  title: string;
  data: DataPoint[];
  metricType: 'latency' | 'uptime' | 'throughput' | 'errors' | 'cpu' | 'memory';
  timeRange?: '1h' | '6h' | '24h' | '7d';
  height?: number;
  showTrend?: boolean;
  threshold?: {
    warning: number;
    critical: number;
  };
  unit?: string;
  loading?: boolean;
}

export function PerformanceChart({
  title,
  data,
  metricType,
  timeRange = '24h',
  height = 200,
  showTrend = true,
  threshold,
  unit,
  loading = false,
}: PerformanceChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<DataPoint | null>(null);
  const [chartDimensions, setChartDimensions] = useState({
    width: 600,
    height,
  });

  // Calculate chart metrics
  const chartMetrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        min: 0,
        max: 100,
        average: 0,
        trend: 0,
        points: [],
      };
    }

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Calculate trend (simple linear regression slope)
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, point, i) => sum + i * point.value, 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);

    const trend =
      n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;

    // Create SVG path points
    const padding = 20;
    const chartWidth = chartDimensions.width - padding * 2;
    const chartHeight = chartDimensions.height - padding * 2;

    const xScale = chartWidth / (data.length - 1 || 1);
    const yRange = max - min || 1;
    const yScale = chartHeight / yRange;

    const points = data.map((point, i) => ({
      x: padding + i * xScale,
      y: padding + (chartHeight - (point.value - min) * yScale),
      data: point,
    }));

    return { min, max, average, trend, points, yRange };
  }, [data, chartDimensions]);

  // Format values based on metric type
  const formatValue = (value: number) => {
    switch (metricType) {
      case 'latency':
        return value < 1000
          ? `${Math.round(value)}ms`
          : `${(value / 1000).toFixed(2)}s`;
      case 'uptime':
        return `${value.toFixed(2)}%`;
      case 'throughput':
        return `${value.toFixed(1)}/s`;
      case 'errors':
        return Math.round(value).toString();
      case 'cpu':
      case 'memory':
        return `${value.toFixed(1)}%`;
      default:
        return unit ? `${value.toFixed(2)}${unit}` : value.toFixed(2);
    }
  };

  // Get color based on metric type and threshold
  const getValueColor = (value: number) => {
    if (threshold) {
      if (value >= threshold.critical) return 'text-error-600';
      if (value >= threshold.warning) return 'text-warning-600';
    }

    switch (metricType) {
      case 'errors':
        return value === 0 ? 'text-success-600' : 'text-error-600';
      case 'uptime':
        return value >= 99.5
          ? 'text-success-600'
          : value >= 98.0
            ? 'text-warning-600'
            : 'text-error-600';
      default:
        return 'text-blue-600';
    }
  };

  // Get trend indicator
  const getTrendIndicator = () => {
    if (!showTrend || Math.abs(chartMetrics.trend) < 0.01) return null;

    const isPositive = chartMetrics.trend > 0;
    const isGoodTrend =
      metricType === 'uptime' || metricType === 'throughput'
        ? isPositive
        : !isPositive;

    return (
      <div className="flex items-center">
        {isPositive ? (
          <ArrowTrendingUpIcon
            className={`w-4 h-4 mr-1 ${isGoodTrend ? 'text-success-500' : 'text-error-500'}`}
          />
        ) : (
          <ArrowTrendingDownIcon
            className={`w-4 h-4 mr-1 ${isGoodTrend ? 'text-success-500' : 'text-error-500'}`}
          />
        )}
        <span
          className={`text-sm font-medium ${isGoodTrend ? 'text-success-600' : 'text-error-600'}`}
        >
          {isGoodTrend ? 'Improving' : 'Declining'}
        </span>
      </div>
    );
  };

  // Generate SVG path for the chart line
  const generatePath = () => {
    if (chartMetrics.points.length === 0) return '';

    const pathData = chartMetrics.points
      .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    return pathData;
  };

  // Generate area fill path
  const generateAreaPath = () => {
    if (chartMetrics.points.length === 0) return '';

    const pathData = chartMetrics.points
      .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');

    const lastPoint = chartMetrics.points[chartMetrics.points.length - 1];
    const firstPoint = chartMetrics.points[0];

    return `${pathData} L ${lastPoint.x} ${chartDimensions.height - 20} L ${firstPoint.x} ${chartDimensions.height - 20} Z`;
  };

  useEffect(() => {
    const updateDimensions = () => {
      setChartDimensions({ width: 600, height });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [height]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">Loading performance data...</p>
          </div>
          <ChartBarIcon className="w-6 h-6 text-gray-400" />
        </div>

        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">No data available</p>
          </div>
          <InformationCircleIcon className="w-6 h-6 text-gray-400" />
        </div>

        <div className="h-48 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No performance data available</p>
            <p className="text-sm text-gray-400 mt-1">
              Data will appear here once monitoring begins
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center space-x-4 mt-1">
            <span className="text-sm text-gray-600">
              {timeRange.toUpperCase()} • {data.length} data points
            </span>
            {getTrendIndicator()}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500">Current</div>
          <div
            className={`text-2xl font-bold ${getValueColor(data[data.length - 1]?.value || 0)}`}
          >
            {formatValue(data[data.length - 1]?.value || 0)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative mb-4">
        <svg
          width={chartDimensions.width}
          height={chartDimensions.height}
          className="w-full"
          style={{ height: `${height}px` }}
        >
          {/* Background grid */}
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Threshold lines */}
          {threshold && (
            <>
              {threshold.warning && (
                <line
                  x1={20}
                  y1={
                    20 +
                    (chartDimensions.height - 40) -
                    ((threshold.warning - chartMetrics.min) /
                      chartMetrics.yRange) *
                      (chartDimensions.height - 40)
                  }
                  x2={chartDimensions.width - 20}
                  y2={
                    20 +
                    (chartDimensions.height - 40) -
                    ((threshold.warning - chartMetrics.min) /
                      chartMetrics.yRange) *
                      (chartDimensions.height - 40)
                  }
                  stroke="#f59e0b"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                  opacity="0.7"
                />
              )}
              {threshold.critical && (
                <line
                  x1={20}
                  y1={
                    20 +
                    (chartDimensions.height - 40) -
                    ((threshold.critical - chartMetrics.min) /
                      chartMetrics.yRange) *
                      (chartDimensions.height - 40)
                  }
                  x2={chartDimensions.width - 20}
                  y2={
                    20 +
                    (chartDimensions.height - 40) -
                    ((threshold.critical - chartMetrics.min) /
                      chartMetrics.yRange) *
                      (chartDimensions.height - 40)
                  }
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                  opacity="0.7"
                />
              )}
            </>
          )}

          {/* Area fill */}
          <path d={generateAreaPath()} fill="url(#gradient)" opacity="0.1" />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Chart line */}
          <path
            d={generatePath()}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {chartMetrics.points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth="2"
              className="cursor-pointer hover:r-4 transition-all"
              onMouseEnter={() => setSelectedPoint(point.data)}
              onMouseLeave={() => setSelectedPoint(null)}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {selectedPoint && (
          <div className="absolute top-4 left-4 bg-gray-900 text-white p-3 rounded-lg shadow-lg z-10">
            <div className="text-sm font-medium">
              {formatValue(selectedPoint.value)}
            </div>
            <div className="text-xs text-gray-300">
              {new Date(selectedPoint.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Average
          </div>
          <div
            className={`text-lg font-semibold ${getValueColor(chartMetrics.average)}`}
          >
            {formatValue(chartMetrics.average)}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Peak
          </div>
          <div
            className={`text-lg font-semibold ${getValueColor(chartMetrics.max)}`}
          >
            {formatValue(chartMetrics.max)}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            Low
          </div>
          <div
            className={`text-lg font-semibold ${getValueColor(chartMetrics.min)}`}
          >
            {formatValue(chartMetrics.min)}
          </div>
        </div>
      </div>

      {/* Wedding Context Alert */}
      {metricType === 'latency' && chartMetrics.average > 1000 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start">
            <ClockIcon className="w-4 h-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-amber-800">
                Wedding Day Impact
              </div>
              <div className="text-sm text-amber-700 mt-1">
                High response times may affect couples accessing their galleries
                during peak wedding hours.
              </div>
            </div>
          </div>
        </div>
      )}

      {threshold && (
        <div className="mt-4 text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-0.5 bg-yellow-400 mr-1" />
              Warning: {formatValue(threshold.warning)}
            </div>
            <div className="flex items-center">
              <div className="w-3 h-0.5 bg-red-400 mr-1" />
              Critical: {formatValue(threshold.critical)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
