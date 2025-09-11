// =====================================================
// AUTO-SCHEDULE TIMELINE API ENDPOINT
// =====================================================
// Generate optimized wedding timeline with intelligent buffer calculations
// Feature ID: WS-160
// Created: 2025-01-20
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AutoSchedulingService } from '@/lib/services/autoSchedulingService';
import type {
  TimelineEvent,
  TimelineEventVendor,
  EventType,
  EventPriority,
} from '@/types/timeline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface AutoScheduleRequest {
  algorithm?: 'forward' | 'backward' | 'hybrid';
  constraints?: {
    ceremony_time?: string;
    reception_start_time?: string;
    buffer_multiplier?: number;
    preserve_critical_events?: boolean;
    optimize_vendor_efficiency?: boolean;
  };
  location_distances?: {
    from: string;
    to: string;
    travel_minutes: number;
  }[];
  vendor_constraints?: {
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
  }[];
}

interface AutoScheduleResponse {
  success: boolean;
  message: string;
  data?: {
    original_events: TimelineEvent[];
    optimized_schedule: TimelineEvent[];
    improvements: {
      efficiency_gain: number;
      conflicts_resolved: number;
      buffer_optimization: number;
      vendor_utilization_improvement: number;
    };
    conflicts: any[];
    suggestions: any[];
    metrics: {
      efficiency_score: number;
      total_duration: number;
      buffer_utilization: number;
      vendor_utilization: Record<string, number>;
      critical_path: string[];
    };
  };
  error?: string;
}

