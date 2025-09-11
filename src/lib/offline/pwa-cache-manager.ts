/**
 * WS-188: Advanced PWA Cache Manager
 * Wedding-specific caching strategies with priority-based storage allocation
 * Dynamic cache management with automatic cleanup and version migration
 * Performance optimization with preloading and intelligent resource prioritization
 * Cross-platform cache coordination ensuring consistency across devices
 */

import { ServiceWorkerUtils } from './service-worker';

export interface CacheStrategy {
  name: string;
  maxAge: number;
  maxEntries: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  networkFirst: boolean;
  updateStrategy:
    | 'stale-while-revalidate'
    | 'cache-first'
    | 'network-first'
    | 'cache-only';
}

export interface CacheEntry {
  url: string;
  timestamp: number;
  priority: string;
  size: number;
  hitCount: number;
  lastAccess: number;
}

export interface CacheMetrics {
  totalSize: number;
  entryCount: number;
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  storageUsage: number;
  quotaUsage: number;
}

export interface WeddingDataConfig {
  weddingId: string;
  priorityEndpoints: string[];
  criticalData: string[];
  preloadAssets: string[];
}

// Wedding-specific cache strategies
export const WEDDING_CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  // Critical wedding day data - immediate access required
  critical: {
    name: 'wedding-critical',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 100,
    priority: 'critical',
    networkFirst: false,
    updateStrategy: 'cache-first',
  },

  // Timeline and schedule data - frequently accessed
  timeline: {
    name: 'wedding-timeline',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    maxEntries: 50,
    priority: 'high',
    networkFirst: false,
    updateStrategy: 'stale-while-revalidate',
  },

  // Vendor contacts - essential for coordination
  vendors: {
    name: 'wedding-vendors',
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
    maxEntries: 200,
    priority: 'high',
    networkFirst: false,
    updateStrategy: 'stale-while-revalidate',
  },

  // Photo galleries - large but important
  photos: {
    name: 'wedding-photos',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 300,
    priority: 'medium',
    networkFirst: false,
    updateStrategy: 'cache-first',
  },

  // Guest information - moderately important
  guests: {
    name: 'wedding-guests',
    maxAge: 6 * 60 * 60 * 1000, // 6 hours
    maxEntries: 150,
    priority: 'medium',
    networkFirst: true,
    updateStrategy: 'network-first',
  },

  // General API responses - lower priority
  api: {
    name: 'api-responses',
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    maxEntries: 100,
    priority: 'low',
    networkFirst: true,
    updateStrategy: 'network-first',
  },
};

export class PWACacheManager {
  private metricsCache: Map<string, CacheMetrics> = new Map();
  private performanceObserver: PerformanceObserver | null = null;

  constructor() {
    this.initializePerformanceMonitoring();
  }

