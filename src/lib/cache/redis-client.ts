import { createClient, RedisClientType } from 'redis';

// Redis configuration
const REDIS_CONFIG = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD,
  database: parseInt(process.env.REDIS_DATABASE || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Cache key prefixes for different data types
export const CACHE_PREFIXES = {
  WEDDING: 'wedding:',
  BUDGET: 'budget:',
  EXPENSE: 'expense:',
  HELPER: 'helper:',
  TASK: 'task:',
  ANALYTICS: 'analytics:',
  SEARCH: 'search:',
  ML_PREDICTION: 'ml:prediction:',
  OCR_RESULT: 'ocr:result:',
  USER_SESSION: 'session:',
  RATE_LIMIT: 'ratelimit:',
  BATCH_JOB: 'batch:',
  NOTIFICATION: 'notification:',
};

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  DAILY: 86400, // 24 hours
  WEEKLY: 604800, // 7 days
  PERMANENT: -1, // No expiration
};

class RedisManager {
  private client: RedisClientType | null = null;
  private isConnecting: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      this.client = createClient({
        url: REDIS_CONFIG.url,
        password: REDIS_CONFIG.password,
        database: REDIS_CONFIG.database,
        socket: {
          connectTimeout: REDIS_CONFIG.connectTimeout,
          commandTimeout: REDIS_CONFIG.commandTimeout,
          keepAlive: REDIS_CONFIG.keepAlive,
          reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        },
      });

      this.client.on('error', (error) => {
        console.error('Redis Client Error:', error);
        this.handleConnectionError(error);
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
      });

      this.client.on('ready', () => {
        console.log('Redis Client Ready');
      });

