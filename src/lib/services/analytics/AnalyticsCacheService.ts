/**
 * WS-246: Analytics Cache Service
 * Team B Round 1: Performance optimization with intelligent caching
 *
 * High-performance caching service for analytics queries with intelligent
 * invalidation, cache warming, and wedding industry-specific optimization.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  AnalyticsCacheServiceInterface,
  CacheConfiguration,
  CacheMetrics,
  AnalyticsCache,
  QueryType,
  AnalyticsQueryRequest,
} from '@/types/analytics';

export class AnalyticsCacheService implements AnalyticsCacheServiceInterface {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  private memoryCache = new Map<
    string,
    {
      data: any;
      expires: number;
      hits: number;
      created: number;
    }
  >();

  private readonly config: CacheConfiguration = {
    default_ttl: 900, // 15 minutes default
    max_cache_size: 256, // 256MB
    eviction_policy: 'lru',
    compression_enabled: true,
    cache_warming_enabled: true,
    invalidation_patterns: [
      'vendor:*:performance',
      'benchmark:*',
      'trends:*',
      'export:*',
    ],
  };

  private readonly CACHE_KEYS = {
    VENDOR_PERFORMANCE: 'perf',
    BENCHMARKS: 'bench',
    TRENDS: 'trend',
    EXPORT: 'export',
    RANKING: 'rank',
    METRICS: 'metrics',
  };

  // Cache TTL based on query complexity and data volatility
  private readonly CACHE_TTL_BY_TYPE: Record<QueryType, number> = {
    performance_summary: 900, // 15 minutes - frequently accessed
    trend_analysis: 1800, // 30 minutes - computationally expensive
    benchmark_comparison: 3600, // 1 hour - relatively static
    detailed_metrics: 600, // 10 minutes - detailed data
    export_data: 300, // 5 minutes - large datasets
    real_time_score: 60, // 1 minute - needs to be fresh
  };

  // Wedding industry-specific cache warming patterns
  private readonly WARM_CACHE_PATTERNS = [
    'photography:performance:*',
    'catering:performance:*',
    'venues:performance:*',
    'florist:performance:*',
    'benchmark:all:*',
    'trends:monthly:*',
  ];

  /**
   * Get cached data by key
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first (fastest)
      const memoryResult = this.getFromMemoryCache<T>(key);
      if (memoryResult !== null) {
        await this.incrementHitCount(key);
        return memoryResult;
      }

      // Check database cache
      const { data: cacheRecord, error } = await this.supabase
        .from('analytics_cache')
        .select('*')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !cacheRecord) {
        return null;
      }

      // Update access statistics
      await this.updateAccessStats(key);

      // Store in memory cache for next access
      this.storeInMemoryCache(
        key,
        cacheRecord.result_data,
        new Date(cacheRecord.expires_at).getTime(),
      );

      return cacheRecord.result_data as T;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Set data in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const expirationTime =
        Date.now() + (ttl || this.config.default_ttl) * 1000;
      const expiresAt = new Date(expirationTime).toISOString();

      // Store in memory cache immediately
      this.storeInMemoryCache(key, value, expirationTime);

      // Create parameters hash for invalidation
      const parametersHash = this.createParametersHash(key);

      // Store in database cache
      const cacheData = {
        cache_key: key,
        query_type: this.extractQueryTypeFromKey(key),
        result_data: value,
        expires_at: expiresAt,
        parameters_hash: parametersHash,
        data_version: '1.0',
        hit_count: 0,
        last_accessed: new Date().toISOString(),
        generated_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('analytics_cache')
        .upsert(cacheData, {
          onConflict: 'cache_key',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Error storing in database cache:', error);
      }

      // Maintain cache size limits
      await this.maintainCacheSize();
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      let invalidatedCount = 0;

      // Invalidate memory cache
      const memoryKeys = Array.from(this.memoryCache.keys());
      const matchingKeys = memoryKeys.filter((key) =>
        this.matchesPattern(key, pattern),
      );

      matchingKeys.forEach((key) => {
        this.memoryCache.delete(key);
        invalidatedCount++;
      });

      // Invalidate database cache
      const { data: matchingRecords } = await this.supabase
        .from('analytics_cache')
        .select('id, cache_key')
        .like('cache_key', this.patternToSql(pattern));

      if (matchingRecords && matchingRecords.length > 0) {
        const idsToDelete = matchingRecords.map((record) => record.id);

        const { error } = await this.supabase
          .from('analytics_cache')
          .delete()
          .in('id', idsToDelete);

        if (!error) {
          invalidatedCount += matchingRecords.length;
        }
      }

      console.log(
        `Invalidated ${invalidatedCount} cache entries for pattern: ${pattern}`,
      );
      return invalidatedCount;
    } catch (error) {
      console.error('Error invalidating cache:', error);
      return 0;
    }
  }

  /**
   * Get cache performance statistics
   */
  async getStats(): Promise<CacheMetrics> {
    try {
      // Memory cache stats
      const memorySize = this.calculateMemoryCacheSize();
      const memoryEntries = this.memoryCache.size;

      // Database cache stats
      const { data: cacheStats } = await this.supabase
        .from('analytics_cache')
        .select('hit_count, generated_at, last_accessed')
        .gt('expires_at', new Date().toISOString());

      if (!cacheStats || cacheStats.length === 0) {
        return {
          hit_rate: 0,
          miss_rate: 1,
          eviction_rate: 0,
          memory_usage: memorySize,
          avg_retrieval_time: 0,
          cache_efficiency_score: 0,
        };
      }

      // Calculate hit rates
      const totalHits = cacheStats.reduce(
        (sum, stat) => sum + (stat.hit_count || 0),
        0,
      );
      const totalQueries = totalHits + cacheStats.length; // Approximate
      const hitRate = totalQueries > 0 ? totalHits / totalQueries : 0;

      // Calculate average retrieval time (simplified)
      const avgRetrievalTime = this.calculateAverageRetrievalTime();

      // Calculate cache efficiency score
      const efficiencyScore =
        hitRate * 0.4 +
        Math.min(1, memorySize / (this.config.max_cache_size * 1024 * 1024)) *
          0.3 +
        (1 - Math.min(1, avgRetrievalTime / 100)) * 0.3;

      return {
        hit_rate: hitRate,
        miss_rate: 1 - hitRate,
        eviction_rate: 0.05, // Placeholder - would need more sophisticated tracking
        memory_usage: memorySize,
        avg_retrieval_time: avgRetrievalTime,
        cache_efficiency_score: efficiencyScore,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        hit_rate: 0,
        miss_rate: 1,
        eviction_rate: 0,
        memory_usage: 0,
        avg_retrieval_time: 0,
        cache_efficiency_score: 0,
      };
    }
  }

  /**
   * Warm cache with frequently accessed queries
   */
  async warmCache(queries: string[]): Promise<void> {
    try {
      if (!this.config.cache_warming_enabled) {
        return;
      }

      console.log(`Warming cache with ${queries.length} queries...`);

      // Process queries in parallel (limited concurrency)
      const batchSize = 5;
      for (let i = 0; i < queries.length; i += batchSize) {
        const batch = queries.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (query) => {
            try {
              await this.executeAndCacheQuery(query);
            } catch (error) {
              console.warn(`Failed to warm cache for query: ${query}`, error);
            }
          }),
        );

        // Small delay between batches to avoid overwhelming the system
        if (i + batchSize < queries.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log('Cache warming completed');
    } catch (error) {
      console.error('Error warming cache:', error);
    }
  }

  /**
   * Generate optimized cache key for analytics query
   */
  generateCacheKey(
    queryType: QueryType,
    parameters: AnalyticsQueryRequest,
    vendorId?: string,
  ): string {
    const keyParts = [
      this.CACHE_KEYS[
        queryType.toUpperCase() as keyof typeof this.CACHE_KEYS
      ] || queryType,
      vendorId || 'all',
    ];

    // Add relevant parameters to key
    if (parameters.date_range) {
      keyParts.push(
        `${parameters.date_range.start}_${parameters.date_range.end}`,
      );
    }

    if (parameters.metrics && parameters.metrics.length > 0) {
      keyParts.push(parameters.metrics.sort().join(','));
    }

    if (parameters.industry_category) {
      keyParts.push(parameters.industry_category);
    }

    if (parameters.geographic_region) {
      keyParts.push(parameters.geographic_region);
    }

    // Add boolean flags
    const flags = [];
    if (parameters.include_benchmarks) flags.push('bench');
    if (parameters.include_trends) flags.push('trend');
    if (flags.length > 0) {
      keyParts.push(flags.join(','));
    }

    return keyParts.join(':');
  }

  /**
   * Get cache TTL for specific query type
   */
  getCacheTTL(
    queryType: QueryType,
    complexity: 'low' | 'medium' | 'high' = 'medium',
  ): number {
    const baseTTL =
      this.CACHE_TTL_BY_TYPE[queryType] || this.config.default_ttl;

    // Adjust based on query complexity
    switch (complexity) {
      case 'low':
        return baseTTL * 0.5; // Cache for shorter time
      case 'high':
        return baseTTL * 2; // Cache longer for expensive queries
      default:
        return baseTTL;
    }
  }

  /**
   * Intelligent cache warming for wedding season
   */
  async warmForWeddingSeason(): Promise<void> {
    try {
      const currentMonth = new Date().getMonth() + 1;
      const isWeddingSeason = [4, 5, 6, 7, 8, 9, 10, 11].includes(currentMonth);
      const isPeakSeason = [5, 6, 9, 10].includes(currentMonth);

      if (!isWeddingSeason) {
        console.log('Not wedding season - skipping seasonal cache warming');
        return;
      }

      const priorities = isPeakSeason
        ? ['performance_summary', 'benchmark_comparison', 'real_time_score']
        : ['trend_analysis', 'detailed_metrics', 'benchmark_comparison'];

      const warmingQueries = this.generateSeasonalWarmingQueries(priorities);
      await this.warmCache(warmingQueries);

      console.log(
        `Completed wedding season cache warming (peak: ${isPeakSeason})`,
      );
    } catch (error) {
      console.error('Error warming cache for wedding season:', error);
    }
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  private getFromMemoryCache<T>(key: string): T | null {
    const cached = this.memoryCache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expires) {
      this.memoryCache.delete(key);
      return null;
    }

    // Increment hit count
    cached.hits++;

    return cached.data as T;
  }

  private storeInMemoryCache<T>(key: string, data: T, expires: number): void {
    // Check if we need to evict entries first
    this.maintainMemoryCacheSize();

    this.memoryCache.set(key, {
      data,
      expires,
      hits: 0,
      created: Date.now(),
    });
  }

  private maintainMemoryCacheSize(): void {
    const maxEntries = 1000; // Reasonable limit for memory cache

    if (this.memoryCache.size >= maxEntries) {
      // Evict based on configured policy
      switch (this.config.eviction_policy) {
        case 'lru':
          this.evictLRU(maxEntries * 0.8); // Remove 20% of entries
          break;
        case 'lfu':
          this.evictLFU(maxEntries * 0.8);
          break;
        case 'ttl':
          this.evictExpired();
          break;
        default:
          this.evictRandom(maxEntries * 0.8);
      }
    }
  }

  private evictLRU(targetSize: number): void {
    const entries = Array.from(this.memoryCache.entries());

    // Sort by last access time (oldest first)
    entries.sort((a, b) => a[1].created - b[1].created);

    // Remove oldest entries
    const toRemove = entries.length - targetSize;
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  private evictLFU(targetSize: number): void {
    const entries = Array.from(this.memoryCache.entries());

    // Sort by hit count (least frequently used first)
    entries.sort((a, b) => a[1].hits - b[1].hits);

    // Remove least frequently used entries
    const toRemove = entries.length - targetSize;
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  private evictExpired(): void {
    const now = Date.now();

    for (const [key, cached] of this.memoryCache.entries()) {
      if (now > cached.expires) {
        this.memoryCache.delete(key);
      }
    }
  }

  private evictRandom(targetSize: number): void {
    const entries = Array.from(this.memoryCache.keys());
    const toRemove = entries.length - targetSize;

    for (let i = 0; i < toRemove; i++) {
      const randomIndex = Math.floor(Math.random() * entries.length);
      this.memoryCache.delete(entries[randomIndex]);
      entries.splice(randomIndex, 1);
    }
  }

  private calculateMemoryCacheSize(): number {
    // Rough estimation of memory usage
    let totalSize = 0;

    for (const [key, cached] of this.memoryCache.entries()) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(cached.data).length * 2;
      totalSize += 64; // Overhead for object structure
    }

    return totalSize;
  }

  private async incrementHitCount(key: string): Promise<void> {
    try {
      await this.supabase
        .from('analytics_cache')
        .update({
          hit_count: this.supabase.rpc('increment_hit_count'),
          last_accessed: new Date().toISOString(),
        })
        .eq('cache_key', key);
    } catch (error) {
      // Non-critical error
      console.warn('Failed to increment hit count:', error);
    }
  }

  private async updateAccessStats(key: string): Promise<void> {
    try {
      await this.supabase
        .from('analytics_cache')
        .update({
          last_accessed: new Date().toISOString(),
        })
        .eq('cache_key', key);
    } catch (error) {
      console.warn('Failed to update access stats:', error);
    }
  }

  private createParametersHash(key: string): string {
    return crypto
      .createHash('sha256')
      .update(key)
      .digest('hex')
      .substring(0, 16);
  }

  private extractQueryTypeFromKey(key: string): QueryType {
    const prefix = key.split(':')[0];

    switch (prefix) {
      case 'perf':
        return 'performance_summary';
      case 'bench':
        return 'benchmark_comparison';
      case 'trend':
        return 'trend_analysis';
      case 'export':
        return 'export_data';
      case 'rank':
        return 'performance_summary';
      case 'metrics':
        return 'detailed_metrics';
      default:
        return 'performance_summary';
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\[.*\]/g, '[^:]*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(key);
  }

  private patternToSql(pattern: string): string {
    // Convert glob pattern to SQL LIKE pattern
    return pattern.replace(/\*/g, '%').replace(/\?/g, '_');
  }

  private calculateAverageRetrievalTime(): number {
    // Simplified calculation - in production, you'd track actual retrieval times
    const memoryTime = 1; // 1ms for memory cache
    const databaseTime = 50; // 50ms for database cache

    return (
      (this.memoryCache.size / (this.memoryCache.size + 100)) * memoryTime +
      (100 / (this.memoryCache.size + 100)) * databaseTime
    );
  }

  private async executeAndCacheQuery(query: string): Promise<void> {
    // This would execute the actual analytics query and cache the result
    // For now, it's a placeholder that would integrate with the analytics services
    console.log(`Executing and caching query: ${query}`);

    // In a real implementation, this would:
    // 1. Parse the query string
    // 2. Execute the corresponding analytics query
    // 3. Cache the result with appropriate TTL

    // Placeholder implementation
    const mockResult = { cached: true, timestamp: new Date().toISOString() };
    await this.set(query, mockResult, 900);
  }

  private generateSeasonalWarmingQueries(priorities: QueryType[]): string[] {
    const queries: string[] = [];
    const industries = ['photography', 'catering', 'venues', 'florist'];

    priorities.forEach((queryType) => {
      industries.forEach((industry) => {
        // Generate representative queries for each industry and query type
        queries.push(`${queryType}:${industry}:last_30_days`);
        queries.push(`${queryType}:${industry}:benchmark`);

        if (queryType === 'trend_analysis') {
          queries.push(`${queryType}:${industry}:seasonal`);
        }
      });
    });

    return queries;
  }

  private async maintainCacheSize(): Promise<void> {
    try {
      // Clean up expired entries
      await this.supabase
        .from('analytics_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      // Get cache size
      const { count } = await this.supabase
        .from('analytics_cache')
        .select('*', { count: 'exact', head: true });

      // If still too large, remove oldest entries
      const maxEntries = 10000;
      if (count && count > maxEntries) {
        const { data: oldEntries } = await this.supabase
          .from('analytics_cache')
          .select('id')
          .order('last_accessed', { ascending: true })
          .limit(count - maxEntries);

        if (oldEntries && oldEntries.length > 0) {
          const idsToDelete = oldEntries.map((entry) => entry.id);
          await this.supabase
            .from('analytics_cache')
            .delete()
            .in('id', idsToDelete);
        }
      }
    } catch (error) {
      console.error('Error maintaining cache size:', error);
    }
  }
}

// Export singleton instance
export const analyticsCacheService = new AnalyticsCacheService();
