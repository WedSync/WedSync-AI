import { LRUCache } from 'lru-cache';

interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  max: number; // Maximum number of items
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  hits: number;
}

class AnalyticsCache {
  private caches: Map<string, LRUCache<string, CachedData<any>>> = new Map();

  /**
   * Create a cache for a specific analytics type
   */
  createCache(name: string, options: CacheOptions) {
    const cache = new LRUCache<string, CachedData<any>>({
      max: options.max,
      ttl: options.ttl,
      updateAgeOnGet: true,
      updateAgeOnHas: false,
    });

    this.caches.set(name, cache);
    return cache;
  }

  /**
   * Get cached data
   */
  get<T>(cacheName: string, key: string): T | null {
    const cache = this.caches.get(cacheName);
    if (!cache) return null;

    const cached = cache.get(key);
    if (!cached) return null;

    // Update hit count
    cached.hits++;
    cache.set(key, cached);

    return cached.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(cacheName: string, key: string, data: T): void {
    let cache = this.caches.get(cacheName);

    if (!cache) {
      // Create default cache if doesn't exist
      cache = this.createCache(cacheName, {
        ttl: 5 * 60 * 1000, // 5 minutes default
        max: 100,
      });
    }

    cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Check if data is cached and fresh
   */
  has(cacheName: string, key: string): boolean {
    const cache = this.caches.get(cacheName);
    if (!cache) return false;
    return cache.has(key);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(cacheName: string, key: string): void {
    const cache = this.caches.get(cacheName);
    if (cache) {
      cache.delete(key);
    }
  }

  /**
   * Invalidate all entries in a cache
   */
  invalidateCache(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    if (cache) {
      cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(cacheName: string) {
    const cache = this.caches.get(cacheName);
    if (!cache) return null;

    const entries = Array.from(cache.entries());
    const totalHits = entries.reduce((sum, [_, value]) => sum + value.hits, 0);
    const avgHits = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: cache.size,
      maxSize: cache.max,
      hits: totalHits,
      avgHits,
      oldestEntry:
        entries.length > 0
          ? Math.min(...entries.map(([_, v]) => v.timestamp))
          : null,
      newestEntry:
        entries.length > 0
          ? Math.max(...entries.map(([_, v]) => v.timestamp))
          : null,
    };
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.caches.forEach((cache) => cache.clear());
  }
}

// Create singleton instance
export const analyticsCache = new AnalyticsCache();

// Initialize default caches
analyticsCache.createCache('dashboard', {
  ttl: 30 * 1000, // 30 seconds for dashboard data
  max: 50,
});

analyticsCache.createCache('journey-details', {
  ttl: 60 * 1000, // 1 minute for journey details
  max: 100,
});

analyticsCache.createCache('performance-history', {
  ttl: 5 * 60 * 1000, // 5 minutes for historical data
  max: 200,
});

analyticsCache.createCache('funnel-analysis', {
  ttl: 2 * 60 * 1000, // 2 minutes for funnel data
  max: 50,
});

// Helper function for cache key generation
export function getCacheKey(
  ...parts: (string | number | undefined | null)[]
): string {
  return parts.filter(Boolean).join(':');
}

// React hook for cached analytics data
import { useEffect, useState } from 'react';

export function useCachedAnalytics<T>(
  cacheName: string,
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    refreshInterval?: number;
    staleWhileRevalidate?: boolean;
  },
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let mounted = true;

    const fetchData = async () => {
      try {
        // Check cache first
        const cached = analyticsCache.get<T>(cacheName, key);

        if (cached && !isStale) {
          if (mounted) {
            setData(cached);
            setLoading(false);
          }

          // If stale while revalidate, fetch in background
          if (options?.staleWhileRevalidate) {
            fetcher()
              .then((freshData) => {
                if (mounted) {
                  analyticsCache.set(cacheName, key, freshData);
                  setData(freshData);
                  setIsStale(false);
                }
              })
              .catch(console.error);
          }

          return;
        }

        // Fetch fresh data
        setLoading(true);
        const freshData = await fetcher();

        if (mounted) {
          analyticsCache.set(cacheName, key, freshData);
          setData(freshData);
          setError(null);
          setIsStale(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);

          // Try to use stale data if available
          const staleData = analyticsCache.get<T>(cacheName, key);
          if (staleData) {
            setData(staleData);
            setIsStale(true);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Set up refresh interval if specified
    if (options?.refreshInterval) {
      intervalId = setInterval(fetchData, options.refreshInterval);
    }

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [cacheName, key, options?.refreshInterval, options?.staleWhileRevalidate]);

  const refresh = () => {
    analyticsCache.invalidate(cacheName, key);
    setIsStale(true);
  };

  return { data, loading, error, isStale, refresh };
}

// Performance monitoring wrapper
export function withCacheMetrics<T extends (...args: any[]) => any>(
  cacheName: string,
  fn: T,
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const cacheKey = getCacheKey(...args.map(String));

    // Check cache
    const cached = analyticsCache.get(cacheName, cacheKey);
    if (cached) {
      console.log(
        `[Cache HIT] ${cacheName}:${cacheKey} (${Date.now() - startTime}ms)`,
      );
      return cached;
    }

    console.log(`[Cache MISS] ${cacheName}:${cacheKey}`);

    // Execute function
    const result = await fn(...args);

    // Cache result
    analyticsCache.set(cacheName, cacheKey, result);

    console.log(
      `[Cache SET] ${cacheName}:${cacheKey} (${Date.now() - startTime}ms)`,
    );

    return result;
  }) as T;
}
