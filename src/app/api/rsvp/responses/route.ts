import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const SubmitResponseSchema = z.object({
  invitation_code: z.string().min(1, 'Invitation code is required'),
  response_status: z.enum(['attending', 'not_attending', 'maybe']),
  party_size: z.number().positive().optional(),
  notes: z.string().optional(),
  guests: z
    .array(
      z.object({
        guest_name: z.string().min(1),
        is_primary: z.boolean().default(false),
        meal_preference: z.string().optional(),
        dietary_restrictions: z.array(z.string()).optional(),
        allergies: z.array(z.string()).optional(),
        song_request: z.string().optional(),
        special_needs: z.string().optional(),
        age_group: z.enum(['adult', 'teen', 'child', 'infant']).optional(),
      }),
    )
    .optional(),
  custom_responses: z
    .array(
      z.object({
        question_id: z.string().uuid(),
        answer_text: z.string().optional(),
        answer_json: z.any().optional(),
      }),
    )
    .optional(),
});

const UpdateResponseSchema = z.object({
  response_status: z.enum(['attending', 'not_attending', 'maybe']).optional(),
  party_size: z.number().positive().optional(),
  notes: z.string().optional(),
  guests: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        guest_name: z.string().min(1),
        is_primary: z.boolean().default(false),
        meal_preference: z.string().optional(),
        dietary_restrictions: z.array(z.string()).optional(),
        allergies: z.array(z.string()).optional(),
        song_request: z.string().optional(),
        special_needs: z.string().optional(),
        age_group: z.enum(['adult', 'teen', 'child', 'infant']).optional(),
      }),
    )
    .optional(),
});

// GET /api/rsvp/responses - Get responses (vendor view)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = req.nextUrl.searchParams;
    const eventId = searchParams.get('event_id');
    const status = searchParams.get('status');

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase
      .from('rsvp_responses')
      .select(
        `
        *,
        rsvp_invitations (
          id,
          guest_name,
          guest_email,
          guest_phone,
          invitation_code,
          is_vip,
          table_assignment
        ),
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
        ),
        rsvp_custom_responses (
          id,
          question_id,
          answer_text,
          answer_json,
          rsvp_custom_questions (
            question_text,
            question_type
          )
        ),
        rsvp_events!inner (
          id,
          event_name,
          event_date,
          vendor_id
        )
      `,
      )
      .eq('rsvp_events.vendor_id', user.id);

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    if (status) {
      query = query.eq('response_status', status);
    }

    const { data: responses, error } = await query.order('responded_at', {
      ascending: false,
    });

    if (error) {
      console.error('Error fetching responses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch responses' },
        { status: 500 },
      );
    }

    return NextResponse.json({ responses });
  } catch (error) {
    console.error('Error in GET /api/rsvp/responses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/rsvp/responses - Submit RSVP response (public endpoint)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const validatedData = SubmitResponseSchema.parse(body);

    // Find invitation by code
    const { data: invitation, error: invError } = await supabase
      .from('rsvp_invitations')
      .select(
        `
        *,
        rsvp_events (
          id,
          event_name,
          event_date,
          allow_plus_ones,
          require_meal_selection,
          require_song_requests,
          thank_you_message
        )
      `,
      )
      .eq('invitation_code', validatedData.invitation_code.toUpperCase())
      .single();

    if (invError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation code' },
        { status: 404 },
      );
    }

    // Check if response already exists
    const { data: existingResponse } = await supabase
      .from('rsvp_responses')
      .select('id')
      .eq('invitation_id', invitation.id)
      .single();

    if (existingResponse) {
      return NextResponse.json(
        {
          error:
            'You have already responded to this invitation. Please use the update endpoint.',
        },
        { status: 400 },
      );
    }

    // Validate party size
    const partySize = validatedData.party_size || 1;
    if (partySize > invitation.max_party_size) {
      return NextResponse.json(
        {
          error: `Party size cannot exceed ${invitation.max_party_size}`,
        },
        { status: 400 },
      );
    }

    // Start transaction
    const { data: response, error: responseError } = await supabase
      .from('rsvp_responses')
      .insert({
        invitation_id: invitation.id,
        event_id: invitation.event_id,
        response_status: validatedData.response_status,
        party_size: partySize,
        notes: validatedData.notes,
        response_source: 'web',
      })
      .select()
      .single();

    if (responseError) {
      console.error('Error creating response:', responseError);
      return NextResponse.json(
        { error: 'Failed to submit response' },
        { status: 500 },
      );
    }

    // Add guest details if attending
    if (validatedData.response_status === 'attending' && validatedData.guests) {
      const guestDetails = validatedData.guests.map((guest) => ({
        ...guest,
        response_id: response.id,
      }));

      const { error: guestError } = await supabase
        .from('rsvp_guest_details')
        .insert(guestDetails);

      if (guestError) {
        console.error('Error adding guest details:', guestError);
      }
    }

    // Add custom question responses
    if (validatedData.custom_responses) {
      const customResponses = validatedData.custom_responses.map((cr) => ({
        ...cr,
        response_id: response.id,
      }));

      const { error: customError } = await supabase
        .from('rsvp_custom_responses')
        .insert(customResponses);

      if (customError) {
        console.error('Error adding custom responses:', customError);
      }
    }

    // Update analytics
    await supabase.rpc('update_rsvp_analytics', {
      p_event_id: invitation.event_id,
    });

    // Process waitlist if declining
    if (validatedData.response_status === 'not_attending') {
      await supabase.rpc('process_rsvp_waitlist', {
        p_event_id: invitation.event_id,
      });
    }

    // Send thank you message if configured
    if (invitation.rsvp_events.thank_you_message) {
      await sendThankYouMessage(
        invitation,
        response,
        invitation.rsvp_events.thank_you_message,
      );
    }

    return NextResponse.json(
      {
        response,
        message: 'Thank you for your RSVP!',
        thank_you_message: invitation.rsvp_events.thank_you_message,
      },
      { status: 201 },
    );
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
    console.error('Error in POST /api/rsvp/responses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper function to send thank you message
async function sendThankYouMessage(
  invitation: any,
  response: any,
  message: string,
) {
  // This would integrate with your notification service
  // For now, just log it
  console.log(`Sending thank you to ${invitation.guest_name}: ${message}`);
}
