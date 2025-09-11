/**
 * WS-183 LTV Cache Manager - Multi-Level Caching Strategy
 * Team D - Performance/Platform Focus
 * L1: In-memory, L2: Redis distributed cache, L3: Database materialized views
 */

import Redis from 'ioredis';
import { LTVResult } from './ltv-calculation-engine';

export interface UserSegment {
  id: string;
  name: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  expectedVolume: number;
  cacheStrategy: 'aggressive' | 'normal' | 'conservative';
}

export interface CacheMetrics {
  l1Hits: number;
  l2Hits: number;
  l3Hits: number;
  totalMisses: number;
  totalRequests: number;
  hitRate: number;
  avgResponseTime: number;
  memoryUsage: number;
  evictionCount: number;
}

export interface CacheWarmingResult {
  segment: string;
  usersWarmed: number;
  durationMs: number;
  cacheHitImprovement: number;
  errors: string[];
}

export class LTVCacheManager {
  private l1Cache: Map<
    string,
    { data: LTVResult; expiry: number; accessCount: number }
  >;
  private l2Cache: Redis;
  private cacheStats: CacheMetrics;
  private readonly L1_MAX_SIZE = 10000; // Maximum L1 cache entries
  private readonly L1_DEFAULT_TTL = 300000; // 5 minutes in milliseconds
  private readonly L2_DEFAULT_TTL = 3600; // 1 hour in seconds
  private readonly L3_DEFAULT_TTL = 86400; // 24 hours in seconds

