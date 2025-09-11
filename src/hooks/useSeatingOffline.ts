/**
 * Seating Offline Hook - WS-154 PWA Implementation
 *
 * React hook for managing offline functionality in seating interface:
 * - Service worker registration and management
 * - Offline storage operations
 * - Background sync coordination
 * - Network status monitoring
 * - Cache management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { seatingOfflineStorage } from '@/lib/offline/seating-offline-storage';
import type {
  SeatingArrangement,
  Guest,
  SeatingTable,
  SeatingChange,
  OfflineSeatingCache,
} from '@/types/mobile-seating';

interface UseSeatingOfflineReturn {
  // Status
  isOffline: boolean;
  isSyncing: boolean;
  hasOfflineData: boolean;
  serviceWorkerReady: boolean;

  // Data operations
  storeArrangementOffline: (arrangement: SeatingArrangement) => Promise<void>;
  getArrangementOffline: (id: string) => Promise<SeatingArrangement | null>;
  storeGuestsOffline: (guests: Guest[]) => Promise<void>;
  getGuestsOffline: (tableId?: string) => Promise<Guest[]>;

  // Change management
  queueOfflineChange: (change: Omit<SeatingChange, 'id'>) => Promise<string>;
  getPendingChangesCount: () => Promise<number>;
  forcSync: () => Promise<void>;

  // Cache management
  clearOfflineData: () => Promise<void>;
  getStorageStats: () => Promise<{
    arrangements: number;
    guests: number;
    tables: number;
    pendingChanges: number;
    totalSize: number;
  }>;

  // Utility
  registerServiceWorker: () => Promise<ServiceWorkerRegistration | null>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
}

export function useSeatingOffline(): UseSeatingOfflineReturn {
  // State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasOfflineData, setHasOfflineData] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  // Refs
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null);
  const syncAbortController = useRef<AbortController | null>(null);

  /**
   * Initialize offline functionality
   */
  useEffect(() => {
    initializeOfflineSupport();
    setupNetworkListeners();
    setupServiceWorkerListeners();

    return () => {
      // Cleanup
      if (syncAbortController.current) {
        syncAbortController.current.abort();
      }
    };
  }, []);

  /**
   * Monitor offline data availability
   */
  useEffect(() => {
    checkOfflineDataAvailability();
  }, []);

  /**
   * Initialize offline storage and service worker
   */
  const initializeOfflineSupport = useCallback(async () => {
    try {
      // Initialize IndexedDB
      await seatingOfflineStorage.initialize();
      console.log('Seating offline storage initialized');

      // Register service worker
      const registration = await registerServiceWorker();
      if (registration) {
        swRegistration.current = registration;
        setServiceWorkerReady(true);
        console.log('Seating service worker registered');
      }

      // Check for offline data
      await checkOfflineDataAvailability();
    } catch (error) {
      console.error('Failed to initialize offline support:', error);
    }
  }, []);

  /**
   * Set up network status listeners
   */
  const setupNetworkListeners = useCallback(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.log('Network: Back online');

      // Trigger sync when coming back online
      if (swRegistration.current) {
        navigator.serviceWorker.ready
          .then((registration) => {
            return registration.sync.register('seating-sync');
          })
          .catch((error) => {
            console.warn('Background sync not available:', error);
          });
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      console.log('Network: Gone offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Set up service worker message listeners
   */
  const setupServiceWorkerListeners = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, syncedCount } = event.data;

        switch (type) {
          case 'SYNC_COMPLETE':
            setIsSyncing(false);
            console.log(`Sync complete: ${syncedCount} changes synced`);

            // Trigger data refresh
            checkOfflineDataAvailability();

            // Notify UI of successful sync
            if (syncedCount > 0) {
              showSyncNotification(syncedCount);
            }
            break;

          case 'SYNC_FAILED':
            setIsSyncing(false);
            console.error('Background sync failed');
            break;
        }
      });
    }
  }, []);

  /**
   * Register service worker
   */
  const registerServiceWorker =
    useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported');
        return null;
      }

      try {
        const registration = await navigator.serviceWorker.register(
          '/sw-seating.js',
          {
            scope: '/wedme/seating',
          },
        );

        console.log('Service Worker registered successfully:', registration);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                console.log('New service worker installed');
                // Optionally prompt user to refresh
              }
            });
          }
        });

        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
      }
    }, []);

  /**
   * Check if offline data is available
   */
  const checkOfflineDataAvailability = useCallback(async () => {
    try {
      const stats = await seatingOfflineStorage.getStorageStats();
      setHasOfflineData(stats.arrangements > 0 || stats.guests > 0);
    } catch (error) {
      console.error('Failed to check offline data:', error);
      setHasOfflineData(false);
    }
  }, []);

  /**
   * Store arrangement for offline access
   */
  const storeArrangementOffline = useCallback(
    async (arrangement: SeatingArrangement) => {
      try {
        await seatingOfflineStorage.storeArrangement(arrangement);
        setHasOfflineData(true);
        console.log('Arrangement stored offline:', arrangement.id);
      } catch (error) {
        console.error('Failed to store arrangement offline:', error);
        throw error;
      }
    },
    [],
  );

  /**
   * Get arrangement from offline storage
   */
  const getArrangementOffline = useCallback(
    async (id: string): Promise<SeatingArrangement | null> => {
      try {
        return await seatingOfflineStorage.getArrangement(id);
      } catch (error) {
        console.error('Failed to get arrangement offline:', error);
        return null;
      }
    },
    [],
  );

  /**
   * Store guests for offline access
   */
  const storeGuestsOffline = useCallback(async (guests: Guest[]) => {
    try {
      await seatingOfflineStorage.storeGuests(guests);
      setHasOfflineData(true);
      console.log(`${guests.length} guests stored offline`);
    } catch (error) {
      console.error('Failed to store guests offline:', error);
      throw error;
    }
  }, []);

  /**
   * Get guests from offline storage
   */
  const getGuestsOffline = useCallback(
    async (tableId?: string): Promise<Guest[]> => {
      try {
        return await seatingOfflineStorage.getGuests(tableId);
      } catch (error) {
        console.error('Failed to get guests offline:', error);
        return [];
      }
    },
    [],
  );

  /**
   * Queue change for offline sync
   */
  const queueOfflineChange = useCallback(
    async (change: Omit<SeatingChange, 'id'>): Promise<string> => {
      try {
        const changeId = await seatingOfflineStorage.queueChange({
          ...change,
          timestamp: new Date(),
          syncStatus: 'pending',
        });

        console.log('Change queued for sync:', changeId);
        return changeId;
      } catch (error) {
        console.error('Failed to queue change:', error);
        throw error;
      }
    },
    [],
  );

  /**
   * Get count of pending changes
   */
  const getPendingChangesCount = useCallback(async (): Promise<number> => {
    try {
      const pendingChanges = await seatingOfflineStorage.getPendingChanges();
      return pendingChanges.length;
    } catch (error) {
      console.error('Failed to get pending changes count:', error);
      return 0;
    }
  }, []);

  /**
   * Force sync pending changes
   */
  const forcSync = useCallback(async (): Promise<void> => {
    if (!swRegistration.current) {
      console.warn('Service worker not available for sync');
      return;
    }

    setIsSyncing(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('seating-sync');
      console.log('Force sync requested');
    } catch (error) {
      console.error('Failed to force sync:', error);
      setIsSyncing(false);
      throw error;
    }
  }, []);

  /**
   * Clear all offline data
   */
  const clearOfflineData = useCallback(async (): Promise<void> => {
    try {
      await seatingOfflineStorage.clearAll();
      setHasOfflineData(false);
      console.log('Offline data cleared');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }, []);

  /**
   * Get storage usage statistics
   */
  const getStorageStats = useCallback(async () => {
    try {
      return await seatingOfflineStorage.getStorageStats();
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        arrangements: 0,
        guests: 0,
        tables: 0,
        pendingChanges: 0,
        totalSize: 0,
      };
    }
  }, []);

  /**
   * Request notification permission
   */
  const requestNotificationPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      if (!('Notification' in window)) {
        console.warn('Notifications not supported');
        return 'denied';
      }

      if (Notification.permission === 'granted') {
        return 'granted';
      }

      if (Notification.permission === 'denied') {
        return 'denied';
      }

      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
      return permission;
    }, []);

  /**
   * Show sync success notification
   */
  const showSyncNotification = useCallback((syncedCount: number) => {
    if (Notification.permission === 'granted') {
      new Notification('WedSync Seating', {
        body: `${syncedCount} changes synced successfully`,
        icon: '/icons/seating-icon-192.png',
        tag: 'seating-sync',
      });
    }
  }, []);

  return {
    // Status
    isOffline,
    isSyncing,
    hasOfflineData,
    serviceWorkerReady,

    // Data operations
    storeArrangementOffline,
    getArrangementOffline,
    storeGuestsOffline,
    getGuestsOffline,

    // Change management
    queueOfflineChange,
    getPendingChangesCount,
    forcSync,

    // Cache management
    clearOfflineData,
    getStorageStats,

    // Utility
    registerServiceWorker,
    requestNotificationPermission,
  };
}
