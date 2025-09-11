'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { syncManager, SyncStatus } from '@/lib/offline/sync-manager';
import { smartCacheManager } from '@/lib/offline/offline-database';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Upload,
  Download,
  Signal,
} from 'lucide-react';

interface OfflineIndicatorProps {
  showDetails?: boolean;
  showProgress?: boolean;
  className?: string;
  variant?: 'compact' | 'detailed' | 'minimal';
  position?: 'fixed' | 'relative' | 'sticky';
  weddingContext?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showDetails = false,
  showProgress = true,
  className = '',
  variant = 'compact',
  position = 'fixed',
  weddingContext = true,
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [cacheUsage, setCacheUsage] = useState<{
    usage: number;
    size: string;
  } | null>(null);
  const [networkQuality, setNetworkQuality] = useState<
    'slow' | 'fast' | 'offline'
  >('fast');
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
  }>({ current: 0, total: 0 });
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [weddingPriority, setWeddingPriority] = useState<
    'critical' | 'high' | 'normal'
  >('normal');

  // Enhanced status monitoring with progress tracking
  useEffect(() => {
    const loadStatus = async () => {
      const status = await syncManager.getStatus();
      setSyncStatus(status);
      setLastSyncTime(
        status.lastSyncTime ? new Date(status.lastSyncTime) : null,
      );

      // Calculate sync progress
      if (status.pendingCount > 0 || status.isSyncing) {
        setSyncProgress({
          current: Math.max(0, status.totalCount - status.pendingCount),
          total: status.totalCount || 1,
        });
      }

      // Detect wedding priority from pending items
      if (weddingContext) {
        const priority = detectWeddingPriority(status);
        setWeddingPriority(priority);
      }
    };
    loadStatus();

    // Enhanced status change handler
    const handleStatusChange = (status: SyncStatus) => {
      setSyncStatus(status);
      setLastSyncTime(
        status.lastSyncTime ? new Date(status.lastSyncTime) : null,
      );

      // Update progress
      if (status.isSyncing && status.totalCount > 0) {
        setSyncProgress({
          current: Math.max(0, status.totalCount - status.pendingCount),
          total: status.totalCount,
        });
      } else if (!status.isSyncing) {
        setSyncProgress({ current: 0, total: 0 });
      }

      // Update wedding priority
      if (weddingContext) {
        setWeddingPriority(detectWeddingPriority(status));
      }
    };

    syncManager.onStatusChange(handleStatusChange);

    return () => {
      syncManager.removeStatusListener(handleStatusChange);
    };
  }, [weddingContext]);

  // Network quality monitoring
  useEffect(() => {
    let connectionMonitor: number;

    const checkNetworkQuality = () => {
      if (!navigator.onLine) {
        setNetworkQuality('offline');
        return;
      }

      // Simple network quality check using connection timing
      const startTime = performance.now();
      fetch('/api/ping', { method: 'HEAD' })
        .then(() => {
          const responseTime = performance.now() - startTime;
          setNetworkQuality(responseTime > 2000 ? 'slow' : 'fast');
        })
        .catch(() => {
          setNetworkQuality('offline');
        });
    };

    checkNetworkQuality();
    connectionMonitor = window.setInterval(checkNetworkQuality, 30000); // Check every 30 seconds

    // Listen for online/offline events
    const handleOnline = () => checkNetworkQuality();
    const handleOffline = () => setNetworkQuality('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(connectionMonitor);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Wedding priority detection helper
  const detectWeddingPriority = useCallback(
    (status: SyncStatus): 'critical' | 'high' | 'normal' => {
      if (!status.pendingItems) return 'normal';

      const hasCritical = status.pendingItems.some(
        (item) =>
          item.priority >= 9 ||
          item.type === 'emergency_contact' ||
          item.type === 'timeline_critical',
      );

      const hasHigh = status.pendingItems.some(
        (item) =>
          item.priority >= 7 ||
          item.type === 'vendor_update' ||
          item.type === 'timeline_update',
      );

      if (hasCritical) return 'critical';
      if (hasHigh) return 'high';
      return 'normal';
    },
    [],
  );

  useEffect(() => {
    // Load cache usage periodically
    const loadCacheUsage = async () => {
      try {
        const usage = await smartCacheManager.getCacheUsage();
        setCacheUsage({
          usage: usage.usage,
          size: formatBytes(usage.size),
        });
      } catch (error) {
        console.error('Error loading cache usage:', error);
      }
    };

    loadCacheUsage();
    const interval = setInterval(loadCacheUsage, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleManualSync = async () => {
    await syncManager.forcSync();
  };

  if (!syncStatus) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-4 h-4 animate-pulse bg-gray-300 rounded-full" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  // Enhanced status icon with network quality and wedding priority
  const getStatusIcon = () => {
    if (!syncStatus) {
      return <RefreshCw className="w-4 h-4 animate-pulse text-gray-400" />;
    }

    // Wedding critical priority override
    if (weddingContext && weddingPriority === 'critical') {
      return <AlertTriangle className="w-4 h-4 animate-pulse text-red-600" />;
    }

    if (syncStatus.isSyncing) {
      return (
        <div className="relative">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          {showProgress && syncProgress.total > 0 && (
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </div>
      );
    }

    if (!syncStatus.isOnline || networkQuality === 'offline') {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }

    // Network quality indicators
    if (networkQuality === 'slow') {
      return <Signal className="w-4 h-4 text-yellow-500" />;
    }

    if (syncStatus.failedCount > 0) {
      return (
        <AlertTriangle className="w-4 h-4 text-yellow-500 animate-pulse" />
      );
    }

    if (syncStatus.pendingCount > 0) {
      return (
        <div className="relative">
          <Upload className="w-4 h-4 text-orange-500" />
          {weddingPriority === 'high' && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
          )}
        </div>
      );
    }

    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!syncStatus) return 'Loading...';

    // Wedding critical priority messaging
    if (weddingContext && weddingPriority === 'critical') {
      return 'Critical wedding data pending';
    }

    if (syncStatus.isSyncing) {
      if (showProgress && syncProgress.total > 0) {
        return `Syncing ${syncProgress.current}/${syncProgress.total}...`;
      }
      return weddingContext ? 'Updating wedding data...' : 'Syncing...';
    }

    if (!syncStatus.isOnline || networkQuality === 'offline') {
      return weddingContext
        ? 'Working offline - changes saved locally'
        : 'Offline';
    }

    if (networkQuality === 'slow') {
      return 'Slow connection';
    }

    if (syncStatus.failedCount > 0) {
      const errorText = `${syncStatus.failedCount} sync error${syncStatus.failedCount > 1 ? 's' : ''}`;
      return weddingContext
        ? `${errorText} - wedding data may be outdated`
        : errorText;
    }

    if (syncStatus.pendingCount > 0) {
      const pendingText = `${syncStatus.pendingCount} pending`;
      if (weddingContext) {
        return weddingPriority === 'high'
          ? `${pendingText} high-priority updates`
          : `${pendingText} wedding updates`;
      }
      return pendingText;
    }

    return weddingContext ? 'Wedding data up to date' : 'All synced';
  };

  const getStatusColor = () => {
    if (syncStatus.isSyncing) return 'text-blue-600';
    if (!syncStatus.isOnline) return 'text-red-600';
    if (syncStatus.failedCount > 0) return 'text-yellow-600';
    if (syncStatus.pendingCount > 0) return 'text-orange-600';
    return 'text-green-600';
  };

  // Enhanced component rendering with variants and progress
  const renderProgressBar = () => {
    if (!showProgress || !syncStatus?.isSyncing || syncProgress.total === 0)
      return null;

    const progressPercentage = Math.round(
      (syncProgress.current / syncProgress.total) * 100,
    );

    return (
      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Sync progress: ${progressPercentage}%`}
        />
      </div>
    );
  };

  const renderMinimalVariant = () => (
    <div
      className={`inline-flex items-center ${className}`}
      role="status"
      aria-live="polite"
    >
      {getStatusIcon()}
    </div>
  );

  const renderCompactVariant = () => (
    <div
      className={`
      inline-flex items-center gap-2 px-3 py-1.5 
      bg-white border border-gray-200 rounded-lg shadow-xs
      ${position === 'fixed' ? 'fixed top-4 right-4 z-50' : ''}
      ${weddingPriority === 'critical' ? 'border-red-200 bg-red-50' : ''}
      ${className}
    `}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${getStatusText()}`}
    >
      {getStatusIcon()}
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {renderProgressBar()}
    </div>
  );

  const renderDetailedVariant = () => (
    <div
      className={`
      bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3
      ${position === 'fixed' ? 'fixed top-4 right-4 z-50 min-w-[280px]' : ''}
      ${weddingPriority === 'critical' ? 'border-red-200 bg-red-50' : ''}
      ${className}
    `}
      role="status"
      aria-live="polite"
    >
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-sm font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {lastSyncTime && (
          <span className="text-xs text-gray-500">
            {formatLastSyncTime(lastSyncTime)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {renderProgressBar()}

      {/* Wedding priority alert */}
      {weddingContext && weddingPriority === 'critical' && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-red-800">
              Critical wedding updates need immediate sync
            </span>
          </div>
        </div>
      )}

      {/* Details section */}
      {showDetails && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          {/* Cache usage */}
          {cacheUsage && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Local Storage:</span>
              <span className="text-gray-800">
                {cacheUsage.size} ({Math.round(cacheUsage.usage * 100)}%)
              </span>
            </div>
          )}

          {/* Network quality */}
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Connection:</span>
            <span
              className={`font-medium ${
                networkQuality === 'fast'
                  ? 'text-green-600'
                  : networkQuality === 'slow'
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              {networkQuality === 'offline'
                ? 'Offline'
                : networkQuality === 'slow'
                  ? 'Slow'
                  : 'Good'}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {syncStatus?.isOnline &&
              !syncStatus?.isSyncing &&
              syncStatus?.pendingCount > 0 && (
                <button
                  onClick={handleManualSync}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                >
                  Sync Now
                </button>
              )}

            {syncStatus?.failedCount > 0 && (
              <button
                onClick={() => syncManager.clearFailedItems()}
                className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                Clear Errors
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to format last sync time
  const formatLastSyncTime = (time: Date): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return time.toLocaleDateString();
  };

  // Render based on variant
  switch (variant) {
    case 'minimal':
      return renderMinimalVariant();
    case 'detailed':
      return renderDetailedVariant();
    default:
      return renderCompactVariant();
  }
};

export default OfflineIndicator;
