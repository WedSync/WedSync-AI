/**
 * Validation middleware for API routes
 * SECURITY: Enforces input validation on all API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export interface ValidationMiddlewareOptions {
  skipAuth?: boolean;
  requireAuth?: boolean;
  skipRateLimit?: boolean;
  customErrorMessage?: string;
}

/**
 * Create API route validation middleware with Zod schema
 */
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (
    request: NextRequest,
    validatedData: T,
  ) => Promise<NextResponse> | NextResponse,
  options: ValidationMiddlewareOptions = {},
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Parse request body
      let body: unknown;
      try {
        const text = await request.text();
        body = text ? JSON.parse(text) : {};
      } catch (error) {
        return NextResponse.json(
          {
            error: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
            details: 'Failed to parse request body as JSON',
          },
          { status: 400 },
        );
      }

      // Validate with Zod schema
      const validationResult = validateWithSchema(schema, body);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: options.customErrorMessage || 'Invalid request data',
            errors: validationResult.errors,
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        );
      }

      // Call the actual handler with validated data
      return await handler(request, validationResult.data!);
    } catch (error) {
      console.error('Validation middleware error:', error);
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'An internal error occurred during validation',
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Query parameter validation middleware
 */
export function withQueryValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (
    request: NextRequest,
    validatedQuery: T,
  ) => Promise<NextResponse> | NextResponse,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Parse query parameters
      const url = new URL(request.url);
      const queryObject: Record<string, string> = {};

      url.searchParams.forEach((value, key) => {
        queryObject[key] = value;
      });

      // Validate query parameters
      const validationResult = validateWithSchema(schema, queryObject);

      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'INVALID_QUERY_PARAMETERS',
            message: 'Invalid query parameters',
            errors: validationResult.errors,
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        );
      }

      return await handler(request, validationResult.data!);
    } catch (error) {
      console.error('Query validation error:', error);
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'An internal error occurred during query validation',
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Combined body and query validation
 */
export function withFullValidation<TBody, TQuery>(
  bodySchema: z.ZodSchema<TBody>,
  querySchema: z.ZodSchema<TQuery>,
  handler: (
    request: NextRequest,
    validatedBody: TBody,
    validatedQuery: TQuery,
  ) => Promise<NextResponse> | NextResponse,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Validate request body
      let body: unknown;
      try {
        const text = await request.text();
        body = text ? JSON.parse(text) : {};
      } catch (error) {
        return NextResponse.json(
          { error: 'INVALID_JSON', message: 'Request body must be valid JSON' },
          { status: 400 },
        );
      }

      // Validate query parameters
      const url = new URL(request.url);
      const queryObject: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        queryObject[key] = value;
      });

      // Validate both body and query
      const bodyValidation = validateWithSchema(bodySchema, body);
      const queryValidation = validateWithSchema(querySchema, queryObject);

      const errors: string[] = [];
      if (!bodyValidation.success) {
        errors.push(...(bodyValidation.errors?.map((e) => `body.${e}`) || []));
      }
      if (!queryValidation.success) {
        errors.push(
          ...(queryValidation.errors?.map((e) => `query.${e}`) || []),
        );
      }

      if (errors.length > 0) {
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            errors,
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        );
      }

      return await handler(
        request,
        bodyValidation.data!,
        queryValidation.data!,
      );
    } catch (error) {
      console.error('Full validation error:', error);
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'An internal error occurred during validation',
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Core validation function with detailed error reporting
 */
function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err) => {
        const path = err.path.length > 0 ? err.path.join('.') : 'root';
        return `${path}: ${err.message}`;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Security-focused validation for sensitive operations
 */
export function withSecureValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (
    request: NextRequest,
    validatedData: T,
  ) => Promise<NextResponse> | NextResponse,
) {
  return withValidation(
    schema,
    async (request, validatedData) => {
      // Additional security checks for sensitive operations
      const userAgent = request.headers.get('user-agent');
      const referer = request.headers.get('referer');

      // Basic bot detection
      if (!userAgent || /bot|crawler|spider/i.test(userAgent)) {
        return NextResponse.json(
          { error: 'FORBIDDEN', message: 'Automated requests not allowed' },
          { status: 403 },
        );
      }

      // Ensure requests come from same origin for state-changing operations
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const origin = request.headers.get('origin');
        const host = request.headers.get('host');

        if (!origin || !host || !origin.includes(host)) {
          return NextResponse.json(
            {
              error: 'FORBIDDEN',
              message: 'Cross-origin requests not allowed',
            },
            { status: 403 },
          );
        }
      }

      return await handler(request, validatedData);
    },
    { requireAuth: true },
  );
}

/**
 * File upload validation middleware
 */
