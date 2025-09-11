import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

const ReorderSchema = z.object({
  new_order: z.number().int().min(0),
  wedding_id: z.string().uuid(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const scheduleId = params.id;

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validation = ReorderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid reorder data', details: validation.error.errors },
        { status: 400 },
      );
    }

    const { new_order, wedding_id } = validation.data;

    // Verify schedule exists and user has access
    const { data: existingSchedule, error: scheduleError } = await supabase
      .from('helper_schedules')
      .select('id, wedding_id, sort_order, task_title')
      .eq('id', scheduleId)
      .eq('wedding_id', wedding_id)
      .single();

    if (scheduleError || !existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 },
      );
    }

    // Check user permissions - must be coordinator/team member
    const { data: teamMember, error: teamError } = await supabase
      .from('wedding_team_members')
      .select('role')
      .eq('wedding_id', wedding_id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (
      !['owner', 'partner', 'planner', 'coordinator'].includes(teamMember.role)
    ) {
      return NextResponse.json(
        { error: 'Only coordinators can reorder schedules' },
        { status: 403 },
      );
    }

    // Get all schedules for this wedding to handle reordering
    const { data: allSchedules, error: allSchedulesError } = await supabase
      .from('helper_schedules')
      .select('id, sort_order, task_title')
      .eq('wedding_id', wedding_id)
      .order('sort_order', { ascending: true })
      .order('scheduled_start', { ascending: true });

    if (allSchedulesError) {
      console.error('Error fetching all schedules:', allSchedulesError);
      return NextResponse.json(
        { error: 'Failed to fetch schedules for reordering' },
        { status: 500 },
      );
    }

    // Find current position and calculate new positions
    const currentIndex = allSchedules.findIndex((s) => s.id === scheduleId);
    if (currentIndex === -1) {
      return NextResponse.json(
        { error: 'Schedule not found in current list' },
        { status: 404 },
      );
    }

    // Validate new order is within bounds
    if (new_order < 0 || new_order >= allSchedules.length) {
      return NextResponse.json(
        { error: 'Invalid new order position' },
        { status: 400 },
      );
    }

    // If position hasn't changed, return success without changes
    if (currentIndex === new_order) {
      return NextResponse.json({
        success: true,
        message: 'Schedule order unchanged',
        data: { id: scheduleId, old_order: currentIndex, new_order },
      });
    }

    // Perform the reordering in a transaction-like approach
    const updates = [];

    // Remove the item from its current position
    const [movedItem] = allSchedules.splice(currentIndex, 1);

    // Insert it at the new position
    allSchedules.splice(new_order, 0, movedItem);

    // Update sort_order for all affected items
    for (let i = 0; i < allSchedules.length; i++) {
      if (allSchedules[i].sort_order !== i) {
        updates.push({
          id: allSchedules[i].id,
          sort_order: i,
        });
      }
    }

    // Apply updates to database
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('helper_schedules')
        .update({
          sort_order: update.sort_order,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Error updating schedule ${update.id}:`, updateError);
        return NextResponse.json(
          { error: 'Failed to update schedule order' },
          { status: 500 },
        );
      }
    }

    // Log activity
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      wedding_id: wedding_id,
      action: 'reorder_helper_schedule',
      resource_type: 'helper_schedule',
      resource_id: scheduleId,
      metadata: {
        task_title: existingSchedule.task_title,
        old_order: currentIndex,
        new_order: new_order,
        updates_count: updates.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        schedule_id: scheduleId,
        old_order: currentIndex,
        new_order: new_order,
        updates_applied: updates.length,
      },
      meta: {
        reordered_at: new Date().toISOString(),
        reordered_by: user.id,
      },
    });
  } catch (error) {
    console.error('Schedule reorder API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
