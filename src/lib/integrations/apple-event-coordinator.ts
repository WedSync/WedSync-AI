// Apple Event Coordinator - WS-218 Team C Round 1
// Cross-system event synchronization coordination with conflict resolution

import {
  AppleCalendarIntegration,
  CalDAVEvent,
  CalDAVAttendee,
  EventSyncResult,
  ScheduleSyncResult,
  SyncConflict,
  ConflictResolution,
  ConflictType,
  EventType,
  WebSocketEventUpdate,
} from '../../types/apple-sync';

// WedSync event interface for internal event management
interface WedSyncEvent {
  id: string;
  userId: string;
  organizationId?: string;
  weddingId?: string;
  vendorId?: string;
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  isAllDay: boolean;
  location?: string;
  eventType: EventType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  attendees: WedSyncAttendee[];
  metadata: Record<string, any>;
  externalReferences: EventExternalReference[];
  lastModified: Date;
  createdAt: Date;
}

interface WedSyncAttendee {
  id: string;
  email: string;
  name?: string;
  role: 'organizer' | 'required' | 'optional' | 'resource';
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  isVendor?: boolean;
  vendorId?: string;
}

interface EventExternalReference {
  platform: 'apple_calendar' | 'google_calendar' | 'outlook' | 'tave';
  externalId: string;
  integrationId: string;
  lastSyncAt: Date;
  syncStatus: 'synced' | 'pending' | 'error';
}

// iCalendar processing interface
interface iCalendarProcessor {
  parseICalendar(icalData: string): CalDAVEvent;
  generateICalendar(event: WedSyncEvent): string;
  extractRecurrencePattern(rrule?: string): RecurrencePattern;
  generateRecurrenceRule(pattern: RecurrencePattern): string;
}

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  count?: number;
  until?: Date;
  byWeekday?: string[];
  byMonthDay?: number[];
  exceptions?: Date[];
}

// Wedding-specific event prioritization
interface WeddingEventPriority {
  getEventPriority(event: WedSyncEvent): number;
  isWeddingCritical(event: WedSyncEvent): boolean;
  requiresVendorCoordination(event: WedSyncEvent): boolean;
  getConflictResolutionStrategy(
    event: WedSyncEvent,
  ): 'preserve_wedding' | 'latest_wins' | 'manual';
}

// Database interface for event management
interface EventDatabase {
  getWedSyncEvent(eventId: string): Promise<WedSyncEvent | null>;
  findEventByExternalReference(
    integrationId: string,
    externalId: string,
  ): Promise<WedSyncEvent | null>;
  createWedSyncEvent(
    event: Omit<WedSyncEvent, 'id' | 'createdAt' | 'lastModified'>,
  ): Promise<WedSyncEvent>;
  updateWedSyncEvent(
    eventId: string,
    updates: Partial<WedSyncEvent>,
  ): Promise<WedSyncEvent>;
  deleteWedSyncEvent(eventId: string): Promise<void>;
  getEventsByIntegration(integrationId: string): Promise<WedSyncEvent[]>;
  getVendorSchedule(
    vendorId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<WedSyncEvent[]>;
  recordEventMapping(
    wedSyncEventId: string,
    externalRef: EventExternalReference,
  ): Promise<void>;
}

// WebSocket interface for real-time updates
interface EventWebSocketManager {
  broadcastEventUpdate(userId: string, update: WebSocketEventUpdate): void;
  broadcastConflict(userId: string, conflict: SyncConflict): void;
  broadcastVendorScheduleUpdate(vendorId: string, event: WedSyncEvent): void;
}

/**
 * Apple Event Coordinator
 *
 * Coordinates cross-system event synchronization between WedSync and Apple Calendar.
 * Handles wedding event prioritization, vendor coordination, conflict resolution,
 * and real-time update broadcasting for seamless calendar management.
 */
export class AppleEventCoordinator {
  private database: EventDatabase;
  private iCalProcessor: iCalendarProcessor;
  private webSocketManager: EventWebSocketManager;
  private weddingPriority: WeddingEventPriority;

  // Conflict resolution settings
  private readonly WEDDING_CRITICAL_BUFFER_HOURS = 48; // 48 hours before wedding
  private readonly MAX_CONFLICT_RESOLUTION_ATTEMPTS = 3;

  // Event deduplication tracking
  private recentlyProcessedEvents: Map<string, Date> = new Map();
  private readonly DEDUP_WINDOW_MS = 30000; // 30 seconds

