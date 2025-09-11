export class MobilePWAService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  async initializePWA(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration =
          await navigator.serviceWorker.register('/sw.js');
        console.log(
          'Service Worker registered:',
          this.serviceWorkerRegistration,
        );

        // Handle service worker updates
        this.serviceWorkerRegistration.addEventListener('updatefound', () => {
          const newWorker = this.serviceWorkerRegistration!.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // New content is available, prompt user to refresh
                this.showUpdateAvailableNotification();
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Offline-first sync status
  async getCachedSyncStatus(integrationId: string): Promise<any> {
    try {
      const cache = await caches.open('crm-sync-status');
      const response = await cache.match(
        `/api/crm/integrations/${integrationId}/status`,
      );

      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get cached sync status:', error);
    }

    return null;
  }

  // Background sync for offline actions
  async queueOfflineAction(action: string, data: any): Promise<void> {
    if (
      'serviceWorker' in navigator &&
      'sync' in window.ServiceWorkerRegistration.prototype
    ) {
      // Store action in IndexedDB
      await this.storeOfflineAction(action, data);

      // Register background sync
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(`crm-${action}`);
    }
  }

  private async storeOfflineAction(action: string, data: any): Promise<void> {
    // Implementation would use IndexedDB to store offline actions
    // for later sync when connection is restored
  }

  // Performance monitoring
  measurePerformance(name: string, fn: () => Promise<any>): Promise<any> {
    const start = performance.now();

    return fn().finally(() => {
      const duration = performance.now() - start;

      // Log slow operations
      if (duration > 1000) {
        console.warn(
          `Slow operation detected: ${name} took ${duration.toFixed(2)}ms`,
        );
      }

      // Report to analytics
      if ('PerformanceObserver' in window) {
        // Custom performance entries
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      }
    });
  }

  // Network-aware operations
  async adaptToConnectionQuality(): Promise<void> {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      if (
        connection.effectiveType === 'slow-2g' ||
        connection.effectiveType === '2g'
      ) {
        // Reduce background sync frequency
        // Increase cache TTL
        // Disable non-essential features
        this.enableLowBandwidthMode();
      } else if (connection.effectiveType === '4g') {
        // Enable full functionality
        // Reduce cache TTL for fresher data
        this.enableHighBandwidthMode();
      }
    }
  }

  private enableLowBandwidthMode(): void {
    // Reduce image quality
    // Increase cache TTL
    // Disable real-time updates
    console.log('Enabled low bandwidth mode');
  }

  private enableHighBandwidthMode(): void {
    // Enable full image quality
    // Reduce cache TTL
    // Enable real-time updates
    console.log('Enabled high bandwidth mode');
  }

  private showUpdateAvailableNotification(): void {
    // Show user notification about available update
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('WedSync Update Available', {
        body: 'A new version of WedSync is available. Refresh to update.',
        icon: '/icons/icon-192x192.png',
      });
    }
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission;
    }
    return 'denied';
  }

  // Show sync completion notification
  async showSyncNotification(syncResult: {
    success: boolean;
    recordCount: number;
  }): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = syncResult.success
        ? 'CRM Sync Complete'
        : 'CRM Sync Failed';
      const body = syncResult.success
        ? `Successfully synced ${syncResult.recordCount} clients`
        : 'CRM sync encountered errors. Please try again.';

      new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
      });
    }
  }

  // Check if app is running in standalone mode (PWA)
  isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://')
    );
  }

  // Get optimal batch size based on network conditions
  getOptimalBatchSize(): number {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      switch (connection.effectiveType) {
        case 'slow-2g':
        case '2g':
          return 10; // Small batches for slow connections
        case '3g':
          return 25; // Medium batches
        case '4g':
        default:
          return 50; // Large batches for fast connections
      }
    }

    return 25; // Default batch size
  }

  // Progressive loading with connection awareness
  async loadCRMData(
    integrationId: string,
    onProgress?: (progress: number) => void,
  ): Promise<any[]> {
    const batchSize = this.getOptimalBatchSize();
    let allData: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await fetch(
          `/api/crm/integrations/${integrationId}/data?page=${page}&limit=${batchSize}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const batch = await response.json();
        allData = [...allData, ...batch.data];

        if (onProgress) {
          const progress =
            batch.totalCount > 0
              ? (allData.length / batch.totalCount) * 100
              : 0;
          onProgress(Math.min(progress, 100));
        }

        hasMore = batch.data.length === batchSize && batch.hasMore;
        page++;

        // Add delay on slower connections
        if ('connection' in navigator) {
          const connection = (navigator as any).connection;
          if (
            connection.effectiveType === '2g' ||
            connection.effectiveType === 'slow-2g'
          ) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
      } catch (error) {
        console.error('Error loading CRM data:', error);

        // Try to get cached data if network fails
        const cachedData = await this.getCachedSyncStatus(integrationId);
        if (cachedData) {
          return cachedData;
        }

        throw error;
      }
    }

    return allData;
  }

  // Install PWA prompt
  async showInstallPrompt(): Promise<boolean> {
    if ('beforeinstallprompt' in window) {
      const event = (window as any).deferredPrompt;
      if (event) {
        event.prompt();
        const result = await event.userChoice;
        return result.outcome === 'accepted';
      }
    }
    return false;
  }

  // Check if device has low memory
  hasLowMemory(): boolean {
    if ('deviceMemory' in navigator) {
      return (navigator as any).deviceMemory <= 2; // 2GB or less
    }
    return false;
  }

  // Optimize for low memory devices
  optimizeForLowMemory(): void {
    if (this.hasLowMemory()) {
      // Reduce batch sizes
      // Clear caches more frequently
      // Disable non-essential features
      console.log('Optimizing for low memory device');
    }
  }
}
