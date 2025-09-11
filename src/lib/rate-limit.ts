/**
 * WS-199 Rate Limiting System for Wedding Industry
 * Comprehensive rate limiting with wedding season awareness, subscription tiers, and vendor-specific limits
 */

import { NextRequest } from 'next/server';
import Redis from 'ioredis';

// Types and Interfaces
export type SubscriptionTier =
  | 'FREE'
  | 'STARTER'
  | 'PROFESSIONAL'
  | 'SCALE'
  | 'ENTERPRISE';
export type VendorType =
  | 'photographer'
  | 'venue'
  | 'planner'
  | 'florist'
  | 'caterer'
  | 'other';

export interface RateLimitConfig {
  requests: number;
  window: number; // milliseconds
  burst?: number;
  tier: SubscriptionTier;
  vendorType?: VendorType;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfter?: number;
  tier: SubscriptionTier;
  isWeddingSeasonActive?: boolean;
  isSaturdayBoostActive?: boolean;
}

export interface RateLimitMetrics {
  totalRequests: number;
  successfulRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  peakRequestsPerMinute: number;
}

// Subscription tier limits (requests per minute)
const TIER_LIMITS: Record<
  SubscriptionTier,
  { requests: number; burst: number; uploadMB: number }
> = {
  FREE: { requests: 30, burst: 45, uploadMB: 50 },
  STARTER: { requests: 60, burst: 90, uploadMB: 200 },
  PROFESSIONAL: { requests: 120, burst: 180, uploadMB: 1024 },
  SCALE: { requests: 300, burst: 450, uploadMB: 5120 },
  ENTERPRISE: { requests: 1000, burst: 1500, uploadMB: 51200 },
};

// Vendor-specific multipliers
const VENDOR_MULTIPLIERS: Record<VendorType, number> = {
  photographer: 1.2, // Extra capacity for photo uploads
  venue: 1.0,
  planner: 1.1, // Extra for coordination activities
  florist: 0.9,
  caterer: 0.9,
  other: 1.0,
};

// Wedding season multipliers (May-September)
const WEDDING_SEASON_MULTIPLIER = 2.0;
const SATURDAY_BOOST_MULTIPLIER = 2.5;

