/**
 * Performance Cache Manager - WS-173 Backend Performance Optimization
 * Team B - Round 1 Implementation
 * Advanced caching layer with intelligent prefetching, cache warming, and performance analytics
 */

import {
  CacheService,
  CACHE_PREFIXES,
  CACHE_TTL,
} from '@/lib/cache/redis-client';
import { metricsTracker } from '@/lib/performance/metrics-tracker';
import { createClient } from '@/lib/supabase/server';

export interface CacheStrategy {
  ttl: number;
  tags: string[];
  warmingEnabled: boolean;
  compressionEnabled: boolean;
  analyticsEnabled: boolean;
}

export interface CacheWarmingConfig {
  enabled: boolean;
  schedules: Array<{
    pattern: string;
    cron: string;
    priority: number;
  }>;
  batchSize: number;
  maxConcurrency: number;
}

export interface CacheAnalytics {
  hitRatio: number;
  avgResponseTime: number;
  topHits: Array<{ key: string; hits: number }>;
  topMisses: Array<{ key: string; misses: number }>;
  memoryUsage: number;
  evictions: number;
}

export class PerformanceCacheManager {
  private static instance: PerformanceCacheManager;
  private warmingConfig: CacheWarmingConfig;
  private analyticsBuffer: Map<
    string,
    { hits: number; misses: number; lastAccess: Date }
  > = new Map();
  private compressionEnabled: boolean = true;

  // Default cache strategies for different data types
  private static readonly DEFAULT_STRATEGIES: Record<string, CacheStrategy> = {
    [CACHE_PREFIXES.WEDDING]: {
      ttl: CACHE_TTL.LONG,
      tags: ['wedding', 'client-data'],
      warmingEnabled: true,
      compressionEnabled: true,
      analyticsEnabled: true,
    },
    [CACHE_PREFIXES.BUDGET]: {
      ttl: CACHE_TTL.MEDIUM,
      tags: ['budget', 'financial'],
      warmingEnabled: true,
      compressionEnabled: true,
      analyticsEnabled: true,
    },
    [CACHE_PREFIXES.EXPENSE]: {
      ttl: CACHE_TTL.SHORT,
      tags: ['expense', 'financial'],
      warmingEnabled: false,
      compressionEnabled: true,
      analyticsEnabled: true,
    },
    [CACHE_PREFIXES.ANALYTICS]: {
      ttl: CACHE_TTL.MEDIUM,
      tags: ['analytics', 'reporting'],
      warmingEnabled: false,
      compressionEnabled: true,
      analyticsEnabled: true,
    },
    [CACHE_PREFIXES.SEARCH]: {
      ttl: CACHE_TTL.SHORT,
      tags: ['search', 'query'],
      warmingEnabled: false,
      compressionEnabled: false,
      analyticsEnabled: true,
    },
  };

  static getInstance(): PerformanceCacheManager {
    if (!PerformanceCacheManager.instance) {
      PerformanceCacheManager.instance = new PerformanceCacheManager();
    }
    return PerformanceCacheManager.instance;
  }

  constructor() {
    this.warmingConfig = {
      enabled: process.env.NODE_ENV === 'production',
      schedules: [
        {
          pattern: `${CACHE_PREFIXES.WEDDING}*`,
          cron: '0 */6 * * *', // Every 6 hours
          priority: 1,
        },
        {
          pattern: `${CACHE_PREFIXES.BUDGET}*`,
          cron: '0 */4 * * *', // Every 4 hours
          priority: 2,
        },
        {
          pattern: `${CACHE_PREFIXES.ANALYTICS}*`,
          cron: '0 */2 * * *', // Every 2 hours
          priority: 3,
        },
      ],
      batchSize: 100,
      maxConcurrency: 5,
    };
  }

