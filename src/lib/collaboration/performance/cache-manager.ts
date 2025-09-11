// WS-342: Real-Time Wedding Collaboration - High-Performance Cache Manager
// Team B Backend Development - Batch 1 Round 1

import { EventEmitter } from 'events';

interface CacheConfig {
  maxMemorySize: number; // in MB
  defaultTTL: number; // in seconds
  maxKeys: number;
  enableCompression: boolean;
  enablePersistence: boolean;
  evictionStrategy: 'lru' | 'lfu' | 'ttl' | 'random';
  compressionThreshold: number; // bytes
  clusterMode: boolean;
  replicationNodes?: string[];
}

interface CacheItem {
  key: string;
  value: any;
  ttl: number;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  size: number;
  compressed: boolean;
  tags: string[];
}

interface CacheStats {
  totalKeys: number;
  memoryUsed: number; // in MB
  hitRate: number;
  missRate: number;
  evictions: number;
  compressionRatio: number;
  avgAccessTime: number;
  lastUpdated: Date;
}

interface CacheLayer {
  name: string;
  priority: number;
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<boolean>;
  del(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
}

export class CacheManager extends EventEmitter {
  private config: CacheConfig;
  private cache: Map<string, CacheItem> = new Map();
  private accessOrder: string[] = []; // For LRU
  private frequencyCount: Map<string, number> = new Map(); // For LFU
  private stats: CacheStats;
  private layers: CacheLayer[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(config: CacheConfig) {
    super();
    this.config = {
      maxMemorySize: 1024, // 1GB default
      defaultTTL: 3600, // 1 hour
      maxKeys: 100000,
      enableCompression: true,
      enablePersistence: false,
      evictionStrategy: 'lru',
      compressionThreshold: 1024, // 1KB
      clusterMode: false,
      ...config,
    };

    this.stats = {
      totalKeys: 0,
      memoryUsed: 0,
      hitRate: 0,
      missRate: 0,
      evictions: 0,
      compressionRatio: 0,
      avgAccessTime: 0,
      lastUpdated: new Date(),
    };

    this.setupCacheLayers();
    this.startBackgroundTasks();
  }

  // Wedding-specific cache operations
  async getWeddingData(weddingId: string, dataType: string): Promise<any> {
    const key = `wedding:${weddingId}:${dataType}`;
    return this.get(key);
  }

  async setWeddingData(
    weddingId: string,
    dataType: string,
    data: any,
    ttl?: number,
  ): Promise<boolean> {
    const key = `wedding:${weddingId}:${dataType}`;
    return this.set(key, data, ttl, [`wedding:${weddingId}`, dataType]);
  }

  async invalidateWeddingCache(weddingId: string): Promise<number> {
    return this.invalidateByTag(`wedding:${weddingId}`);
  }

  // User-specific cache operations
  async getUserPresence(userId: string): Promise<any> {
    const key = `presence:${userId}`;
    return this.get(key);
  }

  async setUserPresence(userId: string, presence: any): Promise<boolean> {
    const key = `presence:${userId}`;
    return this.set(key, presence, 300, ['presence']); // 5 minute TTL
  }

  // Collaboration-specific cache operations
  async getCachedEvents(weddingId: string, since?: Date): Promise<any[]> {
    const key = since
      ? `events:${weddingId}:${since.toISOString()}`
      : `events:${weddingId}:latest`;

    const cached = await this.get(key);
    return cached || [];
  }

  async setCachedEvents(
    weddingId: string,
    events: any[],
    since?: Date,
  ): Promise<boolean> {
    const key = since
      ? `events:${weddingId}:${since.toISOString()}`
      : `events:${weddingId}:latest`;

    return this.set(key, events, 300, [`events:${weddingId}`, 'events']); // 5 minutes
  }

  // Core cache operations
  async get(key: string): Promise<any> {
    const startTime = Date.now();

    try {
      // Try each cache layer in priority order
      for (const layer of this.layers) {
        const value = await layer.get(key);
        if (value !== undefined) {
          this.recordHit(key, Date.now() - startTime);
          return value;
        }
      }

      // Try in-memory cache
      const item = this.cache.get(key);
      if (!item) {
        this.recordMiss(key, Date.now() - startTime);
        return undefined;
      }

      // Check TTL
      if (this.isExpired(item)) {
        this.cache.delete(key);
        this.updateAccessOrder(key, 'remove');
        this.recordMiss(key, Date.now() - startTime);
        return undefined;
      }

      // Update access tracking
      item.lastAccessed = Date.now();
      item.accessCount++;
      this.updateAccessOrder(key, 'access');
      this.updateFrequencyCount(key);

      this.recordHit(key, Date.now() - startTime);

      // Decompress if needed
      return item.compressed ? this.decompress(item.value) : item.value;
    } catch (error) {
      console.error('Cache get error:', error);
      this.recordMiss(key, Date.now() - startTime);
      return undefined;
    }
  }

  async set(
    key: string,
    value: any,
    ttl?: number,
    tags: string[] = [],
  ): Promise<boolean> {
    try {
      const actualTTL = ttl || this.config.defaultTTL;
      const serialized = JSON.stringify(value);
      const size = Buffer.byteLength(serialized, 'utf8');

      // Check if compression is beneficial
      const shouldCompress =
        this.config.enableCompression &&
        size >= this.config.compressionThreshold;

      const finalValue = shouldCompress ? this.compress(value) : value;
      const finalSize = shouldCompress
        ? Buffer.byteLength(JSON.stringify(finalValue), 'utf8')
        : size;

      // Check memory constraints
      if (this.needsEviction(finalSize)) {
        await this.evictItems(finalSize);
      }

      const item: CacheItem = {
        key,
        value: finalValue,
        ttl: actualTTL * 1000, // Convert to milliseconds
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1,
        size: finalSize,
        compressed: shouldCompress,
        tags,
      };

      // Set in layers
      for (const layer of this.layers) {
        await layer.set(key, finalValue, actualTTL);
      }

      // Set in memory cache
      this.cache.set(key, item);
      this.updateAccessOrder(key, 'set');
      this.updateFrequencyCount(key);

      // Update stats
      this.updateMemoryUsage();

      this.emit('cache_set', { key, size: finalSize, ttl: actualTTL });

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      // Delete from layers
      for (const layer of this.layers) {
        await layer.del(key);
      }

      // Delete from memory cache
      const deleted = this.cache.delete(key);
      this.updateAccessOrder(key, 'remove');
      this.frequencyCount.delete(key);

      if (deleted) {
        this.updateMemoryUsage();
        this.emit('cache_del', { key });
      }

      return deleted;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    let invalidatedCount = 0;

    try {
      const keysToDelete: string[] = [];

      for (const [key, item] of this.cache.entries()) {
        if (item.tags.includes(tag)) {
          keysToDelete.push(key);
        }
      }

      // Delete in parallel for better performance
      const deletePromises = keysToDelete.map((key) => this.del(key));
      await Promise.allSettled(deletePromises);

      invalidatedCount = keysToDelete.length;

      this.emit('cache_invalidated', { tag, count: invalidatedCount });
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }

    return invalidatedCount;
  }

  async mget(keys: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    // Get in parallel for better performance
    const getPromises = keys.map(async (key) => {
      const value = await this.get(key);
      return { key, value };
    });

    const settled = await Promise.allSettled(getPromises);

    settled.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.value !== undefined) {
        results.set(result.value.key, result.value.value);
      }
    });

