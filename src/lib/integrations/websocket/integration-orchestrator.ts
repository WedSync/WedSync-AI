import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export interface ChannelEvent {
  id: string;
  channelName: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
  organizationId: string;
  weddingId?: string;
  metadata?: Record<string, unknown>;
}

export interface ExternalSystem {
  id: string;
  name: string;
  type: 'photography-crm' | 'venue-management' | 'whatsapp' | 'slack' | 'email';
  config: ExternalSystemConfig;
  isActive: boolean;
}

export interface ExternalSystemConfig {
  webhookUrl?: string;
  apiKey?: string;
  secretKey?: string;
  authToken?: string;
  customSettings?: Record<string, unknown>;
}

export interface TransformedEvent {
  originalEvent: ChannelEvent;
  targetSystem: string;
  transformedPayload: Record<string, unknown>;
  deliveryConfig: {
    method: 'webhook' | 'api';
    endpoint: string;
    headers: Record<string, string>;
    timeout: number;
    retries: number;
  };
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: unknown;
  error?: Error;
  deliveryTime: number;
  attempt: number;
}

export interface IntegrationHealthReport {
  systemId: string;
  isHealthy: boolean;
  lastSuccessfulDelivery: Date | null;
  failureCount: number;
  circuitBreakerOpen: boolean;
  averageResponseTime: number;
  successRate: number;
}

export interface EventHandler {
  (event: ChannelEvent): Promise<void>;
}

