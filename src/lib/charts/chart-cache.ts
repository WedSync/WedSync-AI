'use client';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
  size: number; // Approximate size in bytes
  accessCount: number;
  lastAccessed: number;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  dataPoints?: number;
}

interface CacheConfig {
  maxSize: number; // Maximum cache size in MB
  defaultTTL: number; // Default TTL in milliseconds
  maxEntries: number; // Maximum number of entries
  enableCompression: boolean;
  persistToDisk: boolean;
}

interface CacheStats {
  entries: number;
  totalSize: number; // in bytes
  hitRate: number;
  missCount: number;
  hitCount: number;
  oldestEntry: number;
  newestEntry: number;
  averageAccessTime: number;
}

class ChartDataCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private stats = {
    hitCount: 0,
    missCount: 0,
    totalAccessTime: 0,
    accessCount: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxEntries: 1000,
      enableCompression: true,
      persistToDisk: false,
      ...config,
    };

    // Load from localStorage if persistence is enabled
    if (this.config.persistToDisk && typeof window !== 'undefined') {
      this.loadFromStorage();
    }

    // Cleanup interval
    setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  private calculateSize(data: any): number {
    // Rough estimation of object size in bytes
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  private compress(data: any): string {
    if (!this.config.enableCompression) {
      return JSON.stringify(data);
    }

    // Simple compression using JSON stringify with reduced precision
    return JSON.stringify(data, (key, value) => {
      if (typeof value === 'number') {
        // Reduce decimal precision for numbers to save space
        return Number(value.toFixed(2));
      }
      return value;
    });
  }

  private decompress(compressedData: string): any {
    return JSON.parse(compressedData);
  }

  private generateKey(baseKey: string, params?: Record<string, any>): string {
    if (!params) return baseKey;

    const paramString = Object.keys(params)
      .sort()
      .map((key) => `${key}:${JSON.stringify(params[key])}`)
      .join('|');

    return `${baseKey}:${paramString}`;
  }

  private shouldEvict(): boolean {
    const totalSize = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0,
    );

    return (
      totalSize > this.config.maxSize ||
      this.cache.size > this.config.maxEntries
    );
  }

  private evictLRU(): void {
    // Evict least recently used entries
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed,
    );

    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);

    for (let i = 0; i < toRemove && entries.length > 0; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach((key) => this.cache.delete(key));

    // Evict if over limits
    if (this.shouldEvict()) {
      this.evictLRU();
    }

    // Persist to storage if enabled
    if (this.config.persistToDisk) {
      this.saveToStorage();
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheData = Array.from(this.cache.entries());
      const compressedCache = this.compress(cacheData);
      localStorage.setItem('chartDataCache', compressedCache);
    } catch (error) {
      console.warn('Failed to save chart cache to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('chartDataCache');
      if (!stored) return;

      const cacheData = this.decompress(stored);
      const now = Date.now();

      // Restore non-expired entries
      for (const [key, entry] of cacheData) {
        if (now - entry.timestamp <= entry.ttl) {
          this.cache.set(key, entry);
        }
      }
    } catch (error) {
      console.warn('Failed to load chart cache from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem('chartDataCache');
    }
  }

  public set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      params?: Record<string, any>;
      deviceType?: 'mobile' | 'tablet' | 'desktop';
      dataPoints?: number;
    } = {},
  ): void {
    const fullKey = this.generateKey(key, options.params);
    const now = Date.now();
    const size = this.calculateSize(data);

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: options.ttl || this.config.defaultTTL,
      key: fullKey,
      size,
      accessCount: 0,
      lastAccessed: now,
      deviceType: options.deviceType,
      dataPoints: options.dataPoints,
    };

    this.cache.set(fullKey, entry);

    // Immediate cleanup if over limits
    if (this.shouldEvict()) {
      this.evictLRU();
    }
  }

  public get<T>(key: string, params?: Record<string, any>): T | null {
    const startTime = performance.now();
    const fullKey = this.generateKey(key, params);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      this.stats.missCount++;
      return null;
    }

    const now = Date.now();

    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(fullKey);
      this.stats.missCount++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hitCount++;

    // Track access time
    const accessTime = performance.now() - startTime;
    this.stats.totalAccessTime += accessTime;
    this.stats.accessCount++;

    return entry.data as T;
  }

  public has(key: string, params?: Record<string, any>): boolean {
    const fullKey = this.generateKey(key, params);
    const entry = this.cache.get(fullKey);

    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(fullKey);
      return false;
    }

    return true;
  }

  public invalidate(key: string, params?: Record<string, any>): boolean {
    const fullKey = this.generateKey(key, params);
    return this.cache.delete(fullKey);
  }

  public invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    const toDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        toDelete.push(key);
      }
    }

    toDelete.forEach((key) => this.cache.delete(key));
    return toDelete.length;
  }

  public clear(): void {
    this.cache.clear();
    this.stats = {
      hitCount: 0,
      missCount: 0,
      totalAccessTime: 0,
      accessCount: 0,
    };
  }

  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const timestamps = entries.map((e) => e.timestamp);

    const hitRate =
      this.stats.hitCount + this.stats.missCount > 0
        ? this.stats.hitCount / (this.stats.hitCount + this.stats.missCount)
        : 0;

    const averageAccessTime =
      this.stats.accessCount > 0
        ? this.stats.totalAccessTime / this.stats.accessCount
        : 0;

    return {
      entries: this.cache.size,
      totalSize,
      hitRate: hitRate * 100,
      missCount: this.stats.missCount,
      hitCount: this.stats.hitCount,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
      averageAccessTime,
    };
  }

  public getDeviceStats(): Record<
    string,
    { count: number; totalSize: number }
  > {
    const stats: Record<string, { count: number; totalSize: number }> = {};

    for (const entry of this.cache.values()) {
      if (entry.deviceType) {
        if (!stats[entry.deviceType]) {
          stats[entry.deviceType] = { count: 0, totalSize: 0 };
        }
        stats[entry.deviceType].count++;
        stats[entry.deviceType].totalSize += entry.size;
      }
    }

    return stats;
  }

  public optimize(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Remove entries that haven't been accessed in the last hour
    const oldEntries = entries.filter(
      ([, entry]) =>
        now - entry.lastAccessed > 3600000 && entry.accessCount < 2,
    );

    oldEntries.forEach(([key]) => this.cache.delete(key));

    // Force cleanup
    this.cleanup();
  }

  public warmup(
    keys: string[],
    dataLoader: (key: string) => Promise<any>,
  ): Promise<void[]> {
    // Pre-load frequently accessed data
    const promises = keys.map(async (key) => {
      if (!this.has(key)) {
        try {
          const data = await dataLoader(key);
          this.set(key, data);
        } catch (error) {
          console.warn(`Failed to warm up cache for key ${key}:`, error);
        }
      }
    });

    return Promise.allSettled(promises) as Promise<void[]>;
  }
}

