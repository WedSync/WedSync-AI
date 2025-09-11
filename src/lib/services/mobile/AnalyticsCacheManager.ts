/**
 * AnalyticsCacheManager - Smart caching for analytics data with performance optimization
 *
 * Features:
 * - Intelligent cache partitioning by data type and usage patterns
 * - Memory-aware cache management with automatic cleanup
 * - Compression for large datasets
 * - Cache warming strategies for critical metrics
 * - Network-aware cache updates
 * - Performance monitoring and optimization
 * - LRU eviction with priority-based retention
 * - Background cache refresh with service worker coordination
 */

import {
  CacheEntry,
  CacheStats,
  VendorMetrics,
  TimeRange,
  MobilePerformanceMetrics,
} from '@/types/mobile-analytics';

interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of cache entries
  defaultTTL: number; // Default TTL in milliseconds
  compressionThreshold: number; // Compress data larger than this
  memoryLimit: number; // Memory usage limit in bytes
  cleanupInterval: number; // Cleanup interval in milliseconds
  prefetchEnabled: boolean; // Enable prefetching
  backgroundRefresh: boolean; // Enable background refresh
}

interface CachePartition {
  name: string;
  pattern: RegExp;
  priority: 'critical' | 'high' | 'medium' | 'low';
  ttl: number;
  maxSize: number;
  compression: boolean;
}

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  evictionRate: number;
  compressionRatio: number;
  averageAccessTime: number;
  memoryEfficiency: number;
}

interface PrefetchRule {
  pattern: RegExp;
  condition: () => boolean;
  priority: number;
  delay: number;
}

export class AnalyticsCacheManager {
  private config: CacheConfig;
  private cache: Map<string, CacheEntry>;
  private accessTimes: Map<string, number>;
  private compressionWorker: Worker | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private networkInfo: any = null;
  private metrics: CacheMetrics;

  // Cache partitions for different data types
  private partitions: CachePartition[] = [
    {
      name: 'realtime-metrics',
      pattern: /\/api\/analytics\/(realtime|live)/,
      priority: 'critical',
      ttl: 30 * 1000, // 30 seconds
      maxSize: 5 * 1024 * 1024, // 5MB
      compression: false,
    },
    {
      name: 'vendor-performance',
      pattern: /\/api\/analytics\/vendors\/[^/]+\/performance/,
      priority: 'high',
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 10 * 1024 * 1024, // 10MB
      compression: true,
    },
    {
      name: 'historical-data',
      pattern: /\/api\/analytics\/(historical|trends)/,
      priority: 'medium',
      ttl: 30 * 60 * 1000, // 30 minutes
      maxSize: 20 * 1024 * 1024, // 20MB
      compression: true,
    },
    {
      name: 'vendor-lists',
      pattern: /\/api\/analytics\/vendors$/,
      priority: 'high',
      ttl: 10 * 60 * 1000, // 10 minutes
      maxSize: 2 * 1024 * 1024, // 2MB
      compression: false,
    },
    {
      name: 'static-assets',
      pattern: /\.(js|css|png|jpg|svg)$/,
      priority: 'medium',
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 50 * 1024 * 1024, // 50MB
      compression: true,
    },
  ];

