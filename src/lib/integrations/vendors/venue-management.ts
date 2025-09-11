import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export interface VenueEvent {
  id: string;
  organizationId: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  ceremonyTime?: string;
  receptionTime?: string;
  guestCount: number;
  venueSpaces: VenueSpace[];
  setupRequirements: SetupRequirement[];
  cateringDetails: CateringDetails;
  contactInfo: VenueContactInfo;
  specialRequests: string[];
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
}

export interface VenueSpace {
  id: string;
  name: string;
  type: 'ceremony' | 'reception' | 'cocktail' | 'prep' | 'storage';
  capacity: number;
  startTime: string;
  endTime: string;
  setupNotes?: string;
}

export interface SetupRequirement {
  id: string;
  category: 'furniture' | 'av' | 'decor' | 'lighting' | 'catering';
  item: string;
  quantity: number;
  location: string;
  setupTime: string;
  notes?: string;
}

export interface CateringDetails {
  vendorName?: string;
  vendorContact?: VenueContactInfo;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'cocktail' | 'buffet' | 'plated';
  guestCount: number;
  dietaryRestrictions: string[];
  setupRequirements: string[];
  serviceTime: string;
}

export interface VenueContactInfo {
  name: string;
  role: string;
  email: string;
  phone: string;
  alternativePhone?: string;
}

export interface VenueConfig {
  apiKey: string;
  baseUrl: string;
  venueId: string;
  webhookSecret?: string;
  customSettings?: Record<string, unknown>;
}

export interface CapacityWebhook {
  eventId: string;
  eventType:
    | 'capacity.updated'
    | 'booking.created'
    | 'booking.cancelled'
    | 'setup.scheduled';
  venueId: string;
  eventData: Record<string, unknown>;
  timestamp: string;
  signature?: string;
}

export interface VenueAvailability {
  date: string;
  timeSlots: TimeSlot[];
  maxCapacity: number;
  availableSpaces: string[];
  restrictions: string[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  currentBooking?: string;
  capacity: number;
}

const venueEventSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  eventName: z.string(),
  eventDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  guestCount: z.number().min(1),
  status: z.enum([
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
  ]),
});

