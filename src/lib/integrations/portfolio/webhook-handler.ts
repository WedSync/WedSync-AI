import { BaseIntegrationService } from '../BaseIntegrationService';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  IntegrationError,
  ErrorCategory,
} from '@/types/integrations';
import crypto from 'crypto';

interface WebhookEvent {
  id: string;
  source: string;
  type:
    | 'ai_analysis_complete'
    | 'image_processed'
    | 'cdn_cache_invalidated'
    | 'external_update';
  data: Record<string, any>;
  timestamp: Date;
  signature?: string;
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead';
}

interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: Date | null;
  state: 'closed' | 'open' | 'half-open';
  nextAttempt: Date | null;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
}

interface EventSubscriber {
  id: string;
  pattern: string;
  endpoint: string;
  secret: string;
  active: boolean;
  retryConfig: RetryConfig;
  circuitBreaker: CircuitBreakerState;
}

export class WebhookHandler extends BaseIntegrationService {
  protected serviceName = 'Webhook Handler';
  private eventQueue: WebhookEvent[] = [];
  private subscribers: Map<string, EventSubscriber> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private deadLetterQueue: WebhookEvent[] = [];
  private eventHistory: Map<string, WebhookEvent> = new Map();

  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    exponentialBase: 2,
  };

  constructor(config: IntegrationConfig, credentials: IntegrationCredentials) {
    super(config, credentials);
    this.startEventProcessor();
    this.initializeSubscribers();
  }

  private initializeSubscribers(): void {
    // Initialize common webhook subscribers
    const defaultSubscribers: Array<Omit<EventSubscriber, 'circuitBreaker'>> = [
      {
        id: 'ai-service-callback',
        pattern: 'ai_analysis_complete',
        endpoint: `${this.config.apiUrl}/webhooks/ai-complete`,
        secret: process.env.WEBHOOK_SECRET_AI || '',
        active: true,
        retryConfig: this.defaultRetryConfig,
      },
      {
        id: 'image-processing-callback',
        pattern: 'image_processed',
        endpoint: `${this.config.apiUrl}/webhooks/image-processed`,
        secret: process.env.WEBHOOK_SECRET_IMAGE || '',
        active: true,
        retryConfig: this.defaultRetryConfig,
      },
      {
        id: 'cdn-invalidation-callback',
        pattern: 'cdn_cache_invalidated',
        endpoint: `${this.config.apiUrl}/webhooks/cdn-invalidated`,
        secret: process.env.WEBHOOK_SECRET_CDN || '',
        active: true,
        retryConfig: this.defaultRetryConfig,
      },
    ];

    defaultSubscribers.forEach((subscriber) => {
      this.subscribers.set(subscriber.id, {
        ...subscriber,
        circuitBreaker: {
          failureCount: 0,
          lastFailureTime: null,
          state: 'closed',
          nextAttempt: null,
        },
      });
    });
  }

  async validateConnection(): Promise<boolean> {
    try {
      // Test webhook endpoint availability
      const response = await fetch(`${this.config.apiUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      } as RequestInit);

      return response.ok;
    } catch (error) {
      console.error('Webhook service validation failed:', error);
      return false;
    }
  }

  async refreshToken(): Promise<string> {
    return this.credentials.apiKey;
  }

  protected async makeRequest(
    endpoint: string,
    options?: any,
  ): Promise<IntegrationResponse> {
    const url = `${this.config.apiUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: options?.method || 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.apiKey}`,
          'Content-Type': 'application/json',
          'X-Webhook-Signature': options?.signature || '',
          ...options?.headers,
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        throw new IntegrationError(
          `Webhook request failed with status ${response.status}`,
          'WEBHOOK_REQUEST_FAILED',
          ErrorCategory.EXTERNAL_API,
        );
      }

      const data = response.status !== 204 ? await response.json() : null;
      return {
        success: true,
        data,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new IntegrationError(
        'Webhook request execution failed',
        'WEBHOOK_EXECUTION_FAILED',
        ErrorCategory.EXTERNAL_API,
        error as Error,
      );
    }
  }

  async receiveWebhook(
    source: string,
    eventType: WebhookEvent['type'],
    payload: Record<string, any>,
    signature?: string,
  ): Promise<{ received: boolean; eventId: string }> {
    try {
      // Validate webhook signature
      if (signature && !this.validateSignature(payload, signature, source)) {
        throw new IntegrationError(
          'Invalid webhook signature',
          'INVALID_SIGNATURE',
          ErrorCategory.AUTHENTICATION,
        );
      }

      const event: WebhookEvent = {
        id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source,
        type: eventType,
        data: payload,
        timestamp: new Date(),
        signature,
        retryCount: 0,
        status: 'pending',
      };

      this.eventQueue.push(event);
      this.eventHistory.set(event.id, event);

      console.log(`Webhook event received: ${event.id} from ${source}`);

      return {
        received: true,
        eventId: event.id,
      };
    } catch (error) {
      throw new IntegrationError(
        'Failed to receive webhook',
        'WEBHOOK_RECEIVE_FAILED',
        ErrorCategory.VALIDATION,
        error as Error,
      );
    }
  }

  private validateSignature(
    payload: Record<string, any>,
    signature: string,
    source: string,
  ): boolean {
    const subscriber = Array.from(this.subscribers.values()).find((sub) =>
      sub.pattern.includes(source),
    );

    if (!subscriber?.secret) {
      console.warn(`No secret configured for source: ${source}`);
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', subscriber.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex'),
    );
  }

  async publishEvent(
    eventType: WebhookEvent['type'],
    data: Record<string, any>,
    source: string = 'internal',
  ): Promise<string> {
    const event: WebhookEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source,
      type: eventType,
      data,
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
    };

    this.eventQueue.push(event);
    this.eventHistory.set(event.id, event);

    console.log(`Event published: ${event.id} of type ${eventType}`);

    return event.id;
  }

  private startEventProcessor(): void {
    this.processingInterval = setInterval(() => {
      this.processEventQueue();
    }, 1000); // Process events every second
  }

  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = this.eventQueue.splice(0, 10); // Process up to 10 events at once

    for (const event of events) {
      await this.processEvent(event);
    }
  }

  private async processEvent(event: WebhookEvent): Promise<void> {
    event.status = 'processing';

    try {
      // Find matching subscribers
      const matchingSubscribers = Array.from(this.subscribers.values()).filter(
        (subscriber) =>
          subscriber.active &&
          this.matchesPattern(event.type, subscriber.pattern),
      );

      if (matchingSubscribers.length === 0) {
        console.log(`No subscribers found for event type: ${event.type}`);
        event.status = 'completed';
        return;
      }

      // Send event to all matching subscribers
      const deliveryPromises = matchingSubscribers.map((subscriber) =>
        this.deliverToSubscriber(event, subscriber),
      );

      await Promise.allSettled(deliveryPromises);
      event.status = 'completed';
    } catch (error) {
      console.error(`Failed to process event ${event.id}:`, error);
      await this.handleEventFailure(event, error as Error);
    }
  }

  private matchesPattern(eventType: string, pattern: string): boolean {
    // Simple pattern matching - could be enhanced with regex
    if (pattern === '*') return true;
    if (pattern === eventType) return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return eventType.startsWith(prefix);
    }
    return false;
  }

  private async deliverToSubscriber(
    event: WebhookEvent,
    subscriber: EventSubscriber,
  ): Promise<void> {
    const circuitBreaker = subscriber.circuitBreaker;

    // Check circuit breaker
    if (circuitBreaker.state === 'open') {
      if (
        !circuitBreaker.nextAttempt ||
        new Date() < circuitBreaker.nextAttempt
      ) {
        console.log(
          `Circuit breaker open for subscriber ${subscriber.id}, skipping delivery`,
        );
        return;
      }

      // Try to transition to half-open
      circuitBreaker.state = 'half-open';
    }

    try {
      const signature = this.generateSignature(event.data, subscriber.secret);

      const response = await fetch(subscriber.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Type': event.type,
          'X-Event-ID': event.id,
          'X-Event-Source': event.source,
          'X-Signature': `sha256=${signature}`,
          'User-Agent': 'WedSync-Webhook/1.0',
        },
        body: JSON.stringify({
          id: event.id,
          type: event.type,
          source: event.source,
          timestamp: event.timestamp.toISOString(),
          data: event.data,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Success - reset circuit breaker if it was half-open
      if (circuitBreaker.state === 'half-open') {
        circuitBreaker.state = 'closed';
        circuitBreaker.failureCount = 0;
        circuitBreaker.lastFailureTime = null;
        circuitBreaker.nextAttempt = null;
      }

      console.log(`Event ${event.id} delivered to ${subscriber.id}`);
    } catch (error) {
      this.handleSubscriberFailure(subscriber, error as Error);
      throw error;
    }
  }

  private generateSignature(data: Record<string, any>, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private handleSubscriberFailure(
    subscriber: EventSubscriber,
    error: Error,
  ): void {
    const circuitBreaker = subscriber.circuitBreaker;

    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = new Date();

    // Open circuit breaker if failure threshold reached
    if (circuitBreaker.failureCount >= 5) {
      circuitBreaker.state = 'open';
      circuitBreaker.nextAttempt = new Date(Date.now() + 60000); // 1 minute
      console.warn(`Circuit breaker opened for subscriber ${subscriber.id}`);
    }

    console.error(`Delivery failed to ${subscriber.id}:`, error.message);
  }

  private async handleEventFailure(
    event: WebhookEvent,
    error: Error,
  ): Promise<void> {
    event.retryCount++;

    if (event.retryCount >= this.defaultRetryConfig.maxRetries) {
      // Move to dead letter queue
      event.status = 'dead';
      this.deadLetterQueue.push(event);
      console.error(
        `Event ${event.id} moved to dead letter queue after ${event.retryCount} retries`,
      );
      return;
    }

    // Calculate retry delay with exponential backoff
    const delay = Math.min(
      this.defaultRetryConfig.baseDelay *
        Math.pow(this.defaultRetryConfig.exponentialBase, event.retryCount - 1),
      this.defaultRetryConfig.maxDelay,
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    const totalDelay = delay + jitter;

    console.log(
      `Retrying event ${event.id} in ${totalDelay}ms (attempt ${event.retryCount})`,
    );

    setTimeout(() => {
      event.status = 'pending';
      this.eventQueue.push(event);
    }, totalDelay);
  }

  async addSubscriber(
    subscriber: Omit<EventSubscriber, 'circuitBreaker'>,
  ): Promise<void> {
    this.subscribers.set(subscriber.id, {
      ...subscriber,
      circuitBreaker: {
        failureCount: 0,
        lastFailureTime: null,
        state: 'closed',
        nextAttempt: null,
      },
    });

    console.log(
      `Subscriber added: ${subscriber.id} for pattern ${subscriber.pattern}`,
    );
  }

  async removeSubscriber(subscriberId: string): Promise<void> {
    this.subscribers.delete(subscriberId);
    console.log(`Subscriber removed: ${subscriberId}`);
  }

  async updateSubscriber(
    subscriberId: string,
    updates: Partial<EventSubscriber>,
  ): Promise<void> {
    const existing = this.subscribers.get(subscriberId);
    if (!existing) {
      throw new IntegrationError(
        `Subscriber ${subscriberId} not found`,
        'SUBSCRIBER_NOT_FOUND',
        ErrorCategory.VALIDATION,
      );
    }

    this.subscribers.set(subscriberId, {
      ...existing,
      ...updates,
      circuitBreaker: existing.circuitBreaker, // Preserve circuit breaker state
    });

    console.log(`Subscriber updated: ${subscriberId}`);
  }

  getEventStatus(eventId: string): WebhookEvent | null {
    return this.eventHistory.get(eventId) || null;
  }

  getQueueStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetterQueue: number;
    activeSubscribers: number;
  } {
    const events = Array.from(this.eventHistory.values());

    return {
      pending: this.eventQueue.length,
      processing: events.filter((e) => e.status === 'processing').length,
      completed: events.filter((e) => e.status === 'completed').length,
      failed: events.filter((e) => e.status === 'failed').length,
      deadLetterQueue: this.deadLetterQueue.length,
      activeSubscribers: Array.from(this.subscribers.values()).filter(
        (s) => s.active,
      ).length,
    };
  }

  getCircuitBreakerStatus(): Array<{
    subscriberId: string;
    state: string;
    failureCount: number;
    lastFailure?: Date;
    nextAttempt?: Date;
  }> {
    return Array.from(this.subscribers.entries()).map(([id, subscriber]) => ({
      subscriberId: id,
      state: subscriber.circuitBreaker.state,
      failureCount: subscriber.circuitBreaker.failureCount,
      lastFailure: subscriber.circuitBreaker.lastFailureTime || undefined,
      nextAttempt: subscriber.circuitBreaker.nextAttempt || undefined,
    }));
  }

  async reprocessDeadLetterQueue(): Promise<{
    reprocessed: number;
    stillDead: number;
  }> {
    const deadEvents = [...this.deadLetterQueue];
    this.deadLetterQueue = [];

    let reprocessed = 0;
    let stillDead = 0;

    for (const event of deadEvents) {
      // Reset retry count and try again
      event.retryCount = 0;
      event.status = 'pending';

      try {
        await this.processEvent(event);
        if (event.status === 'completed') {
          reprocessed++;
        } else {
          this.deadLetterQueue.push(event);
          stillDead++;
        }
      } catch (error) {
        this.deadLetterQueue.push(event);
        stillDead++;
      }
    }

    console.log(
      `Dead letter queue reprocessing: ${reprocessed} successful, ${stillDead} still failed`,
    );

    return { reprocessed, stillDead };
  }

  async cleanup(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    console.log('Webhook handler cleanup completed');
  }

  async enableHealthCheck(): Promise<void> {
    // Set up periodic health checks for subscribers
    setInterval(async () => {
      for (const [id, subscriber] of this.subscribers.entries()) {
        if (!subscriber.active) continue;

        try {
          const response = await fetch(subscriber.endpoint, {
            method: 'HEAD',
            timeout: 5000,
          } as RequestInit);

          if (!response.ok && subscriber.circuitBreaker.state === 'closed') {
            console.warn(
              `Subscriber ${id} health check failed: ${response.status}`,
            );
          }
        } catch (error) {
          if (subscriber.circuitBreaker.state === 'closed') {
            console.warn(`Subscriber ${id} health check error:`, error);
          }
        }
      }
    }, 300000); // Check every 5 minutes
  }

  async getEventHistory(limit: number = 100): Promise<WebhookEvent[]> {
    return Array.from(this.eventHistory.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}
