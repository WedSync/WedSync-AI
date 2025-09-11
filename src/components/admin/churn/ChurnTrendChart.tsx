'use client';

import React, { useState, useMemo } from 'react';
import {
  ChurnTrendChartProps,
  ChurnTrendData,
} from '@/types/churn-intelligence';
import { Card } from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Area,
  ComposedChart,
  Bar,
} from 'recharts';
import {
  Calendar,
  TrendingDown,
  TrendingUp,
  Activity,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfMonth } from 'date-fns';

export default function ChurnTrendChart({
  churnData = [],
  timeRange = '90d',
  supplierSegments = [],
  showPredictions = true,
  showInterventions = true,
  onDateRangeChange,
}: ChurnTrendChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<
    'churnRate' | 'predictedChurnRate' | 'interventions' | 'saved'
  >('churnRate');
  const [selectedSegments, setSelectedSegments] =
    useState<string[]>(supplierSegments);

  // Generate mock trend data if none provided
  const mockData: ChurnTrendData[] = useMemo(() => {
    if (churnData.length > 0) return churnData;

    const days = timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const data: ChurnTrendData[] = [];

    for (let i = days; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const seasonalFactor = Math.sin((i / 365) * 2 * Math.PI) * 0.2; // Seasonal variation
      const baseChurnRate = 8 + seasonalFactor + (Math.random() - 0.5) * 2;
      const predictedRate = baseChurnRate + (Math.random() - 0.3) * 1.5;

      data.push({
        date,
        totalSuppliers: 450 + Math.floor(Math.random() * 50),
        churnedSuppliers: Math.floor(baseChurnRate * 4.5),
        churnRate: Math.max(0, baseChurnRate),
        predictedChurnRate: Math.max(0, predictedRate),
        retentionCampaignsSaved: Math.floor(Math.random() * 8),
        newRiskSuppliers: Math.floor(Math.random() * 12),
        interventionsExecuted: Math.floor(Math.random() * 15),
        seasonalFactor: seasonalFactor,
      });
    }

    return data;
  }, [churnData, timeRange]);

  // Format data for chart display
  const chartData = useMemo(() => {
    return mockData.map((point) => ({
      date: format(point.date, 'MMM dd'),
      fullDate: point.date,
      churnRate: point.churnRate,
      predictedChurnRate: showPredictions
        ? point.predictedChurnRate
        : undefined,
      interventions: showInterventions
        ? point.interventionsExecuted
        : undefined,
      saved: point.retentionCampaignsSaved,
      newRisk: point.newRiskSuppliers,
      seasonal: point.seasonalFactor,
    }));
  }, [mockData, showPredictions, showInterventions]);

  // Calculate trend metrics
  const trendMetrics = useMemo(() => {
    if (mockData.length < 2) return null;

    const recent = mockData.slice(-7); // Last 7 days
    const previous = mockData.slice(-14, -7); // Previous 7 days

    const recentAvg =
      recent.reduce((sum, d) => sum + d.churnRate, 0) / recent.length;
    const previousAvg =
      previous.reduce((sum, d) => sum + d.churnRate, 0) / previous.length;
    const trend = ((recentAvg - previousAvg) / previousAvg) * 100;

    const totalInterventions = recent.reduce(
      (sum, d) => sum + d.interventionsExecuted,
      0,
    );
    const totalSaved = recent.reduce(
      (sum, d) => sum + d.retentionCampaignsSaved,
      0,
    );

    return {
      churnTrend: trend,
      isImproving: trend < 0,
      interventionsWeek: totalInterventions,
      savedWeek: totalSaved,
      averageChurnRate: recentAvg,
    };
  }, [mockData]);

  const timeRangeOptions = [
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '365d', label: '1 Year' },
  ];

  const metricOptions = [
    { value: 'churnRate', label: 'Churn Rate', color: '#ef4444' },
    { value: 'predictedChurnRate', label: 'Predicted Rate', color: '#f97316' },
    { value: 'interventions', label: 'Interventions', color: '#3b82f6' },
    { value: 'saved', label: 'Suppliers Saved', color: '#22c55e' },
  ];

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium text-gray-900">
                {entry.name.includes('Rate')
                  ? `${entry.value.toFixed(1)}%`
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <Card variant="default" padding="sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Churn Trends Analysis
            </h3>

            {trendMetrics && (
              <div className="flex items-center gap-2">
                {trendMetrics.isImproving ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    trendMetrics.isImproving
                      ? 'text-green-700'
                      : 'text-red-700',
                  )}
                >
                  {trendMetrics.churnTrend > 0 ? '+' : ''}
                  {trendMetrics.churnTrend.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-600">vs last week</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {timeRangeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={timeRange === option.value ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    // In production, this would trigger data refresh
                    console.log('Time range changed:', option.value);
                  }}
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>

            {/* Metric Selector */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {metricOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    selectedMetric === option.value ? 'primary' : 'ghost'
                  }
                  size="sm"
                  onClick={() => setSelectedMetric(option.value as any)}
                  className="text-xs gap-1"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Summary Metrics */}
      {trendMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="default" padding="md">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {trendMetrics.averageChurnRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Avg Churn Rate (7d)</div>
              </div>
            </div>
          </Card>

          <Card variant="default" padding="md">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {trendMetrics.interventionsWeek}
                </div>
                <div className="text-xs text-gray-600">Interventions (7d)</div>
              </div>
            </div>
          </Card>

          <Card variant="default" padding="md">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {trendMetrics.savedWeek}
                </div>
                <div className="text-xs text-gray-600">
                  Suppliers Saved (7d)
                </div>
              </div>
            </div>
          </Card>

          <Card variant="default" padding="md">
            <div className="flex items-center gap-3">
              {trendMetrics.isImproving ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <div>
                <div
                  className={cn(
                    'text-lg font-bold',
                    trendMetrics.isImproving
                      ? 'text-green-700'
                      : 'text-red-700',
                  )}
                >
                  {trendMetrics.churnTrend > 0 ? '+' : ''}
                  {trendMetrics.churnTrend.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">7-Day Trend</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Chart */}
      <Card variant="default" padding="md">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-base font-semibold text-gray-900">
            Churn Rate Trends {showPredictions && '& Predictions'}
          </h4>

          <div className="flex items-center gap-2">
            <Button
              variant={showPredictions ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                // Toggle predictions - in production would refresh data
                console.log('Toggle predictions:', !showPredictions);
              }}
              className="text-xs"
            >
              Predictions
            </Button>

            <Button
              variant={showInterventions ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                // Toggle interventions - in production would refresh data
                console.log('Toggle interventions:', !showInterventions);
              }}
              className="text-xs"
            >
              Interventions
            </Button>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis
                yAxisId="rate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                label={{
                  value: 'Churn Rate (%)',
                  angle: -90,
                  position: 'insideLeft',
                  style: {
                    textAnchor: 'middle',
                    fontSize: '12px',
                    fill: '#6b7280',
                  },
                }}
              />
              {showInterventions && (
                <YAxis
                  yAxisId="count"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  label={{
                    value: 'Interventions',
                    angle: 90,
                    position: 'insideRight',
                    style: {
                      textAnchor: 'middle',
                      fontSize: '12px',
                      fill: '#6b7280',
                    },
                  }}
                />
              )}

              <Tooltip content={customTooltip} />
              <Legend />

              {/* Actual Churn Rate */}
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="churnRate"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#ef4444' }}
                name="Actual Churn Rate"
              />

              {/* Predicted Churn Rate */}
              {showPredictions && (
                <Line
                  yAxisId="rate"
                  type="monotone"
                  dataKey="predictedChurnRate"
                  stroke="#f97316"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#f97316', strokeWidth: 2, r: 3 }}
                  name="Predicted Churn Rate"
                />
              )}

              {/* Interventions as bars */}
              {showInterventions && (
                <Bar
                  yAxisId="count"
                  dataKey="interventions"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  name="Interventions"
                />
              )}

              {/* Suppliers Saved */}
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="saved"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', strokeWidth: 2, r: 3 }}
                name="Suppliers Saved"
              />

              {/* Benchmark line for target churn rate */}
              <ReferenceLine
                yAxisId="rate"
                y={5}
                stroke="#6b7280"
                strokeDasharray="3 3"
                label={{
                  value: 'Target: 5%',
                  position: 'topRight',
                  style: { fontSize: '11px', fill: '#6b7280' },
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Legend with Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500 rounded-full" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {mockData.length > 0
                  ? mockData[mockData.length - 1].churnRate.toFixed(1)
                  : 0}
                %
              </div>
              <div className="text-xs text-gray-600">Current Churn</div>
            </div>
          </div>

          {showPredictions && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-orange-500 rounded-full opacity-60" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {mockData.length > 0
                    ? mockData[mockData.length - 1].predictedChurnRate.toFixed(
                        1,
                      )
                    : 0}
                  %
                </div>
                <div className="text-xs text-gray-600">Predicted</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded opacity-60" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {trendMetrics?.interventionsWeek || 0}
              </div>
              <div className="text-xs text-gray-600">Interventions (7d)</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-500 rounded-full" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {trendMetrics?.savedWeek || 0}
              </div>
              <div className="text-xs text-gray-600">Saved (7d)</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Seasonal Analysis */}
      <Card variant="default" padding="md">
        <h4 className="text-base font-semibold text-gray-900 mb-4">
          Seasonal Impact Analysis
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">
                Peak Season (Apr-Oct)
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Lower churn risk due to high wedding activity. Suppliers are more
              engaged during booking season.
            </p>
            <Badge className="bg-green-100 text-green-800 text-xs">
              Risk: -15% adjustment
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-900">
                Off-Peak (Nov-Mar)
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Higher churn risk as wedding bookings decline. Extra attention
              needed for supplier engagement.
            </p>
            <Badge className="bg-orange-100 text-orange-800 text-xs">
              Risk: +25% adjustment
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">
                Current Impact
              </span>
            </div>
            <p className="text-xs text-gray-600">
              {mockData.length > 0 &&
              mockData[mockData.length - 1].seasonalFactor > 0
                ? 'Positive seasonal influence on retention'
                : 'Negative seasonal impact requiring attention'}
            </p>
            <Badge
              className={cn(
                'text-xs',
                mockData.length > 0 &&
                  mockData[mockData.length - 1].seasonalFactor > 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800',
              )}
            >
              {mockData.length > 0
                ? `${mockData[mockData.length - 1].seasonalFactor > 0 ? '+' : ''}${(mockData[mockData.length - 1].seasonalFactor * 100).toFixed(0)}% impact`
                : 'No impact'}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