export class RateLimiter {
  private store = new Map<
    string,
    { count: number; resetTime: number; burst: number }
  >();
  private redis?: Redis;
  private metrics = new Map<string, RateLimitMetrics>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(redisUrl?: string) {
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        family: 4,
        keepAlive: 30000,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
      });
    }

    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  async checkLimit(
    identifier: string,
    config: RateLimitConfig,
    request?: NextRequest,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / config.window) * config.window;
    const key = `${identifier}:${windowStart}`;

    // Calculate effective limits with multipliers
    const effectiveLimits = this.calculateEffectiveLimits(config, now);

    try {
      if (this.redis) {
        return await this.checkLimitRedis(
          key,
          effectiveLimits,
          config.tier,
          now,
        );
      } else {
        return await this.checkLimitMemory(
          key,
          effectiveLimits,
          config.tier,
          now,
        );
      }
    } catch (error) {
      // Fallback to memory if Redis fails
      console.warn(
        'Rate limiter Redis failure, falling back to memory:',
        error,
      );
      return await this.checkLimitMemory(
        key,
        effectiveLimits,
        config.tier,
        now,
      );
    }
  }

  private calculateEffectiveLimits(config: RateLimitConfig, now: number) {
    const baseLimits = TIER_LIMITS[config.tier];
    let multiplier = 1.0;

    // Apply vendor-specific multiplier
    if (config.vendorType) {
      multiplier *= VENDOR_MULTIPLIERS[config.vendorType];
    }

    // Apply wedding season multiplier (May-September)
    if (this.isWeddingSeason(now)) {
      multiplier *= WEDDING_SEASON_MULTIPLIER;
    }

    // Apply Saturday boost (8-11 AM Saturday)
    if (this.isSaturdayBoost(now)) {
      multiplier *= SATURDAY_BOOST_MULTIPLIER;
    }

    return {
      requests: Math.floor(baseLimits.requests * multiplier),
      burst: Math.floor(baseLimits.burst * multiplier),
      uploadMB: baseLimits.uploadMB,
    };
  }

  private isWeddingSeason(timestamp: number): boolean {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1; // 1-based month
    return month >= 5 && month <= 9; // May through September
  }

  private isSaturdayBoost(timestamp: number): boolean {
    const date = new Date(timestamp);
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = date.getHours();
    return day === 6 && hour >= 8 && hour <= 11; // Saturday 8-11 AM
  }

  private async checkLimitRedis(
    key: string,
    limits: { requests: number; burst: number },
    tier: SubscriptionTier,
    now: number,
  ): Promise<RateLimitResult> {
    if (!this.redis) throw new Error('Redis not available');

    const current = await this.redis.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= limits.requests) {
      // Check if burst capacity is available
      const burstKey = `${key}:burst`;
      const burstCount = await this.redis.get(burstKey);
      const currentBurst = burstCount ? parseInt(burstCount) : 0;

      if (currentBurst >= limits.burst) {
        const ttl = await this.redis.ttl(key);
        return {
          success: false,
          remaining: 0,
          retryAfter: Math.max(ttl, 1),
          tier,
          isWeddingSeasonActive: this.isWeddingSeason(now),
          isSaturdayBoostActive: this.isSaturdayBoost(now),
        };
      }

      // Use burst capacity
      await this.redis.incr(burstKey);
      await this.redis.expire(burstKey, 60); // Burst resets every minute
    }

    // Increment main counter
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 60); // 1 minute window
    await pipeline.exec();

    return {
      success: true,
      remaining: Math.max(0, limits.requests - count - 1),
      tier,
      isWeddingSeasonActive: this.isWeddingSeason(now),
      isSaturdayBoostActive: this.isSaturdayBoost(now),
    };
  }

  private async checkLimitMemory(
    key: string,
    limits: { requests: number; burst: number },
    tier: SubscriptionTier,
    now: number,
  ): Promise<RateLimitResult> {
    const current = this.store.get(key);

    if (!current) {
      this.store.set(key, {
        count: 1,
        resetTime: now + 60000, // 1 minute
        burst: 0,
      });

      return {
        success: true,
        remaining: limits.requests - 1,
        tier,
        isWeddingSeasonActive: this.isWeddingSeason(now),
        isSaturdayBoostActive: this.isSaturdayBoost(now),
      };
    }

    if (current.count >= limits.requests) {
      // Check burst capacity
      if (current.burst >= limits.burst) {
        const retryAfter = Math.ceil((current.resetTime - now) / 1000);
        return {
          success: false,
          remaining: 0,
          retryAfter: Math.max(retryAfter, 1),
          tier,
          isWeddingSeasonActive: this.isWeddingSeason(now),
          isSaturdayBoostActive: this.isSaturdayBoost(now),
        };
      }

      // Use burst capacity
      current.burst++;
    } else {
      current.count++;
    }

    return {
      success: true,
      remaining: Math.max(0, limits.requests - current.count),
      tier,
      isWeddingSeasonActive: this.isWeddingSeason(now),
      isSaturdayBoostActive: this.isSaturdayBoost(now),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }

  async getMetrics(identifier: string): Promise<RateLimitMetrics | null> {
    return this.metrics.get(identifier) || null;
  }

  async resetLimits(identifier: string): Promise<void> {
    if (this.redis) {
      const keys = await this.redis.keys(`${identifier}:*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } else {
      for (const key of this.store.keys()) {
        if (key.startsWith(`${identifier}:`)) {
          this.store.delete(key);
        }
      }
    }
  }

  public isCleanupInProgress(): boolean {
    // Simple implementation - in a real system this would track cleanup state
    return false;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.redis) {
      this.redis.disconnect();
    }
    this.store.clear();
  }
}

// Legacy function for backward compatibility
export async function rateLimit(
  request: NextRequest,
  identifier: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const rateLimiter = new RateLimiter();
  const result = await rateLimiter.checkLimit(identifier, config, request);
  rateLimiter.destroy();
  return result;
}

// Default instance for simple usage
export const defaultRateLimiter = new RateLimiter();

// Rate limit service for API endpoints
export const rateLimitService = {
  async checkLimit(
    identifier: string,
    requests: number,
    window: number,
  ): Promise<boolean> {
    const config = {
      requests,
      window: window * 1000, // Convert seconds to milliseconds
      tier: 'PROFESSIONAL' as SubscriptionTier,
    };

    const result = await defaultRateLimiter.checkLimit(identifier, config);
    return result.success;
  },

  async resetLimits(identifier: string): Promise<void> {
    return defaultRateLimiter.resetLimits(identifier);
  },
};
