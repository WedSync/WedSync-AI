import {
  MicrosoftGraphClient,
  CalendarEvent,
  WeddingEventMapping,
} from '../integrations/microsoft-graph-client';
import { createClient } from '@supabase/supabase-js';

export interface SyncResult {
  syncId: string;
  success: boolean;
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflictsDetected: number;
  conflicts: SyncConflict[];
  syncDurationMs: number;
  errors?: string[];
}

export interface SyncConflict {
  eventId: string;
  conflictType: 'time_conflict' | 'data_mismatch' | 'deletion_conflict';
  outlookVersion: any;
  wedSyncVersion: any;
  lastModifiedOutlook: string;
  lastModifiedWedSync: string;
  suggestedResolution: 'use_outlook' | 'use_wedsync' | 'manual_review';
}

export type SyncType = 'initial' | 'incremental' | 'full';

export interface OutlookIntegration {
  id: string;
  userId: string;
  organizationId: string;
  isConnected: boolean;
  lastSyncAt?: Date;
  syncDirection: 'to_outlook' | 'from_outlook' | 'bidirectional';
  syncPreferences: {
    eventTypes: string[];
    syncConflictResolution: 'ask' | 'prefer_outlook' | 'prefer_wedsync';
    autoSyncInterval: number; // minutes
  };
}

export class OutlookSyncService {
  private graphClient: MicrosoftGraphClient;
  private supabase;

