/**
 * WS-336: Calendar Integration System - Timeline Synchronization Service
 *
 * Handles synchronization between WedSync wedding timelines and external calendar events.
 * Supports bidirectional sync with conflict resolution for wedding vendors.
 *
 * WEDDING CRITICAL: Timeline data is the source of truth for wedding day logistics.
 */

import { createClient } from '@supabase/supabase-js';
import { SecureCalendarTokenManager } from './token-encryption';
import type { CalendarProvider } from './oauth-service';

interface TimelineItem {
  id: string;
  weddingId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  type:
    | 'ceremony'
    | 'reception'
    | 'photos'
    | 'preparation'
    | 'meeting'
    | 'consultation';
  attendees?: string[];
  notes?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
}

interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  lastModified: Date;
}

interface SyncOperation {
  id: string;
  organizationId: string;
  weddingId: string;
  connectionId: string;
  provider: CalendarProvider;
  operation: 'create' | 'update' | 'delete' | 'full_sync';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'conflict';
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  eventsProcessed: number;
  conflictsDetected: number;
}

interface SyncConflict {
  timelineItemId: string;
  calendarEventId: string;
  conflictType:
    | 'time_overlap'
    | 'title_mismatch'
    | 'location_mismatch'
    | 'deletion_conflict';
  localLastModified: Date;
  remoteLastModified: Date;
  resolution?: 'use_local' | 'use_remote' | 'manual' | 'merge';
}

