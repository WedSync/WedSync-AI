'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  WifiOff,
  RefreshCw,
  Play,
  Square,
  Heart,
  Phone,
  Clock,
  Database,
  Server,
  Activity,
  TrendingUp,
  Settings,
  Bell,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import type {
  DRControlPanelProps,
  DRDashboardData,
  DRSite,
  DRSiteStatus,
  BackupConfiguration,
  BackupStatus,
  WeddingDayProtocol,
  FailoverConfirmation,
  DRTestResult,
  EmergencyContact,
} from './types';

// Mock data generator for demonstration
const generateMockDRData = (): DRDashboardData => {
  const now = new Date();
  const isSaturday = now.getDay() === 6;

  return {
    sites: [
      {
        id: 'primary-aws',
        name: 'Primary Production (AWS)',
        status: 'healthy',
        location: 'EU-West-2 (London)',
        provider: 'aws',
        lastHealthCheck: new Date(now.getTime() - 30000),
        rto: 5, // 5 minutes for weddings
        rpo: 1, // 1 minute for weddings
        currentLoad: 67,
        capacity: 85,
        lastSyncTime: new Date(now.getTime() - 5000),
        replicationLag: 2,
        endpoints: {
          primary: 'https://app.wedsync.com',
          backup: 'https://backup1.wedsync.com',
          management: 'https://admin.wedsync.com',
        },
        weddingDayReady: true,
      },
      {
        id: 'secondary-azure',
        name: 'Hot Standby (Azure)',
        status: 'healthy',
        location: 'UK South (Cardiff)',
        provider: 'azure',
        lastHealthCheck: new Date(now.getTime() - 45000),
        rto: 8,
        rpo: 3,
        currentLoad: 15,
        capacity: 95,
        lastSyncTime: new Date(now.getTime() - 12000),
        replicationLag: 8,
        endpoints: {
          primary: 'https://dr1.wedsync.com',
          backup: 'https://dr1-backup.wedsync.com',
          management: 'https://dr1-admin.wedsync.com',
        },
        weddingDayReady: true,
      },
      {
        id: 'cold-gcp',
        name: 'Cold Storage (GCP)',
        status: isSaturday ? 'warning' : 'healthy',
        location: 'Europe-West2 (London)',
        provider: 'gcp',
        lastHealthCheck: new Date(now.getTime() - 300000),
        rto: 30,
        rpo: 15,
        currentLoad: 5,
        capacity: 100,
        lastSyncTime: new Date(now.getTime() - 900000),
        replicationLag: 45,
        endpoints: {
          primary: 'https://cold.wedsync.com',
          backup: '',
          management: 'https://cold-admin.wedsync.com',
        },
        weddingDayReady: false,
      },
    ],
    backups: [
      {
        id: 'daily-full',
        provider: 'aws',
        region: 'eu-west-2',
        schedule: '0 2 * * *', // 2 AM daily
        retention: { daily: 7, weekly: 4, monthly: 12, yearly: 3 },
        encryption: true,
        compression: true,
        incremental: false,
        weddingDataPriority: true,
        lastBackup: new Date(now.getTime() - 7200000), // 2 hours ago
        status: 'completed',
        sizeGB: 245.7,
        integrityCheck: 'excellent',
        estimatedRestoreTime: 15,
      },
      {
        id: 'hourly-incremental',
        provider: 'azure',
        region: 'uksouth',
        schedule: '0 * * * *', // Every hour
        retention: { daily: 24, weekly: 0, monthly: 0, yearly: 0 },
        encryption: true,
        compression: true,
        incremental: true,
        weddingDataPriority: true,
        lastBackup: new Date(now.getTime() - 1800000), // 30 minutes ago
        status: 'completed',
        sizeGB: 15.3,
        integrityCheck: 'excellent',
        estimatedRestoreTime: 5,
      },
    ],
    replicationStatus: [
      {
        sourceLocation: 'AWS EU-West-2',
        targetLocation: 'Azure UK South',
        provider: 'azure',
        lag: 8,
        bytesReplicated: 1024 * 1024 * 1024 * 12, // 12 GB
        status: 'synced',
        lastSync: new Date(now.getTime() - 12000),
        errorCount: 0,
        dataIntegrity: 99.98,
        weddingCriticalData: true,
      },
    ],
    activeTests: [],
    recentIssues: isSaturday
      ? [
          {
            id: 'sat-backup-delay',
            severity: 'medium',
            description:
              'Cold storage sync delayed due to Saturday wedding load',
            component: 'GCP Cold Storage',
            weddingImpact: 'minimal',
            resolution: 'Monitoring - within acceptable limits for Saturday',
            resolvedAt: undefined,
          },
        ]
      : [],
    weddingProtocol: {
      isWeddingDay: isSaturday,
      activeWeddings: isSaturday ? 23 : 3,
      emergencyContacts: [
        {
          id: '1',
          name: 'David Chen',
          role: 'technical_lead',
          phone: '+44 7700 900123',
          email: 'david@wedsync.com',
          availableWeekends: true,
          timezone: 'Europe/London',
          escalationOrder: 1,
        },
        {
          id: '2',
          name: 'Sarah Mitchell',
          role: 'wedding_coordinator',
          phone: '+44 7700 900124',
          email: 'sarah@wedsync.com',
          availableWeekends: true,
          timezone: 'Europe/London',
          escalationOrder: 2,
        },
      ],
      photographerAlert: isSaturday,
      doubleConfirmation: isSaturday,
      restrictedActions: isSaturday
        ? ['cold_storage_failover', 'maintenance_mode']
        : [],
      emergencyEscalation: false,
      maxAllowedDowntime: isSaturday ? 2 : 15,
    },
    lastUpdated: now,
    overallHealth: isSaturday && Math.random() > 0.7 ? 'warning' : 'healthy',
    emergencyMode: false,
  };
};

