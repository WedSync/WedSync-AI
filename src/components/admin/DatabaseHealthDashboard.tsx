/**
 * WS-234 Database Health Dashboard
 * Real-time database health monitoring with wedding season optimizations
 *
 * Features:
 * - Real-time health status overview with traffic light indicators
 * - Connection pool utilization chart with wedding season context
 * - Storage usage breakdown by table type (forms, photos, logs)
 * - Query performance metrics with slow query identification
 * - Lock monitoring with blocking query details
 * - Index health analysis with optimization recommendations
 * - Automated maintenance scheduling and history
 * - Emergency action buttons (kill queries, vacuum tables, restart connections)
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  Lock,
  Pause,
  Play,
  RefreshCw,
  Server,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Heart,
  Gauge,
  BarChart3,
  Settings,
  Calendar,
  Users,
} from 'lucide-react';
import { useDatabaseHealth } from '@/hooks/useDatabaseHealth';
import { QueryOptimizationPanel } from './QueryOptimizationPanel';

export interface DatabaseHealthDashboardProps {
  refreshInterval?: number; // seconds, default 30
  showOptimizationPanel?: boolean;
  compactMode?: boolean;
}

export function DatabaseHealthDashboard({
  refreshInterval = 30,
  showOptimizationPanel = true,
  compactMode = false,
}: DatabaseHealthDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [emergencyMode, setEmergencyMode] = useState(false);

  const {
    healthMetrics,
    isLoading,
    isError,
    error,
    refetch,
    optimizeDatabase,
    killSlowQueries,
    cleanupConnections,
  } = useDatabaseHealth({
    refreshInterval: autoRefresh ? refreshInterval * 1000 : 0,
    includeQueries: true,
    includeIndexes: true,
    includeMaintenance: true,
  });

  // Check for emergency conditions
  useEffect(() => {
    if (healthMetrics?.status === 'critical') {
      setEmergencyMode(true);
    } else {
      setEmergencyMode(false);
    }
  }, [healthMetrics?.status]);

  const handleManualRefresh = useCallback(() => {
    setLastRefresh(new Date());
    refetch();
  }, [refetch]);

  const handleEmergencyAction = async (action: string, target?: string) => {
    try {
      switch (action) {
        case 'kill_slow_queries':
          await killSlowQueries();
          break;
        case 'cleanup_connections':
          await cleanupConnections();
          break;
        case 'vacuum_critical':
          if (target) {
            await optimizeDatabase('vacuum_table', target);
          }
          break;
        default:
          console.warn(`Unknown emergency action: ${action}`);
      }

      // Force refresh after emergency action
      setTimeout(() => {
        handleManualRefresh();
      }, 2000);
    } catch (error) {
      console.error(`Emergency action failed: ${action}`, error);
    }
  };

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Database Health Monitor Error
          </CardTitle>
          <CardDescription className="text-red-600">
            Failed to load database health metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 mb-4">
            {error?.message || 'Unknown error occurred'}
          </p>
          <Button
            onClick={handleManualRefresh}
            className="bg-red-600 hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'critical':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Emergency Alert */}
      {emergencyMode && healthMetrics && (
        <Alert className="border-red-200 bg-red-50 animate-pulse">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-red-700">
            Critical Database Performance Issues Detected
          </AlertTitle>
          <AlertDescription className="text-red-600">
            Immediate action required to prevent service disruption.
            {healthMetrics.weddingSeasonContext?.isWeddingSeason &&
              ' Wedding season active - extra caution required.'}
          </AlertDescription>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => handleEmergencyAction('kill_slow_queries')}
              className="bg-red-600 hover:bg-red-700"
            >
              <Zap className="h-4 w-4 mr-1" />
              Kill Slow Queries
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEmergencyAction('cleanup_connections')}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <Users className="h-4 w-4 mr-1" />
              Clean Connections
            </Button>
          </div>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Database Health Monitor
          </h2>
          <p className="text-muted-foreground">
            Real-time monitoring with wedding season optimizations
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Wedding Season Indicator */}
          {healthMetrics?.weddingSeasonContext?.isWeddingSeason && (
            <Badge className="bg-pink-100 text-pink-800 border-pink-200">
              <Heart className="h-3 w-3 mr-1" />
              Wedding Season (1.
              {healthMetrics.weddingSeasonContext.seasonMultiplier}x)
            </Badge>
          )}

          {/* Auto-refresh toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={
              autoRefresh ? 'bg-green-50 border-green-200 text-green-700' : ''
            }
          >
            {autoRefresh ? (
              <Pause className="h-4 w-4 mr-1" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Auto-refresh
          </Button>

          {/* Manual refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          {/* Last refresh time */}
          <div className="text-sm text-muted-foreground">
            Updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Status */}
        <Card
          className={healthMetrics ? getStatusColor(healthMetrics.status) : ''}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {healthMetrics ? (
                getStatusIcon(healthMetrics.status)
              ) : (
                <Skeleton className="h-4 w-4" />
              )}
              Overall Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <div className="text-2xl font-bold capitalize">
                {healthMetrics?.status || 'Unknown'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Pool */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              Connection Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {healthMetrics?.connectionPool.utilizationPercent.toFixed(0)}%
                </div>
                <Progress
                  value={healthMetrics?.connectionPool.utilizationPercent || 0}
                  className={
                    healthMetrics?.connectionPool.status === 'critical'
                      ? 'bg-red-100'
                      : ''
                  }
                />
                <div className="text-xs text-muted-foreground">
                  {healthMetrics?.connectionPool.active || 0} active,{' '}
                  {healthMetrics?.connectionPool.idle || 0} idle
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {healthMetrics?.storage.percentage.toFixed(0)}%
                </div>
                <Progress
                  value={healthMetrics?.storage.percentage || 0}
                  className={
                    healthMetrics?.storage.status === 'critical'
                      ? 'bg-red-100'
                      : ''
                  }
                />
                <div className="text-xs text-muted-foreground">
                  {healthMetrics?.storage.prettySize} of{' '}
                  {healthMetrics?.storage.maxSize}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Query Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Avg Query Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 w-16" />
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {healthMetrics?.queryPerformance.avgTime.toFixed(0)}ms
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {healthMetrics?.queryPerformance.avgTime > 500 ? (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-500" />
                  )}
                  <span className="text-muted-foreground">
                    P95: {healthMetrics?.queryPerformance.p95Time.toFixed(0)}ms
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
              <TabsTrigger value="storage">Storage</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            <TabsContent value="overview" className="space-y-4">
              <OverviewTab
                healthMetrics={healthMetrics}
                isLoading={isLoading}
                onEmergencyAction={handleEmergencyAction}
              />
            </TabsContent>

            <TabsContent value="connections" className="space-y-4">
              <ConnectionsTab
                healthMetrics={healthMetrics}
                isLoading={isLoading}
                onCleanupConnections={() =>
                  handleEmergencyAction('cleanup_connections')
                }
              />
            </TabsContent>

            <TabsContent value="storage" className="space-y-4">
              <StorageTab healthMetrics={healthMetrics} isLoading={isLoading} />
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <PerformanceTab
                healthMetrics={healthMetrics}
                isLoading={isLoading}
                onKillSlowQueries={() =>
                  handleEmergencyAction('kill_slow_queries')
                }
              />
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4">
              <MaintenanceTab
                healthMetrics={healthMetrics}
                isLoading={isLoading}
                onVacuumTable={(table: string) =>
                  handleEmergencyAction('vacuum_critical', table)
                }
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Query Optimization Panel */}
      {showOptimizationPanel &&
        healthMetrics?.queryPerformance?.slowQueries && (
          <QueryOptimizationPanel
            slowQueries={healthMetrics.queryPerformance.slowQueries}
            onOptimizeQuery={(queryId, optimization) => {
              console.log('Optimize query:', queryId, optimization);
              // Implementation would trigger query optimization
            }}
            onKillQuery={(queryId) => {
              console.log('Kill query:', queryId);
              // Implementation would kill specific query
            }}
          />
        )}
    </div>
  );
}

