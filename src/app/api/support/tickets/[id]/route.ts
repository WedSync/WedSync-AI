import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import rateLimit from '@/lib/rate-limiter';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

const updateTicketSchema = z.object({
  status: z
    .enum(['open', 'in_progress', 'waiting_response', 'resolved', 'closed'])
    .optional(),
  priority: z
    .enum(['low', 'normal', 'high', 'urgent', 'wedding_day'])
    .optional(),
  title: z.string().min(5).max(255).optional(),
  venue_name: z.string().optional(),
  wedding_date: z.string().optional(),
});

// GET /api/support/tickets/[id] - Get specific ticket details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Apply rate limiting
    try {
      await limiter.check(NextResponse.next(), 30, user.id); // 30 requests per minute
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    const ticketId = params.id;

    // Fetch ticket with all related data
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select(
        `
        *,
        support_ticket_comments:support_ticket_comments(
          id,
          content,
          is_internal,
          is_system_message,
          voice_note_url,
          voice_note_duration,
          author_id,
          author_name,
          author_role,
          created_at,
          updated_at
        ),
        support_ticket_attachments:support_ticket_attachments(
          id,
          filename,
          file_type,
          file_size,
          storage_path,
          captured_on_mobile,
          created_at,
          uploaded_by
        ),
        wedding_day_emergencies:wedding_day_emergencies(
          id,
          emergency_type,
          severity_level,
          impact_assessment,
          venue_name,
          venue_address,
          wedding_time,
          guests_affected,
          emergency_contacts,
          reported_at,
          resolved_at
        )
      `,
      )
      .eq('id', ticketId)
      .eq('user_id', user.id) // Ensure user owns this ticket
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 },
        );
      }

      console.error('Error fetching ticket:', error);
      return NextResponse.json(
        { error: 'Failed to fetch ticket' },
        { status: 500 },
      );
    }

    // Sort comments by creation date
    if (ticket.support_ticket_comments) {
      ticket.support_ticket_comments.sort(
        (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }

    // Sort attachments by creation date
    if (ticket.support_ticket_attachments) {
      ticket.support_ticket_attachments.sort(
        (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error in GET /api/support/tickets/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/support/tickets/[id] - Update ticket
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Apply rate limiting
    try {
      await limiter.check(NextResponse.next(), 10, user.id); // 10 updates per minute
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    const ticketId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateTicketSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const updateData = validationResult.data;

    // Check if ticket exists and user owns it
    const { data: existingTicket, error: fetchError } = await supabase
      .from('support_tickets')
      .select('id, status, priority')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Prepare update data with timestamps
    const finalUpdateData: any = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    // Set resolved timestamp if marking as resolved
    if (
      updateData.status === 'resolved' &&
      existingTicket.status !== 'resolved'
    ) {
      finalUpdateData.resolved_at = new Date().toISOString();
    }

    // Clear resolved timestamp if reopening
    if (
      updateData.status &&
      updateData.status !== 'resolved' &&
      existingTicket.status === 'resolved'
    ) {
      finalUpdateData.resolved_at = null;
    }

    // Update the ticket
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update(finalUpdateData)
      .eq('id', ticketId);

    if (updateError) {
      console.error('Error updating ticket:', updateError);
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 },
      );
    }

    // Add system comment for status changes
    if (updateData.status && updateData.status !== existingTicket.status) {
      const statusMessages = {
        open: 'Ticket reopened by customer',
        in_progress: 'Ticket marked as in progress',
        waiting_response: 'Ticket marked as waiting for response',
        resolved: 'Ticket marked as resolved by customer',
        closed: 'Ticket closed',
      };

      await supabase.from('support_ticket_comments').insert({
        ticket_id: ticketId,
        content:
          statusMessages[updateData.status] ||
          `Status changed to ${updateData.status}`,
        is_system_message: true,
        author_id: user.id,
        author_name: user.user_metadata?.full_name || user.email || 'Customer',
        author_role: 'customer',
      });
    }

    // Add system comment for priority escalations
    if (
      updateData.priority &&
      updateData.priority !== existingTicket.priority
    ) {
      const priorityNames = {
        low: 'Low',
        normal: 'Normal',
        high: 'High',
        urgent: 'Urgent',
        wedding_day: 'Wedding Day Emergency',
      };

      await supabase.from('support_ticket_comments').insert({
        ticket_id: ticketId,
        content: `Priority changed from ${priorityNames[existingTicket.priority]} to ${priorityNames[updateData.priority]}`,
        is_system_message: true,
        author_id: user.id,
        author_name: user.user_metadata?.full_name || user.email || 'Customer',
        author_role: 'customer',
      });

      // Handle escalation to wedding day priority
      if (
        updateData.priority === 'wedding_day' &&
        existingTicket.priority !== 'wedding_day'
      ) {
        // Create emergency record
        await supabase.from('wedding_day_emergencies').insert({
          ticket_id: ticketId,
          emergency_type: 'escalated_emergency',
          severity_level: 5,
          venue_name: 'Emergency Escalation',
          reported_at: new Date().toISOString(),
        });

        // Log escalation
        await supabase.from('support_escalations').insert({
          ticket_id: ticketId,
          escalation_reason: 'Customer escalated to wedding day priority',
          escalation_type: 'manual',
        });

        console.log(
          `WEDDING DAY ESCALATION: Ticket ${ticketId} escalated to wedding day priority`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully',
    });
  } catch (error) {
    console.error('Error in PATCH /api/support/tickets/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/support/tickets/[id] - Soft delete ticket (close)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Apply rate limiting
    try {
      await limiter.check(NextResponse.next(), 5, user.id); // 5 deletions per minute
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    const ticketId = params.id;

    // Check if ticket exists and user owns it
    const { data: existingTicket, error: fetchError } = await supabase
      .from('support_tickets')
      .select('id, status, priority')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Don't allow deletion of wedding day emergencies
    if (existingTicket.priority === 'wedding_day') {
      return NextResponse.json(
        { error: 'Wedding day emergency tickets cannot be deleted' },
        { status: 400 },
      );
    }

    // Soft delete by closing the ticket
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (updateError) {
      console.error('Error closing ticket:', updateError);
      return NextResponse.json(
        { error: 'Failed to close ticket' },
        { status: 500 },
      );
    }

    // Add system comment
    await supabase.from('support_ticket_comments').insert({
      ticket_id: ticketId,
      content: 'Ticket closed by customer',
      is_system_message: true,
      author_id: user.id,
      author_name: user.user_metadata?.full_name || user.email || 'Customer',
      author_role: 'customer',
    });

    return NextResponse.json({
      success: true,
      message: 'Ticket closed successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/support/tickets/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