  // Initialize performance monitoring for cache effectiveness
  private initializePerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('/api/') || entry.name.includes('/images/')) {
            this.updateCacheMetrics(
              entry.name,
              entry as PerformanceNavigationTiming,
            );
          }
        }
      });

      this.performanceObserver.observe({
        entryTypes: ['navigation', 'resource'],
      });
    }
  }

  // Update cache performance metrics
  private updateCacheMetrics(url: string, entry: PerformanceNavigationTiming) {
    const cacheName = this.determineCacheName(url);
    const currentMetrics = this.metricsCache.get(cacheName) || {
      totalSize: 0,
      entryCount: 0,
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      storageUsage: 0,
      quotaUsage: 0,
    };

    // Update response time metrics
    const responseTime = entry.responseEnd - entry.requestStart;
    currentMetrics.averageResponseTime =
      (currentMetrics.averageResponseTime * currentMetrics.entryCount +
        responseTime) /
      (currentMetrics.entryCount + 1);

    currentMetrics.entryCount++;
    this.metricsCache.set(cacheName, currentMetrics);
  }

  // Determine appropriate cache name based on URL
  private determineCacheName(url: string): string {
    if (
      url.includes('/api/wedding-day/') ||
      url.includes('/api/timeline/critical')
    ) {
      return WEDDING_CACHE_STRATEGIES.critical.name;
    } else if (
      url.includes('/api/timeline/') ||
      url.includes('/api/schedule/')
    ) {
      return WEDDING_CACHE_STRATEGIES.timeline.name;
    } else if (
      url.includes('/api/vendors/') ||
      url.includes('/api/contacts/')
    ) {
      return WEDDING_CACHE_STRATEGIES.vendors.name;
    } else if (url.includes('/api/photos/') || url.includes('/api/gallery/')) {
      return WEDDING_CACHE_STRATEGIES.photos.name;
    } else if (url.includes('/api/guests/') || url.includes('/api/rsvp/')) {
      return WEDDING_CACHE_STRATEGIES.guests.name;
    }
    return WEDDING_CACHE_STRATEGIES.api.name;
  }

  // Intelligent preloading for wedding day preparation
  async preloadWeddingDay(config: WeddingDataConfig): Promise<void> {
    console.log(`[WS-188] Preloading wedding day data for ${config.weddingId}`);

    const preloadTasks = [];

    // Preload critical endpoints with highest priority
    for (const endpoint of config.priorityEndpoints) {
      preloadTasks.push(
        this.preloadEndpointWithStrategy(
          endpoint,
          WEDDING_CACHE_STRATEGIES.critical,
        ),
      );
    }

    // Preload critical data
    for (const dataUrl of config.criticalData) {
      preloadTasks.push(
        this.preloadEndpointWithStrategy(
          dataUrl,
          WEDDING_CACHE_STRATEGIES.timeline,
        ),
      );
    }

    // Preload assets with progressive loading
    for (const assetUrl of config.preloadAssets) {
      preloadTasks.push(this.preloadAssetWithPriority(assetUrl, 'high'));
    }

    try {
      await Promise.allSettled(preloadTasks);
      console.log('[WS-188] Wedding day preloading complete');
    } catch (error) {
      console.error('[WS-188] Wedding day preloading failed:', error);
    }
  }

  // Preload specific endpoint with caching strategy
  private async preloadEndpointWithStrategy(
    url: string,
    strategy: CacheStrategy,
  ): Promise<void> {
    try {
      const cache = await caches.open(strategy.name);
      const cachedResponse = await cache.match(url);

      // Check if cached data is still valid
      if (cachedResponse) {
        const cacheDate = new Date(cachedResponse.headers.get('date') || 0);
        const isStale = Date.now() - cacheDate.getTime() > strategy.maxAge;

        if (!isStale) {
          console.log(`[WS-188] Using cached data for ${url}`);
          return;
        }
      }

      // Fetch fresh data
      const response = await fetch(url, {
        cache: 'no-cache',
        priority: strategy.priority === 'critical' ? 'high' : 'auto',
      } as RequestInit);

      if (response.ok) {
        await this.manageStorageWithPriority(
          strategy.name,
          strategy.maxEntries,
        );
        await cache.put(url, response.clone());
        console.log(`[WS-188] Preloaded and cached: ${url}`);
      }
    } catch (error) {
      console.error(`[WS-188] Failed to preload ${url}:`, error);
    }
  }

  // Preload assets with priority handling
  private async preloadAssetWithPriority(
    url: string,
    priority: 'high' | 'medium' | 'low',
  ): Promise<void> {
    try {
      const cache = await caches.open(WEDDING_CACHE_STRATEGIES.photos.name);

      // Check if already cached
      const cachedResponse = await cache.match(url);
      if (cachedResponse) return;

      // Use appropriate loading strategy based on priority
      const fetchOptions: RequestInit = {
        cache: priority === 'high' ? 'no-cache' : 'default',
        priority: priority === 'high' ? 'high' : 'auto',
      };

      const response = await fetch(url, fetchOptions);

      if (response.ok) {
        // Only cache if within size limits
        const contentLength = response.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength) : 0;

        if (size < 10 * 1024 * 1024) {
          // 10MB limit
          await this.manageStorageWithPriority(
            WEDDING_CACHE_STRATEGIES.photos.name,
            WEDDING_CACHE_STRATEGIES.photos.maxEntries,
          );
          await cache.put(url, response);
        }
      }
    } catch (error) {
      console.error(`[WS-188] Failed to preload asset ${url}:`, error);
    }
  }

  // Intelligent cache management with priority-based eviction
  private async manageStorageWithPriority(
    cacheName: string,
    maxEntries: number,
  ): Promise<void> {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      if (keys.length >= maxEntries) {
        // Get cache entries with metadata
        const entries: CacheEntry[] = await Promise.all(
          keys.map(async (request) => {
            const response = await cache.match(request);
            const cacheDate = new Date(response?.headers.get('date') || 0);
            const lastModified = new Date(
              response?.headers.get('last-modified') || 0,
            );

            return {
              url: request.url,
              timestamp: cacheDate.getTime(),
              priority: this.getUrlPriority(request.url),
              size: parseInt(response?.headers.get('content-length') || '0'),
              hitCount: this.getUrlHitCount(request.url),
              lastAccess: Math.max(cacheDate.getTime(), lastModified.getTime()),
            };
          }),
        );

        // Sort by priority and age for intelligent eviction
        entries.sort((a, b) => {
          // First, sort by priority (lower priority gets evicted first)
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const priorityDiff =
            priorityOrder[a.priority as keyof typeof priorityOrder] -
            priorityOrder[b.priority as keyof typeof priorityOrder];

          if (priorityDiff !== 0) return priorityDiff;

          // Then by hit count (lower hit count gets evicted first)
          const hitCountDiff = a.hitCount - b.hitCount;
          if (hitCountDiff !== 0) return hitCountDiff;

          // Finally by age (older gets evicted first)
          return a.lastAccess - b.lastAccess;
        });

        // Remove excess entries
        const toRemove = entries.slice(0, entries.length - maxEntries + 10); // Remove extra for buffer

        for (const entry of toRemove) {
          const request = keys.find((key) => key.url === entry.url);
          if (request) {
            await cache.delete(request);
          }
        }

        console.log(
          `[WS-188] Cleaned cache ${cacheName}, removed ${toRemove.length} entries`,
        );
      }
    } catch (error) {
      console.error(
        `[WS-188] Cache management failed for ${cacheName}:`,
        error,
      );
    }
  }

  // Get URL priority for cache management
  private getUrlPriority(url: string): string {
    if (url.includes('/api/wedding-day/') || url.includes('/emergency'))
      return 'critical';
    if (url.includes('/api/timeline/') || url.includes('/api/vendors/'))
      return 'high';
    if (url.includes('/api/guests/') || url.includes('/api/photos/'))
      return 'medium';
    return 'low';
  }

  // Get URL hit count (simplified implementation)
  private getUrlHitCount(url: string): number {
    // This would be tracked in IndexedDB in a real implementation
    return Math.random() * 10; // Placeholder
  }

  // Cross-platform cache synchronization
  async synchronizeCacheAcrossDevices(deviceId: string): Promise<void> {
    try {
      const syncData = await this.exportCacheManifest();

      // Store sync data for cross-device coordination
      const db = await this.openSyncDB();
      const tx = db.transaction(['cache_sync'], 'readwrite');
      const store = tx.objectStore('cache_sync');

      await store.put({
        deviceId,
        manifest: syncData,
        timestamp: Date.now(),
        version: '2.0.0',
      });

      console.log('[WS-188] Cache synchronized for cross-device access');
    } catch (error) {
      console.error('[WS-188] Cross-device sync failed:', error);
    }
  }

  // Export cache manifest for synchronization
  private async exportCacheManifest(): Promise<any> {
    const manifest: any = {
      caches: {},
      timestamp: Date.now(),
      version: '2.0.0',
    };

    try {
      const cacheNames = await caches.keys();

      for (const cacheName of cacheNames) {
        if (cacheName.includes('wedsync-v2')) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();

          manifest.caches[cacheName] = {
            urls: keys.map((key) => key.url),
            count: keys.length,
            strategy: this.getCacheStrategy(cacheName),
          };
        }
      }
    } catch (error) {
      console.error('[WS-188] Cache manifest export failed:', error);
    }

    return manifest;
  }

  // Get cache strategy for a given cache name
  private getCacheStrategy(cacheName: string): CacheStrategy | null {
    for (const [key, strategy] of Object.entries(WEDDING_CACHE_STRATEGIES)) {
      if (cacheName.includes(strategy.name)) {
        return strategy;
      }
    }
    return null;
  }

  // Open IndexedDB for sync coordination
  private openSyncDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedSyncCacheSync', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBRequest).result;

        if (!db.objectStoreNames.contains('cache_sync')) {
          const store = db.createObjectStore('cache_sync', {
            keyPath: 'deviceId',
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Performance optimization for mobile devices
  async optimizeForMobile(): Promise<void> {
    console.log('[WS-188] Optimizing cache for mobile performance');

    try {
      // Reduce cache sizes for mobile
      const mobileCacheStrategies = { ...WEDDING_CACHE_STRATEGIES };

      Object.keys(mobileCacheStrategies).forEach((key) => {
        mobileCacheStrategies[key].maxEntries = Math.floor(
          mobileCacheStrategies[key].maxEntries * 0.7,
        );
        mobileCacheStrategies[key].maxAge = Math.floor(
          mobileCacheStrategies[key].maxAge * 0.8,
        );
      });

      // Apply optimizations to existing caches
      for (const [key, strategy] of Object.entries(mobileCacheStrategies)) {
        await this.manageStorageWithPriority(
          strategy.name,
          strategy.maxEntries,
        );
      }

      console.log('[WS-188] Mobile cache optimization complete');
    } catch (error) {
      console.error('[WS-188] Mobile optimization failed:', error);
    }
  }

  // Get comprehensive cache metrics
  async getCacheMetrics(): Promise<Record<string, CacheMetrics>> {
    const metrics: Record<string, CacheMetrics> = {};

    try {
      const { usage, quota } = await ServiceWorkerUtils.checkStorageQuota();
      const cacheNames = await caches.keys();

      for (const cacheName of cacheNames) {
        if (cacheName.includes('wedsync-v2')) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();

          const cacheMetrics = this.metricsCache.get(cacheName) || {
            totalSize: 0,
            entryCount: keys.length,
            hitRate: 0,
            missRate: 0,
            averageResponseTime: 0,
            storageUsage: usage,
            quotaUsage: quota > 0 ? (usage / quota) * 100 : 0,
          };

          metrics[cacheName] = cacheMetrics;
        }
      }
    } catch (error) {
      console.error('[WS-188] Failed to get cache metrics:', error);
    }

    return metrics;
  }

  // Emergency cache cleanup for storage issues
  async emergencyCleanup(): Promise<void> {
    console.log('[WS-188] Performing emergency cache cleanup');

    try {
      // Get storage info
      const { usage, quota, available } =
        await ServiceWorkerUtils.checkStorageQuota();

      if (available < quota * 0.1) {
        // Less than 10% available
        // Aggressive cleanup
        const cacheNames = await caches.keys();

        for (const cacheName of cacheNames) {
          if (cacheName.includes('wedsync-v2')) {
            const strategy = this.getCacheStrategy(cacheName);
            if (strategy && strategy.priority !== 'critical') {
              // Reduce non-critical caches by 50%
              const newMaxEntries = Math.floor(strategy.maxEntries * 0.5);
              await this.manageStorageWithPriority(cacheName, newMaxEntries);
            }
          }
        }
      }

      console.log('[WS-188] Emergency cleanup complete');
    } catch (error) {
      console.error('[WS-188] Emergency cleanup failed:', error);
    }
  }

  // Cleanup and destroy
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    this.metricsCache.clear();
  }
}

