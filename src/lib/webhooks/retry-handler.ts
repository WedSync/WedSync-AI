/**
 * WS-201: Webhook Retry Handler with Exponential Backoff
 * Team B - Backend/API Implementation
 *
 * Provides enterprise-grade retry logic for webhook delivery including:
 * - Exponential backoff with jitter (1,2,4,8,16 minutes)
 * - Circuit breaker pattern for failing endpoints
 * - Dead letter queue management
 * - Wedding industry specific retry policies
 */

import { z } from 'zod';

// ================================================
// TYPES AND INTERFACES
// ================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  multiplier: number;
  jitterEnabled: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number; // milliseconds
}

export interface RetryAttempt {
  attemptNumber: number;
  delay: number;
  startTime: number;
  endTime?: number;
  success: boolean;
  error?: string;
  responseStatus?: number;
  responseTime?: number;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: string;
  attempts: RetryAttempt[];
  totalRetries: number;
  totalTime: number;
  circuitBreakerTripped: boolean;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export interface DeadLetterItem {
  originalDeliveryId: string;
  webhookEndpointId: string;
  organizationId: string;
  eventType: string;
  payload: any;
  failureReason: string;
  totalAttempts: number;
  firstAttemptAt: Date;
  finalAttemptAt: Date;
  metadata?: Record<string, any>;
}

// ================================================
// VALIDATION SCHEMAS
// ================================================

export const retryConfigSchema = z.object({
  maxRetries: z.number().min(0).max(10).default(5),
  baseDelay: z.number().min(100).max(60000).default(60000), // 1 minute default
  maxDelay: z.number().min(1000).max(3600000).default(960000), // 16 minutes default
  multiplier: z.number().min(1.1).max(5).default(2),
  jitterEnabled: z.boolean().default(true),
  circuitBreakerThreshold: z.number().min(1).max(100).default(5),
  circuitBreakerTimeout: z.number().min(30000).max(3600000).default(300000), // 5 minutes
});

// ================================================
// WEBHOOK RETRY HANDLER CLASS
// ================================================

class WebhookRetryHandler {
  private config: RetryConfig;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = retryConfigSchema.parse(config);
  }

