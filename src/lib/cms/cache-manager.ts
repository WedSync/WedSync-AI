import {
  CMSCache,
  CacheManagerOptions,
  CMSPerformanceMetric,
} from '@/types/cms';
import { createClient } from '@/lib/supabase/client';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private maxMemorySize: number;
  private defaultTTL: number;
  private compressionEnabled: boolean;
  private mobileOptimization: boolean;
  private hitCount = 0;
  private missCount = 0;

  constructor(options: CacheManagerOptions = {}) {
    this.maxMemorySize = options.maxSize || 50 * 1024 * 1024; // 50MB default
    this.defaultTTL = options.ttl || 60 * 60 * 1000; // 1 hour default
    this.compressionEnabled = options.compressionEnabled ?? true;
    this.mobileOptimization = options.mobileOptimization ?? true;

    // Clean up expired cache entries every 5 minutes
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  /**
   * Get data from cache with multi-level strategy
   */
  async get<T>(key: string, organizationId: string): Promise<T | null> {
    // First check memory cache
    const memoryResult = this.getFromMemory<T>(key);
    if (memoryResult) {
      this.hitCount++;
      await this.recordMetric(
        'cache_hit_rate',
        this.getCacheHitRate(),
        organizationId,
      );
      return memoryResult;
    }

    // Check database cache
    const dbResult = await this.getFromDatabase<T>(key, organizationId);
    if (dbResult) {
      // Store in memory for faster access
      this.setInMemory(key, dbResult, this.defaultTTL);
      this.hitCount++;
      await this.recordMetric(
        'cache_hit_rate',
        this.getCacheHitRate(),
        organizationId,
      );
      return dbResult;
    }

    this.missCount++;
    await this.recordMetric(
      'cache_hit_rate',
      this.getCacheHitRate(),
      organizationId,
    );
    return null;
  }

  /**
   * Set data in cache with compression and optimization
   */
  async set<T>(
    key: string,
    data: T,
    organizationId: string,
    ttl?: number,
    contentId?: string,
  ): Promise<void> {
    const cacheData = this.optimizeForMobile(data);
    const compressedData = this.compressionEnabled
      ? this.compress(cacheData)
      : cacheData;
    const expiresAt = new Date(Date.now() + (ttl || this.defaultTTL));

    // Store in memory
    this.setInMemory(key, data, ttl || this.defaultTTL);

    // Store in database
    await this.setInDatabase(
      key,
      compressedData,
      organizationId,
      expiresAt,
      contentId,
    );
  }

  /**
   * Invalidate cache entries
   */
  async invalidate(pattern: string, organizationId: string): Promise<number> {
    let invalidated = 0;

    // Clear from memory
    for (const key of this.memoryCache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        this.memoryCache.delete(key);
        invalidated++;
      }
    }

    // Clear from database
    const supabase = createClient();
    const { count } = await supabase
      .from('cms_cache')
      .delete()
      .eq('organization_id', organizationId)
      .like('key', pattern.replace('*', '%'));

    return invalidated + (count || 0);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memoryUsage = this.getMemoryUsage();
    const hitRate = this.getCacheHitRate();

    return {
      memoryUsage,
      memoryUtilization: (memoryUsage / this.maxMemorySize) * 100,
      hitRate,
      totalHits: this.hitCount,
      totalMisses: this.missCount,
      entriesCount: this.memoryCache.size,
      compressionEnabled: this.compressionEnabled,
      mobileOptimization: this.mobileOptimization,
    };
  }

  /**
   * Preload cache with critical content
   */
  async preload(keys: string[], organizationId: string): Promise<void> {
    const supabase = createClient();

    const { data: cacheEntries } = await supabase
      .from('cms_cache')
      .select('key, data, expires_at')
      .eq('organization_id', organizationId)
      .in('key', keys)
      .gt('expires_at', new Date().toISOString());

    if (cacheEntries) {
      for (const entry of cacheEntries) {
        const ttl = new Date(entry.expires_at).getTime() - Date.now();
        if (ttl > 0) {
          const decompressed = this.compressionEnabled
            ? this.decompress(entry.data)
            : entry.data;
          this.setInMemory(entry.key, decompressed, ttl);
        }
      }
    }
  }

  /**
   * Adaptive cache warming based on usage patterns
   */
  async warmCache(organizationId: string): Promise<void> {
    const supabase = createClient();

    // Get most accessed cache entries
    const { data: popularEntries } = await supabase
      .from('cms_cache')
      .select('key, data, expires_at, hit_count')
      .eq('organization_id', organizationId)
      .gt('expires_at', new Date().toISOString())
      .order('hit_count', { ascending: false })
      .limit(20);

    if (popularEntries) {
      for (const entry of popularEntries) {
        const ttl = new Date(entry.expires_at).getTime() - Date.now();
        if (ttl > 0) {
          const decompressed = this.compressionEnabled
            ? this.decompress(entry.data)
            : entry.data;
          this.setInMemory(entry.key, decompressed, ttl);
        }
      }
    }
  }

  private getFromMemory<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.timestamp + entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data as T;
  }

  private async getFromDatabase<T>(
    key: string,
    organizationId: string,
  ): Promise<T | null> {
    const supabase = createClient();

    const { data } = await supabase
      .from('cms_cache')
      .select('data, hit_count, id')
      .eq('key', key)
      .eq('organization_id', organizationId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (data) {
      // Update hit count
      await supabase
        .from('cms_cache')
        .update({
          hit_count: data.hit_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      return this.compressionEnabled ? this.decompress(data.data) : data.data;
    }

    return null;
  }

  private setInMemory<T>(key: string, data: T, ttl: number): void {
    const size = JSON.stringify(data).length;

    // Check if we need to evict entries
    while (this.getMemoryUsage() + size > this.maxMemorySize) {
      this.evictLeastUsed();
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      size,
    });
  }

  private async setInDatabase<T>(
    key: string,
    data: T,
    organizationId: string,
    expiresAt: Date,
    contentId?: string,
  ): Promise<void> {
    const supabase = createClient();

    await supabase.from('cms_cache').upsert({
      key,
      data,
      organization_id: organizationId,
      expires_at: expiresAt.toISOString(),
      content_id: contentId,
      hit_count: 0,
    });
  }

  private optimizeForMobile(data: any): any {
    if (!this.mobileOptimization) return data;

    // Remove unnecessary fields for mobile
    if (typeof data === 'object' && data !== null) {
      const optimized = { ...data };

      // Remove large binary data for mobile
      if (optimized.fullResolutionImage) {
        delete optimized.fullResolutionImage;
      }

      // Simplify arrays for mobile
      if (Array.isArray(optimized.items) && optimized.items.length > 10) {
        optimized.items = optimized.items.slice(0, 10);
        optimized.hasMore = true;
      }

      return optimized;
    }

    return data;
  }

  private compress(data: any): any {
    if (!this.compressionEnabled) return data;

    // Simple JSON compression - in production, use proper compression library
    const jsonString = JSON.stringify(data);

    // For demonstration, we'll just remove whitespace
    // In production, use libraries like lz-string or pako
    return {
      compressed: true,
      data: jsonString.replace(/\s+/g, ' ').trim(),
    };
  }

  private decompress(data: any): any {
    if (data && data.compressed) {
      return JSON.parse(data.data);
    }
    return data;
  }

  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastUsedHits = Infinity;

    for (const [key, entry] of this.memoryCache) {
      if (entry.hits < leastUsedHits) {
        leastUsedHits = entry.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.memoryCache.delete(leastUsedKey);
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache) {
      if (now > entry.timestamp + entry.ttl) {
        this.memoryCache.delete(key);
      }
    }
  }

  private getMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  private getCacheHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? (this.hitCount / total) * 100 : 0;
  }

  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(key);
  }

  private async recordMetric(
    type: string,
    value: number,
    organizationId: string,
  ): Promise<void> {
    const supabase = createClient();

    await supabase.from('cms_performance_metrics').insert({
      metric_type: type,
      value,
      organization_id: organizationId,
      metadata: {
        timestamp: Date.now(),
        cache_stats: this.getStats(),
      },
    });
  }
}

