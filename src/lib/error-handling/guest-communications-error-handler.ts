/**
 * WS-155: Comprehensive Error Handling and Recovery
 * Production-grade error handling with automatic recovery
 */

import * as Sentry from '@sentry/nextjs';
import { Redis } from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { guestCommunicationsMonitor } from '../monitoring/guest-communications-monitor';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export enum ErrorCode {
  // Validation Errors
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PHONE = 'INVALID_PHONE',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_MESSAGE_TYPE = 'INVALID_MESSAGE_TYPE',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',

  // Authentication/Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ABUSE_DETECTED = 'ABUSE_DETECTED',
  IP_BLACKLISTED = 'IP_BLACKLISTED',

  // Compliance
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  JURISDICTION_RESTRICTED = 'JURISDICTION_RESTRICTED',

  // Service Errors
  EMAIL_SERVICE_UNAVAILABLE = 'EMAIL_SERVICE_UNAVAILABLE',
  SMS_SERVICE_UNAVAILABLE = 'SMS_SERVICE_UNAVAILABLE',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  TEMPLATE_RENDER_ERROR = 'TEMPLATE_RENDER_ERROR',

  // Infrastructure
  DATABASE_ERROR = 'DATABASE_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',
  QUEUE_FULL = 'QUEUE_FULL',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',

  // Business Logic
  WEDDING_NOT_FOUND = 'WEDDING_NOT_FOUND',
  GUEST_NOT_FOUND = 'GUEST_NOT_FOUND',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  INVALID_SCHEDULE_TIME = 'INVALID_SCHEDULE_TIME',

  // External Services
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  WEBHOOK_DELIVERY_FAILED = 'WEBHOOK_DELIVERY_FAILED',

  // Generic
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  userId?: string;
  weddingId?: string;
  messageId?: string;
  requestId?: string;
  endpoint?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'circuit_break' | 'alert' | 'manual';
  maxAttempts?: number;
  delay?: number;
  fallbackService?: string;
  alertChannel?: string;
}

export class GuestCommunicationsError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly userMessage: string;

  constructor(
    code: ErrorCode,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {},
    options: {
      recoverable?: boolean;
      retryable?: boolean;
      userMessage?: string;
      cause?: Error;
    } = {},
  ) {
    super(message);
    this.name = 'GuestCommunicationsError';
    this.code = code;
    this.severity = severity;
    this.context = { ...context, timestamp: new Date() };
    this.recoverable = options.recoverable ?? true;
    this.retryable = options.retryable ?? this.isRetryableError(code);
    this.userMessage = options.userMessage ?? this.getDefaultUserMessage(code);

    if (options.cause) {
      this.cause = options.cause;
    }
  }

  private isRetryableError(code: ErrorCode): boolean {
    const retryableErrors = [
      ErrorCode.EMAIL_SERVICE_UNAVAILABLE,
      ErrorCode.SMS_SERVICE_UNAVAILABLE,
      ErrorCode.DATABASE_ERROR,
      ErrorCode.REDIS_ERROR,
      ErrorCode.NETWORK_TIMEOUT,
      ErrorCode.EXTERNAL_API_ERROR,
      ErrorCode.QUEUE_FULL,
    ];

    return retryableErrors.includes(code);
  }

  private getDefaultUserMessage(code: ErrorCode): string {
    const messages = {
      [ErrorCode.INVALID_EMAIL]: 'Please provide a valid email address.',
      [ErrorCode.INVALID_PHONE]: 'Please provide a valid phone number.',
      [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required information is missing.',
      [ErrorCode.RATE_LIMIT_EXCEEDED]:
        'Too many requests. Please try again later.',
      [ErrorCode.CONSENT_REQUIRED]:
        'Consent is required before sending messages.',
      [ErrorCode.UNSUBSCRIBED]: 'Recipient has unsubscribed from messages.',
      [ErrorCode.EMAIL_SERVICE_UNAVAILABLE]:
        'Email service is temporarily unavailable.',
      [ErrorCode.SMS_SERVICE_UNAVAILABLE]:
        'SMS service is temporarily unavailable.',
      [ErrorCode.TEMPLATE_NOT_FOUND]: 'Message template not found.',
      [ErrorCode.WEDDING_NOT_FOUND]: 'Wedding information not found.',
      [ErrorCode.GUEST_NOT_FOUND]: 'Guest information not found.',
      [ErrorCode.MESSAGE_NOT_FOUND]: 'Message not found.',
      [ErrorCode.INTERNAL_SERVER_ERROR]:
        'An internal error occurred. Please try again.',
    };

    return messages[code] || 'An unexpected error occurred.';
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      severity: this.severity,
      recoverable: this.recoverable,
      retryable: this.retryable,
      context: this.context,
      stack: this.stack,
    };
  }
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitter: boolean;
}