  /**
   * Execute function with exponential backoff retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    context: {
      webhookId?: string;
      endpoint?: string;
      organizationId?: string;
      eventType?: string;
      isBusinessCritical?: boolean;
    } = {},
  ): Promise<RetryResult<T>> {
    const attempts: RetryAttempt[] = [];
    const startTime = Date.now();
    let lastError: Error;

    // Check circuit breaker
    if (context.endpoint && this.isCircuitBreakerOpen(context.endpoint)) {
      return {
        success: false,
        error: 'Circuit breaker is open',
        attempts: [],
        totalRetries: 0,
        totalTime: 0,
        circuitBreakerTripped: true,
      };
    }

    // Wedding industry specific retry logic
    const effectiveConfig = this.getWeddingIndustryConfig(context);

    for (let attempt = 0; attempt <= effectiveConfig.maxRetries; attempt++) {
      const attemptStart = Date.now();

      try {
        const result = await fn();

        // Success - record attempt and reset circuit breaker
        const attemptEnd = Date.now();
        attempts.push({
          attemptNumber: attempt,
          delay:
            attempt === 0
              ? 0
              : this.calculateDelay(attempt - 1, effectiveConfig),
          startTime: attemptStart,
          endTime: attemptEnd,
          success: true,
          responseTime: attemptEnd - attemptStart,
        });

        // Reset circuit breaker on success
        if (context.endpoint) {
          this.resetCircuitBreaker(context.endpoint);
        }

        return {
          success: true,
          result,
          attempts,
          totalRetries: attempt,
          totalTime: Date.now() - startTime,
          circuitBreakerTripped: false,
        };
      } catch (error) {
        lastError = error as Error;
        const attemptEnd = Date.now();

        // Record failed attempt
        attempts.push({
          attemptNumber: attempt,
          delay:
            attempt === 0
              ? 0
              : this.calculateDelay(attempt - 1, effectiveConfig),
          startTime: attemptStart,
          endTime: attemptEnd,
          success: false,
          error: error.message,
          responseStatus: (error as any).status || (error as any).statusCode,
          responseTime: attemptEnd - attemptStart,
        });

        // Update circuit breaker
        if (context.endpoint) {
          this.updateCircuitBreaker(context.endpoint, error as Error);
        }

        // Don't retry on final attempt
        if (attempt === effectiveConfig.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error as Error)) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, effectiveConfig);

        // Log retry attempt
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `Webhook retry attempt ${attempt + 1}/${effectiveConfig.maxRetries + 1}`,
            {
              webhookId: context.webhookId,
              endpoint: context.endpoint,
              delay,
              error: error.message,
            },
          );
        }

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    // All retries failed - prepare for dead letter queue
    const finalResult: RetryResult<T> = {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts,
      totalRetries: effectiveConfig.maxRetries,
      totalTime: Date.now() - startTime,
      circuitBreakerTripped: false,
    };

    // Add to dead letter queue if configured
    if (context.webhookId) {
      await this.addToDeadLetterQueue({
        originalDeliveryId: context.webhookId,
        webhookEndpointId: '', // Will be set by calling code
        organizationId: context.organizationId || '',
        eventType: context.eventType || 'unknown',
        payload: {}, // Will be set by calling code
        failureReason: lastError?.message || 'Max retries exceeded',
        totalAttempts: attempts.length,
        firstAttemptAt: new Date(startTime),
        finalAttemptAt: new Date(),
        metadata: {
          attempts: attempts.map((a) => ({
            attempt: a.attemptNumber,
            delay: a.delay,
            error: a.error,
            responseTime: a.responseTime,
            responseStatus: a.responseStatus,
          })),
        },
      });
    }

    return finalResult;
  }

  /**
   * Calculate delay for retry attempt with exponential backoff and jitter
   */
  private calculateDelay(
    attempt: number,
    config: RetryConfig = this.config,
  ): number {
    // Base exponential backoff: delay = baseDelay * (multiplier ^ attempt)
    const exponentialDelay =
      config.baseDelay * Math.pow(config.multiplier, attempt);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

    if (!config.jitterEnabled) {
      return cappedDelay;
    }

    // Full jitter: random value between baseDelay and cappedDelay
    const jitterMin = Math.min(config.baseDelay, cappedDelay * 0.1);
    return Math.floor(jitterMin + Math.random() * (cappedDelay - jitterMin));
  }

  /**
   * Get wedding industry specific retry configuration
   */
  private getWeddingIndustryConfig(context: {
    isBusinessCritical?: boolean;
    eventType?: string;
  }): RetryConfig {
    const baseConfig = { ...this.config };

    // Wedding day events get more aggressive retry
    if (this.isWeddingDayEvent(context.eventType)) {
      return {
        ...baseConfig,
        maxRetries: Math.max(baseConfig.maxRetries, 8), // At least 8 retries
        baseDelay: 30000, // 30 seconds for wedding day
        maxDelay: 480000, // 8 minutes max for wedding day
        circuitBreakerThreshold: 10, // Higher threshold for wedding day
      };
    }

    // Business critical events get extra retries
    if (context.isBusinessCritical) {
      return {
        ...baseConfig,
        maxRetries: Math.max(baseConfig.maxRetries, 7),
        circuitBreakerThreshold: Math.max(
          baseConfig.circuitBreakerThreshold,
          8,
        ),
      };
    }

    // Payment events need reliable delivery
    if (context.eventType?.startsWith('payment.')) {
      return {
        ...baseConfig,
        maxRetries: Math.max(baseConfig.maxRetries, 6),
        baseDelay: 30000, // 30 seconds for payments
        circuitBreakerThreshold: Math.max(
          baseConfig.circuitBreakerThreshold,
          7,
        ),
      };
    }

    return baseConfig;
  }

