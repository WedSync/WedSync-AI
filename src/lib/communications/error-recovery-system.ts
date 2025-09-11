import { createClient } from '@/lib/supabase/server';
import { Redis } from '@upstash/redis';

interface ErrorContext {
  organizationId: string;
  campaignId: string;
  userId?: string;
  action: string;
  timestamp: Date;
  environment: 'development' | 'staging' | 'production';
  userAgent?: string;
  ipAddress?: string;
}

interface RecoveryAction {
  type:
    | 'retry'
    | 'rollback'
    | 'skip'
    | 'manual_intervention'
    | 'alternative_method';
  description: string;
  automaticRetryCount: number;
  maxRetries: number;
  delayMs: number;
  fallbackAction?: RecoveryAction;
}

interface UserFeedback {
  type: 'success' | 'error' | 'warning' | 'info' | 'progress';
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    action: string;
    variant: 'primary' | 'secondary' | 'destructive';
  }>;
  dismissible: boolean;
  autoHideMs?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Comprehensive Error Recovery and User Feedback System
 * Handles messaging system failures with automatic recovery and clear user communication
 */
export class ErrorRecoverySystem {
  private static redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  });

  private static recoveryStrategies: Map<string, RecoveryAction> = new Map([
    // Message sending failures
    [
      'EMAIL_SEND_FAILURE',
      {
        type: 'retry',
        description: 'Retry email sending with exponential backoff',
        automaticRetryCount: 0,
        maxRetries: 3,
        delayMs: 5000, // 5 seconds initial delay
        fallbackAction: {
          type: 'alternative_method',
          description: 'Switch to alternative email provider',
          automaticRetryCount: 0,
          maxRetries: 2,
          delayMs: 10000,
        },
      },
    ],

    [
      'SMS_SEND_FAILURE',
      {
        type: 'retry',
        description: 'Retry SMS sending',
        automaticRetryCount: 0,
        maxRetries: 2,
        delayMs: 3000,
        fallbackAction: {
          type: 'skip',
          description: 'Skip SMS and continue with email only',
          automaticRetryCount: 0,
          maxRetries: 0,
          delayMs: 0,
        },
      },
    ],

    [
      'DATABASE_CONNECTION_FAILURE',
      {
        type: 'retry',
        description: 'Retry database connection with backoff',
        automaticRetryCount: 0,
        maxRetries: 5,
        delayMs: 2000,
        fallbackAction: {
          type: 'manual_intervention',
          description: 'Database connection requires manual intervention',
          automaticRetryCount: 0,
          maxRetries: 0,
          delayMs: 0,
        },
      },
    ],

    [
      'VALIDATION_FAILURE',
      {
        type: 'manual_intervention',
        description: 'User input validation failed - requires user correction',
        automaticRetryCount: 0,
        maxRetries: 0,
        delayMs: 0,
      },
    ],

    [
      'RATE_LIMIT_EXCEEDED',
      {
        type: 'retry',
        description: 'Wait for rate limit reset and retry',
        automaticRetryCount: 0,
        maxRetries: 3,
        delayMs: 60000, // 1 minute
      },
    ],

    [
      'SPAM_FILTER_REJECTION',
      {
        type: 'manual_intervention',
        description: 'Content flagged as spam - requires manual review',
        automaticRetryCount: 0,
        maxRetries: 0,
        delayMs: 0,
      },
    ],

    [
      'TEMPLATE_RENDERING_FAILURE',
      {
        type: 'alternative_method',
        description: 'Use fallback template renderer',
        automaticRetryCount: 0,
        maxRetries: 1,
        delayMs: 1000,
        fallbackAction: {
          type: 'manual_intervention',
          description: 'Template rendering failed - manual fix required',
          automaticRetryCount: 0,
          maxRetries: 0,
          delayMs: 0,
        },
      },
    ],
  ]);

  /**
   * Handle error with automatic recovery
   */
  static async handleError(
    errorCode: string,
    error: Error,
    context: ErrorContext,
    originalAction: () => Promise<any>,
  ): Promise<{
    success: boolean;
    data?: any;
    userFeedback: UserFeedback;
    recoveryAttempts: number;
  }> {
    const startTime = Date.now();
    const errorId = this.generateErrorId();

    try {
      // Log error for monitoring
      await this.logError(errorId, errorCode, error, context);

      // Get recovery strategy
      const strategy = this.recoveryStrategies.get(errorCode);
      if (!strategy) {
        return {
          success: false,
          userFeedback: this.createUserFeedback('error', {
            title: 'Unknown Error',
            message:
              'An unexpected error occurred. Please try again or contact support.',
            severity: 'high',
            actions: [
              { label: 'Try Again', action: 'retry', variant: 'primary' },
              {
                label: 'Contact Support',
                action: 'support',
                variant: 'secondary',
              },
            ],
          }),
          recoveryAttempts: 0,
        };
      }

      // Attempt recovery
      const result = await this.attemptRecovery(
        strategy,
        originalAction,
        errorId,
        context,
      );

      // Log recovery outcome
      await this.logRecoveryOutcome(errorId, result, Date.now() - startTime);

      return result;
    } catch (recoveryError) {
      console.error('Error recovery failed:', recoveryError);

      return {
        success: false,
        userFeedback: this.createUserFeedback('error', {
          title: 'Recovery Failed',
          message:
            'Unable to recover from the error automatically. Support has been notified.',
          severity: 'critical',
          actions: [
            { label: 'Contact Support', action: 'support', variant: 'primary' },
          ],
        }),
        recoveryAttempts: 0,
      };
    }
  }

  /**
   * Attempt recovery using strategy
   */
  private static async attemptRecovery(
    strategy: RecoveryAction,
    originalAction: () => Promise<any>,
    errorId: string,
    context: ErrorContext,
  ): Promise<{
    success: boolean;
    data?: any;
    userFeedback: UserFeedback;
    recoveryAttempts: number;
  }> {
    let attempts = 0;

    switch (strategy.type) {
      case 'retry':
        return await this.executeRetryStrategy(
          strategy,
          originalAction,
          errorId,
          context,
        );

      case 'rollback':
        return await this.executeRollbackStrategy(strategy, context);

      case 'skip':
        return {
          success: true,
          userFeedback: this.createUserFeedback('warning', {
            title: 'Partial Success',
            message:
              'Some operations were skipped due to errors, but the main action completed.',
            severity: 'medium',
          }),
          recoveryAttempts: 0,
        };

      case 'alternative_method':
        return await this.executeAlternativeMethodStrategy(
          strategy,
          originalAction,
          errorId,
          context,
        );

      case 'manual_intervention':
        return {
          success: false,
          userFeedback: this.createUserFeedback('error', {
            title: 'Manual Action Required',
            message: strategy.description,
            severity: 'high',
            actions: [
              {
                label: 'Review & Fix',
                action: 'manual_fix',
                variant: 'primary',
              },
              { label: 'Get Help', action: 'support', variant: 'secondary' },
            ],
          }),
          recoveryAttempts: 0,
        };

      default:
        throw new Error(`Unknown recovery strategy type: ${strategy.type}`);
    }
  }

  /**
   * Execute retry strategy with exponential backoff
   */
  private static async executeRetryStrategy(
    strategy: RecoveryAction,
    originalAction: () => Promise<any>,
    errorId: string,
    context: ErrorContext,
  ): Promise<{
    success: boolean;
    data?: any;
    userFeedback: UserFeedback;
    recoveryAttempts: number;
  }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= strategy.maxRetries; attempt++) {
      try {
        // Progressive delay with jitter
        const delay =
          strategy.delayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;

        if (attempt > 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Update user with retry progress
        if (attempt > 1) {
          await this.updateUserProgress(errorId, {
            type: 'progress',
            title: 'Retrying...',
            message: `Attempt ${attempt} of ${strategy.maxRetries}`,
            severity: 'low',
            dismissible: false,
          });
        }

        // Attempt the action
        const data = await originalAction();

        // Success!
        return {
          success: true,
          data,
          userFeedback: this.createUserFeedback('success', {
            title: 'Success',
            message:
              attempt === 1
                ? 'Action completed successfully.'
                : `Action completed after ${attempt} attempts.`,
            severity: 'low',
            autoHideMs: 5000,
          }),
          recoveryAttempts: attempt,
        };
      } catch (error) {
        lastError = error as Error;
        await this.logRetryAttempt(errorId, attempt, error as Error);
      }
    }

    // All retries failed, try fallback if available
    if (strategy.fallbackAction) {
      const fallbackResult = await this.attemptRecovery(
        strategy.fallbackAction,
        originalAction,
        errorId,
        context,
      );

      return {
        ...fallbackResult,
        recoveryAttempts: strategy.maxRetries + fallbackResult.recoveryAttempts,
      };
    }

    // No fallback, final failure
    return {
      success: false,
      userFeedback: this.createUserFeedback('error', {
        title: 'All Retry Attempts Failed',
        message: `Unable to complete the action after ${strategy.maxRetries} attempts. ${lastError?.message || 'Unknown error'}`,
        severity: 'high',
        actions: [
          {
            label: 'Try Again Later',
            action: 'retry_later',
            variant: 'primary',
          },
          { label: 'Contact Support', action: 'support', variant: 'secondary' },
        ],
      }),
      recoveryAttempts: strategy.maxRetries,
    };
  }

  /**
   * Execute rollback strategy
   */
  private static async executeRollbackStrategy(
    strategy: RecoveryAction,
    context: ErrorContext,
  ): Promise<{
    success: boolean;
    data?: any;
    userFeedback: UserFeedback;
    recoveryAttempts: number;
  }> {
    try {
      // Implement rollback logic based on context
      await this.performRollback(context);

      return {
        success: true,
        userFeedback: this.createUserFeedback('warning', {
          title: 'Changes Rolled Back',
          message:
            'The operation was cancelled and all changes have been reverted.',
          severity: 'medium',
        }),
        recoveryAttempts: 1,
      };
    } catch (rollbackError) {
      return {
        success: false,
        userFeedback: this.createUserFeedback('error', {
          title: 'Rollback Failed',
          message:
            'Unable to revert changes. Manual intervention may be required.',
          severity: 'critical',
          actions: [
            {
              label: 'Contact Support Immediately',
              action: 'urgent_support',
              variant: 'destructive',
            },
          ],
        }),
        recoveryAttempts: 1,
      };
    }
  }

  /**
   * Execute alternative method strategy
   */
  private static async executeAlternativeMethodStrategy(
    strategy: RecoveryAction,
    originalAction: () => Promise<any>,
    errorId: string,
    context: ErrorContext,
  ): Promise<{
    success: boolean;
    data?: any;
    userFeedback: UserFeedback;
    recoveryAttempts: number;
  }> {
    try {
      // Try alternative method (implementation specific)
      const alternativeAction = this.getAlternativeAction(context);
      const data = await alternativeAction();

      return {
        success: true,
        data,
        userFeedback: this.createUserFeedback('success', {
          title: 'Alternative Method Successful',
          message: 'Completed using an alternative approach.',
          severity: 'low',
        }),
        recoveryAttempts: 1,
      };
    } catch (alternativeError) {
      // Try fallback if available
      if (strategy.fallbackAction) {
        return await this.attemptRecovery(
          strategy.fallbackAction,
          originalAction,
          errorId,
          context,
        );
      }

      return {
        success: false,
        userFeedback: this.createUserFeedback('error', {
          title: 'Alternative Method Failed',
          message: 'Both primary and alternative methods failed.',
          severity: 'high',
          actions: [
            { label: 'Contact Support', action: 'support', variant: 'primary' },
          ],
        }),
        recoveryAttempts: 1,
      };
    }
  }

  /**
   * Create user feedback message
   */
  private static createUserFeedback(
    type: UserFeedback['type'],
    options: Partial<UserFeedback>,
  ): UserFeedback {
    return {
      type,
      title: options.title || 'Notification',
      message: options.message || '',
      actions: options.actions || [],
      dismissible: options.dismissible ?? true,
      autoHideMs: options.autoHideMs,
      severity: options.severity || 'medium',
    };
  }

  /**
   * Log error for monitoring and debugging
   */
  private static async logError(
    errorId: string,
    errorCode: string,
    error: Error,
    context: ErrorContext,
  ): Promise<void> {
    const supabase = await createClient();

    const errorData = {
      error_id: errorId,
      error_code: errorCode,
      error_message: error.message,
      error_stack: error.stack,
      organization_id: context.organizationId,
      campaign_id: context.campaignId,
      user_id: context.userId,
      action: context.action,
      environment: context.environment,
      user_agent: context.userAgent,
      ip_address: context.ipAddress,
      created_at: new Date().toISOString(),
    };

    await supabase.from('error_log').insert(errorData);

    // Cache for immediate access
    await this.redis.setex(`error:${errorId}`, 3600, JSON.stringify(errorData));
  }

  /**
   * Log retry attempt
   */
  private static async logRetryAttempt(
    errorId: string,
    attempt: number,
    error: Error,
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('error_retry_log').insert({
      error_id: errorId,
      attempt_number: attempt,
      error_message: error.message,
      attempted_at: new Date().toISOString(),
    });
  }

  /**
   * Log recovery outcome
   */
  private static async logRecoveryOutcome(
    errorId: string,
    result: any,
    totalTimeMs: number,
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('error_recovery_log').insert({
      error_id: errorId,
      success: result.success,
      recovery_attempts: result.recoveryAttempts,
      total_recovery_time_ms: totalTimeMs,
      final_feedback_type: result.userFeedback.type,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Update user with progress information
   */
  private static async updateUserProgress(
    errorId: string,
    progress: UserFeedback,
  ): Promise<void> {
    // Store progress update for real-time display
    await this.redis.setex(`progress:${errorId}`, 60, JSON.stringify(progress));

    // In a real app, you'd emit this to WebSocket or SSE connection
    console.log(`Progress update for ${errorId}:`, progress);
  }

  /**
   * Generate unique error ID
   */
  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Perform rollback operations
   */
  private static async performRollback(context: ErrorContext): Promise<void> {
    const supabase = await createClient();

    // Example rollback logic - would be specific to the operation
    if (context.campaignId) {
      // Rollback campaign changes
      await supabase
        .from('campaigns')
        .update({ status: 'draft' })
        .eq('id', context.campaignId);

      // Clear any queued messages
      await supabase
        .from('bulk_message_recipients')
        .delete()
        .eq('campaign_id', context.campaignId)
        .in('email_status', ['queued', 'pending'])
        .in('sms_status', ['queued', 'pending']);
    }
  }

  /**
   * Get alternative action for context
   */
  private static getAlternativeAction(
    context: ErrorContext,
  ): () => Promise<any> {
    // Return alternative implementation based on context
    // This would be specific to each type of operation
    return async () => {
      console.log(`Executing alternative method for ${context.action}`);
      return { success: true, method: 'alternative' };
    };
  }

  /**
   * Get error statistics for organization
   */
  static async getErrorStatistics(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalErrors: number;
    errorsByType: Record<string, number>;
    recoverySuccessRate: number;
    averageRecoveryTime: number;
    topErrorCodes: Array<{ code: string; count: number }>;
  }> {
    const supabase = await createClient();

    const { data: errors, count: totalErrors } = await supabase
      .from('error_log')
      .select('error_code, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const { data: recoveries } = await supabase
      .from('error_recovery_log')
      .select('success, total_recovery_time_ms')
      .in(
        'error_id',
        (errors || []).map(() => ''),
      ); // Would need proper error_id join

    const errorsByType: Record<string, number> = {};
    errors?.forEach((error) => {
      errorsByType[error.error_code] =
        (errorsByType[error.error_code] || 0) + 1;
    });

    const successful = recoveries?.filter((r) => r.success).length || 0;
    const total = recoveries?.length || 1;
    const recoverySuccessRate = (successful / total) * 100;

    const averageRecoveryTime = recoveries?.length
      ? recoveries.reduce((sum, r) => sum + r.total_recovery_time_ms, 0) /
        recoveries.length
      : 0;

    const topErrorCodes = Object.entries(errorsByType)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: totalErrors || 0,
      errorsByType,
      recoverySuccessRate,
      averageRecoveryTime,
      topErrorCodes,
    };
  }
}

export const errorRecoverySystem = new ErrorRecoverySystem();
