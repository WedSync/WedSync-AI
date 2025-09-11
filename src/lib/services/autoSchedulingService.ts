// =====================================================
// AUTO-SCHEDULING SERVICE
// =====================================================
// Intelligent event placement with buffer time calculations
// Feature ID: WS-160
// Created: 2025-01-20
// =====================================================

import {
  addMinutes,
  subMinutes,
  differenceInMinutes,
  parseISO,
  format,
  isAfter,
  isBefore,
  startOfDay,
  endOfDay,
  addHours,
} from 'date-fns';
import type {
  TimelineEvent,
  TimelineEventVendor,
  EventType,
  EventCategory,
  EventPriority,
  ConflictType,
} from '@/types/timeline';

// =====================================================
// BUFFER TIME CONFIGURATION
// =====================================================

interface BufferTimeConfig {
  setup: number;
  breakdown: number;
  travel: number;
  vendor_changeover: number;
  guest_transition: number;
  photography_session: number;
}

interface EventBufferRules {
  ceremony?: BufferTimeConfig;
  reception?: BufferTimeConfig;
  photos?: BufferTimeConfig;
  setup?: BufferTimeConfig;
  breakdown?: BufferTimeConfig;
  preparation?: BufferTimeConfig;
  cocktails?: BufferTimeConfig;
  dinner?: BufferTimeConfig;
  dancing?: BufferTimeConfig;
  entertainment?: BufferTimeConfig;
  transition?: BufferTimeConfig;
}

interface LocationDistance {
  from: string;
  to: string;
  travelMinutes: number;
  distanceKm?: number;
}

interface VendorAvailability {
  vendor_id: string;
  availability_windows: {
    start: string;
    end: string;
  }[];
  buffer_requirements: {
    setup_time: number;
    breakdown_time: number;
    changeover_time: number;
  };
  travel_time_factor: number; // multiplier for travel times
}

// =====================================================
// SCHEDULING CONSTRAINTS
// =====================================================

interface SchedulingConstraints {
  wedding_start_time: Date;
  wedding_end_time: Date;
  ceremony_time?: Date; // Fixed ceremony time
  reception_start_time?: Date; // Fixed reception start
  critical_events: string[]; // Event IDs that cannot be moved
  vendor_constraints: VendorAvailability[];
  location_distances: LocationDistance[];
  buffer_rules: EventBufferRules;
  priority_weights: Record<EventPriority, number>;
}

interface SchedulingResult {
  success: boolean;
  schedule: TimelineEvent[];
  conflicts: ConflictInfo[];
  efficiency_score: number;
  total_duration: number;
  buffer_utilization: number;
  vendor_utilization: Record<string, number>;
  critical_path: string[];
  suggestions: SchedulingSuggestion[];
}

interface ConflictInfo {
  type: ConflictType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affected_events: string[];
  suggested_resolution?: string;
}

interface SchedulingSuggestion {
  type:
    | 'optimize_duration'
    | 'adjust_buffers'
    | 'relocate_event'
    | 'vendor_change';
  event_id: string;
  suggestion: string;
  impact_score: number;
  estimated_improvement: string;
}

// =====================================================
// AUTO-SCHEDULING SERVICE
// =====================================================

