/**
 * Rate Limiting Middleware for WS-167 Trial Management System
 * Prevents API abuse and DDoS attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: NextRequest) => string;
}

class RateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async checkRateLimit(request: NextRequest): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    error?: string;
  }> {
    try {
      const key = this.config.keyGenerator
        ? this.config.keyGenerator(request)
        : this.getDefaultKey(request);

      const current = await this.redis.get(key);
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      // Clean up old entries and count current requests
      const requests = current ? JSON.parse(current) : [];
      const validRequests = requests.filter(
        (timestamp: number) => timestamp > windowStart,
      );

      if (validRequests.length >= this.config.maxRequests) {
        const oldestRequest = Math.min(...validRequests);
        const resetTime = oldestRequest + this.config.windowMs;

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          error: `Rate limit exceeded. Try again at ${new Date(resetTime).toISOString()}`,
        };
      }

      // Add current request
      validRequests.push(now);
      await this.redis.setex(
        key,
        Math.ceil(this.config.windowMs / 1000),
        JSON.stringify(validRequests),
      );

      return {
        allowed: true,
        remaining: this.config.maxRequests - validRequests.length,
        resetTime: now + this.config.windowMs,
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: Date.now() + this.config.windowMs,
      };
    }
  }

  private getDefaultKey(request: NextRequest): string {
    const url = new URL(request.url);
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Combine IP and endpoint for more granular rate limiting
    return `rate_limit:${ip}:${url.pathname}`;
  }
}

// Rate limit configurations for different endpoint types
export const trialApiLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes per IP
});

export const trialStartLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // Maximum 5 trial creations per hour per IP
});

export const trialStatusLimiter = new RateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 30, // 30 status checks per minute per IP
});

// Middleware wrapper for API routes
export function withRateLimit(limiter: RateLimiter) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse>,
  ): Promise<NextResponse> {
    const result = await limiter.checkRateLimit(request);

    if (!result.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: result.error,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (result.resetTime - Date.now()) / 1000,
            ).toString(),
            'X-RateLimit-Limit': limiter['config'].maxRequests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          },
        },
      );
    }

    const response = await handler(request);

    // Add rate limit headers to successful responses
    response.headers.set(
      'X-RateLimit-Limit',
      limiter['config'].maxRequests.toString(),
    );
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set(
      'X-RateLimit-Reset',
      new Date(result.resetTime).toISOString(),
    );

    return response;
  };
}

export default RateLimiter;