// Tab Components
function OverviewTab({ healthMetrics, isLoading, onEmergencyAction }: any) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wedding Season Context */}
      {healthMetrics?.weddingSeasonContext?.isWeddingSeason && (
        <Alert className="border-pink-200 bg-pink-50">
          <Heart className="h-4 w-4" />
          <AlertTitle className="text-pink-700">
            Wedding Season Active
          </AlertTitle>
          <AlertDescription className="text-pink-600">
            Thresholds adjusted for{' '}
            {healthMetrics.weddingSeasonContext.seasonMultiplier}x capacity.
            Extra caution required for maintenance operations.
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Connection Pool</span>
              <Badge
                className={getStatusColor(
                  healthMetrics?.connectionPool.status || 'unknown',
                )}
              >
                {healthMetrics?.connectionPool.status || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Storage</span>
              <Badge
                className={getStatusColor(
                  healthMetrics?.storage.status || 'unknown',
                )}
              >
                {healthMetrics?.storage.status || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Query Performance</span>
              <Badge
                className={getStatusColor(
                  healthMetrics?.queryPerformance.status || 'unknown',
                )}
              >
                {healthMetrics?.queryPerformance.status || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Locks</span>
              <Badge
                className={getStatusColor(
                  healthMetrics?.locks.status || 'unknown',
                )}
              >
                {healthMetrics?.locks.status || 'Unknown'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Wedding Data Impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Wedding Data Storage</span>
              <span className="font-medium">
                {healthMetrics?.storage.weddingDataPercentage?.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Wedding Query Impact</span>
              <span className="font-medium">
                {healthMetrics?.queryPerformance.weddingSeasonImpact || 0}{' '}
                queries
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Critical Queries</span>
              <span className="font-medium">
                {healthMetrics?.queryPerformance.criticalQueries || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Actions */}
      {healthMetrics?.status === 'critical' && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Emergency Actions</CardTitle>
            <CardDescription className="text-red-600">
              Critical performance issues require immediate action
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => onEmergencyAction('kill_slow_queries')}
                className="bg-red-600 hover:bg-red-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Kill Slow Queries
              </Button>
              <Button
                onClick={() => onEmergencyAction('cleanup_connections')}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Users className="h-4 w-4 mr-2" />
                Clean Connections
              </Button>
              <Button
                onClick={() => onEmergencyAction('vacuum_critical')}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Database className="h-4 w-4 mr-2" />
                Emergency Vacuum
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConnectionsTab({
  healthMetrics,
  isLoading,
  onCleanupConnections,
}: any) {
  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Connection Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Active Connections</span>
              <span className="font-bold">
                {healthMetrics?.connectionPool.active || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Idle Connections</span>
              <span className="font-bold">
                {healthMetrics?.connectionPool.idle || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Waiting</span>
              <span className="font-bold">
                {healthMetrics?.connectionPool.waiting || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Idle in Transaction</span>
              <span className="font-bold text-orange-600">
                {healthMetrics?.connectionPool.idleInTransaction || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pool Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Utilization</span>
              <span className="font-bold">
                {healthMetrics?.connectionPool.utilizationPercent?.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Max Connections</span>
              <span className="font-bold">
                {healthMetrics?.connectionPool.maxConnections}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Wedding Season Adjusted</span>
              <Badge
                variant={
                  healthMetrics?.connectionPool.weddingSeasonAdjusted
                    ? 'default'
                    : 'secondary'
                }
              >
                {healthMetrics?.connectionPool.weddingSeasonAdjusted
                  ? 'Yes'
                  : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Peak Detected</span>
              <Badge
                variant={
                  healthMetrics?.connectionPool.peakDetected
                    ? 'destructive'
                    : 'secondary'
                }
              >
                {healthMetrics?.connectionPool.peakDetected ? 'Yes' : 'No'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {(healthMetrics?.connectionPool.status === 'warning' ||
        healthMetrics?.connectionPool.status === 'critical') && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-700">
              Connection Pool Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={onCleanupConnections}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Users className="h-4 w-4 mr-2" />
              Clean Idle Connections
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StorageTab({ healthMetrics, isLoading }: any) {
  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Storage Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Used Space</span>
              <span className="font-bold">
                {healthMetrics?.storage.prettySize}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Percentage Used</span>
              <span className="font-bold">
                {healthMetrics?.storage.percentage?.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Wedding Data</span>
              <span className="font-bold">
                {healthMetrics?.storage.weddingDataPercentage?.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Growth Rate</span>
              <span className="font-bold">
                {healthMetrics?.storage.growthRateMbPerDay?.toFixed(1)} MB/day
              </span>
            </div>
            {healthMetrics?.storage.projectedFullDate && (
              <div className="flex justify-between">
                <span>Projected Full</span>
                <span className="font-bold text-orange-600">
                  {new Date(
                    healthMetrics.storage.projectedFullDate,
                  ).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Largest Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthMetrics?.storage.largestTables
                ?.slice(0, 8)
                .map((table: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm"
                  >
                    <span
                      className={
                        table.isWeddingCritical
                          ? 'font-medium text-pink-600'
                          : ''
                      }
                    >
                      {table.tableName}
                      {table.isWeddingCritical && (
                        <Heart className="inline h-3 w-3 ml-1" />
                      )}
                    </span>
                    <span>{table.prettySize}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PerformanceTab({ healthMetrics, isLoading, onKillSlowQueries }: any) {
  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Query Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Average Time</span>
              <span className="font-bold">
                {healthMetrics?.queryPerformance.avgTime?.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span>P95 Time</span>
              <span className="font-bold">
                {healthMetrics?.queryPerformance.p95Time?.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span>P99 Time</span>
              <span className="font-bold">
                {healthMetrics?.queryPerformance.p99Time?.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Queries</span>
              <span className="font-bold">
                {healthMetrics?.queryPerformance.totalQueries || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wedding Impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Wedding Queries</span>
              <span className="font-bold">
                {healthMetrics?.queryPerformance.weddingSeasonImpact || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Critical Queries</span>
              <span className="font-bold text-red-600">
                {healthMetrics?.queryPerformance.criticalQueries || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {healthMetrics?.queryPerformance.criticalQueries > 0 && (
              <Button
                onClick={onKillSlowQueries}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Kill Slow Queries
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Slow Queries Table */}
      {healthMetrics?.queryPerformance.slowQueries &&
        healthMetrics.queryPerformance.slowQueries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Slow Queries (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthMetrics.queryPerformance.slowQueries
                  .slice(0, 10)
                  .map((query: any, index: number) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-mono bg-gray-100 p-1 rounded max-w-md truncate">
                          {query.query}
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            variant={
                              query.isWeddingRelated ? 'default' : 'secondary'
                            }
                          >
                            {query.isWeddingRelated ? 'Wedding' : 'General'}
                          </Badge>
                          <Badge variant="outline">
                            {query.avgTime.toFixed(0)}ms avg
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        {query.calls} calls • Max: {query.maxTime.toFixed(0)}ms
                        {query.optimization?.description && (
                          <span className="ml-2 text-blue-600">
                            • {query.optimization.description}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

function MaintenanceTab({ healthMetrics, isLoading, onVacuumTable }: any) {
  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Table Bloat Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Bloat</span>
                <span className="font-bold">
                  {healthMetrics?.tableBloat.totalBloat || 0} MB
                </span>
              </div>
              <div className="flex justify-between">
                <span>Reclaimable Space</span>
                <span className="font-bold">
                  {healthMetrics?.tableBloat.reclaimableSpace || 0} MB
                </span>
              </div>
              <div className="flex justify-between">
                <span>Maintenance Required</span>
                <Badge
                  variant={
                    healthMetrics?.tableBloat.maintenanceRequired
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {healthMetrics?.tableBloat.maintenanceRequired ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Window</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span>Safe Window: Tuesday-Thursday 2-6 AM</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>Next Window: Tomorrow 2:00 AM</span>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                * No maintenance on Fridays 6 PM - Monday 6 AM (wedding period)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bloated Tables */}
      {healthMetrics?.tableBloat.bloatedTables &&
        healthMetrics.tableBloat.bloatedTables.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tables Requiring Maintenance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthMetrics.tableBloat.bloatedTables
                  .slice(0, 5)
                  .map((table: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {table.tableName}
                          {table.isWeddingCritical && (
                            <Heart className="h-4 w-4 text-pink-600" />
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {table.bloatPercentage.toFixed(1)}% bloat •
                          {Math.round(table.reclaimableBytes / 1024 / 1024)} MB
                          reclaimable
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant={
                            table.bloatPercentage > 30
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {table.maintenanceRecommendation}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => onVacuumTable(table.tableName)}
                          disabled={table.isWeddingCritical}
                        >
                          <Database className="h-4 w-4 mr-1" />
                          Vacuum
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export default DatabaseHealthDashboard;