      this.client.on('end', () => {
        console.log('Redis Client Connection Ended');
      });
    } catch (error) {
      console.error('Redis Client Initialization Failed:', error);
      this.client = null;
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.client) {
      this.initializeClient();
    }

    if (!this.client) {
      throw new Error('Failed to initialize Redis client');
    }

    if (!this.client.isOpen) {
      if (this.isConnecting && this.connectionPromise) {
        return this.connectionPromise;
      }

      this.isConnecting = true;
      this.connectionPromise = this.client
        .connect()
        .then(() => {
          this.isConnecting = false;
          this.connectionPromise = null;
        })
        .catch((error) => {
          this.isConnecting = false;
          this.connectionPromise = null;
          throw error;
        });

      return this.connectionPromise;
    }
  }

  private handleConnectionError(error: any) {
    // Implement exponential backoff for reconnection
    setTimeout(() => {
      if (this.client && !this.client.isOpen) {
        this.initializeClient();
      }
    }, 1000);
  }

  // Basic cache operations
  async get(key: string): Promise<string | null> {
    try {
      await this.ensureConnection();
      if (!this.client) return null;

      return await this.client.get(key);
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      await this.ensureConnection();
      if (!this.client) return false;

      if (ttl && ttl > 0) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }

      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      if (!this.client) return false;

      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      if (!this.client) return false;

      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  // JSON operations
  async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis JSON GET error for key ${key}:`, error);
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      return await this.set(key, JSON.stringify(value), ttl);
    } catch (error) {
      console.error(`Redis JSON SET error for key ${key}:`, error);
      return false;
    }
  }

  // Hash operations
  async hGet(key: string, field: string): Promise<string | null> {
    try {
      await this.ensureConnection();
      if (!this.client) return null;

      return await this.client.hGet(key, field);
    } catch (error) {
      console.error(`Redis HGET error for key ${key}, field ${field}:`, error);
      return null;
    }
  }

  async hSet(key: string, field: string, value: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      if (!this.client) return false;

      await this.client.hSet(key, field, value);
      return true;
    } catch (error) {
      console.error(`Redis HSET error for key ${key}, field ${field}:`, error);
      return false;
    }
  }

  async hGetAll(key: string): Promise<Record<string, string> | null> {
    try {
      await this.ensureConnection();
      if (!this.client) return null;

      return await this.client.hGetAll(key);
    } catch (error) {
      console.error(`Redis HGETALL error for key ${key}:`, error);
      return null;
    }
  }

  // List operations
  async lPush(key: string, ...values: string[]): Promise<number> {
    try {
      await this.ensureConnection();
      if (!this.client) return 0;

      return await this.client.lPush(key, values);
    } catch (error) {
      console.error(`Redis LPUSH error for key ${key}:`, error);
      return 0;
    }
  }

  async rPop(key: string): Promise<string | null> {
    try {
      await this.ensureConnection();
      if (!this.client) return null;

      return await this.client.rPop(key);
    } catch (error) {
      console.error(`Redis RPOP error for key ${key}:`, error);
      return null;
    }
  }

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      await this.ensureConnection();
      if (!this.client) return [];

      return await this.client.lRange(key, start, stop);
    } catch (error) {
      console.error(`Redis LRANGE error for key ${key}:`, error);
      return [];
    }
  }

  // Set operations
  async sAdd(key: string, ...members: string[]): Promise<number> {
    try {
      await this.ensureConnection();
      if (!this.client) return 0;

      return await this.client.sAdd(key, members);
    } catch (error) {
      console.error(`Redis SADD error for key ${key}:`, error);
      return 0;
    }
  }

  async sMembers(key: string): Promise<string[]> {
    try {
      await this.ensureConnection();
      if (!this.client) return [];

      return await this.client.sMembers(key);
    } catch (error) {
      console.error(`Redis SMEMBERS error for key ${key}:`, error);
      return [];
    }
  }

  // Advanced operations
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      await this.ensureConnection();
      if (!this.client) return false;

      const result = await this.client.expire(key, seconds);
      return result;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      await this.ensureConnection();
      if (!this.client) return -2;

      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Redis TTL error for key ${key}:`, error);
      return -2;
    }
  }

  async flushPattern(pattern: string): Promise<number> {
    try {
      await this.ensureConnection();
      if (!this.client) return 0;

      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        return await this.client.del(keys);
      }
      return 0;
    } catch (error) {
      console.error(`Redis flush pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  // Rate limiting operations
  async incrementWithExpiry(key: string, expiry: number): Promise<number> {
    try {
      await this.ensureConnection();
      if (!this.client) return 0;

      const multi = this.client.multi();
      multi.incr(key);
      multi.expire(key, expiry);

      const results = await multi.exec();
      return (results?.[0] as number) || 0;
    } catch (error) {
      console.error(`Redis increment with expiry error for key ${key}:`, error);
      return 0;
    }
  }

  // Batch operations
  async mGet(...keys: string[]): Promise<(string | null)[]> {
    try {
      await this.ensureConnection();
      if (!this.client || keys.length === 0) return [];

      return await this.client.mGet(keys);
    } catch (error) {
      console.error(`Redis MGET error for keys ${keys.join(', ')}:`, error);
      return [];
    }
  }

  async mSet(keyValuePairs: Record<string, string>): Promise<boolean> {
    try {
      await this.ensureConnection();
      if (!this.client) return false;

      await this.client.mSet(keyValuePairs);
      return true;
    } catch (error) {
      console.error(`Redis MSET error:`, error);
      return false;
    }
  }

  // Pipeline operations for batch processing
  async pipeline(operations: Array<() => any>): Promise<any[]> {
    try {
      await this.ensureConnection();
      if (!this.client) return [];

      const multi = this.client.multi();

      for (const operation of operations) {
        operation.call(multi);
      }

      return (await multi.exec()) || [];
    } catch (error) {
      console.error(`Redis pipeline error:`, error);
      return [];
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      await this.ensureConnection();
      if (!this.client) return false;

      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping error:', error);
      return false;
    }
  }

  // Connection info
  async info(): Promise<string | null> {
    try {
      await this.ensureConnection();
      if (!this.client) return null;

      return await this.client.info();
    } catch (error) {
      console.error('Redis info error:', error);
      return null;
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.client.isOpen) {
        await this.client.disconnect();
      }
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }
}

// Singleton instance
const redisManager = new RedisManager();

// Cache utility functions
export class CacheService {
  static buildKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}${parts.join(':')}`;
  }

  static async get<T>(key: string): Promise<T | null> {
    return await redisManager.getJson<T>(key);
  }

  static async set<T>(
    key: string,
    value: T,
    ttl: number = CACHE_TTL.MEDIUM,
  ): Promise<boolean> {
    return await redisManager.setJson(key, value, ttl);
  }

  static async del(key: string): Promise<boolean> {
    return await redisManager.del(key);
  }

  static async invalidatePattern(pattern: string): Promise<number> {
    return await redisManager.flushPattern(pattern);
  }

  // Wedding-specific cache operations
  static async getWeddingData(weddingId: string): Promise<any | null> {
    const key = CacheService.buildKey(CACHE_PREFIXES.WEDDING, weddingId);
    return await CacheService.get(key);
  }

  static async setWeddingData(
    weddingId: string,
    data: any,
    ttl: number = CACHE_TTL.LONG,
  ): Promise<boolean> {
    const key = CacheService.buildKey(CACHE_PREFIXES.WEDDING, weddingId);
    return await CacheService.set(key, data, ttl);
  }

  static async invalidateWeddingCache(weddingId: string): Promise<void> {
    const pattern = CacheService.buildKey(
      CACHE_PREFIXES.WEDDING,
      weddingId,
      '*',
    );
    await CacheService.invalidatePattern(pattern);

    // Also invalidate related caches
    await Promise.all([
      CacheService.invalidatePattern(
        CacheService.buildKey(CACHE_PREFIXES.BUDGET, weddingId, '*'),
      ),
      CacheService.invalidatePattern(
        CacheService.buildKey(CACHE_PREFIXES.EXPENSE, weddingId, '*'),
      ),
      CacheService.invalidatePattern(
        CacheService.buildKey(CACHE_PREFIXES.HELPER, weddingId, '*'),
      ),
      CacheService.invalidatePattern(
        CacheService.buildKey(CACHE_PREFIXES.TASK, weddingId, '*'),
      ),
    ]);
  }

  // Analytics cache operations
  static async getAnalytics(
    weddingId: string,
    type: string,
  ): Promise<any | null> {
    const key = CacheService.buildKey(
      CACHE_PREFIXES.ANALYTICS,
      weddingId,
      type,
    );
    return await CacheService.get(key);
  }

  static async setAnalytics(
    weddingId: string,
    type: string,
    data: any,
  ): Promise<boolean> {
    const key = CacheService.buildKey(
      CACHE_PREFIXES.ANALYTICS,
      weddingId,
      type,
    );
    return await CacheService.set(key, data, CACHE_TTL.MEDIUM);
  }

  // Search cache operations
  static async getSearchResults(
    query: string,
    filters: any,
  ): Promise<any | null> {
    const queryHash = Buffer.from(JSON.stringify({ query, filters })).toString(
      'base64',
    );
    const key = CacheService.buildKey(CACHE_PREFIXES.SEARCH, queryHash);
    return await CacheService.get(key);
  }

  static async setSearchResults(
    query: string,
    filters: any,
    results: any,
  ): Promise<boolean> {
    const queryHash = Buffer.from(JSON.stringify({ query, filters })).toString(
      'base64',
    );
    const key = CacheService.buildKey(CACHE_PREFIXES.SEARCH, queryHash);
    return await CacheService.set(key, results, CACHE_TTL.SHORT);
  }

  // Rate limiting
  static async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = CacheService.buildKey(CACHE_PREFIXES.RATE_LIMIT, identifier);
    const current = await redisManager.incrementWithExpiry(key, windowSeconds);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetTime: Date.now() + windowSeconds * 1000,
    };
  }

  // Background job queue
  static async enqueueJob(jobType: string, jobData: any): Promise<boolean> {
    const key = CacheService.buildKey(CACHE_PREFIXES.BATCH_JOB, jobType);
    const jobId = `${jobType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job = {
      id: jobId,
      type: jobType,
      data: jobData,
      created_at: new Date().toISOString(),
      status: 'queued',
    };

    const count = await redisManager.lPush(key, JSON.stringify(job));
    return count > 0;
  }

  static async dequeueJob(jobType: string): Promise<any | null> {
    const key = CacheService.buildKey(CACHE_PREFIXES.BATCH_JOB, jobType);
    const jobStr = await redisManager.rPop(key);

    if (jobStr) {
      try {
        return JSON.parse(jobStr);
      } catch (error) {
        console.error('Failed to parse job data:', error);
        return null;
      }
    }

    return null;
  }

  // Health check
  static async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
  }> {
    const startTime = Date.now();
    const isHealthy = await redisManager.ping();
    const latency = Date.now() - startTime;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      latency: isHealthy ? latency : undefined,
    };
  }
}

export default redisManager;
export { redisManager };
