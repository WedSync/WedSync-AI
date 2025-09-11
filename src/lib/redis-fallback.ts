/**
 * Redis Fallback Implementation for Development/Testing
 * In-memory fallback when Redis is not available
 */

import { logger } from '@/lib/monitoring/structured-logger';

interface InMemoryStore {
  [key: string]: {
    value: any;
    expires?: number;
  };
}

interface SlidingWindowEntry {
  timestamp: number;
  id: string;
}

class InMemoryRateLimitStore {
  private store: InMemoryStore = {};
  private slidingWindows: { [key: string]: SlidingWindowEntry[] } = {};

  get(key: string): any {
    const item = this.store[key];
    if (!item) return null;

    if (item.expires && Date.now() > item.expires) {
      delete this.store[key];
      return null;
    }

    return item.value;
  }

  set(key: string, value: any, ttlSeconds?: number): void {
    this.store[key] = {
      value,
      expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    };
  }

  del(key: string): void {
    delete this.store[key];
    delete this.slidingWindows[key];
  }

  // Sliding window operations
  zremrangebyscore(
    key: string,
    min: string | number,
    max: string | number,
  ): number {
    if (!this.slidingWindows[key]) {
      this.slidingWindows[key] = [];
    }

    const minTime = min === '-inf' ? 0 : Number(min);
    const maxTime = max === '+inf' ? Infinity : Number(max);

    const beforeLength = this.slidingWindows[key].length;
    this.slidingWindows[key] = this.slidingWindows[key].filter(
      (entry) => !(entry.timestamp >= minTime && entry.timestamp <= maxTime),
    );

    return beforeLength - this.slidingWindows[key].length;
  }

  zadd(key: string, score: number, member: string): number {
    if (!this.slidingWindows[key]) {
      this.slidingWindows[key] = [];
    }

    // Check if member already exists
    const existingIndex = this.slidingWindows[key].findIndex(
      (entry) => entry.id === member,
    );
    if (existingIndex >= 0) {
      this.slidingWindows[key][existingIndex].timestamp = score;
      return 0; // Updated existing
    } else {
      this.slidingWindows[key].push({ timestamp: score, id: member });
      return 1; // Added new
    }
  }

  zcard(key: string): number {
    return this.slidingWindows[key]?.length || 0;
  }

  expire(key: string, seconds: number): void {
    // For sliding windows, set cleanup timer
    setTimeout(() => {
      delete this.slidingWindows[key];
    }, seconds * 1000);
  }

  // Simple eval for Lua scripts
  eval(script: string, numKeys: number, ...args: string[]): Promise<any> {
    // Parse basic sliding window script
    if (script.includes('ZREMRANGEBYSCORE') && script.includes('ZCARD')) {
      const key = args[0];
      const window = parseInt(args[1]);
      const limit = parseInt(args[2]);
      const now = parseInt(args[3]);

      // Remove expired entries
      this.zremrangebyscore(key, '-inf', now - window);

      // Get current count
      const current = this.zcard(key);

      if (current < limit) {
        // Add current request
        this.zadd(key, now, `${now}:${Math.random()}`);
        this.expire(key, Math.ceil(window / 1000));
        return Promise.resolve([current + 1, limit - current - 1]);
      } else {
        return Promise.resolve([current, 0]);
      }
    }

    // Default fallback
    return Promise.resolve([0, 100]);
  }

  ping(): Promise<string> {
    return Promise.resolve('PONG');
  }

  disconnect(): Promise<void> {
    this.store = {};
    this.slidingWindows = {};
    return Promise.resolve();
  }

  // Cleanup expired entries periodically
  startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      Object.keys(this.store).forEach((key) => {
        const item = this.store[key];
        if (item.expires && now > item.expires) {
          delete this.store[key];
        }
      });
    }, 60000); // Cleanup every minute
  }
}

class RedisFallbackManager {
  private inMemoryStore = new InMemoryRateLimitStore();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logger.warn('Using in-memory Redis fallback for development', {
      reason: 'Redis connection not available',
    });

    this.inMemoryStore.startCleanup();
    this.isInitialized = true;
  }

  getClient(): InMemoryRateLimitStore {
    if (!this.isInitialized) {
      throw new Error('Redis fallback not initialized');
    }
    return this.inMemoryStore;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.inMemoryStore.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async closeConnection(): Promise<void> {
    await this.inMemoryStore.disconnect();
    this.isInitialized = false;
  }
}

// Fallback Redis operations that work with the in-memory store
export class RedisRateLimitOperationsFallback {
  private client: InMemoryRateLimitStore;

  constructor() {
    const fallbackManager = new RedisFallbackManager();
    fallbackManager.initialize();
    this.client = fallbackManager.getClient();
  }

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

  getClient(): InMemoryRateLimitStore {
    return this.client;
  }

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
      logger.error('Fallback sliding window check failed', error as Error, {
        key,
      });
      // Fail open for availability
      return { current: 0, remaining: limit, allowed: true };
    }
  }

  async getCurrentCount(
    key: string,
    windowMs: number,
    now: number = Date.now(),
  ): Promise<number> {
    try {
      // Remove expired entries
      this.client.zremrangebyscore(key, '-inf', now - windowMs);
      // Get current count
      return this.client.zcard(key);
    } catch (error) {
      logger.error('Get current count failed (fallback)', error as Error, {
        key,
      });
      return 0;
    }
  }

  async resetLimit(key: string): Promise<void> {
    try {
      this.client.del(key);
    } catch (error) {
      logger.error('Reset limit failed (fallback)', error as Error, { key });
    }
  }

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
      this.client.set(
        overrideKey,
        JSON.stringify(overrideData),
        Math.ceil(windowMs / 1000),
      );
    } catch (error) {
      logger.error('Set override failed (fallback)', error as Error, { key });
    }
  }

  async getOverride(
    key: string,
  ): Promise<{ limit: number; windowMs: number } | null> {
    try {
      const overrideKey = `override:${key}`;
      const result = this.client.get(overrideKey);
      if (result) {
        const data = JSON.parse(result);
        return { limit: data.limit, windowMs: data.windowMs };
      }
      return null;
    } catch (error) {
      logger.error('Get override failed (fallback)', error as Error, { key });
      return null;
    }
  }

  async deleteOverride(key: string): Promise<void> {
    try {
      const overrideKey = `override:${key}`;
      this.client.del(overrideKey);
    } catch (error) {
      logger.error('Delete override failed (fallback)', error as Error, {
        key,
      });
    }
  }
}
