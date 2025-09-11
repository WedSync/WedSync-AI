/**
 * API Rate Limiting Middleware
 * Provides rate limiting functionality for API routes
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  keyGenerator?: (request: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Default rate limit configurations
export const DEFAULT_RATE_LIMITS = {
  standard: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
  strict: { windowMs: 15 * 60 * 1000, max: 20 }, // 20 requests per 15 minutes
  lenient: { windowMs: 15 * 60 * 1000, max: 300 }, // 300 requests per 15 minutes
  music: { windowMs: 60 * 1000, max: 10 }, // 10 requests per minute for music
};

// In-memory store for rate limiting (production would use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if request is within rate limits
 */
function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetTime) {
    // Create new entry or reset expired entry
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: config.max - 1, resetTime };
  }

  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.max - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Generate rate limit key from request
 */
function defaultKeyGenerator(request: Request): string {
  // In production, this would use IP address or user ID
  const url = new URL(request.url);
  return `rate_limit:${url.pathname}:default_key`;
}

/**
 * Custom rate limiting middleware
 */
export function withCustomRateLimit(config: RateLimitConfig) {
  return async function rateLimitMiddleware(
    request: Request,
    handler: () => Promise<Response>,
  ): Promise<Response> {
    const keyGenerator = config.keyGenerator || defaultKeyGenerator;
    const key = keyGenerator(request);

    const { allowed, remaining, resetTime } = checkRateLimit(key, config);

    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter: `${retryAfter}s`,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
            'Retry-After': retryAfter.toString(),
          },
        },
      );
    }

    const response = await handler();

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', config.max.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', resetTime.toString());

    return response;
  };
}

/**
 * Apply standard rate limit (100 requests per 15 minutes)
 */
export const withStandardRateLimit = () =>
  withCustomRateLimit(DEFAULT_RATE_LIMITS.standard);

/**
 * Apply strict rate limit (20 requests per 15 minutes)
 */
export const withStrictRateLimit = () =>
  withCustomRateLimit(DEFAULT_RATE_LIMITS.strict);

/**
 * Apply music-specific rate limit (10 requests per minute)
 */
export const withMusicRateLimit = () =>
  withCustomRateLimit(DEFAULT_RATE_LIMITS.music);
