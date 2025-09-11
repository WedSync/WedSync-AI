// WS-161: Supplier Calendar Invites API
import { NextRequest, NextResponse } from 'next/server';
import { SupplierCalendarInviteService } from '@/lib/calendar/supplier-calendar-invite-service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const CalendarInviteRequestSchema = z.object({
  schedule_event_id: z.string(),
  organization_id: z.string(),
  supplier_ids: z.array(z.string()).optional(),
  supplier_id: z.string().optional(),
  action: z.enum(['generate', 'update', 'cancel']).default('generate'),
});

const CalendarInviteUpdateSchema = z.object({
  schedule_event_id: z.string(),
  organization_id: z.string(),
  supplier_id: z.string(),
  action: z.literal('update'),
});

const CalendarInviteCancelSchema = z.object({
  schedule_event_id: z.string(),
  organization_id: z.string(),
  supplier_id: z.string(),
  action: z.literal('cancel'),
  cancellation_reason: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user from request headers or session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request based on action
    let validatedData;
    try {
      if (body.action === 'cancel') {
        validatedData = CalendarInviteCancelSchema.parse(body);
      } else if (body.action === 'update') {
        validatedData = CalendarInviteUpdateSchema.parse(body);
      } else {
        validatedData = CalendarInviteRequestSchema.parse(body);
      }
    } catch (validationError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationError },
        { status: 400 },
      );
    }

    const { schedule_event_id, organization_id } = validatedData;

    // Verify user has access to the organization
    const { data: orgMembership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
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

    // Get schedule event details
    const { data: scheduleEvent, error: eventError } = await supabase
      .from('supplier_schedule_events')
      .select(
        `
        *,
        wedding:weddings!inner(
          id,
          couple_names,
          wedding_date,
          planner_name,
          planner_email
        )
      `,
      )
      .eq('id', schedule_event_id)
      .eq('organization_id', organization_id)
      .single();

    if (eventError || !scheduleEvent) {
      return NextResponse.json(
        { error: 'Schedule event not found' },
        { status: 404 },
      );
    }

    // Convert to SupplierScheduleEvent format
    const supplierScheduleEvent = {
      id: scheduleEvent.id,
      title: scheduleEvent.title,
      description: scheduleEvent.description,
      start_time: new Date(scheduleEvent.start_time),
      end_time: new Date(scheduleEvent.end_time),
      location: scheduleEvent.location,
      venue_name: scheduleEvent.venue_name,
      venue_address: scheduleEvent.venue_address,
      setup_time: scheduleEvent.setup_time
        ? new Date(scheduleEvent.setup_time)
        : undefined,
      breakdown_time: scheduleEvent.breakdown_time
        ? new Date(scheduleEvent.breakdown_time)
        : undefined,
      supplier_role: scheduleEvent.supplier_role,
      special_instructions: scheduleEvent.special_instructions,
      contact_person: scheduleEvent.contact_person,
      contact_phone: scheduleEvent.contact_phone,
      contact_email: scheduleEvent.contact_email,
      wedding_date: new Date(scheduleEvent.wedding.wedding_date),
      couple_names: scheduleEvent.wedding.couple_names,
      planner_name: scheduleEvent.wedding.planner_name,
      planner_email: scheduleEvent.wedding.planner_email,
      priority: scheduleEvent.priority as
        | 'low'
        | 'medium'
        | 'high'
        | 'critical',
      status: scheduleEvent.status as
        | 'draft'
        | 'confirmed'
        | 'updated'
        | 'cancelled',
      created_at: new Date(scheduleEvent.created_at),
      updated_at: new Date(scheduleEvent.updated_at),
    };

    try {
      switch (validatedData.action) {
        case 'generate':
          if ('supplier_ids' in validatedData && validatedData.supplier_ids) {
            // Bulk generate for multiple suppliers
            const results =
              await SupplierCalendarInviteService.generateBulkSupplierCalendarInvites(
                supplierScheduleEvent,
                validatedData.supplier_ids,
                organization_id,
              );

            return NextResponse.json({
              success: true,
              message: 'Calendar invites generated successfully',
              results: {
                successful: results.successful,
                failed: results.failed,
                errors: results.errors,
                total_invites: results.invites.length,
              },
              invites: results.invites[0], // Return first invite as sample
            });
          } else if (
            'supplier_id' in validatedData &&
            validatedData.supplier_id
          ) {
            // Generate for single supplier
            const inviteData =
              await SupplierCalendarInviteService.generateSupplierCalendarInvite(
                supplierScheduleEvent,
                organization_id,
                validatedData.supplier_id,
              );

            return NextResponse.json({
              success: true,
              message: 'Calendar invite generated successfully',
              invite: inviteData,
            });
          } else {
            // Generate general invite without specific supplier
            const inviteData =
              await SupplierCalendarInviteService.generateSupplierCalendarInvite(
                supplierScheduleEvent,
                organization_id,
              );

            return NextResponse.json({
              success: true,
              message: 'Calendar invite generated successfully',
              invite: inviteData,
            });
          }

        case 'update':
          const updatedInvite =
            await SupplierCalendarInviteService.updateSupplierCalendarInvite(
              schedule_event_id,
              organization_id,
              validatedData.supplier_id,
              supplierScheduleEvent,
            );

          return NextResponse.json({
            success: true,
            message: 'Calendar invite updated successfully',
            invite: updatedInvite,
          });

        case 'cancel':
          const cancelledInvite =
            await SupplierCalendarInviteService.cancelSupplierCalendarInvite(
              schedule_event_id,
              organization_id,
              validatedData.supplier_id,
              validatedData.cancellation_reason,
            );

          return NextResponse.json({
            success: true,
            message: 'Calendar invite cancelled successfully',
            invite: cancelledInvite,
          });

        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 },
          );
      }
    } catch (error) {
      console.error('Error processing calendar invite request:', error);
      return NextResponse.json(
        {
          error: 'Failed to process calendar invite',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
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
    const eventId = url.searchParams.get('event_id');
    const supplierId = url.searchParams.get('supplier_id');
    const action = url.searchParams.get('action'); // 'stats' or 'history'
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

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

    if (action === 'stats') {
      // Get calendar invite statistics
      const timeRange =
        from && to ? { from: new Date(from), to: new Date(to) } : undefined;
      const stats = await SupplierCalendarInviteService.getCalendarInviteStats(
        organizationId,
        timeRange,
      );

      return NextResponse.json({
        success: true,
        stats,
      });
    }

    // Get calendar invite history
    let query = supabase
      .from('supplier_calendar_invites')
      .select(
        `
        *,
        event:supplier_schedule_events(
          title,
          start_time,
          end_time,
          wedding:weddings(couple_names)
        ),
        supplier:suppliers(
          name,
          company_name,
          role
        )
      `,
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data: invites, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch calendar invites' },
        { status: 500 },
      );
    }

    // Get update history if requested
    let updates = null;
    if (eventId || supplierId) {
      let updateQuery = supabase
        .from('supplier_calendar_invite_updates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (eventId) {
        updateQuery = updateQuery.eq('event_id', eventId);
      }

      if (supplierId) {
        updateQuery = updateQuery.eq('supplier_id', supplierId);
      }

      const { data: updateData } = await updateQuery;
      updates = updateData || [];
    }

    return NextResponse.json({
      success: true,
      invites: invites || [],
      updates: updates,
      total: invites?.length || 0,
    });
  } catch (error) {
    console.error('API Error:', error);
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
    const { ics_content, organization_id, event_id, supplier_id } = body;

    if (!ics_content || !organization_id || !event_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Validate ICS content
    const validation =
      SupplierCalendarInviteService.validateICSContent(ics_content);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid ICS content', validation_errors: validation.errors },
        { status: 400 },
      );
    }

    // Verify user has access to the organization
    const { data: orgMembership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
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

    // Update the calendar invite with custom ICS content
    const { error: updateError } = await supabase
      .from('supplier_calendar_invites')
      .update({
        ics_content,
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', event_id)
      .eq('organization_id', organization_id)
      .eq('supplier_id', supplier_id || null);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update calendar invite' },
        { status: 500 },
      );
    }

    // Log the custom update
    await supabase.from('supplier_calendar_invite_updates').insert({
      event_id,
      organization_id,
      supplier_id: supplier_id || null,
      update_type: 'custom_ics',
      new_ics_content: ics_content,
      notes: 'Custom ICS content uploaded',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Calendar invite updated with custom ICS content',
      validation,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
