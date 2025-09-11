/**
 * WS-219 Google Places Wedding Synchronization Service
 * Team C - Round 1 Implementation
 *
 * Handles Google Places data synchronization with wedding venue management,
 * supplier coordination, and timeline integration for wedding planning.
 */

import { createClient } from '@supabase/supabase-js';
import { PlacesIntegrationService } from './PlacesIntegrationService';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  PlaceDetails,
  PlacesSearchCriteria,
} from '@/types/integrations';

interface WeddingVenueData {
  id: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  capacity?: number;
  priceRange?: 1 | 2 | 3 | 4;
  amenities: string[];
  photos: string[];
  contactInfo: {
    phone?: string;
    website?: string;
    email?: string;
  };
  availability?: {
    availableDates: Date[];
    blackoutDates: Date[];
    minimumNotice: number; // days
  };
  weddingSpecific: {
    ceremonyCapacity?: number;
    receptionCapacity?: number;
    outdoorOption: boolean;
    cateringRestrictions?: string[];
    decorationRestrictions?: string[];
    alcoholPolicy?: 'allowed' | 'restricted' | 'prohibited';
    setupTeardownTime: number; // hours
    parkingSpaces?: number;
    accessibilityFeatures: string[];
  };
  integrationMetadata: {
    googlePlaceId: string;
    lastSyncAt: Date;
    syncVersion: number;
    dataSource: 'google_places' | 'manual' | 'hybrid';
  };
}

interface WeddingCoordinationEvent {
  type:
    | 'venue_selected'
    | 'venue_changed'
    | 'venue_cancelled'
    | 'availability_updated';
  weddingId: string;
  venueId: string;
  supplierId?: string;
  timestamp: Date;
  changes?: Record<string, any>;
  notificationsSent: string[]; // supplier IDs notified
}

interface SupplierNotificationConfig {
  supplierId: string;
  notificationTypes: string[];
  preferredMethod: 'email' | 'sms' | 'webhook' | 'all';
  webhookUrl?: string;
  proximity?: {
    enabled: boolean;
    radiusKm: number;
  };
}

export class PlacesWeddingSyncService {
  private placesService: PlacesIntegrationService;
  private supabase: any;
  private syncCache = new Map<
    string,
    { data: WeddingVenueData; lastSync: number }
  >();
  private readonly SYNC_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly NOTIFICATION_BATCH_SIZE = 50;

