'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Heart,
  TrendingUp,
  TrendingDown,
  Zap,
  Calendar,
  AlertCircle,
  RefreshCw,
  Settings,
  Download,
} from 'lucide-react';
import { AIPerformanceMonitor } from '@/lib/ai/feature-management/monitoring/performance-monitor';
import { AIAlertManager } from '@/lib/ai/feature-management/monitoring/alert-manager';

interface ComponentHealth {
  component: string;
  status: 'healthy' | 'warning' | 'critical' | 'down';
  lastCheck: Date;
  metrics: {
    avgResponseTime: number;
    errorRate: number;
    tokensUsed: number;
    totalCost: number;
    successRate: number;
    requestCount: number;
  };
  issues: string[];
}

interface AlertNotification {
  id: string;
  config_id: string;
  triggered_at: Date;
  resolved_at?: Date;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  details: Record<string, any>;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: Date;
}

interface PerformanceTrends {
  timestamps: string[];
  responseTimes: number[];
  errorRates: number[];
  successRates: number[];
  costs: number[];
  tokenUsage: number[];
}

const statusColors = {
  healthy: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
  down: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusIcons = {
  healthy: <CheckCircle className="h-4 w-4 text-green-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  critical: <AlertCircle className="h-4 w-4 text-red-600" />,
  down: <Activity className="h-4 w-4 text-gray-600" />,
};

const componentNames = {
  'semantic-analyzer': 'Semantic Analyzer',
  'rice-scorer': 'RICE Scorer',
  'content-pipeline': 'Content Pipeline',
  'predictive-engine': 'Predictive Engine',
};

export function AIPerformanceDashboard() {
  const [componentHealth, setComponentHealth] = useState<ComponentHealth[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<AlertNotification[]>([]);
  const [performanceTrends, setPerformanceTrends] = useState<
    Record<string, PerformanceTrends>
  >({});
  const [costAnalysis, setCostAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<
    '1h' | '24h' | '7d' | '30d'
  >('24h');
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [isWeddingDay, setIsWeddingDay] = useState(false);

  const performanceMonitor = new AIPerformanceMonitor();
  const alertManager = new AIAlertManager();

  useEffect(() => {
    // Check if today is Saturday (wedding day)
    const today = new Date().getDay();
    setIsWeddingDay(today === 6);

    loadDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load component health
      const health = await performanceMonitor.getComponentHealth();
      setComponentHealth(health);

      // Load active alerts
      const alerts = await alertManager.getActiveAlerts();
      setActiveAlerts(alerts);

      // Load performance trends for each component
      const components = [
        'semantic-analyzer',
        'rice-scorer',
        'content-pipeline',
        'predictive-engine',
      ];
      const trends: Record<string, PerformanceTrends> = {};

      for (const component of components) {
        trends[component] = await performanceMonitor.getPerformanceTrends(
          component,
          selectedTimeRange,
        );
      }
      setPerformanceTrends(trends);

      // Load cost analysis
      const costs = await performanceMonitor.getCostAnalysis(selectedTimeRange);
      setCostAnalysis(costs);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await alertManager.acknowledgeAlert(alertId, 'admin-user');
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const testAlertSystem = async () => {
    try {
      await alertManager.testAlert();
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to test alert system:', error);
    }
  };

  const getOverallSystemHealth = () => {
    if (componentHealth.length === 0) return 'down';

    const hasCritical = componentHealth.some(
      (h) => h.status === 'critical' || h.status === 'down',
    );
    const hasWarning = componentHealth.some((h) => h.status === 'warning');

    if (hasCritical) return 'critical';
    if (hasWarning) return 'warning';
    return 'healthy';
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const systemHealth = getOverallSystemHealth();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            AI Performance Monitoring
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time monitoring of WedSync AI components and wedding industry
            performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isWeddingDay && (
            <Alert className="border-red-200 bg-red-50 text-red-800 p-3">
              <Calendar className="h-4 w-4" />
              <AlertDescription className="font-medium">
                WEDDING DAY MODE: Enhanced monitoring active
              </AlertDescription>
            </Alert>
          )}
          <Button onClick={testAlertSystem} variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Test Alerts
          </Button>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              {statusIcons[systemHealth]}
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  System Health
                </p>
                <Badge className={statusColors[systemHealth]}>
                  {systemHealth.charAt(0).toUpperCase() + systemHealth.slice(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  Active Alerts
                </p>
                <div className="text-2xl font-bold text-gray-900">
                  {activeAlerts.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  Avg Response Time
                </p>
                <div className="text-2xl font-bold text-gray-900">
                  {componentHealth.length > 0
                    ? formatDuration(
                        componentHealth.reduce(
                          (sum, h) => sum + h.metrics.avgResponseTime,
                          0,
                        ) / componentHealth.length,
                      )
                    : '0ms'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">
                  Total Cost ({selectedTimeRange})
                </p>
                <div className="text-2xl font-bold text-gray-900">
                  {costAnalysis ? formatCost(costAnalysis.totalCost) : '$0.00'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Active Alerts ({activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeAlerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          alert.severity === 'critical'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {alert.severity}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {componentNames[
                          alert.details.component as keyof typeof componentNames
                        ] || alert.details.component}
                      </span>
                    </div>
                    <p className="text-sm mt-1 text-gray-900">
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.triggered_at.toLocaleString()}
                    </p>
                  </div>
                  {!alert.acknowledged && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Component Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {componentHealth.map((health) => (
          <Card key={health.component}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {componentNames[
                    health.component as keyof typeof componentNames
                  ] || health.component}
                </CardTitle>
                {statusIcons[health.status]}
              </div>
              <Badge className={statusColors[health.status]}>
                {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Response Time</p>
                  <p className="font-medium">
                    {formatDuration(health.metrics.avgResponseTime)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Success Rate</p>
                  <p className="font-medium">
                    {health.metrics.successRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Requests</p>
                  <p className="font-medium">
                    {formatNumber(health.metrics.requestCount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Cost</p>
                  <p className="font-medium">
                    {formatCost(health.metrics.totalCost)}
                  </p>
                </div>
              </div>

              {health.issues.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Issues:
                  </p>
                  {health.issues.slice(0, 2).map((issue, index) => (
                    <p key={index} className="text-xs text-red-600">
                      {issue}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Charts */}
      <Tabs defaultValue="response-times" className="w-full">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="response-times">Response Times</TabsTrigger>
            <TabsTrigger value="error-rates">Error Rates</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="tokens">Token Usage</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <select
              className="px-3 py-1 border rounded-md text-sm"
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            >
              <option value="1h">1 Hour</option>
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
            </select>
          </div>
        </div>

        <TabsContent value="response-times">
          <Card>
            <CardHeader>
              <CardTitle>Response Times Over Time</CardTitle>
              <CardDescription>
                Average response times for each AI component (lower is better)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleTimeString()
                      }
                    />
                    <YAxis
                      label={{
                        value: 'Response Time (ms)',
                        angle: -90,
                        position: 'insideLeft',
                      }}
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleString()
                      }
                      formatter={(value: number) => [
                        formatDuration(value),
                        'Response Time',
                      ]}
                    />
                    {Object.entries(performanceTrends).map(
                      ([component, data], index) => {
                        const colors = [
                          '#3b82f6',
                          '#ef4444',
                          '#10b981',
                          '#f59e0b',
                        ];
                        const chartData = data.timestamps.map(
                          (timestamp, i) => ({
                            timestamp,
                            [component]: data.responseTimes[i],
                          }),
                        );

                        return (
                          <Line
                            key={component}
                            data={chartData}
                            type="monotone"
                            dataKey={component}
                            stroke={colors[index]}
                            strokeWidth={2}
                            name={
                              componentNames[
                                component as keyof typeof componentNames
                              ]
                            }
                          />
                        );
                      },
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="error-rates">
          <Card>
            <CardHeader>
              <CardTitle>Error Rates Over Time</CardTitle>
              <CardDescription>
                Percentage of failed requests for each component
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleTimeString()
                      }
                    />
                    <YAxis
                      label={{
                        value: 'Error Rate (%)',
                        angle: -90,
                        position: 'insideLeft',
                      }}
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleString()
                      }
                      formatter={(value: number) => [
                        `${value.toFixed(1)}%`,
                        'Error Rate',
                      ]}
                    />
                    {Object.entries(performanceTrends).map(
                      ([component, data], index) => {
                        const colors = [
                          '#3b82f6',
                          '#ef4444',
                          '#10b981',
                          '#f59e0b',
                        ];
                        const chartData = data.timestamps.map(
                          (timestamp, i) => ({
                            timestamp,
                            [component]: data.errorRates[i],
                          }),
                        );

                        return (
                          <Line
                            key={component}
                            data={chartData}
                            type="monotone"
                            dataKey={component}
                            stroke={colors[index]}
                            strokeWidth={2}
                            name={
                              componentNames[
                                component as keyof typeof componentNames
                              ]
                            }
                          />
                        );
                      },
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle>AI Costs Analysis</CardTitle>
              <CardDescription>
                Cost breakdown and projections for AI components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Cost by Component</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={
                            costAnalysis
                              ? Object.entries(
                                  costAnalysis.costByComponent,
                                ).map(([component, cost]) => ({
                                  name:
                                    componentNames[
                                      component as keyof typeof componentNames
                                    ] || component,
                                  value: cost,
                                }))
                              : []
                          }
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={(entry) => formatCost(entry.value)}
                        >
                          {costAnalysis &&
                            Object.entries(costAnalysis.costByComponent).map(
                              (_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    [
                                      '#3b82f6',
                                      '#ef4444',
                                      '#10b981',
                                      '#f59e0b',
                                    ][index]
                                  }
                                />
                              ),
                            )}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCost(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Cost Projections</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Current Period</span>
                      <span className="font-medium">
                        {costAnalysis
                          ? formatCost(costAnalysis.totalCost)
                          : '$0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Projected Monthly</span>
                      <span className="font-medium">
                        {costAnalysis
                          ? formatCost(costAnalysis.projectedMonthlyCost)
                          : '$0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Budget Utilization</span>
                      <div className="flex items-center space-x-2">
                        <Progress
                          value={
                            costAnalysis
                              ? Math.min(costAnalysis.budgetUtilization, 100)
                              : 0
                          }
                          className="w-20"
                        />
                        <span className="text-sm font-medium">
                          {costAnalysis
                            ? `${costAnalysis.budgetUtilization.toFixed(1)}%`
                            : '0%'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {costAnalysis?.topCostDrivers && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-2">Top Cost Drivers</h4>
                      <div className="space-y-2">
                        {costAnalysis.topCostDrivers
                          .slice(0, 5)
                          .map((driver: any, index: number) => (
                            <div
                              key={index}
                              className="flex justify-between items-center text-sm"
                            >
                              <span className="text-gray-600">
                                {driver.component}: {driver.operation}
                              </span>
                              <span className="font-medium">
                                {formatCost(driver.cost)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens">
          <Card>
            <CardHeader>
              <CardTitle>Token Usage Over Time</CardTitle>
              <CardDescription>
                OpenAI API token consumption by component
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleTimeString()
                      }
                    />
                    <YAxis
                      label={{
                        value: 'Tokens',
                        angle: -90,
                        position: 'insideLeft',
                      }}
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(value).toLocaleString()
                      }
                      formatter={(value: number) => [
                        formatNumber(value),
                        'Tokens',
                      ]}
                    />
                    {Object.entries(performanceTrends).map(
                      ([component, data], index) => {
                        const colors = [
                          '#3b82f6',
                          '#ef4444',
                          '#10b981',
                          '#f59e0b',
                        ];
                        const chartData = data.timestamps.map(
                          (timestamp, i) => ({
                            timestamp,
                            [component]: data.tokenUsage[i],
                          }),
                        );

                        return (
                          <Area
                            key={component}
                            data={chartData}
                            type="monotone"
                            dataKey={component}
                            stackId="1"
                            stroke={colors[index]}
                            fill={colors[index]}
                            fillOpacity={0.6}
                            name={
                              componentNames[
                                component as keyof typeof componentNames
                              ]
                            }
                          />
                        );
                      },
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AIPerformanceDashboard;
