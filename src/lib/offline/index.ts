/**
 * WS-188: Offline Functionality System - Service Exports and Configuration
 * Comprehensive offline support with intelligent caching and background sync
 * Centralized exports for all offline functionality components
 */

import React from 'react';

// Core Service Worker Management
export {
  default as ServiceWorkerManager,
  useServiceWorker,
  ServiceWorkerProvider,
  useServiceWorkerContext,
  ServiceWorkerUtils,
} from './service-worker';

export type {
  ServiceWorkerState,
  CacheStats,
  SyncStatus,
  OfflineState,
  ServiceWorkerMessage,
} from './service-worker';

// PWA Cache Management
export {
  default as PWACacheManager,
  PWACacheUtils,
  WEDDING_CACHE_STRATEGIES,
} from './pwa-cache-manager';

export type {
  CacheStrategy,
  CacheEntry,
  CacheMetrics,
  WeddingDataConfig,
} from './pwa-cache-manager';

// Background Sync Coordination
export { default as BackgroundSyncCoordinator } from './background-sync';

export type {
  SyncTask,
  SyncConfig,
  SyncStats,
  ConflictResolution,
} from './background-sync';

// Push Notifications
export {
  default as PushNotificationCoordinator,
  NotificationUtils,
  WEDDING_NOTIFICATION_TEMPLATES,
} from './push-notifications';

export type {
  NotificationConfig,
  WeddingNotificationContext,
  OfflineNotificationQueue,
  NotificationAnalytics,
} from './push-notifications';

// Existing offline system integrations
export { default as OfflineDatabase } from './offline-database';
export { default as SyncEngine } from './sync-engine';
export { default as SyncManager } from './sync-manager';
export { default as ConnectionMonitor } from './connection-monitor';
export { default as AdaptiveSyncManager } from './adaptive-sync-manager';
export { default as WeddingDaySyncManager } from './wedding-day-sync-manager';

// Integrated Offline System - Main orchestrator
export class IntegratedOfflineSystem {
  private serviceWorkerManager: ServiceWorkerManager;
  private pwaCacheManager: PWACacheManager;
  private backgroundSyncCoordinator: BackgroundSyncCoordinator;
  private pushNotificationCoordinator: PushNotificationCoordinator;
  private initialized = false;

  constructor(config?: { vapidPublicKey?: string; syncConfig?: Partial<any> }) {
    this.serviceWorkerManager = new ServiceWorkerManager();
    this.pwaCacheManager = new PWACacheManager();
    this.backgroundSyncCoordinator = new BackgroundSyncCoordinator(
      config?.syncConfig,
    );
    this.pushNotificationCoordinator = new PushNotificationCoordinator(
      config?.vapidPublicKey,
    );
  }

  // Initialize the complete offline system
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[WS-188] Initializing integrated offline system...');

