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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  HardDrive,
  Heart,
  Shield,
  TrendingUp,
  TrendingDown,
  Zap,
  RefreshCw,
  Users,
  Calendar,
  Camera,
  FileText,
  CloudDownload,
  Timer,
  BarChart3,
  PieChart,
  LineChart,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

// Widget Data Types
interface BackupStatus {
  overall_health: 'healthy' | 'warning' | 'critical';
  database: 'connected' | 'slow' | 'offline';
  storage: 'operational' | 'degraded' | 'full';
  last_backup: string;
  next_scheduled: string;
  active_operations: number;
  success_rate_24h: number;
}

interface CriticalDataProtection {
  weddings_at_risk: number;
  data_freshness_score: number;
  encryption_coverage: number;
  compliance_status: 'compliant' | 'warning' | 'violation';
  backup_coverage: {
    weddings: number;
    guests: number;
    vendors: number;
    photos: number;
  };
}

interface RecoveryMetrics {
  partial_recovery_eta: string;
  complete_recovery_eta: string;
  wedding_day_recovery_eta: string;
  average_restore_time: string;
  success_rate: number;
  last_test_date: string;
}

interface SystemAlerts {
  critical_count: number;
  warning_count: number;
  info_count: number;
  recent_alerts: Array<{
    id: string;
    type: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
}

// Real-time backup status widget
export const BackupStatusWidget: React.FC<{
  priority?: 'critical' | 'high' | 'normal';
  compact?: boolean;
}> = ({ priority = 'normal', compact = false }) => {
  const [backupStatus, setBackupStatus] = useState<BackupStatus>({
    overall_health: 'healthy',
    database: 'connected',
    storage: 'operational',
    last_backup: new Date().toISOString(),
    next_scheduled: new Date(Date.now() + 3600000).toISOString(),
    active_operations: 0,
    success_rate_24h: 98.5,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Real-time subscription for backup status
  useEffect(() => {
    const fetchBackupStatus = async () => {
      try {
        // Mock data - replace with actual API call
        setBackupStatus({
          overall_health: 'healthy',
          database: 'connected',
          storage: 'operational',
          last_backup: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
          next_scheduled: new Date(Date.now() + 3600000).toISOString(), // 1 hour
          active_operations: 1,
          success_rate_24h: 98.5,
        });
      } catch (error) {
        console.error('Failed to fetch backup status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBackupStatus();

    // Real-time updates
    const channel = supabase
      .channel('backup-status-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'backup_operations',
        },
        () => {
          fetchBackupStatus();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className={compact ? 'h-32' : ''}>
        <CardContent className="flex items-center justify-center h-full">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`${priority === 'critical' ? 'border-red-300 bg-red-50' : ''} ${compact ? 'h-32' : ''}`}
    >
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CloudDownload className="h-4 w-4 text-blue-600" />
          Backup Status
          {backupStatus.active_operations > 0 && (
            <Badge className="ml-auto bg-blue-100 text-blue-800">
              {backupStatus.active_operations} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge className={getHealthColor(backupStatus.overall_health)}>
              {getHealthIcon(backupStatus.overall_health)}
              <span className="ml-1 font-medium">
                {backupStatus.overall_health.toUpperCase()}
              </span>
            </Badge>
            {!compact && (
              <div className="text-xs text-gray-500">
                {backupStatus.success_rate_24h}% success rate
              </div>
            )}
          </div>

          {!compact && (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Database:</span>
                  <span
                    className={`ml-1 font-medium ${
                      backupStatus.database === 'connected'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {backupStatus.database}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Storage:</span>
                  <span
                    className={`ml-1 font-medium ${
                      backupStatus.storage === 'operational'
                        ? 'text-green-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {backupStatus.storage}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <div>
                  Last backup:{' '}
                  {formatDistanceToNow(new Date(backupStatus.last_backup), {
                    addSuffix: true,
                  })}
                </div>
                <div>
                  Next scheduled:{' '}
                  {formatDistanceToNow(new Date(backupStatus.next_scheduled), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Wedding-critical data protection widget
export const CriticalDataProtectionWidget: React.FC<{
  compact?: boolean;
}> = ({ compact = false }) => {
  const [protectionData, setProtectionData] = useState<CriticalDataProtection>({
    weddings_at_risk: 2,
    data_freshness_score: 95,
    encryption_coverage: 100,
    compliance_status: 'compliant',
    backup_coverage: {
      weddings: 150,
      guests: 8500,
      vendors: 75,
      photos: 15000,
    },
  });

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'violation':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card
      className={`${protectionData.weddings_at_risk > 0 ? 'border-amber-300 bg-amber-50' : ''} ${compact ? 'h-32' : ''}`}
    >
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-600" />
          Critical Data Protection
          {protectionData.weddings_at_risk > 0 && (
            <Badge className="ml-auto bg-amber-100 text-amber-800">
              {protectionData.weddings_at_risk} at risk
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <span className="text-gray-500">Data Freshness:</span>
              <span className="ml-2 font-medium">
                {protectionData.data_freshness_score}%
              </span>
            </div>
            <Progress
              value={protectionData.data_freshness_score}
              className="w-16 h-2"
            />
          </div>

          {!compact && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-gray-500">Encryption:</span>
                  <span className="ml-2 font-medium">
                    {protectionData.encryption_coverage}%
                  </span>
                </div>
                <Shield className="h-4 w-4 text-green-500" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3 text-pink-500" />
                  <span>{protectionData.backup_coverage.weddings}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-blue-500" />
                  <span>
                    {protectionData.backup_coverage.guests.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3 text-green-500" />
                  <span>{protectionData.backup_coverage.vendors}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Camera className="h-3 w-3 text-purple-500" />
                  <span>
                    {protectionData.backup_coverage.photos.toLocaleString()}
                  </span>
                </div>
              </div>

              <Badge
                className={getComplianceColor(protectionData.compliance_status)}
              >
                {protectionData.compliance_status.toUpperCase()}
              </Badge>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Recovery time estimator widget
export const RecoveryEstimatorWidget: React.FC<{
  compact?: boolean;
}> = ({ compact = false }) => {
  const [recoveryMetrics, setRecoveryMetrics] = useState<RecoveryMetrics>({
    partial_recovery_eta: '15 minutes',
    complete_recovery_eta: '2 hours',
    wedding_day_recovery_eta: '30 minutes',
    average_restore_time: '45 minutes',
    success_rate: 99.2,
    last_test_date: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
  });

  return (
    <Card className={compact ? 'h-32' : ''}>
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Timer className="h-4 w-4 text-purple-600" />
          Recovery Time Estimates
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <div className="space-y-3">
          {compact ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Partial:</span>
                <div className="font-medium">
                  {recoveryMetrics.partial_recovery_eta}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Full:</span>
                <div className="font-medium">
                  {recoveryMetrics.complete_recovery_eta}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Partial Recovery:</span>
                  <span className="font-medium">
                    {recoveryMetrics.partial_recovery_eta}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Complete Recovery:</span>
                  <span className="font-medium">
                    {recoveryMetrics.complete_recovery_eta}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-red-600">
                    Wedding Day Emergency:
                  </span>
                  <span className="font-medium text-red-600">
                    {recoveryMetrics.wedding_day_recovery_eta}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Success Rate:</span>
                  <span>{recoveryMetrics.success_rate}%</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Last Test:</span>
                  <span>
                    {formatDistanceToNow(
                      new Date(recoveryMetrics.last_test_date),
                      { addSuffix: true },
                    )}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// System alerts widget
export const SystemAlertsWidget: React.FC<{
  compact?: boolean;
}> = ({ compact = false }) => {
  const [alerts, setAlerts] = useState<SystemAlerts>({
    critical_count: 0,
    warning_count: 2,
    info_count: 5,
    recent_alerts: [
      {
        id: '1',
        type: 'warning',
        message: 'Backup storage 85% full',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        acknowledged: false,
      },
      {
        id: '2',
        type: 'info',
        message: 'Weekly backup completed successfully',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        acknowledged: true,
      },
    ],
  });

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-amber-600 bg-amber-100';
      case 'info':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="h-3 w-3" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3" />;
      case 'info':
        return <Activity className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  return (
    <Card className={compact ? 'h-32' : ''}>
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          System Alerts
          {alerts.critical_count + alerts.warning_count > 0 && (
            <Badge className="ml-auto bg-amber-100 text-amber-800">
              {alerts.critical_count + alerts.warning_count}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <div className="space-y-2">
          {compact ? (
            <div className="grid grid-cols-3 gap-1 text-xs text-center">
              <div>
                <div className="text-red-600 font-bold">
                  {alerts.critical_count}
                </div>
                <div className="text-gray-500">Critical</div>
              </div>
              <div>
                <div className="text-amber-600 font-bold">
                  {alerts.warning_count}
                </div>
                <div className="text-gray-500">Warning</div>
              </div>
              <div>
                <div className="text-blue-600 font-bold">
                  {alerts.info_count}
                </div>
                <div className="text-gray-500">Info</div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div className="p-2 rounded bg-red-50">
                  <div className="text-red-600 font-bold text-lg">
                    {alerts.critical_count}
                  </div>
                  <div className="text-gray-600">Critical</div>
                </div>
                <div className="p-2 rounded bg-amber-50">
                  <div className="text-amber-600 font-bold text-lg">
                    {alerts.warning_count}
                  </div>
                  <div className="text-gray-600">Warning</div>
                </div>
                <div className="p-2 rounded bg-blue-50">
                  <div className="text-blue-600 font-bold text-lg">
                    {alerts.info_count}
                  </div>
                  <div className="text-gray-600">Info</div>
                </div>
              </div>

              <div className="space-y-1">
                {alerts.recent_alerts.slice(0, 2).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-2 p-2 rounded bg-gray-50"
                  >
                    <Badge
                      className={getAlertColor(alert.type)}
                      variant="secondary"
                    >
                      {getAlertIcon(alert.type)}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {alert.message}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(alert.timestamp), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Backup performance widget
export const BackupPerformanceWidget: React.FC<{
  compact?: boolean;
}> = ({ compact = false }) => {
  const [performance, setPerformance] = useState({
    throughput_mbps: 125.6,
    avg_backup_time: '3.2 hours',
    compression_ratio: 0.65,
    deduplication_savings: 0.23,
    trend: 'up' as 'up' | 'down' | 'stable',
  });

  return (
    <Card className={compact ? 'h-32' : ''}>
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-green-600" />
          Backup Performance
          {performance.trend === 'up' ? (
            <TrendingUp className="h-4 w-4 text-green-500 ml-auto" />
          ) : performance.trend === 'down' ? (
            <TrendingDown className="h-4 w-4 text-red-500 ml-auto" />
          ) : (
            <Activity className="h-4 w-4 text-blue-500 ml-auto" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <div className="space-y-2">
          {compact ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Speed:</span>
                <div className="font-medium">
                  {performance.throughput_mbps} MB/s
                </div>
              </div>
              <div>
                <span className="text-gray-500">Time:</span>
                <div className="font-medium">{performance.avg_backup_time}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Throughput:</span>
                  <div className="font-medium">
                    {performance.throughput_mbps} MB/s
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Avg Time:</span>
                  <div className="font-medium">
                    {performance.avg_backup_time}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Compression:</span>
                  <div className="font-medium">
                    {Math.round(performance.compression_ratio * 100)}%
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Deduplication:</span>
                  <div className="font-medium">
                    {Math.round(performance.deduplication_savings * 100)}% saved
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Wedding season monitoring widget
export const WeddingSeasonWidget: React.FC<{
  compact?: boolean;
}> = ({ compact = false }) => {
  const [seasonData, setSeasonData] = useState({
    is_peak_season: true,
    weddings_this_weekend: 12,
    backup_load_increase: 0.35,
    risk_level: 'high' as 'low' | 'medium' | 'high' | 'critical',
    next_major_date: '2024-06-15',
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card
      className={`${seasonData.is_peak_season ? 'border-pink-300 bg-pink-50' : ''} ${compact ? 'h-32' : ''}`}
    >
      <CardHeader className={compact ? 'pb-2' : ''}>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Heart className="h-4 w-4 text-pink-600" />
          Wedding Season Monitor
          {seasonData.is_peak_season && (
            <Badge className="ml-auto bg-pink-100 text-pink-800">
              Peak Season
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'pt-0' : ''}>
        <div className="space-y-2">
          {compact ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">This Weekend:</span>
                <div className="font-medium">
                  {seasonData.weddings_this_weekend} weddings
                </div>
              </div>
              <div>
                <span className="text-gray-500">Load:</span>
                <div className="font-medium">
                  +{Math.round(seasonData.backup_load_increase * 100)}%
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Weddings This Weekend:</span>
                <span className="font-medium">
                  {seasonData.weddings_this_weekend}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Backup Load Increase:</span>
                <span className="font-medium">
                  +{Math.round(seasonData.backup_load_increase * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Risk Level:</span>
                <Badge className={getRiskColor(seasonData.risk_level)}>
                  {seasonData.risk_level.toUpperCase()}
                </Badge>
              </div>

              <div className="text-xs text-gray-500">
                Next major date:{' '}
                {format(new Date(seasonData.next_major_date), 'MMM dd')}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Container component for organizing widgets
export const BackupMonitoringDashboard: React.FC<{
  layout?: 'grid' | 'list';
  compact?: boolean;
}> = ({ layout = 'grid', compact = false }) => {
  const containerClass =
    layout === 'grid'
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
      : 'space-y-4';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Backup Monitoring</h2>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      <div className={containerClass}>
        <BackupStatusWidget priority="critical" compact={compact} />
        <CriticalDataProtectionWidget compact={compact} />
        <RecoveryEstimatorWidget compact={compact} />
        <SystemAlertsWidget compact={compact} />
        <BackupPerformanceWidget compact={compact} />
        <WeddingSeasonWidget compact={compact} />
      </div>
    </div>
  );
};

export default BackupMonitoringDashboard;