  constructor(
    placesConfig: IntegrationConfig,
    placesCredentials: IntegrationCredentials,
    supabaseUrl: string,
    supabaseKey: string,
  ) {
    this.placesService = new PlacesIntegrationService(
      placesConfig,
      placesCredentials,
    );
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Synchronize wedding venue data with Google Places
   */
  async syncWeddingVenue(
    weddingId: string,
    venueSearchCriteria: PlacesSearchCriteria,
  ): Promise<IntegrationResponse<WeddingVenueData[]>> {
    try {
      // Check cache first
      const cacheKey = `wedding:${weddingId}:venues`;
      const cached = this.getCachedSync(cacheKey);
      if (cached) {
        return { success: true, data: [cached] };
      }

      // Search Google Places for wedding venues
      const placesResult = await this.placesService.searchVenues(
        venueSearchCriteria.location,
        venueSearchCriteria.radius,
        {
          capacity: venueSearchCriteria.minCapacity,
          priceRange: venueSearchCriteria.priceLevel,
          rating: venueSearchCriteria.minRating,
        },
      );

      if (!placesResult.success) {
        return {
          success: false,
          error: `Google Places venue search failed: ${placesResult.error}`,
        };
      }

      // Transform Places data to wedding venue format
      const weddingVenues: WeddingVenueData[] = [];

      for (const place of placesResult.data) {
        const detailsResult = await this.placesService.getPlaceDetails(
          place.id,
        );

        if (detailsResult.success) {
          const weddingVenue = await this.transformToWeddingVenue(
            detailsResult.data,
            weddingId,
          );
          weddingVenues.push(weddingVenue);

          // Cache the sync result
          this.setCachedSync(cacheKey, weddingVenue);
        }
      }

      // Store in wedding database
      await this.storeWeddingVenues(weddingId, weddingVenues);

      // Log sync event
      await this.logSyncEvent(weddingId, 'venue_sync_completed', {
        venuesFound: weddingVenues.length,
        searchCriteria: venueSearchCriteria,
      });

      return {
        success: true,
        data: weddingVenues,
      };
    } catch (error) {
      await this.logSyncEvent(weddingId, 'venue_sync_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: `Wedding venue sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Handle venue selection and coordinate with suppliers
   */
  async handleVenueSelection(
    weddingId: string,
    venueId: string,
    selectedDate: Date,
  ): Promise<IntegrationResponse<void>> {
    try {
      // Get venue details
      const venue = await this.getWeddingVenue(weddingId, venueId);
      if (!venue) {
        return {
          success: false,
          error: 'Venue not found',
        };
      }

      // Update wedding record
      await this.supabase
        .from('weddings')
        .update({
          venue_id: venueId,
          venue_date: selectedDate.toISOString(),
          venue_location: venue.location,
          updated_at: new Date().toISOString(),
        })
        .eq('id', weddingId);

      // Notify relevant suppliers
      await this.notifySuppliers(weddingId, 'venue_selected', {
        venueId,
        venueName: venue.name,
        venueAddress: venue.address,
        venueLocation: venue.location,
        selectedDate: selectedDate.toISOString(),
      });

      // Update timeline with venue-specific milestones
      await this.updateWeddingTimeline(weddingId, venue, selectedDate);

      // Create coordination event
      const coordinationEvent: WeddingCoordinationEvent = {
        type: 'venue_selected',
        weddingId,
        venueId,
        timestamp: new Date(),
        changes: {
          selectedDate: selectedDate.toISOString(),
          venueDetails: venue,
        },
        notificationsSent: [],
      };

      await this.logCoordinationEvent(coordinationEvent);

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Venue selection coordination failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Monitor venue availability changes and sync with timeline
   */
  async monitorVenueAvailability(
    weddingId: string,
    venueId: string,
  ): Promise<IntegrationResponse<void>> {
    try {
      // Get current venue data
      const venue = await this.getWeddingVenue(weddingId, venueId);
      if (!venue) {
        return { success: false, error: 'Venue not found' };
      }

      // Refresh from Google Places
      const placeDetails = await this.placesService.getPlaceDetails(
        venue.integrationMetadata.googlePlaceId,
      );

      if (!placeDetails.success) {
        return {
          success: false,
          error: 'Failed to refresh venue data from Google Places',
        };
      }

      // Check for business hours changes
      const updatedVenue = await this.transformToWeddingVenue(
        placeDetails.data,
        weddingId,
      );

      // Compare and detect changes
      const hasChanges = this.detectVenueChanges(venue, updatedVenue);

      if (hasChanges) {
        // Update venue data
        await this.updateWeddingVenue(weddingId, venueId, updatedVenue);

        // Notify suppliers of changes
        await this.notifySuppliers(weddingId, 'venue_changed', {
          venueId,
          changes: this.getVenueChanges(venue, updatedVenue),
        });

        // Log availability change
        await this.logCoordinationEvent({
          type: 'availability_updated',
          weddingId,
          venueId,
          timestamp: new Date(),
          changes: this.getVenueChanges(venue, updatedVenue),
          notificationsSent: [],
        });
      }

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: `Venue availability monitoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Calculate travel times between venues and supplier locations
   */
  async calculateSupplierTravelTimes(
    weddingId: string,
    venueId: string,
  ): Promise<IntegrationResponse<Record<string, number>>> {
    try {
      const venue = await this.getWeddingVenue(weddingId, venueId);
      if (!venue) {
        return { success: false, error: 'Venue not found' };
      }

      // Get wedding suppliers
      const { data: suppliers, error } = await this.supabase
        .from('wedding_suppliers')
        .select('id, name, business_address, location')
        .eq('wedding_id', weddingId);

      if (error) {
        return { success: false, error: 'Failed to fetch suppliers' };
      }

      const travelTimes: Record<string, number> = {};

      // Calculate travel time for each supplier
      for (const supplier of suppliers) {
        if (supplier.location) {
          const distance = this.calculateHaversineDistance(
            venue.location.latitude,
            venue.location.longitude,
            supplier.location.lat,
            supplier.location.lng,
          );

          // Estimate travel time (assuming average speed of 30 mph in city)
          const travelTimeMinutes = Math.round((distance / 30) * 60);
          travelTimes[supplier.id] = travelTimeMinutes;
        }
      }

      // Store travel times for timeline planning
      await this.supabase.from('venue_supplier_logistics').upsert({
        wedding_id: weddingId,
        venue_id: venueId,
        travel_times: travelTimes,
        calculated_at: new Date().toISOString(),
      });

      return { success: true, data: travelTimes };
    } catch (error) {
      return {
        success: false,
        error: `Travel time calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Sync venue data with wedding timeline
   */
  private async updateWeddingTimeline(
    weddingId: string,
    venue: WeddingVenueData,
    weddingDate: Date,
  ): Promise<void> {
    // Calculate key timeline milestones based on venue
    const milestones = [
      {
        title: 'Venue Setup Begins',
        time: new Date(
          weddingDate.getTime() -
            venue.weddingSpecific.setupTeardownTime * 60 * 60 * 1000,
        ),
        type: 'venue_setup',
        location: venue.address,
      },
      {
        title: 'Vendor Load-in Window Opens',
        time: new Date(
          weddingDate.getTime() -
            (venue.weddingSpecific.setupTeardownTime - 1) * 60 * 60 * 1000,
        ),
        type: 'vendor_arrival',
        location: venue.address,
      },
      {
        title: 'Ceremony Begins',
        time: weddingDate,
        type: 'ceremony',
        location: venue.address,
      },
    ];

    // Insert/update timeline milestones
    for (const milestone of milestones) {
      await this.supabase.from('wedding_timeline').upsert({
        wedding_id: weddingId,
        venue_id: venue.id,
        title: milestone.title,
        scheduled_time: milestone.time.toISOString(),
        type: milestone.type,
        location: milestone.location,
        created_by_integration: 'places_wedding_sync',
        updated_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Notify suppliers about venue-related changes
   */
  private async notifySuppliers(
    weddingId: string,
    eventType: string,
    eventData: Record<string, any>,
  ): Promise<void> {
    try {
      // Get supplier notification preferences
      const { data: notificationConfigs } = await this.supabase
        .from('supplier_notification_preferences')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('enabled', true);

      if (!notificationConfigs || notificationConfigs.length === 0) {
        return;
      }

      // Process notifications in batches
      const batches = this.createBatches(
        notificationConfigs,
        this.NOTIFICATION_BATCH_SIZE,
      );

      for (const batch of batches) {
        await Promise.allSettled(
          batch.map((config) =>
            this.sendSupplierNotification(config, eventType, eventData),
          ),
        );
      }

      // Log notification completion
      await this.logSyncEvent(weddingId, 'supplier_notifications_sent', {
        eventType,
        suppliersNotified: notificationConfigs.length,
      });
    } catch (error) {
      console.error('Failed to notify suppliers:', error);
    }
  }

  /**
   * Send notification to individual supplier
   */
  private async sendSupplierNotification(
    config: SupplierNotificationConfig,
    eventType: string,
    eventData: Record<string, any>,
  ): Promise<void> {
    if (!config.notificationTypes.includes(eventType)) {
      return;
    }

    const notificationPayload = {
      eventType,
      supplierId: config.supplierId,
      timestamp: new Date().toISOString(),
      data: eventData,
    };

    switch (config.preferredMethod) {
      case 'webhook':
        if (config.webhookUrl) {
          // Send webhook notification
          await fetch(config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notificationPayload),
          });
        }
        break;

      case 'email':
        // Queue email notification
        await this.supabase.from('notification_queue').insert({
          type: 'email',
          recipient_id: config.supplierId,
          subject: `Venue Update: ${eventType}`,
          template: 'venue_coordination',
          data: notificationPayload,
        });
        break;

      case 'sms':
        // Queue SMS notification
        await this.supabase.from('notification_queue').insert({
          type: 'sms',
          recipient_id: config.supplierId,
          template: 'venue_update_sms',
          data: notificationPayload,
        });
        break;

      case 'all':
        // Send all notification types
        await Promise.allSettled([
          this.sendSupplierNotification(
            { ...config, preferredMethod: 'webhook' },
            eventType,
            eventData,
          ),
          this.sendSupplierNotification(
            { ...config, preferredMethod: 'email' },
            eventType,
            eventData,
          ),
          this.sendSupplierNotification(
            { ...config, preferredMethod: 'sms' },
            eventType,
            eventData,
          ),
        ]);
        break;
    }
  }

  /**
   * Transform Google Places data to wedding venue format
   */
  private async transformToWeddingVenue(
    placeDetails: PlaceDetails,
    weddingId: string,
  ): Promise<WeddingVenueData> {
    // Get photos
    const photosResult = await this.placesService.getPlacePhotos(
      placeDetails.id,
      10,
    );
    const photos = photosResult.success ? photosResult.data : [];

    return {
      id: placeDetails.id,
      name: placeDetails.name,
      address: placeDetails.address,
      location: placeDetails.location,
      rating: placeDetails.rating,
      capacity: this.estimateCapacityFromPlace(placeDetails),
      priceRange: this.estimatePriceRange(placeDetails),
      amenities: this.extractAmenities(placeDetails),
      photos,
      contactInfo: {
        phone: placeDetails.phoneNumber,
        website: placeDetails.website,
      },
      weddingSpecific: {
        outdoorOption: this.hasOutdoorOption(placeDetails),
        setupTeardownTime: 4, // Default 4 hours
        parkingSpaces: this.estimateParkingSpaces(placeDetails),
        accessibilityFeatures: this.extractAccessibilityFeatures(placeDetails),
      },
      integrationMetadata: {
        googlePlaceId: placeDetails.id,
        lastSyncAt: new Date(),
        syncVersion: 1,
        dataSource: 'google_places',
      },
    };
  }

  // Helper methods for data transformation
  private estimateCapacityFromPlace(place: PlaceDetails): number | undefined {
    // Logic to estimate capacity based on place type and size indicators
    const venueTypes = place.category.toLowerCase();

    if (venueTypes.includes('banquet') || venueTypes.includes('wedding')) {
      return 150; // Default wedding venue capacity
    }
    if (venueTypes.includes('hotel')) {
      return 200;
    }
    if (venueTypes.includes('restaurant')) {
      return 80;
    }
    if (venueTypes.includes('church') || venueTypes.includes('religious')) {
      return 100;
    }

    return undefined;
  }

  private estimatePriceRange(place: PlaceDetails): 1 | 2 | 3 | 4 | undefined {
    // Use Google Places price_level if available
    return place.rating && place.rating >= 4.5
      ? 4
      : place.rating && place.rating >= 4.0
        ? 3
        : place.rating && place.rating >= 3.0
          ? 2
          : 1;
  }

  private extractAmenities(place: PlaceDetails): string[] {
    const amenities: string[] = [];
    const category = place.category.toLowerCase();

    if (category.includes('parking')) amenities.push('Parking');
    if (category.includes('restaurant')) amenities.push('Catering');
    if (category.includes('hotel')) amenities.push('Accommodation');

    return amenities;
  }

  private hasOutdoorOption(place: PlaceDetails): boolean {
    const category = place.category.toLowerCase();
    return (
      category.includes('park') ||
      category.includes('garden') ||
      category.includes('outdoor')
    );
  }

  private estimateParkingSpaces(place: PlaceDetails): number | undefined {
    const category = place.category.toLowerCase();

    if (category.includes('hotel')) return 100;
    if (category.includes('banquet')) return 50;
    if (category.includes('restaurant')) return 30;

    return undefined;
  }

  private extractAccessibilityFeatures(place: PlaceDetails): string[] {
    // This would need to be enhanced with actual accessibility data
    // For now, assume basic accessibility for most venues
    return ['Wheelchair accessible entrance'];
  }

  // Utility methods
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degToRad(lat1)) *
        Math.cos(this.degToRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private getCachedSync(key: string): WeddingVenueData | null {
    const cached = this.syncCache.get(key);
    if (cached && Date.now() - cached.lastSync < this.SYNC_CACHE_DURATION) {
      return cached.data;
    }
    this.syncCache.delete(key);
    return null;
  }

  private setCachedSync(key: string, data: WeddingVenueData): void {
    this.syncCache.set(key, { data, lastSync: Date.now() });
  }

  private detectVenueChanges(
    oldVenue: WeddingVenueData,
    newVenue: WeddingVenueData,
  ): boolean {
    // Simple change detection - could be enhanced
    return (
      oldVenue.name !== newVenue.name ||
      oldVenue.rating !== newVenue.rating ||
      JSON.stringify(oldVenue.contactInfo) !==
        JSON.stringify(newVenue.contactInfo)
    );
  }

  private getVenueChanges(
    oldVenue: WeddingVenueData,
    newVenue: WeddingVenueData,
  ): Record<string, any> {
    const changes: Record<string, any> = {};

    if (oldVenue.name !== newVenue.name) {
      changes.name = { old: oldVenue.name, new: newVenue.name };
    }
    if (oldVenue.rating !== newVenue.rating) {
      changes.rating = { old: oldVenue.rating, new: newVenue.rating };
    }

    return changes;
  }

  // Database operations
  private async getWeddingVenue(
    weddingId: string,
    venueId: string,
  ): Promise<WeddingVenueData | null> {
    const { data, error } = await this.supabase
      .from('wedding_venues')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('venue_id', venueId)
      .single();

    return error ? null : data;
  }

  private async storeWeddingVenues(
    weddingId: string,
    venues: WeddingVenueData[],
  ): Promise<void> {
    const venueRecords = venues.map((venue) => ({
      wedding_id: weddingId,
      venue_id: venue.id,
      venue_data: venue,
      synced_at: new Date().toISOString(),
    }));

    await this.supabase.from('wedding_venues').upsert(venueRecords);
  }

  private async updateWeddingVenue(
    weddingId: string,
    venueId: string,
    venue: WeddingVenueData,
  ): Promise<void> {
    await this.supabase
      .from('wedding_venues')
      .update({
        venue_data: venue,
        synced_at: new Date().toISOString(),
      })
      .eq('wedding_id', weddingId)
      .eq('venue_id', venueId);
  }

  private async logSyncEvent(
    weddingId: string,
    eventType: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    await this.supabase.from('integration_sync_logs').insert({
      wedding_id: weddingId,
      service_name: 'places_wedding_sync',
      event_type: eventType,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  private async logCoordinationEvent(
    event: WeddingCoordinationEvent,
  ): Promise<void> {
    await this.supabase.from('wedding_coordination_events').insert({
      ...event,
      timestamp: event.timestamp.toISOString(),
    });
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const results = {
      placesConnection: false,
      supabaseConnection: false,
      cacheSize: this.syncCache.size,
    };

    try {
      // Test Places API connection
      results.placesConnection = await this.placesService.validateConnection();

      // Test Supabase connection
      const { error } = await this.supabase
        .from('weddings')
        .select('id')
        .limit(1);
      results.supabaseConnection = !error;

      const healthyServices = Object.values(results).filter(Boolean).length - 1; // Exclude cacheSize from boolean count

      if (healthyServices >= 2) {
        return { status: 'healthy', details: results };
      } else if (healthyServices >= 1) {
        return { status: 'degraded', details: results };
      } else {
        return { status: 'unhealthy', details: results };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          ...results,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
