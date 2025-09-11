// WS-198 Team C Integration Architect - Webhook Error Handler
// Comprehensive webhook error handling with dead letter queue management

import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';

// Types and interfaces for webhook error handling
export interface WebhookError extends Error {
  webhookId?: string;
  source?: string;
  payload?: any;
  signature?: string;
  timestamp?: number;
}

export interface WebhookContext {
  webhookId: string;
  source: string; // 'stripe', 'vendor_system', 'booking_platform', etc.
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  retryCount?: number;
  maxRetries?: number;
  metadata?: {
    wedding_id?: string;
    wedding_date?: string;
    vendor_type?: string;
    booking_id?: string;
    payment_intent_id?: string;
    criticality_level?: 'low' | 'medium' | 'high' | 'wedding_day_critical';
  };
  originalTimestamp: string;
  lastAttemptTimestamp?: string;
}

export interface WebhookErrorType {
  type:
    | 'signature_verification_failed'
    | 'processing_timeout'
    | 'invalid_payload'
    | 'unknown_error'
    | 'rate_limited'
    | 'service_unavailable';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  reason: string;
  suggestedAction?: string;
}

export interface WebhookRetryStrategy {
  shouldRetry: boolean;
  maxRetries: number;
  delaySeconds: number;
  exponentialBackoff: boolean;
  reason: string;
}

export interface WebhookErrorResult {
  errorId: string;
  handled: boolean;
  retryScheduled: boolean;
  retryAfterSeconds?: number;
  maxRetries?: number;
  sentToDeadLetterQueue?: boolean;
  requiresManualIntervention?: boolean;
  error?: string;
  weddingImpact?: {
    affectsWedding: boolean;
    weddingId?: string;
    weddingDate?: string;
    impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
    businessImpact: string;
  };
}

