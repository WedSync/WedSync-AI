import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { emailServiceConnector } from './email-connector';
import { smsServiceConnector } from './sms-connector';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * WS-155: Failed Message Handler Service
 * Intelligent retry logic and failure notifications for failed communications
 */

export interface FailedMessage {
  id: string;
  message_id: string;
  recipient: string;
  failure_type: 'email' | 'sms';
  provider: string;
  failure_reason: string;
  error_code?: string;
  failed_at: Date;
  guest_id?: string;
  couple_id?: string;
  journey_id?: string;
  instance_id?: string;
  retry_count: number;
  max_retries: number;
  should_retry: boolean;
  next_retry_at?: Date;
  retry_strategy: 'immediate' | 'exponential_backoff' | 'scheduled' | 'manual';
  original_message_data: any;
  final_failure: boolean;
}

export interface RetryResult {
  success: boolean;
  new_message_id?: string;
  error_message?: string;
  should_retry_again: boolean;
  next_retry_at?: Date;
}

export interface FailureNotification {
  couple_id: string;
  guest_id?: string;
  failure_type:
    | 'single_message'
    | 'batch_failure'
    | 'provider_outage'
    | 'quota_exceeded';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  failed_messages_count: number;
  suggested_actions: string[];
  timestamp: Date;
}

export class FailedMessageHandler {
  private static instance: FailedMessageHandler;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly BASE_RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_RETRY_DELAY_MS = 4 * 60 * 60 * 1000; // 4 hours

  static getInstance(): FailedMessageHandler {
    if (!FailedMessageHandler.instance) {
      FailedMessageHandler.instance = new FailedMessageHandler();
    }
    return FailedMessageHandler.instance;
  }

  /**
   * Process a failed message and determine retry strategy
   */
  async handleFailedMessage(failureData: {
    message_id: string;
    recipient: string;
    failure_type: 'email' | 'sms';
    provider: string;
    failure_reason: string;
    error_code?: string;
    guest_id?: string;
    couple_id?: string;
    journey_id?: string;
    instance_id?: string;
    original_message_data: any;
  }): Promise<void> {
    try {
      // Determine retry strategy based on failure type
      const retryStrategy = this.determineRetryStrategy(
        failureData.failure_reason,
        failureData.error_code,
        failureData.provider,
      );

      const shouldRetry = this.shouldRetryMessage(
        failureData.failure_reason,
        failureData.error_code,
        failureData.failure_type,
      );

      const nextRetryAt = shouldRetry
        ? this.calculateNextRetryTime(0, retryStrategy)
        : null;

      // Store failed message
      const failedMessage: Omit<FailedMessage, 'id'> = {
        message_id: failureData.message_id,
        recipient: failureData.recipient,
        failure_type: failureData.failure_type,
        provider: failureData.provider,
        failure_reason: failureData.failure_reason,
        error_code: failureData.error_code,
        failed_at: new Date(),
        guest_id: failureData.guest_id,
        couple_id: failureData.couple_id,
        journey_id: failureData.journey_id,
        instance_id: failureData.instance_id,
        retry_count: 0,
        max_retries: this.MAX_RETRY_ATTEMPTS,
        should_retry: shouldRetry,
        next_retry_at: nextRetryAt,
        retry_strategy: retryStrategy,
        original_message_data: failureData.original_message_data,
        final_failure: !shouldRetry,
      };

      const { data, error } = await supabase
        .from('failed_messages')
        .insert(failedMessage)
        .select()
        .single();

      if (error) {
        console.error('Error storing failed message:', error);
        return;
      }

      // Send failure notification if critical
      if (
        this.isCriticalFailure(
          failureData.failure_reason,
          failureData.error_code,
        )
      ) {
        await this.sendFailureNotification(failedMessage);
      }

      // Schedule retry if applicable
      if (shouldRetry && nextRetryAt) {
        await this.scheduleRetry(data.id, nextRetryAt);
      }
    } catch (error) {
      console.error('Error handling failed message:', error);
    }
  }

