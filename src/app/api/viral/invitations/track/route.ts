import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InvitationTracker } from '@/lib/services/invitation-tracker';
import { z } from 'zod';

const TrackEventSchema = z.object({
  invitation_id: z.string().uuid(),
  event_type: z.enum([
    'sent',
    'delivered',
    'opened',
    'clicked',
    'accepted',
    'declined',
    'bounced',
    'spam',
  ]),
  timestamp: z.string().datetime().optional(),
  user_agent: z.string().optional(),
  ip_address: z.string().optional(),
  location_data: z
    .object({
      country: z.string().optional(),
      region: z.string().optional(),
      city: z.string().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
  device_info: z
    .object({
      device_type: z.string().optional(),
      browser: z.string().optional(),
      os: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
});

const BatchTrackSchema = z.object({
  events: z.array(TrackEventSchema).min(1).max(100),
});

/**
 * POST /api/viral/invitations/track
 * Track invitation events (sent, delivered, opened, clicked, accepted)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Handle both single event and batch events
    const isBatch = Array.isArray(body.events);
    let validatedData;

    if (isBatch) {
      validatedData = BatchTrackSchema.parse(body);
    } else {
      const singleEvent = TrackEventSchema.parse(body);
      validatedData = { events: [singleEvent] };
    }

    const invitationTracker = new InvitationTracker(supabase);
    const results = await invitationTracker.trackEvents(validatedData.events);

    return NextResponse.json({
      success: true,
      data: {
        tracked_events: results.trackedEvents,
        failed_events: results.failedEvents,
        total_tracked: results.trackedEvents.length,
        total_failed: results.failedEvents.length,
      },
      message: `${results.trackedEvents.length} events tracked successfully`,
    });
  } catch (error) {
    console.error('Event tracking error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid event data',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to track events',
        code: 'TRACKING_ERROR',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/viral/invitations/track
 * Get invitation tracking events and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication for analytics access
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const queryParams = {
      invitation_id: url.searchParams.get('invitation_id'),
      event_type: url.searchParams.get('event_type'),
      date_from: url.searchParams.get('date_from'),
      date_to: url.searchParams.get('date_to'),
      aggregation: url.searchParams.get('aggregation') || 'none',
      group_by: url.searchParams.get('group_by') || 'event_type',
    };

    const invitationTracker = new InvitationTracker(supabase);

    if (queryParams.invitation_id) {
      // Get events for specific invitation
      const events = await invitationTracker.getInvitationEvents({
        invitationId: queryParams.invitation_id,
        userId: user.id,
        eventType: queryParams.event_type,
        dateFrom: queryParams.date_from,
        dateTo: queryParams.date_to,
      });

      return NextResponse.json({
        success: true,
        data: events,
        metadata: {
          invitation_id: queryParams.invitation_id,
          total_events: events.length,
        },
      });
    } else if (queryParams.aggregation !== 'none') {
      // Get aggregated analytics
      const analytics = await invitationTracker.getTrackingAnalytics({
        userId: user.id,
        dateFrom: queryParams.date_from,
        dateTo: queryParams.date_to,
        groupBy: queryParams.group_by,
        eventType: queryParams.event_type,
      });

      return NextResponse.json({
        success: true,
        data: analytics,
        metadata: {
          aggregation: queryParams.aggregation,
          group_by: queryParams.group_by,
          date_range: {
            from: queryParams.date_from,
            to: queryParams.date_to,
          },
        },
      });
    } else {
      return NextResponse.json(
        {
          error: 'Either invitation_id or aggregation=true must be specified',
          code: 'INVALID_PARAMS',
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Tracking analytics error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve tracking data',
        code: 'ANALYTICS_ERROR',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/viral/invitations/track
 * Update tracking event data
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { event_id, updates } = body;

    if (!event_id) {
      return NextResponse.json(
        { error: 'event_id is required', code: 'MISSING_EVENT_ID' },
        { status: 400 },
      );
    }

    const invitationTracker = new InvitationTracker(supabase);
    const updatedEvent = await invitationTracker.updateTrackingEvent({
      eventId: event_id,
      updates,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: updatedEvent,
      message: 'Tracking event updated successfully',
    });
  } catch (error) {
    console.error('Tracking event update error:', error);

    return NextResponse.json(
      {
        error: 'Failed to update tracking event',
        code: 'UPDATE_ERROR',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/viral/invitations/track
 * Delete tracking events (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication and admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { event_ids, invitation_id, before_date } = body;

    const invitationTracker = new InvitationTracker(supabase);
    const result = await invitationTracker.deleteTrackingEvents({
      eventIds: event_ids,
      invitationId: invitation_id,
      beforeDate: before_date,
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted_count: result.deletedCount,
      },
      message: `${result.deletedCount} tracking events deleted successfully`,
    });
  } catch (error) {
    console.error('Tracking event delete error:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete tracking events',
        code: 'DELETE_ERROR',
      },
      { status: 500 },
    );
  }
}
