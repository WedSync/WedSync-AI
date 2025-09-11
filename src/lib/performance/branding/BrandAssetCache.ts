/**
 * WS-221 Team D - Brand Asset Caching System
 * Advanced caching strategies for high-performance mobile branding
 */

import { BrandAsset } from './AssetOptimization';

export interface CacheConfig {
  maxMemorySize: number; // MB
  maxStorageSize: number; // MB
  ttl: number; // Time to live in ms
  compressionEnabled: boolean;
  preloadStrategy: 'critical' | 'lazy' | 'aggressive';
}

export interface CacheEntry {
  key: string;
  data: BrandAsset;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressed?: boolean;
}

export class BrandAssetCache {
  private static instance: BrandAssetCache;
  private memoryCache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private storagePrefix = 'wedsync_brand_cache_';
  private currentMemorySize = 0;

  private constructor(config: CacheConfig) {
    this.config = config;
    this.initializeCache();
  }

  public static getInstance(config?: CacheConfig): BrandAssetCache {
    if (!BrandAssetCache.instance) {
      const defaultConfig: CacheConfig = {
        maxMemorySize: 50, // 50MB
        maxStorageSize: 200, // 200MB
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        compressionEnabled: true,
        preloadStrategy: 'critical',
      };
      BrandAssetCache.instance = new BrandAssetCache(config || defaultConfig);
    }
    return BrandAssetCache.instance;
  }

  /**
   * Store brand asset in multi-level cache
   */
  async set(key: string, asset: BrandAsset): Promise<void> {
    try {
      const entry: CacheEntry = {
        key,
        data: asset,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        size: this.calculateAssetSize(asset),
        compressed: false,
      };

      // Compress if enabled and asset is large
      if (this.config.compressionEnabled && entry.size > 1024 * 1024) {
        // > 1MB
        entry.data = await this.compressAsset(asset);
        entry.compressed = true;
      }

      // Store in memory cache
      await this.setInMemory(key, entry);

      // Store in persistent storage for critical assets
      if (this.isCriticalAsset(asset)) {
        await this.setInStorage(key, entry);
      }

      // Preload related assets based on strategy
      if (this.config.preloadStrategy === 'aggressive') {
        this.preloadRelatedAssets(asset);
      }
    } catch (error) {
      console.error(`Failed to cache asset ${key}:`, error);
    }
  }

