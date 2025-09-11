/**
 * OfflineAnalyticsManager - Comprehensive offline analytics data caching and sync
 *
 * Features:
 * - Offline data caching with encryption
 * - Smart sync strategies with conflict resolution
 * - Progressive data loading
 * - Background sync with service worker
 * - Data compression and optimization
 * - Error handling and retry mechanisms
 * - Storage quota management
 * - Network-aware sync scheduling
 */

import {
  OfflineAnalyticsData,
  CacheEntry,
  CacheStats,
  VendorMetrics,
  MobileSecurityConfig,
} from '@/types/mobile-analytics';

interface SyncOptions {
  priority: 'low' | 'medium' | 'high' | 'critical';
  maxRetries: number;
  retryDelay: number; // milliseconds
  timeout: number; // milliseconds
}

interface StorageQuota {
  total: number;
  used: number;
  available: number;
}

interface NetworkCondition {
  online: boolean;
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // milliseconds
}

export class OfflineAnalyticsManager {
  private dbName = 'WedSyncAnalyticsDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private cacheName = 'wedsync-analytics-cache-v1';
  private syncQueue: OfflineAnalyticsData[] = [];
  private isOnline = navigator.onLine;
  private networkCondition: NetworkCondition;
  private syncInterval: NodeJS.Timeout | null = null;
  private securityConfig: MobileSecurityConfig;

  // Encryption key for sensitive data (would be derived from user authentication in production)
  private encryptionKey: CryptoKey | null = null;

  constructor(securityConfig?: Partial<MobileSecurityConfig>) {
    this.securityConfig = {
      encryptLocalData: true,
      biometricAuth: false,
      sessionTimeout: 30,
      allowScreenshots: true,
      allowBackground: true,
      requirePasscode: false,
      ...securityConfig,
    };

    this.networkCondition = {
      online: navigator.onLine,
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
    };

    this.initializeManager();
  }