export class VenueManagementIntegration {
  private supabaseClient;
  private venueConfigs = new Map<string, VenueConfig>();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseClient = createClient(supabaseUrl, supabaseKey);
    this.loadVenueConfigs();
  }

  async sendGuestCountUpdate(
    count: number,
    venueConfig: VenueConfig,
  ): Promise<void> {
    try {
      // Validate guest count
      if (count < 1) {
        throw new Error('Guest count must be positive');
      }

      // Prepare venue API payload
      const venuePayload = {
        event_id: await this.getCurrentEventId(venueConfig.venueId),
        guest_count: count,
        updated_at: new Date().toISOString(),
        updated_by: 'wedsync',
        requires_confirmation:
          count > (await this.getVenueCapacity(venueConfig.venueId)),
      };

      // Send to venue management system
      const response = await this.makeVenueAPICall(
        venueConfig,
        'PUT',
        `/events/${venuePayload.event_id}/guest-count`,
        venuePayload,
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Venue API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      // Log successful update
      await this.logGuestCountUpdate(count, venueConfig, true, result);

      // Check if venue capacity exceeded
      if (result.capacity_exceeded) {
        await this.handleCapacityExceeded(count, venueConfig, result);
      }
    } catch (error) {
      console.error('Failed to send guest count update to venue:', error);
      await this.logGuestCountUpdate(
        count,
        venueConfig,
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  async receiveCapacityAlert(webhook: CapacityWebhook): Promise<any> {
    try {
      // Validate webhook signature if present
      if (webhook.signature && !this.validateVenueWebhookSignature(webhook)) {
        throw new Error('Invalid venue webhook signature');
      }

      // Transform venue webhook to channel event
      const channelEvent = await this.transformCapacityWebhook(webhook);

      // Log incoming webhook
      await this.logCapacityWebhook(webhook, true);

      return channelEvent;
    } catch (error) {
      console.error('Failed to process capacity alert webhook:', error);
      await this.logCapacityWebhook(
        webhook,
        false,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  async syncEventDetails(
    events: VenueEvent[],
  ): Promise<{ success: boolean; results: SyncEventResult[] }> {
    const results: SyncEventResult[] = [];

    for (const event of events) {
      try {
        // Validate event data
        const validatedEvent = venueEventSchema.parse(event);

        // Get venue configuration
        const venueConfig = await this.getVenueConfig(event.organizationId);
        if (!venueConfig) {
          throw new Error('Venue configuration not found');
        }

        // Sync individual event
        await this.syncSingleEvent(validatedEvent, venueConfig);

        results.push({
          eventId: event.id,
          success: true,
          message: 'Event synced successfully',
        });
      } catch (error) {
        results.push({
          eventId: event.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const success = results.every((result) => result.success);
    await this.logEventSync(
      events.length,
      success ? events.length : 0,
      results.length - (success ? events.length : 0),
    );

    return { success, results };
  }

  async checkVenueAvailability(
    venueId: string,
    date: string,
    guestCount: number,
  ): Promise<VenueAvailability> {
    try {
      const venueConfig = await this.getVenueConfigByVenueId(venueId);
      if (!venueConfig) {
        throw new Error('Venue configuration not found');
      }

      const response = await this.makeVenueAPICall(
        venueConfig,
        'GET',
        `/availability?date=${date}&guests=${guestCount}`,
      );

      if (!response.ok) {
        throw new Error(`Venue API error: ${response.statusText}`);
      }

      const availabilityData = await response.json();
      return this.transformVenueAvailability(availabilityData);
    } catch (error) {
      console.error(
        `Failed to check venue availability for ${venueId}:`,
        error,
      );
      throw error;
    }
  }

  async createVenueBooking(
    event: VenueEvent,
  ): Promise<{ bookingId: string; confirmationNumber: string }> {
    try {
      const venueConfig = await this.getVenueConfig(event.organizationId);
      if (!venueConfig) {
        throw new Error('Venue configuration not found');
      }

      const bookingPayload = this.transformEventForVenue(event);

      const response = await this.makeVenueAPICall(
        venueConfig,
        'POST',
        '/bookings',
        bookingPayload,
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create venue booking: ${response.status} ${errorText}`,
        );
      }

      const result = await response.json();

      // Log successful booking creation
      await this.logVenueBooking(event.id, result.booking_id, true);

      return {
        bookingId: result.booking_id,
        confirmationNumber: result.confirmation_number,
      };
    } catch (error) {
      console.error('Failed to create venue booking:', error);
      await this.logVenueBooking(
        event.id,
        null,
        false,
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw error;
    }
  }

  private async syncSingleEvent(
    event: VenueEvent,
    venueConfig: VenueConfig,
  ): Promise<void> {
    // Transform event data for venue system
    const venueEventData = this.transformEventForVenue(event);

    // Check if event already exists in venue system
    const existingEvent = await this.findVenueEvent(venueConfig, event.id);

    if (existingEvent) {
      // Update existing event
      await this.makeVenueAPICall(
        venueConfig,
        'PUT',
        `/events/${existingEvent.venue_event_id}`,
        venueEventData,
      );
    } else {
      // Create new event
      await this.makeVenueAPICall(venueConfig, 'POST', '/events', {
        ...venueEventData,
        external_event_id: event.id,
        source: 'wedsync',
      });
    }
  }

  private transformEventForVenue(event: VenueEvent): any {
    return {
      event_name: event.eventName,
      event_date: event.eventDate,
      start_time: event.startTime,
      end_time: event.endTime,
      ceremony_time: event.ceremonyTime,
      reception_time: event.receptionTime,
      guest_count: event.guestCount,
      spaces: event.venueSpaces.map((space) => ({
        space_id: space.id,
        space_name: space.name,
        space_type: space.type,
        capacity: space.capacity,
        start_time: space.startTime,
        end_time: space.endTime,
        setup_notes: space.setupNotes,
      })),
      setup_requirements: event.setupRequirements.map((req) => ({
        category: req.category,
        item: req.item,
        quantity: req.quantity,
        location: req.location,
        setup_time: req.setupTime,
        notes: req.notes,
      })),
      catering: {
        vendor_name: event.cateringDetails.vendorName,
        meal_type: event.cateringDetails.mealType,
        guest_count: event.cateringDetails.guestCount,
        dietary_restrictions: event.cateringDetails.dietaryRestrictions,
        service_time: event.cateringDetails.serviceTime,
        setup_requirements: event.cateringDetails.setupRequirements,
      },
      primary_contact: {
        name: event.contactInfo.name,
        role: event.contactInfo.role,
        email: event.contactInfo.email,
        phone: event.contactInfo.phone,
        alternative_phone: event.contactInfo.alternativePhone,
      },
      special_requests: event.specialRequests,
      status: event.status,
      updated_at: new Date().toISOString(),
    };
  }

  private async transformCapacityWebhook(
    webhook: CapacityWebhook,
  ): Promise<any> {
    const eventData = webhook.eventData;
    const organizationId = await this.resolveOrganizationIdByVenue(
      webhook.venueId,
    );

    return {
      id: `venue-mgmt-${webhook.eventId}`,
      channelName: `supplier:venue:${organizationId}`,
      eventType: this.mapVenueEventType(webhook.eventType),
      payload: {
        eventId: webhook.eventId,
        venueId: webhook.venueId,
        venueName: eventData.venue_name,
        eventDate: eventData.event_date,
        ceremonyTime: eventData.ceremony_time,
        receptionTime: eventData.reception_time,
        guestCount: eventData.guest_count,
        maxCapacity: eventData.max_capacity,
        capacityExceeded: eventData.capacity_exceeded,
        availableSpaces: eventData.available_spaces,
        setupRequirements: eventData.setup_requirements,
        specialRequests: eventData.special_requests,
        contactInfo: eventData.primary_contact,
        bookingStatus: eventData.booking_status,
        originalData: eventData,
      },
      timestamp: webhook.timestamp,
      organizationId,
      weddingId: webhook.eventId,
      metadata: {
        vendor: 'venue-management',
        originalEventType: webhook.eventType,
        source: 'webhook',
        venueId: webhook.venueId,
      },
    };
  }

  private transformVenueAvailability(venueData: any): VenueAvailability {
    return {
      date: venueData.date,
      maxCapacity: venueData.max_capacity,
      availableSpaces: venueData.available_spaces || [],
      restrictions: venueData.restrictions || [],
      timeSlots: (venueData.time_slots || []).map((slot: any) => ({
        startTime: slot.start_time,
        endTime: slot.end_time,
        isAvailable: slot.is_available,
        currentBooking: slot.current_booking,
        capacity: slot.capacity,
      })),
    };
  }

  private mapVenueEventType(venueEventType: string): string {
    const mappings: Record<string, string> = {
      'capacity.updated': 'venue_capacity_updated',
      'booking.created': 'venue_booking_created',
      'booking.confirmed': 'venue_booking_confirmed',
      'booking.cancelled': 'venue_booking_cancelled',
      'setup.scheduled': 'venue_setup_scheduled',
      'catering.updated': 'venue_catering_updated',
      'space.assigned': 'venue_space_assigned',
    };

    return mappings[venueEventType] || venueEventType;
  }

  private async makeVenueAPICall(
    config: VenueConfig,
    method: string,
    endpoint: string,
    data?: any,
  ): Promise<Response> {
    const url = `${config.baseUrl.replace(/\/$/, '')}${endpoint}`;
    const timeout = 30000; // 30 seconds

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'X-Venue-ID': config.venueId,
          'User-Agent': 'WedSync-Integration/1.0',
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

  private async findVenueEvent(
    config: VenueConfig,
    eventId: string,
  ): Promise<any | null> {
    try {
      const response = await this.makeVenueAPICall(
        config,
        'GET',
        `/events?external_id=${encodeURIComponent(eventId)}`,
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.events && data.events.length > 0 ? data.events[0] : null;
    } catch (error) {
      console.warn(`Failed to find venue event ${eventId}:`, error);
      return null;
    }
  }

  private validateVenueWebhookSignature(webhook: CapacityWebhook): boolean {
    // This would implement HMAC signature validation specific to venue webhooks
    // For now, returning true for development
    return true;
  }

  private async getCurrentEventId(venueId: string): Promise<string> {
    // This would get the current event ID for the venue
    // Implementation depends on how events are tracked
    return 'current-event-id';
  }

  private async getVenueCapacity(venueId: string): Promise<number> {
    try {
      const { data } = await this.supabaseClient
        .from('venue_configurations')
        .select('max_capacity')
        .eq('venue_id', venueId)
        .single();

      return data?.max_capacity || 200; // Default capacity
    } catch (error) {
      console.warn(`Could not get venue capacity for ${venueId}:`, error);
      return 200; // Default
    }
  }

  private async handleCapacityExceeded(
    requestedCount: number,
    venueConfig: VenueConfig,
    venueResponse: any,
  ): Promise<void> {
    // Send alert to organization
    await this.supabaseClient.from('venue_capacity_alerts').insert({
      venue_id: venueConfig.venueId,
      requested_count: requestedCount,
      max_capacity: venueResponse.max_capacity,
      alert_type: 'capacity_exceeded',
      requires_action: true,
      created_at: new Date().toISOString(),
    });

    // Could trigger additional notifications here
  }

  private async getVenueConfig(
    organizationId: string,
  ): Promise<VenueConfig | null> {
    try {
      const { data } = await this.supabaseClient
        .from('venue_management_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (!data) return null;

      return {
        apiKey: data.api_key,
        baseUrl: data.base_url,
        venueId: data.venue_id,
        webhookSecret: data.webhook_secret,
        customSettings: data.custom_settings,
      };
    } catch (error) {
      console.error(
        `Failed to get venue config for organization ${organizationId}:`,
        error,
      );
      return null;
    }
  }

  private async getVenueConfigByVenueId(
    venueId: string,
  ): Promise<VenueConfig | null> {
    try {
      const { data } = await this.supabaseClient
        .from('venue_management_configs')
        .select('*')
        .eq('venue_id', venueId)
        .eq('is_active', true)
        .single();

      if (!data) return null;

      return {
        apiKey: data.api_key,
        baseUrl: data.base_url,
        venueId: data.venue_id,
        webhookSecret: data.webhook_secret,
        customSettings: data.custom_settings,
      };
    } catch (error) {
      console.error(`Failed to get venue config for venue ${venueId}:`, error);
      return null;
    }
  }

  private async resolveOrganizationIdByVenue(venueId: string): Promise<string> {
    try {
      const { data } = await this.supabaseClient
        .from('venue_management_configs')
        .select('organization_id')
        .eq('venue_id', venueId)
        .single();

      return data?.organization_id || 'unknown';
    } catch (error) {
      console.warn(`Could not resolve organization ID for venue: ${venueId}`);
      return 'unknown';
    }
  }

  private async loadVenueConfigs(): Promise<void> {
    try {
      const { data } = await this.supabaseClient
        .from('venue_management_configs')
        .select('*')
        .eq('is_active', true);

      if (data) {
        for (const config of data) {
          this.venueConfigs.set(config.organization_id, {
            apiKey: config.api_key,
            baseUrl: config.base_url,
            venueId: config.venue_id,
            webhookSecret: config.webhook_secret,
            customSettings: config.custom_settings,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load venue configurations:', error);
    }
  }

  private async logGuestCountUpdate(
    count: number,
    venueConfig: VenueConfig,
    success: boolean,
    result?: any,
    error?: string,
  ): Promise<void> {
    try {
      await this.supabaseClient.from('venue_guest_count_updates').insert({
        venue_id: venueConfig.venueId,
        guest_count: count,
        success,
        response_data: result,
        error_message: error,
        updated_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log guest count update:', logError);
    }
  }

  private async logCapacityWebhook(
    webhook: CapacityWebhook,
    success: boolean,
    error?: string,
  ): Promise<void> {
    try {
      await this.supabaseClient.from('venue_capacity_webhooks').insert({
        event_id: webhook.eventId,
        event_type: webhook.eventType,
        venue_id: webhook.venueId,
        processing_success: success,
        error_message: error,
        received_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log capacity webhook:', logError);
    }
  }

  private async logEventSync(
    totalEvents: number,
    successfulEvents: number,
    failedEvents: number,
  ): Promise<void> {
    try {
      await this.supabaseClient.from('venue_event_syncs').insert({
        total_events: totalEvents,
        successful_events: successfulEvents,
        failed_events: failedEvents,
        synced_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log event sync:', logError);
    }
  }

  private async logVenueBooking(
    eventId: string,
    bookingId: string | null,
    success: boolean,
    error?: string,
  ): Promise<void> {
    try {
      await this.supabaseClient.from('venue_booking_logs').insert({
        event_id: eventId,
        venue_booking_id: bookingId,
        success,
        error_message: error,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log venue booking:', logError);
    }
  }
}

interface SyncEventResult {
  eventId: string;
  success: boolean;
  message?: string;
  error?: string;
}
