'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  MessageSquare,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Zap,
  Activity,
  Wifi,
  Timer,
} from 'lucide-react';

interface SMSMetrics {
  timestamp: string;
  queryTimeMs: number;
  service: {
    queueSize: number;
    processingRate: number;
    successRate: number;
    avgDeliveryTime: number;
    costPerMessage: number;
  };
  database: {
    totalMessages: number;
    sentMessages: number;
    failedMessages: number;
    queuedMessages: number;
    successRate: number;
    avgDeliveryTimeMs: number;
    processingRatePerHour: number;
  };
  queues: Array<{
    priority: string;
    queuedCount: number;
    processingRate: number;
    avgDeliveryTime: number;
    successRate: number;
  }>;
  carriers: Array<{
    name: string;
    totalMessages: number;
    successRate: number;
    avgLatencyMs: number;
    costPerMessage: number;
  }>;
  cost: {
    totalSpend: number;
    avgCostPerMessage: number;
    messageCount: number;
    budget?: {
      dailyLimit: number;
      currentSpend: number;
      usagePercent: number;
      remainingBudget: number;
    };
  };
  health: {
    targetMet: {
      processingRate: boolean;
      avgDeliveryTime: boolean;
      successRate: boolean;
      queueSize: boolean;
    };
    overall: 'excellent' | 'good' | 'warning' | 'critical';
  };
}

