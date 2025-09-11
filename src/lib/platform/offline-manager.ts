'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface NetworkStatus {
  isOffline: boolean;
  isOnline: boolean;
  connectionType: string;
  connectionSpeed: number | null;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  lastOnlineTime: Date | null;
  reconnectionAttempts: number;
  isReconnecting: boolean;
}

interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

interface OfflineManagerOptions {
  enableAutoSync?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  syncOnReconnect?: boolean;
  persistActions?: boolean;
  enableNotifications?: boolean;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
    if (typeof window === 'undefined') {
      return {
        isOffline: false,
        isOnline: true,
        connectionType: 'unknown',
        connectionSpeed: null,
        connectionQuality: 'good',
        lastOnlineTime: new Date(),
        reconnectionAttempts: 0,
        isReconnecting: false,
      };
    }

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    return {
      isOffline: !navigator.onLine,
      isOnline: navigator.onLine,
      connectionType: connection?.effectiveType || 'unknown',
      connectionSpeed: connection?.downlink || null,
      connectionQuality: getConnectionQuality(connection?.effectiveType),
      lastOnlineTime: navigator.onLine ? new Date() : null,
      reconnectionAttempts: 0,
      isReconnecting: false,
    };
  });

  function getConnectionQuality(
    effectiveType: string,
  ): NetworkStatus['connectionQuality'] {
    switch (effectiveType) {
      case '4g':
        return 'excellent';
      case '3g':
        return 'good';
      case '2g':
        return 'fair';
      case 'slow-2g':
        return 'poor';
      default:
        return navigator.onLine ? 'good' : 'offline';
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setNetworkStatus((prev) => ({
        ...prev,
        isOffline: false,
        isOnline: true,
        lastOnlineTime: new Date(),
        reconnectionAttempts: 0,
        isReconnecting: false,
      }));
    };

    const handleOffline = () => {
      setNetworkStatus((prev) => ({
        ...prev,
        isOffline: true,
        isOnline: false,
        connectionQuality: 'offline',
      }));
    };

    const handleConnectionChange = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        setNetworkStatus((prev) => ({
          ...prev,
          connectionType: connection.effectiveType || 'unknown',
          connectionSpeed: connection.downlink || null,
          connectionQuality: getConnectionQuality(connection.effectiveType),
        }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkStatus;
};

export const useOfflineManager = (options: OfflineManagerOptions = {}) => {
  const {
    enableAutoSync = true,
    maxRetries = 3,
    retryDelay = 1000,
    syncOnReconnect = true,
    persistActions = true,
    enableNotifications = true,
  } = options;

  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const networkStatus = useNetworkStatus();

  // Load persisted actions from localStorage
  useEffect(() => {
    if (persistActions && typeof window !== 'undefined') {
      try {
        const storedActions = localStorage.getItem('offline_actions');
        if (storedActions) {
          const actions = JSON.parse(storedActions).map((action: any) => ({
            ...action,
            timestamp: new Date(action.timestamp),
          }));
          setOfflineActions(actions);
        }
      } catch (error) {
        console.warn(
          'Failed to load offline actions from localStorage:',
          error,
        );
      }
    }
  }, [persistActions]);

  // Persist actions to localStorage
  useEffect(() => {
    if (persistActions && typeof window !== 'undefined') {
      try {
        localStorage.setItem('offline_actions', JSON.stringify(offlineActions));
      } catch (error) {
        console.warn(
          'Failed to persist offline actions to localStorage:',
          error,
        );
      }
    }
  }, [offlineActions, persistActions]);

  // Queue an action for offline execution
  const queueAction = useCallback(
    (type: string, data: any, maxRetriesOverride?: number) => {
      const action: OfflineAction = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: maxRetriesOverride || maxRetries,
      };

      setOfflineActions((prev) => [...prev, action]);

      // If online, try to execute immediately
      if (networkStatus.isOnline && enableAutoSync) {
        executeAction(action);
      }

      return action.id;
    },
    [networkStatus.isOnline, enableAutoSync, maxRetries],
  );

  // Execute a single action
  const executeAction = useCallback(
    async (action: OfflineAction): Promise<boolean> => {
      try {
        // This would be replaced with actual API calls
        console.log('Executing action:', action);

        // Simulate API call
        const success = await new Promise<boolean>((resolve) => {
          setTimeout(() => {
            // Simulate 90% success rate
            resolve(Math.random() > 0.1);
          }, 500);
        });

        if (success) {
          // Remove successful action
          setOfflineActions((prev) => prev.filter((a) => a.id !== action.id));
          return true;
        } else {
          throw new Error('API call failed');
        }
      } catch (error) {
        console.warn(`Action ${action.id} failed:`, error);

        // Increment retry count
        setOfflineActions((prev) =>
          prev.map((a) =>
            a.id === action.id ? { ...a, retryCount: a.retryCount + 1 } : a,
          ),
        );

        // Schedule retry if within limits
        if (action.retryCount < action.maxRetries) {
          const delay = retryDelay * Math.pow(2, action.retryCount); // Exponential backoff
          const timeoutId = setTimeout(() => {
            executeAction({ ...action, retryCount: action.retryCount + 1 });
            retryTimeoutsRef.current.delete(action.id);
          }, delay);

          retryTimeoutsRef.current.set(action.id, timeoutId);
        } else {
          // Max retries reached, mark as failed
          console.error(
            `Action ${action.id} failed after ${action.maxRetries} retries`,
          );

          if (enableNotifications && 'Notification' in window) {
            new Notification('Sync Failed', {
              body: `Failed to sync ${action.type} after ${action.maxRetries} attempts`,
              icon: '/icons/warning.png',
            });
          }
        }

        return false;
      }
    },
    [retryDelay, enableNotifications],
  );

  // Sync all pending actions
  const syncAllActions = useCallback(async () => {
    if (isSyncing || !networkStatus.isOnline) return;

    setIsSyncing(true);
    setSyncProgress(0);

    const actionsToSync = [...offlineActions];
    let completedCount = 0;

    for (const action of actionsToSync) {
      const success = await executeAction(action);
      completedCount++;
      setSyncProgress((completedCount / actionsToSync.length) * 100);

      // Add small delay between requests to avoid overwhelming the server
      if (completedCount < actionsToSync.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    setIsSyncing(false);
    setSyncProgress(0);

    if (
      enableNotifications &&
      'Notification' in window &&
      actionsToSync.length > 0
    ) {
      new Notification('Sync Complete', {
        body: `Successfully synced ${completedCount} actions`,
        icon: '/icons/success.png',
      });
    }
  }, [
    isSyncing,
    networkStatus.isOnline,
    offlineActions,
    executeAction,
    enableNotifications,
  ]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (
      networkStatus.isOnline &&
      syncOnReconnect &&
      offlineActions.length > 0
    ) {
      syncAllActions();
    }
  }, [
    networkStatus.isOnline,
    syncOnReconnect,
    offlineActions.length,
    syncAllActions,
  ]);

  // Clear failed actions
  const clearFailedActions = useCallback(() => {
    setOfflineActions((prev) =>
      prev.filter((action) => action.retryCount < action.maxRetries),
    );
  }, []);

  // Get actions by status
  const getActionsByStatus = useCallback(() => {
    const pending = offlineActions.filter(
      (action) => action.retryCount < action.maxRetries,
    );
    const failed = offlineActions.filter(
      (action) => action.retryCount >= action.maxRetries,
    );

    return { pending, failed, total: offlineActions.length };
  }, [offlineActions]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      retryTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      retryTimeoutsRef.current.clear();
    };
  }, []);

  return {
    networkStatus,
    queueAction,
    syncAllActions,
    clearFailedActions,
    getActionsByStatus,
    isSyncing,
    syncProgress,
    pendingActions: offlineActions.length,
    isOffline: networkStatus.isOffline,
  };
};