  constructor() {
    this.l1Cache = new Map();
    this.l2Cache = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: 'ltv:cache:',
    });

    this.cacheStats = {
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
      totalMisses: 0,
      totalRequests: 0,
      hitRate: 0,
      avgResponseTime: 0,
      memoryUsage: 0,
      evictionCount: 0,
    };

    // Start cache maintenance routines
    this.startCacheMaintenance();
  }

  /**
   * Multi-level cache lookup with performance tracking
   * L1 (in-memory) -> L2 (Redis) -> L3 (database) -> calculation
   */
  async getCachedLTV(
    userId: string,
    segment?: string,
  ): Promise<LTVResult | null> {
    const startTime = performance.now();
    this.cacheStats.totalRequests++;

    try {
      // L1 Cache Check (In-Memory)
      const l1Result = await this.getFromL1Cache(userId);
      if (l1Result) {
        this.cacheStats.l1Hits++;
        this.updateResponseTime(startTime);
        return l1Result;
      }

      // L2 Cache Check (Redis)
      const l2Result = await this.getFromL2Cache(userId);
      if (l2Result) {
        this.cacheStats.l2Hits++;
        // Promote to L1 cache for faster future access
        await this.setL1Cache(userId, l2Result);
        this.updateResponseTime(startTime);
        return l2Result;
      }

      // L3 Cache Check (Database materialized views)
      const l3Result = await this.getFromL3Cache(userId, segment);
      if (l3Result) {
        this.cacheStats.l3Hits++;
        // Promote to L1 and L2 caches
        await this.setL1Cache(userId, l3Result);
        await this.setL2Cache(userId, l3Result);
        this.updateResponseTime(startTime);
        return l3Result;
      }

      // Cache miss - no result found
      this.cacheStats.totalMisses++;
      this.updateResponseTime(startTime);
      return null;
    } catch (error) {
      console.error('Cache lookup error:', error);
      this.cacheStats.totalMisses++;
      this.updateResponseTime(startTime);
      return null;
    }
  }

  /**
   * Multi-level cache storage with appropriate TTL
   * Stores in all cache levels for optimal performance
   */
  async setCachedLTV(
    userId: string,
    result: LTVResult,
    ttl?: number,
  ): Promise<void> {
    const effectiveTtl = ttl || this.calculateOptimalTTL(result);

    try {
      // Store in all cache levels
      await Promise.all([
        this.setL1Cache(userId, result, effectiveTtl),
        this.setL2Cache(userId, result, effectiveTtl),
        this.setL3Cache(userId, result, effectiveTtl),
      ]);
    } catch (error) {
      console.error('Cache storage error:', error);
      throw error;
    }
  }

  /**
   * Proactive cache warming for high-value segments
   * Background cache refresh to prevent cache misses
   */
  async warmCacheForSegment(segment: UserSegment): Promise<CacheWarmingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let usersWarmed = 0;

    const initialHitRate = this.cacheStats.hitRate;

    try {
      // Get users in segment (mock implementation)
      const users = await this.getUsersInSegment(segment.id);

      // Determine warming strategy based on segment priority
      const batchSize = this.getWarmingBatchSize(segment);
      const concurrency = this.getWarmingConcurrency(segment);

      // Process users in parallel batches
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);

        const batchPromises = batch.map(async (userId) => {
          try {
            // Check if already cached
            const cached = await this.getCachedLTV(userId, segment.name);
            if (!cached || this.shouldRefreshCache(cached)) {
              // Pre-calculate and cache
              const ltvResult = await this.calculateAndCacheLTV(
                userId,
                segment,
              );
              if (ltvResult) {
                usersWarmed++;
              }
            }
          } catch (error) {
            errors.push(
              `User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        });

        // Process batch with limited concurrency
        await this.limitConcurrency(batchPromises, concurrency);
      }

      const durationMs = Date.now() - startTime;
      const cacheHitImprovement = this.cacheStats.hitRate - initialHitRate;

      return {
        segment: segment.name,
        usersWarmed,
        durationMs,
        cacheHitImprovement,
        errors,
      };
    } catch (error) {
      errors.push(
        `Segment warming failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        segment: segment.name,
        usersWarmed,
        durationMs: Date.now() - startTime,
        cacheHitImprovement: 0,
        errors,
      };
    }
  }

  /**
   * Intelligent cache invalidation based on data changes
   */
  async invalidateCache(pattern: string, reason?: string): Promise<number> {
    let totalInvalidated = 0;

    try {
      // L1 Cache invalidation
      const l1Keys = Array.from(this.l1Cache.keys()).filter((key) =>
        key.match(new RegExp(pattern)),
      );
      l1Keys.forEach((key) => this.l1Cache.delete(key));
      totalInvalidated += l1Keys.length;

      // L2 Cache invalidation (Redis)
      const l2Keys = await this.l2Cache.keys(pattern);
      if (l2Keys.length > 0) {
        await this.l2Cache.del(...l2Keys);
        totalInvalidated += l2Keys.length;
      }

      // L3 Cache invalidation would be handled by database triggers
      // in a real implementation

      console.log(
        `Cache invalidated: ${totalInvalidated} entries for pattern: ${pattern}, reason: ${reason || 'manual'}`,
      );

      return totalInvalidated;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive cache statistics and performance metrics
   */
  async getCacheStats(): Promise<CacheMetrics> {
    // Update memory usage calculation
    this.cacheStats.memoryUsage = this.calculateMemoryUsage();

    // Update hit rate calculation
    if (this.cacheStats.totalRequests > 0) {
      const totalHits =
        this.cacheStats.l1Hits +
        this.cacheStats.l2Hits +
        this.cacheStats.l3Hits;
      this.cacheStats.hitRate = totalHits / this.cacheStats.totalRequests;
    }

    return { ...this.cacheStats };
  }

  // Private methods for L1 cache operations
  private async getFromL1Cache(userId: string): Promise<LTVResult | null> {
    const cacheKey = `user:${userId}`;
    const cached = this.l1Cache.get(cacheKey);

    if (!cached) return null;

    // Check expiry
    if (Date.now() > cached.expiry) {
      this.l1Cache.delete(cacheKey);
      return null;
    }

    // Update access count for LRU
    cached.accessCount++;
    return cached.data;
  }

  private async setL1Cache(
    userId: string,
    result: LTVResult,
    ttlMs?: number,
  ): Promise<void> {
    const cacheKey = `user:${userId}`;
    const expiry = Date.now() + (ttlMs || this.L1_DEFAULT_TTL);

    // Ensure cache size limit
    if (this.l1Cache.size >= this.L1_MAX_SIZE) {
      await this.evictL1Cache();
    }

    this.l1Cache.set(cacheKey, {
      data: result,
      expiry,
      accessCount: 1,
    });
  }

  // Private methods for L2 cache operations
  private async getFromL2Cache(userId: string): Promise<LTVResult | null> {
    try {
      const cacheKey = `user:${userId}`;
      const cached = await this.l2Cache.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('L2 cache read error:', error);
      return null;
    }
  }

  private async setL2Cache(
    userId: string,
    result: LTVResult,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      const cacheKey = `user:${userId}`;
      const ttl = ttlSeconds || this.L2_DEFAULT_TTL;
      await this.l2Cache.setex(cacheKey, ttl, JSON.stringify(result));
    } catch (error) {
      console.error('L2 cache write error:', error);
    }
  }

  // Private methods for L3 cache operations (database materialized views)
  private async getFromL3Cache(
    userId: string,
    segment?: string,
  ): Promise<LTVResult | null> {
    // Mock implementation - in reality, this would query materialized views
    return null;
  }

  private async setL3Cache(
    userId: string,
    result: LTVResult,
    ttlSeconds?: number,
  ): Promise<void> {
    // Mock implementation - in reality, this would update materialized views
  }

  // Helper methods
  private async evictL1Cache(): Promise<void> {
    // Implement LRU eviction - remove least recently used entries
    const entries = Array.from(this.l1Cache.entries()).sort(
      ([, a], [, b]) => a.accessCount - b.accessCount,
    );

    const toEvict = Math.floor(this.L1_MAX_SIZE * 0.1); // Evict 10%
    for (let i = 0; i < toEvict && entries.length > 0; i++) {
      this.l1Cache.delete(entries[i][0]);
      this.cacheStats.evictionCount++;
    }
  }

  private calculateOptimalTTL(result: LTVResult): number {
    // Calculate TTL based on confidence and segment
    const baseTTL = this.L2_DEFAULT_TTL;
    const confidenceFactor = result.confidence;
    return Math.floor(baseTTL * confidenceFactor);
  }

  private calculateMemoryUsage(): number {
    // Estimate memory usage of L1 cache
    return this.l1Cache.size * 1024; // Rough estimate in bytes
  }

  private updateResponseTime(startTime: number): void {
    const responseTime = performance.now() - startTime;
    this.cacheStats.avgResponseTime =
      (this.cacheStats.avgResponseTime + responseTime) / 2;
  }

  private async getUsersInSegment(segmentId: string): Promise<string[]> {
    // Mock implementation - return sample user IDs
    return Array.from({ length: 1000 }, (_, i) => `user_${segmentId}_${i}`);
  }

  private getWarmingBatchSize(segment: UserSegment): number {
    switch (segment.priority) {
      case 'critical':
        return 50;
      case 'high':
        return 100;
      case 'normal':
        return 200;
      case 'low':
        return 500;
      default:
        return 200;
    }
  }

  private getWarmingConcurrency(segment: UserSegment): number {
    switch (segment.priority) {
      case 'critical':
        return 10;
      case 'high':
        return 8;
      case 'normal':
        return 5;
      case 'low':
        return 3;
      default:
        return 5;
    }
  }

  private shouldRefreshCache(result: LTVResult): boolean {
    const now = new Date();
    const validUntil = new Date(result.validUntil);
    const timeToExpiry = validUntil.getTime() - now.getTime();

    // Refresh if less than 10% of TTL remains
    return timeToExpiry < 24 * 60 * 60 * 1000 * 0.1;
  }

  private async calculateAndCacheLTV(
    userId: string,
    segment: UserSegment,
  ): Promise<LTVResult | null> {
    // Mock implementation - in reality, this would trigger LTV calculation
    const mockResult: LTVResult = {
      userId,
      ltvValue: Math.round((Math.random() * 5000 + 1000) * 100) / 100,
      confidence: 0.85,
      calculatedAt: new Date(),
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      segment: segment.name,
      methodology: 'cache_warming_v2',
      metadata: { warmedAt: new Date() },
    };

    await this.setCachedLTV(userId, mockResult);
    return mockResult;
  }

  private async limitConcurrency<T>(
    promises: Promise<T>[],
    limit: number,
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < promises.length; i += limit) {
      const batch = promises.slice(i, i + limit);
      const batchResults = await Promise.allSettled(batch);

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
    }

    return results;
  }

  private startCacheMaintenance(): void {
    // Run cache maintenance every 5 minutes
    setInterval(
      async () => {
        try {
          // Clean expired L1 entries
          const now = Date.now();
          for (const [key, value] of this.l1Cache.entries()) {
            if (now > value.expiry) {
              this.l1Cache.delete(key);
            }
          }

          // Update cache statistics
          await this.getCacheStats();
        } catch (error) {
          console.error('Cache maintenance error:', error);
        }
      },
      5 * 60 * 1000,
    );
  }
}

export default LTVCacheManager;
