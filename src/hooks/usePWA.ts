'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getOfflineSyncManager, SyncEvent } from '@/lib/pwa/offline-sync';

interface PWACapabilities {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  hasServiceWorker: boolean;
  hasPushNotifications: boolean;
  hasBackgroundSync: boolean;
  hasPeriodicBackgroundSync: boolean;
}

interface SyncStatus {
  isOnline: boolean;
  queueSize: number;
  pendingCount: number;
  failedCount: number;
  criticalCount: number;
  lastSyncAttempt?: Date;
  isCurrentlySyncing: boolean;
}

interface PWAState {
  capabilities: PWACapabilities;
  syncStatus: SyncStatus;
  installPrompt: BeforeInstallPromptEvent | null;
  pushSubscription: PushSubscription | null;
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
  offlineIncidentCount: number;
}

interface UsePWAReturn extends PWAState {
  // Installation
  canInstall: boolean;
  promptInstall: () => Promise<boolean>;

  // Service Worker
  registerServiceWorker: () => Promise<boolean>;
  updateServiceWorker: () => Promise<boolean>;

  // Push Notifications
  requestNotificationPermission: () => Promise<boolean>;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;

  // Offline Sync
  addToSyncQueue: (
    type: string,
    data: any,
    priority?: 'low' | 'medium' | 'high' | 'critical',
  ) => Promise<string>;
  forceSyncItem: (itemId: string) => Promise<boolean>;
  triggerManualSync: () => Promise<void>;
  clearExpiredItems: () => number;

  // Incident Response Specific
  reportOfflineIncident: (incident: any) => Promise<string>;
  cacheEmergencyContacts: (contacts: any[]) => Promise<void>;
  getOfflineIncidents: () => Promise<any[]>;

  // Utility
  checkOnlineStatus: () => boolean;
  getStorageUsage: () => Promise<StorageEstimate | null>;
  clearOfflineData: () => Promise<void>;
}

