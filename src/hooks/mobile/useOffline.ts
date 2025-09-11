// WS-254 Team D: Offline Functionality Hook
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { OfflineAction } from '@/types/dietary-management';

interface OfflineQueue {
  actions: OfflineAction[];
  isOnline: boolean;
  lastSync: string | null;
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize online status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    // Set initial status
    updateOnlineStatus();

    // Listen for connection changes
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Load queued actions from localStorage
    const savedQueue = localStorage.getItem('wedsync_offline_queue');
    if (savedQueue) {
      try {
        const parsedQueue: OfflineAction[] = JSON.parse(savedQueue);
        setQueue(parsedQueue.filter((action) => !action.synced));
      } catch (error) {
        console.error('Failed to parse offline queue:', error);
      }
    }

    const savedLastSync = localStorage.getItem('wedsync_last_sync');
    if (savedLastSync) {
      setLastSync(savedLastSync);
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    if (queue.length > 0) {
      localStorage.setItem('wedsync_offline_queue', JSON.stringify(queue));
    } else {
      localStorage.removeItem('wedsync_offline_queue');
    }
  }, [queue]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) {
      // Delay sync slightly to ensure connection is stable
      syncTimeoutRef.current = setTimeout(() => {
        syncQueue();
      }, 1000);
    }
  }, [isOnline, queue.length, isSyncing]);

  const queueAction = useCallback(
    (type: OfflineAction['type'], data: any): string => {
      const action: OfflineAction = {
        id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now(),
        synced: false,
      };

      setQueue((prev) => [...prev, action]);

      // Try to sync immediately if online
      if (isOnline && !isSyncing) {
        setTimeout(() => syncQueue(), 100);
      }

      return action.id;
    },
    [isOnline, isSyncing],
  );

  const syncQueue = useCallback(async () => {
    if (isSyncing || !isOnline || queue.length === 0) {
      return;
    }

    setIsSyncing(true);

    try {
      const unsyncedActions = queue.filter((action) => !action.synced);
      const syncPromises = unsyncedActions.map(async (action) => {
        try {
          const response = await syncAction(action);
          if (response.success) {
            // Mark as synced
            setQueue((prev) =>
              prev.map((q) =>
                q.id === action.id ? { ...q, synced: true } : q,
              ),
            );
            return { success: true, actionId: action.id };
          } else {
            return {
              success: false,
              actionId: action.id,
              error: response.error,
            };
          }
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          return { success: false, actionId: action.id, error };
        }
      });

      const results = await Promise.allSettled(syncPromises);

      // Remove successfully synced actions
      setQueue((prev) => prev.filter((action) => !action.synced));

      // Update last sync time
      const now = new Date().toISOString();
      setLastSync(now);
      localStorage.setItem('wedsync_last_sync', now);

      // Send success message to service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_SUCCESS',
          data: { syncedCount: results.length, timestamp: now },
        });
      }
    } catch (error) {
      console.error('Queue sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, queue]);

  const syncAction = async (
    action: OfflineAction,
  ): Promise<{ success: boolean; error?: any }> => {
    const token = localStorage.getItem('supabase.auth.token');
    if (!token) {
      throw new Error('No authentication token available');
    }

    switch (action.type) {
      case 'create_requirement': {
        const response = await fetch('/api/catering/dietary/requirements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(action.data),
        });

        if (response.ok) {
          return { success: true };
        } else {
          const error = await response.text();
          return { success: false, error };
        }
      }

      case 'update_requirement': {
        const response = await fetch(
          `/api/catering/dietary/requirements/${action.data.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(action.data),
          },
        );

        if (response.ok) {
          return { success: true };
        } else {
          const error = await response.text();
          return { success: false, error };
        }
      }

      case 'delete_requirement': {
        const response = await fetch(
          `/api/catering/dietary/requirements/${action.data.id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.ok) {
          return { success: true };
        } else {
          const error = await response.text();
          return { success: false, error };
        }
      }

      case 'generate_menu': {
        const response = await fetch('/api/catering/menu/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(action.data),
        });

        if (response.ok) {
          return { success: true };
        } else {
          const error = await response.text();
          return { success: false, error };
        }
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  };

  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem('wedsync_offline_queue');
  }, []);

  const removeAction = useCallback((actionId: string) => {
    setQueue((prev) => prev.filter((action) => action.id !== actionId));
  }, []);

  const getQueueStatus = useCallback(() => {
    const total = queue.length;
    const synced = queue.filter((action) => action.synced).length;
    const pending = total - synced;

    return {
      total,
      synced,
      pending,
      oldestAction:
        queue.length > 0
          ? new Date(Math.min(...queue.map((a) => a.timestamp)))
          : null,
      newestAction:
        queue.length > 0
          ? new Date(Math.max(...queue.map((a) => a.timestamp)))
          : null,
    };
  }, [queue]);

  return {
    isOnline,
    queue,
    isSyncing,
    lastSync,
    queueAction,
    syncQueue,
    clearQueue,
    removeAction,
    getQueueStatus,
  };
}

// Hook for caching dietary data locally
export function useDietaryCache() {
  const [cachedData, setCachedData] = useState<any>(null);
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const CACHE_DURATION = 3600000; // 1 hour in milliseconds
  const CACHE_KEY = 'wedsync_dietary_cache';
  const TIMESTAMP_KEY = 'wedsync_dietary_cache_timestamp';

  useEffect(() => {
    // Load cached data on mount
    const loadCache = () => {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(TIMESTAMP_KEY);

      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < CACHE_DURATION) {
          try {
            setCachedData(JSON.parse(cached));
            setCacheTimestamp(timestamp);
          } catch (error) {
            console.error('Failed to parse cached dietary data:', error);
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(TIMESTAMP_KEY);
          }
        } else {
          // Cache expired
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(TIMESTAMP_KEY);
        }
      }
    };

    loadCache();
  }, []);

  const cacheData = useCallback((data: any) => {
    const timestamp = Date.now().toString();
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(TIMESTAMP_KEY, timestamp);
    setCachedData(data);
    setCacheTimestamp(timestamp);

    // Also cache in service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_DIETARY_DATA',
        payload: data,
      });
    }
  }, []);

  const clearCache = useCallback(() => {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(TIMESTAMP_KEY);
    setCachedData(null);
    setCacheTimestamp(null);
  }, []);

  const isCacheValid = useCallback(() => {
    if (!cacheTimestamp) return false;
    const age = Date.now() - parseInt(cacheTimestamp);
    return age < CACHE_DURATION;
  }, [cacheTimestamp]);

  const fetchWithCache = useCallback(
    async (url: string, options?: RequestInit) => {
      setIsLoading(true);

      try {
        // Return cached data if valid and we're offline
        if (!navigator.onLine && cachedData && isCacheValid()) {
          return cachedData;
        }

        const response = await fetch(url, options);

        if (response.ok) {
          const data = await response.json();
          cacheData(data);
          return data;
        } else {
          // If request failed and we have cached data, return that
          if (cachedData && isCacheValid()) {
            return cachedData;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        // Return cached data if available on error
        if (cachedData && isCacheValid()) {
          return cachedData;
        }
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [cachedData, isCacheValid, cacheData],
  );

  return {
    cachedData,
    cacheTimestamp,
    isLoading,
    cacheData,
    clearCache,
    isCacheValid,
    fetchWithCache,
  };
}
