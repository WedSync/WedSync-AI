import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const CreateMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message content is required')
    .max(10000, 'Message too long'),
  message_type: z.enum(['reply', 'note', 'status_change']).default('reply'),
  is_internal: z.boolean().default(false),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url(),
        size: z.number(),
        type: z.string(),
      }),
    )
    .default([]),
  template_used: z.string().optional(),
  status_change_from: z.string().optional(),
  status_change_to: z.string().optional(),
});

const ListMessagesSchema = z.object({
  limit: z
    .string()
    .transform((val) => Math.min(parseInt(val) || 50, 100))
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val) || 0)
    .optional(),
  include_internal: z.boolean().default(false),
  message_type: z.enum(['reply', 'note', 'status_change']).optional(),
  since: z
    .string()
    .transform((str) => (str ? new Date(str) : null))
    .optional(),
});

// Check if user can access this ticket's messages
async function checkMessageAccess(
  supabase: any,
  ticketId: string,
  userId: string,
) {
  // Get user profile and support agent info
  const [userProfileResult, supportAgentResult] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('role, organization_id, display_name')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('support_agents')
      .select('id, agent_name, team, skills')
      .eq('user_id', userId)
      .single(),
  ]);

  const userProfile = userProfileResult.data;
  const supportAgent = supportAgentResult.data;

  if (!userProfile) {
    throw new Error('User profile not found');
  }

  // Get ticket to check access
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('user_id, assigned_to, assigned_team, status')
    .eq('id', ticketId)
    .single();

  if (error || !ticket) {
    return {
      hasAccess: false,
      ticket: null,
      userProfile,
      supportAgent,
      error: 'Ticket not found',
    };
  }

  // Check access permissions
  let hasAccess = false;
  let canViewInternal = false;

  // Admins can access all tickets and see internal messages
  if (userProfile.role === 'ADMIN' || userProfile.role === 'OWNER') {
    hasAccess = true;
    canViewInternal = true;
  }
  // Support agents can access assigned tickets and see internal messages
  else if (
    supportAgent &&
    (ticket.assigned_to === supportAgent.id ||
      ticket.assigned_team === supportAgent.team)
  ) {
    hasAccess = true;
    canViewInternal = true;
  }
  // Users can access their own tickets but not internal messages
  else if (ticket.user_id === userId) {
    hasAccess = true;
    canViewInternal = false;
  }

  return {
    hasAccess,
    canViewInternal,
    ticket,
    userProfile,
    supportAgent,
    error: null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = params.id;

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const validatedParams = ListMessagesSchema.parse(queryParams);

    // Check access permissions
    const { hasAccess, canViewInternal, error } = await checkMessageAccess(
      supabase,
      ticketId,
      user.id,
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: 403 },
      );
    }

    // Build query
    let query = supabase
      .from('ticket_messages')
      .select(
        `
        *,
        support_agents (
          agent_name,
          email,
          skills
        )
      `,
      )
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    // Filter by message type if specified
    if (validatedParams.message_type) {
      query = query.eq('message_type', validatedParams.message_type);
    }

    // Filter by date if specified
    if (validatedParams.since) {
      query = query.gte('created_at', validatedParams.since.toISOString());
    }

    // Hide internal messages for non-support users
    if (!canViewInternal) {
      query = query.eq('is_internal', false);
    }

    // Apply pagination
    if (validatedParams.offset) {
      query = query.range(
        validatedParams.offset,
        validatedParams.offset + (validatedParams.limit || 50) - 1,
      );
    } else {
      query = query.limit(validatedParams.limit || 50);
    }

    const { data: messages, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Error fetching messages:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 },
      );
    }

    // Mark messages as read for the customer if they are viewing their own ticket
    const customerMessages =
      messages?.filter(
        (m) => m.sender_type === 'agent' || m.sender_type === 'system',
      ) || [];

    if (customerMessages.length > 0) {
      await supabase
        .from('ticket_messages')
        .update({
          read_by_customer: true,
          read_at: new Date().toISOString(),
        })
        .in(
          'id',
          customerMessages.map((m) => m.id),
        )
        .eq('read_by_customer', false);
    }

    return NextResponse.json({
      messages: messages || [],
      pagination: {
        limit: validatedParams.limit || 50,
        offset: validatedParams.offset || 0,
        total: count || 0,
      },
      permissions: {
        canViewInternal,
        canAddMessages: hasAccess,
      },
    });
  } catch (error) {
    console.error('GET /api/support/tickets/[id]/messages error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = params.id;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateMessageSchema.parse(body);

    // Check access permissions
    const { hasAccess, canViewInternal, ticket, userProfile, supportAgent } =
      await checkMessageAccess(supabase, ticketId, user.id);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if ticket is closed (only support agents can add messages to closed tickets)
    if (ticket.status === 'closed' && !supportAgent) {
      return NextResponse.json(
        {
          error: 'Cannot add messages to closed tickets',
        },
        { status: 400 },
      );
    }

    // Determine sender type and details
    let senderType: 'customer' | 'agent' | 'system' = 'customer';
    let senderName = userProfile.display_name || 'Customer';
    let senderEmail = '';

    if (supportAgent) {
      senderType = 'agent';
      senderName = supportAgent.agent_name;
      senderEmail = supportAgent.email || '';
    }

    // Non-support users cannot create internal messages
    if (!supportAgent && validatedData.is_internal) {
      return NextResponse.json(
        {
          error: 'Only support agents can create internal messages',
        },
        { status: 403 },
      );
    }

    // Create the message
    const messageData = {
      ticket_id: ticketId,
      sender_type: senderType,
      sender_id: user.id,
      sender_name: senderName,
      sender_email: senderEmail,
      message: validatedData.message,
      message_type: validatedData.message_type,
      is_internal: validatedData.is_internal,
      is_automated: false,
      attachments: validatedData.attachments,
      template_used: validatedData.template_used,
      status_change_from: validatedData.status_change_from,
      status_change_to: validatedData.status_change_to,
      email_sent: false, // Will be set to true when email notification is sent
      read_by_customer: senderType === 'customer', // Customer messages are automatically "read"
    };

    const { data: message, error: messageError } = await supabase
      .from('ticket_messages')
      .insert(messageData)
      .select(
        `
        *,
        support_agents (
          agent_name,
          email,
          skills
        )
      `,
      )
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 },
      );
    }

    // Update ticket timestamps and potentially status
    const ticketUpdates: any = {
      last_update_at: new Date().toISOString(),
    };

    // If this is the first response from support, record it
    if (
      supportAgent &&
      !ticket.first_response_at &&
      validatedData.message_type === 'reply'
    ) {
      ticketUpdates.first_response_at = new Date().toISOString();

      // Log SLA event for first response
      await supabase.from('ticket_sla_events').insert({
        ticket_id: ticketId,
        event_type: 'first_response',
        expected_at: ticket.sla_first_response_deadline,
        actual_at: new Date().toISOString(),
        agent_id: supportAgent.id,
      });
    }

    // Auto-change ticket status based on sender
    if (senderType === 'agent' && ticket.status === 'waiting_customer') {
      ticketUpdates.status = 'in_progress';
    } else if (
      senderType === 'customer' &&
      ticket.status === 'waiting_customer'
    ) {
      ticketUpdates.status = 'open';
    }

    // Update the ticket
    if (Object.keys(ticketUpdates).length > 1) {
      // More than just last_update_at
      await supabase
        .from('support_tickets')
        .update(ticketUpdates)
        .eq('id', ticketId);
    }

    // TODO: Send email notification to relevant parties
    // TODO: Trigger webhooks
    // TODO: Update AI sentiment analysis if enabled

    // Get unread message count for ticket owner
    let unreadCount = 0;
    if (senderType === 'agent') {
      const { count } = await supabase
        .from('ticket_messages')
        .select('*', { count: 'exact', head: true })
        .eq('ticket_id', ticketId)
        .eq('sender_type', 'agent')
        .eq('read_by_customer', false);
      unreadCount = count || 0;
    }

    return NextResponse.json(
      {
        message,
        ticket_updates:
          Object.keys(ticketUpdates).length > 1 ? ticketUpdates : null,
        unread_count: unreadCount,
        notification_sent: false, // Will be true when email/SMS notification is implemented
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/support/tickets/[id]/messages error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid message data',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
