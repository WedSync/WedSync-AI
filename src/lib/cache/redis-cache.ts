/**
 * Redis Cache Implementation
 * Provides caching layer for frequently accessed data
 */

import Redis from 'ioredis';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
  compress?: boolean; // Compress large values
}

export class RedisCache {
  private static instance: RedisCache;
  private client: Redis | null = null;
  private isConnected: boolean = false;

  // Cache key prefixes
  private readonly prefixes = {
    session: 'session:',
    user: 'user:',
    org: 'org:',
    form: 'form:',
    pdf: 'pdf:',
    core: 'core:',
    api: 'api:',
  };

  // Default TTLs (in seconds)
  private readonly defaultTTLs = {
    session: 3600, // 1 hour
    user: 300, // 5 minutes
    org: 600, // 10 minutes
    form: 1800, // 30 minutes
    pdf: 3600, // 1 hour
    core: 86400, // 1 day
    api: 60, // 1 minute
  };

  private constructor() {
    this.connect();
  }

  static getInstance(): RedisCache {
    if (!RedisCache.instance) {
      RedisCache.instance = new RedisCache();
    }
    return RedisCache.instance;
  }

  private connect(): void {
    if (!process.env.REDIS_URL) {
      logger.warn('Redis URL not configured, caching disabled');
      return;
    }

    try {
      this.client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          logger.warn(`Redis connection retry ${times}, delay: ${delay}ms`);
          return delay;
        },
        reconnectOnError: (err) => {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            return true;
          }
          return false;
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected');
      });

      this.client.on('error', (error) => {
        logger.error('Redis error', error);
        metrics.incrementCounter('cache.errors', 1, { type: 'connection' });
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });
    } catch (error) {
      logger.error('Failed to initialize Redis', error as Error);
      this.client = null;
    }
  }

  // Get value from cache
  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.isConnected) return null;

    const timer = metrics.startTimer('cache.get');

    try {
      const value = await this.client.get(key);

      if (value) {
        metrics.incrementCounter('cache.hits');
        const parsed = JSON.parse(value);

        // Check if value is compressed
        if (parsed._compressed) {
          return this.decompress(parsed.data);
        }

        return parsed as T;
      }

      metrics.incrementCounter('cache.misses');
      return null;
    } catch (error) {
      logger.error('Cache get error', error as Error, { key });
      metrics.incrementCounter('cache.errors', 1, { operation: 'get' });
      return null;
    } finally {
      timer();
    }
  }

  // Set value in cache
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    const timer = metrics.startTimer('cache.set');

    try {
      let dataToStore: any = value;

      // Compress large values if requested
      if (options.compress) {
        dataToStore = {
          _compressed: true,
          data: this.compress(value),
        };
      }

      const serialized = JSON.stringify(dataToStore);
      const ttl = options.ttl || this.getDefaultTTL(key);

      if (ttl > 0) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      // Add tags for invalidation
      if (options.tags && options.tags.length > 0) {
        await this.addTags(key, options.tags);
      }

      metrics.incrementCounter('cache.sets');
      return true;
    } catch (error) {
      logger.error('Cache set error', error as Error, { key });
      metrics.incrementCounter('cache.errors', 1, { operation: 'set' });
      return false;
    } finally {
      timer();
    }
  }

  // Delete value from cache
  async delete(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      await this.client.del(key);
      metrics.incrementCounter('cache.deletes');
      return true;
    } catch (error) {
      logger.error('Cache delete error', error as Error, { key });
      metrics.incrementCounter('cache.errors', 1, { operation: 'delete' });
      return false;
    }
  }

  // Invalidate cache by tags
  async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.client || !this.isConnected) return 0;

    const timer = metrics.startTimer('cache.invalidate');
    let invalidated = 0;

    try {
      for (const tag of tags) {
        const keys = await this.client.smembers(`tag:${tag}`);

        if (keys.length > 0) {
          await this.client.del(...keys);
          await this.client.del(`tag:${tag}`);
          invalidated += keys.length;
        }
      }

      metrics.incrementCounter('cache.invalidations', invalidated);
      return invalidated;
    } catch (error) {
      logger.error('Cache invalidation error', error as Error, { tags });
      metrics.incrementCounter('cache.errors', 1, { operation: 'invalidate' });
      return 0;
    } finally {
      timer();
    }
  }

  // Clear all cache
  async flush(): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      await this.client.flushdb();
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.error('Cache flush error', error as Error);
      return false;
    }
  }

  // Cache decorator for methods
  memoize<T>(
    keyGenerator: (...args: any[]) => string,
    options: CacheOptions = {},
  ) {
    return (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor,
    ) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cacheKey = keyGenerator(...args);

        // Try to get from cache
        const cached = await RedisCache.instance.get<T>(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Store in cache
        await RedisCache.instance.set(cacheKey, result, options);

        return result;
      };

      return descriptor;
    };
  }

  // Helper methods
  private getDefaultTTL(key: string): number {
    for (const [prefix, ttl] of Object.entries(this.defaultTTLs)) {
      if (key.startsWith(this.prefixes[prefix as keyof typeof this.prefixes])) {
        return ttl;
      }
    }
    return 300; // Default 5 minutes
  }

  private async addTags(key: string, tags: string[]): Promise<void> {
    if (!this.client) return;

    const pipeline = this.client.pipeline();

    for (const tag of tags) {
      pipeline.sadd(`tag:${tag}`, key);
    }

    await pipeline.exec();
  }

  private compress(data: any): string {
    // Implement compression (e.g., using zlib)
    // For now, just return stringified data
    return JSON.stringify(data);
  }

  private decompress(data: string): any {
    // Implement decompression
    // For now, just parse the data
    return JSON.parse(data);
  }

  // Specific cache methods for common use cases
  async cacheUserSession(
    userId: string,
    sessionData: any,
    ttl: number = 3600,
  ): Promise<boolean> {
    return this.set(`${this.prefixes.session}${userId}`, sessionData, {
      ttl,
      tags: ['session', `user:${userId}`],
    });
  }

  async getUserSession(userId: string): Promise<any> {
    return this.get(`${this.prefixes.session}${userId}`);
  }

  async cacheFormTemplate(formId: string, template: any): Promise<boolean> {
    return this.set(`${this.prefixes.form}template:${formId}`, template, {
      ttl: this.defaultTTLs.form,
      tags: ['form', `form:${formId}`],
    });
  }

  async getFormTemplate(formId: string): Promise<any> {
    return this.get(`${this.prefixes.form}template:${formId}`);
  }

  async cachePDFProcessingResult(pdfId: string, result: any): Promise<boolean> {
    return this.set(`${this.prefixes.pdf}result:${pdfId}`, result, {
      ttl: this.defaultTTLs.pdf,
      tags: ['pdf', `pdf:${pdfId}`],
      compress: true,
    });
  }

  async getPDFProcessingResult(pdfId: string): Promise<any> {
    return this.get(`${this.prefixes.pdf}result:${pdfId}`);
  }

  async cacheCoreFields(fields: any): Promise<boolean> {
    return this.set(`${this.prefixes.core}fields`, fields, {
      ttl: this.defaultTTLs.core,
      tags: ['core'],
    });
  }

  async getCoreFields(): Promise<any> {
    return this.get(`${this.prefixes.core}fields`);
  }

  async cacheAPIResponse(
    endpoint: string,
    params: any,
    response: any,
  ): Promise<boolean> {
    const key = `${this.prefixes.api}${endpoint}:${JSON.stringify(params)}`;
    return this.set(key, response, {
      ttl: this.defaultTTLs.api,
      tags: ['api', `endpoint:${endpoint}`],
    });
  }

  async getAPIResponse(endpoint: string, params: any): Promise<any> {
    const key = `${this.prefixes.api}${endpoint}:${JSON.stringify(params)}`;
    return this.get(key);
  }

  // Invalidation methods
  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidateByTags([`user:${userId}`]);
  }

  async invalidateFormCache(formId: string): Promise<void> {
    await this.invalidateByTags([`form:${formId}`]);
  }

  async invalidatePDFCache(pdfId: string): Promise<void> {
    await this.invalidateByTags([`pdf:${pdfId}`]);
  }

  async invalidateAPICache(endpoint?: string): Promise<void> {
    if (endpoint) {
      await this.invalidateByTags([`endpoint:${endpoint}`]);
    } else {
      await this.invalidateByTags(['api']);
    }
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    if (!this.client || !this.isConnected) return false;

    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const cache = RedisCache.getInstance();

// Export cache decorators
export const CacheSession = (ttl: number = 3600) => {
  return cache.memoize((userId: string) => `session:${userId}`, {
    ttl,
    tags: ['session'],
  });
};

export const CacheAPI = (endpoint: string, ttl: number = 60) => {
  return cache.memoize(
    (...args: any[]) => `api:${endpoint}:${JSON.stringify(args)}`,
    { ttl, tags: ['api', `endpoint:${endpoint}`] },
  );
};

export const CacheForm = (ttl: number = 1800) => {
  return cache.memoize((formId: string) => `form:${formId}`, {
    ttl,
    tags: ['form'],
  });
};
