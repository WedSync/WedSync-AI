'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskCategory, CategorySyncStatus } from '@/types/task-categories';
import { CategoryOfflineSync } from '@/lib/offline/category-sync/CategoryOfflineSync';
import { cn } from '@/lib/utils';
import {
  WifiIcon,
  ArrowPathIcon,
  CloudIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface PWACategoryManagerProps {
  organizationId: string;
  categories: TaskCategory[];
  onCategoriesUpdate: (categories: TaskCategory[]) => void;
  className?: string;
}

interface ConnectionStatus {
  isOnline: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  lastSync?: Date;
}

export default function PWACategoryManager({
  organizationId,
  categories: propCategories,
  onCategoriesUpdate,
  className,
}: PWACategoryManagerProps) {
  const [categories, setCategories] = useState<TaskCategory[]>(propCategories);
  const [syncStatus, setSyncStatus] = useState<CategorySyncStatus[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    isInstalled: false,
    canInstall: false,
    syncStatus: 'idle',
  });

  const [offlineSync, setOfflineSync] = useState<CategoryOfflineSync | null>(
    null,
  );
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  // Initialize PWA and offline capabilities
  useEffect(() => {
    const initializePWA = async () => {
      // Initialize offline sync
      const sync = new CategoryOfflineSync(organizationId);
      setOfflineSync(sync);

      // Register service worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          setServiceWorkerRegistration(registration);
          console.log('Service Worker registered successfully');
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }

      // Check if app is already installed
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setConnectionStatus((prev) => ({ ...prev, isInstalled: true }));
      }

      // Load cached categories
      const cachedCategories = await sync.getCategories();
      if (cachedCategories.length > 0) {
        setCategories(cachedCategories);
        onCategoriesUpdate(cachedCategories);
      }

      // Get initial sync status
      const status = await sync.getSyncStatus();
      setSyncStatus(status);
    };

    initializePWA();

    // Set up event listeners
    const handleOnline = () => {
      setConnectionStatus((prev) => ({ ...prev, isOnline: true }));
      if (offlineSync) {
        offlineSync.syncAll();
      }
    };

    const handleOffline = () => {
      setConnectionStatus((prev) => ({ ...prev, isOnline: false }));
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setConnectionStatus((prev) => ({ ...prev, canInstall: true }));
    };

    const handleAppInstalled = () => {
      setConnectionStatus((prev) => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
      }));
      setDeferredPrompt(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);

      if (offlineSync) {
        offlineSync.destroy();
      }
    };
  }, [organizationId, offlineSync, onCategoriesUpdate]);

  // Handle service worker messages
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        const { type, data } = event.data;

        switch (type) {
          case 'SYNC_COMPLETE':
            if (data.entity === 'categories') {
              setConnectionStatus((prev) => ({
                ...prev,
                syncStatus: 'success',
                lastSync: new Date(),
              }));
              refreshSyncStatus();
            }
            break;

          case 'SYNC_ERROR':
            setConnectionStatus((prev) => ({ ...prev, syncStatus: 'error' }));
            break;
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  // Refresh sync status
  const refreshSyncStatus = useCallback(async () => {
    if (offlineSync) {
      const status = await offlineSync.getSyncStatus();
      setSyncStatus(status);
    }
  }, [offlineSync]);

  // Handle manual sync
  const handleManualSync = useCallback(async () => {
    if (!offlineSync) return;

    setConnectionStatus((prev) => ({ ...prev, syncStatus: 'syncing' }));

    try {
      await offlineSync.syncAll();
      setConnectionStatus((prev) => ({
        ...prev,
        syncStatus: 'success',
        lastSync: new Date(),
      }));
      await refreshSyncStatus();
    } catch (error) {
      setConnectionStatus((prev) => ({ ...prev, syncStatus: 'error' }));
      console.error('Manual sync failed:', error);
    }
  }, [offlineSync, refreshSyncStatus]);

  // Handle PWA installation
  const handleInstallPWA = useCallback(async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installation accepted');
    } else {
      console.log('PWA installation dismissed');
    }

    setDeferredPrompt(null);
    setConnectionStatus((prev) => ({ ...prev, canInstall: false }));
  }, [deferredPrompt]);

  // Handle category update
  const handleCategoryUpdate = useCallback(
    async (category: TaskCategory) => {
      if (!offlineSync) return;

      // Update local state immediately
      const updatedCategories = categories.map((cat) =>
        cat.id === category.id ? category : cat,
      );
      setCategories(updatedCategories);
      onCategoriesUpdate(updatedCategories);

      // Save to offline storage
      await offlineSync.saveCategory(category);
      await refreshSyncStatus();
    },
    [categories, offlineSync, onCategoriesUpdate, refreshSyncStatus],
  );

  // Get connection status icon
  const getConnectionIcon = () => {
    if (!connectionStatus.isOnline) {
      return <XCircleIcon className="w-5 h-5 text-red-500" />;
    }

    switch (connectionStatus.syncStatus) {
      case 'syncing':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <WifiIcon className="w-5 h-5 text-green-500" />;
    }
  };

  // Get sync status message
  const getSyncStatusMessage = () => {
    if (!connectionStatus.isOnline) {
      return 'Offline - Changes will sync when online';
    }

    const pendingCount = syncStatus.reduce(
      (sum, status) => sum + status.pendingChanges,
      0,
    );

    if (pendingCount > 0) {
      return `${pendingCount} changes pending sync`;
    }

    if (connectionStatus.lastSync) {
      return `Last synced: ${connectionStatus.lastSync.toLocaleTimeString()}`;
    }

    return 'All changes synced';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* PWA Status Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getConnectionIcon()}
            <div>
              <div className="text-sm font-medium text-gray-900">
                {connectionStatus.isOnline ? 'Online' : 'Offline Mode'}
              </div>
              <div className="text-xs text-gray-500">
                {getSyncStatusMessage()}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Manual Sync Button */}
            <button
              onClick={handleManualSync}
              className={cn(
                'p-2 rounded-lg transition-colors',
                connectionStatus.isOnline
                  ? 'text-blue-600 hover:bg-blue-50'
                  : 'text-gray-400 cursor-not-allowed',
              )}
              disabled={
                !connectionStatus.isOnline ||
                connectionStatus.syncStatus === 'syncing'
              }
            >
              <ArrowPathIcon
                className={cn(
                  'w-5 h-5',
                  connectionStatus.syncStatus === 'syncing' && 'animate-spin',
                )}
              />
            </button>

            {/* PWA Install Button */}
            {connectionStatus.canInstall && (
              <button
                onClick={handleInstallPWA}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Install App
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Offline Banner */}
      <AnimatePresence>
        {!connectionStatus.isOnline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
          >
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              <div className="text-sm text-yellow-800">
                You're offline. Changes will be saved locally and synced when
                connection is restored.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Features Info */}
      {connectionStatus.isInstalled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-xl p-4"
        >
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <div className="text-sm font-medium text-green-800">
              App Installed Successfully
            </div>
          </div>
          <div className="text-xs text-green-700">
            You can now use WedSync offline and receive push notifications for
            important updates.
          </div>
        </motion.div>
      )}

      {/* Sync Status Details */}
      {syncStatus.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Category Sync Status
          </h4>
          <div className="space-y-2">
            {syncStatus.map((status) => {
              const category = categories.find(
                (cat) => cat.id === status.categoryId,
              );
              if (!category) return null;

              return (
                <div
                  key={status.categoryId}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-gray-900">
                      {category.display_name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {status.pendingChanges > 0 && (
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                        {status.pendingChanges} pending
                      </span>
                    )}
                    {status.syncError && (
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                        Error
                      </span>
                    )}
                    {!status.pendingChanges && !status.syncError && (
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cache Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Storage Management
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Cached Categories</span>
            <span className="text-sm font-medium text-gray-900">
              {categories.length} items
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Offline Storage</span>
            <button
              onClick={async () => {
                if (offlineSync) {
                  await offlineSync.clearOfflineData();
                  await refreshSyncStatus();
                }
              }}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