export class ErrorHandler {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryQueues: Map<string, RetryQueue> = new Map();

  constructor() {
    this.initializeCircuitBreakers();
    this.startErrorRecovery();
  }

  private initializeCircuitBreakers() {
    // Email service circuit breaker
    this.circuitBreakers.set(
      'email-service',
      new CircuitBreaker({
        failureThreshold: 10,
        recoveryTimeout: 60000, // 1 minute
        monitoringPeriod: 300000, // 5 minutes
      }),
    );

    // SMS service circuit breaker
    this.circuitBreakers.set(
      'sms-service',
      new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 30000, // 30 seconds
        monitoringPeriod: 180000, // 3 minutes
      }),
    );

    // Database circuit breaker
    this.circuitBreakers.set(
      'database',
      new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 10000, // 10 seconds
        monitoringPeriod: 60000, // 1 minute
      }),
    );
  }

  async handleError(
    error: Error | GuestCommunicationsError,
    context: ErrorContext = {},
  ): Promise<void> {
    let guestError: GuestCommunicationsError;

    if (error instanceof GuestCommunicationsError) {
      guestError = error;
    } else {
      // Convert generic error to GuestCommunicationsError
      guestError = this.convertToGuestError(error, context);
    }

    // Update context with additional information
    guestError.context = { ...guestError.context, ...context };

    // Log error
    await this.logError(guestError);

    // Report to monitoring
    await this.reportToMonitoring(guestError);

    // Execute recovery strategy
    await this.executeRecovery(guestError);

    // Circuit breaker handling
    this.updateCircuitBreakers(guestError);
  }

  private convertToGuestError(
    error: Error,
    context: ErrorContext,
  ): GuestCommunicationsError {
    // Map common errors to specific codes
    if (error.message.includes('email')) {
      return new GuestCommunicationsError(
        ErrorCode.EMAIL_SERVICE_UNAVAILABLE,
        error.message,
        ErrorSeverity.HIGH,
        context,
        { cause: error },
      );
    }

    if (
      error.message.includes('database') ||
      error.message.includes('connection')
    ) {
      return new GuestCommunicationsError(
        ErrorCode.DATABASE_ERROR,
        error.message,
        ErrorSeverity.HIGH,
        context,
        { cause: error },
      );
    }

    if (error.message.includes('timeout')) {
      return new GuestCommunicationsError(
        ErrorCode.NETWORK_TIMEOUT,
        error.message,
        ErrorSeverity.MEDIUM,
        context,
        { cause: error },
      );
    }

    // Default to internal server error
    return new GuestCommunicationsError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      error.message,
      ErrorSeverity.HIGH,
      context,
      { cause: error },
    );
  }

  private async logError(error: GuestCommunicationsError): Promise<void> {
    // Console logging with structured format
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = {
      level: logLevel,
      code: error.code,
      message: error.message,
      severity: error.severity,
      context: error.context,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    console[logLevel](
      'Guest Communications Error:',
      JSON.stringify(logMessage, null, 2),
    );

    // Store in database for analysis
    try {
      await supabase.from('error_logs').insert({
        error_code: error.code,
        message: error.message,
        severity: error.severity,
        context: error.context,
        stack_trace: error.stack,
        user_id: error.context.userId,
        wedding_id: error.context.weddingId,
        message_id: error.context.messageId,
        ip_address: error.context.ipAddress,
        user_agent: error.context.userAgent,
        timestamp: error.context.timestamp,
      });
    } catch (logError) {
      console.error('Failed to store error log:', logError);
    }
  }

  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
      default:
        return 'info';
    }
  }

  private async reportToMonitoring(
    error: GuestCommunicationsError,
  ): Promise<void> {
    // Report to Sentry
    Sentry.captureException(error, {
      tags: {
        errorCode: error.code,
        severity: error.severity,
        recoverable: error.recoverable,
        retryable: error.retryable,
      },
      extra: error.context,
      level: this.getSentryLevel(error.severity),
    });

    // Report to internal monitoring
    await guestCommunicationsMonitor.recordMessageSent({
      messageId: `error-${Date.now()}`,
      type: 'email',
      status: 'failed',
      channel: 'error-tracking',
      recipientId: error.context.userId || 'unknown',
      timestamp: new Date(),
      processingTime: 0,
      metadata: {
        errorCode: error.code,
        severity: error.severity,
        recoverable: error.recoverable,
        retryable: error.retryable,
        context: error.context,
      },
    });
  }

  private getSentryLevel(
    severity: ErrorSeverity,
  ): 'error' | 'warning' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warning';
      case ErrorSeverity.LOW:
      default:
        return 'info';
    }
  }

  private async executeRecovery(
    error: GuestCommunicationsError,
  ): Promise<void> {
    const recoveryAction = this.getRecoveryAction(error);

    switch (recoveryAction.type) {
      case 'retry':
        await this.queueForRetry(error, recoveryAction);
        break;

      case 'fallback':
        await this.executeFallback(error, recoveryAction);
        break;

      case 'circuit_break':
        this.openCircuitBreaker(error);
        break;

      case 'alert':
        await this.sendAlert(error, recoveryAction);
        break;

      case 'manual':
        await this.createManualTask(error);
        break;
    }
  }

  private getRecoveryAction(error: GuestCommunicationsError): RecoveryAction {
    // Define recovery strategies based on error type
    const strategies: Record<string, RecoveryAction> = {
      [ErrorCode.EMAIL_SERVICE_UNAVAILABLE]: {
        type: 'retry',
        maxAttempts: 5,
        delay: 30000, // 30 seconds
      },

      [ErrorCode.SMS_SERVICE_UNAVAILABLE]: {
        type: 'fallback',
        fallbackService: 'email',
      },

      [ErrorCode.DATABASE_ERROR]: {
        type: 'retry',
        maxAttempts: 3,
        delay: 5000, // 5 seconds
      },

      [ErrorCode.TEMPLATE_RENDER_ERROR]: {
        type: 'fallback',
        fallbackService: 'default-template',
      },

      [ErrorCode.RATE_LIMIT_EXCEEDED]: {
        type: 'retry',
        maxAttempts: 1,
        delay: 60000, // 1 minute
      },

      [ErrorCode.ABUSE_DETECTED]: {
        type: 'circuit_break',
      },

      [ErrorCode.COMPLIANCE_VIOLATION]: {
        type: 'alert',
        alertChannel: 'compliance',
      },

      [ErrorCode.EXTERNAL_API_ERROR]: {
        type: 'retry',
        maxAttempts: 3,
        delay: 10000, // 10 seconds
      },
    };

    return strategies[error.code] || { type: 'manual' };
  }

  private async queueForRetry(
    error: GuestCommunicationsError,
    action: RecoveryAction,
  ): Promise<void> {
    if (!error.retryable) return;

    const queueKey = `retry:${error.code}`;

    if (!this.retryQueues.has(queueKey)) {
      this.retryQueues.set(
        queueKey,
        new RetryQueue({
          maxAttempts: action.maxAttempts || 3,
          baseDelay: action.delay || 5000,
          maxDelay: 300000, // 5 minutes
          exponentialBase: 2,
          jitter: true,
        }),
      );
    }

    const retryQueue = this.retryQueues.get(queueKey)!;
    await retryQueue.add(error);
  }

  private async executeFallback(
    error: GuestCommunicationsError,
    action: RecoveryAction,
  ): Promise<void> {
    console.log(
      `Executing fallback for ${error.code}: ${action.fallbackService}`,
    );

    // Store fallback execution
    await redis.setex(
      `fallback:${error.context.requestId}`,
      3600, // 1 hour
      JSON.stringify({
        originalError: error.code,
        fallbackService: action.fallbackService,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  private openCircuitBreaker(error: GuestCommunicationsError): void {
    // Determine which circuit breaker to open based on error
    let breakerKey: string;

    if (error.code === ErrorCode.EMAIL_SERVICE_UNAVAILABLE) {
      breakerKey = 'email-service';
    } else if (error.code === ErrorCode.SMS_SERVICE_UNAVAILABLE) {
      breakerKey = 'sms-service';
    } else if (error.code === ErrorCode.DATABASE_ERROR) {
      breakerKey = 'database';
    } else {
      return; // No circuit breaker for this error type
    }

    const circuitBreaker = this.circuitBreakers.get(breakerKey);
    if (circuitBreaker) {
      circuitBreaker.recordFailure();
    }
  }

  private updateCircuitBreakers(error: GuestCommunicationsError): void {
    // Update circuit breaker state based on error
    this.openCircuitBreaker(error);
  }

  private async sendAlert(
    error: GuestCommunicationsError,
    action: RecoveryAction,
  ): Promise<void> {
    const alert = {
      type: 'error',
      severity: error.severity,
      code: error.code,
      message: error.message,
      context: error.context,
      channel: action.alertChannel || 'default',
      timestamp: new Date().toISOString(),
    };

    // Send to appropriate alert channel
    if (action.alertChannel === 'compliance') {
      await this.sendComplianceAlert(alert);
    } else {
      await this.sendGeneralAlert(alert);
    }
  }

  private async sendComplianceAlert(alert: any): Promise<void> {
    // Send compliance-specific alert
    console.log('🚨 COMPLIANCE ALERT:', alert);

    // Implementation would send to compliance team
    await redis.lpush('alerts:compliance', JSON.stringify(alert));
  }

  private async sendGeneralAlert(alert: any): Promise<void> {
    // Send general alert
    console.log('🚨 SYSTEM ALERT:', alert);

    // Implementation would send to operations team
    await redis.lpush('alerts:general', JSON.stringify(alert));
  }

  private async createManualTask(
    error: GuestCommunicationsError,
  ): Promise<void> {
    const task = {
      type: 'manual_intervention',
      errorCode: error.code,
      message: error.message,
      context: error.context,
      severity: error.severity,
      created: new Date().toISOString(),
      status: 'pending',
    };

    await supabase.from('manual_tasks').insert(task);
    console.log('📋 Manual task created for error:', error.code);
  }

  private startErrorRecovery(): void {
    // Process retry queues every 30 seconds
    setInterval(async () => {
      for (const [key, queue] of this.retryQueues) {
        await queue.processRetries();
      }
    }, 30000);

    // Check circuit breaker states every minute
    setInterval(() => {
      for (const [key, breaker] of this.circuitBreakers) {
        breaker.checkRecovery();
      }
    }, 60000);
  }

  // Public methods for error creation
  static createValidationError(
    field: string,
    value: any,
    context: ErrorContext = {},
  ): GuestCommunicationsError {
    return new GuestCommunicationsError(
      ErrorCode.MISSING_REQUIRED_FIELD,
      `Invalid or missing field: ${field}`,
      ErrorSeverity.LOW,
      { ...context, field, value },
      {
        recoverable: false,
        retryable: false,
        userMessage: `Please provide a valid ${field}.`,
      },
    );
  }

  static createServiceError(
    service: string,
    originalError: Error,
    context: ErrorContext = {},
  ): GuestCommunicationsError {
    const errorCode =
      service === 'email'
        ? ErrorCode.EMAIL_SERVICE_UNAVAILABLE
        : service === 'sms'
          ? ErrorCode.SMS_SERVICE_UNAVAILABLE
          : ErrorCode.EXTERNAL_API_ERROR;

    return new GuestCommunicationsError(
      errorCode,
      `${service} service error: ${originalError.message}`,
      ErrorSeverity.HIGH,
      { ...context, service },
      {
        recoverable: true,
        retryable: true,
        cause: originalError,
      },
    );
  }

  static createComplianceError(
    violation: string,
    context: ErrorContext = {},
  ): GuestCommunicationsError {
    return new GuestCommunicationsError(
      ErrorCode.COMPLIANCE_VIOLATION,
      `Compliance violation: ${violation}`,
      ErrorSeverity.CRITICAL,
      { ...context, violation },
      {
        recoverable: false,
        retryable: false,
        userMessage: 'This action violates compliance requirements.',
      },
    );
  }
}

// Circuit Breaker Implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private config: {
      failureThreshold: number;
      recoveryTimeout: number;
      monitoringPeriod: number;
    },
  ) {}

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
      console.log(`🔄 Circuit breaker opened (failures: ${this.failures})`);
    }
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
    console.log('✅ Circuit breaker closed (success recorded)');
  }

  checkRecovery(): void {
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;

      if (timeSinceLastFailure >= this.config.recoveryTimeout) {
        this.state = 'half-open';
        console.log('🔄 Circuit breaker half-open (attempting recovery)');
      }
    }
  }

  isOpen(): boolean {
    return this.state === 'open';
  }

  canExecute(): boolean {
    return this.state !== 'open';
  }
}

