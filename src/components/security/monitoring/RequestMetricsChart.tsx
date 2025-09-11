'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface RequestMetricsChartProps {
  timeframe: '1h' | '6h' | '24h' | '7d';
  showRealTime?: boolean;
  height?: number;
  className?: string;
}

interface MetricDataPoint {
  timestamp: Date;
  requestsPerSecond: number;
  averageLatency: number;
  errorRate: number;
  weddingFormSubmissions: number;
  supplierActivity: number;
}

interface ChartMetrics {
  current: {
    requests: number;
    latency: number;
    errors: number;
    trend: 'up' | 'down' | 'stable';
  };
  peak: {
    requests: number;
    latency: number;
    timestamp: Date;
  };
  wedding: {
    formSubmissions: number;
    supplierActivity: number;
    peakHours: string;
  };
}

export function RequestMetricsChart({
  timeframe,
  showRealTime = true,
  height = 200,
  className = '',
}: RequestMetricsChartProps) {
  const [dataPoints, setDataPoints] = useState<MetricDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<
    'requests' | 'latency' | 'errors'
  >('requests');

  // Generate mock data based on timeframe
  const generateMockData = useMemo(() => {
    const now = new Date();
    const data: MetricDataPoint[] = [];

    let intervals: number;
    let intervalMinutes: number;

    switch (timeframe) {
      case '1h':
        intervals = 60;
        intervalMinutes = 1;
        break;
      case '6h':
        intervals = 72;
        intervalMinutes = 5;
        break;
      case '24h':
        intervals = 96;
        intervalMinutes = 15;
        break;
      case '7d':
        intervals = 168;
        intervalMinutes = 60;
        break;
    }

    for (let i = intervals; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMinutes * 60000);

      // Simulate wedding industry patterns
      const hour = timestamp.getHours();
      const isWeekend = timestamp.getDay() === 0 || timestamp.getDay() === 6;
      const isPeakHour =
        (hour >= 10 && hour <= 14) || (hour >= 18 && hour <= 21);
      const isWeddingSeasonPeak =
        timestamp.getMonth() >= 3 && timestamp.getMonth() <= 9; // Apr-Oct

      // Base metrics with realistic variations
      let baseRequests = 150;
      let baseLatency = 200;
      let baseErrors = 0.5;

      // Wedding industry specific adjustments
      if (isPeakHour) {
        baseRequests *= 2.5; // Peak consultation hours
        baseLatency *= 1.3;
      }

      if (isWeekend) {
        baseRequests *= 1.8; // Couples browse more on weekends
      }

      if (isWeddingSeasonPeak) {
        baseRequests *= 1.6; // Wedding season boost
        baseLatency *= 1.1;
      }

      // Add realistic noise
      const requestsNoise = (Math.random() - 0.5) * 0.3;
      const latencyNoise = (Math.random() - 0.5) * 0.4;
      const errorNoise = Math.random() * 0.8;

      data.push({
        timestamp,
        requestsPerSecond: Math.max(0, baseRequests * (1 + requestsNoise)),
        averageLatency: Math.max(50, baseLatency * (1 + latencyNoise)),
        errorRate: Math.max(0, baseErrors + errorNoise),
        weddingFormSubmissions: Math.floor(baseRequests * 0.15), // ~15% are form submissions
        supplierActivity: Math.floor(baseRequests * 0.25), // ~25% supplier activity
      });
    }

    return data;
  }, [timeframe]);

  useEffect(() => {
    setIsLoading(true);
    // Simulate loading time
    setTimeout(() => {
      setDataPoints(generateMockData);
      setIsLoading(false);
    }, 300);
  }, [generateMockData]);

  // Calculate chart metrics
  const chartMetrics = useMemo((): ChartMetrics => {
    if (dataPoints.length === 0) {
      return {
        current: { requests: 0, latency: 0, errors: 0, trend: 'stable' },
        peak: { requests: 0, latency: 0, timestamp: new Date() },
        wedding: { formSubmissions: 0, supplierActivity: 0, peakHours: 'N/A' },
      };
    }

    const latest = dataPoints[dataPoints.length - 1];
    const previous = dataPoints[dataPoints.length - 2] || latest;

    // Trend calculation
    const requestTrend =
      latest.requestsPerSecond > previous.requestsPerSecond * 1.05
        ? 'up'
        : latest.requestsPerSecond < previous.requestsPerSecond * 0.95
          ? 'down'
          : 'stable';

    // Peak values
    const peakRequests = Math.max(
      ...dataPoints.map((d) => d.requestsPerSecond),
    );
    const peakLatency = Math.max(...dataPoints.map((d) => d.averageLatency));
    const peakRequestPoint = dataPoints.find(
      (d) => d.requestsPerSecond === peakRequests,
    );

    return {
      current: {
        requests: Math.round(latest.requestsPerSecond),
        latency: Math.round(latest.averageLatency),
        errors: Number(latest.errorRate.toFixed(1)),
        trend: requestTrend,
      },
      peak: {
        requests: Math.round(peakRequests),
        latency: Math.round(peakLatency),
        timestamp: peakRequestPoint?.timestamp || new Date(),
      },
      wedding: {
        formSubmissions: latest.weddingFormSubmissions,
        supplierActivity: latest.supplierActivity,
        peakHours: '10-14, 18-21', // Wedding industry peak hours
      },
    };
  }, [dataPoints]);

  // SVG path generation for different metrics
  const generatePath = (metric: 'requests' | 'latency' | 'errors') => {
    if (dataPoints.length === 0) return '';

    const values = dataPoints.map((d) => {
      switch (metric) {
        case 'requests':
          return d.requestsPerSecond;
        case 'latency':
          return d.averageLatency;
        case 'errors':
          return d.errorRate;
        default:
          return d.requestsPerSecond;
      }
    });

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    const width = 800; // SVG viewBox width
    const chartHeight = height - 40; // Leave space for axis
    const stepX = width / (values.length - 1);

    let path = '';
    values.forEach((value, index) => {
      const x = index * stepX;
      const y = chartHeight - ((value - minValue) / range) * chartHeight;

      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });

    return path;
  };

  const getMetricColor = (metric: 'requests' | 'latency' | 'errors') => {
    switch (metric) {
      case 'requests':
        return '#3B82F6'; // Blue
      case 'latency':
        return '#F59E0B'; // Orange
      case 'errors':
        return '#EF4444'; // Red
      default:
        return '#3B82F6';
    }
  };

  const getMetricLabel = (metric: 'requests' | 'latency' | 'errors') => {
    switch (metric) {
      case 'requests':
        return 'Requests/sec';
      case 'latency':
        return 'Latency (ms)';
      case 'errors':
        return 'Error Rate (%)';
      default:
        return 'Requests/sec';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-success-500" />;
      case 'down':
        return <ArrowTrendingDownIcon className="w-4 h-4 text-error-500" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full"></div>;
    }
  };

  if (isLoading) {
    return (
      <div
        className={`bg-white rounded-xl border border-gray-200 shadow-xs p-6 ${className}`}
      >
        <div
          className="flex items-center justify-center"
          style={{ height: height }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">
            Loading performance metrics...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-xs p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Request Performance Metrics
          </h3>
          <p className="text-sm text-gray-600">
            Real-time middleware performance visualization
          </p>
        </div>

        {showRealTime && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-success-600 font-medium">Live</span>
          </div>
        )}
      </div>

      {/* Metric Selector */}
      <div className="flex items-center space-x-4 mb-6">
        {['requests', 'latency', 'errors'].map((metric) => (
          <button
            key={metric}
            onClick={() => setSelectedMetric(metric as any)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedMetric === metric
                ? 'bg-primary-100 text-primary-700 border border-primary-300'
                : 'text-gray-600 hover:text-gray-900 border border-gray-200'
            }`}
          >
            {getMetricLabel(metric as any)}
          </button>
        ))}
      </div>

      {/* Current Metrics Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <p className="text-2xl font-bold text-gray-900">
              {chartMetrics.current.requests}
            </p>
            {getTrendIcon(chartMetrics.current.trend)}
          </div>
          <p className="text-sm text-gray-600">Current RPS</p>
        </div>

        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {chartMetrics.current.latency}ms
          </p>
          <p className="text-sm text-gray-600">Avg Latency</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-1">
            <p className="text-2xl font-bold text-gray-900">
              {chartMetrics.current.errors}%
            </p>
            {chartMetrics.current.errors > 2 && (
              <ExclamationTriangleIcon className="w-4 h-4 text-warning-500" />
            )}
          </div>
          <p className="text-sm text-gray-600">Error Rate</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative mb-6">
        <svg
          viewBox={`0 0 800 ${height}`}
          className="w-full"
          style={{ height: height }}
        >
          {/* Grid lines */}
          <defs>
            <pattern
              id="grid"
              width="80"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 80 0 L 0 0 0 20"
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="800" height={height} fill="url(#grid)" />

          {/* Chart line */}
          <path
            d={generatePath(selectedMetric)}
            fill="none"
            stroke={getMetricColor(selectedMetric)}
            strokeWidth="2"
            className="drop-shadow-sm"
          />

          {/* Chart area fill */}
          <path
            d={`${generatePath(selectedMetric)} L 800 ${height} L 0 ${height} Z`}
            fill={getMetricColor(selectedMetric)}
            fillOpacity="0.1"
          />

          {/* Data points */}
          {dataPoints.map((point, index) => {
            const x = index * (800 / (dataPoints.length - 1));
            const values = dataPoints.map((d) => {
              switch (selectedMetric) {
                case 'requests':
                  return d.requestsPerSecond;
                case 'latency':
                  return d.averageLatency;
                case 'errors':
                  return d.errorRate;
                default:
                  return d.requestsPerSecond;
              }
            });
            const maxValue = Math.max(...values);
            const minValue = Math.min(...values);
            const range = maxValue - minValue || 1;
            const value = values[index];
            const y =
              height - 40 - ((value - minValue) / range) * (height - 40);

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={getMetricColor(selectedMetric)}
                className="opacity-75"
              />
            );
          })}
        </svg>

        {/* Time axis labels */}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{timeframe} ago</span>
          <span>Now</span>
        </div>
      </div>

      {/* Wedding Context */}
      <div className="bg-gradient-to-r from-purple-50 to-primary-50 rounded-lg border border-primary-200 p-4">
        <div className="flex items-start space-x-2">
          <InformationCircleIcon className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-primary-900 mb-2">
              Wedding Industry Context
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-primary-700">
                  <strong>Form Submissions:</strong>{' '}
                  {chartMetrics.wedding.formSubmissions}/min
                </p>
                <p className="text-xs text-primary-600">
                  Consultation requests & bookings
                </p>
              </div>
              <div>
                <p className="text-primary-700">
                  <strong>Supplier Activity:</strong>{' '}
                  {chartMetrics.wedding.supplierActivity}/min
                </p>
                <p className="text-xs text-primary-600">
                  Portfolio updates & messaging
                </p>
              </div>
              <div>
                <p className="text-primary-700">
                  <strong>Peak Hours:</strong> {chartMetrics.wedding.peakHours}
                </p>
                <p className="text-xs text-primary-600">
                  Wedding planning prime time
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Peak Information */}
      <div className="mt-4 text-xs text-gray-500 flex items-center justify-between">
        <span>
          Peak {getMetricLabel(selectedMetric)}:{' '}
          {selectedMetric === 'requests'
            ? chartMetrics.peak.requests
            : chartMetrics.peak.latency}
          {selectedMetric === 'requests'
            ? '/sec'
            : selectedMetric === 'latency'
              ? 'ms'
              : '%'}
        </span>
        <span>{chartMetrics.peak.timestamp.toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
