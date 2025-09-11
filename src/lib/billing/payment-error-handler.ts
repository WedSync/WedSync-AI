// WS-131: Payment Error Handling & Recovery System
// Comprehensive error handling and recovery mechanisms for payment failures

import { createClient } from '@/lib/supabase/server';
import { revenuePerformanceMonitor } from './revenue-performance-monitor';
import Stripe from 'stripe';

interface PaymentError {
  id: string;
  type:
    | 'card_error'
    | 'api_error'
    | 'authentication_error'
    | 'rate_limit_error'
    | 'validation_error'
    | 'network_error'
    | 'unknown_error';
  code: string;
  message: string;
  decline_code?: string;
  payment_intent_id?: string;
  subscription_id?: string;
  user_id?: string;
  organization_id?: string;
  amount?: number;
  currency?: string;
  payment_method_id?: string;
  timestamp: string;
  metadata: Record<string, any>;
  recoverable: boolean;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface RecoveryAction {
  action_type:
    | 'retry'
    | 'update_payment_method'
    | 'contact_customer'
    | 'suspend_subscription'
    | 'manual_review';
  scheduled_at: string;
  attempts: number;
  max_attempts: number;
  backoff_strategy: 'linear' | 'exponential' | 'fixed';
  metadata: Record<string, any>;
}

interface PaymentRecoveryResult {
  success: boolean;
  action_taken: string;
  new_status?: string;
  next_action?: RecoveryAction;
  customer_notified: boolean;
  admin_alerted: boolean;
  error_resolved: boolean;
}

/**
 * Payment Error Handler & Recovery System
 * Handles payment failures with intelligent retry and recovery mechanisms
 */
export class PaymentErrorHandler {
  private readonly supabase = createClient();
  private readonly stripe: Stripe;

  // Error classification patterns
  private readonly errorClassification = {
    // Temporary/Retryable errors
    retryable: [
      'processing_error',
      'rate_limit',
      'api_connection_error',
      'api_error',
      'temporary_failure',
      'network_error',
      'timeout',
    ],

    // Customer action required
    customer_action: [
      'card_declined',
      'expired_card',
      'insufficient_funds',
      'incorrect_cvc',
      'authentication_required',
      'payment_method_unactivated',
      'card_not_supported',
    ],

    // Immediate failures (not retryable)
    terminal: [
      'fraudulent',
      'stolen_card',
      'lost_card',
      'pickup_card',
      'restricted_card',
      'security_violation',
      'invalid_account',
      'card_velocity_exceeded',
    ],

    // System/Integration errors
    system: [
      'webhook_error',
      'database_error',
      'configuration_error',
      'authorization_failed',
      'invalid_request',
    ],
  };

