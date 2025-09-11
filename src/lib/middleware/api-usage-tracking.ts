/**
 * API Usage Tracking Middleware
 * WS-233: Comprehensive API monitoring and rate limiting
 *
 * Tracks all API requests for:
 * - Usage analytics and billing
 * - Rate limiting enforcement
 * - Performance monitoring
 * - Security auditing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Initialize Supabase client for logging
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

interface ApiUsageMetrics {
  organizationId?: string;
  userId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  requestSizeBytes: number;
  responseSizeBytes: number;
  ipAddress?: string;
  userAgent?: string;
  apiKeyId?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  tier: string;
}

/**
 * Extract organization and user info from request
 */
async function extractRequestContext(request: NextRequest): Promise<{
  organizationId?: string;
  userId?: string;
  apiKeyId?: string;
}> {
  try {
    // Try to get user from session
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      // Check if it's an API key (starts with 'ws_')
      if (token.startsWith('ws_')) {
        const { data: apiKey } = await supabase
          .from('api_keys')
          .select('id, organization_id')
          .eq('key_hash', hashApiKey(token))
          .eq('is_active', true)
          .single();

        if (apiKey) {
          return {
            organizationId: apiKey.organization_id,
            apiKeyId: apiKey.id,
          };
        }
      } else {
        // Regular JWT token
        const {
          data: { user },
        } = await supabase.auth.getUser(token);
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('user_id', user.id)
            .single();

          return {
            organizationId: profile?.organization_id,
            userId: user.id,
          };
        }
      }
    }

    return {};
  } catch (error) {
    console.error('Error extracting request context:', error);
    return {};
  }
}

/**
 * Hash API key for secure storage
 */
function hashApiKey(apiKey: string): string {
  // In production, use proper cryptographic hashing
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Check rate limits for the request
 */
async function checkRateLimit(
  organizationId: string,
  apiKeyId?: string,
): Promise<RateLimitResult> {
  try {
    const { data: allowed, error } = await supabase.rpc('check_rate_limit', {
      org_id: organizationId,
      api_key_id: apiKeyId || null,
    });

    if (error) throw error;

    // Get subscription tier and calculate remaining requests
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', organizationId)
      .single();

    const tier = org?.subscription_tier || 'free';

    // Get current usage and limits
    const { data: quotas } = await supabase
      .from('api_usage_quotas')
      .select('quota_type, limit_value')
      .eq('subscription_tier', tier);

    const minuteLimit =
      quotas?.find((q) => q.quota_type === 'requests_per_minute')
        ?.limit_value || 10;

    // Get current minute usage
    const { data: usage } = await supabase
      .from('rate_limit_tracking')
      .select('request_count')
      .eq('organization_id', organizationId)
      .eq('window_type', 'minute')
      .gte('window_start', new Date(Date.now() - 60000).toISOString())
      .single();

    const remaining = Math.max(0, minuteLimit - (usage?.request_count || 0));

    return {
      allowed: !!allowed,
      remaining,
      resetTime: Math.ceil(Date.now() / 60000) * 60000, // Next minute
      tier,
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Allow request if rate limiting fails
    return {
      allowed: true,
      remaining: 1000,
      resetTime: Date.now() + 60000,
      tier: 'free',
    };
  }
}

/**
 * Log API usage to database
 */
async function logApiUsage(metrics: ApiUsageMetrics): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_api_usage', {
      org_id: metrics.organizationId || null,
      user_id: metrics.userId || null,
      endpoint: metrics.endpoint,
      method: metrics.method,
      status_code: metrics.statusCode,
      response_time_ms: metrics.responseTimeMs,
      request_size_bytes: metrics.requestSizeBytes,
      response_size_bytes: metrics.responseSizeBytes,
      ip_address: metrics.ipAddress || null,
      user_agent: metrics.userAgent || null,
      api_key_id: metrics.apiKeyId || null,
    });

    if (error) {
      console.error('Error logging API usage:', error);
    }
  } catch (error) {
    console.error('Error logging API usage:', error);
  }
}

