/**
 * WS-168 Dashboard Performance Cache
 * Implements Redis-based caching for dashboard metrics
 */

import { redis } from '@/lib/redis';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

interface DashboardCacheEntry {
  data: any;
  timestamp: number;
  expires_at: number;
}

export class DashboardCache {
  private defaultTTL = 300; // 5 minutes
  private prefix = 'dashboard:';

  constructor(private options: CacheOptions = {}) {
    this.defaultTTL = options.ttl || this.defaultTTL;
    this.prefix = options.prefix || this.prefix;
  }

  /**
   * Generate cache key for dashboard metrics
   */
  private generateKey(type: string, params: Record<string, any> = {}): string {
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    return `${this.prefix}${type}${paramString ? `:${paramString}` : ''}`;
  }

  /**
   * Get cached data
   */
  async get<T>(
    type: string,
    params: Record<string, any> = {},
  ): Promise<T | null> {
    try {
      const key = this.generateKey(type, params);
      const cached = await redis.get(key);

      if (!cached) {
        return null;
      }

      const entry: DashboardCacheEntry = JSON.parse(cached);

      // Check if expired
      if (Date.now() > entry.expires_at) {
        await redis.del(key);
        return null;
      }

      return entry.data as T;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cache data
   */
  async set<T>(
    type: string,
    data: T,
    params: Record<string, any> = {},
    ttl: number = this.defaultTTL,
  ): Promise<boolean> {
    try {
      const key = this.generateKey(type, params);
      const entry: DashboardCacheEntry = {
        data,
        timestamp: Date.now(),
        expires_at: Date.now() + ttl * 1000,
      };

      await redis.setex(key, ttl, JSON.stringify(entry));
      return true;
    } catch (error) {
      console.warn('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cached data
   */
  async delete(
    type: string,
    params: Record<string, any> = {},
  ): Promise<boolean> {
    try {
      const key = this.generateKey(type, params);
      const result = await redis.del(key);
      return result > 0;
    } catch (error) {
      console.warn('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Invalidate all dashboard cache
   */
  async invalidateAll(): Promise<boolean> {
    try {
      const keys = await redis.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.warn('Cache invalidate all error:', error);
      return false;
    }
  }

  /**
   * Get or set pattern - common caching pattern
   */
  async getOrSet<T>(
    type: string,
    params: Record<string, any>,
    fetchFunction: () => Promise<T>,
    ttl: number = this.defaultTTL,
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(type, params);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const freshData = await fetchFunction();

    // Cache the fresh data (don't await to avoid blocking)
    this.set(type, freshData, params, ttl).catch((err) =>
      console.warn('Background cache set failed:', err),
    );

    return freshData;
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(): Promise<void> {
    try {
      const commonQueries = [
        { type: 'metrics', params: {} },
        { type: 'analytics', params: {} },
        { type: 'customer-metrics', params: {} },
      ];

      // Pre-load common queries (implementation would call actual data fetchers)
      const promises = commonQueries.map(async ({ type, params }) => {
        const key = this.generateKey(type, params);
        const exists = await redis.exists(key);

        if (!exists) {
          // Would trigger actual data fetching here
          console.log(`Warming cache for ${type}`);
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('Cache warming error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    hitRate: number;
    memory: string;
  }> {
    try {
      const keys = await redis.keys(`${this.prefix}*`);
      const info = await redis.info('memory');

      return {
        totalKeys: keys.length,
        hitRate: 0, // Would need to track hits/misses
        memory:
          info
            .split('\r\n')
            .find((line) => line.startsWith('used_memory_human:'))
            ?.split(':')[1] || 'unknown',
      };
    } catch (error) {
      console.warn('Cache stats error:', error);
      return {
        totalKeys: 0,
        hitRate: 0,
        memory: 'unknown',
      };
    }
  }
}

// Specialized dashboard cache instances
export const metricsCache = new DashboardCache({
  prefix: 'dashboard:metrics:',
  ttl: 300, // 5 minutes
});

export const analyticsCache = new DashboardCache({
  prefix: 'dashboard:analytics:',
  ttl: 600, // 10 minutes
});

export const customerMetricsCache = new DashboardCache({
  prefix: 'dashboard:customers:',
  ttl: 900, // 15 minutes - customer data changes less frequently
});

// Health check cache - very short TTL for real-time data
export const healthScoreCache = new DashboardCache({
  prefix: 'dashboard:health:',
  ttl: 60, // 1 minute
});

/**
 * Cache warming utility for dashboard startup
 */
export async function warmDashboardCache(): Promise<void> {
  console.log('Warming dashboard cache...');

  const startTime = Date.now();
  await Promise.allSettled([
    metricsCache.warmCache(),
    analyticsCache.warmCache(),
    customerMetricsCache.warmCache(),
  ]);

  const duration = Date.now() - startTime;
  console.log(`Dashboard cache warmed in ${duration}ms`);
}

/**
 * Performance monitoring for cache operations
 */
export class CachePerformanceMonitor {
  private metrics: {
    hits: number;
    misses: number;
    setOperations: number;
    errors: number;
  } = {
    hits: 0,
    misses: 0,
    setOperations: 0,
    errors: 0,
  };

  recordHit() {
    this.metrics.hits++;
  }

  recordMiss() {
    this.metrics.misses++;
  }

  recordSet() {
    this.metrics.setOperations++;
  }

  recordError() {
    this.metrics.errors++;
  }

  getHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? this.metrics.hits / total : 0;
  }

  getMetrics() {
    return {
      ...this.metrics,
      hitRate: this.getHitRate(),
      totalRequests: this.metrics.hits + this.metrics.misses,
    };
  }

  reset() {
    this.metrics = { hits: 0, misses: 0, setOperations: 0, errors: 0 };
  }
}

export const cacheMonitor = new CachePerformanceMonitor();
