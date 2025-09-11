import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // File Operations
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BANDWIDTH_EXCEEDED = 'BANDWIDTH_EXCEEDED',

  // Business Logic
  PHOTO_GROUP_NOT_FOUND = 'PHOTO_GROUP_NOT_FOUND',
  WEDDING_NOT_FOUND = 'WEDDING_NOT_FOUND',
  GUEST_NOT_FOUND = 'GUEST_NOT_FOUND',
  DUPLICATE_PHOTO = 'DUPLICATE_PHOTO',

  // Network
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // General
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
    retryable: boolean;
    retryAfter?: number;
  };
}

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: any,
    public retryable: boolean = false,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorContext {
  userId?: string;
  weddingId?: string;
  photoGroupId?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class ProductionErrorHandler {
  private static instance: ProductionErrorHandler;
  private requestCounter = 0;
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  static getInstance(): ProductionErrorHandler {
    if (!this.instance) {
      this.instance = new ProductionErrorHandler();
    }
    return this.instance;
  }

  generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const counter = (++this.requestCounter).toString(36).padStart(5, '0');
    const random = Math.random().toString(36).substr(2, 9);
    return `pg-${timestamp}-${counter}-${random}`;
  }

  async handleError(
    error: unknown,
    context: ErrorContext = {},
    requestId?: string,
  ): Promise<NextResponse<ErrorResponse>> {
    const reqId = requestId || this.generateRequestId();
    const timestamp = new Date().toISOString();

    // Log error details for monitoring
    console.error('[Photo Groups API Error]', {
      requestId: reqId,
      timestamp,
      error,
      context,
    });

    // Determine error type and response
    if (error instanceof ApiError) {
      return this.handleApiError(error, reqId, timestamp, context);
    } else if (error instanceof z.ZodError) {
      return this.handleValidationError(error, reqId, timestamp, context);
    } else if (this.isDatabaseError(error)) {
      return this.handleDatabaseError(error as any, reqId, timestamp, context);
    } else if (this.isNetworkError(error)) {
      return this.handleNetworkError(error as any, reqId, timestamp, context);
    } else {
      return this.handleUnknownError(error, reqId, timestamp, context);
    }
  }

  private handleApiError(
    error: ApiError,
    requestId: string,
    timestamp: string,
    context: ErrorContext,
  ): NextResponse<ErrorResponse> {
    // Track error in Sentry
    Sentry.captureException(error, {
      tags: {
        error_code: error.code,
        request_id: requestId,
        ...context,
      },
      extra: {
        details: error.details,
        retryable: error.retryable,
      },
    });

    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: this.sanitizeErrorMessage(error.message),
          details: this.sanitizeErrorDetails(error.details),
          timestamp,
          requestId,
          retryable: error.retryable,
          retryAfter: error.retryAfter,
        },
      },
      {
        status: error.statusCode,
        headers: this.getErrorHeaders(error),
      },
    );
  }

  private handleValidationError(
    error: z.ZodError,
    requestId: string,
    timestamp: string,
    context: ErrorContext,
  ): NextResponse<ErrorResponse> {
    const validationErrors = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    Sentry.captureException(error, {
      level: 'warning',
      tags: {
        error_type: 'validation',
        request_id: requestId,
        ...context,
      },
      extra: { validationErrors },
    });

    return NextResponse.json(
      {
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid input data provided',
          details: validationErrors,
          timestamp,
          requestId,
          retryable: false,
        },
      },
      { status: 400 },
    );
  }

  private handleDatabaseError(
    error: any,
    requestId: string,
    timestamp: string,
    context: ErrorContext,
  ): NextResponse<ErrorResponse> {
    // Check for specific database errors
    const isDuplicateKey =
      error.code === '23505' || error.message?.includes('duplicate');
    const isConnectionError =
      error.code === '57P01' || error.message?.includes('connection');
    const isTimeout =
      error.code === '57014' || error.message?.includes('timeout');

    let errorCode = ErrorCode.DATABASE_ERROR;
    let statusCode = 500;
    let retryable = false;
    let message = 'Database operation failed';

    if (isDuplicateKey) {
      errorCode = ErrorCode.DUPLICATE_ENTRY;
      statusCode = 409;
      message = 'Resource already exists';
    } else if (isConnectionError) {
      errorCode = ErrorCode.CONNECTION_FAILED;
      retryable = true;
      message = 'Database connection failed';
    } else if (isTimeout) {
      errorCode = ErrorCode.TIMEOUT;
      retryable = true;
      message = 'Database operation timed out';
    }

    Sentry.captureException(error, {
      level: retryable ? 'warning' : 'error',
      tags: {
        error_type: 'database',
        error_code: errorCode,
        request_id: requestId,
        ...context,
      },
    });

    return NextResponse.json(
      {
        error: {
          code: errorCode,
          message,
          timestamp,
          requestId,
          retryable,
          retryAfter: retryable ? 5 : undefined,
        },
      },
      { status: statusCode },
    );
  }

  private handleNetworkError(
    error: any,
    requestId: string,
    timestamp: string,
    context: ErrorContext,
  ): NextResponse<ErrorResponse> {
    const isTimeout =
      error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    const isServiceDown = error.code === 'ECONNREFUSED';

    let errorCode = ErrorCode.NETWORK_ERROR;
    let message = 'Network operation failed';
    let retryable = true;
    let retryAfter = 3;

    if (isTimeout) {
      errorCode = ErrorCode.TIMEOUT;
      message = 'Request timed out';
      retryAfter = 5;
    } else if (isServiceDown) {
      errorCode = ErrorCode.SERVICE_UNAVAILABLE;
      message = 'Service temporarily unavailable';
      retryAfter = 30;
    }

    Sentry.captureException(error, {
      level: 'warning',
      tags: {
        error_type: 'network',
        error_code: errorCode,
        request_id: requestId,
        ...context,
      },
    });

    return NextResponse.json(
      {
        error: {
          code: errorCode,
          message,
          timestamp,
          requestId,
          retryable,
          retryAfter,
        },
      },
      { status: 503 },
    );
  }

  private handleUnknownError(
    error: unknown,
    requestId: string,
    timestamp: string,
    context: ErrorContext,
  ): NextResponse<ErrorResponse> {
    // Log full error for debugging
    console.error('Unknown error:', error);

    Sentry.captureException(error, {
      level: 'error',
      tags: {
        error_type: 'unknown',
        request_id: requestId,
        ...context,
      },
    });

    return NextResponse.json(
      {
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'An unexpected error occurred. Please try again later.',
          timestamp,
          requestId,
          retryable: true,
          retryAfter: 10,
        },
      },
      { status: 500 },
    );
  }

  private isDatabaseError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const err = error as any;
    return (
      err.code?.startsWith('2') ||
      err.code?.startsWith('5') ||
      err.message?.toLowerCase().includes('database') ||
      err.message?.toLowerCase().includes('supabase')
    );
  }

  private isNetworkError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const err = error as any;
    return (
      err.code?.startsWith('E') ||
      err.message?.toLowerCase().includes('network') ||
      err.message?.toLowerCase().includes('fetch')
    );
  }

  private sanitizeErrorMessage(message: string): string {
    // Remove sensitive information from error messages
    return message
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        '[ID]',
      )
      .replace(/Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/gi, 'Bearer [TOKEN]')
      .replace(/password['":\s]+[^,}]+/gi, 'password: [REDACTED]');
  }

  private sanitizeErrorDetails(details: any): any {
    if (!details) return undefined;

    // Remove sensitive fields from details
    const sanitized = { ...details };
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private getErrorHeaders(error: ApiError): HeadersInit {
    const headers: HeadersInit = {
      'X-Error-Code': error.code,
      'X-Retry-After': error.retryAfter?.toString() || '0',
    };

    if (error.retryable) {
      headers['Retry-After'] = error.retryAfter?.toString() || '5';
    }

    return headers;
  }

  // Circuit breaker for external services
  getCircuitBreaker(service: string): CircuitBreaker {
    if (!this.circuitBreakers.has(service)) {
      this.circuitBreakers.set(service, new CircuitBreaker(service));
    }
    return this.circuitBreakers.get(service)!;
  }
}

// Circuit breaker implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private service: string,
    private threshold = 5,
    private timeout = 60000, // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new ApiError(
          ErrorCode.SERVICE_UNAVAILABLE,
          `Service ${this.service} is temporarily unavailable`,
          503,
          undefined,
          true,
          Math.ceil(
            (this.timeout - (Date.now() - this.lastFailureTime)) / 1000,
          ),
        );
      }
    }

    try {
      const result = await fn();
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'open';
        console.error(`Circuit breaker opened for ${this.service}`);
        Sentry.captureMessage(
          `Circuit breaker opened for ${this.service}`,
          'warning',
        );
      }

      throw error;
    }
  }

  getState() {
    return {
      service: this.service,
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Export singleton instance
export const errorHandler = ProductionErrorHandler.getInstance();

// Retry mechanism with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        break;
      }

      // Check if error is retryable
      if (error instanceof ApiError && !error.retryable) {
        throw error;
      }

      const delay = Math.min(
        initialDelay * Math.pow(factor, attempt - 1),
        maxDelay,
      );

      if (onRetry) {
        onRetry(attempt, error);
      }

      console.log(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
