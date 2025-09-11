/**
 * WS-241 AI Caching Strategy System - Core Cache Service
 * Multi-layer caching system optimized for wedding industry workflows
 * Team B - Backend Infrastructure & API Development
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import crypto from 'crypto';

// Types and interfaces
export interface WeddingContext {
  weddingId?: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  weddingDate: Date;
  budgetRange: BudgetTier;
  weddingStyle: WeddingStyle;
  guestCount: number;
  vendorPreferences: VendorType[];
}

export interface AIQuery {
  type: CacheType;
  content: string;
  model?: string;
  complexity?: number; // 1-5 scale
  urgency?: 'low' | 'medium' | 'high';
}

export interface CachedResponse {
  data: any;
  timestamp: Date;
  ttl: number;
  hitCount: number;
  source: 'memory' | 'redis' | 'database';
  metadata?: {
    cost: number;
    modelUsed: string;
    processingTime: number;
  };
}

export type CacheType =
  | 'venue_recommendations'
  | 'vendor_matching'
  | 'budget_optimization'
  | 'timeline_generation'
  | 'guest_management'
  | 'menu_suggestions'
  | 'decor_inspiration'
  | 'photography_styles'
  | 'seasonal_planning'
  | 'location_insights'
  | 'vendor_availability'
  | 'pricing_estimates';

export type BudgetTier = 'budget' | 'moderate' | 'luxury' | 'ultra_luxury';
export type WeddingStyle =
  | 'traditional'
  | 'modern'
  | 'rustic'
  | 'boho'
  | 'classic'
  | 'beach'
  | 'garden';
export type VendorType =
  | 'venue'
  | 'photographer'
  | 'caterer'
  | 'florist'
  | 'dj_band'
  | 'videographer'
  | 'planner'
  | 'baker';
export type WeddingSeason = 'spring' | 'summer' | 'fall' | 'winter';

export interface CacheConfig {
  enableMemoryCache: boolean;
  enableRedisCache: boolean;
  enableDatabaseCache: boolean;
  memoryCacheSize: number;
  defaultTTL: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  metricsEnabled: boolean;
}

/**
 * Wedding AI Cache Service - Main caching service
 * Implements multi-layer caching with wedding industry optimizations
 */
export class WeddingAICacheService {
  private supabase: SupabaseClient;
  private redis: Redis;
  private memoryCache: Map<string, CachedResponse>;
  private config: CacheConfig;
  private hitRateTracker: Map<CacheType, { hits: number; misses: number }>;

  // Wedding-specific optimization constants
  private readonly MAJOR_WEDDING_MARKETS = [
    'NYC',
    'LA',
    'Chicago',
    'Miami',
    'Atlanta',
    'Dallas',
    'Seattle',
    'Denver',
    'Austin',
    'Nashville',
    'Boston',
    'San Francisco',
  ];

  private readonly SEASONAL_MULTIPLIERS = {
    spring: 1.0,
    summer: 0.75, // Peak season - faster changes
    fall: 0.85,
    winter: 1.25,
  };

  private readonly VENDOR_TTL_STRATEGIES = {
    venue: { baseTTL: 86400, multiplier: 1.5 }, // 24 hours base, venues change slowly
    photographer: { baseTTL: 43200, multiplier: 0.8 }, // 12 hours base, books quickly
    caterer: { baseTTL: 21600, multiplier: 0.6 }, // 6 hours base, prices fluctuate
    florist: { baseTTL: 14400, multiplier: 0.5 }, // 4 hours base, seasonal availability
    dj_band: { baseTTL: 21600, multiplier: 1.0 }, // 6 hours base, standard
    videographer: { baseTTL: 43200, multiplier: 0.9 }, // 12 hours base
    planner: { baseTTL: 86400, multiplier: 1.2 }, // 24 hours base
    baker: { baseTTL: 28800, multiplier: 0.7 }, // 8 hours base, availability changes
  };

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    redisUrl: string,
    config: Partial<CacheConfig> = {},
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.redis = new Redis(redisUrl);
    this.memoryCache = new Map();
    this.hitRateTracker = new Map();

    this.config = {
      enableMemoryCache: true,
      enableRedisCache: true,
      enableDatabaseCache: true,
      memoryCacheSize: 1000,
      defaultTTL: 21600, // 6 hours
      compressionEnabled: true,
      encryptionEnabled: true,
      metricsEnabled: true,
      ...config,
    };

