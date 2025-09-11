'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  HardDrive,
  RefreshCw,
  Shield,
  Zap,
  Heart,
  Users,
  Camera,
  Calendar,
  FileText,
  Phone,
  CloudDownload,
  Server,
  Wifi,
  WifiOff,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

// Types for backup dashboard
interface SystemHealth {
  overall_status: 'healthy' | 'warning' | 'critical' | 'offline';
  database_status: 'connected' | 'slow' | 'timeout' | 'offline';
  storage_status: 'operational' | 'degraded' | 'failure' | 'maintenance';
  backup_service_status: 'running' | 'paused' | 'error' | 'maintenance';
  last_health_check: string;
  uptime_percentage: number;
  response_time_avg: number;
  active_connections: number;
}

interface BackupSnapshot {
  id: string;
  created_at: string;
  backup_type: 'full' | 'incremental' | 'wedding_critical' | 'emergency';
  status: 'completed' | 'failed' | 'in_progress' | 'scheduled';
  size_bytes: number;
  duration_seconds: number;
  tables_backed_up: string[];
  wedding_data_included: {
    weddings_count: number;
    guests_count: number;
    vendors_count: number;
    photos_count: number;
  };
  encryption_status: 'encrypted' | 'unencrypted';
  compression_ratio: number;
  error_message?: string;
  next_scheduled?: string;
  retention_expires: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface WeddingCriticalData {
  wedding_id: string;
  couple_name: string;
  wedding_date: string;
  hours_until_wedding: number;
  last_backup: string;
  backup_freshness: 'fresh' | 'stale' | 'critical' | 'missing';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  affected_systems: string[];
  guest_count: number;
  vendor_count: number;
  timeline_complexity: number;
}

interface BackupDashboardProps {
  systemHealth: SystemHealth;
  recentBackups: BackupSnapshot[];
  onEmergencyRestore: (backupId: string) => Promise<void>;
  onRefreshData: () => Promise<void>;
  weddingCriticalData: WeddingCriticalData[];
}

const BackupDashboard: React.FC<BackupDashboardProps> = ({
  systemHealth,
  recentBackups,
  onEmergencyRestore,
  onRefreshData,
  weddingCriticalData,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [alertsVisible, setAlertsVisible] = useState(true);
  const supabase = createClient();

  // Real-time backup monitoring
  useEffect(() => {
    const channel = supabase
      .channel('backup-monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'backup_operations',
        },
        (payload) => {
          console.log('Real-time backup update:', payload);
          setRealTimeData(payload);
          onRefreshData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, onRefreshData]);

  const getSystemHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'offline':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getBackupStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600 text-white';
      case 'in_progress':
        return 'bg-blue-600 text-white';
      case 'failed':
        return 'bg-red-600 text-white';
      case 'scheduled':
        return 'bg-gray-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getCriticalWeddings = () => {
    return weddingCriticalData
      .filter((w) => w.hours_until_wedding <= 48 && w.risk_level !== 'low')
      .sort((a, b) => a.hours_until_wedding - b.hours_until_wedding);
  };

  const getSystemHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5" />;
      case 'offline':
        return <WifiOff className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const handleEmergencyRestore = async (backupId: string) => {
    setLoading(true);
    try {
      await onEmergencyRestore(backupId);
    } finally {
      setLoading(false);
    }
  };

  const criticalWeddings = getCriticalWeddings();

  return (
    <div className="space-y-6 p-6">
      {/* Emergency Alerts */}
      {alertsVisible &&
        (systemHealth.overall_status === 'critical' ||
          criticalWeddings.length > 0) && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">
              Critical System Alerts
            </AlertTitle>
            <AlertDescription className="text-red-700">
              {systemHealth.overall_status === 'critical' && (
                <div className="mb-2">
                  System health is critical - backup operations may be affected
                </div>
              )}
              {criticalWeddings.length > 0 && (
                <div>
                  {criticalWeddings.length} wedding
                  {criticalWeddings.length > 1 ? 's' : ''} within 48 hours
                  require attention
                </div>
              )}
            </AlertDescription>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setAlertsVisible(false)}
            >
              Acknowledge
            </Button>
          </Alert>
        )}

      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Backup & Recovery Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time monitoring and emergency recovery for wedding data
            protection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onRefreshData} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Badge className={getSystemHealthColor(systemHealth.overall_status)}>
            {getSystemHealthIcon(systemHealth.overall_status)}
            <span className="ml-2 font-medium">
              {systemHealth.overall_status.toUpperCase()}
            </span>
          </Badge>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge
                className={getSystemHealthColor(systemHealth.database_status)}
              >
                {systemHealth.database_status}
              </Badge>
              <div className="text-xs text-gray-500">
                {systemHealth.active_connections} active
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Avg response: {systemHealth.response_time_avg}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-green-600" />
              Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge
                className={getSystemHealthColor(systemHealth.storage_status)}
              >
                {systemHealth.storage_status}
              </Badge>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="mt-2">
              <Progress
                value={systemHealth.uptime_percentage}
                className="h-2"
              />
              <div className="text-xs text-gray-500 mt-1">
                {systemHealth.uptime_percentage}% uptime
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CloudDownload className="h-4 w-4 text-purple-600" />
              Backup Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge
                className={getSystemHealthColor(
                  systemHealth.backup_service_status,
                )}
              >
                {systemHealth.backup_service_status}
              </Badge>
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Last check:{' '}
              {formatDistanceToNow(new Date(systemHealth.last_health_check), {
                addSuffix: true,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-600" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge className="bg-green-100 text-green-800 border-green-200">
                encrypted
              </Badge>
              <Shield className="h-4 w-4 text-green-500" />
            </div>
            <div className="mt-2 text-xs text-gray-500">
              AES-256 encryption active
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Wedding Data Protection */}
      {criticalWeddings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Heart className="h-5 w-5" />
              Critical Wedding Data Protection
            </CardTitle>
            <CardDescription className="text-amber-700">
              Weddings within 48 hours requiring special backup attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalWeddings.slice(0, 5).map((wedding) => (
                <div
                  key={wedding.wedding_id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">💒</div>
                    <div>
                      <h4 className="font-semibold">{wedding.couple_name}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(wedding.wedding_date), 'PPP')}
                        </span>
                        <Clock className="h-3 w-3 ml-2" />
                        <span className="font-medium text-amber-600">
                          {wedding.hours_until_wedding}h remaining
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <Users className="h-3 w-3" />
                        <span>{wedding.guest_count} guests</span>
                        <span className="mx-1">•</span>
                        <span>{wedding.vendor_count} vendors</span>
                        <span className="mx-1">•</span>
                        <span>
                          Last backup:{' '}
                          {formatDistanceToNow(new Date(wedding.last_backup), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRiskLevelColor(wedding.risk_level)}>
                      {wedding.risk_level.toUpperCase()}
                    </Badge>
                    <Button size="sm" variant="outline">
                      <Shield className="h-3 w-3 mr-1" />
                      Protect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Backup Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Backup Operations
            </CardTitle>
            <CardDescription>
              Latest backup operations with detailed metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {recentBackups.map((backup) => (
                  <div
                    key={backup.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors
                      ${selectedBackup === backup.id ? 'border-blue-300 bg-blue-50' : 'hover:bg-gray-50'}
                    `}
                    onClick={() =>
                      setSelectedBackup(
                        selectedBackup === backup.id ? null : backup.id,
                      )
                    }
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getBackupStatusColor(backup.status)}>
                          {backup.status}
                        </Badge>
                        <Badge variant="outline">{backup.backup_type}</Badge>
                        {backup.encryption_status === 'encrypted' && (
                          <Shield className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(backup.created_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Size:</span>
                        <span className="ml-2 font-medium">
                          {formatBytes(backup.size_bytes)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <span className="ml-2 font-medium">
                          {formatDuration(backup.duration_seconds)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Weddings:</span>
                        <span className="ml-2 font-medium">
                          {backup.wedding_data_included.weddings_count}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Compression:</span>
                        <span className="ml-2 font-medium">
                          {(backup.compression_ratio * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {backup.error_message && (
                      <Alert className="mt-2 bg-red-50 border-red-200">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-700 text-sm">
                          {backup.error_message}
                        </AlertDescription>
                      </Alert>
                    )}

                    {selectedBackup === backup.id && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-sm">
                            Wedding Data Included:
                          </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3 text-pink-500" />
                            <span>
                              {backup.wedding_data_included.weddings_count}{' '}
                              Weddings
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-blue-500" />
                            <span>
                              {backup.wedding_data_included.guests_count} Guests
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-green-500" />
                            <span>
                              {backup.wedding_data_included.vendors_count}{' '}
                              Vendors
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Camera className="h-3 w-3 text-purple-500" />
                            <span>
                              {backup.wedding_data_included.photos_count} Photos
                            </span>
                          </div>
                        </div>

                        {backup.status === 'completed' && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEmergencyRestore(backup.id)}
                              disabled={loading}
                            >
                              <RefreshCw
                                className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`}
                              />
                              Emergency Restore
                            </Button>
                            <Button size="sm" variant="ghost">
                              <CloudDownload className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick Recovery Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Zap className="h-5 w-5" />
              Emergency Recovery Actions
            </CardTitle>
            <CardDescription>
              One-click recovery for common disaster scenarios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="destructive"
                  className="h-16 text-left justify-start p-4"
                  disabled={loading}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🚨</div>
                    <div>
                      <div className="font-semibold">Wedding Day Emergency</div>
                      <div className="text-xs opacity-80">
                        Full system recovery for active weddings
                      </div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 text-left justify-start p-4 border-amber-300"
                  disabled={loading}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📋</div>
                    <div>
                      <div className="font-semibold">Guest List Recovery</div>
                      <div className="text-xs text-gray-600">
                        Restore guest lists and RSVP data
                      </div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 text-left justify-start p-4 border-blue-300"
                  disabled={loading}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">⏰</div>
                    <div>
                      <div className="font-semibold">Timeline Recovery</div>
                      <div className="text-xs text-gray-600">
                        Restore wedding timelines and schedules
                      </div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 text-left justify-start p-4 border-green-300"
                  disabled={loading}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📞</div>
                    <div>
                      <div className="font-semibold">Vendor Contacts</div>
                      <div className="text-xs text-gray-600">
                        Restore vendor information and contracts
                      </div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 text-left justify-start p-4 border-purple-300"
                  disabled={loading}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📸</div>
                    <div>
                      <div className="font-semibold">
                        Photo Gallery Recovery
                      </div>
                      <div className="text-xs text-gray-600">
                        Restore photo collections and albums
                      </div>
                    </div>
                  </div>
                </Button>
              </div>

              <Separator />

              <Alert>
                <Phone className="h-4 w-4" />
                <AlertTitle>Emergency Support</AlertTitle>
                <AlertDescription>
                  For critical wedding day issues, call our 24/7 emergency
                  hotline:
                  <div className="font-bold text-lg mt-1">0800-WEDDING-911</div>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Activity Feed */}
      {realTimeData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Real-time Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-800">
                System Update: {realTimeData.eventType}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {format(new Date(), 'PPp')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BackupDashboard;
