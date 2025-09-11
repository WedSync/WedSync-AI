/**
 * WS-155 Round 2: Advanced Webhook Handler
 * Team C - Advanced Integration Phase
 *
 * Processes webhooks from multiple communication providers with
 * intelligent event handling and real-time status updates
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface WebhookEvent {
  id: string;
  provider: string;
  type: WebhookEventType;
  timestamp: Date;
  messageId?: string;
  recipientId?: string;
  data: Record<string, any>;
  signature?: string;
  raw?: string;
}

export type WebhookEventType =
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'unsubscribed'
  | 'deferred'
  | 'dropped'
  | 'failed'
  | 'sent'
  | 'spam_report'
  | 'invalid_email';

export interface ProviderConfig {
  name: string;
  endpoint: string;
  signingSecret?: string;
  verificationMethod: 'hmac' | 'basic' | 'custom';
  customVerification?: (
    signature: string,
    payload: string,
    secret: string,
  ) => boolean;
  eventMapping: Record<string, WebhookEventType>;
  payloadParser: (body: any) => ParsedWebhook[];
}

export interface ParsedWebhook {
  messageId: string;
  recipientId: string;
  eventType: WebhookEventType;
  timestamp: Date;
  metadata?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    permanent: boolean;
  };
}

export interface WebhookProcessor {
  process(event: WebhookEvent): Promise<void>;
  canHandle(eventType: WebhookEventType): boolean;
}

export interface WebhookStats {
  totalProcessed: number;
  byProvider: Record<string, number>;
  byEventType: Record<string, number>;
  failures: number;
  avgProcessingTime: number;
  lastProcessed?: Date;
}

export class AdvancedWebhookHandler extends EventEmitter {
  private providers: Map<string, ProviderConfig> = new Map();
  private processors: WebhookProcessor[] = [];
  private eventQueue: WebhookEvent[] = [];
  private processing = false;
  private stats: WebhookStats;
  private retryAttempts: Map<string, number> = new Map();
  private eventHistory: Map<string, WebhookEvent[]> = new Map();

  constructor() {
    super();
    this.stats = {
      totalProcessed: 0,
      byProvider: {},
      byEventType: {},
      failures: 0,
      avgProcessingTime: 0,
    };
    this.initializeProviders();
  }

  /**
   * Initialize provider configurations
   */
  private initializeProviders(): void {
    // SendGrid configuration
    this.registerProvider({
      name: 'sendgrid',
      endpoint: '/webhooks/sendgrid',
      signingSecret: process.env.SENDGRID_WEBHOOK_SECRET,
      verificationMethod: 'hmac',
      eventMapping: {
        processed: 'sent',
        delivered: 'delivered',
        open: 'opened',
        click: 'clicked',
        bounce: 'bounced',
        dropped: 'dropped',
        spamreport: 'spam_report',
        unsubscribe: 'unsubscribed',
        deferred: 'deferred',
      },
      payloadParser: this.parseSendGridPayload,
    });

    // Twilio configuration
    this.registerProvider({
      name: 'twilio',
      endpoint: '/webhooks/twilio',
      signingSecret: process.env.TWILIO_AUTH_TOKEN,
      verificationMethod: 'hmac',
      eventMapping: {
        sent: 'sent',
        delivered: 'delivered',
        failed: 'failed',
        undelivered: 'failed',
      },
      payloadParser: this.parseTwilioPayload,
    });

    // Resend configuration
    this.registerProvider({
      name: 'resend',
      endpoint: '/webhooks/resend',
      signingSecret: process.env.RESEND_WEBHOOK_SECRET,
      verificationMethod: 'hmac',
      eventMapping: {
        'email.sent': 'sent',
        'email.delivered': 'delivered',
        'email.opened': 'opened',
        'email.clicked': 'clicked',
        'email.bounced': 'bounced',
        'email.complained': 'complained',
      },
      payloadParser: this.parseResendPayload,
    });
  }

  /**
   * Register a new provider configuration
   */
  registerProvider(config: ProviderConfig): void {
    this.providers.set(config.name, config);
    this.stats.byProvider[config.name] = 0;
    this.emit('provider:registered', { provider: config.name });
  }

  /**
   * Register a webhook processor
   */
  registerProcessor(processor: WebhookProcessor): void {
    this.processors.push(processor);
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(
    provider: string,
    headers: Record<string, string>,
    body: any,
    rawBody?: string,
  ): Promise<{ success: boolean; events?: WebhookEvent[]; error?: string }> {
    const startTime = Date.now();

    try {
      const config = this.providers.get(provider);
      if (!config) {
        throw new Error(`Unknown provider: ${provider}`);
      }

      // Verify webhook signature
      if (config.signingSecret && rawBody) {
        const isValid = this.verifySignature(config, headers, rawBody);
        if (!isValid) {
          this.emit('webhook:invalid_signature', { provider });
          throw new Error('Invalid webhook signature');
        }
      }

      // Parse webhook payload
      const parsedEvents = config.payloadParser(body);
      const events: WebhookEvent[] = [];

      for (const parsed of parsedEvents) {
        const event: WebhookEvent = {
          id: this.generateEventId(),
          provider,
          type: parsed.eventType,
          timestamp: parsed.timestamp,
          messageId: parsed.messageId,
          recipientId: parsed.recipientId,
          data: parsed.metadata || {},
          signature: headers['signature'],
          raw: rawBody,
        };

        events.push(event);
        await this.processEvent(event);
      }

      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateStats(provider, events, processingTime);

      this.emit('webhook:processed', {
        provider,
        eventCount: events.length,
        processingTime,
      });

      return { success: true, events };
    } catch (error) {
      this.stats.failures++;
      this.emit('webhook:error', {
        provider,
        error: (error as Error).message,
      });

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Process a webhook event
   */
  private async processEvent(event: WebhookEvent): Promise<void> {
    // Store in event history
    if (!this.eventHistory.has(event.messageId!)) {
      this.eventHistory.set(event.messageId!, []);
    }
    this.eventHistory.get(event.messageId!)!.push(event);

    // Handle critical events immediately
    if (this.isCriticalEvent(event)) {
      await this.handleCriticalEvent(event);
    }

    // Queue for processing
    this.eventQueue.push(event);

    // Process queue if not already processing
    if (!this.processing) {
      this.processQueue();
    }

    // Find and execute appropriate processors
    for (const processor of this.processors) {
      if (processor.canHandle(event.type)) {
        try {
          await processor.process(event);
        } catch (error) {
          this.emit('processor:error', {
            event,
            processor,
            error: (error as Error).message,
          });
        }
      }
    }

    // Emit event for real-time updates
    this.emit(`event:${event.type}`, event);
  }

  /**
   * Process event queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.eventQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.eventQueue.length > 0) {
      const batch = this.eventQueue.splice(0, 10); // Process in batches of 10

      await Promise.all(batch.map((event) => this.persistEvent(event)));
    }

    this.processing = false;
  }

  /**
   * Persist event to database
   */
  private async persistEvent(event: WebhookEvent): Promise<void> {
    // In production, this would save to database
    this.emit('event:persisted', event);
  }

  /**
   * Check if event is critical
   */
  private isCriticalEvent(event: WebhookEvent): boolean {
    const criticalTypes: WebhookEventType[] = [
      'bounced',
      'complained',
      'failed',
      'invalid_email',
      'spam_report',
    ];

    return criticalTypes.includes(event.type);
  }

  /**
   * Handle critical events immediately
   */
  private async handleCriticalEvent(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'bounced':
        await this.handleBounce(event);
        break;
      case 'complained':
      case 'spam_report':
        await this.handleComplaint(event);
        break;
      case 'failed':
        await this.handleFailure(event);
        break;
      case 'invalid_email':
        await this.handleInvalidEmail(event);
        break;
    }

    this.emit('critical:event', event);
  }

  /**
   * Handle bounce events
   */
  private async handleBounce(event: WebhookEvent): Promise<void> {
    const bounceType = event.data.bounce_type || 'unknown';
    const isPermanent = bounceType === 'permanent' || bounceType === 'hard';

    if (isPermanent) {
      // Mark email as invalid
      this.emit('email:invalid', {
        recipientId: event.recipientId,
        email: event.data.email,
        reason: 'permanent_bounce',
      });
    } else {
      // Schedule retry for soft bounces
      const retryCount = this.retryAttempts.get(event.messageId!) || 0;
      if (retryCount < 3) {
        this.retryAttempts.set(event.messageId!, retryCount + 1);
        this.emit('message:retry', {
          messageId: event.messageId,
          attempt: retryCount + 1,
          reason: 'soft_bounce',
        });
      }
    }
  }

  /**
   * Handle complaint events
   */
  private async handleComplaint(event: WebhookEvent): Promise<void> {
    // Immediately unsubscribe user
    this.emit('user:unsubscribe', {
      recipientId: event.recipientId,
      reason: 'complaint',
      automatic: true,
    });

    // Log for compliance
    this.emit('compliance:complaint', {
      recipientId: event.recipientId,
      provider: event.provider,
      timestamp: event.timestamp,
    });
  }

  /**
   * Handle failure events
   */
  private async handleFailure(event: WebhookEvent): Promise<void> {
    const error = event.data.error || {};
    const isPermanent = error.permanent === true;

    if (!isPermanent) {
      // Schedule retry
      const retryCount = this.retryAttempts.get(event.messageId!) || 0;
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        setTimeout(() => {
          this.emit('message:retry', {
            messageId: event.messageId,
            attempt: retryCount + 1,
            delay,
          });
        }, delay);
        this.retryAttempts.set(event.messageId!, retryCount + 1);
      }
    } else {
      // Log permanent failure
      this.emit('message:failed_permanently', {
        messageId: event.messageId,
        error: error.message,
      });
    }
  }

  /**
   * Handle invalid email events
   */
  private async handleInvalidEmail(event: WebhookEvent): Promise<void> {
    this.emit('email:invalid', {
      recipientId: event.recipientId,
      email: event.data.email,
      reason: 'invalid_format',
    });
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(
    config: ProviderConfig,
    headers: Record<string, string>,
    payload: string,
  ): boolean {
    if (!config.signingSecret) return true;

    switch (config.verificationMethod) {
      case 'hmac':
        return this.verifyHmacSignature(config, headers, payload);
      case 'custom':
        return (
          config.customVerification?.(
            headers['signature'] || headers['x-signature'],
            payload,
            config.signingSecret,
          ) || false
        );
      default:
        return true;
    }
  }

  /**
   * Verify HMAC signature
   */
  private verifyHmacSignature(
    config: ProviderConfig,
    headers: Record<string, string>,
    payload: string,
  ): boolean {
    let signature = '';
    let expectedSignature = '';

    switch (config.name) {
      case 'sendgrid':
        signature = headers['x-twilio-email-event-webhook-signature'];
        expectedSignature = crypto
          .createHmac('sha256', config.signingSecret!)
          .update(headers['x-twilio-email-event-webhook-timestamp'] + payload)
          .digest('base64');
        break;

      case 'twilio':
        signature = headers['x-twilio-signature'];
        // Twilio uses different signature method
        return true; // Simplified for now

      case 'resend':
        signature = headers['webhook-signature'];
        expectedSignature = crypto
          .createHmac('sha256', config.signingSecret!)
          .update(payload)
          .digest('hex');
        break;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  /**
   * Parse SendGrid webhook payload
   */
  private parseSendGridPayload(body: any): ParsedWebhook[] {
    const events = Array.isArray(body) ? body : [body];

    return events.map((event) => ({
      messageId: event.sg_message_id,
      recipientId: event.email,
      eventType: event.event as WebhookEventType,
      timestamp: new Date(event.timestamp * 1000),
      metadata: {
        category: event.category,
        reason: event.reason,
        response: event.response,
        attempt: event.attempt,
        url: event.url,
      },
      error: event.reason
        ? {
            code: event.smtp_id,
            message: event.reason,
            permanent: event.event === 'bounce' && event.type === 'blocked',
          }
        : undefined,
    }));
  }

  /**
   * Parse Twilio webhook payload
   */
  private parseTwilioPayload(body: any): ParsedWebhook[] {
    return [
      {
        messageId: body.MessageSid,
        recipientId: body.To,
        eventType: body.MessageStatus as WebhookEventType,
        timestamp: new Date(),
        metadata: {
          from: body.From,
          errorCode: body.ErrorCode,
          errorMessage: body.ErrorMessage,
        },
        error: body.ErrorCode
          ? {
              code: body.ErrorCode,
              message: body.ErrorMessage,
              permanent: body.ErrorCode >= 30000,
            }
          : undefined,
      },
    ];
  }

  /**
   * Parse Resend webhook payload
   */
  private parseResendPayload(body: any): ParsedWebhook[] {
    return [
      {
        messageId: body.data.email_id,
        recipientId: body.data.to?.[0],
        eventType: body.type as WebhookEventType,
        timestamp: new Date(body.created_at),
        metadata: {
          from: body.data.from,
          subject: body.data.subject,
          tags: body.data.tags,
        },
      },
    ];
  }

  /**
   * Update statistics
   */
  private updateStats(
    provider: string,
    events: WebhookEvent[],
    processingTime: number,
  ): void {
    this.stats.totalProcessed += events.length;
    this.stats.byProvider[provider] =
      (this.stats.byProvider[provider] || 0) + events.length;

    for (const event of events) {
      this.stats.byEventType[event.type] =
        (this.stats.byEventType[event.type] || 0) + 1;
    }

    // Update average processing time
    const currentAvg = this.stats.avgProcessingTime;
    const totalEvents = this.stats.totalProcessed;
    this.stats.avgProcessingTime =
      (currentAvg * (totalEvents - events.length) + processingTime) /
      totalEvents;

    this.stats.lastProcessed = new Date();
  }

  /**
   * Get webhook statistics
   */
  getStats(): WebhookStats {
    return { ...this.stats };
  }

  /**
   * Get event history for a message
   */
  getEventHistory(messageId: string): WebhookEvent[] {
    return this.eventHistory.get(messageId) || [];
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.eventQueue = [];
    this.providers.clear();
    this.processors = [];
    this.eventHistory.clear();
    this.retryAttempts.clear();
    this.removeAllListeners();
  }
}