    return results;
  }

  async mset(entries: Map<string, any>, ttl?: number): Promise<boolean> {
    // Set in parallel for better performance
    const setPromises = Array.from(entries.entries()).map(([key, value]) =>
      this.set(key, value, ttl),
    );

    const results = await Promise.allSettled(setPromises);

    // Return true if all sets succeeded
    return results.every(
      (result) => result.status === 'fulfilled' && result.value,
    );
  }

  // Performance optimization methods
  async preload(
    weddingId: string,
  ): Promise<{ loaded: number; errors: number }> {
    const keysToPreload = [
      `wedding:${weddingId}:timeline`,
      `wedding:${weddingId}:budget`,
      `wedding:${weddingId}:guests`,
      `wedding:${weddingId}:vendors`,
      `events:${weddingId}:latest`,
      `presence:${weddingId}`,
    ];

    let loaded = 0;
    let errors = 0;

    // Simulate preloading from database
    const loadPromises = keysToPreload.map(async (key) => {
      try {
        // In real implementation, this would fetch from database
        const mockData = { preloaded: true, key, timestamp: new Date() };
        await this.set(key, mockData, 3600); // 1 hour TTL
        loaded++;
      } catch (error) {
        console.error(`Failed to preload ${key}:`, error);
        errors++;
      }
    });

    await Promise.allSettled(loadPromises);

    this.emit('cache_preloaded', { weddingId, loaded, errors });

    return { loaded, errors };
  }

