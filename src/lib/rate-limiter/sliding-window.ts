/**
 * Sliding Window Rate Limiter Implementation
 * High-performance Redis-based sliding window counter with atomic operations
 */

import { RedisRateLimitOperationsFallback } from '@/lib/redis-fallback';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';
import type {
  RateLimitResult,
  RateLimitTier,
  SlidingWindowCounter,
} from '@/types/rate-limit';

export interface SlidingWindowOptions {
  windowMs: number;
  maxRequests: number;
  tier: RateLimitTier;
  keyPrefix?: string;
  precision?: number; // Number of buckets per window (default: 10)
}

export class SlidingWindowRateLimiter {
  private redis: any; // Will be RedisRateLimitOperations | RedisRateLimitOperationsFallback
  private options: SlidingWindowOptions;
  private usingFallback: boolean = false;

  constructor(options: SlidingWindowOptions) {
    this.options = {
      keyPrefix: 'rl:sw:',
      precision: 10,
      ...options,
    };

    // Always use fallback in development or when Redis URL is not provided
    if (process.env.NODE_ENV === 'development' || !process.env.REDIS_URL) {
      logger.info('Using Redis fallback for rate limiting (development mode)');
      this.redis = new RedisRateLimitOperationsFallback();
      this.usingFallback = true;
    } else {
      // Dynamically import Redis only in production with Redis URL
      try {
        const RedisModule = require('@/lib/redis');
        this.redis = new RedisModule.RedisRateLimitOperations();
        this.usingFallback = false;
      } catch (error) {
        logger.warn('Redis not available, using fallback for rate limiting', {
          error: error instanceof Error ? error.message : String(error),
        });
        this.redis = new RedisRateLimitOperationsFallback();
        this.usingFallback = true;
      }
    }
  }

  /**
   * Check if request is allowed under sliding window limits
   */
  async checkLimit(
    identifier: string,
    now: number = Date.now(),
  ): Promise<RateLimitResult> {
    const startTime = Date.now();

    try {
      const key = `${this.options.keyPrefix}${this.options.tier}:${identifier}`;

      // Check for overrides first
      const override = await this.redis.getOverride(key);
      const config = override || {
        limit: this.options.maxRequests,
        windowMs: this.options.windowMs,
      };

      // Use high-precision sliding window with atomic operations
      const result = await this.checkSlidingWindowAtomic(
        key,
        config.windowMs,
        config.limit,
        now,
      );

      const resetTime = this.calculateResetTime(now, config.windowMs);

      const rateLimitResult: RateLimitResult = {
        allowed: result.allowed,
        limit: config.limit,
        remaining: result.remaining,
        resetTime,
        tier: this.options.tier,
        key: identifier,
        windowMs: config.windowMs,
      };

      // Add retry-after header for blocked requests
      if (!result.allowed) {
        rateLimitResult.retryAfter = Math.ceil((resetTime - now) / 1000);
      }

      // Record metrics
      this.recordMetrics(rateLimitResult, Date.now() - startTime);

      return rateLimitResult;
    } catch (error) {
      logger.error('Sliding window rate limit check failed', error as Error, {
        identifier,
        tier: this.options.tier,
        windowMs: this.options.windowMs,
        maxRequests: this.options.maxRequests,
      });

      // Fail open for availability
      return {
        allowed: true,
        limit: this.options.maxRequests,
        remaining: this.options.maxRequests,
        resetTime: now + this.options.windowMs,
        tier: this.options.tier,
        key: identifier,
        windowMs: this.options.windowMs,
      };
    }
  }

