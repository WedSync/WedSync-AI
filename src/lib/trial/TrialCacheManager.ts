import { createClient } from '@/lib/supabase/client';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  useMemory?: boolean; // Use in-memory cache (default: true)
  useDatabase?: boolean; // Use database cache (default: true)
  forceRefresh?: boolean; // Force refresh cache (default: false)
}

export class TrialCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private readonly supabase = createClient();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  // Cache keys for different data types
  private static readonly CACHE_KEYS = {
    TRIAL_ROI: (trialId: string) => `trial_roi_${trialId}`,
    BUSINESS_INTELLIGENCE: () => `business_intelligence_global`,
    CROSS_TEAM_METRICS: (trialId: string) => `cross_team_metrics_${trialId}`,
    SERVICE_USAGE: (trialId: string, service: string) =>
      `service_usage_${trialId}_${service}`,
    CONVERSION_FUNNEL: () => `conversion_funnel_global`,
    SUPPLIER_BENCHMARKS: () => `supplier_benchmarks`,
    ML_PREDICTIONS: (trialId: string) => `ml_predictions_${trialId}`,
  };

  /**
   * Get cached data with automatic fallback to database cache
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { useMemory = true, useDatabase = true } = options;

    try {
      // Try memory cache first (fastest)
      if (useMemory) {
        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry && this.isValidEntry(memoryEntry)) {
          return memoryEntry.data as T;
        }
      }

      // Try database cache (slower but persistent)
      if (useDatabase) {
        const dbEntry = await this.getFromDatabase(key);
        if (dbEntry && this.isValidEntry(dbEntry)) {
          // Restore to memory cache for faster subsequent access
          if (useMemory) {
            this.memoryCache.set(key, dbEntry);
          }
          return dbEntry.data as T;
        }
      }

      return null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache with automatic TTL management
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {},
  ): Promise<void> {
    const {
      ttl = this.defaultTTL,
      useMemory = true,
      useDatabase = true,
    } = options;

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
    };

    try {
      // Set in memory cache
      if (useMemory) {
        this.memoryCache.set(key, entry);
      }

      // Set in database cache for persistence
      if (useDatabase) {
        await this.setInDatabase(key, entry);
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Get or compute data with caching
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const { forceRefresh = false } = options;

    // Return cached data unless force refresh is requested
    if (!forceRefresh) {
      const cachedData = await this.get<T>(key, options);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    // Compute new data
    const newData = await computeFn();

    // Cache the computed data
    await this.set(key, newData, options);

    return newData;
  }

  /**
   * Cache trial ROI analysis results
   */
  async cacheTrialROI(
    trialId: string,
    roiData: any,
    ttl = 10 * 60 * 1000,
  ): Promise<void> {
    const key = TrialCacheManager.CACHE_KEYS.TRIAL_ROI(trialId);
    await this.set(key, roiData, { ttl });
  }

  /**
   * Get cached trial ROI or compute if not available
   */
  async getCachedTrialROI(
    trialId: string,
    computeFn: () => Promise<any>,
  ): Promise<any> {
    const key = TrialCacheManager.CACHE_KEYS.TRIAL_ROI(trialId);
    return this.getOrCompute(key, computeFn, { ttl: 10 * 60 * 1000 });
  }

  /**
   * Cache business intelligence metrics
   */
  async cacheBusinessIntelligence(
    data: any,
    ttl = 15 * 60 * 1000,
  ): Promise<void> {
    const key = TrialCacheManager.CACHE_KEYS.BUSINESS_INTELLIGENCE();
    await this.set(key, data, { ttl });
  }

  /**
   * Get cached business intelligence or compute if not available
   */
  async getCachedBusinessIntelligence(
    computeFn: () => Promise<any>,
  ): Promise<any> {
    const key = TrialCacheManager.CACHE_KEYS.BUSINESS_INTELLIGENCE();
    return this.getOrCompute(key, computeFn, { ttl: 15 * 60 * 1000 });
  }

  /**
   * Cache cross-team metrics for specific trial
   */
  async cacheCrossTeamMetrics(
    trialId: string,
    metrics: any,
    ttl = 5 * 60 * 1000,
  ): Promise<void> {
    const key = TrialCacheManager.CACHE_KEYS.CROSS_TEAM_METRICS(trialId);
    await this.set(key, metrics, { ttl });
  }

  /**
   * Get cached cross-team metrics
   */
  async getCachedCrossTeamMetrics(
    trialId: string,
    computeFn: () => Promise<any>,
  ): Promise<any> {
    const key = TrialCacheManager.CACHE_KEYS.CROSS_TEAM_METRICS(trialId);
    return this.getOrCompute(key, computeFn, { ttl: 5 * 60 * 1000 });
  }

  /**
   * Cache service-specific usage data
   */
  async cacheServiceUsage(
    trialId: string,
    service: string,
    usage: any,
    ttl = 2 * 60 * 1000,
  ): Promise<void> {
    const key = TrialCacheManager.CACHE_KEYS.SERVICE_USAGE(trialId, service);
    await this.set(key, usage, { ttl });
  }

  /**
   * Cache conversion funnel data
   */
  async cacheConversionFunnel(
    funnel: any,
    ttl = 30 * 60 * 1000,
  ): Promise<void> {
    const key = TrialCacheManager.CACHE_KEYS.CONVERSION_FUNNEL();
    await this.set(key, funnel, { ttl });
  }

  /**
   * Cache supplier benchmarks
   */
  async cacheSupplierBenchmarks(
    benchmarks: any,
    ttl = 60 * 60 * 1000,
  ): Promise<void> {
    const key = TrialCacheManager.CACHE_KEYS.SUPPLIER_BENCHMARKS();
    await this.set(key, benchmarks, { ttl });
  }

  /**
   * Cache ML prediction results
   */
  async cacheMLPredictions(
    trialId: string,
    predictions: any,
    ttl = 20 * 60 * 1000,
  ): Promise<void> {
    const key = TrialCacheManager.CACHE_KEYS.ML_PREDICTIONS(trialId);
    await this.set(key, predictions, { ttl });
  }

  /**
   * Invalidate specific cache entries
   */
  async invalidate(patterns: string[]): Promise<void> {
    try {
      // Clear memory cache entries matching patterns
      for (const [key] of this.memoryCache) {
        if (patterns.some((pattern) => key.includes(pattern))) {
          this.memoryCache.delete(key);
        }
      }

      // Clear database cache entries
      for (const pattern of patterns) {
        await this.supabase
          .from('trial_cache')
          .delete()
          .like('cache_key', `%${pattern}%`);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Invalidate trial-specific cache
   */
  async invalidateTrialCache(trialId: string): Promise<void> {
    await this.invalidate([`trial_${trialId}`, `_${trialId}_`, `${trialId}`]);
  }

  /**
   * Clear all expired entries (cleanup)
   */
  async cleanup(): Promise<void> {
    const now = Date.now();

    // Clean memory cache
    for (const [key, entry] of this.memoryCache) {
      if (!this.isValidEntry(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // Clean database cache
    try {
      await this.supabase
        .from('trial_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());
    } catch (error) {
      console.error('Database cache cleanup error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryEntries: number;
    memoryHitRate: number;
    databaseEntries: number;
    totalCacheSize: number;
  }> {
    try {
      const memoryStat = {
        entries: this.memoryCache.size,
        hitRate: this.calculateHitRate(),
      };

      const { data: dbEntries } = await this.supabase
        .from('trial_cache')
        .select('cache_key', { count: 'exact', head: true });

      return {
        memoryEntries: memoryStat.entries,
        memoryHitRate: memoryStat.hitRate,
        databaseEntries: dbEntries?.length || 0,
        totalCacheSize: this.calculateTotalSize(),
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        memoryEntries: 0,
        memoryHitRate: 0,
        databaseEntries: 0,
        totalCacheSize: 0,
      };
    }
  }

  /**
   * Pre-warm cache with frequently accessed data
   */
  async preWarmCache(): Promise<void> {
    try {
      // Pre-warm business intelligence data
      const biKey = TrialCacheManager.CACHE_KEYS.BUSINESS_INTELLIGENCE();
      const biCached = await this.get(biKey);

      if (!biCached) {
        console.log('Pre-warming business intelligence cache...');
        // This would trigger the actual computation and caching
        // Implementation would depend on the TrialUsageIntegration service
      }

      // Pre-warm supplier benchmarks
      const benchmarksKey = TrialCacheManager.CACHE_KEYS.SUPPLIER_BENCHMARKS();
      const benchmarksCached = await this.get(benchmarksKey);

      if (!benchmarksCached) {
        console.log('Pre-warming supplier benchmarks cache...');
        // This would trigger the actual computation and caching
      }

      // Pre-warm conversion funnel
      const funnelKey = TrialCacheManager.CACHE_KEYS.CONVERSION_FUNNEL();
      const funnelCached = await this.get(funnelKey);

      if (!funnelCached) {
        console.log('Pre-warming conversion funnel cache...');
        // This would trigger the actual computation and caching
      }
    } catch (error) {
      console.error('Cache pre-warming error:', error);
    }
  }

  // Private helper methods

  private isValidEntry(entry: CacheEntry): boolean {
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  private async getFromDatabase(key: string): Promise<CacheEntry | null> {
    try {
      const { data, error } = await this.supabase
        .from('trial_cache')
        .select('*')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      return {
        data: data.cache_value,
        timestamp: new Date(data.created_at).getTime(),
        ttl:
          new Date(data.expires_at).getTime() -
          new Date(data.created_at).getTime(),
        key: data.cache_key,
      };
    } catch (error) {
      console.error('Database cache get error:', error);
      return null;
    }
  }

  private async setInDatabase(key: string, entry: CacheEntry): Promise<void> {
    try {
      const expiresAt = new Date(entry.timestamp + entry.ttl);

      await this.supabase.from('trial_cache').upsert(
        {
          cache_key: key,
          cache_value: entry.data,
          created_at: new Date(entry.timestamp).toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'cache_key',
        },
      );
    } catch (error) {
      console.error('Database cache set error:', error);
    }
  }

  private calculateHitRate(): number {
    // This would require tracking hits/misses over time
    // For now, return a placeholder
    return 0.85; // 85% hit rate placeholder
  }

  private calculateTotalSize(): number {
    // Calculate approximate memory usage
    let totalSize = 0;
    for (const [key, entry] of this.memoryCache) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry.data).length * 2;
    }
    return totalSize;
  }
}

// Singleton instance
export const trialCacheManager = new TrialCacheManager();
