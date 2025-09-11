'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Database,
  Users,
  Clock,
  Activity,
  Server,
  Wifi,
  HardDrive,
  BarChart3,
  PieChart,
  LineChart,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

// Types
interface MetricData {
  timestamp: Date;
  value: number;
  label?: string;
}

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  threshold: number;
  status: 'healthy' | 'warning' | 'critical';
  data: MetricData[];
  target?: number;
  description?: string;
}

interface MobileMetricsCardsProps {
  weddingId?: string;
  refreshInterval?: number;
  batteryOptimized?: boolean;
  className?: string;
}

export function MobileMetricsCards({
  weddingId,
  refreshInterval = 30000,
  batteryOptimized = false,
  className = '',
}: MobileMetricsCardsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<
    '1h' | '6h' | '24h' | '7d'
  >('6h');
  const [selectedCategory, setSelectedCategory] = useState<
    'performance' | 'infrastructure' | 'business'
  >('performance');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - in production, this would come from your monitoring APIs
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([
    {
      id: 'response_time',
      name: 'Response Time',
      value: 145,
      unit: 'ms',
      trend: 'down',
      trendValue: -8.5,
      threshold: 200,
      status: 'healthy',
      target: 150,
      description: 'Average API response time',
      data: generateTimeSeriesData(24, 120, 180),
    },
    {
      id: 'throughput',
      name: 'Throughput',
      value: 1247,
      unit: 'req/s',
      trend: 'up',
      trendValue: 12.3,
      threshold: 1000,
      status: 'healthy',
      target: 1500,
      description: 'Requests per second',
      data: generateTimeSeriesData(24, 1000, 1500),
    },
    {
      id: 'error_rate',
      name: 'Error Rate',
      value: 0.02,
      unit: '%',
      trend: 'down',
      trendValue: -0.08,
      threshold: 1.0,
      status: 'healthy',
      target: 0.1,
      description: 'Percentage of failed requests',
      data: generateTimeSeriesData(24, 0, 0.5),
    },
    {
      id: 'cache_hit_rate',
      name: 'Cache Hit Rate',
      value: 94.8,
      unit: '%',
      trend: 'up',
      trendValue: 2.1,
      threshold: 90,
      status: 'healthy',
      target: 95,
      description: 'Cache effectiveness',
      data: generateTimeSeriesData(24, 85, 98),
    },
    {
      id: 'cpu_usage',
      name: 'CPU Usage',
      value: 65.2,
      unit: '%',
      trend: 'stable',
      trendValue: 0.5,
      threshold: 80,
      status: 'healthy',
      target: 70,
      description: 'Average CPU utilization',
      data: generateTimeSeriesData(24, 50, 85),
    },
    {
      id: 'memory_usage',
      name: 'Memory Usage',
      value: 72.1,
      unit: '%',
      trend: 'up',
      trendValue: 5.2,
      threshold: 85,
      status: 'warning',
      target: 75,
      description: 'Memory utilization',
      data: generateTimeSeriesData(24, 60, 90),
    },
  ]);

  // Business metrics for wedding context
  const [businessMetrics, setBusinessMetrics] = useState<PerformanceMetric[]>([
    {
      id: 'active_weddings',
      name: 'Active Weddings',
      value: 23,
      unit: 'weddings',
      trend: 'up',
      trendValue: 4,
      threshold: 50,
      status: 'healthy',
      description: 'Weddings happening today',
      data: generateTimeSeriesData(24, 15, 35, 'count'),
    },
    {
      id: 'guest_rsvps',
      name: 'Guest RSVPs',
      value: 1847,
      unit: 'responses',
      trend: 'up',
      trendValue: 156,
      threshold: 2000,
      status: 'healthy',
      description: 'RSVP responses today',
      data: generateTimeSeriesData(24, 1500, 2000, 'count'),
    },
    {
      id: 'vendor_uploads',
      name: 'Vendor Uploads',
      value: 342,
      unit: 'files',
      trend: 'up',
      trendValue: 28,
      threshold: 500,
      status: 'healthy',
      description: 'Files uploaded by vendors',
      data: generateTimeSeriesData(24, 200, 400, 'count'),
    },
  ]);

  // Auto-refresh data
  useEffect(() => {
    if (batteryOptimized) return; // Skip auto-refresh in battery-optimized mode

    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((metric) => ({
          ...metric,
          value: metric.value + (Math.random() - 0.5) * metric.value * 0.1,
          data: [
            ...metric.data.slice(1),
            {
              timestamp: new Date(),
              value: metric.value + (Math.random() - 0.5) * metric.value * 0.2,
            },
          ],
        })),
      );
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, batteryOptimized]);

  // Get metrics by category
  const currentMetrics = useMemo(() => {
    switch (selectedCategory) {
      case 'performance':
        return metrics.filter((m) =>
          [
            'response_time',
            'throughput',
            'error_rate',
            'cache_hit_rate',
          ].includes(m.id),
        );
      case 'infrastructure':
        return metrics.filter((m) =>
          ['cpu_usage', 'memory_usage'].includes(m.id),
        );
      case 'business':
        return businessMetrics;
      default:
        return metrics;
    }
  }, [selectedCategory, metrics, businessMetrics]);

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  // Chart color scheme
  const chartColors = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gradient: ['#3b82f6', '#1d4ed8'],
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Category Selector */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'performance', label: 'Performance', icon: Zap },
          { id: 'infrastructure', label: 'Infrastructure', icon: Server },
          { id: 'business', label: 'Business', icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedCategory(id as any)}
            className={`flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded text-xs font-medium transition-colors ${
              selectedCategory === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-3 w-3" />
            <span className="hidden sm:inline">{label}</span>
          </motion.button>
        ))}
      </div>

      {/* Time Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {selectedCategory === 'performance' && 'Performance Metrics'}
          {selectedCategory === 'infrastructure' && 'Infrastructure Metrics'}
          {selectedCategory === 'business' && 'Business Metrics'}
        </h2>

        <div className="flex space-x-1 bg-gray-100 rounded p-1">
          {[
            { id: '1h', label: '1H' },
            { id: '6h', label: '6H' },
            { id: '24h', label: '24H' },
            { id: '7d', label: '7D' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSelectedPeriod(id as any)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedPeriod === id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4">
        {currentMetrics.map((metric) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            {/* Metric Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-medium text-sm">{metric.name}</h3>
                  <Badge className={`text-xs ${getStatusColor(metric.status)}`}>
                    {metric.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {metric.description}
                </p>

                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold">
                    {metric.value.toLocaleString(undefined, {
                      maximumFractionDigits: metric.unit === '%' ? 1 : 0,
                    })}
                  </span>
                  <span className="text-sm text-gray-500">{metric.unit}</span>

                  <div className="flex items-center space-x-1 text-xs">
                    {getTrendIcon(metric.trend)}
                    <span
                      className={
                        metric.trend === 'up'
                          ? metric.id === 'error_rate'
                            ? 'text-red-500'
                            : 'text-green-500'
                          : metric.trend === 'down'
                            ? metric.id === 'error_rate'
                              ? 'text-green-500'
                              : 'text-red-500'
                            : 'text-gray-500'
                      }
                    >
                      {Math.abs(metric.trendValue).toFixed(1)}
                      {metric.unit}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar for Threshold */}
            {metric.threshold && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Current</span>
                  <span>
                    Target: {metric.target}
                    {metric.unit}
                  </span>
                </div>
                <Progress
                  value={(metric.value / metric.threshold) * 100}
                  className="h-2"
                  color={
                    metric.status === 'healthy'
                      ? 'green'
                      : metric.status === 'warning'
                        ? 'yellow'
                        : 'red'
                  }
                />
              </div>
            )}

            {/* Mini Chart */}
            <div className="h-20 -mx-2">
              {batteryOptimized ? (
                // Simple spark line for battery optimization
                <div className="h-full flex items-end space-x-1">
                  {metric.data.slice(-12).map((point, index) => (
                    <div
                      key={index}
                      className="flex-1 bg-blue-200 rounded-t"
                      style={{
                        height: `${(point.value / Math.max(...metric.data.map((d) => d.value))) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metric.data.slice(-12)}>
                    <defs>
                      <linearGradient
                        id={`gradient-${metric.id}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={chartColors.primary}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={chartColors.primary}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={chartColors.primary}
                      strokeWidth={2}
                      fill={`url(#gradient-${metric.id})`}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-2 mt-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-1.5 px-3 text-xs bg-gray-100 rounded-md text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <BarChart3 className="h-3 w-3 inline mr-1" />
                Details
              </motion.button>

              {metric.status !== 'healthy' && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-1.5 px-3 text-xs bg-red-100 rounded-md text-red-700 hover:bg-red-200 transition-colors"
                >
                  Alert
                </motion.button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Activity className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-sm">System Health Score</h3>
              <div className="flex items-center space-x-2 mt-1">
                <Progress
                  value={calculateHealthScore(currentMetrics)}
                  className="flex-1 h-2"
                />
                <span className="text-sm font-medium text-blue-600">
                  {calculateHealthScore(currentMetrics).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-green-600">
                {currentMetrics.filter((m) => m.status === 'healthy').length}
              </p>
              <p className="text-xs text-gray-600">Healthy</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-600">
                {currentMetrics.filter((m) => m.status === 'warning').length}
              </p>
              <p className="text-xs text-gray-600">Warning</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-600">
                {currentMetrics.filter((m) => m.status === 'critical').length}
              </p>
              <p className="text-xs text-gray-600">Critical</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions
function generateTimeSeriesData(
  points: number,
  minValue: number,
  maxValue: number,
  type: 'continuous' | 'count' = 'continuous',
): MetricData[] {
  const data: MetricData[] = [];
  const now = new Date();

  for (let i = points - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // Hourly data
    let value: number;

    if (type === 'count') {
      value = Math.floor(Math.random() * (maxValue - minValue) + minValue);
    } else {
      value = Math.random() * (maxValue - minValue) + minValue;
    }

    data.push({ timestamp, value });
  }

  return data;
}

function calculateHealthScore(metrics: PerformanceMetric[]): number {
  if (metrics.length === 0) return 100;

  const scores = metrics.map((metric) => {
    switch (metric.status) {
      case 'healthy':
        return 100;
      case 'warning':
        return 60;
      case 'critical':
        return 20;
      default:
        return 80;
    }
  });

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

export default MobileMetricsCards;