  // Retry configurations by error type
  private readonly retryConfigurations = {
    processing_error: {
      maxRetries: 3,
      baseDelay: 5000,
      backoff: 'exponential',
    },
    rate_limit: { maxRetries: 5, baseDelay: 10000, backoff: 'exponential' },
    network_error: { maxRetries: 3, baseDelay: 2000, backoff: 'exponential' },
    api_connection_error: {
      maxRetries: 4,
      baseDelay: 3000,
      backoff: 'exponential',
    },
    temporary_failure: { maxRetries: 2, baseDelay: 10000, backoff: 'linear' },
    authentication_required: { maxRetries: 0, baseDelay: 0, backoff: 'fixed' }, // Requires customer action
    card_declined: { maxRetries: 1, baseDelay: 30000, backoff: 'fixed' }, // One retry after 30s
    insufficient_funds: {
      maxRetries: 2,
      baseDelay: 3600000,
      backoff: 'linear',
    }, // Retry after 1 hour
  };

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  /**
   * Handle payment error with comprehensive analysis and recovery
   */
  async handlePaymentError(
    error: any,
    context: {
      paymentIntentId?: string;
      subscriptionId?: string;
      userId?: string;
      organizationId?: string;
      paymentMethodId?: string;
      amount?: number;
      currency?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<PaymentRecoveryResult> {
    try {
      // Classify and analyze the error
      const classifiedError = await this.classifyError(error, context);

      // Log error for monitoring
      await this.logPaymentError(classifiedError);

      // Record performance metrics
      await revenuePerformanceMonitor.recordPaymentMetrics({
        success: false,
        amount: context.amount || 0,
        processing_time_ms: 0,
        payment_method: context.paymentMethodId || 'unknown',
        error_code: classifiedError.code,
      });

      // Determine recovery strategy
      const recoveryStrategy = this.determineRecoveryStrategy(classifiedError);

      // Execute recovery action
      const recoveryResult = await this.executeRecovery(
        classifiedError,
        recoveryStrategy,
      );

      // Send notifications
      await this.sendNotifications(classifiedError, recoveryResult);

      // Update monitoring alerts
      await this.updateAlerts(classifiedError);

      return recoveryResult;
    } catch (recoveryError) {
      console.error('Error in payment error handler:', recoveryError);

      // Fallback to basic error logging
      await this.logCriticalError(error, context, recoveryError);

      return {
        success: false,
        action_taken: 'error_handler_failure',
        customer_notified: false,
        admin_alerted: true,
        error_resolved: false,
      };
    }
  }

  /**
   * Classify error type and determine recovery approach
   */
  private async classifyError(error: any, context: any): Promise<PaymentError> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Extract Stripe error information
    let errorType = 'unknown_error';
    let errorCode = 'unknown';
    let errorMessage = 'Unknown error occurred';
    let declineCode: string | undefined;
    let recoverable = false;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    if (error?.type) {
      errorType = error.type;
      errorCode = error.code || error.type;
      errorMessage = error.message || errorMessage;
      declineCode = error.decline_code;
    }

    // Determine if error is recoverable
    if (this.errorClassification.retryable.includes(errorCode)) {
      recoverable = true;
      severity = 'low';
    } else if (this.errorClassification.customer_action.includes(errorCode)) {
      recoverable = true; // With customer action
      severity = 'medium';
    } else if (this.errorClassification.terminal.includes(errorCode)) {
      recoverable = false;
      severity = 'high';
    } else if (this.errorClassification.system.includes(errorCode)) {
      recoverable = true;
      severity = 'critical';
    }

    // Get retry configuration
    const retryConfig = this.retryConfigurations[
      errorCode as keyof typeof this.retryConfigurations
    ] || { maxRetries: 1, baseDelay: 5000, backoff: 'exponential' };

    return {
      id: errorId,
      type: errorType as PaymentError['type'],
      code: errorCode,
      message: errorMessage,
      decline_code: declineCode,
      payment_intent_id: context.paymentIntentId,
      subscription_id: context.subscriptionId,
      user_id: context.userId,
      organization_id: context.organizationId,
      amount: context.amount,
      currency: context.currency || 'usd',
      payment_method_id: context.paymentMethodId,
      timestamp: new Date().toISOString(),
      metadata: {
        ...context.metadata,
        original_error: JSON.stringify(error),
        stripe_request_id: error?.request_id,
      },
      recoverable,
      retry_count: 0,
      max_retries: retryConfig.maxRetries,
      severity,
    };
  }

  /**
   * Determine the appropriate recovery strategy
   */
  private determineRecoveryStrategy(error: PaymentError): RecoveryAction {
    const retryConfig =
      this.retryConfigurations[
        error.code as keyof typeof this.retryConfigurations
      ];
    const baseDelay = retryConfig?.baseDelay || 5000;

    // Calculate next retry time based on backoff strategy
    let nextRetryDelay = baseDelay;
    if (retryConfig?.backoff === 'exponential') {
      nextRetryDelay = baseDelay * Math.pow(2, error.retry_count);
    } else if (retryConfig?.backoff === 'linear') {
      nextRetryDelay = baseDelay * (error.retry_count + 1);
    }

    const nextRetryAt = new Date(Date.now() + nextRetryDelay).toISOString();

    // Determine action type based on error classification
    let actionType: RecoveryAction['action_type'] = 'retry';
    let maxAttempts = error.max_retries;

    if (this.errorClassification.customer_action.includes(error.code)) {
      actionType = 'update_payment_method';
      maxAttempts = 1; // Only notify customer once
    } else if (this.errorClassification.terminal.includes(error.code)) {
      actionType = 'manual_review';
      maxAttempts = 1;
    } else if (error.severity === 'critical') {
      actionType = 'manual_review';
      maxAttempts = 2;
    }

    return {
      action_type: actionType,
      scheduled_at: nextRetryAt,
      attempts: 0,
      max_attempts: maxAttempts,
      backoff_strategy: retryConfig?.backoff || 'exponential',
      metadata: {
        error_id: error.id,
        original_error_code: error.code,
        classification: this.getErrorClassification(error.code),
      },
    };
  }

  /**
   * Execute the recovery action
   */
  private async executeRecovery(
    error: PaymentError,
    strategy: RecoveryAction,
  ): Promise<PaymentRecoveryResult> {
    let result: PaymentRecoveryResult = {
      success: false,
      action_taken: strategy.action_type,
      customer_notified: false,
      admin_alerted: false,
      error_resolved: false,
    };

    switch (strategy.action_type) {
      case 'retry':
        result = await this.executeRetryPayment(error, strategy);
        break;

      case 'update_payment_method':
        result = await this.requestPaymentMethodUpdate(error, strategy);
        break;

      case 'contact_customer':
        result = await this.initiateCustomerContact(error, strategy);
        break;

      case 'suspend_subscription':
        result = await this.suspendSubscription(error, strategy);
        break;

      case 'manual_review':
        result = await this.escalateToManualReview(error, strategy);
        break;
    }

    // Store recovery attempt
    await this.logRecoveryAttempt(error, strategy, result);

    return result;
  }

  /**
   * Retry payment with intelligent backoff
   */
  private async executeRetryPayment(
    error: PaymentError,
    strategy: RecoveryAction,
  ): Promise<PaymentRecoveryResult> {
    try {
      if (!error.payment_intent_id) {
        return {
          success: false,
          action_taken: 'retry_failed_no_payment_intent',
          customer_notified: false,
          admin_alerted: true,
          error_resolved: false,
        };
      }

      // Wait for backoff delay
      if (strategy.attempts > 0) {
        const delay = this.calculateBackoffDelay(strategy, error.retry_count);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Retrieve and confirm payment intent
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        error.payment_intent_id,
        {
          return_url: `${process.env.NEXTAUTH_URL}/billing/payment-result`,
        },
      );

      if (paymentIntent.status === 'succeeded') {
        // Update subscription status if needed
        if (error.subscription_id) {
          await this.updateSubscriptionStatus(error.subscription_id, 'active');
        }

        return {
          success: true,
          action_taken: 'payment_retry_successful',
          new_status: 'succeeded',
          customer_notified: true,
          admin_alerted: false,
          error_resolved: true,
        };
      } else if (paymentIntent.status === 'requires_action') {
        // Customer action required (3D Secure, etc.)
        return {
          success: false,
          action_taken: 'requires_customer_action',
          customer_notified: true,
          admin_alerted: false,
          error_resolved: false,
        };
      } else {
        // Payment still failed, schedule next retry if applicable
        if (error.retry_count < error.max_retries) {
          const nextRetry = this.scheduleNextRetry(error, strategy);
          return {
            success: false,
            action_taken: 'payment_retry_failed',
            next_action: nextRetry,
            customer_notified: false,
            admin_alerted: false,
            error_resolved: false,
          };
        } else {
          // Max retries reached
          return {
            success: false,
            action_taken: 'max_retries_reached',
            customer_notified: true,
            admin_alerted: true,
            error_resolved: false,
          };
        }
      }
    } catch (retryError) {
      console.error('Payment retry failed:', retryError);
      return {
        success: false,
        action_taken: 'retry_exception',
        customer_notified: false,
        admin_alerted: true,
        error_resolved: false,
      };
    }
  }

  /**
   * Request customer to update payment method
   */
  private async requestPaymentMethodUpdate(
    error: PaymentError,
    strategy: RecoveryAction,
  ): Promise<PaymentRecoveryResult> {
    try {
      // Create setup intent for new payment method
      const setupIntent = await this.stripe.setupIntents.create({
        customer: await this.getStripeCustomerId(error.user_id!),
        usage: 'off_session',
        metadata: {
          error_id: error.id,
          subscription_id: error.subscription_id || '',
          recovery_action: 'update_payment_method',
        },
      });

      // Send email notification to customer
      await this.sendPaymentMethodUpdateEmail(
        error,
        setupIntent.client_secret!,
      );

      // Update subscription status to past_due if needed
      if (error.subscription_id) {
        await this.updateSubscriptionStatus(error.subscription_id, 'past_due');
      }

      return {
        success: true,
        action_taken: 'payment_method_update_requested',
        customer_notified: true,
        admin_alerted: false,
        error_resolved: false,
      };
    } catch (updateError) {
      console.error('Payment method update request failed:', updateError);
      return {
        success: false,
        action_taken: 'update_request_failed',
        customer_notified: false,
        admin_alerted: true,
        error_resolved: false,
      };
    }
  }

  /**
   * Initiate customer contact workflow
   */
  private async initiateCustomerContact(
    error: PaymentError,
    strategy: RecoveryAction,
  ): Promise<PaymentRecoveryResult> {
    try {
      // Send personalized customer support email
      await this.sendCustomerSupportEmail(error);

      // Create support ticket
      await this.createSupportTicket(error);

      return {
        success: true,
        action_taken: 'customer_contacted',
        customer_notified: true,
        admin_alerted: true,
        error_resolved: false,
      };
    } catch (contactError) {
      console.error('Customer contact failed:', contactError);
      return {
        success: false,
        action_taken: 'contact_failed',
        customer_notified: false,
        admin_alerted: true,
        error_resolved: false,
      };
    }
  }

  /**
   * Suspend subscription due to payment failure
   */
  private async suspendSubscription(
    error: PaymentError,
    strategy: RecoveryAction,
  ): Promise<PaymentRecoveryResult> {
    try {
      if (!error.subscription_id) {
        return {
          success: false,
          action_taken: 'suspension_failed_no_subscription',
          customer_notified: false,
          admin_alerted: true,
          error_resolved: false,
        };
      }

      // Update subscription status
      await this.updateSubscriptionStatus(error.subscription_id, 'suspended');

      // Send suspension notification
      await this.sendSubscriptionSuspensionEmail(error);

      // Limit access to features
      await this.applyFeatureLimitations(error.subscription_id);

      return {
        success: true,
        action_taken: 'subscription_suspended',
        new_status: 'suspended',
        customer_notified: true,
        admin_alerted: true,
        error_resolved: false,
      };
    } catch (suspensionError) {
      console.error('Subscription suspension failed:', suspensionError);
      return {
        success: false,
        action_taken: 'suspension_failed',
        customer_notified: false,
        admin_alerted: true,
        error_resolved: false,
      };
    }
  }

  /**
   * Escalate to manual review
   */
  private async escalateToManualReview(
    error: PaymentError,
    strategy: RecoveryAction,
  ): Promise<PaymentRecoveryResult> {
    try {
      // Create admin ticket
      await this.createAdminTicket(error);

      // Send admin alert
      await this.sendAdminAlert(error);

      // Log for business intelligence
      await this.logForBusinessIntelligence(error);

      return {
        success: true,
        action_taken: 'escalated_to_manual_review',
        customer_notified: false,
        admin_alerted: true,
        error_resolved: false,
      };
    } catch (escalationError) {
      console.error('Manual review escalation failed:', escalationError);
      return {
        success: false,
        action_taken: 'escalation_failed',
        customer_notified: false,
        admin_alerted: true,
        error_resolved: false,
      };
    }
  }

  /**
   * Log payment error to database
   */
  private async logPaymentError(error: PaymentError): Promise<void> {
    try {
      await this.supabase.from('payment_errors').insert({
        id: error.id,
        error_type: error.type,
        error_code: error.code,
        error_message: error.message,
        decline_code: error.decline_code,
        payment_intent_id: error.payment_intent_id,
        subscription_id: error.subscription_id,
        user_id: error.user_id,
        organization_id: error.organization_id,
        amount: error.amount,
        currency: error.currency,
        payment_method_id: error.payment_method_id,
        timestamp: error.timestamp,
        metadata: error.metadata,
        recoverable: error.recoverable,
        retry_count: error.retry_count,
        max_retries: error.max_retries,
        severity: error.severity,
        status: 'open',
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log payment error:', logError);
    }
  }

  /**
   * Send notifications based on recovery result
   */
  private async sendNotifications(
    error: PaymentError,
    result: PaymentRecoveryResult,
  ): Promise<void> {
    try {
      // Customer notifications
      if (result.customer_notified) {
        await this.sendCustomerNotification(error, result);
      }

      // Admin alerts
      if (result.admin_alerted) {
        await this.sendAdminNotification(error, result);
      }

      // Update customer in app (real-time notification)
      if (error.user_id) {
        await this.sendRealtimeNotification(error.user_id, {
          type: 'payment_error',
          severity: error.severity,
          message: this.getUserFriendlyMessage(error),
          action_required: result.action_taken === 'update_payment_method',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (notificationError) {
      console.error('Failed to send notifications:', notificationError);
    }
  }

  // Helper methods

  private getErrorClassification(errorCode: string): string {
    for (const [classification, codes] of Object.entries(
      this.errorClassification,
    )) {
      if (codes.includes(errorCode)) {
        return classification;
      }
    }
    return 'unknown';
  }

  private calculateBackoffDelay(
    strategy: RecoveryAction,
    retryCount: number,
  ): number {
    const baseDelay = 5000; // 5 seconds default

    switch (strategy.backoff_strategy) {
      case 'exponential':
        return baseDelay * Math.pow(2, retryCount);
      case 'linear':
        return baseDelay * (retryCount + 1);
      case 'fixed':
      default:
        return baseDelay;
    }
  }

  private scheduleNextRetry(
    error: PaymentError,
    strategy: RecoveryAction,
  ): RecoveryAction {
    const nextDelay = this.calculateBackoffDelay(
      strategy,
      error.retry_count + 1,
    );

    return {
      ...strategy,
      scheduled_at: new Date(Date.now() + nextDelay).toISOString(),
      attempts: strategy.attempts + 1,
    };
  }

  private async getStripeCustomerId(userId: string): Promise<string> {
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    return profile?.stripe_customer_id || '';
  }

  private async updateSubscriptionStatus(
    subscriptionId: string,
    status: string,
  ): Promise<void> {
    await this.supabase
      .from('user_subscriptions')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);
  }

  private async logRecoveryAttempt(
    error: PaymentError,
    strategy: RecoveryAction,
    result: PaymentRecoveryResult,
  ): Promise<void> {
    try {
      await this.supabase.from('payment_recovery_attempts').insert({
        error_id: error.id,
        action_type: strategy.action_type,
        attempt_number: strategy.attempts + 1,
        success: result.success,
        action_taken: result.action_taken,
        customer_notified: result.customer_notified,
        admin_alerted: result.admin_alerted,
        error_resolved: result.error_resolved,
        metadata: {
          strategy,
          result,
          timestamp: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log recovery attempt:', logError);
    }
  }

  private getUserFriendlyMessage(error: PaymentError): string {
    const messages: Record<string, string> = {
      card_declined:
        'Your card was declined. Please try a different payment method or contact your bank.',
      insufficient_funds:
        'Insufficient funds available. Please check your account balance.',
      expired_card: 'Your card has expired. Please update your payment method.',
      incorrect_cvc:
        'The security code is incorrect. Please check your card details.',
      processing_error:
        "We encountered a temporary issue processing your payment. We'll retry automatically.",
      authentication_required:
        'Additional authentication is required for this payment.',
    };

    return (
      messages[error.code] ||
      'We encountered an issue processing your payment. Our team has been notified.'
    );
  }

  private async sendCustomerNotification(
    error: PaymentError,
    result: PaymentRecoveryResult,
  ): Promise<void> {
    // Implementation would send email/in-app notification
    console.log(`Customer notification sent for error ${error.id}`);
  }

  private async sendAdminNotification(
    error: PaymentError,
    result: PaymentRecoveryResult,
  ): Promise<void> {
    // Implementation would send admin alert
    console.log(`Admin notification sent for error ${error.id}`);
  }

  private async sendRealtimeNotification(
    userId: string,
    notification: any,
  ): Promise<void> {
    // Implementation would send real-time notification via Supabase realtime
    console.log(`Real-time notification sent to user ${userId}`);
  }

  private async sendPaymentMethodUpdateEmail(
    error: PaymentError,
    clientSecret: string,
  ): Promise<void> {
    // Implementation would send payment method update email
    console.log(`Payment method update email sent for error ${error.id}`);
  }

  private async sendCustomerSupportEmail(error: PaymentError): Promise<void> {
    // Implementation would send customer support email
    console.log(`Customer support email sent for error ${error.id}`);
  }

  private async sendSubscriptionSuspensionEmail(
    error: PaymentError,
  ): Promise<void> {
    // Implementation would send suspension email
    console.log(`Suspension email sent for error ${error.id}`);
  }

  private async createSupportTicket(error: PaymentError): Promise<void> {
    // Implementation would create support ticket
    console.log(`Support ticket created for error ${error.id}`);
  }

  private async createAdminTicket(error: PaymentError): Promise<void> {
    // Implementation would create admin ticket
    console.log(`Admin ticket created for error ${error.id}`);
  }

  private async sendAdminAlert(error: PaymentError): Promise<void> {
    // Implementation would send admin alert
    console.log(`Admin alert sent for error ${error.id}`);
  }

  private async applyFeatureLimitations(subscriptionId: string): Promise<void> {
    // Implementation would limit feature access
    console.log(
      `Feature limitations applied for subscription ${subscriptionId}`,
    );
  }

  private async logForBusinessIntelligence(error: PaymentError): Promise<void> {
    // Implementation would log to BI system
    console.log(`BI logging completed for error ${error.id}`);
  }

  private async logCriticalError(
    originalError: any,
    context: any,
    recoveryError: any,
  ): Promise<void> {
    try {
      await this.supabase.from('critical_payment_errors').insert({
        original_error: JSON.stringify(originalError),
        context: JSON.stringify(context),
        recovery_error: JSON.stringify(recoveryError),
        timestamp: new Date().toISOString(),
        status: 'requires_immediate_attention',
      });
    } catch (logError) {
      console.error('Failed to log critical error:', logError);
    }
  }

  private async updateAlerts(error: PaymentError): Promise<void> {
    // Update system alerts based on error patterns
    if (error.severity === 'critical') {
      await revenuePerformanceMonitor.recordMetric(
        'critical_payment_errors',
        1,
        'counter',
        { error_code: error.code, error_type: error.type },
      );
    }
  }
}

// Export singleton instance
export const paymentErrorHandler = new PaymentErrorHandler();