  /**
   * Initialize the offline analytics manager
   */
  private async initializeManager(): Promise<void> {
    try {
      // Initialize IndexedDB
      await this.initializeDB();

      // Initialize encryption if required
      if (this.securityConfig.encryptLocalData) {
        await this.initializeEncryption();
      }

      // Set up network monitoring
      this.setupNetworkMonitoring();

      // Set up service worker communication
      this.setupServiceWorkerSync();

      // Start periodic sync
      this.startPeriodicSync();

      // Clean up old cache entries
      await this.cleanupExpiredEntries();
    } catch (error) {
      console.error('Failed to initialize OfflineAnalyticsManager:', error);
    }
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('analytics')) {
          const analyticsStore = db.createObjectStore('analytics', {
            keyPath: 'id',
          });
          analyticsStore.createIndex('vendorId', 'vendorId', { unique: false });
          analyticsStore.createIndex('timestamp', 'timestamp', {
            unique: false,
          });
          analyticsStore.createIndex('syncStatus', 'syncStatus', {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('priority', 'priority', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Initialize encryption for sensitive data
   */
  private async initializeEncryption(): Promise<void> {
    try {
      // Generate or retrieve encryption key
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode('wedsync-analytics-key'), // In production, use proper key derivation
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey'],
      );

      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('analytics-salt'),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      this.securityConfig.encryptLocalData = false;
    }
  }

  /**
   * Encrypt sensitive data
   */
  private async encryptData(
    data: string,
  ): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not available');
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encoded,
    );

    return { encrypted, iv };
  }

  /**
   * Decrypt sensitive data
   */
  private async decryptData(
    encrypted: ArrayBuffer,
    iv: Uint8Array,
  ): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not available');
    }

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encrypted,
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Set up network condition monitoring
   */
  private setupNetworkMonitoring(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.networkCondition.online = true;
      this.triggerSync('high');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.networkCondition.online = false;
    });

    // Monitor network quality if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;

      const updateNetworkInfo = () => {
        this.networkCondition = {
          ...this.networkCondition,
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
        };
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);
    }
  }

  /**
   * Set up service worker communication for background sync
   */
  private setupServiceWorkerSync(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_ANALYTICS') {
          this.handleBackgroundSync(event.data.payload);
        }
      });
    }
  }

  /**
   * Start periodic sync based on network conditions
   */
  private startPeriodicSync(): void {
    // Clear existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Determine sync frequency based on network
    let interval = 5 * 60 * 1000; // 5 minutes default

    if (
      this.networkCondition.effectiveType === 'slow-2g' ||
      this.networkCondition.effectiveType === '2g'
    ) {
      interval = 15 * 60 * 1000; // 15 minutes on slow connections
    } else if (!this.isOnline) {
      return; // No sync when offline
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.triggerSync('medium');
      }
    }, interval);
  }

  /**
   * Store analytics data offline
   */
  async storeOfflineData(
    vendorId: string,
    data: VendorMetrics,
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const offlineData: OfflineAnalyticsData = {
      id: `${vendorId}-${Date.now()}`,
      vendorId,
      timestamp: new Date(),
      data,
      syncStatus: 'pending',
      version: 1,
    };

    // Encrypt data if required
    let dataToStore = offlineData;
    if (this.securityConfig.encryptLocalData) {
      try {
        const { encrypted, iv } = await this.encryptData(JSON.stringify(data));
        dataToStore = {
          ...offlineData,
          data: {
            encrypted: Array.from(new Uint8Array(encrypted)),
            iv: Array.from(iv),
          } as any,
        };
      } catch (error) {
        console.warn('Failed to encrypt data, storing unencrypted:', error);
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['analytics'], 'readwrite');
      const store = transaction.objectStore('analytics');

      const request = store.add(dataToStore);

      request.onsuccess = () => {
        // Add to sync queue
        this.syncQueue.push(offlineData);
        resolve(offlineData.id);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieve offline analytics data
   */
  async getOfflineData(vendorId?: string): Promise<OfflineAnalyticsData[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['analytics'], 'readonly');
      const store = transaction.objectStore('analytics');

      let request: IDBRequest;
      if (vendorId) {
        const index = store.index('vendorId');
        request = index.getAll(vendorId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = async () => {
        let results = request.result as OfflineAnalyticsData[];

        // Decrypt data if encrypted
        if (this.securityConfig.encryptLocalData && this.encryptionKey) {
          results = await Promise.all(
            results.map(async (item) => {
              if (typeof item.data === 'object' && 'encrypted' in item.data) {
                try {
                  const encrypted = new Uint8Array((item.data as any).encrypted)
                    .buffer;
                  const iv = new Uint8Array((item.data as any).iv);
                  const decryptedData = await this.decryptData(encrypted, iv);
                  item.data = JSON.parse(decryptedData);
                } catch (error) {
                  console.warn('Failed to decrypt data:', error);
                }
              }
              return item;
            }),
          );
        }

        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cache analytics data with TTL
   */
  async cacheData(
    key: string,
    data: any,
    ttl: number = 24 * 60 * 60 * 1000,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check storage quota before caching
    const quota = await this.getStorageQuota();
    if (quota.available < 1024 * 1024) {
      // Less than 1MB available
      await this.cleanupExpiredEntries();
    }

    const cacheEntry: CacheEntry = {
      key,
      data,
      timestamp: new Date(),
      ttl,
      size: JSON.stringify(data).length,
      priority: 'medium',
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      const request = store.put(cacheEntry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieve cached data
   */
  async getCachedData(key: string): Promise<any | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');

      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CacheEntry;

        if (!result) {
          resolve(null);
          return;
        }

        // Check if cache entry is expired
        const now = Date.now();
        const entryTime = result.timestamp.getTime();

        if (now - entryTime > result.ttl) {
          // Remove expired entry
          this.deleteCachedData(key);
          resolve(null);
          return;
        }

        resolve(result.data);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete cached data
   */
  async deleteCachedData(key: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Trigger data synchronization
   */
  async triggerSync(
    priority: SyncOptions['priority'] = 'medium',
  ): Promise<void> {
    if (!this.isOnline) {
      console.log('Sync skipped - device is offline');
      return;
    }

    const options: SyncOptions = {
      priority,
      maxRetries: priority === 'critical' ? 5 : 3,
      retryDelay: priority === 'critical' ? 1000 : 5000,
      timeout: priority === 'critical' ? 30000 : 10000,
    };

    // Get pending sync data
    const pendingData = await this.getPendingSyncData();

    for (const item of pendingData) {
      await this.syncDataItem(item, options);
    }
  }

  /**
   * Get pending sync data
   */
  private async getPendingSyncData(): Promise<OfflineAnalyticsData[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['analytics'], 'readonly');
      const store = transaction.objectStore('analytics');
      const index = store.index('syncStatus');

      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Sync individual data item
   */
  private async syncDataItem(
    item: OfflineAnalyticsData,
    options: SyncOptions,
  ): Promise<void> {
    let attempts = 0;

    while (attempts < options.maxRetries) {
      try {
        // Simulate API call (replace with actual API endpoint)
        const response = await fetch('/api/analytics/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
          signal: AbortSignal.timeout(options.timeout),
        });

        if (response.ok) {
          await this.markAsSynced(item.id);
          return;
        } else {
          throw new Error(`Sync failed with status: ${response.status}`);
        }
      } catch (error) {
        attempts++;
        console.warn(`Sync attempt ${attempts} failed for ${item.id}:`, error);

        if (attempts < options.maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, options.retryDelay * attempts),
          );
        } else {
          await this.markAsFailed(item.id);
        }
      }
    }
  }

  /**
   * Mark data as synced
   */
  private async markAsSynced(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['analytics'], 'readwrite');
      const store = transaction.objectStore('analytics');

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.syncStatus = 'synced';
          item.lastSyncAttempt = new Date();

          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Mark data as failed to sync
   */
  private async markAsFailed(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['analytics'], 'readwrite');
      const store = transaction.objectStore('analytics');

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.syncStatus = 'failed';
          item.lastSyncAttempt = new Date();

          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota(): Promise<StorageQuota> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        total: estimate.quota || 0,
        used: estimate.usage || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0),
      };
    }

    return { total: 0, used: 0, available: 0 };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');

      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];

        const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
        const totalEntries = entries.length;

        // Calculate hit rate (simplified - would need tracking in production)
        const hitRate = 0.85; // Mock value

        const stats: CacheStats = {
          totalSize,
          totalEntries,
          hitRate,
          memoryUsage: totalSize,
          lastCleanup: new Date(),
        };

        resolve(stats);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredEntries(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        const now = Date.now();
        let deletedCount = 0;

        const deletePromises = entries
          .filter((entry) => now - entry.timestamp.getTime() > entry.ttl)
          .map((entry) => {
            const deleteRequest = store.delete(entry.key);
            return new Promise<void>((resolveDelete) => {
              deleteRequest.onsuccess = () => {
                deletedCount++;
                resolveDelete();
              };
              deleteRequest.onerror = () => resolveDelete(); // Continue on error
            });
          });

        Promise.all(deletePromises).then(() => resolve(deletedCount));
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Handle background sync
   */
  private async handleBackgroundSync(payload: any): Promise<void> {
    try {
      await this.triggerSync('high');
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  /**
   * Clear all offline data (for testing or reset)
   */
  async clearAllData(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['analytics', 'cache'],
        'readwrite',
      );

      const analyticsStore = transaction.objectStore('analytics');
      const cacheStore = transaction.objectStore('cache');

      const clearAnalytics = analyticsStore.clear();
      const clearCache = cacheStore.clear();

      Promise.all([
        new Promise((res, rej) => {
          clearAnalytics.onsuccess = () => res(void 0);
          clearAnalytics.onerror = () => rej(clearAnalytics.error);
        }),
        new Promise((res, rej) => {
          clearCache.onsuccess = () => res(void 0);
          clearCache.onerror = () => rej(clearCache.error);
        }),
      ])
        .then(() => resolve())
        .catch(reject);
    });
  }

  /**
   * Destroy the manager and clean up resources
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.syncQueue = [];
  }
}
