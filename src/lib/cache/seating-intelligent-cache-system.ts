/**
 * WS-154 Seating Arrangements - Intelligent Multi-Layer Caching System
 * Team E - Round 2: Advanced Database Optimization & Analytics
 * Target: 70% database load reduction, sub-100ms response times
 */

import { Redis } from 'ioredis';
import { LRUCache } from 'lru-cache';
import type {
  SeatingArrangementWithDetails,
  GuestRelationship,
  ConflictDetectionResponse,
} from '@/types/seating';

// ==================================================
// CACHE LAYER DEFINITIONS
// ==================================================

interface CacheLayer {
  name: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage?: number;
}

interface CacheConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  memory: {
    maxSize: number;
    maxAge: number;
  };
  browserStorage: {
    maxSize: number;
    maxAge: number;
  };
}

// ==================================================
// MEMORY CACHE LAYER (L1 - FASTEST)
// ==================================================

class MemoryCacheLayer implements CacheLayer {
  name = 'memory';
  private cache: LRUCache<string, any>;
  private stats = { hits: 0, misses: 0 };

  constructor(config: { maxSize: number; maxAge: number }) {
    this.cache = new LRUCache({
      max: config.maxSize,
      ttl: config.maxAge,
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.cache.get(key) as T | undefined;
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (ttl) {
      this.cache.set(key, value, { ttl });
    } else {
      this.cache.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.cache.size,
      memoryUsage: this.cache.calculatedSize || 0,
    };
  }
}

// ==================================================
// REDIS CACHE LAYER (L2 - DISTRIBUTED)
// ==================================================

class RedisCacheLayer implements CacheLayer {
  name = 'redis';
  private redis: Redis | null = null;
  private stats = { hits: 0, misses: 0 };
  private connected = false;

  constructor(config?: CacheConfig['redis']) {
    if (config) {
      this.initializeRedis(config);
    }
  }

  private async initializeRedis(config: CacheConfig['redis']): Promise<void> {
    try {
      this.redis = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 3000,
      });

      await this.redis.connect();
      this.connected = true;
    } catch (error) {
      console.warn('Redis cache layer failed to initialize:', error);
      this.connected = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.connected || !this.redis) {
      this.stats.misses++;
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value) {
        this.stats.hits++;
        return JSON.parse(value);
      }
    } catch (error) {
      console.warn('Redis get error:', error);
    }

    this.stats.misses++;
    return null;
  }

  async set<T>(key: string, value: T, ttl: number = 1800): Promise<void> {
    if (!this.connected || !this.redis) return;

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
    } catch (error) {
      console.warn('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.connected || !this.redis) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      console.warn('Redis delete error:', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.connected || !this.redis) return;

    try {
      await this.redis.flushdb();
    } catch (error) {
      console.warn('Redis clear error:', error);
    }
  }

  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    let memoryUsage = 0;

    if (this.connected && this.redis) {
      try {
        const info = await this.redis.memory('usage');
        memoryUsage = typeof info === 'number' ? info : 0;
      } catch (error) {
        // Ignore memory usage errors
      }
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: -1, // Unknown for Redis
      memoryUsage,
    };
  }
}

// ==================================================
// BROWSER STORAGE CACHE LAYER (L3 - PERSISTENT)
// ==================================================

class BrowserStorageCacheLayer implements CacheLayer {
  name = 'browser';
  private prefix = 'ws154_seating_';
  private stats = { hits: 0, misses: 0 };
  private config: { maxSize: number; maxAge: number };

  constructor(config: { maxSize: number; maxAge: number }) {
    this.config = config;
  }

  private getStorageKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private isExpired(item: { timestamp: number; ttl: number }): boolean {
    return Date.now() - item.timestamp > item.ttl * 1000;
  }

