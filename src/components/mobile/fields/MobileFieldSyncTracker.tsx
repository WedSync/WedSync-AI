'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  WifiIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline';
import { TouchButton } from '../touch/TouchButton';
import { useCoreFieldsStore } from '@/lib/stores/coreFieldsStore';

interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: string | null;
  pendingFields: number;
  syncInProgress: boolean;
  syncErrors: string[];
  connectedVendors: number;
  totalVendors: number;
}

interface MobileFieldSyncTrackerProps {
  className?: string;
  compact?: boolean;
  onSyncTrigger?: () => void;
}

export function MobileFieldSyncTracker({
  className = '',
  compact = false,
  onSyncTrigger,
}: MobileFieldSyncTrackerProps) {
  const { triggerSync, getSyncStatus, lastSyncJob } = useCoreFieldsStore();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    lastSyncTime: null,
    pendingFields: 0,
    syncInProgress: false,
    syncErrors: [],
    connectedVendors: 0,
    totalVendors: 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () =>
      setSyncStatus((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () =>
      setSyncStatus((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Poll sync status if there's an active job
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (lastSyncJob && syncStatus.syncInProgress) {
      pollInterval = setInterval(async () => {
        try {
          const status = await getSyncStatus(lastSyncJob);

          setSyncStatus((prev) => ({
            ...prev,
            syncInProgress:
              status.status === 'pending' || status.status === 'in_progress',
            syncErrors:
              status.results
                ?.filter((r) => r.status === 'failed')
                .map((r) => r.error || 'Unknown error') || [],
            lastSyncTime: status.completedAt || prev.lastSyncTime,
          }));

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.error('Failed to get sync status:', error);
        }
      }, 2000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [lastSyncJob, syncStatus.syncInProgress, getSyncStatus]);

  const handleManualSync = async () => {
    try {
      setSyncStatus((prev) => ({ ...prev, syncInProgress: true }));
      await triggerSync();
      onSyncTrigger?.();
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncStatus((prev) => ({
        ...prev,
        syncInProgress: false,
        syncErrors: ['Manual sync failed'],
      }));
    }
  };

  const getSyncStatusColor = () => {
    if (!syncStatus.isOnline) return 'text-gray-500';
    if (syncStatus.syncErrors.length > 0) return 'text-red-500';
    if (syncStatus.syncInProgress) return 'text-orange-500';
    if (syncStatus.lastSyncTime) return 'text-green-500';
    return 'text-gray-400';
  };

  const getSyncStatusIcon = () => {
    if (!syncStatus.isOnline) return <SignalSlashIcon className="h-4 w-4" />;
    if (syncStatus.syncErrors.length > 0)
      return <ExclamationCircleIcon className="h-4 w-4" />;
    if (syncStatus.syncInProgress)
      return <ArrowPathIcon className="h-4 w-4 animate-spin" />;
    if (syncStatus.lastSyncTime) return <CheckCircleIcon className="h-4 w-4" />;
    return <ClockIcon className="h-4 w-4" />;
  };

  const getSyncStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.syncErrors.length > 0) return 'Sync failed';
    if (syncStatus.syncInProgress) return 'Syncing...';
    if (syncStatus.lastSyncTime) {
      const syncTime = new Date(syncStatus.lastSyncTime);
      const now = new Date();
      const diffMinutes = Math.floor(
        (now.getTime() - syncTime.getTime()) / (1000 * 60),
      );

      if (diffMinutes === 0) return 'Just synced';
      if (diffMinutes < 60) return `Synced ${diffMinutes}m ago`;
      return `Synced ${syncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Not synced';
  };

  if (compact) {
    return (
      <TouchButton
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border bg-white ${className}`}
      >
        <div className={getSyncStatusColor()}>{getSyncStatusIcon()}</div>
        <span className="text-sm text-gray-600">{getSyncStatusText()}</span>
        {syncStatus.pendingFields > 0 && (
          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
            {syncStatus.pendingFields}
          </span>
        )}
      </TouchButton>
    );
  }

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-full ${
                syncStatus.isOnline ? 'bg-green-100' : 'bg-gray-100'
              }`}
            >
              {syncStatus.isOnline ? (
                <WifiIcon className="h-4 w-4 text-green-600" />
              ) : (
                <SignalSlashIcon className="h-4 w-4 text-gray-500" />
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <div className={getSyncStatusColor()}>
                  {getSyncStatusIcon()}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {getSyncStatusText()}
                </span>
              </div>

              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                {syncStatus.connectedVendors > 0 && (
                  <span>
                    {syncStatus.connectedVendors}/{syncStatus.totalVendors}{' '}
                    vendors connected
                  </span>
                )}
                {syncStatus.pendingFields > 0 && (
                  <span className="text-orange-600">
                    {syncStatus.pendingFields} changes pending
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sync Button */}
          <TouchButton
            onClick={handleManualSync}
            disabled={syncStatus.syncInProgress || !syncStatus.isOnline}
            className={`px-4 py-2 rounded-lg text-sm ${
              syncStatus.syncInProgress || !syncStatus.isOnline
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            {syncStatus.syncInProgress ? (
              <div className="flex items-center space-x-2">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span>Syncing</span>
              </div>
            ) : (
              'Sync Now'
            )}
          </TouchButton>
        </div>

        {/* Error Messages */}
        {syncStatus.syncErrors.length > 0 && (
          <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start space-x-2">
              <ExclamationCircleIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-800 font-medium">Sync Issues</p>
                <ul className="mt-1 text-xs text-red-600 space-y-1">
                  {syncStatus.syncErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Offline Notice */}
        {!syncStatus.isOnline && (
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2">
              <SignalSlashIcon className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                You're offline. Changes will sync when connection is restored.
              </p>
            </div>
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Last sync:</span>
                <p className="font-medium text-gray-900">
                  {syncStatus.lastSyncTime
                    ? new Date(syncStatus.lastSyncTime).toLocaleString()
                    : 'Never'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Connection:</span>
                <p
                  className={`font-medium ${syncStatus.isOnline ? 'text-green-600' : 'text-red-600'}`}
                >
                  {syncStatus.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expand/Collapse Toggle */}
        <TouchButton
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 py-2 text-xs text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? 'Show less' : 'Show details'}
        </TouchButton>
      </div>
    </div>
  );
}
