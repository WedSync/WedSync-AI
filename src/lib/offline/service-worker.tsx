/**
 * WS-188: Service Worker Coordination and Communication
 * Main thread to service worker communication with secure message passing
 * Cache management coordination with intelligent storage optimization
 * Sync status coordination with real-time progress updates
 * Error handling coordination with user-friendly error recovery
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from 'react';

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isInstalling: boolean;
  isWaitingToActivate: boolean;
  hasUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
  error: string | null;
}

export interface CacheStats {
  [cacheName: string]: {
    name: string;
    count: number;
    urls: string[];
    size?: number;
  };
}

export interface SyncStatus {
  inProgress: boolean;
  pending: number;
  failed: number;
  lastSync: Date | null;
  nextRetry: Date | null;
  estimatedCompletion: Date | null;
}

export interface OfflineState {
  isOnline: boolean;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

export interface ServiceWorkerMessage {
  type: string;
  data?: any;
  timestamp: number;
}

// Service Worker Registration and Management
export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private messageChannel: MessageChannel | null = null;

  constructor() {
    this.initializeMessageHandling();
    this.monitorNetworkStatus();
  }

  // Initialize service worker registration
  async initialize(): Promise<ServiceWorkerState> {
    if (!this.isSupported()) {
      return {
        isSupported: false,
        isRegistered: false,
        isInstalling: false,
        isWaitingToActivate: false,
        hasUpdate: false,
        registration: null,
        error: 'Service Workers not supported',
      };
    }

    try {
      console.log('[WS-188] Initializing service worker...');

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'imports',
      });

      this.registration = registration;
      this.setupRegistrationListeners(registration);
      await this.setupMessageChannel();

      console.log('[WS-188] Service worker registered successfully');

      return {
        isSupported: true,
        isRegistered: true,
        isInstalling: registration.installing !== null,
        isWaitingToActivate: registration.waiting !== null,
        hasUpdate: registration.waiting !== null,
        registration,
        error: null,
      };
    } catch (error) {
      console.error('[WS-188] Service worker registration failed:', error);

      return {
        isSupported: true,
        isRegistered: false,
        isInstalling: false,
        isWaitingToActivate: false,
        hasUpdate: false,
        registration: null,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  // Check service worker support
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'caches' in window &&
      'indexedDB' in window
    );
  }

  // Setup registration event listeners
  private setupRegistrationListeners(registration: ServiceWorkerRegistration) {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        this.emit('updatefound', { worker: newWorker });

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            this.emit('updateavailable', { worker: newWorker });
          }
        });
      }
    });
  }

  // Setup secure message channel for communication
  private async setupMessageChannel() {
    if (!this.registration?.active) return;

    this.messageChannel = new MessageChannel();

    this.messageChannel.port1.onmessage = (event) => {
      this.handleServiceWorkerMessage(event.data);
    };

    // Send port to service worker
    this.registration.active.postMessage(
      {
        type: 'establish-channel',
      },
      [this.messageChannel.port2],
    );
  }

  // Initialize message handling from service worker
  private initializeMessageHandling() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });
    }
  }

  // Handle incoming messages from service worker
  private handleServiceWorkerMessage(message: ServiceWorkerMessage) {
    console.log('[WS-188] Received message from service worker:', message.type);

    switch (message.type) {
      case 'sync-success':
        this.emit('sync-success', message.data);
        break;

      case 'sync-failed':
        this.emit('sync-failed', message.data);
        break;

      case 'data-refresh':
        this.emit('data-refresh', message.data);
        break;

      case 'cache-update':
        this.emit('cache-update', message.data);
        break;

      case 'network-status':
        this.emit('network-status', message.data);
        break;

      default:
        this.emit('message', message);
    }
  }

  // Send message to service worker
  async sendMessage(type: string, data?: any): Promise<any> {
    if (!this.registration?.active) {
      throw new Error('Service worker not active');
    }

    return new Promise((resolve, reject) => {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create timeout for message response
      const timeout = setTimeout(() => {
        this.off(`response-${messageId}`, responseHandler);
        reject(new Error('Message timeout'));
      }, 10000);

      const responseHandler = (response: any) => {
        clearTimeout(timeout);
        resolve(response);
      };

      this.once(`response-${messageId}`, responseHandler);

      this.registration!.active!.postMessage({
        type,
        data,
        messageId,
        timestamp: Date.now(),
      });
    });
  }

  // Monitor network status for intelligent caching
  private monitorNetworkStatus() {
    const updateNetworkInfo = () => {
      const connection = (navigator as any).connection;

      const networkInfo: OfflineState = {
        isOnline: navigator.onLine,
        effectiveType: connection?.effectiveType || null,
        downlink: connection?.downlink || null,
        rtt: connection?.rtt || null,
      };

      this.emit('network-change', networkInfo);
    };

    window.addEventListener('online', updateNetworkInfo);
    window.addEventListener('offline', updateNetworkInfo);

    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener(
        'change',
        updateNetworkInfo,
      );
    }

    // Initial network status
    updateNetworkInfo();
  }

  // Cache Management Methods
  async getCacheStats(): Promise<CacheStats> {
    try {
      return await this.sendMessage('get-cache-stats');
    } catch (error) {
      console.error('[WS-188] Failed to get cache stats:', error);
      return {};
    }
  }

  async clearCache(cacheName?: string): Promise<void> {
    try {
      await this.sendMessage('clear-cache', { cacheName });
      this.emit('cache-cleared', { cacheName });
    } catch (error) {
      console.error('[WS-188] Failed to clear cache:', error);
      throw error;
    }
  }

  async precacheWeddingData(weddingId: string): Promise<void> {
    try {
      await this.sendMessage('cache-wedding', { weddingId });
      this.emit('wedding-cached', { weddingId });
    } catch (error) {
      console.error('[WS-188] Failed to precache wedding data:', error);
      throw error;
    }
  }

  // Background Sync Management
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const status = await this.sendMessage('get-sync-status');
      return {
        inProgress: status.inProgress || false,
        pending: status.pending || 0,
        failed: status.failed || 0,
        lastSync: status.lastSync ? new Date(status.lastSync) : null,
        nextRetry: status.nextRetry ? new Date(status.nextRetry) : null,
        estimatedCompletion: status.estimatedCompletion
          ? new Date(status.estimatedCompletion)
          : null,
      };
    } catch (error) {
      console.error('[WS-188] Failed to get sync status:', error);
      return {
        inProgress: false,
        pending: 0,
        failed: 0,
        lastSync: null,
        nextRetry: null,
        estimatedCompletion: null,
      };
    }
  }

  async forceSyncRetry(): Promise<void> {
    try {
      await this.sendMessage('force-sync-retry');
      this.emit('sync-retry-requested');
    } catch (error) {
      console.error('[WS-188] Failed to force sync retry:', error);
      throw error;
    }
  }

  async getFailedMutations(): Promise<any[]> {
    try {
      return await this.sendMessage('get-failed-mutations');
    } catch (error) {
      console.error('[WS-188] Failed to get failed mutations:', error);
      return [];
    }
  }

  // PWA Installation Management
  async requestPWAInstall(): Promise<boolean> {
    if ('beforeinstallprompt' in window) {
      try {
        const result = await this.sendMessage('request-pwa-install');
        return result.installed || false;
      } catch (error) {
        console.error('[WS-188] PWA install request failed:', error);
        return false;
      }
    }
    return false;
  }

  // Update Management
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) return;

    try {
      await this.sendMessage('skip-waiting');
      this.emit('update-activated');
    } catch (error) {
      console.error('[WS-188] Skip waiting failed:', error);
      throw error;
    }
  }

  async checkForUpdates(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      await this.registration.update();
      return this.registration.waiting !== null;
    } catch (error) {
      console.error('[WS-188] Update check failed:', error);
      return false;
    }
  }

  // Event Emitter Pattern
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  once(event: string, callback: Function) {
    const wrappedCallback = (...args: any[]) => {
      this.off(event, wrappedCallback);
      callback(...args);
    };
    this.on(event, wrappedCallback);
  }

  private emit(event: string, data?: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WS-188] Event listener error for ${event}:`, error);
        }
      });
    }
  }

  // Cleanup
  destroy() {
    this.listeners.clear();
    if (this.messageChannel) {
      this.messageChannel.port1.close();
      this.messageChannel = null;
    }
  }
}

// React Hook for Service Worker Integration
export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isInstalling: false,
    isWaitingToActivate: false,
    hasUpdate: false,
    registration: null,
    error: null,
  });

  const [manager] = useState(() => new ServiceWorkerManager());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    inProgress: false,
    pending: 0,
    failed: 0,
    lastSync: null,
    nextRetry: null,
    estimatedCompletion: null,
  });

  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    effectiveType: null,
    downlink: null,
    rtt: null,
  });

  // Initialize service worker
  const initialize = useCallback(async () => {
    const newState = await manager.initialize();
    setState(newState);
    return newState;
  }, [manager]);

  // Cache management functions
  const getCacheStats = useCallback(() => manager.getCacheStats(), [manager]);
  const clearCache = useCallback(
    (cacheName?: string) => manager.clearCache(cacheName),
    [manager],
  );
  const precacheWeddingData = useCallback(
    (weddingId: string) => manager.precacheWeddingData(weddingId),
    [manager],
  );

  // Sync management functions
  const forceSyncRetry = useCallback(() => manager.forceSyncRetry(), [manager]);
  const getFailedMutations = useCallback(
    () => manager.getFailedMutations(),
    [manager],
  );

  // Update management functions
  const skipWaiting = useCallback(() => manager.skipWaiting(), [manager]);
  const checkForUpdates = useCallback(
    () => manager.checkForUpdates(),
    [manager],
  );

  // PWA functions
  const requestPWAInstall = useCallback(
    () => manager.requestPWAInstall(),
    [manager],
  );

  // Setup event listeners
  useEffect(() => {
    // Sync status updates
    const handleSyncSuccess = () => {
      manager.getSyncStatus().then(setSyncStatus);
    };

    const handleSyncFailed = () => {
      manager.getSyncStatus().then(setSyncStatus);
    };

    const handleNetworkChange = (networkInfo: OfflineState) => {
      setOfflineState(networkInfo);
    };

    const handleUpdateAvailable = () => {
      setState((prev) => ({ ...prev, hasUpdate: true }));
    };

    manager.on('sync-success', handleSyncSuccess);
    manager.on('sync-failed', handleSyncFailed);
    manager.on('network-change', handleNetworkChange);
    manager.on('updateavailable', handleUpdateAvailable);

    // Initial sync status
    manager.getSyncStatus().then(setSyncStatus);

    return () => {
      manager.off('sync-success', handleSyncSuccess);
      manager.off('sync-failed', handleSyncFailed);
      manager.off('network-change', handleNetworkChange);
      manager.off('updateavailable', handleUpdateAvailable);
    };
  }, [manager]);

  // Cleanup on unmount
  useEffect(() => {
    return () => manager.destroy();
  }, [manager]);

  return {
    // State
    ...state,
    syncStatus,
    offlineState,

    // Actions
    initialize,
    getCacheStats,
    clearCache,
    precacheWeddingData,
    forceSyncRetry,
    getFailedMutations,
    skipWaiting,
    checkForUpdates,
    requestPWAInstall,

    // Manager for advanced usage
    manager,
  };
}

// Service Worker Context for React components
const ServiceWorkerContext = createContext<ReturnType<
  typeof useServiceWorker
> | null>(null);

export function ServiceWorkerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const serviceWorker = useServiceWorker();

  useEffect(() => {
    // Auto-initialize on mount
    serviceWorker.initialize();
  }, [serviceWorker]);

  return (
    <ServiceWorkerContext.Provider value={serviceWorker}>
      {children}
    </ServiceWorkerContext.Provider>
  );
}

export function useServiceWorkerContext() {
  const context = useContext(ServiceWorkerContext);
  if (!context) {
    throw new Error(
      'useServiceWorkerContext must be used within ServiceWorkerProvider',
    );
  }
  return context;
}

// Utility functions for service worker coordination
export const ServiceWorkerUtils = {
  // Check if offline functionality is available
  isOfflineCapable: (): boolean => {
    return (
      'serviceWorker' in navigator &&
      'caches' in window &&
      'indexedDB' in window
    );
  },

  // Get estimated cache size
  getEstimatedCacheSize: async (): Promise<number> => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  },

  // Check storage quota
  checkStorageQuota: async (): Promise<{
    usage: number;
    quota: number;
    available: number;
  }> => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      return { usage, quota, available: quota - usage };
    }
    return { usage: 0, quota: 0, available: 0 };
  },

  // Clear all application data (emergency cleanup)
  clearAllData: async (): Promise<void> => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    if ('indexedDB' in window) {
      const databases = ['WedSyncOfflineV2', 'WedSyncOffline'];
      for (const dbName of databases) {
        indexedDB.deleteDatabase(dbName);
      }
    }
  },

  // Force service worker update
  forceUpdate: async (): Promise<void> => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );
      window.location.reload();
    }
  },
};

export default ServiceWorkerManager;