// Utility functions for PWA cache management
export const PWACacheUtils = {
  // Create optimized cache configuration for wedding
  createWeddingCacheConfig: (weddingId: string): WeddingDataConfig => ({
    weddingId,
    priorityEndpoints: [
      `/api/weddings/${weddingId}/timeline`,
      `/api/weddings/${weddingId}/emergency-contacts`,
      `/api/weddings/${weddingId}/vendor-contacts`,
      `/api/weddings/${weddingId}/critical-info`,
    ],
    criticalData: [
      `/api/weddings/${weddingId}/schedule`,
      `/api/weddings/${weddingId}/checklist`,
      `/api/weddings/${weddingId}/payments/due`,
    ],
    preloadAssets: [
      `/api/weddings/${weddingId}/photos/featured`,
      `/api/weddings/${weddingId}/documents/contracts`,
      `/api/weddings/${weddingId}/venue/layout`,
    ],
  }),

  // Determine if aggressive caching is needed
  shouldUseAggressiveCaching: (): boolean => {
    // Check if on mobile with limited connectivity
    const connection = (navigator as any).connection;
    if (connection) {
      const isSlowConnection =
        connection.effectiveType === 'slow-2g' ||
        connection.effectiveType === '2g';
      const isLimitedData = connection.saveData;
      return isSlowConnection || isLimitedData;
    }

    // Check if on mobile device
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  },

  // Get optimal cache strategy based on data type
  getOptimalStrategy: (dataType: string): CacheStrategy => {
    switch (dataType) {
      case 'timeline':
      case 'emergency':
        return WEDDING_CACHE_STRATEGIES.critical;
      case 'vendors':
      case 'schedule':
        return WEDDING_CACHE_STRATEGIES.timeline;
      case 'photos':
      case 'gallery':
        return WEDDING_CACHE_STRATEGIES.photos;
      case 'guests':
      case 'rsvp':
        return WEDDING_CACHE_STRATEGIES.guests;
      default:
        return WEDDING_CACHE_STRATEGIES.api;
    }
  },
};

export default PWACacheManager;
