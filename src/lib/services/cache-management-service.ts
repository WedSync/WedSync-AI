'use client';

// =====================================================
// CACHE MANAGEMENT SERVICE
// Intelligent cache size monitoring and cleanup for PWA
// =====================================================

export interface CacheInfo {
  name: string;
  size: number;
  entryCount: number;
  lastAccessed: string;
  hitRatio: number;
  totalRequests: number;
  cacheHits: number;
}

export interface StorageQuota {
  usage: number;
  quota: number;
  usagePercentage: number;
  available: number;
}

export interface CacheStats {
  totalCaches: number;
  totalSize: number;
  totalEntries: number;
  lastCleanup: string | null;
  quotaInfo: StorageQuota;
  caches: CacheInfo[];
  recommendations: string[];
}

export interface CacheConfig {
  maxTotalSize: number; // Max total cache size in bytes (50MB default)
  maxCacheAge: number; // Max age for cache entries in ms (7 days default)
  cleanupInterval: number; // Cleanup interval in ms (1 hour default)
  criticalCacheNames: string[]; // Caches that should not be auto-cleaned
  performanceTargetMs: number; // Target cache operation time (100ms default)
}

class CacheManagementService {
  private config: CacheConfig = {
    maxTotalSize: 50 * 1024 * 1024, // 50MB
    maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    criticalCacheNames: [
      'critical-wedding-data',
      'wedding-day-cache-v1',
      'timeline-api-v1',
    ],
    performanceTargetMs: 100,
  };

  private cleanupTimer: NodeJS.Timeout | null = null;
  private performanceMetrics: Map<
    string,
    { accessTime: number; hits: number; misses: number }
  > = new Map();

  constructor() {
    this.startAutoCleanup();
    this.setupPerformanceMonitoring();
  }

  // =====================================================
  // STORAGE QUOTA MANAGEMENT
  // =====================================================

  public async getStorageQuota(): Promise<StorageQuota> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();

        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const usagePercentage = quota > 0 ? (usage / quota) * 100 : 0;
        const available = quota - usage;

