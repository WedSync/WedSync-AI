/**
 * Individual Ticket Operations API
 * WS-235: Support Operations Ticket Management System
 *
 * Handles operations on specific tickets:
 * - GET: Retrieve single ticket with full details
 * - PUT: Update ticket status, priority, assignment
 * - DELETE: Archive/close ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { slaMonitor } from '@/lib/support/sla-monitor';
import { ticketRouter } from '@/lib/support/ticket-router';

// Validation schemas
const UpdateTicketSchema = z.object({
  status: z
    .enum(['open', 'in_progress', 'pending_response', 'resolved', 'closed'])
    .optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  category: z.string().optional(),
  assignedAgentId: z.string().uuid().nullable().optional(),
  escalationLevel: z.number().min(0).max(3).optional(),
  tags: z.array(z.string()).optional(),
  internalNotes: z.string().optional(),
  resolutionNotes: z.string().optional(),
  reasonCode: z.string().optional(),
  satisfaction: z.number().min(1).max(5).optional(),
  isWeddingEmergency: z.boolean().optional(),
});

/**
 * GET /api/tickets/[id] - Get single ticket with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = params.id;
    console.log(`Fetching ticket ${ticketId} for user ${user.id}`);

    // Fetch ticket with all related data
    const { data: ticket, error } = await supabaseClient
      .from('support_tickets')
      .select(
        `
        *,
        user_profiles!support_tickets_user_id_fkey (
          full_name,
          email,
          user_tier,
          organization_id,
          organizations (
            name,
            slug
          )
        ),
        support_agents!support_tickets_assigned_agent_id_fkey (
          full_name,
          email,
          specialties,
          wedding_expertise_level,
          avatar_url,
          is_available
        ),
        ticket_messages!ticket_messages_ticket_id_fkey (
          id,
          message_content,
          message_type,
          is_internal,
          attachments,
          created_at,
          updated_at,
          author_type,
          author_id,
          support_agents!ticket_messages_author_id_fkey (
            full_name,
            avatar_url
          ),
          user_profiles!ticket_messages_author_id_fkey (
            full_name,
            avatar_url
          )
        ),
        ticket_sla_events!ticket_sla_events_ticket_id_fkey (
          id,
          event_type,
          event_data,
          created_at,
          notes,
          agent_id,
          support_agents!ticket_sla_events_agent_id_fkey (
            full_name
          )
        )
      `,
      )
      .eq('id', ticketId)
      .single();

    if (error) {
      console.error('Error fetching ticket:', error);
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check access permissions
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('role, permissions')
      .eq('user_id', user.id)
      .single();

    const isOwner = ticket.user_id === user.id;
    const isAgent =
      profile?.role === 'support_agent' && ticket.assigned_agent_id === user.id;
    const isAdmin = profile?.role === 'admin';

    if (!isOwner && !isAgent && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get SLA status
    let slaStatus = null;
    try {
      slaStatus = await slaMonitor.getTicketSLAStatus(ticketId);
    } catch (error) {
      console.error(`Failed to get SLA status for ticket ${ticketId}:`, error);
    }

    // Sort messages by creation date
    const sortedMessages =
      ticket.ticket_messages?.sort(
        (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ) || [];

    // Sort SLA events by creation date
    const sortedEvents =
      ticket.ticket_sla_events?.sort(
        (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ) || [];

    // Filter internal messages/events for customers
    const filteredMessages =
      isOwner && !isAgent && !isAdmin
        ? sortedMessages.filter((msg: any) => !msg.is_internal)
        : sortedMessages;

    const filteredEvents =
      isOwner && !isAgent && !isAdmin
        ? sortedEvents.filter(
            (event: any) =>
              !['internal_note', 'agent_assignment', 'escalation'].includes(
                event.event_type,
              ),
          )
        : sortedEvents;

    // Calculate metrics
    const metrics = {
      totalMessages: sortedMessages.length,
      customerMessages: sortedMessages.filter(
        (msg: any) => msg.author_type === 'customer',
      ).length,
      agentMessages: sortedMessages.filter(
        (msg: any) => msg.author_type === 'agent',
      ).length,
      systemEvents: sortedEvents.length,
      timeToFirstResponse: ticket.first_response_at
        ? new Date(ticket.first_response_at).getTime() -
          new Date(ticket.created_at).getTime()
        : null,
      totalResolutionTime: ticket.resolved_at
        ? new Date(ticket.resolved_at).getTime() -
          new Date(ticket.created_at).getTime()
        : null,
      lastActivityAt:
        sortedMessages.length > 0
          ? sortedMessages[sortedMessages.length - 1].created_at
          : ticket.updated_at,
    };

    const response = {
      ticket: {
        ...ticket,
        ticket_messages: filteredMessages,
        ticket_sla_events: filteredEvents,
      },
      slaStatus,
      metrics,
      permissions: {
        canEdit: isAgent || isAdmin,
        canClose: isOwner || isAgent || isAdmin,
        canEscalate: isAgent || isAdmin,
        canViewInternal: isAgent || isAdmin,
        canReassign: isAdmin,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/tickets/[id] - Update ticket
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateTicketSchema.parse(body);

    console.log(`Updating ticket ${ticketId} by user ${user.id}`);

    // Get current ticket
    const { data: currentTicket, error: fetchError } = await supabaseClient
      .from('support_tickets')
      .select('*, user_profiles!support_tickets_user_id_fkey (role)')
      .eq('id', ticketId)
      .single();

    if (fetchError || !currentTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('role, permissions')
      .eq('user_id', user.id)
      .single();

    const isOwner = currentTicket.user_id === user.id;
    const isAgent = profile?.role === 'support_agent';
    const isAdmin = profile?.role === 'admin';

    // Owners can only update certain fields
    if (isOwner && !isAgent && !isAdmin) {
      const allowedFields = ['satisfaction', 'status'];
      const submittedFields = Object.keys(validatedData);
      const unauthorizedFields = submittedFields.filter(
        (field) => !allowedFields.includes(field),
      );

      if (unauthorizedFields.length > 0) {
        return NextResponse.json(
          {
            error: 'Insufficient permissions',
            details: `Customers can only update: ${allowedFields.join(', ')}`,
          },
          { status: 403 },
        );
      }

      // Customers can only mark tickets as resolved/closed
      if (
        validatedData.status &&
        !['resolved', 'closed'].includes(validatedData.status)
      ) {
        return NextResponse.json(
          {
            error: 'Invalid status',
            details: 'Customers can only resolve or close tickets',
          },
          { status: 400 },
        );
      }
    }

    if (!isOwner && !isAgent && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };

    // Handle status changes
    if (validatedData.status) {
      if (validatedData.status === 'resolved' && !currentTicket.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
      }

      if (validatedData.status === 'closed' && !currentTicket.closed_at) {
        updateData.closed_at = new Date().toISOString();
      }

      if (
        validatedData.status === 'in_progress' &&
        !currentTicket.first_response_at
      ) {
        updateData.first_response_at = new Date().toISOString();
      }
    }

    // Handle agent assignment changes
    if (validatedData.assignedAgentId !== undefined) {
      updateData.assigned_agent_id = validatedData.assignedAgentId;
      updateData.assigned_at = validatedData.assignedAgentId
        ? new Date().toISOString()
        : null;

      // Handle reassignment
      if (
        currentTicket.assigned_agent_id &&
        validatedData.assignedAgentId &&
        currentTicket.assigned_agent_id !== validatedData.assignedAgentId
      ) {
        try {
          await ticketRouter.reassignTicket(
            ticketId,
            currentTicket.assigned_agent_id,
            'Manual reassignment',
          );
        } catch (error) {
          console.error('Failed to handle reassignment:', error);
        }
      }
    }

    // Update ticket
    const { data: updatedTicket, error: updateError } = await supabaseClient
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating ticket:', updateError);
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 },
      );
    }

    // Record update events
    const changes = Object.keys(validatedData)
      .map((field) => {
        const oldValue = currentTicket[field];
        const newValue = validatedData[field as keyof typeof validatedData];

        if (oldValue !== newValue) {
          return { field, oldValue, newValue };
        }
        return null;
      })
      .filter(Boolean);

    if (changes.length > 0) {
      await supabaseClient.from('ticket_sla_events').insert({
        ticket_id: ticketId,
        event_type: 'update',
        event_data: { changes },
        agent_id: isAgent || isAdmin ? user.id : null,
        notes: `Ticket updated by ${profile?.role || 'customer'} ${user.id}: ${changes.map((c) => c?.field).join(', ')}`,
      });
    }

    // Add internal notes if provided
    if (validatedData.internalNotes) {
      await supabaseClient.from('ticket_messages').insert({
        ticket_id: ticketId,
        message_content: validatedData.internalNotes,
        message_type: 'note',
        is_internal: true,
        author_type: 'agent',
        author_id: user.id,
      });
    }

    // Add resolution notes if provided
    if (validatedData.resolutionNotes && validatedData.status === 'resolved') {
      await supabaseClient.from('ticket_messages').insert({
        ticket_id: ticketId,
        message_content: validatedData.resolutionNotes,
        message_type: 'resolution',
        is_internal: false,
        author_type: 'agent',
        author_id: user.id,
      });
    }

    console.log(`Ticket ${ticketId} updated successfully`);

    return NextResponse.json({
      ticket: updatedTicket,
      changes,
      success: true,
    });
  } catch (error) {
    console.error('Error updating ticket:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/tickets/[id] - Archive/close ticket
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = params.id;

    // Get current ticket
    const { data: ticket, error: fetchError } = await supabaseClient
      .from('support_tickets')
      .select('*, user_profiles!support_tickets_user_id_fkey (role)')
      .eq('id', ticketId)
      .single();

    if (fetchError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('role, permissions')
      .eq('user_id', user.id)
      .single();

    const isOwner = ticket.user_id === user.id;
    const isAgent = profile?.role === 'support_agent';
    const isAdmin = profile?.role === 'admin';

    if (!isOwner && !isAgent && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    console.log(
      `Archiving ticket ${ticketId} by ${profile?.role || 'customer'} ${user.id}`,
    );

    // Soft delete (archive) ticket
    const { data: archivedTicket, error: archiveError } = await supabaseClient
      .from('support_tickets')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (archiveError) {
      console.error('Error archiving ticket:', archiveError);
      return NextResponse.json(
        { error: 'Failed to archive ticket' },
        { status: 500 },
      );
    }

    // Record archive event
    await supabaseClient.from('ticket_sla_events').insert({
      ticket_id: ticketId,
      event_type: 'archive',
      agent_id: isAgent || isAdmin ? user.id : null,
      notes: `Ticket archived by ${profile?.role || 'customer'} ${user.id}`,
    });

    // Update agent workload if assigned
    if (ticket.assigned_agent_id) {
      await supabaseClient
        .from('support_agents')
        .update({
          current_ticket_count: supabaseClient.raw(
            'GREATEST(current_ticket_count - 1, 0)',
          ),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticket.assigned_agent_id);
    }

    return NextResponse.json({
      success: true,
      ticket: archivedTicket,
      message: 'Ticket archived successfully',
    });
  } catch (error) {
    console.error('Error archiving ticket:', error);
    return NextResponse.json(
      { error: 'Failed to archive ticket' },
      { status: 500 },
    );
  }
}
