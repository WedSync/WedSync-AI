import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export interface Timeline {
  id: string;
  weddingId: string;
  ceremonyTime: string;
  receptionTime: string;
  eventDate: string;
  venue: Venue;
  schedule: TimelineEvent[];
  specialRequests: string[];
  contactInfo: ContactInfo;
}

export interface TimelineEvent {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  location: string;
  description?: string;
  participants: string[];
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  contactInfo: ContactInfo;
}

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  partnerFirstName?: string;
  partnerLastName?: string;
  partnerEmail?: string;
  partnerPhone?: string;
  weddingDate: string;
  venue: string;
  preferences: ClientPreferences;
}

export interface ClientPreferences {
  communicationMethod: 'email' | 'phone' | 'text' | 'app';
  notificationFrequency: 'daily' | 'weekly' | 'monthly' | 'milestone';
  deliveryPreferences: {
    galleryFormat: 'online' | 'usb' | 'both';
    printOptions: string[];
  };
}

export interface CRMConfig {
  apiKey: string;
  baseUrl: string;
  userAgent?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface PhotoBookingWebhook {
  eventId: string;
  eventType:
    | 'booking.created'
    | 'booking.updated'
    | 'booking.confirmed'
    | 'gallery.ready';
  clientId: string;
  bookingData: Record<string, unknown>;
  timestamp: string;
  signature: string;
}

export interface SyncResult {
  success: boolean;
  processedCount: number;
  errorCount: number;
  errors: SyncError[];
  duration: number;
}

export interface SyncError {
  clientId: string;
  error: string;
  retryable: boolean;
}

const timelineEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string(),
  description: z.string().optional(),
  participants: z.array(z.string()),
});

const timelineSchema = z.object({
  id: z.string(),
  weddingId: z.string(),
  ceremonyTime: z.string(),
  receptionTime: z.string(),
  eventDate: z.string(),
  venue: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
  }),
  schedule: z.array(timelineEventSchema),
  specialRequests: z.array(z.string()),
});

