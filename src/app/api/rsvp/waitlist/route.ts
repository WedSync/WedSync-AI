import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { WaitlistService } from '@/lib/services/waitlistService';

// Validation schemas
const AddToWaitlistSchema = z.object({
  event_id: z.string().uuid(),
  guest_name: z.string().min(1),
  guest_email: z.string().email().optional(),
  guest_phone: z.string().optional(),
  party_size: z.number().positive().default(1),
  priority: z.number().optional(),
  notes: z.string().optional(),
});

const UpdateWaitlistSchema = z.object({
  priority: z.number().optional(),
  status: z.enum(['waiting', 'invited', 'declined', 'expired']).optional(),
});

// Round 2: Enhanced validation schemas
const WaitlistQuerySchema = z.object({
  event_id: z.string().uuid().optional(),
  status: z.enum(['waiting', 'invited', 'declined', 'expired']).optional(),
  include_analytics: z.enum(['true', 'false']).optional(),
  priority_filter: z.coerce.number().optional(),
});

const IntelligentProcessSchema = z.object({
  event_id: z.string().uuid(),
  max_invitations: z.coerce.number().positive().optional(),
  priority_threshold: z.coerce.number().optional(),
});

const PriorityUpdateSchema = z.object({
  event_id: z.string().uuid(),
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        priority: z.coerce.number().positive(),
      }),
    )
    .min(1),
});

