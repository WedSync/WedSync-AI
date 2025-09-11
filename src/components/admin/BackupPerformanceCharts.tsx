/**
 * WS-178: Backup Performance Charts
 * Team D - Round 1: Performance visualization for backup operations
 *
 * Real-time performance charts showing backup impact on wedding operations
 * with wedding-context awareness and actionable insights
 */

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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Legend,
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
  Database,
  Server,
  TrendingUp,
  TrendingDown,
  Heart,
  Users,
  Camera,
  Calendar,
} from 'lucide-react';

// Import types
import type { PerformanceMetrics } from '@/lib/performance/backup/backup-performance-monitor';
import type { PerformanceReport } from '@/lib/performance/backup/backup-infrastructure-monitor';
import type { MetricsAggregation } from '@/lib/performance/backup/performance-metrics-collector';

interface BackupPerformanceChartsProps {
  backupId?: string;
  realTimeMode?: boolean;
  showWeddingContext?: boolean;
  onAlert?: (alert: any) => void;
}

interface ChartData {
  timestamp: string;
  apiResponse: number;
  cpuUsage: number;
  memoryUsage: number;
  dbLatency: number;
  userImpact: number;
  weddingActivity: number;
}

const COLORS = {
  primary: '#8b5cf6',
  secondary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  wedding: '#ec4899',
};

const CHART_COLORS = [
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
];

