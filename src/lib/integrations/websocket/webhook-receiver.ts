import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import { z } from 'zod';
import { ChannelEvent } from './integration-orchestrator';

export interface VendorEvent {
  id: string;
  vendor: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
  signature?: string;
}

export interface VendorConfig {
  id: string;
  name: string;
  type:
    | 'photography-crm'
    | 'venue-management'
    | 'payment-processor'
    | 'email-service';
  webhookSecret: string;
  signatureHeader: string;
  signaturePrefix?: string;
  isActive: boolean;
  customMappings?: Record<string, string>;
}

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
  vendorConfig?: VendorConfig;
}

const vendorEventSchema = z.object({
  id: z.string(),
  vendor: z.string(),
  eventType: z.string(),
  payload: z.record(z.unknown()),
  timestamp: z.string(),
  signature: z.string().optional(),
});

export class WebhookReceiver {
  private supabaseClient;
  private vendorConfigs = new Map<string, VendorConfig>();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseClient = createClient(supabaseUrl, supabaseKey);
    this.loadVendorConfigs();
  }

  async receiveVendorWebhook(vendor: string, payload: unknown): Promise<void> {
    try {
      // Validate and parse the incoming webhook
      const validationResult = await this.validateWebhook(vendor, payload);
      if (!validationResult.isValid) {
        throw new Error(`Webhook validation failed: ${validationResult.error}`);
      }

      const vendorEvent = vendorEventSchema.parse(payload);

      // Log the incoming webhook
      await this.logIncomingWebhook(vendor, vendorEvent);

      // Transform to channel event format
      const channelEvent = await this.transformToChannelEvent(vendorEvent);

      // Broadcast to appropriate WebSocket channel
      await this.broadcastToChannel(channelEvent.channelName, channelEvent);

      // Log successful processing
      await this.logWebhookProcessing(vendorEvent.id, true);
    } catch (error) {
      console.error(`Failed to process webhook from ${vendor}:`, error);

      if (typeof payload === 'object' && payload && 'id' in payload) {
        await this.logWebhookProcessing(
          String(payload.id),
          false,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }

      throw error;
    }
  }

  validateWebhookSignature(
    payload: unknown,
    signature: string,
    vendor: string,
  ): boolean {
    const vendorConfig = this.vendorConfigs.get(vendor);
    if (!vendorConfig) {
      console.error(`Vendor configuration not found for: ${vendor}`);
      return false;
    }

    try {
      const payloadString = JSON.stringify(payload);
      const expectedSignature = this.generateSignature(
        payloadString,
        vendorConfig.webhookSecret,
        vendorConfig.signaturePrefix,
      );

      // Remove any prefix if present
      const cleanSignature = signature.replace(
        vendorConfig.signaturePrefix || '',
        '',
      );
      const cleanExpectedSignature = expectedSignature.replace(
        vendorConfig.signaturePrefix || '',
        '',
      );

      // Use timing-safe comparison
      return this.timingSafeEquals(cleanSignature, cleanExpectedSignature);
    } catch (error) {
      console.error(`Signature validation error for ${vendor}:`, error);
      return false;
    }
  }

  async transformToChannelEvent(
    vendorEvent: VendorEvent,
  ): Promise<ChannelEvent> {
    const vendorConfig = this.vendorConfigs.get(vendorEvent.vendor);
    if (!vendorConfig) {
      throw new Error(`Vendor configuration not found: ${vendorEvent.vendor}`);
    }

    let channelEvent: ChannelEvent;

    switch (vendorConfig.type) {
      case 'photography-crm':
        channelEvent = await this.transformPhotographyCRMEvent(vendorEvent);
        break;
      case 'venue-management':
        channelEvent = await this.transformVenueManagementEvent(vendorEvent);
        break;
      case 'payment-processor':
        channelEvent = await this.transformPaymentProcessorEvent(vendorEvent);
        break;
      case 'email-service':
        channelEvent = await this.transformEmailServiceEvent(vendorEvent);
        break;
      default:
        channelEvent = await this.transformGenericEvent(vendorEvent);
    }

    // Apply custom mappings if configured
    if (vendorConfig.customMappings) {
      channelEvent = this.applyCustomMappings(
        channelEvent,
        vendorConfig.customMappings,
      );
    }

    return channelEvent;
  }

  async broadcastToChannel(
    channelName: string,
    event: ChannelEvent,
  ): Promise<void> {
    try {
      const channel = this.supabaseClient.channel(channelName);

      await channel.send({
        type: 'broadcast',
        event: 'integration-event',
        payload: event,
      });

      // Also store in database for persistence and querying
      await this.supabaseClient.from('channel_events').insert({
        id: event.id,
        channel_name: event.channelName,
        event_type: event.eventType,
        payload: event.payload,
        organization_id: event.organizationId,
        wedding_id: event.weddingId,
        metadata: event.metadata,
        created_at: new Date().toISOString(),
      });

      console.log(`Broadcasted event to channel: ${channelName}`);
    } catch (error) {
      console.error(`Failed to broadcast to channel ${channelName}:`, error);
      throw error;
    }
  }

  private async validateWebhook(
    vendor: string,
    payload: unknown,
  ): Promise<WebhookValidationResult> {
    const vendorConfig = this.vendorConfigs.get(vendor);
    if (!vendorConfig) {
      return {
        isValid: false,
        error: `Vendor configuration not found: ${vendor}`,
      };
    }

    if (!vendorConfig.isActive) {
      return {
        isValid: false,
        error: `Vendor integration is disabled: ${vendor}`,
      };
    }

    // Basic payload validation
    if (!payload || typeof payload !== 'object') {
      return {
        isValid: false,
        error: 'Invalid payload format',
      };
    }

    // Check for signature if required
    if (
      vendorConfig.webhookSecret &&
      payload &&
      typeof payload === 'object' &&
      'signature' in payload
    ) {
      const signature = String(payload.signature);
      if (!this.validateWebhookSignature(payload, signature, vendor)) {
        return {
          isValid: false,
          error: 'Invalid webhook signature',
        };
      }
    }

    return {
      isValid: true,
      vendorConfig,
    };
  }

  private async transformPhotographyCRMEvent(
    vendorEvent: VendorEvent,
  ): Promise<ChannelEvent> {
    const payload = vendorEvent.payload;

    // Extract common photography CRM fields
    const clientId =
      payload.client_id || payload.clientId || payload.customer_id;
    const weddingId =
      payload.wedding_id || payload.event_id || payload.shoot_id;
    const organizationId =
      payload.organization_id || (await this.resolveOrganizationId(clientId));

    return {
      id: `photo-crm-${vendorEvent.id}`,
      channelName: `supplier:photography:${organizationId}`,
      eventType: this.mapPhotographyCRMEventType(vendorEvent.eventType),
      payload: {
        clientId,
        weddingId,
        shootDate: payload.shoot_date || payload.event_date,
        location: payload.location || payload.venue,
        timeline: payload.timeline || payload.schedule,
        galleryUrl: payload.gallery_url || payload.photos_url,
        bookingStatus: payload.booking_status || payload.status,
        paymentStatus: payload.payment_status,
        specialRequests: payload.special_requests || payload.notes,
        originalData: vendorEvent.payload,
      },
      timestamp: vendorEvent.timestamp,
      organizationId: String(organizationId),
      weddingId: String(weddingId),
      metadata: {
        vendor: vendorEvent.vendor,
        originalEventType: vendorEvent.eventType,
        source: 'webhook',
      },
    };
  }

  private async transformVenueManagementEvent(
    vendorEvent: VendorEvent,
  ): Promise<ChannelEvent> {
    const payload = vendorEvent.payload;

    const eventId =
      payload.event_id || payload.booking_id || payload.reservation_id;
    const organizationId =
      payload.organization_id || (await this.resolveOrganizationId(eventId));

    return {
      id: `venue-mgmt-${vendorEvent.id}`,
      channelName: `supplier:venue:${organizationId}`,
      eventType: this.mapVenueManagementEventType(vendorEvent.eventType),
      payload: {
        eventId,
        venueName: payload.venue_name || payload.location_name,
        eventDate: payload.event_date || payload.ceremony_date,
        ceremonyTime: payload.ceremony_time,
        receptionTime: payload.reception_time,
        guestCount: payload.guest_count || payload.headcount,
        setupRequirements: payload.setup_requirements || payload.setup_notes,
        cateringRequirements: payload.catering_requirements,
        specialRequests: payload.special_requests || payload.notes,
        contactInfo: payload.contact_info || payload.planner_contact,
        bookingStatus: payload.booking_status || payload.status,
        originalData: vendorEvent.payload,
      },
      timestamp: vendorEvent.timestamp,
      organizationId: String(organizationId),
      weddingId: String(eventId),
      metadata: {
        vendor: vendorEvent.vendor,
        originalEventType: vendorEvent.eventType,
        source: 'webhook',
      },
    };
  }

  private async transformPaymentProcessorEvent(
    vendorEvent: VendorEvent,
  ): Promise<ChannelEvent> {
    const payload = vendorEvent.payload;

    const customerId = payload.customer_id || payload.client_id;
    const invoiceId = payload.invoice_id || payload.payment_id;
    const organizationId =
      payload.organization_id || (await this.resolveOrganizationId(customerId));

    return {
      id: `payment-${vendorEvent.id}`,
      channelName: `billing:payments:${organizationId}`,
      eventType: this.mapPaymentProcessorEventType(vendorEvent.eventType),
      payload: {
        customerId,
        invoiceId,
        amount: payload.amount || payload.total,
        currency: payload.currency || 'USD',
        paymentStatus: payload.payment_status || payload.status,
        paymentMethod: payload.payment_method || payload.method,
        transactionId: payload.transaction_id || payload.charge_id,
        dueDate: payload.due_date,
        paidDate: payload.paid_date || payload.payment_date,
        description: payload.description || payload.memo,
        originalData: vendorEvent.payload,
      },
      timestamp: vendorEvent.timestamp,
      organizationId: String(organizationId),
      weddingId: payload.wedding_id ? String(payload.wedding_id) : undefined,
      metadata: {
        vendor: vendorEvent.vendor,
        originalEventType: vendorEvent.eventType,
        source: 'webhook',
      },
    };
  }

  private async transformEmailServiceEvent(
    vendorEvent: VendorEvent,
  ): Promise<ChannelEvent> {
    const payload = vendorEvent.payload;

    const recipientEmail =
      payload.recipient || payload.to_email || payload.email;
    const organizationId =
      payload.organization_id ||
      (await this.resolveOrganizationIdByEmail(recipientEmail));

    return {
      id: `email-${vendorEvent.id}`,
      channelName: `communications:email:${organizationId}`,
      eventType: this.mapEmailServiceEventType(vendorEvent.eventType),
      payload: {
        messageId: payload.message_id || payload.email_id,
        recipientEmail,
        subject: payload.subject,
        deliveryStatus: payload.delivery_status || payload.status,
        openedAt: payload.opened_at || payload.open_time,
        clickedAt: payload.clicked_at || payload.click_time,
        bouncedAt: payload.bounced_at || payload.bounce_time,
        bounceReason: payload.bounce_reason,
        originalData: vendorEvent.payload,
      },
      timestamp: vendorEvent.timestamp,
      organizationId: String(organizationId),
      weddingId: payload.wedding_id ? String(payload.wedding_id) : undefined,
      metadata: {
        vendor: vendorEvent.vendor,
        originalEventType: vendorEvent.eventType,
        source: 'webhook',
      },
    };
  }

  private async transformGenericEvent(
    vendorEvent: VendorEvent,
  ): Promise<ChannelEvent> {
    const payload = vendorEvent.payload;
    const organizationId = payload.organization_id || 'unknown';

    return {
      id: `generic-${vendorEvent.id}`,
      channelName: `integrations:${vendorEvent.vendor}:${organizationId}`,
      eventType: vendorEvent.eventType,
      payload: vendorEvent.payload,
      timestamp: vendorEvent.timestamp,
      organizationId: String(organizationId),
      weddingId: payload.wedding_id ? String(payload.wedding_id) : undefined,
      metadata: {
        vendor: vendorEvent.vendor,
        originalEventType: vendorEvent.eventType,
        source: 'webhook',
      },
    };
  }

  private applyCustomMappings(
    event: ChannelEvent,
    mappings: Record<string, string>,
  ): ChannelEvent {
    const mappedPayload = { ...event.payload };

    for (const [sourceField, targetField] of Object.entries(mappings)) {
      if (sourceField in mappedPayload) {
        mappedPayload[targetField] = mappedPayload[sourceField];
        delete mappedPayload[sourceField];
      }
    }

    return {
      ...event,
      payload: mappedPayload,
    };
  }

  private mapPhotographyCRMEventType(originalType: string): string {
    const mappings: Record<string, string> = {
      'booking.created': 'booking_created',
      'booking.updated': 'booking_updated',
      'booking.confirmed': 'booking_confirmed',
      'booking.cancelled': 'booking_cancelled',
      'gallery.ready': 'gallery_ready',
      'gallery.delivered': 'gallery_delivered',
      'payment.received': 'payment_received',
      'timeline.updated': 'timeline_updated',
    };

    return mappings[originalType] || originalType;
  }

  private mapVenueManagementEventType(originalType: string): string {
    const mappings: Record<string, string> = {
      'booking.created': 'venue_booking_created',
      'booking.updated': 'venue_booking_updated',
      'booking.confirmed': 'venue_booking_confirmed',
      'capacity.updated': 'venue_capacity_updated',
      'setup.scheduled': 'venue_setup_scheduled',
      'catering.updated': 'catering_requirements_updated',
    };

    return mappings[originalType] || originalType;
  }

  private mapPaymentProcessorEventType(originalType: string): string {
    const mappings: Record<string, string> = {
      'invoice.created': 'invoice_created',
      'invoice.sent': 'invoice_sent',
      'invoice.paid': 'invoice_paid',
      'invoice.overdue': 'invoice_overdue',
      'payment.succeeded': 'payment_succeeded',
      'payment.failed': 'payment_failed',
      'payment.refunded': 'payment_refunded',
    };

    return mappings[originalType] || originalType;
  }

  private mapEmailServiceEventType(originalType: string): string {
    const mappings: Record<string, string> = {
      'email.delivered': 'email_delivered',
      'email.opened': 'email_opened',
      'email.clicked': 'email_clicked',
      'email.bounced': 'email_bounced',
      'email.complained': 'email_complained',
    };

    return mappings[originalType] || originalType;
  }

  private generateSignature(
    payload: string,
    secret: string,
    prefix?: string,
  ): string {
    const signature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return prefix ? `${prefix}${signature}` : signature;
  }

  private timingSafeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  private async resolveOrganizationId(identifier: unknown): Promise<string> {
    if (!identifier) return 'unknown';

    try {
      // Try to find organization by client/wedding/event identifier
      const { data } = await this.supabaseClient
        .from('weddings')
        .select('organization_id')
        .or(`id.eq.${identifier},client_id.eq.${identifier}`)
        .single();

      return data?.organization_id || 'unknown';
    } catch (error) {
      console.warn(
        `Could not resolve organization ID for identifier: ${identifier}`,
      );
      return 'unknown';
    }
  }

  private async resolveOrganizationIdByEmail(email: unknown): Promise<string> {
    if (!email || typeof email !== 'string') return 'unknown';

    try {
      const { data } = await this.supabaseClient
        .from('clients')
        .select('organization_id')
        .eq('email', email)
        .single();

      return data?.organization_id || 'unknown';
    } catch (error) {
      console.warn(`Could not resolve organization ID for email: ${email}`);
      return 'unknown';
    }
  }

  private async loadVendorConfigs(): Promise<void> {
    try {
      const { data } = await this.supabaseClient
        .from('vendor_webhook_configs')
        .select('*')
        .eq('is_active', true);

      if (data) {
        for (const config of data) {
          this.vendorConfigs.set(config.vendor_name, {
            id: config.id,
            name: config.vendor_name,
            type: config.vendor_type,
            webhookSecret: config.webhook_secret,
            signatureHeader: config.signature_header || 'X-Hub-Signature-256',
            signaturePrefix: config.signature_prefix || 'sha256=',
            isActive: config.is_active,
            customMappings: config.custom_mappings,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load vendor configurations:', error);
    }
  }

  private async logIncomingWebhook(
    vendor: string,
    event: VendorEvent,
  ): Promise<void> {
    try {
      await this.supabaseClient.from('incoming_webhooks').insert({
        vendor_name: vendor,
        event_id: event.id,
        event_type: event.eventType,
        payload: event.payload,
        signature: event.signature,
        created_at: new Date().toISOString(),
        processed: false,
      });
    } catch (error) {
      console.error('Failed to log incoming webhook:', error);
    }
  }

  private async logWebhookProcessing(
    eventId: string,
    success: boolean,
    error?: string,
  ): Promise<void> {
    try {
      await this.supabaseClient
        .from('incoming_webhooks')
        .update({
          processed: true,
          processing_success: success,
          processing_error: error,
          processed_at: new Date().toISOString(),
        })
        .eq('event_id', eventId);
    } catch (error) {
      console.error('Failed to update webhook processing status:', error);
    }
  }
}