  /**
   * Atomic sliding window check using Lua script for consistency
   */
  private async checkSlidingWindowAtomic(
    key: string,
    windowMs: number,
    limit: number,
    now: number,
  ): Promise<{ current: number; remaining: number; allowed: boolean }> {
    // Use high-precision buckets for smoother rate limiting
    const bucketSize = Math.floor(windowMs / (this.options.precision || 10));
    const currentBucket = Math.floor(now / bucketSize);
    const bucketKey = `${key}:${currentBucket}`;

    const luaScript = `
      local key_prefix = KEYS[1]
      local window_ms = tonumber(ARGV[1])
      local limit = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local bucket_size = tonumber(ARGV[4])
      local precision = tonumber(ARGV[5])
      
      local current_bucket = math.floor(now / bucket_size)
      local total_requests = 0
      local buckets_to_check = {}
      
      -- Calculate which buckets are within the window
      for i = 0, precision - 1 do
        local bucket_time = current_bucket - i
        local bucket_key = key_prefix .. ":" .. bucket_time
        table.insert(buckets_to_check, bucket_key)
        
        -- Only count buckets that are within the window
        local bucket_start_time = bucket_time * bucket_size
        if now - bucket_start_time < window_ms then
          local bucket_count = redis.call('GET', bucket_key)
          if bucket_count then
            total_requests = total_requests + tonumber(bucket_count)
          end
        end
      end
      
      -- Check if we can allow this request
      if total_requests < limit then
        -- Increment current bucket
        local current_bucket_key = key_prefix .. ":" .. current_bucket
        local new_count = redis.call('INCR', current_bucket_key)
        
        -- Set expiry on the bucket (longer than window to handle clock skew)
        redis.call('EXPIRE', current_bucket_key, math.ceil(window_ms / 1000) + 60)
        
        -- Clean up old buckets (optional, for memory efficiency)
        for i = precision, precision + 5 do
          local old_bucket = current_bucket - i
          local old_key = key_prefix .. ":" .. old_bucket
          redis.call('DEL', old_key)
        end
        
        return {total_requests + 1, limit - total_requests - 1, 1}
      else
        return {total_requests, 0, 0}
      end
    `;

    try {
      let result: [number, number, number];

      if (this.usingFallback) {
        // Use fallback method for in-memory store
        const fallbackResult = await this.redis.checkSlidingWindow(
          key,
          windowMs,
          limit,
          now,
        );
        result = [
          fallbackResult.current,
          fallbackResult.remaining,
          fallbackResult.allowed ? 1 : 0,
        ];
      } else {
        result = (await this.redis
          .getClient()
          .eval(
            luaScript,
            1,
            key,
            windowMs.toString(),
            limit.toString(),
            now.toString(),
            bucketSize.toString(),
            (this.options.precision || 10).toString(),
          )) as [number, number, number];
      }

      const [current, remaining, allowed] = result;

      return {
        current,
        remaining,
        allowed: allowed === 1,
      };
    } catch (error) {
      // Fallback to simple sliding window if Lua script fails
      logger.warn('Lua script failed, using fallback sliding window', error);
      return await this.redis.checkSlidingWindow(key, windowMs, limit, now);
    }
  }