interface SMSPerformanceDashboardProps {
  weddingId?: string;
  refreshInterval?: number;
  className?: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Untitled UI Card Component
const Card = ({ children, className = '', ...props }: any) => (
  <div
    className={`bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200 ${className}`}
    {...props}
  >
    {children}
  </div>
);

// Untitled UI Badge Component
const Badge = ({ children, variant = 'default', className = '' }: any) => {
  const variants = {
    default: 'bg-primary-50 text-primary-700 border-primary-200',
    success: 'bg-success-50 text-success-700 border-success-200',
    error: 'bg-error-50 text-error-700 border-error-200',
    warning: 'bg-warning-50 text-warning-700 border-warning-200',
    secondary: 'bg-gray-50 text-gray-700 border-gray-200',
    outline: 'bg-white text-gray-700 border-gray-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

// Untitled UI Button Component
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  ...props
}: any) => {
  const variants = {
    primary:
      'bg-primary-600 hover:bg-primary-700 text-white shadow-xs hover:shadow-sm',
    secondary:
      'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-xs',
    outline: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
    ghost: 'hover:bg-gray-50 text-gray-700',
  };

  const sizes = {
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4.5 py-2.5 text-base',
  };

  return (
    <button
      className={`
        ${variants[variant]} ${sizes[size]}
        font-semibold rounded-lg
        transition-all duration-200
        focus:outline-none focus:ring-4 focus:ring-primary-100
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// Untitled UI Progress Component
const Progress = ({
  value,
  className = '',
}: {
  value: number;
  className?: string;
}) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div
      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

// Untitled UI Alert Component
const Alert = ({ children, variant = 'default', className = '' }: any) => {
  const variants = {
    default: 'bg-blue-50 border-blue-200 text-blue-700',
    error: 'bg-error-50 border-error-200 text-error-700',
    warning: 'bg-warning-50 border-warning-200 text-warning-700',
    success: 'bg-success-50 border-success-200 text-success-700',
  };

  return (
    <div className={`p-4 border rounded-lg ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};

export function SMSPerformanceDashboard({
  weddingId,
  refreshInterval = 5000,
  className = '',
}: SMSPerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<SMSMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch metrics from API
  const fetchMetrics = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (weddingId) params.append('weddingId', weddingId);
      params.append('timeframe', '1h');

      const response = await fetch(`/api/sms/metrics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');

      const data = await response.json();
      setMetrics(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [weddingId]);

  // Real-time updates via Supabase
  useEffect(() => {
    if (!weddingId) return;

    const channel = supabase.channel(`sms_updates_${weddingId}`);

    channel
      .on('broadcast', { event: 'sms_status_update' }, () => {
        // Refresh metrics when SMS status updates occur
        fetchMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [weddingId, fetchMetrics]);

  // Periodic refresh
  useEffect(() => {
    fetchMetrics();

    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'border-success-200 bg-success-25';
      case 'good':
        return 'border-blue-200 bg-blue-25';
      case 'warning':
        return 'border-warning-200 bg-warning-25';
      case 'critical':
        return 'border-error-200 bg-error-25';
      default:
        return 'border-gray-200 bg-gray-25';
    }
  };

  const getHealthTextColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'text-success-700';
      case 'good':
        return 'text-blue-700';
      case 'warning':
        return 'text-warning-700';
      case 'critical':
        return 'text-error-700';
      default:
        return 'text-gray-700';
    }
  };

  const getHealthIcon = (health: string) => {
    const iconClass = `h-5 w-5 ${getHealthTextColor(health)}`;
    switch (health) {
      case 'excellent':
        return <CheckCircle className={iconClass} />;
      case 'good':
        return <TrendingUp className={iconClass} />;
      case 'warning':
        return <AlertCircle className={iconClass} />;
      case 'critical':
        return <AlertCircle className={iconClass} />;
      default:
        return <Activity className={iconClass} />;
    }
  };

  const formatNumber = (num: number, decimals = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-100 rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-gray-100 rounded-xl"></div>
            <div className="h-24 bg-gray-100 rounded-xl"></div>
            <div className="h-24 bg-gray-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className={className}>
        <Alert variant="error">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-semibold">Failed to load SMS metrics</span>
          </div>
          <p className="text-sm mt-1">{error}</p>
          <Button
            onClick={fetchMetrics}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Health Status */}
      <Card className={`border-2 ${getHealthColor(metrics.health.overall)}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getHealthIcon(metrics.health.overall)}
            <h2 className="text-xl font-semibold text-gray-900">
              SMS System Health
            </h2>
            <Badge
              variant={
                metrics.health.overall === 'excellent'
                  ? 'success'
                  : metrics.health.overall === 'good'
                    ? 'default'
                    : metrics.health.overall === 'warning'
                      ? 'warning'
                      : 'error'
              }
            >
              {metrics.health.overall}
            </Badge>
          </div>
          <div className="text-sm text-gray-500">
            Updated {lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${metrics.health.targetMet.processingRate ? 'bg-success-500' : 'bg-error-500'}`}
            ></div>
            <span className="text-sm font-medium text-gray-700">
              Processing Rate
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${metrics.health.targetMet.avgDeliveryTime ? 'bg-success-500' : 'bg-error-500'}`}
            ></div>
            <span className="text-sm font-medium text-gray-700">
              Delivery Time
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${metrics.health.targetMet.successRate ? 'bg-success-500' : 'bg-error-500'}`}
            ></div>
            <span className="text-sm font-medium text-gray-700">
              Success Rate
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${metrics.health.targetMet.queueSize ? 'bg-success-500' : 'bg-error-500'}`}
            ></div>
            <span className="text-sm font-medium text-gray-700">
              Queue Health
            </span>
          </div>
        </div>
      </Card>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-5 w-5 text-primary-600" />
            <span className="text-sm font-medium text-gray-600">
              Processing Rate
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatNumber(metrics.service.processingRate, 1)}/min
          </div>
          <div className="text-xs text-gray-500 mb-3">
            Target: 33.3/min (2000/hour)
          </div>
          <Progress
            value={Math.min(100, (metrics.service.processingRate / 33.3) * 100)}
          />
        </Card>

        <Card>
          <div className="flex items-center space-x-2 mb-2">
            <Timer className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">
              Avg Delivery Time
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatNumber(metrics.service.avgDeliveryTime)}ms
          </div>
          <div className="text-xs text-gray-500 mb-3">Target: ≤ 500ms</div>
          <Progress
            value={Math.max(
              0,
              100 - (metrics.service.avgDeliveryTime / 500) * 100,
            )}
          />
        </Card>