  // Cache statistics and monitoring
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  async flush(): Promise<boolean> {
    try {
      // Clear layers
      for (const layer of this.layers) {
        await layer.clear();
      }

      // Clear memory cache
      this.cache.clear();
      this.accessOrder = [];
      this.frequencyCount.clear();

      // Reset stats
      this.stats.totalKeys = 0;
      this.stats.memoryUsed = 0;
      this.stats.evictions = 0;

      this.emit('cache_flushed');

      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  // Shutdown cache manager
  async shutdown(): Promise<void> {
    console.log('Shutting down cache manager...');

    // Stop background tasks
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Persist data if enabled
    if (this.config.enablePersistence) {
      await this.persistCache();
    }

    console.log('Cache manager shutdown complete');
  }

  // Private helper methods
  private setupCacheLayers(): void {
    // In a real implementation, this would set up Redis, Memcached, etc.
    console.log('Setting up cache layers...');
  }

  private startBackgroundTasks(): void {
    // Start cleanup task
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredItems();
    }, 60000); // Every minute

    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.updateStats();
    }, 10000); // Every 10 seconds
  }

  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.createdAt > item.ttl;
  }

  private updateAccessOrder(
    key: string,
    action: 'set' | 'access' | 'remove',
  ): void {
    const index = this.accessOrder.indexOf(key);

    if (action === 'remove') {
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    } else {
      // Move to end (most recently used)
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);
    }
  }

  private updateFrequencyCount(key: string): void {
    const currentCount = this.frequencyCount.get(key) || 0;
    this.frequencyCount.set(key, currentCount + 1);
  }

  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const item of this.cache.values()) {
      totalSize += item.size;
    }
    this.stats.memoryUsed = totalSize / (1024 * 1024); // Convert to MB
    this.stats.totalKeys = this.cache.size;
  }

  private needsEviction(newItemSize: number): boolean {
    const currentMemory = this.stats.memoryUsed;
    const newItemSizeMB = newItemSize / (1024 * 1024);

    return (
      currentMemory + newItemSizeMB > this.config.maxMemorySize ||
      this.cache.size >= this.config.maxKeys
    );
  }

  private async evictItems(requiredSpace: number): Promise<void> {
    const requiredSpaceMB = requiredSpace / (1024 * 1024);
    let freedSpace = 0;
    let evicted = 0;

    while (freedSpace < requiredSpaceMB && this.cache.size > 0) {
      const keyToEvict = this.selectEvictionCandidate();
      if (!keyToEvict) break;

      const item = this.cache.get(keyToEvict);
      if (item) {
        freedSpace += item.size / (1024 * 1024);
        await this.del(keyToEvict);
        evicted++;
      }
    }

    this.stats.evictions += evicted;
    this.emit('cache_evicted', { count: evicted, freedSpace });
  }

  private selectEvictionCandidate(): string | null {
    switch (this.config.evictionStrategy) {
      case 'lru':
        return this.accessOrder[0] || null;

      case 'lfu':
        let minFreq = Infinity;
        let lfu = null;
        for (const [key, freq] of this.frequencyCount.entries()) {
          if (freq < minFreq) {
            minFreq = freq;
            lfu = key;
          }
        }
        return lfu;

      case 'ttl':
        let earliestExpiry = Infinity;
        let ttlCandidate = null;
        for (const [key, item] of this.cache.entries()) {
          const expiryTime = item.createdAt + item.ttl;
          if (expiryTime < earliestExpiry) {
            earliestExpiry = expiryTime;
            ttlCandidate = key;
          }
        }
        return ttlCandidate;

      case 'random':
        const keys = Array.from(this.cache.keys());
        return keys[Math.floor(Math.random() * keys.length)];

      default:
        return this.accessOrder[0] || null;
    }
  }

  private cleanupExpiredItems(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.del(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.emit('cache_cleaned', { count: cleaned });
    }
  }

  private compress(value: any): any {
    // In a real implementation, this would use a compression library like zlib
    return { __compressed: true, data: JSON.stringify(value) };
  }

  private decompress(value: any): any {
    if (value && value.__compressed) {
      return JSON.parse(value.data);
    }
    return value;
  }

  private recordHit(key: string, responseTime: number): void {
    // Update hit rate calculation
    this.emit('cache_hit', { key, responseTime });
  }

  private recordMiss(key: string, responseTime: number): void {
    // Update miss rate calculation
    this.emit('cache_miss', { key, responseTime });
  }

  private updateStats(): void {
    // Calculate hit/miss rates, compression ratios, etc.
    this.updateMemoryUsage();
    this.stats.lastUpdated = new Date();
    this.emit('stats_updated', this.stats);
  }

  private async persistCache(): Promise<void> {
    // In a real implementation, this would persist cache to disk
    console.log('Persisting cache data...');
  }
}
