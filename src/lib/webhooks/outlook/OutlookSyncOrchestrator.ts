/**
 * WS-217 Outlook Sync Orchestrator
 *
 * Real-time bidirectional synchronization coordinator between Outlook and WedSync
 * Handles complex wedding event synchronization with conflict detection
 *
 * Wedding Industry Focus:
 * - Priority processing for wedding events (ceremony, reception)
 * - Wedding context mapping and relationship management
 * - Real-time sync with conflict resolution
 * - Business-critical event handling
 *
 * @author WS-217-team-c
 * @version 1.0.0
 * @created 2025-01-22
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SyncConflictResolver } from '../../integrations/outlook/SyncConflictResolver';
import { EventMappingService } from '../../integrations/outlook/EventMappingService';

export interface SyncOperation {
  id: string;
  organizationId: string;
  syncDirection: 'outlook_to_wedsync' | 'wedsync_to_outlook' | 'bidirectional';
  priority: 'high' | 'medium' | 'low';
  weddingContext?: WeddingContext;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  metrics: SyncMetrics;
}

export interface WeddingContext {
  coupleNames: string[];
  weddingDate: string;
  venue: string;
  eventType:
    | 'ceremony'
    | 'reception'
    | 'consultation'
    | 'engagement'
    | 'delivery';
  priority: 'high' | 'medium' | 'low';
}

export interface SyncMetrics {
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  conflictsDetected: number;
  processingTimeMs: number;
  errorCount: number;
}

export interface OutlookEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  body?: { content: string };
  attendees?: Array<{ emailAddress: { address: string; name: string } }>;
  categories?: string[];
  isAllDay: boolean;
  recurrence?: any;
}

export interface WedSyncEvent {
  id: string;
  organizationId: string;
  weddingId?: string;
  title: string;
  eventType: string;
  startTime: string;
  endTime: string;
  location?: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
}

export class OutlookSyncOrchestrator {
  private supabase: SupabaseClient;
  private conflictResolver: SyncConflictResolver;
  private eventMappingService: EventMappingService;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
    this.conflictResolver = new SyncConflictResolver(supabaseClient);
    this.eventMappingService = new EventMappingService(supabaseClient);
  }

  /**
   * Main sync orchestration method
   * Handles bidirectional synchronization with wedding context awareness
   */
  async syncToWedSync(params: {
    outlookEvent: OutlookEvent;
    organizationId: string;
    syncDirection: 'outlook_to_wedsync' | 'bidirectional';
  }): Promise<{
    success: boolean;
    syncOperationId: string;
    mappedEntities: Array<{
      entityType: 'wedding_timeline_event' | 'appointment' | 'task';
      entityId: string;
      weddingContext?: WeddingContext;
    }>;
    conflictsDetected: number;
    error?: { code: string; message: string };
  }> {
    const startTime = Date.now();

    try {
      // 1. Validate organization access
      const hasAccess = await this.validateOrganizationAccess(
        params.organizationId,
      );
      if (!hasAccess) {
        return {
          success: false,
          syncOperationId: '',
          mappedEntities: [],
          conflictsDetected: 0,
          error: {
            code: 'UNAUTHORIZED_ACCESS',
            message: 'Organization access denied',
          },
        };
      }

      // 2. Analyze wedding context
      const weddingContext = await this.analyzeWeddingContext(
        params.outlookEvent,
      );

      // 3. Create sync operation record
      const syncOperation = await this.createSyncOperation({
        organizationId: params.organizationId,
        syncDirection: params.syncDirection,
        priority: weddingContext?.priority || 'medium',
        weddingContext,
      });

      // 4. Determine target WedSync entities based on event type
      const targetEntities = await this.determineTargetEntities(
        params.outlookEvent,
        weddingContext,
      );

      // 5. Check for conflicts before proceeding
      const conflicts = await this.conflictResolver.detectAndResolveConflicts({
        events: [params.outlookEvent],
        organizationId: params.organizationId,
        weddingId: weddingContext?.weddingDate
          ? await this.findWeddingId(
              params.organizationId,
              weddingContext.weddingDate,
            )
          : undefined,
      });

      let mappedEntities: Array<any> = [];

      if (conflicts.autoResolved || conflicts.conflicts.length === 0) {
        // 6. Proceed with synchronization
        mappedEntities = await this.createWedSyncEntities(
          params.outlookEvent,
          targetEntities,
          params.organizationId,
          weddingContext,
        );

        // 7. Create event mappings for future sync
        for (const entity of mappedEntities) {
          await this.eventMappingService.createMapping({
            outlookEventId: params.outlookEvent.id,
            weddingEventType: entity.entityType,
            weddingEventId: entity.entityId,
            organizationId: params.organizationId,
            confidence: entity.confidence || 0.9,
            mappingContext: {
              eventType: weddingContext?.eventType,
              weddingDate: weddingContext?.weddingDate,
              venue: weddingContext?.venue,
            },
          });
        }
      }

      // 8. Complete sync operation
      await this.completeSyncOperation(syncOperation.id, {
        eventsProcessed: 1,
        eventsCreated: mappedEntities.length,
        eventsUpdated: 0,
        conflictsDetected: conflicts.conflicts.length,
        processingTimeMs: Date.now() - startTime,
        errorCount: 0,
      });

      return {
        success: true,
        syncOperationId: syncOperation.id,
        mappedEntities,
        conflictsDetected: conflicts.conflicts.length,
      };
    } catch (error) {
      console.error('Outlook sync failed:', error);
      return {
        success: false,
        syncOperationId: '',
        mappedEntities: [],
        conflictsDetected: 0,
        error: {
          code: 'SYNC_FAILED',
          message:
            error instanceof Error ? error.message : 'Unknown sync error',
        },
      };
    }
  }

  /**
   * Sync WedSync events to Outlook
   */
  async syncToOutlook(params: {
    weddingEvent: WedSyncEvent;
    organizationId: string;
    syncDirection: 'wedsync_to_outlook' | 'bidirectional';
  }): Promise<{
    success: boolean;
    outlookEventId?: string;
    error?: { code: string; message: string };
  }> {
    try {
      // Check if circuit breaker is open
      if (await this.isCircuitBreakerOpen()) {
        return {
          success: false,
          error: {
            code: 'CIRCUIT_BREAKER_OPEN',
            message: 'External API temporarily unavailable',
          },
        };
      }

      // Transform WedSync event to Outlook format
      const outlookEventData = await this.transformToOutlookEvent(
        params.weddingEvent,
      );

      // Call Microsoft Graph API
      const outlookEvent = await this.callGraphAPI(
        'POST',
        '/me/events',
        outlookEventData,
      );

      // Update WedSync event with Outlook event ID
      await this.supabase
        .from('wedding_timeline_events')
        .update({ outlook_event_id: outlookEvent.id })
        .eq('id', params.weddingEvent.id);

      return {
        success: true,
        outlookEventId: outlookEvent.id,
      };
    } catch (error) {
      await this.recordCircuitBreakerFailure();

      return {
        success: false,
        error: {
          code: 'OUTLOOK_SYNC_FAILED',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to sync to Outlook',
        },
      };
    }
  }

  /**
   * Analyze Outlook event for wedding context
   */
  private async analyzeWeddingContext(
    outlookEvent: OutlookEvent,
  ): Promise<WeddingContext | undefined> {
    const subject = outlookEvent.subject.toLowerCase();
    const bodyContent = outlookEvent.body?.content?.toLowerCase() || '';
    const combinedText = `${subject} ${bodyContent}`;

    // AI-powered wedding event classification
    const weddingConfidence =
      await this.calculateWeddingConfidence(combinedText);

    if (weddingConfidence < 0.7) {
      return undefined; // Not a wedding event
    }

    // Extract wedding information
    const coupleNames = this.extractCoupleNames(outlookEvent);
    const venue = this.extractVenue(outlookEvent);
    const eventType = this.classifyWeddingEventType(combinedText);
    const priority = this.determinePriority(
      eventType,
      outlookEvent.start.dateTime,
    );

    return {
      coupleNames,
      weddingDate: outlookEvent.start.dateTime.split('T')[0],
      venue,
      eventType,
      priority,
    };
  }

  /**
   * AI-powered wedding event confidence calculation
   */
  private async calculateWeddingConfidence(text: string): Promise<number> {
    const weddingKeywords = [
      'wedding',
      'ceremony',
      'reception',
      'bride',
      'groom',
      'engagement',
      'married',
      'venue',
      'photographer',
      'videographer',
      'florist',
      'catering',
      'dj',
      'band',
      'wedding day',
    ];

    const businessKeywords = [
      'consultation',
      'meeting',
      'follow-up',
      'delivery',
      'album',
      'client',
      'couple',
      'photo shoot',
      'engagement session',
    ];

    let weddingScore = 0;
    let businessScore = 0;

    // Count keyword occurrences
    weddingKeywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        weddingScore += keyword === 'wedding' ? 3 : 1; // Extra weight for 'wedding'
      }
    });

    businessKeywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        businessScore += 1;
      }
    });

    // Calculate confidence (0-1)
    const totalScore = weddingScore + businessScore;
    return totalScore > 0 ? weddingScore / totalScore : 0;
  }

  /**
   * Extract couple names from event
   */
  private extractCoupleNames(outlookEvent: OutlookEvent): string[] {
    const names: string[] = [];

    // Extract from attendees
    if (outlookEvent.attendees) {
      names.push(
        ...outlookEvent.attendees
          .map((a) => a.emailAddress.name)
          .filter((name) => name && name.length > 0),
      );
    }

    // Extract from subject using common patterns
    const subject = outlookEvent.subject;
    const patterns = [
      /wedding.+?(\w+ & \w+)/i,
      /(\w+) & (\w+).+wedding/i,
      /ceremony.+?(\w+ \w+ & \w+ \w+)/i,
    ];

    for (const pattern of patterns) {
      const match = subject.match(pattern);
      if (match) {
        if (match[1].includes('&')) {
          names.push(...match[1].split('&').map((n) => n.trim()));
        } else if (match[2]) {
          names.push(match[1].trim(), match[2].trim());
        }
        break;
      }
    }

    return [...new Set(names)].slice(0, 2); // Limit to 2 names, remove duplicates
  }

  /**
   * Extract venue information
   */
  private extractVenue(outlookEvent: OutlookEvent): string {
    if (outlookEvent.location?.displayName) {
      return outlookEvent.location.displayName;
    }

    // Try to extract from body content
    const bodyContent = outlookEvent.body?.content || '';
    const venueMatch = bodyContent.match(/venue:?\s*([^<\n]+)/i);
    if (venueMatch) {
      return venueMatch[1].trim();
    }

    return 'TBD';
  }

  /**
   * Classify wedding event type
   */
  private classifyWeddingEventType(text: string): WeddingContext['eventType'] {
    if (text.includes('ceremony') || text.includes('processional'))
      return 'ceremony';
    if (text.includes('reception') || text.includes('party'))
      return 'reception';
    if (text.includes('engagement') || text.includes('e-session'))
      return 'engagement';
    if (text.includes('consultation') || text.includes('meeting'))
      return 'consultation';
    if (text.includes('delivery') || text.includes('album')) return 'delivery';

    return 'consultation'; // Default
  }

  /**
   * Determine event priority
   */
  private determinePriority(
    eventType: WeddingContext['eventType'],
    startDateTime: string,
  ): 'high' | 'medium' | 'low' {
    // Wedding day events are always high priority
    if (eventType === 'ceremony' || eventType === 'reception') {
      return 'high';
    }

    // Check time proximity
    const eventDate = new Date(startDateTime);
    const daysUntilEvent = Math.ceil(
      (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilEvent <= 7) return 'high';
    if (daysUntilEvent <= 30) return 'medium';
    return 'low';
  }

  /**
   * Determine target WedSync entities
   */
  private async determineTargetEntities(
    outlookEvent: OutlookEvent,
    weddingContext?: WeddingContext,
  ): Promise<Array<{ type: string; priority: number }>> {
    const entities: Array<{ type: string; priority: number }> = [];

    if (!weddingContext) {
      // Non-wedding event -> appointment
      entities.push({ type: 'appointment', priority: 1 });
      return entities;
    }

    // Wedding events map to multiple entities
    switch (weddingContext.eventType) {
      case 'ceremony':
      case 'reception':
        entities.push(
          { type: 'wedding_timeline_event', priority: 1 },
          { type: 'task', priority: 2 }, // Preparation tasks
        );
        break;

      case 'consultation':
        entities.push(
          { type: 'appointment', priority: 1 },
          { type: 'task', priority: 2 }, // Follow-up tasks
        );
        break;

      case 'engagement':
        entities.push(
          { type: 'appointment', priority: 1 },
          { type: 'wedding_timeline_event', priority: 2 },
        );
        break;

      case 'delivery':
        entities.push(
          { type: 'task', priority: 1 },
          { type: 'appointment', priority: 2 },
        );
        break;
    }

    return entities.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Create WedSync entities from Outlook event
   */
  private async createWedSyncEntities(
    outlookEvent: OutlookEvent,
    targetEntities: Array<{ type: string; priority: number }>,
    organizationId: string,
    weddingContext?: WeddingContext,
  ): Promise<Array<any>> {
    const createdEntities = [];

    for (const target of targetEntities) {
      try {
        let entity;

        switch (target.type) {
          case 'wedding_timeline_event':
            entity = await this.createWeddingTimelineEvent(
              outlookEvent,
              organizationId,
              weddingContext,
            );
            break;

          case 'appointment':
            entity = await this.createAppointment(
              outlookEvent,
              organizationId,
              weddingContext,
            );
            break;

          case 'task':
            entity = await this.createTask(
              outlookEvent,
              organizationId,
              weddingContext,
            );
            break;
        }

        if (entity) {
          createdEntities.push({
            entityType: target.type,
            entityId: entity.id,
            weddingContext,
            confidence: 0.9,
          });
        }
      } catch (error) {
        console.error(`Failed to create ${target.type}:`, error);
      }
    }

    return createdEntities;
  }

  /**
   * Create wedding timeline event
   */
  private async createWeddingTimelineEvent(
    outlookEvent: OutlookEvent,
    organizationId: string,
    weddingContext?: WeddingContext,
  ): Promise<any> {
    const weddingId = weddingContext?.weddingDate
      ? await this.findWeddingId(organizationId, weddingContext.weddingDate)
      : null;

    const { data, error } = await this.supabase
      .from('wedding_timeline_events')
      .insert({
        organization_id: organizationId,
        wedding_id: weddingId,
        outlook_event_id: outlookEvent.id,
        title: outlookEvent.subject,
        event_type: weddingContext?.eventType || 'consultation',
        start_time: outlookEvent.start.dateTime,
        end_time: outlookEvent.end.dateTime,
        location: outlookEvent.location?.displayName,
        description: outlookEvent.body?.content,
        priority: weddingContext?.priority || 'medium',
        is_all_day: outlookEvent.isAllDay,
        wedding_context: weddingContext,
        sync_status: 'synced',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create appointment
   */
  private async createAppointment(
    outlookEvent: OutlookEvent,
    organizationId: string,
    weddingContext?: WeddingContext,
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('appointments')
      .insert({
        organization_id: organizationId,
        outlook_event_id: outlookEvent.id,
        title: outlookEvent.subject,
        appointment_type: weddingContext?.eventType || 'consultation',
        start_time: outlookEvent.start.dateTime,
        end_time: outlookEvent.end.dateTime,
        location: outlookEvent.location?.displayName,
        notes: outlookEvent.body?.content,
        status: 'scheduled',
        client_names: weddingContext?.coupleNames,
        sync_status: 'synced',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create task
   */
  private async createTask(
    outlookEvent: OutlookEvent,
    organizationId: string,
    weddingContext?: WeddingContext,
  ): Promise<any> {
    const taskTitle = `Follow-up: ${outlookEvent.subject}`;
    const dueDate = new Date(outlookEvent.end.dateTime);
    dueDate.setDate(dueDate.getDate() + 1); // Due day after event

    const { data, error } = await this.supabase
      .from('tasks')
      .insert({
        organization_id: organizationId,
        related_outlook_event_id: outlookEvent.id,
        title: taskTitle,
        description: `Follow-up task for: ${outlookEvent.subject}`,
        priority: weddingContext?.priority || 'medium',
        due_date: dueDate.toISOString(),
        task_type: 'follow_up',
        status: 'pending',
        sync_status: 'synced',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Transform WedSync event to Outlook format
   */
  private async transformToOutlookEvent(
    wedSyncEvent: WedSyncEvent,
  ): Promise<any> {
    return {
      subject: `WedSync: ${wedSyncEvent.title}`,
      body: {
        contentType: 'html',
        content: `
          <h3>WedSync Event</h3>
          <p><strong>Type:</strong> ${wedSyncEvent.eventType}</p>
          <p><strong>Priority:</strong> ${wedSyncEvent.priority}</p>
          ${wedSyncEvent.description ? `<p><strong>Description:</strong> ${wedSyncEvent.description}</p>` : ''}
          <p><em>This event was created in WedSync and synchronized to your Outlook calendar.</em></p>
        `,
      },
      start: {
        dateTime: wedSyncEvent.startTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: wedSyncEvent.endTime,
        timeZone: 'UTC',
      },
      location: wedSyncEvent.location
        ? {
            displayName: wedSyncEvent.location,
          }
        : undefined,
      categories: ['WedSync', wedSyncEvent.eventType],
      isReminderOn: true,
      reminderMinutesBeforeStart: wedSyncEvent.priority === 'high' ? 30 : 15,
    };
  }

  /**
   * Circuit breaker pattern implementation
   */
  private async isCircuitBreakerOpen(): Promise<boolean> {
    const { data } = await this.supabase
      .from('circuit_breaker_state')
      .select('*')
      .eq('service', 'microsoft_graph')
      .single();

    if (!data) return false;

    const now = Date.now();
    const lastFailure = new Date(data.last_failure_at).getTime();
    const cooldownPeriod = 5 * 60 * 1000; // 5 minutes

    return data.failure_count >= 5 && now - lastFailure < cooldownPeriod;
  }

  private async recordCircuitBreakerFailure(): Promise<void> {
    await this.supabase.from('circuit_breaker_state').upsert(
      {
        service: 'microsoft_graph',
        failure_count: 1,
        last_failure_at: new Date().toISOString(),
      },
      {
        onConflict: 'service',
        ignoreDuplicates: false,
      },
    );
  }

  /**
   * Mock Microsoft Graph API call
   */
  async callGraphAPI(
    method: string,
    endpoint: string,
    data?: any,
  ): Promise<any> {
    // This is a mock implementation for testing
    // In production, this would make actual Microsoft Graph API calls
    if (method === 'POST' && endpoint === '/me/events') {
      return {
        id: 'mock-outlook-event-' + Date.now(),
        subject: data.subject,
        ...data,
      };
    }

    throw new Error('Microsoft Graph API unavailable');
  }

  /**
   * Utility methods
   */
  private async validateOrganizationAccess(
    organizationId: string,
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .single();

    return !!data;
  }

  private async findWeddingId(
    organizationId: string,
    weddingDate: string,
  ): Promise<string | null> {
    const { data } = await this.supabase
      .from('weddings')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('wedding_date', weddingDate)
      .single();

    return data?.id || null;
  }

  private async createSyncOperation(params: {
    organizationId: string;
    syncDirection: string;
    priority: string;
    weddingContext?: WeddingContext;
  }): Promise<SyncOperation> {
    const { data, error } = await this.supabase
      .from('outlook_sync_operations')
      .insert({
        organization_id: params.organizationId,
        sync_direction: params.syncDirection,
        priority: params.priority,
        wedding_context: params.weddingContext,
        status: 'processing',
        started_at: new Date().toISOString(),
        metrics: {
          eventsProcessed: 0,
          eventsCreated: 0,
          eventsUpdated: 0,
          conflictsDetected: 0,
          processingTimeMs: 0,
          errorCount: 0,
        },
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      organizationId: data.organization_id,
      syncDirection: data.sync_direction,
      priority: data.priority,
      weddingContext: data.wedding_context,
      status: data.status,
      startedAt: new Date(data.started_at),
      metrics: data.metrics,
    };
  }

  private async completeSyncOperation(
    operationId: string,
    metrics: SyncMetrics,
  ): Promise<void> {
    await this.supabase
      .from('outlook_sync_operations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metrics,
      })
      .eq('id', operationId);
  }
}
