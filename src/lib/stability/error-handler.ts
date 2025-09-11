/**
 * Comprehensive Error Handling and System Stability
 * Implements enterprise-grade error handling, recovery, and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring/structured-logger';
import { metrics } from '@/lib/monitoring/metrics';

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  operation?: string;
  component?: string;
  metadata?: Record<string, any>;
}

export interface ErrorHandlingConfig {
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  timeoutMs: number;
  enableFallback: boolean;
}

export class SystemError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context: ErrorContext;
  public readonly retryable: boolean;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context: ErrorContext = {},
    retryable: boolean = false,
  ) {
    super(message);
    this.name = 'SystemError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.retryable = retryable;
    this.timestamp = Date.now();
  }
}

export class ErrorHandler {
  private circuitBreakers = new Map<
    string,
    {
      failures: number;
      lastFailure: number;
      state: 'closed' | 'open' | 'half-open';
    }
  >();

  private retryConfig: ErrorHandlingConfig = {
    enableRetry: true,
    maxRetries: 3,
    retryDelay: 1000,
    circuitBreakerThreshold: 5,
    timeoutMs: 30000,
    enableFallback: true,
  };

  /**
   * Handle API route errors with comprehensive recovery
   */
  async handleAPIError(
    error: Error,
    request: NextRequest,
    context: ErrorContext = {},
  ): Promise<NextResponse> {
    const errorId = this.generateErrorId();
    const enhancedContext = {
      ...context,
      errorId,
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      timestamp: new Date().toISOString(),
    };

    // Log error with full context
    await this.logError(error, enhancedContext);

    // Determine error type and response
    const errorResponse = this.categorizeError(error);

    // Update metrics
    metrics.incrementCounter('errors.api', 1, {
      error_code: errorResponse.code,
      status_code: errorResponse.statusCode.toString(),
      endpoint: enhancedContext.endpoint || 'unknown',
    });

    // Create appropriate response
    const response = NextResponse.json(
      {
        error: errorResponse.message,
        code: errorResponse.code,
        errorId,
        timestamp: enhancedContext.timestamp,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
          context: enhancedContext,
        }),
      },
      {
        status: errorResponse.statusCode,
        headers: {
          'X-Error-ID': errorId,
          'X-Request-ID': enhancedContext.requestId || errorId,
        },
      },
    );

    return response;
  }

  /**
   * Handle async operations with retry and circuit breaker
   */
  async handleWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: ErrorContext = {},
    config?: Partial<ErrorHandlingConfig>,
  ): Promise<T> {
    const finalConfig = { ...this.retryConfig, ...config };
    let lastError: Error;

    // Check circuit breaker
    if (this.isCircuitOpen(operationName)) {
      throw new SystemError(
        `Operation ${operationName} circuit breaker is open`,
        'CIRCUIT_BREAKER_OPEN',
        503,
        context,
        false,
      );
    }

    for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
      try {
        const result = await this.withTimeout(
          operation(),
          finalConfig.timeoutMs,
        );

        // Reset circuit breaker on success
        this.resetCircuitBreaker(operationName);

        if (attempt > 1) {
          logger.info('Operation succeeded after retry', {
            operation: operationName,
            attempt,
            ...context,
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // Record failure
        this.recordFailure(operationName);

        const isRetryable = this.isRetryableError(error as Error);
        const isLastAttempt = attempt > finalConfig.maxRetries;

        if (!isRetryable || isLastAttempt) {
          logger.error(
            `Operation ${operationName} failed permanently`,
            lastError,
            {
              attempt,
              isRetryable,
              ...context,
            },
          );
          break;
        }

        logger.warn(`Operation ${operationName} failed, retrying`, {
          attempt,
          error: lastError.message,
          retryDelay: finalConfig.retryDelay * attempt,
          ...context,
        });

        // Exponential backoff
        await this.delay(finalConfig.retryDelay * attempt);
      }
    }

    // All retries exhausted
    throw new SystemError(
      `Operation ${operationName} failed after ${finalConfig.maxRetries} retries`,
      'MAX_RETRIES_EXCEEDED',
      500,
      context,
      false,
    );
  }

  /**
   * Handle promise rejections globally
   */
  setupGlobalErrorHandling(): void {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection', new Error(String(reason)), {
        promise: promise.toString(),
        reason: String(reason),
      });

      metrics.incrementCounter('errors.unhandled_rejection', 1);

      // Don't exit process in production, but log critical error
      if (process.env.NODE_ENV === 'production') {
        // Graceful degradation - continue running but alert monitoring
        this.alertCriticalError('UNHANDLED_REJECTION', String(reason));
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error, {
        stack: error.stack,
      });

      metrics.incrementCounter('errors.uncaught_exception', 1);

      // Critical error - need to exit gracefully
      this.alertCriticalError('UNCAUGHT_EXCEPTION', error.message);

      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // Handle exit signals for graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, starting graceful shutdown');
      this.gracefulShutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, starting graceful shutdown');
      this.gracefulShutdown();
    });
  }

  /**
   * Memory management and cleanup
   */
  async cleanupResources(
    resources: Array<{
      name: string;
      cleanup: () => Promise<void> | void;
    }>,
  ): Promise<void> {
    const cleanupPromises = resources.map(async (resource) => {
      try {
        await resource.cleanup();
        logger.debug(`Resource ${resource.name} cleaned up successfully`);
      } catch (error) {
        logger.error(
          `Failed to cleanup resource ${resource.name}`,
          error as Error,
        );
      }
    });

    await Promise.allSettled(cleanupPromises);
  }

  /**
   * Database connection error handling
   */
  async handleDatabaseError(
    error: Error,
    query?: string,
  ): Promise<SystemError> {
    const isDatabaseError = this.isDatabaseError(error);
    const isConnectionError = this.isConnectionError(error);

    if (isConnectionError) {
      return new SystemError(
        'Database connection failed',
        'DB_CONNECTION_ERROR',
        503,
        { query, originalError: error.message },
        true,
      );
    }

    if (isDatabaseError) {
      return new SystemError(
        'Database operation failed',
        'DB_OPERATION_ERROR',
        500,
        { query, originalError: error.message },
        false,
      );
    }

    return new SystemError(
      'Unknown database error',
      'DB_UNKNOWN_ERROR',
      500,
      { query, originalError: error.message },
      false,
    );
  }

  /**
   * Memory leak prevention for file operations
   */
  async withMemoryManagement<T>(
    operation: () => Promise<T>,
    memoryLimit: number = 500 * 1024 * 1024, // 500MB
  ): Promise<T> {
    const initialMemory = process.memoryUsage();

    try {
      const result = await operation();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;

      if (memoryDelta > memoryLimit) {
        logger.warn('Operation exceeded memory limit', {
          memoryDelta,
          memoryLimit,
          initialMemory: initialMemory.heapUsed,
          finalMemory: finalMemory.heapUsed,
        });
      }

      metrics.recordHistogram('memory.operation_delta', memoryDelta);

      return result;
    } catch (error) {
      // Force cleanup on error
      if (global.gc) {
        global.gc();
      }
      throw error;
    }
  }

  /**
   * Load testing error recovery
   */
  async handleLoadTestingErrors(
    errors: Error[],
    context: { endpoint: string; concurrent: number },
  ): Promise<{
    successRate: number;
    recommendations: string[];
    criticalIssues: string[];
  }> {
    const totalRequests = errors.length;
    const criticalErrors = errors.filter((e) => this.isCriticalError(e));
    const timeoutErrors = errors.filter((e) => this.isTimeoutError(e));
    const memoryErrors = errors.filter((e) => this.isMemoryError(e));

    const successRate = Math.max(0, 1 - errors.length / totalRequests);

    const recommendations: string[] = [];
    const criticalIssues: string[] = [];

    if (timeoutErrors.length > totalRequests * 0.1) {
      recommendations.push('Increase operation timeouts');
      recommendations.push('Implement request queuing');
    }

    if (memoryErrors.length > 0) {
      criticalIssues.push('Memory exhaustion detected');
      recommendations.push('Implement memory pooling');
      recommendations.push('Add garbage collection triggers');
    }

    if (criticalErrors.length > totalRequests * 0.05) {
      criticalIssues.push('High critical error rate');
      recommendations.push('Implement circuit breakers');
      recommendations.push('Add rate limiting');
    }

    return {
      successRate,
      recommendations,
      criticalIssues,
    };
  }

  // Private helper methods
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async logError(error: Error, context: ErrorContext): Promise<void> {
    const sensitiveFields = ['password', 'token', 'key', 'secret'];
    const cleanContext = this.sanitizeContext(context, sensitiveFields);

    logger.error('System error occurred', error, cleanContext);
  }

  private sanitizeContext(context: any, sensitiveFields: string[]): any {
    const sanitized = { ...context };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  private categorizeError(error: Error): {
    message: string;
    code: string;
    statusCode: number;
  } {
    if (error instanceof SystemError) {
      return {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
      };
    }

    if (this.isDatabaseError(error)) {
      return {
        message: 'Database operation failed',
        code: 'DATABASE_ERROR',
        statusCode: 500,
      };
    }

    if (this.isTimeoutError(error)) {
      return {
        message: 'Operation timed out',
        code: 'TIMEOUT_ERROR',
        statusCode: 504,
      };
    }

    if (this.isMemoryError(error)) {
      return {
        message: 'Memory limit exceeded',
        code: 'MEMORY_ERROR',
        statusCode: 507,
      };
    }

    // Default server error
    return {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    };
  }

  private isDatabaseError(error: Error): boolean {
    const dbErrorPatterns = [
      'connection refused',
      'connection timeout',
      'too many connections',
      'database is locked',
      'syntax error',
      'constraint violation',
    ];

    return dbErrorPatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern),
    );
  }

  private isConnectionError(error: Error): boolean {
    const connectionPatterns = [
      'connection refused',
      'connection timeout',
      'network error',
      'connection lost',
    ];

    return connectionPatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern),
    );
  }

  private isRetryableError(error: Error): boolean {
    if (error instanceof SystemError) {
      return error.retryable;
    }

    const retryablePatterns = [
      'timeout',
      'connection refused',
      'network error',
      'temporary failure',
      'service unavailable',
    ];

    return retryablePatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern),
    );
  }

  private isTimeoutError(error: Error): boolean {
    return (
      error.message.toLowerCase().includes('timeout') ||
      error.name === 'TimeoutError'
    );
  }

  private isMemoryError(error: Error): boolean {
    return (
      error.message.toLowerCase().includes('memory') ||
      error.message.includes('ENOMEM') ||
      error.name === 'RangeError'
    );
  }

  private isCriticalError(error: Error): boolean {
    const criticalPatterns = [
      'segmentation fault',
      'memory',
      'stack overflow',
      'maximum call stack',
      'out of memory',
    ];

    return criticalPatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern),
    );
  }

  private isCircuitOpen(operationName: string): boolean {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) return false;

    if (breaker.state === 'open') {
      // Check if we should try half-open
      const timeoutPeriod = 60000; // 1 minute
      if (Date.now() - breaker.lastFailure > timeoutPeriod) {
        breaker.state = 'half-open';
        return false;
      }
      return true;
    }

    return false;
  }

  private recordFailure(operationName: string): void {
    const breaker = this.circuitBreakers.get(operationName) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const,
    };

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= this.retryConfig.circuitBreakerThreshold) {
      breaker.state = 'open';
      logger.warn(`Circuit breaker opened for operation: ${operationName}`);
    }

    this.circuitBreakers.set(operationName, breaker);
  }

  private resetCircuitBreaker(operationName: string): void {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
      this.circuitBreakers.set(operationName, breaker);
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });

    return Promise.race([promise, timeout]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async alertCriticalError(
    type: string,
    message: string,
  ): Promise<void> {
    logger.error('CRITICAL SYSTEM ERROR', new Error(message), {
      errorType: type,
      timestamp: new Date().toISOString(),
      processId: process.pid,
      memoryUsage: process.memoryUsage(),
    });

    metrics.incrementCounter('errors.critical', 1, { type });

    // In production, this could send alerts to monitoring services
    // await sendSlackAlert({ type, message })
    // await sendPagerDutyAlert({ type, message })
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Starting graceful shutdown');

    // Close database connections, stop servers, cleanup resources
    try {
      await this.cleanupResources([
        {
          name: 'database_connections',
          cleanup: async () => {
            // Close database connections
          },
        },
        {
          name: 'temp_files',
          cleanup: async () => {
            // Clean up temporary files
          },
        },
      ]);

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', error as Error);
      process.exit(1);
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Setup global error handling
errorHandler.setupGlobalErrorHandling();

// Export utility functions
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext = {},
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof SystemError) {
        throw error;
      }

      throw new SystemError(
        error instanceof Error ? error.message : 'Unknown error',
        'WRAPPED_ERROR',
        500,
        context,
        false,
      );
    }
  };
}

export function createAPIErrorHandler(context: ErrorContext = {}) {
  return (error: Error, request: NextRequest) =>
    errorHandler.handleAPIError(error, request, context);
}
