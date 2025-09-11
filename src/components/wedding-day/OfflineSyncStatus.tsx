'use client';

import { useState } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  CloudOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  useConnectionStatus,
  useOfflineSyncStatus,
} from '@/stores/wedding-day-offline';
import type { WeddingDaySyncManager } from '@/lib/offline/wedding-day-sync-manager';

interface OfflineSyncStatusProps {
  syncManager?: WeddingDaySyncManager | null;
  className?: string;
  compact?: boolean;
}

export function OfflineSyncStatus({
  syncManager,
  className,
  compact = false,
}: OfflineSyncStatusProps) {
  const { isOnline, syncInProgress, lastSyncTime } = useConnectionStatus();
  const {
    pendingCount,
    failedCount,
    hasUnsyncedData,
    pendingActions,
    failedActions,
  } = useOfflineSyncStatus();

  const [showDetails, setShowDetails] = useState(false);

  const handleManualSync = async () => {
    if (syncManager && isOnline) {
      try {
        await syncManager.manualSync();
      } catch (error) {
        console.error('Manual sync failed:', error);
      }
    }
  };

  const handleRetryFailed = async () => {
    if (syncManager) {
      try {
        await syncManager.retryFailedActions();
      } catch (error) {
        console.error('Retry failed actions error:', error);
      }
    }
  };

  // Get status color and icon
  const getStatusDisplay = () => {
    if (!isOnline) {
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: WifiOff,
        label: 'Offline',
        description: 'Working offline - changes will sync when connected',
      };
    }

    if (syncInProgress) {
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: RefreshCw,
        label: 'Syncing',
        description: 'Syncing changes with server...',
      };
    }

    if (failedCount > 0) {
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: AlertTriangle,
        label: 'Sync Issues',
        description: `${failedCount} failed sync${failedCount !== 1 ? 's' : ''} - tap to retry`,
      };
    }

    if (hasUnsyncedData) {
      return {
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: Cloud,
        label: 'Pending Sync',
        description: `${pendingCount} change${pendingCount !== 1 ? 's' : ''} waiting to sync`,
      };
    }

    return {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: CheckCircle2,
      label: 'Synced',
      description: 'All changes synced',
    };
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            status.bgColor,
            status.color,
          )}
        >
          <StatusIcon
            className={cn('w-3 h-3', syncInProgress && 'animate-spin')}
          />
          <span>{status.label}</span>
        </div>

        {hasUnsyncedData && (
          <span className="text-xs text-gray-500">
            {pendingCount + failedCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white border rounded-lg shadow-sm',
        status.borderColor,
        className,
      )}
    >
      {/* Main Status Bar */}
      <div
        className={cn('p-3 cursor-pointer transition-colors', status.bgColor)}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon
              className={cn(
                'w-4 h-4',
                status.color,
                syncInProgress && 'animate-spin',
              )}
            />
            <div className="text-sm">
              <div className={cn('font-medium', status.color)}>
                {status.label}
              </div>
              <div className="text-gray-600 text-xs">{status.description}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pending/Failed Count */}
            {hasUnsyncedData && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                {pendingCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{pendingCount}</span>
                  </div>
                )}
                {failedCount > 0 && (
                  <div className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="w-3 h-3" />
                    <span>{failedCount}</span>
                  </div>
                )}
              </div>
            )}

            {/* Manual Sync Button */}
            {isOnline && !syncInProgress && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleManualSync();
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="Manual sync"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}

            {/* Last Sync Time */}
            {lastSyncTime && (
              <div className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(lastSyncTime), {
                  addSuffix: true,
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="border-t bg-white">
          <div className="p-3 space-y-3">
            {/* Connection Status */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Connection:</span>
              <div className="flex items-center gap-1">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-600" />
                    <span className="text-red-600 font-medium">Offline</span>
                  </>
                )}
              </div>
            </div>

            {/* Sync Status */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Sync Status:</span>
              <div className="flex items-center gap-1">
                {syncInProgress ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-blue-600 font-medium">
                      In Progress
                    </span>
                  </>
                ) : hasUnsyncedData ? (
                  <>
                    <CloudOff className="w-4 h-4 text-orange-600" />
                    <span className="text-orange-600 font-medium">Pending</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">
                      Up to date
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Last Sync */}
            {lastSyncTime && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last Sync:</span>
                <span className="text-gray-900">
                  {formatDistanceToNow(new Date(lastSyncTime), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            )}

            {/* Pending Actions */}
            {pendingCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Pending Changes:</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-600 font-medium">
                    {pendingCount}
                  </span>
                </div>
              </div>
            )}

            {/* Failed Actions */}
            {failedCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Failed Syncs:</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-red-600 font-medium">
                      {failedCount}
                    </span>
                  </div>
                  <button
                    onClick={handleRetryFailed}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Action Lists */}
            {(pendingActions.length > 0 || failedActions.length > 0) && (
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-xs font-medium text-gray-700">
                  Recent Actions:
                </h4>

                <div className="max-h-32 overflow-y-auto space-y-1">
                  {/* Failed Actions */}
                  {failedActions.slice(0, 3).map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between text-xs p-2 bg-red-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <span className="text-red-700 capitalize">
                          {action.type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-red-500">Failed</span>
                    </div>
                  ))}

                  {/* Pending Actions */}
                  {pendingActions.slice(0, 3).map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between text-xs p-2 bg-blue-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span className="text-blue-700 capitalize">
                          {action.type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-blue-500">Pending</span>
                    </div>
                  ))}
                </div>

                {pendingActions.length + failedActions.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{pendingActions.length + failedActions.length - 3} more
                    actions
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              {isOnline && (
                <button
                  onClick={handleManualSync}
                  disabled={syncInProgress}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw
                    className={cn('w-3 h-3', syncInProgress && 'animate-spin')}
                  />
                  {syncInProgress ? 'Syncing...' : 'Sync Now'}
                </button>
              )}

              <button
                onClick={() => setShowDetails(false)}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
