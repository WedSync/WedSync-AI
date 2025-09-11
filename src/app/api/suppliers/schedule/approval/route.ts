// WS-161: Schedule Change Approval Workflow API
import { NextRequest, NextResponse } from 'next/server';
import {
  ScheduleApprovalWorkflowService,
  ScheduleChangeRequest,
} from '@/lib/workflow/schedule-approval-workflow-service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ScheduleChangeRequestSchema = z.object({
  wedding_id: z.string(),
  organization_id: z.string(),
  supplier_id: z.string(),
  schedule_event_id: z.string(),

  change_type: z.enum([
    'time_update',
    'location_update',
    'details_update',
    'cancellation',
    'new_booking',
  ]),
  change_reason: z.string().min(10).max(500),
  requested_by_role: z.enum(['supplier', 'planner', 'coordinator', 'admin']),

  original_values: z.record(z.any()),
  new_values: z.record(z.any()),

  cost_implications: z
    .object({
      additional_cost: z.number(),
      cost_breakdown: z.array(
        z.object({
          item: z.string(),
          amount: z.number(),
          reason: z.string(),
        }),
      ),
      cost_justification: z.string(),
    })
    .optional(),

  requires_couple_approval: z.boolean().default(true),
  requires_planner_approval: z.boolean().default(false),
  auto_approve_threshold: z.number().optional(),

  communication_preferences: z
    .object({
      email_notifications: z.boolean().default(true),
      sms_notifications: z.boolean().default(false),
      whatsapp_notifications: z.boolean().default(false),
      notification_frequency: z
        .enum(['immediate', 'daily_digest', 'weekly_digest'])
        .default('immediate'),
    })
    .default({}),
});

const CoupleResponseSchema = z.object({
  request_id: z.string(),
  organization_id: z.string(),
  decision: z.enum(['approved', 'rejected', 'request_changes']),
  response_message: z.string().max(1000).optional(),
  concerns: z.array(z.string()).optional(),
  alternative_suggestions: z
    .object({
      preferred_time: z.string().optional(),
      preferred_location: z.string().optional(),
      conditions: z.array(z.string()).optional(),
    })
    .optional(),
});

