'use client';

// WS-195: MRR Movement Chart Component
// Waterfall chart visualization for Monthly Recurring Revenue movements

import React, { useMemo } from 'react';
import { MRRMovement, ChartProps } from '@/types/business-metrics';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  DollarSign,
  Heart,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MRRMovementChartProps extends Omit<ChartProps, 'data'> {
  data: MRRMovement[];
  weddingSeasonHighlight?: boolean;
}

/**
 * MRR Movement Chart Component
 * Waterfall-style visualization of Monthly Recurring Revenue changes
 * Features:
 * - Visual representation of MRR movements (new, expansion, contraction, churn)
 * - Wedding industry context with seasonal highlighting
 * - Interactive movement details on hover
 * - Cumulative MRR calculation and display
 * - Color-coded movement types for quick analysis
 */
export function MRRMovementChart({
  data,
  height = 400,
  showLegend = true,
  interactive = false,
  weddingSeasonHighlight = false,
}: MRRMovementChartProps) {
  // Calculate chart data and cumulative values
  const chartData = useMemo(() => {
    if (!data.length) return { movements: [], totalChange: 0, maxValue: 0 };

    // Sort movements for logical display order
    const sortOrder = { new: 1, expansion: 2, contraction: 3, churn: 4 };
    const sortedMovements = [...data].sort(
      (a, b) => sortOrder[a.type] - sortOrder[b.type],
    );

    let cumulativeValue = 0;
    const movements = sortedMovements.map((movement, index) => {
      const value =
        movement.type === 'contraction' || movement.type === 'churn'
          ? -Math.abs(movement.amount)
          : Math.abs(movement.amount);

      const startValue = cumulativeValue;
      cumulativeValue += value;

      return {
        ...movement,
        value,
        startValue,
        endValue: cumulativeValue,
        isPositive: value > 0,
        barHeight: Math.abs(value),
      };
    });

    const allValues = movements.map((m) => Math.abs(m.value));
    const maxValue = Math.max(...allValues, Math.abs(cumulativeValue));

    return {
      movements,
      totalChange: cumulativeValue,
      maxValue: maxValue * 1.1, // Add 10% padding
    };
  }, [data]);

  // Get movement color and styling
  const getMovementStyle = (
    type: MRRMovement['type'],
    weddingContext?: string,
  ) => {
    const isWeddingRelated =
      weddingContext?.toLowerCase().includes('wedding') ||
      weddingContext?.toLowerCase().includes('season');

    const baseStyles = {
      new: {
        bg: 'bg-green-500',
        lightBg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-300',
        icon: <TrendingUp className="w-4 h-4" />,
      },
      expansion: {
        bg: 'bg-blue-500',
        lightBg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-300',
        icon: <ChevronUp className="w-4 h-4" />,
      },
      contraction: {
        bg: 'bg-yellow-500',
        lightBg: 'bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        icon: <ChevronDown className="w-4 h-4" />,
      },
      churn: {
        bg: 'bg-red-500',
        lightBg: 'bg-red-100',
        text: 'text-red-700',
        border: 'border-red-300',
        icon: <TrendingDown className="w-4 h-4" />,
      },
    };

    const style = baseStyles[type];

    // Wedding season highlighting
    if (isWeddingRelated && weddingSeasonHighlight) {
      return {
        ...style,
        bg: 'bg-pink-500',
        lightBg: 'bg-pink-100',
        text: 'text-pink-700',
        border: 'border-pink-300',
      };
    }

    return style;
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  // Calculate bar dimensions
  const getBarDimensions = (movement: any) => {
    const heightPercentage = (movement.barHeight / chartData.maxValue) * 80; // 80% of container
    const positionPercentage = 50 - heightPercentage / 2; // Center vertically

    return {
      height: `${heightPercentage}%`,
      bottom: movement.isPositive ? '50%' : 'auto',
      top: movement.isPositive ? 'auto' : '50%',
    };
  };

  if (!chartData.movements.length) {
    return (
      <div
        className="flex items-center justify-center text-gray-500"
        style={{ height }}
      >
        <div className="text-center">
          <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No MRR movement data available</p>
          <p className="text-sm">Revenue changes will appear as they occur</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      {/* Chart Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            MRR Movement Analysis
          </h3>
          <p className="text-sm text-gray-600">
            Monthly recurring revenue changes breakdown
          </p>
        </div>

        <div className="text-right">
          <div
            className={cn(
              'text-2xl font-bold',
              chartData.totalChange >= 0 ? 'text-green-600' : 'text-red-600',
            )}
          >
            {chartData.totalChange >= 0 ? '+' : ''}
            {formatCurrency(chartData.totalChange)}
          </div>
          <div className="text-sm text-gray-600">Net Change</div>
        </div>
      </div>

      {/* Wedding Season Banner */}
      {weddingSeasonHighlight && (
        <div className="mb-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
          <div className="flex items-center gap-2 text-pink-800">
            <Heart className="w-4 h-4" />
            <span className="text-sm font-medium">
              Wedding season impact highlighted in pink
            </span>
          </div>
        </div>
      )}

      {/* Waterfall Chart */}
      <div
        className="relative bg-gray-50 rounded-lg p-4"
        style={{ height: height * 0.6 }}
      >
        {/* Zero line */}
        <div
          className="absolute left-0 right-0 border-t border-gray-400 border-dashed"
          style={{ top: '50%' }}
        />

        <div className="flex justify-between items-end h-full">
          {chartData.movements.map((movement, index) => {
            const style = getMovementStyle(
              movement.type,
              movement.weddingContext,
            );
            const dimensions = getBarDimensions(movement);
            const isWeddingRelated =
              movement.weddingContext?.toLowerCase().includes('wedding') ||
              movement.weddingContext?.toLowerCase().includes('season');

            return (
              <div key={index} className="flex-1 mx-1 relative h-full group">
                {/* Bar */}
                <div
                  className={cn(
                    'absolute left-0 right-0 rounded-t transition-all duration-300',
                    style.bg,
                    interactive &&
                      'group-hover:opacity-80 group-hover:shadow-lg cursor-pointer',
                  )}
                  style={dimensions}
                />

                {/* Value Label */}
                <div
                  className={cn(
                    'absolute left-0 right-0 text-center text-xs font-medium text-white px-1',
                    movement.isPositive ? 'bottom-1/2 mb-2' : 'top-1/2 mt-2',
                  )}
                >
                  {formatCurrency(movement.value)}
                </div>

                {/* Hover Details */}
                {interactive && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <div
                      className={cn(
                        'bg-white rounded-lg shadow-lg border p-3 whitespace-nowrap',
                        style.border,
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {style.icon}
                        <span className="font-medium capitalize">
                          {movement.type}
                        </span>
                        {isWeddingRelated && weddingSeasonHighlight && (
                          <Heart className="w-3 h-3 text-pink-500" />
                        )}
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span className="font-medium">
                            {formatCurrency(movement.value)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Count:</span>
                          <span className="font-medium">
                            {movement.count} suppliers
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-600 border-t pt-2">
                        {movement.description}
                      </div>

                      {movement.weddingContext && (
                        <div className="mt-1 text-xs italic text-gray-500">
                          💒 {movement.weddingContext}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Movement Labels */}
      <div className="flex justify-between mt-4">
        {chartData.movements.map((movement, index) => {
          const style = getMovementStyle(
            movement.type,
            movement.weddingContext,
          );
          const isWeddingRelated =
            movement.weddingContext?.toLowerCase().includes('wedding') ||
            movement.weddingContext?.toLowerCase().includes('season');

          return (
            <div key={index} className="flex-1 mx-1 text-center">
              <div className={cn('p-2 rounded', style.lightBg)}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  {style.icon}
                  <span
                    className={cn('text-sm font-medium capitalize', style.text)}
                  >
                    {movement.type}
                  </span>
                  {isWeddingRelated && weddingSeasonHighlight && (
                    <Heart className="w-3 h-3 text-pink-500" />
                  )}
                </div>

                <div className="text-xs text-gray-600">
                  {movement.count} suppliers
                </div>

                <div className={cn('text-sm font-bold', style.text)}>
                  {movement.isPositive ? '+' : ''}
                  {formatCurrency(movement.value)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-lg font-bold text-green-600">
            {formatCurrency(
              chartData.movements
                .filter((m) => m.isPositive)
                .reduce((sum, m) => sum + m.value, 0),
            )}
          </div>
          <div className="text-sm text-green-700">Total Growth</div>
        </div>

        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-lg font-bold text-red-600">
            {formatCurrency(
              chartData.movements
                .filter((m) => !m.isPositive)
                .reduce((sum, m) => sum + Math.abs(m.value), 0),
            )}
          </div>
          <div className="text-sm text-red-700">Total Loss</div>
        </div>

        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-900">
            {chartData.movements.reduce((sum, m) => sum + m.count, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Suppliers</div>
        </div>

        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div
            className={cn(
              'text-lg font-bold',
              chartData.totalChange >= 0 ? 'text-blue-600' : 'text-red-600',
            )}
          >
            {chartData.totalChange >= 0 ? '+' : ''}
            {formatCurrency(chartData.totalChange)}
          </div>
          <div className="text-sm text-blue-700">Net MRR Change</div>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span>New MRR</span>
          </div>
          <div className="flex items-center gap-2">
            <ChevronUp className="w-4 h-4 text-blue-600" />
            <span>Expansion</span>
          </div>
          <div className="flex items-center gap-2">
            <ChevronDown className="w-4 h-4 text-yellow-600" />
            <span>Contraction</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span>Churn</span>
          </div>
          {weddingSeasonHighlight && (
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-600" />
              <span>Wedding Season Impact</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MRRMovementChart;
