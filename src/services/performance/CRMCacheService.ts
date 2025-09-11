import Redis from 'ioredis';
import { createHash } from 'crypto';

export class CRMCacheService {
  private redis: Redis;
  private localCache: Map<string, { data: any; expires: number }> = new Map();

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: 'crm:',
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });

    // Cleanup local cache every 5 minutes
    setInterval(() => this.cleanupLocalCache(), 5 * 60 * 1000);
  }

  // Multi-tier caching: Local memory -> Redis -> Database
  async get<T>(key: string): Promise<T | null> {
    // Level 1: Local memory cache (fastest)
    const localEntry = this.localCache.get(key);
    if (localEntry && localEntry.expires > Date.now()) {
      return localEntry.data as T;
    }

    // Level 2: Redis cache
    try {
      const cached = await this.redis.get(key);
      if (cached) {
        const data = JSON.parse(cached) as T;

        // Populate local cache
        this.localCache.set(key, {
          data,
          expires: Date.now() + 30 * 1000, // 30 seconds local cache
        });

        return data;
      }
    } catch (error) {
      console.error('Redis cache error:', error);
    }

    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const serialized = JSON.stringify(value);

    // Set in both caches
    await Promise.all([
      // Redis with TTL
      this.redis.setex(key, ttlSeconds, serialized),

      // Local cache with shorter TTL
      Promise.resolve(
        this.localCache.set(key, {
          data: value,
          expires: Date.now() + Math.min(ttlSeconds * 1000, 30 * 1000),
        }),
      ),
    ]);
  }

  // Cache CRM provider data with intelligent invalidation
  async cacheProviderData(
    providerId: string,
    integrationId: string,
    data: any,
  ): Promise<void> {
    const key = `provider:${providerId}:${integrationId}`;
    await this.set(key, data, 15 * 60); // 15 minutes
  }

  async getCachedProviderData(
    providerId: string,
    integrationId: string,
  ): Promise<any> {
    const key = `provider:${providerId}:${integrationId}`;
    return await this.get(key);
  }

  // Cache field mappings (rarely change)
  async cacheFieldMappings(
    integrationId: string,
    mappings: any[],
  ): Promise<void> {
    const key = `mappings:${integrationId}`;
    await this.set(key, mappings, 60 * 60); // 1 hour
  }

  // Cache sync job progress for real-time updates
  async cacheSyncProgress(jobId: string, progress: any): Promise<void> {
    const key = `progress:${jobId}`;
    await this.set(key, progress, 5 * 60); // 5 minutes
  }

  // Batch operations for efficiency
  async mget(keys: string[]): Promise<(any | null)[]> {
    try {
      const results = await this.redis.mget(...keys);
      return results.map((result) => (result ? JSON.parse(result) : null));
    } catch (error) {
      console.error('Redis mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(entries: Array<[string, any, number?]>): Promise<void> {
    const pipeline = this.redis.pipeline();

    entries.forEach(([key, value, ttl = 300]) => {
      pipeline.setex(key, ttl, JSON.stringify(value));
    });

    await pipeline.exec();
  }

  // Cache warming for frequently accessed data
  async warmCache(integrationId: string): Promise<void> {
    try {
      // Pre-load frequently accessed data
      const promises = [
        this.warmProviderCache(integrationId),
        this.warmFieldMappingsCache(integrationId),
        this.warmSyncHistoryCache(integrationId),
      ];

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Cache warming failed:', error);
    }
  }

  private async warmProviderCache(integrationId: string): Promise<void> {
    // Implementation depends on specific provider data
  }

  private async warmFieldMappingsCache(integrationId: string): Promise<void> {
    // Pre-load field mappings
  }

  private async warmSyncHistoryCache(integrationId: string): Promise<void> {
    // Pre-load recent sync history
  }

  private cleanupLocalCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.localCache.entries()) {
      if (entry.expires <= now) {
        this.localCache.delete(key);
      }
    }
  }

  // Generate cache keys with consistent hashing
  generateKey(...parts: string[]): string {
    const combined = parts.join(':');
    return createHash('md5').update(combined).digest('hex');
  }

  // Delete cache entries by pattern
  async deleteByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      // Also clear from local cache
      for (const [key] of this.localCache) {
        if (key.includes(pattern.replace('*', ''))) {
          this.localCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Error deleting cache by pattern:', error);
    }
  }

  // Cache statistics
  getCacheStats(): {
    localCacheSize: number;
    redisConnected: boolean;
  } {
    return {
      localCacheSize: this.localCache.size,
      redisConnected: this.redis.status === 'ready',
    };
  }

  async disconnect(): Promise<void> {
    this.redis.disconnect();
    this.localCache.clear();
  }
}
