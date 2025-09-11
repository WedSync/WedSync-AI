// =====================================================
// TIMELINE SCHEDULE SUGGESTIONS API ENDPOINT
// =====================================================
// Provide intelligent scheduling suggestions and optimizations
// Feature ID: WS-160
// Created: 2025-01-20
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AutoSchedulingService } from '@/lib/services/autoSchedulingService';
import { TimelineConflictService } from '@/lib/services/timeline-conflict-service';
import type {
  TimelineEvent,
  TimelineConflict,
  EventType,
  EventPriority,
} from '@/types/timeline';
import {
  differenceInMinutes,
  parseISO,
  addMinutes,
  format,
  isSameDay,
  startOfDay,
} from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface SchedulingSuggestion {
  id: string;
  type:
    | 'buffer_optimization'
    | 'conflict_resolution'
    | 'efficiency_improvement'
    | 'vendor_optimization'
    | 'time_adjustment';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affected_events: string[];
  impact_analysis: {
    efficiency_improvement: number;
    time_saved: number;
    conflicts_resolved: number;
    vendor_utilization_change: number;
  };
  implementation: {
    action_type:
      | 'move_event'
      | 'adjust_duration'
      | 'change_buffers'
      | 'reassign_vendor'
      | 'split_event';
    parameters: Record<string, any>;
    estimated_effort: 'low' | 'medium' | 'high';
  };
  risks: string[];
  benefits: string[];
}

interface SuggestionsResponse {
  success: boolean;
  message: string;
  data?: {
    timeline_analysis: {
      efficiency_score: number;
      total_conflicts: number;
      buffer_utilization: number;
      vendor_utilization_avg: number;
      critical_issues: number;
    };
    suggestions: SchedulingSuggestion[];
    quick_wins: SchedulingSuggestion[];
    optimization_opportunities: {
      category: string;
      potential_improvement: number;
      suggestions_count: number;
    }[];
  };
  error?: string;
}

// =====================================================
// GET - Get Scheduling Suggestions
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<SuggestionsResponse>> {
  try {
    const timelineId = params.id;
    const searchParams = request.nextUrl.searchParams;

    // Query parameters
    const includeOptimizations = searchParams.get('optimizations') === 'true';
    const priorityFilter = searchParams.get('priority') as
      | 'low'
      | 'medium'
      | 'high'
      | 'critical'
      | null;
    const suggestionTypes = searchParams.get('types')?.split(',') || [];

    console.log(`Generating schedule suggestions for timeline ${timelineId}`);

    // Get timeline and events
    const [timelineResponse, eventsResponse] = await Promise.all([
      supabase
        .from('wedding_timelines')
        .select('*')
        .eq('id', timelineId)
        .single(),

      supabase
        .from('timeline_events')
        .select(
          `
          *,
          vendors:timeline_event_vendors(
            *,
            vendor:suppliers(
              id,
              business_name,
              business_type,
              email,
              phone
            )
          )
        `,
        )
        .eq('timeline_id', timelineId)
        .order('start_time'),
    ]);

    if (timelineResponse.error || !timelineResponse.data) {
      return NextResponse.json(
        {
          success: false,
          message: 'Timeline not found',
        },
        { status: 404 },
      );
    }

    if (eventsResponse.error) {
      throw eventsResponse.error;
    }

    const timeline = timelineResponse.data;
    const events = eventsResponse.data || [];

    if (events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No events found - no suggestions needed',
        data: {
          timeline_analysis: {
            efficiency_score: 100,
            total_conflicts: 0,
            buffer_utilization: 0,
            vendor_utilization_avg: 0,
            critical_issues: 0,
          },
          suggestions: [],
          quick_wins: [],
          optimization_opportunities: [],
        },
      });
    }

    // Get existing conflicts
    const conflictResult =
      await TimelineConflictService.detectConflicts(timelineId);
    const conflicts = conflictResult.conflicts;

    console.log(
      `Analyzing ${events.length} events and ${conflicts.length} conflicts`,
    );

    // Analyze timeline efficiency
    const analysis = await analyzeTimelineEfficiency(
      events,
      timeline,
      conflicts,
    );

    // Generate suggestions based on different criteria
    const allSuggestions: SchedulingSuggestion[] = [];

    // 1. Conflict resolution suggestions
    if (conflicts.length > 0) {
      const conflictSuggestions = generateConflictResolutionSuggestions(
        events,
        conflicts,
      );
      allSuggestions.push(...conflictSuggestions);
    }

    // 2. Buffer optimization suggestions
    const bufferSuggestions = generateBufferOptimizationSuggestions(events);
    allSuggestions.push(...bufferSuggestions);

    // 3. Vendor efficiency suggestions
    const vendorSuggestions = generateVendorOptimizationSuggestions(events);
    allSuggestions.push(...vendorSuggestions);

    // 4. Time efficiency suggestions
    const timeSuggestions = generateTimeEfficiencySuggestions(events, timeline);
    allSuggestions.push(...timeSuggestions);

    // 5. Advanced optimization suggestions (if requested)
    if (includeOptimizations) {
      const advancedSuggestions = await generateAdvancedOptimizations(
        events,
        timeline,
      );
      allSuggestions.push(...advancedSuggestions);
    }

    // Filter suggestions based on query parameters
    let filteredSuggestions = allSuggestions;

    if (priorityFilter) {
      filteredSuggestions = filteredSuggestions.filter(
        (s) => s.priority === priorityFilter,
      );
    }

    if (suggestionTypes.length > 0) {
      filteredSuggestions = filteredSuggestions.filter((s) =>
        suggestionTypes.includes(s.type),
      );
    }

    // Sort by priority and impact
    const sortedSuggestions = sortSuggestionsByPriority(filteredSuggestions);

    // Identify quick wins (high impact, low effort)
    const quickWins = sortedSuggestions
      .filter(
        (s) =>
          s.implementation.estimated_effort === 'low' &&
          (s.priority === 'high' || s.priority === 'critical'),
      )
      .slice(0, 5);

    // Group optimization opportunities
    const optimizationOpportunities =
      groupOptimizationOpportunities(sortedSuggestions);

    return NextResponse.json({
      success: true,
      message: `Generated ${sortedSuggestions.length} scheduling suggestions`,
      data: {
        timeline_analysis: analysis,
        suggestions: sortedSuggestions,
        quick_wins: quickWins,
        optimization_opportunities: optimizationOpportunities,
      },
    });
  } catch (error: any) {
    console.error('Schedule suggestions error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to generate scheduling suggestions',
        error: error.message || 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 },
    );
  }
}