  /**
   * Retrieve brand asset from cache with fallback strategy
   */
  async get(key: string): Promise<BrandAsset | null> {
    try {
      // Try memory cache first (fastest)
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isEntryValid(memoryEntry)) {
        this.updateAccessStats(memoryEntry);
        return this.decompressIfNeeded(
          memoryEntry.data,
          memoryEntry.compressed,
        );
      }

      // Try persistent storage (slower but more reliable)
      const storageEntry = await this.getFromStorage(key);
      if (storageEntry && this.isEntryValid(storageEntry)) {
        // Promote to memory cache
        this.memoryCache.set(key, storageEntry);
        this.updateAccessStats(storageEntry);
        return this.decompressIfNeeded(
          storageEntry.data,
          storageEntry.compressed,
        );
      }

      return null;
    } catch (error) {
      console.error(`Failed to retrieve cached asset ${key}:`, error);
      return null;
    }
  }

  /**
   * Preload critical assets for organization
   */
  async preloadCriticalAssets(organizationId: string): Promise<void> {
    const criticalKeys = await this.getCriticalAssetKeys(organizationId);
    const preloadPromises = criticalKeys.map((key) => this.warmCache(key));

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Clear cache based on various strategies
   */
  async clear(
    strategy: 'all' | 'expired' | 'lru' | 'organization',
    organizationId?: string,
  ): Promise<void> {
    switch (strategy) {
      case 'all':
        this.memoryCache.clear();
        await this.clearStorage();
        this.currentMemorySize = 0;
        break;

      case 'expired':
        await this.clearExpired();
        break;

      case 'lru':
        await this.evictLeastRecentlyUsed();
        break;

      case 'organization':
        if (organizationId) {
          await this.clearByOrganization(organizationId);
        }
        break;
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): {
    memoryUsage: number;
    storageUsage: number;
    hitRate: number;
    entryCount: number;
    averageAccessCount: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entries = Array.from(this.memoryCache.values());
    const totalAccess = entries.reduce(
      (sum, entry) => sum + entry.accessCount,
      0,
    );
    const timestamps = entries.map((e) => e.timestamp);

    return {
      memoryUsage: this.currentMemorySize,
      storageUsage: this.getStorageUsage(),
      hitRate: this.calculateHitRate(),
      entryCount: entries.length,
      averageAccessCount: entries.length > 0 ? totalAccess / entries.length : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
    };
  }

  /**
   * Optimize cache performance
   */
  async optimize(): Promise<void> {
    // Remove expired entries
    await this.clearExpired();

    // Compress large assets if not already compressed
    await this.compressUncompressedAssets();

    // Reorganize storage for better performance
    await this.defragmentStorage();

    // Preload frequently accessed assets
    await this.preloadFrequentlyAccessed();
  }

  // Private methods
  private initializeCache(): void {
    // Set up periodic cleanup
    setInterval(
      () => {
        this.clearExpired();
      },
      60 * 60 * 1000,
    ); // Every hour

    // Set up memory pressure monitoring
    if ('memory' in performance) {
      setInterval(
        () => {
          this.handleMemoryPressure();
        },
        5 * 60 * 1000,
      ); // Every 5 minutes
    }

    // Load critical assets on initialization
    this.loadInitialAssets();
  }

  private async setInMemory(key: string, entry: CacheEntry): Promise<void> {
    // Check memory limits
    if (
      this.currentMemorySize + entry.size >
      this.config.maxMemorySize * 1024 * 1024
    ) {
      await this.evictLeastRecentlyUsed();
    }

    this.memoryCache.set(key, entry);
    this.currentMemorySize += entry.size;
  }

  private async setInStorage(key: string, entry: CacheEntry): Promise<void> {
    if (!('localStorage' in window)) return;

    try {
      const serialized = JSON.stringify(entry);
      localStorage.setItem(this.storagePrefix + key, serialized);
    } catch (error) {
      // Handle storage quota exceeded
      if (error.name === 'QuotaExceededError') {
        await this.freeStorageSpace();
        // Retry once
        try {
          const serialized = JSON.stringify(entry);
          localStorage.setItem(this.storagePrefix + key, serialized);
        } catch (retryError) {
          console.warn('Storage quota exceeded, cannot cache asset');
        }
      }
    }
  }

  private async getFromStorage(key: string): Promise<CacheEntry | null> {
    if (!('localStorage' in window)) return null;

    try {
      const serialized = localStorage.getItem(this.storagePrefix + key);
      if (!serialized) return null;

      const entry = JSON.parse(serialized) as CacheEntry;
      return entry;
    } catch (error) {
      console.warn(`Failed to parse cached entry ${key}:`, error);
      return null;
    }
  }

  private isEntryValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age < this.config.ttl;
  }

  private updateAccessStats(entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  private calculateAssetSize(asset: BrandAsset): number {
    // Estimate size based on asset data (implement actual size calculation)
    return JSON.stringify(asset).length * 2; // Rough estimate
  }

  private async compressAsset(asset: BrandAsset): Promise<BrandAsset> {
    // Implement compression logic (placeholder)
    return asset;
  }

  private async decompressIfNeeded(
    asset: BrandAsset,
    compressed?: boolean,
  ): Promise<BrandAsset> {
    if (compressed) {
      // Implement decompression logic (placeholder)
      return asset;
    }
    return asset;
  }

  private isCriticalAsset(asset: BrandAsset): boolean {
    return asset.type === 'logo' || asset.type === 'favicon';
  }

  private async preloadRelatedAssets(asset: BrandAsset): Promise<void> {
    // Implement related asset preloading logic
  }

  private async getCriticalAssetKeys(
    organizationId: string,
  ): Promise<string[]> {
    // In real implementation, fetch from database
    return Array.from(this.memoryCache.keys()).filter(
      (key) => key.includes('logo') || key.includes('favicon'),
    );
  }

  private async warmCache(key: string): Promise<void> {
    // Implement cache warming logic
  }

  private async clearExpired(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp > this.config.ttl) {
        expiredKeys.push(key);
        this.currentMemorySize -= entry.size;
      }
    });

    expiredKeys.forEach((key) => {
      this.memoryCache.delete(key);
      if ('localStorage' in window) {
        localStorage.removeItem(this.storagePrefix + key);
      }
    });
  }

  private async evictLeastRecentlyUsed(): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    // Remove 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove && entries[i]; i++) {
      const [key, entry] = entries[i];
      this.memoryCache.delete(key);
      this.currentMemorySize -= entry.size;
    }
  }

  private async clearStorage(): Promise<void> {
    if (!('localStorage' in window)) return;

    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.storagePrefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  private async clearByOrganization(organizationId: string): Promise<void> {
    const keysToRemove: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (key.includes(organizationId)) {
        keysToRemove.push(key);
        this.currentMemorySize -= entry.size;
      }
    });

    keysToRemove.forEach((key) => {
      this.memoryCache.delete(key);
      if ('localStorage' in window) {
        localStorage.removeItem(this.storagePrefix + key);
      }
    });
  }

  private getStorageUsage(): number {
    if (!('localStorage' in window)) return 0;

    let totalSize = 0;
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(this.storagePrefix)) {
        totalSize += localStorage.getItem(key)?.length || 0;
      }
    });

    return totalSize / (1024 * 1024); // Convert to MB
  }

  private calculateHitRate(): number {
    // Implement hit rate calculation (placeholder)
    return 0.85;
  }

  private async compressUncompressedAssets(): Promise<void> {
    // Implement compression optimization
  }

  private async defragmentStorage(): Promise<void> {
    // Implement storage defragmentation
  }

  private async preloadFrequentlyAccessed(): Promise<void> {
    // Implement frequent asset preloading
  }

  private handleMemoryPressure(): void {
    const memory = (performance as any).memory;
    if (memory && memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
      this.evictLeastRecentlyUsed();
    }
  }

  private async freeStorageSpace(): Promise<void> {
    // Remove oldest entries to free space
    const keys = Object.keys(localStorage)
      .filter((key) => key.startsWith(this.storagePrefix))
      .map((key) => {
        const data = localStorage.getItem(key);
        const entry = data ? JSON.parse(data) : null;
        return { key, timestamp: entry?.timestamp || 0 };
      })
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 10); // Remove 10 oldest entries

    keys.forEach(({ key }) => localStorage.removeItem(key));
  }

  private async loadInitialAssets(): Promise<void> {
    // Load critical assets on app start
    if (
      this.config.preloadStrategy === 'critical' ||
      this.config.preloadStrategy === 'aggressive'
    ) {
      // Implement initial asset loading
    }
  }
}

export const brandAssetCache = BrandAssetCache.getInstance();