// Specialized cache for chart data with wedding industry optimizations
class WeddingChartCache extends ChartDataCache {
  constructor() {
    super({
      maxSize: 100 * 1024 * 1024, // 100MB for wedding data
      defaultTTL: 10 * 60 * 1000, // 10 minutes for wedding analytics
      maxEntries: 2000,
      enableCompression: true,
      persistToDisk: true,
    });
  }

  public cacheWeddingMetrics(
    weddingId: string,
    metrics: any,
    dateRange: { start: string; end: string },
    deviceType?: 'mobile' | 'tablet' | 'desktop',
  ): void {
    this.set(`wedding-metrics:${weddingId}`, metrics, {
      params: dateRange,
      ttl: 15 * 60 * 1000, // 15 minutes for wedding metrics
      deviceType,
      dataPoints: Array.isArray(metrics) ? metrics.length : 1,
    });
  }

  public cacheVendorAnalytics(
    vendorId: string,
    analytics: any,
    period: 'day' | 'week' | 'month' | 'year',
    deviceType?: 'mobile' | 'tablet' | 'desktop',
  ): void {
    const ttlMap = {
      day: 5 * 60 * 1000, // 5 minutes
      week: 30 * 60 * 1000, // 30 minutes
      month: 60 * 60 * 1000, // 1 hour
      year: 4 * 60 * 60 * 1000, // 4 hours
    };

    this.set(`vendor-analytics:${vendorId}`, analytics, {
      params: { period },
      ttl: ttlMap[period],
      deviceType,
      dataPoints: Array.isArray(analytics) ? analytics.length : 1,
    });
  }

  public cacheSeasonalTrends(
    trends: any,
    year: number,
    deviceType?: 'mobile' | 'tablet' | 'desktop',
  ): void {
    this.set('seasonal-trends', trends, {
      params: { year },
      ttl: 24 * 60 * 60 * 1000, // 24 hours for seasonal data
      deviceType,
      dataPoints: Array.isArray(trends) ? trends.length : 12, // Usually monthly data
    });
  }
}

// Global instances
const chartDataCache = new ChartDataCache();
const weddingChartCache = new WeddingChartCache();

// React hooks for cache usage
export const useChartCache = () => {
  const get = <T>(key: string, params?: Record<string, any>) =>
    chartDataCache.get<T>(key, params);

  const set = <T>(key: string, data: T, options?: any) =>
    chartDataCache.set(key, data, options);

  const invalidate = (key: string, params?: Record<string, any>) =>
    chartDataCache.invalidate(key, params);

  return { get, set, invalidate, stats: chartDataCache.getStats() };
};

export const useWeddingChartCache = () => {
  const cacheWeddingMetrics = (
    weddingId: string,
    metrics: any,
    dateRange: { start: string; end: string },
    deviceType?: 'mobile' | 'tablet' | 'desktop',
  ) =>
    weddingChartCache.cacheWeddingMetrics(
      weddingId,
      metrics,
      dateRange,
      deviceType,
    );

  const cacheVendorAnalytics = (
    vendorId: string,
    analytics: any,
    period: 'day' | 'week' | 'month' | 'year',
    deviceType?: 'mobile' | 'tablet' | 'desktop',
  ) =>
    weddingChartCache.cacheVendorAnalytics(
      vendorId,
      analytics,
      period,
      deviceType,
    );

  const cacheSeasonalTrends = (
    trends: any,
    year: number,
    deviceType?: 'mobile' | 'tablet' | 'desktop',
  ) => weddingChartCache.cacheSeasonalTrends(trends, year, deviceType);

  const getWeddingMetrics = (
    weddingId: string,
    dateRange: { start: string; end: string },
  ) => weddingChartCache.get(`wedding-metrics:${weddingId}`, dateRange);

  const getVendorAnalytics = (
    vendorId: string,
    period: 'day' | 'week' | 'month' | 'year',
  ) => weddingChartCache.get(`vendor-analytics:${vendorId}`, { period });

  const getSeasonalTrends = (year: number) =>
    weddingChartCache.get('seasonal-trends', { year });

  return {
    cacheWeddingMetrics,
    cacheVendorAnalytics,
    cacheSeasonalTrends,
    getWeddingMetrics,
    getVendorAnalytics,
    getSeasonalTrends,
    stats: weddingChartCache.getStats(),
  };
};

export { ChartDataCache, WeddingChartCache, chartDataCache, weddingChartCache };
export type { CacheEntry, CacheConfig, CacheStats };