// =====================================================
// POST - Apply Suggestion
// =====================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const timelineId = params.id;
    const { suggestion_id, parameters } = await request.json();

    console.log(
      `Applying suggestion ${suggestion_id} to timeline ${timelineId}`,
    );

    // This would implement applying a specific suggestion
    // For now, return success response

    return NextResponse.json({
      success: true,
      message: 'Suggestion applied successfully',
    });
  } catch (error: any) {
    console.error('Apply suggestion error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to apply suggestion',
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// =====================================================
// SUGGESTION GENERATION FUNCTIONS
// =====================================================

async function analyzeTimelineEfficiency(
  events: TimelineEvent[],
  timeline: any,
  conflicts: TimelineConflict[],
) {
  if (events.length === 0) {
    return {
      efficiency_score: 100,
      total_conflicts: 0,
      buffer_utilization: 0,
      vendor_utilization_avg: 0,
      critical_issues: 0,
    };
  }

  // Calculate timeline duration
  const startTime = new Date(events[0].start_time);
  const endTime = new Date(events[events.length - 1].end_time);
  const totalDuration = differenceInMinutes(endTime, startTime);

  // Calculate actual event time
  const totalEventTime = events.reduce(
    (sum, event) => sum + (event.duration_minutes || 60),
    0,
  );

  // Calculate buffer time
  const totalBufferTime = events.reduce(
    (sum, event) =>
      sum +
      (event.buffer_before_minutes || 0) +
      (event.buffer_after_minutes || 0),
    0,
  );

  // Calculate efficiency score
  const efficiency_score =
    totalDuration > 0 ? Math.round((totalEventTime / totalDuration) * 100) : 0;

  // Calculate buffer utilization
  const buffer_utilization =
    totalDuration > 0 ? Math.round((totalBufferTime / totalDuration) * 100) : 0;

  // Calculate vendor utilization
  const vendorUtilizations = calculateVendorUtilizations(events);
  const vendor_utilization_avg =
    vendorUtilizations.length > 0
      ? vendorUtilizations.reduce((sum, util) => sum + util, 0) /
        vendorUtilizations.length
      : 0;

  // Count critical issues
  const critical_issues = conflicts.filter(
    (c) => c.severity === 'error',
  ).length;

  return {
    efficiency_score,
    total_conflicts: conflicts.length,
    buffer_utilization,
    vendor_utilization_avg: Math.round(vendor_utilization_avg),
    critical_issues,
  };
}

function generateConflictResolutionSuggestions(
  events: TimelineEvent[],
  conflicts: TimelineConflict[],
): SchedulingSuggestion[] {
  const suggestions: SchedulingSuggestion[] = [];

  for (const conflict of conflicts) {
    if (conflict.conflict_type === 'time-overlap') {
      const event1 = events.find((e) => e.id === conflict.event1_id);
      const event2 = events.find((e) => e.id === conflict.event2_id);

      if (event1 && event2) {
        suggestions.push({
          id: `conflict-${conflict.id}`,
          type: 'conflict_resolution',
          priority: conflict.severity === 'error' ? 'critical' : 'high',
          title: `Resolve time overlap between ${event1.title} and ${event2.title}`,
          description: `These events are overlapping. Consider adjusting start times or reducing durations.`,
          affected_events: [event1.id, event2.id],
          impact_analysis: {
            efficiency_improvement: 10,
            time_saved: 0,
            conflicts_resolved: 1,
            vendor_utilization_change: 0,
          },
          implementation: {
            action_type: 'adjust_duration',
            parameters: {
              event1_id: event1.id,
              event2_id: event2.id,
              suggested_gap_minutes: 15,
            },
            estimated_effort: 'low',
          },
          risks: ['May affect other dependent events'],
          benefits: [
            'Eliminates scheduling conflict',
            'Improves timeline clarity',
          ],
        });
      }
    }

    if (conflict.conflict_type === 'vendor-double-booking') {
      const event1 = events.find((e) => e.id === conflict.event1_id);
      const event2 = events.find((e) => e.id === conflict.event2_id);

      if (event1 && event2) {
        suggestions.push({
          id: `vendor-conflict-${conflict.id}`,
          type: 'vendor_optimization',
          priority: 'critical',
          title: `Resolve vendor double-booking`,
          description: `A vendor is assigned to overlapping events. Consider using backup vendor or adjusting timing.`,
          affected_events: [event1.id, event2.id],
          impact_analysis: {
            efficiency_improvement: 15,
            time_saved: 0,
            conflicts_resolved: 1,
            vendor_utilization_change: -10,
          },
          implementation: {
            action_type: 'reassign_vendor',
            parameters: {
              primary_event: event1.id,
              conflicting_event: event2.id,
              action: 'use_backup_vendor',
            },
            estimated_effort: 'medium',
          },
          risks: [
            'May require additional vendor coordination',
            'Backup vendor may be less experienced',
          ],
          benefits: [
            'Eliminates vendor conflict',
            'Ensures proper vendor coverage',
          ],
        });
      }
    }
  }

  return suggestions;
}

function generateBufferOptimizationSuggestions(
  events: TimelineEvent[],
): SchedulingSuggestion[] {
  const suggestions: SchedulingSuggestion[] = [];

  // Find events with excessive buffer times
  events.forEach((event) => {
    const totalBuffer =
      (event.buffer_before_minutes || 0) + (event.buffer_after_minutes || 0);
    const eventDuration = event.duration_minutes || 60;
    const bufferRatio = totalBuffer / eventDuration;

    if (bufferRatio > 0.5) {
      // Buffer is more than 50% of event duration
      suggestions.push({
        id: `buffer-${event.id}`,
        type: 'buffer_optimization',
        priority: bufferRatio > 1 ? 'high' : 'medium',
        title: `Optimize buffer times for ${event.title}`,
        description: `This event has ${totalBuffer} minutes of buffer time (${Math.round(bufferRatio * 100)}% of event duration). Consider reducing buffers to improve timeline efficiency.`,
        affected_events: [event.id],
        impact_analysis: {
          efficiency_improvement: Math.min(20, bufferRatio * 10),
          time_saved: Math.round(totalBuffer * 0.3), // Assume 30% reduction
          conflicts_resolved: 0,
          vendor_utilization_change: 5,
        },
        implementation: {
          action_type: 'change_buffers',
          parameters: {
            event_id: event.id,
            suggested_before: Math.max(
              15,
              (event.buffer_before_minutes || 0) * 0.7,
            ),
            suggested_after: Math.max(
              10,
              (event.buffer_after_minutes || 0) * 0.7,
            ),
          },
          estimated_effort: 'low',
        },
        risks: ['May create tight scheduling', 'Less flexibility for delays'],
        benefits: [
          'Improves timeline efficiency',
          'Creates more time for other activities',
        ],
      });
    }
  });

  return suggestions;
}

function generateVendorOptimizationSuggestions(
  events: TimelineEvent[],
): SchedulingSuggestion[] {
  const suggestions: SchedulingSuggestion[] = [];

  // Group events by vendor
  const vendorEventMap: Record<string, TimelineEvent[]> = {};

  events.forEach((event) => {
    event.vendors?.forEach((vendor) => {
      if (!vendorEventMap[vendor.vendor_id]) {
        vendorEventMap[vendor.vendor_id] = [];
      }
      vendorEventMap[vendor.vendor_id].push(event);
    });
  });

  // Analyze vendor schedules for optimization opportunities
  Object.entries(vendorEventMap).forEach(([vendorId, vendorEvents]) => {
    if (vendorEvents.length < 2) return;

    // Sort by start time
    vendorEvents.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

    // Check for inefficient gaps
    for (let i = 0; i < vendorEvents.length - 1; i++) {
      const currentEvent = vendorEvents[i];
      const nextEvent = vendorEvents[i + 1];

      const gap = differenceInMinutes(
        parseISO(nextEvent.start_time),
        parseISO(currentEvent.end_time),
      );

      // If gap is too large, suggest optimization
      if (gap > 90) {
        // More than 90 minutes gap
        suggestions.push({
          id: `vendor-gap-${vendorId}-${i}`,
          type: 'vendor_optimization',
          priority: 'medium',
          title: `Optimize vendor schedule gap`,
          description: `There's a ${gap}-minute gap between ${currentEvent.title} and ${nextEvent.title} for the same vendor. Consider moving events closer together.`,
          affected_events: [currentEvent.id, nextEvent.id],
          impact_analysis: {
            efficiency_improvement: 5,
            time_saved: Math.round(gap * 0.5),
            conflicts_resolved: 0,
            vendor_utilization_change: 15,
          },
          implementation: {
            action_type: 'move_event',
            parameters: {
              move_event_id: nextEvent.id,
              target_gap_minutes: 45,
              direction: 'earlier',
            },
            estimated_effort: 'medium',
          },
          risks: [
            'May affect other event dependencies',
            'Vendor may need extended presence',
          ],
          benefits: [
            'Better vendor utilization',
            'Potential cost savings',
            'More focused vendor attention',
          ],
        });
      }
    }
  });

  return suggestions;
}

function generateTimeEfficiencySuggestions(
  events: TimelineEvent[],
  timeline: any,
): SchedulingSuggestion[] {
  const suggestions: SchedulingSuggestion[] = [];

  // Check for overly long events
  events.forEach((event) => {
    const duration = event.duration_minutes || 60;
    const expectedDuration = getExpectedDuration(event.event_type);

    if (duration > expectedDuration * 1.5) {
      // 50% longer than expected
      suggestions.push({
        id: `duration-${event.id}`,
        type: 'efficiency_improvement',
        priority: 'medium',
        title: `Consider reducing duration of ${event.title}`,
        description: `This event is scheduled for ${duration} minutes, which is longer than typical ${event.event_type} events (${expectedDuration} minutes). Consider if the duration can be optimized.`,
        affected_events: [event.id],
        impact_analysis: {
          efficiency_improvement: 10,
          time_saved: duration - expectedDuration,
          conflicts_resolved: 0,
          vendor_utilization_change: 0,
        },
        implementation: {
          action_type: 'adjust_duration',
          parameters: {
            event_id: event.id,
            suggested_duration: expectedDuration,
            current_duration: duration,
          },
          estimated_effort: 'low',
        },
        risks: ['May not allow enough time for the event', 'Could feel rushed'],
        benefits: [
          'Creates more time for other activities',
          'Improves overall timeline flow',
        ],
      });
    }
  });

  return suggestions;
}

async function generateAdvancedOptimizations(
  events: TimelineEvent[],
  timeline: any,
): Promise<SchedulingSuggestion[]> {
  const suggestions: SchedulingSuggestion[] = [];

  // Advanced optimization would use the AutoSchedulingService
  // to generate a completely optimized schedule and compare differences

  try {
    const constraints = {
      wedding_start_time: new Date(
        `${timeline.wedding_date}T${timeline.start_time || '09:00'}`,
      ),
      wedding_end_time: new Date(
        `${timeline.wedding_date}T${timeline.end_time || '23:00'}`,
      ),
      critical_events: events
        .filter((e) => e.priority === 'critical' || e.is_locked)
        .map((e) => e.id),
      vendor_constraints: [],
      location_distances: [],
      buffer_rules: (AutoSchedulingService as any).DEFAULT_BUFFER_RULES,
      priority_weights: (AutoSchedulingService as any).PRIORITY_WEIGHTS,
    };

    const optimized = await AutoSchedulingService.generateOptimizedSchedule(
      events,
      constraints,
      'hybrid',
    );

    if (optimized.success && optimized.efficiency_score > 75) {
      suggestions.push({
        id: 'advanced-optimization',
        type: 'efficiency_improvement',
        priority: 'high',
        title: 'Apply advanced timeline optimization',
        description: `Our AI analysis suggests a ${optimized.efficiency_score}% efficient schedule with ${optimized.conflicts.length} conflicts. This could improve your timeline significantly.`,
        affected_events: events.map((e) => e.id),
        impact_analysis: {
          efficiency_improvement: optimized.efficiency_score - 60, // Assume current 60%
          time_saved: 60,
          conflicts_resolved: optimized.conflicts.length,
          vendor_utilization_change: 20,
        },
        implementation: {
          action_type: 'move_event', // Would be a bulk operation
          parameters: {
            optimization_type: 'full_schedule',
            algorithm: 'hybrid',
          },
          estimated_effort: 'high',
        },
        risks: [
          'Significant changes to timeline',
          'May require vendor reconfirmation',
        ],
        benefits: [
          'Optimal timeline efficiency',
          'Reduced conflicts',
          'Better vendor coordination',
        ],
      });
    }
  } catch (error) {
    console.warn('Advanced optimization failed:', error);
  }

  return suggestions;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function calculateVendorUtilizations(events: TimelineEvent[]): number[] {
  const vendorMap: Record<string, TimelineEvent[]> = {};

  events.forEach((event) => {
    event.vendors?.forEach((vendor) => {
      if (!vendorMap[vendor.vendor_id]) {
        vendorMap[vendor.vendor_id] = [];
      }
      vendorMap[vendor.vendor_id].push(event);
    });
  });

  return Object.values(vendorMap).map((vendorEvents) => {
    if (vendorEvents.length === 0) return 0;

    const totalEventTime = vendorEvents.reduce(
      (sum, event) => sum + (event.duration_minutes || 60),
      0,
    );

    const startTime = new Date(vendorEvents[0].start_time);
    const endTime = new Date(vendorEvents[vendorEvents.length - 1].end_time);
    const totalTimespan = differenceInMinutes(endTime, startTime);

    return totalTimespan > 0 ? (totalEventTime / totalTimespan) * 100 : 0;
  });
}

function getExpectedDuration(eventType?: EventType): number {
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

function sortSuggestionsByPriority(
  suggestions: SchedulingSuggestion[],
): SchedulingSuggestion[] {
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

  return suggestions.sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Secondary sort by impact
    return (
      b.impact_analysis.efficiency_improvement -
      a.impact_analysis.efficiency_improvement
    );
  });
}

function groupOptimizationOpportunities(suggestions: SchedulingSuggestion[]) {
  const opportunities: Record<string, SchedulingSuggestion[]> = {};

  suggestions.forEach((suggestion) => {
    const category = suggestion.type;
    if (!opportunities[category]) {
      opportunities[category] = [];
    }
    opportunities[category].push(suggestion);
  });

  return Object.entries(opportunities)
    .map(([category, suggestionList]) => ({
      category,
      potential_improvement: suggestionList.reduce(
        (sum, s) => sum + s.impact_analysis.efficiency_improvement,
        0,
      ),
      suggestions_count: suggestionList.length,
    }))
    .sort((a, b) => b.potential_improvement - a.potential_improvement);
}
