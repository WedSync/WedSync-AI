'use client';

import React from 'react';
import { Users, UserPlus, UserMinus, Heart } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import { DonutChart, ProgressRing } from './ChartComponents';

interface ClientMetricsData {
  total: number;
  active: number;
  new: number;
  churned: number;
  satisfaction: number;
  engagement: {
    labels: string[];
    values: number[];
  };
}

interface ClientMetricsWidgetProps {
  data: ClientMetricsData;
  loading?: boolean;
  error?: string;
  onTap?: () => void;
  size?: 'small' | 'medium' | 'large' | 'full';
}

export function ClientMetricsWidget({
  data,
  loading = false,
  error,
  onTap,
  size = 'medium',
}: ClientMetricsWidgetProps) {
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getEngagementColors = () => [
    '#10b981', // Active - Green
    '#f59e0b', // Moderate - Yellow
    '#ef4444', // Low - Red
    '#6b7280', // Inactive - Gray
  ];

  return (
    <WidgetContainer
      title="Client Metrics"
      icon={Users}
      size={size}
      gradient="from-blue-500 to-indigo-600"
      onTap={onTap}
      loading={loading}
      error={error}
    >
      {!loading && !error && (
        <div className="w-full h-full flex flex-col">
          {size === 'small' ? (
            // Compact view for small widgets
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-lg font-bold text-white">
                  {formatNumber(data.total)}
                </div>
                <div className="text-xs text-white/80">Total</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-300">
                  +{data.new}
                </div>
                <div className="text-xs text-white/80">New</div>
              </div>
              <div className="w-8 h-8">
                <ProgressRing
                  percentage={data.satisfaction * 20}
                  size={32}
                  strokeWidth={3}
                  color="#10b981"
                  backgroundColor="rgba(255,255,255,0.3)"
                />
              </div>
            </div>
          ) : (
            // Full view for medium+ widgets
            <div className="space-y-3">
              {/* Top metrics row */}
              <div className="flex justify-between items-center">
                <div className="flex space-x-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">
                      {formatNumber(data.total)}
                    </div>
                    <div className="text-xs text-white/80 flex items-center">
                      <Users className="w-3 h-3 mr-1" />
                      Total
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-bold text-green-300">
                      +{data.new}
                    </div>
                    <div className="text-xs text-white/80 flex items-center">
                      <UserPlus className="w-3 h-3 mr-1" />
                      New
                    </div>
                  </div>

                  {data.churned > 0 && (
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-300">
                        -{data.churned}
                      </div>
                      <div className="text-xs text-white/80 flex items-center">
                        <UserMinus className="w-3 h-3 mr-1" />
                        Lost
                      </div>
                    </div>
                  )}
                </div>

                {/* Satisfaction Score */}
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Heart className="w-3 h-3 text-red-400 mr-1" />
                    <span className="text-sm font-semibold text-white">
                      {data.satisfaction.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-xs text-white/80">Satisfaction</div>
                </div>
              </div>

              {/* Engagement chart for larger widgets */}
              {(size === 'large' || size === 'full') && (
                <div className="flex items-center justify-center flex-1">
                  <div className="w-16 h-16">
                    <DonutChart
                      data={data.engagement}
                      height={64}
                      colors={getEngagementColors()}
                    />
                  </div>
                  <div className="ml-3 space-y-1">
                    {data.engagement.labels.map((label, index) => (
                      <div key={label} className="flex items-center text-xs">
                        <div
                          className="w-2 h-2 rounded-full mr-2"
                          style={{
                            backgroundColor: getEngagementColors()[index],
                          }}
                        />
                        <span className="text-white/80">
                          {label}: {data.engagement.values[index]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active clients indicator */}
              <div className="flex items-center justify-between text-xs text-white/80">
                <span>Active: {formatNumber(data.active)}</span>
                <span>
                  {((data.active / data.total) * 100).toFixed(0)}% active rate
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
}

export default ClientMetricsWidget;
