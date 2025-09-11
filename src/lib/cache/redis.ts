/**
 * Redis Client for AI Response Caching and Rate Limiting
 * Uses Upstash Redis for serverless-friendly caching
 */

import { Redis as UpstashRedis } from '@upstash/redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
  compress?: boolean; // Compress large values
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hit_rate: number;
}

/**
 * Redis wrapper class with caching utilities
 */
export class Redis {
  private client: UpstashRedis;
  private stats: CacheStats;
  private defaultTTL: number = 3600; // 1 hour default
  private keyPrefix: string = 'wedsync:florist:';

  constructor() {
    // Initialize Upstash Redis client
    this.client = new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hit_rate: 0,
    };

    // Update hit rate periodically
    setInterval(() => {
      const total = this.stats.hits + this.stats.misses;
      this.stats.hit_rate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    }, 10000); // Update every 10 seconds
  }

  /**
   * Get value from cache
   */
  async get<T = string>(
    key: string,
    options: CacheOptions = {},
  ): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.client.get<T>(fullKey);

      if (result !== null) {
        this.stats.hits++;
        return result;
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(
    key: string,
    value: any,
    options: CacheOptions = {},
  ): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const ttl = options.ttl || this.defaultTTL;

      // Handle different value types
      let processedValue = value;
      if (typeof value === 'object' && value !== null) {
        processedValue = JSON.stringify(value);
      }

      await this.client.setex(fullKey, ttl, processedValue);
      this.stats.sets++;
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set value with explicit TTL
   */
  async setex(key: string, ttl: number, value: any): Promise<boolean> {
    return this.set(key, value, { ttl });
  }

  /**
   * Delete value from cache
   */
  async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      await this.client.del(fullKey);
      this.stats.deletes++;
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string, options: CacheOptions = {}): Promise<number> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      return await this.client.ttl(fullKey);
    } catch (error) {
      console.error(`Redis TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string, options: CacheOptions = {}): Promise<number> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      return await this.client.incr(fullKey);
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Increment by specific amount
   */
  async incrby(
    key: string,
    increment: number,
    options: CacheOptions = {},
  ): Promise<number> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      return await this.client.incrby(fullKey, increment);
    } catch (error) {
      console.error(`Redis INCRBY error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(
    key: string,
    ttl: number,
    options: CacheOptions = {},
  ): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.prefix);
      const result = await this.client.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T = string>(
    keys: string[],
    options: CacheOptions = {},
  ): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map((key) => this.buildKey(key, options.prefix));
      const results = await this.client.mget<T>(...fullKeys);

      // Update stats
      results.forEach((result) => {
        if (result !== null) {
          this.stats.hits++;
        } else {
          this.stats.misses++;
        }
      });

      return results;
    } catch (error) {
      this.stats.errors++;
      console.error(`Redis MGET error:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(
    pairs: Record<string, any>,
    options: CacheOptions = {},
  ): Promise<boolean> {
    try {
      const pipeline = this.client.pipeline();
      const ttl = options.ttl || this.defaultTTL;

      Object.entries(pairs).forEach(([key, value]) => {
        const fullKey = this.buildKey(key, options.prefix);
        let processedValue = value;

        if (typeof value === 'object' && value !== null) {
          processedValue = JSON.stringify(value);
        }

        pipeline.setex(fullKey, ttl, processedValue);
      });

      await pipeline.exec();
      this.stats.sets += Object.keys(pairs).length;
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error(`Redis MSET error:`, error);
      return false;
    }
  }

  /**
   * Get or set pattern - get value, or set if doesn't exist
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    options: CacheOptions = {},
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Not in cache, compute value
    const value = await factory();

    // Store in cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern: string): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, '');
      const keys = await this.client.keys(fullPattern);

      if (keys.length > 0) {
        await this.client.del(...keys);
        this.stats.deletes += keys.length;
      }

      return keys.length;
    } catch (error) {
      this.stats.errors++;
      console.error(`Redis clear pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    const start = Date.now();

    try {
      await this.client.ping();
      const latency = Date.now() - start;

      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hit_rate: 0,
    };
  }

  /**
   * Build full cache key with prefix
   */
  private buildKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || this.keyPrefix;
    return `${keyPrefix}${key}`;
  }

  /**
   * Get cache info
   */
  async getCacheInfo(): Promise<{
    memory_usage?: string;
    connected_clients?: number;
    total_commands_processed?: number;
    keyspace_hits?: number;
    keyspace_misses?: number;
  }> {
    try {
      const info = await this.client.info();

      // Parse info string (Redis INFO command returns formatted string)
      const lines = info.split('\r\n');
      const parsed: any = {};

      lines.forEach((line) => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          parsed[key] = value;
        }
      });

      return {
        memory_usage: parsed.used_memory_human,
        connected_clients: parseInt(parsed.connected_clients) || 0,
        total_commands_processed:
          parseInt(parsed.total_commands_processed) || 0,
        keyspace_hits: parseInt(parsed.keyspace_hits) || 0,
        keyspace_misses: parseInt(parsed.keyspace_misses) || 0,
      };
    } catch (error) {
      console.error('Failed to get cache info:', error);
      return {};
    }
  }
}

/**
 * Specialized cache keys for florist intelligence system
 */
export const CacheKeys = {
  // OpenAI responses
  COLOR_PALETTE: (hash: string) => `openai:color_palette:${hash}`,
  FLOWER_RECOMMENDATIONS: (hash: string) =>
    `openai:flower_recommendations:${hash}`,
  AI_SUGGESTIONS: (hash: string) => `openai:suggestions:${hash}`,

  // Color analysis
  COLOR_ANALYSIS: (hex: string) => `color:analysis:${hex}`,
  COLOR_HARMONY: (hash: string) => `color:harmony:${hash}`,
  COLOR_NAME: (hex: string) => `color:name:${hex}`,

  // Rate limiting
  RATE_LIMIT: (userId: string, endpoint: string) =>
    `rate_limit:${userId}:${endpoint}`,
  RATE_LIMIT_WINDOW: (userId: string, endpoint: string, window: string) =>
    `rate_limit:${userId}:${endpoint}:${window}`,

  // Circuit breaker states
  CIRCUIT_BREAKER: (name: string) => `circuit_breaker:${name}`,

  // Flower data
  FLOWER_DATABASE: 'flower:database:sync',
  FLOWER_PRICING: (flowerId: string) => `flower:pricing:${flowerId}`,
  SEASONAL_AVAILABILITY: (season: string) => `flower:seasonal:${season}`,

  // User preferences
  USER_PREFERENCES: (userId: string) => `user:preferences:${userId}`,
  USER_FLORIST_HISTORY: (userId: string) => `user:florist_history:${userId}`,
};

// Export default instance
let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis();
  }
  return redisInstance;
}

export default Redis;
