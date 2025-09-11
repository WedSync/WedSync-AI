/**
 * WS-250: API Gateway Management System - Calendar API Integration
 * Team C - Round 1: Calendar service API routing for wedding vendors
 *
 * Integrates with multiple calendar services (Google, Outlook, Apple)
 * for wedding vendor availability, booking management, and schedule
 * coordination with wedding-specific optimizations.
 */

import {
  IntegrationResponse,
  IntegrationError,
  ErrorCategory,
  IntegrationCredentials,
  CalendarEvent,
  CalendarEventInput,
  AvailabilityResult,
} from '../../types/integrations';
import ExternalAPIConnector, {
  ExternalAPIConfig,
  WeddingContext,
} from './ExternalAPIConnector';

export interface CalendarProvider {
  id: string;
  name: string;
  type: CalendarProviderType;
  apiVersion: string;
  baseUrl: string;
  credentials: CalendarCredentials;
  capabilities: CalendarCapability[];
  syncSettings: CalendarSyncSettings;
  weddingFeatures: WeddingCalendarFeatures;
  rateLimits: CalendarRateLimit;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lastSync?: Date;
  syncErrors?: string[];
}

export type CalendarProviderType =
  | 'google'
  | 'outlook'
  | 'apple'
  | 'exchange'
  | 'caldav'
  | 'ical'
  | 'custom';

export interface CalendarCredentials extends IntegrationCredentials {
  clientId?: string;
  clientSecret?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  scope?: string[];
  calendarId?: string;
  timeZone?: string;
}

export interface CalendarCapability {
  name: string;
  supported: boolean;
  limitations?: string[];
  weddingOptimized?: boolean;
}

export interface CalendarSyncSettings {
  bidirectional: boolean;
  syncFrequency: number; // minutes
  conflictResolution: 'client_wins' | 'server_wins' | 'manual' | 'merge';
  syncPastEvents: boolean;
  syncFutureMonths: number;
  eventFilters: EventFilter[];
  weddingPriority: boolean;
}

export interface EventFilter {
  type: 'title' | 'description' | 'location' | 'attendees' | 'custom';
  criteria: string;
  action: 'include' | 'exclude' | 'modify';
  weddingSpecific?: boolean;
}

export interface WeddingCalendarFeatures {
  weddingDayBlocking: boolean;
  bufferTimeManagement: boolean;
  venueCoordination: boolean;
  vendorAvailabilitySharing: boolean;
  timelineIntegration: boolean;
  emergencyScheduling: boolean;
  seasonalAvailability: boolean;
  packageBookingSupport: boolean;
}

export interface CalendarRateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstAllowance: number;
  quotaReset: Date;
  weddingDayBonus?: number;
}

export interface WeddingCalendarEvent extends CalendarEvent {
  weddingId?: string;
  vendorId?: string;
  vendorCategory?: string;
  eventType: WeddingEventType;
  weddingDate?: Date;
  preparation?: {
    setupTime: number; // minutes before
    cleanupTime: number; // minutes after
    travelTime?: number; // minutes for travel
  };
  packages?: string[];
  pricing?: {
    basePrice: number;
    currency: string;
    deposits?: number;
  };
  coordinator?: {
    name: string;
    email: string;
    phone?: string;
  };
  restrictions?: {
    weatherDependent: boolean;
    indoorOnly: boolean;
    seasonalOnly: boolean;
    minGuestCount?: number;
    maxGuestCount?: number;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    available24h: boolean;
  };
}

export type WeddingEventType =
  | 'consultation'
  | 'engagement_shoot'
  | 'wedding_ceremony'
  | 'wedding_reception'
  | 'rehearsal'
  | 'vendor_meeting'
  | 'site_visit'
  | 'tasting'
  | 'fitting'
  | 'delivery_setup'
  | 'breakdown'
  | 'followup'
  | 'blocked_time';

