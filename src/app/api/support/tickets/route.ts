/**
 * Support Tickets API - Main CRUD Operations
 * WS-235: Support Operations Ticket Management System
 *
 * Handles ticket creation, listing, and bulk operations
 * with wedding industry-specific logic and AI-powered classification
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { TicketManager } from '@/lib/support/ticket-manager';
import { TicketRouter } from '@/lib/support/ticket-router';
import { SLAMonitor } from '@/lib/support/sla-monitor';

// Validation schemas
const CreateTicketSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000),
  priority: z
    .enum(['critical', 'high', 'medium', 'low'])
    .optional()
    .default('medium'),
  category: z.string().optional(),
  vendorType: z
    .enum([
      'photographer',
      'videographer',
      'dj',
      'florist',
      'caterer',
      'venue',
      'planner',
      'other',
    ])
    .optional(),
  tags: z.array(z.string()).optional().default([]),
  weddingDate: z.string().datetime().optional(),
  isWeddingEmergency: z.boolean().optional().default(false),
  requestedLanguage: z.string().optional().default('en'),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        url: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
      }),
    )
    .optional()
    .default([]),
});

const GetTicketsQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  category: z.string().optional(),
  userTier: z.string().optional(),
  search: z.string().optional(),
  sortBy: z
    .enum(['created_at', 'updated_at', 'priority', 'sla_deadline'])
    .optional()
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  includeResolved: z.coerce.boolean().optional().default(false),
  weddingEmergenciesOnly: z.coerce.boolean().optional().default(false),
});

/**
 * POST /api/support/tickets - Create a new support ticket
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const ticketManager = TicketManager.getInstance();
    const ticketRouter = TicketRouter.getInstance();
    const slaMonitor = SLAMonitor.getInstance();

    // Get authenticated user
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateTicketSchema.parse(body);

    console.log(
      `Creating ticket for user ${session.user.id}: ${validatedData.subject}`,
    );

    // Get user profile and organization info
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(
        `
        *,
        organizations (
          id,
          name,
          subscription_tier
        )
      `,
      )
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    // Create ticket using TicketManager
    const createTicketRequest = {
      userId: session.user.id,
      organizationId: userProfile.organizations?.id,
      userType: userProfile.user_type || 'supplier',
      userTier: userProfile.organizations?.subscription_tier || 'free',
      subject: validatedData.subject,
      description: validatedData.description,
      priority: validatedData.priority,
      category: validatedData.category,
      vendorType: validatedData.vendorType,
      tags: validatedData.tags,
      weddingDate: validatedData.weddingDate
        ? new Date(validatedData.weddingDate)
        : undefined,
      isWeddingEmergency: validatedData.isWeddingEmergency,
      requestedLanguage: validatedData.requestedLanguage,
      attachments: validatedData.attachments,
      userAgent: request.headers.get('user-agent') || '',
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
    };

    const ticket = await ticketManager.createTicket(createTicketRequest);

    // Route ticket to appropriate agent
    const routingRequest = {
      ticketId: ticket.id,
      classification: ticket.classification,
      userTier: createTicketRequest.userTier,
      vendorType: validatedData.vendorType,
      priority: ticket.priority,
      isWeddingEmergency: validatedData.isWeddingEmergency,
      weddingDate: validatedData.weddingDate
        ? new Date(validatedData.weddingDate)
        : undefined,
      requestedLanguage: validatedData.requestedLanguage,
      escalationLevel: 0,
      tags: validatedData.tags,
    };

    const routingResult = await ticketRouter.routeTicket(routingRequest);

    // Calculate and set SLA targets
    await slaMonitor.calculateSLATargets(
      ticket.id,
      createTicketRequest.userTier,
      ticket.priority,
      validatedData.isWeddingEmergency,
      validatedData.weddingDate
        ? new Date(validatedData.weddingDate)
        : undefined,
    );

    // Return ticket with routing information
    const response = {
      ticket: {
        id: ticket.id,
        smartTicketId: ticket.smartTicketId,
        subject: ticket.subject,
        priority: ticket.priority,
        status: ticket.status,
        category: ticket.classification.category,
        estimatedResolutionTime: ticket.estimatedResolutionTime,
        createdAt: ticket.createdAt,
        assignedAgent: routingResult.assignedAgentId
          ? {
              id: routingResult.assignedAgentId,
              name: routingResult.agentName,
              estimatedResponseTime: routingResult.estimatedResponseTime,
            }
          : null,
      },
      routing: {
        method: routingResult.routingMethod,
        confidence: routingResult.confidence,
        reasoning: routingResult.reasoning,
        warnings: routingResult.warnings,
      },
      sla: {
        responseTimeMinutes: ticket.slaResponseDeadline
          ? Math.floor(
              (new Date(ticket.slaResponseDeadline).getTime() - Date.now()) /
                60000,
            )
          : null,
        resolutionTimeHours: ticket.slaResolutionDeadline
          ? Math.floor(
              (new Date(ticket.slaResolutionDeadline).getTime() - Date.now()) /
                3600000,
            )
          : null,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating ticket:', error);

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
      {
        error: 'Failed to create ticket',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/support/tickets - Get tickets with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get authenticated user
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = GetTicketsQuerySchema.parse(queryParams);

    console.log(
      `Fetching tickets for user ${session.user.id} with filters:`,
      validatedQuery,
    );

    // Get user profile to determine access level
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_type, organizations(id)')
      .eq('user_id', session.user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 },
      );
    }

    // Build query based on user role
    let query = supabase.from('support_tickets').select(
      `
        id,
        smart_ticket_id,
        subject,
        status,
        priority,
        category,
        vendor_type,
        tags,
        is_wedding_emergency,
        wedding_date,
        created_at,
        updated_at,
        first_response_at,
        resolved_at,
        sla_response_deadline,
        sla_resolution_deadline,
        escalation_level,
        user_profiles!support_tickets_user_id_fkey (
          full_name,
          email,
          user_tier
        ),
        support_agents!support_tickets_assigned_agent_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        ticket_slas (
          response_status,
          resolution_status,
          health_score,
          is_wedding_day,
          breach_minutes
        ),
        _count:ticket_messages(count)
      `,
      { count: 'exact' },
    );

    // Filter by organization for suppliers/couples
    if (userProfile.user_type !== 'admin') {
      query = query.eq('organization_id', userProfile.organizations?.id);
    } else if (userProfile.user_type === 'agent') {
      // Agents see their assigned tickets or unassigned ones
      query = query.or(
        `assigned_agent_id.eq.${session.user.id},assigned_agent_id.is.null`,
      );
    }

    // Apply filters
    if (validatedQuery.status) {
      query = query.eq('status', validatedQuery.status);
    }

    if (validatedQuery.priority) {
      query = query.eq('priority', validatedQuery.priority);
    }

    if (validatedQuery.assignedTo) {
      query = query.eq('assigned_agent_id', validatedQuery.assignedTo);
    }

    if (validatedQuery.category) {
      query = query.eq('category', validatedQuery.category);
    }

    if (validatedQuery.userTier) {
      query = query.eq('user_profiles.user_tier', validatedQuery.userTier);
    }

    if (validatedQuery.search) {
      query = query.or(
        `subject.ilike.%${validatedQuery.search}%,smart_ticket_id.ilike.%${validatedQuery.search}%`,
      );
    }

    if (!validatedQuery.includeResolved) {
      query = query.not('status', 'in', '(resolved,closed)');
    }

    if (validatedQuery.weddingEmergenciesOnly) {
      query = query.eq('is_wedding_emergency', true);
    }

    // Apply sorting and pagination
    const offset = (validatedQuery.page - 1) * validatedQuery.limit;
    query = query
      .order(validatedQuery.sortBy, {
        ascending: validatedQuery.sortOrder === 'asc',
      })
      .range(offset, offset + validatedQuery.limit - 1);

    const { data: tickets, error: ticketsError, count } = await query;

    if (ticketsError) {
      console.error('Error fetching tickets:', ticketsError);
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 },
      );
    }

    // Get summary statistics
    const { data: stats } = await supabase
      .from('support_tickets')
      .select('status, priority, count(*)')
      .eq('organization_id', userProfile.organizations?.id)
      .not('status', 'in', '(resolved,closed)')
      .group('status, priority');

    // Format response
    const response = {
      tickets:
        tickets?.map((ticket) => ({
          ...ticket,
          slaStatus: ticket.ticket_slas?.[0] || null,
          messageCount: ticket._count || 0,
        })) || [],
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / validatedQuery.limit),
      },
      stats: {
        byStatus:
          stats?.reduce(
            (acc, stat) => {
              acc[stat.status] = (acc[stat.status] || 0) + stat.count;
              return acc;
            },
            {} as Record<string, number>,
          ) || {},
        byPriority:
          stats?.reduce(
            (acc, stat) => {
              acc[stat.priority] = (acc[stat.priority] || 0) + stat.count;
              return acc;
            },
            {} as Record<string, number>,
          ) || {},
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching tickets:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch tickets',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
