import { createClient } from '@supabase/supabase-js';
import { logger } from '../../monitoring/logger';

export interface SyncConflict {
  id?: string;
  mappingId: string;
  conflictType:
    | 'datetime'
    | 'location'
    | 'content'
    | 'attendees'
    | 'deletion'
    | 'recurring';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  outlookData: any;
  wedsyncData: any;
  lastSyncedAt: Date;
  detectedAt: Date;
  conflictFields: string[];
  autoResolution?: 'outlook_wins' | 'wedsync_wins' | 'merge' | 'manual_review';
  weddingContext?: {
    isWeddingEvent: boolean;
    weddingType?: string;
    weddingDate?: string;
    isBusinessCritical: boolean;
  };
}

export interface ConflictResolutionRule {
  id: string;
  organizationId: string;
  conflictType: string;
  conditions: {
    severity?: string[];
    weddingEvent?: boolean;
    timeRange?: { start: string; end: string };
    fieldPatterns?: string[];
  };
  action: 'outlook_wins' | 'wedsync_wins' | 'merge' | 'manual_review';
  priority: number;
  isActive: boolean;
}

export interface ResolutionResult {
  success: boolean;
  action: string;
  resolvedData?: any;
  requiresManualReview: boolean;
  conflictId?: string;
  error?: string;
}

