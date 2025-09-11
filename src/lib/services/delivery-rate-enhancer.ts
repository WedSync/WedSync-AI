// WS-155: Delivery Rate Enhancement with Smart Retry Logic
import { createClient } from '@/lib/supabase/server';

interface DeliveryAttempt {
  attemptNumber: number;
  timestamp: Date;
  provider: string;
  status: 'success' | 'failed' | 'bounced' | 'deferred';
  errorCode?: string;
  errorMessage?: string;
  responseTime: number;
}

interface RetryStrategy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
}

interface ProviderHealth {
  provider: string;
  successRate: number;
  averageLatency: number;
  lastFailure?: Date;
  consecutiveFailures: number;
  isHealthy: boolean;
  capacity: number;
}

export class DeliveryRateEnhancer {
  private providerHealthMap: Map<string, ProviderHealth>;
  private retryStrategies: Map<string, RetryStrategy>;
  private circuitBreakers: Map<string, any>;
  private deliveryMetrics: any;

  constructor() {
    this.providerHealthMap = new Map();
    this.retryStrategies = new Map();
    this.circuitBreakers = new Map();
    this.deliveryMetrics = {
      totalAttempts: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      retriedDeliveries: 0,
      bouncedMessages: 0,
    };

    this.initializeStrategies();
    this.initializeProviders();
  }

  private initializeStrategies() {
    // Email retry strategy
    this.retryStrategies.set('email', {
      maxAttempts: 5,
      baseDelay: 60000, // 1 minute
      maxDelay: 3600000, // 1 hour
      backoffMultiplier: 2,
      jitterEnabled: true,
    });

    // SMS retry strategy (more aggressive)
    this.retryStrategies.set('sms', {
      maxAttempts: 3,
      baseDelay: 30000, // 30 seconds
      maxDelay: 600000, // 10 minutes
      backoffMultiplier: 1.5,
      jitterEnabled: true,
    });

    // Push notification retry strategy
    this.retryStrategies.set('push', {
      maxAttempts: 3,
      baseDelay: 10000, // 10 seconds
      maxDelay: 300000, // 5 minutes
      backoffMultiplier: 2,
      jitterEnabled: false,
    });
  }

  private initializeProviders() {
    // Initialize email providers
    this.providerHealthMap.set('sendgrid', {
      provider: 'sendgrid',
      successRate: 100,
      averageLatency: 0,
      consecutiveFailures: 0,
      isHealthy: true,
      capacity: 1000,
    });

    this.providerHealthMap.set('resend', {
      provider: 'resend',
      successRate: 100,
      averageLatency: 0,
      consecutiveFailures: 0,
      isHealthy: true,
      capacity: 500,
    });

    // Initialize SMS providers
    this.providerHealthMap.set('twilio', {
      provider: 'twilio',
      successRate: 100,
      averageLatency: 0,
      consecutiveFailures: 0,
      isHealthy: true,
      capacity: 500,
    });

    // Initialize circuit breakers
    for (const [provider] of this.providerHealthMap) {
      this.circuitBreakers.set(provider, {
        state: 'closed', // closed, open, half-open
        failures: 0,
        lastFailureTime: null,
        nextRetryTime: null,
      });
    }
  }

