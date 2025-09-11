'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Battery,
  Wifi,
  WifiOff,
  Clock,
  Download,
  Upload,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

export interface BackupProgress {
  id: string;
  type: 'full' | 'incremental' | 'emergency';
  progress: number;
  startTime: string;
  estimatedCompletion?: string;
  processedFiles: number;
  totalFiles: number;
  currentOperation: string;
  speed: string;
}

export interface BackupOperation {
  id: string;
  type: 'full' | 'incremental' | 'emergency';
  status: 'completed' | 'failed' | 'partial';
  startTime: string;
  endTime: string;
  filesBackedUp: number;
  totalSize: string;
  errorCount?: number;
  location: string;
}

export interface BackupSystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  lastCheck: string;
  storageUsed: number;
  storageTotal: number;
  uptime: string;
  activeConnections: number;
  errorRate: number;
  performance: 'excellent' | 'good' | 'poor';
}

export interface BackupStatusWidgetProps {
  currentBackup?: BackupProgress;
  lastSuccessfulBackup?: BackupOperation;
  nextScheduledBackup?: Date;
  systemHealth: BackupSystemHealth;
  mobileOptimized?: boolean;
  onManualBackup?: () => Promise<void>;
  onRefresh?: () => Promise<void>;
  className?: string;
}

