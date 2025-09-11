/**
 * WS-114: Marketplace Search Performance Optimization
 *
 * Performance optimization utilities including caching strategies,
 * query optimization, result preloading, and search analytics.
 *
 * Team B - Batch 9 - Round 1
 */

import { LRUCache } from 'lru-cache';

// =====================================================================================
// INTERFACES
// =====================================================================================

interface CachedSearchResult {
  results: any;
  timestamp: number;
  expiresAt: number;
}

interface SearchAnalytics {
  query: string;
  resultCount: number;
  responseTime: number;
  cacheHit: boolean;
  timestamp: number;
  filters: any;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  cacheHitRate: number;
  totalQueries: number;
  popularQueries: Array<{ query: string; count: number }>;
}

// =====================================================================================
// CACHE CONFIGURATION
// =====================================================================================

// Search results cache - stores search results with TTL
const searchCache = new LRUCache<string, CachedSearchResult>({
  max: 1000, // Maximum number of cached searches
  ttl: 1000 * 60 * 5, // 5 minutes TTL
  updateAgeOnGet: true,
});

// Facets cache - stores facet data with longer TTL
const facetsCache = new LRUCache<string, CachedSearchResult>({
  max: 200, // Fewer facet combinations
  ttl: 1000 * 60 * 15, // 15 minutes TTL
  updateAgeOnGet: true,
});

// Suggestions cache - stores autocomplete suggestions
const suggestionsCache = new LRUCache<string, CachedSearchResult>({
  max: 500,
  ttl: 1000 * 60 * 10, // 10 minutes TTL
  updateAgeOnGet: true,
});

// Analytics storage (in production, this would be replaced with proper analytics service)
const searchAnalytics: SearchAnalytics[] = [];

// =====================================================================================
// CACHE KEY GENERATION
// =====================================================================================

export function generateSearchCacheKey(
  query: string,
  filters: any,
  sortBy: string,
  sortDirection: string,
  page: number,
  limit: number,
): string {
  const filterHash = JSON.stringify(filters);
  return `search:${query}:${filterHash}:${sortBy}:${sortDirection}:${page}:${limit}`;
}

export function generateFacetsCacheKey(query: string, filters: any): string {
  const filterHash = JSON.stringify(filters);
  return `facets:${query}:${filterHash}`;
}

export function generateSuggestionsCacheKey(
  query: string,
  limit: number,
): string {
  return `suggestions:${query}:${limit}`;
}

// =====================================================================================
// CACHE OPERATIONS
// =====================================================================================

export class SearchCache {
  static get(key: string): any | null {
    const cached = searchCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      searchCache.delete(key);
      return null;
    }

    return cached.results;
  }

  static set(key: string, results: any, ttlMs: number = 1000 * 60 * 5): void {
    const cached: CachedSearchResult = {
      results,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    searchCache.set(key, cached);
  }

  static clear(): void {
    searchCache.clear();
  }

  static getStats(): any {
    return {
      size: searchCache.size,
      max: searchCache.max,
      hitRate: this.calculateHitRate(),
    };
  }

  private static calculateHitRate(): number {
    const recent = searchAnalytics.slice(-1000); // Last 1000 searches
    if (recent.length === 0) return 0;

    const hits = recent.filter((a) => a.cacheHit).length;
    return hits / recent.length;
  }
}

export class FacetsCache {
  static get(key: string): any | null {
    const cached = facetsCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      facetsCache.delete(key);
      return null;
    }

    return cached.results;
  }

  static set(key: string, results: any, ttlMs: number = 1000 * 60 * 15): void {
    const cached: CachedSearchResult = {
      results,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    facetsCache.set(key, cached);
  }

  static clear(): void {
    facetsCache.clear();
  }
}

export class SuggestionsCache {
  static get(key: string): any | null {
    const cached = suggestionsCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      suggestionsCache.delete(key);
      return null;
    }

    return cached.results;
  }

  static set(key: string, results: any, ttlMs: number = 1000 * 60 * 10): void {
    const cached: CachedSearchResult = {
      results,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    suggestionsCache.set(key, cached);
  }

  static clear(): void {
    suggestionsCache.clear();
  }
}