  // Prefetch rules for proactive caching
  private prefetchRules: PrefetchRule[] = [
    {
      pattern: /\/api\/analytics\/vendors$/,
      condition: () => this.isBusinessHours() && this.hasGoodConnection(),
      priority: 1,
      delay: 0,
    },
    {
      pattern: /\/api\/analytics\/vendors\/[^/]+\/performance/,
      condition: () => this.hasGoodConnection(),
      priority: 2,
      delay: 1000,
    },
    {
      pattern: /\/api\/analytics\/historical/,
      condition: () => this.hasGoodConnection() && !this.isLowBattery(),
      priority: 3,
      delay: 5000,
    },
  ];

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 100 * 1024 * 1024, // 100MB
      maxEntries: 1000,
      defaultTTL: 15 * 60 * 1000, // 15 minutes
      compressionThreshold: 10 * 1024, // 10KB
      memoryLimit: 50 * 1024 * 1024, // 50MB
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      prefetchEnabled: true,
      backgroundRefresh: true,
      ...config,
    };

    this.cache = new Map();
    this.accessTimes = new Map();

    this.metrics = {
      hitRate: 0,
      missRate: 0,
      evictionRate: 0,
      compressionRatio: 0,
      averageAccessTime: 0,
      memoryEfficiency: 0,
    };

    this.initialize();
  }

  /**
   * Initialize the cache manager
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize compression worker
      await this.initializeCompression();

      // Set up network monitoring
      this.setupNetworkMonitoring();

      // Set up performance monitoring
      this.setupPerformanceMonitoring();

      // Start cleanup timer
      this.startCleanupTimer();

      // Register service worker message handler
      this.setupServiceWorkerCommunication();

      // Warm cache with critical data
      if (this.config.prefetchEnabled) {
        await this.warmCache();
      }
    } catch (error) {
      console.error('[CacheManager] Initialization failed:', error);
    }
  }

  /**
   * Initialize compression worker
   */
  private async initializeCompression(): Promise<void> {
    if (typeof Worker !== 'undefined') {
      try {
        const workerCode = `
          // Compression worker for large analytics datasets
          const pako = importScripts('https://cdn.jsdelivr.net/npm/pako@2.1.0/dist/pako.min.js');
          
          self.onmessage = function(e) {
            const { action, data, id } = e.data;
            
            try {
              if (action === 'compress') {
                const compressed = pako.gzip(data);
                self.postMessage({ id, action: 'compressed', data: compressed });
              } else if (action === 'decompress') {
                const decompressed = pako.ungzip(data, { to: 'string' });
                self.postMessage({ id, action: 'decompressed', data: decompressed });
              }
            } catch (error) {
              self.postMessage({ id, action: 'error', error: error.message });
            }
          };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.compressionWorker = new Worker(URL.createObjectURL(blob));
      } catch (error) {
        console.warn('[CacheManager] Compression worker not available:', error);
      }
    }
  }

  /**
   * Set up network monitoring
   */
  private setupNetworkMonitoring(): void {
    if ('connection' in navigator) {
      this.networkInfo = (navigator as any).connection;

      this.networkInfo.addEventListener('change', () => {
        this.adjustCacheStrategy();
      });
    }
  }

  /**
   * Set up performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name.includes('/api/analytics/')) {
              this.updatePerformanceMetrics(entry);
            }
          });
        });

        this.performanceObserver.observe({
          entryTypes: ['navigation', 'resource'],
        });
      } catch (error) {
        console.warn(
          '[CacheManager] Performance monitoring not available:',
          error,
        );
      }
    }
  }

  /**
   * Set up service worker communication
   */
  private setupServiceWorkerCommunication(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_ANALYTICS_DATA') {
          this.handleServiceWorkerCache(event.data.payload);
        }
      });
    }
  }

  /**
   * Store data in cache
   */
  async set(
    key: string,
    data: any,
    options?: {
      ttl?: number;
      priority?: CacheEntry['priority'];
      compress?: boolean;
    },
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Find appropriate partition
      const partition = this.getPartitionForKey(key);
      const ttl = options?.ttl || partition?.ttl || this.config.defaultTTL;
      const priority = options?.priority || partition?.priority || 'medium';

      // Serialize data
      const serialized = JSON.stringify(data);
      const size = new Blob([serialized]).size;

      // Check if compression is needed
      const shouldCompress =
        options?.compress !== false &&
        (partition?.compression || size > this.config.compressionThreshold);

      let finalData = serialized;
      let isCompressed = false;

      if (shouldCompress && this.compressionWorker) {
        try {
          finalData = await this.compressData(serialized);
          isCompressed = true;
        } catch (error) {
          console.warn(
            '[CacheManager] Compression failed, storing uncompressed:',
            error,
          );
        }
      }

      // Create cache entry
      const entry: CacheEntry = {
        key,
        data: finalData,
        timestamp: new Date(),
        ttl,
        size: new Blob([finalData]).size,
        priority,
        metadata: {
          compressed: isCompressed,
          originalSize: size,
          partition: partition?.name,
        },
      };

      // Check memory limits before storing
      await this.ensureMemoryLimit(entry.size);

      // Store in cache
      this.cache.set(key, entry);
      this.accessTimes.set(key, Date.now());

      // Update metrics
      this.updateCacheMetrics('set', performance.now() - startTime);
    } catch (error) {
      console.error('[CacheManager] Failed to cache data:', error);
      throw error;
    }
  }

  /**
   * Retrieve data from cache
   */
  async get(key: string): Promise<any | null> {
    const startTime = performance.now();

    try {
      const entry = this.cache.get(key);

      if (!entry) {
        this.updateCacheMetrics('miss', performance.now() - startTime);
        return null;
      }

      // Check if expired
      const now = Date.now();
      if (now - entry.timestamp.getTime() > entry.ttl) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        this.updateCacheMetrics('miss', performance.now() - startTime);
        return null;
      }

      // Update access time for LRU
      this.accessTimes.set(key, now);

      // Decompress if needed
      let data = entry.data;
      if (entry.metadata?.compressed && this.compressionWorker) {
        try {
          data = await this.decompressData(entry.data as string);
        } catch (error) {
          console.warn('[CacheManager] Decompression failed:', error);
          this.cache.delete(key);
          this.accessTimes.delete(key);
          return null;
        }
      }

      // Parse data
      const parsed = JSON.parse(data as string);

      this.updateCacheMetrics('hit', performance.now() - startTime);

      // Trigger background refresh if needed
      if (
        this.config.backgroundRefresh &&
        this.shouldBackgroundRefresh(entry)
      ) {
        this.scheduleBackgroundRefresh(key);
      }

      return parsed;
    } catch (error) {
      console.error('[CacheManager] Failed to retrieve data:', error);
      return null;
    }
  }

  /**
   * Delete data from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessTimes.delete(key);
    }
    return deleted;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const totalEntries = entries.length;

    let memoryUsage = 0;
    if ('memory' in performance) {
      memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    return {
      totalSize,
      totalEntries,
      hitRate: this.metrics.hitRate,
      memoryUsage,
      lastCleanup: new Date(),
    };
  }

  /**
   * Prefetch data based on usage patterns
   */
  async prefetch(urls: string[]): Promise<void> {
    if (!this.config.prefetchEnabled || !this.hasGoodConnection()) {
      return;
    }

    const prefetchPromises = urls.map(async (url) => {
      try {
        // Check if already cached and fresh
        const cached = await this.get(url);
        if (cached) return;

        // Fetch and cache
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          await this.set(url, data);
        }
      } catch (error) {
        console.warn('[CacheManager] Prefetch failed for:', url, error);
      }
    });

    await Promise.allSettled(prefetchPromises);
  }

  /**
   * Warm cache with critical data
   */
  private async warmCache(): Promise<void> {
    const criticalUrls = [
      '/api/analytics/vendors',
      '/api/analytics/realtime/summary',
    ];

    await this.prefetch(criticalUrls);
  }

  /**
   * Compress data using worker
   */
  private async compressData(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.compressionWorker) {
        reject(new Error('Compression worker not available'));
        return;
      }

      const id = Math.random().toString(36).substr(2, 9);

      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker!.removeEventListener('message', handleMessage);

          if (e.data.action === 'compressed') {
            resolve(e.data.data);
          } else {
            reject(new Error(e.data.error || 'Compression failed'));
          }
        }
      };

      this.compressionWorker.addEventListener('message', handleMessage);
      this.compressionWorker.postMessage({ action: 'compress', data, id });

      // Timeout after 5 seconds
      setTimeout(() => {
        this.compressionWorker!.removeEventListener('message', handleMessage);
        reject(new Error('Compression timeout'));
      }, 5000);
    });
  }

  /**
   * Decompress data using worker
   */
  private async decompressData(data: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.compressionWorker) {
        reject(new Error('Compression worker not available'));
        return;
      }

      const id = Math.random().toString(36).substr(2, 9);

      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker!.removeEventListener('message', handleMessage);

          if (e.data.action === 'decompressed') {
            resolve(e.data.data);
          } else {
            reject(new Error(e.data.error || 'Decompression failed'));
          }
        }
      };

      this.compressionWorker.addEventListener('message', handleMessage);
      this.compressionWorker.postMessage({ action: 'decompress', data, id });

      // Timeout after 5 seconds
      setTimeout(() => {
        this.compressionWorker!.removeEventListener('message', handleMessage);
        reject(new Error('Decompression timeout'));
      }, 5000);
    });
  }

  /**
   * Ensure memory limit is not exceeded
   */
  private async ensureMemoryLimit(newEntrySize: number): Promise<void> {
    const stats = this.getStats();

    if (
      stats.totalSize + newEntrySize > this.config.maxSize ||
      stats.totalEntries >= this.config.maxEntries
    ) {
      await this.evictEntries(newEntrySize);
    }
  }

  /**
   * Evict cache entries using LRU with priority
   */
  private async evictEntries(spaceNeeded: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        entry,
        lastAccess: this.accessTimes.get(key) || 0,
      }))
      .sort((a, b) => {
        // Sort by priority first, then by last access time
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.entry.priority];
        const bPriority = priorityOrder[b.entry.priority];

        if (aPriority !== bPriority) {
          return aPriority - bPriority; // Lower priority first
        }

        return a.lastAccess - b.lastAccess; // Older access first
      });

    let freedSpace = 0;
    let evictedCount = 0;

    for (const { key, entry } of entries) {
      if (freedSpace >= spaceNeeded && evictedCount >= 10) {
        break;
      }

      if (entry.priority !== 'critical') {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        freedSpace += entry.size;
        evictedCount++;
      }
    }

    this.updateCacheMetrics('eviction', evictedCount);
  }

  /**
   * Get partition for cache key
   */
  private getPartitionForKey(key: string): CachePartition | undefined {
    return this.partitions.find((partition) => partition.pattern.test(key));
  }

  /**
   * Update cache metrics
   */
  private updateCacheMetrics(
    type: 'hit' | 'miss' | 'set' | 'eviction',
    value: number,
  ): void {
    // Simple moving average implementation
    const alpha = 0.1; // Smoothing factor

    switch (type) {
      case 'hit':
        this.metrics.hitRate = this.metrics.hitRate * (1 - alpha) + alpha;
        this.metrics.averageAccessTime =
          this.metrics.averageAccessTime * (1 - alpha) + value * alpha;
        break;
      case 'miss':
        this.metrics.missRate = this.metrics.missRate * (1 - alpha) + alpha;
        break;
      case 'eviction':
        this.metrics.evictionRate =
          this.metrics.evictionRate * (1 - alpha) + (value > 0 ? alpha : 0);
        break;
    }
  }

  /**
   * Check if should perform background refresh
   */
  private shouldBackgroundRefresh(entry: CacheEntry): boolean {
    if (!this.config.backgroundRefresh) return false;

    const age = Date.now() - entry.timestamp.getTime();
    const refreshThreshold = entry.ttl * 0.8; // Refresh when 80% of TTL elapsed

    return age > refreshThreshold && this.hasGoodConnection();
  }

  /**
   * Schedule background refresh
   */
  private scheduleBackgroundRefresh(key: string): void {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'BACKGROUND_REFRESH',
        key,
      });
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp.getTime() > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => {
      this.cache.delete(key);
      this.accessTimes.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log(
        `[CacheManager] Cleaned up ${expiredKeys.length} expired entries`,
      );
    }
  }

  /**
   * Check if connection is good for prefetching
   */
  private hasGoodConnection(): boolean {
    if (!this.networkInfo) return true;

    return (
      this.networkInfo.effectiveType === '4g' && this.networkInfo.downlink > 1.5
    );
  }

  /**
   * Check if it's business hours (for prefetching)
   */
  private isBusinessHours(): boolean {
    const hour = new Date().getHours();
    return hour >= 9 && hour <= 17;
  }

  /**
   * Check if device has low battery
   */
  private isLowBattery(): boolean {
    if ('getBattery' in navigator) {
      return (navigator as any).getBattery().then((battery: any) => {
        return battery.level < 0.2;
      });
    }
    return false;
  }

  /**
   * Adjust cache strategy based on network conditions
   */
  private adjustCacheStrategy(): void {
    if (!this.hasGoodConnection()) {
      // Disable prefetching and background refresh on poor connection
      this.config.prefetchEnabled = false;
      this.config.backgroundRefresh = false;
    } else {
      // Re-enable on good connection
      this.config.prefetchEnabled = true;
      this.config.backgroundRefresh = true;
    }
  }

  /**
   * Handle service worker cache requests
   */
  private async handleServiceWorkerCache(payload: any): Promise<void> {
    if (payload.action === 'store') {
      await this.set(payload.key, payload.data, payload.options);
    }
  }

  /**
   * Update performance metrics from PerformanceEntry
   */
  private updatePerformanceMetrics(entry: PerformanceEntry): void {
    // Update memory efficiency based on response times
    const responseTime = entry.duration;
    this.metrics.memoryEfficiency = Math.max(
      0,
      Math.min(1, 1000 / (responseTime + 100)),
    );
  }

  /**
   * Destroy cache manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.clear();
  }
}