export class WebhookErrorHandler {
  private redis: Redis;
  private supabase;
  private deadLetterQueue = 'webhook_dlq';
  private retryQueue = 'webhook_retry_queue';

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    this.initializeRetryProcessor();
  }

  async handleWebhookError(
    webhookPayload: any,
    error: WebhookError,
    context: WebhookContext,
  ): Promise<WebhookErrorResult> {
    const errorId = `webhook_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Classify webhook error based on error characteristics and context
      const errorType = this.classifyWebhookError(error, context);

      // Determine retry strategy based on error type, source, and wedding context
      const retryStrategy = this.determineWebhookRetryStrategy(
        errorType,
        context,
      );

      // Log webhook error with comprehensive context
      await this.logWebhookError(
        error,
        context,
        errorType,
        webhookPayload,
        errorId,
      );

      // Assess wedding impact
      const weddingImpact = this.assessWeddingImpact(error, context);

      if (retryStrategy.shouldRetry) {
        // Schedule webhook retry with appropriate delay
        await this.scheduleWebhookRetry(
          webhookPayload,
          context,
          retryStrategy,
          errorId,
        );

        // Send alerts if wedding-critical or high-severity error
        if (weddingImpact.affectsWedding || errorType.severity === 'critical') {
          await this.alertWebhookFailure(
            error,
            context,
            errorId,
            'retry_scheduled',
          );
        }

        return {
          errorId,
          handled: true,
          retryScheduled: true,
          retryAfterSeconds: retryStrategy.delaySeconds,
          maxRetries: retryStrategy.maxRetries,
          weddingImpact,
        };
      } else {
        // Send to dead letter queue for manual intervention
        await this.sendToDeadLetterQueue(
          webhookPayload,
          error,
          context,
          errorId,
          errorType,
        );

        // Alert operations team for immediate intervention
        await this.alertWebhookFailure(
          error,
          context,
          errorId,
          'dead_letter_queue',
        );

        return {
          errorId,
          handled: true,
          retryScheduled: false,
          sentToDeadLetterQueue: true,
          requiresManualIntervention: true,
          weddingImpact,
        };
      }
    } catch (handlingError) {
      console.error('Webhook error handling failed:', handlingError);

      // Log handler failure
      await this.logHandlerFailure(error, context, handlingError, errorId);

      return {
        errorId,
        handled: false,
        retryScheduled: false,
        error:
          handlingError instanceof Error
            ? handlingError.message
            : String(handlingError),
        weddingImpact: this.assessWeddingImpact(error, context),
      };
    }
  }

  private classifyWebhookError(
    error: WebhookError,
    context: WebhookContext,
  ): WebhookErrorType {
    const errorMessage = error.message.toLowerCase();

    // Signature verification failures
    if (
      errorMessage.includes('signature') ||
      errorMessage.includes('verification') ||
      errorMessage.includes('unauthorized')
    ) {
      return {
        type: 'signature_verification_failed',
        severity: context.source === 'stripe' ? 'critical' : 'high',
        retryable: false,
        reason: 'Webhook signature verification failed',
        suggestedAction:
          'Verify webhook endpoint configuration and signature keys',
      };
    }

    // Processing timeout failures
    if (errorMessage.includes('timeout') || errorMessage.includes('time out')) {
      return {
        type: 'processing_timeout',
        severity: this.isWeddingCritical(context) ? 'high' : 'medium',
        retryable: true,
        reason: 'Webhook processing timeout',
        suggestedAction:
          'Investigate processing delays and optimize webhook handler',
      };
    }

    // Invalid or malformed payload
    if (
      errorMessage.includes('malformed') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('parse') ||
      errorMessage.includes('json')
    ) {
      return {
        type: 'invalid_payload',
        severity: 'medium',
        retryable: false,
        reason: 'Webhook payload is malformed or invalid',
        suggestedAction:
          'Review webhook payload structure and validation logic',
      };
    }

    // Rate limiting
    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests')
    ) {
      return {
        type: 'rate_limited',
        severity: 'low',
        retryable: true,
        reason: 'Webhook processing rate limited',
        suggestedAction: 'Implement rate limiting and backoff strategies',
      };
    }

    // Service unavailable
    if (
      errorMessage.includes('service unavailable') ||
      errorMessage.includes('server error') ||
      errorMessage.includes('503') ||
      errorMessage.includes('502')
    ) {
      return {
        type: 'service_unavailable',
        severity: this.isWeddingCritical(context) ? 'critical' : 'high',
        retryable: true,
        reason: 'Webhook processing service unavailable',
        suggestedAction:
          'Check service health and implement fallback mechanisms',
      };
    }

    // Unknown error - default classification
    return {
      type: 'unknown_error',
      severity: this.isWeddingCritical(context) ? 'high' : 'medium',
      retryable: true,
      reason: 'Unknown webhook processing error',
      suggestedAction:
        'Investigate error logs and implement specific error handling',
    };
  }

  private determineWebhookRetryStrategy(
    errorType: WebhookErrorType,
    context: WebhookContext,
  ): WebhookRetryStrategy {
    // Wedding-critical webhooks get more aggressive retry strategies
    const isWeddingCritical = this.isWeddingCritical(context);
    const isNearWeddingDate =
      context.metadata?.wedding_date &&
      this.isNearWeddingDate(context.metadata.wedding_date);

    // Base retry strategies for different error types
    const baseStrategies = {
      signature_verification_failed: {
        shouldRetry: false,
        maxRetries: 0,
        baseDelay: 0,
      },
      invalid_payload: { shouldRetry: false, maxRetries: 0, baseDelay: 0 },
      processing_timeout: { shouldRetry: true, maxRetries: 5, baseDelay: 30 },
      rate_limited: { shouldRetry: true, maxRetries: 8, baseDelay: 120 },
      service_unavailable: { shouldRetry: true, maxRetries: 6, baseDelay: 60 },
      unknown_error: { shouldRetry: true, maxRetries: 3, baseDelay: 60 },
    };

    const baseStrategy = baseStrategies[errorType.type] || {
      shouldRetry: false,
      maxRetries: 0,
      baseDelay: 0,
    };

    // Enhance strategy for wedding-critical operations
    if (isWeddingCritical || isNearWeddingDate) {
      return {
        shouldRetry: baseStrategy.shouldRetry,
        maxRetries: Math.max(
          baseStrategy.maxRetries,
          isWeddingCritical ? 10 : 8,
        ),
        delaySeconds: Math.min(baseStrategy.baseDelay, 30), // Faster retry for critical operations
        exponentialBackoff: true,
        reason: `Enhanced retry for ${isWeddingCritical ? 'wedding-critical' : 'near-wedding-date'} operation`,
      };
    }

    // Payment-related webhooks get enhanced retry
    if (context.source === 'stripe' || context.metadata?.payment_intent_id) {
      return {
        shouldRetry: baseStrategy.shouldRetry,
        maxRetries: Math.max(baseStrategy.maxRetries, 8),
        delaySeconds: baseStrategy.baseDelay,
        exponentialBackoff: true,
        reason: 'Enhanced retry for payment-related webhook',
      };
    }

    // Standard retry strategy
    return {
      shouldRetry: baseStrategy.shouldRetry,
      maxRetries: baseStrategy.maxRetries,
      delaySeconds: baseStrategy.baseDelay,
      exponentialBackoff: true,
      reason: `Standard ${errorType.type} retry strategy`,
    };
  }

  private isWeddingCritical(context: WebhookContext): boolean {
    return (
      context.metadata?.criticality_level === 'wedding_day_critical' ||
      (context.source === 'payment_processor' &&
        context.metadata?.wedding_id) ||
      context.source === 'vendor_booking_system' ||
      (context.metadata?.wedding_date &&
        this.isWeddingToday(context.metadata.wedding_date))
    );
  }

  private isNearWeddingDate(weddingDate: string): boolean {
    const wedding = new Date(weddingDate);
    const now = new Date();
    const daysDifference = Math.abs(
      (wedding.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysDifference <= 7; // Within a week of the wedding
  }

  private isWeddingToday(weddingDate: string): boolean {
    const wedding = new Date(weddingDate);
    const today = new Date();
    return wedding.toDateString() === today.toDateString();
  }

  private assessWeddingImpact(
    error: WebhookError,
    context: WebhookContext,
  ): WebhookErrorResult['weddingImpact'] {
    const hasWeddingContext = !!context.metadata?.wedding_id;
    const isWeddingCritical = this.isWeddingCritical(context);
    const isNearWeddingDate =
      context.metadata?.wedding_date &&
      this.isNearWeddingDate(context.metadata.wedding_date);

    if (!hasWeddingContext) {
      return {
        affectsWedding: false,
        impactLevel: 'none',
        businessImpact: 'No wedding impact - general system webhook',
      };
    }

    let impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'low';
    let businessImpact = '';

    if (isWeddingCritical) {
      impactLevel = 'critical';
      businessImpact =
        'Critical wedding operation affected - immediate intervention required';
    } else if (context.source === 'stripe') {
      impactLevel = 'high';
      businessImpact =
        'Payment processing affected for wedding - may impact vendor payments';
    } else if (isNearWeddingDate) {
      impactLevel = 'medium';
      businessImpact =
        'Wedding within 7 days - vendor coordination may be affected';
    } else {
      impactLevel = 'low';
      businessImpact =
        'Wedding coordination webhook failed - retry mechanisms in place';
    }

    return {
      affectsWedding: true,
      weddingId: context.metadata?.wedding_id,
      weddingDate: context.metadata?.wedding_date,
      impactLevel,
      businessImpact,
    };
  }

  private async scheduleWebhookRetry(
    webhookPayload: any,
    context: WebhookContext,
    retryStrategy: WebhookRetryStrategy,
    errorId: string,
  ): Promise<void> {
    const retryAttempt = (context.retryCount || 0) + 1;
    const delay = retryStrategy.exponentialBackoff
      ? Math.min(
          3600,
          retryStrategy.delaySeconds * Math.pow(2, retryAttempt - 1),
        )
      : retryStrategy.delaySeconds;

    const scheduledFor = new Date(Date.now() + delay * 1000);

    try {
      // Store retry in database
      const { data: retryRecord } = await this.supabase
        .from('webhook_retry_queue')
        .insert({
          webhook_failure_id: errorId,
          webhook_payload: webhookPayload,
          retry_attempt: retryAttempt,
          scheduled_for: scheduledFor.toISOString(),
          metadata: {
            context,
            retryStrategy,
            originalError: errorId,
          },
        })
        .select('id')
        .single();

      // Store in Redis for processing
      const retryKey = `${this.retryQueue}:${errorId}:${retryAttempt}`;
      const retryData = {
        retryRecordId: retryRecord?.id,
        webhookPayload,
        context: {
          ...context,
          retryCount: retryAttempt,
        },
        retryStrategy,
        scheduledFor: scheduledFor.toISOString(),
        errorId,
      };

      await this.redis.zadd(
        this.retryQueue,
        scheduledFor.getTime(),
        JSON.stringify({ key: retryKey, data: retryData }),
      );

      console.log(
        `Webhook retry scheduled for ${context.source}:${context.webhookId} in ${delay} seconds (attempt ${retryAttempt})`,
      );
    } catch (retryError) {
      console.error('Failed to schedule webhook retry:', retryError);
      throw retryError;
    }
  }

  private async sendToDeadLetterQueue(
    webhookPayload: any,
    error: WebhookError,
    context: WebhookContext,
    errorId: string,
    errorType: WebhookErrorType,
  ): Promise<void> {
    const dlqMessage = {
      errorId,
      timestamp: new Date().toISOString(),
      webhookPayload,
      error: {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name,
        classification: errorType,
      },
      context,
      requiresManualIntervention: true,
      retryCount: context.retryCount || 0,
      weddingImpact: this.assessWeddingImpact(error, context),
      suggestedActions: [
        errorType.suggestedAction || 'Investigate webhook processing pipeline',
        'Check service health and dependencies',
        'Verify webhook configuration and credentials',
        'Review error logs for patterns',
      ].filter(Boolean),
    };

    try {
      // Store in database dead letter queue
      await this.supabase.from('webhook_dead_letter_queue').insert({
        webhook_failure_id: errorId,
        webhook_payload: webhookPayload,
        original_error: error.message,
        total_retry_attempts: context.retryCount || 0,
        last_attempt_at: new Date().toISOString(),
        requires_manual_intervention: true,
        metadata: dlqMessage,
      });

      // Store in Redis for immediate processing queue
      await this.redis.lpush(this.deadLetterQueue, JSON.stringify(dlqMessage));

      console.log(
        `Webhook sent to dead letter queue: ${context.source}:${context.webhookId}`,
      );
    } catch (dlqError) {
      console.error('Failed to send webhook to dead letter queue:', dlqError);
      throw dlqError;
    }
  }

  private async logWebhookError(
    error: WebhookError,
    context: WebhookContext,
    errorType: WebhookErrorType,
    webhookPayload: any,
    errorId: string,
  ): Promise<void> {
    try {
      await this.supabase.from('webhook_failures').insert({
        id: errorId,
        webhook_id: context.webhookId,
        source: context.source,
        webhook_payload: webhookPayload,
        error_type: errorType.type,
        error_message: error.message,
        error_severity: errorType.severity,
        retry_count: context.retryCount || 0,
        max_retries: context.maxRetries || 0,
        wedding_context: context.metadata,
        metadata: {
          context,
          errorType,
          errorStack: error.stack,
          headers: context.headers,
        },
      });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }
  }

  private async logHandlerFailure(
    originalError: WebhookError,
    context: WebhookContext,
    handlingError: unknown,
    errorId: string,
  ): Promise<void> {
    try {
      await this.supabase.from('webhook_failures').insert({
        id: `${errorId}_handler_failure`,
        webhook_id: context.webhookId,
        source: 'webhook_error_handler',
        webhook_payload: { originalError: originalError.message },
        error_type: 'unknown_error',
        error_message: `Webhook error handler failed: ${handlingError instanceof Error ? handlingError.message : String(handlingError)}`,
        error_severity: 'critical',
        retry_count: 0,
        wedding_context: context.metadata,
        metadata: {
          originalError: originalError.message,
          context,
          handlerError:
            handlingError instanceof Error
              ? handlingError.stack
              : String(handlingError),
        },
      });
    } catch (logError) {
      console.error('Failed to log handler failure:', logError);
    }
  }

  private async alertWebhookFailure(
    error: WebhookError,
    context: WebhookContext,
    errorId: string,
    action: 'retry_scheduled' | 'dead_letter_queue',
  ): Promise<void> {
    const weddingImpact = this.assessWeddingImpact(error, context);
    const severity =
      weddingImpact.impactLevel === 'critical'
        ? 'critical'
        : weddingImpact.impactLevel === 'high'
          ? 'high'
          : weddingImpact.affectsWedding
            ? 'medium'
            : 'low';

    const alertTitle =
      action === 'dead_letter_queue'
        ? `Webhook Failed - Manual Intervention Required`
        : `Webhook Error - Retry Scheduled`;

    const alertDescription = `Webhook ${context.source}:${context.webhookId} failed. ${weddingImpact.businessImpact}`;

    try {
      await this.supabase.from('integration_alerts').insert({
        alert_type: 'webhook_failure',
        service_name: context.source,
        severity,
        title: alertTitle,
        description: alertDescription,
        alert_data: {
          errorId,
          webhookId: context.webhookId,
          source: context.source,
          action,
          weddingImpact,
          error: error.message,
        },
        wedding_impact: weddingImpact.affectsWedding,
        wedding_date: context.metadata?.wedding_date,
        escalated: weddingImpact.impactLevel === 'critical',
      });

      console.log(`Alert sent for webhook failure: ${errorId} (${severity})`);
    } catch (alertError) {
      console.error('Failed to send webhook failure alert:', alertError);
    }
  }

  private initializeRetryProcessor(): void {
    // Process webhook retries every 30 seconds
    setInterval(async () => {
      try {
        await this.processWebhookRetries();
      } catch (error) {
        console.error('Webhook retry processing failed:', error);
      }
    }, 30000);

    console.log('Webhook retry processor initialized');
  }

  private async processWebhookRetries(): Promise<void> {
    const now = Date.now();

    try {
      // Get retries that are due for processing
      const dueRetries = await this.redis.zrangebyscore(
        this.retryQueue,
        0,
        now,
        'WITHSCORES',
        'LIMIT',
        0,
        10, // Process up to 10 retries at a time
      );

      if (dueRetries.length === 0) return;

      // Process each due retry
      for (let i = 0; i < dueRetries.length; i += 2) {
        const retryData = JSON.parse(dueRetries[i]);
        const score = dueRetries[i + 1];

        try {
          await this.executeWebhookRetry(retryData.data);

          // Remove from retry queue
          await this.redis.zrem(this.retryQueue, dueRetries[i]);
        } catch (retryError) {
          console.error('Webhook retry execution failed:', retryError);

          // Check if we should schedule another retry or send to DLQ
          await this.handleRetryFailure(retryData.data, retryError);

          // Remove from retry queue
          await this.redis.zrem(this.retryQueue, dueRetries[i]);
        }
      }
    } catch (processingError) {
      console.error('Webhook retry processing error:', processingError);
    }
  }

  private async executeWebhookRetry(retryData: any): Promise<void> {
    const { webhookPayload, context, errorId } = retryData;

    try {
      // Update retry record as processing
      if (retryData.retryRecordId) {
        await this.supabase
          .from('webhook_retry_queue')
          .update({
            processing_started_at: new Date().toISOString(),
          })
          .eq('id', retryData.retryRecordId);
      }

      // Here you would implement the actual webhook retry logic
      // This would typically involve re-calling the original webhook handler
      const result = await this.callWebhookHandler(context, webhookPayload);

      // Update retry record as successful
      if (retryData.retryRecordId) {
        await this.supabase
          .from('webhook_retry_queue')
          .update({
            processing_completed_at: new Date().toISOString(),
            processing_result: 'success',
          })
          .eq('id', retryData.retryRecordId);
      }

      console.log(
        `Webhook retry successful: ${context.source}:${context.webhookId}`,
      );
    } catch (retryError) {
      // Update retry record as failed
      if (retryData.retryRecordId) {
        await this.supabase
          .from('webhook_retry_queue')
          .update({
            processing_completed_at: new Date().toISOString(),
            processing_result: 'failed',
          })
          .eq('id', retryData.retryRecordId);
      }

      throw retryError;
    }
  }

  private async callWebhookHandler(
    context: WebhookContext,
    payload: any,
  ): Promise<any> {
    // Placeholder for actual webhook handler implementation
    // This would route to the appropriate webhook handler based on context.source
    console.log(`Retrying webhook: ${context.source}:${context.webhookId}`);

    // Simulate webhook processing (in real implementation, this would call the actual handler)
    if (Math.random() > 0.7) {
      // 30% failure rate for testing
      throw new Error('Simulated webhook processing failure');
    }

    return { success: true, timestamp: new Date().toISOString() };
  }

  private async handleRetryFailure(
    retryData: any,
    retryError: unknown,
  ): Promise<void> {
    const { context, retryStrategy } = retryData;

    // Check if we've exceeded max retries
    if (context.retryCount >= retryStrategy.maxRetries) {
      // Send to dead letter queue
      await this.sendToDeadLetterQueue(
        retryData.webhookPayload,
        new Error(
          retryError instanceof Error ? retryError.message : String(retryError),
        ),
        context,
        retryData.errorId,
        {
          type: 'unknown_error',
          severity: 'medium',
          retryable: false,
          reason: 'Max retries exceeded',
        },
      );
    } else {
      // Schedule another retry
      await this.scheduleWebhookRetry(
        retryData.webhookPayload,
        context,
        retryStrategy,
        retryData.errorId,
      );
    }
  }

  // Public methods for manual intervention and monitoring
  async getDeadLetterQueueItems(limit: number = 50): Promise<any[]> {
    const items = await this.redis.lrange(this.deadLetterQueue, 0, limit - 1);
    return items.map((item) => JSON.parse(item));
  }

  async reprocessDeadLetterItem(errorId: string): Promise<boolean> {
    try {
      const items = await this.getDeadLetterQueueItems(1000);
      const item = items.find((i) => i.errorId === errorId);

      if (!item) {
        console.log(`Dead letter item not found: ${errorId}`);
        return false;
      }

      // Remove from dead letter queue
      await this.redis.lrem(this.deadLetterQueue, 1, JSON.stringify(item));

      // Re-schedule for retry
      await this.scheduleWebhookRetry(
        item.webhookPayload,
        item.context,
        {
          shouldRetry: true,
          maxRetries: 3,
          delaySeconds: 30,
          exponentialBackoff: true,
          reason: 'Manual reprocessing',
        },
        errorId,
      );

      console.log(`Dead letter item reprocessed: ${errorId}`);
      return true;
    } catch (error) {
      console.error(`Failed to reprocess dead letter item ${errorId}:`, error);
      return false;
    }
  }

  async getRetryQueueStatus(): Promise<{
    queueLength: number;
    nextRetryTime?: Date;
    overdueCount: number;
  }> {
    try {
      const queueLength = await this.redis.zcard(this.retryQueue);
      const now = Date.now();
      const overdueCount = await this.redis.zcount(this.retryQueue, 0, now);

      let nextRetryTime;
      const nextRetry = await this.redis.zrange(
        this.retryQueue,
        0,
        0,
        'WITHSCORES',
      );
      if (nextRetry.length > 0) {
        nextRetryTime = new Date(parseInt(nextRetry[1]));
      }

      return {
        queueLength,
        nextRetryTime,
        overdueCount,
      };
    } catch (error) {
      console.error('Failed to get retry queue status:', error);
      return { queueLength: 0, overdueCount: 0 };
    }
  }
}
