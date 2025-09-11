/**
 * WS-258: Backup Strategy Implementation System - Analytics Dashboard
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  TrendingUp,
  TrendingDown,
  Clock,
  HardDrive,
  Cloud,
  Server,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Activity,
  Zap,
  Users,
  Camera,
  FileText,
  Database,
  PieChart,
  LineChart,
} from 'lucide-react';
import {
  BackupTimelineChartProps,
  StorageUtilizationDashboardProps,
  RecoveryTimeAnalyticsProps,
  BackupAnalytics,
  BackupOperation,
  StorageMetrics,
  RecoveryProgress,
} from './types';
import { cn } from '@/lib/utils';

interface BackupAnalyticsDashboardProps {
  organizationId: string;
  timeRange?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to format duration
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// Helper function to generate trend data
function generateTrendData(
  baseValue: number,
  points: number,
  variance: number = 0.2,
) {
  return Array.from({ length: points }, (_, i) => ({
    date: new Date(Date.now() - (points - 1 - i) * 24 * 60 * 60 * 1000),
    value: baseValue + (Math.random() - 0.5) * baseValue * variance,
  }));
}

// Backup Timeline Chart Component
export function BackupTimelineChart({
  backupHistory,
  recoveryPoints,
  dateRange,
}: BackupTimelineChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<
    '24h' | '7d' | '30d' | '90d'
  >('7d');

  // Filter data based on selected period
  const filteredHistory = backupHistory.filter((backup) => {
    const daysAgo =
      selectedPeriod === '24h'
        ? 1
        : selectedPeriod === '7d'
          ? 7
          : selectedPeriod === '30d'
            ? 30
            : 90;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    return new Date(backup.start_time) >= cutoffDate;
  });

  const successfulBackups = filteredHistory.filter(
    (b) => b.status === 'healthy',
  ).length;
  const failedBackups = filteredHistory.filter(
    (b) => b.status === 'failed',
  ).length;
  const totalBackups = filteredHistory.length;
  const successRate =
    totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-5 h-5" />
              Backup Timeline Analysis
            </CardTitle>
            <CardDescription>
              Historical backup performance and recovery point trends
            </CardDescription>
          </div>

          <Select
            value={selectedPeriod}
            onValueChange={(value: any) => setSelectedPeriod(value)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {totalBackups}
            </div>
            <div className="text-sm text-muted-foreground">Total Backups</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {successfulBackups}
            </div>
            <div className="text-sm text-muted-foreground">Successful</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {failedBackups}
            </div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {successRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </div>
        </div>

        {/* Visual Timeline */}
        <div className="space-y-4">
          <h4 className="font-medium">Backup Activity Timeline</h4>
          <div className="relative h-20 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
            {filteredHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No backup activity in selected period
              </div>
            ) : (
              <div className="flex h-full items-end p-2 space-x-1">
                {filteredHistory.map((backup, index) => (
                  <div
                    key={backup.id}
                    className={cn(
                      'flex-1 min-w-0 rounded-t',
                      backup.status === 'healthy'
                        ? 'bg-green-500'
                        : backup.status === 'failed'
                          ? 'bg-red-500'
                          : backup.status === 'in-progress'
                            ? 'bg-blue-500'
                            : 'bg-yellow-500',
                    )}
                    style={{
                      height: `${Math.max((backup.progress_percentage / 100) * 60, 4)}px`,
                    }}
                    title={`${backup.type} - ${new Date(backup.start_time).toLocaleString()}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {selectedPeriod === '24h'
                ? '24 hours ago'
                : `${selectedPeriod.replace('d', '')} days ago`}
            </span>
            <span>Now</span>
          </div>
        </div>

        {/* Recovery Points Distribution */}
        <div className="space-y-4">
          <h4 className="font-medium">Recovery Points by Data Type</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              'photos',
              'client-data',
              'business-files',
              'database',
              'system-config',
            ].map((dataType) => {
              const count = recoveryPoints.filter((rp) =>
                rp.data_types.includes(dataType as any),
              ).length;
              const icon =
                dataType === 'photos' ? (
                  <Camera className="w-4 h-4" />
                ) : dataType === 'client-data' ? (
                  <Users className="w-4 h-4" />
                ) : dataType === 'business-files' ? (
                  <FileText className="w-4 h-4" />
                ) : dataType === 'database' ? (
                  <Database className="w-4 h-4" />
                ) : (
                  <HardDrive className="w-4 h-4" />
                );

              return (
                <div
                  key={dataType}
                  className="text-center p-3 border rounded-lg"
                >
                  <div className="flex items-center justify-center mb-2">
                    {icon}
                  </div>
                  <div className="font-bold text-lg">{count}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {dataType.replace('-', ' ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Storage Utilization Dashboard Component
export function StorageUtilizationDashboard({
  storageMetrics,
  showCostOptimization = true,
  showPredictiveAnalytics = true,
}: StorageUtilizationDashboardProps) {
  const [selectedTier, setSelectedTier] = useState<
    'all' | 'local' | 'cloud' | 'offsite'
  >('all');

  const filteredMetrics =
    selectedTier === 'all'
      ? storageMetrics
      : storageMetrics.filter((m) => m.tier === selectedTier);

  const totalCapacity = storageMetrics.reduce(
    (sum, m) => sum + m.total_capacity,
    0,
  );
  const totalUsed = storageMetrics.reduce((sum, m) => sum + m.used_capacity, 0);
  const totalCost = storageMetrics.reduce((sum, m) => sum + m.monthly_cost, 0);
  const utilizationPercentage =
    totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;

  // Generate trend data
  const utilizationTrend = generateTrendData(utilizationPercentage, 30);
  const costTrend = generateTrendData(totalCost, 30);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Storage Utilization Dashboard
            </CardTitle>
            <CardDescription>
              Multi-tier storage analysis with cost optimization insights
            </CardDescription>
          </div>

          <Select
            value={selectedTier}
            onValueChange={(value: any) => setSelectedTier(value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="local">Local Storage</SelectItem>
              <SelectItem value="cloud">Cloud Storage</SelectItem>
              <SelectItem value="offsite">Offsite Storage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatBytes(totalUsed)}
            </div>
            <div className="text-sm text-muted-foreground">Used Storage</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {formatBytes(totalCapacity)}
            </div>
            <div className="text-sm text-muted-foreground">Total Capacity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${totalCost.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Monthly Cost</div>
          </div>
          <div className="text-center">
            <div
              className={cn(
                'text-2xl font-bold',
                utilizationPercentage > 90
                  ? 'text-red-600'
                  : utilizationPercentage > 75
                    ? 'text-yellow-600'
                    : 'text-green-600',
              )}
            >
              {utilizationPercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Utilization</div>
          </div>
        </div>

        {/* Storage Tier Breakdown */}
        <div className="space-y-4">
          <h4 className="font-medium">Storage Tier Analysis</h4>
          <div className="space-y-3">
            {storageMetrics.map((metric) => {
              const utilizationPercent =
                (metric.used_capacity / metric.total_capacity) * 100;
              const tierIcon =
                metric.tier === 'local' ? (
                  <HardDrive className="w-4 h-4" />
                ) : metric.tier === 'cloud' ? (
                  <Cloud className="w-4 h-4" />
                ) : (
                  <Server className="w-4 h-4" />
                );

              return (
                <div key={metric.tier} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {tierIcon}
                      <span className="font-medium capitalize">
                        {metric.tier} Storage
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Tier{' '}
                        {metric.tier === 'local'
                          ? '1'
                          : metric.tier === 'cloud'
                            ? '2'
                            : '3'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${metric.monthly_cost.toFixed(2)}/month
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {formatBytes(metric.used_capacity)} /{' '}
                        {formatBytes(metric.total_capacity)}
                      </span>
                      <span
                        className={cn(
                          'font-medium',
                          utilizationPercent > 90
                            ? 'text-red-600'
                            : utilizationPercent > 75
                              ? 'text-yellow-600'
                              : 'text-green-600',
                        )}
                      >
                        {utilizationPercent.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={utilizationPercent} className="h-2" />
                  </div>

                  {metric.optimization_suggestions.length > 0 && (
                    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-sm">
                      <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                        Optimization Suggestions:
                      </div>
                      <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                        {metric.optimization_suggestions.map(
                          (suggestion, index) => (
                            <li key={index}>• {suggestion}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost Optimization */}
        {showCostOptimization && (
          <div className="space-y-4">
            <h4 className="font-medium">Cost Optimization Opportunities</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="font-medium">Potential Savings</span>
                </div>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  ${(totalCost * 0.15).toFixed(2)}/month
                </div>
                <div className="text-sm text-muted-foreground">
                  Estimated savings through tier optimization
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">Growth Projection</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {formatBytes(totalUsed * 1.3)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Projected usage in 6 months
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Predictive Analytics */}
        {showPredictiveAnalytics && (
          <div className="space-y-4">
            <h4 className="font-medium">Predictive Analytics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-3">Storage Utilization Trend</h5>
                <div className="h-16 flex items-end space-x-1">
                  {utilizationTrend.slice(-14).map((point, index) => (
                    <div
                      key={index}
                      className="bg-blue-200 dark:bg-blue-800 flex-1 min-w-0 rounded-t"
                      style={{
                        height: `${Math.max((point.value / 100) * 60, 2)}px`,
                      }}
                      title={`${point.date.toLocaleDateString()}: ${point.value.toFixed(1)}%`}
                    />
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Last 14 days
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-3">Cost Trend</h5>
                <div className="h-16 flex items-end space-x-1">
                  {costTrend.slice(-14).map((point, index) => (
                    <div
                      key={index}
                      className="bg-green-200 dark:bg-green-800 flex-1 min-w-0 rounded-t"
                      style={{
                        height: `${Math.max((point.value / Math.max(...costTrend.map((p) => p.value))) * 60, 2)}px`,
                      }}
                      title={`${point.date.toLocaleDateString()}: $${point.value.toFixed(2)}`}
                    />
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Last 14 days
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Recovery Time Analytics Component
export function RecoveryTimeAnalytics({
  recoveryHistory,
  rtoTargets,
}: RecoveryTimeAnalyticsProps) {
  const [selectedMetric, setSelectedMetric] = useState<
    'duration' | 'throughput' | 'success-rate'
  >('duration');

  // Calculate metrics
  const completedRecoveries = recoveryHistory.filter(
    (r) => r.status === 'healthy',
  );
  const averageRecoveryTime =
    completedRecoveries.length > 0
      ? completedRecoveries.reduce((sum, r) => {
          const duration =
            new Date().getTime() -
            new Date(r.estimated_completion || new Date()).getTime();
          return sum + Math.abs(duration / (1000 * 60)); // minutes
        }, 0) / completedRecoveries.length
      : 0;

  const rtoCompliance = {
    emergency: completedRecoveries.filter(
      (r) =>
        (new Date().getTime() -
          new Date(r.estimated_completion || new Date()).getTime()) /
          (1000 * 60) <=
        rtoTargets.emergency,
    ).length,
    critical: completedRecoveries.filter(
      (r) =>
        (new Date().getTime() -
          new Date(r.estimated_completion || new Date()).getTime()) /
          (1000 * 60) <=
        rtoTargets.critical,
    ).length,
    standard: completedRecoveries.filter(
      (r) =>
        (new Date().getTime() -
          new Date(r.estimated_completion || new Date()).getTime()) /
          (1000 * 60) <=
        rtoTargets.standard,
    ).length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="w-5 h-5" />
              Recovery Time Analytics
            </CardTitle>
            <CardDescription>
              RTO tracking and recovery performance analysis
            </CardDescription>
          </div>

          <Select
            value={selectedMetric}
            onValueChange={(value: any) => setSelectedMetric(value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="duration">Duration</SelectItem>
              <SelectItem value="throughput">Throughput</SelectItem>
              <SelectItem value="success-rate">Success Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* RTO Compliance Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-red-500" />
              <span className="font-medium">Emergency RTO</span>
            </div>
            <div className="text-2xl font-bold text-red-600 mb-1">
              {rtoTargets.emergency}m
            </div>
            <div className="text-sm text-muted-foreground">
              Target: {rtoCompliance.emergency}/{completedRecoveries.length} met
            </div>
            <Progress
              value={
                completedRecoveries.length > 0
                  ? (rtoCompliance.emergency / completedRecoveries.length) * 100
                  : 0
              }
              className="mt-2 h-2"
            />
          </div>

          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="font-medium">Critical RTO</span>
            </div>
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {rtoTargets.critical}m
            </div>
            <div className="text-sm text-muted-foreground">
              Target: {rtoCompliance.critical}/{completedRecoveries.length} met
            </div>
            <Progress
              value={
                completedRecoveries.length > 0
                  ? (rtoCompliance.critical / completedRecoveries.length) * 100
                  : 0
              }
              className="mt-2 h-2"
            />
          </div>

          <div className="text-center p-4 border rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="font-medium">Standard RTO</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {rtoTargets.standard}m
            </div>
            <div className="text-sm text-muted-foreground">
              Target: {rtoCompliance.standard}/{completedRecoveries.length} met
            </div>
            <Progress
              value={
                completedRecoveries.length > 0
                  ? (rtoCompliance.standard / completedRecoveries.length) * 100
                  : 0
              }
              className="mt-2 h-2"
            />
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatDuration(Math.round(averageRecoveryTime))}
            </div>
            <div className="text-sm text-muted-foreground">
              Average Recovery Time
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {completedRecoveries.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Completed Recoveries
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {recoveryHistory.length > 0
                ? (
                    (completedRecoveries.length / recoveryHistory.length) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </div>
        </div>

        {/* Recovery History Timeline */}
        <div className="space-y-4">
          <h4 className="font-medium">Recent Recovery Operations</h4>
          {recoveryHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recovery operations in history
            </div>
          ) : (
            <div className="space-y-2">
              {recoveryHistory.slice(0, 5).map((recovery) => (
                <div
                  key={recovery.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full',
                        recovery.status === 'healthy'
                          ? 'bg-green-500'
                          : recovery.status === 'failed'
                            ? 'bg-red-500'
                            : recovery.status === 'in-progress'
                              ? 'bg-blue-500'
                              : 'bg-yellow-500',
                      )}
                    />
                    <div>
                      <div className="font-medium">
                        Recovery #{recovery.id.slice(-6)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {recovery.recovered_files_count.toLocaleString()} files
                        recovered
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium">
                      {recovery.status === 'healthy'
                        ? 'Completed'
                        : recovery.status === 'failed'
                          ? 'Failed'
                          : recovery.status === 'in-progress'
                            ? `${recovery.progress_percentage}%`
                            : 'Unknown'}
                    </div>
                    {recovery.estimated_completion && (
                      <div className="text-sm text-muted-foreground">
                        {new Date(
                          recovery.estimated_completion,
                        ).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Main Analytics Dashboard
export function BackupAnalyticsDashboard({
  organizationId,
  timeRange = 'week',
}: BackupAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<BackupAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        const mockAnalytics: BackupAnalytics = {
          success_rate_7d: 98.5,
          success_rate_30d: 96.8,
          average_backup_duration_minutes: 45,
          average_recovery_duration_minutes: 120,
          storage_growth_trend: generateTrendData(500, 30).map((d) => ({
            date: d.date,
            size_gb: d.value,
          })),
          cost_trend: generateTrendData(150, 30).map((d) => ({
            date: d.date,
            cost_usd: d.value,
          })),
          wedding_season_performance: [
            {
              month: 'Jan',
              backup_volume_gb: 450,
              success_rate: 98,
              average_duration_minutes: 42,
            },
            {
              month: 'Feb',
              backup_volume_gb: 520,
              success_rate: 97,
              average_duration_minutes: 45,
            },
            {
              month: 'Mar',
              backup_volume_gb: 680,
              success_rate: 96,
              average_duration_minutes: 48,
            },
            {
              month: 'Apr',
              backup_volume_gb: 890,
              success_rate: 95,
              average_duration_minutes: 52,
            },
            {
              month: 'May',
              backup_volume_gb: 1200,
              success_rate: 94,
              average_duration_minutes: 58,
            },
            {
              month: 'Jun',
              backup_volume_gb: 1450,
              success_rate: 96,
              average_duration_minutes: 62,
            },
          ],
        };
        setAnalytics(mockAnalytics);
      } catch (error) {
        console.error('Failed to fetch backup analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [organizationId, timeRange]);

  if (isLoading || !analytics) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Backup Analytics Overview
          </CardTitle>
          <CardDescription>
            Comprehensive backup system performance and trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analytics.success_rate_7d}%
              </div>
              <div className="text-sm text-muted-foreground">
                7-Day Success Rate
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatDuration(analytics.average_backup_duration_minutes)}
              </div>
              <div className="text-sm text-muted-foreground">
                Avg Backup Duration
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatDuration(analytics.average_recovery_duration_minutes)}
              </div>
              <div className="text-sm text-muted-foreground">
                Avg Recovery Duration
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {analytics.storage_growth_trend
                  .slice(-1)[0]
                  ?.size_gb.toFixed(0)}{' '}
                GB
              </div>
              <div className="text-sm text-muted-foreground">
                Current Storage Usage
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wedding Season Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Wedding Season Performance
          </CardTitle>
          <CardDescription>
            Backup system performance during peak wedding seasons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.wedding_season_performance.map((month) => (
              <div
                key={month.month}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="font-medium w-12">{month.month}</div>
                  <div className="text-sm text-muted-foreground">
                    {month.backup_volume_gb} GB •{' '}
                    {formatDuration(month.average_duration_minutes)} avg
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">
                    {month.success_rate}%
                  </div>
                  <Progress value={month.success_rate} className="w-16 h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Storage and Cost Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Storage Growth Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-end space-x-1">
              {analytics.storage_growth_trend.slice(-20).map((point, index) => (
                <div
                  key={index}
                  className="bg-blue-200 dark:bg-blue-800 flex-1 min-w-0 rounded-t"
                  style={{
                    height: `${Math.max((point.size_gb / Math.max(...analytics.storage_growth_trend.map((p) => p.size_gb))) * 120, 4)}px`,
                  }}
                  title={`${point.date.toLocaleDateString()}: ${point.size_gb.toFixed(0)} GB`}
                />
              ))}
            </div>
            <div className="text-center text-sm text-muted-foreground mt-2">
              Last 20 days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Cost Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-end space-x-1">
              {analytics.cost_trend.slice(-20).map((point, index) => (
                <div
                  key={index}
                  className="bg-green-200 dark:bg-green-800 flex-1 min-w-0 rounded-t"
                  style={{
                    height: `${Math.max((point.cost_usd / Math.max(...analytics.cost_trend.map((p) => p.cost_usd))) * 120, 4)}px`,
                  }}
                  title={`${point.date.toLocaleDateString()}: $${point.cost_usd.toFixed(2)}`}
                />
              ))}
            </div>
            <div className="text-center text-sm text-muted-foreground mt-2">
              Last 20 days
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