export function BackupStatusWidget({
  currentBackup,
  lastSuccessfulBackup,
  nextScheduledBackup,
  systemHealth,
  mobileOptimized = false,
  onManualBackup,
  onRefresh,
  className,
}: BackupStatusWidgetProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTriggeringBackup, setIsTriggeringBackup] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  // Battery API for mobile optimization
  useEffect(() => {
    if ('getBattery' in navigator && mobileOptimized) {
      // @ts-ignore - Battery API is experimental
      navigator
        .getBattery()
        .then((battery: any) => {
          setBatteryLevel(battery.level * 100);

          const updateBatteryInfo = () => {
            setBatteryLevel(battery.level * 100);
          };

          battery.addEventListener('levelchange', updateBatteryInfo);
          battery.addEventListener('chargingchange', updateBatteryInfo);

          return () => {
            battery.removeEventListener('levelchange', updateBatteryInfo);
            battery.removeEventListener('chargingchange', updateBatteryInfo);
          };
        })
        .catch(() => {
          // Battery API not supported
          setBatteryLevel(null);
        });
    }
  }, [mobileOptimized]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Mobile-optimized polling interval (30s vs 5s desktop)
  const getPollingInterval = useCallback(() => {
    if (!isOnline) return 60000; // 60s when offline
    if (mobileOptimized) {
      // Battery-efficient polling based on battery level
      if (batteryLevel !== null && batteryLevel < 20) return 60000; // 60s on low battery
      return 30000; // 30s on mobile
    }
    return 5000; // 5s on desktop
  }, [mobileOptimized, batteryLevel, isOnline]);

  // Auto-refresh with mobile optimization
  useEffect(() => {
    if (!isOnline && !mobileOptimized) return; // Skip auto-refresh when offline on desktop

    const interval = setInterval(async () => {
      if (onRefresh && !isRefreshing) {
        await handleRefresh();
      }
    }, getPollingInterval());

    return () => clearInterval(interval);
  }, [onRefresh, isRefreshing, getPollingInterval, mobileOptimized, isOnline]);

  const handleRefresh = async () => {
    if (isRefreshing || !onRefresh) return;

    try {
      setIsRefreshing(true);
      await onRefresh();
      setLastRefresh(new Date());

      if (mobileOptimized) {
        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }
    } catch (error) {
      console.error('Error refreshing backup status:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Unable to refresh backup status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualBackup = async () => {
    if (isTriggeringBackup || !onManualBackup) return;

    try {
      setIsTriggeringBackup(true);
      await onManualBackup();

      toast({
        title: 'Backup Started',
        description: 'Emergency backup has been triggered successfully.',
        variant: 'default',
      });

      if (mobileOptimized && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (error) {
      console.error('Error triggering manual backup:', error);
      toast({
        title: 'Backup Failed',
        description: 'Unable to start backup. Please check system status.',
        variant: 'destructive',
      });
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  const getSystemHealthIcon = () => {
    switch (systemHealth.status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getSystemHealthColor = () => {
    switch (systemHealth.status) {
      case 'healthy':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-700 bg-red-50 border-red-200';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* System Health Overview */}
      <Card className={`p-4 border-2 ${getSystemHealthColor()}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getSystemHealthIcon()}
            <h3 className="font-semibold text-sm sm:text-base">
              Backup System{' '}
              {systemHealth.status === 'healthy'
                ? 'Healthy'
                : systemHealth.status === 'warning'
                  ? 'Warning'
                  : 'Critical'}
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            {/* Network status */}
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}

            {/* Battery level on mobile */}
            {mobileOptimized && batteryLevel !== null && (
              <div className="flex items-center space-x-1">
                <Battery
                  className={`w-4 h-4 ${batteryLevel < 20 ? 'text-red-500' : 'text-gray-500'}`}
                />
                <span className="text-xs">{Math.round(batteryLevel)}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Storage:</span>
            <div className="flex items-center space-x-1 mt-1">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    systemHealth.status === 'healthy'
                      ? 'bg-green-500'
                      : systemHealth.status === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{
                    width: `${(systemHealth.storageUsed / systemHealth.storageTotal) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs whitespace-nowrap">
                {Math.round(
                  (systemHealth.storageUsed / systemHealth.storageTotal) * 100,
                )}
                %
              </span>
            </div>
          </div>

          <div>
            <span className="text-gray-600">Performance:</span>
            <div className="mt-1">
              <Badge
                variant={
                  systemHealth.performance === 'excellent'
                    ? 'default'
                    : systemHealth.performance === 'good'
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {systemHealth.performance}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="text-xs text-gray-600">
            Last checked: {formatTimeAgo(systemHealth.lastCheck)}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || (!isOnline && !mobileOptimized)}
            className={`${mobileOptimized ? 'min-h-[44px] px-4' : ''}`} // Touch-friendly size on mobile
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''} ${mobileOptimized ? 'mr-2' : ''}`}
            />
            {mobileOptimized && <span>Refresh</span>}
          </Button>
        </div>
      </Card>

      {/* Current Backup Progress */}
      {currentBackup && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <h4 className="font-semibold text-sm sm:text-base">
                {currentBackup.type === 'emergency'
                  ? 'Emergency'
                  : currentBackup.type === 'full'
                    ? 'Full'
                    : 'Incremental'}{' '}
                Backup In Progress
              </h4>
            </div>

            <Badge
              variant={
                currentBackup.type === 'emergency' ? 'destructive' : 'default'
              }
            >
              {Math.round(currentBackup.progress)}%
            </Badge>
          </div>

          <div className="space-y-3">
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentBackup.progress}%` }}
              />
            </div>

            {/* Progress details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Files:</span>
                <span className="ml-2 font-medium">
                  {currentBackup.processedFiles.toLocaleString()} /{' '}
                  {currentBackup.totalFiles.toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-gray-600">Speed:</span>
                <span className="ml-2 font-medium">{currentBackup.speed}</span>
              </div>
            </div>

            <div className="text-sm">
              <span className="text-gray-600">Current operation:</span>
              <span className="ml-2 font-medium">
                {currentBackup.currentOperation}
              </span>
            </div>

            {currentBackup.estimatedCompletion && (
              <div className="text-sm">
                <span className="text-gray-600">Est. completion:</span>
                <span className="ml-2 font-medium">
                  {new Date(
                    currentBackup.estimatedCompletion,
                  ).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Last Successful Backup */}
      {lastSuccessfulBackup && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h4 className="font-semibold text-sm sm:text-base">
                Last Successful Backup
              </h4>
            </div>

            <Badge variant="secondary">{lastSuccessfulBackup.type}</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Completed:</span>
              <div className="font-medium">
                {formatTimeAgo(lastSuccessfulBackup.endTime)}
              </div>
            </div>

            <div>
              <span className="text-gray-600">Files backed up:</span>
              <div className="font-medium">
                {lastSuccessfulBackup.filesBackedUp.toLocaleString()}
              </div>
            </div>

            <div>
              <span className="text-gray-600">Total size:</span>
              <div className="font-medium">
                {lastSuccessfulBackup.totalSize}
              </div>
            </div>

            <div>
              <span className="text-gray-600">Location:</span>
              <div className="font-medium truncate">
                {lastSuccessfulBackup.location}
              </div>
            </div>
          </div>

          {lastSuccessfulBackup.errorCount &&
            lastSuccessfulBackup.errorCount > 0 && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <div className="text-sm text-yellow-800">
                  {lastSuccessfulBackup.errorCount} file(s) had errors but
                  backup completed successfully
                </div>
              </div>
            )}
        </Card>
      )}

      {/* Next Scheduled Backup & Manual Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <h4 className="font-semibold text-sm sm:text-base">
              Backup Controls
            </h4>
          </div>
        </div>

        {nextScheduledBackup && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <div className="text-sm">
              <span className="text-gray-600">Next scheduled backup:</span>
              <div className="font-medium mt-1">
                {nextScheduledBackup.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={handleManualBackup}
            disabled={
              isTriggeringBackup ||
              !!currentBackup ||
              (!isOnline && !mobileOptimized)
            }
            className={`${mobileOptimized ? 'min-h-[44px]' : ''} bg-orange-600 hover:bg-orange-700`}
          >
            {isTriggeringBackup ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Starting Backup...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Trigger Emergency Backup
              </>
            )}
          </Button>

          {!isOnline && mobileOptimized && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <WifiOff className="w-4 h-4 inline mr-2" />
              Offline mode: Backup will start when connection is restored
            </div>
          )}
        </div>
      </Card>

      {/* Mobile optimization info */}
      {mobileOptimized && (
        <div className="text-xs text-gray-500 text-center">
          <div>
            Mobile optimized • Updates every {getPollingInterval() / 1000}s
          </div>
          {batteryLevel !== null && batteryLevel < 20 && (
            <div className="text-yellow-600 mt-1">
              Low battery detected • Extended refresh interval active
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BackupStatusWidget;
