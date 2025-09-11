// apiKeyAuth.ts
// WS-072: API Key Authentication Middleware
// Validates API keys, checks scopes, and enforces rate limits

import { NextRequest, NextResponse } from 'next/server';
import { apiKeyService } from '@/lib/services/apiKeyService';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for API operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface APIContext {
  apiKey: {
    id: string;
    name: string;
    userId: string;
    scopes: string[];
    integrationType?: string;
  };
  rateLimitStatus: {
    minuteRemaining: number;
    hourRemaining: number;
    dayRemaining: number;
  };
}

/**
 * Extract API key from request
 */
function extractAPIKey(request: NextRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check query parameter (for webhook callbacks)
  const url = new URL(request.url);
  const apiKeyParam = url.searchParams.get('api_key');
  if (apiKeyParam) {
    return apiKeyParam;
  }

  return null;
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * API Key authentication middleware
 */
export async function withAPIKeyAuth(
  handler: (request: NextRequest, context: APIContext) => Promise<NextResponse>,
  requiredScope?: string,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();

    // Extract API key
    const apiKey = extractAPIKey(request);
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    try {
      // Validate API key
      const keyData = await apiKeyService.validateAPIKey(apiKey);
      if (!keyData) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      }

      // Check IP whitelist if configured
      const clientIP = getClientIP(request);
      if (keyData.allowedIps && keyData.allowedIps.length > 0) {
        if (!keyData.allowedIps.includes(clientIP)) {
          await apiKeyService.logUsage(
            keyData.id,
            request.url,
            request.method,
            403,
            Date.now() - startTime,
            undefined,
            undefined,
            clientIP,
            request.headers.get('user-agent') || undefined,
            'IP not whitelisted',
          );

          return NextResponse.json(
            { error: 'IP address not authorized' },
            { status: 403 },
          );
        }
      }

      // Check CORS origins for browser requests
      const origin = request.headers.get('origin');
      if (
        origin &&
        keyData.allowedOrigins &&
        keyData.allowedOrigins.length > 0
      ) {
        if (!keyData.allowedOrigins.includes(origin)) {
          await apiKeyService.logUsage(
            keyData.id,
            request.url,
            request.method,
            403,
            Date.now() - startTime,
            undefined,
            undefined,
            clientIP,
            request.headers.get('user-agent') || undefined,
            'Origin not allowed',
          );

          return NextResponse.json(
            { error: 'Origin not authorized' },
            { status: 403 },
          );
        }
      }

      // Check required scope
      if (requiredScope && !apiKeyService.hasScope(keyData, requiredScope)) {
        await apiKeyService.logUsage(
          keyData.id,
          request.url,
          request.method,
          403,
          Date.now() - startTime,
          undefined,
          undefined,
          clientIP,
          request.headers.get('user-agent') || undefined,
          `Missing scope: ${requiredScope}`,
        );

        return NextResponse.json(
          {
            error: `Insufficient permissions. Required scope: ${requiredScope}`,
          },
          { status: 403 },
        );
      }

      // Check rate limits
      const rateLimitStatus = await apiKeyService.checkRateLimit(keyData.id);

      if (!rateLimitStatus.minuteLimitOk) {
        await apiKeyService.logUsage(
          keyData.id,
          request.url,
          request.method,
          429,
          Date.now() - startTime,
          undefined,
          undefined,
          clientIP,
          request.headers.get('user-agent') || undefined,
          'Rate limit exceeded (minute)',
        );

        return NextResponse.json(
          { error: 'Rate limit exceeded. Try again in a minute.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': keyData.rateLimitPerMinute.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString(),
              'Retry-After': '60',
            },
          },
        );
      }

      if (!rateLimitStatus.hourLimitOk) {
        await apiKeyService.logUsage(
          keyData.id,
          request.url,
          request.method,
          429,
          Date.now() - startTime,
          undefined,
          undefined,
          clientIP,
          request.headers.get('user-agent') || undefined,
          'Rate limit exceeded (hour)',
        );

        return NextResponse.json(
          { error: 'Hourly rate limit exceeded.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': keyData.rateLimitPerHour.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString(),
              'Retry-After': '3600',
            },
          },
        );
      }

      if (!rateLimitStatus.dayLimitOk) {
        await apiKeyService.logUsage(
          keyData.id,
          request.url,
          request.method,
          429,
          Date.now() - startTime,
          undefined,
          undefined,
          clientIP,
          request.headers.get('user-agent') || undefined,
          'Rate limit exceeded (day)',
        );

        return NextResponse.json(
          { error: 'Daily rate limit exceeded.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': keyData.rateLimitPerDay.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(
                Date.now() + 86400000,
              ).toISOString(),
              'Retry-After': '86400',
            },
          },
        );
      }

      // Increment rate limit counters
      await apiKeyService.incrementRateLimit(keyData.id);

      // Get user ID for the API key
      const { data: apiKeyRecord } = await supabaseAdmin
        .from('api_keys')
        .select('user_id')
        .eq('id', keyData.id)
        .single();

      // Create context
      const context: APIContext = {
        apiKey: {
          id: keyData.id,
          name: keyData.name,
          userId: apiKeyRecord?.user_id || '',
          scopes: keyData.scopes,
          integrationType: keyData.integrationType,
        },
        rateLimitStatus: {
          minuteRemaining: rateLimitStatus.minuteRemaining,
          hourRemaining: rateLimitStatus.hourRemaining,
          dayRemaining: rateLimitStatus.dayRemaining,
        },
      };

      // Call the handler
      const response = await handler(request, context);

      // Log successful usage
      const responseTime = Date.now() - startTime;
      await apiKeyService.logUsage(
        keyData.id,
        request.url,
        request.method,
        response.status,
        responseTime,
        request.headers.get('content-length')
          ? parseInt(request.headers.get('content-length')!)
          : undefined,
        response.headers.get('content-length')
          ? parseInt(response.headers.get('content-length')!)
          : undefined,
        clientIP,
        request.headers.get('user-agent') || undefined,
      );

      // Add rate limit headers to response
      const responseWithHeaders = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      responseWithHeaders.headers.set(
        'X-RateLimit-Limit-Minute',
        keyData.rateLimitPerMinute.toString(),
      );
      responseWithHeaders.headers.set(
        'X-RateLimit-Remaining-Minute',
        rateLimitStatus.minuteRemaining.toString(),
      );
      responseWithHeaders.headers.set(
        'X-RateLimit-Limit-Hour',
        keyData.rateLimitPerHour.toString(),
      );
      responseWithHeaders.headers.set(
        'X-RateLimit-Remaining-Hour',
        rateLimitStatus.hourRemaining.toString(),
      );
      responseWithHeaders.headers.set(
        'X-RateLimit-Limit-Day',
        keyData.rateLimitPerDay.toString(),
      );
      responseWithHeaders.headers.set(
        'X-RateLimit-Remaining-Day',
        rateLimitStatus.dayRemaining.toString(),
      );

      return responseWithHeaders;
    } catch (error) {
      console.error('API key authentication error:', error);

      // Log error
      if (apiKey) {
        const keyPrefix = apiKey.substring(0, 10);
        await apiKeyService.logUsage(
          keyPrefix, // Use prefix as fallback ID
          request.url,
          request.method,
          500,
          Date.now() - startTime,
          undefined,
          undefined,
          getClientIP(request),
          request.headers.get('user-agent') || undefined,
          error instanceof Error ? error.message : 'Internal error',
        );
      }

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  };
}