export function withFileValidation(
  allowedTypes: string[],
  maxSize: number = 50 * 1024 * 1024, // 50MB
  handler: (
    request: NextRequest,
    file: File,
  ) => Promise<NextResponse> | NextResponse,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { error: 'NO_FILE', message: 'No file provided' },
          { status: 400 },
        );
      }

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            error: 'INVALID_FILE_TYPE',
            message: `File type ${file.type} not allowed`,
            allowedTypes,
          },
          { status: 400 },
        );
      }

      // Validate file size
      if (file.size > maxSize) {
        return NextResponse.json(
          {
            error: 'FILE_TOO_LARGE',
            message: `File size ${file.size} exceeds maximum ${maxSize} bytes`,
          },
          { status: 400 },
        );
      }

      // Validate filename
      const sanitizedName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 255);
      if (!sanitizedName) {
        return NextResponse.json(
          { error: 'INVALID_FILENAME', message: 'Invalid filename' },
          { status: 400 },
        );
      }

      return await handler(request, file);
    } catch (error) {
      console.error('File validation error:', error);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'File validation failed' },
        { status: 500 },
      );
    }
  };
}

/**
 * Rate limiting validation helper
 */
export function createRateLimitedHandler<T>(
  schema: z.ZodSchema<T>,
  handler: (
    request: NextRequest,
    validatedData: T,
  ) => Promise<NextResponse> | NextResponse,
  rateLimit: { requests: number; window: number } = {
    requests: 100,
    window: 3600,
  }, // 100 per hour
) {
  return withValidation(schema, async (request, validatedData) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const key = `rate_limit:${ip}:${request.nextUrl.pathname}`;

    // In production, this would use Redis or another persistent store
    // For now, this is a placeholder for the rate limiting logic

    return await handler(request, validatedData);
  });
}

/**
 * Verify couple access for seating operations
 * Ensures user has permission to access couple's data
 */
export async function verifyCoupleAccess(
  request: NextRequest,
  coupleId: string,
): Promise<void> {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('UNAUTHORIZED: Authentication required');
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!profile?.organization_id) {
    throw new Error('UNAUTHORIZED: No organization found');
  }

  // Verify couple belongs to user's organization
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, organization_id')
    .eq('id', coupleId)
    .eq('organization_id', profile.organization_id)
    .single();

  if (clientError || !client) {
    throw new Error('FORBIDDEN: Access denied to couple data');
  }
}

/**
 * Rate limiting for seating optimization endpoints
 * Prevents abuse of computationally expensive operations
 */
export class SeatingOptimizationRateLimiter {
  private static requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private static readonly MAX_REQUESTS = 10;
  private static readonly WINDOW_MS = 60 * 1000; // 1 minute

  static async checkRateLimit(
    userId: string,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const userKey = `seating_opt_${userId}`;
    const userData = this.requestCounts.get(userKey);

    // Reset if window expired
    if (!userData || now >= userData.resetTime) {
      this.requestCounts.set(userKey, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return {
        allowed: true,
        remaining: this.MAX_REQUESTS - 1,
        resetTime: now + this.WINDOW_MS,
      };
    }

    // Check if limit exceeded
    if (userData.count >= this.MAX_REQUESTS) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: userData.resetTime,
      };
    }

    // Increment count
    userData.count++;
    this.requestCounts.set(userKey, userData);

    return {
      allowed: true,
      remaining: this.MAX_REQUESTS - userData.count,
      resetTime: userData.resetTime,
    };
  }
}

/**
 * Enhanced secure validation with rate limiting for seating optimization
 */
export function withSeatingSecureValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (
    request: NextRequest,
    validatedData: T,
  ) => Promise<NextResponse> | NextResponse,
) {
  return withSecureValidation(schema, async (request, validatedData) => {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 },
        );
      }

      // Check rate limit for optimization endpoints
      const rateLimit = await SeatingOptimizationRateLimiter.checkRateLimit(
        user.id,
      );

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'RATE_LIMITED',
            message:
              'Too many optimization requests. Please wait before trying again.',
            resetTime: rateLimit.resetTime,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': '10',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.ceil(
                rateLimit.resetTime / 1000,
              ).toString(),
            },
          },
        );
      }

      // Add rate limit headers to successful responses
      const response = await handler(request, validatedData);

      response.headers.set('X-RateLimit-Limit', '10');
      response.headers.set(
        'X-RateLimit-Remaining',
        rateLimit.remaining.toString(),
      );
      response.headers.set(
        'X-RateLimit-Reset',
        Math.ceil(rateLimit.resetTime / 1000).toString(),
      );

      return response;
    } catch (error) {
      console.error('Seating validation error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Validation failed' },
        {
          status:
            error instanceof Error && error.message.startsWith('UNAUTHORIZED')
              ? 401
              : error instanceof Error && error.message.startsWith('FORBIDDEN')
                ? 403
                : 500,
        },
      );
    }
  });
}

export default withValidation;
