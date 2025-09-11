import { createClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger';

export interface EventMapping {
  id: string;
  organizationId: string;
  outlookEventId: string;
  outlookEtag?: string;

  // WedSync entity mappings
  wedsyncEventId?: string;
  wedsyncTaskId?: string;
  wedsyncTimelineId?: string;
  wedsyncAppointmentId?: string;
  weddingId?: string;

  // Mapping metadata
  mappingType: 'event' | 'task' | 'timeline' | 'appointment' | 'mixed';
  confidence: number; // 0.0 - 1.0
  mappingReason: string;
  syncDirection: 'outlook_to_wedsync' | 'wedsync_to_outlook' | 'bidirectional';

  // Sync tracking
  lastSyncedAt?: Date;
  syncStatus: 'active' | 'paused' | 'error' | 'orphaned';
  syncConflicts: number;
  lastConflictAt?: Date;

  // Wedding context
  weddingContext?: {
    isWeddingRelated: boolean;
    weddingType?: string;
    coupleName?: string;
    weddingDate?: Date;
    venue?: string;
  };

  // Audit fields
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface MappingCriteria {
  titleSimilarity?: number;
  timeSimilarity?: number; // in minutes
  locationSimilarity?: number;
  attendeeSimilarity?: number;
  dateRange?: { start: Date; end: Date };
  weddingContext?: boolean;
}

export interface MappingCandidate {
  wedsyncId: string;
  entityType: 'event' | 'task' | 'timeline' | 'appointment';
  similarity: number;
  matchingFields: string[];
  entity: any;
}

export class EventMappingService {
  private supabase = createClient(
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

  /**
   * Create a new event mapping
   */
  async createMapping(
    outlookEvent: any,
    wedsyncEntity: any,
    entityType: string,
    organizationId: string,
    confidence: number = 0.8,
    reason: string = 'auto_detected',
  ): Promise<EventMapping> {
    try {
      const mapping: Partial<EventMapping> = {
        organizationId,
        outlookEventId: outlookEvent.id,
        outlookEtag: outlookEvent['@odata.etag'],
        mappingType: entityType as any,
        confidence,
        mappingReason: reason,
        syncDirection: 'bidirectional',
        syncStatus: 'active',
        syncConflicts: 0,
        weddingContext: await this.extractWeddingContext(outlookEvent),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Set the appropriate WedSync entity ID
      switch (entityType) {
        case 'event':
          mapping.wedsyncEventId = wedsyncEntity.id;
          break;
        case 'task':
          mapping.wedsyncTaskId = wedsyncEntity.id;
          break;
        case 'timeline':
          mapping.wedsyncTimelineId = wedsyncEntity.id;
          mapping.weddingId = wedsyncEntity.wedding_id;
          break;
        case 'appointment':
          mapping.wedsyncAppointmentId = wedsyncEntity.id;
          break;
      }

      const { data: savedMapping, error } = await this.supabase
        .from('outlook_event_mappings')
        .insert(mapping)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create mapping: ${error.message}`);
      }

      logger.info('Created event mapping', {
        outlookEventId: outlookEvent.id,
        wedsyncEntityId: wedsyncEntity.id,
        entityType,
        confidence,
        mappingId: savedMapping.id,
      });

      return savedMapping;
    } catch (error) {
      logger.error('Failed to create event mapping', {
        outlookEventId: outlookEvent.id,
        entityType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find existing mapping by Outlook event ID
   */
  async findMappingByOutlookEvent(
    organizationId: string,
    outlookEventId: string,
  ): Promise<EventMapping | null> {
    try {
      const { data: mapping, error } = await this.supabase
        .from('outlook_event_mappings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('outlook_event_id', outlookEventId)
        .eq('sync_status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        // Not found error
        throw new Error(`Failed to find mapping: ${error.message}`);
      }

      return mapping || null;
    } catch (error) {
      logger.error('Failed to find mapping by Outlook event', {
        outlookEventId,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Find existing mapping by WedSync entity ID
   */
  async findMappingByWedSyncEntity(
    organizationId: string,
    entityId: string,
    entityType: string,
  ): Promise<EventMapping | null> {
    try {
      let query = this.supabase
        .from('outlook_event_mappings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('sync_status', 'active');

      // Add entity-specific filter
      switch (entityType) {
        case 'event':
          query = query.eq('wedsync_event_id', entityId);
          break;
        case 'task':
          query = query.eq('wedsync_task_id', entityId);
          break;
        case 'timeline':
          query = query.eq('wedsync_timeline_id', entityId);
          break;
        case 'appointment':
          query = query.eq('wedsync_appointment_id', entityId);
          break;
        default:
          return null;
      }

      const { data: mapping, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        // Not found error
        throw new Error(`Failed to find mapping: ${error.message}`);
      }

      return mapping || null;
    } catch (error) {
      logger.error('Failed to find mapping by WedSync entity', {
        entityId,
        entityType,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Find potential WedSync entities for mapping to an Outlook event
   */
  async findMappingCandidates(
    outlookEvent: any,
    organizationId: string,
    criteria: MappingCriteria = {},
  ): Promise<MappingCandidate[]> {
    try {
      const candidates: MappingCandidate[] = [];

      // Default criteria
      const defaultCriteria: MappingCriteria = {
        titleSimilarity: 0.6,
        timeSimilarity: 60, // 1 hour
        locationSimilarity: 0.7,
        attendeeSimilarity: 0.5,
        dateRange: {
          start: new Date(
            new Date(outlookEvent.start.dateTime).getTime() -
              7 * 24 * 60 * 60 * 1000,
          ), // 1 week before
          end: new Date(
            new Date(outlookEvent.end.dateTime).getTime() +
              7 * 24 * 60 * 60 * 1000,
          ), // 1 week after
        },
        weddingContext: undefined,
        ...criteria,
      };

      // Search for matching appointments
      const appointmentCandidates = await this.findAppointmentCandidates(
        outlookEvent,
        organizationId,
        defaultCriteria,
      );
      candidates.push(...appointmentCandidates);

      // Search for matching tasks
      const taskCandidates = await this.findTaskCandidates(
        outlookEvent,
        organizationId,
        defaultCriteria,
      );
      candidates.push(...taskCandidates);

      // Search for matching timeline events
      const timelineCandidates = await this.findTimelineCandidates(
        outlookEvent,
        organizationId,
        defaultCriteria,
      );
      candidates.push(...timelineCandidates);

      // Search for matching calendar events
      const eventCandidates = await this.findEventCandidates(
        outlookEvent,
        organizationId,
        defaultCriteria,
      );
      candidates.push(...eventCandidates);

      // Sort by similarity score
      candidates.sort((a, b) => b.similarity - a.similarity);

      logger.info('Found mapping candidates', {
        outlookEventId: outlookEvent.id,
        candidatesFound: candidates.length,
        topSimilarity: candidates[0]?.similarity || 0,
      });

      return candidates;
    } catch (error) {
      logger.error('Failed to find mapping candidates', {
        outlookEventId: outlookEvent.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Auto-map Outlook event to best matching WedSync entity
   */
  async autoMapEvent(
    outlookEvent: any,
    organizationId: string,
    minimumConfidence: number = 0.8,
  ): Promise<EventMapping | null> {
    try {
      // Check if mapping already exists
      const existingMapping = await this.findMappingByOutlookEvent(
        organizationId,
        outlookEvent.id,
      );

      if (existingMapping) {
        logger.info('Mapping already exists', {
          outlookEventId: outlookEvent.id,
          mappingId: existingMapping.id,
        });
        return existingMapping;
      }

      // Find candidates
      const candidates = await this.findMappingCandidates(
        outlookEvent,
        organizationId,
      );

      if (candidates.length === 0) {
        logger.info('No mapping candidates found', {
          outlookEventId: outlookEvent.id,
        });
        return null;
      }

      // Get the best candidate
      const bestCandidate = candidates[0];

      if (bestCandidate.similarity < minimumConfidence) {
        logger.info('Best candidate below confidence threshold', {
          outlookEventId: outlookEvent.id,
          similarity: bestCandidate.similarity,
          threshold: minimumConfidence,
        });
        return null;
      }

      // Create mapping
      const mapping = await this.createMapping(
        outlookEvent,
        bestCandidate.entity,
        bestCandidate.entityType,
        organizationId,
        bestCandidate.similarity,
        `auto_mapped_${bestCandidate.matchingFields.join('_')}`,
      );

      logger.info('Auto-mapped Outlook event', {
        outlookEventId: outlookEvent.id,
        wedsyncEntityId: bestCandidate.wedsyncId,
        entityType: bestCandidate.entityType,
        similarity: bestCandidate.similarity,
        mappingId: mapping.id,
      });

      return mapping;
    } catch (error) {
      logger.error('Failed to auto-map event', {
        outlookEventId: outlookEvent.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Update mapping sync status
   */
  async updateMappingSyncState(
    mappingId: string,
    syncState: {
      lastSyncedAt?: Date;
      syncStatus?: 'active' | 'paused' | 'error' | 'orphaned';
      syncConflicts?: number;
      lastConflictAt?: Date;
      outlookEtag?: string;
    },
  ): Promise<void> {
    try {
      const updates: any = {
        updated_at: new Date().toISOString(),
        ...syncState,
      };

      if (syncState.lastSyncedAt) {
        updates.last_synced_at = syncState.lastSyncedAt.toISOString();
      }

      if (syncState.lastConflictAt) {
        updates.last_conflict_at = syncState.lastConflictAt.toISOString();
      }

      const { error } = await this.supabase
        .from('outlook_event_mappings')
        .update(updates)
        .eq('id', mappingId);

      if (error) {
        throw new Error(
          `Failed to update mapping sync state: ${error.message}`,
        );
      }

      logger.debug('Updated mapping sync state', {
        mappingId,
        syncState,
      });
    } catch (error) {
      logger.error('Failed to update mapping sync state', {
        mappingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find orphaned mappings (Outlook event deleted)
   */
  async findOrphanedMappings(organizationId: string): Promise<EventMapping[]> {
    try {
      const { data: mappings, error } = await this.supabase
        .from('outlook_event_mappings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('sync_status', 'active')
        .lt(
          'last_synced_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        ); // Not synced in 24 hours

      if (error) {
        throw new Error(`Failed to find orphaned mappings: ${error.message}`);
      }

      return mappings || [];
    } catch (error) {
      logger.error('Failed to find orphaned mappings', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Mark mapping as orphaned
   */
  async markMappingOrphaned(mappingId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('outlook_event_mappings')
        .update({
          sync_status: 'orphaned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', mappingId);

      if (error) {
        throw new Error(`Failed to mark mapping as orphaned: ${error.message}`);
      }

      logger.info('Marked mapping as orphaned', { mappingId });
    } catch (error) {
      logger.error('Failed to mark mapping as orphaned', {
        mappingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find appointment candidates for mapping
   */
  private async findAppointmentCandidates(
    outlookEvent: any,
    organizationId: string,
    criteria: MappingCriteria,
  ): Promise<MappingCandidate[]> {
    try {
      const { data: appointments, error } = await this.supabase
        .from('appointments')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('start_time', criteria.dateRange!.start.toISOString())
        .lte('start_time', criteria.dateRange!.end.toISOString());

      if (error) {
        throw new Error(`Failed to fetch appointments: ${error.message}`);
      }

      if (!appointments) return [];

      const candidates: MappingCandidate[] = [];

      for (const appointment of appointments) {
        const similarity = this.calculateEntitySimilarity(
          outlookEvent,
          appointment,
          'appointment',
        );

        if (similarity >= (criteria.titleSimilarity || 0.6)) {
          candidates.push({
            wedsyncId: appointment.id,
            entityType: 'appointment',
            similarity,
            matchingFields: this.getMatchingFields(
              outlookEvent,
              appointment,
              'appointment',
            ),
            entity: appointment,
          });
        }
      }

      return candidates;
    } catch (error) {
      logger.error('Failed to find appointment candidates', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Find task candidates for mapping
   */
  private async findTaskCandidates(
    outlookEvent: any,
    organizationId: string,
    criteria: MappingCriteria,
  ): Promise<MappingCandidate[]> {
    try {
      const { data: tasks, error } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('due_date', criteria.dateRange!.start.toISOString())
        .lte('due_date', criteria.dateRange!.end.toISOString());

      if (error) {
        throw new Error(`Failed to fetch tasks: ${error.message}`);
      }

      if (!tasks) return [];

      const candidates: MappingCandidate[] = [];

      for (const task of tasks) {
        const similarity = this.calculateEntitySimilarity(
          outlookEvent,
          task,
          'task',
        );

        if (similarity >= (criteria.titleSimilarity || 0.6)) {
          candidates.push({
            wedsyncId: task.id,
            entityType: 'task',
            similarity,
            matchingFields: this.getMatchingFields(outlookEvent, task, 'task'),
            entity: task,
          });
        }
      }

      return candidates;
    } catch (error) {
      logger.error('Failed to find task candidates', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Find wedding timeline candidates for mapping
   */
  private async findTimelineCandidates(
    outlookEvent: any,
    organizationId: string,
    criteria: MappingCriteria,
  ): Promise<MappingCandidate[]> {
    try {
      const { data: timelineEvents, error } = await this.supabase
        .from('wedding_timeline')
        .select(
          `
          *,
          weddings!inner(organization_id)
        `,
        )
        .eq('weddings.organization_id', organizationId)
        .gte('start_time', criteria.dateRange!.start.toISOString())
        .lte('start_time', criteria.dateRange!.end.toISOString());

      if (error) {
        throw new Error(`Failed to fetch timeline events: ${error.message}`);
      }

      if (!timelineEvents) return [];

      const candidates: MappingCandidate[] = [];

      for (const timelineEvent of timelineEvents) {
        const similarity = this.calculateEntitySimilarity(
          outlookEvent,
          timelineEvent,
          'timeline',
        );

        if (similarity >= (criteria.titleSimilarity || 0.6)) {
          candidates.push({
            wedsyncId: timelineEvent.id,
            entityType: 'timeline',
            similarity,
            matchingFields: this.getMatchingFields(
              outlookEvent,
              timelineEvent,
              'timeline',
            ),
            entity: timelineEvent,
          });
        }
      }

      return candidates;
    } catch (error) {
      logger.error('Failed to find timeline candidates', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Find calendar event candidates for mapping
   */
  private async findEventCandidates(
    outlookEvent: any,
    organizationId: string,
    criteria: MappingCriteria,
  ): Promise<MappingCandidate[]> {
    try {
      const { data: events, error } = await this.supabase
        .from('calendar_events')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('start_time', criteria.dateRange!.start.toISOString())
        .lte('start_time', criteria.dateRange!.end.toISOString());

      if (error) {
        throw new Error(`Failed to fetch calendar events: ${error.message}`);
      }

      if (!events) return [];

      const candidates: MappingCandidate[] = [];

      for (const event of events) {
        const similarity = this.calculateEntitySimilarity(
          outlookEvent,
          event,
          'event',
        );

        if (similarity >= (criteria.titleSimilarity || 0.6)) {
          candidates.push({
            wedsyncId: event.id,
            entityType: 'event',
            similarity,
            matchingFields: this.getMatchingFields(
              outlookEvent,
              event,
              'event',
            ),
            entity: event,
          });
        }
      }

      return candidates;
    } catch (error) {
      logger.error('Failed to find event candidates', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Calculate similarity between Outlook event and WedSync entity
   */
  private calculateEntitySimilarity(
    outlookEvent: any,
    wedsyncEntity: any,
    entityType: string,
  ): number {
    let similarity = 0;
    let factors = 0;

    // Title/subject similarity
    const outlookTitle = outlookEvent.subject?.toLowerCase() || '';
    const wedsyncTitle = (
      wedsyncEntity.title ||
      wedsyncEntity.name ||
      ''
    ).toLowerCase();

    if (outlookTitle && wedsyncTitle) {
      const titleSimilarity = this.stringSimilarity(outlookTitle, wedsyncTitle);
      similarity += titleSimilarity * 0.4; // 40% weight
      factors += 0.4;
    }

    // Time similarity (for time-based entities)
    if (entityType !== 'task') {
      const outlookStart = new Date(outlookEvent.start.dateTime);
      const wedsyncStart = new Date(wedsyncEntity.start_time);

      const timeDiffMinutes =
        Math.abs(outlookStart.getTime() - wedsyncStart.getTime()) / (1000 * 60);
      const timeSimilarity = Math.max(0, 1 - timeDiffMinutes / (24 * 60)); // Similarity decreases over 24 hours

      similarity += timeSimilarity * 0.3; // 30% weight
      factors += 0.3;
    }

    // Location similarity
    const outlookLocation =
      outlookEvent.location?.displayName?.toLowerCase() || '';
    const wedsyncLocation = wedsyncEntity.location?.toLowerCase() || '';

    if (outlookLocation && wedsyncLocation) {
      const locationSimilarity = this.stringSimilarity(
        outlookLocation,
        wedsyncLocation,
      );
      similarity += locationSimilarity * 0.2; // 20% weight
      factors += 0.2;
    }

    // Wedding context similarity
    const isOutlookWedding = this.isWeddingEvent(outlookEvent);
    const isWedsyncWedding = this.isWeddingEntity(wedsyncEntity, entityType);

    if (isOutlookWedding === isWedsyncWedding) {
      similarity += 0.1; // 10% weight
    }
    factors += 0.1;

    // Normalize by total factors considered
    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Get matching fields between Outlook event and WedSync entity
   */
  private getMatchingFields(
    outlookEvent: any,
    wedsyncEntity: any,
    entityType: string,
  ): string[] {
    const matchingFields: string[] = [];

    // Title/subject match
    const outlookTitle = outlookEvent.subject?.toLowerCase() || '';
    const wedsyncTitle = (
      wedsyncEntity.title ||
      wedsyncEntity.name ||
      ''
    ).toLowerCase();

    if (
      outlookTitle &&
      wedsyncTitle &&
      this.stringSimilarity(outlookTitle, wedsyncTitle) > 0.7
    ) {
      matchingFields.push('title');
    }

    // Time match (for time-based entities)
    if (entityType !== 'task') {
      const outlookStart = new Date(outlookEvent.start.dateTime);
      const wedsyncStart = new Date(wedsyncEntity.start_time);
      const timeDiffMinutes =
        Math.abs(outlookStart.getTime() - wedsyncStart.getTime()) / (1000 * 60);

      if (timeDiffMinutes <= 15) {
        // Within 15 minutes
        matchingFields.push('time');
      }
    }

    // Location match
    const outlookLocation =
      outlookEvent.location?.displayName?.toLowerCase() || '';
    const wedsyncLocation = wedsyncEntity.location?.toLowerCase() || '';

    if (
      outlookLocation &&
      wedsyncLocation &&
      this.stringSimilarity(outlookLocation, wedsyncLocation) > 0.7
    ) {
      matchingFields.push('location');
    }

    return matchingFields;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private stringSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Check if Outlook event is wedding-related
   */
  private isWeddingEvent(outlookEvent: any): boolean {
    const title = outlookEvent.subject?.toLowerCase() || '';
    const weddingKeywords = [
      'wedding',
      'ceremony',
      'reception',
      'bridal',
      'bride',
      'groom',
      'rehearsal',
      'engagement',
      'marriage',
      'nuptials',
    ];

    return weddingKeywords.some((keyword) => title.includes(keyword));
  }

  /**
   * Check if WedSync entity is wedding-related
   */
  private isWeddingEntity(wedsyncEntity: any, entityType: string): boolean {
    if (entityType === 'timeline') {
      return true; // Wedding timeline events are always wedding-related
    }

    const title = (
      wedsyncEntity.title ||
      wedsyncEntity.name ||
      ''
    ).toLowerCase();
    const weddingKeywords = [
      'wedding',
      'ceremony',
      'reception',
      'bridal',
      'bride',
      'groom',
      'rehearsal',
      'engagement',
      'marriage',
      'nuptials',
    ];

    return weddingKeywords.some((keyword) => title.includes(keyword));
  }

  /**
   * Extract wedding context from Outlook event
   */
  private async extractWeddingContext(outlookEvent: any): Promise<any> {
    const isWeddingRelated = this.isWeddingEvent(outlookEvent);

    if (!isWeddingRelated) {
      return { isWeddingRelated: false };
    }

    const subject = outlookEvent.subject?.toLowerCase() || '';
    let weddingType = 'other';

    if (subject.includes('ceremony')) weddingType = 'ceremony';
    else if (subject.includes('reception')) weddingType = 'reception';
    else if (subject.includes('rehearsal')) weddingType = 'rehearsal';
    else if (subject.includes('engagement')) weddingType = 'engagement';

    // Try to extract couple name
    const couplePattern = /(\w+)\s*(&|and|\+)\s*(\w+)/i;
    const coupleMatch = outlookEvent.subject?.match(couplePattern);
    const coupleName = coupleMatch
      ? `${coupleMatch[1]} & ${coupleMatch[3]}`
      : undefined;

    // Extract venue from location
    const venue = outlookEvent.location?.displayName;

    // Try to determine wedding date (if this is a planning event)
    let weddingDate;
    if (weddingType === 'ceremony' || weddingType === 'reception') {
      weddingDate = new Date(outlookEvent.start.dateTime);
    }

    return {
      isWeddingRelated: true,
      weddingType,
      coupleName,
      weddingDate,
      venue,
    };
  }
}
