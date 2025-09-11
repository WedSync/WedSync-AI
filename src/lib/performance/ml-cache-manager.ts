// WS-182 Round 1: ML Cache Manager for Churn Intelligence
// Intelligent caching system for ML predictions and features

import { MLPerformanceMetrics } from '../ml/types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  memoryUsageMB: number;
  averageAccessTime: number;
}

interface FeatureCacheConfig {
  maxSizeEntries: number;
  defaultTTLMs: number;
  priorityTTLMultipliers: Record<string, number>;
  compressionEnabled: boolean;
  persistToDisk: boolean;
}

export class MLCacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private accessTimes: Map<string, number[]> = new Map();
  private readonly config: FeatureCacheConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: Partial<FeatureCacheConfig> = {}) {
    this.config = {
      maxSizeEntries: 10000,
      defaultTTLMs: 300000, // 5 minutes
      priorityTTLMultipliers: {
        low: 0.5,
        medium: 1.0,
        high: 2.0,
        critical: 5.0,
      },
      compressionEnabled: true,
      persistToDisk: false,
      ...config,
    };

    this.startCleanupInterval();
  }

  async cachePrediction(
    key: string,
    prediction: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ): Promise<void> {
    const ttl =
      this.config.defaultTTLMs *
      (this.config.priorityTTLMultipliers[priority] || 1);
    const entry: CacheEntry<any> = {
      data: this.config.compressionEnabled
        ? this.compressData(prediction)
        : prediction,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      priority,
    };

    if (this.cache.size >= this.config.maxSizeEntries) {
      await this.evictLRU();
    }

    this.cache.set(key, entry);
  }

  async getCachedPrediction<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.recordAccessTime(key, performance.now() - startTime);
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.recordAccessTime(key, performance.now() - startTime);

    return this.config.compressionEnabled
      ? this.decompressData(entry.data)
      : entry.data;
  }

  async cacheFeatureVector(
    supplierId: string,
    features: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'high',
  ): Promise<void> {
    const key = `features_${supplierId}`;
    await this.cachePrediction(key, features, priority);
  }

  async getCachedFeatures<T>(supplierId: string): Promise<T | null> {
    const key = `features_${supplierId}`;
    return this.getCachedPrediction<T>(key);
  }

  async batchCachePredictions(
    predictions: Array<{
      key: string;
      data: any;
      priority?: 'low' | 'medium' | 'high' | 'critical';
    }>,
  ): Promise<void> {
    const promises = predictions.map(({ key, data, priority }) =>
      this.cachePrediction(key, data, priority),
    );
    await Promise.all(promises);
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern);
    let evicted = 0;

    for (const [key] of this.cache.entries()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        evicted++;
      }
    }

    return evicted;
  }

  async invalidateSupplier(supplierId: string): Promise<void> {
    await this.invalidatePattern(
      `^(prediction_${supplierId}|features_${supplierId})`,
    );
  }

  async warmupCache(
    supplierIds: string[],
    featureExtractor: (id: string) => Promise<any>,
  ): Promise<void> {
    const warmupPromises = supplierIds.map(async (supplierId) => {
      const key = `features_${supplierId}`;
      if (!this.cache.has(key)) {
        try {
          const features = await featureExtractor(supplierId);
          await this.cacheFeatureVector(supplierId, features, 'high');
        } catch (error) {
          console.warn(
            `Failed to warmup cache for supplier ${supplierId}:`,
            error,
          );
        }
      }
    });

    await Promise.all(warmupPromises);
  }

  getCacheStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce(
      (sum, entry) => sum + entry.accessCount,
      0,
    );
    const totalMisses = this.accessTimes.size - totalHits;

    return {
      totalEntries: this.cache.size,
      hitRate: totalHits / (totalHits + totalMisses) || 0,
      missRate: totalMisses / (totalHits + totalMisses) || 0,
      evictionCount: this.getEvictionCount(),
      memoryUsageMB: this.getMemoryUsage(),
      averageAccessTime: this.getAverageAccessTime(),
    };
  }

  async optimizeCache(): Promise<void> {
    const stats = this.getCacheStats();

    if (stats.hitRate < 0.7) {
      await this.increaseCacheSize();
    }

    if (stats.memoryUsageMB > 500) {
      await this.reduceMemoryUsage();
    }
  }

  private compressData(data: any): string {
    return JSON.stringify(data);
  }

  private decompressData(compressed: string): any {
    return JSON.parse(compressed);
  }

  private async evictLRU(): Promise<void> {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime && entry.priority !== 'critical') {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private recordAccessTime(key: string, timeMs: number): void {
    const times = this.accessTimes.get(key) || [];
    times.push(timeMs);
    if (times.length > 100) {
      times.splice(0, times.length - 100);
    }
    this.accessTimes.set(key, times);
  }

  private getEvictionCount(): number {
    return 0;
  }

  private getMemoryUsage(): number {
    const entrySizes = Array.from(this.cache.values()).map(
      (entry) => JSON.stringify(entry).length * 2,
    );
    return entrySizes.reduce((sum, size) => sum + size, 0) / (1024 * 1024);
  }

  private getAverageAccessTime(): number {
    let totalTime = 0;
    let totalAccesses = 0;

    for (const times of this.accessTimes.values()) {
      totalTime += times.reduce((sum, time) => sum + time, 0);
      totalAccesses += times.length;
    }

    return totalAccesses > 0 ? totalTime / totalAccesses : 0;
  }

  private async increaseCacheSize(): Promise<void> {
    this.config.maxSizeEntries = Math.min(
      this.config.maxSizeEntries * 1.5,
      50000,
    );
  }

  private async reduceMemoryUsage(): Promise<void> {
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed,
    );

    const toEvict = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toEvict; i++) {
      if (entries[i][1].priority !== 'critical') {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    this.accessTimes.clear();
  }
}

export const mlCacheManager = new MLCacheManager();