// Music-specific offline manager
export const useMusicOfflineManager = () => {
  const offlineManager = useOfflineManager({
    enableAutoSync: true,
    maxRetries: 5,
    retryDelay: 2000,
    syncOnReconnect: true,
    persistActions: true,
  });

  // Music-specific actions
  const addToPlaylist = useCallback(
    (trackId: string, playlistId: string) => {
      return offlineManager.queueAction('ADD_TO_PLAYLIST', {
        trackId,
        playlistId,
        timestamp: new Date().toISOString(),
      });
    },
    [offlineManager],
  );

  const removeFromPlaylist = useCallback(
    (trackId: string, playlistId: string) => {
      return offlineManager.queueAction('REMOVE_FROM_PLAYLIST', {
        trackId,
        playlistId,
        timestamp: new Date().toISOString(),
      });
    },
    [offlineManager],
  );

  const updatePlaylistOrder = useCallback(
    (playlistId: string, trackOrder: string[]) => {
      return offlineManager.queueAction('UPDATE_PLAYLIST_ORDER', {
        playlistId,
        trackOrder,
        timestamp: new Date().toISOString(),
      });
    },
    [offlineManager],
  );

  const markTrackPlayed = useCallback(
    (trackId: string, playedAt: Date, duration: number) => {
      return offlineManager.queueAction('MARK_TRACK_PLAYED', {
        trackId,
        playedAt: playedAt.toISOString(),
        duration,
        timestamp: new Date().toISOString(),
      });
    },
    [offlineManager],
  );

  const saveSearchQuery = useCallback(
    (query: string, results: any[]) => {
      return offlineManager.queueAction('SAVE_SEARCH_QUERY', {
        query,
        results,
        timestamp: new Date().toISOString(),
      });
    },
    [offlineManager],
  );

  return {
    ...offlineManager,
    // Music-specific methods
    addToPlaylist,
    removeFromPlaylist,
    updatePlaylistOrder,
    markTrackPlayed,
    saveSearchQuery,
  };
};

export default useOfflineManager;