    // Initialize hit rate tracking for all cache types
    const cacheTypes: CacheType[] = [
      'venue_recommendations',
      'vendor_matching',
      'budget_optimization',
      'timeline_generation',
      'guest_management',
      'menu_suggestions',
      'decor_inspiration',
      'photography_styles',
      'seasonal_planning',
      'location_insights',
      'vendor_availability',
      'pricing_estimates',
    ];

    cacheTypes.forEach((type) => {
      this.hitRateTracker.set(type, { hits: 0, misses: 0 });
    });
  }

  /**
   * Get cached response for AI query
   */
  async getCachedResponse(
    query: AIQuery,
    context: WeddingContext,
    options: {
      bypassCache?: boolean;
      preferredSource?: 'memory' | 'redis' | 'database';
    } = {},
  ): Promise<CachedResponse | null> {
    if (options.bypassCache) return null;

    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(query, context);

    try {
      // Layer 1: Memory Cache (fastest)
      if (
        (this.config.enableMemoryCache && !options.preferredSource) ||
        options.preferredSource === 'memory'
      ) {
        const memoryResult = this.memoryCache.get(cacheKey);
        if (memoryResult && !this.isExpired(memoryResult)) {
          await this.recordCacheHit(
            query.type,
            'memory',
            Date.now() - startTime,
            context,
          );
          memoryResult.hitCount++;
          return memoryResult;
        }
      }

      // Layer 2: Redis Cache (fast)
      if (
        (this.config.enableRedisCache && !options.preferredSource) ||
        options.preferredSource === 'redis'
      ) {
        const redisResult = await this.getFromRedis(cacheKey);
        if (redisResult) {
          await this.recordCacheHit(
            query.type,
            'redis',
            Date.now() - startTime,
            context,
          );

          // Promote to memory cache if enabled
          if (this.config.enableMemoryCache) {
            this.setMemoryCache(cacheKey, redisResult);
          }

          return redisResult;
        }
      }

      // Layer 3: Database Cache (persistent)
      if (
        (this.config.enableDatabaseCache && !options.preferredSource) ||
        options.preferredSource === 'database'
      ) {
        const dbResult = await this.getFromDatabase(cacheKey, context);
        if (dbResult) {
          await this.recordCacheHit(
            query.type,
            'database',
            Date.now() - startTime,
            context,
          );

          // Promote to higher cache layers
          if (this.config.enableRedisCache) {
            await this.setRedisCache(cacheKey, dbResult);
          }
          if (this.config.enableMemoryCache) {
            this.setMemoryCache(cacheKey, dbResult);
          }

          return dbResult;
        }
      }

      // Cache miss
      await this.recordCacheMiss(query.type, Date.now() - startTime, context);
      return null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      await this.recordCacheMiss(
        query.type,
        Date.now() - startTime,
        context,
        error as Error,
      );
      return null;
    }
  }

  /**
   * Set cached response across all enabled cache layers
   */
  async setCachedResponse(
    query: AIQuery,
    response: any,
    context: WeddingContext,
    metadata?: { cost?: number; modelUsed?: string; processingTime?: number },
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(query, context);
    const ttl = this.calculateOptimalTTL(query.type, context);

    const cachedResponse: CachedResponse = {
      data: response,
      timestamp: new Date(),
      ttl,
      hitCount: 0,
      source: 'memory',
      metadata,
    };

    try {
      // Set in all enabled cache layers
      const setCachePromises: Promise<void>[] = [];

      if (this.config.enableMemoryCache) {
        this.setMemoryCache(cacheKey, cachedResponse);
      }

      if (this.config.enableRedisCache) {
        setCachePromises.push(this.setRedisCache(cacheKey, cachedResponse));
      }

      if (this.config.enableDatabaseCache) {
        setCachePromises.push(
          this.setDatabaseCache(cacheKey, cachedResponse, query, context),
        );
      }

      await Promise.all(setCachePromises);

      // Record cache set operation
      if (this.config.metricsEnabled) {
        await this.recordCacheOperation(
          'set',
          query.type,
          context,
          cachedResponse,
        );
      }
    } catch (error) {
      console.error('Cache storage error:', error);
      throw new Error(`Failed to store cache entry: ${error}`);
    }
  }

  /**
   * Invalidate cache for specific wedding or scope
   */
  async invalidateCache(
    weddingId?: string,
    cacheTypes?: CacheType[],
    scope: 'global' | 'wedding' | 'user' | 'location' = 'wedding',
  ): Promise<void> {
    try {
      const invalidationPromises: Promise<any>[] = [];

      switch (scope) {
        case 'wedding':
          if (weddingId) {
            invalidationPromises.push(
              this.invalidateWeddingCache(weddingId, cacheTypes),
            );
          }
          break;

        case 'global':
          invalidationPromises.push(this.invalidateGlobalCache(cacheTypes));
          break;

        case 'location':
          // Location-based invalidation would need additional context
          break;
      }

      await Promise.all(invalidationPromises);

      // Record invalidation metrics
      if (this.config.metricsEnabled) {
        await this.recordCacheInvalidation(scope, cacheTypes, weddingId);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
      throw error;
    }
  }

  /**
   * Preload seasonal cache for wedding markets
   */
  async preloadSeasonalCache(
    season: WeddingSeason,
    locations: string[] = this.MAJOR_WEDDING_MARKETS,
    cacheTypes: CacheType[] = [
      'venue_recommendations',
      'vendor_matching',
      'location_insights',
    ],
  ): Promise<void> {
    try {
      // Get preload configuration from database
      const { data: preloadConfigs } = await this.supabase
        .from('seasonal_cache_configs')
        .select('*')
        .eq('season', season)
        .eq('is_active', true);

      if (!preloadConfigs || preloadConfigs.length === 0) {
        console.warn(`No preload configuration found for season: ${season}`);
        return;
      }

      const preloadPromises = locations.flatMap((location) =>
        cacheTypes.map((cacheType) =>
          this.preloadLocationCache(location, season, cacheType),
        ),
      );

      await Promise.allSettled(preloadPromises);

      console.log(
        `Preloaded ${preloadPromises.length} cache entries for ${season} season`,
      );
    } catch (error) {
      console.error('Seasonal cache preload error:', error);
      throw error;
    }
  }

  /**
   * Get cache performance statistics
   */
  async getCacheStatistics(timeRangeHours: number = 24): Promise<{
    hitRates: Map<CacheType, number>;
    responseTimeMs: Map<CacheType, number>;
    totalSizeMB: number;
    costSavedCents: number;
  }> {
    try {
      // Get statistics from database
      const { data: stats } = await this.supabase.rpc('get_cache_statistics', {
        p_time_range_hours: timeRangeHours,
      });

      const hitRates = new Map<CacheType, number>();
      const responseTimeMs = new Map<CacheType, number>();
      let totalSizeMB = 0;
      let costSavedCents = 0;

      if (stats) {
        stats.forEach((stat: any) => {
          hitRates.set(stat.cache_type, stat.hit_rate);
          responseTimeMs.set(stat.cache_type, stat.avg_response_time_ms);
          totalSizeMB += stat.total_size_mb;
        });
      }

      // Get cost savings from performance metrics
      const { data: costData } = await this.supabase
        .from('cache_performance_metrics')
        .select('cost_saved_cents')
        .gte(
          'recorded_at',
          new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString(),
        );

      if (costData) {
        costSavedCents = costData.reduce(
          (sum, record) => sum + (record.cost_saved_cents || 0),
          0,
        );
      }

      return {
        hitRates,
        responseTimeMs,
        totalSizeMB,
        costSavedCents,
      };
    } catch (error) {
      console.error('Error getting cache statistics:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Generate cache key for wedding context
   */
  private generateCacheKey(query: AIQuery, context: WeddingContext): string {
    const locationKey = this.getLocationKey(context.location);
    const seasonKey = this.getSeasonKey(context.weddingDate);
    const budgetKey = context.budgetRange;
    const guestKey = this.getGuestCountKey(context.guestCount);

    // Create hash of query content for uniqueness
    const contentHash = crypto
      .createHash('sha256')
      .update(query.content)
      .digest('hex')
      .substring(0, 16);

    return `${query.type}:${locationKey}:${seasonKey}:${budgetKey}:${guestKey}:${contentHash}`;
  }

  /**
   * Get location key for caching (major markets vs state grouping)
   */
  private getLocationKey(location: {
    city: string;
    state: string;
    country: string;
  }): string {
    const cityState = `${location.city}_${location.state}`;
    return this.MAJOR_WEDDING_MARKETS.includes(location.city)
      ? cityState
      : location.state;
  }

  /**
   * Get season key from wedding date
   */
  private getSeasonKey(weddingDate: Date): WeddingSeason {
    const month = weddingDate.getMonth();
    if (month >= 2 && month <= 4) return 'spring'; // Mar-May
    if (month >= 5 && month <= 7) return 'summer'; // Jun-Aug
    if (month >= 8 && month <= 10) return 'fall'; // Sep-Nov
    return 'winter'; // Dec-Feb
  }

  /**
   * Get guest count range key
   */
  private getGuestCountKey(guestCount: number): string {
    if (guestCount < 50) return 'small';
    if (guestCount < 150) return 'medium';
    if (guestCount < 300) return 'large';
    return 'xlarge';
  }

  /**
   * Calculate optimal TTL based on wedding context
   */
  private calculateOptimalTTL(
    cacheType: CacheType,
    context: WeddingContext,
  ): number {
    const baseTTL = this.getBaseTTL(cacheType);
    const season = this.getSeasonKey(context.weddingDate);
    const seasonMultiplier = this.SEASONAL_MULTIPLIERS[season];

    // Calculate urgency multiplier based on wedding date proximity
    const daysToWedding = Math.ceil(
      (context.weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    let urgencyMultiplier = 1.0;

    if (daysToWedding <= 30)
      urgencyMultiplier = 0.5; // Very urgent
    else if (daysToWedding <= 90) urgencyMultiplier = 0.75; // Somewhat urgent

    const optimalTTL = Math.max(
      300, // Minimum 5 minutes
      Math.round(baseTTL * seasonMultiplier * urgencyMultiplier),
    );

    return optimalTTL;
  }

  /**
   * Get base TTL for cache type
   */
  private getBaseTTL(cacheType: CacheType): number {
    const baseTTLs = {
      venue_recommendations: 86400, // 24 hours
      vendor_matching: 43200, // 12 hours
      budget_optimization: 21600, // 6 hours
      timeline_generation: 14400, // 4 hours
      guest_management: 10800, // 3 hours
      menu_suggestions: 21600, // 6 hours
      decor_inspiration: 43200, // 12 hours
      photography_styles: 86400, // 24 hours
      seasonal_planning: 172800, // 48 hours
      location_insights: 259200, // 72 hours
      vendor_availability: 7200, // 2 hours
      pricing_estimates: 3600, // 1 hour
    };

    return baseTTLs[cacheType] || this.config.defaultTTL;
  }

  /**
   * Check if cached response is expired
   */
  private isExpired(cached: CachedResponse): boolean {
    const expiryTime = cached.timestamp.getTime() + cached.ttl * 1000;
    return Date.now() > expiryTime;
  }

  /**
   * Memory cache operations
   */
  private setMemoryCache(key: string, value: CachedResponse): void {
    // Implement LRU eviction if memory cache is full
    if (this.memoryCache.size >= this.config.memoryCacheSize) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }

    value.source = 'memory';
    this.memoryCache.set(key, value);
  }

  /**
   * Redis cache operations
   */
  private async getFromRedis(key: string): Promise<CachedResponse | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached) as CachedResponse;
      parsed.timestamp = new Date(parsed.timestamp);
      parsed.source = 'redis';

      return this.isExpired(parsed) ? null : parsed;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  private async setRedisCache(
    key: string,
    value: CachedResponse,
  ): Promise<void> {
    try {
      value.source = 'redis';
      await this.redis.setex(key, value.ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }

  /**
   * Database cache operations
   */
  private async getFromDatabase(
    key: string,
    context: WeddingContext,
  ): Promise<CachedResponse | null> {
    try {
      const { data: cached } = await this.supabase
        .from('ai_cache_entries')
        .select('*')
        .eq('cache_key', key)
        .eq('validation_status', 'valid')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!cached) return null;

      const result: CachedResponse = {
        data: cached.response_data,
        timestamp: new Date(cached.created_at),
        ttl: Math.floor(
          (new Date(cached.expires_at).getTime() - Date.now()) / 1000,
        ),
        hitCount: cached.access_count,
        source: 'database',
      };

      // Update access count and last accessed
      await this.supabase
        .from('ai_cache_entries')
        .update({
          access_count: cached.access_count + 1,
          last_accessed: new Date().toISOString(),
        })
        .eq('id', cached.id);

      return result;
    } catch (error) {
      console.error('Database cache get error:', error);
      return null;
    }
  }

  private async setDatabaseCache(
    key: string,
    value: CachedResponse,
    query: AIQuery,
    context: WeddingContext,
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + value.ttl * 1000);

      await this.supabase.from('ai_cache_entries').upsert({
        cache_key: key,
        cache_type: query.type,
        query_hash: crypto
          .createHash('sha256')
          .update(query.content)
          .digest('hex')
          .substring(0, 64),
        response_data: value.data,
        wedding_context: context,
        expires_at: expiresAt.toISOString(),
        wedding_id: context.weddingId,
        cache_size_bytes: JSON.stringify(value.data).length,
        location_key: this.getLocationKey(context.location),
        season: this.getSeasonKey(context.weddingDate),
        budget_tier: context.budgetRange,
        guest_count_range: this.getGuestCountKey(context.guestCount),
        wedding_date: context.weddingDate.toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Database cache set error:', error);
      throw error;
    }
  }

  /**
   * Performance tracking methods
   */
  private async recordCacheHit(
    cacheType: CacheType,
    source: 'memory' | 'redis' | 'database',
    responseTimeMs: number,
    context: WeddingContext,
  ): Promise<void> {
    // Update in-memory hit rate tracking
    const tracker = this.hitRateTracker.get(cacheType);
    if (tracker) {
      tracker.hits++;
    }

    if (!this.config.metricsEnabled) return;

    try {
      await this.supabase.from('cache_performance_metrics').insert({
        cache_type: cacheType,
        operation_type: 'hit',
        response_time_ms: responseTimeMs,
        wedding_context: context,
        location_key: this.getLocationKey(context.location),
        season: this.getSeasonKey(context.weddingDate),
      });
    } catch (error) {
      console.error('Error recording cache hit:', error);
    }
  }

  private async recordCacheMiss(
    cacheType: CacheType,
    responseTimeMs: number,
    context: WeddingContext,
    error?: Error,
  ): Promise<void> {
    // Update in-memory hit rate tracking
    const tracker = this.hitRateTracker.get(cacheType);
    if (tracker) {
      tracker.misses++;
    }

    if (!this.config.metricsEnabled) return;

    try {
      await this.supabase.from('cache_performance_metrics').insert({
        cache_type: cacheType,
        operation_type: 'miss',
        response_time_ms: responseTimeMs,
        wedding_context: context,
        location_key: this.getLocationKey(context.location),
        season: this.getSeasonKey(context.weddingDate),
      });
    } catch (dbError) {
      console.error('Error recording cache miss:', dbError);
    }
  }

  private async recordCacheOperation(
    operation: string,
    cacheType: CacheType,
    context: WeddingContext,
    cached: CachedResponse,
  ): Promise<void> {
    if (!this.config.metricsEnabled) return;

    try {
      await this.supabase.rpc('record_cache_performance', {
        p_cache_type: cacheType,
        p_operation_type: operation,
        p_response_time_ms: 0,
        p_wedding_context: context,
        p_cache_size_bytes: JSON.stringify(cached.data).length,
      });
    } catch (error) {
      console.error('Error recording cache operation:', error);
    }
  }

  private async recordCacheInvalidation(
    scope: string,
    cacheTypes?: CacheType[],
    weddingId?: string,
  ): Promise<void> {
    if (!this.config.metricsEnabled) return;

    try {
      const invalidationTypes = cacheTypes || ['venue_recommendations']; // Default for metrics

      for (const cacheType of invalidationTypes) {
        await this.supabase.from('cache_performance_metrics').insert({
          cache_type: cacheType,
          operation_type: 'invalidation',
          response_time_ms: 0,
          wedding_context: { scope, weddingId },
        });
      }
    } catch (error) {
      console.error('Error recording cache invalidation:', error);
    }
  }

  /**
   * Cache invalidation helper methods
   */
  private async invalidateWeddingCache(
    weddingId: string,
    cacheTypes?: CacheType[],
  ): Promise<void> {
    const promises: Promise<any>[] = [];

    // Clear from memory cache (pattern-based clearing)
    for (const key of this.memoryCache.keys()) {
      if (
        key.includes(weddingId) ||
        !cacheTypes ||
        cacheTypes.some((type) => key.startsWith(type))
      ) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from Redis cache
    if (cacheTypes) {
      for (const cacheType of cacheTypes) {
        promises.push(this.redis.del(`${cacheType}:*${weddingId}*`));
      }
    } else {
      promises.push(this.redis.del(`*${weddingId}*`));
    }

    // Clear from database
    const dbQuery = this.supabase
      .from('ai_cache_entries')
      .update({ validation_status: 'invalid' })
      .eq('wedding_id', weddingId);

    if (cacheTypes) {
      dbQuery.in('cache_type', cacheTypes);
    }

    promises.push(dbQuery);

    await Promise.all(promises);
  }

  private async invalidateGlobalCache(cacheTypes?: CacheType[]): Promise<void> {
    const promises: Promise<any>[] = [];

    if (cacheTypes) {
      // Clear specific cache types
      for (const cacheType of cacheTypes) {
        // Clear from memory
        for (const key of this.memoryCache.keys()) {
          if (key.startsWith(cacheType)) {
            this.memoryCache.delete(key);
          }
        }

        // Clear from Redis
        promises.push(this.redis.del(`${cacheType}:*`));

        // Mark as invalid in database
        promises.push(
          this.supabase
            .from('ai_cache_entries')
            .update({ validation_status: 'invalid' })
            .eq('cache_type', cacheType),
        );
      }
    } else {
      // Clear all caches
      this.memoryCache.clear();
      promises.push(this.redis.flushdb());
      promises.push(
        this.supabase
          .from('ai_cache_entries')
          .update({ validation_status: 'invalid' }),
      );
    }

    await Promise.all(promises);
  }

  /**
   * Preload cache for specific location and season
   */
  private async preloadLocationCache(
    location: string,
    season: WeddingSeason,
    cacheType: CacheType,
  ): Promise<void> {
    // This would typically fetch popular queries for the location/season
    // and populate the cache with likely responses

    try {
      // Get popular queries from historical data
      const { data: popularQueries } = await this.supabase
        .from('cache_performance_metrics')
        .select('wedding_context')
        .eq('cache_type', cacheType)
        .eq('location_key', location)
        .eq('season', season)
        .gte(
          'recorded_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        ) // Last 30 days
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (popularQueries && popularQueries.length > 0) {
        // This is where you would typically call your AI service to generate
        // responses for common queries and cache them
        console.log(
          `Preloading ${popularQueries.length} queries for ${location} ${season} ${cacheType}`,
        );
      }
    } catch (error) {
      console.error(
        `Error preloading cache for ${location} ${season} ${cacheType}:`,
        error,
      );
    }
  }

  /**
   * Cleanup expired entries
   */
  async cleanupExpiredEntries(): Promise<number> {
    try {
      // Clear expired memory cache entries
      let memoryCleared = 0;
      for (const [key, value] of this.memoryCache.entries()) {
        if (this.isExpired(value)) {
          this.memoryCache.delete(key);
          memoryCleared++;
        }
      }

      // Database cleanup is handled by the cleanup_expired_cache_entries() function
      const { data: deletedCount } = await this.supabase.rpc(
        'cleanup_expired_cache_entries',
      );

      console.log(
        `Cleaned up ${memoryCleared} memory entries and ${deletedCount || 0} database entries`,
      );

      return (deletedCount || 0) + memoryCleared;
    } catch (error) {
      console.error('Error during cache cleanup:', error);
      throw error;
    }
  }

  /**
   * Get current hit rates for all cache types
   */
  getHitRates(): Map<CacheType, number> {
    const hitRates = new Map<CacheType, number>();

    for (const [cacheType, tracker] of this.hitRateTracker.entries()) {
      const total = tracker.hits + tracker.misses;
      const hitRate = total > 0 ? tracker.hits / total : 0;
      hitRates.set(cacheType, hitRate);
    }

    return hitRates;
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    memory: { connected: boolean; size: number };
    redis: { connected: boolean; status: string };
    database: { connected: boolean; latency: number };
  }> {
    const health = {
      status: 'healthy' as const,
      memory: { connected: true, size: this.memoryCache.size },
      redis: { connected: false, status: 'unknown' },
      database: { connected: false, latency: 0 },
    };

    try {
      // Test Redis connection
      const redisStart = Date.now();
      await this.redis.ping();
      health.redis = { connected: true, status: 'connected' };
    } catch (error) {
      health.redis = { connected: false, status: 'error' };
      health.status = 'degraded';
    }

    try {
      // Test database connection
      const dbStart = Date.now();
      await this.supabase.from('ai_cache_entries').select('id').limit(1);
      health.database = { connected: true, latency: Date.now() - dbStart };
    } catch (error) {
      health.database = { connected: false, latency: -1 };
      health.status = 'degraded';
    }

    if (!health.redis.connected && !health.database.connected) {
      health.status = 'unhealthy';
    }

    return health;
  }
}

export default WeddingAICacheService;
