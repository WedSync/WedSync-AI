import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { CacheService, CACHE_PREFIXES } from '../cache/redis-client';

// Error types
export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  EXTERNAL_API = 'external_api',
  DATABASE = 'database',
  CACHE = 'cache',
  OCR_PROCESSING = 'ocr_processing',
  ML_PROCESSING = 'ml_processing',
  BATCH_PROCESSING = 'batch_processing',
  FILE_PROCESSING = 'file_processing',
  NETWORK = 'network',
  INTERNAL = 'internal',
  TIMEOUT = 'timeout',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  user_id?: string;
  wedding_id?: string;
  job_id?: string;
  operation?: string;
  additional_data?: Record<string, any>;
}

export interface AppError {
  type: ErrorType;
  message: string;
  severity: ErrorSeverity;
  code: string;
  context?: ErrorContext;
  originalError?: Error;
  timestamp: string;
  stack?: string;
  suggestions?: string[];
}

export interface RetryConfig {
  max_attempts: number;
  base_delay_ms: number;
  max_delay_ms: number;
  exponential_backoff: boolean;
  retry_on: ErrorType[];
}

export interface ApiErrorResponse {
  error: true;
  type: ErrorType;
  message: string;
  code: string;
  request_id: string;
  timestamp: string;
  suggestions?: string[];
  details?: any;
}

class ErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    max_attempts: 3,
    base_delay_ms: 1000,
    max_delay_ms: 30000,
    exponential_backoff: true,
    retry_on: [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.EXTERNAL_API,
      ErrorType.CACHE,
    ],
  };

  // Create structured application error
  static createError(
    type: ErrorType,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext,
    originalError?: Error,
  ): AppError {
    const error: AppError = {
      type,
      message,
      severity,
      code: this.generateErrorCode(type),
      context,
      originalError,
      timestamp: new Date().toISOString(),
      stack: originalError?.stack || new Error().stack,
    };

    // Add contextual suggestions
    error.suggestions = this.getSuggestions(type, context);

    return error;
  }

  // Handle and format error for API response
  static async handleApiError(
    error: any,
    context?: ErrorContext,
    requestId?: string,
  ): Promise<NextResponse> {
    let appError: AppError;

    // Convert various error types to AppError
    if (error instanceof ZodError) {
      appError = this.createError(
        ErrorType.VALIDATION,
        'Invalid request data',
        ErrorSeverity.LOW,
        context,
        error,
      );
    } else if (error.code === 'PGRST116') {
      // Supabase not found
      appError = this.createError(
        ErrorType.NOT_FOUND,
        'Resource not found',
        ErrorSeverity.LOW,
        context,
        error,
      );
    } else if (error.code === '42501') {
      // PostgreSQL insufficient privilege
      appError = this.createError(
        ErrorType.AUTHORIZATION,
        'Insufficient permissions',
        ErrorSeverity.MEDIUM,
        context,
        error,
      );
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      appError = this.createError(
        ErrorType.NETWORK,
        'Network connection failed',
        ErrorSeverity.HIGH,
        context,
        error,
      );
    } else if (error.name === 'TimeoutError') {
      appError = this.createError(
        ErrorType.TIMEOUT,
        'Operation timed out',
        ErrorSeverity.MEDIUM,
        context,
        error,
      );
    } else if (error.message?.includes('rate limit')) {
      appError = this.createError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded',
        ErrorSeverity.MEDIUM,
        context,
        error,
      );
    } else if (error instanceof AppError) {
      appError = error;
    } else {
      appError = this.createError(
        ErrorType.INTERNAL,
        error.message || 'An unexpected error occurred',
        ErrorSeverity.HIGH,
        context,
        error,
      );
    }

    // Log error
    await this.logError(appError, requestId);

    // Create API response
    const response: ApiErrorResponse = {
      error: true,
      type: appError.type,
      message: appError.message,
      code: appError.code,
      request_id: requestId || this.generateRequestId(),
      timestamp: appError.timestamp,
      suggestions: appError.suggestions,
    };

    // Add details for validation errors
    if (error instanceof ZodError) {
      response.details = {
        validation_errors: error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      };
    }

    // Determine HTTP status code
    const statusCode = this.getHttpStatusCode(appError.type);

    return NextResponse.json(response, { status: statusCode });
  }

  // Retry mechanism with exponential backoff
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context?: ErrorContext,
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config };
    let lastError: any;

    for (let attempt = 1; attempt <= retryConfig.max_attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        const appError = this.createError(
          this.determineErrorType(error),
          error.message || 'Operation failed',
          ErrorSeverity.MEDIUM,
          { ...context, attempt },
          error,
        );

        // Check if this error type should be retried
        if (!retryConfig.retry_on.includes(appError.type)) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === retryConfig.max_attempts) {
          break;
        }

        // Calculate delay with exponential backoff
        let delay = retryConfig.base_delay_ms;
        if (retryConfig.exponential_backoff) {
          delay = Math.min(
            retryConfig.base_delay_ms * Math.pow(2, attempt - 1),
            retryConfig.max_delay_ms,
          );
        }

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        delay += jitter;

        // Only log in development to avoid production console pollution
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `Retry attempt ${attempt}/${retryConfig.max_attempts} for ${appError.type} after ${delay}ms`,
          );
        }

        // Log retry attempt
        await this.logError(appError);

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  // Graceful degradation wrapper
  static async withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    context?: ErrorContext,
  ): Promise<T> {
    try {
      return await primary();
    } catch (error) {
      const appError = this.createError(
        this.determineErrorType(error),
        'Primary operation failed, using fallback',
        ErrorSeverity.MEDIUM,
        context,
        error,
      );

      await this.logError(appError);

      console.warn('Primary operation failed, falling back:', error.message);
      return await fallback();
    }
  }

  // Circuit breaker pattern
  static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitKey: string,
    options: {
      failure_threshold?: number;
      reset_timeout_ms?: number;
      monitor_window_ms?: number;
    } = {},
  ): Promise<T> {
    const {
      failure_threshold = 5,
      reset_timeout_ms = 60000,
      monitor_window_ms = 300000,
    } = options;

    const circuitState = await this.getCircuitState(circuitKey);

    // Circuit is open (failing)
    if (circuitState.state === 'open') {
      if (Date.now() - circuitState.last_failure < reset_timeout_ms) {
        throw this.createError(
          ErrorType.EXTERNAL_API,
          'Circuit breaker is open - operation not attempted',
          ErrorSeverity.HIGH,
          { circuit_key: circuitKey },
        );
      } else {
        // Try to close circuit (half-open state)
        await this.setCircuitState(circuitKey, 'half-open');
      }
    }

    try {
      const result = await operation();

      // Success - close circuit if it was half-open
      if (circuitState.state === 'half-open') {
        await this.setCircuitState(circuitKey, 'closed');
      }

      return result;
    } catch (error) {
      // Record failure
      const failures = await this.recordCircuitFailure(circuitKey);

      // Open circuit if threshold reached
      if (failures >= failure_threshold) {
        await this.setCircuitState(circuitKey, 'open');
      }

      throw error;
    }
  }

  // Timeout wrapper
  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    context?: ErrorContext,
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            this.createError(
              ErrorType.TIMEOUT,
              `Operation timed out after ${timeoutMs}ms`,
              ErrorSeverity.MEDIUM,
              context,
            ),
          );
        }, timeoutMs);
      }),
    ]);
  }

  // Bulk operation error handling
  static async handleBulkOperation<T, R>(
    items: T[],
    operation: (item: T, index: number) => Promise<R>,
    options: {
      continue_on_error?: boolean;
      max_parallel?: number;
      collect_errors?: boolean;
    } = {},
  ): Promise<{
    results: R[];
    errors: Array<{ index: number; item: T; error: AppError }>;
    success_count: number;
    error_count: number;
  }> {
    const {
      continue_on_error = true,
      max_parallel = 10,
      collect_errors = true,
    } = options;

    const results: R[] = [];
    const errors: Array<{ index: number; item: T; error: AppError }> = [];

    // Process items in parallel chunks
    for (let i = 0; i < items.length; i += max_parallel) {
      const chunk = items.slice(i, i + max_parallel);
      const chunkPromises = chunk.map(async (item, chunkIndex) => {
        const actualIndex = i + chunkIndex;
        try {
          const result = await operation(item, actualIndex);
          results[actualIndex] = result;
        } catch (error) {
          const appError = this.createError(
            this.determineErrorType(error),
            error.message || 'Bulk operation item failed',
            ErrorSeverity.LOW,
            { bulk_operation_index: actualIndex },
            error,
          );

          if (collect_errors) {
            errors.push({
              index: actualIndex,
              item,
              error: appError,
            });
          }

          if (!continue_on_error) {
            throw error;
          }
        }
      });

      await Promise.allSettled(chunkPromises);
    }

    return {
      results: results.filter((r) => r !== undefined),
      errors,
      success_count: results.filter((r) => r !== undefined).length,
      error_count: errors.length,
    };
  }

  // Helper methods

  private static generateErrorCode(type: ErrorType): string {
    const prefix = type.toUpperCase().replace('_', '');
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 4);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  }

  private static generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getSuggestions(
    type: ErrorType,
    context?: ErrorContext,
  ): string[] {
    const suggestions: Record<ErrorType, string[]> = {
      [ErrorType.VALIDATION]: [
        'Check the request data format and required fields',
        'Ensure all data types match the API specification',
        'Verify that arrays and objects are properly structured',
      ],
      [ErrorType.AUTHENTICATION]: [
        'Verify your authentication token is valid and not expired',
        'Check that you are logged in with the correct account',
        'Ensure proper authentication headers are included',
      ],
      [ErrorType.AUTHORIZATION]: [
        'Verify you have permission to access this resource',
        'Check if you are a member of the wedding or have the required role',
        'Contact the wedding organizer for access',
      ],
      [ErrorType.RATE_LIMIT]: [
        'Wait before making another request',
        'Implement exponential backoff in your client',
        'Consider upgrading your plan for higher rate limits',
      ],
      [ErrorType.NETWORK]: [
        'Check your internet connection',
        'Verify the API endpoint is accessible',
        'Try again after a brief delay',
      ],
      [ErrorType.DATABASE]: [
        'Check if the database is accessible',
        'Verify that required records exist',
        'Try again after a moment',
      ],
      [ErrorType.OCR_PROCESSING]: [
        'Ensure the image is clear and readable',
        'Check that the file format is supported (JPEG, PNG)',
        'Verify the image contains receipt or invoice data',
      ],
      [ErrorType.ML_PROCESSING]: [
        'Check that sufficient data is available for prediction',
        'Verify the wedding has budget categories configured',
        'Ensure historical data exists for comparison',
      ],
      [ErrorType.EXTERNAL_API]: [
        'Check if the external service is operational',
        'Verify API credentials are configured correctly',
        'Try again later if the service is temporarily unavailable',
      ],
      [ErrorType.TIMEOUT]: [
        'The operation took longer than expected - try again',
        'Consider breaking large operations into smaller chunks',
        'Check if the system is experiencing high load',
      ],
      [ErrorType.INTERNAL]: [
        'This appears to be a system error - please try again',
        'If the error persists, please contact support',
        'Include the error code when reporting this issue',
      ],
    };

    return (
      suggestions[type] || [
        'Please try again or contact support if the issue persists',
      ]
    );
  }

  private static determineErrorType(error: any): ErrorType {
    if (error instanceof ZodError) return ErrorType.VALIDATION;
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')
      return ErrorType.NETWORK;
    if (error.name === 'TimeoutError') return ErrorType.TIMEOUT;
    if (error.message?.includes('rate limit')) return ErrorType.RATE_LIMIT;
    if (error.code?.startsWith('PGRST')) return ErrorType.DATABASE;
    if (error.code?.startsWith('42')) return ErrorType.DATABASE; // PostgreSQL errors
    if (error.message?.includes('OCR') || error.message?.includes('vision'))
      return ErrorType.OCR_PROCESSING;
    if (error.message?.includes('ML') || error.message?.includes('prediction'))
      return ErrorType.ML_PROCESSING;
    return ErrorType.INTERNAL;
  }

  private static getHttpStatusCode(type: ErrorType): number {
    const statusMap: Record<ErrorType, number> = {
      [ErrorType.VALIDATION]: 400,
      [ErrorType.AUTHENTICATION]: 401,
      [ErrorType.AUTHORIZATION]: 403,
      [ErrorType.NOT_FOUND]: 404,
      [ErrorType.RATE_LIMIT]: 429,
      [ErrorType.EXTERNAL_API]: 502,
      [ErrorType.DATABASE]: 503,
      [ErrorType.CACHE]: 503,
      [ErrorType.OCR_PROCESSING]: 422,
      [ErrorType.ML_PROCESSING]: 422,
      [ErrorType.BATCH_PROCESSING]: 422,
      [ErrorType.FILE_PROCESSING]: 422,
      [ErrorType.NETWORK]: 502,
      [ErrorType.TIMEOUT]: 504,
      [ErrorType.INTERNAL]: 500,
    };

    return statusMap[type] || 500;
  }

  private static async logError(
    error: AppError,
    requestId?: string,
  ): Promise<void> {
    try {
      const logEntry = {
        ...error,
        request_id: requestId,
        environment: process.env.NODE_ENV || 'development',
      };

      // Log to console
      if (
        error.severity === ErrorSeverity.CRITICAL ||
        error.severity === ErrorSeverity.HIGH
      ) {
        console.error('ERROR:', logEntry);
      } else {
        console.warn('WARNING:', logEntry);
      }

      // Store in database for analysis
      const supabase = createClient();
      await supabase.from('error_logs').insert({
        error_type: error.type,
        message: error.message,
        severity: error.severity,
        code: error.code,
        context: error.context,
        stack_trace: error.stack,
        request_id: requestId,
        timestamp: error.timestamp,
        created_at: new Date().toISOString(),
      });

      // Alert on critical errors
      if (error.severity === ErrorSeverity.CRITICAL) {
        await this.alertCriticalError(error, requestId);
      }
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  }

  private static async alertCriticalError(
    error: AppError,
    requestId?: string,
  ): Promise<void> {
    // In production, this would integrate with alerting systems like PagerDuty, Slack, etc.
    console.error('CRITICAL ERROR ALERT:', {
      error_code: error.code,
      message: error.message,
      request_id: requestId,
      timestamp: error.timestamp,
    });
  }

  private static async getCircuitState(circuitKey: string): Promise<{
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    last_failure: number;
  }> {
    const key = CacheService.buildKey(
      CACHE_PREFIXES.RATE_LIMIT,
      'circuit',
      circuitKey,
    );
    const state = await CacheService.get<any>(key);

    return (
      state || {
        state: 'closed',
        failures: 0,
        last_failure: 0,
      }
    );
  }

  private static async setCircuitState(
    circuitKey: string,
    state: 'closed' | 'open' | 'half-open',
  ): Promise<void> {
    const key = CacheService.buildKey(
      CACHE_PREFIXES.RATE_LIMIT,
      'circuit',
      circuitKey,
    );
    const currentState = await this.getCircuitState(circuitKey);

    const newState = {
      ...currentState,
      state,
      last_failure: state === 'open' ? Date.now() : currentState.last_failure,
    };

    await CacheService.set(key, newState, 3600); // 1 hour TTL
  }

  private static async recordCircuitFailure(
    circuitKey: string,
  ): Promise<number> {
    const key = CacheService.buildKey(
      CACHE_PREFIXES.RATE_LIMIT,
      'circuit',
      circuitKey,
    );
    const state = await this.getCircuitState(circuitKey);

    const newState = {
      ...state,
      failures: state.failures + 1,
      last_failure: Date.now(),
    };

    await CacheService.set(key, newState, 3600);
    return newState.failures;
  }
}

// Convenience functions for common patterns

export const withRetry = ErrorHandler.withRetry;
export const withFallback = ErrorHandler.withFallback;
export const withTimeout = ErrorHandler.withTimeout;
export const withCircuitBreaker = ErrorHandler.withCircuitBreaker;
export const handleBulkOperation = ErrorHandler.handleBulkOperation;

export default ErrorHandler;
