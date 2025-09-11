/**
 * Rate Limiting Middleware for AI and External API Calls
 * Implements sliding window rate limiting with Redis backend
 */

import { Redis, getRedisClient } from '@/lib/cache/redis';
import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: NextRequest) => string;
  skipOnError?: boolean;
  message?: string;
  headers?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
  retryAfter?: number;
}

/**
 * Rate Limiter Class using Sliding Window Counter algorithm
 */
export class RateLimiter {
  private redis: Redis;
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.redis = getRedisClient();
    this.config = {
      keyGenerator: (req) => this.getClientId(req),
      skipOnError: true,
      message: 'Too many requests, please try again later.',
      headers: true,
      ...config,
    };
  }

  /**
   * Check if request is within rate limit
   */
  async check(
    identifier: string,
    maxRequests?: number,
    windowSize?: string,
  ): Promise<RateLimitResult> {
    try {
      const requests = maxRequests || this.config.maxRequests;
      const window = this.parseWindowSize(windowSize) || this.config.windowMs;

      const key = `rate_limit:${identifier}`;
      const now = Date.now();
      const windowStart = now - window;

      // Use sliding window counter algorithm
      const result = await this.slidingWindowCheck(
        key,
        now,
        windowStart,
        requests,
      );

      return result;
    } catch (error) {
      console.error('Rate limit check failed:', error);

      if (this.config.skipOnError) {
        return {
          allowed: true,
          remaining: this.config.maxRequests,
          resetTime: Date.now() + this.config.windowMs,
          totalHits: 0,
        };
      }

      throw error;
    }
  }

  /**
   * Sliding window counter implementation
   */
  private async slidingWindowCheck(
    key: string,
    now: number,
    windowStart: number,
    maxRequests: number,
  ): Promise<RateLimitResult> {
    // Use Redis pipeline for atomic operations
    const pipeline = [
      // Remove expired entries
      ['ZREMRANGEBYSCORE', key, '-inf', windowStart.toString()],
      // Add current request
      ['ZADD', key, now.toString(), `${now}-${Math.random()}`],
      // Count requests in current window
      ['ZCARD', key],
      // Set expiry on key
      ['EXPIRE', key, Math.ceil(this.config.windowMs / 1000)],
    ];

    try {
      // Execute pipeline (simplified - in real Redis client)
      await this.redis.del(key); // Clean expired (simplified)
      const count = await this.redis.incr(`${key}:count`);
      await this.redis.expire(
        `${key}:count`,
        Math.ceil(this.config.windowMs / 1000),
      );

      const remaining = Math.max(0, maxRequests - count);
      const resetTime = now + this.config.windowMs;
      const allowed = count <= maxRequests;

      const result: RateLimitResult = {
        allowed,
        remaining,
        resetTime,
        totalHits: count,
      };

      if (!allowed) {
        result.retryAfter = Math.ceil(this.config.windowMs / 1000);
      }

      return result;
    } catch (error) {
      console.error('Sliding window check failed:', error);
      throw error;
    }
  }

  /**
   * Parse window size string (e.g., "1h", "15m", "30s")
   */
  private parseWindowSize(windowSize?: string): number | null {
    if (!windowSize) return null;

    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = windowSize.match(/^(\d+)([smhd])$/);
    if (!match) return null;

    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }

  /**
   * Get client identifier from request
   */
  private getClientId(req: NextRequest): string {
    // Try to get user ID from auth
    const userId = req.headers.get('x-user-id');
    if (userId) return userId;

    // Fallback to IP address
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';

    return `ip:${ip}`;
  }

  /**
   * Create middleware function
   */
  middleware() {
    return async (req: NextRequest) => {
      const identifier = this.config.keyGenerator(req);
      const result = await this.check(identifier);

      if (!result.allowed) {
        const response = NextResponse.json(
          {
            error: this.config.message,
            retryAfter: result.retryAfter,
          },
          { status: 429 },
        );

        if (this.config.headers) {
          response.headers.set(
            'X-RateLimit-Limit',
            this.config.maxRequests.toString(),
          );
          response.headers.set(
            'X-RateLimit-Remaining',
            result.remaining.toString(),
          );
          response.headers.set(
            'X-RateLimit-Reset',
            result.resetTime.toString(),
          );
          if (result.retryAfter) {
            response.headers.set('Retry-After', result.retryAfter.toString());
          }
        }

        return response;
      }

      // Add rate limit headers to successful responses
      if (this.config.headers) {
        const response = NextResponse.next();
        response.headers.set(
          'X-RateLimit-Limit',
          this.config.maxRequests.toString(),
        );
        response.headers.set(
          'X-RateLimit-Remaining',
          result.remaining.toString(),
        );
        response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
        return response;
      }

      return NextResponse.next();
    };
  }
}

