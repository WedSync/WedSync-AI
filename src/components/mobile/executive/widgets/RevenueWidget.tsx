'use client';

import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import { LineChart } from './ChartComponents';

interface RevenueData {
  current: number;
  previous: number;
  growth: number;
  trend: 'up' | 'down' | 'stable';
  chartData: {
    labels: string[];
    values: number[];
  };
  forecast?: number;
}

interface RevenueWidgetProps {
  data: RevenueData;
  loading?: boolean;
  error?: string;
  onTap?: () => void;
  size?: 'small' | 'medium' | 'large' | 'full';
}

export function RevenueWidget({
  data,
  loading = false,
  error,
  onTap,
  size = 'large',
}: RevenueWidgetProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatGrowth = (growth: number): string => {
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  const getTrendIcon = () => {
    switch (data.trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-400" />;
      default:
        return <DollarSign className="w-3 h-3 text-yellow-400" />;
    }
  };

  const getTrendColor = () => {
    switch (data.trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  return (
    <WidgetContainer
      title="Monthly Revenue"
      icon={DollarSign}
      size={size}
      gradient="from-green-500 to-emerald-600"
      onTap={onTap}
      loading={loading}
      error={error}
    >
      {!loading && !error && (
        <div className="w-full h-full flex flex-col">
          {/* Revenue Display */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(data.current)}
              </div>
              <div className="text-xs text-white/80">
                Previous: {formatCurrency(data.previous)}
              </div>
            </div>

            <div className="text-right">
              <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="text-sm font-semibold">
                  {formatGrowth(data.growth)}
                </span>
              </div>
              {data.forecast && (
                <div className="text-xs text-white/70 mt-1">
                  Forecast: {formatCurrency(data.forecast)}
                </div>
              )}
            </div>
          </div>

          {/* Mini Chart */}
          {size === 'large' || size === 'full' ? (
            <div className="flex-1 mt-2">
              <LineChart
                data={data.chartData}
                height={60}
                color="rgba(255,255,255,0.8)"
                gradient={true}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-end justify-center">
              <div className="flex items-end space-x-1 h-8">
                {data.chartData.values.slice(-6).map((value, index) => {
                  const maxValue = Math.max(...data.chartData.values);
                  const height = (value / maxValue) * 32;
                  return (
                    <div
                      key={index}
                      className="bg-white/60 rounded-sm"
                      style={{
                        width: '4px',
                        height: `${height}px`,
                        minHeight: '2px',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
}

export default RevenueWidget;