// =====================================================================================
// PERFORMANCE MONITORING
// =====================================================================================

export class SearchPerformanceMonitor {
  static recordSearch(
    query: string,
    resultCount: number,
    responseTime: number,
    cacheHit: boolean,
    filters: any = {},
  ): void {
    const analytics: SearchAnalytics = {
      query,
      resultCount,
      responseTime,
      cacheHit,
      timestamp: Date.now(),
      filters,
    };

    searchAnalytics.push(analytics);

    // Keep only last 10,000 entries to prevent memory issues
    if (searchAnalytics.length > 10000) {
      searchAnalytics.splice(0, searchAnalytics.length - 10000);
    }

    // Log slow queries for debugging
    if (responseTime > 2000 && !cacheHit) {
      console.warn('Slow search query:', { query, responseTime, filters });
    }
  }

  static getMetrics(timeRangeMs: number = 1000 * 60 * 60): PerformanceMetrics {
    const cutoff = Date.now() - timeRangeMs;
    const recentSearches = searchAnalytics.filter((a) => a.timestamp > cutoff);

    if (recentSearches.length === 0) {
      return {
        averageResponseTime: 0,
        cacheHitRate: 0,
        totalQueries: 0,
        popularQueries: [],
      };
    }

    const totalResponseTime = recentSearches.reduce(
      (sum, a) => sum + a.responseTime,
      0,
    );
    const cacheHits = recentSearches.filter((a) => a.cacheHit).length;

    // Calculate popular queries
    const queryFrequency: { [key: string]: number } = {};
    recentSearches.forEach((a) => {
      if (a.query && a.query.trim()) {
        queryFrequency[a.query] = (queryFrequency[a.query] || 0) + 1;
      }
    });

    const popularQueries = Object.entries(queryFrequency)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      averageResponseTime: totalResponseTime / recentSearches.length,
      cacheHitRate: cacheHits / recentSearches.length,
      totalQueries: recentSearches.length,
      popularQueries,
    };
  }

  static clearAnalytics(): void {
    searchAnalytics.length = 0;
  }
}

// =====================================================================================
// QUERY OPTIMIZATION
// =====================================================================================

export class QueryOptimizer {
  // Optimize search query by removing stop words, normalizing, etc.
  static optimizeQuery(query: string): string {
    if (!query || typeof query !== 'string') return '';

    // Remove extra whitespace
    let optimized = query.trim().replace(/\s+/g, ' ');

    // Remove common stop words that don't add search value
    const stopWords = [
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ];
    const words = optimized.toLowerCase().split(' ');
    const filteredWords = words.filter(
      (word) => !stopWords.includes(word) && word.length > 1,
    );

    // If we filtered out too many words, keep original
    if (filteredWords.length === 0) {
      return optimized;
    }

    optimized = filteredWords.join(' ');

    // Limit query length to prevent performance issues
    if (optimized.length > 200) {
      optimized = optimized.substring(0, 200).trim();
    }

    return optimized;
  }

  // Generate search suggestions based on query
  static generateSearchSuggestions(query: string): string[] {
    const suggestions: string[] = [];

    if (query.length < 3) return suggestions;

    // Add exact query
    suggestions.push(query);

    // Add query variations
    const words = query.toLowerCase().split(' ');

    // Single word variations
    if (words.length === 1) {
      const word = words[0];
      suggestions.push(`${word} template`);
      suggestions.push(`${word} wedding`);
      suggestions.push(`${word} form`);
    }

    // Multi-word variations
    if (words.length > 1) {
      // Try removing last word
      suggestions.push(words.slice(0, -1).join(' '));

      // Try different combinations
      if (words.length === 2) {
        suggestions.push(words[1]);
        suggestions.push(words[0]);
      }
    }

    return [...new Set(suggestions)].slice(0, 5);
  }

  // Optimize filter combinations for better performance
  static optimizeFilters(filters: any): any {
    const optimized = { ...filters };

    // Remove empty arrays and undefined values
    Object.keys(optimized).forEach((key) => {
      const value = optimized[key];
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete optimized[key];
      }
    });