  async get<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') {
      this.stats.misses++;
      return null;
    }

    try {
      const storageKey = this.getStorageKey(key);
      const stored = localStorage.getItem(storageKey);

      if (!stored) {
        this.stats.misses++;
        return null;
      }

      const item = JSON.parse(stored);

      if (this.isExpired(item)) {
        localStorage.removeItem(storageKey);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return item.value;
    } catch (error) {
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    ttl: number = this.config.maxAge,
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = this.getStorageKey(key);
      const item = {
        value,
        timestamp: Date.now(),
        ttl,
      };

      localStorage.setItem(storageKey, JSON.stringify(item));

      // Cleanup old items if we're over the size limit
      await this.cleanup();
    } catch (error) {
      console.warn('Browser storage set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = this.getStorageKey(key);
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Browser storage delete error:', error);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.prefix),
      );
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Browser storage clear error:', error);
    }
  }

  private async cleanup(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.prefix),
      );

      // Remove expired items
      keys.forEach((key) => {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const item = JSON.parse(stored);
            if (this.isExpired(item)) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          localStorage.removeItem(key);
        }
      });

      // If still over limit, remove oldest items
      const remainingKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.prefix),
      );

      if (remainingKeys.length > this.config.maxSize) {
        const itemsWithAge = remainingKeys.map((key) => {
          try {
            const stored = localStorage.getItem(key);
            const item = stored ? JSON.parse(stored) : null;
            return { key, timestamp: item?.timestamp || 0 };
          } catch {
            return { key, timestamp: 0 };
          }
        });

        itemsWithAge
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(0, remainingKeys.length - this.config.maxSize)
          .forEach(({ key }) => localStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('Browser storage cleanup error:', error);
    }
  }

  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    let size = 0;
    let memoryUsage = 0;

    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage).filter((key) =>
          key.startsWith(this.prefix),
        );
        size = keys.length;
        memoryUsage = keys.reduce((sum, key) => {
          const value = localStorage.getItem(key);
          return sum + (value ? value.length : 0);
        }, 0);
      } catch (error) {
        // Ignore stats errors
      }
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size,
      memoryUsage,
    };
  }
}

// ==================================================
// INTELLIGENT MULTI-LAYER CACHE MANAGER
// ==================================================

export class SeatingIntelligentCacheSystem {
  private layers: CacheLayer[] = [];
  private globalStats = {
    totalRequests: 0,
    totalHits: 0,
    layerHits: new Map<string, number>(),
    averageResponseTime: 0,
    responseTimeSum: 0,
  };

  constructor(config: CacheConfig) {
    // Layer 1: Memory cache (fastest)
    this.layers.push(new MemoryCacheLayer(config.memory));

    // Layer 2: Redis cache (distributed)
    if (config.redis) {
      this.layers.push(new RedisCacheLayer(config.redis));
    }

    // Layer 3: Browser storage (persistent)
    this.layers.push(new BrowserStorageCacheLayer(config.browserStorage));
  }

  /**
   * Get value with intelligent multi-layer lookup
   */
  async get<T>(key: string, fallback?: () => Promise<T>): Promise<T | null> {
    const startTime = performance.now();
    this.globalStats.totalRequests++;

    // Try each cache layer in order
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      try {
        const value = await layer.get<T>(key);

        if (value !== null) {
          // Cache hit - backfill higher layers
          await this.backfillHigherLayers(key, value, i);

          // Update statistics
          this.globalStats.totalHits++;
          const layerHits = this.globalStats.layerHits.get(layer.name) || 0;
          this.globalStats.layerHits.set(layer.name, layerHits + 1);

          this.updateResponseTime(startTime);
          return value;
        }
      } catch (error) {
        console.warn(`Cache layer ${layer.name} error:`, error);
        // Continue to next layer
      }
    }

    // Cache miss - use fallback if provided
    if (fallback) {
      try {
        const value = await fallback();
        if (value !== null) {
          // Store in all layers
          await this.setAllLayers(key, value);
        }
        this.updateResponseTime(startTime);
        return value;
      } catch (error) {
        console.error('Cache fallback error:', error);
        this.updateResponseTime(startTime);
        return null;
      }
    }