  /**
   * Process retry queue and attempt to resend failed messages
   */
  async processRetryQueue(): Promise<void> {
    try {
      // Get messages ready for retry
      const { data: failedMessages, error } = await supabase
        .from('failed_messages')
        .select('*')
        .eq('should_retry', true)
        .eq('final_failure', false)
        .lte('next_retry_at', new Date().toISOString())
        .lt('retry_count', this.MAX_RETRY_ATTEMPTS)
        .order('next_retry_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching retry queue:', error);
        return;
      }

      if (!failedMessages || failedMessages.length === 0) {
        return;
      }

      console.log(
        `Processing ${failedMessages.length} failed messages for retry`,
      );

      // Process each failed message
      for (const failedMessage of failedMessages) {
        await this.retryFailedMessage(failedMessage);

        // Add delay between retries to avoid overwhelming providers
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error processing retry queue:', error);
    }
  }

  /**
   * Retry a specific failed message
   */
  async retryFailedMessage(failedMessage: FailedMessage): Promise<RetryResult> {
    try {
      console.log(
        `Retrying ${failedMessage.failure_type} message ${failedMessage.message_id} (attempt ${failedMessage.retry_count + 1})`,
      );

      let retryResult: RetryResult;

      // Attempt to resend the message
      if (failedMessage.failure_type === 'email') {
        retryResult = await this.retryEmail(failedMessage);
      } else {
        retryResult = await this.retrySMS(failedMessage);
      }

      // Update failed message record
      await this.updateFailedMessageRecord(failedMessage, retryResult);

      return retryResult;
    } catch (error) {
      console.error(
        `Error retrying message ${failedMessage.message_id}:`,
        error,
      );

      const result: RetryResult = {
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        should_retry_again:
          failedMessage.retry_count < this.MAX_RETRY_ATTEMPTS - 1,
        next_retry_at: this.calculateNextRetryTime(
          failedMessage.retry_count + 1,
          failedMessage.retry_strategy,
        ),
      };

      await this.updateFailedMessageRecord(failedMessage, result);
      return result;
    }
  }