/**
 * Validate scope format
 */
export function isValidScope(scope: string): boolean {
  const scopePattern = /^(read|write|delete|manage|admin):[a-z_*]+$/;
  return scopePattern.test(scope);
}

/**
 * Parse scope into action and resource
 */
export function parseScope(
  scope: string,
): { action: string; resource: string } | null {
  const parts = scope.split(':');
  if (parts.length !== 2) {
    return null;
  }

  return {
    action: parts[0],
    resource: parts[1],
  };
}

/**
 * Check if a scope grants access to a resource action
 */
export function scopeGrantsAccess(
  grantedScope: string,
  requiredAction: string,
  requiredResource: string,
): boolean {
  // Admin scope grants all access
  if (grantedScope === 'admin:all') {
    return true;
  }

  const scope = parseScope(grantedScope);
  if (!scope) {
    return false;
  }

  // Check action match
  if (scope.action !== requiredAction && scope.action !== 'admin') {
    return false;
  }

  // Check resource match (with wildcard support)
  if (scope.resource === '*' || scope.resource === requiredResource) {
    return true;
  }

  return false;
}

/**
 * Create API error response with consistent format
 */
export function createAPIError(
  message: string,
  code: string,
  statusCode: number,
  details?: any,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        message,
        code,
        details,
      },
    },
    { status: statusCode },
  );
}

/**
 * Create API success response with consistent format
 */
export function createAPIResponse<T>(
  data: T,
  meta?: {
    totalCount?: number;
    page?: number;
    pageSize?: number;
  },
): NextResponse {
  const response: any = { data };

  if (meta) {
    response.meta = meta;
  }

  return NextResponse.json(response);
}
