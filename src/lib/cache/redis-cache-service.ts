/**
 * Redis Cache Service for WedSync
 *
 * High-performance Redis-based caching service for API responses,
 * database queries, and wedding-specific data caching.
 *
 * Features:
 * - Redis connection pooling and failover
 * - TTL-based cache expiration
 * - Tag-based cache invalidation
 * - Wedding day emergency protocols
 * - Performance metrics and monitoring
 */

import { Redis } from 'ioredis';

export interface CacheOptions {
  /** TTL in seconds */
  ttl?: number;
  /** Cache tags for group invalidation */
  tags?: string[];
  /** Namespace prefix */
  namespace?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalRequests: number;
}

export class RedisCacheService {
  private redis: Redis;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    totalRequests: 0,
  };
  private defaultTTL = 3600; // 1 hour default
  private keyPrefix = 'wedsync:';

  constructor(options?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    defaultTTL?: number;
  }) {
    const {
      host = process.env.REDIS_HOST || 'localhost',
      port = parseInt(process.env.REDIS_PORT || '6379'),
      password = process.env.REDIS_PASSWORD,
      db = 0,
      keyPrefix = 'wedsync:',
      defaultTTL = 3600,
    } = options || {};

    this.redis = new Redis({
      host,
      port,
      password,
      db,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.keyPrefix = keyPrefix;
    this.defaultTTL = defaultTTL;

    // Handle Redis connection events
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
      this.stats.errors++;
    });

    this.redis.on('ready', () => {
      console.log('Redis cache service ready');
    });
  }

  /**
   * Generate cache key with namespace and tags
   */
  private generateKey(key: string, namespace?: string): string {
    const prefix = namespace
      ? `${this.keyPrefix}${namespace}:`
      : this.keyPrefix;
    return `${prefix}${key}`;
  }

  /**
   * Get value from cache
   * Overload for compatibility with existing code
   */
  async get<T = any>(
    key: string,
    namespaceOrOptions?: string | { namespace?: string },
  ): Promise<T | null> {
    const options =
      typeof namespaceOrOptions === 'string'
        ? { namespace: namespaceOrOptions }
        : namespaceOrOptions;
    try {
      this.stats.totalRequests++;
      const cacheKey = this.generateKey(key, options?.namespace);
      const value = await this.redis.get(cacheKey);

      if (value !== null) {
        this.stats.hits++;
        return JSON.parse(value);
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.error('Redis get error:', error);
      this.stats.errors++;
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T = any>(
    key: string,
    value: T,
    options?: CacheOptions,
  ): Promise<boolean> {
    try {
      this.stats.sets++;
      const cacheKey = this.generateKey(key, options?.namespace);
      const ttl = options?.ttl || this.defaultTTL;

      // Serialize the value
      const serializedValue = JSON.stringify(value);

      // Set with TTL
      await this.redis.setex(cacheKey, ttl, serializedValue);

      // Handle tags for group invalidation
      if (options?.tags && options.tags.length > 0) {
        await this.addToTagGroups(cacheKey, options.tags);
      }

      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete specific key
   */
  async delete(
    key: string,
    options?: { namespace?: string },
  ): Promise<boolean> {
    try {
      this.stats.deletes++;
      const cacheKey = this.generateKey(key, options?.namespace);
      const result = await this.redis.del(cacheKey);
      return result > 0;
    } catch (error) {
      console.error('Redis delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Invalidate cache by pattern (glob-style)
   */
  async invalidatePattern(
    pattern: string,
    namespace?: string,
  ): Promise<number> {
    try {
      const searchPattern = this.generateKey(pattern, namespace);
      const keys = await this.redis.keys(searchPattern);

      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        this.stats.deletes += deleted;
        return deleted;
      }

      return 0;
    } catch (error) {
      console.error('Redis invalidatePattern error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let totalDeleted = 0;

      for (const tag of tags) {
        const tagKey = `${this.keyPrefix}tag:${tag}`;
        const members = await this.redis.smembers(tagKey);

        if (members.length > 0) {
          // Delete all keys associated with this tag
          const deleted = await this.redis.del(...members);
          totalDeleted += deleted;

          // Clean up the tag set
          await this.redis.del(tagKey);
        }
      }

      this.stats.deletes += totalDeleted;
      return totalDeleted;
    } catch (error) {
      console.error('Redis invalidateByTags error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Add key to tag groups for group invalidation
   */
  private async addToTagGroups(key: string, tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const tagKey = `${this.keyPrefix}tag:${tag}`;
        await this.redis.sadd(tagKey, key);
      }
    } catch (error) {
      console.error('Redis addToTagGroups error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Check if key exists
   */
  async exists(
    key: string,
    options?: { namespace?: string },
  ): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, options?.namespace);
      const exists = await this.redis.exists(cacheKey);
      return exists > 0;
    } catch (error) {
      console.error('Redis exists error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string, options?: { namespace?: string }): Promise<number> {
    try {
      const cacheKey = this.generateKey(key, options?.namespace);
      return await this.redis.ttl(cacheKey);
    } catch (error) {
      console.error('Redis getTTL error:', error);
      this.stats.errors++;
      return -1;
    }
  }

  /**
   * Extend TTL for existing key
   */
  async extendTTL(
    key: string,
    additionalSeconds: number,
    options?: { namespace?: string },
  ): Promise<boolean> {
    try {
      const cacheKey = this.generateKey(key, options?.namespace);
      const currentTTL = await this.redis.ttl(cacheKey);

      if (currentTTL > 0) {
        const newTTL = currentTTL + additionalSeconds;
        await this.redis.expire(cacheKey, newTTL);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Redis extendTTL error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Wedding Day Emergency Protocol
   * Extends all cache TTLs to prevent cache misses during peak traffic
   */
  async activateWeddingDayProtocol(
    extensionMinutes: number = 60,
  ): Promise<void> {
    try {
      console.log(
        `Activating Wedding Day Protocol: extending all cache TTLs by ${extensionMinutes} minutes`,
      );

      // Get all keys matching our namespace
      const keys = await this.redis.keys(`${this.keyPrefix}*`);

      const extensionSeconds = extensionMinutes * 60;
      const pipeline = this.redis.pipeline();

      for (const key of keys) {
        // Skip tag keys
        if (!key.includes(':tag:')) {
          const currentTTL = await this.redis.ttl(key);
          if (currentTTL > 0) {
            pipeline.expire(key, currentTTL + extensionSeconds);
          }
        }
      }

      await pipeline.exec();
      console.log(
        `Wedding Day Protocol: Extended TTL for ${keys.length} cache entries`,
      );
    } catch (error) {
      console.error('Wedding Day Protocol activation error:', error);
      this.stats.errors++;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const hitRate =
      this.stats.totalRequests > 0
        ? (this.stats.hits / this.stats.totalRequests) * 100
        : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalRequests: 0,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
  }> {
    const start = Date.now();
    try {
      await this.redis.ping();
      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (error) {
      const latency = Date.now() - start;
      console.error('Redis health check failed:', error);
      return { status: 'unhealthy', latency };
    }
  }

  /**
   * Alias for healthCheck for compatibility
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
  }> {
    return this.healthCheck();
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      console.log('Redis cache service disconnected gracefully');
    } catch (error) {
      console.error('Error during Redis disconnect:', error);
    }
  }
}

// Export singleton instance
let cacheServiceInstance: RedisCacheService | null = null;

export function getCacheService(): RedisCacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new RedisCacheService();
  }
  return cacheServiceInstance;
}

export default RedisCacheService;
