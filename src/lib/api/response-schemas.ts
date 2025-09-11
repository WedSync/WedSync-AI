// src/lib/api/response-schemas.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Standard API response format for consistency across all endpoints
export interface StandardAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    request_id?: string;
    rate_limit?: {
      remaining: number;
      reset_time: string;
    };
  };
}

// Response validation schemas
export const APIErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: APIErrorSchema.optional(),
  metadata: z
    .object({
      timestamp: z.string(),
      request_id: z.string().optional(),
      rate_limit: z
        .object({
          remaining: z.number(),
          reset_time: z.string(),
        })
        .optional(),
    })
    .optional(),
});

// Create standardized API response
export function createAPIResponse<T>(
  response: {
    success: boolean;
    data?: T;
    error?: {
      code: string;
      message: string;
      details?: any;
    };
  },
  status: number = 200,
  options?: {
    request_id?: string;
    rate_limit?: {
      remaining: number;
      reset_time: Date;
    };
  },
): NextResponse<StandardAPIResponse<T>> {
  const responseBody: StandardAPIResponse<T> = {
    success: response.success,
    data: response.data,
    error: response.error,
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: options?.request_id,
      rate_limit: options?.rate_limit
        ? {
            remaining: options.rate_limit.remaining,
            reset_time: options.rate_limit.reset_time.toISOString(),
          }
        : undefined,
    },
  };

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add rate limiting headers if provided
  if (options?.rate_limit) {
    headers['X-RateLimit-Remaining'] = options.rate_limit.remaining.toString();
    headers['X-RateLimit-Reset'] = Math.floor(
      options.rate_limit.reset_time.getTime() / 1000,
    ).toString();
  }

  return NextResponse.json(responseBody, {
    status,
    headers,
  });
}

// Error response helpers
export const APIErrors = {
  VALIDATION_FAILED: (details?: any) => ({
    code: 'VALIDATION_FAILED',
    message: 'Request validation failed',
    details,
  }),

  AUTHENTICATION_REQUIRED: () => ({
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Authentication is required to access this resource',
  }),

  AUTHORIZATION_FAILED: (resource?: string) => ({
    code: 'AUTHORIZATION_FAILED',
    message: `Insufficient permissions${resource ? ` to access ${resource}` : ''}`,
  }),

  RATE_LIMIT_EXCEEDED: (resetTime: Date) => ({
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests, please try again later',
    details: {
      reset_time: resetTime.toISOString(),
    },
  }),

  RESOURCE_NOT_FOUND: (resource: string) => ({
    code: 'RESOURCE_NOT_FOUND',
    message: `${resource} not found`,
  }),

  DUPLICATE_RESOURCE: (resource: string) => ({
    code: 'DUPLICATE_RESOURCE',
    message: `${resource} already exists`,
  }),

  EXTERNAL_SERVICE_ERROR: (service: string, details?: any) => ({
    code: 'EXTERNAL_SERVICE_ERROR',
    message: `External service ${service} is temporarily unavailable`,
    details,
  }),

  WEBHOOK_VERIFICATION_FAILED: (source: string) => ({
    code: 'WEBHOOK_VERIFICATION_FAILED',
    message: `Webhook signature verification failed for ${source}`,
  }),

  WEDDING_DATE_CONFLICT: (date: string) => ({
    code: 'WEDDING_DATE_CONFLICT',
    message: `Vendor is not available on ${date}`,
    details: { wedding_date: date },
  }),

  PAYMENT_PROCESSING_ERROR: (details?: any) => ({
    code: 'PAYMENT_PROCESSING_ERROR',
    message: 'Payment could not be processed',
    details,
  }),

  INTEGRATION_ERROR: (integration: string, error: string) => ({
    code: 'INTEGRATION_ERROR',
    message: `Integration with ${integration} failed: ${error}`,
  }),

  INTERNAL_SERVER_ERROR: () => ({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  }),
};

// Request logging interface
export interface APIRequestLog {
  requestId: string;
  method: string;
  routePattern: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
  vendorId?: string;
  businessContext?: {
    supplierType?: string;
    weddingDate?: string;
    eventType?: string;
    integrationType?: string;
  };
  errorType?: 'client' | 'server' | 'external';
  errorMessage?: string;
  errorStack?: string;
}

// Log API requests for monitoring and analytics
export async function logAPIRequest(logData: APIRequestLog): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    );

    // Store in api_requests table for analytics
    await supabase.from('api_requests').insert({
      request_id: logData.requestId,
      method: logData.method,
      route_pattern: logData.routePattern,
      status_code: logData.statusCode,
      response_time_ms: logData.responseTime,
      user_agent: logData.userAgent,
      ip_address: logData.ipAddress,
      user_id: logData.userId,
      vendor_id: logData.vendorId,
      business_context: logData.businessContext,
      error_type: logData.errorType,
      error_message: logData.errorMessage,
      error_stack: logData.errorStack,
      created_at: new Date().toISOString(),
    });

    // If it's an error, also store in api_errors for alerting
    if (logData.statusCode >= 400) {
      await supabase.from('api_errors').insert({
        request_id: logData.requestId,
        error_type: logData.errorType || 'unknown',
        status_code: logData.statusCode,
        route_pattern: logData.routePattern,
        error_message: logData.errorMessage,
        error_stack: logData.errorStack,
        business_context: logData.businessContext,
        created_at: new Date().toISOString(),
      });
    }

    // Log performance issues (slow requests)
    if (logData.responseTime > 5000) {
      // More than 5 seconds
      await supabase.from('performance_issues').insert({
        request_id: logData.requestId,
        route_pattern: logData.routePattern,
        response_time_ms: logData.responseTime,
        business_context: logData.businessContext,
        created_at: new Date().toISOString(),
      });
    }

    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `API ${logData.method} ${logData.routePattern} - ${logData.statusCode} (${logData.responseTime}ms)`,
      );
      if (logData.errorMessage) {
        console.error(`API Error: ${logData.errorMessage}`);
      }
    }
  } catch (error) {
    // Fallback logging to console if database logging fails
    console.error('Failed to log API request:', error);
    console.log('Original request log:', logData);
  }
}

