// WS-254 Team D: Secure API Validation Middleware
import { NextRequest, NextResponse } from 'next/server';
import { ratelimit } from '@/lib/ratelimit';
import type { SecureValidationContext } from '@/types/dietary-management';

interface SecureApiHandler {
  (context: {
    body: any;
    user: any;
    request: NextRequest;
    params?: any;
  }): Promise<NextResponse>;
}

export function withSecureValidation(
  request: NextRequest,
  handler: SecureApiHandler,
  options: {
    requireAuth?: boolean;
    rateLimit?: {
      requests: number;
      window: string;
    };
    validateBody?: boolean;
    logSensitiveData?: boolean;
  } = {},
) {
  const {
    requireAuth = true,
    rateLimit = { requests: 10, window: '1m' },
    validateBody = true,
    logSensitiveData = false,
  } = options;

  return async (params?: any) => {
    const startTime = Date.now();
    const requestId = `req_${startTime}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Get headers safely
      const headersList = await headers();
      const userAgent = headersList.get('user-agent') || '';
      const authorization = headersList.get('authorization') || '';
      const contentType = headersList.get('content-type') || '';
      const origin = headersList.get('origin') || '';

      // Get client IP
      const forwarded = headersList.get('x-forwarded-for');
      const realIp = headersList.get('x-real-ip');
      const clientIp = forwarded?.split(',')[0] || realIp || 'unknown';

      // Security headers validation
      if (request.method === 'POST' || request.method === 'PATCH') {
        if (!contentType.includes('application/json')) {
          return NextResponse.json(
            {
              error: 'Invalid content type',
              code: 'INVALID_CONTENT_TYPE',
              requestId,
            },
            { status: 400 },
          );
        }
      }

      // Rate limiting
      if (rateLimit) {
        const rateLimitResult = await ratelimit({
          requests: rateLimit.requests,
          window: rateLimit.window,
          identifier: `${clientIp}:${request.nextUrl.pathname}`,
        });

        if (!rateLimitResult.success) {
          return NextResponse.json(
            {
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: rateLimitResult.reset,
              requestId,
            },
            {
              status: 429,
              headers: {
                'Retry-After': rateLimitResult.reset.toString(),
                'X-RateLimit-Limit': rateLimit.requests.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.reset.toString(),
              },
            },
          );
        }
      }

      // Authentication
      let user = null;
      if (requireAuth) {
        const token = authorization.replace('Bearer ', '');

        if (!token) {
          return NextResponse.json(
            {
              error: 'Authentication required',
              code: 'AUTH_REQUIRED',
              requestId,
            },
            { status: 401 },
          );
        }

        // Validate JWT token (simplified - in real app, use proper JWT validation)
        try {
          user = await validateAuthToken(token);
          if (!user) {
            throw new Error('Invalid token');
          }
        } catch (error) {
          return NextResponse.json(
            {
              error: 'Invalid authentication token',
              code: 'INVALID_TOKEN',
              requestId,
            },
            { status: 401 },
          );
        }
      }

      // Parse and validate request body
      let body = null;
      if (
        validateBody &&
        (request.method === 'POST' || request.method === 'PATCH')
      ) {
        try {
          const text = await request.text();
          if (text) {
            body = JSON.parse(text);

            // Basic input sanitization
            body = sanitizeInput(body);

            // Validate required fields for dietary endpoints
            if (request.nextUrl.pathname.includes('/dietary/requirements')) {
              const validation = validateDietaryRequirementInput(
                body,
                request.method,
              );
              if (!validation.isValid) {
                return NextResponse.json(
                  {
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: validation.errors,
                    requestId,
                  },
                  { status: 400 },
                );
              }
            }
          }
        } catch (error) {
          return NextResponse.json(
            {
              error: 'Invalid JSON in request body',
              code: 'INVALID_JSON',
              requestId,
            },
            { status: 400 },
          );
        }
      }

      // Create security context
      const securityContext: SecureValidationContext = {
        user: user || { id: 'anonymous', role: 'guest', permissions: [] },
        request: {
          ip: clientIp,
          userAgent,
          timestamp: new Date().toISOString(),
        },
        rateLimit: {
          remaining: rateLimit ? 10 : 0, // This would come from actual rate limiter
          resetTime: new Date(Date.now() + 60000).toISOString(),
        },
      };

      // Log security event (without sensitive data unless explicitly enabled)
      if (process.env.NODE_ENV === 'development' || logSensitiveData) {
        console.log(
          `[SECURITY] ${requestId}: ${request.method} ${request.nextUrl.pathname}`,
          {
            user: user?.id,
            ip: clientIp,
            userAgent: userAgent.substring(0, 100),
            bodySize: body ? JSON.stringify(body).length : 0,
          },
        );
      }

      // Call the actual handler
      const response = await handler({
        body,
        user,
        request,
        params,
      });

      // Add security headers to response
      const secureResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'X-Request-ID': requestId,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'X-Response-Time': `${Date.now() - startTime}ms`,
          'Cache-Control': request.nextUrl.pathname.includes('/dietary/')
            ? 'private, no-cache, no-store, must-revalidate'
            : 'private, max-age=300',
        },
      });

      return secureResponse;
    } catch (error) {
      console.error(`[SECURITY ERROR] ${requestId}:`, error);

      return NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          requestId,
          timestamp: new Date().toISOString(),
        },
        {
          status: 500,
          headers: {
            'X-Request-ID': requestId,
            'X-Error-Type': 'security_validation_error',
          },
        },
      );
    }
  };
}

// Mobile-specific validation
export function validateMobileRequest(
  request: NextRequest,
  user: any,
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const userAgent = request.headers.get('user-agent') || '';
      const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);

      // For mobile requests, we might want additional validation
      if (isMobile) {
        // Check if user has mobile-specific permissions
        // This is a simplified check - in real app, implement proper mobile device verification
        resolve(true);
      } else {
        // Desktop/web requests
        resolve(true);
      }
    } catch (error) {
      console.error('Mobile validation error:', error);
      resolve(false);
    }
  });
}

// Helper functions
async function validateAuthToken(token: string): Promise<any> {
  // In a real application, this would validate the JWT token with Supabase
  // For now, we'll simulate token validation
  try {
    if (!token || token.length < 10) {
      return null;
    }

    // Simulate token validation - in real app, use Supabase Auth
    return {
      id: 'user_123',
      email: 'user@example.com',
      role: 'authenticated',
      permissions: ['read:dietary', 'write:dietary', 'delete:dietary'],
    };
  } catch (error) {
    return null;
  }
}

function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Basic XSS prevention
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Sanitize object keys and values
      const cleanKey = key.replace(/[^\w\-_.]/g, '');
      sanitized[cleanKey] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

function validateDietaryRequirementInput(body: any, method: string) {
  const errors: string[] = [];

  if (method === 'POST') {
    if (!body.guestName || typeof body.guestName !== 'string') {
      errors.push('Guest name is required and must be a string');
    }

    if (
      !body.category ||
      ![
        'allergy',
        'diet',
        'medical',
        'preference',
        'religious',
        'cultural',
      ].includes(body.category)
    ) {
      errors.push('Valid category is required');
    }

    if (
      !body.severity ||
      !Number.isInteger(body.severity) ||
      body.severity < 1 ||
      body.severity > 5
    ) {
      errors.push('Severity must be an integer between 1 and 5');
    }

    if (!body.notes || typeof body.notes !== 'string') {
      errors.push('Notes are required and must be a string');
    }

    if (body.emergencyContact && typeof body.emergencyContact !== 'string') {
      errors.push('Emergency contact must be a string');
    }

    // Validate emergency contact for high severity requirements
    if (body.severity >= 4 && !body.emergencyContact) {
      errors.push('Emergency contact is required for severity levels 4 and 5');
    }
  }

  if (method === 'PATCH') {
    // For updates, we're more lenient but still validate data types
    if (body.guestName && typeof body.guestName !== 'string') {
      errors.push('Guest name must be a string');
    }

    if (
      body.category &&
      ![
        'allergy',
        'diet',
        'medical',
        'preference',
        'religious',
        'cultural',
      ].includes(body.category)
    ) {
      errors.push('Invalid category');
    }

    if (
      body.severity &&
      (!Number.isInteger(body.severity) ||
        body.severity < 1 ||
        body.severity > 5)
    ) {
      errors.push('Severity must be an integer between 1 and 5');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
