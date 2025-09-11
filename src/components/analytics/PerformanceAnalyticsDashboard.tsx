'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Users,
  Server,
  Gauge,
  Calendar,
  Brain,
  Download,
  RefreshCw,
  Filter,
} from 'lucide-react';
import {
  PerformanceAnalyticsEngine,
  AnalyticsResult,
  TrendAnalysis,
  WeddingDayInsights,
  TimeSeriesPoint,
} from '@/lib/analytics/PerformanceAnalyticsEngine';

/**
 * WS-257 Team D: Performance Analytics Dashboard
 * Comprehensive visual analytics for infrastructure performance
 */

interface AnalyticsPeriod {
  label: string;
  value: string;
  hours: number;
}

interface MetricCard {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  unit: string;
  description: string;
  color: string;
  target?: number;
  critical?: number;
}

const ANALYTICS_PERIODS: AnalyticsPeriod[] = [
  { label: 'Last Hour', value: '1h', hours: 1 },
  { label: 'Last 6 Hours', value: '6h', hours: 6 },
  { label: 'Last Day', value: '1d', hours: 24 },
  { label: 'Last Week', value: '1w', hours: 168 },
  { label: 'Last Month', value: '1m', hours: 720 },
];

const METRIC_CARDS: MetricCard[] = [
  {
    id: 'server_response_time',
    name: 'Response Time',
    icon: Clock,
    unit: 'ms',
    description: 'Average server response time',
    color: '#3b82f6',
    target: 200,
    critical: 1000,
  },
  {
    id: 'error_rate',
    name: 'Error Rate',
    icon: AlertTriangle,
    unit: '%',
    description: 'Application error percentage',
    color: '#ef4444',
    target: 0.1,
    critical: 5,
  },
  {
    id: 'cpu_usage',
    name: 'CPU Usage',
    icon: Gauge,
    unit: '%',
    description: 'System CPU utilization',
    color: '#f59e0b',
    target: 70,
    critical: 90,
  },
  {
    id: 'memory_usage',
    name: 'Memory Usage',
    icon: Server,
    unit: '%',
    description: 'Memory utilization',
    color: '#8b5cf6',
    target: 75,
    critical: 95,
  },
  {
    id: 'active_users',
    name: 'Active Users',
    icon: Users,
    unit: '',
    description: 'Currently active users',
    color: '#10b981',
    target: 1000,
  },
  {
    id: 'page_load_time',
    name: 'Page Load Time',
    icon: Zap,
    unit: 'ms',
    description: 'Average page load time',
    color: '#06b6d4',
    target: 2000,
    critical: 5000,
  },
];

const CHART_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#6366f1',
];

