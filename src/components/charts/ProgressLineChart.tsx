'use client';

import React, { useMemo } from 'react';
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import { ChartContainer, type ChartMetrics } from './ChartContainer';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react';

interface DataPoint {
  date: string;
  value: number;
  target?: number;
  label?: string;
  metadata?: Record<string, any>;
}

interface ProgressLineChartProps {
  title: string;
  description?: string;
  data: DataPoint[];
  metrics?: ChartMetrics;
  isLoading?: boolean;
  error?: string | null;
  className?: string;

  // Chart configuration
  showTarget?: boolean;
  showTrend?: boolean;
  showArea?: boolean;
  color?: string;
  targetColor?: string;

  // Interaction
  onDataPointClick?: (dataPoint: DataPoint) => void;
  onRefresh?: () => void;
  onSettings?: () => void;

  // Real-time
  realTimeEnabled?: boolean;
  refreshInterval?: number;
  lastUpdated?: Date;

  // Wedding-specific
  weddingDate?: string;
  milestones?: Array<{ date: string; label: string; color?: string }>;
}

const ProgressLineChart: React.FC<ProgressLineChartProps> = ({
  title,
  description,
  data,
  metrics,
  isLoading,
  error,
  className,
  showTarget = true,
  showTrend = true,
  showArea = false,
  color = '#3b82f6',
  targetColor = '#ef4444',
  onDataPointClick,
  onRefresh,
  onSettings,
  realTimeEnabled = false,
  refreshInterval = 300,
  lastUpdated,
  weddingDate,
  milestones = [],
}) => {
  // Process and format data
  const processedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      formattedDate: (() => {
        try {
          const date = parseISO(point.date);
          return isValid(date) ? format(date, 'MMM dd') : point.date;
        } catch {
          return point.date;
        }
      })(),
      displayValue: Math.round(point.value * 100) / 100,
      displayTarget: point.target
        ? Math.round(point.target * 100) / 100
        : undefined,
    }));
  }, [data]);

  // Calculate trend line if enabled
  const trendData = useMemo(() => {
    if (!showTrend || data.length < 2) return [];

    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, point) => sum + point.value, 0);
    const sumXY = data.reduce((sum, point, i) => sum + i * point.value, 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map((point, i) => ({
      ...point,
      trendValue: slope * i + intercept,
    }));
  }, [data, showTrend]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{label}</span>
          </div>

          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.dataKey}:</span>
              <span className="font-medium">
                {typeof entry.value === 'number'
                  ? entry.value.toLocaleString()
                  : entry.value}
                {metrics?.unit && ` ${metrics.unit}`}
              </span>
            </div>
          ))}

          {data.metadata && (
            <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
              {Object.entries(data.metadata).map(([key, value]) => (
                <div key={key}>
                  {key}: {String(value)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Handle data point clicks
  const handleClick = (data: any) => {
    if (onDataPointClick && data) {
      onDataPointClick(data);
    }
  };

  // Wedding date reference line
  const weddingDateLine = useMemo(() => {
    if (!weddingDate) return null;

    try {
      const wedding = parseISO(weddingDate);
      if (isValid(wedding)) {
        return format(wedding, 'MMM dd');
      }
    } catch {
      return null;
    }
    return null;
  }, [weddingDate]);

  const ChartComponent = showArea ? AreaChart : LineChart;
  const DataComponent = showArea ? Area : Line;

  return (
    <ChartContainer
      title={title}
      description={description}
      metrics={metrics}
      chartType="line"
      isLoading={isLoading}
      error={error}
      onRefresh={onRefresh}
      onSettings={onSettings}
      realTimeEnabled={realTimeEnabled}
      refreshInterval={refreshInterval}
      lastUpdated={lastUpdated}
      className={className}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={processedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            onClick={handleClick}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="opacity-30"
              stroke="currentColor"
            />

            <XAxis
              dataKey="formattedDate"
              className="text-xs text-muted-foreground"
              axisLine={false}
              tickLine={false}
              dy={10}
            />

            <YAxis
              className="text-xs text-muted-foreground"
              axisLine={false}
              tickLine={false}
              dx={-10}
              tickFormatter={(value) => value.toLocaleString()}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />

            {/* Main data line/area */}
            <DataComponent
              type="monotone"
              dataKey="displayValue"
              stroke={color}
              fill={showArea ? color : undefined}
              fillOpacity={showArea ? 0.3 : undefined}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: 'white' }}
              name={title}
            />

            {/* Target line if enabled */}
            {showTarget && (
              <Line
                type="monotone"
                dataKey="displayTarget"
                stroke={targetColor}
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
                name="Target"
              />
            )}

            {/* Trend line if enabled */}
            {showTrend && trendData.length > 0 && (
              <Line
                type="linear"
                dataKey="trendValue"
                stroke="#64748b"
                strokeDasharray="2 2"
                strokeWidth={1}
                dot={false}
                name="Trend"
                data={trendData}
              />
            )}

            {/* Wedding date reference line */}
            {weddingDateLine && (
              <ReferenceLine
                x={weddingDateLine}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: 'Wedding Day',
                  position: 'top',
                  className: 'text-xs font-medium fill-amber-600',
                }}
              />
            )}

            {/* Milestone reference lines */}
            {milestones.map((milestone, index) => (
              <ReferenceLine
                key={index}
                x={milestone.date}
                stroke={milestone.color || '#8b5cf6'}
                strokeWidth={1}
                strokeDasharray="3 3"
                label={{
                  value: milestone.label,
                  position: 'top',
                  className: 'text-xs fill-purple-600',
                }}
              />
            ))}
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      {/* Chart statistics */}
      {processedData.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-muted-foreground">Current</div>
            <div className="font-medium">
              {processedData[
                processedData.length - 1
              ]?.displayValue.toLocaleString()}
              {metrics?.unit}
            </div>
          </div>

          <div className="text-center">
            <div className="text-muted-foreground">Peak</div>
            <div className="font-medium text-green-600">
              {Math.max(
                ...processedData.map((d) => d.displayValue),
              ).toLocaleString()}
              {metrics?.unit}
            </div>
          </div>

          {showTarget && processedData.some((d) => d.displayTarget) && (
            <div className="text-center">
              <div className="text-muted-foreground">Target</div>
              <div className="font-medium text-blue-600">
                {processedData[
                  processedData.length - 1
                ]?.displayTarget?.toLocaleString()}
                {metrics?.unit}
              </div>
            </div>
          )}

          <div className="text-center">
            <div className="text-muted-foreground">Trend</div>
            <div
              className={cn(
                'flex items-center justify-center gap-1 font-medium',
                metrics?.trend === 'up'
                  ? 'text-green-600'
                  : metrics?.trend === 'down'
                    ? 'text-red-600'
                    : 'text-gray-600',
              )}
            >
              {metrics?.trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {metrics?.trend === 'down' && (
                <TrendingDown className="w-3 h-3" />
              )}
              {metrics?.trend || 'Stable'}
            </div>
          </div>
        </div>
      )}

      {/* Wedding countdown if wedding date provided */}
      {weddingDate && (
        <div className="mt-4 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
          <div className="flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-pink-600" />
            <span className="text-pink-800 font-medium">
              Wedding Countdown:{' '}
              {(() => {
                try {
                  const wedding = parseISO(weddingDate);
                  const now = new Date();
                  const days = Math.ceil(
                    (wedding.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                  );
                  return days > 0 ? `${days} days to go!` : 'Wedding Day!';
                } catch {
                  return 'Invalid date';
                }
              })()}
            </span>
          </div>
        </div>
      )}
    </ChartContainer>
  );
};

export default ProgressLineChart;
export type { ProgressLineChartProps, DataPoint };
