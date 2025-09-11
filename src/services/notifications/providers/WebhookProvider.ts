import crypto from 'crypto';
import type {
  NotificationChannelProvider,
  ProcessedNotification,
  NotificationDeliveryResult,
  NotificationEvent,
} from '../../../types/notification-backend';

interface WebhookPayload {
  id: string;
  type: string;
  data: {
    notification: ProcessedNotification;
    wedding: {
      id: string;
      title: string;
      date: string;
    };
    timestamp: string;
    signature: string;
  };
}

interface WebhookEndpoint {
  url: string;
  secret: string;
  events: string[];
  headers?: Record<string, string>;
  retry?: {
    attempts: number;
    backoffMs: number;
  };
}

export class WebhookNotificationProvider
  implements NotificationChannelProvider
{
  private readonly maxRetries = 3;
  private readonly initialBackoffMs = 1000;
  private readonly timeoutMs = 10000; // 10 seconds

  async send(
    notification: ProcessedNotification,
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();

    try {
      // Parse webhook endpoint from recipientId (should be a JSON string)
      let webhookEndpoint: WebhookEndpoint;
      try {
        webhookEndpoint = JSON.parse(notification.recipientId);
      } catch (error) {
        return {
          success: false,
          channel: 'webhook',
          providerId: 'http',
          recipientId: notification.recipientId,
          messageId: '',
          timestamp: new Date(),
          error: 'Invalid webhook endpoint configuration',
          latency: Date.now() - startTime,
        };
      }

      // Validate webhook endpoint
      if (!this.isValidWebhookEndpoint(webhookEndpoint)) {
        return {
          success: false,
          channel: 'webhook',
          providerId: 'http',
          recipientId: notification.recipientId,
          messageId: '',
          timestamp: new Date(),
          error: 'Invalid webhook endpoint URL or configuration',
          latency: Date.now() - startTime,
        };
      }

      // Check if this event type should be sent to this endpoint
      if (
        !this.shouldSendToEndpoint(notification.event.type, webhookEndpoint)
      ) {
        return {
          success: false,
          channel: 'webhook',
          providerId: 'http',
          recipientId: notification.recipientId,
          messageId: '',
          timestamp: new Date(),
          error: 'Event type not configured for this webhook endpoint',
          latency: Date.now() - startTime,
        };
      }

      // Generate webhook payload
      const payload = this.generateWebhookPayload(
        notification,
        webhookEndpoint,
      );

      // Send webhook with retries
      const deliveryResult = await this.sendWebhookWithRetries(
        webhookEndpoint,
        payload,
        notification,
      );

      return {
        ...deliveryResult,
        latency: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        channel: 'webhook',
        providerId: 'http',
        recipientId: notification.recipientId,
        messageId: '',
        timestamp: new Date(),
        error: error.message || 'Webhook delivery failed',
        latency: Date.now() - startTime,
      };
    }
  }

  async getProviderStatus(): Promise<{
    healthy: boolean;
    latency: number;
    errorRate: number;
  }> {
    const startTime = Date.now();

    // For webhook provider, we just check if we can make HTTP requests
    // In a real implementation, you might ping a health check endpoint
    try {
      return {
        healthy: true, // Assume healthy unless we have metrics showing otherwise
        latency: Date.now() - startTime,
        errorRate: 0, // Would be calculated from historical delivery data
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        errorRate: 1,
      };
    }
  }

  private isValidWebhookEndpoint(endpoint: any): endpoint is WebhookEndpoint {
    return (
      typeof endpoint === 'object' &&
      typeof endpoint.url === 'string' &&
      this.isValidUrl(endpoint.url) &&
      typeof endpoint.secret === 'string' &&
      endpoint.secret.length > 0 &&
      Array.isArray(endpoint.events)
    );
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  private shouldSendToEndpoint(
    eventType: string,
    endpoint: WebhookEndpoint,
  ): boolean {
    // Check if the endpoint is configured to receive this event type
    return endpoint.events.includes(eventType) || endpoint.events.includes('*');
  }

  private generateWebhookPayload(
    notification: ProcessedNotification,
    endpoint: WebhookEndpoint,
  ): WebhookPayload {
    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      type: `wedsync.notification.${notification.event.type}`,
      data: {
        notification: {
          ...notification,
          // Remove sensitive data that shouldn't be sent to webhooks
          recipientId: 'redacted',
        },
        wedding: {
          id: notification.event.weddingId || '',
          title: notification.event.context?.weddingTitle || '',
          date: notification.event.context?.weddingDate || '',
        },
        timestamp: new Date().toISOString(),
        signature: '', // Will be set below
      },
    };

    // Generate HMAC signature for payload verification
    payload.data.signature = this.generateSignature(payload, endpoint.secret);

    return payload;
  }

  private generateSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload.data, (key, value) => {
      // Exclude the signature field itself from signing
      return key === 'signature' ? undefined : value;
    });

    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  private async sendWebhookWithRetries(
    endpoint: WebhookEndpoint,
    payload: WebhookPayload,
    notification: ProcessedNotification,
  ): Promise<NotificationDeliveryResult> {
    const retryConfig = endpoint.retry || {
      attempts: this.maxRetries,
      backoffMs: this.initialBackoffMs,
    };
    let lastError: string = '';

    for (let attempt = 0; attempt <= retryConfig.attempts; attempt++) {
      try {
        const result = await this.sendWebhook(endpoint, payload, notification);
        if (result.success) {
          return result;
        }
        lastError = result.error || 'Unknown error';

        // If this is not the last attempt, wait before retrying
        if (attempt < retryConfig.attempts) {
          const backoffTime = retryConfig.backoffMs * Math.pow(2, attempt);
          await this.sleep(backoffTime);
        }
      } catch (error: any) {
        lastError = error.message || 'Network error';

        // If this is not the last attempt, wait before retrying
        if (attempt < retryConfig.attempts) {
          const backoffTime = retryConfig.backoffMs * Math.pow(2, attempt);
          await this.sleep(backoffTime);
        }
      }
    }

    // All attempts failed
    return {
      success: false,
      channel: 'webhook',
      providerId: 'http',
      recipientId: notification.recipientId,
      messageId: '',
      timestamp: new Date(),
      error: `Webhook delivery failed after ${retryConfig.attempts + 1} attempts: ${lastError}`,
    };
  }

  private async sendWebhook(
    endpoint: WebhookEndpoint,
    payload: WebhookPayload,
    notification: ProcessedNotification,
  ): Promise<NotificationDeliveryResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'WedSync-Webhook/1.0',
        'X-WedSync-Delivery': payload.id,
        'X-WedSync-Event': payload.type,
        'X-WedSync-Signature': payload.data.signature,
        'X-WedSync-Timestamp': payload.data.timestamp,
        'X-WedSync-Wedding-ID': notification.event.weddingId || '',
        ...endpoint.headers,
      };

      // Send the webhook
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check response status
      if (response.ok) {
        return {
          success: true,
          channel: 'webhook',
          providerId: 'http',
          recipientId: notification.recipientId,
          messageId: payload.id,
          timestamp: new Date(),
          metadata: {
            httpStatus: response.status,
            httpStatusText: response.statusText,
            responseHeaders: Object.fromEntries(response.headers.entries()),
            deliveryAttempt: 1,
          },
        };
      } else {
        // Handle different HTTP error statuses
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        if (response.status >= 400 && response.status < 500) {
          // Client error - don't retry
          errorMessage += ' (client error - not retrying)';
        } else if (response.status >= 500) {
          // Server error - will retry
          errorMessage += ' (server error - will retry)';
        }

        return {
          success: false,
          channel: 'webhook',
          providerId: 'http',
          recipientId: notification.recipientId,
          messageId: payload.id,
          timestamp: new Date(),
          error: errorMessage,
          metadata: {
            httpStatus: response.status,
            httpStatusText: response.statusText,
            shouldRetry: response.status >= 500,
          },
        };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      let errorMessage = 'Network error';
      if (error.name === 'AbortError') {
        errorMessage = `Request timeout after ${this.timeoutMs}ms`;
      } else if (
        error instanceof TypeError &&
        error.message.includes('fetch')
      ) {
        errorMessage = 'Network connection failed';
      } else {
        errorMessage = error.message || 'Unknown network error';
      }

      return {
        success: false,
        channel: 'webhook',
        providerId: 'http',
        recipientId: notification.recipientId,
        messageId: payload.id,
        timestamp: new Date(),
        error: errorMessage,
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Utility method to create webhook endpoint configurations
  static createEndpoint(
    url: string,
    secret: string,
    events: string[] = ['*'],
    options: {
      headers?: Record<string, string>;
      retryAttempts?: number;
      retryBackoffMs?: number;
    } = {},
  ): string {
    const endpoint: WebhookEndpoint = {
      url,
      secret,
      events,
      headers: options.headers,
      retry: {
        attempts: options.retryAttempts || 3,
        backoffMs: options.retryBackoffMs || 1000,
      },
    };

    return JSON.stringify(endpoint);
  }

  // Utility method to validate webhook signatures (for the receiving end)
  static validateSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  }
}
