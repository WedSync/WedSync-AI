/**
 * Rate Limit Headers Utility
 * Standardized rate limit headers following RFC 6585 and draft-ietf-httpapi-ratelimit-headers
 */

import { NextResponse } from 'next/server';
import type {
  RateLimitResult,
  RateLimitHeaders,
  EnhancedRateLimitResult,
} from '@/types/rate-limit';

export class RateLimitHeadersManager {
  /**
   * Generate standard rate limit headers from rate limit result
   */
  static generateHeaders(
    result: RateLimitResult | EnhancedRateLimitResult,
  ): RateLimitHeaders {
    const resetTime = Math.ceil(result.resetTime / 1000); // Convert to Unix timestamp

    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': resetTime.toString(),
      'X-RateLimit-Tier': result.tier.toUpperCase(),
    };

    // Add Retry-After header for blocked requests
    if (!result.allowed && result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  }

  /**
   * Generate enhanced headers with multi-tier information
   */
  static generateEnhancedHeaders(
    result: EnhancedRateLimitResult,
  ): Record<string, string> {
    const baseHeaders = this.generateHeaders(result);

    const enhancedHeaders: Record<string, string> = {
      ...baseHeaders,
      'X-RateLimit-Applied-Tier': result.appliedTier.toUpperCase(),
    };

    // Add bypass information if applicable
    if (result.bypassReason) {
      enhancedHeaders['X-RateLimit-Bypass'] = result.bypassReason;
    }

    // Add tier-specific headers for debugging/monitoring
    Object.entries(result.allTiers).forEach(([tier, tierResult]) => {
      if (tierResult.limit > 0) {
        // Skip skipped tiers
        const tierPrefix = `X-RateLimit-${tier.toUpperCase()}`;
        enhancedHeaders[`${tierPrefix}-Limit`] = tierResult.limit.toString();
        enhancedHeaders[`${tierPrefix}-Remaining`] =
          tierResult.remaining.toString();
        enhancedHeaders[`${tierPrefix}-Reset`] = Math.ceil(
          tierResult.resetTime / 1000,
        ).toString();
      }
    });

    // Add window information
    enhancedHeaders['X-RateLimit-Window'] =
      `${Math.ceil(result.windowMs / 1000)}s`;

    return enhancedHeaders;
  }

  /**
   * Generate legacy headers for backward compatibility
   */
  static generateLegacyHeaders(
    result: RateLimitResult,
  ): Record<string, string> {
    return {
      // Express rate limit style
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),

      // GitHub style
      'X-RateLimit-Resource': result.tier,
      'X-RateLimit-Used': (result.limit - result.remaining).toString(),

      // Twitter style (deprecated but some clients expect)
      'X-Rate-Limit-Limit': result.limit.toString(),
      'X-Rate-Limit-Remaining': result.remaining.toString(),
      'X-Rate-Limit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    };
  }

  /**
   * Apply headers to NextResponse object
   */
  static applyHeadersToResponse(
    response: NextResponse,
    result: RateLimitResult | EnhancedRateLimitResult,
    options: {
      enhanced?: boolean;
      legacy?: boolean;
      debug?: boolean;
    } = {},
  ): NextResponse {
    const { enhanced = true, legacy = false, debug = false } = options;

    let headers: Record<string, string>;

    if (enhanced && 'allTiers' in result) {
      // Enhanced multi-tier headers
      headers = this.generateEnhancedHeaders(result as EnhancedRateLimitResult);
    } else {
      // Standard headers
      headers = this.generateHeaders(result);
    }

    // Add legacy headers if requested
    if (legacy) {
      const legacyHeaders = this.generateLegacyHeaders(result);
      headers = { ...headers, ...legacyHeaders };
    }

    // Add debug headers in development
    if (debug && process.env.NODE_ENV === 'development') {
      headers['X-RateLimit-Debug'] = JSON.stringify({
        key: result.key,
        windowMs: result.windowMs,
        timestamp: Date.now(),
        ...('appliedTier' in result && { appliedTier: result.appliedTier }),
      });
    }

    // Apply all headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  /**
   * Create rate limit error response with appropriate headers
   */
  static createErrorResponse(
    result: RateLimitResult | EnhancedRateLimitResult,
    options: {
      enhanced?: boolean;
      legacy?: boolean;
      customMessage?: string;
    } = {},
  ): NextResponse {
    const { enhanced = true, legacy = false, customMessage } = options;

    const message = customMessage || this.generateErrorMessage(result);

    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message,
        tier: result.tier,
        limit: result.limit,
        remaining: result.remaining,
        resetTime: result.resetTime,
        ...(result.retryAfter && { retryAfter: result.retryAfter }),
      },
      { status: 429 },
    );

