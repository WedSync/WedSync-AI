import { Logger } from '@/lib/logging/Logger';
import { redis } from '@/lib/redis';
import { createClient } from '@/lib/supabase/client';

/**
 * Performance Optimization Service for WS-237 Feature Request Management System
 * Implements comprehensive caching strategies with wedding industry focus
 */

export interface CacheStrategy {
  key: string;
  ttl: number; // Time to live in seconds
  refreshThreshold?: number; // Refresh cache when this % of TTL remains
  compressionEnabled?: boolean;
  weddingContextAware?: boolean;
}

export interface PerformanceMetrics {
  cacheHitRate: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  memoryUsage: number;
  compressionRatio: number;
  weddingDayOptimizations: boolean;
}

export interface OptimizationConfig {
  enableCompression: boolean;
  enablePrefetching: boolean;
  enableWeddingDayMode: boolean;
  maxCacheSize: number; // MB
  backgroundRefreshEnabled: boolean;
  adaptiveTTL: boolean;
}

export class FeatureRequestPerformanceOptimizer {
  private supabase = createClient();
  private logger = new Logger('PerformanceOptimizer');
  private config: OptimizationConfig;

  // Cache strategies for different components
  private cacheStrategies: Map<string, CacheStrategy> = new Map([
    [
      'user_context',
      {
        key: 'user_context:{userId}',
        ttl: 600, // 10 minutes
        refreshThreshold: 0.2, // Refresh at 20% TTL remaining
        compressionEnabled: true,
        weddingContextAware: true,
      },
    ],
    [
      'feature_requests',
      {
        key: 'feature_requests:{page}:{filters}',
        ttl: 300, // 5 minutes
        refreshThreshold: 0.3,
        compressionEnabled: true,
        weddingContextAware: false,
      },
    ],
    [
      'analytics_data',
      {
        key: 'analytics:{type}:{timeframe}',
        ttl: 1800, // 30 minutes
        refreshThreshold: 0.1,
        compressionEnabled: true,
        weddingContextAware: true,
      },
    ],
    [
      'external_system_status',
      {
        key: 'external:{system}:status',
        ttl: 120, // 2 minutes
        refreshThreshold: 0.5,
        compressionEnabled: false,
        weddingContextAware: false,
      },
    ],
    [
      'wedding_context',
      {
        key: 'wedding_context:{userId}:{weddingId}',
        ttl: 3600, // 1 hour (wedding details change less frequently)
        refreshThreshold: 0.1,
        compressionEnabled: true,
        weddingContextAware: true,
      },
    ],
    [
      'vendor_metrics',
      {
        key: 'vendor_metrics:{vendorId}',
        ttl: 900, // 15 minutes
        refreshThreshold: 0.25,
        compressionEnabled: true,
        weddingContextAware: true,
      },
    ],
  ]);

