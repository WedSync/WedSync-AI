import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  RealtimeEventMetadata,
  WeddingEventData,
  EmailTriggerEventData,
  WebhookEndpoint,
  RealtimeWebhookPayload,
  RealtimeEventType,
} from '@/types/realtime-integration';

interface WebhookManager {
  generateSignature(payload: string, secretKey: string): string;
}

export class RealtimeWebhookIntegration {
  private supabase: SupabaseClient;
  private webhookManager: WebhookManager;

  constructor(supabaseClient: SupabaseClient, webhookManager: WebhookManager) {
    this.supabase = supabaseClient;
    this.webhookManager = webhookManager;
  }

  // Database change to external webhook integration
  async handleDatabaseChange(
    table: string,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    oldRecord: any,
    newRecord: any,
    metadata: RealtimeEventMetadata,
  ): Promise<void> {
    try {
      // Get webhook endpoints for this table/event
      const { data: endpoints } = await this.supabase
        .from('webhook_endpoints')
        .select('*')
        .contains('subscribed_events', [`${table}.${eventType.toLowerCase()}`])
        .eq('is_active', true);

      if (!endpoints || endpoints.length === 0) return;

      // Process each webhook endpoint
      await Promise.all(
        endpoints.map((endpoint) =>
          this.sendRealtimeWebhook(endpoint, {
            eventId: `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            realtimeEventType: this.mapTableEventToRealtimeEvent(
              table,
              eventType,
            ),
            table,
            eventType,
            oldRecord: eventType !== 'INSERT' ? oldRecord : null,
            newRecord: eventType !== 'DELETE' ? newRecord : null,
            timestamp: new Date().toISOString(),
            metadata,
            organizationId: metadata.organizationId,
          }),
        ),
      );
    } catch (error) {
      console.error('Realtime webhook integration error:', error);
      await this.logIntegrationError('webhook', table, eventType, error);
    }
  }

  private mapTableEventToRealtimeEvent(
    table: string,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  ): keyof RealtimeEventType {
    const tableEventMap: Record<
      string,
      Record<string, keyof RealtimeEventType>
    > = {
      form_responses: {
        INSERT: 'FORM_RESPONSE_RECEIVED',
        UPDATE: 'FORM_RESPONSE_RECEIVED',
      },
      journey_progress: {
        UPDATE: 'JOURNEY_MILESTONE_COMPLETED',
      },
      weddings: {
        UPDATE: 'WEDDING_DATE_CHANGE',
      },
      clients: {
        UPDATE: 'CLIENT_PROFILE_UPDATED',
      },
      vendor_assignments: {
        INSERT: 'VENDOR_ASSIGNED',
        UPDATE: 'VENDOR_STATUS_CHANGE',
      },
      payments: {
        INSERT: 'PAYMENT_RECEIVED',
        UPDATE: 'PAYMENT_FAILED',
      },
      wedding_emergencies: {
        INSERT: 'EMERGENCY_ALERT',
        UPDATE: 'EMERGENCY_ALERT',
      },
    };

    return tableEventMap[table]?.[eventType] || 'FORM_RESPONSE_RECEIVED';
  }

  // Photography CRM integration for realtime updates
  async integratePhotographyCRM(
    supplierId: string,
    eventData: WeddingEventData,
  ): Promise<void> {
    // Get photography CRM endpoints for supplier
    const { data: crmConfig } = await this.supabase
      .from('supplier_integrations')
      .select('webhook_url, api_key, settings')
      .eq('supplier_id', supplierId)
      .eq('integration_type', 'photography_crm')
      .eq('is_active', true)
      .single();

    if (!crmConfig) return;

    // Transform event data for photography CRM format
    const crmPayload = this.transformForPhotographyCRM(eventData);

    // Send to CRM with proper authentication
    await this.sendExternalWebhook(crmConfig.webhook_url, crmPayload, {
      Authorization: `Bearer ${crmConfig.api_key}`,
      'X-Integration-Source': 'WedSync-Realtime',
      'Content-Type': 'application/json',
    });
  }

  // Venue booking system integration
  async integrateVenueBookingSystem(
    venueId: string,
    eventData: WeddingEventData,
  ): Promise<void> {
    const { data: venueConfig } = await this.supabase
      .from('venue_integrations')
      .select('webhook_url, api_credentials, notification_preferences')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .single();

    if (!venueConfig) return;

    // Transform event data for venue system format
    const venuePayload = this.transformForVenueSystem(eventData);

    // Send realtime update to venue system
    await this.sendExternalWebhook(venueConfig.webhook_url, venuePayload, {
      'X-Venue-API-Key': venueConfig.api_credentials.api_key,
      'X-Realtime-Event': 'wedding-update',
      'Content-Type': 'application/json',
    });
  }

  // Email marketing platform integration
  async integrateEmailPlatform(
    supplierId: string,
    eventData: EmailTriggerEventData,
  ): Promise<void> {
    const { data: emailConfig } = await this.supabase
      .from('email_integrations')
      .select('platform_type, api_key, webhook_url, trigger_settings')
      .eq('supplier_id', supplierId)
      .eq('is_active', true);

    if (!emailConfig || emailConfig.length === 0) return;

    // Process each email platform integration
    await Promise.all(
      emailConfig.map((config) => this.triggerEmailSequence(config, eventData)),
    );
  }

  // Send webhook with retry logic and monitoring
  private async sendRealtimeWebhook(
    endpoint: WebhookEndpoint,
    payload: RealtimeWebhookPayload,
  ): Promise<void> {
    try {
      // Generate webhook signature
      const signature = this.webhookManager.generateSignature(
        JSON.stringify(payload),
        endpoint.secret_key,
      );

      // Send webhook with realtime headers
      const response = await fetch(endpoint.endpoint_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WedSync-Signature': signature,
          'X-WedSync-Event': `${payload.table}.${payload.eventType.toLowerCase()}`,
          'X-WedSync-Timestamp': payload.timestamp,
          'X-WedSync-Source': 'realtime',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(
          `Webhook failed: ${response.status} ${response.statusText}`,
        );
      }

      // Log successful delivery
      await this.logWebhookDelivery(endpoint.id, payload, 'success');
    } catch (error) {
      // Log failed delivery and schedule retry
      await this.logWebhookDelivery(
        endpoint.id,
        payload,
        'failed',
        (error as Error).message,
      );
      await this.scheduleWebhookRetry(endpoint, payload);
    }
  }

  // Send to external webhook with authentication
  private async sendExternalWebhook(
    url: string,
    payload: any,
    headers: Record<string, string>,
  ): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`External webhook failed: ${response.status}`);
      }

      console.log('External webhook sent successfully:', url);
    } catch (error) {
      console.error('External webhook failed:', error);
      throw error;
    }
  }

  // Transform data for different external system formats
  private transformForPhotographyCRM(eventData: WeddingEventData): any {
    return {
      event_type: 'wedding_update',
      wedding_id: eventData.wedding_id,
      client_name: `${eventData.bride_name} & ${eventData.groom_name}`,
      wedding_date: eventData.wedding_date,
      ceremony_time: eventData.ceremony_time,
      venue_name: eventData.venue_name,
      guest_count: eventData.guest_count,
      photographer_notes: eventData.special_requests,
      updated_at: eventData.updated_at,
    };
  }

  private transformForVenueSystem(eventData: WeddingEventData): any {
    return {
      booking_id: eventData.wedding_id,
      event_date: eventData.wedding_date,
      party_size: eventData.guest_count,
      setup_time: eventData.setup_time,
      ceremony_start: eventData.ceremony_time,
      reception_start: eventData.reception_time,
      special_requirements: eventData.dietary_requirements,
      coordinator_notes: eventData.venue_notes,
      last_updated: eventData.updated_at,
    };
  }

  private async triggerEmailSequence(
    config: any,
    eventData: EmailTriggerEventData,
  ): Promise<void> {
    const emailPayload = {
      platform: config.platform_type,
      trigger_event: eventData.trigger_type,
      client_data: {
        email: eventData.client_email,
        first_name: eventData.client_first_name,
        wedding_date: eventData.wedding_date,
        milestone: eventData.milestone_name,
      },
      sequence_settings: config.trigger_settings,
    };

    await this.sendExternalWebhook(config.webhook_url, emailPayload, {
      Authorization: `Bearer ${config.api_key}`,
      'Content-Type': 'application/json',
      'X-Platform': config.platform_type,
    });
  }

  // Logging and monitoring methods
  private async logIntegrationError(
    type: string,
    table: string,
    eventType: string,
    error: any,
  ): Promise<void> {
    try {
      await this.supabase.from('integration_errors').insert({
        integration_type: type,
        table_name: table,
        event_type: eventType,
        error_message: error instanceof Error ? error.message : String(error),
        error_stack: error instanceof Error ? error.stack : null,
        created_at: new Date().toISOString(),
        severity: 'error',
      });
    } catch (logError) {
      console.error('Failed to log integration error:', logError);
    }
  }

  private async logWebhookDelivery(
    endpointId: string,
    payload: RealtimeWebhookPayload,
    status: 'success' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.supabase.from('webhook_deliveries').insert({
        endpoint_id: endpointId,
        payload: payload,
        status,
        error_message: errorMessage,
        delivered_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log webhook delivery:', logError);
    }
  }

  private async scheduleWebhookRetry(
    endpoint: WebhookEndpoint,
    payload: RealtimeWebhookPayload,
  ): Promise<void> {
    try {
      // Calculate next retry time with exponential backoff
      const retryCount = payload.metadata?.retryCount || 0;
      const nextRetryDelay = Math.min(Math.pow(2, retryCount) * 1000, 300000); // Max 5 minutes
      const nextRetry = new Date(Date.now() + nextRetryDelay);

      await this.supabase.from('webhook_retries').insert({
        endpoint_id: endpoint.id,
        payload: {
          ...payload,
          metadata: {
            ...payload.metadata,
            retryCount: retryCount + 1,
          },
        },
        scheduled_for: nextRetry.toISOString(),
        status: 'pending',
      });

      console.log(`Webhook retry scheduled for ${nextRetry.toISOString()}`);
    } catch (error) {
      console.error('Failed to schedule webhook retry:', error);
    }
  }
}