/**
 * Get request size in bytes
 */
function getRequestSize(request: NextRequest): number {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }

  // Estimate size from headers and URL
  let size = request.url.length;
  request.headers.forEach((value, key) => {
    size += key.length + value.length + 4; // +4 for ': ' and '\r\n'
  });

  return size;
}

/**
 * Get response size in bytes
 */
function getResponseSize(response: NextResponse): number {
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }

  // Estimate from headers
  let size = 0;
  response.headers.forEach((value, key) => {
    size += key.length + value.length + 4;
  });

  return size;
}

/**
 * Main API usage tracking middleware
 */
export async function apiUsageTrackingMiddleware(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const startTime = Date.now();

  // Skip tracking for certain paths
  const skipPaths = ['/_next/', '/favicon.ico', '/health', '/api/health'];

  const shouldSkip = skipPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );
  if (shouldSkip) {
    return response;
  }

  // Only track API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return response;
  }

  try {
    // Extract request context
    const context = await extractRequestContext(request);

    // Check rate limits if we have organization context
    let rateLimitResult: RateLimitResult | null = null;
    if (context.organizationId) {
      rateLimitResult = await checkRateLimit(
        context.organizationId,
        context.apiKeyId,
      );

      // Return rate limit error if exceeded
      if (!rateLimitResult.allowed) {
        const rateLimitResponse = new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `You have exceeded your ${rateLimitResult.tier} tier rate limit`,
            resetTime: rateLimitResult.resetTime,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': '60', // Per minute
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': Math.ceil(
                rateLimitResult.resetTime / 1000,
              ).toString(),
              'Retry-After': Math.ceil(
                (rateLimitResult.resetTime - Date.now()) / 1000,
              ).toString(),
            },
          },
        );

        // Log the rate-limited request
        const responseTime = Date.now() - startTime;
        await logApiUsage({
          organizationId: context.organizationId,
          userId: context.userId,
          endpoint: request.nextUrl.pathname,
          method: request.method,
          statusCode: 429,
          responseTimeMs: responseTime,
          requestSizeBytes: getRequestSize(request),
          responseSizeBytes: getResponseSize(rateLimitResponse),
          ipAddress:
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          apiKeyId: context.apiKeyId,
        });

        return rateLimitResponse;
      }

      // Add rate limit headers to successful response
      response.headers.set('X-RateLimit-Limit', '60');
      response.headers.set(
        'X-RateLimit-Remaining',
        rateLimitResult.remaining.toString(),
      );
      response.headers.set(
        'X-RateLimit-Reset',
        Math.ceil(rateLimitResult.resetTime / 1000).toString(),
      );
    }

    // Calculate response time and sizes
    const responseTime = Date.now() - startTime;
    const requestSize = getRequestSize(request);
    const responseSize = getResponseSize(response);

    // Log the API usage (async, don't wait)
    setImmediate(async () => {
      await logApiUsage({
        organizationId: context.organizationId,
        userId: context.userId,
        endpoint: request.nextUrl.pathname,
        method: request.method,
        statusCode: response.status,
        responseTimeMs: responseTime,
        requestSizeBytes: requestSize,
        responseSizeBytes: responseSize,
        ipAddress:
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        apiKeyId: context.apiKeyId,
      });
    });

    // Add monitoring headers
    response.headers.set('X-Response-Time', `${responseTime}ms`);
    response.headers.set('X-Request-ID', crypto.randomUUID());

    return response;
  } catch (error) {
    console.error('Error in API usage tracking middleware:', error);
    return response;
  }
}

/**
 * Wrapper function for easy integration with Next.js middleware
 */
export function withApiUsageTracking(request: NextRequest) {
  // This will be called by the main middleware.ts file
  return (response: NextResponse) =>
    apiUsageTrackingMiddleware(request, response);
}
