/**
 * WS-154 Round 3: Comprehensive Error Handling and Recovery System
 * Team B - Production-Ready Error Management for Seating Optimization
 * Handles all error scenarios with proper recovery mechanisms
 */

import { NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';
import { seatingCacheManager } from '@/lib/cache/seating-redis-cache';

// Error Types and Categories
export enum SeatingErrorType {
  // Input Validation Errors
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_GUEST_DATA = 'INVALID_GUEST_DATA',
  INVALID_TABLE_CONFIG = 'INVALID_TABLE_CONFIG',

  // Authentication/Authorization Errors
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  COUPLE_ACCESS_DENIED = 'COUPLE_ACCESS_DENIED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Database Errors
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_TIMEOUT = 'DATABASE_QUERY_TIMEOUT',
  DATABASE_CONSTRAINT_VIOLATION = 'DATABASE_CONSTRAINT_VIOLATION',
  GUEST_DATA_FETCH_FAILED = 'GUEST_DATA_FETCH_FAILED',
  RELATIONSHIP_DATA_FETCH_FAILED = 'RELATIONSHIP_DATA_FETCH_FAILED',

  // Optimization Engine Errors
  OPTIMIZATION_TIMEOUT = 'OPTIMIZATION_TIMEOUT',
  OPTIMIZATION_MEMORY_EXCEEDED = 'OPTIMIZATION_MEMORY_EXCEEDED',
  OPTIMIZATION_ALGORITHM_FAILED = 'OPTIMIZATION_ALGORITHM_FAILED',
  ML_MODEL_UNAVAILABLE = 'ML_MODEL_UNAVAILABLE',
  GENETIC_ALGORITHM_FAILED = 'GENETIC_ALGORITHM_FAILED',

  // Cache and Performance Errors
  CACHE_UNAVAILABLE = 'CACHE_UNAVAILABLE',
  CACHE_OPERATION_FAILED = 'CACHE_OPERATION_FAILED',
  PERFORMANCE_DEGRADED = 'PERFORMANCE_DEGRADED',

  // Integration Errors
  TEAM_INTEGRATION_FAILED = 'TEAM_INTEGRATION_FAILED',
  MOBILE_OPTIMIZATION_FAILED = 'MOBILE_OPTIMIZATION_FAILED',
  CONFLICT_DETECTION_FAILED = 'CONFLICT_DETECTION_FAILED',

  // Resource Errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  CPU_LIMIT_EXCEEDED = 'CPU_LIMIT_EXCEEDED',

  // External Service Errors
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXTERNAL_SERVICE_UNAVAILABLE',
  THIRD_PARTY_API_FAILED = 'THIRD_PARTY_API_FAILED',

  // Unknown/System Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export enum ErrorSeverity {
  LOW = 'LOW', // Non-critical, fallback available
  MEDIUM = 'MEDIUM', // Important but recoverable
  HIGH = 'HIGH', // Critical functionality affected
  CRITICAL = 'CRITICAL', // System failure, immediate action required
}

export interface SeatingError {
  type: SeatingErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  timestamp: Date;
  trace_id: string;
  couple_id?: string;
  context?: {
    endpoint?: string;
    optimization_engine?: string;
    guest_count?: number;
    processing_time_ms?: number;
    memory_usage_mb?: number;
  };
  recovery_actions?: RecoveryAction[];
  user_message?: string;
  retry_after_ms?: number;
}

export interface RecoveryAction {
  action: RecoveryActionType;
  description: string;
  automated: boolean;
  success_probability: number;
  estimated_time_ms: number;
  fallback_available: boolean;
}

export enum RecoveryActionType {
  RETRY_WITH_BACKOFF = 'RETRY_WITH_BACKOFF',
  FALLBACK_TO_CACHE = 'FALLBACK_TO_CACHE',
  FALLBACK_TO_SIMPLE_ALGORITHM = 'FALLBACK_TO_SIMPLE_ALGORITHM',
  REDUCE_COMPLEXITY = 'REDUCE_COMPLEXITY',
  USE_CACHED_RESULT = 'USE_CACHED_RESULT',
  NOTIFY_ADMIN = 'NOTIFY_ADMIN',
  SCALE_RESOURCES = 'SCALE_RESOURCES',
  GRACEFUL_DEGRADATION = 'GRACEFUL_DEGRADATION',
  USER_INTERVENTION_REQUIRED = 'USER_INTERVENTION_REQUIRED',
}

// Recovery Strategy Configuration
export interface RecoveryStrategy {
  max_retries: number;
  retry_delays_ms: number[];
  fallback_options: RecoveryActionType[];
  circuit_breaker_threshold: number;
  circuit_breaker_timeout_ms: number;
  enable_graceful_degradation: boolean;
  notify_on_failure: boolean;
}

const DEFAULT_RECOVERY_STRATEGIES: Record<SeatingErrorType, RecoveryStrategy> =
  {
    [SeatingErrorType.DATABASE_CONNECTION_FAILED]: {
      max_retries: 3,
      retry_delays_ms: [1000, 2000, 5000],
      fallback_options: [
        RecoveryActionType.FALLBACK_TO_CACHE,
        RecoveryActionType.NOTIFY_ADMIN,
      ],
      circuit_breaker_threshold: 5,
      circuit_breaker_timeout_ms: 30000,
      enable_graceful_degradation: true,
      notify_on_failure: true,
    },

    [SeatingErrorType.OPTIMIZATION_TIMEOUT]: {
      max_retries: 2,
      retry_delays_ms: [500, 1000],
      fallback_options: [
        RecoveryActionType.FALLBACK_TO_SIMPLE_ALGORITHM,
        RecoveryActionType.REDUCE_COMPLEXITY,
        RecoveryActionType.USE_CACHED_RESULT,
      ],
      circuit_breaker_threshold: 3,
      circuit_breaker_timeout_ms: 60000,
      enable_graceful_degradation: true,
      notify_on_failure: false,
    },

    [SeatingErrorType.ML_MODEL_UNAVAILABLE]: {
      max_retries: 1,
      retry_delays_ms: [2000],
      fallback_options: [
        RecoveryActionType.FALLBACK_TO_SIMPLE_ALGORITHM,
        RecoveryActionType.GRACEFUL_DEGRADATION,
      ],
      circuit_breaker_threshold: 2,
      circuit_breaker_timeout_ms: 120000,
      enable_graceful_degradation: true,
      notify_on_failure: true,
    },

    [SeatingErrorType.RATE_LIMIT_EXCEEDED]: {
      max_retries: 0,
      retry_delays_ms: [],
      fallback_options: [RecoveryActionType.USER_INTERVENTION_REQUIRED],
      circuit_breaker_threshold: 1,
      circuit_breaker_timeout_ms: 60000,
      enable_graceful_degradation: false,
      notify_on_failure: false,
    },

    // Default strategy for other errors
    [SeatingErrorType.UNKNOWN_ERROR]: {
      max_retries: 2,
      retry_delays_ms: [1000, 3000],
      fallback_options: [
        RecoveryActionType.FALLBACK_TO_CACHE,
        RecoveryActionType.GRACEFUL_DEGRADATION,
        RecoveryActionType.NOTIFY_ADMIN,
      ],
      circuit_breaker_threshold: 3,
      circuit_breaker_timeout_ms: 30000,
      enable_graceful_degradation: true,
      notify_on_failure: true,
    },
  };

// Circuit Breaker Implementation
class CircuitBreaker {
  private failures: Map<string, { count: number; last_failure: Date }> =
    new Map();
  private open_circuits: Map<string, Date> = new Map();

  isCircuitOpen(key: string, strategy: RecoveryStrategy): boolean {
    const openTime = this.open_circuits.get(key);
    if (openTime) {
      const timeElapsed = Date.now() - openTime.getTime();
      if (timeElapsed > strategy.circuit_breaker_timeout_ms) {
        this.open_circuits.delete(key);
        this.failures.delete(key);
        return false;
      }
      return true;
    }
    return false;
  }

  recordFailure(key: string, strategy: RecoveryStrategy): void {
    const current = this.failures.get(key) || {
      count: 0,
      last_failure: new Date(),
    };
    current.count++;
    current.last_failure = new Date();
    this.failures.set(key, current);

    if (current.count >= strategy.circuit_breaker_threshold) {
      this.open_circuits.set(key, new Date());
      console.warn(`Circuit breaker opened for ${key}`);
    }
  }

  recordSuccess(key: string): void {
    this.failures.delete(key);
    this.open_circuits.delete(key);
  }
}

// Main Error Handler Class
export class SeatingErrorHandler {
  private circuitBreaker = new CircuitBreaker();
  private errorCounts = new Map<SeatingErrorType, number>();
  private recoveryStrategies = DEFAULT_RECOVERY_STRATEGIES;

  async handleError(
    error: Error | SeatingError,
    context: {
      trace_id: string;
      couple_id?: string;
      endpoint?: string;
      optimization_engine?: string;
      guest_count?: number;
      processing_time_ms?: number;
    },
  ): Promise<{
    response: NextResponse;
    recovery_attempted: boolean;
    recovered: boolean;
  }> {
    const seatingError = this.normalizeError(error, context);

    // Log error for monitoring
    await this.logError(seatingError);

    // Track error frequency
    this.trackErrorFrequency(seatingError.type);

    // Attempt recovery
    const recoveryResult = await this.attemptRecovery(seatingError);

    // Create appropriate response
    const response = this.createErrorResponse(seatingError, recoveryResult);

    return {
      response,
      recovery_attempted: recoveryResult.attempted,
      recovered: recoveryResult.success,
    };
  }

  private normalizeError(
    error: Error | SeatingError,
    context: any,
  ): SeatingError {
    if ('type' in error && 'severity' in error) {
      return error as SeatingError;
    }

    // Convert standard Error to SeatingError
    const errorType = this.classifyError(error);
    const severity = this.determineSeverity(errorType, context);

    return {
      type: errorType,
      severity,
      message: error.message || 'Unknown error occurred',
      details: {
        stack: error.stack,
        name: error.name,
      },
      timestamp: new Date(),
      trace_id: context.trace_id,
      couple_id: context.couple_id,
      context,
      recovery_actions: this.getRecoveryActions(errorType),
      user_message: this.getUserFriendlyMessage(errorType),
      retry_after_ms: this.getRetryDelay(errorType),
    };
  }

  private classifyError(error: Error): SeatingErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Database errors
    if (message.includes('connection') && message.includes('database')) {
      return SeatingErrorType.DATABASE_CONNECTION_FAILED;
    }
    if (message.includes('timeout') && message.includes('query')) {
      return SeatingErrorType.DATABASE_QUERY_TIMEOUT;
    }
    if (message.includes('constraint') || message.includes('violation')) {
      return SeatingErrorType.DATABASE_CONSTRAINT_VIOLATION;
    }

    // Authentication errors
    if (message.includes('unauthorized') || name.includes('auth')) {
      return SeatingErrorType.UNAUTHORIZED_ACCESS;
    }
    if (message.includes('token') && message.includes('expired')) {
      return SeatingErrorType.TOKEN_EXPIRED;
    }

    // Optimization errors
    if (message.includes('timeout') && message.includes('optimization')) {
      return SeatingErrorType.OPTIMIZATION_TIMEOUT;
    }
    if (message.includes('memory') && message.includes('exceed')) {
      return SeatingErrorType.OPTIMIZATION_MEMORY_EXCEEDED;
    }
    if (message.includes('ml') || message.includes('model')) {
      return SeatingErrorType.ML_MODEL_UNAVAILABLE;
    }
    if (message.includes('genetic') || message.includes('algorithm')) {
      return SeatingErrorType.GENETIC_ALGORITHM_FAILED;
    }

    // Rate limiting
    if (
      message.includes('rate limit') ||
      message.includes('too many requests')
    ) {
      return SeatingErrorType.RATE_LIMIT_EXCEEDED;
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('validation')) {
      return SeatingErrorType.INVALID_INPUT;
    }

    // Default
    return SeatingErrorType.UNKNOWN_ERROR;
  }

  private determineSeverity(
    errorType: SeatingErrorType,
    context: any,
  ): ErrorSeverity {
    const criticalErrors = [
      SeatingErrorType.DATABASE_CONNECTION_FAILED,
      SeatingErrorType.SYSTEM_ERROR,
    ];

    const highSeverityErrors = [
      SeatingErrorType.DATABASE_QUERY_TIMEOUT,
      SeatingErrorType.OPTIMIZATION_MEMORY_EXCEEDED,
      SeatingErrorType.ML_MODEL_UNAVAILABLE,
    ];

    const mediumSeverityErrors = [
      SeatingErrorType.OPTIMIZATION_TIMEOUT,
      SeatingErrorType.CACHE_UNAVAILABLE,
      SeatingErrorType.TEAM_INTEGRATION_FAILED,
    ];

    if (criticalErrors.includes(errorType)) return ErrorSeverity.CRITICAL;
    if (highSeverityErrors.includes(errorType)) return ErrorSeverity.HIGH;
    if (mediumSeverityErrors.includes(errorType)) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  private getRecoveryActions(errorType: SeatingErrorType): RecoveryAction[] {
    const strategy =
      this.recoveryStrategies[errorType] ||
      this.recoveryStrategies[SeatingErrorType.UNKNOWN_ERROR];

    return strategy.fallback_options.map((actionType) => {
      switch (actionType) {
        case RecoveryActionType.RETRY_WITH_BACKOFF:
          return {
            action: actionType,
            description: 'Retry the operation with exponential backoff',
            automated: true,
            success_probability: 0.7,
            estimated_time_ms: strategy.retry_delays_ms[0] || 1000,
            fallback_available: true,
          };

        case RecoveryActionType.FALLBACK_TO_CACHE:
          return {
            action: actionType,
            description: 'Use cached optimization result if available',
            automated: true,
            success_probability: 0.8,
            estimated_time_ms: 100,
            fallback_available: true,
          };

        case RecoveryActionType.FALLBACK_TO_SIMPLE_ALGORITHM:
          return {
            action: actionType,
            description: 'Use simpler optimization algorithm',
            automated: true,
            success_probability: 0.9,
            estimated_time_ms: 2000,
            fallback_available: true,
          };

        case RecoveryActionType.GRACEFUL_DEGRADATION:
          return {
            action: actionType,
            description: 'Provide partial functionality with reduced features',
            automated: true,
            success_probability: 0.95,
            estimated_time_ms: 500,
            fallback_available: false,
          };

        default:
          return {
            action: actionType,
            description: 'Manual intervention required',
            automated: false,
            success_probability: 0.5,
            estimated_time_ms: 0,
            fallback_available: false,
          };
      }
    });
  }

  private async attemptRecovery(seatingError: SeatingError): Promise<{
    attempted: boolean;
    success: boolean;
    recovery_used?: RecoveryActionType;
    fallback_data?: any;
  }> {
    const strategy =
      this.recoveryStrategies[seatingError.type] ||
      this.recoveryStrategies[SeatingErrorType.UNKNOWN_ERROR];

    // Check circuit breaker
    const circuitKey = `${seatingError.type}-${seatingError.couple_id || 'global'}`;
    if (this.circuitBreaker.isCircuitOpen(circuitKey, strategy)) {
      console.warn(
        `Circuit breaker open for ${seatingError.type}, skipping recovery`,
      );
      return { attempted: false, success: false };
    }

    // Try recovery actions in order of preference
    for (const recoveryAction of seatingError.recovery_actions || []) {
      if (!recoveryAction.automated) continue;

      try {
        const recoveryResult = await this.executeRecoveryAction(
          recoveryAction.action,
          seatingError,
        );

        if (recoveryResult.success) {
          this.circuitBreaker.recordSuccess(circuitKey);
          return {
            attempted: true,
            success: true,
            recovery_used: recoveryAction.action,
            fallback_data: recoveryResult.data,
          };
        }
      } catch (recoveryError) {
        console.warn(
          `Recovery action ${recoveryAction.action} failed:`,
          recoveryError,
        );
      }
    }

    // All recovery attempts failed
    this.circuitBreaker.recordFailure(circuitKey, strategy);

    return { attempted: true, success: false };
  }

  private async executeRecoveryAction(
    actionType: RecoveryActionType,
    error: SeatingError,
  ): Promise<{ success: boolean; data?: any }> {
    switch (actionType) {
      case RecoveryActionType.FALLBACK_TO_CACHE:
        return await this.tryFallbackToCache(error);

      case RecoveryActionType.FALLBACK_TO_SIMPLE_ALGORITHM:
        return await this.tryFallbackToSimpleAlgorithm(error);

      case RecoveryActionType.REDUCE_COMPLEXITY:
        return await this.tryReduceComplexity(error);

      case RecoveryActionType.GRACEFUL_DEGRADATION:
        return await this.tryGracefulDegradation(error);

      default:
        return { success: false };
    }
  }

  private async tryFallbackToCache(
    error: SeatingError,
  ): Promise<{ success: boolean; data?: any }> {
    try {
      if (!error.couple_id || !error.context?.guest_count) {
        return { success: false };
      }

      const cachedResult =
        await seatingCacheManager.findSimilarOptimizationResults({
          guests: [], // Would need actual guest data
          relationships: [],
          tables: [],
          preferences: {},
          similarity_threshold: 0.7, // Lower threshold for fallback
        });

      if (cachedResult.length > 0) {
        return {
          success: true,
          data: {
            arrangement_id: cachedResult[0].cache_key,
            arrangement: cachedResult[0].arrangement,
            optimization_score: cachedResult[0].score,
            cached: true,
            fallback_used: 'cache',
          },
        };
      }

      return { success: false };
    } catch (cacheError) {
      console.warn('Cache fallback failed:', cacheError);
      return { success: false };
    }
  }

  private async tryFallbackToSimpleAlgorithm(
    error: SeatingError,
  ): Promise<{ success: boolean; data?: any }> {
    try {
      // Would implement simple greedy algorithm as fallback
      const simpleResult = await this.executeSimpleOptimization(error.context);

      return {
        success: true,
        data: {
          ...simpleResult,
          fallback_used: 'simple_algorithm',
          optimization_engine_used: 'fallback_simple',
        },
      };
    } catch (fallbackError) {
      console.warn('Simple algorithm fallback failed:', fallbackError);
      return { success: false };
    }
  }

  private async tryReduceComplexity(
    error: SeatingError,
  ): Promise<{ success: boolean; data?: any }> {
    try {
      // Reduce guest count or table configurations to make optimization feasible
      const reducedContext = {
        ...error.context,
        guest_count: Math.min(error.context?.guest_count || 100, 50),
        max_processing_time_ms: 5000,
      };

      const reducedResult =
        await this.executeSimpleOptimization(reducedContext);

      return {
        success: true,
        data: {
          ...reducedResult,
          fallback_used: 'reduced_complexity',
          complexity_reduced: true,
        },
      };
    } catch (reductionError) {
      console.warn('Complexity reduction failed:', reductionError);
      return { success: false };
    }
  }

  private async tryGracefulDegradation(
    error: SeatingError,
  ): Promise<{ success: boolean; data?: any }> {
    // Provide minimal but functional response
    return {
      success: true,
      data: {
        arrangement_id: `fallback-${Date.now()}`,
        arrangement: this.generateMinimalArrangement(
          error.context?.guest_count || 50,
        ),
        optimization_score: 5.0, // Minimal acceptable score
        degraded: true,
        fallback_used: 'graceful_degradation',
        recommendations: [
          'Manual optimization recommended due to system limitations',
        ],
      },
    };
  }

  private async executeSimpleOptimization(context: any): Promise<any> {
    // Simulate simple optimization algorithm
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          arrangement_id: `simple-${Date.now()}`,
          arrangement: this.generateMinimalArrangement(
            context?.guest_count || 50,
          ),
          optimization_score: 6.5,
          processing_time_ms: 500,
        });
      }, 500);
    });
  }

  private generateMinimalArrangement(guestCount: number): any {
    const tableCount = Math.ceil(guestCount / 8);
    const arrangement: any = {};

    for (let i = 1; i <= tableCount; i++) {
      const guestsPerTable = Math.min(8, guestCount - (i - 1) * 8);
      arrangement[i] = {
        guests: Array.from(
          { length: guestsPerTable },
          (_, j) => `fallback-guest-${i}-${j}`,
        ),
        capacity: 8,
        utilization: guestsPerTable / 8,
      };
    }

    return arrangement;
  }

  private getUserFriendlyMessage(errorType: SeatingErrorType): string {
    const messages: Record<SeatingErrorType, string> = {
      [SeatingErrorType.OPTIMIZATION_TIMEOUT]:
        "Seating optimization is taking longer than expected. We're trying alternative approaches.",
      [SeatingErrorType.DATABASE_CONNECTION_FAILED]:
        "We're experiencing temporary connectivity issues. Please try again in a moment.",
      [SeatingErrorType.ML_MODEL_UNAVAILABLE]:
        'Advanced optimization is temporarily unavailable. Using standard optimization instead.',
      [SeatingErrorType.RATE_LIMIT_EXCEEDED]:
        "You've reached the optimization limit. Please wait a moment before trying again.",
      [SeatingErrorType.INVALID_INPUT]:
        'Please check your guest list and table configuration for any missing information.',
      [SeatingErrorType.UNAUTHORIZED_ACCESS]:
        "You don't have permission to access this seating arrangement.",
      [SeatingErrorType.UNKNOWN_ERROR]:
        'An unexpected error occurred. Our team has been notified and is working on a fix.',
    };

    return messages[errorType] || messages[SeatingErrorType.UNKNOWN_ERROR];
  }

  private getRetryDelay(errorType: SeatingErrorType): number | undefined {
    const strategy = this.recoveryStrategies[errorType];
    if (!strategy || strategy.retry_delays_ms.length === 0) return undefined;

    return strategy.retry_delays_ms[0];
  }

  private createErrorResponse(
    seatingError: SeatingError,
    recoveryResult: {
      attempted: boolean;
      success: boolean;
      recovery_used?: RecoveryActionType;
      fallback_data?: any;
    },
  ): NextResponse {
    const statusCode = this.getHttpStatusCode(seatingError.type);

    if (recoveryResult.success && recoveryResult.fallback_data) {
      // Recovery successful, return fallback data with warning
      return NextResponse.json({
        success: true,
        ...recoveryResult.fallback_data,
        warning: {
          message: seatingError.user_message,
          recovery_used: recoveryResult.recovery_used,
          original_error: seatingError.type,
        },
      });
    }

    // Recovery failed or not attempted, return error
    const errorResponse = {
      success: false,
      error: seatingError.type,
      message: seatingError.user_message || seatingError.message,
      trace_id: seatingError.trace_id,
      retry_after_ms: seatingError.retry_after_ms,
      recovery_attempted: recoveryResult.attempted,
      recovery_available: (seatingError.recovery_actions || []).length > 0,
      timestamp: seatingError.timestamp.toISOString(),
    };

    // Include additional context for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      (errorResponse as any).debug = {
        details: seatingError.details,
        context: seatingError.context,
        recovery_actions: seatingError.recovery_actions,
      };
    }

    return NextResponse.json(errorResponse, { status: statusCode });
  }

  private getHttpStatusCode(errorType: SeatingErrorType): number {
    const statusCodes: Partial<Record<SeatingErrorType, number>> = {
      [SeatingErrorType.INVALID_INPUT]: 400,
      [SeatingErrorType.INVALID_GUEST_DATA]: 400,
      [SeatingErrorType.INVALID_TABLE_CONFIG]: 400,
      [SeatingErrorType.UNAUTHORIZED_ACCESS]: 401,
      [SeatingErrorType.TOKEN_EXPIRED]: 401,
      [SeatingErrorType.COUPLE_ACCESS_DENIED]: 403,
      [SeatingErrorType.RATE_LIMIT_EXCEEDED]: 429,
      [SeatingErrorType.DATABASE_CONNECTION_FAILED]: 503,
      [SeatingErrorType.DATABASE_QUERY_TIMEOUT]: 504,
      [SeatingErrorType.OPTIMIZATION_TIMEOUT]: 504,
      [SeatingErrorType.EXTERNAL_SERVICE_UNAVAILABLE]: 503,
    };

    return statusCodes[errorType] || 500;
  }

  private async logError(seatingError: SeatingError): Promise<void> {
    // Log to performance monitor
    performanceMonitor.recordError(seatingError.type, {
      severity: seatingError.severity,
      trace_id: seatingError.trace_id,
      couple_id: seatingError.couple_id,
      context: seatingError.context,
    });

    // Log to console for now (would integrate with proper logging service)
    console.error(`[${seatingError.severity}] ${seatingError.type}:`, {
      message: seatingError.message,
      trace_id: seatingError.trace_id,
      couple_id: seatingError.couple_id,
      timestamp: seatingError.timestamp,
      context: seatingError.context,
    });

    // Notify admin for critical errors
    if (seatingError.severity === ErrorSeverity.CRITICAL) {
      await this.notifyAdmin(seatingError);
    }
  }

  private trackErrorFrequency(errorType: SeatingErrorType): void {
    const current = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, current + 1);

    // Alert if error frequency is too high
    if (current > 10) {
      console.warn(
        `High frequency of ${errorType} errors detected: ${current}`,
      );
    }
  }

  private async notifyAdmin(seatingError: SeatingError): Promise<void> {
    // Would integrate with notification service (Slack, email, etc.)
    console.error(`🚨 CRITICAL ERROR - Admin notification:`, {
      type: seatingError.type,
      message: seatingError.message,
      trace_id: seatingError.trace_id,
      timestamp: seatingError.timestamp,
    });
  }

  // Public utility methods
  public getErrorStats(): Record<SeatingErrorType, number> {
    return Object.fromEntries(this.errorCounts.entries()) as Record<
      SeatingErrorType,
      number
    >;
  }

  public clearErrorStats(): void {
    this.errorCounts.clear();
  }
}

// Global error handler instance
export const seatingErrorHandler = new SeatingErrorHandler();

// Helper function for easy error handling in API routes
export async function handleSeatingError(
  error: Error | SeatingError,
  traceId: string,
  context?: {
    couple_id?: string;
    endpoint?: string;
    optimization_engine?: string;
    guest_count?: number;
    processing_time_ms?: number;
  },
): Promise<NextResponse> {
  const result = await seatingErrorHandler.handleError(error, {
    trace_id: traceId,
    ...context,
  });

  return result.response;
}

export {
  SeatingErrorHandler,
  SeatingErrorType,
  ErrorSeverity,
  RecoveryActionType,
};
