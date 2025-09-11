/**
 * Timeline Conflict Resolution Service - WS-160
 * Handles conflict detection and resolution for simultaneous edits
 */

import { createClient } from '@supabase/supabase-js';
import {
  TimelineEvent,
  TimelineConflict,
  ConflictType,
  ConflictSeverity,
} from '@/types/timeline';

interface ConflictResolutionStrategy {
  id: string;
  name: string;
  description: string;
  autoApplicable: boolean;
  priority: number;
  conditions: (conflict: TimelineConflict, context: ConflictContext) => boolean;
  resolve: (
    conflict: TimelineConflict,
    context: ConflictContext,
  ) => Promise<ConflictResolution>;
}

interface ConflictContext {
  events: TimelineEvent[];
  timelineSettings: {
    allowOverlap: boolean;
    bufferMinutes: number;
    workingHours: { start: string; end: string };
  };
  userPreferences: {
    autoResolve: boolean;
    preferredStrategies: string[];
  };
}

interface ConflictResolution {
  success: boolean;
  strategy: string;
  changes: Array<{
    eventId: string;
    oldValues: Partial<TimelineEvent>;
    newValues: Partial<TimelineEvent>;
  }>;
  explanation: string;
  requiresApproval: boolean;
}

interface ConflictDiff {
  field: string;
  localValue: any;
  remoteValue: any;
  conflictType: 'different' | 'concurrent_edit' | 'dependency';
}