    this.updateResponseTime(startTime);
    return null;
  }

  /**
   * Set value in all cache layers
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.setAllLayers(key, value, ttl);
  }

  /**
   * Delete from all cache layers
   */
  async delete(key: string): Promise<void> {
    await Promise.all(
      this.layers.map((layer) =>
        layer
          .delete(key)
          .catch((error) =>
            console.warn(`Delete error in ${layer.name}:`, error),
          ),
      ),
    );
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    await Promise.all(
      this.layers.map((layer) =>
        layer
          .clear()
          .catch((error) =>
            console.warn(`Clear error in ${layer.name}:`, error),
          ),
      ),
    );
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // For now, just clear everything - can be optimized later
    await this.clear();
  }

  /**
   * Backfill higher cache layers when value found in lower layer
   */
  private async backfillHigherLayers<T>(
    key: string,
    value: T,
    hitLayerIndex: number,
  ): Promise<void> {
    if (hitLayerIndex === 0) return; // Already in highest layer

    const backfillPromises = [];
    for (let i = 0; i < hitLayerIndex; i++) {
      backfillPromises.push(
        this.layers[i]
          .set(key, value)
          .catch((error) =>
            console.warn(`Backfill error in ${this.layers[i].name}:`, error),
          ),
      );
    }

    await Promise.all(backfillPromises);
  }

  /**
   * Set value in all layers
   */
  private async setAllLayers<T>(
    key: string,
    value: T,
    ttl?: number,
  ): Promise<void> {
    const setPromises = this.layers.map((layer) =>
      layer
        .set(key, value, ttl)
        .catch((error) => console.warn(`Set error in ${layer.name}:`, error)),
    );

    await Promise.all(setPromises);
  }

  /**
   * Update response time statistics
   */
  private updateResponseTime(startTime: number): void {
    const responseTime = performance.now() - startTime;
    this.globalStats.responseTimeSum += responseTime;
    this.globalStats.averageResponseTime =
      this.globalStats.responseTimeSum / this.globalStats.totalRequests;
  }

  /**
   * Get comprehensive cache statistics
   */
  async getStats(): Promise<{
    global: {
      totalRequests: number;
      totalHits: number;
      globalHitRate: number;
      averageResponseTime: number;
      layerHits: Record<string, number>;
    };
    layers: Record<string, CacheStats>;
  }> {
    const layerStats: Record<string, CacheStats> = {};

    for (const layer of this.layers) {
      try {
        layerStats[layer.name] = await layer.getStats();
      } catch (error) {
        console.warn(`Stats error for ${layer.name}:`, error);
        layerStats[layer.name] = {
          hits: 0,
          misses: 0,
          hitRate: 0,
          size: 0,
        };
      }
    }

    return {
      global: {
        totalRequests: this.globalStats.totalRequests,
        totalHits: this.globalStats.totalHits,
        globalHitRate:
          this.globalStats.totalRequests > 0
            ? this.globalStats.totalHits / this.globalStats.totalRequests
            : 0,
        averageResponseTime: this.globalStats.averageResponseTime,
        layerHits: Object.fromEntries(this.globalStats.layerHits),
      },
      layers: layerStats,
    };
  }

  /**
   * Warm up cache with commonly accessed data
   */
  async warmup(
    coupleId: string,
    preloadFunctions: Array<() => Promise<any>>,
  ): Promise<void> {
    const warmupPromises = preloadFunctions.map(async (fn, index) => {
      try {
        const key = `warmup_${coupleId}_${index}`;
        const value = await fn();
        if (value) {
          await this.set(key, value, 3600); // 1 hour TTL
        }
      } catch (error) {
        console.warn(`Warmup function ${index} failed:`, error);
      }
    });

    await Promise.all(warmupPromises);
  }

  /**
   * Get cache key for seating operations
   */
  static getCacheKey(operation: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join('|');

    return `seating:${operation}:${sortedParams}`;
  }

  /**
   * Get cache TTL based on data type
   */
  static getTTL(
    dataType: 'arrangement' | 'relationships' | 'conflicts' | 'analytics',
  ): number {
    switch (dataType) {
      case 'arrangement':
        return 3600; // 1 hour - changes less frequently
      case 'relationships':
        return 1800; // 30 minutes - moderate changes
      case 'conflicts':
        return 600; // 10 minutes - needs to be fresh
      case 'analytics':
        return 300; // 5 minutes - dynamic data
      default:
        return 900; // 15 minutes default
    }
  }
}

