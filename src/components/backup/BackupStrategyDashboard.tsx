/**
 * WS-258: Backup Strategy Implementation System - Main Dashboard
 * Critical P1 system for protecting irreplaceable wedding data
 * Team A - React Component Development
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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Shield,
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Camera,
  Users,
  FileText,
  Zap,
  CheckCircle,
  XCircle,
  RefreshCw,
  Phone,
  AlertCircle,
  HardDrive,
  Cloud,
  Server,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  BackupStrategyDashboardProps,
  BackupSystemStatus,
  BackupOperation,
  EmergencyResponse,
  BackupStatus,
  BackupHealthColor,
  BackupWebSocketMessage,
} from './types';
import { BackupStatusOverview } from './BackupStatusOverview';
import { RealTimeBackupMonitor } from './RealTimeBackupMonitor';
import { WeddingDataProtectionPanel } from './WeddingDataProtectionPanel';
import { EmergencyBackupControls } from './EmergencyBackupControls';
import { cn } from '@/lib/utils';

// Hook for real-time backup data
function useBackupSystemData(organizationId: string) {
  const [backupStatus, setBackupStatus] = useState<BackupSystemStatus | null>(
    null,
  );
  const [activeOperations, setActiveOperations] = useState<BackupOperation[]>(
    [],
  );
  const [emergencyStatus, setEmergencyStatus] =
    useState<EmergencyResponse | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection for real-time updates
    const wsUrl = `/api/backup/websocket?organizationId=${organizationId}`;
    const ws = new WebSocket(wsUrl.replace(/^http/, 'ws'));

    ws.onopen = () => {
      console.log('Backup monitoring WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: BackupWebSocketMessage = JSON.parse(event.data);
        setLastUpdate(new Date(message.timestamp));

        switch (message.type) {
          case 'status-update':
            setBackupStatus(message.payload as BackupSystemStatus);
            break;
          case 'progress-update':
            setActiveOperations((prev) => {
              const operation = message.payload as BackupOperation;
              const index = prev.findIndex((op) => op.id === operation.id);
              if (index >= 0) {
                const updated = [...prev];
                updated[index] = operation;
                return updated;
              } else {
                return [...prev, operation];
              }
            });
            break;
          case 'emergency-alert':
            setEmergencyStatus(message.payload as EmergencyResponse);
            // Show emergency notification
            if (
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification('Wedding Data Emergency', {
                body: 'Critical backup system alert detected',
                icon: '/icons/emergency.png',
                tag: 'backup-emergency',
              });
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing backup WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Backup monitoring WebSocket disconnected');
      setIsConnected(false);
      // Attempt reconnection after 5 seconds
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('Backup WebSocket error:', error);
      setIsConnected(false);
    };

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      ws.close();
    };
  }, [organizationId]);

  return {
    backupStatus,
    activeOperations,
    emergencyStatus,
    isConnected,
    lastUpdate,
  };
}

// Helper function to determine status color
function getStatusColor(status: BackupStatus): BackupHealthColor {
  switch (status) {
    case 'healthy':
      return 'green';
    case 'warning':
    case 'in-progress':
      return 'yellow';
    case 'critical':
    case 'failed':
      return 'red';
    default:
      return 'yellow';
  }
}

// Helper function to format health score
function formatHealthScore(score: number): {
  score: number;
  label: string;
  color: BackupHealthColor;
} {
  if (score >= 90) {
    return { score, label: 'Excellent', color: 'green' };
  } else if (score >= 75) {
    return { score, label: 'Good', color: 'green' };
  } else if (score >= 60) {
    return { score, label: 'Fair', color: 'yellow' };
  } else {
    return { score, label: 'Critical', color: 'red' };
  }
}

export function BackupStrategyDashboard({
  organizationId,
  showEmergencyMode = false,
  compactView = false,
}: BackupStrategyDashboardProps) {
  const {
    backupStatus,
    activeOperations,
    emergencyStatus,
    isConnected,
    lastUpdate,
  } = useBackupSystemData(organizationId);

  const [selectedTab, setSelectedTab] = useState('overview');
  const [emergencyMode, setEmergencyMode] = useState(showEmergencyMode);

  // Determine if we're in emergency mode
  useEffect(() => {
    if (emergencyStatus && emergencyStatus.status !== 'normal') {
      setEmergencyMode(true);
      setSelectedTab('emergency');
    }
  }, [emergencyStatus]);

  // Format backup status for display
  const statusDisplay = backupStatus
    ? formatHealthScore(backupStatus.health_score)
    : null;
  const overallStatusColor = backupStatus
    ? getStatusColor(backupStatus.overall_status)
    : 'yellow';

  // Calculate active operations summary
  const operationsSummary = {
    total: activeOperations.length,
    backups: activeOperations.filter((op) => op.type === 'backup').length,
    restores: activeOperations.filter((op) => op.type === 'restore').length,
    verifications: activeOperations.filter((op) => op.type === 'verify').length,
    weddingCritical: activeOperations.filter((op) => op.wedding_critical)
      .length,
  };

  const handleEmergencyRecovery = useCallback(async () => {
    try {
      const response = await fetch('/api/backup/emergency/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          recoveryType: 'emergency-full',
        }),
      });

      if (response.ok) {
        setEmergencyMode(true);
        setSelectedTab('emergency');
      }
    } catch (error) {
      console.error('Failed to initiate emergency recovery:', error);
    }
  }, [organizationId]);

  if (compactView) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield
                className={cn(
                  'w-5 h-5',
                  overallStatusColor === 'green'
                    ? 'text-green-500'
                    : overallStatusColor === 'yellow'
                      ? 'text-yellow-500'
                      : 'text-red-500',
                )}
              />
              <CardTitle className="text-lg">Backup Protection</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <Badge
                variant={
                  overallStatusColor === 'green' ? 'default' : 'destructive'
                }
              >
                {backupStatus?.overall_status || 'Unknown'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {statusDisplay && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Health Score
              </span>
              <div className="flex items-center gap-2">
                <Progress value={statusDisplay.score} className="w-16 h-2" />
                <span className="text-sm font-medium">
                  {statusDisplay.score}%
                </span>
              </div>
            </div>
          )}
          {operationsSummary.total > 0 && (
            <div className="text-sm text-muted-foreground">
              {operationsSummary.total} active operations
              {operationsSummary.weddingCritical > 0 && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {operationsSummary.weddingCritical} wedding-critical
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        'w-full space-y-6',
        emergencyMode &&
          'bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border-2 border-red-200 dark:border-red-800',
      )}
    >
      {/* Emergency Alert Banner */}
      {emergencyMode && emergencyStatus && (
        <Alert
          variant="destructive"
          className="border-red-600 bg-red-50 dark:bg-red-950"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            Emergency Backup Situation Detected
            <Badge variant="destructive" className="animate-pulse">
              {emergencyStatus.severity.toUpperCase()}
            </Badge>
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-1">
              <p>
                <strong>Incident:</strong>{' '}
                {emergencyStatus.incident_type.replace(/-/g, ' ').toUpperCase()}
              </p>
              {emergencyStatus.affected_weddings.length > 0 && (
                <p>
                  <strong>Affected Weddings:</strong>{' '}
                  {emergencyStatus.affected_weddings.length} wedding(s)
                </p>
              )}
              <p>
                <strong>Response Time:</strong>{' '}
                {emergencyStatus.response_time.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleEmergencyRecovery}
              >
                <Zap className="w-4 h-4 mr-1" />
                Initiate Emergency Recovery
              </Button>
              <Button size="sm" variant="outline">
                <Phone className="w-4 h-4 mr-1" />
                Call Support
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield
              className={cn(
                'w-6 h-6',
                overallStatusColor === 'green'
                  ? 'text-green-500'
                  : overallStatusColor === 'yellow'
                    ? 'text-yellow-500'
                    : 'text-red-500',
              )}
            />
            <h1 className="text-2xl font-bold">Backup Strategy Dashboard</h1>
          </div>
          {statusDisplay && (
            <Badge
              variant={
                statusDisplay.color === 'green' ? 'default' : 'destructive'
              }
              className="text-sm"
            >
              {statusDisplay.label} ({statusDisplay.score}%)
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span>Real-time monitoring active</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span>Connection lost - attempting reconnection...</span>
              </>
            )}
          </div>
          {lastUpdate && (
            <div className="text-sm text-muted-foreground">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backup Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusDisplay?.score || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {backupStatus?.overall_status || 'Unknown'} status
            </p>
            {statusDisplay && (
              <Progress value={statusDisplay.score} className="mt-2 h-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Operations
            </CardTitle>
            <RefreshCw
              className={cn(
                'h-4 w-4 text-muted-foreground',
                operationsSummary.total > 0 && 'animate-spin',
              )}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operationsSummary.total}</div>
            <p className="text-xs text-muted-foreground">
              {operationsSummary.backups}B • {operationsSummary.restores}R •{' '}
              {operationsSummary.verifications}V
            </p>
            {operationsSummary.weddingCritical > 0 && (
              <Badge variant="outline" className="mt-1 text-xs">
                {operationsSummary.weddingCritical} wedding-critical
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wedding Data</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {backupStatus?.wedding_critical_data_status === 'healthy' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="text-lg font-bold text-green-600">
                    Protected
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div className="text-lg font-bold text-red-600">At Risk</div>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Last backup:{' '}
              {backupStatus?.last_successful_backup
                ? new Date(
                    backupStatus.last_successful_backup,
                  ).toLocaleDateString()
                : 'Never'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Emergency Readiness
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {backupStatus?.emergency_contacts_available ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="text-lg font-bold text-green-600">Ready</div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <div className="text-lg font-bold text-yellow-600">
                    Setup Required
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              24/7 emergency support
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="protection">Protection</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="recovery">Recovery</TabsTrigger>
          <TabsTrigger
            value="emergency"
            className={
              emergencyMode
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                : ''
            }
          >
            Emergency
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <BackupStatusOverview
            backupStatus={backupStatus}
            activeOperations={activeOperations}
            organizationId={organizationId}
          />
        </TabsContent>

        <TabsContent value="protection" className="space-y-4">
          <WeddingDataProtectionPanel
            organizationId={organizationId}
            backupStatus={backupStatus}
            readOnly={emergencyMode}
          />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <RealTimeBackupMonitor
            organizationId={organizationId}
            activeOperations={activeOperations}
            isConnected={isConnected}
          />
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Recovery Control Center
                </CardTitle>
                <CardDescription>
                  Manage data recovery and restoration procedures for wedding
                  data protection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Recovery Controls Available
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Point-in-time recovery, granular restoration, and emergency
                    procedures
                  </p>
                  <Button onClick={() => setSelectedTab('emergency')}>
                    Access Recovery Tools
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <EmergencyBackupControls
            emergencyStatus={emergencyStatus}
            organizationId={organizationId}
            onEmergencyAction={handleEmergencyRecovery}
            allowManualOverride={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
