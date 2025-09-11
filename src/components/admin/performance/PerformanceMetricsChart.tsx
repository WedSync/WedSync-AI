'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import {
  PerformanceMetricsChartProps,
  MetricType,
  PerformanceTestRun,
} from '@/types/performance-testing';

export const PerformanceMetricsChart: React.FC<
  PerformanceMetricsChartProps
> = ({
  testResults,
  metricType,
  timeRange,
  showThresholds = true,
  height = 400,
}) => {
  const chartData = useMemo(() => {
    return testResults.map((run, index) => ({
      testIndex: index + 1,
      testName: run.name.length > 15 ? `${run.name.slice(0, 15)}...` : run.name,
      timestamp: new Date(run.startTime).toLocaleDateString(),
      responseTimeP50: run.results.responseTime.p50,
      responseTimeP95: run.results.responseTime.p95,
      responseTimeP99: run.results.responseTime.p99,
      responseTimeAverage: run.results.responseTime.average,
      throughputAverage: run.results.throughput.average,
      throughputPeak: run.results.throughput.peak,
      errorRate: run.results.errorRate,
      concurrentUsersAverage: run.results.concurrentUsers.average,
      concurrentUsersPeak: run.results.concurrentUsers.peak,
      passed: run.passed,
      thresholdBreaches: run.thresholdBreaches.length,
      testType: run.type,
    }));
  }, [testResults]);

  const getThresholdValue = (metric: MetricType) => {
    if (testResults.length === 0) return null;
    const latestRun = testResults[testResults.length - 1];

    // This would typically come from the test configuration
    // For now, we'll use reasonable defaults
    switch (metric) {
      case 'response_time':
        return 2000; // 2 second P95 threshold
      case 'error_rate':
        return 5; // 5% error rate threshold
      case 'throughput':
        return 100; // 100 RPS minimum threshold
      default:
        return null;
    }
  };

  const renderTooltip = (active: boolean, payload: any[], label: string) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <div className="text-sm font-semibold text-gray-900 mb-2">
          {data.testName}
        </div>
        <div className="text-xs text-gray-500 mb-2">
          {data.timestamp} • {data.testType.toUpperCase()}
        </div>

        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-gray-700">{entry.name}</span>
            </div>
            <span className="text-xs font-medium text-gray-900">
              {typeof entry.value === 'number'
                ? entry.value.toFixed(1)
                : entry.value}
              {metricType === 'response_time' && 'ms'}
              {metricType === 'error_rate' && '%'}
              {metricType === 'throughput' && ' RPS'}
            </span>
          </div>
        ))}

        {data.thresholdBreaches > 0 && (
          <div className="flex items-center mt-2 pt-2 border-t border-gray-100">
            <AlertTriangle className="w-3 h-3 text-warning-500 mr-1" />
            <span className="text-xs text-warning-700">
              {data.thresholdBreaches} threshold breach
              {data.thresholdBreaches > 1 ? 'es' : ''}
            </span>
          </div>
        )}

        <div className="flex items-center mt-1">
          <div
            className={`w-2 h-2 rounded-full mr-1 ${data.passed ? 'bg-success-500' : 'bg-error-500'}`}
          />
          <span
            className={`text-xs font-medium ${data.passed ? 'text-success-700' : 'text-error-700'}`}
          >
            {data.passed ? 'Passed' : 'Failed'}
          </span>
        </div>
      </div>
    );
  };

  const renderResponseTimeChart = () => {
    const threshold = getThresholdValue('response_time');

    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="testIndex"
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => `Test ${value}`}
          />
          <YAxis
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => `${value}ms`}
          />
          <Tooltip
            content={({ active, payload, label }) =>
              renderTooltip(active, payload, label)
            }
          />
          <Legend />

          {showThresholds && threshold && (
            <ReferenceLine
              y={threshold}
              stroke="#EF4444"
              strokeDasharray="5 5"
              label={{ value: 'P95 Threshold', position: 'topRight' }}
            />
          )}

          <Line
            type="monotone"
            dataKey="responseTimeP50"
            stroke="#3B82F6"
            strokeWidth={2}
            name="P50"
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6, fill: '#3B82F6' }}
          />
          <Line
            type="monotone"
            dataKey="responseTimeP95"
            stroke="#7C3AED"
            strokeWidth={2}
            name="P95"
            dot={{ fill: '#7C3AED', r: 4 }}
            activeDot={{ r: 6, fill: '#7C3AED' }}
          />
          <Line
            type="monotone"
            dataKey="responseTimeP99"
            stroke="#DC2626"
            strokeWidth={2}
            name="P99"
            dot={{ fill: '#DC2626', r: 4 }}
            activeDot={{ r: 6, fill: '#DC2626' }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderThroughputChart = () => {
    const threshold = getThresholdValue('throughput');

    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="testIndex"
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => `Test ${value}`}
          />
          <YAxis
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => `${value} RPS`}
          />
          <Tooltip
            content={({ active, payload, label }) =>
              renderTooltip(active, payload, label)
            }
          />
          <Legend />

          {showThresholds && threshold && (
            <ReferenceLine
              y={threshold}
              stroke="#10B981"
              strokeDasharray="5 5"
              label={{ value: 'Min Throughput', position: 'topRight' }}
            />
          )}

          <Area
            type="monotone"
            dataKey="throughputAverage"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.3}
            name="Average Throughput"
          />
          <Line
            type="monotone"
            dataKey="throughputPeak"
            stroke="#059669"
            strokeWidth={2}
            name="Peak Throughput"
            dot={{ fill: '#059669', r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const renderErrorRateChart = () => {
    const threshold = getThresholdValue('error_rate');

    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="testIndex"
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => `Test ${value}`}
          />
          <YAxis
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            content={({ active, payload, label }) =>
              renderTooltip(active, payload, label)
            }
          />
          <Legend />

          {showThresholds && threshold && (
            <ReferenceLine
              y={threshold}
              stroke="#EF4444"
              strokeDasharray="5 5"
              label={{ value: 'Max Error Rate', position: 'topRight' }}
            />
          )}

          <Area
            type="monotone"
            dataKey="errorRate"
            stroke="#DC2626"
            fill="#DC2626"
            fillOpacity={0.3}
            name="Error Rate"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderConcurrentUsersChart = () => {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="testIndex"
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => `Test ${value}`}
          />
          <YAxis
            stroke="#6B7280"
            fontSize={12}
            tickFormatter={(value) => `${value} users`}
          />
          <Tooltip
            content={({ active, payload, label }) =>
              renderTooltip(active, payload, label)
            }
          />
          <Legend />

          <Line
            type="monotone"
            dataKey="concurrentUsersAverage"
            stroke="#F59E0B"
            strokeWidth={2}
            name="Average Users"
            dot={{ fill: '#F59E0B', r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="concurrentUsersPeak"
            stroke="#D97706"
            strokeWidth={2}
            name="Peak Users"
            dot={{ fill: '#D97706', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const getMetricStats = () => {
    if (chartData.length === 0) return null;

    const latest = chartData[chartData.length - 1];
    const previous =
      chartData.length > 1 ? chartData[chartData.length - 2] : null;

    let currentValue: number;
    let previousValue: number | null = null;
    let unit = '';

    switch (metricType) {
      case 'response_time':
        currentValue = latest.responseTimeP95;
        previousValue = previous?.responseTimeP95 || null;
        unit = 'ms';
        break;
      case 'throughput':
        currentValue = latest.throughputAverage;
        previousValue = previous?.throughputAverage || null;
        unit = ' RPS';
        break;
      case 'error_rate':
        currentValue = latest.errorRate;
        previousValue = previous?.errorRate || null;
        unit = '%';
        break;
      case 'concurrent_users':
        currentValue = latest.concurrentUsersAverage;
        previousValue = previous?.concurrentUsersAverage || null;
        unit = ' users';
        break;
      default:
        return null;
    }

    const trend = previousValue !== null ? currentValue - previousValue : 0;
    const trendPercentage = previousValue ? (trend / previousValue) * 100 : 0;

    return { currentValue, trend, trendPercentage, unit };
  };

  const renderChart = () => {
    switch (metricType) {
      case 'response_time':
        return renderResponseTimeChart();
      case 'throughput':
        return renderThroughputChart();
      case 'error_rate':
        return renderErrorRateChart();
      case 'concurrent_users':
        return renderConcurrentUsersChart();
      default:
        return renderResponseTimeChart();
    }
  };

  const stats = getMetricStats();

  if (chartData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <div className="text-center py-12">
          <div className="text-gray-400 text-sm">No test data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 capitalize">
            {metricType.replace('_', ' ')} Performance
          </h3>
          <p className="text-sm text-gray-500">
            {timeRange} • {chartData.length} test
            {chartData.length !== 1 ? 's' : ''}
          </p>
        </div>

        {stats && (
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {stats.currentValue.toFixed(1)}
              {stats.unit}
            </div>
            {stats.trend !== 0 && (
              <div
                className={`flex items-center text-sm ${
                  metricType === 'error_rate'
                    ? stats.trend > 0
                      ? 'text-error-600'
                      : 'text-success-600'
                    : stats.trend > 0
                      ? 'text-success-600'
                      : 'text-error-600'
                }`}
              >
                {stats.trend > 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {Math.abs(stats.trendPercentage).toFixed(1)}% from last test
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="mb-4">{renderChart()}</div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-4">
          <span>
            Passed: {chartData.filter((d) => d.passed).length}/
            {chartData.length}
          </span>
          <span>
            Breaches:{' '}
            {chartData.reduce((sum, d) => sum + d.thresholdBreaches, 0)}
          </span>
        </div>
        <div>Last updated: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
};
