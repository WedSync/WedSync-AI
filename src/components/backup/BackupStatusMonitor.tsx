'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  Play,
  Pause,
  Square,
  Camera,
  FileText,
  Users,
  Calendar,
  Heart,
  Database,
  HardDrive,
  Wifi,
  WifiOff,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * BackupStatusMonitor Component
 *
 * Real-time backup status visualization for wedding vendors.
 * Provides live monitoring of backup operations with
 * wedding-specific priority indicators and performance metrics.
 */

// Types for backup monitoring
interface BackupOperation {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'wedding_critical' | 'emergency';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: string;
  endTime?: string;
  estimatedCompletion?: string;
  weddingId?: string;
  weddingCouple?: string;
  weddingDate?: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  dataSize: number;
  processedSize: number;
  speed: number; // MB/s
  error?: string;
  retryCount: number;
  maxRetries: number;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkSpeed: number;
  activeConnections: number;
  queueSize: number;
  throughput: number; // MB/s
  uptime: number;
  lastHealthCheck: string;
}

interface BackupStats {
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  averageSpeed: number;
  totalDataProcessed: number;
  successRate: number;
  weddingOperations: number;
  criticalOperations: number;
}

const BackupStatusMonitor: React.FC = () => {
  const [operations, setOperations] = useState<BackupOperation[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(
    null,
  );
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadMonitoringData();

    let intervalId: NodeJS.Timeout;

    if (autoRefresh) {
      intervalId = setInterval(() => {
        loadMonitoringData();
      }, refreshInterval);
    }

    // Set up real-time subscriptions
    const operationsSubscription = supabase
      .channel('backup_operations_monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'backup_operations',
        },
        () => {
          loadOperations();
        },
      )
      .subscribe();

    return () => {
      if (intervalId) clearInterval(intervalId);
      operationsSubscription.unsubscribe();
    };
  }, [autoRefresh, refreshInterval]);

  const loadMonitoringData = async () => {
    try {
      await Promise.all([
        loadOperations(),
        loadSystemMetrics(),
        loadBackupStats(),
      ]);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadOperations = async () => {
    try {
      const { data, error } = await supabase
        .from('backup_operations')
        .select(
          `
          *,
          weddings (
            id,
            couple_name,
            wedding_date
          )
        `,
        )
        .in('status', ['queued', 'running', 'completed', 'failed'])
        .order('start_time', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedOperations: BackupOperation[] = (data || []).map((op) => ({
        id: op.id,
        name: op.name,
        type: op.type,
        status: op.status,
        progress: op.progress || 0,
        startTime: op.start_time,
        endTime: op.end_time,
        estimatedCompletion: op.estimated_completion,
        weddingId: op.wedding_id,
        weddingCouple: op.weddings?.couple_name,
        weddingDate: op.weddings?.wedding_date,
        priority: op.priority,
        dataSize: op.data_size || 0,
        processedSize: op.processed_size || 0,
        speed: op.current_speed || 0,
        error: op.error_message,
        retryCount: op.retry_count || 0,
        maxRetries: op.max_retries || 3,
      }));

      setOperations(formattedOperations);
    } catch (error) {
      console.error('Failed to load backup operations:', error);
    }
  };

  const loadSystemMetrics = async () => {
    try {
      // Mock system metrics - in production, this would come from monitoring API
      const mockMetrics: SystemMetrics = {
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
        diskUsage: Math.random() * 100,
        networkSpeed: Math.random() * 1000,
        activeConnections: Math.floor(Math.random() * 10) + 5,
        queueSize: operations.filter((op) => op.status === 'queued').length,
        throughput: operations
          .filter((op) => op.status === 'running')
          .reduce((sum, op) => sum + op.speed, 0),
        uptime: Date.now() - Math.random() * 86400000, // Random uptime up to 1 day
        lastHealthCheck: new Date().toISOString(),
      };

      setSystemMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to load system metrics:', error);
    }
  };

  const loadBackupStats = async () => {
    try {
      const totalOperations = operations.length;
      const completedOperations = operations.filter(
        (op) => op.status === 'completed',
      ).length;
      const failedOperations = operations.filter(
        (op) => op.status === 'failed',
      ).length;
      const weddingOperations = operations.filter((op) => op.weddingId).length;
      const criticalOperations = operations.filter(
        (op) => op.priority === 'critical',
      ).length;

      const averageSpeed = operations
        .filter((op) => op.status === 'completed' && op.speed > 0)
        .reduce((sum, op, _, arr) => sum + op.speed / arr.length, 0);

      const totalDataProcessed = operations
        .filter((op) => op.status === 'completed')
        .reduce((sum, op) => sum + op.processedSize, 0);

      const successRate =
        totalOperations > 0
          ? (completedOperations / totalOperations) * 100
          : 100;

      const stats: BackupStats = {
        totalOperations,
        completedOperations,
        failedOperations,
        averageSpeed,
        totalDataProcessed,
        successRate,
        weddingOperations,
        criticalOperations,
      };

      setBackupStats(stats);
    } catch (error) {
      console.error('Failed to calculate backup stats:', error);
    }
  };

  const cancelOperation = async (operationId: string) => {
    try {
      await supabase
        .from('backup_operations')
        .update({ status: 'cancelled' })
        .eq('id', operationId);

      await loadOperations();
    } catch (error) {
      console.error('Failed to cancel operation:', error);
    }
  };

  const retryOperation = async (operationId: string) => {
    try {
      await supabase
        .from('backup_operations')
        .update({
          status: 'queued',
          retry_count:
            operations.find((op) => op.id === operationId)?.retryCount || 0 + 1,
          error_message: null,
        })
        .eq('id', operationId);

      await loadOperations();
    } catch (error) {
      console.error('Failed to retry operation:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'wedding_critical':
        return <Heart className="h-4 w-4 text-pink-500" />;
      case 'emergency':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'full':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'incremental':
        return <Activity className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      critical: 'destructive',
      high: 'default',
      normal: 'secondary',
      low: 'outline',
    };
    return (
      <Badge variant={variants[priority as keyof typeof variants] as any}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (speed: number): string => {
    return `${formatBytes(speed * 1024 * 1024)}/s`;
  };

  const formatUptime = (uptime: number): string => {
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    return `${days}d ${hours}h ${minutes}m`;
  };

  const getHealthStatus = () => {
    if (!systemMetrics) return 'unknown';

    const criticalThresholds = {
      cpu: 90,
      memory: 90,
      disk: 95,
    };

    if (
      systemMetrics.cpuUsage > criticalThresholds.cpu ||
      systemMetrics.memoryUsage > criticalThresholds.memory ||
      systemMetrics.diskUsage > criticalThresholds.disk
    ) {
      return 'critical';
    }

    if (
      systemMetrics.cpuUsage > 70 ||
      systemMetrics.memoryUsage > 70 ||
      systemMetrics.diskUsage > 80
    ) {
      return 'warning';
    }

    return 'healthy';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Loading backup monitor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-3xl font-bold">Backup Status Monitor</h1>
            <p className="text-muted-foreground">
              Real-time monitoring of wedding data protection operations
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className="flex items-center space-x-2 text-green-600">
                <Wifi className="h-4 w-4" />
                <span className="text-sm">Connected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm">Disconnected</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </span>
          </div>

          <Button variant="outline" onClick={loadMonitoringData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Connection Status Alert */}
      {!isConnected && (
        <Alert className="border-red-200 bg-red-50">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            Connection lost to backup monitoring service. Data may not be
            current.
            <Button
              variant="link"
              onClick={loadMonitoringData}
              className="p-0 ml-2 text-red-700"
            >
              Retry Connection
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <div className="flex items-center space-x-1">
              {getHealthStatus() === 'healthy' && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              {getHealthStatus() === 'warning' && (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              {getHealthStatus() === 'critical' && (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>CPU</span>
                <span>{systemMetrics?.cpuUsage.toFixed(1)}%</span>
              </div>
              <Progress value={systemMetrics?.cpuUsage || 0} className="h-1" />

              <div className="flex justify-between text-xs">
                <span>Memory</span>
                <span>{systemMetrics?.memoryUsage.toFixed(1)}%</span>
              </div>
              <Progress
                value={systemMetrics?.memoryUsage || 0}
                className="h-1"
              />

              <div className="flex justify-between text-xs">
                <span>Disk</span>
                <span>{systemMetrics?.diskUsage.toFixed(1)}%</span>
              </div>
              <Progress value={systemMetrics?.diskUsage || 0} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Operations
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {operations.filter((op) => op.status === 'running').length}
            </div>
            <div className="text-xs text-muted-foreground">
              {systemMetrics?.queueSize || 0} queued
            </div>
            {systemMetrics?.throughput && systemMetrics.throughput > 0 && (
              <div className="text-xs text-green-600 mt-1">
                {formatSpeed(systemMetrics.throughput)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupStats?.successRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {backupStats?.completedOperations}/{backupStats?.totalOperations}{' '}
              completed
            </div>
            {backupStats?.failedOperations &&
              backupStats.failedOperations > 0 && (
                <div className="text-xs text-red-600 mt-1">
                  {backupStats.failedOperations} failed
                </div>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Wedding Operations
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backupStats?.weddingOperations || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {backupStats?.criticalOperations || 0} critical priority
            </div>
            <div className="text-xs text-pink-600 mt-1">
              Wedding-aware backups active
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      {systemMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Network Speed</span>
                <span className="text-sm font-medium">
                  {formatSpeed(systemMetrics.networkSpeed / 1024)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Connections</span>
                <span className="text-sm font-medium">
                  {systemMetrics.activeConnections}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Uptime</span>
                <span className="text-sm font-medium">
                  {formatUptime(systemMetrics.uptime)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Data Processing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Processed</span>
                <span className="text-sm font-medium">
                  {formatBytes(backupStats?.totalDataProcessed || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Speed</span>
                <span className="text-sm font-medium">
                  {formatSpeed(backupStats?.averageSpeed || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Queue Size</span>
                <span className="text-sm font-medium">
                  {systemMetrics.queueSize}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600">Completed</span>
                <span className="text-sm font-medium">
                  {backupStats?.completedOperations || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-600">Running</span>
                <span className="text-sm font-medium">
                  {operations.filter((op) => op.status === 'running').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-red-600">Failed</span>
                <span className="text-sm font-medium">
                  {backupStats?.failedOperations || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Backup Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {operations.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">All Clear</h3>
                <p className="text-gray-600">
                  No active backup operations at the moment
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {operations.map((operation) => (
                  <div key={operation.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(operation.status)}
                        {getTypeIcon(operation.type)}
                        <div>
                          <h4 className="font-medium flex items-center gap-2">
                            {operation.name}
                            {getPriorityBadge(operation.priority)}
                            {operation.weddingCouple && (
                              <Badge
                                variant="outline"
                                className="bg-pink-50 text-pink-700"
                              >
                                <Heart className="h-3 w-3 mr-1" />
                                {operation.weddingCouple}
                              </Badge>
                            )}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>
                              Started:{' '}
                              {format(
                                new Date(operation.startTime),
                                'HH:mm:ss',
                              )}
                            </span>
                            {operation.weddingDate && (
                              <span>
                                Wedding:{' '}
                                {format(
                                  new Date(operation.weddingDate),
                                  'MMM dd, yyyy',
                                )}
                              </span>
                            )}
                            {operation.speed > 0 && (
                              <span className="text-green-600">
                                {formatSpeed(operation.speed)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {operation.status === 'running' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancelOperation(operation.id)}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        {operation.status === 'failed' &&
                          operation.retryCount < operation.maxRetries && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => retryOperation(operation.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {operation.status === 'running' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span>Progress: {operation.progress}%</span>
                          <span>
                            {formatBytes(operation.processedSize)} /{' '}
                            {formatBytes(operation.dataSize)}
                          </span>
                        </div>
                        <Progress value={operation.progress} />
                        {operation.estimatedCompletion && (
                          <div className="text-xs text-gray-500">
                            ETA:{' '}
                            {format(
                              new Date(operation.estimatedCompletion),
                              'HH:mm:ss',
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error Message */}
                    {operation.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <strong>Error:</strong> {operation.error}
                        {operation.retryCount > 0 && (
                          <span className="ml-2">
                            (Attempt {operation.retryCount + 1}/
                            {operation.maxRetries + 1})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Completion Info */}
                    {operation.status === 'completed' && operation.endTime && (
                      <div className="mt-2 text-sm text-green-600">
                        Completed in{' '}
                        {formatDistanceToNow(new Date(operation.startTime), {
                          addSuffix: false,
                        })}
                        • {formatBytes(operation.processedSize)} processed
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupStatusMonitor;
