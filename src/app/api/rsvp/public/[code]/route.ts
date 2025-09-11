import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/rsvp/public/[code] - Public endpoint to get event details by invitation code
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const supabase = await createClient();
    const invitationCode = code.toUpperCase();

    // Find invitation by code
    const { data: invitation, error: invError } = await supabase
      .from('rsvp_invitations')
      .select(
        `
        id,
        guest_name,
        guest_email,
        guest_phone,
        max_party_size,
        is_vip,
        table_assignment,
        event_id
      `,
      )
      .eq('invitation_code', invitationCode)
      .single();

    if (invError || !invitation) {
      return NextResponse.json(
        {
          error: 'Invalid invitation code',
        },
        { status: 404 },
      );
    }

    // Check if already responded
    const { data: existingResponse } = await supabase
      .from('rsvp_responses')
      .select('id, response_status, party_size')
      .eq('invitation_id', invitation.id)
      .single();

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('rsvp_events')
      .select(
        `
        id,
        event_name,
        event_date,
        event_time,
        venue_name,
        venue_address,
        rsvp_deadline,
        allow_plus_ones,
        require_meal_selection,
        require_song_requests,
        custom_message,
        thank_you_message
      `,
      )
      .eq('id', invitation.event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        {
          error: 'Event not found',
        },
        { status: 404 },
      );
    }

    // Get meal options if required
    let mealOptions = [];
    if (event.require_meal_selection) {
      const { data: meals } = await supabase
        .from('rsvp_meal_options')
        .select('*')
        .eq('event_id', event.id)
        .eq('is_available', true)
        .order('display_order');

      mealOptions = meals || [];
    }

    // Get custom questions
    const { data: customQuestions } = await supabase
      .from('rsvp_custom_questions')
      .select('*')
      .eq('event_id', event.id)
      .order('display_order');

    // Check if event deadline has passed
    const isExpired =
      event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();

    return NextResponse.json({
      invitation: {
        ...invitation,
        has_responded: !!existingResponse,
        existing_response: existingResponse,
      },
      event: {
        ...event,
        is_expired: isExpired,
        max_party_size: invitation.max_party_size,
      },
      meal_options: mealOptions,
      custom_questions: customQuestions || [],
    });
  } catch (error) {
    console.error('Error in GET /api/rsvp/public/[code]:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