const channelEventSchema = z.object({
  id: z.string(),
  channelName: z.string(),
  eventType: z.string(),
  payload: z.record(z.unknown()),
  timestamp: z.string(),
  organizationId: z.string(),
  weddingId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export class IntegrationOrchestrator {
  private supabaseClient;
  private eventHandlers = new Map<string, EventHandler[]>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private deliveryQueue: TransformedEvent[] = [];
  private isProcessingQueue = false;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  async subscribeToChannelEvents(
    channelPattern: string,
    handler: EventHandler,
  ): Promise<void> {
    if (!this.eventHandlers.has(channelPattern)) {
      this.eventHandlers.set(channelPattern, []);
    }

    this.eventHandlers.get(channelPattern)!.push(handler);

    const subscription = this.supabaseClient
      .channel(channelPattern)
      .on('broadcast', { event: 'integration-event' }, (payload) => {
        this.handleChannelEvent(payload.payload as ChannelEvent);
      })
      .subscribe();

    console.log(`Subscribed to channel pattern: ${channelPattern}`);
  }

  async transformChannelEvent(
    event: ChannelEvent,
    targetSystem: string,
  ): Promise<TransformedEvent> {
    const validatedEvent = channelEventSchema.parse(event);

    const externalSystem = await this.getExternalSystem(targetSystem);
    if (!externalSystem) {
      throw new Error(`External system not found: ${targetSystem}`);
    }

    let transformedPayload: Record<string, unknown>;

    switch (externalSystem.type) {
      case 'photography-crm':
        transformedPayload = this.transformForPhotographyCRM(validatedEvent);
        break;
      case 'venue-management':
        transformedPayload = this.transformForVenueManagement(validatedEvent);
        break;
      case 'whatsapp':
        transformedPayload = this.transformForWhatsApp(validatedEvent);
        break;
      case 'slack':
        transformedPayload = this.transformForSlack(validatedEvent);
        break;
      case 'email':
        transformedPayload = this.transformForEmail(validatedEvent);
        break;
      default:
        transformedPayload = validatedEvent.payload;
    }

    const transformedEvent: TransformedEvent = {
      originalEvent: validatedEvent,
      targetSystem,
      transformedPayload,
      deliveryConfig: {
        method: externalSystem.config.webhookUrl ? 'webhook' : 'api',
        endpoint: externalSystem.config.webhookUrl || '',
        headers: this.buildHeaders(externalSystem),
        timeout: 30000,
        retries: 3,
      },
    };

    await this.logEventTransformation(transformedEvent);
    return transformedEvent;
  }

  async deliverToExternalSystem(
    event: TransformedEvent,
    system: ExternalSystem,
  ): Promise<DeliveryResult> {
    const circuitBreaker = this.getOrCreateCircuitBreaker(system.id);

    if (circuitBreaker.isOpen()) {
      return {
        success: false,
        error: new Error('Circuit breaker is open'),
        deliveryTime: 0,
        attempt: 1,
      };
    }

    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= event.deliveryConfig.retries; attempt++) {
      try {
        const response = await this.makeExternalRequest(event, system);
        const deliveryTime = Date.now() - startTime;

        const result: DeliveryResult = {
          success: response.ok,
          statusCode: response.status,
          responseBody: await response.json().catch(() => null),
          deliveryTime,
          attempt,
        };

        if (result.success) {
          circuitBreaker.recordSuccess();
          await this.logSuccessfulDelivery(event, result);
          return result;
        }

        lastError = new Error(
          `HTTP ${response.status}: ${response.statusText}`,
        );
        await this.sleep(Math.pow(2, attempt - 1) * 1000); // Exponential backoff
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        await this.sleep(Math.pow(2, attempt - 1) * 1000);
      }
    }

    circuitBreaker.recordFailure();
    const result: DeliveryResult = {
      success: false,
      error: lastError,
      deliveryTime: Date.now() - startTime,
      attempt: event.deliveryConfig.retries,
    };

    await this.logFailedDelivery(event, result);
    return result;
  }

  async handleDeliveryFailure(
    event: TransformedEvent,
    error: Error,
  ): Promise<void> {
    console.error(`Delivery failed for ${event.targetSystem}:`, error);

    await this.supabaseClient.from('webhook_delivery_failures').insert({
      event_id: event.originalEvent.id,
      target_system: event.targetSystem,
      error_message: error.message,
      error_stack: error.stack,
      created_at: new Date().toISOString(),
      retry_count: 0,
      next_retry_at: new Date(Date.now() + 60000).toISOString(), // Retry in 1 minute
    });

    this.deliveryQueue.push(event);

    if (!this.isProcessingQueue) {
      this.processRetryQueue();
    }
  }

  async getIntegrationHealth(): Promise<IntegrationHealthReport[]> {
    const systems = await this.supabaseClient
      .from('integration_configs')
      .select('*')
      .eq('is_active', true);

    const healthReports: IntegrationHealthReport[] = [];

    for (const system of systems.data || []) {
      const circuitBreaker = this.getOrCreateCircuitBreaker(system.id);

      const lastDelivery = await this.supabaseClient
        .from('webhook_deliveries')
        .select('created_at, success, response_time')
        .eq('target_system_id', system.id)
        .order('created_at', { ascending: false })
        .limit(100);

      const deliveries = lastDelivery.data || [];
      const successfulDeliveries = deliveries.filter((d) => d.success);
      const failedDeliveries = deliveries.filter((d) => !d.success);

      const healthReport: IntegrationHealthReport = {
        systemId: system.id,
        isHealthy:
          circuitBreaker.isOpen() === false && failedDeliveries.length < 5,
        lastSuccessfulDelivery:
          successfulDeliveries.length > 0
            ? new Date(successfulDeliveries[0].created_at)
            : null,
        failureCount: failedDeliveries.length,
        circuitBreakerOpen: circuitBreaker.isOpen(),
        averageResponseTime:
          deliveries.reduce((sum, d) => sum + (d.response_time || 0), 0) /
            deliveries.length || 0,
        successRate:
          deliveries.length > 0
            ? successfulDeliveries.length / deliveries.length
            : 0,
      };

      healthReports.push(healthReport);
    }

    return healthReports;
  }

  private async handleChannelEvent(event: ChannelEvent): Promise<void> {
    try {
      const validatedEvent = channelEventSchema.parse(event);

      for (const [pattern, handlers] of this.eventHandlers.entries()) {
        if (this.matchesPattern(validatedEvent.channelName, pattern)) {
          for (const handler of handlers) {
            await handler(validatedEvent);
          }
        }
      }

      const targetSystems = await this.getTargetSystems(
        validatedEvent.channelName,
      );

      for (const systemId of targetSystems) {
        try {
          const system = await this.getExternalSystem(systemId);
          if (system && system.isActive) {
            const transformedEvent = await this.transformChannelEvent(
              validatedEvent,
              systemId,
            );
            const deliveryResult = await this.deliverToExternalSystem(
              transformedEvent,
              system,
            );

            if (!deliveryResult.success && deliveryResult.error) {
              await this.handleDeliveryFailure(
                transformedEvent,
                deliveryResult.error,
              );
            }
          }
        } catch (error) {
          console.error(
            `Failed to process event for system ${systemId}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error('Error handling channel event:', error);
    }
  }

  private transformForPhotographyCRM(
    event: ChannelEvent,
  ): Record<string, unknown> {
    return {
      client_id: event.payload.coupleId || event.payload.clientId,
      shoot_date: event.payload.ceremonyTime || event.payload.eventDate,
      location: event.payload.venue || event.payload.location,
      timeline: event.payload.schedule || event.payload.timeline,
      special_requests: event.payload.notes || event.payload.requirements,
      event_type: event.eventType,
      wedding_id: event.weddingId,
      updated_at: event.timestamp,
    };
  }

  private transformForVenueManagement(
    event: ChannelEvent,
  ): Record<string, unknown> {
    return {
      event_id: event.weddingId,
      ceremony_time: event.payload.ceremonyTime,
      reception_time: event.payload.receptionTime,
      guest_count: event.payload.guestCount,
      setup_requirements: event.payload.setupRequirements,
      special_requests: event.payload.specialRequests,
      contact_info: event.payload.contactInfo,
      event_type: event.eventType,
      updated_at: event.timestamp,
    };
  }

  private transformForWhatsApp(event: ChannelEvent): Record<string, unknown> {
    return {
      to: event.payload.phoneNumber || event.payload.recipientPhone,
      message: this.generateWhatsAppMessage(event),
      message_type: 'text',
      event_context: {
        wedding_id: event.weddingId,
        couple_name: event.payload.coupleName,
        event_type: event.eventType,
        urgent: event.payload.isUrgent || false,
      },
    };
  }

  private transformForSlack(event: ChannelEvent): Record<string, unknown> {
    return {
      channel: event.payload.slackChannel || '#wedding-coordination',
      text: this.generateSlackMessage(event),
      attachments: [
        {
          color: event.payload.isUrgent ? 'danger' : 'good',
          fields: [
            {
              title: 'Wedding',
              value: event.payload.coupleName || 'Unknown Couple',
              short: true,
            },
            {
              title: 'Event Type',
              value: event.eventType,
              short: true,
            },
            {
              title: 'Timestamp',
              value: new Date(event.timestamp).toLocaleString(),
              short: true,
            },
          ],
        },
      ],
    };
  }

  private transformForEmail(event: ChannelEvent): Record<string, unknown> {
    return {
      to: event.payload.recipientEmail,
      subject: `Wedding Update: ${event.eventType}`,
      html: this.generateEmailContent(event),
      text: this.generateEmailTextContent(event),
      headers: {
        'X-Wedding-ID': event.weddingId,
        'X-Event-Type': event.eventType,
      },
    };
  }

  private generateWhatsAppMessage(event: ChannelEvent): string {
    const coupleName = event.payload.coupleName || 'Couple';
    const eventType = event.eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    switch (event.eventType) {
      case 'timeline_update':
        return `🕐 *Timeline Update* for ${coupleName}\n\nCeremony time changed to ${event.payload.ceremonyTime}\nPlease update your schedule accordingly.`;
      case 'guest_count_change':
        return `👥 *Guest Count Update* for ${coupleName}\n\nNew guest count: ${event.payload.guestCount}\nPlease adjust arrangements accordingly.`;
      case 'venue_change':
        return `📍 *Venue Update* for ${coupleName}\n\nVenue: ${event.payload.venueName}\nAddress: ${event.payload.venueAddress}`;
      default:
        return `📋 *${eventType}* for ${coupleName}\n\nPlease check your dashboard for details.`;
    }
  }

  private generateSlackMessage(event: ChannelEvent): string {
    const coupleName = event.payload.coupleName || 'Unknown Couple';
    const eventType = event.eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return `🎉 *${eventType}* for *${coupleName}*\n\n${JSON.stringify(event.payload, null, 2)}`;
  }

  private generateEmailContent(event: ChannelEvent): string {
    const coupleName = event.payload.coupleName || 'Unknown Couple';
    const eventType = event.eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return `
      <html>
        <head><title>Wedding Update: ${eventType}</title></head>
        <body>
          <h2>Wedding Update: ${eventType}</h2>
          <p><strong>Couple:</strong> ${coupleName}</p>
          <p><strong>Update Type:</strong> ${eventType}</p>
          <p><strong>Timestamp:</strong> ${new Date(event.timestamp).toLocaleString()}</p>
          
          <h3>Details:</h3>
          <pre>${JSON.stringify(event.payload, null, 2)}</pre>
          
          <p>Please log into your WedSync dashboard for complete details.</p>
        </body>
      </html>
    `;
  }

  private generateEmailTextContent(event: ChannelEvent): string {
    const coupleName = event.payload.coupleName || 'Unknown Couple';
    const eventType = event.eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return `Wedding Update: ${eventType}

Couple: ${coupleName}
Update Type: ${eventType}
Timestamp: ${new Date(event.timestamp).toLocaleString()}

Details:
${JSON.stringify(event.payload, null, 2)}

Please log into your WedSync dashboard for complete details.`;
  }

  private buildHeaders(system: ExternalSystem): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'WedSync-Integration/1.0',
    };

    if (system.config.apiKey) {
      headers['Authorization'] = `Bearer ${system.config.apiKey}`;
    }

    if (system.config.authToken) {
      headers['X-Auth-Token'] = system.config.authToken;
    }

    return headers;
  }

  private async makeExternalRequest(
    event: TransformedEvent,
    system: ExternalSystem,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      event.deliveryConfig.timeout,
    );

    try {
      const response = await fetch(event.deliveryConfig.endpoint, {
        method: 'POST',
        headers: event.deliveryConfig.headers,
        body: JSON.stringify(event.transformedPayload),
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async getExternalSystem(
    systemId: string,
  ): Promise<ExternalSystem | null> {
    const { data } = await this.supabaseClient
      .from('integration_configs')
      .select('*')
      .eq('id', systemId)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      config: data.config,
      isActive: data.is_active,
    };
  }

  private async getTargetSystems(channelName: string): Promise<string[]> {
    const { data } = await this.supabaseClient
      .from('channel_subscriptions')
      .select('target_system_id')
      .eq('channel_pattern', channelName)
      .eq('is_active', true);

    return data?.map((row) => row.target_system_id) || [];
  }

  private matchesPattern(channelName: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\{[^}]+\}/g, '[^:]+');

    return new RegExp(`^${regexPattern}$`).test(channelName);
  }

  private getOrCreateCircuitBreaker(systemId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(systemId)) {
      this.circuitBreakers.set(systemId, new CircuitBreaker());
    }
    return this.circuitBreakers.get(systemId)!;
  }

  private async processRetryQueue(): Promise<void> {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    while (this.deliveryQueue.length > 0) {
      const event = this.deliveryQueue.shift();
      if (!event) continue;

      try {
        const system = await this.getExternalSystem(event.targetSystem);
        if (system && system.isActive) {
          const result = await this.deliverToExternalSystem(event, system);
          if (!result.success && result.error) {
            await this.sleep(5000); // Wait 5 seconds before next retry
          }
        }
      } catch (error) {
        console.error('Error in retry queue processing:', error);
        await this.sleep(5000);
      }
    }

    this.isProcessingQueue = false;
  }

  private async logEventTransformation(event: TransformedEvent): Promise<void> {
    await this.supabaseClient.from('integration_event_logs').insert({
      event_id: event.originalEvent.id,
      target_system: event.targetSystem,
      transformation_type: 'channel_to_external',
      original_payload: event.originalEvent.payload,
      transformed_payload: event.transformedPayload,
      created_at: new Date().toISOString(),
    });
  }

  private async logSuccessfulDelivery(
    event: TransformedEvent,
    result: DeliveryResult,
  ): Promise<void> {
    await this.supabaseClient.from('webhook_deliveries').insert({
      event_id: event.originalEvent.id,
      target_system_id: event.targetSystem,
      success: true,
      status_code: result.statusCode,
      response_body: result.responseBody,
      response_time: result.deliveryTime,
      attempt_number: result.attempt,
      created_at: new Date().toISOString(),
    });
  }

  private async logFailedDelivery(
    event: TransformedEvent,
    result: DeliveryResult,
  ): Promise<void> {
    await this.supabaseClient.from('webhook_deliveries').insert({
      event_id: event.originalEvent.id,
      target_system_id: event.targetSystem,
      success: false,
      status_code: result.statusCode,
      error_message: result.error?.message,
      response_time: result.deliveryTime,
      attempt_number: result.attempt,
      created_at: new Date().toISOString(),
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: Date | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly failureThreshold = 5;
  private readonly timeoutMs = 30000; // 30 seconds

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
    this.lastFailureTime = null;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  isOpen(): boolean {
    if (this.state === 'closed') {
      return false;
    }

    if (this.state === 'open' && this.lastFailureTime) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
      if (timeSinceLastFailure >= this.timeoutMs) {
        this.state = 'half-open';
        return false;
      }
    }

    return this.state === 'open';
  }
}
