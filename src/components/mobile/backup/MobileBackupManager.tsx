'use client';

import { useState, useEffect, useTransition, useActionState } from 'react';
import { motion } from 'framer-motion';
import {
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  ServerIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { createClient } from '@/utils/supabase/client';

interface BackupItem {
  id: string;
  type: 'wedding' | 'client' | 'form' | 'document' | 'photo';
  name: string;
  size: number;
  lastBackup: Date;
  status: 'active' | 'pending' | 'failed' | 'syncing';
  priority: 'critical' | 'high' | 'medium' | 'low';
  offlineAvailable: boolean;
}

interface BackupStats {
  totalSize: number;
  itemsBackedUp: number;
  lastFullBackup: Date | null;
  nextScheduledBackup: Date | null;
  storageUsed: number;
  storageLimit: number;
  offlineItemsCount: number;
}

type BackupAction =
  | { type: 'START_BACKUP'; payload: string[] }
  | { type: 'PAUSE_BACKUP' }
  | { type: 'RESUME_BACKUP' }
  | { type: 'CANCEL_BACKUP' }
  | { type: 'RESTORE_ITEM'; payload: string };

async function backupAction(
  prevState: any,
  formData: FormData,
): Promise<{
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  data?: any;
}> {
  const action = formData.get('action') as string;
  const itemId = formData.get('itemId') as string;

  try {
    const supabase = createClient();

    switch (action) {
      case 'backup':
        // Simulate backup process
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return {
          status: 'success',
          message: `Backup completed for ${itemId}`,
        };
      case 'restore':
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return {
          status: 'success',
          message: `Restore completed for ${itemId}`,
        };
      case 'sync':
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          status: 'success',
          message: 'Sync completed successfully',
        };
      default:
        return {
          status: 'error',
          message: 'Unknown action',
        };
    }
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error ? error.message : 'Backup operation failed',
    };
  }
}

