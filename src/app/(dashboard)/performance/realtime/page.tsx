/**
 * WS-202 Realtime Performance Monitoring Dashboard
 * Team D - Round 1: Performance monitoring and metrics visualization
 *
 * Real-time dashboard for monitoring:
 * - Connection pooling performance
 * - Multi-layer cache hit rates
 * - Auto-scaling activities
 * - Wedding day mode status
 * - Sub-500ms latency compliance
 * - 200+ connection capacity
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Progress from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Database,
  Gauge,
  Heart,
  AlertTriangle,
  TrendingUp,
  Users,
  Zap,
  Calendar,
  Clock,
  Shield,
  Server,
} from 'lucide-react';
import type {
  RealtimePerformanceMetrics,
  CachePerformanceMetrics,
  ConnectionHealthReport,
  ScalingResult,
  WeddingSeasonMetrics,
  PerformanceAlert,
  WeddingDayMode,
} from '@/types/realtime-performance';

// Mock real-time data hook (replace with actual implementation)
function useRealtimeMetrics() {
  const [metrics, setMetrics] = useState<RealtimePerformanceMetrics | null>(
    null,
  );
  const [cacheMetrics, setCacheMetrics] =
    useState<CachePerformanceMetrics | null>(null);
  const [connectionHealth, setConnectionHealth] =
    useState<ConnectionHealthReport | null>(null);
  const [scalingStatus, setScalingStatus] = useState<ScalingResult | null>(
    null,
  );
  const [weddingSeasonMetrics, setWeddingSeasonMetrics] =
    useState<WeddingSeasonMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [weddingDayMode, setWeddingDayMode] = useState<WeddingDayMode | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(async () => {
      try {
        // In real implementation, these would be API calls
        const mockMetrics: RealtimePerformanceMetrics = {
          connectionMetrics: {
            totalConnections: 247,
            connectionsPerSecond: 3.2,
            averageConnectionLatency: 185,
            connectionReusageRate: 89.4,
          },
          subscriptionMetrics: {
            totalSubscriptions: 1854,
            subscriptionsPerConnection: 7.5,
            subscriptionUpdateRate: 95.8,
          },
          performanceMetrics: {
            averageMessageLatency: 238,
            messagesThroughput: 1247,
            errorRate: 0.12,
          },
          resourceMetrics: {
            memoryUsage: {
              rss: 268435456,
              heapUsed: 134217728,
              heapTotal: 201326592,
              external: 16777216,
              arrayBuffers: 8388608,
            },
            cpuUsage: 34.7,
            networkUtilization: 42.3,
          },
        };

        const mockCacheMetrics: CachePerformanceMetrics = {
          hitRatio: {
            overall: 94.7,
            local: 97.2,
            redis: 91.3,
          },
          performance: {
            averageReadLatency: 2.4,
            averageWriteLatency: 4.8,
            operationsPerSecond: 2847,
          },
          memory: {
            localCacheSize: 892,
            localCacheMemory: 67108864,
            redisMemoryUsage: 134217728,
          },
          optimization: {
            compressionRatio: 3.2,
            evictionRate: 0.8,
            preloadEffectiveness: 87.6,
          },
        };

        const mockConnectionHealth: ConnectionHealthReport = {
          totalConnections: 247,
          healthyConnections: 245,
          unhealthyConnections: 2,
          connectionsByUser: new Map([
            ['photographer-users', 89],
            ['venue-users', 67],
            ['florist-users', 34],
            ['caterer-users', 28],
            ['other-users', 29],
          ]),
          performanceMetrics: {
            averageLatency: 185,
            messagesThroughput: 1247,
            errorRate: 0.12,
          },
        };

        const mockScalingStatus: ScalingResult = {
          action: 'no_scaling_needed',
          currentCapacity: 1200,
          requiredCapacity: 850,
          scalingActions: [],
          timestamp: Date.now(),
        };

        const mockWeddingSeasonMetrics: WeddingSeasonMetrics = {
          seasonType: 'peak',
          expectedLoad: 75,
          currentLoad: 68,
          scalingRecommendation: 'maintain',
          capacityUtilization: 58.7,
          costOptimizationScore: 82.4,
        };

        const mockAlerts: PerformanceAlert[] = [
          {
            id: 'alert-001',
            type: 'latency',
            severity: 'medium',
            message: 'Average message latency approaching 250ms threshold',
            value: 238,
            threshold: 250,
            timestamp: Date.now() - 120000,
            metadata: { component: 'realtime_messaging', trend: 'stable' },
          },
        ];

        const mockWeddingDayMode: WeddingDayMode = {
          enabled: false,
          weddingIds: [],
          enhancedMonitoring: false,
          priorityChannels: ['timeline', 'emergency', 'coordination'],
          emergencyContacts: [
            {
              name: 'Site Manager',
              phone: '+1234567890',
              role: 'technical',
              escalationLevel: 1,
            },
            {
              name: 'CTO',
              phone: '+1234567891',
              role: 'executive',
              escalationLevel: 2,
            },
          ],
          fallbackProcedures: [
            'enable_read_only_mode',
            'activate_backup_systems',
          ],
        };

        setMetrics(mockMetrics);
        setCacheMetrics(mockCacheMetrics);
        setConnectionHealth(mockConnectionHealth);
        setScalingStatus(mockScalingStatus);
        setWeddingSeasonMetrics(mockWeddingSeasonMetrics);
        setAlerts(mockAlerts);
        setWeddingDayMode(mockWeddingDayMode);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching metrics:', error);
        setIsLoading(false);
      }
    }, 5000);

    // Initial load
    interval;

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    cacheMetrics,
    connectionHealth,
    scalingStatus,
    weddingSeasonMetrics,
    alerts,
    weddingDayMode,
    isLoading,
  };
}

function MetricCard({
  title,
  value,
  unit = '',
  target,
  status,
  icon: Icon,
  description,
}: {
  title: string;
  value: number | string;
  unit?: string;
  target?: number;
  status?: 'good' | 'warning' | 'critical';
  icon: any;
  description?: string;
}) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${getStatusColor(status)}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit}
        </div>
        {target && (
          <div className="text-xs text-muted-foreground mt-1">
            Target: {target.toLocaleString()}
            {unit}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectionHealthChart({
  healthReport,
}: {
  healthReport: ConnectionHealthReport;
}) {
  const healthPercentage =
    (healthReport.healthyConnections / healthReport.totalConnections) * 100;
  const status =
    healthPercentage >= 95
      ? 'good'
      : healthPercentage >= 85
        ? 'warning'
        : 'critical';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Connection Health
        </CardTitle>
        <CardDescription>
          Real-time connection pool health monitoring
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Health Score</span>
            <span>{healthPercentage.toFixed(1)}%</span>
          </div>
          <Progress
            value={healthPercentage}
            className={`h-2 ${
              status === 'good'
                ? 'bg-green-100'
                : status === 'warning'
                  ? 'bg-yellow-100'
                  : 'bg-red-100'
            }`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-green-600">
              {healthReport.healthyConnections}
            </div>
            <div className="text-muted-foreground">Healthy</div>
          </div>
          <div>
            <div className="font-medium text-red-600">
              {healthReport.unhealthyConnections}
            </div>
            <div className="text-muted-foreground">Unhealthy</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Connections by User Type</div>
          {Array.from(healthReport.connectionsByUser.entries()).map(
            ([userType, count]) => (
              <div key={userType} className="flex justify-between items-center">
                <span className="text-sm capitalize">
                  {userType.replace('-', ' ')}
                </span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CachePerformanceChart({
  cacheMetrics,
}: {
  cacheMetrics: CachePerformanceMetrics;
}) {
  const overallStatus =
    cacheMetrics.hitRatio.overall >= 90
      ? 'good'
      : cacheMetrics.hitRatio.overall >= 80
        ? 'warning'
        : 'critical';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Cache Performance
        </CardTitle>
        <CardDescription>Multi-layer caching system metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {cacheMetrics.hitRatio.overall.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Overall Hit Ratio
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {cacheMetrics.hitRatio.local.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              L1 Cache (Local)
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {cacheMetrics.hitRatio.redis.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              L2 Cache (Redis)
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Read Latency</span>
            <Badge
              variant={
                cacheMetrics.performance.averageReadLatency < 5
                  ? 'default'
                  : 'destructive'
              }
            >
              {cacheMetrics.performance.averageReadLatency.toFixed(1)}ms
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Operations/sec</span>
            <Badge variant="outline">
              {cacheMetrics.performance.operationsPerSecond.toLocaleString()}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Compression Ratio</span>
            <Badge variant="secondary">
              {cacheMetrics.optimization.compressionRatio.toFixed(1)}:1
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScalingStatusCard({
  scalingStatus,
}: {
  scalingStatus: ScalingResult;
}) {
  const utilizationPercent =
    (scalingStatus.requiredCapacity / scalingStatus.currentCapacity) * 100;
  const status =
    utilizationPercent > 90
      ? 'critical'
      : utilizationPercent > 75
        ? 'warning'
        : 'good';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Auto-Scaling Status
        </CardTitle>
        <CardDescription>
          Current scaling state and capacity utilization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Current Action:</span>
          <Badge
            variant={
              scalingStatus.action === 'scaled_up'
                ? 'default'
                : scalingStatus.action === 'scaled_down'
                  ? 'secondary'
                  : scalingStatus.action === 'failed'
                    ? 'destructive'
                    : 'outline'
            }
          >
            {scalingStatus.action.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Capacity Utilization</span>
            <span>{utilizationPercent.toFixed(1)}%</span>
          </div>
          <Progress value={utilizationPercent} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-lg font-semibold">
              {scalingStatus.currentCapacity}
            </div>
            <div className="text-xs text-muted-foreground">
              Current Capacity
            </div>
          </div>
          <div>
            <div className="text-lg font-semibold">
              {scalingStatus.requiredCapacity}
            </div>
            <div className="text-xs text-muted-foreground">
              Required Capacity
            </div>
          </div>
        </div>

        {scalingStatus.scalingActions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Recent Actions:</div>
            {scalingStatus.scalingActions.slice(0, 3).map((action, index) => (
              <div key={index} className="text-xs bg-muted p-2 rounded">
                {action.type.replace('_', ' ').toUpperCase()}:{' '}
                {action.estimatedDuration}s
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeddingDayModeCard({
  weddingDayMode,
}: {
  weddingDayMode: WeddingDayMode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Wedding Day Mode
        </CardTitle>
        <CardDescription>Enhanced monitoring for wedding days</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Mode Status:</span>
          <Badge variant={weddingDayMode.enabled ? 'default' : 'outline'}>
            {weddingDayMode.enabled ? 'ACTIVE' : 'INACTIVE'}
          </Badge>
        </div>

        {weddingDayMode.enabled && (
          <>
            <div className="space-y-2">
              <div className="text-sm font-medium">Active Weddings:</div>
              {weddingDayMode.weddingIds.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No active weddings
                </div>
              ) : (
                weddingDayMode.weddingIds.map((weddingId) => (
                  <Badge
                    key={weddingId}
                    variant="outline"
                    className="mr-1 mb-1"
                  >
                    {weddingId}
                  </Badge>
                ))
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Priority Channels:</div>
              <div className="flex flex-wrap gap-1">
                {weddingDayMode.priorityChannels.map((channel) => (
                  <Badge key={channel} variant="secondary" className="text-xs">
                    {channel}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Emergency Contacts:</div>
              {weddingDayMode.emergencyContacts.map((contact, index) => (
                <div
                  key={index}
                  className="text-xs bg-red-50 p-2 rounded border border-red-200"
                >
                  <div className="font-medium">
                    {contact.name} ({contact.role})
                  </div>
                  <div className="text-muted-foreground">
                    Level {contact.escalationLevel}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AlertsPanel({ alerts }: { alerts: PerformanceAlert[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Performance Alerts
        </CardTitle>
        <CardDescription>
          Recent performance issues and warnings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-4">
            <Shield className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <div className="text-sm text-muted-foreground">
              All systems operating normally
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Alert
                key={alert.id}
                className={
                  alert.severity === 'critical'
                    ? 'border-red-200 bg-red-50'
                    : alert.severity === 'high'
                      ? 'border-orange-200 bg-orange-50'
                      : alert.severity === 'medium'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-blue-200 bg-blue-50'
                }
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>{alert.type.toUpperCase()} Alert</span>
                  <Badge
                    variant={
                      alert.severity === 'critical'
                        ? 'destructive'
                        : alert.severity === 'high'
                          ? 'destructive'
                          : alert.severity === 'medium'
                            ? 'secondary'
                            : 'outline'
                    }
                  >
                    {alert.severity.toUpperCase()}
                  </Badge>
                </AlertTitle>
                <AlertDescription className="mt-2">
                  <div>{alert.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Value: {alert.value} | Threshold: {alert.threshold} |{' '}
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RealtimePerformanceDashboard() {
  const {
    metrics,
    cacheMetrics,
    connectionHealth,
    scalingStatus,
    weddingSeasonMetrics,
    alerts,
    weddingDayMode,
    isLoading,
  } = useRealtimeMetrics();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Realtime Performance Monitor</h1>
          <p className="text-muted-foreground">
            WS-202 Performance Integration Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="animate-pulse">
            Live
          </Badge>
          <Button variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Active Connections"
            value={metrics.connectionMetrics.totalConnections}
            target={200}
            status={
              metrics.connectionMetrics.totalConnections >= 200
                ? 'good'
                : 'warning'
            }
            icon={Users}
            description="Current realtime connections"
          />
          <MetricCard
            title="Message Latency"
            value={metrics.performanceMetrics.averageMessageLatency}
            unit="ms"
            target={500}
            status={
              metrics.performanceMetrics.averageMessageLatency < 250
                ? 'good'
                : metrics.performanceMetrics.averageMessageLatency < 500
                  ? 'warning'
                  : 'critical'
            }
            icon={Zap}
            description="Average message latency"
          />
          <MetricCard
            title="Cache Hit Ratio"
            value={cacheMetrics?.hitRatio.overall.toFixed(1) || '0'}
            unit="%"
            target={90}
            status={
              (cacheMetrics?.hitRatio.overall || 0) >= 90
                ? 'good'
                : (cacheMetrics?.hitRatio.overall || 0) >= 80
                  ? 'warning'
                  : 'critical'
            }
            icon={Database}
            description="Multi-layer cache efficiency"
          />
          <MetricCard
            title="System Health"
            value={
              connectionHealth
                ? (
                    (connectionHealth.healthyConnections /
                      connectionHealth.totalConnections) *
                    100
                  ).toFixed(1)
                : '0'
            }
            unit="%"
            status={
              connectionHealth &&
              connectionHealth.healthyConnections /
                connectionHealth.totalConnections >=
                0.95
                ? 'good'
                : connectionHealth &&
                    connectionHealth.healthyConnections /
                      connectionHealth.totalConnections >=
                      0.85
                  ? 'warning'
                  : 'critical'
            }
            icon={Heart}
            description="Overall system health"
          />
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="caching">Caching</TabsTrigger>
          <TabsTrigger value="scaling">Scaling</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {connectionHealth && (
              <ConnectionHealthChart healthReport={connectionHealth} />
            )}
            {alerts && <AlertsPanel alerts={alerts} />}
            {scalingStatus && (
              <ScalingStatusCard scalingStatus={scalingStatus} />
            )}
            {weddingDayMode && (
              <WeddingDayModeCard weddingDayMode={weddingDayMode} />
            )}
          </div>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {connectionHealth && (
              <ConnectionHealthChart healthReport={connectionHealth} />
            )}

            {metrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Connection Metrics</CardTitle>
                  <CardDescription>
                    Detailed connection pool statistics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold">
                        {metrics.connectionMetrics.connectionsPerSecond.toFixed(
                          1,
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Connections/sec
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {metrics.connectionMetrics.connectionReusageRate.toFixed(
                          1,
                        )}
                        %
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Reusage Rate
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Connection Latency</span>
                      <span className="text-sm font-medium">
                        {metrics.connectionMetrics.averageConnectionLatency}ms
                      </span>
                    </div>
                    <Progress
                      value={
                        (metrics.connectionMetrics.averageConnectionLatency /
                          500) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="caching" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {cacheMetrics && (
              <CachePerformanceChart cacheMetrics={cacheMetrics} />
            )}

            {cacheMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Memory Usage</CardTitle>
                  <CardDescription>
                    Cache memory allocation and efficiency
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Local Cache</span>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {(
                            cacheMetrics.memory.localCacheMemory /
                            1024 /
                            1024
                          ).toFixed(1)}{' '}
                          MB
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cacheMetrics.memory.localCacheSize} entries
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Redis Cache</span>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {(
                            cacheMetrics.memory.redisMemoryUsage /
                            1024 /
                            1024
                          ).toFixed(1)}{' '}
                          MB
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Remote
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Preload Effectiveness</span>
                      <span className="text-sm font-medium">
                        {cacheMetrics.optimization.preloadEffectiveness.toFixed(
                          1,
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={cacheMetrics.optimization.preloadEffectiveness}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="scaling" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scalingStatus && (
              <ScalingStatusCard scalingStatus={scalingStatus} />
            )}

            {weddingSeasonMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Wedding Season Metrics</CardTitle>
                  <CardDescription>
                    Seasonal load patterns and optimization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Season Type:</span>
                    <Badge
                      variant={
                        weddingSeasonMetrics.seasonType === 'peak'
                          ? 'default'
                          : 'outline'
                      }
                    >
                      {weddingSeasonMetrics.seasonType.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-lg font-semibold">
                        {weddingSeasonMetrics.currentLoad}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Current Load
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        {weddingSeasonMetrics.expectedLoad}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Expected Load
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Capacity Utilization</span>
                      <span className="text-sm font-medium">
                        {weddingSeasonMetrics.capacityUtilization.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={weddingSeasonMetrics.capacityUtilization}
                      className="h-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Recommendation:</span>
                    <Badge
                      variant={
                        weddingSeasonMetrics.scalingRecommendation ===
                        'scale_up'
                          ? 'default'
                          : weddingSeasonMetrics.scalingRecommendation ===
                              'scale_down'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {weddingSeasonMetrics.scalingRecommendation
                        .replace('_', ' ')
                        .toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* System Status Footer */}
      <div className="bg-muted rounded-lg p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>System Online</span>
            </div>
            <div>Last Updated: {new Date().toLocaleTimeString()}</div>
          </div>
          <div className="flex items-center gap-4">
            <span>Uptime: 99.97%</span>
            <span>
              Response Time:{' '}
              {metrics?.performanceMetrics.averageMessageLatency || 0}ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