// Middleware-style request logger
export function createRequestLogger(routePattern: string) {
  return {
    startTime: Date.now(),
    requestId: crypto.randomUUID(),

    async logResponse(
      method: string,
      statusCode: number,
      additionalData?: Partial<APIRequestLog>,
    ): Promise<void> {
      await logAPIRequest({
        requestId: this.requestId,
        method,
        routePattern,
        statusCode,
        responseTime: Date.now() - this.startTime,
        ...additionalData,
      });
    },

    async logError(
      method: string,
      error: Error,
      statusCode: number = 500,
      additionalData?: Partial<APIRequestLog>,
    ): Promise<void> {
      await logAPIRequest({
        requestId: this.requestId,
        method,
        routePattern,
        statusCode,
        responseTime: Date.now() - this.startTime,
        errorType: statusCode >= 500 ? 'server' : 'client',
        errorMessage: error.message,
        errorStack: error.stack,
        ...additionalData,
      });
    },
  };
}

// Wedding industry specific response helpers
export const WeddingAPIResponses = {
  bookingCreated: (booking: any) =>
    createAPIResponse(
      {
        success: true,
        data: {
          booking_id: booking.id,
          status: booking.booking_status,
          wedding_date: booking.wedding_date,
          vendor_id: booking.vendor_id,
          message: 'Booking created successfully',
        },
      },
      201,
    ),

  paymentProcessed: (payment: any) =>
    createAPIResponse({
      success: true,
      data: {
        payment_id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        message: 'Payment processed successfully',
      },
    }),

  formSubmitted: (submission: any) =>
    createAPIResponse(
      {
        success: true,
        data: {
          submission_id: submission.id,
          form_id: submission.form_id,
          vendor_id: submission.vendor_id,
          submitted_at: submission.submitted_at,
          message: 'Form submitted successfully',
        },
      },
      201,
    ),

  webhookProcessed: (eventId: string, actions: string[]) =>
    createAPIResponse({
      success: true,
      data: {
        event_id: eventId,
        processed_at: new Date().toISOString(),
        actions_taken: actions,
        message: 'Webhook processed successfully',
      },
    }),

  integrationConnected: (integration: any) =>
    createAPIResponse({
      success: true,
      data: {
        integration_id: integration.id,
        integration_type: integration.integration_type,
        vendor_id: integration.vendor_id,
        connected_at: integration.connected_at,
        message: 'Integration connected successfully',
      },
    }),

  vendorUnavailable: (weddingDate: string, vendorName: string) =>
    createAPIResponse(
      {
        success: false,
        error: APIErrors.WEDDING_DATE_CONFLICT(weddingDate),
      },
      409,
    ),

  paymentFailed: (reason: string) =>
    createAPIResponse(
      {
        success: false,
        error: APIErrors.PAYMENT_PROCESSING_ERROR({ reason }),
      },
      422,
    ),

  integrationFailed: (integrationType: string, error: string) =>
    createAPIResponse(
      {
        success: false,
        error: APIErrors.INTEGRATION_ERROR(integrationType, error),
      },
      502,
    ),
};

// Rate limiting helper
export class RateLimiter {
  private static limits: Map<string, { count: number; reset: Date }> =
    new Map();

  static checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): { allowed: boolean; remaining: number; resetTime: Date } {
    const now = Date.now();
    const existing = this.limits.get(key);

    if (!existing || now > existing.reset.getTime()) {
      // New window or expired window
      const resetTime = new Date(now + windowMs);
      this.limits.set(key, { count: 1, reset: resetTime });
      return { allowed: true, remaining: maxRequests - 1, resetTime };
    }

    if (existing.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: existing.reset };
    }

    existing.count++;
    return {
      allowed: true,
      remaining: maxRequests - existing.count,
      resetTime: existing.reset,
    };
  }

  static createRateLimitResponse(resetTime: Date): NextResponse {
    return createAPIResponse(
      {
        success: false,
        error: APIErrors.RATE_LIMIT_EXCEEDED(resetTime),
      },
      429,
      {
        rate_limit: {
          remaining: 0,
          reset_time: resetTime,
        },
      },
    );
  }
}

// Health check response
export const healthCheckResponse = () =>
  createAPIResponse({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: 'healthy',
        webhooks: 'healthy',
        integrations: 'healthy',
      },
    },
  });
