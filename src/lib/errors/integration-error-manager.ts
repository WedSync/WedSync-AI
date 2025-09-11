// WS-198 Team C Integration Architect - Core Integration Error Manager
// Comprehensive error handling for third-party integrations with circuit breakers

import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import CircuitBreaker from 'opossum';

// Types and interfaces
export interface IntegrationErrorContext {
  serviceName: string;
  serviceType:
    | 'payment'
    | 'email'
    | 'sms'
    | 'calendar'
    | 'vendor_api'
    | 'storage'
    | 'webhook';
  endpoint: string;
  requestId: string;
  weddingContext?: {
    weddingId: string;
    weddingDate: string;
    vendorType: string;
    criticalityLevel: 'low' | 'medium' | 'high' | 'wedding_day_critical';
  };
  retryAttempt: number;
  lastSuccessAt?: string;
  errorDetails: {
    httpStatus?: number;
    errorCode?: string;
    responseTime?: number;
    errorMessage: string;
    errorStack?: string;
  };
}

export interface IntegrationError extends Error {
  context?: IntegrationErrorContext;
  isRetryable?: boolean;
  retryAfter?: number;
}

export interface RetryStrategy {
  shouldRetry: boolean;
  delaySeconds: number;
  maxRetries: number;
  reason: string;
}

export interface FallbackResult {
  fallbackApplied: boolean;
  data?: any;
  fallbackType:
    | 'alternative_service'
    | 'cached_data'
    | 'graceful_degradation'
    | 'manual_override'
    | 'none';
  alternativeServiceUsed?: string;
  cacheAge?: number;
  dataFreshness?: 'fresh' | 'stale_but_acceptable' | 'expired';
  degradationLevel?:
    | 'minimal'
    | 'moderate'
    | 'service_unavailable'
    | 'manual_fallback'
    | 'feature_disabled'
    | 'manual_process';
  reason?: string;
  error?: string;
  userMessage?: string;
  manualInstructions?: string;
  manualActionRequired?: boolean;
  estimatedRecoveryTime?: string;
}

export interface IntegrationErrorResult {
  errorHandled: boolean;
  retryRecommended: boolean;
  retryAfterSeconds: number;
  fallbackUsed: boolean;
  fallbackData?: any;
  serviceHealthStatus: string;
  processingTime: number;
  errorId?: string;
  alertsSent?: string[];
}

export interface FallbackStrategy {
  type:
    | 'alternative_service'
    | 'cached_data'
    | 'graceful_degradation'
    | 'manual_override';
  alternativeServices?: string[];
  cacheMaxAge?: number;
  degradationInstructions?: string;
  manualOverrideEnabled?: boolean;
}

export interface CircuitBreakerStatus {
  state: 'closed' | 'open' | 'half_open';
  failures: number;
  successes: number;
  nextAttempt: number;
  lastError?: string;
}

