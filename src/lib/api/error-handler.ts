/**
 * API Error Handling System
 * Provides standardized error classes and handling for API routes
 */

export class ApiException extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any,
  ) {
    super(message);
    this.name = 'ApiException';
    this.statusCode = statusCode;
    this.code = code || 'API_ERROR';
    this.details = details;
  }
}

export class ValidationException extends ApiException {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationException';
  }
}

export class AuthenticationException extends ApiException {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthenticationException';
  }
}

export class AuthorizationException extends ApiException {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationException';
  }
}

export class NotFoundException extends ApiException {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundException';
  }
}

export class ConflictException extends ApiException {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictException';
  }
}

export class RateLimitException extends ApiException {
  constructor(retryAfter?: number) {
    super('Too many requests', 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.name = 'RateLimitException';
  }
}

export class ExternalServiceException extends ApiException {
  constructor(service: string, originalError?: any) {
    super(`External service error: ${service}`, 503, 'EXTERNAL_SERVICE_ERROR', {
      service,
      originalError: originalError?.message,
    });
    this.name = 'ExternalServiceException';
  }
}

/**
 * Handle API errors and convert to appropriate HTTP responses
 */
export function handleApiError(error: any): {
  status: number;
  body: {
    success: false;
    error: string;
    code: string;
    details?: any;
  };
} {
  // Handle our custom ApiException instances
  if (error instanceof ApiException) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      },
    };
  }

  // Handle Zod validation errors
  if (error?.name === 'ZodError') {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.issues,
      },
    };
  }

  // Handle generic errors
  console.error('Unhandled API error:', error);

  return {
    status: 500,
    body: {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  };
}

/**
 * Async error wrapper for API route handlers
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  handler: T,
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      const { status, body } = handleApiError(error);
      return Response.json(body, { status });
    }
  }) as T;
}

/**
 * Wedding-specific error types
 */
export class WeddingDateException extends ApiException {
  constructor(message: string = 'Invalid wedding date') {
    super(message, 400, 'WEDDING_DATE_ERROR');
    this.name = 'WeddingDateException';
  }
}

export class VendorCapacityException extends ApiException {
  constructor(vendorType: string) {
    super(
      `${vendorType} is fully booked for this date`,
      409,
      'VENDOR_CAPACITY_ERROR',
    );
    this.name = 'VendorCapacityException';
  }
}

export class GuestLimitException extends ApiException {
  constructor(limit: number) {
    super(`Guest limit of ${limit} exceeded`, 400, 'GUEST_LIMIT_ERROR', {
      limit,
    });
    this.name = 'GuestLimitException';
  }
}
