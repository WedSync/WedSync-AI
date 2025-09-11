/**
 * WS-155: Rate Limiting Middleware
 * Integration with Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedRateLimiter } from '../lib/ratelimit/advanced-rate-limiter';

export async function rateLimitMiddleware(
  req: NextRequest,
  rateLimitKey: string,
): Promise<NextResponse | null> {
  try {
    const result = await advancedRateLimiter.checkRateLimit(rateLimitKey, req);

    if (!result.success) {
      const response = NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: result.reason || 'Too many requests',
          retryAfter: result.retryAfter,
        },
        {
          status: result.blocked ? 429 : 429,
        },
      );

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set(
        'X-RateLimit-Remaining',
        result.remaining.toString(),
      );
      response.headers.set('X-RateLimit-Reset', result.reset.toISOString());

      if (result.retryAfter) {
        response.headers.set('Retry-After', result.retryAfter.toString());
      }

      return response;
    }

    // Add success headers for rate limit info
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.reset.toISOString());

    return null; // Continue to next middleware/handler
  } catch (error) {
    console.error('Rate limit middleware error:', error);
    // Don't block on rate limiter errors
    return null;
  }
}

// Route-specific rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  'communications/messages/send': 'messages:send',
  'communications/messages/bulk': 'messages:bulk',
  'communications/messages/template': 'messages:template',
  'communications/compliance': 'compliance:check',
  'api/global': 'api:global',
} as const;
