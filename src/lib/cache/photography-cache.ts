/**
 * Photography AI Cache Management
 * WS-130 Round 3: Production optimization with intelligent caching
 *
 * Features:
 * - Redis-based caching with fallback to memory
 * - Intelligent cache invalidation
 * - Performance monitoring
 * - Rate limiting integration
 */

import { createClient } from 'redis';
import { LRUCache } from 'lru-cache';
import type {
  MoodBoardResponse,
  StyleConsistencyReport,
  ColorHarmonyAnalysis,
  CacheKeys,
} from '@/types/photography-integrations';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  hit_count: number;
  priority: 'low' | 'normal' | 'high';
}

export class PhotographyCacheManager {
  private redis: any = null;
  private memoryCache: LRUCache<string, CacheEntry<any>>;
  private isRedisConnected = false;
  private cacheHits = 0;
  private cacheMisses = 0;

  // Cache TTL settings (seconds)
  private readonly TTL = {
    MOOD_BOARD: 3600, // 1 hour
    STYLE_ANALYSIS: 7200, // 2 hours
    COLOR_HARMONY: 1800, // 30 minutes
    FEATURE_ACCESS: 300, // 5 minutes
    USER_PREFERENCES: 3600, // 1 hour
    INTEGRATION_RESULT: 1800, // 30 minutes
    SHORT_TERM: 300, // 5 minutes
    LONG_TERM: 86400, // 24 hours
  };

  constructor() {
    this.initializeRedis();
    this.initializeMemoryCache();
  }

