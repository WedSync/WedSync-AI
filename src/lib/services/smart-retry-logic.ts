/**
 * WS-155 Round 2: Smart Retry Logic
 * Team C - Advanced Integration Phase
 *
 * Intelligent retry system based on failure types with exponential backoff
 * and context-aware retry strategies
 */

import { EventEmitter } from 'events';

export interface RetryableMessage {
  id: string;
  provider: string;
  recipient: string;
  content: {
    subject?: string;
    body: string;
    html?: string;
  };
  type: 'email' | 'sms' | 'push';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  originalSentAt: Date;
  weddingDate?: Date;
}

export interface FailureContext {
  messageId: string;
  failureType: FailureType;
  errorCode?: string;
  errorMessage?: string;
  provider: string;
  timestamp: Date;
  attemptNumber: number;
  isPermanent: boolean;
}

export type FailureType =
  | 'network_error'
  | 'provider_error'
  | 'rate_limit'
  | 'invalid_recipient'
  | 'content_rejected'
  | 'authentication_error'
  | 'quota_exceeded'
  | 'temporary_failure'
  | 'permanent_failure'
  | 'timeout'
  | 'unknown';

export interface RetryStrategy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterFactor: number;
  shouldRetry: (context: FailureContext) => boolean;
  calculateDelay: (attemptNumber: number) => number;
}

export interface RetryDecision {
  shouldRetry: boolean;
  delayMs: number;
  alternativeProvider?: string;
  modifiedContent?: Partial<RetryableMessage['content']>;
  reason: string;
  strategy: string;
}

export interface RetryQueueItem {
  message: RetryableMessage;
  context: FailureContext;
  scheduledFor: Date;
  decision: RetryDecision;
}

export interface RetryStats {
  totalRetries: number;
  successfulRetries: number;
  failedRetries: number;
  byFailureType: Record<string, number>;
  byProvider: Record<string, number>;
  avgRetryDelay: number;
  successRate: number;
}

export class SmartRetryLogic extends EventEmitter {
  private strategies: Map<FailureType, RetryStrategy> = new Map();
  private retryQueue: RetryQueueItem[] = [];
  private retryHistory: Map<string, FailureContext[]> = new Map();
  private stats: RetryStats;
  private processingTimer?: NodeJS.Timeout;
  private providerHealth: Map<string, number> = new Map();

  constructor() {
    super();
    this.stats = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      byFailureType: {},
      byProvider: {},
      avgRetryDelay: 0,
      successRate: 0,
    };

