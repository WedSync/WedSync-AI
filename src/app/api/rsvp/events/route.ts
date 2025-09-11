import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const CreateEventSchema = z.object({
  event_name: z.string().min(1, 'Event name is required'),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  event_time: z.string().optional(),
  venue_name: z.string().optional(),
  venue_address: z.string().optional(),
  max_guests: z.number().positive().optional(),
  rsvp_deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  allow_plus_ones: z.boolean().default(true),
  require_meal_selection: z.boolean().default(false),
  require_song_requests: z.boolean().default(false),
  custom_message: z.string().optional(),
  thank_you_message: z.string().optional(),
  reminder_settings: z
    .object({
      enabled: z.boolean().default(true),
      days_before: z.array(z.number()).default([30, 14, 7, 3, 1]),
    })
    .optional(),
  client_id: z.string().uuid().optional(),
});

// GET /api/rsvp/events - List all RSVP events for vendor
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch events with analytics
    const { data: events, error } = await supabase
      .from('rsvp_events')
      .select(
        `
        *,
        rsvp_analytics (
          total_invited,
          total_responded,
          total_attending,
          response_rate,
          total_guests_confirmed
        ),
        rsvp_invitations (count),
        rsvp_responses (count)
      `,
      )
      .eq('vendor_id', user.id)
      .order('event_date', { ascending: false });

    if (error) {
      console.error('Error fetching RSVP events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 },
      );
    }

    // Process events to include summary statistics
    const processedEvents = events?.map((event: any) => {
      const latestAnalytics = Array.isArray(event.rsvp_analytics)
        ? event.rsvp_analytics[0]
        : event.rsvp_analytics;

      return {
        ...event,
        stats: {
          total_invited: latestAnalytics?.total_invited || 0,
          total_responded: latestAnalytics?.total_responded || 0,
          total_attending: latestAnalytics?.total_attending || 0,
          response_rate: latestAnalytics?.response_rate || 0,
          total_guests_confirmed: latestAnalytics?.total_guests_confirmed || 0,
        },
      };
    });

    return NextResponse.json({ events: processedEvents });
  } catch (error) {
    console.error('Error in GET /api/rsvp/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/rsvp/events - Create new RSVP event
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = CreateEventSchema.parse(body);

    // Create event
    const { data: event, error } = await supabase
      .from('rsvp_events')
      .insert({
        ...validatedData,
        vendor_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating RSVP event:', error);
      return NextResponse.json(
        { error: 'Failed to create event' },
        { status: 500 },
      );
    }

    // Initialize analytics for the event
    await supabase.rpc('update_rsvp_analytics', { p_event_id: event.id });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 },
      );
    }
    console.error('Error in POST /api/rsvp/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