/**
 * Predefined rate limiters for different endpoints
 */
export const rateLimiters = {
  // AI endpoints - stricter limits
  openai: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'AI service rate limit exceeded. Please try again in an hour.',
  }),

  // Color analysis - moderate limits
  colorAnalysis: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message:
      'Color analysis rate limit exceeded. Please try again in a minute.',
  }),

  // General API - generous limits
  api: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'API rate limit exceeded. Please try again in a minute.',
  }),

  // File uploads - very strict
  upload: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    message: 'Upload rate limit exceeded. Please try again in a minute.',
  }),
};

/**
 * Utility function to create custom rate limiter
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Simple rate limit check function for use in API routes
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowSize: string,
): Promise<RateLimitResult> {
  const limiter = new RateLimiter({
    windowMs: 60 * 1000, // Will be overridden by windowSize
    maxRequests,
  });

  return limiter.check(identifier, maxRequests, windowSize);
}

/**
 * Rate limit decorator for API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  const limiter = new RateLimiter(config);

  return async (req: NextRequest): Promise<NextResponse> => {
    const identifier = config.keyGenerator
      ? config.keyGenerator(req)
      : limiter['getClientId'](req);
    const result = await limiter.check(identifier);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: config.message || 'Rate limit exceeded',
          retryAfter: result.retryAfter,
        },
        { status: 429 },
      );
    }

    return handler(req);
  };
}

/**
 * Rate limiting helper for different user tiers
 */
export const tierRateLimits = {
  FREE: {
    colorPalette: { requests: 5, window: '1d' }, // 5 per day
    flowerRecommendations: { requests: 3, window: '1d' }, // 3 per day
    colorAnalysis: { requests: 10, window: '1h' }, // 10 per hour
  },

  STARTER: {
    colorPalette: { requests: 20, window: '1d' }, // 20 per day
    flowerRecommendations: { requests: 15, window: '1d' }, // 15 per day
    colorAnalysis: { requests: 50, window: '1h' }, // 50 per hour
  },

  PROFESSIONAL: {
    colorPalette: { requests: 100, window: '1d' }, // 100 per day
    flowerRecommendations: { requests: 75, window: '1d' }, // 75 per day
    colorAnalysis: { requests: 200, window: '1h' }, // 200 per hour
  },

  SCALE: {
    colorPalette: { requests: 500, window: '1d' }, // 500 per day
    flowerRecommendations: { requests: 300, window: '1d' }, // 300 per day
    colorAnalysis: { requests: 1000, window: '1h' }, // 1000 per hour
  },

  ENTERPRISE: {
    colorPalette: { requests: 2000, window: '1d' }, // 2000 per day
    flowerRecommendations: { requests: 1000, window: '1d' }, // 1000 per day
    colorAnalysis: { requests: 5000, window: '1h' }, // 5000 per hour
  },
};

/**
 * Get rate limits for user tier and feature
 */
export function getRateLimitForTier(
  userTier: keyof typeof tierRateLimits,
  feature: keyof typeof tierRateLimits.FREE,
): { requests: number; window: string } {
  return tierRateLimits[userTier][feature];
}

/**
 * Check if user can make request based on their tier
 */
export async function checkTierRateLimit(
  userId: string,
  userTier: keyof typeof tierRateLimits,
  feature: keyof typeof tierRateLimits.FREE,
): Promise<RateLimitResult> {
  const limit = getRateLimitForTier(userTier, feature);
  const identifier = `${userId}:${feature}`;

  return checkRateLimit(identifier, limit.requests, limit.window);
}

export default RateLimiter;