export function usePWA(): UsePWAReturn {
  const [state, setState] = useState<PWAState>({
    capabilities: {
      isInstallable: false,
      isInstalled: false,
      isOnline: navigator.onLine,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPushNotifications: 'PushManager' in window,
      hasBackgroundSync:
        'serviceWorker' in navigator &&
        'sync' in window.ServiceWorkerRegistration.prototype,
      hasPeriodicBackgroundSync:
        'serviceWorker' in navigator &&
        'periodicSync' in window.ServiceWorkerRegistration.prototype,
    },
    syncStatus: {
      isOnline: navigator.onLine,
      queueSize: 0,
      pendingCount: 0,
      failedCount: 0,
      criticalCount: 0,
      isCurrentlySyncing: false,
    },
    installPrompt: null,
    pushSubscription: null,
    serviceWorkerRegistration: null,
    offlineIncidentCount: 0,
  });

  const syncManagerRef = useRef(getOfflineSyncManager());
  const syncEventListenerRef = useRef<(event: SyncEvent) => void>();

  // Initialize PWA capabilities and listeners
  useEffect(() => {
    initializePWA();
    setupEventListeners();

    return () => {
      cleanupEventListeners();
    };
  }, []);

  const initializePWA = async () => {
    // Check installation status
    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Get service worker registration
    let registration: ServiceWorkerRegistration | null = null;
    if ('serviceWorker' in navigator) {
      try {
        registration = await navigator.serviceWorker.getRegistration();
      } catch (error) {
        console.warn('Failed to get service worker registration:', error);
      }
    }

    // Get push subscription
    let pushSubscription: PushSubscription | null = null;
    if (registration) {
      try {
        pushSubscription = await registration.pushManager.getSubscription();
      } catch (error) {
        console.warn('Failed to get push subscription:', error);
      }
    }

    // Get offline incident count
    const offlineIncidentCount = await getOfflineIncidentCount();

    setState((prev) => ({
      ...prev,
      capabilities: {
        ...prev.capabilities,
        isInstalled,
      },
      serviceWorkerRegistration: registration,
      pushSubscription,
      offlineIncidentCount,
      syncStatus: syncManagerRef.current.getSyncStatus(),
    }));
  };

  const setupEventListeners = () => {
    // Install prompt listener
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setState((prev) => ({
        ...prev,
        installPrompt: e,
        capabilities: { ...prev.capabilities, isInstallable: true },
      }));
    };

    // Online/offline listeners
    const handleOnline = () => {
      setState((prev) => ({
        ...prev,
        capabilities: { ...prev.capabilities, isOnline: true },
        syncStatus: { ...prev.syncStatus, isOnline: true },
      }));
    };

    const handleOffline = () => {
      setState((prev) => ({
        ...prev,
        capabilities: { ...prev.capabilities, isOnline: false },
        syncStatus: { ...prev.syncStatus, isOnline: false },
      }));
    };

    // Service worker update listener
    const handleServiceWorkerUpdate = () => {
      console.log('Service Worker updated');
      // Could trigger UI notification about update
    };

    // Sync manager event listener
    syncEventListenerRef.current = (event: SyncEvent) => {
      setState((prev) => {
        const newSyncStatus = { ...prev.syncStatus };

        switch (event.type) {
          case 'online':
            newSyncStatus.isOnline = true;
            break;
          case 'offline':
            newSyncStatus.isOnline = false;
            break;
          case 'sync_started':
            newSyncStatus.isCurrentlySyncing = true;
            newSyncStatus.lastSyncAttempt = new Date();
            break;
          case 'sync_completed':
            newSyncStatus.isCurrentlySyncing = false;
            // Update counts from sync manager
            const status = syncManagerRef.current.getSyncStatus();
            Object.assign(newSyncStatus, status);
            break;
        }

        return {
          ...prev,
          syncStatus: newSyncStatus,
        };
      });
    };

    // Add event listeners
    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener(
      'controllerchange',
      handleServiceWorkerUpdate,
    );
    syncManagerRef.current.addEventListener(syncEventListenerRef.current);
  };

  const cleanupEventListeners = () => {
    // CRITICAL FIX: Remove actual event handlers, not empty functions
    window.removeEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt as EventListener,
    );
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    navigator.serviceWorker?.removeEventListener(
      'controllerchange',
      handleServiceWorkerUpdate,
    );

    if (syncEventListenerRef.current) {
      syncManagerRef.current.removeEventListener(syncEventListenerRef.current);
    }
  };

  // Installation functions
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!state.installPrompt) {
      return false;
    }

    try {
      await state.installPrompt.prompt();
      const result = await state.installPrompt.userChoice;

      setState((prev) => ({
        ...prev,
        installPrompt: null,
        capabilities: {
          ...prev.capabilities,
          isInstallable: false,
          isInstalled: result.outcome === 'accepted',
        },
      }));

      return result.outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }, [state.installPrompt]);

  // Service Worker functions
  const registerServiceWorker = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      setState((prev) => ({
        ...prev,
        serviceWorkerRegistration: registration,
      }));

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New service worker is available
              console.log('New service worker available');
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }, []);

  const updateServiceWorker = useCallback(async (): Promise<boolean> => {
    if (!state.serviceWorkerRegistration) {
      return false;
    }

    try {
      await state.serviceWorkerRegistration.update();
      return true;
    } catch (error) {
      console.error('Service Worker update failed:', error);
      return false;
    }
  }, [state.serviceWorkerRegistration]);

  // Push notification functions
  const requestNotificationPermission =
    useCallback(async (): Promise<boolean> => {
      if (!('Notification' in window)) {
        return false;
      }

      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }, []);

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (
      !state.serviceWorkerRegistration ||
      !state.capabilities.hasPushNotifications
    ) {
      return false;
    }

    try {
      // You would replace this with your actual VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key not configured');
      }

      const subscription =
        await state.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });

      setState((prev) => ({
        ...prev,
        pushSubscription: subscription,
      }));

      // Send subscription to your server
      await sendPushSubscriptionToServer(subscription);

      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return false;
    }
  }, [
    state.serviceWorkerRegistration,
    state.capabilities.hasPushNotifications,
  ]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!state.pushSubscription) {
      return false;
    }

    try {
      await state.pushSubscription.unsubscribe();
      setState((prev) => ({
        ...prev,
        pushSubscription: null,
      }));

      return true;
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
      return false;
    }
  }, [state.pushSubscription]);

  // Sync functions
  const addToSyncQueue = useCallback(
    async (
      type: string,
      data: any,
      priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    ): Promise<string> => {
      return await syncManagerRef.current.addToQueue(
        type as any,
        data,
        priority,
      );
    },
    [],
  );

  const forceSyncItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      return await syncManagerRef.current.forceSyncItem(itemId);
    },
    [],
  );

  const triggerManualSync = useCallback(async (): Promise<void> => {
    setState((prev) => ({
      ...prev,
      syncStatus: { ...prev.syncStatus, isCurrentlySyncing: true },
    }));

    try {
      await syncManagerRef.current.triggerSync();
    } finally {
      setState((prev) => ({
        ...prev,
        syncStatus: {
          ...prev.syncStatus,
          isCurrentlySyncing: false,
          ...syncManagerRef.current.getSyncStatus(),
        },
      }));
    }
  }, []);

  const clearExpiredItems = useCallback((): number => {
    const clearedCount = syncManagerRef.current.clearExpiredItems();
    setState((prev) => ({
      ...prev,
      syncStatus: syncManagerRef.current.getSyncStatus(),
    }));
    return clearedCount;
  }, []);

  // Incident-specific functions
  const reportOfflineIncident = useCallback(
    async (incident: any): Promise<string> => {
      const incidentId = await syncManagerRef.current.addToQueue(
        'incident',
        incident,
        'critical',
        { venueId: incident.venueId, userId: incident.reportedBy },
      );

      setState((prev) => ({
        ...prev,
        offlineIncidentCount: prev.offlineIncidentCount + 1,
      }));

      return incidentId;
    },
    [],
  );

  const cacheEmergencyContacts = useCallback(
    async (contacts: any[]): Promise<void> => {
      // Send to service worker for caching
      if (state.serviceWorkerRegistration) {
        state.serviceWorkerRegistration.active?.postMessage({
          type: 'CACHE_EMERGENCY_DATA',
          payload: { contacts },
        });
      }

      // Also add to sync queue for server sync
      for (const contact of contacts) {
        await syncManagerRef.current.addToQueue('contact', contact, 'high');
      }
    },
    [state.serviceWorkerRegistration],
  );

  const getOfflineIncidents = useCallback(async (): Promise<any[]> => {
    // In a real implementation, this would retrieve from IndexedDB
    // For now, return empty array
    return [];
  }, []);

  // Utility functions
  const checkOnlineStatus = useCallback((): boolean => {
    return navigator.onLine;
  }, []);

  const getStorageUsage =
    useCallback(async (): Promise<StorageEstimate | null> => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          return await navigator.storage.estimate();
        } catch (error) {
          console.warn('Failed to estimate storage:', error);
        }
      }
      return null;
    }, []);

  const clearOfflineData = useCallback(async (): Promise<void> => {
    // Clear sync queue
    syncManagerRef.current.shutdown();

    // Clear service worker caches
    if (state.serviceWorkerRegistration) {
      state.serviceWorkerRegistration.active?.postMessage({
        type: 'CLEAR_OFFLINE_CACHE',
      });
    }

    // Clear localStorage
    try {
      localStorage.removeItem('wedsync_sync_queue');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }

    // Reset state
    setState((prev) => ({
      ...prev,
      offlineIncidentCount: 0,
      syncStatus: {
        isOnline: navigator.onLine,
        queueSize: 0,
        pendingCount: 0,
        failedCount: 0,
        criticalCount: 0,
        isCurrentlySyncing: false,
      },
    }));
  }, [state.serviceWorkerRegistration]);

  return {
    // State
    ...state,

    // Installation
    canInstall:
      state.capabilities.isInstallable && !state.capabilities.isInstalled,
    promptInstall,

    // Service Worker
    registerServiceWorker,
    updateServiceWorker,

    // Push Notifications
    requestNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,

    // Offline Sync
    addToSyncQueue,
    forceSyncItem,
    triggerManualSync,
    clearExpiredItems,

    // Incident Response
    reportOfflineIncident,
    cacheEmergencyContacts,
    getOfflineIncidents,

    // Utility
    checkOnlineStatus,
    getStorageUsage,
    clearOfflineData,
  };
}

// Helper functions
async function sendPushSubscriptionToServer(
  subscription: PushSubscription,
): Promise<void> {
  try {
    await fetch('/api/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
  } catch (error) {
    console.error('Failed to send push subscription to server:', error);
  }
}

async function getOfflineIncidentCount(): Promise<number> {
  // In a real implementation, this would query IndexedDB
  // For now, check localStorage for sync queue items
  try {
    const queueData = localStorage.getItem('wedsync_sync_queue');
    if (queueData) {
      const queue = JSON.parse(queueData);
      return queue.filter(
        ([_, item]: [string, any]) => item.type === 'incident',
      ).length;
    }
  } catch (error) {
    console.warn('Failed to get offline incident count:', error);
  }
  return 0;
}

export default usePWA;
