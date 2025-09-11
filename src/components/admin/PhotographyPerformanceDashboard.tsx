/**
 * WS-130 Round 3: Photography AI Performance Dashboard
 * Real-time monitoring dashboard for Photography AI system performance
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  Cpu,
  MemoryStick,
} from 'lucide-react';

interface PerformanceStats {
  active_requests: number;
  avg_response_time_ms: number;
  error_rate_percent: number;
  cache_hit_rate_percent: number;
  memory_usage_mb: number;
  active_alerts: number;
  requests_last_hour: number;
  team_integration_health: Record<
    string,
    {
      success_rate: number;
      avg_duration: number;
    }
  >;
}

interface PerformanceAlert {
  id: string;
  timestamp: number;
  severity: 'warning' | 'critical';
  metric: string;
  current_value: number;
  threshold_value: number;
  message: string;
  context: Record<string, any>;
  resolved: boolean;
}

interface HistoricalData {
  timestamps: number[];
  response_times: number[];
  error_rates: number[];
  cache_hit_rates: number[];
  memory_usage: number[];
}

export function PhotographyPerformanceDashboard() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch current performance statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/photography/performance/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch performance stats:', error);
    }
  };

  // Fetch active alerts
  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/admin/photography/performance/alerts');
      const data = await response.json();

      if (data.success) {
        setAlerts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  // Fetch historical performance data
  const fetchHistoricalData = async (hours: number = 24) => {
    try {
      const response = await fetch(
        `/api/admin/photography/performance/history?hours=${hours}`,
      );
      const data = await response.json();

      if (data.success) {
        setHistoricalData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchAlerts(), fetchHistoricalData()]);
    setRefreshing(false);
    setLoading(false);
  };

  // Resolve an alert
  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(
        `/api/admin/photography/performance/alerts/${alertId}/resolve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolution: 'Manually resolved by admin' }),
        },
      );

      if (response.ok) {
        await fetchAlerts(); // Refresh alerts
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    refreshData();

    if (autoRefresh) {
      const interval = setInterval(refreshData, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Format chart data
  const formatChartData = (historicalData: HistoricalData) => {
    return historicalData.timestamps.map((timestamp, index) => ({
      time: new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp,
      responseTime: historicalData.response_times[index],
      errorRate: historicalData.error_rates[index],
      cacheHitRate: historicalData.cache_hit_rates[index],
      memoryUsage: Math.round(historicalData.memory_usage[index]),
    }));
  };

  // Get health status color and icon
  const getHealthStatus = () => {
    if (!stats) return { color: 'gray', icon: Activity, text: 'Unknown' };

    if (stats.active_alerts === 0 && stats.error_rate_percent < 2) {
      return { color: 'green', icon: CheckCircle, text: 'Healthy' };
    } else if (stats.active_alerts <= 2 && stats.error_rate_percent < 10) {
      return { color: 'yellow', icon: AlertTriangle, text: 'Warning' };
    } else {
      return { color: 'red', icon: XCircle, text: 'Critical' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading performance data...</span>
      </div>
    );
  }

  const healthStatus = getHealthStatus();
  const HealthIcon = healthStatus.icon;
  const chartData = historicalData ? formatChartData(historicalData) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Photography AI Performance</h1>
          <p className="text-gray-600">
            Real-time monitoring and performance analytics
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <HealthIcon className={`h-5 w-5 text-${healthStatus.color}-500`} />
            <span className={`font-medium text-${healthStatus.color}-600`}>
              System {healthStatus.text}
            </span>
          </div>

          <Button
            onClick={refreshData}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Alerts</h2>
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              variant={
                alert.severity === 'critical' ? 'destructive' : 'default'
              }
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {alert.severity.toUpperCase()}:{' '}
                {alert.metric.replace(/_/g, ' ')}
              </AlertTitle>
              <AlertDescription className="mt-2">
                <div>{alert.message}</div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm text-gray-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                  <Button
                    onClick={() => resolveAlert(alert.id)}
                    size="sm"
                    variant="outline"
                  >
                    Resolve
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Activity className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avg_response_time_ms || 0}ms
            </div>
            <p className="text-xs text-gray-500">
              {stats?.avg_response_time_ms &&
              stats.avg_response_time_ms < 3000 ? (
                <span className="text-green-600 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" /> Optimal
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" /> Above target
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <XCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.error_rate_percent?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-gray-500">
              {stats?.error_rate_percent && stats.error_rate_percent < 5 ? (
                <span className="text-green-600">Within tolerance</span>
              ) : (
                <span className="text-red-600">Above threshold</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cache Hit Rate
            </CardTitle>
            <Database className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.cache_hit_rate_percent?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-gray-500">
              {stats?.cache_hit_rate_percent &&
              stats.cache_hit_rate_percent > 70 ? (
                <span className="text-green-600">Excellent</span>
              ) : (
                <span className="text-yellow-600">Needs optimization</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.memory_usage_mb?.toFixed(0) || 0}MB
            </div>
            <p className="text-xs text-gray-500">
              {stats?.memory_usage_mb && stats.memory_usage_mb < 400 ? (
                <span className="text-green-600">Normal</span>
              ) : (
                <span className="text-yellow-600">High usage</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
          <TabsTrigger value="teams">Team Health</TabsTrigger>
          <TabsTrigger value="system">System Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Trend (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => `Time: ${value}`}
                      formatter={(value: number) => [
                        `${value}ms`,
                        'Response Time',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rate & Cache Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => `Time: ${value}`}
                      formatter={(value: number, name: string) => [
                        `${value}%`,
                        name === 'errorRate' ? 'Error Rate' : 'Cache Hit Rate',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="errorRate"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="cacheHitRate"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats?.requests_last_hour || 0}
                    </div>
                    <div className="text-sm text-gray-600">Requests (1h)</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {stats?.active_requests || 0}
                    </div>
                    <div className="text-sm text-gray-600">Active Requests</div>
                  </div>
                  <div className="text-2xl font-bold text-orange-600 text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {stats?.active_alerts || 0}
                    </div>
                    <div className="text-sm text-gray-600">Active Alerts</div>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="memoryUsage"
                      stroke="#8b5cf6"
                      name="Memory (MB)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Integration Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.team_integration_health &&
                  Object.entries(stats.team_integration_health).map(
                    ([team, health]) => (
                      <div
                        key={team}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="font-medium capitalize">
                            {team.replace('_', ' ')}
                          </div>
                          <Badge
                            variant={
                              health.success_rate >= 95
                                ? 'default'
                                : health.success_rate >= 85
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {health.success_rate.toFixed(1)}% Success Rate
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          Avg: {health.avg_duration.toFixed(0)}ms
                        </div>
                      </div>
                    ),
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Resource Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Memory Usage</span>
                    <span className="font-medium">
                      {stats?.memory_usage_mb?.toFixed(0) || 0}MB
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(((stats?.memory_usage_mb || 0) / 512) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>

                  <div className="text-xs text-gray-600">
                    Target: {'<'} 400MB, Critical: 700MB
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Thresholds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Response Time Warning:</span>
                    <span className="text-yellow-600">3000ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Response Time Critical:</span>
                    <span className="text-red-600">8000ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Error Rate Warning:</span>
                    <span className="text-yellow-600">5%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Error Rate Critical:</span>
                    <span className="text-red-600">15%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cache Hit Warning:</span>
                    <span className="text-yellow-600">{'<'}70%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
