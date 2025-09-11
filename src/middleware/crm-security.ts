/**
 * CRM Security Middleware
 * WS-343 - Team A - Round 1
 *
 * Express middleware for securing CRM integration endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  CSRFProtection,
  SecurityAuditLogger,
  RATE_LIMITS,
  SECURITY_HEADERS,
  CRMValidationSchemas,
} from '@/lib/security/crm-security';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(endpoint: string) {
  return async (request: NextRequest, response: NextResponse) => {
    const clientId = getClientId(request);
    const key = `${clientId}:${endpoint}`;
    const limit = RATE_LIMITS[endpoint] || RATE_LIMITS.default;

    const now = Date.now();
    const windowStart = now - limit.window;

    // Clean old entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < windowStart) {
        rateLimitStore.delete(k);
      }
    }

    const current = rateLimitStore.get(key);

    if (!current) {
      rateLimitStore.set(key, { count: 1, resetTime: now + limit.window });
      return response;
    }

    if (current.resetTime < now) {
      rateLimitStore.set(key, { count: 1, resetTime: now + limit.window });
      return response;
    }

    if (current.count >= limit.requests) {
      await SecurityAuditLogger.logSecurityEvent({
        type: 'rate_limit',
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        details: { endpoint, limit: limit.requests },
      });

      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (current.resetTime - now) / 1000,
            ).toString(),
          },
        },
      );
    }

    current.count++;
    return response;
  };
}

/**
 * CSRF protection middleware
 */
export function csrfProtectionMiddleware() {
  return async (request: NextRequest, response: NextResponse) => {
    if (request.method === 'GET' || request.method === 'HEAD') {
      return response;
    }

    const csrfToken = request.headers.get('x-csrf-token');
    const sessionToken = await getSessionCSRFToken(request);

    if (
      !csrfToken ||
      !sessionToken ||
      !CSRFProtection.validateToken(csrfToken, sessionToken)
    ) {
      await SecurityAuditLogger.logSecurityEvent({
        type: 'csrf_violation',
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        details: {
          hasToken: !!csrfToken,
          hasSessionToken: !!sessionToken,
          url: request.url,
        },
      });

      return NextResponse.json(
        { error: 'CSRF token validation failed' },
        { status: 403 },
      );
    }

    return response;
  };
}

/**
 * Input validation middleware
 */
export function inputValidationMiddleware(schema: any) {
  return async (request: NextRequest, response: NextResponse) => {
    try {
      const body = await request.json();
      const validated = schema.parse(body);

      // Attach validated data to request (in actual implementation)
      // request.validatedData = validated

      return response;
    } catch (error: any) {
      await SecurityAuditLogger.logSecurityEvent({
        type: 'invalid_input',
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        details: {
          error: error.message,
          url: request.url,
        },
      });

      return NextResponse.json(
        { error: 'Input validation failed', details: error.errors },
        { status: 400 },
      );
    }
  };
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware() {
  return async (request: NextRequest, response: NextResponse) => {
    // Add security headers to response
    Object.entries(SECURITY_HEADERS).forEach(([name, value]) => {
      response.headers.set(name, value);
    });

    return response;
  };
}

/**
 * Authentication middleware
 */
export function authenticationMiddleware() {
  return async (request: NextRequest, response: NextResponse) => {
    const authHeader = request.headers.get('authorization');
    const sessionCookie = request.cookies.get('session');

    if (!authHeader && !sessionCookie) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Validate authentication (simplified for demo)
    try {
      const user = await validateAuthentication(
        authHeader,
        sessionCookie?.value,
      );

      if (!user) {
        await SecurityAuditLogger.logSecurityEvent({
          type: 'auth_failure',
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || undefined,
          details: {
            hasAuthHeader: !!authHeader,
            hasSessionCookie: !!sessionCookie,
            url: request.url,
          },
        });

        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 },
        );
      }

      // Attach user to request (in actual implementation)
      // request.user = user

      await SecurityAuditLogger.logSecurityEvent({
        type: 'auth_success',
        userId: user.id,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        details: { url: request.url },
      });

      return response;
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 },
      );
    }
  };
}

/**
 * CRM integration specific security middleware
 */
export function crmIntegrationSecurityMiddleware() {
  return async (request: NextRequest, response: NextResponse) => {
    // Validate CRM provider
    const url = new URL(request.url);
    const provider =
      url.searchParams.get('provider') ||
      url.pathname
        .split('/')
        .find((segment) =>
          [
            'tave',
            'light_blue',
            'honeybook',
            'dubsado',
            'studio_ninja',
          ].includes(segment),
        );

    if (
      provider &&
      !CRMValidationSchemas.crmProvider.safeParse(provider).success
    ) {
      return NextResponse.json(
        { error: 'Invalid CRM provider' },
        { status: 400 },
      );
    }

    // Additional CRM-specific security checks
    if (request.method === 'POST' || request.method === 'PUT') {
      const contentType = request.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return NextResponse.json(
          { error: 'Invalid content type' },
          { status: 400 },
        );
      }
    }

    return response;
  };
}

/**
 * Compose multiple middlewares
 */
export function composeCRMMiddlewares(
  endpoint: string,
  validationSchema?: any,
) {
  return [
    securityHeadersMiddleware(),
    rateLimitMiddleware(endpoint),
    authenticationMiddleware(),
    csrfProtectionMiddleware(),
    crmIntegrationSecurityMiddleware(),
    ...(validationSchema ? [inputValidationMiddleware(validationSchema)] : []),
  ];
}

// Utility functions
function getClientId(request: NextRequest): string {
  // In production, this would use a more sophisticated client identification
  return getClientIP(request) || 'unknown';
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-client-ip') ||
    'unknown'
  );
}

async function getSessionCSRFToken(
  request: NextRequest,
): Promise<string | null> {
  // In production, this would retrieve the CSRF token from the user's session
  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie) return null;

  // Simplified implementation - in production, decode and validate session
  return 'mock-csrf-token';
}

async function validateAuthentication(
  authHeader: string | null,
  sessionCookie: string | undefined,
): Promise<{ id: string; email: string; organization_id: string } | null> {
  // Simplified authentication validation
  // In production, this would validate JWT tokens or session cookies
  if (authHeader?.startsWith('Bearer ') || sessionCookie) {
    return {
      id: 'mock-user-id',
      email: 'test@example.com',
      organization_id: 'mock-org-id',
    };
  }

  return null;
}