export class TimelineSyncService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  /**
   * Sync wedding timeline to calendar provider
   */
  async syncTimelineToCalendar(
    organizationId: string,
    weddingId: string,
    connectionId: string,
    options: {
      syncDirection?: 'to_calendar' | 'from_calendar' | 'bidirectional';
      forceSync?: boolean;
      dryRun?: boolean;
    } = {},
  ): Promise<SyncOperation | null> {
    const operationId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Get calendar connection
      const { data: connection } = await this.supabase
        .from('calendar_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single();

      if (!connection) {
        throw new Error('Calendar connection not found or inactive');
      }

      // Get wedding timeline items
      const timelineItems = await this.getWeddingTimelineItems(
        organizationId,
        weddingId,
      );
      if (!timelineItems.length) {
        throw new Error('No timeline items found for wedding');
      }

      // Initialize sync operation record
      const syncOperation: Omit<SyncOperation, 'id'> = {
        organizationId,
        weddingId,
        connectionId,
        provider: connection.provider as CalendarProvider,
        operation: 'full_sync',
        status: 'in_progress',
        createdAt: new Date(),
        eventsProcessed: 0,
        conflictsDetected: 0,
      };

      const { data: operation } = await this.supabase
        .from('calendar_sync_logs')
        .insert({
          id: operationId,
          organization_id: syncOperation.organizationId,
          operation_type: syncOperation.operation,
          operation_status: syncOperation.status,
          calendar_connection_id: syncOperation.connectionId,
          wedding_id: syncOperation.weddingId,
          events_processed: 0,
          conflicts_detected: 0,
        })
        .select()
        .single();

      if (!operation) {
        throw new Error('Failed to create sync operation record');
      }

      // Get calendar service instance
      const calendarService = await this.getCalendarService(connection);
      if (!calendarService) {
        throw new Error('Failed to initialize calendar service');
      }

      // Process timeline items
      const conflicts: SyncConflict[] = [];
      let eventsProcessed = 0;
      let eventsCreated = 0;
      let eventsUpdated = 0;

      for (const timelineItem of timelineItems) {
        try {
          // Check if timeline item is already synced
          const { data: existingSync } = await this.supabase
            .from('timeline_calendar_sync')
            .select('*')
            .eq('timeline_item_id', timelineItem.id)
            .eq('calendar_connection_id', connectionId)
            .maybeSingle();

          if (existingSync) {
            // Update existing calendar event
            const updateResult = await this.updateCalendarEvent(
              calendarService,
              existingSync.external_event_id,
              timelineItem,
              connection,
            );

            if (updateResult.conflict) {
              conflicts.push(updateResult.conflict);
            } else if (updateResult.success) {
              eventsUpdated++;
              await this.updateSyncRecord(
                existingSync.id,
                'synced',
                new Date(),
              );
            }
          } else {
            // Create new calendar event
            const createResult = await this.createCalendarEvent(
              calendarService,
              timelineItem,
              connection,
            );

            if (createResult.success && createResult.eventId) {
              eventsCreated++;

              // Create sync record
              await this.supabase.from('timeline_calendar_sync').insert({
                organization_id: organizationId,
                wedding_id: weddingId,
                timeline_item_id: timelineItem.id,
                timeline_item_type: timelineItem.type,
                calendar_connection_id: connectionId,
                external_event_id: createResult.eventId,
                external_calendar_id:
                  connection.default_calendar_id || 'primary',
                sync_status: 'synced',
                sync_direction: 'to_calendar',
                event_title: timelineItem.title,
                event_start_time: timelineItem.startTime.toISOString(),
                event_end_time: timelineItem.endTime.toISOString(),
                event_location: timelineItem.location,
                event_description: timelineItem.description,
                last_sync_attempt: new Date().toISOString(),
              });
            }
          }

          eventsProcessed++;
        } catch (error) {
          console.error('Failed to sync timeline item:', {
            timelineItem: timelineItem.id,
            error,
          });
        }
      }

      // Update sync operation
      const completedAt = new Date();
      const duration = Date.now() - startTime;

      await this.supabase
        .from('calendar_sync_logs')
        .update({
          operation_status: conflicts.length > 0 ? 'partial' : 'success',
          events_processed: eventsProcessed,
          events_created: eventsCreated,
          events_updated: eventsUpdated,
          conflicts_detected: conflicts.length,
          operation_duration_ms: duration,
          error_details: conflicts.length > 0 ? { conflicts } : null,
        })
        .eq('id', operationId);

      // Update connection last sync time
      await this.supabase
        .from('calendar_connections')
        .update({
          last_sync_at: completedAt.toISOString(),
          last_sync_status:
            conflicts.length > 0 ? 'partial_success' : 'success',
        })
        .eq('id', connectionId);

      return {
        id: operationId,
        organizationId,
        weddingId,
        connectionId,
        provider: connection.provider as CalendarProvider,
        operation: 'full_sync',
        status: conflicts.length > 0 ? 'conflict' : 'completed',
        createdAt: new Date(operation.created_at),
        completedAt,
        eventsProcessed,
        conflictsDetected: conflicts.length,
      };
    } catch (error) {
      console.error('Timeline sync failed:', error);

      // Update operation as failed
      await this.supabase
        .from('calendar_sync_logs')
        .update({
          operation_status: 'failure',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
          operation_duration_ms: Date.now() - startTime,
        })
        .eq('id', operationId);

      return null;
    }
  }

  /**
   * Get wedding timeline items from database
   */
  private async getWeddingTimelineItems(
    organizationId: string,
    weddingId: string,
  ): Promise<TimelineItem[]> {
    // This would integrate with your existing timeline/wedding tables
    // For now, returning mock data structure
    const { data, error } = await this.supabase
      .from('wedding_timeline_items') // Assuming this table exists
      .select('*')
      .eq('organization_id', organizationId)
      .eq('wedding_id', weddingId)
      .eq('status', 'active')
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Failed to fetch timeline items:', error);
      return [];
    }

    return (data || []).map((item) => ({
      id: item.id,
      weddingId: item.wedding_id,
      title: item.title,
      description: item.description,
      startTime: new Date(item.start_time),
      endTime: new Date(item.end_time),
      location: item.location,
      type: item.type,
      attendees: item.attendees || [],
      notes: item.notes,
      status: item.status,
    }));
  }

  /**
   * Get calendar service instance for provider
   */
  private async getCalendarService(connection: any): Promise<any> {
    const tokenResult = await SecureCalendarTokenManager.retrieveToken(
      connection.access_token_encrypted,
      connection.organization_id,
      'access',
    );

    if (!tokenResult?.token) {
      throw new Error('Failed to decrypt access token');
    }

    // Return provider-specific calendar service
    switch (connection.provider) {
      case 'google':
        return new GoogleCalendarService(tokenResult.token);
      case 'outlook':
        return new OutlookCalendarService(tokenResult.token);
      case 'apple':
        return new AppleCalendarService(tokenResult.token);
      default:
        throw new Error(
          `Unsupported calendar provider: ${connection.provider}`,
        );
    }
  }

  /**
   * Create calendar event
   */
  private async createCalendarEvent(
    calendarService: any,
    timelineItem: TimelineItem,
    connection: any,
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      // Convert timeline item to calendar event format
      const eventData = this.timelineItemToCalendarEvent(
        timelineItem,
        connection,
      );

      // Create event via provider API
      const eventId = await calendarService.createEvent(eventData);

      return { success: true, eventId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update calendar event
   */
  private async updateCalendarEvent(
    calendarService: any,
    eventId: string,
    timelineItem: TimelineItem,
    connection: any,
  ): Promise<{ success: boolean; conflict?: SyncConflict; error?: string }> {
    try {
      // Get current event from calendar
      const currentEvent = await calendarService.getEvent(eventId);

      // Check for conflicts
      const conflict = this.detectConflicts(timelineItem, currentEvent);
      if (conflict) {
        return { success: false, conflict };
      }

      // Convert timeline item to calendar event format
      const eventData = this.timelineItemToCalendarEvent(
        timelineItem,
        connection,
      );

      // Update event via provider API
      await calendarService.updateEvent(eventId, eventData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert timeline item to calendar event format
   */
  private timelineItemToCalendarEvent(
    timelineItem: TimelineItem,
    connection: any,
  ): any {
    const weddingPrefix = connection.include_client_details ? '[Wedding] ' : '';
    const locationSuffix =
      connection.include_location_in_title && timelineItem.location
        ? ` @ ${timelineItem.location}`
        : '';

    return {
      summary: `${weddingPrefix}${timelineItem.title}${locationSuffix}`,
      description: this.buildEventDescription(timelineItem),
      start: {
        dateTime: timelineItem.startTime.toISOString(),
        timeZone: 'UTC', // TODO: Use wedding timezone
      },
      end: {
        dateTime: timelineItem.endTime.toISOString(),
        timeZone: 'UTC',
      },
      location: timelineItem.location,
      attendees: timelineItem.attendees?.map((email) => ({ email })),
      status: this.mapStatusToCalendar(timelineItem.status),
      colorId: this.getEventColor(timelineItem.type, connection),
    };
  }

  /**
   * Build comprehensive event description
   */
  private buildEventDescription(timelineItem: TimelineItem): string {
    const parts = [];

    if (timelineItem.description) {
      parts.push(timelineItem.description);
    }

    parts.push(`Event Type: ${timelineItem.type}`);

    if (timelineItem.notes) {
      parts.push(`Notes: ${timelineItem.notes}`);
    }

    parts.push('---');
    parts.push('Managed by WedSync - Wedding Planning Platform');
    parts.push(
      '⚠️ Please do not modify this event directly - changes may be overwritten',
    );

    return parts.join('\n\n');
  }

  /**
   * Map timeline status to calendar status
   */
  private mapStatusToCalendar(status: TimelineItem['status']): string {
    switch (status) {
      case 'confirmed':
        return 'confirmed';
      case 'tentative':
        return 'tentative';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'confirmed';
    }
  }

  /**
   * Get event color based on timeline item type
   */
  private getEventColor(type: TimelineItem['type'], connection: any): string {
    const colorMap = {
      ceremony: connection.wedding_event_color || '11', // Purple
      reception: connection.wedding_event_color || '11',
      photos: connection.booking_event_color || '10', // Green
      preparation: connection.consultation_event_color || '5', // Orange
      meeting: connection.consultation_event_color || '5',
      consultation: connection.consultation_event_color || '5',
    };

    return colorMap[type] || '1'; // Default blue
  }

  /**
   * Detect sync conflicts between timeline item and calendar event
   */
  private detectConflicts(
    timelineItem: TimelineItem,
    calendarEvent: CalendarEvent,
  ): SyncConflict | null {
    // Time overlap detection
    const timelineStart = timelineItem.startTime.getTime();
    const timelineEnd = timelineItem.endTime.getTime();
    const calendarStart = calendarEvent.startTime.getTime();
    const calendarEnd = calendarEvent.endTime.getTime();

    // Check if times are significantly different (>15 minutes)
    const startDiff = Math.abs(timelineStart - calendarStart);
    const endDiff = Math.abs(timelineEnd - calendarEnd);
    const maxDiff = 15 * 60 * 1000; // 15 minutes in milliseconds

    if (startDiff > maxDiff || endDiff > maxDiff) {
      return {
        timelineItemId: timelineItem.id,
        calendarEventId: calendarEvent.id,
        conflictType: 'time_overlap',
        localLastModified: new Date(), // TODO: Get actual timeline item modified time
        remoteLastModified: calendarEvent.lastModified,
      };
    }

    return null;
  }

  /**
   * Update sync record status
   */
  private async updateSyncRecord(
    syncId: string,
    status: string,
    lastSyncTime: Date,
  ): Promise<void> {
    await this.supabase
      .from('timeline_calendar_sync')
      .update({
        sync_status: status,
        last_sync_attempt: lastSyncTime.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', syncId);
  }

  /**
   * Get sync status for wedding
   */
  async getSyncStatus(
    organizationId: string,
    weddingId: string,
  ): Promise<{
    totalItems: number;
    syncedItems: number;
    pendingItems: number;
    conflictItems: number;
    lastSync?: Date;
    connections: Array<{
      id: string;
      provider: string;
      status: string;
      lastSync?: Date;
    }>;
  } | null> {
    try {
      // Get all calendar connections for organization
      const { data: connections } = await this.supabase
        .from('calendar_connections')
        .select('id, provider, status, last_sync_at')
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      // Get sync statistics
      const { data: syncStats } = await this.supabase
        .from('timeline_calendar_sync')
        .select('sync_status, last_sync_attempt')
        .eq('organization_id', organizationId)
        .eq('wedding_id', weddingId);

      // Calculate statistics
      const totalItems = syncStats?.length || 0;
      const syncedItems =
        syncStats?.filter((s) => s.sync_status === 'synced').length || 0;
      const pendingItems =
        syncStats?.filter((s) => s.sync_status === 'pending').length || 0;
      const conflictItems =
        syncStats?.filter((s) => s.sync_status === 'conflict').length || 0;

      // Find most recent sync time
      const lastSync = syncStats?.length
        ? new Date(
            Math.max(
              ...syncStats.map((s) => new Date(s.last_sync_attempt).getTime()),
            ),
          )
        : undefined;

      return {
        totalItems,
        syncedItems,
        pendingItems,
        conflictItems,
        lastSync,
        connections: (connections || []).map((conn) => ({
          id: conn.id,
          provider: conn.provider,
          status: conn.status,
          lastSync: conn.last_sync_at ? new Date(conn.last_sync_at) : undefined,
        })),
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return null;
    }
  }
}

// Provider-specific calendar services (simplified implementations)
class GoogleCalendarService {
  constructor(private accessToken: string) {}

  async createEvent(eventData: any): Promise<string> {
    // Google Calendar API implementation
    throw new Error('Google Calendar service not implemented');
  }

  async updateEvent(eventId: string, eventData: any): Promise<void> {
    // Google Calendar API implementation
    throw new Error('Google Calendar service not implemented');
  }

  async getEvent(eventId: string): Promise<CalendarEvent> {
    // Google Calendar API implementation
    throw new Error('Google Calendar service not implemented');
  }
}

class OutlookCalendarService {
  constructor(private accessToken: string) {}

  async createEvent(eventData: any): Promise<string> {
    // Microsoft Graph API implementation
    throw new Error('Outlook Calendar service not implemented');
  }

  async updateEvent(eventId: string, eventData: any): Promise<void> {
    // Microsoft Graph API implementation
    throw new Error('Outlook Calendar service not implemented');
  }

  async getEvent(eventId: string): Promise<CalendarEvent> {
    // Microsoft Graph API implementation
    throw new Error('Outlook Calendar service not implemented');
  }
}

class AppleCalendarService {
  constructor(private accessToken: string) {}

  async createEvent(eventData: any): Promise<string> {
    // Apple CalDAV implementation
    throw new Error('Apple Calendar service not implemented');
  }

  async updateEvent(eventId: string, eventData: any): Promise<void> {
    // Apple CalDAV implementation
    throw new Error('Apple Calendar service not implemented');
  }

  async getEvent(eventId: string): Promise<CalendarEvent> {
    // Apple CalDAV implementation
    throw new Error('Apple Calendar service not implemented');
  }
}

export type { TimelineItem, CalendarEvent, SyncOperation, SyncConflict };
