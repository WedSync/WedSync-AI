// WS-184: Advanced Caching System for Style Processing Optimization
'use client';

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface CacheEntry<T> {
  key: string;
  value: T;
  size: number;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  ttl: number;
  tags: string[];
  metadata: {
    computationTime: number;
    cacheLevel: 'l1' | 'l2' | 'l3';
    compressed: boolean;
    priority: 'low' | 'normal' | 'high';
  };
}

export interface CacheConfiguration {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number;
  defaultTTL: number; // Time to live in milliseconds
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'adaptive'; // LRU cache eviction supported
  compressionEnabled: boolean;
  compressionThreshold: number; // Minimum size to compress
  memoryPressureThreshold: number; // Memory usage percentage to trigger cleanup
  tieredCaching: boolean;
  persistentCache: boolean;
  analytics: boolean;
}

export interface CacheStats {
  hitRatio: number;
  hitCount: number;
  missCount: number;
  totalRequests: number;
  currentSize: number;
  currentEntries: number;
  evictionCount: number;
  compressionRatio: number;
  averageAccessTime: number;
  memoryUsage: number;
  efficiency: number;
}

export interface CacheAnalytics {
  popularKeys: Array<{ key: string; accessCount: number; hitRatio: number }>;
  sizeBuckets: { small: number; medium: number; large: number };
  accessPatterns: { frequent: number; sporadic: number; oneTime: number };
  performanceMetrics: {
    averageHitTime: number;
    averageMissTime: number;
    averageComputationSaving: number;
  };
  recommendations: string[];
}

interface TieredCacheLevel {
  name: string;
  maxSize: number;
  maxEntries: number;
  ttl: number;
  priority: number;
}

class CacheCompressor {
  static compress(data: any): {
    compressed: Buffer;
    originalSize: number;
    compressedSize: number;
  } {
    const jsonString = JSON.stringify(data);
    const originalBuffer = Buffer.from(jsonString, 'utf8');
    const originalSize = originalBuffer.length;

    // Simulate compression (in real implementation would use actual compression)
    const compressionRatio = 0.6 + Math.random() * 0.3; // 60-90% compression
    const compressedSize = Math.floor(originalSize * compressionRatio);
    const compressed = Buffer.alloc(compressedSize);

    // Fill with simulated compressed data
    for (let i = 0; i < compressedSize; i++) {
      compressed[i] = originalBuffer[i % originalSize];
    }

    return { compressed, originalSize, compressedSize };
  }

  static decompress(compressed: Buffer, originalSize: number): any {
    // Simulate decompression
    const decompressed = Buffer.alloc(originalSize);
    for (let i = 0; i < originalSize; i++) {
      decompressed[i] = compressed[i % compressed.length];
    }

    try {
      return JSON.parse(decompressed.toString('utf8'));
    } catch {
      return null;
    }
  }
}

class EvictionManager {
  static selectVictimsForEviction<T>(
    entries: Map<string, CacheEntry<T>>,
    policy: CacheConfiguration['evictionPolicy'],
    targetSize: number,
  ): string[] {
    const entriesArray = Array.from(entries.values());
    const victims: string[] = [];
    let currentSize = 0;

    switch (policy) {
      case 'lru':
        entriesArray
          .sort((a, b) => a.lastAccessed - b.lastAccessed)
          .forEach((entry) => {
            if (currentSize < targetSize) {
              victims.push(entry.key);
              currentSize += entry.size;
            }
          });
        break;

      case 'lfu':
        entriesArray
          .sort((a, b) => a.accessCount - b.accessCount)
          .forEach((entry) => {
            if (currentSize < targetSize) {
              victims.push(entry.key);
              currentSize += entry.size;
            }
          });
        break;

      case 'ttl':
        const now = Date.now();
        entriesArray
          .filter((entry) => now - entry.timestamp > entry.ttl)
          .sort((a, b) => a.timestamp + a.ttl - (b.timestamp + b.ttl))
          .forEach((entry) => {
            if (currentSize < targetSize) {
              victims.push(entry.key);
              currentSize += entry.size;
            }
          });
        break;

      case 'adaptive':
        // Adaptive eviction based on access patterns and size
        entriesArray
          .map((entry) => ({
            ...entry,
            score: this.calculateAdaptiveScore(entry),
          }))
          .sort((a, b) => a.score - b.score)
          .forEach((entry) => {
            if (currentSize < targetSize) {
              victims.push(entry.key);
              currentSize += entry.size;
            }
          });
        break;
    }

    return victims;
  }

