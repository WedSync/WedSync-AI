import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schemas
const CreateHelperScheduleSchema = z.object({
  wedding_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  helper_user_id: z.string().uuid(),
  task_title: z.string().min(1).max(200),
  task_description: z.string().max(1000).optional(),
  category: z
    .enum([
      'SETUP',
      'CEREMONY',
      'RECEPTION',
      'CLEANUP',
      'COORDINATION',
      'VENDOR_LIAISON',
      'GUEST_ASSISTANCE',
      'EMERGENCY',
      'OTHER',
    ])
    .default('OTHER'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime(),
  location: z.string().max(200).optional(),
  requirements: z.string().max(500).optional(),
  special_instructions: z.string().max(1000).optional(),
});

const UpdateHelperScheduleSchema = CreateHelperScheduleSchema.partial().extend({
  id: z.string().uuid(),
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW',
    ])
    .optional(),
  actual_start: z.string().datetime().optional(),
  actual_end: z.string().datetime().optional(),
  completion_notes: z.string().max(1000).optional(),
  helper_notes: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const weddingId = searchParams.get('wedding_id');
    const helperUserId = searchParams.get('helper_user_id');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!weddingId) {
      return NextResponse.json(
        { error: 'wedding_id parameter is required' },
        { status: 400 },
      );
    }

    // Check user has access to this wedding
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      // If not a team member, check if they're assigned as a helper
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

    const isWeddingTeamMember = !!teamMember;
    const isHelper = !teamMember;

    // Build query
    let query = supabase
      .from('helper_schedules')
      .select(
        `
        id,
        wedding_id,
        organization_id,
        helper_user_id,
        task_title,
        task_description,
        category,
        priority,
        status,
        scheduled_start,
        scheduled_end,
        actual_start,
        actual_end,
        location,
        requirements,
        special_instructions,
        completion_notes,
        helper_notes,
        confirmation_sent_at,
        confirmed_at,
        created_at,
        updated_at,
        created_by,
        updated_by,
        helper:helper_user_id!user_profiles(
          id,
          full_name,
          email,
          avatar_url
        ),
        created_by_user:created_by!user_profiles(
          id,
          full_name,
          email
        )
      `,
      )
      .eq('wedding_id', weddingId);

    // Apply filters
    if (helperUserId) {
      query = query.eq('helper_user_id', helperUserId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (startDate) {
      query = query.gte('scheduled_start', startDate);
    }

    if (endDate) {
      query = query.lte('scheduled_end', endDate);
    }

    // If user is a helper (not a team member), only show their schedules
    if (isHelper) {
      query = query.eq('helper_user_id', user.id);
    }

    // Apply sorting and pagination
    query = query
      .order('scheduled_start', { ascending: true })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: schedules, error, count } = await query;

    if (error) {
      console.error('Error fetching helper schedules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch helper schedules' },
        { status: 500 },
      );
    }

    // Calculate summary statistics
    const summary = {
      total: schedules?.length || 0,
      by_status:
        schedules?.reduce((acc: Record<string, number>, schedule) => {
          acc[schedule.status] = (acc[schedule.status] || 0) + 1;
          return acc;
        }, {}) || {},
      by_category:
        schedules?.reduce((acc: Record<string, number>, schedule) => {
          acc[schedule.category] = (acc[schedule.category] || 0) + 1;
          return acc;
        }, {}) || {},
      upcoming_tasks:
        schedules?.filter(
          (schedule) =>
            new Date(schedule.scheduled_start) > new Date() &&
            ['PENDING', 'CONFIRMED'].includes(schedule.status),
        ).length || 0,
      in_progress_tasks:
        schedules?.filter((schedule) => schedule.status === 'IN_PROGRESS')
          .length || 0,
      completed_tasks:
        schedules?.filter((schedule) => schedule.status === 'COMPLETED')
          .length || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        schedules: schedules || [],
        summary,
      },
      pagination: {
        total: count || schedules?.length || 0,
        limit,
        offset,
        has_more: offset + limit < (count || schedules?.length || 0),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/helpers/schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateHelperScheduleSchema.parse(body);

    // Check user has access to this wedding (must be team member with appropriate permissions)
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', validatedData.wedding_id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!['owner', 'partner', 'planner'].includes(teamMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create helper schedules' },
        { status: 403 },
      );
    }

    // Verify helper exists and is valid
    const { data: helper, error: helperError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('id', validatedData.helper_user_id)
      .single();

    if (helperError || !helper) {
      return NextResponse.json(
        { error: 'Helper user not found' },
        { status: 404 },
      );
    }

    // Create helper schedule
    const { data: newSchedule, error } = await supabase
      .from('helper_schedules')
      .insert([
        {
          ...validatedData,
          status: 'PENDING',
          created_by: user.id,
          updated_by: user.id,
        },
      ])
      .select(
        `
        id,
        wedding_id,
        organization_id,
        helper_user_id,
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
        created_at,
        updated_at,
        helper:helper_user_id!user_profiles(
          id,
          full_name,
          email,
          avatar_url
        ),
        created_by_user:created_by!user_profiles(
          id,
          full_name,
          email
        )
      `,
      )
      .single();

    if (error) {
      console.error('Error creating helper schedule:', error);
      return NextResponse.json(
        { error: 'Failed to create helper schedule' },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: validatedData.wedding_id,
      action: 'create_helper_schedule',
      resource_type: 'helper_schedule',
      resource_id: newSchedule.id,
      metadata: {
        task_title: newSchedule.task_title,
        helper_user_id: newSchedule.helper_user_id,
        category: newSchedule.category,
        scheduled_start: newSchedule.scheduled_start,
        scheduled_end: newSchedule.scheduled_end,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newSchedule,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Unexpected error in POST /api/helpers/schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateHelperScheduleSchema.parse(body);
    const { id: scheduleId, ...updateData } = validatedData;

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 },
      );
    }

    // Get existing schedule
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('helper_schedules')
      .select('id, wedding_id, helper_user_id, created_by, status')
      .eq('id', scheduleId)
      .single();

    if (fetchError || !existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 },
      );
    }

    // Check permissions
    const { data: teamMember } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', existingSchedule.wedding_id)
      .eq('user_id', user.id)
      .single();

    const isTeamMember = !!teamMember;
    const isHelper = existingSchedule.helper_user_id === user.id;
    const isCreator = existingSchedule.created_by === user.id;

    if (!isTeamMember && !isHelper && !isCreator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Helpers can only update certain fields
    if (isHelper && !isTeamMember) {
      const allowedFields = [
        'status',
        'helper_notes',
        'actual_start',
        'actual_end',
        'completion_notes',
      ];
      const providedFields = Object.keys(updateData);
      const invalidFields = providedFields.filter(
        (field) => !allowedFields.includes(field),
      );

      if (invalidFields.length > 0) {
        return NextResponse.json(
          { error: `Helpers can only update: ${allowedFields.join(', ')}` },
          { status: 403 },
        );
      }
    }

    // Update schedule
    const { data: updatedSchedule, error } = await supabase
      .from('helper_schedules')
      .update({
        ...updateData,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
      .select(
        `
        id,
        wedding_id,
        organization_id,
        helper_user_id,
        task_title,
        task_description,
        category,
        priority,
        status,
        scheduled_start,
        scheduled_end,
        actual_start,
        actual_end,
        location,
        requirements,
        special_instructions,
        completion_notes,
        helper_notes,
        created_at,
        updated_at,
        helper:helper_user_id!user_profiles(
          id,
          full_name,
          email,
          avatar_url
        ),
        created_by_user:created_by!user_profiles(
          id,
          full_name,
          email
        )
      `,
      )
      .single();

    if (error) {
      console.error('Error updating helper schedule:', error);
      return NextResponse.json(
        { error: 'Failed to update schedule' },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: existingSchedule.wedding_id,
      action: 'update_helper_schedule',
      resource_type: 'helper_schedule',
      resource_id: scheduleId,
      metadata: {
        changes: updateData,
        updated_by_role: isHelper
          ? 'helper'
          : isTeamMember
            ? 'team_member'
            : 'creator',
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedSchedule,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    console.error('Unexpected error in PUT /api/helpers/schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get schedule ID from query params
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 },
      );
    }

    // Get existing schedule and verify permissions
    const { data: existingSchedule, error: fetchError } = await supabase
      .from('helper_schedules')
      .select('id, wedding_id, task_title, helper_user_id')
      .eq('id', scheduleId)
      .single();

    if (fetchError || !existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 },
      );
    }

    // Check permissions - only team members with appropriate roles can delete
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', existingSchedule.wedding_id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!['owner', 'partner', 'planner'].includes(teamMember.role)) {
      return NextResponse.json(
        { error: 'Only wedding owners/partners/planners can delete schedules' },
        { status: 403 },
      );
    }

    // Delete schedule
    const { error } = await supabase
      .from('helper_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      console.error('Error deleting helper schedule:', error);
      return NextResponse.json(
        { error: 'Failed to delete schedule' },
        { status: 500 },
      );
    }

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: existingSchedule.wedding_id,
      action: 'delete_helper_schedule',
      resource_type: 'helper_schedule',
      resource_id: scheduleId,
      metadata: {
        task_title: existingSchedule.task_title,
        helper_user_id: existingSchedule.helper_user_id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully',
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/helpers/schedules:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