export class AutoSchedulingService {
  private static readonly DEFAULT_BUFFER_RULES: EventBufferRules = {
    preparation: {
      setup: 20,
      breakdown: 10,
      travel: 10,
      vendor_changeover: 10,
      guest_transition: 5,
      photography_session: 10,
    },
    ceremony: {
      setup: 45,
      breakdown: 20,
      travel: 15,
      vendor_changeover: 20,
      guest_transition: 10,
      photography_session: 15,
    },
    cocktails: {
      setup: 20,
      breakdown: 10,
      travel: 10,
      vendor_changeover: 15,
      guest_transition: 10,
      photography_session: 15,
    },
    reception: {
      setup: 60,
      breakdown: 45,
      travel: 15,
      vendor_changeover: 30,
      guest_transition: 15,
      photography_session: 20,
    },
    photos: {
      setup: 10,
      breakdown: 5,
      travel: 10,
      vendor_changeover: 10,
      guest_transition: 5,
      photography_session: 5,
    },
    dancing: {
      setup: 30,
      breakdown: 20,
      travel: 10,
      vendor_changeover: 15,
      guest_transition: 10,
      photography_session: 15,
    },
    entertainment: {
      setup: 30,
      breakdown: 20,
      travel: 10,
      vendor_changeover: 20,
      guest_transition: 10,
      photography_session: 10,
    },
    dinner: {
      setup: 45,
      breakdown: 30,
      travel: 10,
      vendor_changeover: 20,
      guest_transition: 15,
      photography_session: 10,
    },
    setup: {
      setup: 0,
      breakdown: 5,
      travel: 5,
      vendor_changeover: 10,
      guest_transition: 0,
      photography_session: 0,
    },
    breakdown: {
      setup: 0,
      breakdown: 0,
      travel: 5,
      vendor_changeover: 5,
      guest_transition: 0,
      photography_session: 0,
    },
    transition: {
      setup: 5,
      breakdown: 5,
      travel: 0,
      vendor_changeover: 5,
      guest_transition: 10,
      photography_session: 5,
    },
    vendor_arrival: {
      setup: 10,
      breakdown: 5,
      travel: 5,
      vendor_changeover: 0,
      guest_transition: 0,
      photography_session: 0,
    },
    vendor_departure: {
      setup: 0,
      breakdown: 10,
      travel: 5,
      vendor_changeover: 0,
      guest_transition: 0,
      photography_session: 0,
    },
    other: {
      setup: 15,
      breakdown: 10,
      travel: 10,
      vendor_changeover: 10,
      guest_transition: 5,
      photography_session: 5,
    },
  };

  private static readonly PRIORITY_WEIGHTS = {
    critical: 10,
    high: 7,
    medium: 4,
    low: 1,
  };

  /**
   * Generate an optimized wedding timeline schedule
   */
  static async generateOptimizedSchedule(
    events: TimelineEvent[],
    constraints: SchedulingConstraints,
    algorithm: 'forward' | 'backward' | 'hybrid' = 'hybrid',
  ): Promise<SchedulingResult> {
    try {
      console.log(
        `Starting ${algorithm} scheduling for ${events.length} events`,
      );

      // Prepare events for scheduling
      const preparedEvents = this.prepareEventsForScheduling(
        events,
        constraints,
      );

      // Apply scheduling algorithm
      let scheduledEvents: TimelineEvent[];

      switch (algorithm) {
        case 'forward':
          scheduledEvents = this.forwardScheduling(preparedEvents, constraints);
          break;
        case 'backward':
          scheduledEvents = this.backwardScheduling(
            preparedEvents,
            constraints,
          );
          break;
        case 'hybrid':
        default:
          scheduledEvents = this.hybridScheduling(preparedEvents, constraints);
          break;
      }

      // Calculate buffer times and apply optimizations
      scheduledEvents = this.calculateBufferTimes(scheduledEvents, constraints);
      scheduledEvents = this.optimizeVendorEfficiency(
        scheduledEvents,
        constraints,
      );

      // Detect conflicts in the generated schedule
      const conflicts = this.detectSchedulingConflicts(
        scheduledEvents,
        constraints,
      );

      // Calculate metrics
      const metrics = this.calculateSchedulingMetrics(
        scheduledEvents,
        constraints,
      );

      // Generate optimization suggestions
      const suggestions = this.generateOptimizationSuggestions(
        scheduledEvents,
        conflicts,
        constraints,
      );

      return {
        success:
          conflicts.filter((c) => c.severity === 'critical').length === 0,
        schedule: scheduledEvents,
        conflicts,
        efficiency_score: metrics.efficiency_score,
        total_duration: metrics.total_duration,
        buffer_utilization: metrics.buffer_utilization,
        vendor_utilization: metrics.vendor_utilization,
        critical_path: metrics.critical_path,
        suggestions,
      };
    } catch (error) {
      console.error('Error in auto-scheduling:', error);
      throw error;
    }
  }