export default function MobileBackupManager() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [backupItems, setBackupItems] = useState<BackupItem[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionState, submitAction] = useActionState(backupAction, {
    status: 'idle' as const,
    message: '',
  });

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      setIsOfflineMode(!navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Load backup data
    loadBackupData();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const loadBackupData = async () => {
    try {
      // Mock data - in real app, load from Supabase
      const mockItems: BackupItem[] = [
        {
          id: '1',
          type: 'wedding',
          name: 'Johnson Wedding Timeline',
          size: 2048000,
          lastBackup: new Date(Date.now() - 3600000),
          status: 'active',
          priority: 'critical',
          offlineAvailable: true,
        },
        {
          id: '2',
          type: 'client',
          name: 'Sarah & Mike Contact Info',
          size: 512000,
          lastBackup: new Date(Date.now() - 7200000),
          status: 'active',
          priority: 'high',
          offlineAvailable: true,
        },
        {
          id: '3',
          type: 'form',
          name: 'Bridal Prep Checklist',
          size: 256000,
          lastBackup: new Date(Date.now() - 86400000),
          status: 'pending',
          priority: 'medium',
          offlineAvailable: false,
        },
        {
          id: '4',
          type: 'document',
          name: 'Vendor Contracts',
          size: 8192000,
          lastBackup: new Date(Date.now() - 172800000),
          status: 'failed',
          priority: 'critical',
          offlineAvailable: false,
        },
      ];

      const mockStats: BackupStats = {
        totalSize: 11008000,
        itemsBackedUp: 3,
        lastFullBackup: new Date(Date.now() - 86400000),
        nextScheduledBackup: new Date(Date.now() + 3600000),
        storageUsed: 11008000,
        storageLimit: 100000000,
        offlineItemsCount: 2,
      };

      setBackupItems(mockItems);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to load backup data:', error);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const getStatusColor = (status: BackupItem['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      case 'syncing':
        return 'text-blue-600';
    }
  };

  const getStatusIcon = (status: BackupItem['status']) => {
    switch (status) {
      case 'active':
        return CheckCircleIcon;
      case 'pending':
        return ClockIcon;
      case 'failed':
        return ExclamationTriangleIcon;
      case 'syncing':
        return CloudArrowUpIcon;
    }
  };

  const getPriorityColor = (priority: BackupItem['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const selectAllItems = () => {
    setSelectedItems(backupItems.map((item) => item.id));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const handleBulkBackup = () => {
    if (selectedItems.length === 0) return;

    const formData = new FormData();
    formData.append('action', 'backup');
    formData.append('itemId', selectedItems.join(','));

    startTransition(() => {
      submitAction(formData);
    });
  };

  const handleItemRestore = (itemId: string) => {
    const formData = new FormData();
    formData.append('action', 'restore');
    formData.append('itemId', itemId);

    startTransition(() => {
      submitAction(formData);
    });
  };

  const handleSync = () => {
    const formData = new FormData();
    formData.append('action', 'sync');

    startTransition(() => {
      submitAction(formData);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Backup Manager</h1>
            <div className="flex items-center space-x-2">
              {isOfflineMode && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                  Offline
                </span>
              )}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="p-2 text-gray-400 hover:text-gray-600 touch-manipulation"
                style={{ minWidth: '48px', minHeight: '48px' }}
              >
                <CpuChipIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Status Message */}
          {actionState.message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-lg mb-4 ${
                actionState.status === 'error'
                  ? 'bg-red-50 text-red-700'
                  : actionState.status === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-blue-50 text-blue-700'
              }`}
            >
              {actionState.message}
            </motion.div>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <ServerIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">
                      Total Backed Up
                    </p>
                    <p className="text-lg font-bold text-blue-900">
                      {stats.itemsBackedUp}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <ShieldCheckIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">
                      Offline Ready
                    </p>
                    <p className="text-lg font-bold text-green-900">
                      {stats.offlineItemsCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleSync}
              disabled={isPending || isOfflineMode}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              style={{ minHeight: '48px' }}
            >
              {isPending ? (
                <span className="flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  <span className="ml-2">Syncing...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                  Sync All
                </span>
              )}
            </button>

            {selectedItems.length > 0 && (
              <button
                onClick={handleBulkBackup}
                disabled={isPending}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                style={{ minHeight: '48px' }}
              >
                Backup Selected ({selectedItems.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      {backupItems.length > 0 && (
        <div className="bg-white border-b px-4 py-3 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedItems.length} of {backupItems.length} selected
          </div>
          <div className="flex space-x-3">
            <button
              onClick={selectAllItems}
              className="text-blue-600 text-sm font-medium touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              className="text-gray-600 text-sm font-medium touch-manipulation"
              style={{ minHeight: '44px' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Backup Items List */}
      <div className="px-4 py-4">
        {backupItems.length === 0 ? (
          <div className="text-center py-12">
            <ServerIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Backup Items
            </h3>
            <p className="text-gray-500">
              Your wedding data will appear here for backup management.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {backupItems.map((item) => {
              const StatusIcon = getStatusIcon(item.status);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-lg border-2 p-4 ${
                    selectedItems.includes(item.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() => toggleItemSelection(item.id)}
                      className="mt-1 w-6 h-6 rounded border-2 border-gray-300 flex-shrink-0 flex items-center justify-center touch-manipulation"
                      style={{ minWidth: '44px', minHeight: '44px' }}
                    >
                      {selectedItems.includes(item.id) && (
                        <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {item.name}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-500">
                              {formatSize(item.size)}
                            </span>
                            <span
                              className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(item.priority)}`}
                            >
                              {item.priority}
                            </span>
                            {item.offlineAvailable && (
                              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                Offline
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <div className="text-right">
                            <div
                              className={`flex items-center text-sm ${getStatusColor(item.status)}`}
                            >
                              <StatusIcon className="h-4 w-4 mr-1" />
                              {item.status}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatTimeAgo(item.lastBackup)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={() => handleItemRestore(item.id)}
                          disabled={
                            isPending ||
                            (!item.offlineAvailable && isOfflineMode)
                          }
                          className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                          style={{ minHeight: '40px' }}
                        >
                          <CloudArrowDownIcon className="h-4 w-4 inline mr-1" />
                          Restore
                        </button>

                        {item.status === 'failed' && (
                          <button
                            onClick={() => {
                              const formData = new FormData();
                              formData.append('action', 'backup');
                              formData.append('itemId', item.id);
                              startTransition(() => submitAction(formData));
                            }}
                            disabled={isPending || isOfflineMode}
                            className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                            style={{ minHeight: '40px' }}
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced Options */}
      {showAdvanced && stats && (
        <div className="bg-white border-t px-4 py-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Storage & Advanced
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Storage Used</span>
                <span>
                  {formatSize(stats.storageUsed)} /{' '}
                  {formatSize(stats.storageLimit)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(stats.storageUsed / stats.storageLimit) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>
                Last full backup:{' '}
                {stats.lastFullBackup
                  ? formatTimeAgo(stats.lastFullBackup)
                  : 'Never'}
              </p>
              <p>
                Next scheduled:{' '}
                {stats.nextScheduledBackup
                  ? formatTimeAgo(stats.nextScheduledBackup)
                  : 'Not scheduled'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
