'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  WifiOff,
  Wifi,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Database,
  CloudOff,
  Loader2,
} from 'lucide-react';
import {
  BackupOperation,
  BackupSystemHealth,
} from './mobile/BackupStatusWidget';
import { toast } from '@/hooks/use-toast';

interface CachedBackupData {
  lastUpdate: string;
  systemHealth: BackupSystemHealth;
  lastBackup?: BackupOperation;
  nextScheduledBackup?: string;
  isStale: boolean;
  cacheTimestamp: string;
}

interface OfflineBackupStatusProps {
  isOnline?: boolean;
  onRetrySync?: () => Promise<void>;
  className?: string;
}

export function OfflineBackupStatus({
  isOnline = navigator.onLine,
  onRetrySync,
  className,
}: OfflineBackupStatusProps) {
  const [cachedData, setCachedData] = useState<CachedBackupData | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Service worker cache key
  const CACHE_KEY = 'wedsync-backup-status';
  const MAX_CACHE_AGE = 30 * 60 * 1000; // 30 minutes
  const MAX_RETRY_ATTEMPTS = 3;

  // Load cached data from service worker cache
  const loadCachedData = useCallback(async () => {
    try {
      // Check if service worker and caches API are available
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cache = await caches.open('wedsync-backup-status-v1');
        const cachedResponse = await cache.match('/api/backups/status');

        if (cachedResponse) {
          const data = await cachedResponse.json();
          const cacheTimestamp =
            cachedResponse.headers.get('cache-timestamp') ||
            new Date().toISOString();
          const cacheAge = Date.now() - new Date(cacheTimestamp).getTime();

          setCachedData({
            ...data,
            isStale: cacheAge > MAX_CACHE_AGE,
            cacheTimestamp,
          });

          console.log('Loaded cached backup data from service worker');
        } else {
          // Fallback to localStorage
          const localData = localStorage.getItem(CACHE_KEY);
          if (localData) {
            const parsed = JSON.parse(localData);
            const cacheAge =
              Date.now() - new Date(parsed.cacheTimestamp).getTime();

            setCachedData({
              ...parsed,
              isStale: cacheAge > MAX_CACHE_AGE,
            });

            console.log('Loaded cached backup data from localStorage');
          }
        }
      } else {
        // Fallback to localStorage only
        const localData = localStorage.getItem(CACHE_KEY);
        if (localData) {
          const parsed = JSON.parse(localData);
          const cacheAge =
            Date.now() - new Date(parsed.cacheTimestamp).getTime();

          setCachedData({
            ...parsed,
            isStale: cacheAge > MAX_CACHE_AGE,
          });
        }
      }
    } catch (error) {
      console.error('Error loading cached backup data:', error);

      // Final fallback to localStorage
      try {
        const localData = localStorage.getItem(CACHE_KEY);
        if (localData) {
          const parsed = JSON.parse(localData);
          setCachedData({
            ...parsed,
            isStale: true, // Mark as stale due to error
          });
        }
      } catch (fallbackError) {
        console.error('Error loading fallback cached data:', error);
      }
    }
  }, []);

  // Save data to cache when online
  const saveCachedData = useCallback(async (data: any) => {
    const cacheData = {
      ...data,
      cacheTimestamp: new Date().toISOString(),
    };

    try {
      // Save to service worker cache
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cache = await caches.open('wedsync-backup-status-v1');
        const response = new Response(JSON.stringify(cacheData), {
          headers: {
            'Content-Type': 'application/json',
            'cache-timestamp': cacheData.cacheTimestamp,
          },
        });
        await cache.put('/api/backups/status', response);
      }

      // Also save to localStorage as fallback
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      console.log('Cached backup data successfully');
    } catch (error) {
      console.error('Error caching backup data:', error);

      // Fallback to localStorage only
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      } catch (fallbackError) {
        console.error('Error saving fallback cached data:', fallbackError);
      }
    }
  }, []);

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);

  // Handle online/offline state changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored - triggering sync');
      if (cachedData?.isStale && retryCount < MAX_RETRY_ATTEMPTS) {
        handleRetrySync();
      }
    };

    const handleOffline = () => {
      console.log('Connection lost - switching to offline mode');
      toast({
        title: 'Connection Lost',
        description:
          'Showing cached backup status. Will sync when connection is restored.',
        variant: 'default',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [cachedData, retryCount]);

  // Retry sync functionality
  const handleRetrySync = async () => {
    if (isRetrying || !isOnline) return;

    try {
      setIsRetrying(true);
      setLastSyncAttempt(new Date());
      setRetryCount((prev) => prev + 1);

      if (onRetrySync) {
        await onRetrySync();

        // Reset retry count on success
        setRetryCount(0);

        toast({
          title: 'Sync Successful',
          description: 'Backup status has been updated from server.',
          variant: 'default',
        });
      } else {
        // Fallback: try to fetch data directly
        const response = await fetch('/api/backups/status');
        if (response.ok) {
          const data = await response.json();
          await saveCachedData(data);
          setCachedData({
            ...data,
            isStale: false,
            cacheTimestamp: new Date().toISOString(),
          });
          setRetryCount(0);

          toast({
            title: 'Sync Successful',
            description: 'Backup status has been updated.',
            variant: 'default',
          });
        } else {
          throw new Error(`Sync failed with status ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Error during sync retry:', error);

      toast({
        title: 'Sync Failed',
        description: `Failed to sync backup status. Showing cached data. (Attempt ${retryCount}/${MAX_RETRY_ATTEMPTS})`,
        variant: 'destructive',
      });
    } finally {
      setIsRetrying(false);
    }
  };

  // Format time display
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

  // Get appropriate status icon
  const getStatusIcon = () => {
    if (isRetrying)
      return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    if (!isOnline) return <WifiOff className="w-5 h-5 text-red-500" />;
    if (cachedData?.isStale)
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    if (isOnline && cachedData)
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <Database className="w-5 h-5 text-gray-500" />;
  };

  const getStatusColor = () => {
    if (!isOnline) return 'border-red-200 bg-red-50';
    if (cachedData?.isStale) return 'border-yellow-200 bg-yellow-50';
    if (isOnline && cachedData && !cachedData.isStale)
      return 'border-green-200 bg-green-50';
    return 'border-gray-200 bg-gray-50';
  };

  const getStatusText = () => {
    if (isRetrying) return 'Syncing...';
    if (!isOnline) return 'Offline';
    if (cachedData?.isStale) return 'Data Stale';
    if (cachedData) return 'Cached';
    return 'No Data';
  };

  if (!cachedData && isOnline) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-center space-x-3 py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-gray-600">Loading backup status...</span>
        </div>
      </Card>
    );
  }

  if (!cachedData && !isOnline) {
    return (
      <Card className={`p-4 border-red-200 bg-red-50 ${className}`}>
        <div className="text-center py-8">
          <CloudOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            No Cached Data Available
          </h3>
          <p className="text-red-600 mb-4">
            Unable to show backup status while offline. Connect to the internet
            to load current status.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status Header */}
      <Card className={`p-4 border-2 ${getStatusColor()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold text-sm">
                {isOnline ? 'Online' : 'Offline'} • {getStatusText()}
              </h3>
              <p className="text-xs text-gray-600">
                {cachedData
                  ? `Last updated: ${formatTimeAgo(cachedData.cacheTimestamp)}`
                  : 'No data available'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}

            {(cachedData?.isStale || !isOnline) && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetrySync}
                disabled={
                  isRetrying || !isOnline || retryCount >= MAX_RETRY_ATTEMPTS
                }
                className="min-h-[36px]"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`}
                />
              </Button>
            )}
          </div>
        </div>

        {/* Retry information */}
        {retryCount > 0 && (
          <div className="mt-3 text-xs text-gray-600">
            Sync attempts: {retryCount}/{MAX_RETRY_ATTEMPTS}
            {lastSyncAttempt && (
              <span className="ml-2">
                • Last attempt: {formatTimeAgo(lastSyncAttempt.toISOString())}
              </span>
            )}
          </div>
        )}

        {/* Stale data warning */}
        {cachedData?.isStale && (
          <div className="mt-3 p-2 bg-yellow-100 border border-yellow-200 rounded">
            <div className="flex items-center space-x-2 text-yellow-800">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Stale Data</span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              This data is over 30 minutes old.{' '}
              {isOnline
                ? 'Tap refresh to update.'
                : 'Connect to internet to refresh.'}
            </p>
          </div>
        )}

        {/* Max retries reached */}
        {retryCount >= MAX_RETRY_ATTEMPTS && (
          <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Sync Failed</span>
            </div>
            <p className="text-xs text-red-700 mt-1">
              Maximum retry attempts reached. Please check your connection or
              try again later.
            </p>
          </div>
        )}
      </Card>

      {/* Cached System Health */}
      {cachedData?.systemHealth && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">System Health (Cached)</h4>
            <Badge
              variant={
                cachedData.systemHealth.status === 'healthy'
                  ? 'secondary'
                  : cachedData.systemHealth.status === 'warning'
                    ? 'default'
                    : 'destructive'
              }
            >
              {cachedData.systemHealth.status}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Storage Used:</span>
              <span className="font-medium">
                {Math.round(
                  (cachedData.systemHealth.storageUsed /
                    cachedData.systemHealth.storageTotal) *
                    100,
                )}
                %
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  cachedData.systemHealth.status === 'healthy'
                    ? 'bg-green-500'
                    : cachedData.systemHealth.status === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{
                  width: `${(cachedData.systemHealth.storageUsed / cachedData.systemHealth.storageTotal) * 100}%`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Performance:</span>
                <div className="font-medium">
                  {cachedData.systemHealth.performance}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Uptime:</span>
                <div className="font-medium">
                  {cachedData.systemHealth.uptime}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Cached Last Backup */}
      {cachedData?.lastBackup && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Last Backup (Cached)</h4>
            <Badge variant="secondary">{cachedData.lastBackup.type}</Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium capitalize">
                {cachedData.lastBackup.status}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Completed:</span>
              <span className="font-medium">
                {formatTimeAgo(cachedData.lastBackup.endTime)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Files:</span>
              <span className="font-medium">
                {cachedData.lastBackup.filesBackedUp.toLocaleString()}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Offline Usage Instructions */}
      {!isOnline && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">
            Offline Mode Active
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Backup status is cached and may be outdated</li>
            <li>• New backups cannot be triggered while offline</li>
            <li>• System will sync automatically when connection returns</li>
            <li>• Critical alerts will be shown when back online</li>
          </ul>
        </Card>
      )}
    </div>
  );
}

export default OfflineBackupStatus;