// Singleton instance
let cacheManager: CacheManager | null = null;

export function getCacheManager(options?: CacheManagerOptions): CacheManager {
  if (!cacheManager) {
    cacheManager = new CacheManager(options);
  }
  return cacheManager;
}

/**
 * High-level cache utilities for common patterns
 */
export class CMSCacheUtils {
  private cacheManager: CacheManager;

  constructor(options?: CacheManagerOptions) {
    this.cacheManager = getCacheManager(options);
  }

  /**
   * Cache content with automatic key generation
   */
  async cacheContent(
    content: any,
    organizationId: string,
    contentId?: string,
  ): Promise<void> {
    const key = `content:${contentId || content.id || 'unknown'}`;
    await this.cacheManager.set(
      key,
      content,
      organizationId,
      undefined,
      contentId,
    );
  }

  /**
   * Cache media with automatic optimization
   */
  async cacheMedia(
    media: any,
    organizationId: string,
    mediaId?: string,
  ): Promise<void> {
    const key = `media:${mediaId || media.id || 'unknown'}`;

    // Optimize media for caching
    const optimizedMedia = {
      ...media,
      // Remove large binary data
      fullImage: undefined,
      // Keep only essential data
      id: media.id,
      url: media.url,
      thumbnail_url: media.thumbnail_url,
      compressed_url: media.compressed_url,
      mime_type: media.mime_type,
      size: media.size,
      alt_text: media.alt_text,
    };

    await this.cacheManager.set(key, optimizedMedia, organizationId);
  }

  /**
   * Cache API responses with TTL based on endpoint
   */
  async cacheApiResponse(
    endpoint: string,
    params: Record<string, any>,
    response: any,
    organizationId: string,
  ): Promise<void> {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    const ttl = this.getTTLForEndpoint(endpoint);

    await this.cacheManager.set(key, response, organizationId, ttl);
  }

  /**
   * Get cached API response
   */
  async getCachedApiResponse<T>(
    endpoint: string,
    params: Record<string, any>,
    organizationId: string,
  ): Promise<T | null> {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    return await this.cacheManager.get<T>(key, organizationId);
  }

  private getTTLForEndpoint(endpoint: string): number {
    // Define TTL based on endpoint patterns
    if (endpoint.includes('content')) return 30 * 60 * 1000; // 30 minutes
    if (endpoint.includes('media')) return 60 * 60 * 1000; // 1 hour
    if (endpoint.includes('search')) return 5 * 60 * 1000; // 5 minutes
    return 15 * 60 * 1000; // 15 minutes default
  }
}

export default CacheManager;