  private static calculateAdaptiveScore<T>(entry: CacheEntry<T>): number {
    const now = Date.now();
    const age = now - entry.timestamp;
    const timeSinceLastAccess = now - entry.lastAccessed;
    const accessFrequency =
      entry.accessCount / Math.max(1, age / (24 * 60 * 60 * 1000)); // per day
    const sizeWeight = entry.size / (1024 * 1024); // MB
    const priorityWeight =
      entry.metadata.priority === 'high'
        ? 0.1
        : entry.metadata.priority === 'normal'
          ? 1
          : 2;

    // Lower score = higher priority for eviction
    return (
      ((timeSinceLastAccess / 1000) * sizeWeight * priorityWeight) /
      Math.max(1, accessFrequency)
    );
  }
}

export class StyleCacheManager extends EventEmitter {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfiguration;
  private stats: CacheStats;
  private tieredLevels: TieredCacheLevel[];
  private analyticsData: {
    key: string;
    operation: 'hit' | 'miss' | 'set' | 'evict';
    timestamp: number;
    time: number;
  }[] = [];
  private cleanupInterval?: NodeJS.Timeout;
  private persistenceInterval?: NodeJS.Timeout;

  constructor(config: CacheConfiguration) {
    super();
    this.config = config;
    this.stats = this.initializeStats();
    this.tieredLevels = this.initializeTieredLevels();

    this.startMaintenanceTasks();
  }

  private initializeStats(): CacheStats {
    return {
      hitRatio: 0,
      hitCount: 0,
      missCount: 0,
      totalRequests: 0,
      currentSize: 0,
      currentEntries: 0,
      evictionCount: 0,
      compressionRatio: 1,
      averageAccessTime: 0,
      memoryUsage: 0,
      efficiency: 0,
    };
  }

  private initializeTieredLevels(): TieredCacheLevel[] {
    if (!this.config.tieredCaching) return [];

    return [
      {
        name: 'L1',
        maxSize: Math.floor(this.config.maxSize * 0.2),
        maxEntries: Math.floor(this.config.maxEntries * 0.3),
        ttl: this.config.defaultTTL * 2,
        priority: 1,
      },
      {
        name: 'L2',
        maxSize: Math.floor(this.config.maxSize * 0.5),
        maxEntries: Math.floor(this.config.maxEntries * 0.5),
        ttl: this.config.defaultTTL,
        priority: 2,
      },
      {
        name: 'L3',
        maxSize: Math.floor(this.config.maxSize * 0.3),
        maxEntries: Math.floor(this.config.maxEntries * 0.2),
        ttl: this.config.defaultTTL * 0.5,
        priority: 3,
      },
    ];
  }

