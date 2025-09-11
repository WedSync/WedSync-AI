// src/lib/events/api-event-system.ts
import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';
import { ConnectorFactory } from '../integrations/api-connectors/base-connector';

export interface APIEvent {
  id: string;
  type: string;
  source: string;
  data: Record<string, any>;
  timestamp: string;
  correlation_id?: string;
  causation_id?: string;
  metadata?: {
    vendor_id?: string;
    wedding_date?: string;
    couple_id?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    retry_count?: number;
  };
}

export interface EventHandler {
  eventType: string;
  handler: (event: APIEvent) => Promise<void>;
  priority: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface EventSubscription {
  id: string;
  vendor_id: string;
  event_types: string[];
  endpoint_url?: string;
  webhook_secret?: string;
  active: boolean;
  created_at: string;
}

export class APIEventSystem extends EventEmitter {
  private handlers: Map<string, EventHandler[]> = new Map();
  private processingQueue: APIEvent[] = [];
  private processing = false;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  constructor() {
    super();
    this.setupEventHandlers();
    this.setupRealTimeSubscriptions();
  }

  // Register event handlers for different API events
  public registerHandler(handler: EventHandler): void {
    const handlers = this.handlers.get(handler.eventType) || [];
    handlers.push(handler);
    handlers.sort((a, b) => b.priority - a.priority); // Higher priority first
    this.handlers.set(handler.eventType, handlers);
  }

  // Publish event to the system
  public async publishEvent(event: APIEvent): Promise<void> {
    // Store event in database for audit trail
    await this.storeEvent(event);

    // Add to processing queue
    this.processingQueue.push(event);

    // Process queue if not already processing
    if (!this.processing) {
      this.processQueue();
    }

    // Emit event for real-time listeners
    this.emit(event.type, event);

    // Send to external webhook subscribers
    await this.notifyWebhookSubscribers(event);
  }

  private async processQueue(): Promise<void> {
    this.processing = true;

    while (this.processingQueue.length > 0) {
      const event = this.processingQueue.shift();
      if (!event) continue;

      await this.processEvent(event);
    }

    this.processing = false;
  }

  private async processEvent(event: APIEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];

    // Process handlers in parallel for performance
    const processingPromises = handlers.map(async (handler) => {
      try {
        await this.executeHandler(handler, event);
        await this.markEventProcessed(event.id, handler.eventType, 'success');
      } catch (error) {
        console.error(`Handler failed for event ${event.type}:`, error);
        await this.handleEventError(event, handler, error);
      }
    });

    await Promise.allSettled(processingPromises);
  }