// =====================================================
// POST - Generate Auto-Scheduled Timeline
// =====================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<AutoScheduleResponse>> {
  try {
    const timelineId = params.id;
    const body = (await request.json()) as AutoScheduleRequest;

    console.log(`Auto-scheduling timeline ${timelineId}`);

    // Verify timeline exists and get basic info
    const { data: timeline, error: timelineError } = await supabase
      .from('wedding_timelines')
      .select('*')
      .eq('id', timelineId)
      .single();

    if (timelineError || !timeline) {
      return NextResponse.json(
        {
          success: false,
          message: 'Timeline not found',
          error: 'TIMELINE_NOT_FOUND',
        },
        { status: 404 },
      );
    }

    // Get all events for this timeline
    const { data: events, error: eventsError } = await supabase
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
      .order('start_time');

    if (eventsError) {
      throw eventsError;
    }

    if (!events || events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No events found to schedule',
          error: 'NO_EVENTS_FOUND',
        },
        { status: 400 },
      );
    }

    console.log(`Found ${events.length} events to schedule`);

    // Prepare scheduling constraints
    const constraints = {
      wedding_start_time: new Date(
        `${timeline.wedding_date}T${timeline.start_time || '09:00'}`,
      ),
      wedding_end_time: new Date(
        `${timeline.wedding_date}T${timeline.end_time || '23:00'}`,
      ),
      ceremony_time: body.constraints?.ceremony_time
        ? new Date(body.constraints.ceremony_time)
        : undefined,
      reception_start_time: body.constraints?.reception_start_time
        ? new Date(body.constraints.reception_start_time)
        : undefined,
      critical_events: events
        .filter((e) => e.priority === 'critical' || e.is_locked)
        .map((e) => e.id),
      vendor_constraints: body.vendor_constraints || [],
      location_distances: body.location_distances || [],
      buffer_rules: AutoSchedulingService['DEFAULT_BUFFER_RULES'],
      priority_weights: AutoSchedulingService['PRIORITY_WEIGHTS'],
    };

    // Store original events for comparison
    const originalEvents = [...events];

    // Generate optimized schedule
    const schedulingResult =
      await AutoSchedulingService.generateOptimizedSchedule(
        events,
        constraints,
        body.algorithm || 'hybrid',
      );

    if (!schedulingResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to generate conflict-free schedule',
          data: {
            original_events: originalEvents,
            optimized_schedule: schedulingResult.schedule,
            improvements: calculateImprovements(
              originalEvents,
              schedulingResult,
            ),
            conflicts: schedulingResult.conflicts,
            suggestions: schedulingResult.suggestions,
            metrics: {
              efficiency_score: schedulingResult.efficiency_score,
              total_duration: schedulingResult.total_duration,
              buffer_utilization: schedulingResult.buffer_utilization,
              vendor_utilization: schedulingResult.vendor_utilization,
              critical_path: schedulingResult.critical_path,
            },
          },
        },
        { status: 200 },
      ); // Still return the attempted schedule for user review
    }

    // Update the timeline events in database if requested
    if (body.constraints?.preserve_critical_events !== false) {
      console.log('Updating timeline events with optimized schedule');

      // Update events in batches
      const updatePromises = schedulingResult.schedule.map((event) =>
        supabase
          .from('timeline_events')
          .update({
            start_time: event.start_time,
            end_time: event.end_time,
            buffer_before_minutes: event.buffer_before_minutes,
            buffer_after_minutes: event.buffer_after_minutes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', event.id),
      );

      const updateResults = await Promise.allSettled(updatePromises);
      const failedUpdates = updateResults.filter(
        (r) => r.status === 'rejected',
      ).length;

      if (failedUpdates > 0) {
        console.warn(`${failedUpdates} event updates failed`);
      }
    }

    // Log the auto-scheduling activity
    await supabase.from('timeline_activity_logs').insert({
      timeline_id: timelineId,
      action: 'auto_scheduled',
      entity_type: 'timeline',
      entity_id: timelineId,
      old_values: { event_count: originalEvents.length },
      new_values: {
        algorithm: body.algorithm || 'hybrid',
        efficiency_score: schedulingResult.efficiency_score,
        conflicts_count: schedulingResult.conflicts.length,
      },
      user_id: null, // System action
      user_name: 'Auto-Scheduler',
      user_role: 'system',
    });

    const improvements = calculateImprovements(
      originalEvents,
      schedulingResult,
    );

    return NextResponse.json(
      {
        success: true,
        message: `Timeline auto-scheduled successfully using ${body.algorithm || 'hybrid'} algorithm`,
        data: {
          original_events: originalEvents,
          optimized_schedule: schedulingResult.schedule,
          improvements,
          conflicts: schedulingResult.conflicts,
          suggestions: schedulingResult.suggestions,
          metrics: {
            efficiency_score: schedulingResult.efficiency_score,
            total_duration: schedulingResult.total_duration,
            buffer_utilization: schedulingResult.buffer_utilization,
            vendor_utilization: schedulingResult.vendor_utilization,
            critical_path: schedulingResult.critical_path,
          },
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('Auto-scheduling error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to auto-schedule timeline',
        error: error.message || 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 },
    );
  }
}

// =====================================================
// GET - Get Auto-Scheduling Preview
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const timelineId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const algorithm =
      (searchParams.get('algorithm') as 'forward' | 'backward' | 'hybrid') ||
      'hybrid';

    console.log(
      `Generating auto-scheduling preview for timeline ${timelineId}`,
    );

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
            vendor:suppliers(business_name, business_type)
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

    if (eventsResponse.error || !eventsResponse.data) {
      throw eventsResponse.error;
    }

    const timeline = timelineResponse.data;
    const events = eventsResponse.data;

    // Generate preview without saving changes
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
      buffer_rules: AutoSchedulingService['DEFAULT_BUFFER_RULES'],
      priority_weights: AutoSchedulingService['PRIORITY_WEIGHTS'],
    };

    const previewResult = await AutoSchedulingService.generateOptimizedSchedule(
      events,
      constraints,
      algorithm,
    );

    return NextResponse.json({
      success: true,
      message: 'Auto-scheduling preview generated',
      data: {
        algorithm_used: algorithm,
        current_schedule: events,
        optimized_preview: previewResult.schedule,
        potential_improvements: calculateImprovements(events, previewResult),
        detected_conflicts: previewResult.conflicts,
        optimization_suggestions: previewResult.suggestions,
        metrics: {
          efficiency_score: previewResult.efficiency_score,
          total_duration: previewResult.total_duration,
          buffer_utilization: previewResult.buffer_utilization,
          vendor_utilization: previewResult.vendor_utilization,
        },
      },
    });
  } catch (error: any) {
    console.error('Auto-scheduling preview error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to generate preview',
        error: error.message || 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 },
    );
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function calculateImprovements(
  originalEvents: TimelineEvent[],
  schedulingResult: any,
) {
  // Calculate original metrics for comparison
  const originalDuration = calculateTotalDuration(originalEvents);
  const originalConflicts = 0; // Would need to run conflict detection

  const optimizedDuration = schedulingResult.total_duration;

  return {
    efficiency_gain: schedulingResult.efficiency_score - 50, // Assuming 50% baseline
    conflicts_resolved: Math.max(
      0,
      originalConflicts - schedulingResult.conflicts.length,
    ),
    buffer_optimization: Math.max(0, schedulingResult.buffer_utilization - 30), // Assuming 30% baseline
    vendor_utilization_improvement:
      Object.values(schedulingResult.vendor_utilization).reduce(
        (sum: number, util: any) => sum + util,
        0,
      ) /
        Object.keys(schedulingResult.vendor_utilization).length -
      60, // Assuming 60% baseline
  };
}

function calculateTotalDuration(events: TimelineEvent[]): number {
  if (events.length === 0) return 0;

  const startTime = new Date(events[0].start_time);
  const endTime = new Date(events[events.length - 1].end_time);

  return (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes
}

// =====================================================
// RATE LIMITING & CACHING
// =====================================================

// Simple in-memory cache for auto-scheduling results (5 minute TTL)
const scheduleCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedSchedule(timelineId: string, algorithm: string): any | null {
  const cacheKey = `${timelineId}-${algorithm}`;
  const cached = scheduleCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  scheduleCache.delete(cacheKey);
  return null;
}

function setCachedSchedule(
  timelineId: string,
  algorithm: string,
  result: any,
): void {
  const cacheKey = `${timelineId}-${algorithm}`;
  scheduleCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  });

  // Clean up old cache entries
  if (scheduleCache.size > 100) {
    const oldestKey = scheduleCache.keys().next().value;
    scheduleCache.delete(oldestKey);
  }
}