export default function PerformanceAnalyticsDashboard() {
  const [analyticsEngine] = useState(() => new PerformanceAnalyticsEngine());
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>(
    ANALYTICS_PERIODS[2],
  );
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResult[]>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis[]>([]);
  const [weddingInsights, setWeddingInsights] =
    useState<WeddingDayInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(
    METRIC_CARDS.slice(0, 4).map((m) => m.id),
  );

  // Load analytics data
  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod, selectedMetrics]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadAnalyticsData();
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedPeriod, selectedMetrics]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);

    try {
      const endTime = Date.now();
      const startTime = endTime - selectedPeriod.hours * 60 * 60 * 1000;

      // Load main analytics
      const results = await analyticsEngine.queryAnalytics({
        metrics: selectedMetrics,
        startTime,
        endTime,
        interval:
          selectedPeriod.hours <= 6
            ? '5m'
            : selectedPeriod.hours <= 24
              ? '15m'
              : '1h',
        aggregation: 'avg',
      });

      setAnalyticsData(results);

      // Load trend analysis for key metrics
      const trends = await Promise.all(
        selectedMetrics
          .slice(0, 3)
          .map((metric) =>
            analyticsEngine.performTrendAnalysis(
              metric,
              selectedPeriod.value as any,
            ),
          ),
      );
      setTrendAnalysis(trends);

      // Load today's wedding insights
      if (selectedPeriod.hours >= 24) {
        const today = new Date().toISOString().split('T')[0];
        const insights = await analyticsEngine.getWeddingDayInsights(today);
        setWeddingInsights(insights);
      }

      setLastRefresh(Date.now());
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Processed data for charts
  const chartData = useMemo(() => {
    if (analyticsData.length === 0) return [];

    // Combine all metrics into unified time series
    const timePoints = new Set<number>();
    analyticsData.forEach((result) => {
      result.data.forEach((point) => timePoints.add(point.timestamp));
    });

    const sortedTimes = Array.from(timePoints).sort();

    return sortedTimes.map((timestamp) => {
      const dataPoint: any = {
        timestamp,
        time: new Date(timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      analyticsData.forEach((result) => {
        const point = result.data.find((p) => p.timestamp === timestamp);
        dataPoint[result.metric] = point
          ? Math.round(point.value * 100) / 100
          : null;
      });

      return dataPoint;
    });
  }, [analyticsData]);

  const getMetricStatus = (metric: string, value: number) => {
    const metricConfig = METRIC_CARDS.find((m) => m.id === metric);
    if (!metricConfig) return 'normal';

    if (metricConfig.critical && value >= metricConfig.critical)
      return 'critical';
    if (metricConfig.target && value >= metricConfig.target) return 'warning';
    return 'good';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'good':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const exportData = () => {
    const csvData = chartData.map((row) => {
      const csvRow: any = { time: row.time };
      selectedMetrics.forEach((metric) => {
        csvRow[metric] = row[metric] || '';
      });
      return csvRow;
    });

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map((row) => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-analytics-${selectedPeriod.value}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Analytics</h1>
          <p className="text-gray-600">
            Real-time infrastructure performance insights
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
            disabled={chartData.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAnalyticsData}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Time Period Selector */}
      <div className="flex flex-wrap gap-2">
        {ANALYTICS_PERIODS.map((period) => (
          <Button
            key={period.value}
            variant={
              selectedPeriod.value === period.value ? 'default' : 'outline'
            }
            size="sm"
            onClick={() => setSelectedPeriod(period)}
          >
            {period.label}
          </Button>
        ))}
      </div>

      {/* Metric Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Metrics Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {METRIC_CARDS.map((metric) => (
              <Button
                key={metric.id}
                variant={
                  selectedMetrics.includes(metric.id) ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => {
                  setSelectedMetrics((prev) =>
                    prev.includes(metric.id)
                      ? prev.filter((m) => m !== metric.id)
                      : [...prev, metric.id],
                  );
                }}
                className="text-xs"
              >
                <metric.icon className="w-3 h-3 mr-1" />
                {metric.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="wedding-insights">Wedding Day</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {analyticsData.map((result, index) => {
              const metricConfig = METRIC_CARDS.find(
                (m) => m.id === result.metric,
              );
              if (!metricConfig) return null;

              const status = getMetricStatus(
                result.metric,
                result.summary.latest,
              );

              return (
                <motion.div
                  key={result.metric}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <metricConfig.icon
                          className="w-5 h-5"
                          style={{ color: metricConfig.color }}
                        />
                        <Badge className={getStatusColor(status)}>
                          {status}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-600">
                          {metricConfig.name}
                        </p>
                        <div className="flex items-baseline space-x-2">
                          <span className="text-2xl font-bold">
                            {result.summary.latest.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {metricConfig.unit}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-sm">
                          {getTrendIcon(result.summary.trend)}
                          <span
                            className={
                              result.summary.changePercent > 0
                                ? 'text-red-600'
                                : result.summary.changePercent < 0
                                  ? 'text-green-600'
                                  : 'text-gray-600'
                            }
                          >
                            {result.summary.changePercent > 0 ? '+' : ''}
                            {result.summary.changePercent.toFixed(1)}%
                          </span>
                          <span className="text-gray-500">
                            vs {selectedPeriod.label.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Main Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Timeline</CardTitle>
              <p className="text-sm text-gray-600">
                Last updated: {new Date(lastRefresh).toLocaleTimeString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(label) => `Time: ${label}`}
                      formatter={(value: any, name: string) => [
                        `${value} ${METRIC_CARDS.find((m) => m.id === name)?.unit || ''}`,
                        METRIC_CARDS.find((m) => m.id === name)?.name || name,
                      ]}
                    />
                    <Legend />
                    {selectedMetrics.map((metric, index) => (
                      <Line
                        key={metric}
                        type="monotone"
                        dataKey={metric}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls={false}
                        name={
                          METRIC_CARDS.find((m) => m.id === metric)?.name ||
                          metric
                        }
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="space-y-4">
            {trendAnalysis.map((trend, index) => {
              const metricConfig = METRIC_CARDS.find(
                (m) => m.id === trend.metric,
              );

              return (
                <Card key={trend.metric}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {metricConfig && (
                        <metricConfig.icon className="w-5 h-5" />
                      )}
                      <span>{metricConfig?.name || trend.metric}</span>
                      <Badge variant="secondary">{trend.period}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Trend Chart */}
                      <div>
                        <h4 className="font-medium mb-3">
                          Historical Data + Forecast
                        </h4>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[...trend.forecast]}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                opacity={0.3}
                              />
                              <XAxis
                                dataKey="timestamp"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(timestamp) =>
                                  new Date(timestamp).toLocaleTimeString(
                                    'en-US',
                                    {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    },
                                  )
                                }
                              />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip
                                labelFormatter={(timestamp) =>
                                  new Date(timestamp).toLocaleString()
                                }
                                formatter={(value: any) => [
                                  `${value} ${metricConfig?.unit || ''}`,
                                  'Value',
                                ]}
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke={metricConfig?.color || '#3b82f6'}
                                fill={metricConfig?.color || '#3b82f6'}
                                fillOpacity={0.2}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Trend Analysis */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Trend Analysis</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                Direction:
                              </span>
                              <div className="flex items-center space-x-1">
                                {getTrendIcon(trend.trend)}
                                <span className="text-sm font-medium capitalize">
                                  {trend.trend}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                Confidence:
                              </span>
                              <Badge
                                variant={
                                  trend.confidence > 0.8
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {Math.round(trend.confidence * 100)}%
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                Slope:
                              </span>
                              <span className="text-sm font-mono">
                                {trend.slope.toFixed(4)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {trend.anomalies.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">
                              Anomalies Detected
                            </h4>
                            <div className="space-y-1">
                              {trend.anomalies
                                .slice(0, 3)
                                .map((anomaly, idx) => (
                                  <div
                                    key={idx}
                                    className="text-sm p-2 bg-yellow-50 rounded border"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>
                                        {new Date(
                                          anomaly.timestamp,
                                        ).toLocaleString()}
                                      </span>
                                      <Badge
                                        variant={
                                          anomaly.severity === 'high'
                                            ? 'destructive'
                                            : 'secondary'
                                        }
                                        className="text-xs"
                                      >
                                        {anomaly.severity}
                                      </Badge>
                                    </div>
                                    <p className="text-gray-600">
                                      Value: {anomaly.value.toFixed(2)}
                                      (Expected:{' '}
                                      {anomaly.expected_value.toFixed(2)})
                                    </p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Wedding Day Insights */}
        <TabsContent value="wedding-insights" className="space-y-6">
          {weddingInsights ? (
            <>
              {/* Overview Stats */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-medium">Total Events</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {weddingInsights.total_events}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-5 h-5 text-orange-500" />
                      <span className="text-sm font-medium">
                        Avg Response Time
                      </span>
                    </div>
                    <p className="text-2xl font-bold">
                      {weddingInsights.avg_response_time}ms
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="text-sm font-medium">Error Rate</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {(weddingInsights.error_rate * 100).toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Gauge className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium">Peak Capacity</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {weddingInsights.capacity_utilization}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Vendor Performance */}
              {weddingInsights.vendor_performance.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Vendor Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {weddingInsights.vendor_performance.map((vendor) => (
                        <div
                          key={vendor.vendor_id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded"
                        >
                          <div>
                            <p className="font-medium">{vendor.vendor_name}</p>
                            <p className="text-sm text-gray-600">
                              Response: {vendor.response_time_p95}ms | Errors:{' '}
                              {(vendor.error_rate * 100).toFixed(2)}% | Uptime:{' '}
                              {vendor.availability}%
                            </p>
                          </div>
                          <Badge
                            variant={
                              vendor.satisfaction_score >= 90
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {vendor.satisfaction_score}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Critical Moments */}
              {weddingInsights.critical_moments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Critical Moments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {weddingInsights.critical_moments.map((moment, index) => (
                        <Alert key={index} className="border-orange-200">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">
                                  {moment.event_type}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {moment.description}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(moment.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <Badge variant="destructive">
                                Impact: {moment.impact_score.toFixed(0)}
                              </Badge>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Wedding Insights Available
                </h3>
                <p className="text-gray-600">
                  Wedding day insights are generated for periods of 24 hours or
                  more.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Performance Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
                <p className="text-gray-600">
                  All performance metrics are within acceptable ranges.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
