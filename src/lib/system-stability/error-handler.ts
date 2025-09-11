/**
 * Enhanced Error Handler - Comprehensive error handling and recovery
 * Prevents 500 errors and provides structured error responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auditLogger, AuditSeverity } from '@/lib/audit-logger';
import { processManager } from './process-manager';

export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  FILE_SYSTEM = 'file_system',
  NETWORK = 'network',
  MEMORY = 'memory',
  SYSTEM = 'system',
  UNKNOWN = 'unknown',
}

export interface ErrorContext {
  userId?: string;
  organizationId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  requestId?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorResponse {
  error: string;
  category: ErrorCategory;
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
  retryable: boolean;
  statusCode: number;
}

class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler | null = null;
  private errorCounts: Map<string, number> = new Map();
  private circuitBreakers: Map<
    string,
    { failures: number; lastFailure: number; isOpen: boolean }
  > = new Map();

  private constructor() {
    // Initialize circuit breaker cleanup
    setInterval(() => {
      this.cleanupCircuitBreakers();
    }, 60000); // Cleanup every minute
  }

  static getInstance(): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler();
    }
    return EnhancedErrorHandler.instance;
  }

  /**
   * Main error handling method for API routes
   */
  async handleError(
    error: Error | any,
    request: NextRequest,
    context?: ErrorContext,
  ): Promise<NextResponse<ErrorResponse>> {
    const requestId = context?.requestId || this.generateRequestId();
    const endpoint = `${request.method} ${request.nextUrl.pathname}`;

    // Categorize and analyze the error
    const { category, statusCode, code, retryable } =
      this.categorizeError(error);

    // Track error frequency
    this.trackError(endpoint, category);

    // Check circuit breaker
    if (this.shouldTriggerCircuitBreaker(endpoint, category)) {
      return this.createCircuitBreakerResponse(requestId);
    }

    // Log the error with full context
    await this.logError(error, request, context, {
      category,
      code,
      endpoint,
      requestId,
    });

    // Create structured error response
    const errorResponse: ErrorResponse = {
      error: this.sanitizeErrorMessage(
        error.message || 'Internal server error',
      ),
      category,
      code,
      message: this.getErrorMessage(category, code),
      details: this.getErrorDetails(error, category),
      timestamp: new Date().toISOString(),
      requestId,
      retryable,
      statusCode,
    };

    return NextResponse.json(errorResponse, {
      status: statusCode,
      headers: {
        'X-Request-ID': requestId,
        'X-Error-Category': category,
        'X-Retry-After': retryable ? '60' : undefined,
      },
    });
  }

  /**
   * Categorize errors and determine appropriate HTTP status codes
   */
  private categorizeError(error: any): {
    category: ErrorCategory;
    statusCode: number;
    code: string;
    retryable: boolean;
  } {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return {
        category: ErrorCategory.VALIDATION,
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        retryable: false,
      };
    }

    // Supabase/Database errors
    if (error?.code?.startsWith('PGRST') || error?.code?.startsWith('42')) {
      return {
        category: ErrorCategory.DATABASE,
        statusCode: error.code === 'PGRST116' ? 404 : 500,
        code: error.code || 'DATABASE_ERROR',
        retryable: true,
      };
    }

    // Authentication errors
    if (
      error.message?.includes('Unauthorized') ||
      error.message?.includes('Authentication')
    ) {
      return {
        category: ErrorCategory.AUTHENTICATION,
        statusCode: 401,
        code: 'AUTH_REQUIRED',
        retryable: false,
      };
    }

    // Authorization errors
    if (
      error.message?.includes('Forbidden') ||
      error.message?.includes('Access denied')
    ) {
      return {
        category: ErrorCategory.AUTHORIZATION,
        statusCode: 403,
        code: 'ACCESS_FORBIDDEN',
        retryable: false,
      };
    }

    // Rate limiting errors
    if (
      error.message?.includes('Too many requests') ||
      error.message?.includes('Rate limit')
    ) {
      return {
        category: ErrorCategory.RATE_LIMIT,
        statusCode: 429,
        code: 'RATE_LIMITED',
        retryable: true,
      };
    }

    // File system errors
    if (
      error.code === 'ENOENT' ||
      error.code === 'EACCES' ||
      error.code === 'EMFILE'
    ) {
      return {
        category: ErrorCategory.FILE_SYSTEM,
        statusCode: error.code === 'ENOENT' ? 404 : 500,
        code: error.code,
        retryable: error.code !== 'ENOENT',
      };
    }

    // Network/timeout errors
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND'
    ) {
      return {
        category: ErrorCategory.NETWORK,
        statusCode: 503,
        code: error.code,
        retryable: true,
      };
    }

    // Memory errors
    if (
      error.message?.includes('out of memory') ||
      error.name === 'RangeError'
    ) {
      return {
        category: ErrorCategory.MEMORY,
        statusCode: 507,
        code: 'MEMORY_ERROR',
        retryable: false,
      };
    }

    // Default to system error
    return {
      category: ErrorCategory.SYSTEM,
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      retryable: true,
    };
  }

  /**
   * Track error frequency for circuit breaker logic
   */
  private trackError(endpoint: string, category: ErrorCategory): void {
    const key = `${endpoint}:${category}`;
    const current = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, current + 1);

    // Update circuit breaker state
    if (!this.circuitBreakers.has(endpoint)) {
      this.circuitBreakers.set(endpoint, {
        failures: 0,
        lastFailure: 0,
        isOpen: false,
      });
    }

    const breaker = this.circuitBreakers.get(endpoint)!;
    breaker.failures++;
    breaker.lastFailure = Date.now();

    // Open circuit if too many failures
    if (breaker.failures >= 10 && !breaker.isOpen) {
      breaker.isOpen = true;
      console.warn(
        `🚨 Circuit breaker OPENED for ${endpoint} after ${breaker.failures} failures`,
      );
    }
  }

  /**
   * Check if circuit breaker should prevent processing
   */
  private shouldTriggerCircuitBreaker(
    endpoint: string,
    category: ErrorCategory,
  ): boolean {
    const breaker = this.circuitBreakers.get(endpoint);
    if (!breaker || !breaker.isOpen) return false;

    // Reset circuit breaker after 5 minutes
    if (Date.now() - breaker.lastFailure > 5 * 60 * 1000) {
      breaker.isOpen = false;
      breaker.failures = 0;
      console.log(`✅ Circuit breaker RESET for ${endpoint}`);
      return false;
    }

    return true;
  }

  /**
   * Create circuit breaker response
   */
  private createCircuitBreakerResponse(
    requestId: string,
  ): NextResponse<ErrorResponse> {
    const errorResponse: ErrorResponse = {
      error: 'Service temporarily unavailable',
      category: ErrorCategory.SYSTEM,
      code: 'CIRCUIT_BREAKER_OPEN',
      message:
        'This endpoint is temporarily unavailable due to high error rates. Please try again later.',
      timestamp: new Date().toISOString(),
      requestId,
      retryable: true,
      statusCode: 503,
    };

    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'X-Request-ID': requestId,
        'Retry-After': '300', // 5 minutes
      },
    });
  }

  /**
   * Log error with full context
   */
  private async logError(
    error: any,
    request: NextRequest,
    context?: ErrorContext,
    errorInfo?: {
      category: ErrorCategory;
      code: string;
      endpoint: string;
      requestId: string;
    },
  ): Promise<void> {
    try {
      const severity = this.getErrorSeverity(
        errorInfo?.category || ErrorCategory.UNKNOWN,
      );

      await auditLogger.log({
        event_type: 'api_error' as any,
        severity,
        user_id: context?.userId || 'anonymous',
        organization_id: context?.organizationId,
        action: `API Error: ${errorInfo?.endpoint}`,
        details: {
          error: error.message,
          stack:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
          category: errorInfo?.category,
          code: errorInfo?.code,
          endpoint: errorInfo?.endpoint,
          method: request.method,
          url: request.url,
          userAgent: request.headers.get('user-agent'),
          ip: request.ip || request.headers.get('x-forwarded-for'),
          requestId: errorInfo?.requestId,
          memoryUsage: process.memoryUsage(),
          ...context?.additionalData,
        },
      });
    } catch (logError) {
      console.error('❌ Failed to log error:', logError);
    }
  }

  /**
   * Get error severity for logging
   */
  private getErrorSeverity(category: ErrorCategory): AuditSeverity {
    switch (category) {
      case ErrorCategory.MEMORY:
      case ErrorCategory.SYSTEM:
        return AuditSeverity.CRITICAL;
      case ErrorCategory.DATABASE:
      case ErrorCategory.NETWORK:
        return AuditSeverity.ERROR;
      case ErrorCategory.VALIDATION:
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return AuditSeverity.WARNING;
      default:
        return AuditSeverity.INFO;
    }
  }

  /**
   * Sanitize error messages to prevent information disclosure
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove sensitive information patterns
    return message
      .replace(/password\s*[:=]\s*[^\s]+/gi, 'password: [REDACTED]')
      .replace(/token\s*[:=]\s*[^\s]+/gi, 'token: [REDACTED]')
      .replace(/key\s*[:=]\s*[^\s]+/gi, 'key: [REDACTED]')
      .replace(/secret\s*[:=]\s*[^\s]+/gi, 'secret: [REDACTED]')
      .replace(/\/[a-z]:[\\\/].*$/gi, '[PATH_REDACTED]'); // Remove file paths
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(category: ErrorCategory, code: string): string {
    switch (category) {
      case ErrorCategory.VALIDATION:
        return 'The provided data is invalid. Please check your input and try again.';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication required. Please log in to continue.';
      case ErrorCategory.AUTHORIZATION:
        return "Access denied. You don't have permission to perform this action.";
      case ErrorCategory.NOT_FOUND:
        return 'The requested resource was not found.';
      case ErrorCategory.RATE_LIMIT:
        return 'Too many requests. Please wait a moment before trying again.';
      case ErrorCategory.DATABASE:
        return 'A database error occurred. Please try again later.';
      case ErrorCategory.NETWORK:
        return 'Network connectivity issue. Please check your connection and try again.';
      case ErrorCategory.MEMORY:
        return 'System resources are temporarily unavailable. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  }

  /**
   * Get error details based on category
   */
  private getErrorDetails(
    error: any,
    category: ErrorCategory,
  ): Record<string, any> | undefined {
    if (process.env.NODE_ENV !== 'development') {
      return undefined; // Don't expose details in production
    }

    switch (category) {
      case ErrorCategory.VALIDATION:
        if (error instanceof z.ZodError) {
          return {
            validationErrors: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          };
        }
        break;
      case ErrorCategory.DATABASE:
        return {
          code: error.code,
          hint: error.hint,
          detail: error.detail,
        };
    }

    return undefined;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old circuit breaker data
   */
  private cleanupCircuitBreakers(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    const expiredKeys: string[] = [];
    this.circuitBreakers.forEach((breaker, key) => {
      if (now - breaker.lastFailure > maxAge) {
        expiredKeys.push(key);
      }
    });
    expiredKeys.forEach((key) => this.circuitBreakers.delete(key));

    // Clean up error counts
    if (this.errorCounts.size > 1000) {
      this.errorCounts.clear();
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    circuitBreakers: Array<{
      endpoint: string;
      failures: number;
      isOpen: boolean;
    }>;
  } {
    const errorsByCategory: Record<string, number> = {};
    let totalErrors = 0;

    this.errorCounts.forEach((count, key) => {
      const category = key.split(':')[1];
      errorsByCategory[category] = (errorsByCategory[category] || 0) + count;
      totalErrors += count;
    });

    const circuitBreakers: Array<{
      endpoint: string;
      failures: number;
      isOpen: boolean;
    }> = [];
    this.circuitBreakers.forEach((breaker, endpoint) => {
      circuitBreakers.push({
        endpoint,
        failures: breaker.failures,
        isOpen: breaker.isOpen,
      });
    });

    return { totalErrors, errorsByCategory, circuitBreakers };
  }
}

// Export singleton instance
export const errorHandler = EnhancedErrorHandler.getInstance();

/**
 * Wrapper for API route handlers with automatic error handling
 */
export function withErrorHandling(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
) {
  return async (request: NextRequest, context?: any) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorHandler.handleError(error, request, {
        endpoint: `${request.method} ${request.nextUrl.pathname}`,
        method: request.method,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.ip || request.headers.get('x-forwarded-for') || undefined,
      });
    }
  };
}