  constructor(graphClient: MicrosoftGraphClient) {
    this.graphClient = graphClient;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        (() => {
          throw new Error(
            'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
          );
        })(),
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        (() => {
          throw new Error(
            'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
          );
        })(),
    );
  }

  /**
   * Create Integration
   */
  public async createIntegration(
    userId: string,
    organizationId: string,
    preferences?: Partial<OutlookIntegration['syncPreferences']>,
  ): Promise<OutlookIntegration> {
    try {
      const { data, error } = await this.supabase
        .from('integration_connections')
        .upsert(
          {
            user_id: userId,
            organization_id: organizationId,
            integration_type: 'microsoft-outlook',
            is_connected: true,
            sync_settings: {
              eventTypes: preferences?.eventTypes || [
                'wedding',
                'consultation',
                'meeting',
              ],
              syncConflictResolution:
                preferences?.syncConflictResolution || 'ask',
              autoSyncInterval: preferences?.autoSyncInterval || 30,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,integration_type',
          },
        )
        .select()
        .single();

      if (error)
        throw new Error(`Integration creation failed: ${error.message}`);

      // Queue initial sync
      await this.queueInitialSync(data.id);

      return this.transformIntegrationResponse(data);
    } catch (error) {
      console.error('Failed to create integration:', error);
      throw error;
    }
  }

  /**
   * Bidirectional Sync Engine
   */
  public async performBidirectionalSync(
    userId: string,
    syncType: SyncType = 'incremental',
  ): Promise<SyncResult> {
    const syncOperation = await this.createSyncOperation(userId, syncType);

    try {
      console.log(`Starting ${syncType} sync for user ${userId}`);

      // Phase 1: Pull changes from Outlook
      const outlookChanges = await this.getOutlookChanges(userId, syncType);
      const outlookSyncResult = await this.applyOutlookChangesToWedSync(
        userId,
        outlookChanges,
      );

      // Phase 2: Push WedSync changes to Outlook
      const wedSyncChanges = await this.getWedSyncChanges(userId, syncType);
      const wedSyncSyncResult = await this.applyWedSyncChangesToOutlook(
        userId,
        wedSyncChanges,
      );

      // Phase 3: Detect and handle conflicts
      const conflicts = await this.detectSyncConflicts(userId);

      const finalResult: SyncResult = {
        syncId: syncOperation.id,
        success: true,
        eventsProcessed:
          outlookSyncResult.processed + wedSyncSyncResult.processed,
        eventsCreated: outlookSyncResult.created + wedSyncSyncResult.created,
        eventsUpdated: outlookSyncResult.updated + wedSyncSyncResult.updated,
        eventsDeleted: outlookSyncResult.deleted + wedSyncSyncResult.deleted,
        conflictsDetected: conflicts.length,
        conflicts,
        syncDurationMs: Date.now() - syncOperation.startTime,
      };

      await this.completeSyncOperation(syncOperation.id, finalResult);
      return finalResult;
    } catch (error) {
      await this.failSyncOperation(syncOperation.id, error);
      throw error;
    }
  }

  /**
   * Get Outlook Changes
   */
  private async getOutlookChanges(
    userId: string,
    syncType: SyncType,
  ): Promise<CalendarEvent[]> {
    const integration = await this.getIntegrationByUserId(userId);
    if (!integration) throw new Error('No integration found');

    let startTime: string;

    if (syncType === 'initial' || !integration.lastSyncAt) {
      // Initial sync - get events from 30 days ago to 1 year ahead
      startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      // Incremental sync - get events changed since last sync
      startTime = integration.lastSyncAt.toISOString();
    }

    const endTime = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString(); // 1 year ahead

    try {
      const events = await this.graphClient.getEvents(userId, 'primary', {
        startTime,
        endTime,
        top: syncType === 'initial' ? 1000 : 500,
      });

      // Filter for wedding-related events based on preferences
      const filteredEvents = this.filterEventsByPreferences(
        events,
        integration.syncPreferences,
      );

      console.log(
        `Retrieved ${filteredEvents.length} events from Outlook for ${syncType} sync`,
      );
      return filteredEvents;
    } catch (error) {
      console.error('Failed to get Outlook changes:', error);
      throw error;
    }
  }

  /**
   * Get WedSync Changes
   */
  private async getWedSyncChanges(
    userId: string,
    syncType: SyncType,
  ): Promise<any[]> {
    const integration = await this.getIntegrationByUserId(userId);
    if (!integration) throw new Error('No integration found');

    let query = this.supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .eq('requires_sync', true);

    if (syncType === 'incremental' && integration.lastSyncAt) {
      query = query.gte('updated_at', integration.lastSyncAt.toISOString());
    }

    const { data: events, error } = await query;

    if (error)
      throw new Error(`Failed to get WedSync changes: ${error.message}`);

    console.log(`Retrieved ${events?.length || 0} changed events from WedSync`);
    return events || [];
  }

  /**
   * Apply Outlook Changes to WedSync
   */
  private async applyOutlookChangesToWedSync(
    userId: string,
    outlookEvents: CalendarEvent[],
  ): Promise<{
    processed: number;
    created: number;
    updated: number;
    deleted: number;
  }> {
    let processed = 0,
      created = 0,
      updated = 0,
      deleted = 0;

    for (const event of outlookEvents) {
      try {
        // Check if event already exists in WedSync
        const { data: existingEvent } = await this.supabase
          .from('synced_calendar_events')
          .select('*')
          .eq('user_id', userId)
          .eq('external_event_id', event.id)
          .single();

        const weddingMapping = this.mapOutlookEventToWedding(event);

        if (existingEvent) {
          // Update existing event
          await this.supabase
            .from('synced_calendar_events')
            .update({
              event_data: event,
              wedding_context: weddingMapping,
              event_type: weddingMapping.eventType,
              event_date: weddingMapping.eventDate,
              is_wedding_day: weddingMapping.isWeddingDay,
              priority: weddingMapping.priority,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingEvent.id);

          updated++;
        } else {
          // Create new event
          await this.supabase.from('synced_calendar_events').insert({
            user_id: userId,
            integration_type: 'microsoft-outlook',
            external_event_id: event.id,
            event_data: event,
            wedding_context: weddingMapping,
            event_type: weddingMapping.eventType,
            event_date: weddingMapping.eventDate,
            is_wedding_day: weddingMapping.isWeddingDay,
            priority: weddingMapping.priority,
            created_at: new Date().toISOString(),
          });

          created++;
        }

        processed++;
      } catch (error) {
        console.error(`Failed to sync Outlook event ${event.id}:`, error);
      }
    }

    return { processed, created, updated, deleted };
  }

  /**
   * Apply WedSync Changes to Outlook
   */
  private async applyWedSyncChangesToOutlook(
    userId: string,
    wedSyncEvents: any[],
  ): Promise<{
    processed: number;
    created: number;
    updated: number;
    deleted: number;
  }> {
    let processed = 0,
      created = 0,
      updated = 0,
      deleted = 0;

    for (const event of wedSyncEvents) {
      try {
        const outlookEventData = this.transformWedSyncEventToOutlook(event);

        if (event.external_event_id) {
          // Update existing Outlook event
          await this.graphClient.updateEvent(
            userId,
            event.external_event_id,
            outlookEventData,
          );
          updated++;
        } else {
          // Create new Outlook event
          const createdEvent = await this.graphClient.createEvent(
            userId,
            outlookEventData,
          );

          // Store the external event ID for future syncs
          await this.supabase
            .from('calendar_events')
            .update({
              external_event_id: createdEvent.id,
              requires_sync: false,
            })
            .eq('id', event.id);

          created++;
        }

        processed++;
      } catch (error) {
        console.error(
          `Failed to sync WedSync event ${event.id} to Outlook:`,
          error,
        );
      }
    }

    return { processed, created, updated, deleted };
  }

  /**
   * Conflict Detection
   */
  private async detectSyncConflicts(userId: string): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    // Get events that might have conflicts (same time, overlapping, etc.)
    const { data: potentialConflicts } = await this.supabase
      .from('synced_calendar_events')
      .select('*')
      .eq('user_id', userId)
      .not('conflict_status', 'is', null);

    for (const conflict of potentialConflicts || []) {
      // Implement conflict detection logic here
      // This is a simplified version - in production, you'd have more sophisticated conflict detection

      if (conflict.conflict_status === 'time_overlap') {
        conflicts.push({
          eventId: conflict.external_event_id,
          conflictType: 'time_conflict',
          outlookVersion: conflict.event_data,
          wedSyncVersion: conflict.wedding_context,
          lastModifiedOutlook: conflict.event_data.lastModifiedDateTime || '',
          lastModifiedWedSync: conflict.updated_at,
          suggestedResolution: 'manual_review',
        });
      }
    }

    return conflicts;
  }

  /**
   * Event Transformation
   */
  private mapOutlookEventToWedding(
    outlookEvent: CalendarEvent,
  ): WeddingEventMapping {
    const subject = outlookEvent.subject.toLowerCase();

    let eventType: WeddingEventMapping['eventType'] = 'consultation';
    if (subject.includes('engagement')) eventType = 'engagement';
    else if (subject.includes('ceremony')) eventType = 'ceremony';
    else if (subject.includes('reception')) eventType = 'reception';
    else if (subject.includes('delivery') || subject.includes('album'))
      eventType = 'delivery';
    else if (subject.includes('follow') || subject.includes('review'))
      eventType = 'followup';

    return {
      weddingId: '', // Would be determined by client matching logic
      eventType,
      clientNames: this.extractClientNames(outlookEvent),
      vendorType: 'photographer', // Would be determined from user profile
      eventDate: outlookEvent.start.dateTime,
      priority: this.determinePriority(outlookEvent),
      isWeddingDay: eventType === 'ceremony' || eventType === 'reception',
    };
  }

  private extractClientNames(event: CalendarEvent): string[] {
    const names =
      event.attendees
        ?.map((attendee) => attendee.emailAddress.name)
        .filter((name) => name && name !== '') || [];

    // Also try to extract from subject
    const subjectNames = this.extractNamesFromSubject(event.subject);

    return [...new Set([...names, ...subjectNames])];
  }

  private extractNamesFromSubject(subject: string): string[] {
    const words = subject.split(/\s+/);
    const possibleNames = words.filter(
      (word) =>
        /^[A-Z][a-z]+$/.test(word) &&
        !['Wedding', 'Consultation', 'Meeting', 'With'].includes(word),
    );

    return possibleNames.slice(0, 2);
  }

  private determinePriority(event: CalendarEvent): 'high' | 'medium' | 'low' {
    const text =
      event.subject.toLowerCase() +
      ' ' +
      (event.body?.content?.toLowerCase() || '');

    if (this.isWeddingDay(text)) {
      return 'high';
    }

    const daysUntilEvent = Math.ceil(
      (new Date(event.start.dateTime).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysUntilEvent <= 7) return 'high';
    if (daysUntilEvent <= 30) return 'medium';
    return 'low';
  }

  private isWeddingDay(text: string): boolean {
    const weddingDayKeywords = [
      'wedding day',
      'ceremony',
      'reception',
      'wedding ceremony',
      'wedding reception',
      'getting ready',
      'first look',
      'processional',
    ];

    return weddingDayKeywords.some((keyword) => text.includes(keyword));
  }

  private transformWedSyncEventToOutlook(
    wedSyncEvent: any,
  ): Partial<CalendarEvent> {
    return {
      subject: `WedSync: ${wedSyncEvent.title}`,
      body: {
        contentType: 'html',
        content: this.generateEventDescription(wedSyncEvent),
      },
      start: {
        dateTime: wedSyncEvent.start_time,
        timeZone: wedSyncEvent.time_zone || 'UTC',
      },
      end: {
        dateTime: wedSyncEvent.end_time,
        timeZone: wedSyncEvent.time_zone || 'UTC',
      },
      location: wedSyncEvent.location
        ? {
            displayName: wedSyncEvent.location,
          }
        : undefined,
      categories: this.mapWedSyncEventTypeToOutlookCategories(
        wedSyncEvent.event_type,
      ),
      isReminderOn: wedSyncEvent.reminder_enabled || true,
      reminderMinutesBeforeStart: wedSyncEvent.reminder_minutes || 15,
    };
  }

  private generateEventDescription(wedSyncEvent: any): string {
    return `
      <h3>WedSync Event Details</h3>
      <p><strong>Type:</strong> ${wedSyncEvent.event_type || 'General'}</p>
      <p><strong>Priority:</strong> ${wedSyncEvent.priority || 'Medium'}</p>
      ${wedSyncEvent.description ? `<p><strong>Description:</strong> ${wedSyncEvent.description}</p>` : ''}
      ${wedSyncEvent.client_names?.length ? `<p><strong>Clients:</strong> ${wedSyncEvent.client_names.join(', ')}</p>` : ''}
      <p><em>This event was created in WedSync and synchronized with your Outlook calendar.</em></p>
    `;
  }

  private mapWedSyncEventTypeToOutlookCategories(eventType: string): string[] {
    const categoryMap: Record<string, string[]> = {
      consultation: ['Business', 'Client Meeting'],
      engagement: ['Photography', 'Engagement'],
      ceremony: ['Wedding', 'Ceremony'],
      reception: ['Wedding', 'Reception'],
      delivery: ['Business', 'Delivery'],
      followup: ['Business', 'Follow-up'],
    };

    return categoryMap[eventType] || ['Business'];
  }

  /**
   * Utility Methods
   */
  private filterEventsByPreferences(
    events: CalendarEvent[],
    preferences: any,
  ): CalendarEvent[] {
    if (!preferences.eventTypes?.length) return events;

    return events.filter((event) => {
      const eventText = (
        event.subject +
        ' ' +
        (event.body?.content || '')
      ).toLowerCase();
      return preferences.eventTypes.some((type: string) =>
        eventText.includes(type.toLowerCase()),
      );
    });
  }

  private async getIntegrationByUserId(
    userId: string,
  ): Promise<OutlookIntegration | null> {
    const { data, error } = await this.supabase
      .from('integration_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('integration_type', 'microsoft-outlook')
      .single();

    if (error || !data) return null;

    return this.transformIntegrationResponse(data);
  }

  private transformIntegrationResponse(data: any): OutlookIntegration {
    return {
      id: data.id,
      userId: data.user_id,
      organizationId: data.organization_id,
      isConnected: data.is_connected,
      lastSyncAt: data.last_sync_at ? new Date(data.last_sync_at) : undefined,
      syncDirection: 'bidirectional', // Default
      syncPreferences: data.sync_settings || {
        eventTypes: ['wedding', 'consultation'],
        syncConflictResolution: 'ask',
        autoSyncInterval: 30,
      },
    };
  }

  /**
   * Sync Operation Management
   */
  private async createSyncOperation(
    userId: string,
    syncType: SyncType,
  ): Promise<{ id: string; startTime: number }> {
    const { data, error } = await this.supabase
      .from('sync_operations')
      .insert({
        user_id: userId,
        integration_type: 'microsoft-outlook',
        sync_type: syncType,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error)
      throw new Error(`Failed to create sync operation: ${error.message}`);

    return {
      id: data.id,
      startTime: Date.now(),
    };
  }

  private async completeSyncOperation(
    operationId: string,
    result: SyncResult,
  ): Promise<void> {
    await this.supabase
      .from('sync_operations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_data: result,
      })
      .eq('id', operationId);
  }

  private async failSyncOperation(
    operationId: string,
    error: any,
  ): Promise<void> {
    await this.supabase
      .from('sync_operations')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message || 'Unknown error',
      })
      .eq('id', operationId);
  }

  private async queueInitialSync(integrationId: string): Promise<void> {
    // This would typically queue a background job
    console.log(`Initial sync queued for integration ${integrationId}`);
    // In production, you might use a job queue like Bull or similar
  }
}