export class PhotographyCRMIntegration {
  private supabaseClient;
  private crmConfigs = new Map<string, CRMConfig>();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseClient = createClient(supabaseUrl, supabaseKey);
    this.loadCRMConfigs();
  }

  async sendTimelineUpdate(
    timeline: Timeline,
    crmConfig: CRMConfig,
  ): Promise<void> {
    try {
      // Validate timeline data
      const validatedTimeline = timelineSchema.parse(timeline);

      // Transform timeline for CRM format
      const crmPayload = this.transformTimelineForCRM(
        validatedTimeline,
        crmConfig,
      );

      // Send to photography CRM
      const response = await this.makeAPICall(
        crmConfig,
        'POST',
        '/bookings/timeline',
        crmPayload,
      );

      if (!response.ok) {
        throw new Error(`CRM API error: ${response.statusText}`);
      }

      // Log successful update
      await this.logTimelineUpdate(timeline.id, crmConfig, true);
    } catch (error) {
      console.error('Failed to send timeline update to CRM:', error);
      await this.logTimelineUpdate(
        timeline.id,
        crmConfig,
        false,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  async receiveBookingUpdate(webhook: PhotoBookingWebhook): Promise<any> {
    try {
      // Validate webhook signature
      if (!this.validateWebhookSignature(webhook)) {
        throw new Error('Invalid webhook signature');
      }

      // Transform booking data to WedSync format
      const channelEvent = await this.transformBookingWebhook(webhook);

      // Log incoming webhook
      await this.logBookingWebhook(webhook, true);

      return channelEvent;
    } catch (error) {
      console.error('Failed to process booking webhook:', error);
      await this.logBookingWebhook(
        webhook,
        false,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  async syncClientProfiles(clients: Client[]): Promise<SyncResult> {
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    const errors: SyncError[] = [];

    for (const client of clients) {
      try {
        await this.syncSingleClient(client);
        processedCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          clientId: client.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: this.isRetryableError(error),
        });
      }
    }

    const duration = Date.now() - startTime;

    // Log sync result
    await this.logClientSync(processedCount, errorCount, duration);

    return {
      success: errorCount === 0,
      processedCount,
      errorCount,
      errors,
      duration,
    };
  }

  private async syncSingleClient(client: Client): Promise<void> {
    // Get CRM configuration for client's organization
    const crmConfig = await this.getCRMConfig(client.id);
    if (!crmConfig) {
      throw new Error('CRM configuration not found');
    }

    // Transform client data for CRM
    const crmClientData = this.transformClientForCRM(client);

    // Check if client exists in CRM
    const existingClient = await this.findCRMClient(crmConfig, client.email);

    if (existingClient) {
      // Update existing client
      await this.makeAPICall(
        crmConfig,
        'PUT',
        `/clients/${existingClient.id}`,
        crmClientData,
      );
    } else {
      // Create new client
      await this.makeAPICall(crmConfig, 'POST', '/clients', crmClientData);
    }
  }

  private transformTimelineForCRM(
    timeline: Timeline,
    crmConfig: CRMConfig,
  ): any {
    return {
      booking_id: timeline.weddingId,
      event_date: timeline.eventDate,
      ceremony_time: timeline.ceremonyTime,
      reception_time: timeline.receptionTime,
      venue: {
        name: timeline.venue.name,
        address: timeline.venue.address,
        contact: {
          name: timeline.venue.contactInfo.name,
          email: timeline.venue.contactInfo.email,
          phone: timeline.venue.contactInfo.phone,
        },
      },
      timeline: timeline.schedule.map((event) => ({
        event_name: event.name,
        start_time: event.startTime,
        end_time: event.endTime,
        location: event.location,
        description: event.description,
        participants: event.participants,
      })),
      special_requests: timeline.specialRequests,
      contact_info: {
        primary: timeline.contactInfo,
      },
      updated_at: new Date().toISOString(),
      source: 'wedsync',
    };
  }

  private async transformBookingWebhook(
    webhook: PhotoBookingWebhook,
  ): Promise<any> {
    const bookingData = webhook.bookingData;

    return {
      id: `photo-crm-${webhook.eventId}`,
      channelName: `supplier:photography:${await this.resolveOrganizationId(webhook.clientId)}`,
      eventType: this.mapCRMEventType(webhook.eventType),
      payload: {
        bookingId: webhook.eventId,
        clientId: webhook.clientId,
        eventDate: bookingData.event_date,
        ceremonyTime: bookingData.ceremony_time,
        venue: bookingData.venue_name,
        photographerNotes: bookingData.photographer_notes,
        galleryStatus: bookingData.gallery_status,
        deliveryStatus: bookingData.delivery_status,
        paymentStatus: bookingData.payment_status,
        contractStatus: bookingData.contract_status,
        originalData: bookingData,
      },
      timestamp: webhook.timestamp,
      organizationId: await this.resolveOrganizationId(webhook.clientId),
      weddingId: webhook.eventId,
      metadata: {
        vendor: 'photography-crm',
        originalEventType: webhook.eventType,
        source: 'webhook',
      },
    };
  }

  private transformClientForCRM(client: Client): any {
    return {
      first_name: client.firstName,
      last_name: client.lastName,
      email: client.email,
      phone: client.phone,
      partner_first_name: client.partnerFirstName,
      partner_last_name: client.partnerLastName,
      partner_email: client.partnerEmail,
      partner_phone: client.partnerPhone,
      wedding_date: client.weddingDate,
      venue: client.venue,
      communication_preferences: {
        method: client.preferences.communicationMethod,
        frequency: client.preferences.notificationFrequency,
      },
      delivery_preferences: {
        gallery_format: client.preferences.deliveryPreferences.galleryFormat,
        print_options: client.preferences.deliveryPreferences.printOptions,
      },
      created_via: 'wedsync',
      sync_enabled: true,
      last_synced: new Date().toISOString(),
    };
  }

  private mapCRMEventType(crmEventType: string): string {
    const mappings: Record<string, string> = {
      'booking.created': 'photography_booking_created',
      'booking.updated': 'photography_booking_updated',
      'booking.confirmed': 'photography_booking_confirmed',
      'gallery.ready': 'photography_gallery_ready',
      'gallery.delivered': 'photography_gallery_delivered',
      'contract.signed': 'photography_contract_signed',
      'payment.received': 'photography_payment_received',
    };

    return mappings[crmEventType] || crmEventType;
  }

  private async makeAPICall(
    config: CRMConfig,
    method: string,
    endpoint: string,
    data?: any,
  ): Promise<Response> {
    const url = `${config.baseUrl.replace(/\/$/, '')}${endpoint}`;
    const timeout = config.timeout || 30000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'User-Agent': config.userAgent || 'WedSync-Integration/1.0',
          'X-Source': 'wedsync',
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async findCRMClient(
    config: CRMConfig,
    email: string,
  ): Promise<any | null> {
    try {
      const response = await this.makeAPICall(
        config,
        'GET',
        `/clients?email=${encodeURIComponent(email)}`,
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.clients && data.clients.length > 0 ? data.clients[0] : null;
    } catch (error) {
      console.warn(`Failed to find CRM client by email ${email}:`, error);
      return null;
    }
  }

  private validateWebhookSignature(webhook: PhotoBookingWebhook): boolean {
    // This would implement HMAC signature validation
    // For now, returning true for development
    return true;
  }

  private async getCRMConfig(clientId: string): Promise<CRMConfig | null> {
    try {
      const { data } = await this.supabaseClient
        .from('photography_crm_configs')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .single();

      if (!data) return null;

      return {
        apiKey: data.api_key,
        baseUrl: data.base_url,
        userAgent: data.user_agent,
        timeout: data.timeout,
        retryAttempts: data.retry_attempts,
      };
    } catch (error) {
      console.error(`Failed to get CRM config for client ${clientId}:`, error);
      return null;
    }
  }

  private async resolveOrganizationId(clientId: string): Promise<string> {
    try {
      const { data } = await this.supabaseClient
        .from('clients')
        .select('organization_id')
        .eq('id', clientId)
        .single();

      return data?.organization_id || 'unknown';
    } catch (error) {
      console.warn(`Could not resolve organization ID for client: ${clientId}`);
      return 'unknown';
    }
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const retryableMessages = [
        'timeout',
        'network',
        'connection',
        'temporary',
        'rate limit',
      ];

      return retryableMessages.some((msg) =>
        error.message.toLowerCase().includes(msg),
      );
    }

    return false;
  }

  private async loadCRMConfigs(): Promise<void> {
    try {
      const { data } = await this.supabaseClient
        .from('photography_crm_configs')
        .select('*')
        .eq('is_active', true);

      if (data) {
        for (const config of data) {
          this.crmConfigs.set(config.organization_id, {
            apiKey: config.api_key,
            baseUrl: config.base_url,
            userAgent: config.user_agent,
            timeout: config.timeout,
            retryAttempts: config.retry_attempts,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load CRM configurations:', error);
    }
  }

  private async logTimelineUpdate(
    timelineId: string,
    crmConfig: CRMConfig,
    success: boolean,
    error?: string,
  ): Promise<void> {
    try {
      await this.supabaseClient.from('crm_timeline_updates').insert({
        timeline_id: timelineId,
        crm_base_url: crmConfig.baseUrl,
        success,
        error_message: error,
        updated_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log timeline update:', logError);
    }
  }

  private async logBookingWebhook(
    webhook: PhotoBookingWebhook,
    success: boolean,
    error?: string,
  ): Promise<void> {
    try {
      await this.supabaseClient.from('crm_booking_webhooks').insert({
        event_id: webhook.eventId,
        event_type: webhook.eventType,
        client_id: webhook.clientId,
        processing_success: success,
        error_message: error,
        received_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log booking webhook:', logError);
    }
  }

  private async logClientSync(
    processedCount: number,
    errorCount: number,
    duration: number,
  ): Promise<void> {
    try {
      await this.supabaseClient.from('crm_client_syncs').insert({
        processed_count: processedCount,
        error_count: errorCount,
        duration_ms: duration,
        synced_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log client sync:', logError);
    }
  }
}