    // Optimize price ranges
    if (optimized.priceMin !== undefined && optimized.priceMax !== undefined) {
      if (optimized.priceMin >= optimized.priceMax) {
        delete optimized.priceMax;
      }
      if (optimized.priceMin <= 0) {
        delete optimized.priceMin;
      }
    }

    // Optimize rating filter
    if (optimized.ratingMin !== undefined) {
      if (optimized.ratingMin <= 0) {
        delete optimized.ratingMin;
      }
      if (optimized.ratingMin > 5) {
        optimized.ratingMin = 5;
      }
    }

    return optimized;
  }
}

// =====================================================================================
// PRELOADING STRATEGIES
// =====================================================================================

export class SearchPreloader {
  // Preload popular searches and cache them
  static async preloadPopularSearches(): Promise<void> {
    const popularQueries = [
      'wedding photography',
      'catering forms',
      'venue contracts',
      'planning templates',
      'luxury wedding',
      'budget wedding',
      'destination wedding',
    ];

    for (const query of popularQueries) {
      try {
        // Preload search results for popular queries
        const cacheKey = generateSearchCacheKey(
          query,
          {},
          'relevance',
          'DESC',
          1,
          24,
        );

        if (!SearchCache.get(cacheKey)) {
          // In a real implementation, this would make an actual API call
          console.log(`Preloading search results for: ${query}`);
          // Simulate API call delay
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Failed to preload search for "${query}":`, error);
      }
    }
  }

  // Preload facets for common filter combinations
  static async preloadCommonFacets(): Promise<void> {
    const commonFilterCombinations = [
      {},
      { category: 'photography' },
      { category: 'catering' },
      { category: 'venue' },
      { tier: 'professional' },
      { priceMin: 0, priceMax: 5000 },
    ];

    for (const filters of commonFilterCombinations) {
      try {
        const cacheKey = generateFacetsCacheKey('', filters);

        if (!FacetsCache.get(cacheKey)) {
          console.log('Preloading facets for filters:', filters);
          // In a real implementation, this would make an actual API call
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error('Failed to preload facets:', error);
      }
    }
  }

  // Initialize preloading on app startup
  static async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.preloadPopularSearches(),
        this.preloadCommonFacets(),
      ]);

      console.log('Search preloading completed');
    } catch (error) {
      console.error('Search preloading failed:', error);
    }
  }
}

// =====================================================================================
// CACHE WARMING AND MAINTENANCE
// =====================================================================================

export class CacheMaintenance {
  // Warm cache with fresh data
  static async warmCache(): Promise<void> {
    console.log('Warming search caches...');

    try {
      await SearchPreloader.initialize();
      console.log('Cache warming completed');
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }

  // Clean expired cache entries
  static cleanExpiredEntries(): void {
    // LRU cache automatically handles expiration, but we can force cleanup
    const now = Date.now();
    let cleanedCount = 0;

    // The LRU cache handles this automatically, but we can track it
    console.log(`Cleaned ${cleanedCount} expired cache entries`);
  }

  // Get cache statistics for monitoring
  static getCacheStatistics(): any {
    return {
      searchCache: SearchCache.getStats(),
      facetsCache: {
        size: facetsCache.size,
        max: facetsCache.max,
      },
      suggestionsCache: {
        size: suggestionsCache.size,
        max: suggestionsCache.max,
      },
      performance: SearchPerformanceMonitor.getMetrics(),
    };
  }

  // Schedule regular cache maintenance
  static scheduleMaintenanceTasks(): void {
    // Clean expired entries every 10 minutes
    setInterval(
      () => {
        this.cleanExpiredEntries();
      },
      10 * 60 * 1000,
    );

    // Warm cache every hour
    setInterval(
      () => {
        this.warmCache();
      },
      60 * 60 * 1000,
    );

    console.log('Cache maintenance tasks scheduled');
  }
}

// =====================================================================================
// EXPORTS
// =====================================================================================

export {
  SearchCache,
  FacetsCache,
  SuggestionsCache,
  SearchPerformanceMonitor,
  QueryOptimizer,
  SearchPreloader,
  CacheMaintenance,
};