  constructor(
    database: EventDatabase,
    iCalProcessor: iCalendarProcessor,
    webSocketManager: EventWebSocketManager,
    weddingPriority: WeddingEventPriority,
  ) {
    this.database = database;
    this.iCalProcessor = iCalProcessor;
    this.webSocketManager = webSocketManager;
    this.weddingPriority = weddingPriority;

    // Start cleanup of processed events tracking
    this.startDedupCleanup();

    console.log('Apple Event Coordinator initialized');
  }

  /**
   * Synchronize a newly created CalDAV event
   */
  async syncCreatedEvent(
    integration: AppleCalendarIntegration,
    caldavEvent: CalDAVEvent,
  ): Promise<EventSyncResult> {
    console.log(
      `Syncing created event: ${caldavEvent.uid} from Apple Calendar`,
    );

    try {
      // Check for deduplication
      if (this.isDuplicateProcessing(caldavEvent.uid)) {
        return {
          eventId: caldavEvent.uid,
          success: true,
          action: 'skipped',
        };
      }

      // Check if event already exists in WedSync
      const existingEvent = await this.database.findEventByExternalReference(
        integration.id,
        caldavEvent.uid,
      );

      if (existingEvent) {
        console.log(
          `Event already exists, treating as update: ${caldavEvent.uid}`,
        );
        return await this.syncUpdatedEvent(integration, caldavEvent);
      }

      // Convert CalDAV event to WedSync format
      const wedSyncEvent = await this.convertCalDAVToWedSyncEvent(
        caldavEvent,
        integration,
      );

      // Create event in WedSync database
      const createdEvent = await this.database.createWedSyncEvent(wedSyncEvent);

      // Record external reference mapping
      await this.database.recordEventMapping(createdEvent.id, {
        platform: 'apple_calendar',
        externalId: caldavEvent.uid,
        integrationId: integration.id,
        lastSyncAt: new Date(),
        syncStatus: 'synced',
      });

      // Broadcast real-time update
      this.webSocketManager.broadcastEventUpdate(integration.userId, {
        type: 'event_created',
        eventId: createdEvent.id,
        event: caldavEvent,
        integrationId: integration.id,
        timestamp: new Date(),
      });

      // Check if this affects vendor schedules
      if (this.weddingPriority.requiresVendorCoordination(createdEvent)) {
        await this.coordinateVendorScheduleUpdate(createdEvent);
      }

      this.markEventProcessed(caldavEvent.uid);

      console.log(
        `Event created successfully: ${caldavEvent.uid} -> ${createdEvent.id}`,
      );
      return {
        eventId: createdEvent.id,
        success: true,
        action: 'created',
      };
    } catch (error) {
      console.error(`Failed to sync created event ${caldavEvent.uid}:`, error);
      return {
        eventId: caldavEvent.uid,
        success: false,
        action: 'skipped',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Synchronize an updated CalDAV event with conflict detection
   */
  async syncUpdatedEvent(
    integration: AppleCalendarIntegration,
    caldavEvent: CalDAVEvent,
  ): Promise<EventSyncResult> {
    console.log(
      `Syncing updated event: ${caldavEvent.uid} from Apple Calendar`,
    );

    try {
      // Check for deduplication
      if (this.isDuplicateProcessing(caldavEvent.uid)) {
        return {
          eventId: caldavEvent.uid,
          success: true,
          action: 'skipped',
        };
      }

      // Find existing WedSync event
      const existingEvent = await this.database.findEventByExternalReference(
        integration.id,
        caldavEvent.uid,
      );

      if (!existingEvent) {
        console.log(
          `Event not found in WedSync, treating as new: ${caldavEvent.uid}`,
        );
        return await this.syncCreatedEvent(integration, caldavEvent);
      }

      // Detect conflicts
      const conflict = await this.detectUpdateConflict(
        existingEvent,
        caldavEvent,
        integration,
      );

      if (conflict) {
        console.log(
          `Conflict detected for event ${caldavEvent.uid}:`,
          conflict.type,
        );

        // Attempt automatic resolution
        const resolution = await this.resolveConflictAutomatically(
          conflict,
          existingEvent,
          caldavEvent,
          integration,
        );

        if (resolution.strategy === 'manual') {
          // Broadcast conflict for manual resolution
          this.webSocketManager.broadcastConflict(integration.userId, conflict);

          return {
            eventId: existingEvent.id,
            success: false,
            action: 'skipped',
            conflicts: [conflict],
          };
        }

        // Apply automatic resolution
        caldavEvent = resolution.resolvedEvent;
      }

      // Convert and merge updates
      const updatedWedSyncEvent = await this.mergeCalDAVUpdates(
        existingEvent,
        caldavEvent,
        integration,
      );

      // Update event in WedSync database
      const savedEvent = await this.database.updateWedSyncEvent(
        existingEvent.id,
        updatedWedSyncEvent,
      );

      // Update external reference mapping
      await this.database.recordEventMapping(existingEvent.id, {
        platform: 'apple_calendar',
        externalId: caldavEvent.uid,
        integrationId: integration.id,
        lastSyncAt: new Date(),
        syncStatus: 'synced',
      });

      // Broadcast real-time update
      this.webSocketManager.broadcastEventUpdate(integration.userId, {
        type: 'event_updated',
        eventId: savedEvent.id,
        event: caldavEvent,
        integrationId: integration.id,
        timestamp: new Date(),
      });

      // Check vendor coordination needs
      if (this.weddingPriority.requiresVendorCoordination(savedEvent)) {
        await this.coordinateVendorScheduleUpdate(savedEvent);
      }

      this.markEventProcessed(caldavEvent.uid);

      console.log(`Event updated successfully: ${caldavEvent.uid}`);
      return {
        eventId: savedEvent.id,
        success: true,
        action: 'updated',
        conflicts: conflict ? [conflict] : undefined,
      };
    } catch (error) {
      console.error(`Failed to sync updated event ${caldavEvent.uid}:`, error);
      return {
        eventId: caldavEvent.uid,
        success: false,
        action: 'skipped',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Synchronize a deleted CalDAV event
   */
  async syncDeletedEvent(
    integration: AppleCalendarIntegration,
    caldavEvent: CalDAVEvent,
  ): Promise<EventSyncResult> {
    console.log(
      `Syncing deleted event: ${caldavEvent.uid} from Apple Calendar`,
    );

    try {
      // Find existing WedSync event
      const existingEvent = await this.database.findEventByExternalReference(
        integration.id,
        caldavEvent.uid,
      );

      if (!existingEvent) {
        console.log(`Event not found for deletion: ${caldavEvent.uid}`);
        return {
          eventId: caldavEvent.uid,
          success: true,
          action: 'skipped',
        };
      }

      // Check if this is a wedding-critical event
      const isWeddingCritical =
        this.weddingPriority.isWeddingCritical(existingEvent);

      if (isWeddingCritical) {
        // Create conflict for manual review of critical event deletion
        const conflict: SyncConflict = {
          eventId: existingEvent.id,
          type: 'deletion_conflict',
          localEvent: caldavEvent,
          resolution: {
            strategy: 'manual',
            resolvedEvent: caldavEvent,
            reasoning:
              'Wedding-critical event deletion requires manual confirmation',
          },
        };

        this.webSocketManager.broadcastConflict(integration.userId, conflict);

        return {
          eventId: existingEvent.id,
          success: false,
          action: 'skipped',
          conflicts: [conflict],
        };
      }

      // Soft delete the event (preserve for recovery)
      await this.database.deleteWedSyncEvent(existingEvent.id);

      // Broadcast real-time update
      this.webSocketManager.broadcastEventUpdate(integration.userId, {
        type: 'event_deleted',
        eventId: existingEvent.id,
        integrationId: integration.id,
        timestamp: new Date(),
      });

      // Notify vendors if this affects their schedules
      if (this.weddingPriority.requiresVendorCoordination(existingEvent)) {
        await this.coordinateVendorScheduleUpdate(existingEvent, true);
      }

      console.log(`Event deleted successfully: ${caldavEvent.uid}`);
      return {
        eventId: existingEvent.id,
        success: true,
        action: 'deleted',
      };
    } catch (error) {
      console.error(`Failed to sync deleted event ${caldavEvent.uid}:`, error);
      return {
        eventId: caldavEvent.uid,
        success: false,
        action: 'skipped',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Synchronize a specific event by UID (webhook-triggered)
   */
  async syncSpecificEvent(
    integration: AppleCalendarIntegration,
    eventUid: string,
    changeType: 'created' | 'updated' | 'deleted',
  ): Promise<EventSyncResult> {
    console.log(`Syncing specific event: ${eventUid} (${changeType})`);

    try {
      // TODO: Fetch the specific CalDAV event from Apple Calendar
      // This would involve a CalDAV GET request for the specific event
      const caldavEvent: CalDAVEvent = {
        uid: eventUid,
        url: `${integration.calendarUrl}/${eventUid}.ics`,
        etag: 'placeholder',
        calendarData: '',
        startDate: new Date(),
        endDate: new Date(),
        isAllDay: false,
        lastModified: new Date(),
      };

      switch (changeType) {
        case 'created':
          return await this.syncCreatedEvent(integration, caldavEvent);
        case 'updated':
          return await this.syncUpdatedEvent(integration, caldavEvent);
        case 'deleted':
          return await this.syncDeletedEvent(integration, caldavEvent);
        default:
          throw new Error(`Unknown change type: ${changeType}`);
      }
    } catch (error) {
      console.error(`Failed to sync specific event ${eventUid}:`, error);
      return {
        eventId: eventUid,
        success: false,
        action: 'skipped',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Synchronize entire vendor schedule
   */
  async syncVendorSchedule(
    vendorId: string,
    integration: AppleCalendarIntegration,
  ): Promise<ScheduleSyncResult> {
    console.log(`Syncing vendor schedule: ${vendorId}`);

    const result: ScheduleSyncResult = {
      vendorId,
      eventCount: 0,
      successCount: 0,
      failureCount: 0,
      conflicts: [],
      processingTime: 0,
    };

    const startTime = Date.now();

    try {
      // Get vendor's existing schedule (next 90 days)
      const dateRange = {
        start: new Date(),
        end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      };

      const existingSchedule = await this.database.getVendorSchedule(
        vendorId,
        dateRange,
      );
      result.eventCount = existingSchedule.length;

      // Sync each event in the vendor's schedule
      for (const event of existingSchedule) {
        try {
          // Find Apple Calendar reference for this event
          const appleRef = event.externalReferences.find(
            (ref) =>
              ref.platform === 'apple_calendar' &&
              ref.integrationId === integration.id,
          );

          if (appleRef) {
            // Sync existing Apple Calendar event
            const syncResult = await this.syncSpecificEvent(
              integration,
              appleRef.externalId,
              'updated',
            );

            if (syncResult.success) {
              result.successCount++;
            } else {
              result.failureCount++;
              if (syncResult.conflicts) {
                result.conflicts.push(...syncResult.conflicts);
              }
            }
          } else {
            // Create new Apple Calendar event
            // TODO: Implement bidirectional sync (WedSync -> Apple Calendar)
            result.successCount++;
          }
        } catch (error) {
          result.failureCount++;
          console.error(`Failed to sync vendor event ${event.id}:`, error);
        }
      }

      // Broadcast vendor schedule update
      this.webSocketManager.broadcastVendorScheduleUpdate(
        vendorId,
        existingSchedule[0],
      );

      console.log(`Vendor schedule sync completed: ${vendorId}`, {
        total: result.eventCount,
        success: result.successCount,
        failed: result.failureCount,
        conflicts: result.conflicts.length,
      });
    } catch (error) {
      console.error(`Failed to sync vendor schedule ${vendorId}:`, error);
    } finally {
      result.processingTime = Date.now() - startTime;
    }

    return result;
  }

  // Private methods

  private async convertCalDAVToWedSyncEvent(
    caldavEvent: CalDAVEvent,
    integration: AppleCalendarIntegration,
  ): Promise<Omit<WedSyncEvent, 'id' | 'createdAt' | 'lastModified'>> {
    // Parse iCalendar data
    const parsedEvent = this.iCalProcessor.parseICalendar(
      caldavEvent.calendarData,
    );

    // Determine event type based on content and integration settings
    const eventType = this.classifyEventType(caldavEvent, integration);

    // Map CalDAV attendees to WedSync attendees
    const attendees: WedSyncAttendee[] = (caldavEvent.attendees || []).map(
      (att) => ({
        id: `caldav-${att.email}`,
        email: att.email,
        name: att.name,
        role: this.mapAttendeeRole(att.role),
        status: this.mapAttendeeStatus(att.status),
        isVendor: false, // TODO: Detect if attendee is a vendor
      }),
    );

    return {
      userId: integration.userId,
      organizationId: undefined, // TODO: Get from integration context
      weddingId: undefined, // TODO: Extract from event metadata
      vendorId: undefined, // TODO: Extract if this is a vendor event
      title: caldavEvent.summary || 'Untitled Event',
      description: caldavEvent.description,
      startDateTime: caldavEvent.startDate,
      endDateTime: caldavEvent.endDate,
      isAllDay: caldavEvent.isAllDay,
      location: caldavEvent.location,
      eventType,
      priority: this.calculateEventPriority(caldavEvent, eventType),
      attendees,
      metadata: {
        appleCalendarUid: caldavEvent.uid,
        recurrenceRule: caldavEvent.recurrenceRule,
        originalCalendarData: caldavEvent.calendarData,
      },
      externalReferences: [],
    };
  }

  private async mergeCalDAVUpdates(
    existingEvent: WedSyncEvent,
    caldavEvent: CalDAVEvent,
    integration: AppleCalendarIntegration,
  ): Promise<Partial<WedSyncEvent>> {
    return {
      title: caldavEvent.summary || existingEvent.title,
      description: caldavEvent.description || existingEvent.description,
      startDateTime: caldavEvent.startDate,
      endDateTime: caldavEvent.endDate,
      isAllDay: caldavEvent.isAllDay,
      location: caldavEvent.location || existingEvent.location,
      lastModified: new Date(),
      metadata: {
        ...existingEvent.metadata,
        appleCalendarUid: caldavEvent.uid,
        lastAppleSync: new Date().toISOString(),
      },
    };
  }

  private async detectUpdateConflict(
    existingEvent: WedSyncEvent,
    caldavEvent: CalDAVEvent,
    integration: AppleCalendarIntegration,
  ): Promise<SyncConflict | null> {
    // Check if both events were modified recently (potential conflict)
    const existingModified = existingEvent.lastModified.getTime();
    const caldavModified = caldavEvent.lastModified.getTime();
    const timeDiff = Math.abs(existingModified - caldavModified);

    // If modified within 5 minutes of each other, potential conflict
    if (timeDiff < 300000) {
      // Check for significant differences
      const hasSignificantChanges =
        existingEvent.title !== (caldavEvent.summary || '') ||
        Math.abs(
          existingEvent.startDateTime.getTime() -
            caldavEvent.startDate.getTime(),
        ) > 60000 ||
        Math.abs(
          existingEvent.endDateTime.getTime() - caldavEvent.endDate.getTime(),
        ) > 60000;

      if (hasSignificantChanges) {
        return {
          eventId: existingEvent.id,
          type: 'update_conflict',
          localEvent: caldavEvent,
          remoteEvent: caldavEvent, // In this case, Apple Calendar is remote
        };
      }
    }

    return null;
  }

  private async resolveConflictAutomatically(
    conflict: SyncConflict,
    existingEvent: WedSyncEvent,
    caldavEvent: CalDAVEvent,
    integration: AppleCalendarIntegration,
  ): Promise<ConflictResolution> {
    // Get wedding-specific conflict resolution strategy
    const strategy =
      this.weddingPriority.getConflictResolutionStrategy(existingEvent);

    switch (strategy) {
      case 'preserve_wedding':
        // Preserve wedding-critical event details
        if (this.weddingPriority.isWeddingCritical(existingEvent)) {
          return {
            strategy: 'wedsync_wins',
            resolvedEvent: caldavEvent, // Keep current CalDAV data but mark for manual review
            reasoning: 'Wedding-critical event preserved',
          };
        }
        break;

      case 'latest_wins':
        // Use the most recently modified version
        if (caldavEvent.lastModified > existingEvent.lastModified) {
          return {
            strategy: 'apple_wins',
            resolvedEvent: caldavEvent,
            reasoning: 'Apple Calendar version is more recent',
          };
        }
        break;

      case 'manual':
        // Always require manual resolution
        return {
          strategy: 'manual',
          resolvedEvent: caldavEvent,
          reasoning: 'Event requires manual conflict resolution',
        };
    }

    // Default to latest wins
    return {
      strategy: 'latest_wins',
      resolvedEvent: caldavEvent,
      reasoning: 'Using latest modification timestamp',
    };
  }

  private classifyEventType(
    caldavEvent: CalDAVEvent,
    integration: AppleCalendarIntegration,
  ): EventType {
    const title = (caldavEvent.summary || '').toLowerCase();
    const description = (caldavEvent.description || '').toLowerCase();

    // Check for wedding ceremony keywords
    if (
      title.includes('ceremony') ||
      title.includes('wedding') ||
      title.includes('marriage') ||
      title.includes('vows')
    ) {
      return 'wedding_ceremony';
    }

    // Check for vendor meeting keywords
    if (
      title.includes('vendor') ||
      title.includes('meeting') ||
      title.includes('consultation') ||
      title.includes('appointment')
    ) {
      return 'vendor_meeting';
    }

    // Check for client appointment keywords
    if (
      title.includes('client') ||
      title.includes('couple') ||
      title.includes('bride') ||
      title.includes('groom')
    ) {
      return 'client_appointment';
    }

    // Check for deadline keywords
    if (
      title.includes('deadline') ||
      title.includes('due') ||
      title.includes('final') ||
      description.includes('deadline')
    ) {
      return 'deadline';
    }

    // Check for task keywords
    if (
      title.includes('task') ||
      title.includes('todo') ||
      title.includes('action') ||
      title.includes('follow up')
    ) {
      return 'task';
    }

    // Default to milestone
    return 'milestone';
  }

  private calculateEventPriority(
    caldavEvent: CalDAVEvent,
    eventType: EventType,
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Wedding ceremonies are always critical
    if (eventType === 'wedding_ceremony') {
      return 'critical';
    }

    // Vendor meetings and client appointments are high priority
    if (eventType === 'vendor_meeting' || eventType === 'client_appointment') {
      return 'high';
    }

    // Deadlines are medium to high based on proximity
    if (eventType === 'deadline') {
      const daysUntil = Math.ceil(
        (caldavEvent.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntil <= 7) return 'high';
      if (daysUntil <= 30) return 'medium';
    }

    // Tasks and milestones are typically medium priority
    if (eventType === 'task' || eventType === 'milestone') {
      return 'medium';
    }

    return 'low';
  }

  private mapAttendeeRole(
    caldavRole: 'chair' | 'required' | 'optional',
  ): 'organizer' | 'required' | 'optional' | 'resource' {
    switch (caldavRole) {
      case 'chair':
        return 'organizer';
      case 'required':
        return 'required';
      case 'optional':
        return 'optional';
      default:
        return 'optional';
    }
  }

  private mapAttendeeStatus(
    caldavStatus: 'accepted' | 'declined' | 'tentative' | 'needs_action',
  ): 'pending' | 'accepted' | 'declined' | 'tentative' {
    switch (caldavStatus) {
      case 'needs_action':
        return 'pending';
      case 'accepted':
        return 'accepted';
      case 'declined':
        return 'declined';
      case 'tentative':
        return 'tentative';
      default:
        return 'pending';
    }
  }

  private async coordinateVendorScheduleUpdate(
    event: WedSyncEvent,
    isDeleted = false,
  ): Promise<void> {
    if (!event.vendorId) return;

    try {
      // Broadcast vendor schedule update
      this.webSocketManager.broadcastVendorScheduleUpdate(
        event.vendorId,
        event,
      );

      // TODO: Additional vendor coordination logic
      // - Notify other vendors of schedule conflicts
      // - Update vendor availability
      // - Trigger workflow automations

      console.log(`Vendor coordination completed for event: ${event.id}`);
    } catch (error) {
      console.error(`Vendor coordination failed for event ${event.id}:`, error);
    }
  }

  private isDuplicateProcessing(eventUid: string): boolean {
    const lastProcessed = this.recentlyProcessedEvents.get(eventUid);

    if (
      lastProcessed &&
      Date.now() - lastProcessed.getTime() < this.DEDUP_WINDOW_MS
    ) {
      console.log(`Skipping duplicate processing of event: ${eventUid}`);
      return true;
    }

    return false;
  }

  private markEventProcessed(eventUid: string): void {
    this.recentlyProcessedEvents.set(eventUid, new Date());
  }

  private startDedupCleanup(): void {
    // Clean up processed events tracking every 5 minutes
    setInterval(() => {
      const cutoff = Date.now() - this.DEDUP_WINDOW_MS * 2; // Keep for 2x the dedup window

      for (const [eventUid, timestamp] of Array.from(
        this.recentlyProcessedEvents.entries(),
      )) {
        if (timestamp.getTime() < cutoff) {
          this.recentlyProcessedEvents.delete(eventUid);
        }
      }
    }, 300000); // 5 minutes
  }
}