        return {
          usage,
          quota,
          usagePercentage,
          available,
        };
      }

      // Fallback for browsers without Storage API
      return {
        usage: 0,
        quota: 0,
        usagePercentage: 0,
        available: 0,
      };
    } catch (error) {
      console.error('[Cache Management] Failed to get storage quota:', error);
      return { usage: 0, quota: 0, usagePercentage: 0, available: 0 };
    }
  }

  // =====================================================
  // CACHE ANALYSIS
  // =====================================================

  public async analyzeCaches(): Promise<CacheStats> {
    try {
      const cacheNames = await caches.keys();
      const cacheInfoPromises = cacheNames.map((name) =>
        this.analyzeSingleCache(name),
      );
      const cacheInfos = await Promise.all(cacheInfoPromises);

      const quotaInfo = await this.getStorageQuota();

      const totalSize = cacheInfos.reduce((sum, info) => sum + info.size, 0);
      const totalEntries = cacheInfos.reduce(
        (sum, info) => sum + info.entryCount,
        0,
      );

      const recommendations = this.generateRecommendations(
        cacheInfos,
        quotaInfo,
      );

      return {
        totalCaches: cacheNames.length,
        totalSize,
        totalEntries,
        lastCleanup: localStorage.getItem('last-cache-cleanup'),
        quotaInfo,
        caches: cacheInfos,
        recommendations,
      };
    } catch (error) {
      console.error('[Cache Management] Failed to analyze caches:', error);
      throw error;
    }
  }

  private async analyzeSingleCache(cacheName: string): Promise<CacheInfo> {
    try {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      let totalSize = 0;
      let lastAccessed = new Date(0).toISOString();

      // Sample a few entries to estimate size (for performance)
      const sampleSize = Math.min(10, requests.length);
      const sampleRequests = requests.slice(0, sampleSize);

      for (const request of sampleRequests) {
        try {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;

            // Check last modified header
            const lastModified = response.headers.get('last-modified');
            if (lastModified) {
              const modDate = new Date(lastModified).toISOString();
              if (modDate > lastAccessed) {
                lastAccessed = modDate;
              }
            }
          }
        } catch (error) {
          // Skip problematic entries
          console.warn(
            `[Cache Management] Failed to analyze entry in ${cacheName}:`,
            error,
          );
        }
      }

      // Estimate total size based on sample
      const estimatedSize =
        requests.length > 0 ? (totalSize / sampleSize) * requests.length : 0;

      // Get performance metrics
      const metrics = this.performanceMetrics.get(cacheName) || {
        accessTime: 0,
        hits: 0,
        misses: 0,
      };
      const hitRatio =
        metrics.hits + metrics.misses > 0
          ? metrics.hits / (metrics.hits + metrics.misses)
          : 0;

      return {
        name: cacheName,
        size: Math.round(estimatedSize),
        entryCount: requests.length,
        lastAccessed: lastAccessed || new Date().toISOString(),
        hitRatio,
        totalRequests: metrics.hits + metrics.misses,
        cacheHits: metrics.hits,
      };
    } catch (error) {
      console.error(
        `[Cache Management] Failed to analyze cache ${cacheName}:`,
        error,
      );
      return {
        name: cacheName,
        size: 0,
        entryCount: 0,
        lastAccessed: new Date().toISOString(),
        hitRatio: 0,
        totalRequests: 0,
        cacheHits: 0,
      };
    }
  }

  // =====================================================
  // INTELLIGENT CLEANUP
  // =====================================================

  public async performIntelligentCleanup(): Promise<{
    cleaned: number;
    freed: number;
  }> {
    try {
      console.log('[Cache Management] Starting intelligent cleanup...');
      const startTime = performance.now();

      const stats = await this.analyzeCaches();
      let totalFreed = 0;
      let totalCleaned = 0;

      // Skip if under size limit
      if (stats.totalSize < this.config.maxTotalSize * 0.8) {
        console.log(
          '[Cache Management] Cache size within limits, skipping cleanup',
        );
        return { cleaned: 0, freed: 0 };
      }

      // Sort caches by priority (low hit ratio, large size, old age)
      const sortedCaches = stats.caches
        .filter((cache) => !this.config.criticalCacheNames.includes(cache.name))
        .sort((a, b) => {
          const aScore = this.calculateCleanupScore(a);
          const bScore = this.calculateCleanupScore(b);
          return bScore - aScore; // Higher score = more urgent to clean
        });

      for (const cacheInfo of sortedCaches) {
        if (stats.totalSize - totalFreed < this.config.maxTotalSize * 0.7) {
          break; // Reached target size
        }

        const freed = await this.cleanupCache(cacheInfo.name, cacheInfo);
        totalFreed += freed;
        totalCleaned += 1;

        console.log(
          `[Cache Management] Cleaned ${cacheInfo.name}, freed ${Math.round(freed / 1024)}KB`,
        );
      }

      // Update last cleanup time
      localStorage.setItem('last-cache-cleanup', new Date().toISOString());

      const endTime = performance.now();
      console.log(
        `[Cache Management] Cleanup completed in ${Math.round(endTime - startTime)}ms, freed ${Math.round(totalFreed / 1024)}KB from ${totalCleaned} caches`,
      );

      return { cleaned: totalCleaned, freed: totalFreed };
    } catch (error) {
      console.error('[Cache Management] Intelligent cleanup failed:', error);
      return { cleaned: 0, freed: 0 };
    }
  }

  private calculateCleanupScore(cacheInfo: CacheInfo): number {
    const sizeWeight = 0.3;
    const ageWeight = 0.3;
    const hitRatioWeight = 0.4;

    // Normalize factors (0-1 scale)
    const sizeScore = Math.min(cacheInfo.size / (10 * 1024 * 1024), 1); // Up to 10MB
    const ageScore = Math.min(
      (Date.now() - new Date(cacheInfo.lastAccessed).getTime()) /
        this.config.maxCacheAge,
      1,
    );
    const hitRatioScore = 1 - cacheInfo.hitRatio; // Lower hit ratio = higher cleanup score

    return (
      sizeScore * sizeWeight +
      ageScore * ageWeight +
      hitRatioScore * hitRatioWeight
    );
  }

  private async cleanupCache(
    cacheName: string,
    cacheInfo: CacheInfo,
  ): Promise<number> {
    try {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();

      let freedBytes = 0;
      const cutoffTime = Date.now() - this.config.maxCacheAge;

      // Remove old entries
      for (const request of requests) {
        try {
          const response = await cache.match(request);
          if (response) {
            const lastModified = response.headers.get('last-modified');
            const date = lastModified
              ? new Date(lastModified)
              : new Date(response.headers.get('date') || 0);

            if (date.getTime() < cutoffTime) {
              const blob = await response.blob();
              freedBytes += blob.size;
              await cache.delete(request);
            }
          }
        } catch (error) {
          // Remove problematic entries
          await cache.delete(request);
        }
      }

      // If still too large, remove entries with lowest access frequency
      const remainingRequests = await cache.keys();
      if (remainingRequests.length > 50) {
        // Arbitrary limit
        const toRemove = remainingRequests.slice(50); // Remove oldest

        for (const request of toRemove) {
          try {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              freedBytes += blob.size;
            }
            await cache.delete(request);
          } catch (error) {
            // Continue with cleanup
          }
        }
      }

      return freedBytes;
    } catch (error) {
      console.error(
        `[Cache Management] Failed to cleanup cache ${cacheName}:`,
        error,
      );
      return 0;
    }
  }

  // =====================================================
  // PERFORMANCE MONITORING
  // =====================================================

  private setupPerformanceMonitoring(): void {
    // Monitor cache performance through service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;

        if (type === 'CACHE_PERFORMANCE') {
          this.recordCachePerformance(
            data.cacheName,
            data.accessTime,
            data.hit,
          );
        }
      });
    }
  }

  private recordCachePerformance(
    cacheName: string,
    accessTime: number,
    hit: boolean,
  ): void {
    const existing = this.performanceMetrics.get(cacheName) || {
      accessTime: 0,
      hits: 0,
      misses: 0,
    };

    // Update moving average for access time
    existing.accessTime = existing.accessTime * 0.9 + accessTime * 0.1;

    if (hit) {
      existing.hits++;
    } else {
      existing.misses++;
    }

    this.performanceMetrics.set(cacheName, existing);

    // Log performance issues
    if (accessTime > this.config.performanceTargetMs) {
      console.warn(
        `[Cache Management] Slow cache access in ${cacheName}: ${Math.round(accessTime)}ms`,
      );
    }
  }

  // =====================================================
  // RECOMMENDATIONS ENGINE
  // =====================================================

  private generateRecommendations(
    caches: CacheInfo[],
    quota: StorageQuota,
  ): string[] {
    const recommendations: string[] = [];

    // Storage quota recommendations
    if (quota.usagePercentage > 80) {
      recommendations.push(
        `Storage usage is ${Math.round(quota.usagePercentage)}%. Consider clearing unused data.`,
      );
    } else if (quota.usagePercentage > 50) {
      recommendations.push(
        `Storage usage is ${Math.round(quota.usagePercentage)}%. Monitor cache growth.`,
      );
    }

    // Cache-specific recommendations
    const totalSize = caches.reduce((sum, cache) => sum + cache.size, 0);
    if (totalSize > this.config.maxTotalSize) {
      recommendations.push(
        'Total cache size exceeds limit. Automatic cleanup will be triggered.',
      );
    }

    // Performance recommendations
    const slowCaches = caches.filter((cache) => {
      const metrics = this.performanceMetrics.get(cache.name);
      return metrics && metrics.accessTime > this.config.performanceTargetMs;
    });

    if (slowCaches.length > 0) {
      recommendations.push(
        `${slowCaches.length} caches have slow access times. Consider optimization.`,
      );
    }

    // Hit ratio recommendations
    const lowHitRatioCaches = caches.filter(
      (cache) => cache.hitRatio < 0.3 && cache.totalRequests > 10,
    );
    if (lowHitRatioCaches.length > 0) {
      recommendations.push(
        `${lowHitRatioCaches.length} caches have low hit ratios. Review caching strategy.`,
      );
    }

    // Unused cache recommendations
    const unusedCaches = caches.filter((cache) => cache.totalRequests === 0);
    if (unusedCaches.length > 0) {
      recommendations.push(
        `${unusedCaches.length} caches are unused and can be safely removed.`,
      );
    }

    return recommendations;
  }

  // =====================================================
  // AUTO-CLEANUP SYSTEM
  // =====================================================

  private startAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      try {
        const stats = await this.analyzeCaches();

        // Trigger cleanup if needed
        if (
          stats.totalSize > this.config.maxTotalSize * 0.8 ||
          stats.quotaInfo.usagePercentage > 75
        ) {
          console.log('[Cache Management] Auto-cleanup triggered');
          await this.performIntelligentCleanup();
        }
      } catch (error) {
        console.error('[Cache Management] Auto-cleanup failed:', error);
      }
    }, this.config.cleanupInterval);
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  public async clearSpecificCache(cacheName: string): Promise<boolean> {
    try {
      const deleted = await caches.delete(cacheName);
      console.log(
        `[Cache Management] ${deleted ? 'Deleted' : 'Failed to delete'} cache: ${cacheName}`,
      );
      return deleted;
    } catch (error) {
      console.error(
        `[Cache Management] Failed to clear cache ${cacheName}:`,
        error,
      );
      return false;
    }
  }

  public async clearAllCaches(): Promise<number> {
    try {
      const cacheNames = await caches.keys();
      const deletePromises = cacheNames.map((name) => caches.delete(name));
      const results = await Promise.all(deletePromises);

      const deletedCount = results.filter((result) => result).length;
      console.log(
        `[Cache Management] Cleared ${deletedCount}/${cacheNames.length} caches`,
      );

      return deletedCount;
    } catch (error) {
      console.error('[Cache Management] Failed to clear all caches:', error);
      return 0;
    }
  }

  public updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart auto-cleanup with new interval
    if (newConfig.cleanupInterval) {
      this.startAutoCleanup();
    }

    console.log('[Cache Management] Configuration updated:', this.config);
  }

  public getCachePerformanceMetrics(): Array<{
    name: string;
    accessTime: number;
    hitRatio: number;
    totalRequests: number;
  }> {
    return Array.from(this.performanceMetrics.entries()).map(
      ([name, metrics]) => ({
        name,
        accessTime: metrics.accessTime,
        hitRatio: metrics.hits / (metrics.hits + metrics.misses),
        totalRequests: metrics.hits + metrics.misses,
      }),
    );
  }

  // =====================================================
  // WEDDING DAY OPTIMIZATION
  // =====================================================

  public async optimizeForWeddingDay(weddingId: string): Promise<void> {
    console.log(
      `[Cache Management] Optimizing caches for wedding day: ${weddingId}`,
    );

    try {
      // Clean up non-critical caches to make room
      const stats = await this.analyzeCaches();

      for (const cache of stats.caches) {
        if (
          !this.config.criticalCacheNames.includes(cache.name) &&
          cache.hitRatio < 0.2
        ) {
          await this.clearSpecificCache(cache.name);
          console.log(
            `[Cache Management] Cleared low-usage cache: ${cache.name}`,
          );
        }
      }

      // Update config for wedding day performance
      this.updateConfig({
        performanceTargetMs: 50, // Even faster for wedding day
        maxTotalSize: this.config.maxTotalSize * 1.2, // Allow 20% more for wedding day
        cleanupInterval: 10 * 60 * 1000, // More frequent cleanup
      });
    } catch (error) {
      console.error(
        '[Cache Management] Wedding day optimization failed:',
        error,
      );
    }
  }

  public async restoreNormalOperation(): Promise<void> {
    console.log('[Cache Management] Restoring normal cache operation');

    // Reset to default config
    this.updateConfig({
      performanceTargetMs: 100,
      maxTotalSize: 50 * 1024 * 1024,
      cleanupInterval: 60 * 60 * 1000,
    });
  }

  // =====================================================
  // EMERGENCY CLEANUP
  // =====================================================

  public async emergencyCleanup(): Promise<{
    success: boolean;
    freed: number;
  }> {
    try {
      console.log('[Cache Management] Emergency cleanup initiated');

      // Clear all non-critical caches
      const cacheNames = await caches.keys();
      let totalFreed = 0;

      for (const cacheName of cacheNames) {
        if (!this.config.criticalCacheNames.includes(cacheName)) {
          const stats = await this.analyzeSingleCache(cacheName);
          totalFreed += stats.size;
          await this.clearSpecificCache(cacheName);
        }
      }

      console.log(
        `[Cache Management] Emergency cleanup completed, freed ${Math.round(totalFreed / 1024)}KB`,
      );

      return { success: true, freed: totalFreed };
    } catch (error) {
      console.error('[Cache Management] Emergency cleanup failed:', error);
      return { success: false, freed: 0 };
    }
  }
}

// Singleton instance
export const cacheManager = new CacheManagementService();

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).cacheManager = cacheManager;
}
