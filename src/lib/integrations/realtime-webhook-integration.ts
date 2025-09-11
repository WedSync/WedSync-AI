// WS-202: Realtime Webhook Integration Service
// Handles external webhook delivery with security, rate limiting, and wedding-specific transformations

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  RealtimeEventMetadata,
  WebhookEndpoint,
  RealtimeWebhookPayload,
  WeddingEventData,
  EmailTriggerEventData,
  WebhookDeliveryResult,
  WebhookDeliveryError,
  IntegrationSecurityError,
  RealtimeIntegrationError,
} from '@/types/realtime-integration';

export class RealtimeWebhookIntegration {
  private supabase: SupabaseClient;
  private readonly timeoutMs = 10000; // 10 seconds
  private readonly maxRetries = 3;
  private readonly rateLimitWindow = 60000; // 1 minute
  private readonly maxRequestsPerWindow = 100;

  // Rate limiting tracking
  private rateLimitTracking = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Handle database changes and trigger appropriate external webhooks
   */
  async handleDatabaseChange(
    table: string,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    oldRecord: any,
    newRecord: any,
    metadata: RealtimeEventMetadata,
  ): Promise<void> {
    try {
      // Get active webhook endpoints for this table/event combination
      const { data: endpoints, error } = await this.supabase
        .from('webhook_endpoints')
        .select('*')
        .contains('subscribed_events', [`${table}.${eventType.toLowerCase()}`])
        .eq('is_active', true)
        .eq('organization_id', metadata.organizationId);

      if (error) {
        throw new RealtimeIntegrationError(
          `Failed to fetch webhook endpoints: ${error.message}`,
          'DATABASE_ERROR',
          { table, eventType, error },
        );
      }

      if (!endpoints || endpoints.length === 0) {
        // No webhooks configured for this event - not an error
        return;
      }

      // Process each webhook endpoint
      const deliveryPromises = endpoints.map((endpoint) =>
        this.sendRealtimeWebhook(endpoint, {
          eventId: `${table}-${eventType}-${Date.now()}`,
          realtimeEventType: this.mapToRealtimeEventType(table, eventType),
          table,
          eventType,
          oldRecord: eventType !== 'INSERT' ? oldRecord : undefined,
          newRecord: eventType !== 'DELETE' ? newRecord : undefined,
          timestamp: new Date().toISOString(),
          metadata,
          organizationId: metadata.organizationId,
        }),
      );

      // Execute all webhook deliveries in parallel
      const results = await Promise.allSettled(deliveryPromises);

      // Log any failed deliveries
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(
            `Webhook delivery failed for endpoint ${endpoints[index].id}:`,
            result.reason,
          );
          this.logIntegrationError('webhook', table, eventType, result.reason);
        }
      });
    } catch (error) {
      console.error('Realtime webhook integration error:', error);
      await this.logIntegrationError('webhook', table, eventType, error);
      // Don't throw - webhook failures shouldn't break the main application flow
    }
  }

  /**
   * Integrate with photography CRM systems for realtime updates
   */
  async integratePhotographyCRM(
    supplierId: string,
    eventData: WeddingEventData,
  ): Promise<void> {
    try {
      // Get photography CRM configuration for this supplier
      const { data: crmConfig, error } = await this.supabase
        .from('external_integrations')
        .select('webhook_url, credentials, system_name')
        .eq('supplier_id', supplierId)
        .eq('system_type', 'photography_crm')
        .eq('is_active', true)
        .single();

      if (error || !crmConfig) {
        // No CRM integration configured - not an error
        return;
      }

      // Transform event data for photography CRM format
      const crmPayload = this.transformForPhotographyCRM(eventData);

      // Send to CRM with proper authentication
      await this.sendExternalWebhook(
        crmConfig.webhook_url,
        crmPayload,
        this.getPhotographyCRMHeaders(crmConfig),
        'photography_crm',
      );

      // Log successful integration
      await this.logSuccessfulIntegration(
        'photography_crm',
        supplierId,
        eventData.weddingId,
      );
    } catch (error) {
      console.error('Photography CRM integration error:', error);
      await this.logIntegrationError(
        'photography_crm',
        'wedding_update',
        'ERROR',
        error,
      );
    }
  }

  /**
   * Integrate with venue booking systems for realtime updates
   */
  async integrateVenueBookingSystem(
    venueId: string,
    eventData: WeddingEventData,
  ): Promise<void> {
    try {
      const { data: venueConfig, error } = await this.supabase
        .from('external_integrations')
        .select('webhook_url, credentials, system_name')
        .eq('venue_id', venueId)
        .eq('system_type', 'venue_booking')
        .eq('is_active', true)
        .single();

      if (error || !venueConfig) {
        return;
      }

      // Transform event data for venue system format
      const venuePayload = this.transformForVenueSystem(eventData);

      // Send realtime update to venue system
      await this.sendExternalWebhook(
        venueConfig.webhook_url,
        venuePayload,
        this.getVenueSystemHeaders(venueConfig),
        'venue_booking',
      );

      await this.logSuccessfulIntegration(
        'venue_booking',
        venueId,
        eventData.weddingId,
      );
    } catch (error) {
      console.error('Venue booking system integration error:', error);
      await this.logIntegrationError(
        'venue_booking',
        'wedding_update',
        'ERROR',
        error,
      );
    }
  }

  /**
   * Integrate with email marketing platforms for automated campaigns
   */
  async integrateEmailPlatform(
    supplierId: string,
    eventData: EmailTriggerEventData,
  ): Promise<void> {
    try {
      const { data: emailConfigs, error } = await this.supabase
        .from('external_integrations')
        .select('webhook_url, credentials, system_name, settings')
        .eq('supplier_id', supplierId)
        .eq('system_type', 'email_marketing')
        .eq('is_active', true);

      if (error || !emailConfigs || emailConfigs.length === 0) {
        return;
      }

      // Process each email platform integration
      const integrationPromises = emailConfigs.map((config) =>
        this.triggerEmailSequence(config, eventData),
      );

      await Promise.allSettled(integrationPromises);
    } catch (error) {
      console.error('Email platform integration error:', error);
      await this.logIntegrationError(
        'email_platform',
        'trigger_sequence',
        'ERROR',
        error,
      );
    }
  }

  /**
   * Send webhook with retry logic, rate limiting, and monitoring
   */
  private async sendRealtimeWebhook(
    endpoint: WebhookEndpoint,
    payload: RealtimeWebhookPayload,
    retryAttempt = 0,
  ): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();

    try {
      // Check rate limiting
      await this.checkRateLimit(endpoint.id);

      // Generate webhook signature for security
      const signature = this.generateWebhookSignature(
        JSON.stringify(payload),
        endpoint.secretKey,
      );

      // Send webhook with security headers
      const response = await fetch(endpoint.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WedSync-Signature': signature,
          'X-WedSync-Event': `${payload.table}.${payload.eventType.toLowerCase()}`,
          'X-WedSync-Timestamp': payload.timestamp,
          'X-WedSync-Source': 'realtime',
          'X-WedSync-Organization': payload.organizationId,
          'User-Agent': 'WedSync-Realtime/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new WebhookDeliveryError(
          `Webhook failed with status ${response.status}`,
          endpoint.endpointUrl,
          response.status,
          { statusText: response.statusText },
        );
      }

      // Log successful delivery
      const result: WebhookDeliveryResult = {
        endpointId: endpoint.id,
        status: 'success',
        statusCode: response.status,
        responseTime,
        retryAttempt,
        deliveredAt: new Date().toISOString(),
      };

      await this.logWebhookDelivery(endpoint.id, payload, result);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const isTimeout =
        error instanceof DOMException && error.name === 'TimeoutError';
      const isRateLimit =
        error instanceof IntegrationSecurityError &&
        error.securityIssue === 'rate_limit_exceeded';

      const result: WebhookDeliveryResult = {
        endpointId: endpoint.id,
        status: isTimeout ? 'timeout' : isRateLimit ? 'rate_limited' : 'failed',
        responseTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        retryAttempt,
        deliveredAt: new Date().toISOString(),
      };

      // Log failed delivery
      await this.logWebhookDelivery(endpoint.id, payload, result);

      // Retry logic for non-rate-limit errors
      if (!isRateLimit && retryAttempt < this.maxRetries) {
        const retryDelay = Math.pow(2, retryAttempt) * 1000; // Exponential backoff
        await this.delay(retryDelay);
        return this.sendRealtimeWebhook(endpoint, payload, retryAttempt + 1);
      }

      // Update endpoint failure count
      await this.updateEndpointFailureCount(endpoint.id);

      return result;
    }
  }

  /**
   * Send webhook to external system with authentication
   */
  private async sendExternalWebhook(
    url: string,
    payload: any,
    headers: Record<string, string>,
    systemType: string,
  ): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        throw new WebhookDeliveryError(
          `External webhook failed with status ${response.status}`,
          url,
          response.status,
        );
      }
    } catch (error) {
      console.error(`External webhook error for ${systemType}:`, error);
      throw error;
    }
  }

  /**
   * Transform wedding data for photography CRM systems
   */
  private transformForPhotographyCRM(eventData: WeddingEventData): any {
    return {
      event_type: 'wedding_update',
      client: {
        id: eventData.weddingId,
        bride_name: eventData.brideName,
        groom_name: eventData.groomName,
        wedding_date: eventData.weddingDate,
        ceremony_time: eventData.ceremonyTime,
        guest_count: eventData.guestCount,
      },
      venue: {
        name: eventData.venueName,
        id: eventData.venueId,
      },
      timeline: {
        ceremony_start: eventData.ceremonyTime,
        reception_start: eventData.receptionTime,
        setup_time: eventData.setupTime,
      },
      notes: {
        special_requests: eventData.specialRequests,
        dietary_requirements: eventData.dietaryRequirements,
        venue_notes: eventData.venueNotes,
      },
      metadata: {
        source: 'wedsync',
        updated_at: eventData.updatedAt,
      },
    };
  }

  /**
   * Transform wedding data for venue booking systems
   */
  private transformForVenueSystem(eventData: WeddingEventData): any {
    return {
      booking_update: {
        booking_id: eventData.weddingId,
        client_names: `${eventData.brideName} & ${eventData.groomName}`,
        event_date: eventData.weddingDate,
        party_size: eventData.guestCount,
        schedule: {
          setup_time: eventData.setupTime,
          ceremony_start: eventData.ceremonyTime,
          reception_start: eventData.receptionTime,
        },
        requirements: {
          dietary: eventData.dietaryRequirements,
          special_requests: eventData.specialRequests,
          notes: eventData.venueNotes,
        },
        last_updated: eventData.updatedAt,
      },
    };
  }

  /**
   * Trigger email marketing sequence based on realtime event
   */
  private async triggerEmailSequence(
    config: any,
    eventData: EmailTriggerEventData,
  ): Promise<void> {
    const emailPayload = {
      trigger: {
        event: eventData.eventType,
        timestamp: new Date().toISOString(),
        priority: eventData.priority,
      },
      recipient: {
        email: eventData.recipientEmail,
        variables: eventData.variables,
      },
      campaign: {
        template_id: eventData.templateId,
        send_at: eventData.sendAt || new Date().toISOString(),
        wedding_id: eventData.weddingId,
      },
    };

    await this.sendExternalWebhook(
      config.webhook_url,
      emailPayload,
      this.getEmailPlatformHeaders(config),
      'email_platform',
    );
  }

  /**
   * Generate secure webhook signature using HMAC-SHA256
   */
  private generateWebhookSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify webhook signature for incoming webhooks
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = this.generateWebhookSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(endpointId: string): Promise<void> {
    const now = Date.now();
    const tracking = this.rateLimitTracking.get(endpointId);

    if (!tracking || now > tracking.resetTime) {
      // Reset or initialize tracking
      this.rateLimitTracking.set(endpointId, {
        count: 1,
        resetTime: now + this.rateLimitWindow,
      });
      return;
    }

    if (tracking.count >= this.maxRequestsPerWindow) {
      throw new IntegrationSecurityError(
        `Rate limit exceeded for endpoint ${endpointId}`,
        'rate_limit_exceeded',
        { endpointId, limit: this.maxRequestsPerWindow },
      );
    }

    tracking.count++;
  }

  /**
   * Map database table/event to realtime event type
   */
  private mapToRealtimeEventType(table: string, eventType: string): any {
    const mappings: Record<string, any> = {
      'form_responses.INSERT': 'form_response_received',
      'journey_progress.UPDATE': 'journey_milestone_completed',
      'wedding_details.UPDATE': 'wedding_timeline_updated',
      'core_fields.UPDATE': 'client_profile_updated',
      'payments.INSERT': 'payment_received',
    };

    const key = `${table}.${eventType}`;
    return mappings[key] || 'unknown_event';
  }

  /**
   * Get authentication headers for photography CRM
   */
  private getPhotographyCRMHeaders(config: any): Record<string, string> {
    const credentials = JSON.parse(config.credentials);

    switch (config.system_name.toLowerCase()) {
      case 'tave':
        return {
          'X-Tave-API-Key': credentials.apiKey,
          'X-Tave-Signature': this.generateTaveSignature(credentials),
          'X-Integration-Source': 'WedSync-Realtime',
        };
      case 'honeybook':
        return {
          Authorization: `Bearer ${credentials.accessToken}`,
          'X-Integration-Source': 'WedSync-Realtime',
        };
      default:
        return {
          Authorization: `Bearer ${credentials.apiKey}`,
          'X-Integration-Source': 'WedSync-Realtime',
        };
    }
  }

  /**
   * Get authentication headers for venue systems
   */
  private getVenueSystemHeaders(config: any): Record<string, string> {
    const credentials = JSON.parse(config.credentials);

    return {
      'X-Venue-API-Key': credentials.apiKey,
      'X-Realtime-Event': 'wedding-update',
      'X-Integration-Source': 'WedSync-Realtime',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get authentication headers for email platforms
   */
  private getEmailPlatformHeaders(config: any): Record<string, string> {
    const credentials = JSON.parse(config.credentials);

    switch (config.system_name.toLowerCase()) {
      case 'mailchimp':
        return {
          Authorization: `Basic ${Buffer.from(`anystring:${credentials.apiKey}`).toString('base64')}`,
          'X-Integration-Source': 'WedSync-Realtime',
        };
      case 'constant_contact':
        return {
          Authorization: `Bearer ${credentials.accessToken}`,
          'X-Integration-Source': 'WedSync-Realtime',
        };
      default:
        return {
          Authorization: `Bearer ${credentials.apiKey}`,
          'X-Integration-Source': 'WedSync-Realtime',
        };
    }
  }

  /**
   * Generate Tave-specific signature
   */
  private generateTaveSignature(credentials: any): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = `${credentials.apiKey}${timestamp}`;
    return crypto
      .createHmac('sha256', credentials.secretKey)
      .update(payload)
      .digest('hex');
  }

  /**
   * Log successful integration
   */
  private async logSuccessfulIntegration(
    integrationType: string,
    entityId: string,
    weddingId: string,
  ): Promise<void> {
    try {
      await this.supabase.from('integration_logs').insert({
        integration_type: integrationType,
        entity_id: entityId,
        wedding_id: weddingId,
        status: 'success',
        logged_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log successful integration:', error);
    }
  }

  /**
   * Log integration errors
   */
  private async logIntegrationError(
    integrationType: string,
    table: string,
    eventType: string,
    error: any,
  ): Promise<void> {
    try {
      await this.supabase.from('integration_error_logs').insert({
        integration_type: integrationType,
        table_name: table,
        event_type: eventType,
        error_message: error instanceof Error ? error.message : String(error),
        error_details: error instanceof Error ? error.stack : undefined,
        logged_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log integration error:', logError);
    }
  }

  /**
   * Log webhook delivery results
   */
  private async logWebhookDelivery(
    endpointId: string,
    payload: RealtimeWebhookPayload,
    result: WebhookDeliveryResult,
  ): Promise<void> {
    try {
      await this.supabase.from('webhook_delivery_logs').insert({
        endpoint_id: endpointId,
        event_type: payload.eventType,
        status: result.status,
        status_code: result.statusCode,
        response_time: result.responseTime,
        retry_attempt: result.retryAttempt,
        error_message: result.errorMessage,
        delivered_at: result.deliveredAt,
      });
    } catch (error) {
      console.error('Failed to log webhook delivery:', error);
    }
  }

  /**
   * Update endpoint failure count
   */
  private async updateEndpointFailureCount(endpointId: string): Promise<void> {
    try {
      await this.supabase
        .from('webhook_endpoints')
        .update({
          failure_count: this.supabase.rpc('increment_failure_count', {
            endpoint_id: endpointId,
          }),
          last_failure_at: new Date().toISOString(),
        })
        .eq('id', endpointId);
    } catch (error) {
      console.error('Failed to update endpoint failure count:', error);
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