  private async executeHandler(
    handler: EventHandler,
    event: APIEvent,
  ): Promise<void> {
    const maxRetries = handler.retryPolicy?.maxRetries || 3;
    const backoffMs = handler.retryPolicy?.backoffMs || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await handler.handler(event);
        return; // Success, exit retry loop
      } catch (error) {
        if (attempt === maxRetries) {
          throw error; // Final attempt failed
        }

        // Wait before retry with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, backoffMs * Math.pow(2, attempt - 1)),
        );
      }
    }
  }

  private async storeEvent(event: APIEvent): Promise<void> {
    await this.supabase.from('api_events').insert({
      id: event.id,
      event_type: event.type,
      source: event.source,
      data: event.data,
      timestamp: event.timestamp,
      correlation_id: event.correlation_id,
      causation_id: event.causation_id,
      metadata: event.metadata,
    });
  }

  private async markEventProcessed(
    eventId: string,
    handlerType: string,
    status: 'success' | 'failed',
  ): Promise<void> {
    await this.supabase.from('event_processing_log').insert({
      event_id: eventId,
      handler_type: handlerType,
      status,
      processed_at: new Date().toISOString(),
    });
  }

  private async handleEventError(
    event: APIEvent,
    handler: EventHandler,
    error: any,
  ): Promise<void> {
    await this.supabase.from('api_event_errors').insert({
      event_id: event.id,
      handler_type: handler.eventType,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
      created_at: new Date().toISOString(),
    });

    // Send to dead letter queue for manual review if critical
    if (event.metadata?.priority === 'urgent') {
      await this.sendToDeadLetterQueue(event, error);
    }
  }

  private async sendToDeadLetterQueue(
    event: APIEvent,
    error: any,
  ): Promise<void> {
    await this.supabase.from('dead_letter_queue').insert({
      event_id: event.id,
      event_type: event.type,
      event_data: event.data,
      error_message: error instanceof Error ? error.message : String(error),
      created_at: new Date().toISOString(),
    });
  }

  // Send events to external webhook subscribers
  private async notifyWebhookSubscribers(event: APIEvent): Promise<void> {
    try {
      const { data: subscriptions } = await this.supabase
        .from('webhook_subscriptions')
        .select('*')
        .contains('event_types', [event.type])
        .eq('active', true);

      if (!subscriptions || subscriptions.length === 0) return;

      // Send webhooks in parallel
      const webhookPromises = subscriptions.map(
        async (subscription: EventSubscription) => {
          try {
            await this.sendWebhookNotification(subscription, event);
          } catch (error) {
            console.error(
              `Webhook delivery failed for ${subscription.id}:`,
              error,
            );
            await this.logWebhookError(subscription.id, event.id, error);
          }
        },
      );

      await Promise.allSettled(webhookPromises);
    } catch (error) {
      console.error('Failed to notify webhook subscribers:', error);
    }
  }

  private async sendWebhookNotification(
    subscription: EventSubscription,
    event: APIEvent,
  ): Promise<void> {
    if (!subscription.endpoint_url) return;

    const payload = {
      event_id: event.id,
      event_type: event.type,
      timestamp: event.timestamp,
      data: event.data,
      correlation_id: event.correlation_id,
    };

    const signature = this.generateWebhookSignature(
      payload,
      subscription.webhook_secret || '',
    );

    const response = await fetch(subscription.endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WedSync-Signature': signature,
        'X-WedSync-Event-Type': event.type,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Webhook delivery failed: ${response.status} ${response.statusText}`,
      );
    }

    // Log successful delivery
    await this.supabase.from('webhook_deliveries').insert({
      subscription_id: subscription.id,
      event_id: event.id,
      status: 'delivered',
      response_code: response.status,
      delivered_at: new Date().toISOString(),
    });
  }

  private generateWebhookSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  private async logWebhookError(
    subscriptionId: string,
    eventId: string,
    error: any,
  ): Promise<void> {
    await this.supabase.from('webhook_deliveries').insert({
      subscription_id: subscriptionId,
      event_id: eventId,
      status: 'failed',
      error_message: error instanceof Error ? error.message : String(error),
      delivered_at: new Date().toISOString(),
    });
  }

  // Set up real-time subscriptions for database changes
  private setupRealTimeSubscriptions(): void {
    // Listen for new bookings
    this.supabase
      .channel('booking-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          this.publishEvent({
            id: crypto.randomUUID(),
            type: 'booking.created',
            source: 'database',
            data: payload.new,
            timestamp: new Date().toISOString(),
            metadata: {
              vendor_id: payload.new.vendor_id,
              wedding_date: payload.new.wedding_date,
              priority: 'high',
            },
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          this.publishEvent({
            id: crypto.randomUUID(),
            type: 'booking.updated',
            source: 'database',
            data: { old: payload.old, new: payload.new },
            timestamp: new Date().toISOString(),
            metadata: {
              vendor_id: payload.new.vendor_id,
              wedding_date: payload.new.wedding_date,
              priority: 'medium',
            },
          });
        },
      )
      .subscribe();

    // Listen for form submissions
    this.supabase
      .channel('form-submissions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'form_submissions',
        },
        (payload) => {
          this.publishEvent({
            id: crypto.randomUUID(),
            type: 'form.submitted',
            source: 'database',
            data: payload.new,
            timestamp: new Date().toISOString(),
            metadata: {
              vendor_id: payload.new.vendor_id,
              couple_id: payload.new.couple_id,
              priority: 'medium',
            },
          });
        },
      )
      .subscribe();

    // Listen for payment updates
    this.supabase
      .channel('payment-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: 'payment_status=eq.paid',
        },
        (payload) => {
          this.publishEvent({
            id: crypto.randomUUID(),
            type: 'payment.received',
            source: 'database',
            data: payload.new,
            timestamp: new Date().toISOString(),
            metadata: {
              vendor_id: payload.new.vendor_id,
              wedding_date: payload.new.wedding_date,
              priority: 'high',
            },
          });
        },
      )
      .subscribe();
  }

  private setupEventHandlers(): void {
    // Wedding booking event handlers
    this.registerHandler({
      eventType: 'booking.created',
      priority: 100,
      handler: async (event) => {
        await this.handleBookingCreated(event);
      },
    });

    this.registerHandler({
      eventType: 'booking.cancelled',
      priority: 100,
      handler: async (event) => {
        await this.handleBookingCancelled(event);
      },
    });

    this.registerHandler({
      eventType: 'payment.received',
      priority: 90,
      handler: async (event) => {
        await this.handlePaymentReceived(event);
      },
    });

    this.registerHandler({
      eventType: 'form.submitted',
      priority: 80,
      handler: async (event) => {
        await this.handleFormSubmitted(event);
      },
    });

    this.registerHandler({
      eventType: 'vendor.connected',
      priority: 70,
      handler: async (event) => {
        await this.handleVendorConnected(event);
      },
    });

    this.registerHandler({
      eventType: 'availability.changed',
      priority: 60,
      handler: async (event) => {
        await this.handleAvailabilityChanged(event);
      },
    });

    this.registerHandler({
      eventType: 'review.received',
      priority: 50,
      handler: async (event) => {
        await this.handleReviewReceived(event);
      },
    });
  }

  private async handleBookingCreated(event: APIEvent): Promise<void> {
    const bookingData = event.data;
    const correlationId = event.correlation_id || crypto.randomUUID();

    // Send booking confirmation to couple
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'email.send',
      source: 'booking_system',
      data: {
        template: 'booking_confirmation',
        recipient: bookingData.couple_email || bookingData.contact_email,
        booking_details: bookingData,
      },
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      causation_id: event.id,
    });

    // Notify supplier of new booking
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'notification.send',
      source: 'booking_system',
      data: {
        type: 'new_booking',
        vendor_id: bookingData.vendor_id,
        booking_details: bookingData,
      },
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      causation_id: event.id,
    });

    // Update availability calendar
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'calendar.block',
      source: 'booking_system',
      data: {
        vendor_id: bookingData.vendor_id,
        start_time: bookingData.service_start,
        end_time: bookingData.service_end,
        booking_id: bookingData.id,
      },
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      causation_id: event.id,
    });

    // Trigger vendor-specific automations
    await this.triggerVendorAutomations(
      bookingData.vendor_id,
      'booking_created',
      bookingData,
      correlationId,
    );
  }

  private async handlePaymentReceived(event: APIEvent): Promise<void> {
    const paymentData = event.data;

    // Update booking payment status
    await this.supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        paid_amount: paymentData.amount,
        payment_date: new Date().toISOString(),
      })
      .eq('id', paymentData.booking_id);

    // Send payment receipt
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'email.send',
      source: 'payment_system',
      data: {
        template: 'payment_receipt',
        recipient: paymentData.customer_email,
        payment_details: paymentData,
      },
      timestamp: new Date().toISOString(),
      correlation_id: event.correlation_id,
      causation_id: event.id,
    });
  }

  private async handleFormSubmitted(event: APIEvent): Promise<void> {
    const formData = event.data;

    // Store form submission
    const { data: submission } = await this.supabase
      .from('form_submissions')
      .insert({
        form_id: formData.form_id,
        vendor_id: formData.vendor_id,
        couple_id: formData.couple_id,
        submission_data: formData.responses,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Notify vendor of form submission
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'notification.send',
      source: 'form_system',
      data: {
        type: 'form_submitted',
        vendor_id: formData.vendor_id,
        form_title: formData.form_title,
        couple_name: formData.couple_name,
      },
      timestamp: new Date().toISOString(),
      correlation_id: event.correlation_id,
      causation_id: event.id,
    });
  }

  private async handleBookingCancelled(event: APIEvent): Promise<void> {
    const cancellationData = event.data;

    // Process refund if applicable
    if (cancellationData.refund_amount > 0) {
      await this.publishEvent({
        id: crypto.randomUUID(),
        type: 'payment.refund',
        source: 'booking_system',
        data: {
          booking_id: cancellationData.booking_id,
          refund_amount: cancellationData.refund_amount,
          payment_intent_id: cancellationData.payment_intent_id,
        },
        timestamp: new Date().toISOString(),
        correlation_id: event.correlation_id,
        causation_id: event.id,
      });
    }

    // Free up calendar availability
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'calendar.unblock',
      source: 'booking_system',
      data: {
        vendor_id: cancellationData.vendor_id,
        booking_id: cancellationData.booking_id,
      },
      timestamp: new Date().toISOString(),
      correlation_id: event.correlation_id,
      causation_id: event.id,
    });
  }

  private async handleVendorConnected(event: APIEvent): Promise<void> {
    const vendorData = event.data;

    // Initialize vendor data sync
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'integration.sync',
      source: 'vendor_system',
      data: {
        vendor_id: vendorData.vendor_id,
        integration_type: vendorData.integration_type,
        sync_type: 'initial',
      },
      timestamp: new Date().toISOString(),
      correlation_id: event.correlation_id,
      causation_id: event.id,
    });

    // Send welcome email with integration guide
    await this.publishEvent({
      id: crypto.randomUUID(),
      type: 'email.send',
      source: 'vendor_system',
      data: {
        template: 'vendor_welcome',
        recipient: vendorData.vendor_email,
        integration_details: vendorData,
      },
      timestamp: new Date().toISOString(),
      correlation_id: event.correlation_id,
      causation_id: event.id,
    });
  }

  private async handleAvailabilityChanged(event: APIEvent): Promise<void> {
    // Update vendor calendar and notify interested parties
    console.log('Handling availability change:', event.data);
  }

  private async handleReviewReceived(event: APIEvent): Promise<void> {
    // Store review and notify vendor
    console.log('Handling review:', event.data);
  }

  private async triggerVendorAutomations(
    vendorId: string,
    eventType: string,
    data: any,
    correlationId: string,
  ): Promise<void> {
    try {
      const connectors = await ConnectorFactory.getVendorConnectors(vendorId);

      if (connectors.zapier) {
        // Get vendor's Zapier webhook configuration
        const { data: zapConfig } = await this.supabase
          .from('vendor_integrations')
          .select('configuration')
          .eq('vendor_id', vendorId)
          .eq('integration_type', 'zapier')
          .single();

        if (zapConfig?.configuration?.webhooks?.[eventType]) {
          await connectors.zapier.triggerZap(
            zapConfig.configuration.webhooks[eventType],
            {
              ...data,
              event_type: eventType,
              correlation_id: correlationId,
              timestamp: new Date().toISOString(),
            },
          );
        }
      }
    } catch (error) {
      console.error('Failed to trigger vendor automations:', error);
    }
  }

  // Public methods for external integrations
  public async createEventSubscription(
    vendorId: string,
    eventTypes: string[],
    endpointUrl?: string,
    webhookSecret?: string,
  ): Promise<string> {
    const { data: subscription } = await this.supabase
      .from('webhook_subscriptions')
      .insert({
        vendor_id: vendorId,
        event_types: eventTypes,
        endpoint_url: endpointUrl,
        webhook_secret: webhookSecret,
        active: true,
      })
      .select()
      .single();

    return subscription.id;
  }

  public async removeEventSubscription(subscriptionId: string): Promise<void> {
    await this.supabase
      .from('webhook_subscriptions')
      .update({ active: false })
      .eq('id', subscriptionId);
  }

  public async getEventHistory(
    eventType?: string,
    vendorId?: string,
    limit: number = 100,
  ): Promise<APIEvent[]> {
    let query = this.supabase
      .from('api_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (vendorId) {
      query = query.eq('metadata->>vendor_id', vendorId);
    }

    const { data: events } = await query;
    return events || [];
  }
}

// Global event system instance
export const apiEventSystem = new APIEventSystem();