    try {
      // Initialize components in order of dependency
      await this.serviceWorkerManager.initialize();
      await this.backgroundSyncCoordinator.initialize();
      await this.pushNotificationCoordinator.initialize();

      // Request notification permissions
      await this.pushNotificationCoordinator.requestPermission();

      // Setup cross-component communication
      this.setupComponentIntegration();

      this.initialized = true;
      console.log(
        '[WS-188] Integrated offline system initialized successfully',
      );

      // Show system ready notification
      await this.pushNotificationCoordinator.showNotification('back_online', {
        body: 'WedSync offline functionality is now active and ready.',
        tag: 'system-ready',
      });
    } catch (error) {
      console.error('[WS-188] Failed to initialize offline system:', error);
      throw error;
    }
  }

  // Setup integration between components
  private setupComponentIntegration(): void {
    // Service worker events trigger notifications
    this.serviceWorkerManager.on('sync-success', async (data) => {
      await this.pushNotificationCoordinator.showNotification('sync_success', {
        body: `Successfully synced ${data.url || 'your changes'}.`,
      });
    });

    this.serviceWorkerManager.on('sync-failed', async (data) => {
      await this.pushNotificationCoordinator.showNotification('sync_failed', {
        body: `Failed to sync ${data.url || 'some changes'}. Tap to review.`,
        data: { failedUrl: data.url },
      });
    });

    this.serviceWorkerManager.on('updateavailable', async () => {
      await this.pushNotificationCoordinator.showNotification('back_online', {
        title: 'WedSync Update Available',
        body: 'A new version of WedSync is available with enhanced offline features.',
        tag: 'app-update',
        actions: [
          { action: 'update', title: 'Update Now' },
          { action: 'later', title: 'Later' },
        ],
      });
    });

    // Network status changes affect cache and sync behavior
    this.serviceWorkerManager.on('network-change', async (networkInfo) => {
      if (networkInfo.isOnline) {
        await this.pushNotificationCoordinator.showNotification('back_online');
      } else {
        await this.pushNotificationCoordinator.showNotification('offline_mode');
      }
    });
  }

  // Comprehensive wedding day preparation
  async prepareForWeddingDay(
    weddingId: string,
    weddingDate: Date,
  ): Promise<void> {
    console.log(
      `[WS-188] Preparing offline system for wedding day: ${weddingId}`,
    );

    try {
      // Set wedding context for notifications
      const weddingContext = NotificationUtils.createWeddingDayContext(
        weddingId,
        weddingDate,
      );
      await this.pushNotificationCoordinator.setWeddingContext(weddingContext);

      // Create wedding-specific cache configuration
      const weddingConfig = PWACacheUtils.createWeddingCacheConfig(weddingId);

      // Preload critical wedding day data
      await this.pwaCacheManager.preloadWeddingDay(weddingConfig);

      // Optimize for mobile if needed
      if (PWACacheUtils.shouldUseAggressiveCaching()) {
        await this.pwaCacheManager.optimizeForMobile();
      }

      // Notify user of readiness
      await this.pushNotificationCoordinator.showNotification(
        'wedding_day_critical',
        {
          title: 'WedSync - Wedding Day Ready',
          body: 'Your wedding data has been cached and is ready for offline access.',
          tag: 'wedding-ready',
        },
        weddingContext,
      );

      console.log('[WS-188] Wedding day preparation complete');
    } catch (error) {
      console.error('[WS-188] Failed to prepare for wedding day:', error);
      throw error;
    }
  }

  // Get comprehensive system status
  async getSystemStatus(): Promise<{
    serviceWorker: any;
    cache: any;
    sync: any;
    notifications: any;
    storage: any;
  }> {
    const [syncStats, notificationAnalytics, cacheMetrics, storageInfo] =
      await Promise.all([
        this.backgroundSyncCoordinator.getSyncStats(),
        this.pushNotificationCoordinator.getAnalytics(),
        this.pwaCacheManager.getCacheMetrics(),
        ServiceWorkerUtils.checkStorageQuota(),
      ]);

    return {
      serviceWorker: {
        supported: ServiceWorkerUtils.isOfflineCapable(),
        registered: this.serviceWorkerManager.isSupported(),
        version: '2.0.0-ws188',
      },
      cache: {
        metrics: cacheMetrics,
        strategies: Object.keys(WEDDING_CACHE_STRATEGIES),
      },
      sync: syncStats,
      notifications: {
        analytics: notificationAnalytics,
        supported: NotificationUtils.isNotificationSupported(),
        permission: NotificationUtils.getPermissionStatus(),
      },
      storage: storageInfo,
    };
  }

  // Emergency cleanup and reset
  async emergencyCleanup(): Promise<void> {
    console.log('[WS-188] Performing emergency system cleanup...');

    try {
      await Promise.all([
        this.pwaCacheManager.emergencyCleanup(),
        this.backgroundSyncCoordinator.clearCompleted(),
        this.pushNotificationCoordinator.clearQueue(),
        ServiceWorkerUtils.clearAllData(),
      ]);

      await this.pushNotificationCoordinator.showNotification('back_online', {
        title: 'WedSync - System Cleaned',
        body: 'Storage cleanup completed. System performance restored.',
        tag: 'cleanup-complete',
      });

      console.log('[WS-188] Emergency cleanup completed');
    } catch (error) {
      console.error('[WS-188] Emergency cleanup failed:', error);
      throw error;
    }
  }

  // Graceful shutdown
  async destroy(): Promise<void> {
    console.log('[WS-188] Shutting down integrated offline system...');

    await Promise.all([
      this.serviceWorkerManager.destroy(),
      this.pwaCacheManager.destroy(),
      this.backgroundSyncCoordinator.destroy(),
      this.pushNotificationCoordinator.destroy(),
    ]);

    this.initialized = false;
    console.log('[WS-188] Integrated offline system shut down');
  }

  // Getters for individual components
  get serviceWorker() {
    return this.serviceWorkerManager;
  }
  get cache() {
    return this.pwaCacheManager;
  }
  get sync() {
    return this.backgroundSyncCoordinator;
  }
  get notifications() {
    return this.pushNotificationCoordinator;
  }
}

// Utility function to create and initialize the complete system
export async function createOfflineSystem(config?: {
  vapidPublicKey?: string;
  syncConfig?: Partial<any>;
  autoInit?: boolean;
}): Promise<IntegratedOfflineSystem> {
  const system = new IntegratedOfflineSystem(config);

  if (config?.autoInit !== false) {
    await system.initialize();
  }

  return system;
}

// React Hook for the integrated offline system
export function useOfflineSystem(
  config?: Parameters<typeof createOfflineSystem>[0],
) {
  const [system, setSystem] = React.useState<IntegratedOfflineSystem | null>(
    null,
  );
  const [isReady, setIsReady] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const initSystem = async () => {
      try {
        const offlineSystem = await createOfflineSystem(config);
        if (mounted) {
          setSystem(offlineSystem);
          setIsReady(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      }
    };

    initSystem();

    return () => {
      mounted = false;
      if (system) {
        system.destroy();
      }
    };
  }, []);

  return {
    system,
    isReady,
    error,

    // Convenient methods
    prepareForWeddingDay: system?.prepareForWeddingDay.bind(system),
    getSystemStatus: system?.getSystemStatus.bind(system),
    emergencyCleanup: system?.emergencyCleanup.bind(system),
  };
}

// Default export for easy imports
export default IntegratedOfflineSystem;

// Type definitions for external consumption
export interface WedSyncOfflineConfig {
  vapidPublicKey?: string;
  syncConfig?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    batchSize?: number;
  };
  cacheConfig?: {
    maxCacheSize?: number;
    aggressiveCaching?: boolean;
  };
  notificationConfig?: {
    enablePush?: boolean;
    enableFallback?: boolean;
  };
}

// Constants for external use
export const OFFLINE_SYSTEM_VERSION = '2.0.0-ws188';
export const SUPPORTED_FEATURES = [
  'service-worker',
  'cache-api',
  'indexeddb',
  'background-sync',
  'push-notifications',
  'network-information',
  'storage-estimate',
] as const;