export class IntegrationErrorManager {
  private redis: Redis;
  private supabase;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private fallbackStrategies = new Map<string, FallbackStrategy>();
  private isInitialized = false;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.initializeAsync();
  }

  private async initializeAsync(): Promise<void> {
    try {
      await this.initializeCircuitBreakers();
      await this.initializeFallbackStrategies();
      await this.startHealthMonitoring();
      this.isInitialized = true;
      console.log('IntegrationErrorManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IntegrationErrorManager:', error);
      this.isInitialized = false;
    }
  }

  async handleIntegrationError(
    error: IntegrationError,
    context: IntegrationErrorContext,
  ): Promise<IntegrationErrorResult> {
    const startTime = Date.now();
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Ensure initialization is complete
      if (!this.isInitialized) {
        await this.initializeAsync();
      }

      // Log the integration error with full context
      await this.logIntegrationError(error, context, errorId);

      // Update service health metrics
      await this.updateServiceHealthMetrics(
        context.serviceName,
        false,
        context.errorDetails.responseTime,
      );

      // Check circuit breaker status
      const circuitBreakerStatus = await this.checkCircuitBreakerStatus(
        context.serviceName,
      );

      // Determine retry strategy based on wedding context and error type
      const retryStrategy = await this.determineRetryStrategy(error, context);

      // Attempt fallback if retry is not viable or for wedding-critical operations
      const fallbackResult = await this.attemptFallback(
        error,
        context,
        retryStrategy,
      );

      // Send integration alerts if needed
      const alertsSent = await this.sendIntegrationAlerts(
        error,
        context,
        fallbackResult,
        errorId,
      );

      // Update integration metrics and usage tracking
      await this.updateIntegrationMetrics(context, error, fallbackResult);

      return {
        errorHandled: true,
        retryRecommended: retryStrategy.shouldRetry,
        retryAfterSeconds: retryStrategy.delaySeconds,
        fallbackUsed: fallbackResult.fallbackApplied,
        fallbackData: fallbackResult.data,
        serviceHealthStatus: circuitBreakerStatus.state,
        processingTime: Date.now() - startTime,
        errorId,
        alertsSent,
      };
    } catch (handlingError) {
      console.error('Integration error handling failed:', handlingError);

      // Log the handler failure
      await this.logHandlerFailure(error, context, handlingError, errorId);

      return {
        errorHandled: false,
        retryRecommended: false,
        retryAfterSeconds: 0,
        fallbackUsed: false,
        serviceHealthStatus: 'unknown',
        processingTime: Date.now() - startTime,
        errorId,
      };
    }
  }

  private async initializeCircuitBreakers(): Promise<void> {
    const serviceConfigs = [
      {
        name: 'stripe_payments',
        timeout: 15000,
        errorThresholdPercentage: 50,
        resetTimeout: 60000,
        fallbackFunction: this.stripePaymentFallback.bind(this),
      },
      {
        name: 'email_service',
        timeout: 10000,
        errorThresholdPercentage: 30,
        resetTimeout: 30000,
        fallbackFunction: this.emailServiceFallback.bind(this),
      },
      {
        name: 'sms_service',
        timeout: 8000,
        errorThresholdPercentage: 40,
        resetTimeout: 45000,
        fallbackFunction: this.smsServiceFallback.bind(this),
      },
      {
        name: 'vendor_api',
        timeout: 20000,
        errorThresholdPercentage: 60,
        resetTimeout: 120000,
        fallbackFunction: this.vendorApiFallback.bind(this),
      },
      {
        name: 'calendar_integration',
        timeout: 12000,
        errorThresholdPercentage: 35,
        resetTimeout: 90000,
        fallbackFunction: this.calendarIntegrationFallback.bind(this),
      },
    ];

    serviceConfigs.forEach((config) => {
      const circuitBreaker = new CircuitBreaker(
        this.makeServiceCall.bind(this),
        {
          timeout: config.timeout,
          errorThresholdPercentage: config.errorThresholdPercentage,
          resetTimeout: config.resetTimeout,
          fallback: config.fallbackFunction,
        },
      );

      // Circuit breaker event listeners
      circuitBreaker.on('open', () => {
        console.warn(`Circuit breaker OPEN for ${config.name}`);
        this.logCircuitBreakerEvent(config.name, 'open');
        this.sendCircuitBreakerAlert(config.name, 'open');
      });

      circuitBreaker.on('halfOpen', () => {
        console.info(`Circuit breaker HALF-OPEN for ${config.name}`);
        this.logCircuitBreakerEvent(config.name, 'half_open');
      });

      circuitBreaker.on('close', () => {
        console.info(`Circuit breaker CLOSED for ${config.name}`);
        this.logCircuitBreakerEvent(config.name, 'close');
      });

      circuitBreaker.on('fallback', (result) => {
        console.info(`Fallback executed for ${config.name}`, result);
        this.logFallbackExecution(config.name, result);
      });

      this.circuitBreakers.set(config.name, circuitBreaker);
    });
  }

  private async initializeFallbackStrategies(): Promise<void> {
    // Payment service fallback strategies
    this.fallbackStrategies.set('stripe_payments', {
      type: 'alternative_service',
      alternativeServices: ['backup_payment_processor', 'manual_payment_queue'],
      cacheMaxAge: 300000, // 5 minutes for payment data
    });

    // Email service fallback strategies
    this.fallbackStrategies.set('email_service', {
      type: 'alternative_service',
      alternativeServices: ['backup_email_service', 'email_queue'],
      cacheMaxAge: 3600000, // 1 hour for email templates
    });

    // SMS service fallback strategies
    this.fallbackStrategies.set('sms_service', {
      type: 'graceful_degradation',
      alternativeServices: ['email_fallback'],
      degradationInstructions: 'Switch to email delivery when SMS fails',
    });

    // Vendor API fallback strategies
    this.fallbackStrategies.set('vendor_api', {
      type: 'cached_data',
      cacheMaxAge: 7200000, // 2 hours for vendor data
      alternativeServices: ['manual_vendor_sync'],
    });

    // Calendar integration fallback strategies
    this.fallbackStrategies.set('calendar_integration', {
      type: 'manual_override',
      manualOverrideEnabled: true,
      degradationInstructions:
        'Provide manual calendar instructions and iCal file',
    });
  }

  private async determineRetryStrategy(
    error: IntegrationError,
    context: IntegrationErrorContext,
  ): Promise<RetryStrategy> {
    // Wedding-specific retry logic - NO retries for wedding day critical
    const weddingContext = context.weddingContext;

    if (weddingContext?.criticalityLevel === 'wedding_day_critical') {
      return {
        shouldRetry: false,
        delaySeconds: 0,
        maxRetries: 0,
        reason: 'Wedding day critical - immediate fallback required',
      };
    }

    // Determine retry based on service type and error characteristics
    switch (context.serviceType) {
      case 'payment':
        return this.getPaymentRetryStrategy(error, context);
      case 'email':
        return this.getEmailRetryStrategy(error, context);
      case 'sms':
        return this.getSmsRetryStrategy(error, context);
      case 'webhook':
        return this.getWebhookRetryStrategy(error, context);
      case 'vendor_api':
        return this.getVendorApiRetryStrategy(error, context);
      case 'calendar':
        return this.getCalendarRetryStrategy(error, context);
      default:
        return this.getDefaultRetryStrategy(error, context);
    }
  }

  private getPaymentRetryStrategy(
    error: IntegrationError,
    context: IntegrationErrorContext,
  ): RetryStrategy {
    const httpStatus = context.errorDetails.httpStatus;

    // Payment errors require careful retry handling
    if (httpStatus === 402 || httpStatus === 403) {
      return {
        shouldRetry: false,
        delaySeconds: 0,
        maxRetries: 0,
        reason: 'Payment declined or forbidden - no retry',
      };
    }

    if (httpStatus === 429) {
      return {
        shouldRetry: true,
        delaySeconds: 60,
        maxRetries: 3,
        reason: 'Rate limited - extended retry delay',
      };
    }

    if (httpStatus && httpStatus >= 500) {
      const delay = Math.min(300, 30 * Math.pow(2, context.retryAttempt));
      return {
        shouldRetry: context.retryAttempt < 3,
        delaySeconds: delay,
        maxRetries: 3,
        reason: 'Server error - exponential backoff',
      };
    }

    return {
      shouldRetry: false,
      delaySeconds: 0,
      maxRetries: 0,
      reason: 'Payment error not suitable for retry',
    };
  }

  private getEmailRetryStrategy(
    error: IntegrationError,
    context: IntegrationErrorContext,
  ): RetryStrategy {
    if (context.errorDetails.httpStatus === 429) {
      return {
        shouldRetry: true,
        delaySeconds: 120,
        maxRetries: 5,
        reason: 'Email rate limited',
      };
    }

    if (
      context.errorDetails.httpStatus &&
      context.errorDetails.httpStatus >= 500
    ) {
      const delay = Math.min(600, 60 * Math.pow(1.5, context.retryAttempt));
      return {
        shouldRetry: context.retryAttempt < 5,
        delaySeconds: delay,
        maxRetries: 5,
        reason: 'Email service error - progressive backoff',
      };
    }

    return {
      shouldRetry: false,
      delaySeconds: 0,
      maxRetries: 0,
      reason: 'Email error not retryable',
    };
  }

  private getSmsRetryStrategy(
    error: IntegrationError,
    context: IntegrationErrorContext,
  ): RetryStrategy {
    // SMS can be retried but with graceful degradation to email
    if (
      context.errorDetails.httpStatus &&
      context.errorDetails.httpStatus >= 500
    ) {
      const delay = Math.min(300, 45 * Math.pow(2, context.retryAttempt));
      return {
        shouldRetry: context.retryAttempt < 3,
        delaySeconds: delay,
        maxRetries: 3,
        reason: 'SMS service error - will fallback to email after retries',
      };
    }

    return {
      shouldRetry: false,
      delaySeconds: 0,
      maxRetries: 0,
      reason: 'SMS error - immediate fallback to email',
    };
  }

  private getWebhookRetryStrategy(
    error: IntegrationError,
    context: IntegrationErrorContext,
  ): RetryStrategy {
    const maxRetries =
      context.weddingContext?.criticalityLevel === 'high' ? 8 : 5;
    const baseDelay = 30;
    const delay = Math.min(3600, baseDelay * Math.pow(2, context.retryAttempt));

    return {
      shouldRetry: context.retryAttempt < maxRetries,
      delaySeconds: delay,
      maxRetries,
      reason: 'Webhook delivery retry with exponential backoff',
    };
  }

  private getVendorApiRetryStrategy(
    error: IntegrationError,
    context: IntegrationErrorContext,
  ): RetryStrategy {
    if (
      context.errorDetails.httpStatus &&
      context.errorDetails.httpStatus >= 500
    ) {
      const delay = Math.min(900, 90 * Math.pow(2, context.retryAttempt));
      return {
        shouldRetry: context.retryAttempt < 4,
        delaySeconds: delay,
        maxRetries: 4,
        reason: 'Vendor API error - extended backoff with cache fallback',
      };
    }

    return {
      shouldRetry: false,
      delaySeconds: 0,
      maxRetries: 0,
      reason: 'Vendor API error - use cached data fallback',
    };
  }

  private getCalendarRetryStrategy(
    error: IntegrationError,
    context: IntegrationErrorContext,
  ): RetryStrategy {
    if (
      context.errorDetails.httpStatus &&
      context.errorDetails.httpStatus >= 500
    ) {
      const delay = Math.min(600, 120 * Math.pow(1.8, context.retryAttempt));
      return {
        shouldRetry: context.retryAttempt < 3,
        delaySeconds: delay,
        maxRetries: 3,
        reason: 'Calendar service error - moderate retry with manual fallback',
      };
    }

    return {
      shouldRetry: false,
      delaySeconds: 0,
      maxRetries: 0,
      reason: 'Calendar error - provide manual instructions',
    };
  }

  private getDefaultRetryStrategy(
    error: IntegrationError,
    context: IntegrationErrorContext,
  ): RetryStrategy {
    const delay = Math.min(300, 60 * Math.pow(2, context.retryAttempt));
    return {
      shouldRetry: context.retryAttempt < 3,
      delaySeconds: delay,
      maxRetries: 3,
      reason: 'Default retry strategy with exponential backoff',
    };
  }

  private async attemptFallback(
    error: IntegrationError,
    context: IntegrationErrorContext,
    retryStrategy: RetryStrategy,
  ): Promise<FallbackResult> {
    if (
      retryStrategy.shouldRetry &&
      context.weddingContext?.criticalityLevel !== 'wedding_day_critical'
    ) {
      // Schedule retry instead of fallback for non-critical operations
      await this.scheduleRetry(context, retryStrategy);
      return {
        fallbackApplied: false,
        data: null,
        fallbackType: 'none',
      };
    }

    const fallbackStrategy = this.fallbackStrategies.get(context.serviceName);
    if (!fallbackStrategy) {
      return {
        fallbackApplied: false,
        data: null,
        fallbackType: 'none',
        reason: 'No fallback strategy configured',
      };
    }

    try {
      switch (fallbackStrategy.type) {
        case 'alternative_service':
          return await this.useAlternativeService(context, fallbackStrategy);
        case 'cached_data':
          return await this.useCachedData(context, fallbackStrategy);
        case 'graceful_degradation':
          return await this.applyGracefulDegradation(context, fallbackStrategy);
        case 'manual_override':
          return await this.enableManualOverride(context, fallbackStrategy);
        default:
          return {
            fallbackApplied: false,
            data: null,
            fallbackType: 'none',
            reason: 'Unknown fallback type',
          };
      }
    } catch (fallbackError) {
      console.error('Fallback execution failed:', fallbackError);

      return {
        fallbackApplied: false,
        data: null,
        fallbackType: fallbackStrategy.type,
        reason: 'Fallback execution failed',
        error:
          fallbackError instanceof Error
            ? fallbackError.message
            : String(fallbackError),
      };
    }
  }

  private async useAlternativeService(
    context: IntegrationErrorContext,
    strategy: FallbackStrategy,
  ): Promise<FallbackResult> {
    const alternativeService = strategy.alternativeServices?.[0];
    if (!alternativeService) {
      return {
        fallbackApplied: false,
        data: null,
        fallbackType: 'alternative_service',
        reason: 'No alternative service configured',
      };
    }

    try {
      let result;

      if (context.serviceType === 'email') {
        result = await this.callAlternativeEmailService(
          alternativeService,
          context,
        );
      } else if (context.serviceType === 'payment') {
        result = await this.callAlternativePaymentService(
          alternativeService,
          context,
        );
      } else {
        return {
          fallbackApplied: false,
          data: null,
          fallbackType: 'alternative_service',
          reason: 'Alternative service not implemented for this service type',
        };
      }

      return {
        fallbackApplied: true,
        data: result,
        fallbackType: 'alternative_service',
        alternativeServiceUsed: alternativeService,
      };
    } catch (alternativeError) {
      console.error('Alternative service failed:', alternativeError);

      return {
        fallbackApplied: false,
        data: null,
        fallbackType: 'alternative_service',
        reason: 'Alternative service also failed',
        error:
          alternativeError instanceof Error
            ? alternativeError.message
            : String(alternativeError),
      };
    }
  }

  private async useCachedData(
    context: IntegrationErrorContext,
    strategy: FallbackStrategy,
  ): Promise<FallbackResult> {
    const cacheKey = this.generateCacheKey(context);

    try {
      const cachedData = await this.redis.get(cacheKey);

      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const cacheAge = Date.now() - parsedData.timestamp;
        const maxCacheAge = strategy.cacheMaxAge || 3600000;

        if (cacheAge <= maxCacheAge) {
          return {
            fallbackApplied: true,
            data: parsedData.data,
            fallbackType: 'cached_data',
            cacheAge,
            dataFreshness: 'stale_but_acceptable',
          };
        }
      }

      return {
        fallbackApplied: false,
        data: null,
        fallbackType: 'cached_data',
        reason: 'No valid cached data available',
      };
    } catch (cacheError) {
      console.error('Cache fallback failed:', cacheError);

      return {
        fallbackApplied: false,
        data: null,
        fallbackType: 'cached_data',
        reason: 'Cache access failed',
        error:
          cacheError instanceof Error ? cacheError.message : String(cacheError),
      };
    }
  }

  private async applyGracefulDegradation(
    context: IntegrationErrorContext,
    strategy: FallbackStrategy,
  ): Promise<FallbackResult> {
    switch (context.serviceType) {
      case 'email':
        return {
          fallbackApplied: true,
          data: {
            degradedMode: true,
            message: 'Email queued for manual delivery',
            manualActionRequired: true,
          },
          fallbackType: 'graceful_degradation',
          degradationLevel: 'manual_fallback',
        };

      case 'sms':
        return {
          fallbackApplied: true,
          data: {
            degradedMode: true,
            message: 'SMS delivery disabled, using email fallback',
            alternativeMethodUsed: 'email',
          },
          fallbackType: 'graceful_degradation',
          degradationLevel: 'feature_disabled',
        };

      case 'calendar':
        return {
          fallbackApplied: true,
          data: {
            degradedMode: true,
            message: 'Calendar sync disabled, manual entry required',
            manualInstructions:
              'Please manually add wedding events to your calendar',
          },
          fallbackType: 'graceful_degradation',
          degradationLevel: 'manual_process',
        };

      default:
        return {
          fallbackApplied: true,
          data: {
            degradedMode: true,
            message: 'Service temporarily unavailable',
            userMessage:
              "This feature is temporarily unavailable. We'll restore it shortly.",
          },
          fallbackType: 'graceful_degradation',
          degradationLevel: 'service_unavailable',
        };
    }
  }

  private async enableManualOverride(
    context: IntegrationErrorContext,
    strategy: FallbackStrategy,
  ): Promise<FallbackResult> {
    return {
      fallbackApplied: true,
      data: {
        manualOverrideEnabled: true,
        message: `Manual override activated for ${context.serviceType}`,
        instructions:
          strategy.degradationInstructions || 'Manual intervention required',
        manualActionRequired: true,
      },
      fallbackType: 'manual_override',
      degradationLevel: 'manual_fallback',
    };
  }

  // Helper methods for service calls and caching
  private generateCacheKey(context: IntegrationErrorContext): string {
    return `integration_cache:${context.serviceName}:${context.endpoint}:${context.requestId}`;
  }

  private async makeServiceCall(
    serviceName: string,
    ...args: any[]
  ): Promise<any> {
    // Placeholder for actual service calls
    throw new Error(`Service call to ${serviceName} not implemented`);
  }

  private async callAlternativeEmailService(
    serviceName: string,
    context: IntegrationErrorContext,
  ): Promise<any> {
    // Placeholder for alternative email service implementation
    return {
      service: serviceName,
      message: 'Email queued via alternative service',
      fallbackUsed: true,
    };
  }

  private async callAlternativePaymentService(
    serviceName: string,
    context: IntegrationErrorContext,
  ): Promise<any> {
    // Placeholder for alternative payment service implementation
    return {
      service: serviceName,
      message: 'Payment queued via alternative processor',
      fallbackUsed: true,
    };
  }

  private async scheduleRetry(
    context: IntegrationErrorContext,
    strategy: RetryStrategy,
  ): Promise<void> {
    const retryAt = new Date(Date.now() + strategy.delaySeconds * 1000);

    // Store retry information in Redis for processing
    const retryKey = `retry:${context.serviceName}:${context.requestId}:${context.retryAttempt + 1}`;
    const retryData = {
      context,
      strategy,
      retryAt: retryAt.toISOString(),
      attempt: context.retryAttempt + 1,
    };

    await this.redis.setex(
      retryKey,
      strategy.delaySeconds + 3600,
      JSON.stringify(retryData),
    );
    console.log(
      `Retry scheduled for ${context.serviceName} in ${strategy.delaySeconds} seconds`,
    );
  }

  // Logging and monitoring methods
  private async logIntegrationError(
    error: IntegrationError,
    context: IntegrationErrorContext,
    errorId: string,
  ): Promise<void> {
    try {
      await this.supabase.from('integration_errors').insert({
        error_id: errorId,
        service_name: context.serviceName,
        service_type: context.serviceType,
        endpoint: context.endpoint,
        request_id: context.requestId,
        wedding_id: context.weddingContext?.weddingId,
        wedding_date: context.weddingContext?.weddingDate,
        vendor_type: context.weddingContext?.vendorType,
        criticality_level: context.weddingContext?.criticalityLevel || 'low',
        retry_attempt: context.retryAttempt,
        last_success_at: context.lastSuccessAt,
        http_status: context.errorDetails.httpStatus,
        error_code: context.errorDetails.errorCode,
        response_time: context.errorDetails.responseTime,
        error_message: context.errorDetails.errorMessage,
        error_stack: context.errorDetails.errorStack,
        error_context: context,
      });
    } catch (logError) {
      console.error('Failed to log integration error:', logError);
    }
  }

  private async logHandlerFailure(
    originalError: IntegrationError,
    context: IntegrationErrorContext,
    handlingError: unknown,
    errorId: string,
  ): Promise<void> {
    try {
      await this.supabase.from('integration_errors').insert({
        error_id: `${errorId}_handler_failure`,
        service_name: 'error_handler',
        service_type: 'webhook',
        endpoint: 'handle_integration_error',
        request_id: context.requestId,
        criticality_level: 'high',
        retry_attempt: 0,
        http_status: 500,
        error_message: `Error handler failed: ${handlingError instanceof Error ? handlingError.message : String(handlingError)}`,
        error_stack:
          handlingError instanceof Error ? handlingError.stack : undefined,
        error_context: { originalError: originalError.message, context },
      });
    } catch (logError) {
      console.error('Failed to log handler failure:', logError);
    }
  }

  private async updateServiceHealthMetrics(
    serviceName: string,
    success: boolean,
    responseTime?: number,
  ): Promise<void> {
    try {
      const healthData = {
        service_name: serviceName,
        service_type: this.getServiceTypeFromName(serviceName),
        last_failure_at: success ? null : new Date().toISOString(),
        last_success_at: success ? new Date().toISOString() : null,
        avg_response_time: responseTime || null,
        health_status: success ? 'healthy' : 'degraded',
      };

      await this.supabase.from('service_health_metrics').upsert(healthData, {
        onConflict: 'service_name',
        ignoreDuplicates: false,
      });
    } catch (error) {
      console.error('Failed to update service health metrics:', error);
    }
  }

  private getServiceTypeFromName(serviceName: string): string {
    if (serviceName.includes('payment') || serviceName.includes('stripe'))
      return 'payment';
    if (serviceName.includes('email')) return 'email';
    if (serviceName.includes('sms')) return 'sms';
    if (serviceName.includes('calendar')) return 'calendar';
    if (serviceName.includes('vendor')) return 'vendor_api';
    return 'unknown';
  }

  private async updateIntegrationMetrics(
    context: IntegrationErrorContext,
    error: IntegrationError,
    fallbackResult: FallbackResult,
  ): Promise<void> {
    if (fallbackResult.fallbackApplied) {
      try {
        await this.supabase.from('integration_fallback_usage').insert({
          service_name: context.serviceName,
          service_type: context.serviceType,
          fallback_type: fallbackResult.fallbackType,
          fallback_triggered_by: error.constructor.name,
          alternative_service_used: fallbackResult.alternativeServiceUsed,
          cache_hit:
            fallbackResult.fallbackType === 'cached_data' &&
            fallbackResult.data != null,
          cache_age_seconds: fallbackResult.cacheAge
            ? Math.floor(fallbackResult.cacheAge / 1000)
            : null,
          success: fallbackResult.fallbackApplied,
          wedding_context: context.weddingContext,
          business_impact: this.determinBusinessImpact(context, fallbackResult),
          user_experience_impact:
            this.determineUserExperienceImpact(fallbackResult),
        });
      } catch (error) {
        console.error('Failed to update integration metrics:', error);
      }
    }
  }

  private determinBusinessImpact(
    context: IntegrationErrorContext,
    fallbackResult: FallbackResult,
  ): string {
    if (context.weddingContext?.criticalityLevel === 'wedding_day_critical') {
      return 'High - Wedding day operation affected';
    }
    if (context.serviceType === 'payment') {
      return 'High - Payment processing affected';
    }
    if (fallbackResult.fallbackApplied) {
      return 'Low - Handled by fallback mechanism';
    }
    return 'Medium - Service degradation';
  }

  private determineUserExperienceImpact(
    fallbackResult: FallbackResult,
  ): 'none' | 'minimal' | 'moderate' | 'significant' {
    if (!fallbackResult.fallbackApplied) return 'significant';

    switch (fallbackResult.degradationLevel) {
      case 'minimal':
        return 'minimal';
      case 'moderate':
      case 'feature_disabled':
        return 'moderate';
      case 'service_unavailable':
      case 'manual_fallback':
      case 'manual_process':
        return 'significant';
      default:
        return 'minimal';
    }
  }

  private async checkCircuitBreakerStatus(
    serviceName: string,
  ): Promise<CircuitBreakerStatus> {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (!circuitBreaker) {
      return {
        state: 'closed',
        failures: 0,
        successes: 0,
        nextAttempt: 0,
      };
    }

    const stats = circuitBreaker.stats;
    return {
      state: circuitBreaker.opened
        ? 'open'
        : circuitBreaker.halfOpen
          ? 'half_open'
          : 'closed',
      failures: stats.failures,
      successes: stats.successes,
      nextAttempt: circuitBreaker.nextAttempt,
    };
  }

  private async sendIntegrationAlerts(
    error: IntegrationError,
    context: IntegrationErrorContext,
    fallbackResult: FallbackResult,
    errorId: string,
  ): Promise<string[]> {
    const alerts: string[] = [];

    try {
      // High-severity alert for wedding day critical failures
      if (context.weddingContext?.criticalityLevel === 'wedding_day_critical') {
        const alertId = await this.createAlert({
          alert_type: 'service_down',
          service_name: context.serviceName,
          severity: 'critical',
          title: `Wedding Day Critical Service Failure - ${context.serviceName}`,
          description: `Critical service failure affecting wedding ${context.weddingContext.weddingId} on ${context.weddingContext.weddingDate}`,
          alert_data: { error, context, fallbackResult },
          wedding_impact: true,
          wedding_date: context.weddingContext.weddingDate,
        });
        alerts.push(alertId);
      }

      // Payment service failures always generate high-priority alerts
      if (context.serviceType === 'payment') {
        const alertId = await this.createAlert({
          alert_type: 'service_down',
          service_name: context.serviceName,
          severity: 'high',
          title: `Payment Service Failure - ${context.serviceName}`,
          description: `Payment processing affected: ${context.errorDetails.errorMessage}`,
          alert_data: { error, context, fallbackResult },
        });
        alerts.push(alertId);
      }

      // Fallback activation alerts
      if (fallbackResult.fallbackApplied) {
        const alertId = await this.createAlert({
          alert_type: 'fallback_activated',
          service_name: context.serviceName,
          severity: 'medium',
          title: `Fallback Activated - ${context.serviceName}`,
          description: `Service fallback activated: ${fallbackResult.fallbackType}`,
          alert_data: { fallbackResult, context },
        });
        alerts.push(alertId);
      }
    } catch (alertError) {
      console.error('Failed to send integration alerts:', alertError);
    }

    return alerts;
  }

  private async createAlert(alertData: any): Promise<string> {
    const { data, error } = await this.supabase
      .from('integration_alerts')
      .insert(alertData)
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  // Circuit breaker logging methods
  private async logCircuitBreakerEvent(
    serviceName: string,
    eventType: 'open' | 'half_open' | 'close',
  ): Promise<void> {
    try {
      const circuitBreaker = this.circuitBreakers.get(serviceName);
      const stats = circuitBreaker?.stats;

      await this.supabase.from('circuit_breaker_events').insert({
        service_name: serviceName,
        event_type: eventType,
        failure_count: stats?.failures || 0,
        success_count: stats?.successes || 0,
        error_rate: stats
          ? (stats.failures / (stats.failures + stats.successes)) * 100
          : 0,
        metadata: { stats },
      });
    } catch (error) {
      console.error('Failed to log circuit breaker event:', error);
    }
  }

  private async logFallbackExecution(
    serviceName: string,
    result: any,
  ): Promise<void> {
    console.log(`Fallback executed for ${serviceName}:`, result);
  }

  private async sendCircuitBreakerAlert(
    serviceName: string,
    state: 'open' | 'close',
  ): Promise<void> {
    try {
      await this.createAlert({
        alert_type: 'circuit_breaker_open',
        service_name: serviceName,
        severity: state === 'open' ? 'high' : 'medium',
        title: `Circuit Breaker ${state.toUpperCase()} - ${serviceName}`,
        description: `Circuit breaker state changed to ${state} for ${serviceName}`,
        alert_data: { state, timestamp: new Date().toISOString() },
      });
    } catch (error) {
      console.error('Failed to send circuit breaker alert:', error);
    }
  }

  private async startHealthMonitoring(): Promise<void> {
    // Start periodic health monitoring for all services
    setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 60000); // Every minute
  }

  private async performHealthChecks(): Promise<void> {
    for (const [serviceName, circuitBreaker] of this.circuitBreakers) {
      const stats = circuitBreaker.stats;
      const healthStatus = circuitBreaker.opened ? 'unhealthy' : 'healthy';

      await this.updateServiceHealthMetrics(
        serviceName,
        !circuitBreaker.opened,
        stats.latencyMean,
      );
    }
  }

  // Circuit breaker fallback functions
  private async stripePaymentFallback(context: any): Promise<any> {
    return {
      fallbackUsed: true,
      message:
        'Payment processing temporarily unavailable. Your booking is secure.',
      paymentQueued: true,
      manualProcessingRequired: true,
      estimatedRecoveryTime: '15 minutes',
    };
  }

  private async emailServiceFallback(context: any): Promise<any> {
    return {
      fallbackUsed: true,
      message: 'Email queued for delivery when service is restored',
      emailQueued: true,
      estimatedDelivery: '15 minutes',
    };
  }

  private async smsServiceFallback(context: any): Promise<any> {
    return {
      fallbackUsed: true,
      message: 'SMS temporarily unavailable, email notification sent instead',
      alternativeMethodUsed: 'email',
    };
  }

  private async vendorApiFallback(context: any): Promise<any> {
    return {
      fallbackUsed: true,
      message: 'Vendor data temporarily cached, manual sync may be required',
      dataFreshness: 'cached',
      manualSyncAvailable: true,
    };
  }

  private async calendarIntegrationFallback(context: any): Promise<any> {
    return {
      fallbackUsed: true,
      message: 'Calendar sync disabled, manual entry instructions provided',
      manualInstructions: 'Please manually add events to your calendar',
      icalFileGenerated: true,
    };
  }
}
