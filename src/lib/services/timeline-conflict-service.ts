import { createClient } from '@supabase/supabase-js';
import { parseISO, addMinutes, isBefore, isAfter, isEqual } from 'date-fns';
import type {
  TimelineEvent,
  TimelineConflict,
  TimelineEventVendor,
} from '@/types/timeline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface ConflictDetectionResult {
  conflicts: TimelineConflict[];
  newConflictsCount: number;
  resolvedConflictsCount: number;
}

export class TimelineConflictService {
  /**
   * Detect all conflicts for a timeline
   */
  static async detectConflicts(
    timelineId: string,
  ): Promise<ConflictDetectionResult> {
    try {
      // Get all events for the timeline
      const { data: events, error: eventsError } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('timeline_id', timelineId)
        .order('start_time');

      if (eventsError) throw eventsError;

      // Get vendor assignments
      const { data: vendorAssignments, error: vendorsError } = await supabase
        .from('timeline_event_vendors')
        .select('*')
        .in('event_id', events?.map((e) => e.id) || []);

      if (vendorsError) throw vendorsError;

      // Get existing conflicts
      const { data: existingConflicts, error: conflictsError } = await supabase
        .from('timeline_conflicts')
        .select('*')
        .eq('timeline_id', timelineId);

      if (conflictsError) throw conflictsError;

      // Detect various types of conflicts
      const detectedConflicts = [
        ...this.detectTimeOverlaps(events || [], timelineId),
        ...this.detectVendorDoubleBookings(
          events || [],
          vendorAssignments || [],
          timelineId,
        ),
        ...this.detectLocationConflicts(events || [], timelineId),
        ...this.detectTravelTimeConflicts(events || [], timelineId),
        ...this.detectSetupConflicts(
          events || [],
          vendorAssignments || [],
          timelineId,
        ),
      ];

      // Compare with existing conflicts to find new ones
      const existingConflictKeys = new Set(
        (existingConflicts || []).map(
          (c) => `${c.conflict_type}-${c.event1_id}-${c.event2_id}`,
        ),
      );

      const newConflicts = detectedConflicts.filter(
        (c) =>
          !existingConflictKeys.has(
            `${c.conflict_type}-${c.event1_id}-${c.event2_id}`,
          ),
      );

      // Insert new conflicts
      if (newConflicts.length > 0) {
        const { error: insertError } = await supabase
          .from('timeline_conflicts')
          .insert(newConflicts);

        if (insertError) throw insertError;
      }

      // Mark resolved conflicts (conflicts that no longer exist)
      const currentConflictKeys = new Set(
        detectedConflicts.map(
          (c) => `${c.conflict_type}-${c.event1_id}-${c.event2_id}`,
        ),
      );

      const resolvedConflictIds = (existingConflicts || [])
        .filter(
          (c) =>
            c.status !== 'resolved' &&
            !currentConflictKeys.has(
              `${c.conflict_type}-${c.event1_id}-${c.event2_id}`,
            ),
        )
        .map((c) => c.id);

      let resolvedCount = 0;
      if (resolvedConflictIds.length > 0) {
        const { error: resolveError } = await supabase
          .from('timeline_conflicts')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: 'system',
          })
          .in('id', resolvedConflictIds);

        if (resolveError) throw resolveError;
        resolvedCount = resolvedConflictIds.length;
      }

      // Get all current conflicts (including newly created ones)
      const { data: allConflicts, error: allConflictsError } = await supabase
        .from('timeline_conflicts')
        .select('*')
        .eq('timeline_id', timelineId)
        .order('created_at', { ascending: false });

      if (allConflictsError) throw allConflictsError;