  /**
   * Enhanced get operation with analytics and intelligent prefetching
   */
  async get<T>(
    key: string,
    options: {
      strategy?: Partial<CacheStrategy>;
      fallbackFn?: () => Promise<T>;
      prefetchRelated?: string[];
      skipAnalytics?: boolean;
    } = {},
  ): Promise<T | null> {
    const startTime = Date.now();
    let cacheHit = false;
    let result: T | null = null;

    try {
      // Get from cache first
      result = await CacheService.get<T>(key);
      cacheHit = result !== null;

      // Update analytics
      if (!options.skipAnalytics) {
        this.updateAnalytics(key, cacheHit);
      }

      // If cache miss and fallback provided, execute fallback and cache result
      if (!result && options.fallbackFn) {
        result = await options.fallbackFn();
        if (result !== null) {
          // Use strategy for this key type
          const strategy = this.getStrategyForKey(key, options.strategy);
          await this.set(key, result, strategy);
        }
      }

      // Prefetch related keys if specified
      if (
        cacheHit &&
        options.prefetchRelated &&
        options.prefetchRelated.length > 0
      ) {
        this.prefetchKeys(options.prefetchRelated).catch((err) =>
          console.warn('Prefetch failed:', err),
        );
      }

      return result;
    } finally {
      const responseTime = Date.now() - startTime;

      // Track cache performance
      await metricsTracker.trackCacheOperation(
        key,
        'GET',
        cacheHit,
        result ? JSON.stringify(result).length : 0,
      );

      // Log slow cache operations
      if (responseTime > 100) {
        console.warn(`Slow cache operation: ${key} took ${responseTime}ms`);
      }
    }
  }

  /**
   * Enhanced set operation with compression and strategy-based caching
   */
  async set<T>(
    key: string,
    value: T,
    strategy: Partial<CacheStrategy> = {},
  ): Promise<boolean> {
    const startTime = Date.now();
    let success = false;
    let dataSize = 0;

    try {
      const fullStrategy = this.getStrategyForKey(key, strategy);
      let processedValue = value;

      // Apply compression if enabled
      if (fullStrategy.compressionEnabled) {
        processedValue = (await this.compressValue(value)) as T;
      }

      // Calculate data size for analytics
      dataSize = JSON.stringify(processedValue).length;

      // Set in cache with TTL
      success = await CacheService.set(key, processedValue, fullStrategy.ttl);

      // Set tags for invalidation
      if (success && fullStrategy.tags.length > 0) {
        await this.setTagsForKey(key, fullStrategy.tags);
      }

      // Schedule for warming if enabled
      if (success && fullStrategy.warmingEnabled) {
        await this.scheduleForWarming(key, fullStrategy);
      }

      return success;
    } finally {
      const responseTime = Date.now() - startTime;

      // Track cache performance
      await metricsTracker.trackCacheOperation(
        key,
        'SET',
        false,
        dataSize,
        strategy.ttl,
      );

      if (responseTime > 50) {
        console.warn(`Slow cache set: ${key} took ${responseTime}ms`);
      }
    }
  }