  /**
   * Forward scheduling - schedule events from ceremony start time
   */
  private static forwardScheduling(
    events: TimelineEvent[],
    constraints: SchedulingConstraints,
  ): TimelineEvent[] {
    console.log('Applying forward scheduling algorithm');

    const scheduledEvents: TimelineEvent[] = [];
    const sortedEvents = this.sortEventsByPriority(events);

    let currentTime =
      constraints.ceremony_time || constraints.wedding_start_time;

    for (const event of sortedEvents) {
      // If this is a fixed event, use its existing time
      if (constraints.critical_events.includes(event.id)) {
        const fixedEvent: TimelineEvent = {
          ...event,
          buffer_before_minutes: this.calculateEventBufferTime(
            event,
            'before',
            constraints,
          ),
          buffer_after_minutes: this.calculateEventBufferTime(
            event,
            'after',
            constraints,
          ),
        };
        scheduledEvents.push(fixedEvent);
        // Update current time to after this fixed event
        const eventEnd = parseISO(event.end_time || event.start_time);
        const eventDuration = event.duration_minutes || 60;
        currentTime = event.end_time
          ? eventEnd
          : addMinutes(parseISO(event.start_time), eventDuration);
        continue;
      }

      // Calculate required buffer time before event
      const bufferBefore = this.calculateEventBufferTime(
        event,
        'before',
        constraints,
      );
      const bufferAfter = this.calculateEventBufferTime(
        event,
        'after',
        constraints,
      );

      // Find next available slot
      const availableSlot = this.findNextAvailableSlot(
        currentTime,
        event.duration_minutes || 60,
        bufferBefore,
        scheduledEvents,
        constraints,
      );

      // Schedule the event
      const scheduledEvent: TimelineEvent = {
        ...event,
        start_time: availableSlot.start.toISOString(),
        end_time: availableSlot.end.toISOString(),
        buffer_before_minutes: bufferBefore,
        buffer_after_minutes: bufferAfter,
      };

      scheduledEvents.push(scheduledEvent);
      currentTime = addMinutes(availableSlot.end, bufferAfter);
    }

    return scheduledEvents.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );
  }

  /**
   * Backward scheduling - schedule events from end time
   */
  private static backwardScheduling(
    events: TimelineEvent[],
    constraints: SchedulingConstraints,
  ): TimelineEvent[] {
    console.log('Applying backward scheduling algorithm');

    const scheduledEvents: TimelineEvent[] = [];
    const sortedEvents = this.sortEventsByPriority(events).reverse();

    let currentTime = constraints.wedding_end_time;

    for (const event of sortedEvents) {
      // Skip if this is a fixed event
      if (constraints.critical_events.includes(event.id)) {
        scheduledEvents.unshift(event);
        continue;
      }

      // Calculate required buffer time after event
      const bufferAfter = this.calculateEventBufferTime(
        event,
        'after',
        constraints,
      );

      // Find previous available slot
      const availableSlot = this.findPreviousAvailableSlot(
        currentTime,
        event.duration_minutes || 60,
        bufferAfter,
        scheduledEvents,
        constraints,
      );

      // Schedule the event
      const scheduledEvent: TimelineEvent = {
        ...event,
        start_time: availableSlot.start.toISOString(),
        end_time: availableSlot.end.toISOString(),
        buffer_before_minutes: this.calculateEventBufferTime(
          event,
          'before',
          constraints,
        ),
        buffer_after_minutes: bufferAfter,
      };

      scheduledEvents.unshift(scheduledEvent);
      currentTime = availableSlot.start;
    }

    return scheduledEvents;
  }

  /**
   * Hybrid scheduling - combines forward and backward for optimal results
   */
  private static hybridScheduling(
    events: TimelineEvent[],
    constraints: SchedulingConstraints,
  ): TimelineEvent[] {
    console.log('Applying hybrid scheduling algorithm');

    // For hybrid scheduling, we'll use a simplified approach
    // Start with forward scheduling and then optimize
    const forwardScheduled = this.forwardScheduling(events, constraints);

    // Apply basic optimizations to the forward schedule
    return this.optimizeScheduleOrder(forwardScheduled, constraints);
  }

  /**
   * Optimize the order of scheduled events
   */
  private static optimizeScheduleOrder(
    events: TimelineEvent[],
    constraints: SchedulingConstraints,
  ): TimelineEvent[] {
    // Sort events by start time to ensure chronological order
    const sorted = [...events].sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

    // Apply simple optimizations like reducing excessive gaps
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEvent = sorted[i];
      const nextEvent = sorted[i + 1];

      // Skip if current event is critical/locked
      if (constraints.critical_events.includes(currentEvent.id)) {
        continue;
      }

      const currentEnd = parseISO(currentEvent.end_time);
      const nextStart = parseISO(nextEvent.start_time);
      const gap = differenceInMinutes(nextStart, currentEnd);

      // If gap is too large (>90 minutes), try to close it
      if (gap > 90) {
        const maxMove = Math.min(30, gap - 30); // Move up to 30 minutes
        const newStart = addMinutes(parseISO(currentEvent.start_time), maxMove);
        const newEnd = addMinutes(
          newStart,
          currentEvent.duration_minutes || 60,
        );

        // Only apply if it doesn't conflict with previous events
        if (
          i === 0 ||
          parseISO(sorted[i - 1].end_time).getTime() <= newStart.getTime()
        ) {
          currentEvent.start_time = newStart.toISOString();
          currentEvent.end_time = newEnd.toISOString();
        }
      }
    }

    return sorted;
  }

  /**
   * Calculate buffer times for all events
   */
  private static calculateBufferTimes(
    events: TimelineEvent[],
    constraints: SchedulingConstraints,
  ): TimelineEvent[] {
    console.log('Calculating buffer times for events');

    return events.map((event, index) => {
      const previousEvent = index > 0 ? events[index - 1] : null;
      const nextEvent = index < events.length - 1 ? events[index + 1] : null;

      // Calculate setup buffer (before event)
      const setupBuffer = this.calculateSetupBuffer(
        event,
        previousEvent,
        constraints,
      );

      // Calculate breakdown buffer (after event)
      const breakdownBuffer = this.calculateBreakdownBuffer(
        event,
        nextEvent,
        constraints,
      );

      // Calculate travel buffer
      const travelBuffer = this.calculateTravelBuffer(
        event,
        nextEvent,
        constraints,
      );

      return {
        ...event,
        buffer_before_minutes: Math.max(
          event.buffer_before_minutes || 0,
          setupBuffer,
        ),
        buffer_after_minutes: Math.max(
          event.buffer_after_minutes || 0,
          breakdownBuffer + travelBuffer,
        ),
      };
    });
  }

  /**
   * Calculate setup buffer time for an event
   */
  private static calculateSetupBuffer(
    event: TimelineEvent,
    previousEvent: TimelineEvent | null,
    constraints: SchedulingConstraints,
  ): number {
    const bufferConfig =
      constraints.buffer_rules[event.event_type!] ||
      this.DEFAULT_BUFFER_RULES.other!;

    let setupTime = bufferConfig.setup;

    // Add vendor changeover time if different vendors
    if (previousEvent && this.requiresVendorChangeover(previousEvent, event)) {
      setupTime += bufferConfig.vendor_changeover;
    }

    // Add guest transition time for events requiring guest movement
    if (this.requiresGuestTransition(event)) {
      setupTime += bufferConfig.guest_transition;
    }

    // Add photography session buffer for photo events
    if (event.event_type === 'photos') {
      setupTime += bufferConfig.photography_session;
    }

    return setupTime;
  }

  /**
   * Calculate breakdown buffer time for an event
   */
  private static calculateBreakdownBuffer(
    event: TimelineEvent,
    nextEvent: TimelineEvent | null,
    constraints: SchedulingConstraints,
  ): number {
    const bufferConfig =
      constraints.buffer_rules[event.event_type!] ||
      this.DEFAULT_BUFFER_RULES.other!;

    let breakdownTime = bufferConfig.breakdown;

    // Add extra breakdown time for complex setups
    if (this.isComplexEvent(event)) {
      breakdownTime *= 1.5;
    }

    return Math.round(breakdownTime);
  }

  /**
   * Calculate travel buffer between events
   */
  private static calculateTravelBuffer(
    currentEvent: TimelineEvent,
    nextEvent: TimelineEvent | null,
    constraints: SchedulingConstraints,
  ): number {
    if (!nextEvent || !currentEvent.location || !nextEvent.location) {
      return 0;
    }

    // Same location = no travel time
    if (currentEvent.location === nextEvent.location) {
      return 0;
    }

    // Look up travel time in constraints
    const travelTime = this.lookupTravelTime(
      currentEvent.location,
      nextEvent.location,
      constraints.location_distances,
    );

    const bufferConfig =
      constraints.buffer_rules[currentEvent.event_type!] ||
      this.DEFAULT_BUFFER_RULES.other!;

    return Math.max(travelTime, bufferConfig.travel);
  }

  /**
   * Optimize vendor efficiency across the timeline
   */
  private static optimizeVendorEfficiency(
    events: TimelineEvent[],
    constraints: SchedulingConstraints,
  ): TimelineEvent[] {
    console.log('Optimizing vendor efficiency');

    // Group events by vendor
    const vendorEventMap = this.groupEventsByVendor(events);

    // Optimize each vendor's schedule
    Object.entries(vendorEventMap).forEach(([vendorId, vendorEvents]) => {
      // Sort vendor events by current start time
      vendorEvents.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );

      // Optimize gaps between vendor's events
      for (let i = 0; i < vendorEvents.length - 1; i++) {
        const currentEvent = vendorEvents[i];
        const nextEvent = vendorEvents[i + 1];

        const gap = this.calculateEventGap(currentEvent, nextEvent);
        const optimalGap = this.calculateOptimalVendorGap(
          currentEvent,
          nextEvent,
          constraints,
        );

        // If gap is not optimal, suggest adjustment
        if (Math.abs(gap - optimalGap) > 15) {
          // 15 minute tolerance
          console.log(
            `Sub-optimal gap detected for vendor ${vendorId}: ${gap} vs ${optimalGap} minutes`,
          );
        }
      }
    });

    return events;
  }

  /**
   * Detect conflicts in the scheduled timeline
   */
  private static detectSchedulingConflicts(
    events: TimelineEvent[],
    constraints: SchedulingConstraints,
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    // Check for time overlaps
    conflicts.push(...this.detectTimeOverlapConflicts(events));

    // Check for vendor double-booking
    conflicts.push(...this.detectVendorConflicts(events));

    // Check for insufficient travel time
    conflicts.push(...this.detectTravelTimeConflicts(events, constraints));

    // Check for buffer violations
    conflicts.push(...this.detectBufferViolations(events, constraints));

    return conflicts;
  }

  /**
   * Calculate scheduling metrics
   */
  private static calculateSchedulingMetrics(
    events: TimelineEvent[],
    constraints: SchedulingConstraints,
  ) {
    if (events.length === 0) {
      return {
        efficiency_score: 0,
        total_duration: 0,
        buffer_utilization: 0,
        vendor_utilization: {},
        critical_path: [],
      };
    }

    const startTime = new Date(events[0].start_time);
    const endTime = new Date(events[events.length - 1].end_time);
    const totalDuration = differenceInMinutes(endTime, startTime);

    // Calculate efficiency score (0-100)
    const totalEventTime = events.reduce(
      (sum, event) => sum + (event.duration_minutes || 60),
      0,
    );
    const efficiency_score = Math.round((totalEventTime / totalDuration) * 100);

    // Calculate buffer utilization
    const totalBufferTime = events.reduce(
      (sum, event) =>
        sum +
        (event.buffer_before_minutes || 0) +
        (event.buffer_after_minutes || 0),
      0,
    );
    const buffer_utilization = Math.round(
      (totalBufferTime / totalDuration) * 100,
    );

    // Calculate vendor utilization
    const vendor_utilization = this.calculateVendorUtilization(events);

    // Find critical path
    const critical_path = this.findCriticalPath(events);

    return {
      efficiency_score,
      total_duration: totalDuration,
      buffer_utilization,
      vendor_utilization,
      critical_path,
    };
  }

  /**
   * Generate optimization suggestions
   */
  private static generateOptimizationSuggestions(
    events: TimelineEvent[],
    conflicts: ConflictInfo[],
    constraints: SchedulingConstraints,
  ): SchedulingSuggestion[] {
    const suggestions: SchedulingSuggestion[] = [];

    // Analyze conflicts and generate suggestions
    for (const conflict of conflicts) {
      if (conflict.type === 'time_overlap') {
        suggestions.push({
          type: 'adjust_buffers',
          event_id: conflict.affected_events[0],
          suggestion:
            'Consider reducing buffer times or adjusting event duration',
          impact_score: 8,
          estimated_improvement: 'Eliminate time overlap conflict',
        });
      }

      if (conflict.type === 'vendor_overlap') {
        suggestions.push({
          type: 'vendor_change',
          event_id: conflict.affected_events[0],
          suggestion: 'Consider using backup vendor or adjusting timing',
          impact_score: 9,
          estimated_improvement: 'Resolve vendor double-booking',
        });
      }
    }

    // Generate efficiency improvement suggestions
    const lowEfficiencyEvents = events.filter((event) => {
      const bufferTime =
        (event.buffer_before_minutes || 0) + (event.buffer_after_minutes || 0);
      const eventTime = event.duration_minutes || 60;
      return bufferTime > eventTime * 0.5; // Buffer > 50% of event time
    });

    for (const event of lowEfficiencyEvents) {
      suggestions.push({
        type: 'optimize_duration',
        event_id: event.id,
        suggestion:
          'High buffer time detected - consider optimizing event duration or reducing buffers',
        impact_score: 6,
        estimated_improvement: 'Improve timeline efficiency by 10-15%',
      });
    }

    return suggestions.sort((a, b) => b.impact_score - a.impact_score);
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private static prepareEventsForScheduling(
    events: TimelineEvent[],
    constraints: SchedulingConstraints,
  ): TimelineEvent[] {
    return events.map((event) => ({
      ...event,
      duration_minutes:
        event.duration_minutes || this.getDefaultDuration(event.event_type),
      priority: event.priority || 'medium',
    }));
  }

  private static sortEventsByPriority(
    events: TimelineEvent[],
  ): TimelineEvent[] {
    return [...events].sort((a, b) => {
      const priorityA = this.PRIORITY_WEIGHTS[a.priority || 'medium'];
      const priorityB = this.PRIORITY_WEIGHTS[b.priority || 'medium'];
      return priorityB - priorityA;
    });
  }

  private static getDefaultDuration(eventType?: EventType): number {
    const durations: Record<EventType, number> = {
      preparation: 120,
      ceremony: 45,
      cocktails: 60,
      reception: 240,
      photos: 90,
      dancing: 120,
      entertainment: 60,
      dinner: 90,
      setup: 30,
      breakdown: 45,
      transition: 15,
      vendor_arrival: 15,
      vendor_departure: 15,
      other: 60,
    };

    return durations[eventType || 'other'];
  }

  private static findNextAvailableSlot(
    startTime: Date,
    duration: number,
    bufferBefore: number,
    scheduledEvents: TimelineEvent[],
    constraints: SchedulingConstraints,
  ) {
    let potentialStart = addMinutes(startTime, bufferBefore);
    let potentialEnd = addMinutes(potentialStart, duration);

    // Check against all scheduled events
    while (
      this.hasTimeConflict(potentialStart, potentialEnd, scheduledEvents)
    ) {
      // Find the next gap
      const conflictingEvent = this.findConflictingEvent(
        potentialStart,
        potentialEnd,
        scheduledEvents,
      );
      if (conflictingEvent) {
        potentialStart = addMinutes(
          parseISO(conflictingEvent.end_time),
          bufferBefore,
        );
        potentialEnd = addMinutes(potentialStart, duration);
      } else {
        break;
      }
    }

    return {
      start: potentialStart,
      end: potentialEnd,
    };
  }

  private static findPreviousAvailableSlot(
    endTime: Date,
    duration: number,
    bufferAfter: number,
    scheduledEvents: TimelineEvent[],
    constraints: SchedulingConstraints,
  ) {
    let potentialEnd = subMinutes(endTime, bufferAfter);
    let potentialStart = subMinutes(potentialEnd, duration);

    // Check against all scheduled events
    while (
      this.hasTimeConflict(potentialStart, potentialEnd, scheduledEvents)
    ) {
      // Find the previous gap
      const conflictingEvent = this.findConflictingEvent(
        potentialStart,
        potentialEnd,
        scheduledEvents,
      );
      if (conflictingEvent) {
        potentialEnd = subMinutes(
          parseISO(conflictingEvent.start_time),
          bufferAfter,
        );
        potentialStart = subMinutes(potentialEnd, duration);
      } else {
        break;
      }
    }

    return {
      start: potentialStart,
      end: potentialEnd,
    };
  }

  private static hasTimeConflict(
    start: Date,
    end: Date,
    scheduledEvents: TimelineEvent[],
  ): boolean {
    return scheduledEvents.some((event) => {
      const eventStart = parseISO(event.start_time);
      const eventEnd = parseISO(event.end_time);

      return isBefore(start, eventEnd) && isBefore(eventStart, end);
    });
  }

  private static findConflictingEvent(
    start: Date,
    end: Date,
    scheduledEvents: TimelineEvent[],
  ): TimelineEvent | null {
    return (
      scheduledEvents.find((event) => {
        const eventStart = parseISO(event.start_time);
        const eventEnd = parseISO(event.end_time);

        return isBefore(start, eventEnd) && isBefore(eventStart, end);
      }) || null
    );
  }

  private static calculateEventBufferTime(
    event: TimelineEvent,
    position: 'before' | 'after',
    constraints: SchedulingConstraints,
  ): number {
    const bufferConfig =
      constraints.buffer_rules[event.event_type!] ||
      this.DEFAULT_BUFFER_RULES.other!;

    return position === 'before' ? bufferConfig.setup : bufferConfig.breakdown;
  }

  private static requiresVendorChangeover(
    event1: TimelineEvent,
    event2: TimelineEvent,
  ): boolean {
    // This would check if events require different primary vendors
    // For now, simplified implementation
    return event1.event_type !== event2.event_type;
  }

  private static requiresGuestTransition(event: TimelineEvent): boolean {
    const transitionEvents: EventType[] = [
      'ceremony',
      'cocktails',
      'reception',
      'dancing',
    ];
    return transitionEvents.includes(event.event_type!);
  }

  private static isComplexEvent(event: TimelineEvent): boolean {
    const complexEvents: EventType[] = [
      'reception',
      'ceremony',
      'entertainment',
    ];
    return complexEvents.includes(event.event_type!);
  }

  private static lookupTravelTime(
    from: string,
    to: string,
    distances: LocationDistance[],
  ): number {
    const distance = distances.find(
      (d) =>
        (d.from === from && d.to === to) || (d.from === to && d.to === from),
    );

    return distance?.travelMinutes || 15; // Default 15 minutes
  }

  private static groupEventsByVendor(
    events: TimelineEvent[],
  ): Record<string, TimelineEvent[]> {
    const vendorMap: Record<string, TimelineEvent[]> = {};

    events.forEach((event) => {
      event.vendors?.forEach((vendor) => {
        if (!vendorMap[vendor.vendor_id]) {
          vendorMap[vendor.vendor_id] = [];
        }
        vendorMap[vendor.vendor_id].push(event);
      });
    });

    return vendorMap;
  }

  private static calculateEventGap(
    event1: TimelineEvent,
    event2: TimelineEvent,
  ): number {
    const end1 = parseISO(event1.end_time);
    const start2 = parseISO(event2.start_time);
    return differenceInMinutes(start2, end1);
  }

  private static calculateOptimalVendorGap(
    event1: TimelineEvent,
    event2: TimelineEvent,
    constraints: SchedulingConstraints,
  ): number {
    // Minimum gap for vendor efficiency
    return 30; // 30 minutes optimal gap
  }

  private static detectTimeOverlapConflicts(
    events: TimelineEvent[],
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        const start1 = parseISO(event1.start_time);
        const end1 = parseISO(event1.end_time);
        const start2 = parseISO(event2.start_time);
        const end2 = parseISO(event2.end_time);

        if (isBefore(start1, end2) && isBefore(start2, end1)) {
          conflicts.push({
            type: 'time_overlap',
            severity: 'high',
            description: `Events "${event1.title}" and "${event2.title}" have overlapping times`,
            affected_events: [event1.id, event2.id],
            suggested_resolution: 'Adjust event times or duration',
          });
        }
      }
    }

    return conflicts;
  }

  private static detectVendorConflicts(
    events: TimelineEvent[],
  ): ConflictInfo[] {
    // Implementation for vendor conflict detection
    return [];
  }

  private static detectTravelTimeConflicts(
    events: TimelineEvent[],
    constraints: SchedulingConstraints,
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];

    for (let i = 0; i < events.length - 1; i++) {
      const currentEvent = events[i];
      const nextEvent = events[i + 1];

      if (
        !currentEvent.location ||
        !nextEvent.location ||
        currentEvent.location === nextEvent.location
      ) {
        continue;
      }

      const gap = this.calculateEventGap(currentEvent, nextEvent);
      const requiredTravelTime = this.lookupTravelTime(
        currentEvent.location,
        nextEvent.location,
        constraints.location_distances,
      );

      if (gap < requiredTravelTime) {
        conflicts.push({
          type: 'location_conflict',
          severity: 'medium',
          description: `Insufficient travel time between ${currentEvent.location} and ${nextEvent.location}`,
          affected_events: [currentEvent.id, nextEvent.id],
          suggested_resolution: 'Increase gap between events or relocate',
        });
      }
    }

    return conflicts;
  }

  private static detectBufferViolations(
    events: TimelineEvent[],
    constraints: SchedulingConstraints,
  ): ConflictInfo[] {
    // Implementation for buffer violation detection
    return [];
  }

  private static calculateVendorUtilization(
    events: TimelineEvent[],
  ): Record<string, number> {
    const utilization: Record<string, number> = {};

    // Calculate utilization for each vendor
    const vendorMap = this.groupEventsByVendor(events);

    Object.entries(vendorMap).forEach(([vendorId, vendorEvents]) => {
      if (vendorEvents.length === 0) {
        utilization[vendorId] = 0;
        return;
      }

      const totalEventTime = vendorEvents.reduce(
        (sum, event) => sum + (event.duration_minutes || 60),
        0,
      );

      const startTime = new Date(vendorEvents[0].start_time);
      const endTime = new Date(vendorEvents[vendorEvents.length - 1].end_time);
      const totalTimespan = differenceInMinutes(endTime, startTime);

      utilization[vendorId] =
        totalTimespan > 0
          ? Math.round((totalEventTime / totalTimespan) * 100)
          : 0;
    });

    return utilization;
  }

  private static findCriticalPath(events: TimelineEvent[]): string[] {
    // Find the sequence of critical events that determines the minimum timeline duration
    const criticalEvents = events
      .filter((event) => event.priority === 'critical')
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );

    return criticalEvents.map((event) => event.id);
  }
}