    this.initializeStrategies();
    this.startQueueProcessor();
  }

  /**
   * Initialize retry strategies for different failure types
   */
  private initializeStrategies(): void {
    // Network errors - aggressive retry
    this.strategies.set('network_error', {
      maxAttempts: 5,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.2,
      shouldRetry: () => true,
      calculateDelay: this.exponentialBackoff.bind(this),
    });

    // Rate limiting - respectful backoff
    this.strategies.set('rate_limit', {
      maxAttempts: 3,
      baseDelayMs: 60000, // Start with 1 minute
      maxDelayMs: 600000, // Max 10 minutes
      backoffMultiplier: 3,
      jitterFactor: 0.1,
      shouldRetry: (context) => context.attemptNumber <= 3,
      calculateDelay: this.exponentialBackoff.bind(this),
    });

    // Provider errors - moderate retry
    this.strategies.set('provider_error', {
      maxAttempts: 4,
      baseDelayMs: 5000,
      maxDelayMs: 60000,
      backoffMultiplier: 2.5,
      jitterFactor: 0.3,
      shouldRetry: (context) => !context.isPermanent,
      calculateDelay: this.exponentialBackoff.bind(this),
    });

    // Temporary failures - smart retry
    this.strategies.set('temporary_failure', {
      maxAttempts: 3,
      baseDelayMs: 10000,
      maxDelayMs: 120000,
      backoffMultiplier: 2,
      jitterFactor: 0.25,
      shouldRetry: (context) => context.attemptNumber <= 3,
      calculateDelay: this.exponentialBackoff.bind(this),
    });

    // Content rejected - single retry with modification
    this.strategies.set('content_rejected', {
      maxAttempts: 2,
      baseDelayMs: 5000,
      maxDelayMs: 5000,
      backoffMultiplier: 1,
      jitterFactor: 0,
      shouldRetry: (context) => context.attemptNumber === 1,
      calculateDelay: () => 5000,
    });

    // Authentication errors - limited retry
    this.strategies.set('authentication_error', {
      maxAttempts: 2,
      baseDelayMs: 2000,
      maxDelayMs: 2000,
      backoffMultiplier: 1,
      jitterFactor: 0,
      shouldRetry: (context) => context.attemptNumber === 1,
      calculateDelay: () => 2000,
    });

    // Quota exceeded - long delay
    this.strategies.set('quota_exceeded', {
      maxAttempts: 2,
      baseDelayMs: 3600000, // 1 hour
      maxDelayMs: 7200000, // 2 hours
      backoffMultiplier: 1,
      jitterFactor: 0.1,
      shouldRetry: (context) => context.attemptNumber === 1,
      calculateDelay: (attempt) => 3600000 * attempt,
    });

    // Permanent failures - no retry
    this.strategies.set('permanent_failure', {
      maxAttempts: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      backoffMultiplier: 1,
      jitterFactor: 0,
      shouldRetry: () => false,
      calculateDelay: () => 0,
    });

    // Invalid recipient - no retry
    this.strategies.set('invalid_recipient', {
      maxAttempts: 0,
      baseDelayMs: 0,
      maxDelayMs: 0,
      backoffMultiplier: 1,
      jitterFactor: 0,
      shouldRetry: () => false,
      calculateDelay: () => 0,
    });
  }

  /**
   * Analyze failure and decide on retry strategy
   */
  analyzeFailure(
    message: RetryableMessage,
    context: FailureContext,
  ): RetryDecision {
    // Get or create retry history
    if (!this.retryHistory.has(message.id)) {
      this.retryHistory.set(message.id, []);
    }
    const history = this.retryHistory.get(message.id)!;
    history.push(context);

    // Check if message has expired (e.g., wedding already happened)
    if (this.isMessageExpired(message)) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: 'Message expired - wedding date has passed',
        strategy: 'none',
      };
    }

    // Get appropriate strategy
    const strategy =
      this.strategies.get(context.failureType) ||
      this.strategies.get('unknown')!;

    // Check if we should retry
    if (!strategy.shouldRetry(context)) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Strategy ${context.failureType} does not allow retry`,
        strategy: context.failureType,
      };
    }

    // Check total attempt limit
    if (context.attemptNumber >= strategy.maxAttempts) {
      return {
        shouldRetry: false,
        delayMs: 0,
        reason: `Max attempts (${strategy.maxAttempts}) reached`,
        strategy: context.failureType,
      };
    }

    // Calculate retry delay
    const baseDelay = strategy.calculateDelay(context.attemptNumber);
    const delayWithJitter = this.addJitter(baseDelay, strategy.jitterFactor);
    const finalDelay = Math.min(delayWithJitter, strategy.maxDelayMs);

    // Determine if we should use alternative provider
    const alternativeProvider = this.selectAlternativeProvider(
      context.provider,
      message.type,
    );

    // Check if content modification is needed
    const modifiedContent = this.getModifiedContent(context, message);

    // Apply priority boost for urgent messages
    const priorityAdjustedDelay = this.adjustDelayForPriority(
      finalDelay,
      message.priority,
      message.weddingDate,
    );

    return {
      shouldRetry: true,
      delayMs: priorityAdjustedDelay,
      alternativeProvider,
      modifiedContent,
      reason: this.generateRetryReason(context, strategy, alternativeProvider),
      strategy: context.failureType,
    };
  }

  /**
   * Schedule a retry
   */
  scheduleRetry(
    message: RetryableMessage,
    decision: RetryDecision,
    context: FailureContext,
  ): void {
    const scheduledFor = new Date(Date.now() + decision.delayMs);

    const queueItem: RetryQueueItem = {
      message,
      context,
      decision,
      scheduledFor,
    };

    // Insert into queue maintaining order
    const insertIndex = this.retryQueue.findIndex(
      (item) => item.scheduledFor > scheduledFor,
    );

    if (insertIndex === -1) {
      this.retryQueue.push(queueItem);
    } else {
      this.retryQueue.splice(insertIndex, 0, queueItem);
    }

    // Update statistics
    this.updateStats(context);

    this.emit('retry:scheduled', {
      messageId: message.id,
      scheduledFor,
      attemptNumber: context.attemptNumber + 1,
      provider: decision.alternativeProvider || context.provider,
    });
  }

  /**
   * Process retry queue
   */
  private startQueueProcessor(): void {
    this.processingTimer = setInterval(async () => {
      const now = new Date();
      const due = [];

      // Find all due retries
      while (
        this.retryQueue.length > 0 &&
        this.retryQueue[0].scheduledFor <= now
      ) {
        due.push(this.retryQueue.shift()!);
      }

      // Process due retries
      for (const item of due) {
        await this.executeRetry(item);
      }
    }, 1000); // Check every second
  }

  /**
   * Execute a retry
   */
  private async executeRetry(item: RetryQueueItem): Promise<void> {
    const { message, decision, context } = item;

    // Apply content modifications if any
    if (decision.modifiedContent) {
      Object.assign(message.content, decision.modifiedContent);
    }

    this.emit('retry:executing', {
      messageId: message.id,
      provider: decision.alternativeProvider || context.provider,
      attemptNumber: context.attemptNumber + 1,
    });

    // The actual retry would be handled by the message sending service
    // This emits an event for the service to handle
    this.emit('retry:execute', {
      message,
      provider: decision.alternativeProvider || context.provider,
      attemptNumber: context.attemptNumber + 1,
      originalFailure: context,
    });
  }

  /**
   * Report retry result
   */
  reportRetryResult(messageId: string, success: boolean, error?: Error): void {
    const history = this.retryHistory.get(messageId);
    if (!history) return;

    if (success) {
      this.stats.successfulRetries++;
      this.emit('retry:success', {
        messageId,
        attempts: history.length,
      });

      // Clean up history for successful retries
      this.retryHistory.delete(messageId);
    } else {
      this.stats.failedRetries++;
      this.emit('retry:failed', {
        messageId,
        attempts: history.length,
        error: error?.message,
      });
    }

    // Update success rate
    const total = this.stats.successfulRetries + this.stats.failedRetries;
    this.stats.successRate =
      total > 0 ? this.stats.successfulRetries / total : 0;
  }

  /**
   * Exponential backoff calculation
   */
  private exponentialBackoff(attemptNumber: number): number {
    const strategy = Array.from(this.strategies.values())[0]; // Get any strategy for defaults
    return (
      Math.pow(strategy.backoffMultiplier, attemptNumber - 1) *
      strategy.baseDelayMs
    );
  }

  /**
   * Add jitter to delay
   */
  private addJitter(delay: number, jitterFactor: number): number {
    const jitter = delay * jitterFactor * (Math.random() - 0.5) * 2;
    return Math.max(0, delay + jitter);
  }

  /**
   * Check if message has expired
   */
  private isMessageExpired(message: RetryableMessage): boolean {
    // Don't retry messages after the wedding date
    if (message.weddingDate && new Date() > message.weddingDate) {
      return true;
    }

    // Don't retry messages older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return message.originalSentAt < sevenDaysAgo;
  }

  /**
   * Select alternative provider based on health
   */
  private selectAlternativeProvider(
    currentProvider: string,
    messageType: string,
  ): string | undefined {
    // Get provider health scores
    const providers = this.getAvailableProviders(messageType);

    // Filter out current provider and unhealthy providers
    const alternatives = providers.filter(
      (p) => p !== currentProvider && (this.providerHealth.get(p) || 100) > 50,
    );

    if (alternatives.length === 0) return undefined;

    // Select provider with best health score
    return alternatives.reduce((best, provider) => {
      const bestScore = this.providerHealth.get(best) || 100;
      const providerScore = this.providerHealth.get(provider) || 100;
      return providerScore > bestScore ? provider : best;
    });
  }

  /**
   * Get available providers for message type
   */
  private getAvailableProviders(messageType: string): string[] {
    // This would be configured based on actual providers
    const providers: Record<string, string[]> = {
      email: ['sendgrid', 'resend', 'mailgun'],
      sms: ['twilio', 'messagebird', 'vonage'],
      push: ['firebase', 'onesignal'],
    };

    return providers[messageType] || [];
  }

  /**
   * Get modified content for retry
   */
  private getModifiedContent(
    context: FailureContext,
    message: RetryableMessage,
  ): Partial<RetryableMessage['content']> | undefined {
    if (context.failureType === 'content_rejected') {
      // Simplify content for spam filters
      return {
        subject: message.content.subject?.replace(/[!$%]/g, ''), // Remove special characters
        body: this.simplifyContent(message.content.body),
      };
    }

    return undefined;
  }

  /**
   * Simplify content to avoid spam filters
   */
  private simplifyContent(content: string): string {
    return content
      .replace(/\b(FREE|CLICK HERE|ACT NOW|LIMITED TIME)\b/gi, '')
      .replace(/[!]{2,}/g, '!')
      .replace(/\${2,}/g, '$')
      .trim();
  }

  /**
   * Adjust delay based on priority and wedding proximity
   */
  private adjustDelayForPriority(
    delay: number,
    priority: string,
    weddingDate?: Date,
  ): number {
    let adjustedDelay = delay;

    // Priority adjustments
    const priorityMultipliers: Record<string, number> = {
      urgent: 0.1,
      high: 0.3,
      normal: 1,
      low: 2,
    };

    adjustedDelay *= priorityMultipliers[priority] || 1;

    // Wedding proximity adjustments
    if (weddingDate) {
      const daysUntilWedding = Math.ceil(
        (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilWedding <= 1) {
        adjustedDelay *= 0.1; // Very urgent for wedding day
      } else if (daysUntilWedding <= 7) {
        adjustedDelay *= 0.25; // Urgent for wedding week
      } else if (daysUntilWedding <= 30) {
        adjustedDelay *= 0.5; // Important for wedding month
      }
    }

    return Math.round(adjustedDelay);
  }

  /**
   * Generate retry reason for logging
   */
  private generateRetryReason(
    context: FailureContext,
    strategy: RetryStrategy,
    alternativeProvider?: string,
  ): string {
    const parts = [
      `Retrying due to ${context.failureType}`,
      `Attempt ${context.attemptNumber + 1}/${strategy.maxAttempts}`,
    ];

    if (alternativeProvider) {
      parts.push(`using alternative provider ${alternativeProvider}`);
    }

    if (context.errorMessage) {
      parts.push(`(${context.errorMessage})`);
    }

    return parts.join(' ');
  }

  /**
   * Update statistics
   */
  private updateStats(context: FailureContext): void {
    this.stats.totalRetries++;

    // Update by failure type
    this.stats.byFailureType[context.failureType] =
      (this.stats.byFailureType[context.failureType] || 0) + 1;

    // Update by provider
    this.stats.byProvider[context.provider] =
      (this.stats.byProvider[context.provider] || 0) + 1;
  }

  /**
   * Update provider health score
   */
  updateProviderHealth(provider: string, healthScore: number): void {
    this.providerHealth.set(provider, healthScore);
  }

  /**
   * Get retry statistics
   */
  getStats(): RetryStats {
    return { ...this.stats };
  }

  /**
   * Get retry queue status
   */
  getQueueStatus(): {
    queueLength: number;
    nextRetry?: Date;
    byProvider: Record<string, number>;
  } {
    const status = {
      queueLength: this.retryQueue.length,
      nextRetry: this.retryQueue[0]?.scheduledFor,
      byProvider: {} as Record<string, number>,
    };

    for (const item of this.retryQueue) {
      const provider =
        item.decision.alternativeProvider || item.context.provider;
      status.byProvider[provider] = (status.byProvider[provider] || 0) + 1;
    }

    return status;
  }

  /**
   * Cancel scheduled retry
   */
  cancelRetry(messageId: string): boolean {
    const index = this.retryQueue.findIndex(
      (item) => item.message.id === messageId,
    );

    if (index !== -1) {
      this.retryQueue.splice(index, 1);
      this.emit('retry:cancelled', { messageId });
      return true;
    }

    return false;
  }

  /**
   * Clear all retries for a provider
   */
  clearProviderRetries(provider: string): number {
    const toRemove = this.retryQueue.filter(
      (item) =>
        (item.decision.alternativeProvider || item.context.provider) ===
        provider,
    );

    for (const item of toRemove) {
      const index = this.retryQueue.indexOf(item);
      if (index !== -1) {
        this.retryQueue.splice(index, 1);
      }
    }

    if (toRemove.length > 0) {
      this.emit('retries:cleared', {
        provider,
        count: toRemove.length,
      });
    }

    return toRemove.length;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    this.retryQueue = [];
    this.retryHistory.clear();
    this.removeAllListeners();
  }
}