const WorkflowSettingsSchema = z.object({
  wedding_id: z.string(),
  organization_id: z.string(),

  auto_approve_minor_changes: z.boolean().default(true),
  auto_approve_time_window_minutes: z.number().min(5).max(120).default(15),
  auto_approve_cost_threshold: z.number().min(0).default(100),

  couple_approval_required_for: z
    .array(z.string())
    .default(['time_update', 'location_update', 'cancellation']),
  planner_approval_required_for: z.array(z.string()).default(['new_booking']),

  notification_preferences: z
    .object({
      immediate_notifications: z.boolean().default(true),
      daily_digest: z.boolean().default(false),
      weekly_digest: z.boolean().default(false),
      sms_for_urgent: z.boolean().default(true),
      whatsapp_enabled: z.boolean().default(false),
    })
    .default({}),

  default_approval_timeout_hours: z.number().min(1).max(168).default(48),
  urgent_approval_timeout_hours: z.number().min(1).max(24).default(6),
  reminder_intervals_hours: z.array(z.number()).default([12, 24, 36]),

  escalation_enabled: z.boolean().default(true),
  escalation_after_hours: z.number().min(1).max(168).default(72),
  escalation_recipients: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'create_request';

    switch (action) {
      case 'create_request':
        return await handleCreateChangeRequest(body, user.id);

      case 'couple_response':
        return await handleCoupleResponse(body, user.id);

      case 'send_reminders':
        return await handleSendReminders(body, user.id);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Schedule Approval API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

async function handleCreateChangeRequest(body: any, userId: string) {
  try {
    const validatedData = ScheduleChangeRequestSchema.parse(body);

    const supabase = await createClient();

    // Verify user has access to create change requests
    const { data: orgMembership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', validatedData.organization_id)
      .eq('user_id', userId)
      .single();

    // Allow suppliers to create requests for their own events or staff to create on behalf
    const { data: supplierUser } = await supabase
      .from('suppliers')
      .select('id, email')
      .eq('id', validatedData.supplier_id)
      .eq('organization_id', validatedData.organization_id)
      .single();

    const hasAccess =
      orgMembership ||
      (supplierUser &&
        (await checkIfUserIsSupplier(userId, validatedData.supplier_id)));

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Verify the schedule event exists
    const { data: scheduleEvent } = await supabase
      .from('supplier_schedule_events')
      .select('*')
      .eq('id', validatedData.schedule_event_id)
      .eq('organization_id', validatedData.organization_id)
      .single();

    if (!scheduleEvent) {
      return NextResponse.json(
        { error: 'Schedule event not found' },
        { status: 404 },
      );
    }

    // Create the change request
    const changeRequestData = {
      ...validatedData,
      requested_by: userId,
    };

    const result =
      await ScheduleApprovalWorkflowService.createScheduleChangeRequest(
        changeRequestData,
        validatedData.organization_id,
      );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create change request' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.auto_approved
        ? 'Change request created and automatically approved'
        : 'Change request created and sent for approval',
      request_id: result.request_id,
      auto_approved: result.auto_approved,
    });
  } catch (validationError) {
    return NextResponse.json(
      { error: 'Invalid request data', details: validationError },
      { status: 400 },
    );
  }
}

async function handleCoupleResponse(body: any, userId: string) {
  try {
    const validatedData = CoupleResponseSchema.parse(body);

    const supabase = await createClient();

    // Verify user is authorized to respond (couple member or admin/planner)
    const { data: orgMembership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', validatedData.organization_id)
      .eq('user_id', userId)
      .single();

    // Check if user is the couple for this wedding
    const { data: wedding } = await supabase
      .from('weddings')
      .select('client_email, partner_email, organization_id')
      .eq('organization_id', validatedData.organization_id)
      .single();

    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    const isCoupleAccess =
      wedding &&
      user &&
      (user.email === wedding.client_email ||
        user.email === wedding.partner_email);

    const hasAccess = orgMembership || isCoupleAccess;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions to respond to approval request' },
        { status: 403 },
      );
    }

    const result = await ScheduleApprovalWorkflowService.processCoupleResponse(
      validatedData.request_id,
      {
        decision: validatedData.decision,
        response_message: validatedData.response_message,
        concerns: validatedData.concerns,
        alternative_suggestions: validatedData.alternative_suggestions,
      },
      userId,
      validatedData.organization_id,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to process response' },
        { status: 400 },
      );
    }

    let message = 'Response recorded successfully';
    if (result.status === 'approved') {
      message = 'Change approved and implemented successfully';
    } else if (result.status === 'rejected') {
      message = 'Change rejected successfully';
    } else if (result.status === 'requires_negotiation') {
      message =
        'Response recorded - change request requires further discussion';
    }

    return NextResponse.json({
      success: true,
      message,
      status: result.status,
    });
  } catch (validationError) {
    return NextResponse.json(
      { error: 'Invalid response data', details: validationError },
      { status: 400 },
    );
  }
}