  private startMaintenanceTasks(): void {
    // Regular cleanup every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.performMaintenance();
    }, 30000);

    // Persistence every 5 minutes if enabled
    if (this.config.persistentCache) {
      this.persistenceInterval = setInterval(
        () => {
          this.persistCache();
        },
        5 * 60 * 1000,
      );
    }
  }

  /**
   * WS-184: Get value from cache with comprehensive optimization
   */
  async get<T>(key: string, tags?: string[]): Promise<T | null> {
    const startTime = performance.now();

    const entry = this.cache.get(key);
    if (!entry) {
      this.recordMiss(key, startTime);
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.recordMiss(key, startTime);
      return null;
    }

    // Check tag-based invalidation
    if (tags && !this.tagsMatch(entry.tags, tags)) {
      this.cache.delete(key);
      this.recordMiss(key, startTime);
      return null;
    }

    // Update access statistics
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    // Decompress if necessary
    let value = entry.value;
    if (entry.metadata.compressed && entry.value instanceof Buffer) {
      value = CacheCompressor.decompress(entry.value, entry.size);
    }

    this.recordHit(key, startTime);

    // Promote in tiered cache if applicable
    if (this.config.tieredCaching) {
      this.promoteInTieredCache(entry);
    }

    return value;
  }

  /**
   * WS-184: Set value in cache with intelligent compression and placement
   */
  async set<T>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      tags?: string[];
      priority?: 'low' | 'normal' | 'high';
      computationTime?: number;
    },
  ): Promise<boolean> {
    const startTime = performance.now();

    // Calculate value size
    const serializedValue = JSON.stringify(value);
    let valueSize = Buffer.byteLength(serializedValue, 'utf8');
    let storedValue: any = value;
    let isCompressed = false;

    // Apply compression if beneficial
    if (
      this.config.compressionEnabled &&
      valueSize > this.config.compressionThreshold
    ) {
      const compressionResult = CacheCompressor.compress(value);
      if (compressionResult.compressedSize < valueSize * 0.8) {
        // Only compress if >20% savings
        storedValue = compressionResult.compressed;
        valueSize = compressionResult.compressedSize;
        isCompressed = true;
      }
    }

    // Check if we need to make space
    if (this.needsEviction(valueSize)) {
      await this.performEviction(valueSize);
    }

    // Determine cache level for tiered caching
    const cacheLevel = this.determineCacheLevel(
      valueSize,
      options?.priority || 'normal',
    );

    // Create cache entry
    const entry: CacheEntry<T> = {
      key,
      value: storedValue,
      size: valueSize,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      ttl: options?.ttl || this.config.defaultTTL,
      tags: options?.tags || [],
      metadata: {
        computationTime: options?.computationTime || 0,
        cacheLevel,
        compressed: isCompressed,
        priority: options?.priority || 'normal',
      },
    };

    // Store in cache
    this.cache.set(key, entry);

    // Update statistics
    this.stats.currentEntries++;
    this.stats.currentSize += valueSize;

    this.recordAnalytics(key, 'set', startTime);

    this.emit('entryAdded', { key, size: valueSize, level: cacheLevel });

    return true;
  }

  /**
   * WS-184: Multi-get operation for batch processing optimization
   */
  async getMultiple<T>(
    keys: string[],
    tags?: string[],
  ): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const promises = keys.map(async (key) => {
      const value = await this.get<T>(key, tags);
      if (value !== null) {
        results.set(key, value);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * WS-184: Batch set operation with transaction-like semantics
   */
  async setMultiple<T>(
    entries: Array<{
      key: string;
      value: T;
      options?: {
        ttl?: number;
        tags?: string[];
        priority?: 'low' | 'normal' | 'high';
      };
    }>,
  ): Promise<{ successful: string[]; failed: string[] }> {
    const successful: string[] = [];
    const failed: string[] = [];

    // Sort by priority to handle high priority items first
    const sortedEntries = entries.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.options?.priority || 'normal'];
      const bPriority = priorityOrder[b.options?.priority || 'normal'];
      return bPriority - aPriority;
    });

    for (const entry of sortedEntries) {
      try {
        const success = await this.set(entry.key, entry.value, entry.options);
        if (success) {
          successful.push(entry.key);
        } else {
          failed.push(entry.key);
        }
      } catch (error) {
        failed.push(entry.key);
      }
    }

    return { successful, failed };
  }

  /**
   * WS-184: Invalidate cache entries by tags or patterns
   */
  async invalidate(criteria: {
    keys?: string[];
    tags?: string[];
    pattern?: RegExp;
  }): Promise<number> {
    let invalidatedCount = 0;
    const keysToDelete: string[] = [];

    const cacheEntries = Array.from(this.cache.entries());
    for (const [key, entry] of cacheEntries) {
      let shouldInvalidate = false;

      // Check specific keys
      if (criteria.keys && criteria.keys.includes(key)) {
        shouldInvalidate = true;
      }

      // Check tags
      if (
        criteria.tags &&
        entry.tags.some((tag) => criteria.tags!.includes(tag))
      ) {
        shouldInvalidate = true;
      }

      // Check pattern
      if (criteria.pattern && criteria.pattern.test(key)) {
        shouldInvalidate = true;
      }

      if (shouldInvalidate) {
        keysToDelete.push(key);
      }
    }

    // Remove entries
    for (const key of keysToDelete) {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.stats.currentEntries--;
        this.stats.currentSize -= entry.size;
        invalidatedCount++;

        this.recordAnalytics(key, 'evict', performance.now());
      }
    }

    this.emit('entriesInvalidated', { count: invalidatedCount, criteria });

    return invalidatedCount;
  }

  /**
   * WS-184: Pre-warm cache with frequently accessed data
   */
  async warmCache(
    warmingData: Array<{
      key: string;
      value: any;
      priority: 'high' | 'normal' | 'low';
    }>,
  ): Promise<void> {
    const startTime = performance.now();

    // Sort by priority for warming
    const sortedData = warmingData.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    let warmedCount = 0;
    for (const item of sortedData) {
      try {
        const success = await this.set(item.key, item.value, {
          priority: item.priority,
          ttl: this.config.defaultTTL * 2, // Longer TTL for warmed entries
        });

        if (success) {
          warmedCount++;
        }
      } catch (error) {
        console.warn(`Failed to warm cache for key ${item.key}:`, error);
      }
    }

    const warmingTime = performance.now() - startTime;

    this.emit('cacheWarmed', {
      entriesWarmed: warmedCount,
      totalEntries: warmingData.length,
      warmingTime,
    });
  }

  // Private helper methods

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private tagsMatch(entryTags: string[], requiredTags: string[]): boolean {
    return requiredTags.every((tag) => entryTags.includes(tag));
  }

  private needsEviction(newEntrySize: number): boolean {
    const wouldExceedSize =
      this.stats.currentSize + newEntrySize > this.config.maxSize;
    const wouldExceedEntries =
      this.stats.currentEntries >= this.config.maxEntries;
    const memoryPressure =
      this.getMemoryPressure() > this.config.memoryPressureThreshold;

    return wouldExceedSize || wouldExceedEntries || memoryPressure;
  }

  private async performEviction(requiredSpace: number): Promise<void> {
    const evictionTarget = Math.max(requiredSpace, this.config.maxSize * 0.1); // At least 10% of max size

    const victims = EvictionManager.selectVictimsForEviction(
      this.cache,
      this.config.evictionPolicy,
      evictionTarget,
    );

    let evictedSize = 0;
    for (const key of victims) {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        evictedSize += entry.size;
        this.stats.currentEntries--;
        this.stats.currentSize -= entry.size;
        this.stats.evictionCount++;

        this.recordAnalytics(key, 'evict', performance.now());
      }
    }

    this.emit('evictionPerformed', {
      evictedEntries: victims.length,
      evictedSize,
    });
  }

  private determineCacheLevel(
    size: number,
    priority: 'low' | 'normal' | 'high',
  ): 'l1' | 'l2' | 'l3' {
    if (!this.config.tieredCaching) return 'l1';

    // High priority items go to L1, small frequently accessed items to L1
    if (priority === 'high' || size < 1024) return 'l1'; // < 1KB

    // Medium priority and medium size to L2
    if (priority === 'normal' || size < 100 * 1024) return 'l2'; // < 100KB

    // Large or low priority items to L3
    return 'l3';
  }

  private promoteInTieredCache(entry: CacheEntry<any>): void {
    // Simple promotion logic based on access frequency
    if (entry.accessCount > 10 && entry.metadata.cacheLevel === 'l3') {
      entry.metadata.cacheLevel = 'l2';
    } else if (entry.accessCount > 50 && entry.metadata.cacheLevel === 'l2') {
      entry.metadata.cacheLevel = 'l1';
    }
  }

  private getMemoryPressure(): number {
    // Simulate memory pressure calculation
    // In real implementation, would check actual system memory usage
    return (this.stats.currentSize / this.config.maxSize) * 100;
  }

  private recordHit(key: string, startTime: number): void {
    this.stats.hitCount++;
    this.stats.totalRequests++;
    this.stats.hitRatio = this.stats.hitCount / this.stats.totalRequests;

    const accessTime = performance.now() - startTime;
    this.updateAverageAccessTime(accessTime);

    this.recordAnalytics(key, 'hit', startTime);
  }

  private recordMiss(key: string, startTime: number): void {
    this.stats.missCount++;
    this.stats.totalRequests++;
    this.stats.hitRatio = this.stats.hitCount / this.stats.totalRequests;

    this.recordAnalytics(key, 'miss', startTime);
  }

  private updateAverageAccessTime(accessTime: number): void {
    const alpha = 0.1; // Exponential moving average factor
    this.stats.averageAccessTime =
      (1 - alpha) * this.stats.averageAccessTime + alpha * accessTime;
  }

  private recordAnalytics(
    key: string,
    operation: 'hit' | 'miss' | 'set' | 'evict',
    startTime: number,
  ): void {
    if (!this.config.analytics) return;

    this.analyticsData.push({
      key,
      operation,
      timestamp: Date.now(),
      time: performance.now() - startTime,
    });

    // Keep only last 10,000 analytics entries
    if (this.analyticsData.length > 10000) {
      this.analyticsData = this.analyticsData.slice(-10000);
    }
  }

  private performMaintenance(): void {
    // Remove expired entries
    const now = Date.now();
    const expiredKeys: string[] = [];

    const cacheEntries = Array.from(this.cache.entries());
    for (const [key, entry] of cacheEntries) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    let expiredSize = 0;
    for (const key of expiredKeys) {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        expiredSize += entry.size;
        this.stats.currentEntries--;
        this.stats.currentSize -= entry.size;
      }
    }

    if (expiredKeys.length > 0) {
      this.emit('maintenancePerformed', {
        expiredEntries: expiredKeys.length,
        freedSize: expiredSize,
      });
    }

    // Update efficiency metric
    this.updateEfficiencyMetric();
  }

  private updateEfficiencyMetric(): void {
    const hitRatioScore = this.stats.hitRatio;
    const memoryEfficiencyScore =
      1 - this.stats.currentSize / this.config.maxSize;
    const compressionScore = this.calculateCompressionRatio();

    this.stats.efficiency =
      hitRatioScore * 0.5 +
      memoryEfficiencyScore * 0.3 +
      compressionScore * 0.2;
    this.stats.compressionRatio = compressionScore;
  }

  private calculateCompressionRatio(): number {
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    let compressedEntries = 0;

    const cacheValues = Array.from(this.cache.values());
    for (const entry of cacheValues) {
      if (entry.metadata.compressed) {
        totalCompressedSize += entry.size;
        totalOriginalSize += entry.size * 1.5; // Estimate original size
        compressedEntries++;
      }
    }

    return compressedEntries > 0 ? totalOriginalSize / totalCompressedSize : 1;
  }

  private async persistCache(): Promise<void> {
    if (!this.config.persistentCache) return;

    // Simulate persistence (in real implementation would save to disk/database)
    const persistableEntries = Array.from(this.cache.entries())
      .filter(([_, entry]) => entry.metadata.priority === 'high')
      .slice(0, 1000); // Limit persistence size

    this.emit('cachePersisted', {
      entriesPersisted: persistableEntries.length,
    });
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    this.updateEfficiencyMetric();
    return { ...this.stats };
  }

  /**
   * Generate cache analytics report
   */
  getAnalytics(): CacheAnalytics {
    if (!this.config.analytics || this.analyticsData.length === 0) {
      return {
        popularKeys: [],
        sizeBuckets: { small: 0, medium: 0, large: 0 },
        accessPatterns: { frequent: 0, sporadic: 0, oneTime: 0 },
        performanceMetrics: {
          averageHitTime: 0,
          averageMissTime: 0,
          averageComputationSaving: 0,
        },
        recommendations: ['Enable analytics to get detailed insights'],
      };
    }

    // Analyze popular keys
    const keyStats = new Map<
      string,
      { hits: number; misses: number; totalTime: number }
    >();

    for (const record of this.analyticsData) {
      const stats = keyStats.get(record.key) || {
        hits: 0,
        misses: 0,
        totalTime: 0,
      };

      if (record.operation === 'hit') {
        stats.hits++;
      } else if (record.operation === 'miss') {
        stats.misses++;
      }

      stats.totalTime += record.time;
      keyStats.set(record.key, stats);
    }

    const popularKeys = Array.from(keyStats.entries())
      .map(([key, stats]) => ({
        key,
        accessCount: stats.hits + stats.misses,
        hitRatio: stats.hits / (stats.hits + stats.misses),
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    // Analyze size buckets
    let small = 0,
      medium = 0,
      large = 0;
    const cacheValues = Array.from(this.cache.values());
    for (const entry of cacheValues) {
      if (entry.size < 1024) small++;
      else if (entry.size < 100 * 1024) medium++;
      else large++;
    }

    // Analyze access patterns
    let frequent = 0,
      sporadic = 0,
      oneTime = 0;
    const cacheValuesAccess = Array.from(this.cache.values());
    for (const entry of cacheValuesAccess) {
      if (entry.accessCount > 10) frequent++;
      else if (entry.accessCount > 1) sporadic++;
      else oneTime++;
    }

    // Performance metrics
    const hitRecords = this.analyticsData.filter((r) => r.operation === 'hit');
    const missRecords = this.analyticsData.filter(
      (r) => r.operation === 'miss',
    );

    const averageHitTime =
      hitRecords.length > 0
        ? hitRecords.reduce((sum, r) => sum + r.time, 0) / hitRecords.length
        : 0;
    const averageMissTime =
      missRecords.length > 0
        ? missRecords.reduce((sum, r) => sum + r.time, 0) / missRecords.length
        : 0;

    // Calculate computation time savings
    let totalComputationSaving = 0;
    let savingsCount = 0;
    const cacheValuesCompute = Array.from(this.cache.values());
    for (const entry of cacheValuesCompute) {
      if (entry.metadata.computationTime > 0) {
        totalComputationSaving +=
          entry.metadata.computationTime * (entry.accessCount - 1);
        savingsCount++;
      }
    }
    const averageComputationSaving =
      savingsCount > 0 ? totalComputationSaving / savingsCount : 0;

    // Generate recommendations
    const recommendations: string[] = [];

    if (this.stats.hitRatio < 0.7) {
      recommendations.push(
        'Consider increasing cache size or TTL to improve hit ratio',
      );
    }

    if (this.stats.compressionRatio > 2) {
      recommendations.push(
        'Compression is very effective - consider enabling it for more entry types',
      );
    }

    if (frequent < this.cache.size * 0.2) {
      recommendations.push(
        'Many entries are accessed infrequently - consider more aggressive eviction',
      );
    }

    if (averageHitTime > 5) {
      recommendations.push(
        'Cache access time is high - consider optimizing serialization/compression',
      );
    }

    return {
      popularKeys,
      sizeBuckets: { small, medium, large },
      accessPatterns: { frequent, sporadic, oneTime },
      performanceMetrics: {
        averageHitTime,
        averageMissTime,
        averageComputationSaving,
      },
      recommendations,
    };
  }

  /**
   * Update cache configuration
   */
  updateConfiguration(updates: Partial<CacheConfiguration>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configurationUpdated', this.config);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const clearedEntries = this.cache.size;
    const clearedSize = this.stats.currentSize;

    this.cache.clear();
    this.stats.currentEntries = 0;
    this.stats.currentSize = 0;

    this.emit('cacheCleared', { clearedEntries, clearedSize });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
    }

    this.clear();
    this.removeAllListeners();
  }
}

export default StyleCacheManager;