export class SyncConflictResolver {
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
   * Detect conflicts between Outlook and WedSync event data
   */
  async detectConflicts(
    outlookEvent: any,
    wedsyncEvent: any,
    mappingInfo: any,
  ): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    try {
      // DateTime conflict detection
      const dateTimeConflict = this.detectDateTimeConflict(
        outlookEvent,
        wedsyncEvent,
      );
      if (dateTimeConflict) {
        conflicts.push(dateTimeConflict);
      }

      // Location conflict detection
      const locationConflict = this.detectLocationConflict(
        outlookEvent,
        wedsyncEvent,
      );
      if (locationConflict) {
        conflicts.push(locationConflict);
      }

      // Content conflict detection
      const contentConflict = this.detectContentConflict(
        outlookEvent,
        wedsyncEvent,
      );
      if (contentConflict) {
        conflicts.push(contentConflict);
      }

      // Attendees conflict detection
      const attendeesConflict = this.detectAttendeesConflict(
        outlookEvent,
        wedsyncEvent,
      );
      if (attendeesConflict) {
        conflicts.push(attendeesConflict);
      }

      // Recurring event conflicts
      const recurringConflict = this.detectRecurringConflict(
        outlookEvent,
        wedsyncEvent,
      );
      if (recurringConflict) {
        conflicts.push(recurringConflict);
      }

      // Add wedding context to conflicts
      for (const conflict of conflicts) {
        conflict.weddingContext = await this.determineWeddingContext(
          outlookEvent,
          wedsyncEvent,
        );
        conflict.mappingId = mappingInfo.id;
        conflict.detectedAt = new Date();
        conflict.lastSyncedAt = new Date(mappingInfo.lastSyncedAt);
      }

      logger.info('Conflict detection completed', {
        outlookEventId: outlookEvent.id,
        wedsyncEventId: wedsyncEvent?.id,
        conflictsFound: conflicts.length,
      });

      return conflicts;
    } catch (error) {
      logger.error('Failed to detect conflicts', {
        outlookEventId: outlookEvent.id,
        wedsyncEventId: wedsyncEvent?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Resolve conflicts using automatic rules or manual review
   */
  async resolveConflicts(
    conflicts: SyncConflict[],
    organizationId: string,
  ): Promise<ResolutionResult[]> {
    const results: ResolutionResult[] = [];

    for (const conflict of conflicts) {
      try {
        // Get applicable resolution rules
        const rules = await this.getResolutionRules(organizationId, conflict);

        if (rules.length === 0) {
          // No rules found, queue for manual review
          const result = await this.queueForManualReview(
            conflict,
            organizationId,
          );
          results.push(result);
          continue;
        }

        // Apply the highest priority rule
        const applicableRule = rules.sort((a, b) => b.priority - a.priority)[0];
        const result = await this.applyResolutionRule(conflict, applicableRule);
        results.push(result);
      } catch (error) {
        logger.error('Failed to resolve conflict', {
          conflictType: conflict.conflictType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        results.push({
          success: false,
          action: 'error',
          requiresManualReview: true,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Apply automatic resolution rule
   */
  private async applyResolutionRule(
    conflict: SyncConflict,
    rule: ConflictResolutionRule,
  ): Promise<ResolutionResult> {
    try {
      logger.info('Applying resolution rule', {
        conflictType: conflict.conflictType,
        ruleAction: rule.action,
        severity: conflict.severity,
      });

      switch (rule.action) {
        case 'outlook_wins':
          return await this.applyOutlookWins(conflict);

        case 'wedsync_wins':
          return await this.applyWedSyncWins(conflict);

        case 'merge':
          return await this.applyMergeStrategy(conflict);

        case 'manual_review':
          return await this.queueForManualReview(conflict, rule.organizationId);

        default:
          throw new Error(`Unknown resolution action: ${rule.action}`);
      }
    } catch (error) {
      logger.error('Failed to apply resolution rule', {
        conflictType: conflict.conflictType,
        ruleAction: rule.action,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        action: 'error',
        requiresManualReview: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply Outlook wins resolution
   */
  private async applyOutlookWins(
    conflict: SyncConflict,
  ): Promise<ResolutionResult> {
    try {
      const resolvedData = { ...conflict.outlookData };

      // Store the resolution
      const { data: resolution, error } = await this.supabase
        .from('sync_conflict_resolutions')
        .insert({
          mapping_id: conflict.mappingId,
          conflict_type: conflict.conflictType,
          resolution_action: 'outlook_wins',
          resolved_data: resolvedData,
          auto_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store resolution: ${error.message}`);
      }

      logger.info('Applied Outlook wins resolution', {
        conflictType: conflict.conflictType,
        resolutionId: resolution.id,
      });

      return {
        success: true,
        action: 'outlook_wins',
        resolvedData,
        requiresManualReview: false,
        conflictId: resolution.id,
      };
    } catch (error) {
      logger.error('Failed to apply Outlook wins resolution', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        action: 'outlook_wins',
        requiresManualReview: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply WedSync wins resolution
   */
  private async applyWedSyncWins(
    conflict: SyncConflict,
  ): Promise<ResolutionResult> {
    try {
      const resolvedData = { ...conflict.wedsyncData };

      // Store the resolution
      const { data: resolution, error } = await this.supabase
        .from('sync_conflict_resolutions')
        .insert({
          mapping_id: conflict.mappingId,
          conflict_type: conflict.conflictType,
          resolution_action: 'wedsync_wins',
          resolved_data: resolvedData,
          auto_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store resolution: ${error.message}`);
      }

      logger.info('Applied WedSync wins resolution', {
        conflictType: conflict.conflictType,
        resolutionId: resolution.id,
      });

      return {
        success: true,
        action: 'wedsync_wins',
        resolvedData,
        requiresManualReview: false,
        conflictId: resolution.id,
      };
    } catch (error) {
      logger.error('Failed to apply WedSync wins resolution', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        action: 'wedsync_wins',
        requiresManualReview: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply intelligent merge strategy
   */
  private async applyMergeStrategy(
    conflict: SyncConflict,
  ): Promise<ResolutionResult> {
    try {
      let resolvedData: any = {};

      switch (conflict.conflictType) {
        case 'datetime':
          resolvedData = this.mergeDateTimeConflict(conflict);
          break;

        case 'location':
          resolvedData = this.mergeLocationConflict(conflict);
          break;

        case 'content':
          resolvedData = this.mergeContentConflict(conflict);
          break;

        case 'attendees':
          resolvedData = this.mergeAttendeesConflict(conflict);
          break;

        default:
          // For complex conflicts, require manual review
          return await this.queueForManualReview(conflict, '');
      }

      // Store the merged resolution
      const { data: resolution, error } = await this.supabase
        .from('sync_conflict_resolutions')
        .insert({
          mapping_id: conflict.mappingId,
          conflict_type: conflict.conflictType,
          resolution_action: 'merge',
          resolved_data: resolvedData,
          auto_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store merged resolution: ${error.message}`);
      }

      logger.info('Applied merge resolution', {
        conflictType: conflict.conflictType,
        resolutionId: resolution.id,
      });

      return {
        success: true,
        action: 'merge',
        resolvedData,
        requiresManualReview: false,
        conflictId: resolution.id,
      };
    } catch (error) {
      logger.error('Failed to apply merge resolution', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        action: 'merge',
        requiresManualReview: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Queue conflict for manual review
   */
  private async queueForManualReview(
    conflict: SyncConflict,
    organizationId: string,
  ): Promise<ResolutionResult> {
    try {
      const { data: review, error } = await this.supabase
        .from('sync_conflict_reviews')
        .insert({
          organization_id: organizationId,
          mapping_id: conflict.mappingId,
          conflict_type: conflict.conflictType,
          severity: conflict.severity,
          description: conflict.description,
          outlook_data: conflict.outlookData,
          wedsync_data: conflict.wedsyncData,
          conflict_fields: conflict.conflictFields,
          wedding_context: conflict.weddingContext,
          status: 'pending_review',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to queue for manual review: ${error.message}`);
      }

      // Send notification for high severity conflicts
      if (conflict.severity === 'high' || conflict.severity === 'critical') {
        await this.sendConflictNotification(
          review.id,
          organizationId,
          conflict,
        );
      }

      logger.info('Queued conflict for manual review', {
        conflictType: conflict.conflictType,
        severity: conflict.severity,
        reviewId: review.id,
      });

      return {
        success: true,
        action: 'manual_review',
        requiresManualReview: true,
        conflictId: review.id,
      };
    } catch (error) {
      logger.error('Failed to queue for manual review', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        action: 'manual_review',
        requiresManualReview: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Detect date/time conflicts
   */
  private detectDateTimeConflict(
    outlookEvent: any,
    wedsyncEvent: any,
  ): SyncConflict | null {
    if (!wedsyncEvent) return null;

    const outlookStart = new Date(outlookEvent.start.dateTime);
    const outlookEnd = new Date(outlookEvent.end.dateTime);
    const wedsyncStart = new Date(wedsyncEvent.start_time);
    const wedsyncEnd = new Date(wedsyncEvent.end_time);

    // Check if times are different (allowing 1 minute tolerance)
    const startDiff = Math.abs(outlookStart.getTime() - wedsyncStart.getTime());
    const endDiff = Math.abs(outlookEnd.getTime() - wedsyncEnd.getTime());
    const tolerance = 60 * 1000; // 1 minute

    if (startDiff > tolerance || endDiff > tolerance) {
      // Determine severity based on time difference
      const maxDiff = Math.max(startDiff, endDiff);
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (maxDiff > 24 * 60 * 60 * 1000) {
        // > 1 day
        severity = 'critical';
      } else if (maxDiff > 4 * 60 * 60 * 1000) {
        // > 4 hours
        severity = 'high';
      } else if (maxDiff > 60 * 60 * 1000) {
        // > 1 hour
        severity = 'medium';
      }

      return {
        mappingId: '',
        conflictType: 'datetime',
        severity,
        description: `Event times differ between Outlook and WedSync`,
        outlookData: {
          start: outlookEvent.start.dateTime,
          end: outlookEvent.end.dateTime,
        },
        wedsyncData: {
          start: wedsyncEvent.start_time,
          end: wedsyncEvent.end_time,
        },
        detectedAt: new Date(),
        lastSyncedAt: new Date(),
        conflictFields: ['start_time', 'end_time'],
      };
    }

    return null;
  }

  /**
   * Detect location conflicts
   */
  private detectLocationConflict(
    outlookEvent: any,
    wedsyncEvent: any,
  ): SyncConflict | null {
    if (!wedsyncEvent || !outlookEvent.location || !wedsyncEvent.location)
      return null;

    const outlookLocation =
      outlookEvent.location.displayName?.toLowerCase() || '';
    const wedsyncLocation = wedsyncEvent.location?.toLowerCase() || '';

    if (outlookLocation !== wedsyncLocation) {
      return {
        mappingId: '',
        conflictType: 'location',
        severity: 'medium',
        description: 'Event locations differ between systems',
        outlookData: { location: outlookEvent.location },
        wedsyncData: { location: wedsyncEvent.location },
        detectedAt: new Date(),
        lastSyncedAt: new Date(),
        conflictFields: ['location'],
      };
    }

    return null;
  }

  /**
   * Detect content conflicts
   */
  private detectContentConflict(
    outlookEvent: any,
    wedsyncEvent: any,
  ): SyncConflict | null {
    if (!wedsyncEvent) return null;

    const outlookSubject = outlookEvent.subject?.toLowerCase() || '';
    const wedsyncTitle = wedsyncEvent.title?.toLowerCase() || '';

    if (outlookSubject !== wedsyncTitle) {
      return {
        mappingId: '',
        conflictType: 'content',
        severity: 'low',
        description: 'Event titles/subjects differ between systems',
        outlookData: { subject: outlookEvent.subject },
        wedsyncData: { title: wedsyncEvent.title },
        detectedAt: new Date(),
        lastSyncedAt: new Date(),
        conflictFields: ['subject', 'title'],
      };
    }

    return null;
  }

  /**
   * Detect attendees conflicts
   */
  private detectAttendeesConflict(
    outlookEvent: any,
    wedsyncEvent: any,
  ): SyncConflict | null {
    if (!wedsyncEvent || !outlookEvent.attendees || !wedsyncEvent.attendees)
      return null;

    const outlookEmails = new Set(
      outlookEvent.attendees.map((a: any) =>
        a.emailAddress.address.toLowerCase(),
      ),
    );
    const wedsyncEmails = new Set(
      wedsyncEvent.attendees.map((email: string) => email.toLowerCase()),
    );

    // Check for differences
    const outlookOnly = [...outlookEmails].filter(
      (email) => !wedsyncEmails.has(email),
    );
    const wedsyncOnly = [...wedsyncEmails].filter(
      (email) => !outlookEmails.has(email),
    );

    if (outlookOnly.length > 0 || wedsyncOnly.length > 0) {
      return {
        mappingId: '',
        conflictType: 'attendees',
        severity: 'medium',
        description: 'Attendee lists differ between systems',
        outlookData: { attendees: [...outlookEmails] },
        wedsyncData: { attendees: [...wedsyncEmails] },
        detectedAt: new Date(),
        lastSyncedAt: new Date(),
        conflictFields: ['attendees'],
      };
    }

    return null;
  }

  /**
   * Detect recurring event conflicts
   */
  private detectRecurringConflict(
    outlookEvent: any,
    wedsyncEvent: any,
  ): SyncConflict | null {
    if (!wedsyncEvent) return null;

    const outlookRecurring = !!outlookEvent.recurrence;
    const wedsyncRecurring = !!wedsyncEvent.is_recurring;

    if (outlookRecurring !== wedsyncRecurring) {
      return {
        mappingId: '',
        conflictType: 'recurring',
        severity: 'high',
        description: 'Recurring pattern differs between systems',
        outlookData: { recurrence: outlookEvent.recurrence },
        wedsyncData: { isRecurring: wedsyncEvent.is_recurring },
        detectedAt: new Date(),
        lastSyncedAt: new Date(),
        conflictFields: ['recurrence', 'is_recurring'],
      };
    }

    return null;
  }

  /**
   * Determine wedding context for conflict resolution
   */
  private async determineWeddingContext(
    outlookEvent: any,
    wedsyncEvent: any,
  ): Promise<any> {
    const subject = outlookEvent.subject?.toLowerCase() || '';

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
      'vows',
    ];

    const isWeddingEvent = weddingKeywords.some((keyword) =>
      subject.includes(keyword),
    );

    let weddingType = 'other';
    if (subject.includes('ceremony')) weddingType = 'ceremony';
    else if (subject.includes('reception')) weddingType = 'reception';
    else if (subject.includes('rehearsal')) weddingType = 'rehearsal';

    return {
      isWeddingEvent,
      weddingType: isWeddingEvent ? weddingType : undefined,
      isBusinessCritical:
        isWeddingEvent &&
        (weddingType === 'ceremony' || weddingType === 'reception'),
    };
  }

  /**
   * Get applicable resolution rules for organization and conflict
   */
  private async getResolutionRules(
    organizationId: string,
    conflict: SyncConflict,
  ): Promise<ConflictResolutionRule[]> {
    try {
      const { data: rules, error } = await this.supabase
        .from('sync_conflict_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('conflict_type', conflict.conflictType)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch resolution rules: ${error.message}`);
      }

      // Filter rules based on conditions
      return (rules || []).filter((rule) => this.doesRuleApply(rule, conflict));
    } catch (error) {
      logger.error('Failed to get resolution rules', {
        organizationId,
        conflictType: conflict.conflictType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Check if resolution rule applies to conflict
   */
  private doesRuleApply(
    rule: ConflictResolutionRule,
    conflict: SyncConflict,
  ): boolean {
    const conditions = rule.conditions;

    // Check severity condition
    if (
      conditions.severity &&
      !conditions.severity.includes(conflict.severity)
    ) {
      return false;
    }

    // Check wedding event condition
    if (conditions.weddingEvent !== undefined) {
      const isWeddingEvent = conflict.weddingContext?.isWeddingEvent || false;
      if (conditions.weddingEvent !== isWeddingEvent) {
        return false;
      }
    }

    // Check field patterns
    if (conditions.fieldPatterns) {
      const hasMatchingField = conditions.fieldPatterns.some((pattern) =>
        conflict.conflictFields.some((field) => field.includes(pattern)),
      );
      if (!hasMatchingField) {
        return false;
      }
    }

    return true;
  }

  /**
   * Merge date/time conflicts intelligently
   */
  private mergeDateTimeConflict(conflict: SyncConflict): any {
    const outlook = conflict.outlookData;
    const wedsync = conflict.wedsyncData;

    // For wedding events, prefer WedSync times (photographer's schedule is authoritative)
    if (conflict.weddingContext?.isWeddingEvent) {
      return {
        start: wedsync.start,
        end: wedsync.end,
        source: 'wedsync_priority',
      };
    }

    // For other events, use most recent change (Outlook is typically more up-to-date)
    return {
      start: outlook.start,
      end: outlook.end,
      source: 'outlook_recent',
    };
  }

  /**
   * Merge location conflicts intelligently
   */
  private mergeLocationConflict(conflict: SyncConflict): any {
    const outlook = conflict.outlookData.location;
    const wedsync = conflict.wedsyncData.location;

    // Prefer more detailed location information
    if (outlook?.address && (!wedsync || !wedsync.includes(','))) {
      return outlook;
    }

    return wedsync;
  }

  /**
   * Merge content conflicts
   */
  private mergeContentConflict(conflict: SyncConflict): any {
    const outlook = conflict.outlookData.subject;
    const wedsync = conflict.wedsyncData.title;

    // For wedding events, prefer WedSync title (photographer's naming)
    if (conflict.weddingContext?.isWeddingEvent) {
      return { title: wedsync };
    }

    // Otherwise prefer Outlook subject
    return { subject: outlook };
  }

  /**
   * Merge attendees conflicts
   */
  private mergeAttendeesConflict(conflict: SyncConflict): any {
    const outlookAttendees = conflict.outlookData.attendees;
    const wedsyncAttendees = conflict.wedsyncData.attendees;

    // Merge both lists, removing duplicates
    const mergedAttendees = [
      ...new Set([...outlookAttendees, ...wedsyncAttendees]),
    ];

    return { attendees: mergedAttendees };
  }

  /**
   * Send notification for critical conflicts
   */
  private async sendConflictNotification(
    reviewId: string,
    organizationId: string,
    conflict: SyncConflict,
  ): Promise<void> {
    try {
      // In a real implementation, this would send email/SMS/in-app notifications
      logger.info('Conflict notification sent', {
        reviewId,
        organizationId,
        conflictType: conflict.conflictType,
        severity: conflict.severity,
      });

      // Store notification record
      await this.supabase.from('conflict_notifications').insert({
        review_id: reviewId,
        organization_id: organizationId,
        notification_type: 'conflict_detected',
        severity: conflict.severity,
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to send conflict notification', {
        reviewId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