  /**
   * Retry failed email message
   */
  private async retryEmail(failedMessage: FailedMessage): Promise<RetryResult> {
    try {
      const messageData = failedMessage.original_message_data;

      // Use email connector to resend
      const result = await emailServiceConnector.sendEmail({
        to: failedMessage.recipient,
        subject: messageData.subject,
        html: messageData.html || messageData.body,
        text: messageData.text,
        from: messageData.from,
        template_id: messageData.template_id,
        template_variables: messageData.template_variables,
      });

      if (result.success && result.message_id) {
        return {
          success: true,
          new_message_id: result.message_id,
          should_retry_again: false,
        };
      } else {
        return {
          success: false,
          error_message: result.error || 'Email retry failed',
          should_retry_again:
            failedMessage.retry_count < this.MAX_RETRY_ATTEMPTS - 1,
          next_retry_at: this.calculateNextRetryTime(
            failedMessage.retry_count + 1,
            failedMessage.retry_strategy,
          ),
        };
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retry failed SMS message
   */
  private async retrySMS(failedMessage: FailedMessage): Promise<RetryResult> {
    try {
      const messageData = failedMessage.original_message_data;

      // Use SMS connector to resend
      const result = await smsServiceConnector.sendSMS({
        to: failedMessage.recipient,
        body: messageData.body,
        from: messageData.from,
        media_urls: messageData.media_urls,
      });

      if (result.success && result.message_sid) {
        return {
          success: true,
          new_message_id: result.message_sid,
          should_retry_again: false,
        };
      } else {
        return {
          success: false,
          error_message: result.error || 'SMS retry failed',
          should_retry_again:
            failedMessage.retry_count < this.MAX_RETRY_ATTEMPTS - 1,
          next_retry_at: this.calculateNextRetryTime(
            failedMessage.retry_count + 1,
            failedMessage.retry_strategy,
          ),
        };
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update failed message record after retry attempt
   */
  private async updateFailedMessageRecord(
    failedMessage: FailedMessage,
    retryResult: RetryResult,
  ): Promise<void> {
    const updates: any = {
      retry_count: failedMessage.retry_count + 1,
      last_retry_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (retryResult.success) {
      updates.resolved_at = new Date().toISOString();
      updates.resolved_message_id = retryResult.new_message_id;
      updates.should_retry = false;
      updates.final_failure = false;
    } else {
      updates.last_error = retryResult.error_message;

      if (retryResult.should_retry_again) {
        updates.next_retry_at = retryResult.next_retry_at?.toISOString();
        updates.should_retry = true;
        updates.final_failure = false;
      } else {
        updates.should_retry = false;
        updates.final_failure = true;

        // Send final failure notification
        await this.sendFailureNotification({
          ...failedMessage,
          final_failure: true,
        });
      }
    }

    const { error } = await supabase
      .from('failed_messages')
      .update(updates)
      .eq('id', failedMessage.id);

    if (error) {
      console.error('Error updating failed message record:', error);
    }
  }

  /**
   * Determine retry strategy based on failure type
   */
  private determineRetryStrategy(
    failureReason: string,
    errorCode?: string,
    provider?: string,
  ): FailedMessage['retry_strategy'] {
    const reason = failureReason.toLowerCase();

    // Immediate retry for temporary issues
    if (
      reason.includes('rate limit') ||
      reason.includes('timeout') ||
      reason.includes('temporary')
    ) {
      return 'immediate';
    }

    // Scheduled retry for provider issues
    if (
      reason.includes('service unavailable') ||
      reason.includes('server error')
    ) {
      return 'scheduled';
    }

    // Manual retry for quota/permission issues
    if (
      reason.includes('quota') ||
      reason.includes('permission') ||
      reason.includes('auth')
    ) {
      return 'manual';
    }

    // Default to exponential backoff
    return 'exponential_backoff';
  }

  /**
   * Determine if message should be retried
   */
  private shouldRetryMessage(
    failureReason: string,
    errorCode?: string,
    messageType?: string,
  ): boolean {
    const reason = failureReason.toLowerCase();

    // Don't retry permanent failures
    const permanentFailures = [
      'invalid email',
      'mailbox does not exist',
      'blocked',
      'spam',
      'invalid phone number',
      'opted out',
      'unsubscribed',
    ];

    if (permanentFailures.some((failure) => reason.includes(failure))) {
      return false;
    }

    // SMS-specific error codes that shouldn't be retried
    if (messageType === 'sms' && errorCode) {
      const permanentSMSCodes = ['21211', '21614', '21408', '21610'];
      if (permanentSMSCodes.includes(errorCode)) {
        return false;
      }
    }

    // Email-specific permanent failures
    if (messageType === 'email') {
      if (reason.includes('bounce') && reason.includes('permanent')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate next retry time based on strategy
   */
  private calculateNextRetryTime(
    retryCount: number,
    strategy: FailedMessage['retry_strategy'],
  ): Date | null {
    switch (strategy) {
      case 'immediate':
        return new Date(Date.now() + 60 * 1000); // 1 minute

      case 'exponential_backoff':
        const backoffDelay = Math.min(
          this.BASE_RETRY_DELAY_MS * Math.pow(2, retryCount),
          this.MAX_RETRY_DELAY_MS,
        );
        return new Date(Date.now() + backoffDelay);

      case 'scheduled':
        // Retry in 30 minutes for scheduled
        return new Date(Date.now() + 30 * 60 * 1000);

      case 'manual':
        // No automatic retry for manual strategy
        return null;

      default:
        return new Date(Date.now() + this.BASE_RETRY_DELAY_MS);
    }
  }

  /**
   * Check if failure is critical and requires immediate notification
   */
  private isCriticalFailure(
    failureReason: string,
    errorCode?: string,
  ): boolean {
    const reason = failureReason.toLowerCase();

    return (
      reason.includes('quota exceeded') ||
      reason.includes('account suspended') ||
      reason.includes('service unavailable') ||
      reason.includes('authentication failed')
    );
  }

  /**
   * Send failure notification to couple
   */
  private async sendFailureNotification(
    failedMessage: FailedMessage | Omit<FailedMessage, 'id'>,
  ): Promise<void> {
    if (!failedMessage.couple_id) return;

    try {
      const notification: FailureNotification = {
        couple_id: failedMessage.couple_id,
        guest_id: failedMessage.guest_id,
        failure_type: 'single_message',
        message: `Failed to send ${failedMessage.failure_type} to ${failedMessage.recipient}: ${failedMessage.failure_reason}`,
        severity: this.determineSeverity(failedMessage.failure_reason),
        failed_messages_count: 1,
        suggested_actions: this.getSuggestedActions(failedMessage),
        timestamp: new Date(),
      };

      // Store notification
      const { error } = await supabase
        .from('failure_notifications')
        .insert(notification);

      if (error) {
        console.error('Error storing failure notification:', error);
      }

      // Send real-time notification via WebSocket
      await supabase
        .channel(`couple_${failedMessage.couple_id}_notifications`)
        .send({
          type: 'broadcast',
          event: 'delivery_failure',
          payload: notification,
        });
    } catch (error) {
      console.error('Error sending failure notification:', error);
    }
  }

  /**
   * Determine notification severity
   */
  private determineSeverity(
    failureReason: string,
  ): FailureNotification['severity'] {
    const reason = failureReason.toLowerCase();

    if (
      reason.includes('quota') ||
      reason.includes('suspended') ||
      reason.includes('auth')
    ) {
      return 'critical';
    }
    if (
      reason.includes('service unavailable') ||
      reason.includes('server error')
    ) {
      return 'high';
    }
    if (reason.includes('rate limit') || reason.includes('temporary')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get suggested actions for failure
   */
  private getSuggestedActions(
    failedMessage: FailedMessage | Omit<FailedMessage, 'id'>,
  ): string[] {
    const reason = failedMessage.failure_reason.toLowerCase();
    const actions: string[] = [];

    if (reason.includes('invalid email')) {
      actions.push('Verify the email address is correct');
      actions.push('Contact the guest to confirm their email');
    } else if (reason.includes('invalid phone')) {
      actions.push('Verify the phone number format');
      actions.push('Contact the guest to confirm their phone number');
    } else if (reason.includes('quota')) {
      actions.push('Check your account limits');
      actions.push('Consider upgrading your plan');
    } else if (reason.includes('rate limit')) {
      actions.push('The message will be automatically retried');
      actions.push('Consider spreading messages over time');
    } else if (reason.includes('bounced')) {
      actions.push('Remove invalid email addresses');
      actions.push('Update guest contact information');
    } else {
      actions.push('The system will automatically retry');
      actions.push('Contact support if the issue persists');
    }

    return actions;
  }

  /**
   * Schedule retry for a failed message
   */
  private async scheduleRetry(
    failedMessageId: string,
    retryAt: Date,
  ): Promise<void> {
    // This would integrate with a job scheduler or cron system
    // For now, we'll rely on the processRetryQueue method being called periodically
    console.log(
      `Scheduled retry for message ${failedMessageId} at ${retryAt.toISOString()}`,
    );
  }

  /**
   * Get failure statistics for a couple
   */
  async getFailureStats(
    coupleId: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<{
    total_failed: number;
    by_type: { email: number; sms: number };
    by_provider: { [key: string]: number };
    retry_success_rate: number;
    common_failures: Array<{ reason: string; count: number }>;
  }> {
    let query = supabase
      .from('failed_messages')
      .select('*')
      .eq('couple_id', coupleId);

    if (dateRange) {
      query = query
        .gte('failed_at', dateRange.from.toISOString())
        .lte('failed_at', dateRange.to.toISOString());
    }

    const { data: failedMessages, error } = await query;
    if (error) throw error;

    if (!failedMessages) {
      return {
        total_failed: 0,
        by_type: { email: 0, sms: 0 },
        by_provider: {},
        retry_success_rate: 0,
        common_failures: [],
      };
    }

    // Calculate statistics
    const byType = failedMessages.reduce((acc, msg) => {
      acc[msg.failure_type] = (acc[msg.failure_type] || 0) + 1;
      return acc;
    }, {} as any);

    const byProvider = failedMessages.reduce((acc, msg) => {
      acc[msg.provider] = (acc[msg.provider] || 0) + 1;
      return acc;
    }, {} as any);

    const retriedMessages = failedMessages.filter((msg) => msg.retry_count > 0);
    const successfulRetries = failedMessages.filter((msg) => msg.resolved_at);
    const retrySuccessRate = retriedMessages.length
      ? (successfulRetries.length / retriedMessages.length) * 100
      : 0;

    // Get common failure reasons
    const failureReasons = failedMessages.reduce((acc, msg) => {
      acc[msg.failure_reason] = (acc[msg.failure_reason] || 0) + 1;
      return acc;
    }, {} as any);

    const commonFailures = Object.entries(failureReasons)
      .map(([reason, count]) => ({ reason, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total_failed: failedMessages.length,
      by_type: {
        email: byType.email || 0,
        sms: byType.sms || 0,
      },
      by_provider: byProvider,
      retry_success_rate: retrySuccessRate,
      common_failures: commonFailures,
    };
  }
}

export const failedMessageHandler = FailedMessageHandler.getInstance();