  public async sendWithRetry(
    message: any,
    channel: 'email' | 'sms' | 'push',
    attemptNumber: number = 1,
  ): Promise<DeliveryAttempt> {
    const strategy = this.retryStrategies.get(channel)!;
    const provider = this.selectOptimalProvider(channel);

    if (!provider) {
      throw new Error(`No healthy providers available for ${channel}`);
    }

    const startTime = Date.now();

    try {
      // Check circuit breaker
      const circuitBreaker = this.circuitBreakers.get(provider);
      if (!this.isCircuitOpen(circuitBreaker)) {
        // Attempt delivery
        const result = await this.attemptDelivery(message, channel, provider);

        const deliveryAttempt: DeliveryAttempt = {
          attemptNumber,
          timestamp: new Date(),
          provider,
          status: result.success ? 'success' : 'failed',
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          responseTime: Date.now() - startTime,
        };

        // Update metrics
        await this.updateDeliveryMetrics(deliveryAttempt, provider);

        if (result.success) {
          // Reset circuit breaker on success
          this.resetCircuitBreaker(provider);
          return deliveryAttempt;
        } else {
          // Handle failure
          return await this.handleDeliveryFailure(
            message,
            channel,
            deliveryAttempt,
            strategy,
            attemptNumber,
          );
        }
      } else {
        // Circuit is open, try failover
        return await this.attemptFailover(message, channel, attemptNumber);
      }
    } catch (error) {
      const deliveryAttempt: DeliveryAttempt = {
        attemptNumber,
        timestamp: new Date(),
        provider,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };

      return await this.handleDeliveryFailure(
        message,
        channel,
        deliveryAttempt,
        strategy,
        attemptNumber,
      );
    }
  }

