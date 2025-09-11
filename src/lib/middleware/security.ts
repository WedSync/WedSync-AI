import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limiter';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/utils/logger';

export interface SecurityConfig {
  requireAuth: boolean;
  requireSupplierOwnership?: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  csrfProtection?: boolean;
  validateBody?: z.ZodSchema;
  validateParams?: z.ZodSchema;
  validateQuery?: z.ZodSchema;
}

export interface AuthenticatedRequest extends NextRequest {
  userId: string;
  userRole: string;
  supplierId?: string;
}

/**
 * Security middleware for API routes with comprehensive protection
 */
export function withSecurity(
  config: SecurityConfig,
  handler: (req: AuthenticatedRequest, context: any) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context: any) => {
    try {
      // Security headers
      const response = NextResponse.next();
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set(
        'Referrer-Policy',
        'strict-origin-when-cross-origin',
      );
      response.headers.set(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=()',
      );

      // Rate limiting
      if (config.rateLimit) {
        const rateLimitResult = await rateLimit({
          key: `api_${req.ip || 'unknown'}_${req.nextUrl.pathname}`,
          limit: config.rateLimit.requests,
          windowMs: config.rateLimit.windowMs,
        });

        if (!rateLimitResult.success) {
          logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.nextUrl.pathname,
            userAgent: req.headers.get('user-agent'),
          });

          return NextResponse.json(
            {
              error: 'Too many requests',
              retryAfter: Math.ceil(rateLimitResult.reset / 1000),
            },
            {
              status: 429,
              headers: {
                'Retry-After': Math.ceil(
                  rateLimitResult.reset / 1000,
                ).toString(),
                'X-RateLimit-Limit': config.rateLimit.requests.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': new Date(
                  rateLimitResult.reset,
                ).toISOString(),
              },
            },
          );
        }

        // Add rate limit headers to successful responses
        response.headers.set(
          'X-RateLimit-Limit',
          config.rateLimit.requests.toString(),
        );
        response.headers.set(
          'X-RateLimit-Remaining',
          rateLimitResult.remaining.toString(),
        );
        response.headers.set(
          'X-RateLimit-Reset',
          new Date(rateLimitResult.reset).toISOString(),
        );
      }

      // Authentication
      let authenticatedRequest = req as AuthenticatedRequest;

      if (config.requireAuth) {
        const supabase = createClient();

        // Get session from cookies
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session?.user) {
          logger.warn('Authentication failed', {
            path: req.nextUrl.pathname,
            error: error?.message,
            hasSession: !!session,
          });

          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 },
          );
        }

        // Verify user exists and is active with additional security checks
        const { data: user, error: userError } = await supabase
          .from('user_profiles')
          .select(
            'id, role, is_active, supplier_id, last_login_at, failed_login_attempts',
          )
          .eq('id', session.user.id)
          .single();

        if (userError || !user || !user.is_active) {
          logger.warn('User verification failed', {
            userId: session.user.id,
            error: userError?.message,
            userActive: user?.is_active,
          });

          return NextResponse.json(
            { error: 'Invalid user account' },
            { status: 403 },
          );
        }

        // Additional security checks
        if (user.failed_login_attempts && user.failed_login_attempts > 5) {
          logger.warn('Account locked due to failed login attempts', {
            userId: user.id,
            failedAttempts: user.failed_login_attempts,
          });

          return NextResponse.json(
            { error: 'Account temporarily locked' },
            { status: 423 },
          );
        }

        // Add auth context to request
        authenticatedRequest.userId = user.id;
        authenticatedRequest.userRole = user.role;
        authenticatedRequest.supplierId = user.supplier_id;

        // Supplier ownership verification
        if (config.requireSupplierOwnership) {
          if (!user.supplier_id) {
            logger.warn(
              'Supplier ownership required but user has no supplier',
              {
                userId: user.id,
                path: req.nextUrl.pathname,
              },
            );

            return NextResponse.json(
              { error: 'Supplier account required' },
              { status: 403 },
            );
          }

          // Verify supplier is active
          const { data: supplier, error: supplierError } = await supabase
            .from('suppliers')
            .select('id, status')
            .eq('id', user.supplier_id)
            .single();

          if (supplierError || !supplier || supplier.status !== 'active') {
            logger.warn('Supplier verification failed', {
              supplierId: user.supplier_id,
              supplierStatus: supplier?.status,
              error: supplierError?.message,
            });

            return NextResponse.json(
              { error: 'Invalid supplier account' },
              { status: 403 },
            );
          }
        }
      }

      // CSRF Protection for state-changing operations
      if (
        config.csrfProtection &&
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)
      ) {
        const origin = req.headers.get('origin');
        const referer = req.headers.get('referer');
        const host = req.headers.get('host');

        // Validate origin/referer
        const allowedOrigins = [
          process.env.NEXT_PUBLIC_APP_URL,
          `https://${host}`,
          process.env.NODE_ENV === 'development' ? `http://${host}` : null,
        ].filter(Boolean);

        const isValidOrigin =
          origin &&
          allowedOrigins.some(
            (allowed) => origin === allowed || origin.startsWith(allowed + '/'),
          );

        const isValidReferer =
          referer &&
          allowedOrigins.some((allowed) => referer.startsWith(allowed));

        if (!isValidOrigin && !isValidReferer) {
          logger.warn('CSRF protection triggered', {
            origin,
            referer,
            host,
            allowedOrigins,
            path: req.nextUrl.pathname,
            method: req.method,
          });

          return NextResponse.json(
            { error: 'Invalid request origin' },
            { status: 403 },
          );
        }
      }

      // Input validation
      let validatedData: any = {};

      // Validate request body
      if (
        config.validateBody &&
        ['POST', 'PUT', 'PATCH'].includes(req.method)
      ) {
        try {
          const body = await req.json();
          validatedData.body = config.validateBody.parse(body);
        } catch (error) {
          logger.warn('Request body validation failed', {
            path: req.nextUrl.pathname,
            method: req.method,
            error:
              error instanceof Error
                ? error.message
                : 'Unknown validation error',
          });

          if (error instanceof z.ZodError) {
            return NextResponse.json(
              {
                error: 'Invalid request body',
                details: error.errors.map((err) => ({
                  field: err.path.join('.'),
                  message: err.message,
                })),
              },
              { status: 400 },
            );
          }

          return NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 },
          );
        }
      }

      // Validate URL parameters
      if (config.validateParams) {
        try {
          validatedData.params = config.validateParams.parse(context.params);
        } catch (error) {
          logger.warn('URL parameters validation failed', {
            path: req.nextUrl.pathname,
            params: context.params,
            error:
              error instanceof Error
                ? error.message
                : 'Unknown validation error',
          });

          if (error instanceof z.ZodError) {
            return NextResponse.json(
              {
                error: 'Invalid URL parameters',
                details: error.errors.map((err) => ({
                  field: err.path.join('.'),
                  message: err.message,
                })),
              },
              { status: 400 },
            );
          }

          return NextResponse.json(
            { error: 'Invalid URL parameters' },
            { status: 400 },
          );
        }
      }

      // Validate query parameters
      if (config.validateQuery) {
        try {
          const searchParams = Object.fromEntries(
            req.nextUrl.searchParams.entries(),
          );
          validatedData.query = config.validateQuery.parse(searchParams);
        } catch (error) {
          logger.warn('Query parameters validation failed', {
            path: req.nextUrl.pathname,
            query: Object.fromEntries(req.nextUrl.searchParams.entries()),
            error:
              error instanceof Error
                ? error.message
                : 'Unknown validation error',
          });

          if (error instanceof z.ZodError) {
            return NextResponse.json(
              {
                error: 'Invalid query parameters',
                details: error.errors.map((err) => ({
                  field: err.path.join('.'),
                  message: err.message,
                })),
              },
              { status: 400 },
            );
          }

          return NextResponse.json(
            { error: 'Invalid query parameters' },
            { status: 400 },
          );
        }
      }

      // Add validated data to request context
      (authenticatedRequest as any).validatedData = validatedData;

      // Log successful request
      logger.info('API request processed', {
        path: req.nextUrl.pathname,
        method: req.method,
        userId: authenticatedRequest.userId,
        supplierId: authenticatedRequest.supplierId,
        userAgent: req.headers.get('user-agent'),
        ip: req.ip,
      });

      // Call the handler
      const result = await handler(authenticatedRequest, context);

      // Add security headers to the response
      result.headers.set('X-Content-Type-Options', 'nosniff');
      result.headers.set('X-Frame-Options', 'DENY');
      result.headers.set('X-XSS-Protection', '1; mode=block');
      result.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      result.headers.set(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=()',
      );

      if (config.rateLimit) {
        const rateLimitResult = await rateLimit({
          key: `api_${req.ip || 'unknown'}_${req.nextUrl.pathname}`,
          limit: 0, // Just get current stats
          windowMs: config.rateLimit.windowMs,
        });

        result.headers.set(
          'X-RateLimit-Limit',
          config.rateLimit.requests.toString(),
        );
        result.headers.set(
          'X-RateLimit-Remaining',
          rateLimitResult.remaining.toString(),
        );
        result.headers.set(
          'X-RateLimit-Reset',
          new Date(rateLimitResult.reset).toISOString(),
        );
      }

      return result;
    } catch (error) {
      logger.error('Security middleware error', {
        path: req.nextUrl.pathname,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  };
}

/**
 * Helper function for creating secure API routes
 */
export function createSecureRoute<T = any>(
  config: SecurityConfig,
  handler: (req: AuthenticatedRequest, context: T) => Promise<NextResponse>,
) {
  return withSecurity(config, handler);
}

/**
 * Predefined security configurations
 */
export const SecurityPresets = {
  // Public endpoints with basic protection
  PUBLIC: {
    requireAuth: false,
    rateLimit: { requests: 100, windowMs: 60 * 1000 }, // 100 req/min
    csrfProtection: false,
  } as SecurityConfig,

  // Authenticated user endpoints
  AUTHENTICATED: {
    requireAuth: true,
    rateLimit: { requests: 200, windowMs: 60 * 1000 }, // 200 req/min
    csrfProtection: true,
  } as SecurityConfig,

  // Supplier-specific endpoints
  SUPPLIER: {
    requireAuth: true,
    requireSupplierOwnership: true,
    rateLimit: { requests: 150, windowMs: 60 * 1000 }, // 150 req/min
    csrfProtection: true,
  } as SecurityConfig,

  // Email/webhook endpoints with strict limits
  EMAIL_API: {
    requireAuth: true,
    requireSupplierOwnership: true,
    rateLimit: { requests: 10, windowMs: 60 * 1000 }, // 10 req/min
    csrfProtection: true,
  } as SecurityConfig,

  // Webhook endpoints (no auth but signature verification)
  WEBHOOK: {
    requireAuth: false,
    rateLimit: { requests: 50, windowMs: 60 * 1000 }, // 50 req/min
    csrfProtection: false,
  } as SecurityConfig,
};
