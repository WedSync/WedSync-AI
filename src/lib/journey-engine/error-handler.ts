import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory =
  | 'network'
  | 'authentication'
  | 'validation'
  | 'rate_limit'
  | 'external_service'
  | 'database'
  | 'business_logic'
  | 'configuration'
  | 'timeout'
  | 'unknown';

export interface JourneyError {
  id: string;
  instanceId?: string;
  journeyId?: string;
  nodeId?: string;
  executionId?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  stackTrace?: string;
  context?: Record<string, any>;
  timestamp: Date;
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface RetryConfig {
  enabled: boolean;
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitter: boolean;
  retryableCategories: ErrorCategory[];
}

/**
 * Comprehensive error handling and retry system for journey execution
 */
export class JourneyErrorHandler {
  private static defaultRetryConfig: RetryConfig = {
    enabled: true,
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 300000, // 5 minutes
    backoffMultiplier: 2,
    jitter: true,
    retryableCategories: [
      'network',
      'rate_limit',
      'external_service',
      'timeout',
    ],
  };

  /**
   * Handle an error during journey execution
   */
  static async handleError(
    error: Error,
    context: {
      instanceId?: string;
      journeyId?: string;
      nodeId?: string;
      executionId?: string;
      retryConfig?: Partial<RetryConfig>;
    },
  ): Promise<JourneyError> {
    const journeyError = this.categorizeError(error, context);

    // Record the error
    await this.recordError(journeyError);

    // Determine if retry should be attempted
    const config = { ...this.defaultRetryConfig, ...context.retryConfig };

    if (this.shouldRetry(journeyError, config)) {
      await this.scheduleRetry(journeyError, config);
    } else {
      await this.handleFinalFailure(journeyError);
    }

    return journeyError;
  }

  /**
   * Categorize error and determine severity
   */
  private static categorizeError(error: Error, context: any): JourneyError {
    let category: ErrorCategory = 'unknown';
    let severity: ErrorSeverity = 'medium';
    let retryable = false;

    const message = error.message.toLowerCase();

    // Categorize based on error message patterns
    if (
      message.includes('network') ||
      message.includes('connect') ||
      message.includes('timeout')
    ) {
      category = 'network';
      severity = 'medium';
      retryable = true;
    } else if (
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      category = 'authentication';
      severity = 'high';
      retryable = false;
    } else if (
      message.includes('rate limit') ||
      message.includes('too many requests')
    ) {
      category = 'rate_limit';
      severity = 'low';
      retryable = true;
    } else if (message.includes('validation') || message.includes('invalid')) {
      category = 'validation';
      severity = 'medium';
      retryable = false;
    } else if (message.includes('database') || message.includes('sql')) {
      category = 'database';
      severity = 'high';
      retryable = true;
    } else if (
      message.includes('configuration') ||
      message.includes('missing')
    ) {
      category = 'configuration';
      severity = 'high';
      retryable = false;
    } else if (message.includes('timeout')) {
      category = 'timeout';
      severity = 'medium';
      retryable = true;
    }

    // Specific service error patterns
    if (
      message.includes('sendgrid') ||
      message.includes('twilio') ||
      message.includes('stripe')
    ) {
      category = 'external_service';
      severity = 'medium';
      retryable = true;
    }

    return {
      id: crypto.randomUUID(),
      instanceId: context.instanceId,
      journeyId: context.journeyId,
      nodeId: context.nodeId,
      executionId: context.executionId,
      category,
      severity,
      message: error.message,
      details: {
        name: error.name,
        cause: error.cause,
      },
      stackTrace: error.stack,
      context,
      timestamp: new Date(),
      retryable,
      retryCount: 0,
      maxRetries: this.getMaxRetries(category),
      resolved: false,
    };
  }

  /**
   * Get max retries based on error category
   */
  private static getMaxRetries(category: ErrorCategory): number {
    const retryMap: Record<ErrorCategory, number> = {
      network: 3,
      authentication: 0,
      validation: 0,
      rate_limit: 5,
      external_service: 3,
      database: 2,
      business_logic: 1,
      configuration: 0,
      timeout: 3,
      unknown: 1,
    };

    return retryMap[category] || 1;
  }