  private async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        this.redis = createClient({ url: process.env.REDIS_URL });
        this.redis.on('error', (err: Error) => {
          console.error('Redis connection error:', err);
          this.isRedisConnected = false;
        });
        this.redis.on('connect', () => {
          console.log('Redis connected successfully');
          this.isRedisConnected = true;
        });
        await this.redis.connect();
      }
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isRedisConnected = false;
    }
  }

  private initializeMemoryCache() {
    this.memoryCache = new LRUCache<string, CacheEntry<any>>({
      max: 1000, // Maximum 1000 entries
      ttl: 1000 * 60 * 30, // 30 minutes default TTL
      maxSize: 100 * 1024 * 1024, // 100MB max memory
      sizeCalculation: (value) => {
        return JSON.stringify(value).length;
      },
      dispose: (value, key) => {
        console.log(`Cache entry disposed: ${key}`);
      },
    });
  }

  /**
   * Get data from cache with fallback strategy
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      if (this.isRedisConnected) {
        const redisData = await this.redis.get(key);
        if (redisData) {
          const entry: CacheEntry<T> = JSON.parse(redisData);

          // Check if entry is still valid
          if (this.isEntryValid(entry)) {
            entry.hit_count++;
            await this.redis.set(key, JSON.stringify(entry), 'EX', entry.ttl);
            this.cacheHits++;
            return entry.data;
          } else {
            // Entry expired, remove it
            await this.redis.del(key);
          }
        }
      }

      // Fallback to memory cache
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isEntryValid(memoryEntry)) {
        memoryEntry.hit_count++;
        this.memoryCache.set(key, memoryEntry);
        this.cacheHits++;
        return memoryEntry.data;
      }

      this.cacheMisses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.cacheMisses++;
      return null;
    }
  }

  /**
   * Set data in cache with options
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {},
  ): Promise<void> {
    const ttl = options.ttl || this.TTL.SHORT_TERM;
    const priority = options.priority || 'normal';
    const tags = options.tags || [];

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      tags,
      hit_count: 0,
      priority,
    };

    try {
      // Set in Redis
      if (this.isRedisConnected) {
        await this.redis.set(key, JSON.stringify(entry), 'EX', ttl);
      }

      // Set in memory cache
      this.memoryCache.set(key, entry, { ttl: ttl * 1000 });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Invalidate cache entries by pattern or tags
   */
  async invalidate(pattern?: string, tags?: string[]): Promise<void> {
    try {
      if (pattern) {
        // Redis pattern-based deletion
        if (this.isRedisConnected) {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(keys);
          }
        }

        // Memory cache pattern-based deletion
        const keysToCheck: string[] = [];
        this.memoryCache.forEach((value, key) => {
          keysToCheck.push(key);
        });
        keysToCheck.forEach((key) => {
          if (key.includes(pattern.replace('*', ''))) {
            this.memoryCache.delete(key);
          }
        });
      }

      if (tags && tags.length > 0) {
        // Tag-based invalidation
        const keysToDelete: string[] = [];

        this.memoryCache.forEach((entry, key) => {
          if (entry && entry.tags.some((tag) => tags.includes(tag))) {
            keysToDelete.push(key);
          }
        });

        keysToDelete.forEach((key) => this.memoryCache.delete(key));

        // Redis tag-based deletion would require additional metadata
        // For now, implement with pattern matching
        if (this.isRedisConnected) {
          for (const tag of tags) {
            const keys = await this.redis.keys(`*${tag}*`);
            if (keys.length > 0) {
              await this.redis.del(keys);
            }
          }
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Cache mood board analysis
   */
  async cacheMoodBoard(
    clientId: string,
    weddingStyle: string,
    colors: string[],
    moodBoard: MoodBoardResponse,
  ): Promise<void> {
    const key = this.generateKey(
      'MOOD_BOARD',
      clientId,
      weddingStyle,
      colors.join(','),
    );
    await this.set(key, moodBoard, {
      ttl: this.TTL.MOOD_BOARD,
      priority: 'high',
      tags: ['mood-board', `client:${clientId}`, `style:${weddingStyle}`],
    });
  }

  /**
   * Get cached mood board
   */
  async getCachedMoodBoard(
    clientId: string,
    weddingStyle: string,
    colors: string[],
  ): Promise<MoodBoardResponse | null> {
    const key = this.generateKey(
      'MOOD_BOARD',
      clientId,
      weddingStyle,
      colors.join(','),
    );
    return await this.get<MoodBoardResponse>(key);
  }

  /**
   * Cache style consistency analysis
   */
  async cacheStyleConsistency(
    weddingStyle: string,
    musicStyles: string[],
    consistency: StyleConsistencyReport,
  ): Promise<void> {
    const key = this.generateKey(
      'STYLE_CONSISTENCY',
      weddingStyle,
      musicStyles.join(','),
    );
    await this.set(key, consistency, {
      ttl: this.TTL.STYLE_ANALYSIS,
      priority: 'normal',
      tags: ['style-consistency', `style:${weddingStyle}`],
    });
  }

  /**
   * Get cached style consistency
   */
  async getCachedStyleConsistency(
    weddingStyle: string,
    musicStyles: string[],
  ): Promise<StyleConsistencyReport | null> {
    const key = this.generateKey(
      'STYLE_CONSISTENCY',
      weddingStyle,
      musicStyles.join(','),
    );
    return await this.get<StyleConsistencyReport>(key);
  }

  /**
   * Cache color harmony analysis
   */
  async cacheColorHarmony(
    photoColors: string[],
    floralColors: string[],
    harmony: ColorHarmonyAnalysis,
  ): Promise<void> {
    const key = this.generateKey(
      'COLOR_HARMONY',
      photoColors.join(','),
      floralColors.join(','),
    );
    await this.set(key, harmony, {
      ttl: this.TTL.COLOR_HARMONY,
      priority: 'normal',
      tags: ['color-harmony', 'photo-colors', 'floral-colors'],
    });
  }

  /**
   * Get cached color harmony
   */
  async getCachedColorHarmony(
    photoColors: string[],
    floralColors: string[],
  ): Promise<ColorHarmonyAnalysis | null> {
    const key = this.generateKey(
      'COLOR_HARMONY',
      photoColors.join(','),
      floralColors.join(','),
    );
    return await this.get<ColorHarmonyAnalysis>(key);
  }

  /**
   * Cache feature access result
   */
  async cacheFeatureAccess(
    userId: string,
    featureKey: string,
    access: any,
  ): Promise<void> {
    const key = this.generateKey('FEATURE_ACCESS', userId, featureKey);
    await this.set(key, access, {
      ttl: this.TTL.FEATURE_ACCESS,
      priority: 'high',
      tags: ['feature-access', `user:${userId}`],
    });
  }

  /**
   * Get cached feature access
   */
  async getCachedFeatureAccess(
    userId: string,
    featureKey: string,
  ): Promise<any | null> {
    const key = this.generateKey('FEATURE_ACCESS', userId, featureKey);
    return await this.get(key);
  }

  /**
   * Preload frequently accessed data
   */
  async preloadCache(clientId: string): Promise<void> {
    try {
      // Preload common wedding styles for this client
      const commonStyles = ['romantic', 'rustic', 'modern', 'vintage'];
      const commonColors = ['white', 'blush', 'sage', 'navy'];

      // This would typically fetch from database or generate
      // For now, we'll just reserve the cache slots
      const preloadPromises = commonStyles.map((style) => {
        const key = this.generateKey(
          'MOOD_BOARD',
          clientId,
          style,
          commonColors.join(','),
        );
        return this.set(key, null, {
          ttl: this.TTL.SHORT_TERM,
          priority: 'low',
        });
      });

      await Promise.all(preloadPromises);
      console.log(`Preloaded cache for client ${clientId}`);
    } catch (error) {
      console.error('Cache preloading failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate =
      totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;

    return {
      total_requests: totalRequests,
      cache_hits: this.cacheHits,
      cache_misses: this.cacheMisses,
      hit_rate_percent: Math.round(hitRate * 100) / 100,
      memory_cache_size: this.memoryCache.size,
      memory_cache_max: this.memoryCache.max,
      redis_connected: this.isRedisConnected,
    };
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    try {
      if (this.isRedisConnected) {
        await this.redis.flushall();
      }
      this.memoryCache.clear();
      this.cacheHits = 0;
      this.cacheMisses = 0;
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<void> {
    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      // Check memory cache for expired entries
      this.memoryCache.forEach((entry, key) => {
        if (!this.isEntryValid(entry)) {
          expiredKeys.push(key);
        }
      });

      // Remove expired entries
      expiredKeys.forEach((key) => this.memoryCache.delete(key));

      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  // Helper methods
  private isEntryValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl * 1000;
  }

  private generateKey(...parts: string[]): string {
    return parts
      .map((part) => part.toLowerCase().replace(/[^a-z0-9]/g, '-'))
      .join(':');
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Shutdown cache connections
   */
  async shutdown(): Promise<void> {
    try {
      if (this.redis && this.isRedisConnected) {
        await this.redis.quit();
      }
      this.memoryCache.clear();
    } catch (error) {
      console.error('Cache shutdown error:', error);
    }
  }
}

// Export singleton instance
export const photographyCache = new PhotographyCacheManager();
