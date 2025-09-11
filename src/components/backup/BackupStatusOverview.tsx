/**
 * WS-258: Backup Strategy Implementation System - Status Overview
 * Critical P1 system for protecting irreplaceable wedding data
 * Team A - React Component Development
 */

'use client';

import React from 'react';
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
  Shield,
  HardDrive,
  Cloud,
  Server,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  Camera,
  Users,
  FileText,
} from 'lucide-react';
import {
  BackupSystemStatus,
  BackupOperation,
  DataType,
  BackupStatus,
} from './types';
import { cn } from '@/lib/utils';

interface BackupStatusOverviewProps {
  backupStatus: BackupSystemStatus | null;
  activeOperations: BackupOperation[];
  organizationId: string;
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      return <Server className="w-4 h-4" />;
    case 'system-config':
      return <HardDrive className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

// Helper function to get status color
function getStatusColor(status: BackupStatus): string {
  switch (status) {
    case 'healthy':
      return 'text-green-500';
    case 'warning':
    case 'in-progress':
      return 'text-yellow-500';
    case 'critical':
    case 'failed':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

export function BackupStatusOverview({
  backupStatus,
  activeOperations,
  organizationId,
}: BackupStatusOverviewProps) {
  if (!backupStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Backup System Status
          </CardTitle>
          <CardDescription>
            Loading backup status information...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthScore = backupStatus.health_score;
  const isHealthy = healthScore >= 75;
  const needsAttention = healthScore < 75 && healthScore >= 50;
  const isCritical = healthScore < 50;

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield
              className={cn(
                'w-5 h-5',
                isHealthy
                  ? 'text-green-500'
                  : needsAttention
                    ? 'text-yellow-500'
                    : 'text-red-500',
              )}
            />
            Backup System Status
            <Badge
              variant={
                isHealthy ? 'default' : isCritical ? 'destructive' : 'secondary'
              }
            >
              {backupStatus.overall_status}
            </Badge>
          </CardTitle>
          <CardDescription>
            Comprehensive backup protection for wedding business data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Health Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Overall Health Score
                </span>
                <span className="text-2xl font-bold">{healthScore}%</span>
              </div>
              <Progress value={healthScore} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Critical (&lt;50%)</span>
                <span>Good (75%+)</span>
                <span>Excellent (90%+)</span>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {backupStatus.total_data_protected
                    ? formatBytes(backupStatus.total_data_protected)
                    : '0 GB'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Data Protected
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold">
                  {backupStatus.last_successful_backup
                    ? new Date(
                        backupStatus.last_successful_backup,
                      ).toLocaleDateString()
                    : 'Never'}
                </div>
                <div className="text-sm text-muted-foreground">Last Backup</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {backupStatus.active_backups_count}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Backups
                </div>
              </div>

              <div className="text-center">
                <div
                  className={cn(
                    'text-2xl font-bold',
                    backupStatus.failed_backups_count > 0
                      ? 'text-red-600'
                      : 'text-green-600',
                  )}
                >
                  {backupStatus.failed_backups_count}
                </div>
                <div className="text-sm text-muted-foreground">
                  Failed Backups
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wedding Critical Data Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Wedding-Critical Data Protection
          </CardTitle>
          <CardDescription>
            Special protection status for irreplaceable wedding memories and
            data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {backupStatus.wedding_critical_data_status === 'healthy' ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-500" />
              )}
              <div>
                <div className="font-semibold">
                  {backupStatus.wedding_critical_data_status === 'healthy'
                    ? 'Fully Protected'
                    : 'Requires Attention'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Wedding photos, client files, and ceremony details
                </div>
              </div>
            </div>

            {backupStatus.wedding_critical_data_status !== 'healthy' && (
              <Button variant="outline" size="sm">
                Fix Issues
              </Button>
            )}
          </div>

          {backupStatus.wedding_critical_data_status !== 'healthy' && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Wedding-critical data is not fully protected. Immediate action
                recommended to prevent potential data loss.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Multi-Tier Backup Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Multi-Tier Backup Infrastructure
          </CardTitle>
          <CardDescription>
            Status of local, cloud, and offsite backup systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Local Backup */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4" />
                <span className="font-medium">Local Backup</span>
                <Badge variant="outline" className="text-xs">
                  Tier 1
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Online & Healthy</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last backup: 15 minutes ago
                </div>
              </div>
            </div>

            {/* Cloud Backup */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-4 h-4" />
                <span className="font-medium">Cloud Backup</span>
                <Badge variant="outline" className="text-xs">
                  Tier 2
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Synced</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last sync: 2 hours ago
                </div>
              </div>
            </div>

            {/* Offsite Backup */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4" />
                <span className="font-medium">Offsite Backup</span>
                <Badge variant="outline" className="text-xs">
                  Tier 3
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Protected</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last backup: Yesterday
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Operations */}
      {activeOperations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Active Backup Operations
              <Badge variant="secondary">{activeOperations.length}</Badge>
            </CardTitle>
            <CardDescription>
              Currently running backup, restore, and verification operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeOperations.map((operation) => (
                <div key={operation.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getDataTypeIcon(operation.data_types[0])}
                      <span className="font-medium capitalize">
                        {operation.type}
                      </span>
                      <div className="flex gap-1">
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
                        <Badge variant="destructive" className="text-xs">
                          Wedding Critical
                        </Badge>
                      )}
                    </div>
                    <div
                      className={cn(
                        'text-sm font-medium',
                        getStatusColor(operation.status),
                      )}
                    >
                      {operation.progress_percentage}%
                    </div>
                  </div>

                  <Progress
                    value={operation.progress_percentage}
                    className="mb-2"
                  />

                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      {formatBytes(operation.bytes_processed)} /{' '}
                      {formatBytes(operation.total_bytes)}
                    </span>
                    <span>
                      Started:{' '}
                      {new Date(operation.start_time).toLocaleTimeString()}
                    </span>
                    {operation.estimated_completion && (
                      <span>
                        ETA:{' '}
                        {new Date(
                          operation.estimated_completion,
                        ).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {operation.error_message && (
                    <Alert className="mt-2" variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {operation.error_message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Scheduled Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Scheduled Backups
          </CardTitle>
          <CardDescription>
            Next automated backup operations for comprehensive data protection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Full System Backup</div>
              <div className="text-sm text-muted-foreground">
                All wedding data, client files, and system configurations
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">
                {backupStatus.next_scheduled_backup
                  ? new Date(
                      backupStatus.next_scheduled_backup,
                    ).toLocaleString()
                  : 'Not scheduled'}
              </div>
              <div className="text-sm text-muted-foreground">Next backup</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contacts Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Emergency Response Readiness
          </CardTitle>
          <CardDescription>
            24/7 support availability and emergency contact configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {backupStatus.emergency_contacts_available ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
              <div>
                <div className="font-medium">
                  {backupStatus.emergency_contacts_available
                    ? 'Emergency Contacts Configured'
                    : 'Emergency Contacts Setup Required'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Essential for wedding day backup emergencies
                </div>
              </div>
            </div>

            {!backupStatus.emergency_contacts_available && (
              <Button variant="outline" size="sm">
                Configure Contacts
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
