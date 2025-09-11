/**
 * Production-grade rate limiting for Wedding Platform
 * Handles peak season traffic and prevents abuse
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  onLimitReached?: (req: NextRequest) => void;
  weddingSeasonMultiplier?: number; // Adjust limits during peak season
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

class WeddingRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  private isWeddingSeason(): boolean {
    const month = new Date().getMonth() + 1; // 1-12
    // Peak wedding season: May through October
    return month >= 5 && month <= 10;
  }

  private getClientKey(
    req: NextRequest,
    keyGenerator?: (req: NextRequest) => string,
  ): string {
    if (keyGenerator) {
      return keyGenerator(req);
    }

    // Try to get the real IP address
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || req.ip || 'unknown';

    // Include user agent for additional fingerprinting
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const userAgentHash = this.simpleHash(userAgent);

    return `${ip}:${userAgentHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async checkLimit(
    req: NextRequest,
    config: RateLimitConfig,
  ): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const key = this.getClientKey(req, config.keyGenerator);
    const now = Date.now();

    // Adjust limits for wedding season
    let maxRequests = config.maxRequests;
    if (this.isWeddingSeason() && config.weddingSeasonMultiplier) {
      maxRequests = Math.floor(maxRequests * config.weddingSeasonMultiplier);
    }

    let entry = this.store.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired entry
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now,
      };
      this.store.set(key, entry);

      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        resetTime: entry.resetTime,
      };
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      if (config.onLimitReached) {
        config.onLimitReached(req);
      }

      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter,
      };
    }

    // Increment counter
    entry.count++;

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  // Wedding-specific rate limit presets
  static weddingLimits = {
    // API endpoints for client/vendor management
    clientApi: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      weddingSeasonMultiplier: 1.5, // 50% increase during peak season
    } as RateLimitConfig,

    // Form submissions (can be high volume during consultations)
    formSubmission: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 20,
      weddingSeasonMultiplier: 2.0, // Double during peak season
    } as RateLimitConfig,

    // File uploads (wedding photos, contracts)
    fileUpload: {
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxRequests: 50,
      weddingSeasonMultiplier: 1.2, // Slight increase for peak season
    } as RateLimitConfig,

    // Authentication endpoints
    auth: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 10,
      weddingSeasonMultiplier: 1.0, // No increase - security priority
    } as RateLimitConfig,

    // Email/SMS notifications
    notifications: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 200,
      weddingSeasonMultiplier: 3.0, // Triple during peak season
    } as RateLimitConfig,

    // Payment processing
    payment: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 5,
      weddingSeasonMultiplier: 1.0, // No increase - financial security
    } as RateLimitConfig,

    // General API access
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
      weddingSeasonMultiplier: 1.3, // 30% increase during peak season
    } as RateLimitConfig,
  };

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Global rate limiter instance
const globalRateLimiter = new WeddingRateLimiter();

// Middleware function for Next.js API routes
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    const result = await globalRateLimiter.checkLimit(req, config);

    if (!result.success) {
      // Rate limit exceeded
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.retryAfter,
          weddingContext: globalRateLimiter.isWeddingSeason()
            ? 'High traffic during wedding season - please be patient'
            : 'Please space out your requests',
        },
        { status: 429 },
      );

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set(
        'X-RateLimit-Remaining',
        result.remaining.toString(),
      );
      response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
      response.headers.set('Retry-After', result.retryAfter!.toString());

      return response;
    }

    return null; // Continue to next middleware/handler
  };
}

// Helper function to add rate limit headers to successful responses
export function addRateLimitHeaders(
  response: NextResponse,
  result: {
    limit: number;
    remaining: number;
    resetTime: number;
  },
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.resetTime.toString());

  return response;
}

// Wedding season detection utility
export function isWeddingSeason(): boolean {
  const month = new Date().getMonth() + 1;
  return month >= 5 && month <= 10;
}

// Pre-configured rate limiters for common endpoints
export const weddingRateLimiters = {
  clientApi: createRateLimitMiddleware(
    WeddingRateLimiter.weddingLimits.clientApi,
  ),
  formSubmission: createRateLimitMiddleware(
    WeddingRateLimiter.weddingLimits.formSubmission,
  ),
  fileUpload: createRateLimitMiddleware(
    WeddingRateLimiter.weddingLimits.fileUpload,
  ),
  auth: createRateLimitMiddleware(WeddingRateLimiter.weddingLimits.auth),
  notifications: createRateLimitMiddleware(
    WeddingRateLimiter.weddingLimits.notifications,
  ),
  payment: createRateLimitMiddleware(WeddingRateLimiter.weddingLimits.payment),
  general: createRateLimitMiddleware(WeddingRateLimiter.weddingLimits.general),
};

// Example usage in API route:
/*
import { weddingRateLimiters } from '@/lib/api/rate-limiter'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await weddingRateLimiters.clientApi(request)
  if (rateLimitResponse) {
    return rateLimitResponse // Rate limit exceeded
  }
  
  // Continue with normal API logic
  // ...
}
*/

export default globalRateLimiter;
