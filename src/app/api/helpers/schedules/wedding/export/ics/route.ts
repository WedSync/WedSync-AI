import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// ICS (iCalendar) format utilities
function formatDateForICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@wedsync.app`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { weddingId: string } },
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const weddingId = params.weddingId;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('include_all') === 'true';
    const statusFilter = searchParams.get('status') || 'confirmed,pending';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user has access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      // Check if user is a helper
      const { data: helperSchedule } = await supabase
        .from('helper_schedules')
        .select('id')
        .eq('wedding_id', weddingId)
        .eq('helper_user_id', user.id)
        .limit(1);

      if (!helperSchedule || helperSchedule.length === 0) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get wedding information
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('couple_name, wedding_date, venue_name, id')
      .eq('id', weddingId)
      .single();

    if (weddingError) {
      return NextResponse.json({ error: 'Wedding not found' }, { status: 404 });
    }

    // Build query for schedules
    let query = supabase
      .from('helper_schedules')
      .select(
        `
        id,
        task_title,
        task_description,
        category,
        priority,
        status,
        scheduled_start,
        scheduled_end,
        location,
        requirements,
        special_instructions,
        helper_user_id,
        helper:helper_user_id!user_profiles(
          id,
          full_name,
          email,
          phone
        )
      `,
      )
      .eq('wedding_id', weddingId)
      .order('scheduled_start', { ascending: true });

    // Apply filters
    if (!includeAll && statusFilter) {
      const statuses = statusFilter
        .split(',')
        .map((s) => s.trim().toUpperCase());
      query = query.in('status', statuses);
    }

    if (startDate) {
      query = query.gte('scheduled_start', startDate);
    }

    if (endDate) {
      query = query.lte('scheduled_end', endDate);
    }

    // If user is a helper (not team member), only show their schedules
    if (!teamMember) {
      query = query.eq('helper_user_id', user.id);
    }

    const { data: schedules, error: schedulesError } = await query;

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
      return NextResponse.json(
        { error: 'Failed to fetch schedules' },
        { status: 500 },
      );
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json(
        { error: 'No schedules found for export' },
        { status: 404 },
      );
    }

    // Generate ICS content
    const now = new Date();
    const calendarName = `${wedding.couple_name || 'Wedding'} - Helper Schedule`;

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WedSync//Wedding Helper Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeICSText(calendarName)}`,
      'X-WR-CALDESC:Wedding day helper schedule and tasks',
      `X-WR-TIMEZONE:${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
      '',
    ].join('\r\n');

    // Add events for each schedule
    schedules.forEach((schedule) => {
      const startTime = new Date(schedule.scheduled_start);
      const endTime = new Date(schedule.scheduled_end);

      // Calculate duration if end time is missing
      if (!schedule.scheduled_end || endTime <= startTime) {
        endTime.setTime(startTime.getTime() + 60 * 60 * 1000); // Add 1 hour
      }

      const uid = generateUID();
      const created = formatDateForICS(now);
      const dtstart = formatDateForICS(startTime);
      const dtend = formatDateForICS(endTime);

      // Build description
      let description = [];
      if (schedule.task_description) {
        description.push(escapeICSText(schedule.task_description));
      }
      if (schedule.requirements) {
        description.push(
          `Requirements: ${escapeICSText(schedule.requirements)}`,
        );
      }
      if (schedule.special_instructions) {
        description.push(
          `Instructions: ${escapeICSText(schedule.special_instructions)}`,
        );
      }
      if (schedule.helper?.full_name) {
        description.push(`Helper: ${escapeICSText(schedule.helper.full_name)}`);
        if (schedule.helper.email) {
          description.push(`Email: ${escapeICSText(schedule.helper.email)}`);
        }
        if (schedule.helper.phone) {
          description.push(`Phone: ${escapeICSText(schedule.helper.phone)}`);
        }
      }

      // Priority mapping
      let priority = '5'; // Normal
      switch (schedule.priority?.toUpperCase()) {
        case 'HIGH':
        case 'URGENT':
          priority = '1'; // High
          break;
        case 'MEDIUM':
          priority = '5'; // Normal
          break;
        case 'LOW':
          priority = '9'; // Low
          break;
      }

      // Status mapping
      let status = 'CONFIRMED';
      switch (schedule.status?.toUpperCase()) {
        case 'CANCELLED':
          status = 'CANCELLED';
          break;
        case 'COMPLETED':
          status = 'CONFIRMED'; // No standard for completed in ICS
          break;
        case 'PENDING':
          status = 'TENTATIVE';
          break;
        case 'IN_PROGRESS':
        case 'CONFIRMED':
        default:
          status = 'CONFIRMED';
          break;
      }

      // Add categories for color coding
      const categories = [schedule.category?.replace(/_/g, ' ') || 'WEDDING'];

      const eventLines = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${created}`,
        `CREATED:${created}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${escapeICSText(schedule.task_title)}`,
        `DESCRIPTION:${description.join('\\n')}`,
        `PRIORITY:${priority}`,
        `STATUS:${status}`,
        `CATEGORIES:${categories.join(',')}`,
        '',
      ];

      // Add location if available
      if (schedule.location) {
        eventLines.splice(
          -1,
          0,
          `LOCATION:${escapeICSText(schedule.location)}`,
        );
      }

      // Add organizer (wedding couple)
      if (wedding.couple_name) {
        eventLines.splice(
          -1,
          0,
          `ORGANIZER;CN=${escapeICSText(wedding.couple_name)}:mailto:noreply@wedsync.app`,
        );
      }

      // Add attendee (helper)
      if (schedule.helper?.email) {
        const helperName = schedule.helper.full_name || 'Helper';
        eventLines.splice(
          -1,
          0,
          `ATTENDEE;CN=${escapeICSText(helperName)};ROLE=REQ-PARTICIPANT:mailto:${schedule.helper.email}`,
        );
      }

      // Add alarm (reminder 15 minutes before)
      if (status === 'CONFIRMED' || status === 'TENTATIVE') {
        const alarmLines = [
          'BEGIN:VALARM',
          'TRIGGER:-PT15M',
          'ACTION:DISPLAY',
          `DESCRIPTION:Reminder: ${escapeICSText(schedule.task_title)}`,
          'END:VALARM',
        ];
        eventLines.splice(-2, 0, ...alarmLines);
      }

      eventLines.push('END:VEVENT');
      icsContent += eventLines.join('\r\n') + '\r\n';
    });

    // Close calendar
    icsContent += 'END:VCALENDAR\r\n';

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: weddingId,
      action: 'export_schedule_calendar',
      resource_type: 'helper_schedules',
      resource_id: weddingId,
      metadata: {
        export_format: 'ics',
        schedules_count: schedules.length,
        filters: {
          include_all: includeAll,
          status_filter: statusFilter,
          start_date: startDate,
          end_date: endDate,
        },
      },
    });

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const coupleName =
      wedding.couple_name?.replace(/[^a-zA-Z0-9]/g, '-') || 'wedding';
    const filename = `${coupleName}-helper-schedule-${dateStr}.ics`;

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Calendar export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