  /**
   * Record error in database
   */
  private static async recordError(journeyError: JourneyError) {
    try {
      await supabase.from('journey_events').insert({
        journey_id: journeyError.journeyId,
        instance_id: journeyError.instanceId,
        client_id: null, // Could be populated if available in context
        event_type: 'error_occurred',
        event_source: 'system',
        event_data: {
          errorId: journeyError.id,
          category: journeyError.category,
          severity: journeyError.severity,
          message: journeyError.message,
          details: journeyError.details,
          stackTrace: journeyError.stackTrace,
          context: journeyError.context,
          retryable: journeyError.retryable,
          retryCount: journeyError.retryCount,
          maxRetries: journeyError.maxRetries,
        },
      });
    } catch (error) {
      console.error('Failed to record journey error:', error);
    }
  }

  /**
   * Determine if error should be retried
   */
  private static shouldRetry(
    journeyError: JourneyError,
    config: RetryConfig,
  ): boolean {
    if (!config.enabled || !journeyError.retryable) {
      return false;
    }

    if (journeyError.retryCount >= journeyError.maxRetries) {
      return false;
    }

    if (!config.retryableCategories.includes(journeyError.category)) {
      return false;
    }

    return true;
  }

  /**
   * Schedule retry with exponential backoff
   */
  private static async scheduleRetry(
    journeyError: JourneyError,
    config: RetryConfig,
  ) {
    const delay = this.calculateRetryDelay(journeyError.retryCount, config);
    const nextRetryAt = new Date(Date.now() + delay);

    journeyError.nextRetryAt = nextRetryAt;
    journeyError.retryCount++;

    try {
      // Schedule the retry
      await supabase.from('journey_schedules').insert({
        instance_id: journeyError.instanceId,
        node_id: journeyError.nodeId || 'error_retry',
        scheduled_for: nextRetryAt.toISOString(),
        schedule_type: 'error_retry',
        status: 'pending',
        retry_count: journeyError.retryCount,
        metadata: {
          errorId: journeyError.id,
          originalError: journeyError.message,
          category: journeyError.category,
        },
      });

      // Record retry scheduling
      await supabase.from('journey_events').insert({
        journey_id: journeyError.journeyId,
        instance_id: journeyError.instanceId,
        event_type: 'retry_scheduled',
        event_source: 'system',
        event_data: {
          errorId: journeyError.id,
          retryCount: journeyError.retryCount,
          nextRetryAt: nextRetryAt.toISOString(),
          delay,
        },
      });
    } catch (error) {
      console.error('Failed to schedule retry:', error);
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private static calculateRetryDelay(
    retryCount: number,
    config: RetryConfig,
  ): number {
    const exponentialDelay =
      config.baseDelay * Math.pow(config.backoffMultiplier, retryCount);
    let delay = Math.min(exponentialDelay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay = delay + (Math.random() * jitterAmount * 2 - jitterAmount);
    }

    return Math.floor(delay);
  }

  /**
   * Handle final failure when retries are exhausted
   */
  private static async handleFinalFailure(journeyError: JourneyError) {
    try {
      // Mark instance as failed if it's a critical error
      if (journeyError.severity === 'critical' && journeyError.instanceId) {
        await supabase
          .from('journey_instances')
          .update({
            state: 'failed',
            failed_at: new Date().toISOString(),
            last_error: journeyError.message,
            error_count: journeyError.retryCount + 1,
          })
          .eq('id', journeyError.instanceId);
      }

      // Record final failure
      await supabase.from('journey_events').insert({
        journey_id: journeyError.journeyId,
        instance_id: journeyError.instanceId,
        event_type: 'final_failure',
        event_source: 'system',
        event_data: {
          errorId: journeyError.id,
          category: journeyError.category,
          severity: journeyError.severity,
          message: journeyError.message,
          totalRetries: journeyError.retryCount,
          finalFailureAt: new Date().toISOString(),
        },
      });

      // Send alert for critical errors
      if (journeyError.severity === 'critical') {
        await this.sendCriticalErrorAlert(journeyError);
      }
    } catch (error) {
      console.error('Failed to handle final failure:', error);
    }
  }

  /**
   * Send alert for critical errors
   */
  private static async sendCriticalErrorAlert(journeyError: JourneyError) {
    try {
      // In a real implementation, you would send notifications via:
      // - Email to administrators
      // - Slack/Discord webhooks
      // - SMS to on-call engineers
      // - PagerDuty/Opsgenie alerts

      console.error('CRITICAL JOURNEY ERROR:', {
        errorId: journeyError.id,
        instanceId: journeyError.instanceId,
        journeyId: journeyError.journeyId,
        message: journeyError.message,
        category: journeyError.category,
        timestamp: journeyError.timestamp,
      });

      // For now, just log to the database
      await supabase.from('journey_events').insert({
        journey_id: journeyError.journeyId,
        instance_id: journeyError.instanceId,
        event_type: 'critical_error_alert',
        event_source: 'system',
        event_data: {
          errorId: journeyError.id,
          alertSent: true,
          alertedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to send critical error alert:', error);
    }
  }

  /**
   * Get error statistics
   */
  static async getErrorStats(
    journeyId?: string,
    instanceId?: string,
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day',
  ) {
    try {
      const timeRanges = {
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
      };

      const since = new Date(Date.now() - timeRanges[timeRange]).toISOString();

      let query = supabase
        .from('journey_events')
        .select('event_data')
        .eq('event_type', 'error_occurred')
        .gte('occurred_at', since);

      if (journeyId) {
        query = query.eq('journey_id', journeyId);
      }

      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      }

      const { data: errors } = await query;

      const stats = {
        total: errors?.length || 0,
        byCategory: {} as Record<ErrorCategory, number>,
        bySeverity: {} as Record<ErrorSeverity, number>,
        retryableCount: 0,
        resolvedCount: 0,
      };

      errors?.forEach((error) => {
        const data = error.event_data;
        stats.byCategory[data.category] =
          (stats.byCategory[data.category] || 0) + 1;
        stats.bySeverity[data.severity] =
          (stats.bySeverity[data.severity] || 0) + 1;
        if (data.retryable) stats.retryableCount++;
        if (data.resolved) stats.resolvedCount++;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return {
        total: 0,
        byCategory: {},
        bySeverity: {},
        retryableCount: 0,
        resolvedCount: 0,
      };
    }
  }

  /**
   * Resolve an error manually
   */
  static async resolveError(errorId: string, resolution?: string) {
    try {
      await supabase.from('journey_events').insert({
        event_type: 'error_resolved',
        event_source: 'manual',
        event_data: {
          errorId,
          resolution,
          resolvedAt: new Date().toISOString(),
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to resolve error:', error);
      return false;
    }
  }

  /**
   * Get circuit breaker pattern for external services
   */
  static createCircuitBreaker(
    serviceName: string,
    options: {
      failureThreshold: number;
      recoveryTime: number;
      monitorTime: number;
    } = {
      failureThreshold: 5,
      recoveryTime: 60000, // 1 minute
      monitorTime: 300000, // 5 minutes
    },
  ) {
    let failureCount = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return {
      async execute<T>(operation: () => Promise<T>): Promise<T> {
        const now = Date.now();

        // Check if we should attempt recovery
        if (state === 'open' && now - lastFailureTime > options.recoveryTime) {
          state = 'half-open';
          failureCount = 0;
        }

        // Reject immediately if circuit is open
        if (state === 'open') {
          throw new Error(`Circuit breaker open for ${serviceName}`);
        }

        try {
          const result = await operation();

          // Success - reset failure count if we were in half-open state
          if (state === 'half-open') {
            state = 'closed';
            failureCount = 0;
          }

          return result;
        } catch (error) {
          failureCount++;
          lastFailureTime = now;

          // Open circuit if failure threshold exceeded
          if (failureCount >= options.failureThreshold) {
            state = 'open';
          }

          throw error;
        }
      },

      getState: () => ({ state, failureCount, lastFailureTime }),
    };
  }
}