  /**
   * Check if event type is wedding day related
   */
  private isWeddingDayEvent(eventType?: string): boolean {
    if (!eventType) return false;

    const weddingDayEvents = [
      'wedding.day_started',
      'wedding.ceremony_completed',
      'wedding.emergency',
      'client.wedding_day_update',
      'payment.wedding_day_payment',
    ];

    return (
      weddingDayEvents.includes(eventType) ||
      eventType.includes('wedding_day') ||
      eventType.includes('emergency')
    );
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    // Network errors are always retryable
    const networkErrorCodes = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET',
    ];
    if (networkErrorCodes.includes((error as any).code)) {
      return true;
    }

    // HTTP status codes that are retryable
    const status = (error as any).status || (error as any).statusCode;
    if (status) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504];
      return retryableStatuses.includes(status);
    }

    // Timeout errors are retryable
    if (error.message.toLowerCase().includes('timeout')) {
      return true;
    }

    return false;
  }

  /**
   * Circuit breaker management
   */
  private isCircuitBreakerOpen(endpoint: string): boolean {
    const state = this.circuitBreakers.get(endpoint);
    if (!state) return false;

    const now = Date.now();

    switch (state.state) {
      case 'open':
        if (now >= state.nextAttemptTime) {
          // Move to half-open state
          state.state = 'half-open';
          return false;
        }
        return true;

      case 'half-open':
        return false;

      default:
        return false;
    }
  }

  private updateCircuitBreaker(endpoint: string, error: Error): void {
    let state = this.circuitBreakers.get(endpoint);

    if (!state) {
      state = {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
      };
      this.circuitBreakers.set(endpoint, state);
    }

    const now = Date.now();

    if (state.state === 'half-open') {
      // Failed in half-open state - back to open
      state.state = 'open';
      state.failureCount++;
      state.lastFailureTime = now;
      state.nextAttemptTime = now + this.config.circuitBreakerTimeout;
    } else {
      // Increment failure count
      state.failureCount++;
      state.lastFailureTime = now;

      // Trip circuit breaker if threshold exceeded
      if (state.failureCount >= this.config.circuitBreakerThreshold) {
        state.state = 'open';
        state.nextAttemptTime = now + this.config.circuitBreakerTimeout;

        if (process.env.NODE_ENV === 'development') {
          console.warn(`Circuit breaker tripped for endpoint: ${endpoint}`);
        }
      }
    }
  }

  private resetCircuitBreaker(endpoint: string): void {
    const state = this.circuitBreakers.get(endpoint);
    if (state) {
      state.state = 'closed';
      state.failureCount = 0;
      state.lastFailureTime = 0;
      state.nextAttemptTime = 0;
    }
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(endpoint: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(endpoint) || null;
  }

  /**
   * Add failed delivery to dead letter queue
   */
  private async addToDeadLetterQueue(item: DeadLetterItem): Promise<void> {
    // This would integrate with your Supabase client
    if (process.env.NODE_ENV === 'development') {
      console.error('[Dead Letter Queue]', {
        timestamp: new Date().toISOString(),
        ...item,
      });
    }

    // TODO: Implement actual database insertion
    // const { error } = await supabase
    //   .from('webhook_dead_letter_queue')
    //   .insert({
    //     original_delivery_id: item.originalDeliveryId,
    //     webhook_endpoint_id: item.webhookEndpointId,
    //     organization_id: item.organizationId,
    //     event_type: item.eventType,
    //     payload: item.payload,
    //     signature: '', // Will be set by calling code
    //     failure_reason: item.failureReason,
    //     total_attempts: item.totalAttempts,
    //     first_attempt_at: item.firstAttemptAt.toISOString(),
    //     final_attempt_at: item.finalAttemptAt.toISOString(),
    //     failure_metadata: item.metadata
    //   });
  }

  /**
   * Schedule retry for specific delivery
   */
  async scheduleRetry(
    deliveryId: string,
    attemptNumber: number,
    context: {
      organizationId?: string;
      eventType?: string;
      isBusinessCritical?: boolean;
    } = {},
  ): Promise<{ success: boolean; nextRetryAt?: Date; error?: string }> {
    try {
      const config = this.getWeddingIndustryConfig(context);

      if (attemptNumber > config.maxRetries) {
        return {
          success: false,
          error: 'Max retries exceeded',
        };
      }

      const delay = this.calculateDelay(attemptNumber, config);
      const nextRetryAt = new Date(Date.now() + delay);

      // TODO: Update database with next retry time
      // const { error } = await supabase
      //   .from('webhook_deliveries')
      //   .update({
      //     status: 'retrying',
      //     next_retry_at: nextRetryAt.toISOString(),
      //     attempt_count: attemptNumber
      //   })
      //   .eq('id', deliveryId);

      return {
        success: true,
        nextRetryAt,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to schedule retry: ${error.message}`,
      };
    }
  }

  /**
   * Get retry statistics for monitoring
   */
  getRetryStatistics(): {
    circuitBreakers: Array<{
      endpoint: string;
      state: string;
      failureCount: number;
      lastFailureTime: Date;
    }>;
  } {
    const circuitBreakerStats: Array<{
      endpoint: string;
      state: string;
      failureCount: number;
      lastFailureTime: Date;
    }> = [];

    for (const [endpoint, state] of this.circuitBreakers.entries()) {
      circuitBreakerStats.push({
        endpoint,
        state: state.state,
        failureCount: state.failureCount,
        lastFailureTime: new Date(state.lastFailureTime),
      });
    }

    return { circuitBreakers: circuitBreakerStats };
  }

  /**
   * Reset circuit breaker manually (for admin operations)
   */
  resetCircuitBreakerManually(endpoint: string): boolean {
    const state = this.circuitBreakers.get(endpoint);
    if (state) {
      this.resetCircuitBreaker(endpoint);
      return true;
    }
    return false;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ================================================
// WEDDING INDUSTRY RETRY POLICIES
// ================================================

class WeddingIndustryRetryPolicies {
  /**
   * Get retry policy for wedding day events
   */
  static getWeddingDayPolicy(): Partial<RetryConfig> {
    return {
      maxRetries: 8,
      baseDelay: 30000, // 30 seconds
      maxDelay: 480000, // 8 minutes
      multiplier: 2,
      jitterEnabled: true,
      circuitBreakerThreshold: 10,
      circuitBreakerTimeout: 180000, // 3 minutes
    };
  }

  /**
   * Get retry policy for payment events
   */
  static getPaymentPolicy(): Partial<RetryConfig> {
    return {
      maxRetries: 6,
      baseDelay: 30000, // 30 seconds
      maxDelay: 600000, // 10 minutes
      multiplier: 2,
      jitterEnabled: true,
      circuitBreakerThreshold: 7,
      circuitBreakerTimeout: 300000, // 5 minutes
    };
  }

  /**
   * Get retry policy for CRM integration events
   */
  static getCrmIntegrationPolicy(): Partial<RetryConfig> {
    return {
      maxRetries: 5,
      baseDelay: 60000, // 1 minute
      maxDelay: 900000, // 15 minutes
      multiplier: 2,
      jitterEnabled: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 600000, // 10 minutes
    };
  }

  /**
   * Get retry policy for form submission events
   */
  static getFormSubmissionPolicy(): Partial<RetryConfig> {
    return {
      maxRetries: 4,
      baseDelay: 120000, // 2 minutes
      maxDelay: 960000, // 16 minutes
      multiplier: 2,
      jitterEnabled: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 300000, // 5 minutes
    };
  }
}

// ================================================
// EXPORTS
// ================================================

export default WebhookRetryHandler;

export { WebhookRetryHandler, WeddingIndustryRetryPolicies };