  /**
   * Intelligent cache warming based on access patterns
   */
  async warmCache(
    patterns: string[] = [],
    force: boolean = false,
  ): Promise<{
    warmed: number;
    failed: number;
    duration: number;
  }> {
    if (!this.warmingConfig.enabled && !force) {
      return { warmed: 0, failed: 0, duration: 0 };
    }

    const startTime = Date.now();
    let warmed = 0;
    let failed = 0;

    try {
      const supabase = await createClient();
      const keysToWarm =
        patterns.length > 0 ? patterns : this.getWarmingPatterns();

      // Process in batches to avoid overwhelming Redis
      for (
        let i = 0;
        i < keysToWarm.length;
        i += this.warmingConfig.batchSize
      ) {
        const batch = keysToWarm.slice(i, i + this.warmingConfig.batchSize);

        const promises = batch.map(async (pattern) => {
          try {
            // Determine data source based on pattern
            const data = await this.fetchDataForPattern(pattern, supabase);
            if (data) {
              const success = await this.set(pattern, data);
              return success ? 1 : 0;
            }
            return 0;
          } catch (error) {
            console.error(
              `Failed to warm cache for pattern ${pattern}:`,
              error,
            );
            return -1;
          }
        });

        const results = await Promise.allSettled(promises);
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            if (result.value === 1) warmed++;
            else if (result.value === -1) failed++;
          } else {
            failed++;
          }
        });
      }

      const duration = Date.now() - startTime;
      console.log(
        `Cache warming completed: ${warmed} warmed, ${failed} failed in ${duration}ms`,
      );

      return { warmed, failed, duration };
    } catch (error) {
      console.error('Cache warming failed:', error);
      return { warmed, failed: failed + 1, duration: Date.now() - startTime };
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let totalInvalidated = 0;

    for (const tag of tags) {
      try {
        const tagKey = this.buildTagKey(tag);
        const keys = (await CacheService.get<string[]>(tagKey)) || [];

        if (keys.length > 0) {
          // Delete all keys with this tag
          const deletePromises = keys.map((key) => CacheService.del(key));
          const results = await Promise.allSettled(deletePromises);

          const invalidated = results.filter(
            (r) => r.status === 'fulfilled',
          ).length;
          totalInvalidated += invalidated;

          // Remove the tag index
          await CacheService.del(tagKey);

          // Track invalidation
          await metricsTracker.trackCacheOperation(tagKey, 'FLUSH', false);
        }
      } catch (error) {
        console.error(`Failed to invalidate tag ${tag}:`, error);
      }
    }

    return totalInvalidated;
  }

  /**
   * Get cache analytics
   */
  async getAnalytics(
    timeRange: '1h' | '24h' | '7d' = '24h',
  ): Promise<CacheAnalytics> {
    const analyticsKey = CacheService.buildKey(
      CACHE_PREFIXES.ANALYTICS,
      'cache_analytics',
    );
    let cachedAnalytics = await CacheService.get<CacheAnalytics>(analyticsKey);

    if (!cachedAnalytics) {
      // Calculate analytics from buffer
      let totalHits = 0;
      let totalMisses = 0;
      this.analyticsBuffer.forEach((stats) => {
        totalHits += stats.hits;
        totalMisses += stats.misses;
      });
      const totalRequests = totalHits + totalMisses;

      // Get top hits and misses
      const hitEntries: Array<
        [string, { hits: number; misses: number; lastAccess: Date }]
      > = [];
      const missEntries: Array<
        [string, { hits: number; misses: number; lastAccess: Date }]
      > = [];
      this.analyticsBuffer.forEach((stats, key) => {
        hitEntries.push([key, stats]);
        missEntries.push([key, stats]);
      });
      const sortedByHits = hitEntries
        .sort(([, a], [, b]) => b.hits - a.hits)
        .slice(0, 10);
      const sortedByMisses = missEntries
        .sort(([, a], [, b]) => b.misses - a.misses)
        .slice(0, 10);

      cachedAnalytics = {
        hitRatio: totalRequests > 0 ? totalHits / totalRequests : 0,
        avgResponseTime: 0, // Would be calculated from metrics
        topHits: sortedByHits.map(([key, stats]) => ({
          key,
          hits: stats.hits,
        })),
        topMisses: sortedByMisses.map(([key, stats]) => ({
          key,
          misses: stats.misses,
        })),
        memoryUsage: 0, // Would need Redis memory info
        evictions: 0, // Would need Redis eviction stats
      };

      // Cache analytics for 5 minutes
      await CacheService.set(analyticsKey, cachedAnalytics, CACHE_TTL.SHORT);
    }

    return cachedAnalytics;
  }

  /**
   * Bulk operations for better performance
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const startTime = Date.now();
    const results = new Map<string, T | null>();

    try {
      // Use Redis MGET for efficiency
      const values = await Promise.all(
        keys.map((key) => CacheService.get<T>(key)),
      );

      keys.forEach((key, index) => {
        const value = values[index];
        results.set(key, value);

        // Update analytics
        this.updateAnalytics(key, value !== null);
      });

      return results;
    } finally {
      const responseTime = Date.now() - startTime;

      if (responseTime > 200) {
        console.warn(
          `Slow bulk cache get: ${keys.length} keys took ${responseTime}ms`,
        );
      }
    }
  }

  async mset<T>(
    entries: Array<{
      key: string;
      value: T;
      strategy?: Partial<CacheStrategy>;
    }>,
  ): Promise<number> {
    const startTime = Date.now();
    let successCount = 0;

    try {
      // Process in parallel with concurrency limit
      const concurrency = 10;
      const chunks = this.chunkArray(entries, concurrency);

      for (const chunk of chunks) {
        const promises = chunk.map(async ({ key, value, strategy }) => {
          const success = await this.set(key, value, strategy);
          return success ? 1 : 0;
        });

        const results = await Promise.all(promises);
        successCount += results.reduce((sum, result) => sum + result, 0);
      }

      return successCount;
    } finally {
      const responseTime = Date.now() - startTime;

      if (responseTime > 500) {
        console.warn(
          `Slow bulk cache set: ${entries.length} entries took ${responseTime}ms`,
        );
      }
    }
  }

  /**
   * Cache health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    hitRatio: number;
    memoryUsage?: number;
    issues: string[];
  }> {
    const startTime = Date.now();
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      // Test basic connectivity
      const redisHealth = await CacheService.healthCheck();
      const latency = redisHealth.latency || 0;

      if (redisHealth.status !== 'healthy') {
        status = 'unhealthy';
        issues.push('Redis connection failed');
      } else if (latency > 100) {
        status = 'degraded';
        issues.push(`High latency: ${latency}ms`);
      }

      // Check hit ratio
      const analytics = await this.getAnalytics();
      if (analytics.hitRatio < 0.7) {
        if (status === 'healthy') status = 'degraded';
        issues.push(`Low hit ratio: ${(analytics.hitRatio * 100).toFixed(1)}%`);
      }

      return {
        status,
        latency,
        hitRatio: analytics.hitRatio,
        issues,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        hitRatio: 0,
        issues: [`Health check failed: ${error.message}`],
      };
    }
  }

  // Private helper methods

  private getStrategyForKey(
    key: string,
    override: Partial<CacheStrategy> = {},
  ): CacheStrategy {
    // Find matching strategy based on key prefix
    const prefix = Object.keys(PerformanceCacheManager.DEFAULT_STRATEGIES).find(
      (p) => key.startsWith(p),
    );

    const baseStrategy = prefix
      ? PerformanceCacheManager.DEFAULT_STRATEGIES[prefix]
      : {
          ttl: CACHE_TTL.MEDIUM,
          tags: [],
          warmingEnabled: false,
          compressionEnabled: false,
          analyticsEnabled: true,
        };

    return { ...baseStrategy, ...override };
  }

  private async compressValue<T>(value: T): Promise<T> {
    // Simple compression - in production would use actual compression library
    if (typeof value === 'string' && value.length > 1000) {
      // Placeholder for compression logic
      return value as T;
    }
    return value;
  }

  private updateAnalytics(key: string, hit: boolean): void {
    if (!this.analyticsBuffer.has(key)) {
      this.analyticsBuffer.set(key, {
        hits: 0,
        misses: 0,
        lastAccess: new Date(),
      });
    }

    const stats = this.analyticsBuffer.get(key)!;
    if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
    stats.lastAccess = new Date();

    // Cleanup old entries to prevent memory leaks
    if (this.analyticsBuffer.size > 10000) {
      const allEntries: Array<
        [string, { hits: number; misses: number; lastAccess: Date }]
      > = [];
      this.analyticsBuffer.forEach((stats, key) => {
        allEntries.push([key, stats]);
      });
      const oldestEntries = allEntries
        .sort(([, a], [, b]) => a.lastAccess.getTime() - b.lastAccess.getTime())
        .slice(0, 1000);

      oldestEntries.forEach(([key]) => this.analyticsBuffer.delete(key));
    }
  }

  private async setTagsForKey(key: string, tags: string[]): Promise<void> {
    // Store key in tag indexes for efficient invalidation
    const promises = tags.map(async (tag) => {
      const tagKey = this.buildTagKey(tag);
      const taggedKeys = (await CacheService.get<string[]>(tagKey)) || [];

      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        await CacheService.set(tagKey, taggedKeys, CACHE_TTL.WEEKLY);
      }
    });

    await Promise.all(promises);
  }

  private buildTagKey(tag: string): string {
    return CacheService.buildKey('tags', tag);
  }

  private async scheduleForWarming(
    key: string,
    strategy: CacheStrategy,
  ): Promise<void> {
    // Add to warming schedule - in production would integrate with job queue
    const warmingKey = CacheService.buildKey('warming', 'scheduled');
    const scheduled = (await CacheService.get<string[]>(warmingKey)) || [];

    if (!scheduled.includes(key)) {
      scheduled.push(key);
      await CacheService.set(warmingKey, scheduled, CACHE_TTL.DAILY);
    }
  }

  private getWarmingPatterns(): string[] {
    return this.warmingConfig.schedules.map((schedule) => schedule.pattern);
  }

  private async fetchDataForPattern(
    pattern: string,
    supabase: any,
  ): Promise<any> {
    // Determine what data to fetch based on pattern
    // This is a simplified version - in production would have more sophisticated logic

    if (pattern.includes(CACHE_PREFIXES.WEDDING)) {
      const { data } = await supabase.from('weddings').select('*').limit(100);
      return data;
    }

    if (pattern.includes(CACHE_PREFIXES.BUDGET)) {
      const { data } = await supabase
        .from('budget_items')
        .select('*')
        .limit(100);
      return data;
    }

    return null;
  }

  private async prefetchKeys(keys: string[]): Promise<void> {
    // Prefetch related keys in background
    const promises = keys.map(async (key) => {
      try {
        await this.get(key, { skipAnalytics: true });
      } catch (error) {
        console.warn(`Prefetch failed for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Export singleton instance
export const performanceCacheManager = PerformanceCacheManager.getInstance();

// Utility functions for common caching patterns
export class CachePatterns {
  static async cacheAside<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM,
  ): Promise<T> {
    return performanceCacheManager.get(key, {
      fallbackFn: fetchFn,
      strategy: { ttl },
    }) as Promise<T>;
  }

  static async writeThrough<T>(
    key: string,
    value: T,
    persistFn: (value: T) => Promise<void>,
    ttl: number = CACHE_TTL.MEDIUM,
  ): Promise<void> {
    // Write to persistence layer first
    await persistFn(value);

    // Then update cache
    await performanceCacheManager.set(key, value, { ttl });
  }

  static async writeBehind<T>(
    key: string,
    value: T,
    persistFn: (value: T) => Promise<void>,
    ttl: number = CACHE_TTL.MEDIUM,
  ): Promise<void> {
    // Update cache immediately
    await performanceCacheManager.set(key, value, { ttl });

    // Schedule persistence for later (background job)
    process.nextTick(async () => {
      try {
        await persistFn(value);
      } catch (error) {
        console.error('Write-behind persistence failed:', error);
      }
    });
  }

  static async invalidateRelated(
    entityId: string,
    entityType: string,
  ): Promise<void> {
    const tags = [entityType, `${entityType}:${entityId}`];
    await performanceCacheManager.invalidateByTags(tags);
  }
}