// ==================================================
// SEATING-SPECIFIC CACHE OPERATIONS
// ==================================================

export class SeatingCacheOperations {
  constructor(private cacheSystem: SeatingIntelligentCacheSystem) {}

  /**
   * Cached seating arrangement retrieval
   */
  async getSeatingArrangement(
    arrangementId: string,
    fallback: () => Promise<SeatingArrangementWithDetails>,
  ): Promise<SeatingArrangementWithDetails | null> {
    const key = SeatingIntelligentCacheSystem.getCacheKey('arrangement', {
      arrangementId,
    });
    return await this.cacheSystem.get(key, fallback);
  }

  /**
   * Cached relationship lookup
   */
  async getGuestRelationships(
    coupleId: string,
    fallback: () => Promise<GuestRelationship[]>,
  ): Promise<GuestRelationship[] | null> {
    const key = SeatingIntelligentCacheSystem.getCacheKey('relationships', {
      coupleId,
    });
    return await this.cacheSystem.get(key, fallback);
  }

  /**
   * Cached conflict detection
   */
  async getSeatingConflicts(
    arrangementId: string,
    fallback: () => Promise<ConflictDetectionResponse>,
  ): Promise<ConflictDetectionResponse | null> {
    const key = SeatingIntelligentCacheSystem.getCacheKey('conflicts', {
      arrangementId,
    });
    return await this.cacheSystem.get(key, fallback);
  }

  /**
   * Cache seating analytics
   */
  async getSeatingAnalytics(
    coupleId: string,
    arrangementId?: string,
    fallback?: () => Promise<any>,
  ): Promise<any | null> {
    const key = SeatingIntelligentCacheSystem.getCacheKey('analytics', {
      coupleId,
      arrangementId,
    });
    return await this.cacheSystem.get(key, fallback);
  }

  /**
   * Invalidate arrangement-related caches
   */
  async invalidateArrangement(
    arrangementId: string,
    coupleId: string,
  ): Promise<void> {
    const keys = [
      SeatingIntelligentCacheSystem.getCacheKey('arrangement', {
        arrangementId,
      }),
      SeatingIntelligentCacheSystem.getCacheKey('conflicts', { arrangementId }),
      SeatingIntelligentCacheSystem.getCacheKey('analytics', {
        coupleId,
        arrangementId,
      }),
      SeatingIntelligentCacheSystem.getCacheKey('relationships', { coupleId }),
    ];

    await Promise.all(keys.map((key) => this.cacheSystem.delete(key)));
  }
}

// ==================================================
// CACHE FACTORY
// ==================================================

export function createSeatingCacheSystem(
  config?: Partial<CacheConfig>,
): SeatingIntelligentCacheSystem {
  const defaultConfig: CacheConfig = {
    memory: {
      maxSize: 1000,
      maxAge: 600000, // 10 minutes
    },
    browserStorage: {
      maxSize: 500,
      maxAge: 3600, // 1 hour
    },
  };

  const mergedConfig = {
    ...defaultConfig,
    ...config,
    memory: { ...defaultConfig.memory, ...config?.memory },
    browserStorage: {
      ...defaultConfig.browserStorage,
      ...config?.browserStorage,
    },
  };

  return new SeatingIntelligentCacheSystem(mergedConfig);
}

// Export singleton instance
export const seatingCacheSystem = createSeatingCacheSystem();
export const seatingCacheOps = new SeatingCacheOperations(seatingCacheSystem);