      return {
        conflicts: allConflicts || [],
        newConflictsCount: newConflicts.length,
        resolvedConflictsCount: resolvedCount,
      };
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      throw error;
    }
  }

  /**
   * Detect time overlaps between events
   */
  private static detectTimeOverlaps(
    events: TimelineEvent[],
    timelineId: string,
  ): Partial<TimelineConflict>[] {
    const conflicts: Partial<TimelineConflict>[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        const start1 = parseISO(event1.start_time);
        const end1 = event1.end_time
          ? parseISO(event1.end_time)
          : addMinutes(start1, event1.duration || 60);
        const start2 = parseISO(event2.start_time);
        const end2 = event2.end_time
          ? parseISO(event2.end_time)
          : addMinutes(start2, event2.duration || 60);

        // Check for overlap
        if (isBefore(start1, end2) && isBefore(start2, end1)) {
          const overlapMinutes =
            Math.min(end1.getTime(), end2.getTime()) -
            Math.max(start1.getTime(), start2.getTime());
          const overlapMinutesCount = Math.floor(overlapMinutes / (1000 * 60));

          conflicts.push({
            timeline_id: timelineId,
            conflict_type: 'time-overlap',
            event1_id: event1.id,
            event2_id: event2.id,
            severity: overlapMinutesCount > 30 ? 'error' : 'warning',
            description: `Events overlap by ${overlapMinutesCount} minutes`,
            status: 'active',
            created_at: new Date().toISOString(),
            metadata: {
              overlap_minutes: overlapMinutesCount,
              event1_priority: event1.priority,
              event2_priority: event2.priority,
            },
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect vendor double bookings
   */
  private static detectVendorDoubleBookings(
    events: TimelineEvent[],
    vendorAssignments: TimelineEventVendor[],
    timelineId: string,
  ): Partial<TimelineConflict>[] {
    const conflicts: Partial<TimelineConflict>[] = [];

    // Group assignments by vendor
    const vendorEventMap: Record<
      string,
      { event: TimelineEvent; assignment: TimelineEventVendor }[]
    > = {};

    vendorAssignments.forEach((assignment) => {
      const event = events.find((e) => e.id === assignment.event_id);
      if (!event) return;

      if (!vendorEventMap[assignment.vendor_id]) {
        vendorEventMap[assignment.vendor_id] = [];
      }

      vendorEventMap[assignment.vendor_id].push({ event, assignment });
    });

    // Check for overlaps within each vendor's schedule
    Object.entries(vendorEventMap).forEach(([vendorId, vendorEvents]) => {
      for (let i = 0; i < vendorEvents.length; i++) {
        for (let j = i + 1; j < vendorEvents.length; j++) {
          const { event: event1, assignment: assignment1 } = vendorEvents[i];
          const { event: event2, assignment: assignment2 } = vendorEvents[j];

          // Calculate effective times including setup/breakdown
          const start1 = addMinutes(
            parseISO(event1.start_time),
            -(assignment1.setup_time || 0),
          );
          const end1 = addMinutes(
            parseISO(event1.end_time || event1.start_time),
            (event1.duration || 60) + (assignment1.breakdown_time || 0),
          );
          const start2 = addMinutes(
            parseISO(event2.start_time),
            -(assignment2.setup_time || 0),
          );
          const end2 = addMinutes(
            parseISO(event2.end_time || event2.start_time),
            (event2.duration || 60) + (assignment2.breakdown_time || 0),
          );

          // Check for overlap
          if (isBefore(start1, end2) && isBefore(start2, end1)) {
            conflicts.push({
              timeline_id: timelineId,
              conflict_type: 'vendor-double-booking',
              event1_id: event1.id,
              event2_id: event2.id,
              severity: 'error',
              description: `Vendor ${assignment1.vendor_id} is double-booked (including setup/breakdown time)`,
              status: 'active',
              created_at: new Date().toISOString(),
              metadata: {
                vendor_id: vendorId,
                includes_setup_time: true,
              },
            });
          }
        }
      }
    });

    return conflicts;
  }

  /**
   * Detect location conflicts
   */
  private static detectLocationConflicts(
    events: TimelineEvent[],
    timelineId: string,
  ): Partial<TimelineConflict>[] {
    const conflicts: Partial<TimelineConflict>[] = [];

    // Group events by location
    const locationEventMap: Record<string, TimelineEvent[]> = {};

    events.forEach((event) => {
      if (!event.location) return;

      if (!locationEventMap[event.location]) {
        locationEventMap[event.location] = [];
      }

      locationEventMap[event.location].push(event);
    });

    // Check for overlaps within each location
    Object.entries(locationEventMap).forEach(([location, locationEvents]) => {
      if (locationEvents.length < 2) return;

      for (let i = 0; i < locationEvents.length; i++) {
        for (let j = i + 1; j < locationEvents.length; j++) {
          const event1 = locationEvents[i];
          const event2 = locationEvents[j];

          const start1 = parseISO(event1.start_time);
          const end1 = event1.end_time
            ? parseISO(event1.end_time)
            : addMinutes(start1, event1.duration || 60);
          const start2 = parseISO(event2.start_time);
          const end2 = event2.end_time
            ? parseISO(event2.end_time)
            : addMinutes(start2, event2.duration || 60);

          // Check for overlap
          if (isBefore(start1, end2) && isBefore(start2, end1)) {
            conflicts.push({
              timeline_id: timelineId,
              conflict_type: 'location-conflict',
              event1_id: event1.id,
              event2_id: event2.id,
              severity: 'warning',
              description: `Multiple events scheduled at ${location} at the same time`,
              status: 'active',
              created_at: new Date().toISOString(),
              metadata: {
                location: location,
              },
            });
          }
        }
      }
    });

    return conflicts;
  }

  /**
   * Detect travel time conflicts between events at different locations
   */
  private static detectTravelTimeConflicts(
    events: TimelineEvent[],
    timelineId: string,
  ): Partial<TimelineConflict>[] {
    const conflicts: Partial<TimelineConflict>[] = [];

    // Sort events by start time
    const sortedEvents = [...events].sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEvent = sortedEvents[i];
      const nextEvent = sortedEvents[i + 1];

      // Skip if same location or no locations
      if (
        !currentEvent.location ||
        !nextEvent.location ||
        currentEvent.location === nextEvent.location
      ) {
        continue;
      }

      const currentEnd = currentEvent.end_time
        ? parseISO(currentEvent.end_time)
        : addMinutes(
            parseISO(currentEvent.start_time),
            currentEvent.duration || 60,
          );
      const nextStart = parseISO(nextEvent.start_time);

      const travelTimeMinutes =
        (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);

      // Assume minimum 15 minutes travel time between different locations
      const minimumTravelTime = 15;

      if (travelTimeMinutes < minimumTravelTime) {
        conflicts.push({
          timeline_id: timelineId,
          conflict_type: 'travel-time',
          event1_id: currentEvent.id,
          event2_id: nextEvent.id,
          severity: travelTimeMinutes < 5 ? 'error' : 'warning',
          description: `Only ${Math.floor(travelTimeMinutes)} minutes between ${currentEvent.location} and ${nextEvent.location}`,
          status: 'active',
          created_at: new Date().toISOString(),
          metadata: {
            available_travel_time: travelTimeMinutes,
            minimum_required: minimumTravelTime,
            from_location: currentEvent.location,
            to_location: nextEvent.location,
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect setup conflicts
   */
  private static detectSetupConflicts(
    events: TimelineEvent[],
    vendorAssignments: TimelineEventVendor[],
    timelineId: string,
  ): Partial<TimelineConflict>[] {
    const conflicts: Partial<TimelineConflict>[] = [];

    events.forEach((event) => {
      const assignments = vendorAssignments.filter(
        (va) => va.event_id === event.id,
      );

      assignments.forEach((assignment) => {
        if (!assignment.setup_time || assignment.setup_time <= 0) return;

        const eventStart = parseISO(event.start_time);
        const setupStart = addMinutes(eventStart, -assignment.setup_time);

        // Find events that might conflict with setup time
        const conflictingEvents = events.filter((otherEvent) => {
          if (otherEvent.id === event.id) return false;

          const otherStart = parseISO(otherEvent.start_time);
          const otherEnd = otherEvent.end_time
            ? parseISO(otherEvent.end_time)
            : addMinutes(otherStart, otherEvent.duration || 60);

          // Check if setup time overlaps with other event
          return (
            isBefore(setupStart, otherEnd) && isBefore(otherStart, eventStart)
          );
        });

        conflictingEvents.forEach((conflictingEvent) => {
          conflicts.push({
            timeline_id: timelineId,
            conflict_type: 'setup-conflict',
            event1_id: conflictingEvent.id,
            event2_id: event.id,
            severity: 'warning',
            description: `Setup time for ${event.title} conflicts with ${conflictingEvent.title}`,
            status: 'active',
            created_at: new Date().toISOString(),
            metadata: {
              setup_time_minutes: assignment.setup_time,
              vendor_id: assignment.vendor_id,
            },
          });
        });
      });
    });

    return conflicts;
  }

  /**
   * Resolve a conflict
   */
  static async resolveConflict(
    conflictId: string,
    resolution: 'ignore' | 'adjust_times' | 'change_location',
    resolvedBy: string,
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('timeline_conflicts')
        .update({
          status: 'resolved',
          resolution_type: resolution,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
        })
        .eq('id', conflictId);

      if (error) throw error;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }

  /**
   * Get conflicts for a timeline
   */
  static async getTimelineConflicts(
    timelineId: string,
  ): Promise<TimelineConflict[]> {
    try {
      const { data, error } = await supabase
        .from('timeline_conflicts')
        .select('*')
        .eq('timeline_id', timelineId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      throw error;
    }
  }
}
