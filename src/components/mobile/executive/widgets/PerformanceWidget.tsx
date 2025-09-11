'use client';

import React from 'react';
import { Zap, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import { GaugeChart, ProgressRing } from './ChartComponents';

interface PerformanceData {
  uptime: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  alerts: number;
}

interface PerformanceWidgetProps {
  data: PerformanceData;
  loading?: boolean;
  error?: string;
  onTap?: () => void;
  size?: 'small' | 'medium' | 'large' | 'full';
}

export function PerformanceWidget({
  data,
  loading = false,
  error,
  onTap,
  size = 'medium',
}: PerformanceWidgetProps) {
  const getStatusColor = () => {
    switch (data.status) {
      case 'excellent':
        return 'from-green-500 to-emerald-600';
      case 'good':
        return 'from-blue-500 to-cyan-600';
      case 'warning':
        return 'from-yellow-500 to-orange-600';
      case 'critical':
        return 'from-red-500 to-pink-600';
      default:
        return 'from-gray-500 to-slate-600';
    }
  };

  const getStatusIcon = () => {
    switch (data.status) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning':
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Zap className="w-4 h-4 text-white" />;
    }
  };

  const formatResponseTime = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  const formatThroughput = (ops: number): string => {
    if (ops >= 1000000) {
      return `${(ops / 1000000).toFixed(1)}M/s`;
    }
    if (ops >= 1000) {
      return `${(ops / 1000).toFixed(1)}K/s`;
    }
    return `${ops}/s`;
  };

  return (
    <WidgetContainer
      title="Performance"
      icon={Zap}
      size={size}
      gradient={getStatusColor()}
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
                  {data.uptime.toFixed(1)}%
                </div>
                <div className="text-xs text-white/80">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-white">
                  {formatResponseTime(data.responseTime)}
                </div>
                <div className="text-xs text-white/80">Response</div>
              </div>
              <div className="flex items-center">{getStatusIcon()}</div>
            </div>
          ) : (
            // Full view for medium+ widgets
            <div className="space-y-3">
              {/* Status header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon()}
                  <span className="text-sm font-semibold text-white capitalize">
                    {data.status}
                  </span>
                </div>
                {data.alerts > 0 && (
                  <div className="flex items-center space-x-1 text-yellow-300">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-xs font-semibold">{data.alerts}</span>
                  </div>
                )}
              </div>

              {/* Main metrics */}
              <div className="grid grid-cols-2 gap-3">
                {/* Uptime */}
                <div className="text-center">
                  <div className="mb-2">
                    <ProgressRing
                      percentage={data.uptime}
                      size={size === 'large' || size === 'full' ? 50 : 40}
                      strokeWidth={4}
                      color="#10b981"
                      backgroundColor="rgba(255,255,255,0.3)"
                    />
                  </div>
                  <div className="text-xs text-white/80">Uptime</div>
                </div>

                {/* Response Time Gauge */}
                <div className="text-center">
                  {size === 'large' || size === 'full' ? (
                    <div className="mb-2">
                      <GaugeChart
                        value={Math.min(data.responseTime, 2000)}
                        max={2000}
                        height={50}
                        color={data.responseTime > 1000 ? '#ef4444' : '#10b981'}
                        label={formatResponseTime(data.responseTime)}
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="text-lg font-bold text-white">
                        {formatResponseTime(data.responseTime)}
                      </div>
                      <div className="text-xs text-white/80">Response</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional metrics for larger widgets */}
              {(size === 'large' || size === 'full') && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-2 bg-white/10 rounded-lg">
                    <div className="font-semibold text-white">
                      {data.errorRate.toFixed(2)}%
                    </div>
                    <div className="text-white/70">Error Rate</div>
                  </div>
                  <div className="text-center p-2 bg-white/10 rounded-lg">
                    <div className="font-semibold text-white">
                      {formatThroughput(data.throughput)}
                    </div>
                    <div className="text-white/70">Throughput</div>
                  </div>
                </div>
              )}

              {/* Bottom indicators */}
              <div className="flex justify-between items-center text-xs text-white/80">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Avg: {formatResponseTime(data.responseTime)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      data.errorRate < 1
                        ? 'bg-green-400'
                        : data.errorRate < 5
                          ? 'bg-yellow-400'
                          : 'bg-red-400'
                    }`}
                  />
                  <span>{data.errorRate.toFixed(1)}% errors</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
}

export default PerformanceWidget;