    return this.applyHeadersToResponse(response, result, { enhanced, legacy });
  }

  /**
   * Generate user-friendly error message
   */
  static generateErrorMessage(
    result: RateLimitResult | EnhancedRateLimitResult,
  ): string {
    const tierName = this.getTierDisplayName(result.tier);
    const resetDate = new Date(result.resetTime);
    const now = new Date();
    const secondsUntilReset = Math.ceil(
      (resetDate.getTime() - now.getTime()) / 1000,
    );

    let message = `${tierName} rate limit exceeded. `;

    if (secondsUntilReset > 0) {
      if (secondsUntilReset < 60) {
        message += `Try again in ${secondsUntilReset} seconds.`;
      } else if (secondsUntilReset < 3600) {
        const minutes = Math.ceil(secondsUntilReset / 60);
        message += `Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
      } else {
        const hours = Math.ceil(secondsUntilReset / 3600);
        message += `Try again in ${hours} hour${hours > 1 ? 's' : ''}.`;
      }
    } else {
      message += 'Try again shortly.';
    }

    // Add tier-specific advice
    if ('appliedTier' in result && result.appliedTier === 'user') {
      message += ' Consider upgrading your plan for higher limits.';
    } else if ('appliedTier' in result && result.appliedTier === 'ip') {
      message += ' This limit applies to your IP address.';
    }

    return message;
  }

  /**
   * Get display-friendly tier name
   */
  private static getTierDisplayName(tier: string): string {
    switch (tier.toLowerCase()) {
      case 'ip':
        return 'IP address';
      case 'user':
        return 'User';
      case 'organization':
        return 'Organization';
      case 'global':
        return 'System';
      default:
        return tier;
    }
  }

  /**
   * Parse rate limit headers from response (for client-side usage)
   */
  static parseHeaders(headers: Headers): {
    limit?: number;
    remaining?: number;
    reset?: Date;
    tier?: string;
    retryAfter?: number;
  } {
    const limit = headers.get('X-RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');
    const tier = headers.get('X-RateLimit-Tier');
    const retryAfter = headers.get('Retry-After');

    return {
      limit: limit ? parseInt(limit, 10) : undefined,
      remaining: remaining ? parseInt(remaining, 10) : undefined,
      reset: reset ? new Date(parseInt(reset, 10) * 1000) : undefined,
      tier: tier?.toLowerCase(),
      retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
    };
  }

  /**
   * Validate headers format for testing
   */
  static validateHeaders(headers: Record<string, string>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required headers
    if (!headers['X-RateLimit-Limit']) {
      errors.push('Missing X-RateLimit-Limit header');
    } else if (isNaN(parseInt(headers['X-RateLimit-Limit']))) {
      errors.push('X-RateLimit-Limit must be a number');
    }

    if (!headers['X-RateLimit-Remaining']) {
      errors.push('Missing X-RateLimit-Remaining header');
    } else if (isNaN(parseInt(headers['X-RateLimit-Remaining']))) {
      errors.push('X-RateLimit-Remaining must be a number');
    }

    if (!headers['X-RateLimit-Reset']) {
      errors.push('Missing X-RateLimit-Reset header');
    } else if (isNaN(parseInt(headers['X-RateLimit-Reset']))) {
      errors.push('X-RateLimit-Reset must be a Unix timestamp');
    }

    if (!headers['X-RateLimit-Tier']) {
      errors.push('Missing X-RateLimit-Tier header');
    }

    // Validate numeric consistency
    if (headers['X-RateLimit-Limit'] && headers['X-RateLimit-Remaining']) {
      const limit = parseInt(headers['X-RateLimit-Limit']);
      const remaining = parseInt(headers['X-RateLimit-Remaining']);

      if (remaining > limit) {
        errors.push(
          'X-RateLimit-Remaining cannot be greater than X-RateLimit-Limit',
        );
      }

      if (remaining < 0) {
        errors.push('X-RateLimit-Remaining cannot be negative');
      }
    }

    // Validate timestamp
    if (headers['X-RateLimit-Reset']) {
      const reset = parseInt(headers['X-RateLimit-Reset']);
      const now = Math.floor(Date.now() / 1000);

      if (reset < now - 3600) {
        // More than 1 hour in the past
        errors.push(
          'X-RateLimit-Reset timestamp appears to be too far in the past',
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Convenience function for applying headers to any response
 */
export function withRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult | EnhancedRateLimitResult,
  options?: {
    enhanced?: boolean;
    legacy?: boolean;
    debug?: boolean;
  },
): NextResponse {
  return RateLimitHeadersManager.applyHeadersToResponse(
    response,
    result,
    options,
  );
}

/**
 * Convenience function for creating rate limit error responses
 */
export function createRateLimitErrorResponse(
  result: RateLimitResult | EnhancedRateLimitResult,
  options?: {
    enhanced?: boolean;
    legacy?: boolean;
    customMessage?: string;
  },
): NextResponse {
  return RateLimitHeadersManager.createErrorResponse(result, options);
}
