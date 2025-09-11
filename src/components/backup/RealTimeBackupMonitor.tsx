/**
 * WS-258: Backup Strategy Implementation System - Real-Time Monitor
 * Critical P1 system for protecting irreplaceable wedding data
 * Team A - React Component Development
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
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Pause,
  Square,
  Camera,
  Users,
  FileText,
  Database,
  HardDrive,
} from 'lucide-react';
import { BackupOperation, DataType, BackupStatus } from './types';
import { cn } from '@/lib/utils';

interface RealTimeBackupMonitorProps {
  organizationId: string;
  activeOperations: BackupOperation[];
  isConnected: boolean;
}

interface BackupMetrics {
  totalThroughput: number;
  averageSpeed: number;
  peakSpeed: number;
  operationsPerMinute: number;
  errorRate: number;
  successRate: number;
  weddingCriticalOperations: number;
}

interface PerformanceData {
  timestamp: Date;
  throughput: number;
  operations: number;
  errors: number;
}

// Helper function to format bytes per second
function formatBytesPerSecond(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return (
    parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  );
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to get operation color
function getOperationColor(operation: BackupOperation): string {
  if (operation.wedding_critical)
    return 'border-red-200 bg-red-50 dark:bg-red-950/20';
  switch (operation.status) {
    case 'healthy':
      return 'border-green-200 bg-green-50 dark:bg-green-950/20';
    case 'warning':
    case 'in-progress':
      return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20';
    case 'failed':
    case 'critical':
      return 'border-red-200 bg-red-50 dark:bg-red-950/20';
    default:
      return 'border-gray-200 bg-gray-50 dark:bg-gray-950/20';
  }
}

// Helper function to get data type icon
function getDataTypeIcon(dataType: DataType) {
  switch (dataType) {
    case 'photos':
      return <Camera className="w-4 h-4" />;
    case 'client-data':
      return <Users className="w-4 h-4" />;
    case 'business-files':
      return <FileText className="w-4 h-4" />;
    case 'database':
      return <Database className="w-4 h-4" />;
    case 'system-config':
      return <HardDrive className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

// Helper function to calculate estimated time remaining
function calculateTimeRemaining(operation: BackupOperation): string {
  if (operation.progress_percentage >= 100) return 'Complete';
  if (operation.progress_percentage <= 0) return 'Calculating...';

  const elapsed =
    new Date().getTime() - new Date(operation.start_time).getTime();
  const estimatedTotal = (elapsed / operation.progress_percentage) * 100;
  const remaining = estimatedTotal - elapsed;

  if (remaining < 60000) {
    // Less than 1 minute
    return `${Math.round(remaining / 1000)}s remaining`;
  } else if (remaining < 3600000) {
    // Less than 1 hour
    return `${Math.round(remaining / 60000)}m remaining`;
  } else {
    return `${Math.round(remaining / 3600000)}h ${Math.round((remaining % 3600000) / 60000)}m remaining`;
  }
}

export function RealTimeBackupMonitor({
  organizationId,
  activeOperations,
  isConnected,
}: RealTimeBackupMonitorProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [metrics, setMetrics] = useState<BackupMetrics>({
    totalThroughput: 0,
    averageSpeed: 0,
    peakSpeed: 0,
    operationsPerMinute: 0,
    errorRate: 0,
    successRate: 100,
    weddingCriticalOperations: 0,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Calculate real-time metrics
  useEffect(() => {
    const newMetrics: BackupMetrics = {
      totalThroughput: activeOperations.reduce((sum, op) => {
        // Estimate throughput based on bytes processed and time elapsed
        const elapsed =
          new Date().getTime() - new Date(op.start_time).getTime();
        const elapsedSeconds = elapsed / 1000;
        return (
          sum + (elapsedSeconds > 0 ? op.bytes_processed / elapsedSeconds : 0)
        );
      }, 0),
      averageSpeed:
        activeOperations.length > 0
          ? activeOperations.reduce((sum, op) => {
              const elapsed =
                new Date().getTime() - new Date(op.start_time).getTime();
              const elapsedSeconds = elapsed / 1000;
              return (
                sum +
                (elapsedSeconds > 0 ? op.bytes_processed / elapsedSeconds : 0)
              );
            }, 0) / activeOperations.length
          : 0,
      peakSpeed: Math.max(
        ...activeOperations.map((op) => {
          const elapsed =
            new Date().getTime() - new Date(op.start_time).getTime();
          const elapsedSeconds = elapsed / 1000;
          return elapsedSeconds > 0 ? op.bytes_processed / elapsedSeconds : 0;
        }),
        0,
      ),
      operationsPerMinute: activeOperations.length, // Simplified for real-time display
      errorRate:
        activeOperations.length > 0
          ? (activeOperations.filter((op) => op.status === 'failed').length /
              activeOperations.length) *
            100
          : 0,
      successRate:
        activeOperations.length > 0
          ? (activeOperations.filter(
              (op) => op.status === 'healthy' || op.status === 'in-progress',
            ).length /
              activeOperations.length) *
            100
          : 100,
      weddingCriticalOperations: activeOperations.filter(
        (op) => op.wedding_critical,
      ).length,
    };

    setMetrics(newMetrics);

    // Update performance data for trends
    const now = new Date();
    setPerformanceData((prev) => {
      const newData = [
        ...prev,
        {
          timestamp: now,
          throughput: newMetrics.totalThroughput,
          operations: activeOperations.length,
          errors: activeOperations.filter((op) => op.status === 'failed')
            .length,
        },
      ];

      // Keep only last 30 data points (for trending)
      return newData.slice(-30);
    });
  }, [activeOperations]);

  // Auto-refresh data
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // This would trigger a refresh of data in a real implementation
      console.log('Auto-refreshing backup monitor data...');
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="space-y-6">
      {/* Connection and Control Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Real-Time Backup Monitoring
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Live monitoring of backup operations with real-time performance
            metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm">
                  {isConnected
                    ? 'Real-time monitoring active'
                    : 'Connection lost - attempting reconnection...'}
                </span>
              </div>

              {!isConnected && (
                <Alert className="inline-flex">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Monitoring connection disrupted. Some data may be delayed.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? (
                  <Pause className="w-4 h-4 mr-1" />
                ) : (
                  <Play className="w-4 h-4 mr-1" />
                )}
                {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Throughput
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytesPerSecond(metrics.totalThroughput)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {activeOperations.length} operation
              {activeOperations.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Speed</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytesPerSecond(metrics.averageSpeed)}
            </div>
            <p className="text-xs text-muted-foreground">
              Peak: {formatBytesPerSecond(metrics.peakSpeed)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            {metrics.successRate >= 95 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Error rate: {metrics.errorRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Wedding Critical
            </CardTitle>
            <Camera className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.weddingCriticalOperations}
            </div>
            <p className="text-xs text-muted-foreground">
              High priority operations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Operations Live Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw
              className={cn(
                'w-5 h-5',
                activeOperations.length > 0 && isConnected && 'animate-spin',
              )}
            />
            Live Operations Feed
            <Badge variant="secondary">{activeOperations.length} active</Badge>
          </CardTitle>
          <CardDescription>
            Real-time view of all backup, restore, and verification operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeOperations.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Operations</h3>
              <p className="text-muted-foreground">
                All backup systems are idle. Monitoring continues in real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOperations
                .sort((a, b) => {
                  // Sort wedding critical first, then by start time
                  if (a.wedding_critical && !b.wedding_critical) return -1;
                  if (!a.wedding_critical && b.wedding_critical) return 1;
                  return (
                    new Date(b.start_time).getTime() -
                    new Date(a.start_time).getTime()
                  );
                })
                .map((operation) => (
                  <div
                    key={operation.id}
                    className={cn(
                      'border-2 rounded-lg p-4',
                      getOperationColor(operation),
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getDataTypeIcon(operation.data_types[0])}
                          <span className="font-semibold capitalize">
                            {operation.type} Operation
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {operation.data_types.map((dataType) => (
                            <Badge
                              key={dataType}
                              variant="outline"
                              className="text-xs"
                            >
                              {dataType.replace('-', ' ')}
                            </Badge>
                          ))}
                        </div>

                        {operation.wedding_critical && (
                          <Badge
                            variant="destructive"
                            className="text-xs animate-pulse"
                          >
                            WEDDING CRITICAL
                          </Badge>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {operation.progress_percentage.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {calculateTimeRemaining(operation)}
                        </div>
                      </div>
                    </div>

                    <Progress
                      value={operation.progress_percentage}
                      className="mb-3"
                    />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Progress</div>
                        <div className="font-medium">
                          {formatBytes(operation.bytes_processed)} /{' '}
                          {formatBytes(operation.total_bytes)}
                        </div>
                      </div>

                      <div>
                        <div className="text-muted-foreground">Speed</div>
                        <div className="font-medium">
                          {(() => {
                            const elapsed =
                              new Date().getTime() -
                              new Date(operation.start_time).getTime();
                            const elapsedSeconds = elapsed / 1000;
                            const speed =
                              elapsedSeconds > 0
                                ? operation.bytes_processed / elapsedSeconds
                                : 0;
                            return formatBytesPerSecond(speed);
                          })()}
                        </div>
                      </div>

                      <div>
                        <div className="text-muted-foreground">Started</div>
                        <div className="font-medium">
                          {new Date(operation.start_time).toLocaleTimeString()}
                        </div>
                      </div>

                      <div>
                        <div className="text-muted-foreground">Status</div>
                        <div
                          className={cn(
                            'font-medium capitalize',
                            operation.status === 'healthy' ||
                              operation.status === 'in-progress'
                              ? 'text-green-600'
                              : operation.status === 'warning'
                                ? 'text-yellow-600'
                                : 'text-red-600',
                          )}
                        >
                          {operation.status}
                        </div>
                      </div>
                    </div>

                    {operation.error_message && (
                      <Alert className="mt-3" variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Error:</strong> {operation.error_message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Trends */}
      {performanceData.length > 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Trends
            </CardTitle>
            <CardDescription>
              Real-time performance trends over the last few minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-medium mb-2">Throughput Trend</div>
                <div className="h-20 flex items-end space-x-1">
                  {performanceData.slice(-10).map((data, index) => (
                    <div
                      key={index}
                      className="bg-blue-200 dark:bg-blue-800 flex-1 min-w-0 rounded-t"
                      style={{
                        height: `${Math.max((data.throughput / Math.max(...performanceData.map((d) => d.throughput), 1)) * 100, 2)}%`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">
                  Active Operations
                </div>
                <div className="h-20 flex items-end space-x-1">
                  {performanceData.slice(-10).map((data, index) => (
                    <div
                      key={index}
                      className="bg-green-200 dark:bg-green-800 flex-1 min-w-0 rounded-t"
                      style={{
                        height: `${Math.max((data.operations / Math.max(...performanceData.map((d) => d.operations), 1)) * 100, 2)}%`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Error Count</div>
                <div className="h-20 flex items-end space-x-1">
                  {performanceData.slice(-10).map((data, index) => (
                    <div
                      key={index}
                      className="bg-red-200 dark:bg-red-800 flex-1 min-w-0 rounded-t"
                      style={{
                        height: `${Math.max((data.errors / Math.max(...performanceData.map((d) => d.errors), 1)) * 100, 2)}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