async function handleSendReminders(body: any, userId: string) {
  try {
    const { organization_id } = body;

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Verify user has admin access
    const { data: orgMembership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', userId)
      .single();

    if (
      !orgMembership ||
      !['admin', 'planner', 'coordinator'].includes(orgMembership.role)
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    const result =
      await ScheduleApprovalWorkflowService.sendApprovalReminders(
        organization_id,
      );

    return NextResponse.json({
      success: true,
      message: `Sent ${result.reminders_sent} reminders`,
      reminders_sent: result.reminders_sent,
      errors: result.errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 },
    );
  }
}

async function checkIfUserIsSupplier(
  userId: string,
  supplierId: string,
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!user) return false;

    const { data: supplier } = await supabase
      .from('suppliers')
      .select('email')
      .eq('id', supplierId)
      .single();

    return user.email === supplier?.email;
  } catch (error) {
    console.error('Failed to check if user is supplier:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const organizationId = url.searchParams.get('organization_id');
    const action = url.searchParams.get('action') || 'pending_approvals';

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 },
      );
    }

    // Verify user has access to the organization
    const { data: orgMembership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!orgMembership) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    switch (action) {
      case 'pending_approvals':
        const weddingId = url.searchParams.get('wedding_id') || undefined;
        const filters = {
          supplier_id: url.searchParams.get('supplier_id') || undefined,
          change_type: url.searchParams.get('change_type') || undefined,
          priority: url.searchParams.get('priority') || undefined,
          limit: parseInt(url.searchParams.get('limit') || '50'),
          offset: parseInt(url.searchParams.get('offset') || '0'),
        };

        const approvals =
          await ScheduleApprovalWorkflowService.getPendingApprovals(
            organizationId,
            weddingId,
            filters,
          );

        return NextResponse.json({
          success: true,
          ...approvals,
        });

      case 'stats':
        const statsWeddingId = url.searchParams.get('wedding_id') || undefined;
        const fromDate = url.searchParams.get('from')
          ? new Date(url.searchParams.get('from')!)
          : undefined;
        const toDate = url.searchParams.get('to')
          ? new Date(url.searchParams.get('to')!)
          : undefined;

        const dateRange =
          fromDate && toDate ? { from: fromDate, to: toDate } : undefined;

        const stats = await ScheduleApprovalWorkflowService.getApprovalStats(
          organizationId,
          statsWeddingId,
          dateRange,
        );

        return NextResponse.json({
          success: true,
          stats,
        });

      case 'request_details':
        const requestId = url.searchParams.get('request_id');
        if (!requestId) {
          return NextResponse.json(
            { error: 'Request ID required' },
            { status: 400 },
          );
        }

        const { data: requestDetails, error: requestError } = await supabase
          .from('schedule_change_requests')
          .select(
            `
            *,
            wedding:weddings(couple_names, client_email, wedding_date),
            supplier:suppliers(name, email, company_name, role),
            schedule_event:supplier_schedule_events(
              title, start_time, end_time, location, venue_name, venue_address
            ),
            responses:supplier_feedback_responses(
              id, responder_id, responder_role, response_type,
              response_message, created_at
            )
          `,
          )
          .eq('id', requestId)
          .eq('organization_id', organizationId)
          .single();

        if (requestError || !requestDetails) {
          return NextResponse.json(
            { error: 'Change request not found' },
            { status: 404 },
          );
        }

        return NextResponse.json({
          success: true,
          request: {
            ...requestDetails,
            created_at: new Date(requestDetails.created_at),
            expires_at: new Date(requestDetails.expires_at),
            couple_notified_at: requestDetails.couple_notified_at
              ? new Date(requestDetails.couple_notified_at)
              : undefined,
            couple_responded_at: requestDetails.couple_responded_at
              ? new Date(requestDetails.couple_responded_at)
              : undefined,
            approved_at: requestDetails.approved_at
              ? new Date(requestDetails.approved_at)
              : undefined,
            implemented_at: requestDetails.implemented_at
              ? new Date(requestDetails.implemented_at)
              : undefined,
          },
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Schedule Approval API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'update_settings';

    switch (action) {
      case 'update_settings':
        return await handleUpdateWorkflowSettings(body, user.id);

      case 'update_request_status':
        return await handleUpdateRequestStatus(body, user.id);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Schedule Approval API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

async function handleUpdateWorkflowSettings(body: any, userId: string) {
  try {
    const validatedData = WorkflowSettingsSchema.parse(body);

    const supabase = await createClient();

    // Verify user has admin access
    const { data: orgMembership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', validatedData.organization_id)
      .eq('user_id', userId)
      .single();

    if (!orgMembership || !['admin', 'planner'].includes(orgMembership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update workflow settings' },
        { status: 403 },
      );
    }

    // Upsert workflow settings
    const { error: upsertError } = await supabase
      .from('schedule_approval_settings')
      .upsert({
        ...validatedData,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      throw upsertError;
    }

    return NextResponse.json({
      success: true,
      message: 'Workflow settings updated successfully',
    });
  } catch (validationError) {
    return NextResponse.json(
      { error: 'Invalid settings data', details: validationError },
      { status: 400 },
    );
  }
}

async function handleUpdateRequestStatus(body: any, userId: string) {
  try {
    const { request_id, organization_id, status, notes } = body;

    if (!request_id || !organization_id || !status) {
      return NextResponse.json(
        {
          error: 'Missing required fields: request_id, organization_id, status',
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Verify user has access
    const { data: orgMembership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', userId)
      .single();

    if (
      !orgMembership ||
      !['admin', 'planner', 'coordinator'].includes(orgMembership.role)
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('schedule_change_requests')
      .update({
        approval_status: status,
        updated_at: new Date().toISOString(),
        ...(notes && {
          planner_response: {
            notes,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          },
        }),
      })
      .eq('id', request_id)
      .eq('organization_id', organization_id);

    if (updateError) {
      throw updateError;
    }

    // Log the status change
    await supabase.from('schedule_change_activity_log').insert({
      change_request_id: request_id,
      activity_type: 'status_updated',
      old_status: 'unknown', // We'd need to fetch this if needed
      new_status: status,
      updated_by: userId,
      notes,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Request status updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update request status' },
      { status: 500 },
    );
  }
}