export interface AvailabilityQuery {
  vendorId?: string;
  calendarIds?: string[];
  startDate: Date;
  endDate: Date;
  duration?: number; // minutes
  eventType?: WeddingEventType;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // km
  };
  weddingContext?: {
    weddingDate: Date;
    guestCount: number;
    budget?: number;
    requirements?: string[];
  };
  preferences?: {
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'any';
    weekends?: boolean;
    weekdays?: boolean;
    holidays?: boolean;
  };
}

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  duration: number; // minutes
  available: boolean;
  conflictReason?: string;
  confidence: number; // 0-100
  pricing?: {
    basePrice: number;
    seasonalMultiplier?: number;
    demandMultiplier?: number;
    finalPrice: number;
    currency: string;
  };
  restrictions?: string[];
  metadata?: {
    isWeekend: boolean;
    isPeakSeason: boolean;
    isHoliday: boolean;
    weatherForecast?: string;
    venueAvailability?: boolean;
  };
}

export interface CalendarSync {
  id: string;
  providerId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  direction: 'pull' | 'push' | 'bidirectional';
  startTime: Date;
  endTime?: Date;
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflicts: CalendarConflict[];
  errors: string[];
  weddingEventsProcessed: number;
}

export interface CalendarConflict {
  eventId: string;
  conflictType:
    | 'double_booking'
    | 'overlap'
    | 'venue_conflict'
    | 'vendor_conflict'
    | 'travel_time';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedWedding?: string;
  suggestedResolution: string;
  autoResolvable: boolean;
  weddingCritical: boolean;
}

export interface CalendarAnalytics {
  totalEvents: number;
  weddingEvents: number;
  utilization: {
    overall: number;
    weekends: number;
    weekdays: number;
    peakSeason: number;
    offSeason: number;
  };
  bookingPatterns: {
    averageLeadTime: number; // days
    peakBookingHours: number[];
    seasonalTrends: Map<string, number>;
    eventTypeDistribution: Map<WeddingEventType, number>;
  };
  availability: {
    totalAvailableHours: number;
    bookedHours: number;
    blockedHours: number;
    availabilityPercentage: number;
  };
  revenue: {
    totalRevenue: number;
    averageBookingValue: number;
    revenueByEventType: Map<WeddingEventType, number>;
    seasonalRevenue: Map<string, number>;
  };
  conflicts: {
    totalConflicts: number;
    resolvedConflicts: number;
    criticalConflicts: number;
    conflictsByType: Map<string, number>;
  };
}

export interface BulkOperationRequest {
  operation: 'create' | 'update' | 'delete' | 'sync';
  events: WeddingCalendarEvent[];
  options: {
    batchSize?: number;
    continueOnError?: boolean;
    validateWeddingRules?: boolean;
    notifyVendors?: boolean;
    updateWebsite?: boolean;
  };
}

export interface BulkOperationResult {
  success: boolean;
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  results: Map<
    string,
    {
      success: boolean;
      eventId?: string;
      error?: string;
    }
  >;
  conflicts: CalendarConflict[];
  processingTime: number;
}

export class CalendarAPIIntegration {
  private providers: Map<string, CalendarProvider>;
  private connectors: Map<string, ExternalAPIConnector>;
  private activeSyncs: Map<string, CalendarSync>;
  private readonly weddingOptimized: boolean;
  private readonly conflictDetection: boolean;

  constructor(
    options: {
      weddingOptimized?: boolean;
      conflictDetection?: boolean;
    } = {},
  ) {
    this.providers = new Map();
    this.connectors = new Map();
    this.activeSyncs = new Map();
    this.weddingOptimized = options.weddingOptimized ?? true;
    this.conflictDetection = options.conflictDetection ?? true;

    // Initialize default providers
    this.initializeDefaultProviders();
  }

  /**
   * Register a calendar provider
   */
  registerProvider(provider: CalendarProvider): void {
    this.providers.set(provider.id, provider);

    // Create API connector
    const connector = this.createProviderConnector(provider);
    this.connectors.set(provider.id, connector);

    // Start automatic sync if enabled
    if (provider.syncSettings.syncFrequency > 0) {
      this.scheduleSync(provider.id);
    }
  }