  private async attemptDelivery(
    message: any,
    channel: string,
    provider: string,
  ): Promise<any> {
    // Simulate delivery based on channel and provider
    switch (channel) {
      case 'email':
        return await this.sendEmail(message, provider);
      case 'sms':
        return await this.sendSMS(message, provider);
      case 'push':
        return await this.sendPushNotification(message, provider);
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  private async sendEmail(message: any, provider: string): Promise<any> {
    const supabase = await createClient();

    // Simulate provider-specific logic
    if (provider === 'sendgrid') {
      // SendGrid API call simulation
      const success = Math.random() > 0.05; // 95% success rate

      if (success) {
        await supabase.from('email_deliveries').insert({
          message_id: message.id,
          provider,
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        });

        return { success: true };
      } else {
        return {
          success: false,
          errorCode: 'SOFT_BOUNCE',
          errorMessage: 'Recipient mailbox full',
        };
      }
    } else if (provider === 'resend') {
      // Resend API call simulation
      const success = Math.random() > 0.08; // 92% success rate

      return { success };
    }

    return { success: false, errorMessage: 'Unknown provider' };
  }

  private async sendSMS(message: any, provider: string): Promise<any> {
    const supabase = await createClient();

    if (provider === 'twilio') {
      // Twilio API call simulation
      const success = Math.random() > 0.03; // 97% success rate

      if (success) {
        await supabase.from('sms_deliveries').insert({
          message_id: message.id,
          provider,
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        });

        return { success: true };
      } else {
        return {
          success: false,
          errorCode: 'UNDELIVERED',
          errorMessage: 'Phone number unreachable',
        };
      }
    }

    return { success: false, errorMessage: 'Unknown provider' };
  }

  private async sendPushNotification(
    message: any,
    provider: string,
  ): Promise<any> {
    // Push notification logic
    const success = Math.random() > 0.1; // 90% success rate
    return { success };
  }

  private async handleDeliveryFailure(
    message: any,
    channel: 'email' | 'sms' | 'push',
    attempt: DeliveryAttempt,
    strategy: RetryStrategy,
    attemptNumber: number,
  ): Promise<DeliveryAttempt> {
    // Check if it's a hard bounce
    if (this.isHardBounce(attempt.errorCode)) {
      attempt.status = 'bounced';
      await this.markAsHardBounce(message, attempt);
      return attempt;
    }

    // Check retry eligibility
    if (attemptNumber >= strategy.maxAttempts) {
      await this.markAsFailed(message, attempt);
      return attempt;
    }

    // Calculate retry delay
    const delay = this.calculateRetryDelay(attemptNumber, strategy);

    // Schedule retry
    await this.scheduleRetry(message, channel, attemptNumber + 1, delay);

    // Update circuit breaker
    this.updateCircuitBreaker(attempt.provider, false);

    return attempt;
  }

  private calculateRetryDelay(
    attemptNumber: number,
    strategy: RetryStrategy,
  ): number {
    let delay =
      strategy.baseDelay *
      Math.pow(strategy.backoffMultiplier, attemptNumber - 1);

    // Cap at max delay
    delay = Math.min(delay, strategy.maxDelay);

    // Add jitter if enabled
    if (strategy.jitterEnabled) {
      const jitter = Math.random() * 0.3 * delay; // Up to 30% jitter
      delay = delay + jitter - jitter / 2; // Center the jitter
    }

    return Math.floor(delay);
  }

  private async scheduleRetry(
    message: any,
    channel: string,
    nextAttempt: number,
    delay: number,
  ): Promise<void> {
    const supabase = await createClient();

    const retryTime = new Date(Date.now() + delay);

    await supabase.from('message_retries').insert({
      message_id: message.id,
      channel,
      attempt_number: nextAttempt,
      scheduled_for: retryTime.toISOString(),
      status: 'pending',
    });

    // Schedule actual retry (would use job queue in production)
    setTimeout(() => {
      this.sendWithRetry(message, channel as any, nextAttempt);
    }, delay);
  }

  private selectOptimalProvider(channel: string): string | null {
    const eligibleProviders: string[] = [];

    // Get providers for channel
    for (const [provider, health] of this.providerHealthMap) {
      if (this.isProviderForChannel(provider, channel) && health.isHealthy) {
        eligibleProviders.push(provider);
      }
    }

    if (eligibleProviders.length === 0) {
      return null;
    }

    // Sort by success rate and latency
    eligibleProviders.sort((a, b) => {
      const healthA = this.providerHealthMap.get(a)!;
      const healthB = this.providerHealthMap.get(b)!;

      // Prioritize success rate
      const scoreDiff = healthB.successRate - healthA.successRate;
      if (Math.abs(scoreDiff) > 5) {
        return scoreDiff > 0 ? 1 : -1;
      }

      // Then consider latency
      return healthA.averageLatency - healthB.averageLatency;
    });

    return eligibleProviders[0];
  }

  private isProviderForChannel(provider: string, channel: string): boolean {
    const channelProviders: Record<string, string[]> = {
      email: ['sendgrid', 'resend'],
      sms: ['twilio'],
      push: ['firebase', 'onesignal'],
    };

    return channelProviders[channel]?.includes(provider) || false;
  }

  private async attemptFailover(
    message: any,
    channel: 'email' | 'sms' | 'push',
    attemptNumber: number,
  ): Promise<DeliveryAttempt> {
    // Find alternative providers
    const providers = this.getFailoverProviders(channel);

    for (const provider of providers) {
      const health = this.providerHealthMap.get(provider);

      if (health?.isHealthy) {
        // Attempt with failover provider
        const attempt = await this.sendWithRetry(
          message,
          channel,
          attemptNumber,
        );

        if (attempt.status === 'success') {
          return attempt;
        }
      }
    }

    // All providers failed
    return {
      attemptNumber,
      timestamp: new Date(),
      provider: 'none',
      status: 'failed',
      errorMessage: 'All providers unavailable',
      responseTime: 0,
    };
  }

  private getFailoverProviders(channel: string): string[] {
    const allProviders: Record<string, string[]> = {
      email: ['resend', 'sendgrid', 'mailgun'],
      sms: ['twilio', 'vonage'],
      push: ['firebase', 'onesignal'],
    };

    return allProviders[channel] || [];
  }

  private isCircuitOpen(circuitBreaker: any): boolean {
    if (circuitBreaker.state === 'open') {
      // Check if it's time to transition to half-open
      if (Date.now() >= circuitBreaker.nextRetryTime) {
        circuitBreaker.state = 'half-open';
        return false;
      }
      return true;
    }

    return false;
  }

  private updateCircuitBreaker(provider: string, success: boolean) {
    const breaker = this.circuitBreakers.get(provider);

    if (!breaker) return;

    if (success) {
      if (breaker.state === 'half-open') {
        // Successful in half-open state, close the circuit
        breaker.state = 'closed';
        breaker.failures = 0;
      }
    } else {
      breaker.failures++;
      breaker.lastFailureTime = Date.now();

      if (breaker.failures >= 5) {
        // Open the circuit
        breaker.state = 'open';
        breaker.nextRetryTime = Date.now() + 60000; // Try again in 1 minute
      }
    }
  }

  private resetCircuitBreaker(provider: string) {
    const breaker = this.circuitBreakers.get(provider);

    if (breaker) {
      breaker.state = 'closed';
      breaker.failures = 0;
      breaker.lastFailureTime = null;
      breaker.nextRetryTime = null;
    }
  }

  private async updateDeliveryMetrics(
    attempt: DeliveryAttempt,
    provider: string,
  ): Promise<void> {
    this.deliveryMetrics.totalAttempts++;

    if (attempt.status === 'success') {
      this.deliveryMetrics.successfulDeliveries++;
    } else if (attempt.status === 'failed') {
      this.deliveryMetrics.failedDeliveries++;
    } else if (attempt.status === 'bounced') {
      this.deliveryMetrics.bouncedMessages++;
    }

    // Update provider health
    const health = this.providerHealthMap.get(provider);

    if (health) {
      // Update success rate (moving average)
      const alpha = 0.1;
      const currentSuccess = attempt.status === 'success' ? 100 : 0;
      health.successRate =
        alpha * currentSuccess + (1 - alpha) * health.successRate;

      // Update latency (moving average)
      health.averageLatency =
        alpha * attempt.responseTime + (1 - alpha) * health.averageLatency;

      // Update consecutive failures
      if (attempt.status === 'failed') {
        health.consecutiveFailures++;
        health.lastFailure = new Date();

        // Mark unhealthy if too many failures
        if (health.consecutiveFailures >= 10) {
          health.isHealthy = false;
        }
      } else {
        health.consecutiveFailures = 0;
      }

      // Mark healthy if success rate is good
      if (health.successRate > 80 && health.consecutiveFailures < 5) {
        health.isHealthy = true;
      }
    }

    // Save metrics to database
    const supabase = await createClient();

    await supabase.from('delivery_metrics').insert({
      provider,
      attempt_number: attempt.attemptNumber,
      status: attempt.status,
      error_code: attempt.errorCode,
      response_time: attempt.responseTime,
      timestamp: attempt.timestamp,
    });
  }

  private isHardBounce(errorCode?: string): boolean {
    const hardBounceErrors = [
      'HARD_BOUNCE',
      'INVALID_EMAIL',
      'INVALID_PHONE',
      'UNSUBSCRIBED',
      'BLOCKED',
      'SPAM_COMPLAINT',
    ];

    return errorCode ? hardBounceErrors.includes(errorCode) : false;
  }

  private async markAsHardBounce(
    message: any,
    attempt: DeliveryAttempt,
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('bounced_recipients').insert({
      recipient_id: message.recipientId,
      message_id: message.id,
      bounce_type: 'hard',
      error_code: attempt.errorCode,
      error_message: attempt.errorMessage,
      bounced_at: new Date().toISOString(),
    });

    // Mark recipient as inactive
    await supabase
      .from('recipients')
      .update({
        is_active: false,
        bounce_status: 'hard_bounce',
      })
      .eq('id', message.recipientId);
  }

  private async markAsFailed(
    message: any,
    attempt: DeliveryAttempt,
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('failed_messages').insert({
      message_id: message.id,
      final_attempt: attempt.attemptNumber,
      error_code: attempt.errorCode,
      error_message: attempt.errorMessage,
      failed_at: new Date().toISOString(),
    });
  }

  public getProviderHealth(): Map<string, ProviderHealth> {
    return new Map(this.providerHealthMap);
  }

  public getDeliveryMetrics(): any {
    return {
      ...this.deliveryMetrics,
      successRate:
        this.deliveryMetrics.totalAttempts > 0
          ? (this.deliveryMetrics.successfulDeliveries /
              this.deliveryMetrics.totalAttempts) *
            100
          : 0,
      bounceRate:
        this.deliveryMetrics.totalAttempts > 0
          ? (this.deliveryMetrics.bouncedMessages /
              this.deliveryMetrics.totalAttempts) *
            100
          : 0,
    };
  }
}