export const DisasterRecoveryControlPanel: React.FC<DRControlPanelProps> = ({
  organizationId,
  showWeddingProtocols = true,
  enableEmergencyMode = true,
  refreshInterval = 30000, // 30 seconds
  onEmergencyAlert,
  className,
}) => {
  const [data, setData] = useState<DRDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failoverDialog, setFailoverDialog] = useState<{
    isOpen: boolean;
    siteId?: string;
    siteName?: string;
  }>({ isOpen: false });
  const [isFailingOver, setIsFailingOver] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const drData = generateMockDRData();
        setData(drData);
      } catch (error) {
        console.error('Error loading DR data:', error);
      } finally {
        setLoading(false);
        setLastRefresh(new Date());
      }
    };
    loadData();
  }, [organizationId]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      const updatedData = generateMockDRData();
      setData(updatedData);
      setLastRefresh(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const isSaturday = useMemo(() => {
    return new Date().getDay() === 6;
  }, []);

  const getStatusIcon = useCallback(
    (status: DRSiteStatus, size: string = 'w-5 h-5') => {
      switch (status) {
        case 'healthy':
          return <CheckCircle className={cn(size, 'text-green-500')} />;
        case 'warning':
          return <AlertTriangle className={cn(size, 'text-yellow-500')} />;
        case 'critical':
          return <XCircle className={cn(size, 'text-red-500')} />;
        case 'offline':
          return <WifiOff className={cn(size, 'text-gray-500')} />;
      }
    },
    [],
  );

  const getBackupStatusColor = useCallback((status: BackupStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'corrupted':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  }, []);

  const handleEmergencyFailover = async (siteId: string) => {
    if (!data) return;

    const site = data.sites.find((s) => s.id === siteId);
    if (!site) return;

    setFailoverDialog({
      isOpen: true,
      siteId,
      siteName: site.name,
    });
  };

  const confirmFailover = async () => {
    if (!failoverDialog.siteId || !data) return;

    setIsFailingOver(true);
    setFailoverDialog({ isOpen: false });

    try {
      // Simulate failover process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Update site status
      const updatedData = { ...data };
      const siteIndex = updatedData.sites.findIndex(
        (s) => s.id === failoverDialog.siteId,
      );
      if (siteIndex >= 0) {
        updatedData.sites[siteIndex].status = 'healthy';
      }
      setData(updatedData);

      if (onEmergencyAlert) {
        onEmergencyAlert({
          id: 'failover-success',
          severity: 'low',
          description: `Failover to ${failoverDialog.siteName} completed successfully`,
          component: 'Disaster Recovery',
          weddingImpact: 'none',
        });
      }
    } catch (error) {
      console.error('Failover failed:', error);
    } finally {
      setIsFailingOver(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    const updatedData = generateMockDRData();
    setData(updatedData);
    setLastRefresh(new Date());
    setLoading(false);
  };

  if (loading && !data) {
    return (
      <div className={cn('w-full space-y-6', className)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Disaster Recovery
            </h2>
            <p className="text-gray-600">Loading DR status...</p>
          </div>
          <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Disaster Recovery
            {showWeddingProtocols && isSaturday && (
              <Badge variant="destructive" className="ml-2">
                <Heart className="w-3 h-3 mr-1" />
                WEDDING DAY
              </Badge>
            )}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <span>
              Overall Status:
              <span
                className={cn(
                  'ml-1 font-medium',
                  data.overallHealth === 'healthy'
                    ? 'text-green-600'
                    : data.overallHealth === 'warning'
                      ? 'text-yellow-600'
                      : 'text-red-600',
                )}
              >
                {data.overallHealth.toUpperCase()}
              </span>
            </span>
            <span>•</span>
            <span>Last updated: {format(lastRefresh, 'HH:mm:ss')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {enableEmergencyMode && data.emergencyMode && (
            <Button variant="destructive" size="sm">
              <Bell className="w-4 h-4 mr-2" />
              Emergency Mode
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={cn('w-4 h-4 mr-2', loading && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Wedding Day Alert */}
      {showWeddingProtocols && data.weddingProtocol.isWeddingDay && (
        <Alert className="border-l-4 border-l-red-500 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertTitle className="text-red-800">
            Saturday Wedding Day Protocol Active
          </AlertTitle>
          <AlertDescription className="text-red-700">
            <div className="mt-2 space-y-1">
              <p>
                <strong>{data.weddingProtocol.activeWeddings}</strong> active
                weddings today
              </p>
              <p>
                Maximum downtime allowed:{' '}
                <strong>
                  {data.weddingProtocol.maxAllowedDowntime} minutes
                </strong>
              </p>
              <p>All failover actions require double confirmation</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* DR Sites Status */}
      <div className="grid gap-4 md:grid-cols-3">
        {data.sites.map((site) => (
          <Card
            key={site.id}
            className={cn(
              'relative overflow-hidden',
              site.status === 'critical' && 'border-red-200 bg-red-50',
              site.status === 'warning' && 'border-yellow-200 bg-yellow-50',
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(site.status)}
                  <div>
                    <CardTitle className="text-base">{site.name}</CardTitle>
                    <p className="text-sm text-gray-600">{site.location}</p>
                  </div>
                </div>
                {site.weddingDayReady && (
                  <Badge variant="outline" className="text-xs">
                    <Heart className="w-3 h-3 mr-1" />
                    Wedding Ready
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {/* RTO/RPO */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">RTO:</span>
                    <div className="font-medium">{site.rto} min</div>
                  </div>
                  <div>
                    <span className="text-gray-500">RPO:</span>
                    <div className="font-medium">{site.rpo} min</div>
                  </div>
                </div>

                {/* Load and Capacity */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Current Load</span>
                    <span className="font-medium">{site.currentLoad}%</span>
                  </div>
                  <Progress value={site.currentLoad} className="h-2" />
                </div>

                {/* Replication Status */}
                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    Replication lag:{' '}
                    <span className="font-medium">{site.replicationLag}s</span>
                  </div>
                  <div>
                    Last sync: {formatDistanceToNow(site.lastSyncTime)} ago
                  </div>
                </div>

                {/* Action Button */}
                {site.status === 'critical' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleEmergencyFailover(site.id)}
                    disabled={isFailingOver}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Emergency Failover
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="backups" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="replication">Replication</TabsTrigger>
          <TabsTrigger value="contacts">Emergency Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {data.backups.map((backup) => (
              <Card key={backup.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      {backup.id
                        .replace('-', ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase())}{' '}
                      Backup
                    </CardTitle>
                    <Badge className={getBackupStatusColor(backup.status)}>
                      {backup.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Provider:</span>
                      <div className="font-medium capitalize">
                        {backup.provider}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <div className="font-medium">
                        {backup.sizeGB.toFixed(1)} GB
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Schedule:</span>
                      <div className="font-medium">
                        {backup.schedule === '0 2 * * *'
                          ? 'Daily 2AM'
                          : backup.schedule === '0 * * * *'
                            ? 'Hourly'
                            : backup.schedule}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Restore Time:</span>
                      <div className="font-medium">
                        {backup.estimatedRestoreTime} min
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Data Integrity:</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        backup.integrityCheck === 'excellent'
                          ? 'text-green-700 bg-green-50'
                          : backup.integrityCheck === 'good'
                            ? 'text-blue-700 bg-blue-50'
                            : backup.integrityCheck === 'warning'
                              ? 'text-yellow-700 bg-yellow-50'
                              : 'text-red-700 bg-red-50',
                      )}
                    >
                      {backup.integrityCheck}
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-600">
                    Last backup: {formatDistanceToNow(backup.lastBackup)} ago
                  </div>

                  {backup.weddingDataPriority && (
                    <div className="flex items-center gap-2 text-xs text-pink-600">
                      <Heart className="w-3 h-3" />
                      <span>Wedding data prioritized</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="replication" className="space-y-4">
          <div className="space-y-4">
            {data.replicationStatus.map((repl, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-blue-500" />
                      <div>
                        <h3 className="font-medium">
                          {repl.sourceLocation} → {repl.targetLocation}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Provider: {repl.provider}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        repl.status === 'synced'
                          ? 'bg-green-100 text-green-800'
                          : repl.status === 'syncing'
                            ? 'bg-blue-100 text-blue-800'
                            : repl.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800',
                      )}
                    >
                      {repl.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Lag:</span>
                      <div className="font-medium">{repl.lag}s</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Data Integrity:</span>
                      <div className="font-medium">
                        {repl.dataIntegrity.toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Errors:</span>
                      <div
                        className={cn(
                          'font-medium',
                          repl.errorCount > 0
                            ? 'text-red-600'
                            : 'text-green-600',
                        )}
                      >
                        {repl.errorCount}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Sync:</span>
                      <div className="font-medium">
                        {formatDistanceToNow(repl.lastSync)} ago
                      </div>
                    </div>
                  </div>

                  {repl.weddingCriticalData && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-pink-600">
                      <Heart className="w-3 h-3" />
                      <span>Wedding critical data replication</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {data.weddingProtocol.emergencyContacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{contact.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">
                        {contact.role.replace('_', ' ')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      #{contact.escalationOrder}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {contact.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">📧</span>
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {contact.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">{contact.timezone}</span>
                    </div>
                  </div>

                  {contact.availableWeekends && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
                      <Heart className="w-3 h-3" />
                      <span>Available weekends</span>
                    </div>
                  )}

                  <Button size="sm" variant="outline" className="w-full mt-3">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Failover Confirmation Dialog */}
      <AlertDialog
        open={failoverDialog.isOpen}
        onOpenChange={(open) =>
          setFailoverDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Emergency Failover Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to initiate emergency failover to:</p>
                <p className="font-medium text-gray-900">
                  {failoverDialog.siteName}
                </p>

                {data?.weddingProtocol.isWeddingDay && (
                  <Alert className="border-red-200 bg-red-50">
                    <Heart className="w-4 h-4 text-red-600" />
                    <AlertTitle className="text-red-800">
                      Wedding Day Alert
                    </AlertTitle>
                    <AlertDescription className="text-red-700">
                      There are{' '}
                      <strong>{data.weddingProtocol.activeWeddings}</strong>{' '}
                      active weddings today. Maximum downtime:{' '}
                      <strong>
                        {data.weddingProtocol.maxAllowedDowntime} minutes
                      </strong>
                      .
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-sm text-gray-600">
                  <p>• Estimated downtime: 2-5 minutes</p>
                  <p>• All services will be redirected</p>
                  <p>• Emergency contacts will be notified</p>
                  {data?.weddingProtocol.isWeddingDay && (
                    <p className="text-red-600 font-medium">
                      • Wedding coordinators will be alerted immediately
                    </p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmFailover}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Emergency Failover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DisasterRecoveryControlPanel;