// Retry Queue Implementation
class RetryQueue {
  private queue: Array<{
    error: GuestCommunicationsError;
    attempts: number;
    nextRetry: number;
  }> = [];

  constructor(private config: RetryConfig) {}

  async add(error: GuestCommunicationsError): Promise<void> {
    this.queue.push({
      error,
      attempts: 0,
      nextRetry: Date.now() + this.calculateDelay(0),
    });
  }

  private calculateDelay(attempt: number): number {
    let delay =
      this.config.baseDelay * Math.pow(this.config.exponentialBase, attempt);
    delay = Math.min(delay, this.config.maxDelay);

    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5); // 50-100% of calculated delay
    }

    return Math.floor(delay);
  }

  async processRetries(): Promise<void> {
    const now = Date.now();
    const readyItems = this.queue.filter((item) => item.nextRetry <= now);

    for (const item of readyItems) {
      if (item.attempts >= this.config.maxAttempts) {
        // Remove from queue - max attempts reached
        this.queue = this.queue.filter((q) => q !== item);
        console.log(
          `❌ Max retry attempts reached for error: ${item.error.code}`,
        );
        continue;
      }

      try {
        // Attempt retry logic here
        await this.retryOperation(item.error);

        // Success - remove from queue
        this.queue = this.queue.filter((q) => q !== item);
        console.log(`✅ Retry successful for error: ${item.error.code}`);
      } catch (retryError) {
        // Update retry info
        item.attempts++;
        item.nextRetry = now + this.calculateDelay(item.attempts);
        console.log(
          `🔄 Retry ${item.attempts}/${this.config.maxAttempts} failed for error: ${item.error.code}`,
        );
      }
    }
  }

  private async retryOperation(error: GuestCommunicationsError): Promise<void> {
    // Implementation would retry the original operation
    // This is a placeholder that would be replaced with actual retry logic
    throw new Error('Retry implementation needed');
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();