export default function BackupPerformanceCharts({
  backupId,
  realTimeMode = false,
  showWeddingContext = true,
  onAlert,
}: BackupPerformanceChartsProps) {
  const [currentMetrics, setCurrentMetrics] =
    useState<PerformanceMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<ChartData[]>([]);
  const [aggregation, setAggregation] = useState<MetricsAggregation | null>(
    null,
  );
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    '1hour' | '6hour' | '24hour'
  >('1hour');

  // Simulate real-time data updates
  useEffect(() => {
    if (!realTimeMode) return;

    const interval = setInterval(() => {
      const now = new Date();
      const newData: ChartData = {
        timestamp: now.toLocaleTimeString(),
        apiResponse: 95 + Math.random() * 20,
        cpuUsage: 15 + Math.random() * 25,
        memoryUsage: 300 + Math.random() * 200,
        dbLatency: 50 + Math.random() * 100,
        userImpact: Math.random() * 15,
        weddingActivity: 40 + Math.random() * 40,
      };

      setHistoricalData((prev) => [...prev.slice(-29), newData]);

      // Simulate metrics update
      const metrics: PerformanceMetrics = {
        timestamp: now.getTime(),
        backupId: backupId || 'real-time',
        apiResponseTime: {
          current: newData.apiResponse,
          baseline: 95,
          increase: ((newData.apiResponse - 95) / 95) * 100,
        },
        systemMetrics: {
          cpuUsage: newData.cpuUsage,
          memoryUsage: newData.memoryUsage,
          diskIO: { read: 10, write: 5 },
        },
        databaseMetrics: {
          connectionCount: 15,
          queryLatency: newData.dbLatency,
          lockContention: 0,
          activeQueries: 5,
        },
        networkMetrics: {
          uploadSpeed: 8,
          downloadSpeed: 50,
          latency: 25,
        },
        weddingContext: {
          isPeakHours:
            new Date().getHours() >= 6 && new Date().getHours() <= 22,
          activeWeddings: Math.floor(newData.weddingActivity / 10),
          criticalOperations: [],
          vendorActivity: Math.floor(newData.weddingActivity * 0.7),
        },
      };

      setCurrentMetrics(metrics);

      // Check for alerts
      if (newData.apiResponse > 110 || newData.cpuUsage > 35) {
        const alert = {
          severity: newData.apiResponse > 115 ? 'high' : 'medium',
          message:
            newData.apiResponse > 110
              ? `API response time elevated: ${newData.apiResponse.toFixed(1)}ms`
              : `CPU usage high: ${newData.cpuUsage.toFixed(1)}%`,
          timestamp: now,
        };

        setAlerts((prev) => [...prev.slice(-4), alert]);
        onAlert?.(alert);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [realTimeMode, backupId, onAlert]);

  // Initialize with sample data
  useEffect(() => {
    const initializeData = () => {
      const sampleData: ChartData[] = Array.from({ length: 30 }, (_, i) => {
        const time = new Date(Date.now() - (29 - i) * 60000);
        return {
          timestamp: time.toLocaleTimeString(),
          apiResponse: 95 + Math.random() * 15,
          cpuUsage: 15 + Math.random() * 20,
          memoryUsage: 300 + Math.random() * 150,
          dbLatency: 50 + Math.random() * 75,
          userImpact: Math.random() * 10,
          weddingActivity: 30 + Math.random() * 50,
        };
      });

      setHistoricalData(sampleData);
      setIsLoading(false);

      // Sample aggregation
      const sampleAggregation: MetricsAggregation = {
        timeframe: '1hour',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        summary: {
          totalBackups: 3,
          successfulBackups: 3,
          failedBackups: 0,
          averageDuration: 45,
          totalDataTransferred: 12.5,
        },
        performance: {
          averageApiImpact: 5.2,
          averageCpuUsage: 23.8,
          averageMemoryUsage: 385,
          averageDatabaseLatency: 87,
          peakResourceUsage: { cpu: 42, memory: 520, bandwidth: 12 },
        },
        weddingImpact: {
          peakHourBackups: 2,
          offPeakBackups: 1,
          criticalOperationsAffected: 0,
          averageUserImpact: 'minimal',
          weddingContextScore: 88,
        },
        trends: {
          performanceDirection: 'improving',
          resourceEfficiency: 'stable',
          userSatisfaction: 'improving',
        },
      };

      setAggregation(sampleAggregation);
    };

    initializeData();
  }, []);

  const renderPerformanceOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* API Response Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">API Response</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {currentMetrics?.apiResponseTime.current.toFixed(1) || '95.2'}ms
          </div>
          <div className="flex items-center text-xs text-muted-foreground">
            {(currentMetrics?.apiResponseTime.increase || 0) > 5 ? (
              <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
            )}
            {(currentMetrics?.apiResponseTime.increase || 0).toFixed(1)}% impact
          </div>
        </CardContent>
      </Card>

      {/* System Resources */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Load</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(currentMetrics?.systemMetrics.cpuUsage || 23).toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground">
            CPU •{' '}
            {(currentMetrics?.systemMetrics.memoryUsage || 385).toFixed(0)}MB
            RAM
          </div>
        </CardContent>
      </Card>

      {/* Database Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Database</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(currentMetrics?.databaseMetrics.queryLatency || 87).toFixed(0)}ms
          </div>
          <div className="text-xs text-muted-foreground">
            {currentMetrics?.databaseMetrics.connectionCount || 15} connections
          </div>
        </CardContent>
      </Card>

      {/* Wedding Context */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Wedding Impact</CardTitle>
          <Heart className="h-4 w-4 text-pink-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {aggregation?.weddingImpact.weddingContextScore || 88}
          </div>
          <div className="text-xs text-muted-foreground">
            Context Score • {currentMetrics?.weddingContext.activeWeddings || 4}{' '}
            active
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderRealTimeCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* API Response Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            API Performance Impact
          </CardTitle>
          <CardDescription>
            Real-time API response time during backup operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="apiResponse"
                stroke={COLORS.primary}
                strokeWidth={2}
                name="Response Time (ms)"
              />
              <Line
                type="monotone"
                dataKey="userImpact"
                stroke={COLORS.danger}
                strokeWidth={2}
                name="User Impact (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Resource Utilization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Resources
          </CardTitle>
          <CardDescription>
            CPU and memory utilization during backup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="cpuUsage"
                stackId="1"
                stroke={COLORS.secondary}
                fill={COLORS.secondary}
                name="CPU Usage (%)"
              />
              <Area
                type="monotone"
                dataKey="memoryUsage"
                stackId="2"
                stroke={COLORS.success}
                fill={COLORS.success}
                name="Memory (MB)"
                yAxisId="right"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );

  const renderWeddingContextCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Wedding Activity Correlation */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Wedding Activity vs Backup Performance
          </CardTitle>
          <CardDescription>
            Correlation between wedding planning activity and backup impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="weddingActivity"
                stroke={COLORS.wedding}
                strokeWidth={2}
                name="Wedding Activity"
              />
              <Line
                type="monotone"
                dataKey="userImpact"
                stroke={COLORS.danger}
                strokeWidth={2}
                name="User Impact"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Wedding Context Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Context Health
          </CardTitle>
          <CardDescription>Wedding-aware performance scoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Score</span>
              <Badge
                variant={
                  (aggregation?.weddingImpact.weddingContextScore || 88) >= 90
                    ? 'default'
                    : (aggregation?.weddingImpact.weddingContextScore || 88) >=
                        70
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {aggregation?.weddingImpact.weddingContextScore || 88}/100
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Peak Hour Impact</span>
                <Badge variant="outline" className="ml-auto">
                  {aggregation?.weddingImpact.peakHourBackups || 0} backups
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <span className="text-sm">Off-Peak Utilization</span>
                <Badge variant="outline" className="ml-auto">
                  {aggregation?.weddingImpact.offPeakBackups || 0} backups
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Critical Operations</span>
                <Badge
                  variant={
                    (aggregation?.weddingImpact.criticalOperationsAffected ||
                      0) === 0
                      ? 'default'
                      : 'destructive'
                  }
                >
                  {aggregation?.weddingImpact.criticalOperationsAffected || 0}{' '}
                  affected
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPerformanceTrends = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Trends
        </CardTitle>
        <CardDescription>
          Historical performance analysis and predictions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Performance Direction</h4>
            <div className="flex items-center gap-2">
              {aggregation?.trends.performanceDirection === 'improving' && (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
              {aggregation?.trends.performanceDirection === 'degrading' && (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              {aggregation?.trends.performanceDirection === 'stable' && (
                <Activity className="h-4 w-4 text-blue-500" />
              )}
              <Badge
                variant={
                  aggregation?.trends.performanceDirection === 'improving'
                    ? 'default'
                    : aggregation?.trends.performanceDirection === 'degrading'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {aggregation?.trends.performanceDirection || 'stable'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Resource Efficiency</h4>
            <div className="flex items-center gap-2">
              {aggregation?.trends.resourceEfficiency === 'improving' && (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
              {aggregation?.trends.resourceEfficiency === 'degrading' && (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              {aggregation?.trends.resourceEfficiency === 'stable' && (
                <Activity className="h-4 w-4 text-blue-500" />
              )}
              <Badge
                variant={
                  aggregation?.trends.resourceEfficiency === 'improving'
                    ? 'default'
                    : aggregation?.trends.resourceEfficiency === 'degrading'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {aggregation?.trends.resourceEfficiency || 'stable'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">User Satisfaction</h4>
            <div className="flex items-center gap-2">
              {aggregation?.trends.userSatisfaction === 'improving' && (
                <TrendingUp className="h-4 w-4 text-green-500" />
              )}
              {aggregation?.trends.userSatisfaction === 'degrading' && (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              {aggregation?.trends.userSatisfaction === 'stable' && (
                <Activity className="h-4 w-4 text-blue-500" />
              )}
              <Badge
                variant={
                  aggregation?.trends.userSatisfaction === 'improving'
                    ? 'default'
                    : aggregation?.trends.userSatisfaction === 'degrading'
                      ? 'destructive'
                      : 'secondary'
                }
              >
                {aggregation?.trends.userSatisfaction || 'stable'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderAlerts = () =>
    alerts.length > 0 && (
      <div className="space-y-2 mb-6">
        {alerts.map((alert, index) => (
          <Alert
            key={index}
            variant={alert.severity === 'high' ? 'destructive' : 'default'}
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>{alert.message}</span>
                <span className="text-xs opacity-70">
                  {alert.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Backup Performance Dashboard
          </h2>
          <p className="text-muted-foreground">
            Real-time monitoring of backup operations impact on wedding planning
            activities
          </p>
        </div>

        <div className="flex items-center gap-2">
          {realTimeMode && (
            <Badge variant="secondary" className="animate-pulse">
              <Activity className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {renderAlerts()}

      {/* Performance Overview */}
      {renderPerformanceOverview()}

      {/* Main Charts */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="wedding">Wedding Context</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {renderRealTimeCharts()}
        </TabsContent>

        <TabsContent value="wedding" className="space-y-6">
          {showWeddingContext && renderWeddingContextCharts()}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {renderPerformanceTrends()}
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      {aggregation && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Backups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {aggregation.summary.totalBackups}
              </div>
              <p className="text-xs text-muted-foreground">
                {aggregation.summary.successfulBackups} successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Average Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {aggregation.summary.averageDuration}m
              </div>
              <p className="text-xs text-muted-foreground">
                {aggregation.summary.totalDataTransferred}GB transferred
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Peak CPU Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {aggregation.performance.peakResourceUsage.cpu}%
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {aggregation.performance.averageCpuUsage.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">User Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {aggregation.weddingImpact.averageUserImpact}
              </div>
              <p className="text-xs text-muted-foreground">
                {aggregation.performance.averageApiImpact.toFixed(1)}% API
                impact
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