        <Card>
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-5 w-5 text-success-600" />
            <span className="text-sm font-medium text-gray-600">
              Success Rate
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatNumber(metrics.service.successRate, 1)}%
          </div>
          <div className="text-xs text-gray-500 mb-3">Target: ≥ 95%</div>
          <Progress value={metrics.service.successRate} />
        </Card>

        <Card>
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">
              Queue Size
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatNumber(metrics.service.queueSize)}
          </div>
          <div className="text-xs text-gray-500 mb-3">Target: ≤ 1000</div>
          <Progress
            value={Math.max(0, 100 - (metrics.service.queueSize / 1000) * 100)}
          />
        </Card>
      </div>

      {/* Queue Status by Priority */}
      <Card>
        <div className="flex items-center space-x-2 mb-4">
          <MessageSquare className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Queue Status by Priority
          </h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Real-time queue processing status for each priority level
        </p>

        <div className="space-y-4">
          {metrics.queues.map((queue) => (
            <div
              key={queue.priority}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"
            >
              <div className="flex items-center space-x-3">
                <Badge
                  variant={
                    queue.priority === 'emergency'
                      ? 'error'
                      : queue.priority === 'high'
                        ? 'warning'
                        : queue.priority === 'normal'
                          ? 'default'
                          : 'secondary'
                  }
                >
                  {queue.priority}
                </Badge>
                <span className="text-sm font-medium text-gray-900">
                  {formatNumber(queue.queuedCount)} queued
                </span>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <div>
                  <span className="text-gray-500">Rate:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {formatNumber(queue.processingRate, 1)}/min
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Success:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {formatNumber(queue.successRate, 1)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Latency:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {formatNumber(queue.avgDeliveryTime)}ms
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Cost & Budget Tracking */}
      {metrics.cost.budget && (
        <Card>
          <div className="flex items-center space-x-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Cost & Budget Tracking
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatCurrency(metrics.cost.budget.currentSpend)}
              </div>
              <div className="text-sm text-gray-600 mb-3">Current Spend</div>
              <Progress
                value={metrics.cost.budget.usagePercent}
                className={`${metrics.cost.budget.usagePercent > 80 ? 'bg-error-100' : 'bg-gray-200'}`}
              />
              <div className="text-xs text-gray-500 mt-2">
                {metrics.cost.budget.usagePercent.toFixed(1)}% of daily limit
              </div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {formatCurrency(metrics.cost.budget.dailyLimit)}
              </div>
              <div className="text-sm text-gray-600 mb-4">Daily Limit</div>
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {formatCurrency(metrics.cost.budget.remainingBudget)}
              </div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {formatCurrency(metrics.cost.avgCostPerMessage)}
              </div>
              <div className="text-sm text-gray-600 mb-4">Avg Cost/Message</div>
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {formatNumber(metrics.cost.messageCount)}
              </div>
              <div className="text-sm text-gray-600">Messages Today</div>
            </div>
          </div>
        </Card>
      )}

      {/* Carrier Performance */}
      {metrics.carriers.length > 0 && (
        <Card>
          <div className="flex items-center space-x-2 mb-4">
            <Wifi className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Carrier Performance
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Performance comparison across different carriers
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700">
                    Carrier
                  </th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">
                    Messages
                  </th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">
                    Success Rate
                  </th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">
                    Avg Latency
                  </th>
                  <th className="text-right py-3 px-2 font-semibold text-gray-700">
                    Cost/Message
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.carriers.map((carrier) => (
                  <tr key={carrier.name} className="border-b border-gray-100">
                    <td className="py-3 px-2 font-medium text-gray-900">
                      {carrier.name}
                    </td>
                    <td className="py-3 px-2 text-right text-gray-700">
                      {formatNumber(carrier.totalMessages)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={`font-medium ${
                          carrier.successRate >= 95
                            ? 'text-success-600'
                            : carrier.successRate >= 90
                              ? 'text-warning-600'
                              : 'text-error-600'
                        }`}
                      >
                        {formatNumber(carrier.successRate, 1)}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-gray-700">
                      {formatNumber(carrier.avgLatencyMs)}ms
                    </td>
                    <td className="py-3 px-2 text-right text-gray-700">
                      {formatCurrency(carrier.costPerMessage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Performance Footer */}
      <div className="text-center text-xs text-gray-500 py-4 border-t border-gray-100">
        Query time: {metrics.queryTimeMs}ms | Last updated:{' '}
        {new Date(metrics.timestamp).toLocaleString()} | Auto-refresh:{' '}
        {refreshInterval / 1000}s
      </div>
    </div>
  );
}