  /**
   * Get current window status without incrementing
   */
  async getWindowStatus(
    identifier: string,
    now: number = Date.now(),
  ): Promise<SlidingWindowCounter> {
    const key = `${this.options.keyPrefix}${this.options.tier}:${identifier}`;

    try {
      const override = await this.redis.getOverride(key);
      const config = override || {
        limit: this.options.maxRequests,
        windowMs: this.options.windowMs,
      };

      const current = await this.redis.getCurrentCount(
        key,
        config.windowMs,
        now,
      );
      const resetTime = this.calculateResetTime(now, config.windowMs);

      return {
        key: identifier,
        windowMs: config.windowMs,
        limit: config.limit,
        current,
        remaining: Math.max(0, config.limit - current),
        resetTime,
        timestamps: [], // Would need additional Redis call to get all timestamps
      };
    } catch (error) {
      logger.error('Failed to get window status', error as Error, {
        identifier,
      });

      return {
        key: identifier,
        windowMs: this.options.windowMs,
        limit: this.options.maxRequests,
        current: 0,
        remaining: this.options.maxRequests,
        resetTime: now + this.options.windowMs,
        timestamps: [],
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  async resetLimit(identifier: string): Promise<void> {
    const key = `${this.options.keyPrefix}${this.options.tier}:${identifier}`;

    try {
      // Delete all bucket keys for this identifier
      const bucketSize = Math.floor(
        this.options.windowMs / (this.options.precision || 10),
      );
      const now = Date.now();
      const currentBucket = Math.floor(now / bucketSize);

      const keysToDelete = [];
      for (let i = 0; i < (this.options.precision || 10) + 5; i++) {
        const bucketKey = `${key}:${currentBucket - i}`;
        keysToDelete.push(bucketKey);
      }

      if (keysToDelete.length > 0) {
        if (this.usingFallback) {
          // Fallback doesn't need bucket-based deletion, just delete the key
          await this.redis.resetLimit(key);
        } else {
          await this.redis.getClient().del(...keysToDelete);
        }
      }

      // Also delete any overrides
      await this.redis.deleteOverride(key);

      logger.info('Rate limit reset successfully', {
        identifier,
        tier: this.options.tier,
        keysDeleted: keysToDelete.length,
      });
    } catch (error) {
      logger.error('Failed to reset rate limit', error as Error, {
        identifier,
        tier: this.options.tier,
      });
    }
  }

  /**
   * Set a temporary override for this rate limiter
   */
  async setOverride(
    identifier: string,
    newLimit: number,
    newWindowMs?: number,
  ): Promise<void> {
    const key = `${this.options.keyPrefix}${this.options.tier}:${identifier}`;
    const windowMs = newWindowMs || this.options.windowMs;

    try {
      await this.redis.setOverride(key, newLimit, windowMs);

      logger.info('Rate limit override set', {
        identifier,
        tier: this.options.tier,
        newLimit,
        windowMs,
      });
    } catch (error) {
      logger.error('Failed to set rate limit override', error as Error, {
        identifier,
        tier: this.options.tier,
        newLimit,
        windowMs,
      });
    }
  }

  /**
   * Calculate next reset time based on sliding window
   */
  private calculateResetTime(now: number, windowMs: number): number {
    // For sliding window, the reset time is when the oldest request expires
    // This is approximately now + windowMs, but can be more precise with bucket tracking
    const bucketSize = Math.floor(windowMs / (this.options.precision || 10));
    const currentBucket = Math.floor(now / bucketSize);
    const nextBucketStart = (currentBucket + 1) * bucketSize;

    return Math.min(now + windowMs, nextBucketStart + windowMs);
  }

  /**
   * Record metrics for monitoring and analytics
   */
  private recordMetrics(result: RateLimitResult, processingTime: number): void {
    const labels = {
      tier: result.tier,
      allowed: result.allowed.toString(),
      key_type: this.getKeyType(result.key),
    };

    metrics.incrementCounter('rate_limit.requests', 1, labels);

    if (!result.allowed) {
      metrics.incrementCounter('rate_limit.blocked', 1, labels);
    }

    metrics.recordHistogram('rate_limit.processing_time', processingTime, {
      tier: result.tier,
    });

    metrics.recordGauge('rate_limit.remaining', result.remaining, {
      tier: result.tier,
      key: this.hashKey(result.key), // Hash for privacy
    });

    metrics.recordGauge(
      'rate_limit.utilization',
      ((result.limit - result.remaining) / result.limit) * 100,
      { tier: result.tier },
    );
  }

  /**
   * Determine key type for metrics (preserving privacy)
   */
  private getKeyType(key: string): string {
    if (key.includes('@')) return 'user';
    if (key.includes('org_')) return 'organization';
    if (key.match(/^\d+\.\d+\.\d+\.\d+/)) return 'ip';
    return 'other';
  }

  /**
   * Hash sensitive keys for metrics
   */
  private hashKey(key: string): string {
    // Simple hash for metrics (don't use in production security contexts)
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}
