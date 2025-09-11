'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChartContainer, type ChartMetrics } from './ChartContainer';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertTriangle, Target } from 'lucide-react';

interface GaugeDataPoint {
  name: string;
  value: number;
  target?: number;
  color?: string;
  category?: 'completed' | 'in_progress' | 'overdue' | 'pending';
}

interface ProgressGaugeChartProps {
  title: string;
  description?: string;
  data: GaugeDataPoint[];
  metrics?: ChartMetrics;
  isLoading?: boolean;
  error?: string | null;
  className?: string;

  // Gauge configuration
  percentage?: number; // Main percentage to display
  target?: number;
  unit?: string;
  showProgress?: boolean;
  showCategories?: boolean;
  size?: 'sm' | 'md' | 'lg';

  // Colors
  primaryColor?: string;
  backgroundColor?: string;
  dangerColor?: string;
  warningColor?: string;
  successColor?: string;

  // Interaction
  onRefresh?: () => void;
  onSettings?: () => void;

  // Real-time
  realTimeEnabled?: boolean;
  refreshInterval?: number;
  lastUpdated?: Date;

  // Wedding-specific
  weddingProgress?: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    upcomingTasks: number;
  };
}

const ProgressGaugeChart: React.FC<ProgressGaugeChartProps> = ({
  title,
  description,
  data,
  metrics,
  isLoading,
  error,
  className,
  percentage = 0,
  target = 100,
  unit = '%',
  showProgress = true,
  showCategories = true,
  size = 'md',
  primaryColor = '#3b82f6',
  backgroundColor = '#e5e7eb',
  dangerColor = '#ef4444',
  warningColor = '#f59e0b',
  successColor = '#10b981',
  onRefresh,
  onSettings,
  realTimeEnabled = false,
  refreshInterval = 300,
  lastUpdated,
  weddingProgress,
}) => {
  // Gauge size configurations
  const sizeConfig = {
    sm: { radius: 60, strokeWidth: 8, centerSize: 40 },
    md: { radius: 80, strokeWidth: 12, centerSize: 60 },
    lg: { radius: 100, strokeWidth: 16, centerSize: 80 },
  };

  const config = sizeConfig[size];

  // Calculate gauge data
  const gaugeData = useMemo(() => {
    const progress = Math.min(Math.max(percentage, 0), 100);
    const remaining = 100 - progress;

    return [
      { name: 'Progress', value: progress },
      { name: 'Remaining', value: remaining },
    ];
  }, [percentage]);

  // Get color based on percentage and thresholds
  const getProgressColor = (value: number) => {
    if (value >= 90) return successColor;
    if (value >= 70) return primaryColor;
    if (value >= 40) return warningColor;
    return dangerColor;
  };

  // Calculate wedding progress statistics
  const weddingStats = useMemo(() => {
    if (!weddingProgress) return null;

    const { totalTasks, completedTasks, overdueTasks, upcomingTasks } =
      weddingProgress;
    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const overdueRate = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;

    return {
      completionRate: Math.round(completionRate),
      overdueRate: Math.round(overdueRate),
      onTrack: completionRate >= 70 && overdueRate <= 10,
      status:
        completionRate >= 90
          ? 'excellent'
          : completionRate >= 70
            ? 'good'
            : completionRate >= 50
              ? 'fair'
              : 'needs_attention',
    };
  }, [weddingProgress]);

  // Category data for progress breakdown
  const categoryData = useMemo(() => {
    if (!showCategories || !data.length) return [];

    const categories = data.reduce(
      (acc, item) => {
        const category = item.category || 'other';
        acc[category] = (acc[category] || 0) + item.value;
        return acc;
      },
      {} as Record<string, number>,
    );

    const total = Object.values(categories).reduce((sum, val) => sum + val, 0);

    return Object.entries(categories).map(([category, value]) => ({
      name: category,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
      color: getCategoryColor(category),
    }));
  }, [data, showCategories]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'completed':
        return successColor;
      case 'in_progress':
        return primaryColor;
      case 'overdue':
        return dangerColor;
      case 'pending':
        return warningColor;
      default:
        return '#6b7280';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'completed':
        return CheckCircle;
      case 'in_progress':
        return Clock;
      case 'overdue':
        return AlertTriangle;
      case 'pending':
        return Target;
      default:
        return Clock;
    }
  };

  return (
    <ChartContainer
      title={title}
      description={description}
      metrics={metrics}
      chartType="gauge"
      isLoading={isLoading}
      error={error}
      onRefresh={onRefresh}
      onSettings={onSettings}
      realTimeEnabled={realTimeEnabled}
      refreshInterval={refreshInterval}
      lastUpdated={lastUpdated}
      className={className}
    >
      <div className="flex flex-col items-center space-y-4">
        {/* Main Gauge */}
        <div className="relative">
          <ResponsiveContainer
            width={config.radius * 2 + 20}
            height={config.radius * 2 + 20}
          >
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={-270}
                innerRadius={config.radius - config.strokeWidth}
                outerRadius={config.radius}
                paddingAngle={2}
                dataKey="value"
              >
                <Cell fill={getProgressColor(percentage)} />
                <Cell fill={backgroundColor} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <div
                className={cn(
                  'font-bold',
                  size === 'sm'
                    ? 'text-lg'
                    : size === 'md'
                      ? 'text-2xl'
                      : 'text-3xl',
                )}
              >
                {Math.round(percentage)}
                {unit}
              </div>
              {target && target !== 100 && (
                <div className="text-xs text-muted-foreground">
                  of {target}
                  {unit}
                </div>
              )}
              {weddingStats && (
                <div
                  className={cn(
                    'text-xs font-medium mt-1',
                    weddingStats.status === 'excellent'
                      ? 'text-green-600'
                      : weddingStats.status === 'good'
                        ? 'text-blue-600'
                        : weddingStats.status === 'fair'
                          ? 'text-yellow-600'
                          : 'text-red-600',
                  )}
                >
                  {weddingStats.status === 'excellent'
                    ? 'Excellent!'
                    : weddingStats.status === 'good'
                      ? 'On Track'
                      : weddingStats.status === 'fair'
                        ? 'Fair Progress'
                        : 'Needs Attention'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>
                {Math.round(percentage)}
                {unit}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out rounded-full"
                style={{
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: getProgressColor(percentage),
                }}
              />
            </div>
            {target && target !== 100 && (
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span>{target}</span>
              </div>
            )}
          </div>
        )}

        {/* Wedding Progress Details */}
        {weddingProgress && (
          <div className="w-full grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <div className="font-medium text-green-800">
                {weddingProgress.completedTasks}
              </div>
              <div className="text-green-600 text-xs">Completed</div>
            </div>

            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <div className="font-medium text-blue-800">
                {weddingProgress.upcomingTasks}
              </div>
              <div className="text-blue-600 text-xs">Upcoming</div>
            </div>

            {weddingProgress.overdueTasks > 0 && (
              <div className="col-span-2 text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <div className="font-medium text-red-800">
                  {weddingProgress.overdueTasks}
                </div>
                <div className="text-red-600 text-xs">Overdue Tasks</div>
              </div>
            )}
          </div>
        )}

        {/* Category Breakdown */}
        {showCategories && categoryData.length > 0 && (
          <div className="w-full space-y-2">
            <div className="text-sm font-medium text-center mb-3">
              Progress Breakdown
            </div>
            {categoryData.map((category) => {
              const Icon = getCategoryIcon(category.name);
              return (
                <div
                  key={category.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className="w-4 h-4"
                      style={{ color: category.color }}
                    />
                    <span className="text-sm capitalize">
                      {category.name.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${category.percentage}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">
                      {Math.round(category.percentage)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Performance Indicator */}
        {metrics && (
          <div className="w-full p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Performance</span>
              <div
                className={cn(
                  'flex items-center gap-1 font-medium',
                  metrics.trend === 'up'
                    ? 'text-green-600'
                    : metrics.trend === 'down'
                      ? 'text-red-600'
                      : 'text-gray-600',
                )}
              >
                {metrics.changePercentage >= 0 ? '+' : ''}
                {metrics.changePercentage.toFixed(1)}%
                <span className="text-xs">vs last period</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ChartContainer>
  );
};

export default ProgressGaugeChart;
export type { ProgressGaugeChartProps, GaugeDataPoint };
