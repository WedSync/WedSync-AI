import { NextRequest, NextResponse } from 'next/server';
import {
  apiRateLimiter,
  authRateLimiter,
  paymentRateLimiter,
} from './rate-limit';

type RateLimitConfig = {
  limit: number;
  window?: number;
  type?: 'api' | 'auth' | 'payment';
};

export async function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  // Get identifier for rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

  // Get user ID from auth header if available
  const authHeader = request.headers.get('authorization');
  const userId = authHeader
    ? authHeader.replace('Bearer ', '').substring(0, 20)
    : null;

  // Use user ID if authenticated, otherwise use IP
  const identifier = userId || ip;

  // Select the appropriate rate limiter
  const limiter =
    config.type === 'payment'
      ? paymentRateLimiter
      : config.type === 'auth'
        ? authRateLimiter
        : apiRateLimiter;

  try {
    await limiter.check(config.limit, identifier);

    // Execute the handler
    const response = await handler();

    // Add rate limit headers
    const status = limiter.getStatus(identifier, config.limit);
    response.headers.set('X-RateLimit-Limit', config.limit.toString());
    response.headers.set('X-RateLimit-Remaining', status.remaining.toString());
    response.headers.set(
      'X-RateLimit-Reset',
      new Date(status.reset).toISOString(),
    );

    return response;
  } catch (error) {
    // Rate limit exceeded
    const status = limiter.getStatus(identifier, config.limit);

    return NextResponse.json(
      {
        error: 'Too many requests',
        message: error instanceof Error ? error.message : 'Rate limit exceeded',
        retryAfter: Math.ceil((status.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(
            (status.reset - Date.now()) / 1000,
          ).toString(),
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(status.reset).toISOString(),
        },
      },
    );
  }
}

// Helper for validating request body
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: {
    parse: (data: unknown) => T;
  },
): Promise<{ data: T | null; error: NextResponse | null }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: NextResponse.json(
        {
          error: 'Invalid request body',
          details: error instanceof Error ? error.message : 'Validation failed',
        },
        { status: 400 },
      ),
    };
  }
}

// Helper for handling API errors
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Don't expose internal errors to clients
  if (error instanceof Error) {
    // Check for known error types
    if (
      error.message.includes('unauthorized') ||
      error.message.includes('authentication')
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      error.message.includes('forbidden') ||
      error.message.includes('permission')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  }

  // Generic error response
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

// Security headers middleware
export function withSecurityHeaders(response: NextResponse): NextResponse {
  // OWASP recommended security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );

  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https://*.supabase.co https://api.stripe.com; " +
      'frame-src https://js.stripe.com https://hooks.stripe.com; ' +
      "object-src 'none'; " +
      "base-uri 'self';",
  );

  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');

  return response;
}

// CORS middleware for API routes
export function withCORS(
  response: NextResponse,
  origin?: string,
): NextResponse {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://wedsync.app',
    'https://app.wedsync.io',
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean);

  const requestOrigin = origin || '';

  if (allowedOrigins.includes(requestOrigin)) {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin);
  }

  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS',
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
  );
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Vary', 'Origin');

  return response;
}

// Combined middleware wrapper for API routes
export function withApiSecurity(
  response: NextResponse,
  origin?: string,
): NextResponse {
  return withCORS(withSecurityHeaders(response), origin);
}
