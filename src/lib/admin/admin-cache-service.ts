/**
 * Admin Cache Service - WS-229
 * High-performance caching for admin operations with mobile optimization
 * Features: Redis fallback, compression, performance monitoring
 */

import { Redis } from 'ioredis';
import LRU from 'lru-cache';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  compress?: boolean; // Compress large payloads
  maxAge?: number; // Client-side cache max age
  staleWhileRevalidate?: number; // Serve stale data while refreshing
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  averageResponseTime: number;
  cacheSize: number;
  memoryUsage: number;
}

interface AdminCacheKey {
  namespace: 'system' | 'users' | 'analytics' | 'performance';
  key: string;
  userId?: string;
  mobile?: boolean;
}

class AdminCacheService {
  private redis: Redis | null = null;
  private memoryCache: LRU<string, any>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    cacheSize: 0,
    memoryUsage: 0,
  };
  private compressionThreshold = 1024; // 1KB

  constructor() {
    // Initialize LRU cache with mobile-optimized settings
    this.memoryCache = new LRU({
      max: 1000, // Maximum number of items
      maxSize: 50 * 1024 * 1024, // 50MB max memory usage
      sizeCalculation: (value) => this.calculateSize(JSON.stringify(value)),
      ttl: 5 * 60 * 1000, // 5 minutes default TTL
      allowStale: true, // Allow stale data for performance
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });

    this.initRedis();
    this.startStatsCollector();
  }

  private async initRedis() {
    try {
      // Try to connect to Redis
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          return err.message.includes(targetError);
        },
      });

      await this.redis.ping();
      logger.info('Admin cache service: Redis connected');
    } catch (error) {
      logger.warn(
        'Admin cache service: Redis not available, using memory cache only',
        { error },
      );
      this.redis = null;
    }
  }

  private buildCacheKey(cacheKey: AdminCacheKey): string {
    const parts = ['admin', cacheKey.namespace, cacheKey.key];

    if (cacheKey.userId) {
      parts.push(`user:${cacheKey.userId}`);
    }

    if (cacheKey.mobile) {
      parts.push('mobile');
    }

    return parts.join(':');
  }

  async get<T>(
    cacheKey: AdminCacheKey,
    options: CacheOptions = {},
  ): Promise<T | null> {
    const startTime = performance.now();
    const key = this.buildCacheKey(cacheKey);
    this.stats.totalRequests++;

    try {
      // Try memory cache first (fastest)
      let data = this.memoryCache.get(key);

      if (data !== undefined) {
        this.recordHit(startTime, 'memory');
        return this.decompress(data) as T;
      }

      // Try Redis if available
      if (this.redis) {
        const redisData = await this.redis.get(key);
        if (redisData) {
          const parsed = JSON.parse(redisData);
          const decompressed = this.decompress(parsed);

          // Backfill memory cache
          this.memoryCache.set(key, parsed, {
            ttl: (options.ttl || 300) * 1000,
          });

          this.recordHit(startTime, 'redis');
          return decompressed as T;
        }
      }

      this.recordMiss(startTime);
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      this.recordMiss(startTime);
      return null;
    }
  }

  async set<T>(
    cacheKey: AdminCacheKey,
    data: T,
    options: CacheOptions = {},
  ): Promise<void> {
    const key = this.buildCacheKey(cacheKey);
    const ttl = options.ttl || 300; // 5 minutes default
    const compressed = options.compress ? this.compress(data) : data;

    try {
      // Store in memory cache
      this.memoryCache.set(key, compressed, { ttl: ttl * 1000 });

      // Store in Redis if available
      if (this.redis) {
        const serialized = JSON.stringify(compressed);
        await this.redis.setex(key, ttl, serialized);
      }

      // Update cache size stats
      this.updateCacheStats();

      metrics.incrementCounter('admin.cache.sets', 1, {
        namespace: cacheKey.namespace,
        compressed: options.compress?.toString() || 'false',
        mobile: cacheKey.mobile?.toString() || 'false',
      });
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  async delete(cacheKey: AdminCacheKey): Promise<void> {
    const key = this.buildCacheKey(cacheKey);

    try {
      // Delete from memory cache
      this.memoryCache.delete(key);

      // Delete from Redis if available
      if (this.redis) {
        await this.redis.del(key);
      }

      metrics.incrementCounter('admin.cache.deletes', 1, {
        namespace: cacheKey.namespace,
      });
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  async invalidateNamespace(namespace: string): Promise<void> {
    try {
      // Clear memory cache entries for namespace
      const keysToDelete: string[] = [];
      for (const [key] of this.memoryCache) {
        if (key.includes(`:${namespace}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.memoryCache.delete(key));

      // Clear Redis entries if available
      if (this.redis) {
        const pattern = `admin:${namespace}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      logger.info('Cache namespace invalidated', {
        namespace,
        keysCleared: keysToDelete.length,
      });

      metrics.incrementCounter('admin.cache.namespace_invalidations', 1, {
        namespace,
      });
    } catch (error) {
      logger.error('Cache namespace invalidation error', { namespace, error });
    }
  }

  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();

      if (this.redis) {
        const keys = await this.redis.keys('admin:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      this.resetStats();
      logger.info('Admin cache cleared');
    } catch (error) {
      logger.error('Cache clear error', { error });
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Mobile-optimized methods
  async getMobileOptimized<T>(
    cacheKey: AdminCacheKey,
    options: CacheOptions = {},
  ): Promise<T | null> {
    const mobileKey = { ...cacheKey, mobile: true };
    return this.get<T>(mobileKey, {
      ...options,
      compress: true,
      ttl: (options.ttl || 300) * 2, // Longer TTL for mobile
    });
  }

  async setMobileOptimized<T>(
    cacheKey: AdminCacheKey,
    data: T,
    options: CacheOptions = {},
  ): Promise<void> {
    const mobileKey = { ...cacheKey, mobile: true };

    // Compress and optimize data for mobile
    const optimizedData = this.optimizeForMobile(data);

    return this.set(mobileKey, optimizedData, {
      ...options,
      compress: true,
      ttl: (options.ttl || 300) * 2,
    });
  }

  private optimizeForMobile(data: any): any {
    if (Array.isArray(data)) {
      // Limit array sizes for mobile
      return data.slice(0, 50);
    }

    if (typeof data === 'object' && data !== null) {
      // Remove heavy fields for mobile
      const optimized = { ...data };
      delete optimized.fullDescription;
      delete optimized.detailedLogs;
      delete optimized.historicalData;
      return optimized;
    }

    return data;
  }

  private compress(data: any): any {
    const serialized = JSON.stringify(data);

    if (serialized.length < this.compressionThreshold) {
      return data;
    }

    try {
      // Simple compression (in production, use better compression like gzip)
      const compressed = Buffer.from(serialized).toString('base64');
      return {
        __compressed: true,
        data: compressed,
        originalSize: serialized.length,
      };
    } catch (error) {
      logger.warn('Compression failed, storing uncompressed', { error });
      return data;
    }
  }

  private decompress(data: any): any {
    if (data && data.__compressed) {
      try {
        const decompressed = Buffer.from(data.data, 'base64').toString('utf-8');
        return JSON.parse(decompressed);
      } catch (error) {
        logger.error('Decompression failed', { error });
        return data;
      }
    }
    return data;
  }

  private calculateSize(data: string): number {
    return Buffer.byteLength(data, 'utf8');
  }

  private recordHit(startTime: number, source: 'memory' | 'redis'): void {
    const responseTime = performance.now() - startTime;

    this.stats.hits++;
    this.updateHitRate();
    this.updateAverageResponseTime(responseTime);

    metrics.incrementCounter('admin.cache.hits', 1, { source });
    metrics.recordHistogram('admin.cache.response_time', responseTime, {
      source,
    });
  }

  private recordMiss(startTime: number): void {
    const responseTime = performance.now() - startTime;

    this.stats.misses++;
    this.updateHitRate();
    this.updateAverageResponseTime(responseTime);

    metrics.incrementCounter('admin.cache.misses', 1);
    metrics.recordHistogram('admin.cache.response_time', responseTime, {
      source: 'miss',
    });
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private updateAverageResponseTime(responseTime: number): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.averageResponseTime =
      (this.stats.averageResponseTime * (total - 1) + responseTime) / total;
  }

  private updateCacheStats(): void {
    this.stats.cacheSize = this.memoryCache.size;
    this.stats.memoryUsage = this.memoryCache.calculatedSize || 0;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      cacheSize: 0,
      memoryUsage: 0,
    };
  }

  private startStatsCollector(): void {
    // Update cache stats every minute
    setInterval(() => {
      this.updateCacheStats();

      // Report metrics
      metrics.recordGauge('admin.cache.hit_rate', this.stats.hitRate);
      metrics.recordGauge('admin.cache.size', this.stats.cacheSize);
      metrics.recordGauge('admin.cache.memory_usage', this.stats.memoryUsage);
    }, 60000);
  }

  async disconnect(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis', { error });
    }
  }
}

// Singleton instance
export const adminCacheService = new AdminCacheService();

// Convenience functions for common admin operations
export const adminCache = {
  // System status caching
  getSystemStatus: (mobile = false) =>
    adminCacheService.get(
      { namespace: 'system', key: 'status', mobile },
      { ttl: 30 },
    ),

  setSystemStatus: (data: any, mobile = false) =>
    adminCacheService.set(
      { namespace: 'system', key: 'status', mobile },
      data,
      { ttl: 30 },
    ),

  // User data caching
  getUserData: (userId: string, mobile = false) =>
    adminCacheService.get(
      { namespace: 'users', key: 'profile', userId, mobile },
      { ttl: 300 },
    ),

  setUserData: (userId: string, data: any, mobile = false) =>
    adminCacheService.set(
      { namespace: 'users', key: 'profile', userId, mobile },
      data,
      { ttl: 300 },
    ),

  // Performance metrics caching
  getPerformanceMetrics: (mobile = false) =>
    adminCacheService.get(
      { namespace: 'performance', key: 'current', mobile },
      { ttl: 60 },
    ),

  setPerformanceMetrics: (data: any, mobile = false) =>
    adminCacheService.set(
      { namespace: 'performance', key: 'current', mobile },
      data,
      {
        ttl: 60,
        compress: true,
      },
    ),

  // Analytics caching
  getAnalytics: (type: string, mobile = false) =>
    adminCacheService.get(
      { namespace: 'analytics', key: type, mobile },
      { ttl: 600 },
    ),

  setAnalytics: (type: string, data: any, mobile = false) =>
    adminCacheService.set({ namespace: 'analytics', key: type, mobile }, data, {
      ttl: 600,
      compress: true,
    }),

  // Cache management
  invalidateAll: () => adminCacheService.clear(),
  invalidateNamespace: (namespace: string) =>
    adminCacheService.invalidateNamespace(namespace),
  getStats: () => adminCacheService.getStats(),
};
