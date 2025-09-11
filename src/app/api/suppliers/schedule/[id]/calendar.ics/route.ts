// WS-161: Supplier Calendar ICS File Download API
import { NextRequest, NextResponse } from 'next/server';
import { SupplierCalendarInviteService } from '@/lib/calendar/supplier-calendar-invite-service';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id: eventId } = params;
    const url = new URL(request.url);
    const supplierId = url.searchParams.get('supplier_id');
    const organizationId = url.searchParams.get('organization_id');
    const token = url.searchParams.get('token'); // Optional auth token for public access

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const supabase = await createClient();

    // If token is provided, validate it for public access
    if (token) {
      const { data: publicToken } = await supabase
        .from('supplier_calendar_tokens')
        .select('event_id, supplier_id, organization_id, expires_at')
        .eq('token', token)
        .eq('event_id', eventId)
        .single();

      if (!publicToken || new Date(publicToken.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 403 },
        );
      }

      // Use token data for access
      return await serveCalendarFile(
        eventId,
        publicToken.organization_id,
        publicToken.supplier_id,
      );
    }

    // Otherwise, require authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication or token required' },
        { status: 401 },
      );
    }

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

    return await serveCalendarFile(eventId, organizationId, supplierId);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

async function serveCalendarFile(
  eventId: string,
  organizationId: string,
  supplierId?: string | null,
) {
  try {
    const supabase = await createClient();

    // First, try to get stored ICS content
    let query = supabase
      .from('supplier_calendar_invites')
      .select('ics_content')
      .eq('event_id', eventId)
      .eq('organization_id', organizationId);

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    } else {
      query = query.is('supplier_id', null);
    }

    const { data: storedInvite } = await query.single();

    let icsContent = storedInvite?.ics_content;

    // If no stored content, generate it on-the-fly
    if (!icsContent) {
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
        .eq('id', eventId)
        .eq('organization_id', organizationId)
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

      // Generate fresh ICS content
      const inviteData =
        await SupplierCalendarInviteService.generateSupplierCalendarInvite(
          supplierScheduleEvent,
          organizationId,
          supplierId || undefined,
        );

      icsContent = inviteData.icsContent;
    }

    // Validate the ICS content before serving
    const validation =
      SupplierCalendarInviteService.validateICSContent(icsContent);
    if (!validation.valid) {
      console.error('Invalid ICS content:', validation.errors);
      return NextResponse.json(
        { error: 'Invalid calendar data' },
        { status: 500 },
      );
    }

    // Get event details for filename
    const { data: eventDetails } = await supabase
      .from('supplier_schedule_events')
      .select('title, wedding:weddings(couple_names)')
      .eq('id', eventId)
      .single();

    const filename = eventDetails
      ? `${eventDetails.wedding.couple_names.replace(/[^a-zA-Z0-9]/g, '_')}_${eventDetails.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`
      : `wedding_schedule_${eventId}.ics`;

    // Log the download
    await supabase.from('supplier_calendar_downloads').insert({
      event_id: eventId,
      organization_id: organizationId,
      supplier_id: supplierId || null,
      filename,
      user_agent: request.headers.get('user-agent'),
      ip_address: request.ip || 'unknown',
      downloaded_at: new Date().toISOString(),
    });

    // Return ICS file
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        Expires: '0',
        Pragma: 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error serving calendar file:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar file' },
      { status: 500 },
    );
  }
}

// Generate public access token for ICS download
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id: eventId } = params;
    const body = await request.json();
    const { organization_id, supplier_id, expires_in_hours = 24 } = body;

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Generate secure token
    const token = crypto.randomUUID() + '-' + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + expires_in_hours * 60 * 60 * 1000);

    // Store token
    await supabase.from('supplier_calendar_tokens').insert({
      token,
      event_id: eventId,
      organization_id,
      supplier_id: supplier_id || null,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });

    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/suppliers/schedule/${eventId}/calendar.ics?token=${token}`;

    return NextResponse.json({
      success: true,
      public_url: publicUrl,
      token,
      expires_at: expiresAt.toISOString(),
      expires_in_hours,
    });
  } catch (error) {
    console.error('Error generating public token:', error);
    return NextResponse.json(
      { error: 'Failed to generate public access token' },
      { status: 500 },
    );
  }
}
