/**
 * Redis Configuration and Connection Management
 * Optimized for production rate limiting with connection pooling
 */

import Redis from 'ioredis';
import { logger } from '@/lib/monitoring/structured-logger';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  lazyConnect: boolean;
  maxRetriesPerRequest: number;
  connectTimeout: number;
  commandTimeout: number;
}

class RedisManager {
  private static instance: RedisManager;
  private redis: Redis | null = null;
  private clusterRedis: Redis.Cluster | null = null;
  private isCluster = false;

  private constructor() {}

  static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Check if we're running in cluster mode
      const redisUrl = process.env.REDIS_URL;
      const redisClusterEndpoints = process.env.REDIS_CLUSTER_ENDPOINTS;

      if (redisClusterEndpoints) {
        await this.initializeCluster(redisClusterEndpoints);
      } else if (redisUrl) {
        await this.initializeSingle(redisUrl);
      } else {
        // Development fallback
        await this.initializeDevelopment();
      }

      logger.info('Redis connection initialized successfully', {
        type: this.isCluster ? 'cluster' : 'single',
        connectionCount: this.isCluster ? 'multiple' : 1,
      });
    } catch (error) {
      logger.warn('Failed to initialize Redis connection, will use fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw the error, let the fallback handle it
    }
  }

  private async initializeCluster(endpoints: string): Promise<void> {
    const nodes = endpoints.split(',').map((endpoint) => {
      const [host, port] = endpoint.trim().split(':');
      return { host, port: parseInt(port) || 6379 };
    });

    this.clusterRedis = new Redis.Cluster(nodes, {
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 10000,
        commandTimeout: 5000,
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        family: 4,
        keepAlive: 30000,
        maxRetriesPerRequest: null, // Disable retries for rate limiting accuracy
      },
      enableOfflineQueue: false,
      maxRedirections: 16,
      scaleReads: 'slave',
      enableReadyCheck: true,
      slotsRefreshTimeout: 2000,
    });

    this.isCluster = true;

    // Connection event handlers
    this.clusterRedis.on('connect', () => {
      logger.info('Redis cluster connected');
    });

    this.clusterRedis.on('ready', () => {
      logger.info('Redis cluster ready');
    });

    this.clusterRedis.on('error', (error) => {
      logger.error('Redis cluster error', error);
    });

    this.clusterRedis.on('close', () => {
      logger.warn('Redis cluster connection closed');
    });
  }

  private async initializeSingle(redisUrl: string): Promise<void> {
    this.redis = new Redis(redisUrl, {
      connectTimeout: 10000,
      commandTimeout: 5000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      family: 4,
      keepAlive: 30000,
      maxRetriesPerRequest: null, // Disable retries for rate limiting accuracy
      enableOfflineQueue: false,
    });

    // Connection event handlers
    this.redis.on('connect', () => {
      logger.info('Redis connected');
    });

    this.redis.on('ready', () => {
      logger.info('Redis ready');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis error', error);
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  private async initializeDevelopment(): Promise<void> {
    // Development Redis (local)
    this.redis = new Redis({
      host: 'localhost',
      port: 6379,
      connectTimeout: 5000,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
    });

    logger.info('Redis initialized for development (localhost:6379)');
  }

  getClient(): Redis | Redis.Cluster {
    if (this.isCluster && this.clusterRedis) {
      return this.clusterRedis;
    }

    if (!this.isCluster && this.redis) {
      return this.redis;
    }

    throw new Error(
      'Redis not available in development environment. Use fallback instead.',
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', error as Error);
      return false;
    }
  }

  async closeConnection(): Promise<void> {
    try {
      if (this.isCluster && this.clusterRedis) {
        await this.clusterRedis.disconnect();
        this.clusterRedis = null;
      }

      if (!this.isCluster && this.redis) {
        await this.redis.disconnect();
        this.redis = null;
      }

      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection', error as Error);
    }
  }
}

// Export singleton instance
export const redisManager = RedisManager.getInstance();

// Convenience wrapper for rate limiting operations
export class RedisRateLimitOperations {
  private client: Redis | Redis.Cluster | null = null;
  private isAvailable: boolean = false;

  constructor() {
    try {
      // Initialize Redis manager if not already done
      redisManager.initialize().catch(() => {
        this.isAvailable = false;
      });
      this.client = redisManager.getClient();
      this.isAvailable = true;
    } catch (error) {
      logger.warn(
        'Redis client not available, rate limiting operations will fail',
        { error: error instanceof Error ? error.message : String(error) },
      );
      this.isAvailable = false;
    }
  }

  getClient(): Redis | Redis.Cluster {
    if (!this.isAvailable || !this.client) {
      throw new Error('Redis not available in development environment');
    }
    return this.client;
  }

  /**
   * Lua script for atomic sliding window counter
   * Returns current count after increment
   */
  private slidingWindowScript = `
    local key = KEYS[1]
    local window = tonumber(ARGV[1])
    local limit = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    
    -- Remove expired entries
    redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
    
    -- Get current count
    local current = redis.call('ZCARD', key)
    
    if current < limit then
      -- Add current request
      redis.call('ZADD', key, now, now .. ':' .. math.random())
      -- Set expiry
      redis.call('EXPIRE', key, math.ceil(window / 1000))
      return {current + 1, limit - current - 1}
    else
      return {current, 0}
    end
  `;

  /**
   * Check and update sliding window counter
   */
  async checkSlidingWindow(
    key: string,
    windowMs: number,
    limit: number,
    now: number = Date.now(),
  ): Promise<{ current: number; remaining: number; allowed: boolean }> {
    try {
      const result = (await this.client.eval(
        this.slidingWindowScript,
        1,
        key,
        windowMs.toString(),
        limit.toString(),
        now.toString(),
      )) as [number, number];

      const [current, remaining] = result;

      return {
        current,
        remaining,
        allowed: remaining >= 0,
      };
    } catch (error) {
      logger.error('Sliding window check failed', error as Error, { key });
      // Fail open for availability
      return { current: 0, remaining: limit, allowed: true };
    }
  }

  /**
   * Get current count without incrementing
   */
  async getCurrentCount(
    key: string,
    windowMs: number,
    now: number = Date.now(),
  ): Promise<number> {
    try {
      // Remove expired entries
      await this.client.zremrangebyscore(key, '-inf', now - windowMs);
      // Get current count
      return await this.client.zcard(key);
    } catch (error) {
      logger.error('Get current count failed', error as Error, { key });
      return 0;
    }
  }

  /**
   * Reset rate limit for a key
   */
  async resetLimit(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Reset limit failed', error as Error, { key });
    }
  }

  /**
   * Set rate limit override
   */
  async setOverride(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<void> {
    try {
      const overrideKey = `override:${key}`;
      const overrideData = {
        limit,
        windowMs,
        createdAt: Date.now(),
      };
      await this.client.setex(
        overrideKey,
        Math.ceil(windowMs / 1000),
        JSON.stringify(overrideData),
      );
    } catch (error) {
      logger.error('Set override failed', error as Error, { key });
    }
  }

  /**
   * Get rate limit override
   */
  async getOverride(
    key: string,
  ): Promise<{ limit: number; windowMs: number } | null> {
    try {
      const overrideKey = `override:${key}`;
      const result = await this.client.get(overrideKey);
      if (result) {
        const data = JSON.parse(result);
        return { limit: data.limit, windowMs: data.windowMs };
      }
      return null;
    } catch (error) {
      logger.error('Get override failed', error as Error, { key });
      return null;
    }
  }

  /**
   * Delete rate limit override
   */
  async deleteOverride(key: string): Promise<void> {
    try {
      const overrideKey = `override:${key}`;
      await this.client.del(overrideKey);
    } catch (error) {
      logger.error('Delete override failed', error as Error, { key });
    }
  }
}

// Note: Redis initialization is deferred to prevent middleware issues
// Call redisManager.initialize() manually when needed

export default redisManager;