  /**
   * Check availability across multiple calendar providers
   */
  async checkAvailability(query: AvailabilityQuery): Promise<
    IntegrationResponse<{
      availability: AvailabilitySlot[];
      conflicts: CalendarConflict[];
      recommendations: string[];
    }>
  > {
    try {
      const availabilitySlots: AvailabilitySlot[] = [];
      const conflicts: CalendarConflict[] = [];
      const recommendations: string[] = [];

      // Get availability from all relevant providers
      const providerPromises = Array.from(this.providers.values())
        .filter((provider) => provider.status === 'active')
        .map(async (provider) => {
          try {
            const slots = await this.getProviderAvailability(provider, query);
            availabilitySlots.push(...slots);
          } catch (error) {
            console.error(
              `Availability check failed for ${provider.id}:`,
              error,
            );
          }
        });

      await Promise.all(providerPromises);

      // Detect conflicts if enabled
      if (this.conflictDetection) {
        const detectedConflicts = this.detectAvailabilityConflicts(
          availabilitySlots,
          query,
        );
        conflicts.push(...detectedConflicts);
      }

      // Generate wedding-specific recommendations
      if (this.weddingOptimized && query.weddingContext) {
        const weddingRecommendations = this.generateWeddingRecommendations(
          availabilitySlots,
          query,
        );
        recommendations.push(...weddingRecommendations);
      }

      // Sort availability slots by date and confidence
      const sortedSlots = availabilitySlots.sort((a, b) => {
        if (a.start.getTime() !== b.start.getTime()) {
          return a.start.getTime() - b.start.getTime();
        }
        return b.confidence - a.confidence;
      });

      return {
        success: true,
        data: {
          availability: sortedSlots,
          conflicts,
          recommendations,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Availability check failed',
      };
    }
  }

  /**
   * Create a wedding event across multiple calendars
   */
  async createWeddingEvent(
    event: WeddingCalendarEvent,
    providerIds?: string[],
  ): Promise<
    IntegrationResponse<{
      createdEvents: Map<string, string>; // providerId -> eventId
      conflicts: CalendarConflict[];
      warnings: string[];
    }>
  > {
    try {
      const createdEvents = new Map<string, string>();
      const conflicts: CalendarConflict[] = [];
      const warnings: string[] = [];

      // Validate wedding event
      const validationErrors = this.validateWeddingEvent(event);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: `Validation failed: ${validationErrors.join(', ')}`,
        };
      }

      // Determine target providers
      const targetProviders = providerIds
        ? (providerIds
            .map((id) => this.providers.get(id))
            .filter(Boolean) as CalendarProvider[])
        : Array.from(this.providers.values()).filter(
            (p) => p.status === 'active',
          );

      // Create event in each provider
      for (const provider of targetProviders) {
        try {
          const connector = this.connectors.get(provider.id);
          if (!connector) continue;

          // Transform event to provider-specific format
          const providerEvent = this.transformEventForProvider(event, provider);

          // Create event via API
          const result = await connector.executeRequest<any>(
            {
              path: this.getCreateEventEndpoint(provider),
              method: 'POST',
              requiresAuth: true,
            },
            providerEvent,
            {
              isWeddingWeekend: this.isWeddingWeekend(event.startTime),
              priority:
                event.eventType === 'wedding_ceremony' ? 'critical' : 'high',
            },
          );

          if (result.success && result.data) {
            const eventId = this.extractEventId(result.data, provider);
            createdEvents.set(provider.id, eventId);

            // Check for conflicts
            if (this.conflictDetection) {
              const eventConflicts = await this.checkEventConflicts(
                event,
                provider,
              );
              conflicts.push(...eventConflicts);
            }
          } else {
            warnings.push(
              `Failed to create event in ${provider.name}: ${result.error}`,
            );
          }
        } catch (error) {
          warnings.push(
            `Error creating event in ${provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      // Apply wedding-specific post-creation logic
      if (this.weddingOptimized && event.weddingId) {
        await this.applyWeddingEventLogic(event, createdEvents);
      }

      return {
        success: createdEvents.size > 0,
        data: {
          createdEvents,
          conflicts,
          warnings,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Event creation failed',
      };
    }
  }

  /**
   * Sync calendar data bidirectionally
   */
  async syncCalendars(
    providerIds?: string[],
    options?: {
      direction?: 'pull' | 'push' | 'bidirectional';
      dateRange?: { start: Date; end: Date };
      eventTypes?: WeddingEventType[];
      weddingOnly?: boolean;
    },
  ): Promise<IntegrationResponse<Map<string, CalendarSync>>> {
    try {
      const syncResults = new Map<string, CalendarSync>();

      const targetProviders = providerIds
        ? (providerIds
            .map((id) => this.providers.get(id))
            .filter(Boolean) as CalendarProvider[])
        : Array.from(this.providers.values()).filter(
            (p) => p.status === 'active',
          );

      const syncPromises = targetProviders.map(async (provider) => {
        const syncId = this.generateSyncId();
        const sync: CalendarSync = {
          id: syncId,
          providerId: provider.id,
          status: 'pending',
          direction:
            options?.direction || provider.syncSettings.bidirectional
              ? 'bidirectional'
              : 'pull',
          startTime: new Date(),
          eventsProcessed: 0,
          eventsCreated: 0,
          eventsUpdated: 0,
          eventsDeleted: 0,
          conflicts: [],
          errors: [],
          weddingEventsProcessed: 0,
        };

        this.activeSyncs.set(syncId, sync);

        try {
          await this.performProviderSync(provider, sync, options);
          sync.status = 'completed';
          sync.endTime = new Date();
        } catch (error) {
          sync.status = 'failed';
          sync.errors.push(
            error instanceof Error ? error.message : 'Sync failed',
          );
        }

        syncResults.set(provider.id, sync);
        return sync;
      });

      await Promise.all(syncPromises);

      return {
        success: true,
        data: syncResults,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calendar sync failed',
      };
    }
  }

  /**
   * Perform bulk operations on calendar events
   */
  async bulkOperation(
    request: BulkOperationRequest,
  ): Promise<IntegrationResponse<BulkOperationResult>> {
    const startTime = Date.now();
    const results = new Map<
      string,
      { success: boolean; eventId?: string; error?: string }
    >();
    const conflicts: CalendarConflict[] = [];
    let successfulEvents = 0;
    let failedEvents = 0;

    try {
      const { operation, events, options } = request;
      const {
        batchSize = 10,
        continueOnError = true,
        validateWeddingRules = true,
      } = options;

      // Process events in batches
      const batches = this.chunkArray(events, batchSize);

      for (const batch of batches) {
        const batchPromises = batch.map(async (event) => {
          try {
            // Validate wedding rules if enabled
            if (validateWeddingRules && this.weddingOptimized) {
              const validationErrors = this.validateWeddingEvent(event);
              if (validationErrors.length > 0) {
                throw new Error(
                  `Validation failed: ${validationErrors.join(', ')}`,
                );
              }
            }

            let result: IntegrationResponse<any>;

            switch (operation) {
              case 'create':
                result = await this.createWeddingEvent(event);
                break;
              case 'update':
                result = await this.updateWeddingEvent(event);
                break;
              case 'delete':
                result = await this.deleteWeddingEvent(event.id!);
                break;
              case 'sync':
                result = await this.syncCalendars();
                break;
              default:
                throw new Error(`Unsupported operation: ${operation}`);
            }

            if (result.success) {
              successfulEvents++;
              results.set(event.id!, { success: true, eventId: event.id });

              // Collect conflicts if any
              if (result.data?.conflicts) {
                conflicts.push(...result.data.conflicts);
              }
            } else {
              failedEvents++;
              results.set(event.id!, { success: false, error: result.error });

              if (!continueOnError) {
                throw new Error(result.error);
              }
            }
          } catch (error) {
            failedEvents++;
            results.set(event.id!, {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });

            if (!continueOnError) {
              throw error;
            }
          }
        });

        await Promise.all(batchPromises);
      }

      return {
        success: successfulEvents > 0,
        data: {
          success: successfulEvents > 0,
          totalEvents: events.length,
          successfulEvents,
          failedEvents,
          results,
          conflicts,
          processingTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk operation failed',
      };
    }
  }

  /**
   * Get calendar analytics and insights
   */
  async getCalendarAnalytics(options: {
    providerIds?: string[];
    startDate: Date;
    endDate: Date;
    weddingOnly?: boolean;
    groupBy?: 'day' | 'week' | 'month' | 'season';
  }): Promise<IntegrationResponse<CalendarAnalytics>> {
    try {
      // This would aggregate data from multiple providers and calculate analytics
      // For now, return a mock analytics object

      const analytics: CalendarAnalytics = {
        totalEvents: 150,
        weddingEvents: 45,
        utilization: {
          overall: 75.5,
          weekends: 95.2,
          weekdays: 65.8,
          peakSeason: 90.1,
          offSeason: 60.9,
        },
        bookingPatterns: {
          averageLeadTime: 120,
          peakBookingHours: [10, 11, 14, 15, 16],
          seasonalTrends: new Map([
            ['spring', 85],
            ['summer', 95],
            ['fall', 90],
            ['winter', 40],
          ]),
          eventTypeDistribution: new Map([
            ['consultation', 25],
            ['wedding_ceremony', 15],
            ['engagement_shoot', 20],
            ['vendor_meeting', 30],
            ['site_visit', 10],
          ]),
        },
        availability: {
          totalAvailableHours: 2000,
          bookedHours: 1510,
          blockedHours: 200,
          availabilityPercentage: 14.5,
        },
        revenue: {
          totalRevenue: 125000,
          averageBookingValue: 2777,
          revenueByEventType: new Map([
            ['wedding_ceremony', 75000],
            ['engagement_shoot', 30000],
            ['consultation', 20000],
          ]),
          seasonalRevenue: new Map([
            ['spring', 35000],
            ['summer', 45000],
            ['fall', 35000],
            ['winter', 10000],
          ]),
        },
        conflicts: {
          totalConflicts: 12,
          resolvedConflicts: 8,
          criticalConflicts: 2,
          conflictsByType: new Map([
            ['double_booking', 5],
            ['venue_conflict', 3],
            ['travel_time', 4],
          ]),
        },
      };

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Analytics retrieval failed',
      };
    }
  }

  // Private methods

  private async getProviderAvailability(
    provider: CalendarProvider,
    query: AvailabilityQuery,
  ): Promise<AvailabilitySlot[]> {
    const connector = this.connectors.get(provider.id);
    if (!connector) return [];

    try {
      const result = await connector.executeRequest<any>(
        {
          path: this.getAvailabilityEndpoint(provider),
          method: 'POST',
          requiresAuth: true,
        },
        this.formatAvailabilityQuery(query, provider),
        {
          isWeddingWeekend: query.weddingContext
            ? this.isWeddingWeekend(query.weddingContext.weddingDate)
            : false,
          priority: 'medium',
        },
      );

      if (result.success && result.data) {
        return this.transformAvailabilityResponse(result.data, provider, query);
      }

      return [];
    } catch (error) {
      console.error(`Availability check failed for ${provider.name}:`, error);
      return [];
    }
  }

  private detectAvailabilityConflicts(
    slots: AvailabilitySlot[],
    query: AvailabilityQuery,
  ): CalendarConflict[] {
    const conflicts: CalendarConflict[] = [];

    // Group overlapping slots
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const slot1 = slots[i];
        const slot2 = slots[j];

        if (this.slotsOverlap(slot1, slot2)) {
          conflicts.push({
            eventId: `conflict_${i}_${j}`,
            conflictType: 'overlap',
            description: `Overlapping availability slots detected`,
            severity: 'medium',
            suggestedResolution: 'Adjust time slots to avoid overlap',
            autoResolvable: true,
            weddingCritical: query.weddingContext ? true : false,
          });
        }
      }
    }

    return conflicts;
  }

  private generateWeddingRecommendations(
    slots: AvailabilitySlot[],
    query: AvailabilityQuery,
  ): string[] {
    const recommendations: string[] = [];

    if (!query.weddingContext) return recommendations;

    // Check for peak wedding season
    const isPeakSeason = this.isPeakWeddingSeason(
      query.weddingContext.weddingDate,
    );
    if (isPeakSeason) {
      recommendations.push(
        'Consider booking early as this is peak wedding season',
      );
    }

    // Check for weekend availability
    const weekendSlots = slots.filter((slot) => this.isWeekend(slot.start));
    if (weekendSlots.length < 3) {
      recommendations.push(
        'Limited weekend availability - consider weekday options',
      );
    }

    // Check for buffer time around wedding
    if (query.eventType !== 'wedding_ceremony') {
      recommendations.push(
        'Consider scheduling with buffer time around your wedding date',
      );
    }

    return recommendations;
  }

  private validateWeddingEvent(event: WeddingCalendarEvent): string[] {
    const errors: string[] = [];

    if (!event.title) errors.push('Event title is required');
    if (!event.startTime) errors.push('Start time is required');
    if (!event.endTime) errors.push('End time is required');
    if (event.startTime >= event.endTime)
      errors.push('Start time must be before end time');

    if (
      event.eventType === 'wedding_ceremony' ||
      event.eventType === 'wedding_reception'
    ) {
      if (!event.weddingId)
        errors.push('Wedding ID is required for wedding events');
      if (!event.weddingDate)
        errors.push('Wedding date is required for wedding events');
    }

    if (event.preparation) {
      if (event.preparation.setupTime < 0)
        errors.push('Setup time cannot be negative');
      if (event.preparation.cleanupTime < 0)
        errors.push('Cleanup time cannot be negative');
    }

    return errors;
  }

  private transformEventForProvider(
    event: WeddingCalendarEvent,
    provider: CalendarProvider,
  ): any {
    switch (provider.type) {
      case 'google':
        return this.transformForGoogle(event);
      case 'outlook':
        return this.transformForOutlook(event);
      case 'apple':
        return this.transformForApple(event);
      default:
        return this.transformForGeneric(event);
    }
  }

  private transformForGoogle(event: WeddingCalendarEvent): any {
    return {
      summary: event.title,
      description: event.description || '',
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: 'America/New_York', // Would be configurable
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: 'America/New_York',
      },
      location: event.location || '',
      attendees:
        event.attendees?.map((attendee) => ({
          email: attendee.email,
          displayName: attendee.name,
        })) || [],
      extendedProperties: {
        private: {
          weddingId: event.weddingId,
          vendorId: event.vendorId,
          eventType: event.eventType,
          weddingDate: event.weddingDate?.toISOString(),
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours
          { method: 'popup', minutes: 60 }, // 1 hour
        ],
      },
    };
  }

  private transformForOutlook(event: WeddingCalendarEvent): any {
    return {
      subject: event.title,
      body: {
        contentType: 'text',
        content: event.description || '',
      },
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: 'America/New_York',
      },
      location: {
        displayName: event.location || '',
      },
      attendees:
        event.attendees?.map((attendee) => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.name,
          },
        })) || [],
      extensions: [
        {
          extensionName: 'wedding-data',
          id: 'wedding-extension',
          value: JSON.stringify({
            weddingId: event.weddingId,
            vendorId: event.vendorId,
            eventType: event.eventType,
            weddingDate: event.weddingDate?.toISOString(),
          }),
        },
      ],
    };
  }

  private transformForApple(event: WeddingCalendarEvent): any {
    return {
      title: event.title,
      notes: event.description || '',
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      location: event.location || '',
      attendees: event.attendees?.map((attendee) => attendee.email) || [],
      properties: {
        weddingId: event.weddingId,
        vendorId: event.vendorId,
        eventType: event.eventType,
        weddingDate: event.weddingDate?.toISOString(),
      },
    };
  }

  private transformForGeneric(event: WeddingCalendarEvent): any {
    return {
      title: event.title,
      description: event.description,
      start: event.startTime.toISOString(),
      end: event.endTime.toISOString(),
      location: event.location,
      attendees: event.attendees,
      metadata: {
        weddingId: event.weddingId,
        vendorId: event.vendorId,
        eventType: event.eventType,
        weddingDate: event.weddingDate?.toISOString(),
      },
    };
  }

  private createProviderConnector(
    provider: CalendarProvider,
  ): ExternalAPIConnector {
    const config: ExternalAPIConfig = {
      apiUrl: provider.baseUrl,
      baseUrl: provider.baseUrl,
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${provider.credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringWindow: 300000,
      },
      rateLimit: {
        requests: provider.rateLimits.requestsPerMinute,
        windowMs: 60000,
      },
      weddingDayProtection: this.weddingOptimized,
    };

    return new ExternalAPIConnector(config, provider.credentials);
  }

  private getCreateEventEndpoint(provider: CalendarProvider): string {
    switch (provider.type) {
      case 'google':
        return `/calendars/${provider.credentials.calendarId}/events`;
      case 'outlook':
        return '/me/events';
      case 'apple':
        return '/events';
      default:
        return '/events';
    }
  }

  private getAvailabilityEndpoint(provider: CalendarProvider): string {
    switch (provider.type) {
      case 'google':
        return '/freeBusy';
      case 'outlook':
        return '/me/calendar/getSchedule';
      default:
        return '/availability';
    }
  }

  private extractEventId(data: any, provider: CalendarProvider): string {
    switch (provider.type) {
      case 'google':
        return data.id;
      case 'outlook':
        return data.id;
      case 'apple':
        return data.uid;
      default:
        return data.id || data.uid || '';
    }
  }

  private formatAvailabilityQuery(
    query: AvailabilityQuery,
    provider: CalendarProvider,
  ): any {
    const baseQuery = {
      timeMin: query.startDate.toISOString(),
      timeMax: query.endDate.toISOString(),
    };

    switch (provider.type) {
      case 'google':
        return {
          ...baseQuery,
          items: query.calendarIds?.map((id) => ({ id })) || [
            { id: provider.credentials.calendarId },
          ],
        };
      case 'outlook':
        return {
          ...baseQuery,
          Schedules: query.calendarIds || [provider.credentials.calendarId],
        };
      default:
        return baseQuery;
    }
  }

  private transformAvailabilityResponse(
    data: any,
    provider: CalendarProvider,
    query: AvailabilityQuery,
  ): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];

    // This would implement provider-specific response transformation
    // For now, return mock data
    const startTime = query.startDate;
    const endTime = query.endDate;
    const duration = query.duration || 120; // 2 hours default

    // Generate sample availability slots
    let currentTime = new Date(startTime);
    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000);

      slots.push({
        start: new Date(currentTime),
        end: slotEnd,
        duration,
        available: Math.random() > 0.3, // 70% available
        confidence: Math.floor(Math.random() * 40) + 60, // 60-100%
        pricing: {
          basePrice: 200,
          seasonalMultiplier: this.isPeakWeddingSeason(currentTime) ? 1.2 : 1.0,
          demandMultiplier: this.isWeekend(currentTime) ? 1.1 : 1.0,
          finalPrice: 200,
          currency: 'USD',
        },
        metadata: {
          isWeekend: this.isWeekend(currentTime),
          isPeakSeason: this.isPeakWeddingSeason(currentTime),
          isHoliday: false,
        },
      });

      // Move to next slot (with some gap)
      currentTime = new Date(currentTime.getTime() + (duration + 30) * 60000);
    }

    return slots;
  }

  private async performProviderSync(
    provider: CalendarProvider,
    sync: CalendarSync,
    options?: any,
  ): Promise<void> {
    sync.status = 'running';

    // This would implement actual calendar synchronization
    // For now, simulate sync process

    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate processing

    // Mock sync results
    sync.eventsProcessed = 50;
    sync.eventsCreated = 5;
    sync.eventsUpdated = 10;
    sync.eventsDeleted = 2;
    sync.weddingEventsProcessed = 15;
  }

  private async updateWeddingEvent(
    event: WeddingCalendarEvent,
  ): Promise<IntegrationResponse<any>> {
    // This would implement event updates across providers
    return { success: true, data: {} };
  }

  private async deleteWeddingEvent(
    eventId: string,
  ): Promise<IntegrationResponse<any>> {
    // This would implement event deletion across providers
    return { success: true, data: {} };
  }

  private async checkEventConflicts(
    event: WeddingCalendarEvent,
    provider: CalendarProvider,
  ): Promise<CalendarConflict[]> {
    // This would check for scheduling conflicts
    return [];
  }

  private async applyWeddingEventLogic(
    event: WeddingCalendarEvent,
    createdEvents: Map<string, string>,
  ): Promise<void> {
    // Apply wedding-specific logic like notifications, coordinator updates, etc.
  }

  private scheduleSync(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (!provider || provider.syncSettings.syncFrequency <= 0) return;

    setInterval(async () => {
      try {
        await this.syncCalendars([providerId]);
      } catch (error) {
        console.error(`Scheduled sync failed for ${providerId}:`, error);
      }
    }, provider.syncSettings.syncFrequency * 60000); // Convert minutes to milliseconds
  }

  private slotsOverlap(
    slot1: AvailabilitySlot,
    slot2: AvailabilitySlot,
  ): boolean {
    return slot1.start < slot2.end && slot2.start < slot1.end;
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  private isWeddingWeekend(date: Date): boolean {
    // Check if date is within wedding weekend (Friday-Sunday)
    const day = date.getDay();
    return day === 5 || day === 6 || day === 0; // Friday, Saturday, or Sunday
  }

  private isPeakWeddingSeason(date: Date): boolean {
    const month = date.getMonth();
    return month >= 4 && month <= 8; // May through September (0-indexed)
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDefaultProviders(): void {
    // Initialize Google Calendar provider
    const googleProvider: CalendarProvider = {
      id: 'google_calendar',
      name: 'Google Calendar',
      type: 'google',
      apiVersion: 'v3',
      baseUrl: 'https://www.googleapis.com/calendar/v3',
      credentials: {
        userId: 'system',
        organizationId: 'system',
        provider: 'google',
        apiKey: '',
        accessToken: process.env.GOOGLE_ACCESS_TOKEN || '',
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        scope: ['https://www.googleapis.com/auth/calendar'],
      },
      capabilities: [
        { name: 'create_events', supported: true, weddingOptimized: true },
        { name: 'recurring_events', supported: true },
        { name: 'reminders', supported: true },
        { name: 'attachments', supported: true },
        { name: 'free_busy', supported: true, weddingOptimized: true },
      ],
      syncSettings: {
        bidirectional: true,
        syncFrequency: 15, // 15 minutes
        conflictResolution: 'manual',
        syncPastEvents: false,
        syncFutureMonths: 12,
        eventFilters: [],
        weddingPriority: true,
      },
      weddingFeatures: {
        weddingDayBlocking: true,
        bufferTimeManagement: true,
        venueCoordination: false,
        vendorAvailabilitySharing: true,
        timelineIntegration: true,
        emergencyScheduling: true,
        seasonalAvailability: true,
        packageBookingSupport: false,
      },
      rateLimits: {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        burstAllowance: 10,
        quotaReset: new Date(),
        weddingDayBonus: 200,
      },
      status: 'active',
    };

    this.registerProvider(googleProvider);
  }
}

export default CalendarAPIIntegration;
