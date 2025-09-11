import { createHash } from 'crypto';

export interface CachedResult {
  result: any;
  timestamp: number;
  version: string;
  hitCount: number;
  confidence: number;
  documentType: string;
  processingTime: number;
}

export interface CacheMetrics {
  totalEntries: number;
  memoryUsageMB: number;
  hitRate: number;
  averageRetrievalTime: number;
  evictionCount: number;
  lastOptimization: Date;
}

export interface CacheOptimization {
  recommendedCacheSize: number;
  recommendedTTL: number;
  memoryOptimizationSuggestions: string[];
  performanceImprovements: string[];
  estimatedSavings: CacheSavings;
}

export interface CacheSavings {
  processingTimeReduced: number;
  resourcesConserved: number;
  costSavingsPercent: number;
}

export interface CacheEntry {
  key: string;
  value: CachedResult;
  lastAccessed: Date;
  accessCount: number;
  size: number;
  priority: number;
}

export interface CacheConfig {
  maxEntries: number;
  maxMemoryMB: number;
  defaultTTL: number;
  cleanupInterval: number;
  enableCompression: boolean;
  enablePersistence: boolean;
}

export class VerificationCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private cacheStats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRetrievalTime: 0,
    totalEntries: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;
  private isInitialized: boolean = false;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxEntries: 10000,
      maxMemoryMB: 256,
      defaultTTL: 3600000, // 1 hour
      cleanupInterval: 300000, // 5 minutes
      enableCompression: true,
      enablePersistence: false,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Start cleanup timer
    this.startCleanupTimer();

    // Load persistent cache if enabled
    if (this.config.enablePersistence) {
      await this.loadPersistentCache();
    }

    this.isInitialized = true;
  }

  async getCachedProcessingResult(
    documentHash: string,
    processingVersion: string,
  ): Promise<CachedResult | null> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(documentHash, processingVersion);

    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.cacheStats.misses++;
      return null;
    }

    // Check if entry is expired
    const age = Date.now() - entry.value.timestamp;
    if (age > this.config.defaultTTL) {
      this.cache.delete(cacheKey);
      this.cacheStats.evictions++;
      this.cacheStats.misses++;
      return null;
    }

    // Update access statistics
    entry.lastAccessed = new Date();
    entry.accessCount++;
    entry.value.hitCount++;

    // Move to front (LRU optimization)
    this.cache.delete(cacheKey);
    this.cache.set(cacheKey, entry);

    this.cacheStats.hits++;
    this.cacheStats.totalRetrievalTime += Date.now() - startTime;

    return entry.value;
  }

  async cacheProcessingResult(
    documentHash: string,
    result: any,
    ttl?: number,
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(documentHash, '1.0.0');
    const resultSize = this.estimateObjectSize(result);

    // Check memory limits
    if (await this.wouldExceedMemoryLimit(resultSize)) {
      await this.evictLeastUsedEntries(resultSize);
    }

    // Create cache entry
    const entry: CacheEntry = {
      key: cacheKey,
      value: {
        result,
        timestamp: Date.now(),
        version: '1.0.0',
        hitCount: 0,
        confidence: result.confidence || 0,
        documentType: result.documentType || 'unknown',
        processingTime: result.processingTimeMs || 0,
      },
      lastAccessed: new Date(),
      accessCount: 0,
      size: resultSize,
      priority: this.calculateCachePriority(result),
    };

    // Apply compression if enabled
    if (this.config.enableCompression) {
      entry.value = await this.compressResult(entry.value);
    }

    this.cache.set(cacheKey, entry);
    this.cacheStats.totalEntries++;

    // Check if we need to enforce entry limits
    if (this.cache.size > this.config.maxEntries) {
      await this.evictOldestEntries(this.cache.size - this.config.maxEntries);
    }
  }

  private async optimizeCachePerformance(
    cacheMetrics: CacheMetrics,
  ): Promise<CacheOptimization> {
    const currentHitRate =
      this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses);
    const memoryUsage = this.calculateMemoryUsage();

    const optimization: CacheOptimization = {
      recommendedCacheSize: this.calculateOptimalCacheSize(),
      recommendedTTL: this.calculateOptimalTTL(),
      memoryOptimizationSuggestions:
        this.generateMemoryOptimizationSuggestions(memoryUsage),
      performanceImprovements:
        this.generatePerformanceImprovements(currentHitRate),
      estimatedSavings: this.calculateEstimatedSavings(currentHitRate),
    };

    return optimization;
  }

  private calculateOptimalCacheSize(): number {
    const hitRate =
      this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses);

    // If hit rate is low, recommend smaller cache
    if (hitRate < 0.3) {
      return Math.max(1000, this.config.maxEntries * 0.5);
    }

    // If hit rate is high, recommend larger cache if memory allows
    if (hitRate > 0.8) {
      return Math.min(50000, this.config.maxEntries * 1.5);
    }

    return this.config.maxEntries;
  }

  private calculateOptimalTTL(): number {
    // Analyze access patterns to determine optimal TTL
    const entries = Array.from(this.cache.values());
    if (entries.length === 0) return this.config.defaultTTL;

    const accessIntervals = entries
      .filter((entry) => entry.accessCount > 1)
      .map((entry) => {
        const timeSinceFirstAccess = Date.now() - entry.value.timestamp;
        return timeSinceFirstAccess / entry.accessCount;
      });

    if (accessIntervals.length === 0) return this.config.defaultTTL;

    const averageAccessInterval =
      accessIntervals.reduce((sum, interval) => sum + interval, 0) /
      accessIntervals.length;

    // Set TTL to 3x average access interval to reduce cache misses
    return Math.max(300000, Math.min(7200000, averageAccessInterval * 3)); // Min 5min, max 2hours
  }

  private generateMemoryOptimizationSuggestions(memoryUsage: number): string[] {
    const suggestions: string[] = [];

    if (memoryUsage > this.config.maxMemoryMB * 0.8) {
      suggestions.push('Consider enabling compression for cache entries');
      suggestions.push(
        'Reduce cache size or implement more aggressive eviction',
      );
      suggestions.push(
        'Analyze large cache entries for optimization opportunities',
      );
    }

    if (!this.config.enableCompression) {
      suggestions.push('Enable compression to reduce memory usage by 40-60%');
    }

    const largeEntries = Array.from(this.cache.values()).filter(
      (entry) => entry.size > 1024 * 1024,
    ).length; // > 1MB

    if (largeEntries > 0) {
      suggestions.push(
        `Consider special handling for ${largeEntries} large cache entries`,
      );
    }

    return suggestions;
  }

  private generatePerformanceImprovements(hitRate: number): string[] {
    const improvements: string[] = [];

    if (hitRate < 0.5) {
      improvements.push(
        'Hit rate is low - consider warming cache with common document patterns',
      );
      improvements.push(
        'Analyze cache key generation strategy for better collision rates',
      );
      improvements.push(
        'Implement predictive caching based on document upload patterns',
      );
    }

    if (hitRate > 0.9) {
      improvements.push(
        'Excellent hit rate - consider increasing cache size for better coverage',
      );
      improvements.push('Implement cache preheating for new document types');
    }

    const avgRetrievalTime =
      this.cacheStats.totalRetrievalTime / this.cacheStats.hits;
    if (avgRetrievalTime > 10) {
      improvements.push(
        'Cache retrieval time is high - consider indexing optimization',
      );
      improvements.push('Implement bloom filters for faster negative lookups');
    }

    return improvements;
  }

  private calculateEstimatedSavings(hitRate: number): CacheSavings {
    const averageProcessingTime =
      Array.from(this.cache.values()).reduce(
        (sum, entry) => sum + entry.value.processingTime,
        0,
      ) / this.cache.size;

    const processingTimeReduced =
      hitRate * averageProcessingTime * this.cacheStats.hits;
    const resourcesConserved = hitRate * 0.7; // Estimate 70% resource saving on cache hits
    const costSavingsPercent = hitRate * 45; // Estimate 45% cost savings on cache hits

    return {
      processingTimeReduced,
      resourcesConserved,
      costSavingsPercent,
    };
  }

  private generateCacheKey(documentHash: string, version: string): string {
    return createHash('md5').update(`${documentHash}_${version}`).digest('hex');
  }

  private estimateObjectSize(obj: any): number {
    const str = JSON.stringify(obj);
    return Buffer.byteLength(str, 'utf8');
  }

  private calculateCachePriority(result: any): number {
    let priority = 50; // Base priority

    // Higher priority for high-confidence results
    if (result.confidence > 0.9) priority += 20;
    else if (result.confidence > 0.8) priority += 10;

    // Higher priority for business-critical document types
    if (result.documentType === 'business_license') priority += 15;
    else if (result.documentType === 'insurance_certificate') priority += 10;

    // Higher priority for complex processing results
    if (result.processingTimeMs > 10000) priority += 15;

    return Math.min(100, priority);
  }

  private async wouldExceedMemoryLimit(
    additionalSize: number,
  ): Promise<boolean> {
    const currentMemoryUsage = this.calculateMemoryUsage();
    return (
      currentMemoryUsage + additionalSize / (1024 * 1024) >
      this.config.maxMemoryMB
    );
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize / (1024 * 1024); // Convert to MB
  }

  private async evictLeastUsedEntries(spaceNeeded: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => {
        // Sort by priority (ascending) and last accessed (oldest first)
        const priorityDiff = a.priority - b.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return a.lastAccessed.getTime() - b.lastAccessed.getTime();
      });

    let freedSpace = 0;
    let evictedCount = 0;

    for (const entry of entries) {
      if (freedSpace >= spaceNeeded) break;

      this.cache.delete(entry.key);
      freedSpace += entry.size;
      evictedCount++;
      this.cacheStats.evictions++;
    }

    console.log(
      `Evicted ${evictedCount} cache entries to free ${(freedSpace / (1024 * 1024)).toFixed(2)}MB`,
    );
  }

  private async evictOldestEntries(entriesToRemove: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, ...entry }))
      .sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
      this.cache.delete(entries[i].key);
      this.cacheStats.evictions++;
    }
  }

  private async compressResult(result: CachedResult): Promise<CachedResult> {
    // Mock compression - in production would use zlib or similar
    // For now, just simulate compression metadata
    return {
      ...result,
      result: {
        ...result.result,
        _compressed: true,
        _originalSize: this.estimateObjectSize(result.result),
      },
    };
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performRoutineCleanup();
    }, this.config.cleanupInterval);
  }

  private async performRoutineCleanup(): Promise<void> {
    const now = Date.now();
    const entriesToRemove: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.value.timestamp;
      if (age > this.config.defaultTTL) {
        entriesToRemove.push(key);
      }
    }

    // Remove expired entries
    for (const key of entriesToRemove) {
      this.cache.delete(key);
      this.cacheStats.evictions++;
    }

    // Check memory usage and evict if necessary
    const memoryUsage = this.calculateMemoryUsage();
    if (memoryUsage > this.config.maxMemoryMB * 0.9) {
      await this.evictLeastUsedEntries(
        this.config.maxMemoryMB * 0.1 * 1024 * 1024,
      ); // Free 10% of max memory
    }

    console.log(
      `Cache cleanup: removed ${entriesToRemove.length} expired entries, current size: ${this.cache.size}, memory: ${memoryUsage.toFixed(2)}MB`,
    );
  }

  private async loadPersistentCache(): Promise<void> {
    // Mock implementation - would load from disk/database in production
    console.log('Loading persistent cache...');
  }

  private async savePersistentCache(): Promise<void> {
    // Mock implementation - would save to disk/database in production
    console.log('Saving persistent cache...');
  }

  getCacheMetrics(): CacheMetrics {
    const hitRate =
      this.cacheStats.hits + this.cacheStats.misses > 0
        ? (this.cacheStats.hits /
            (this.cacheStats.hits + this.cacheStats.misses)) *
          100
        : 0;

    const averageRetrievalTime =
      this.cacheStats.hits > 0
        ? this.cacheStats.totalRetrievalTime / this.cacheStats.hits
        : 0;

    return {
      totalEntries: this.cache.size,
      memoryUsageMB: this.calculateMemoryUsage(),
      hitRate,
      averageRetrievalTime,
      evictionCount: this.cacheStats.evictions,
      lastOptimization: new Date(),
    };
  }

  async getCacheStatistics(): Promise<CacheStatistics> {
    const metrics = this.getCacheMetrics();

    return {
      totalEntries: metrics.totalEntries,
      hitRate: metrics.hitRate,
      missRate: 100 - metrics.hitRate,
      memoryUsage: metrics.memoryUsageMB,
      topDocumentTypes: this.getTopDocumentTypes(),
      averageHitCount: this.calculateAverageHitCount(),
      cacheEfficiencyScore: this.calculateCacheEfficiencyScore(metrics),
      recommendations: await this.generateCacheRecommendations(metrics),
    };
  }

  private getTopDocumentTypes(): Array<{
    type: string;
    count: number;
    hitRate: number;
  }> {
    const typeStats = new Map<string, { total: number; hits: number }>();

    for (const entry of this.cache.values()) {
      const type = entry.value.documentType;
      const stats = typeStats.get(type) || { total: 0, hits: 0 };
      stats.total++;
      stats.hits += entry.value.hitCount;
      typeStats.set(type, stats);
    }

    return Array.from(typeStats.entries())
      .map(([type, stats]) => ({
        type,
        count: stats.total,
        hitRate: stats.total > 0 ? (stats.hits / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateAverageHitCount(): number {
    const entries = Array.from(this.cache.values());
    if (entries.length === 0) return 0;

    const totalHits = entries.reduce(
      (sum, entry) => sum + entry.value.hitCount,
      0,
    );
    return totalHits / entries.length;
  }

  private calculateCacheEfficiencyScore(metrics: CacheMetrics): number {
    // Score based on hit rate, memory efficiency, and retrieval time
    const hitRateScore = metrics.hitRate;
    const memoryEfficiencyScore = Math.max(
      0,
      100 - (metrics.memoryUsageMB / this.config.maxMemoryMB) * 100,
    );
    const speedScore = Math.max(
      0,
      100 - Math.min(100, metrics.averageRetrievalTime),
    );

    return hitRateScore * 0.5 + memoryEfficiencyScore * 0.3 + speedScore * 0.2;
  }

  private async generateCacheRecommendations(
    metrics: CacheMetrics,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (metrics.hitRate < 40) {
      recommendations.push(
        'Low hit rate detected - consider prewarming cache with common document patterns',
      );
    }

    if (metrics.memoryUsageMB > this.config.maxMemoryMB * 0.9) {
      recommendations.push(
        'High memory usage - consider enabling compression or reducing cache size',
      );
    }

    if (metrics.averageRetrievalTime > 20) {
      recommendations.push(
        'Slow cache retrieval - consider optimizing cache key generation or indexing',
      );
    }

    if (metrics.evictionCount > 100) {
      recommendations.push(
        'High eviction rate - consider increasing cache size or TTL values',
      );
    }

    return recommendations;
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRetrievalTime: 0,
      totalEntries: 0,
    };
  }

  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    if (this.config.enablePersistence) {
      await this.savePersistentCache();
    }

    this.isInitialized = false;
  }
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalRetrievalTime: number;
  totalEntries: number;
}

export interface CacheStatistics {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  topDocumentTypes: Array<{ type: string; count: number; hitRate: number }>;
  averageHitCount: number;
  cacheEfficiencyScore: number;
  recommendations: string[];
}

// Export singleton instance
export const verificationCacheManager = new VerificationCacheManager();