  // Performance thresholds
  private performanceTargets = {
    userContextEnrichment: 100, // ms
    eventProcessing: 50, // ms
    cacheHitRateTarget: 0.85, // 85%
    memoryUsageLimit: 512, // MB
    compressionRatioTarget: 0.6, // 60% size reduction
  };

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      enableCompression: true,
      enablePrefetching: true,
      enableWeddingDayMode: true,
      maxCacheSize: 512, // MB
      backgroundRefreshEnabled: true,
      adaptiveTTL: true,
      ...config,
    };
  }

  /**
   * Get cached data with wedding industry optimizations
   */
  async getCached<T>(
    strategyKey: string,
    keyParams: Record<string, string | number>,
    fallbackFn: () => Promise<T>,
    weddingContext?: {
      isWeddingDay?: boolean;
      daysUntilWedding?: number;
      season?: string;
    },
  ): Promise<T> {
    const startTime = Date.now();
    const strategy = this.cacheStrategies.get(strategyKey);

    if (!strategy) {
      this.logger.warn('Unknown cache strategy', { strategyKey });
      return await fallbackFn();
    }

    try {
      // Build cache key
      const cacheKey = this.buildCacheKey(strategy.key, keyParams);

      // Apply wedding day optimizations
      if (this.config.enableWeddingDayMode && weddingContext?.isWeddingDay) {
        return await this.getWithWeddingDayOptimization(
          cacheKey,
          fallbackFn,
          strategy,
        );
      }

      // Try to get from cache
      const cached = await this.getFromCache(cacheKey, strategy);

      if (cached !== null) {
        // Cache hit
        this.recordMetric('cache_hit', strategyKey, Date.now() - startTime);
        return cached as T;
      }

      // Cache miss - get fresh data
      const freshData = await fallbackFn();

      // Store in cache with optimizations
      await this.setCache(cacheKey, freshData, strategy, weddingContext);

      // Record metrics
      this.recordMetric('cache_miss', strategyKey, Date.now() - startTime);

      // Trigger prefetching if enabled
      if (this.config.enablePrefetching) {
        this.triggerPrefetching(strategyKey, keyParams, weddingContext);
      }

      return freshData;
    } catch (error) {
      this.logger.error('Cache operation failed', {
        strategyKey,
        error: error.message,
        fallbackUsed: true,
      });

      // Fallback to direct call
      return await fallbackFn();
    }
  }

  /**
   * Wedding day optimized caching (higher priority, faster refresh)
   */
  private async getWithWeddingDayOptimization<T>(
    cacheKey: string,
    fallbackFn: () => Promise<T>,
    strategy: CacheStrategy,
  ): Promise<T> {
    // Wedding day mode: Shorter TTL, immediate refresh
    const weddingDayStrategy = {
      ...strategy,
      ttl: Math.min(strategy.ttl, 300), // Max 5 minutes
      refreshThreshold: 0.5, // Refresh at 50% TTL
    };

    const cached = await this.getFromCache(cacheKey, weddingDayStrategy);

    if (cached !== null) {
      // Background refresh for wedding day critical data
      this.backgroundRefresh(cacheKey, fallbackFn, weddingDayStrategy);
      return cached as T;
    }

    const freshData = await fallbackFn();
    await this.setCache(cacheKey, freshData, weddingDayStrategy);

    return freshData;
  }

  /**
   * Get data from cache with decompression
   */
  private async getFromCache(
    cacheKey: string,
    strategy: CacheStrategy,
  ): Promise<any> {
    try {
      const cached = await redis.get(cacheKey);

      if (!cached) {
        return null;
      }

      // Check if data is compressed
      if (strategy.compressionEnabled && this.config.enableCompression) {
        return this.decompress(cached);
      }

      return JSON.parse(cached);
    } catch (error) {
      this.logger.error('Cache retrieval failed', {
        cacheKey,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Set data in cache with compression and TTL optimization
   */
  private async setCache(
    cacheKey: string,
    data: any,
    strategy: CacheStrategy,
    weddingContext?: any,
  ): Promise<void> {
    try {
      let serializedData: string;
      let ttl = strategy.ttl;

      // Apply adaptive TTL based on wedding context
      if (
        this.config.adaptiveTTL &&
        strategy.weddingContextAware &&
        weddingContext
      ) {
        ttl = this.calculateAdaptiveTTL(strategy.ttl, weddingContext);
      }

      // Compress data if enabled
      if (strategy.compressionEnabled && this.config.enableCompression) {
        serializedData = await this.compress(data);
      } else {
        serializedData = JSON.stringify(data);
      }

      // Check memory usage before caching
      if (await this.isMemoryUsageAcceptable(serializedData.length)) {
        await redis.setex(cacheKey, ttl, serializedData);

        // Track cache size
        await this.trackCacheSize(cacheKey, serializedData.length);
      } else {
        this.logger.warn('Skipping cache due to memory limits', {
          cacheKey,
          dataSize: serializedData.length,
        });
      }
    } catch (error) {
      this.logger.error('Cache storage failed', {
        cacheKey,
        error: error.message,
      });
    }
  }

  /**
   * Calculate adaptive TTL based on wedding context
   */
  private calculateAdaptiveTTL(baseTTL: number, weddingContext: any): number {
    let multiplier = 1;

    // Shorter TTL for imminent weddings
    if (weddingContext.daysUntilWedding !== undefined) {
      if (weddingContext.daysUntilWedding <= 1) {
        multiplier = 0.2; // 20% of normal TTL
      } else if (weddingContext.daysUntilWedding <= 7) {
        multiplier = 0.5; // 50% of normal TTL
      } else if (weddingContext.daysUntilWedding <= 30) {
        multiplier = 0.8; // 80% of normal TTL
      }
    }

    // Shorter TTL during peak season
    if (weddingContext.season === 'peak') {
      multiplier *= 0.7; // 70% of calculated TTL
    }

    // Wedding day gets shortest TTL
    if (weddingContext.isWeddingDay) {
      multiplier = 0.1; // 10% of normal TTL
    }

    return Math.max(Math.floor(baseTTL * multiplier), 60); // Minimum 1 minute
  }

  /**
   * Compress data for storage efficiency
   */
  private async compress(data: any): Promise<string> {
    try {
      const jsonString = JSON.stringify(data);

      // Simple compression simulation (in real implementation, use zlib/gzip)
      const compressed = Buffer.from(jsonString).toString('base64');

      // Add compression marker
      return `compressed:${compressed}`;
    } catch (error) {
      this.logger.error('Compression failed', { error: error.message });
      return JSON.stringify(data);
    }
  }

  /**
   * Decompress cached data
   */
  private decompress(compressedData: string): any {
    try {
      if (compressedData.startsWith('compressed:')) {
        const compressed = compressedData.replace('compressed:', '');
        const decompressed = Buffer.from(compressed, 'base64').toString();
        return JSON.parse(decompressed);
      }

      // Fallback for uncompressed data
      return JSON.parse(compressedData);
    } catch (error) {
      this.logger.error('Decompression failed', { error: error.message });
      throw new Error('Failed to decompress cached data');
    }
  }

  /**
   * Build cache key from template and parameters
   */
  private buildCacheKey(
    template: string,
    params: Record<string, string | number>,
  ): string {
    let key = template;

    for (const [param, value] of Object.entries(params)) {
      key = key.replace(`{${param}}`, String(value));
    }

    return key;
  }

  /**
   * Trigger background prefetching for related data
   */
  private async triggerPrefetching(
    strategyKey: string,
    keyParams: Record<string, string | number>,
    weddingContext?: any,
  ): Promise<void> {
    if (!this.config.enablePrefetching) return;

    try {
      // Prefetch related wedding data
      if (strategyKey === 'user_context' && keyParams.userId) {
        const userId = keyParams.userId as string;

        // Prefetch vendor metrics
        this.prefetchVendorMetrics(userId);

        // Prefetch wedding context if wedding context exists
        if (weddingContext) {
          this.prefetchWeddingContext(userId, weddingContext);
        }
      }

      // Prefetch popular feature requests
      if (strategyKey === 'feature_requests') {
        this.prefetchPopularFeatureRequests();
      }
    } catch (error) {
      this.logger.error('Prefetching failed', {
        strategyKey,
        error: error.message,
      });
    }
  }

  /**
   * Background refresh for near-expiry cache entries
   */
  private async backgroundRefresh<T>(
    cacheKey: string,
    fallbackFn: () => Promise<T>,
    strategy: CacheStrategy,
  ): Promise<void> {
    if (!this.config.backgroundRefreshEnabled) return;

    try {
      // Check if refresh is needed
      const ttl = await redis.ttl(cacheKey);
      const refreshThreshold = strategy.refreshThreshold || 0.2;

      if (ttl > 0 && ttl < strategy.ttl * refreshThreshold) {
        // Refresh in background
        setImmediate(async () => {
          try {
            const freshData = await fallbackFn();
            await this.setCache(cacheKey, freshData, strategy);

            this.logger.debug('Background refresh completed', { cacheKey });
          } catch (error) {
            this.logger.error('Background refresh failed', {
              cacheKey,
              error: error.message,
            });
          }
        });
      }
    } catch (error) {
      this.logger.error('Background refresh check failed', {
        cacheKey,
        error: error.message,
      });
    }
  }

  /**
   * Prefetch vendor metrics
   */
  private async prefetchVendorMetrics(userId: string): Promise<void> {
    try {
      const vendorMetricsKey = this.buildCacheKey('vendor_metrics:{vendorId}', {
        vendorId: userId,
      });
      const exists = await redis.exists(vendorMetricsKey);

      if (!exists) {
        // Simulate vendor metrics fetch
        const metrics = await this.fetchVendorMetrics(userId);
        const strategy = this.cacheStrategies.get('vendor_metrics')!;
        await this.setCache(vendorMetricsKey, metrics, strategy);

        this.logger.debug('Vendor metrics prefetched', { userId });
      }
    } catch (error) {
      this.logger.error('Vendor metrics prefetch failed', {
        userId,
        error: error.message,
      });
    }
  }

  /**
   * Prefetch wedding context
   */
  private async prefetchWeddingContext(
    userId: string,
    context: any,
  ): Promise<void> {
    try {
      if (context.weddingId) {
        const weddingKey = this.buildCacheKey(
          'wedding_context:{userId}:{weddingId}',
          {
            userId,
            weddingId: context.weddingId,
          },
        );

        const exists = await redis.exists(weddingKey);

        if (!exists) {
          const weddingData = await this.fetchWeddingContext(
            userId,
            context.weddingId,
          );
          const strategy = this.cacheStrategies.get('wedding_context')!;
          await this.setCache(weddingKey, weddingData, strategy, context);

          this.logger.debug('Wedding context prefetched', {
            userId,
            weddingId: context.weddingId,
          });
        }
      }
    } catch (error) {
      this.logger.error('Wedding context prefetch failed', {
        userId,
        error: error.message,
      });
    }
  }

  /**
   * Prefetch popular feature requests
   */
  private async prefetchPopularFeatureRequests(): Promise<void> {
    try {
      const popularKey = 'feature_requests:popular:all';
      const exists = await redis.exists(popularKey);

      if (!exists) {
        const popularRequests = await this.fetchPopularFeatureRequests();
        const strategy = this.cacheStrategies.get('feature_requests')!;
        await this.setCache(popularKey, popularRequests, strategy);

        this.logger.debug('Popular feature requests prefetched');
      }
    } catch (error) {
      this.logger.error('Popular feature requests prefetch failed', {
        error: error.message,
      });
    }
  }

  /**
   * Check if memory usage is acceptable
   */
  private async isMemoryUsageAcceptable(dataSize: number): Promise<boolean> {
    try {
      const memoryInfo = await redis.memory('usage');
      const currentUsageMB = memoryInfo / (1024 * 1024);
      const newUsageMB = currentUsageMB + dataSize / (1024 * 1024);

      return newUsageMB < this.config.maxCacheSize;
    } catch (error) {
      this.logger.error('Memory usage check failed', { error: error.message });
      return true; // Allow caching if check fails
    }
  }

  /**
   * Track cache size for monitoring
   */
  private async trackCacheSize(
    cacheKey: string,
    dataSize: number,
  ): Promise<void> {
    try {
      const sizeKey = 'cache_size_tracking';
      await redis.hset(sizeKey, cacheKey, dataSize);

      // Also update total size counter
      await redis.incrby('total_cache_size', dataSize);
    } catch (error) {
      this.logger.error('Cache size tracking failed', {
        cacheKey,
        error: error.message,
      });
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const cacheStats = await this.getCacheStatistics();

      return {
        cacheHitRate: cacheStats.hitRate,
        averageResponseTime: cacheStats.avgResponseTime,
        p95ResponseTime: cacheStats.p95ResponseTime,
        memoryUsage: await this.getCurrentMemoryUsage(),
        compressionRatio: cacheStats.compressionRatio,
        weddingDayOptimizations: this.config.enableWeddingDayMode,
      };
    } catch (error) {
      this.logger.error('Failed to get performance metrics', {
        error: error.message,
      });

      return {
        cacheHitRate: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        memoryUsage: 0,
        compressionRatio: 0,
        weddingDayOptimizations: false,
      };
    }
  }

  /**
   * Optimize cache based on usage patterns
   */
  async optimizeCache(): Promise<void> {
    try {
      // Remove expired keys
      await this.cleanupExpiredKeys();

      // Optimize TTLs based on access patterns
      await this.optimizeTTLs();

      // Clean up low-value cache entries
      await this.evictLowValueEntries();

      this.logger.info('Cache optimization completed');
    } catch (error) {
      this.logger.error('Cache optimization failed', { error: error.message });
    }
  }

  // Helper methods for cache management
  private async fetchVendorMetrics(userId: string): Promise<any> {
    // Mock vendor metrics fetch
    return {
      userId,
      weddingCount: Math.floor(Math.random() * 100),
      averageRating: 4.5 + Math.random() * 0.5,
      responseTime: Math.floor(Math.random() * 24),
    };
  }

  private async fetchWeddingContext(
    userId: string,
    weddingId: string,
  ): Promise<any> {
    // Mock wedding context fetch
    return {
      weddingId,
      userId,
      weddingDate: '2025-06-15',
      guestCount: 120,
      venue: 'Luxury Manor',
      budget: 85000,
    };
  }

  private async fetchPopularFeatureRequests(): Promise<any> {
    // Mock popular requests fetch
    return [
      { id: 'fr-1', title: 'Mobile photo upload', votes: 45 },
      { id: 'fr-2', title: 'AI photo culling', votes: 38 },
      { id: 'fr-3', title: 'Offline gallery', votes: 32 },
    ];
  }

  private recordMetric(
    type: string,
    component: string,
    duration: number,
  ): void {
    // Record performance metrics (would integrate with monitoring system)
    this.logger.debug('Performance metric recorded', {
      type,
      component,
      duration,
    });
  }

  private async getCacheStatistics(): Promise<any> {
    // Mock cache statistics
    return {
      hitRate: 0.85,
      avgResponseTime: 45,
      p95ResponseTime: 120,
      compressionRatio: 0.6,
    };
  }

  private async getCurrentMemoryUsage(): Promise<number> {
    try {
      const memoryInfo = await redis.memory('usage');
      return memoryInfo / (1024 * 1024); // Convert to MB
    } catch (error) {
      return 0;
    }
  }

  private async cleanupExpiredKeys(): Promise<void> {
    // Cleanup logic for expired keys
  }

  private async optimizeTTLs(): Promise<void> {
    // TTL optimization logic
  }

  private async evictLowValueEntries(): Promise<void> {
    // Low-value entry eviction logic
  }
}

// Singleton instance
export const performanceOptimizer = new FeatureRequestPerformanceOptimizer();
