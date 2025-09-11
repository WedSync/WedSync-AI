import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Update schema (all fields optional)
const UpdateEventSchema = z.object({
  event_name: z.string().min(1).optional(),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  event_time: z.string().optional(),
  venue_name: z.string().optional(),
  venue_address: z.string().optional(),
  max_guests: z.number().positive().optional(),
  rsvp_deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  allow_plus_ones: z.boolean().optional(),
  require_meal_selection: z.boolean().optional(),
  require_song_requests: z.boolean().optional(),
  custom_message: z.string().optional(),
  thank_you_message: z.string().optional(),
  reminder_settings: z
    .object({
      enabled: z.boolean(),
      days_before: z.array(z.number()),
    })
    .optional(),
});

// GET /api/rsvp/events/[id] - Get single event with full details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    // Fetch event with all related data
    const { data: event, error } = await supabase
      .from('rsvp_events')
      .select(
        `
        *,
        rsvp_custom_questions (
          id,
          question_text,
          question_type,
          required,
          options,
          display_order
        ),
        rsvp_meal_options (
          id,
          meal_name,
          meal_description,
          meal_type,
          max_quantity,
          price,
          allergen_info,
          display_order,
          is_available
        ),
        rsvp_invitations (
          id,
          guest_name,
          guest_email,
          guest_phone,
          invitation_code,
          max_party_size,
          is_vip,
          table_assignment,
          invitation_sent_at,
          opened_at
        ),
        rsvp_responses (
          id,
          response_status,
          party_size,
          responded_at,
          response_source,
          notes,
          rsvp_guest_details (
            id,
            guest_name,
            is_primary,
            meal_preference,
            dietary_restrictions,
            allergies,
            song_request,
            special_needs,
            age_group
          )
        ),
        rsvp_analytics (
          total_invited,
          total_responded,
          total_attending,
          total_not_attending,
          total_maybe,
          total_waitlist,
          total_guests_confirmed,
          response_rate,
          avg_party_size,
          meal_preferences,
          dietary_stats,
          age_distribution,
          date
        ),
        rsvp_waitlist (
          id,
          guest_name,
          guest_email,
          guest_phone,
          party_size,
          priority,
          status,
          added_at
        )
      `,
      )
      .eq('id', id)
      .eq('vendor_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      console.error('Error fetching RSVP event:', error);
      return NextResponse.json(
        { error: 'Failed to fetch event' },
        { status: 500 },
      );
    }

    // Calculate additional statistics
    const stats = {
      total_invited: event.rsvp_invitations?.length || 0,
      total_responded: event.rsvp_responses?.length || 0,
      total_attending:
        event.rsvp_responses?.filter(
          (r: any) => r.response_status === 'attending',
        ).length || 0,
      total_not_attending:
        event.rsvp_responses?.filter(
          (r: any) => r.response_status === 'not_attending',
        ).length || 0,
      total_maybe:
        event.rsvp_responses?.filter((r: any) => r.response_status === 'maybe')
          .length || 0,
      total_waitlist:
        event.rsvp_waitlist?.filter((w: any) => w.status === 'waiting')
          .length || 0,
      response_rate:
        event.rsvp_invitations?.length > 0
          ? (
              ((event.rsvp_responses?.length || 0) /
                event.rsvp_invitations.length) *
              100
            ).toFixed(2)
          : 0,
    };

    return NextResponse.json({
      event: {
        ...event,
        stats,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/rsvp/events/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/rsvp/events/[id] - Update event
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const validatedData = UpdateEventSchema.parse(body);

    // Update event
    const { data: event, error } = await supabase
      .from('rsvp_events')
      .update(validatedData)
      .eq('id', id)
      .eq('vendor_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      console.error('Error updating RSVP event:', error);
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 },
      );
    }

    // If reminder settings changed, reschedule reminders
    if (validatedData.reminder_settings) {
      await supabase.rpc('schedule_rsvp_reminders', { p_event_id: id });
    }

    return NextResponse.json({ event });
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
    console.error('Error in PATCH /api/rsvp/events/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/rsvp/events/[id] - Delete event
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    // Delete event (cascades to all related records)
    const { error } = await supabase
      .from('rsvp_events')
      .delete()
      .eq('id', id)
      .eq('vendor_id', user.id);

    if (error) {
      console.error('Error deleting RSVP event:', error);
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/rsvp/events/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