// GET /api/rsvp/waitlist - Get waitlist entries (Round 2 Enhanced)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = req.nextUrl.searchParams;

    // Parse and validate parameters with Round 2 enhancements
    const queryData = WaitlistQuerySchema.parse({
      event_id: searchParams.get('event_id'),
      status: searchParams.get('status'),
      include_analytics: searchParams.get('include_analytics') || 'false',
      priority_filter: searchParams.get('priority_filter'),
    });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase
      .from('rsvp_waitlist')
      .select(
        `
        *,
        rsvp_events!inner (
          id,
          event_name,
          event_date,
          vendor_id,
          max_guests
        )
      `,
      )
      .eq('rsvp_events.vendor_id', user.id);

    if (queryData.event_id) {
      query = query.eq('event_id', queryData.event_id);
    }

    if (queryData.status) {
      query = query.eq('status', queryData.status);
    }

    if (queryData.priority_filter) {
      query = query.lte('priority', queryData.priority_filter);
    }

    const { data: waitlist, error } = await query
      .order('priority', { ascending: true })
      .order('added_at', { ascending: true });

    if (error) {
      console.error('Error fetching waitlist:', error);
      return NextResponse.json(
        { error: 'Failed to fetch waitlist' },
        { status: 500 },
      );
    }

    // Calculate position for each waitlist entry
    const processedWaitlist = waitlist?.map((entry: any, index: number) => ({
      ...entry,
      position: entry.status === 'waiting' ? index + 1 : null,
    }));

    let responseData: any = { waitlist: processedWaitlist };

    // Round 2: Include analytics if requested
    if (queryData.include_analytics === 'true' && queryData.event_id) {
      try {
        const analytics = await WaitlistService.getWaitlistAnalytics(
          queryData.event_id,
        );
        responseData.analytics = analytics;
      } catch (analyticsError) {
        console.error('Error fetching waitlist analytics:', analyticsError);
        responseData.analytics_error = 'Failed to load analytics';
      }
    }

    return NextResponse.json(responseData);
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
    console.error('Error in GET /api/rsvp/waitlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/rsvp/waitlist - Add to waitlist (can be public)
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const validatedData = AddToWaitlistSchema.parse(body);

    // Check if event exists and has waitlist enabled
    const { data: event, error: eventError } = await supabase
      .from('rsvp_events')
      .select('id, max_guests, event_name')
      .eq('id', validatedData.event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if already on waitlist
    const { data: existing } = await supabase
      .from('rsvp_waitlist')
      .select('id')
      .eq('event_id', validatedData.event_id)
      .eq('guest_email', validatedData.guest_email)
      .eq('status', 'waiting')
      .single();

    if (existing) {
      return NextResponse.json(
        {
          error: 'You are already on the waitlist for this event',
        },
        { status: 400 },
      );
    }

    // Determine priority (lower number = higher priority)
    let priority = validatedData.priority;
    if (!priority) {
      // Auto-assign priority based on current waitlist size
      const { count } = await supabase
        .from('rsvp_waitlist')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', validatedData.event_id)
        .eq('status', 'waiting');

      priority = (count || 0) + 1;
    }

    // Add to waitlist
    const { data: waitlistEntry, error } = await supabase
      .from('rsvp_waitlist')
      .insert({
        event_id: validatedData.event_id,
        guest_name: validatedData.guest_name,
        guest_email: validatedData.guest_email,
        guest_phone: validatedData.guest_phone,
        party_size: validatedData.party_size,
        priority,
        status: 'waiting',
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding to waitlist:', error);
      return NextResponse.json(
        { error: 'Failed to add to waitlist' },
        { status: 500 },
      );
    }

    // Calculate position
    const { count: position } = await supabase
      .from('rsvp_waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', validatedData.event_id)
      .eq('status', 'waiting')
      .lt('priority', priority);

    return NextResponse.json(
      {
        waitlistEntry: {
          ...waitlistEntry,
          position: (position || 0) + 1,
        },
        message: `You have been added to the waitlist. Your position is ${(position || 0) + 1}.`,
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
    console.error('Error in POST /api/rsvp/waitlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/rsvp/waitlist/[id] - Update waitlist entry
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
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

    const body = await req.json();
    const validatedData = UpdateWaitlistSchema.parse(body);

    // Verify ownership
    const { data: waitlistEntry, error: fetchError } = await supabase
      .from('rsvp_waitlist')
      .select(
        `
        *,
        rsvp_events (
          vendor_id
        )
      `,
      )
      .eq('id', params.id)
      .single();

    if (
      fetchError ||
      !waitlistEntry ||
      waitlistEntry.rsvp_events.vendor_id !== user.id
    ) {
      return NextResponse.json(
        { error: 'Waitlist entry not found or unauthorized' },
        { status: 404 },
      );
    }

    // Update waitlist entry
    const { data: updated, error } = await supabase
      .from('rsvp_waitlist')
      .update(validatedData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating waitlist entry:', error);
      return NextResponse.json(
        { error: 'Failed to update waitlist entry' },
        { status: 500 },
      );
    }

    // If status changed to invited, create an invitation
    if (
      validatedData.status === 'invited' &&
      waitlistEntry.status === 'waiting'
    ) {
      const { data: invitation } = await supabase
        .from('rsvp_invitations')
        .insert({
          event_id: waitlistEntry.event_id,
          guest_name: waitlistEntry.guest_name,
          guest_email: waitlistEntry.guest_email,
          guest_phone: waitlistEntry.guest_phone,
          max_party_size: waitlistEntry.party_size,
        })
        .select()
        .single();

      if (invitation) {
        // Send invitation notification
        await sendWaitlistInvitation(waitlistEntry, invitation);
      }
    }

    return NextResponse.json({ waitlistEntry: updated });
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
    console.error('Error in PATCH /api/rsvp/waitlist/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PUT /api/rsvp/waitlist - Intelligent waitlist processing (Round 2 Enhanced)
export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const validatedData = IntelligentProcessSchema.parse(body);

    // Verify event ownership
    const { data: event, error: eventError } = await supabase
      .from('rsvp_events')
      .select('id, event_name, max_guests')
      .eq('id', validatedData.event_id)
      .eq('vendor_id', user.id)
      .single();

    if (eventError || !event || !event.max_guests) {
      return NextResponse.json(
        {
          error: 'Event not found, unauthorized, or no guest limit set',
        },
        { status: 404 },
      );
    }

    // Round 2: Use intelligent waitlist processing
    const processingResult = await WaitlistService.processWaitlistIntelligently(
      validatedData.event_id,
    );

    // Also run legacy processing for compatibility
    await supabase.rpc('process_rsvp_waitlist', {
      p_event_id: validatedData.event_id,
    });

    // Get updated analytics
    const analytics = await WaitlistService.getWaitlistAnalytics(
      validatedData.event_id,
    );

    return NextResponse.json({
      message:
        'Waitlist processed successfully with intelligent prioritization',
      processing_result: processingResult,
      analytics: analytics,
      event_name: event.event_name,
      version: 'round2',
    });
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
    console.error('Error in PUT /api/rsvp/waitlist:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/rsvp/waitlist/priorities - Update waitlist priorities in batch (Round 2)
export async function DELETE(req: NextRequest) {
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

    const body = await req.json();
    const validatedData = PriorityUpdateSchema.parse(body);

    // Verify event ownership
    const { data: event, error: eventError } = await supabase
      .from('rsvp_events')
      .select('id')
      .eq('id', validatedData.event_id)
      .eq('vendor_id', user.id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        {
          error: 'Event not found or unauthorized',
        },
        { status: 404 },
      );
    }

    // Update priorities using the waitlist service
    await WaitlistService.updateWaitlistPriorities(
      validatedData.event_id,
      validatedData.updates,
    );

    // Get updated waitlist with new priorities
    const { data: updatedWaitlist } = await supabase
      .from('rsvp_waitlist')
      .select('*')
      .eq('event_id', validatedData.event_id)
      .order('priority', { ascending: true });

    return NextResponse.json({
      message: 'Waitlist priorities updated successfully',
      waitlist: updatedWaitlist,
      updated_count: validatedData.updates.length,
    });
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
    console.error('Error in DELETE /api/rsvp/waitlist/priorities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Helper function to send waitlist invitation (Enhanced for Round 2)
async function sendWaitlistInvitation(waitlistEntry: any, invitation: any) {
  try {
    // Use the enhanced waitlist service for notifications
    await WaitlistService.sendWaitlistInvitationNotification(
      waitlistEntry,
      invitation,
      { event_name: 'Event', event_date: new Date().toISOString() },
    );
  } catch (error) {
    console.error('Error sending waitlist invitation:', error);
  }
}
