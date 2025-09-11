/**
 * WS-234 Database Metrics Dashboard - Team C
 * Real-time database health monitoring dashboard with connection pool metrics,
 * query performance tracking, alerts, and wedding day protection
 *
 * Features:
 * - Real-time health status monitoring
 * - Connection pool visualization
 * - Query performance metrics and trends
 * - Slow query analysis
 * - Alert management system
 * - Wedding day mode indicator
 * - Performance recommendations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Heart,
  HeartHandshake,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';

// =====================================================
// TYPES
// =====================================================

interface DatabaseHealth {
  overall: 'healthy' | 'degraded' | 'critical' | 'down';
  timestamp: Date;
  connectionPools: PoolHealthStatus[];
  queryPerformance: QueryPerformanceMetrics;
  resourceUsage: ResourceUsageMetrics;
  activeAlerts: HealthAlert[];
  recommendations: string[];
  weddingDayMode: boolean;
}

interface PoolHealthStatus {
  poolName: string;
  status: 'healthy' | 'degraded' | 'critical';
  totalConnections: number;
  activeConnections: number;
  queueLength: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
  issues: string[];
}

interface QueryPerformanceMetrics {
  averageQueryTime: number;
  slowQueries: SlowQuery[];
  queriesPerSecond: number;
  errorRate: number;
  popularQueries: QueryStats[];
  performanceRegression: boolean;
  indexEfficiency: number;
}

interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
  table: string;
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  impact: 'low' | 'medium' | 'high' | 'critical';
}

interface QueryStats {
  queryPattern: string;
  count: number;
  averageDuration: number;
  errorCount: number;
  lastExecuted: Date;
}

interface ResourceUsageMetrics {
  connectionCount: number;
  maxConnections: number;
  cacheHitRatio: number;
}

interface HealthAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  weddingDayImpact?: boolean;
}

interface PerformanceTrend {
  timeWindow: '1h' | '24h' | '7d' | '30d';
  averageQueryTime: number[];
  slowQueryCount: number[];
  errorRate: number[];
  throughput: number[];
  timestamps: Date[];
}

// =====================================================
// DASHBOARD COMPONENT
// =====================================================

export default function DatabaseMetricsDashboard() {
  const [healthData, setHealthData] = useState<DatabaseHealth | null>(null);
  const [performanceTrends, setPerformanceTrends] =
    useState<PerformanceTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<
    '1h' | '24h' | '7d' | '30d'
  >('24h');
  const [showDetails, setShowDetails] = useState(false);

  // =====================================================
  // DATA FETCHING
  // =====================================================

  const fetchHealthData = useCallback(async () => {
    try {
      setError(null);

      const [healthResponse, trendsResponse] = await Promise.all([
        fetch('/api/health/database'),
        fetch(`/api/health/database/trends?window=${selectedTimeWindow}`),
      ]);

      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }

      const healthData = await healthResponse.json();
      setHealthData({
        ...healthData,
        timestamp: new Date(healthData.timestamp),
      });

      if (trendsResponse.ok) {
        const trendsData = await trendsResponse.json();
        setPerformanceTrends(trendsData);
      }
    } catch (err) {
      console.error('Failed to fetch database health data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeWindow]);

  // Auto-refresh effect
  useEffect(() => {
    fetchHealthData();

    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchHealthData, autoRefresh, refreshInterval]);

  // =====================================================
  // ALERT ACTIONS
  // =====================================================

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/health/database/alerts/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, acknowledgedBy: 'dashboard-user' }),
      });

      if (response.ok) {
        await fetchHealthData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      case 'down':
        return 'text-red-800';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'degraded':
        return 'secondary';
      case 'critical':
        return 'destructive';
      case 'down':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'text-blue-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      case 'critical':
        return 'text-red-800';
      default:
        return 'text-gray-600';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // =====================================================
  // RENDER FUNCTIONS
  // =====================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading database metrics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Failed to Load Database Metrics</AlertTitle>
        <AlertDescription>
          {error}
          <Button onClick={() => fetchHealthData()} className="ml-2" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!healthData) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Data Available</AlertTitle>
        <AlertDescription>
          Database health data is not available.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Database Health Monitor
          </h1>
          <p className="text-muted-foreground">
            Real-time monitoring of database performance and health
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {healthData.weddingDayMode && (
            <Badge variant="outline" className="bg-pink-50 border-pink-200">
              <Calendar className="h-3 w-3 mr-1" />
              Wedding Day Mode
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <EyeOff className="h-4 w-4 mr-1" />
            ) : (
              <Eye className="h-4 w-4 mr-1" />
            )}
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`}
            />
            Auto Refresh
          </Button>

          <Button size="sm" onClick={fetchHealthData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Overall Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Health
            </CardTitle>
            {healthData.overall === 'healthy' ? (
              <Heart className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getStatusColor(healthData.overall)}`}
            >
              {healthData.overall.charAt(0).toUpperCase() +
                healthData.overall.slice(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Last checked {formatDistanceToNow(healthData.timestamp)} ago
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Connections
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData.resourceUsage.connectionCount}/
              {healthData.resourceUsage.maxConnections}
            </div>
            <Progress
              value={
                (healthData.resourceUsage.connectionCount /
                  healthData.resourceUsage.maxConnections) *
                100
              }
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Query Performance
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(healthData.queryPerformance.averageQueryTime)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1" />
              {healthData.queryPerformance.queriesPerSecond.toFixed(1)} q/s
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthData.activeAlerts.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {
                healthData.activeAlerts.filter((a) => a.severity === 'critical')
                  .length
              }{' '}
              critical
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {healthData.activeAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthData.activeAlerts.slice(0, 5).map((alert) => (
                <Alert
                  key={alert.id}
                  className={
                    alert.severity === 'critical'
                      ? 'border-red-200 bg-red-50'
                      : ''
                  }
                >
                  <AlertCircle
                    className={`h-4 w-4 ${getSeverityColor(alert.severity)}`}
                  />
                  <AlertTitle className="flex items-center justify-between">
                    <span>{alert.title}</span>
                    <div className="flex items-center space-x-2">
                      {alert.weddingDayImpact && (
                        <Badge variant="outline" className="text-xs">
                          Wedding Day Impact
                        </Badge>
                      )}
                      <Badge
                        variant={
                          alert.severity === 'critical'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {alert.severity}
                      </Badge>
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
                  </AlertTitle>
                  <AlertDescription>
                    {alert.message}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(alert.timestamp, 'PPp')}
                    </p>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connections">Connection Pools</TabsTrigger>
          <TabsTrigger value="performance">Query Performance</TabsTrigger>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Connection Pools Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Connection Pools Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {healthData.connectionPools.map((pool) => (
                    <div
                      key={pool.poolName}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{pool.poolName}</div>
                        <div className="text-sm text-muted-foreground">
                          {pool.activeConnections}/{pool.totalConnections}{' '}
                          connections
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusBadgeVariant(pool.status)}>
                          {pool.status}
                        </Badge>
                        {pool.queueLength > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {pool.queueLength} queued
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Slow Queries */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Slow Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {healthData.queryPerformance.slowQueries
                      .slice(0, 10)
                      .map((query, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant={
                                query.impact === 'critical'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {query.impact}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDuration(query.duration)}
                            </span>
                          </div>
                          <div className="text-sm font-mono bg-muted p-2 rounded">
                            {query.query.length > 100
                              ? `${query.query.substring(0, 100)}...`
                              : query.query}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {query.table} • {query.type} •{' '}
                            {formatDistanceToNow(query.timestamp)} ago
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Connection Pools Tab */}
        <TabsContent value="connections" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {healthData.connectionPools.map((pool) => (
              <Card key={pool.poolName}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{pool.poolName} Pool</span>
                    <Badge variant={getStatusBadgeVariant(pool.status)}>
                      {pool.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold">
                        {pool.activeConnections}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Active Connections
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {pool.totalConnections}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Connections
                      </div>
                    </div>
                  </div>

                  <Progress
                    value={
                      (pool.activeConnections / pool.totalConnections) * 100
                    }
                  />

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium">{pool.queueLength}</div>
                      <div className="text-muted-foreground">Queued</div>
                    </div>
                    <div>
                      <div className="font-medium">
                        {formatDuration(pool.averageResponseTime)}
                      </div>
                      <div className="text-muted-foreground">Avg Response</div>
                    </div>
                    <div>
                      <div className="font-medium">
                        {(pool.errorRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-muted-foreground">Error Rate</div>
                    </div>
                  </div>

                  {pool.issues.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Issues:</div>
                      {pool.issues.map((issue, index) => (
                        <div
                          key={index}
                          className="text-xs text-red-600 bg-red-50 p-2 rounded"
                        >
                          {issue}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Popular Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {healthData.queryPerformance.popularQueries.map(
                      (query, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-mono truncate">
                              {query.queryPattern.substring(0, 60)}...
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {query.count} executions • Avg:{' '}
                              {formatDuration(query.averageDuration)}
                            </div>
                          </div>
                          {query.errorCount > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {query.errorCount} errors
                            </Badge>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {formatDuration(
                        healthData.queryPerformance.averageQueryTime,
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Average Query Time
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {healthData.queryPerformance.queriesPerSecond.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Queries/Second
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {(healthData.queryPerformance.errorRate * 100).toFixed(2)}
                      %
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Error Rate
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {(healthData.resourceUsage.cacheHitRatio * 100).toFixed(
                        1,
                      )}
                      %
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Cache Hit Ratio
                    </div>
                  </div>
                </div>

                {healthData.queryPerformance.performanceRegression && (
                  <Alert>
                    <TrendingDown className="h-4 w-4" />
                    <AlertTitle>Performance Regression Detected</AlertTitle>
                    <AlertDescription>
                      Query performance has degraded compared to historical
                      baselines.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <div className="flex space-x-2">
                {(['1h', '24h', '7d', '30d'] as const).map((window) => (
                  <Button
                    key={window}
                    variant={
                      selectedTimeWindow === window ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => setSelectedTimeWindow(window)}
                  >
                    {window}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {performanceTrends && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={performanceTrends.timestamps.map((time, index) => ({
                        time: format(time, 'HH:mm'),
                        queryTime: performanceTrends.averageQueryTime[index],
                        slowQueries: performanceTrends.slowQueryCount[index],
                        errorRate: performanceTrends.errorRate[index] * 100,
                        throughput: performanceTrends.throughput[index],
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="queryTime"
                        stroke="#8884d8"
                        name="Avg Query Time (ms)"
                      />
                      <Line
                        type="monotone"
                        dataKey="slowQueries"
                        stroke="#82ca9d"
                        name="Slow Queries"
                      />
                      <Line
                        type="monotone"
                        dataKey="throughput"
                        stroke="#ffc658"
                        name="Throughput"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Recommendations</CardTitle>
              <CardDescription>
                Automated suggestions to improve database performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthData.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {healthData.recommendations.map((recommendation, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-start">
                        <TrendingUp className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm">{recommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No performance recommendations at this time.</p>
                  <p className="text-sm">
                    Your database is performing optimally!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {healthData.weddingDayMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HeartHandshake className="h-5 w-5 mr-2 text-pink-600" />
                  Wedding Day Protection Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="bg-pink-50 border-pink-200">
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Enhanced Monitoring Active</AlertTitle>
                  <AlertDescription>
                    Wedding day mode is enabled with enhanced sensitivity for:
                    <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                      <li>
                        Reduced slow query thresholds (50% more sensitive)
                      </li>
                      <li>Prioritized alert notifications</li>
                      <li>Automatic scaling protection</li>
                      <li>Real-time performance monitoring</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