export class TimelineConflictResolutionService {
  private supabase: any;
  private strategies: Map<string, ConflictResolutionStrategy> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    this.initializeStrategies();
  }

  /**
   * Detect conflicts in timeline events
   */
  async detectConflicts(
    timelineId: string,
    events: TimelineEvent[],
  ): Promise<TimelineConflict[]> {
    const conflicts: TimelineConflict[] = [];

    // Time overlap conflicts
    conflicts.push(...(await this.detectTimeOverlapConflicts(events)));

    // Vendor double-booking conflicts
    conflicts.push(...(await this.detectVendorConflicts(events)));

    // Location conflicts
    conflicts.push(...(await this.detectLocationConflicts(events)));

    // Dependency conflicts
    conflicts.push(...(await this.detectDependencyConflicts(events)));

    // Resource conflicts
    conflicts.push(...(await this.detectResourceConflicts(events)));

    // Save conflicts to database
    for (const conflict of conflicts) {
      await this.saveConflict(timelineId, conflict);
    }

    return conflicts;
  }

  /**
   * Resolve conflict using best strategy
   */
  async resolveConflict(
    conflictId: string,
    strategy?: string,
    userApproved: boolean = false,
  ): Promise<ConflictResolution | null> {
    try {
      // Get conflict details
      const { data: conflict } = await this.supabase
        .from('timeline_conflicts')
        .select(
          `
          *,
          event_1:timeline_events!event_id_1(*),
          event_2:timeline_events!event_id_2(*)
        `,
        )
        .eq('id', conflictId)
        .single();

      if (!conflict) return null;

      // Get timeline events for context
      const { data: events } = await this.supabase
        .from('timeline_events')
        .select('*')
        .eq('timeline_id', conflict.timeline_id);

      const context = await this.buildConflictContext(
        conflict.timeline_id,
        events || [],
      );

      // Find best strategy
      const selectedStrategy = strategy
        ? this.strategies.get(strategy)
        : this.findBestStrategy(conflict, context);

      if (!selectedStrategy) {
        throw new Error('No suitable resolution strategy found');
      }

      // Check if strategy requires approval
      if (
        selectedStrategy.autoApplicable &&
        !userApproved &&
        this.requiresApproval(conflict)
      ) {
        return {
          success: false,
          strategy: selectedStrategy.id,
          changes: [],
          explanation: `Resolution requires manual approval: ${selectedStrategy.description}`,
          requiresApproval: true,
        };
      }

      // Apply resolution
      const resolution = await selectedStrategy.resolve(conflict, context);

      if (resolution.success) {
        // Apply changes to events
        for (const change of resolution.changes) {
          await this.supabase
            .from('timeline_events')
            .update({
              ...change.newValues,
              updated_at: new Date().toISOString(),
            })
            .eq('id', change.eventId);
        }

        // Mark conflict as resolved
        await this.supabase
          .from('timeline_conflicts')
          .update({
            is_resolved: true,
            resolved_at: new Date().toISOString(),
            resolution_notes: `Auto-resolved using ${selectedStrategy.name}: ${resolution.explanation}`,
          })
          .eq('id', conflictId);

        // Log resolution
        await this.logConflictResolution(
          conflict.timeline_id,
          conflictId,
          resolution,
        );
      }

      return resolution;
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      return null;
    }
  }

  /**
   * Get available resolution strategies for conflict
   */
  getAvailableStrategies(
    conflict: TimelineConflict,
  ): ConflictResolutionStrategy[] {
    return Array.from(this.strategies.values())
      .filter((strategy) => {
        // Basic filtering based on conflict type
        switch (conflict.conflict_type) {
          case 'time_overlap':
            return ['time_shift', 'duration_reduce', 'split_event'].includes(
              strategy.id,
            );
          case 'vendor_overlap':
            return ['vendor_reassign', 'time_shift', 'split_event'].includes(
              strategy.id,
            );
          case 'location_conflict':
            return ['location_change', 'time_shift', 'virtual_option'].includes(
              strategy.id,
            );
          case 'dependency_issue':
            return [
              'dependency_reorder',
              'time_shift',
              'dependency_remove',
            ].includes(strategy.id);
          default:
            return true;
        }
      })
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Detect concurrent edits and merge changes
   */
  async detectConcurrentEdits(
    eventId: string,
    localChanges: Partial<TimelineEvent>,
    lastKnownVersion: number,
  ): Promise<{
    hasConflicts: boolean;
    conflicts: ConflictDiff[];
    mergedEvent?: TimelineEvent;
  }> {
    try {
      // Get current version from database
      const { data: currentEvent } = await this.supabase
        .from('timeline_events')
        .select('*, version')
        .eq('id', eventId)
        .single();

      if (!currentEvent) {
        return { hasConflicts: false, conflicts: [] };
      }

      // Check if there were concurrent edits
      if (currentEvent.version <= lastKnownVersion) {
        // No concurrent changes, safe to apply
        return {
          hasConflicts: false,
          conflicts: [],
          mergedEvent: currentEvent,
        };
      }

      // Get version history to understand what changed
      const { data: versions } = await this.supabase
        .from('timeline_event_versions')
        .select('*')
        .eq('event_id', eventId)
        .gt('version', lastKnownVersion)
        .order('version', { ascending: true });

      // Analyze conflicts
      const conflicts = this.analyzeVersionConflicts(
        localChanges,
        versions || [],
        currentEvent,
      );

      if (conflicts.length === 0) {
        // No conflicts, can auto-merge
        const mergedEvent = { ...currentEvent, ...localChanges };
        return { hasConflicts: false, conflicts: [], mergedEvent };
      }

      return { hasConflicts: true, conflicts };
    } catch (error) {
      console.error('Failed to detect concurrent edits:', error);
      return { hasConflicts: false, conflicts: [] };
    }
  }

  /**
   * Three-way merge for resolving concurrent edits
   */
  async performThreeWayMerge(
    eventId: string,
    localChanges: Partial<TimelineEvent>,
    remoteEvent: TimelineEvent,
    baseVersion: TimelineEvent,
  ): Promise<{
    success: boolean;
    mergedEvent?: TimelineEvent;
    conflicts?: ConflictDiff[];
  }> {
    const conflicts: ConflictDiff[] = [];
    const mergedEvent = { ...remoteEvent };

    // Compare each field
    for (const [field, localValue] of Object.entries(localChanges)) {
      const remoteValue = (remoteEvent as any)[field];
      const baseValue = (baseVersion as any)[field];

      if (localValue === remoteValue) {
        // No conflict, values are the same
        continue;
      }

      if (localValue === baseValue) {
        // Local didn't change, use remote value
        (mergedEvent as any)[field] = remoteValue;
      } else if (remoteValue === baseValue) {
        // Remote didn't change, use local value
        (mergedEvent as any)[field] = localValue;
      } else {
        // Both changed differently - conflict
        conflicts.push({
          field,
          localValue,
          remoteValue,
          conflictType: 'concurrent_edit',
        });
      }
    }

    if (conflicts.length > 0) {
      return { success: false, conflicts };
    }

    return { success: true, mergedEvent };
  }

  /**
   * Auto-resolve simple conflicts
   */
  async autoResolveConflicts(timelineId: string): Promise<{
    resolved: number;
    failed: number;
    requiresManualReview: number;
  }> {
    const stats = { resolved: 0, failed: 0, requiresManualReview: 0 };

    // Get unresolved conflicts
    const { data: conflicts } = await this.supabase
      .from('timeline_conflicts')
      .select('*')
      .eq('timeline_id', timelineId)
      .eq('is_resolved', false)
      .eq('can_auto_resolve', true);

    if (!conflicts?.length) return stats;

    for (const conflict of conflicts) {
      try {
        const resolution = await this.resolveConflict(conflict.id);

        if (resolution?.success) {
          stats.resolved++;
        } else if (resolution?.requiresApproval) {
          stats.requiresManualReview++;
        } else {
          stats.failed++;
        }
      } catch (error) {
        stats.failed++;
      }
    }

    return stats;
  }

  /**
   * Initialize conflict resolution strategies
   */
  private initializeStrategies(): void {
    const strategies: ConflictResolutionStrategy[] = [
      {
        id: 'time_shift',
        name: 'Time Shift',
        description: 'Move one event to avoid overlap',
        autoApplicable: true,
        priority: 80,
        conditions: (conflict) => conflict.conflict_type === 'time_overlap',
        resolve: async (conflict, context) => {
          const event1 = context.events.find(
            (e) => e.id === conflict.event_id_1,
          );
          const event2 = context.events.find(
            (e) => e.id === conflict.event_id_2,
          );

          if (!event1 || !event2) {
            return {
              success: false,
              strategy: 'time_shift',
              changes: [],
              explanation: 'Events not found',
              requiresApproval: false,
            };
          }

          // Move the event with lower priority
          const eventToMove = event1.priority === 'high' ? event2 : event1;
          const duration =
            new Date(eventToMove.end_time).getTime() -
            new Date(eventToMove.start_time).getTime();

          // Find next available slot
          const newStartTime = new Date(
            new Date(event2.end_time).getTime() +
              context.timelineSettings.bufferMinutes * 60000,
          );
          const newEndTime = new Date(newStartTime.getTime() + duration);

          return {
            success: true,
            strategy: 'time_shift',
            changes: [
              {
                eventId: eventToMove.id,
                oldValues: {
                  start_time: eventToMove.start_time,
                  end_time: eventToMove.end_time,
                },
                newValues: {
                  start_time: newStartTime.toISOString(),
                  end_time: newEndTime.toISOString(),
                },
              },
            ],
            explanation: `Moved "${eventToMove.title}" to ${newStartTime.toLocaleString()}`,
            requiresApproval: false,
          };
        },
      },

      {
        id: 'duration_reduce',
        name: 'Reduce Duration',
        description: 'Shorten event duration to fit',
        autoApplicable: true,
        priority: 60,
        conditions: (conflict) => conflict.conflict_type === 'time_overlap',
        resolve: async (conflict, context) => {
          const event1 = context.events.find(
            (e) => e.id === conflict.event_id_1,
          );

          if (!event1 || !event1.max_duration_minutes) {
            return {
              success: false,
              strategy: 'duration_reduce',
              changes: [],
              explanation: 'Cannot reduce duration',
              requiresApproval: false,
            };
          }

          const currentDuration =
            new Date(event1.end_time).getTime() -
            new Date(event1.start_time).getTime();
          const maxDuration = event1.max_duration_minutes * 60000;

          if (currentDuration <= maxDuration) {
            return {
              success: false,
              strategy: 'duration_reduce',
              changes: [],
              explanation: 'Already at minimum duration',
              requiresApproval: false,
            };
          }

          const newEndTime = new Date(
            new Date(event1.start_time).getTime() + maxDuration,
          );

          return {
            success: true,
            strategy: 'duration_reduce',
            changes: [
              {
                eventId: event1.id,
                oldValues: { end_time: event1.end_time },
                newValues: { end_time: newEndTime.toISOString() },
              },
            ],
            explanation: `Reduced "${event1.title}" duration to ${event1.max_duration_minutes} minutes`,
            requiresApproval: true,
          };
        },
      },

      {
        id: 'vendor_reassign',
        name: 'Reassign Vendor',
        description: 'Assign different vendor to resolve conflict',
        autoApplicable: false,
        priority: 70,
        conditions: (conflict) => conflict.conflict_type === 'vendor_overlap',
        resolve: async (conflict, context) => {
          // This would require vendor availability lookup
          return {
            success: false,
            strategy: 'vendor_reassign',
            changes: [],
            explanation: 'Vendor reassignment requires manual selection',
            requiresApproval: true,
          };
        },
      },

      {
        id: 'location_change',
        name: 'Change Location',
        description: 'Move event to different location',
        autoApplicable: false,
        priority: 50,
        conditions: (conflict) =>
          conflict.conflict_type === 'location_conflict',
        resolve: async (conflict, context) => {
          return {
            success: false,
            strategy: 'location_change',
            changes: [],
            explanation: 'Location change requires manual selection',
            requiresApproval: true,
          };
        },
      },
    ];

    strategies.forEach((strategy) => {
      this.strategies.set(strategy.id, strategy);
    });
  }

  /**
   * Detect time overlap conflicts
   */
  private async detectTimeOverlapConflicts(
    events: TimelineEvent[],
  ): Promise<TimelineConflict[]> {
    const conflicts: TimelineConflict[] = [];
    const sortedEvents = events.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

    for (let i = 0; i < sortedEvents.length; i++) {
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const event1 = sortedEvents[i];
        const event2 = sortedEvents[j];

        if (this.eventsOverlap(event1, event2)) {
          conflicts.push({
            id: `overlap_${event1.id}_${event2.id}`,
            timeline_id: event1.timeline_id,
            conflict_type: 'time_overlap',
            severity: 'warning',
            event_id_1: event1.id,
            event_id_2: event2.id,
            description: `Time overlap between "${event1.title}" and "${event2.title}"`,
            is_resolved: false,
            detected_at: new Date().toISOString(),
            last_checked_at: new Date().toISOString(),
            can_auto_resolve: true,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect vendor conflicts
   */
  private async detectVendorConflicts(
    events: TimelineEvent[],
  ): Promise<TimelineConflict[]> {
    const conflicts: TimelineConflict[] = [];
    const vendorSchedule = new Map<string, TimelineEvent[]>();

    // Group events by vendor
    for (const event of events) {
      if (event.vendors) {
        for (const vendor of event.vendors) {
          if (!vendorSchedule.has(vendor.vendor_id)) {
            vendorSchedule.set(vendor.vendor_id, []);
          }
          vendorSchedule.get(vendor.vendor_id)!.push(event);
        }
      }
    }

    // Check for vendor double-booking
    for (const [vendorId, vendorEvents] of vendorSchedule) {
      for (let i = 0; i < vendorEvents.length; i++) {
        for (let j = i + 1; j < vendorEvents.length; j++) {
          const event1 = vendorEvents[i];
          const event2 = vendorEvents[j];

          if (this.eventsOverlap(event1, event2)) {
            conflicts.push({
              id: `vendor_${vendorId}_${event1.id}_${event2.id}`,
              timeline_id: event1.timeline_id,
              conflict_type: 'vendor_overlap',
              severity: 'error',
              event_id_1: event1.id,
              event_id_2: event2.id,
              description: `Vendor double-booking between "${event1.title}" and "${event2.title}"`,
              is_resolved: false,
              detected_at: new Date().toISOString(),
              last_checked_at: new Date().toISOString(),
              can_auto_resolve: false,
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect location conflicts
   */
  private async detectLocationConflicts(
    events: TimelineEvent[],
  ): Promise<TimelineConflict[]> {
    const conflicts: TimelineConflict[] = [];
    const locationSchedule = new Map<string, TimelineEvent[]>();

    // Group events by location
    for (const event of events) {
      if (event.location) {
        if (!locationSchedule.has(event.location)) {
          locationSchedule.set(event.location, []);
        }
        locationSchedule.get(event.location)!.push(event);
      }
    }

    // Check for location conflicts
    for (const [location, locationEvents] of locationSchedule) {
      for (let i = 0; i < locationEvents.length; i++) {
        for (let j = i + 1; j < locationEvents.length; j++) {
          const event1 = locationEvents[i];
          const event2 = locationEvents[j];

          if (this.eventsOverlap(event1, event2)) {
            conflicts.push({
              id: `location_${location}_${event1.id}_${event2.id}`,
              timeline_id: event1.timeline_id,
              conflict_type: 'location_conflict',
              severity: 'warning',
              event_id_1: event1.id,
              event_id_2: event2.id,
              description: `Location conflict at ${location} between "${event1.title}" and "${event2.title}"`,
              is_resolved: false,
              detected_at: new Date().toISOString(),
              last_checked_at: new Date().toISOString(),
              can_auto_resolve: true,
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect dependency conflicts
   */
  private async detectDependencyConflicts(
    events: TimelineEvent[],
  ): Promise<TimelineConflict[]> {
    const conflicts: TimelineConflict[] = [];
    const eventMap = new Map(events.map((e) => [e.id, e]));

    for (const event of events) {
      if (event.depends_on) {
        for (const dependencyId of event.depends_on) {
          const dependency = eventMap.get(dependencyId);
          if (dependency) {
            // Check if dependency starts after dependent event
            if (new Date(dependency.start_time) >= new Date(event.start_time)) {
              conflicts.push({
                id: `dependency_${event.id}_${dependencyId}`,
                timeline_id: event.timeline_id,
                conflict_type: 'dependency_issue',
                severity: 'error',
                event_id_1: event.id,
                event_id_2: dependencyId,
                description: `"${event.title}" depends on "${dependency.title}" but is scheduled before it`,
                is_resolved: false,
                detected_at: new Date().toISOString(),
                last_checked_at: new Date().toISOString(),
                can_auto_resolve: true,
              });
            }
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect resource conflicts
   */
  private async detectResourceConflicts(
    events: TimelineEvent[],
  ): Promise<TimelineConflict[]> {
    // This would check for equipment, room, or other resource conflicts
    // Implementation depends on how resources are modeled
    return [];
  }

  /**
   * Check if two events overlap in time
   */
  private eventsOverlap(event1: TimelineEvent, event2: TimelineEvent): boolean {
    const start1 = new Date(event1.start_time);
    const end1 = new Date(event1.end_time);
    const start2 = new Date(event2.start_time);
    const end2 = new Date(event2.end_time);

    return start1 < end2 && start2 < end1;
  }

  /**
   * Build context for conflict resolution
   */
  private async buildConflictContext(
    timelineId: string,
    events: TimelineEvent[],
  ): Promise<ConflictContext> {
    const { data: timeline } = await this.supabase
      .from('wedding_timelines')
      .select('buffer_time_minutes, allow_vendor_edits')
      .eq('id', timelineId)
      .single();

    return {
      events,
      timelineSettings: {
        allowOverlap: false,
        bufferMinutes: timeline?.buffer_time_minutes || 15,
        workingHours: { start: '08:00', end: '22:00' },
      },
      userPreferences: {
        autoResolve: true,
        preferredStrategies: ['time_shift', 'duration_reduce'],
      },
    };
  }

  /**
   * Find best resolution strategy
   */
  private findBestStrategy(
    conflict: TimelineConflict,
    context: ConflictContext,
  ): ConflictResolutionStrategy | undefined {
    return Array.from(this.strategies.values())
      .filter((strategy) => strategy.conditions(conflict, context))
      .sort((a, b) => b.priority - a.priority)[0];
  }

  /**
   * Check if conflict requires manual approval
   */
  private requiresApproval(conflict: TimelineConflict): boolean {
    return (
      conflict.severity === 'error' ||
      conflict.conflict_type === 'vendor_overlap'
    );
  }

  /**
   * Analyze version conflicts
   */
  private analyzeVersionConflicts(
    localChanges: Partial<TimelineEvent>,
    versions: any[],
    currentEvent: TimelineEvent,
  ): ConflictDiff[] {
    const conflicts: ConflictDiff[] = [];

    for (const [field, localValue] of Object.entries(localChanges)) {
      const currentValue = (currentEvent as any)[field];

      if (localValue !== currentValue) {
        // Check if this field was changed in recent versions
        const hasRemoteChange = versions.some(
          (version) => version.changes && version.changes[field] !== undefined,
        );

        if (hasRemoteChange) {
          conflicts.push({
            field,
            localValue,
            remoteValue: currentValue,
            conflictType: 'concurrent_edit',
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Save conflict to database
   */
  private async saveConflict(
    timelineId: string,
    conflict: TimelineConflict,
  ): Promise<void> {
    try {
      // Check if conflict already exists
      const { data: existing } = await this.supabase
        .from('timeline_conflicts')
        .select('id')
        .eq('timeline_id', timelineId)
        .eq('event_id_1', conflict.event_id_1)
        .eq('event_id_2', conflict.event_id_2 || '')
        .eq('conflict_type', conflict.conflict_type)
        .single();

      if (!existing) {
        await this.supabase.from('timeline_conflicts').insert({
          ...conflict,
          timeline_id: timelineId,
        });
      }
    } catch (error) {
      console.error('Failed to save conflict:', error);
    }
  }

  /**
   * Log conflict resolution
   */
  private async logConflictResolution(
    timelineId: string,
    conflictId: string,
    resolution: ConflictResolution,
  ): Promise<void> {
    await this.supabase.from('timeline_activity_logs').insert({
      timeline_id: timelineId,
      action: 'conflict_resolved',
      entity_type: 'conflict',
      entity_id: conflictId,
      new_values: {
        strategy: resolution.strategy,
        changes: resolution.changes,
        explanation: resolution.explanation,
      },
      created_at: new Date().toISOString(),
    });
  }
}

export default TimelineConflictResolutionService;
